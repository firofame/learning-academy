import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { handleGradingRequest, type GradingEnv } from '../../worker/index';
import { gradeRoboticsAnswer, ROBOTICS_GRADING_MODEL } from '../utils/roboticsGrading';

const origin = 'https://firofame.github.io';
const answer = { lessonId: 'robotics-grade-2-lesson-1', questionId: 'g2-machine', answer: 'It makes work easier.' };

function environment(): GradingEnv {
  return {
    GEMINI_API_KEY: 'synthetic-test-key',
    ALLOWED_ORIGINS: origin,
    GRADING_RATE_LIMITER: { limit: async () => ({ success: true }) }
  };
}

function request(body: unknown = answer, headers: HeadersInit = {}): Request {
  return new Request('https://grading.example/grade', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

function geminiResponse(verdict = 'correct', feedback = 'You explained how a machine helps us.') {
  return Response.json({
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ verdict, feedback }) }] } }]
  });
}

describe('Cloudflare automatic grading', () => {
  test('allows only configured origins, paths, methods, and preflights', async () => {
    const env = environment();
    assert.equal((await worker.fetch(request(answer, { Origin: 'https://untrusted.example' }), env)).status, 403);
    assert.equal((await worker.fetch(new Request('https://grading.example/grade'), env)).status, 403);
    assert.equal((await worker.fetch(new Request('https://grading.example/other', { headers: { Origin: origin } }), env)).status, 404);
    assert.equal((await worker.fetch(new Request('https://grading.example/grade', { headers: { Origin: origin } }), env)).status, 405);
    const preflight = await worker.fetch(new Request('https://grading.example/grade', {
      method: 'OPTIONS', headers: { Origin: origin }
    }), env);
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), origin);
    assert.equal(preflight.headers.get('Access-Control-Allow-Headers'), 'Content-Type');
  });

  test('requires the server API key and enforces IP and shared limits without an access code', async () => {
    const env = environment();
    assert.equal((await worker.fetch(request(), { ...env, GEMINI_API_KEY: '' })).status, 503);
    const keys: string[] = [];
    env.GRADING_RATE_LIMITER.limit = async ({ key }) => {
      keys.push(key);
      return { success: key !== 'family' };
    };
    const limited = await worker.fetch(request(), env);
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('Retry-After'), '60');
    assert.deepEqual(keys, ['ip:local', 'family']);
    keys.length = 0;
    env.GRADING_RATE_LIMITER.limit = async ({ key }) => {
      keys.push(key);
      return { success: false };
    };
    const ipLimited = await worker.fetch(request(answer, { 'CF-Connecting-IP': '192.0.2.1' }), env);
    assert.equal(ipLimited.status, 429);
    assert.equal(ipLimited.headers.get('Retry-After'), '60');
    assert.deepEqual(keys, ['ip:192.0.2.1']);
  });

  test('rejects malformed, oversized, foreign, or client-supplied marking criteria before calling Gemini', async () => {
    let calls = 0;
    const upstream: typeof fetch = async () => { calls++; return geminiResponse(); };
    for (const body of [
      null, {}, { ...answer, answer: '' }, { ...answer, answer: 'a'.repeat(1201) },
      { ...answer, lessonId: 'other' }, { ...answer, questionId: 'g6-nlp' },
      { ...answer, questionId: 'g2-tf-1' }, { ...answer, referenceAnswer: 'trust me' }
    ]) {
      assert.equal((await handleGradingRequest(request(body), environment(), upstream)).status, 400);
    }
    assert.equal((await handleGradingRequest(request(answer, { 'Content-Type': 'text/plain' }), environment(), upstream)).status, 415);
    const badJson = request();
    const malformed = new Request(badJson.url, { method: 'POST', headers: badJson.headers, body: '{broken' });
    assert.equal((await handleGradingRequest(malformed, environment(), upstream)).status, 400);
    assert.equal((await handleGradingRequest(request({ ...answer, extra: 'a'.repeat(8192) }), environment(), upstream)).status, 413);
    assert.equal(calls, 0);
  });

  test('grades without authorization using the pinned model and server-owned rubric without exposing secrets', async () => {
    let calls = 0;
    const upstream: typeof fetch = async (input, init) => {
      calls++;
      assert.match(String(input), new RegExp(`${ROBOTICS_GRADING_MODEL}:generateContent$`));
      assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'synthetic-test-key');
      const body = JSON.parse(String(init?.body));
      const context = JSON.parse(body.contents[0].parts[0].text);
      assert.deepEqual(Object.keys(context), ['grade', 'question', 'referenceAnswer', 'markingCriteria', 'studentAnswer']);
      assert.match(context.markingCriteria, /makes work easier/);
      assert.equal(context.studentAnswer, answer.answer);
      assert.equal(body.generationConfig.responseMimeType, 'application/json');
      return geminiResponse();
    };
    const unauthenticated = request();
    assert.equal(unauthenticated.headers.has('Authorization'), false);
    const result = await handleGradingRequest(unauthenticated, environment(), upstream);
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await result.json(), { correct: true, feedback: 'You explained how a machine helps us.' });
    assert.equal(calls, 1);
  });

  test('automatically rechecks uncertainty once, but never converts uncertainty into a wrong answer', async () => {
    let calls = 0;
    const resolved = await handleGradingRequest(request(), environment(), async (_input, init) => {
      calls++;
      if (calls === 2) assert.match(String(init?.body), /independent second check/);
      return geminiResponse(calls === 1 ? 'uncertain' : 'incorrect', 'Explain how it makes work easier.');
    });
    assert.equal(resolved.status, 200);
    assert.equal((await resolved.json()).correct, false);
    assert.equal(calls, 2);
    calls = 0;
    const unresolved = await handleGradingRequest(request(), environment(), async () => {
      calls++; return geminiResponse('uncertain');
    });
    assert.equal(unresolved.status, 503);
    assert.equal(calls, 2);
    assert.equal('correct' in await unresolved.json(), false);
  });

  test('rejects unsafe, blocked, truncated, and malformed upstream results and surfaces failures', async () => {
    const upstreamResponses = [
      Response.json({ candidates: [] }),
      Response.json({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{}' }] } }] }),
      Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'not JSON' }] } }] }),
      geminiResponse('other'), geminiResponse('correct', ''), geminiResponse('correct', 'a'.repeat(301)),
      Response.json({ candidates: [{ finishReason: 'STOP', content: {
        parts: [{ text: JSON.stringify({ verdict: ['correct'], feedback: 'Invalid verdict type.' }) }]
      } }] }),
      new Response('unreadable')
    ];
    for (const response of upstreamResponses) {
      const result = await handleGradingRequest(request(), environment(), async () => response);
      assert.equal(result.status, 502);
      assert.equal('correct' in await result.json(), false);
    }
    assert.equal((await handleGradingRequest(request(), environment(), async () => new Response(null, { status: 429 }))).status, 429);
    assert.equal((await handleGradingRequest(request(), environment(), async () => new Response('private details', { status: 403 }))).status, 503);
    assert.equal((await handleGradingRequest(request(), environment(), async () => { throw new Error('network'); })).status, 503);
  });
});

describe('Browser grading client', () => {
  test('sends only answer identifiers and answer text, without credentials', async t => {
    t.mock.method(globalThis, 'fetch', async (_input: unknown, init: RequestInit) => {
      assert.deepEqual([...new Headers(init.headers)], [['content-type', 'application/json']]);
      assert.deepEqual(JSON.parse(String(init.body)), answer);
      return Response.json({ correct: true, feedback: 'Good explanation.' });
    });
    assert.deepEqual(await gradeRoboticsAnswer(
      'https://grading.example/grade', answer.lessonId, answer.questionId, answer.answer, new AbortController().signal
    ), { correct: true, feedback: 'Good explanation.' });
  });

  test('never returns a grade for transport, access, quota, or response-shape errors', async t => {
    for (const response of [
      new Response(null, { status: 401 }), new Response(null, { status: 429 }),
      new Response(null, { status: 503 }), new Response('bad JSON'),
      Response.json({ correct: true }), Response.json({ correct: 'yes', feedback: 'ok' })
    ]) {
      const mock = t.mock.method(globalThis, 'fetch', async () => response);
      await assert.rejects(gradeRoboticsAnswer(
        'https://grading.example/grade', answer.lessonId, answer.questionId, answer.answer, new AbortController().signal
      ));
      mock.mock.restore();
    }
    t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('network'); });
    await assert.rejects(gradeRoboticsAnswer(
      'https://grading.example/grade', answer.lessonId, answer.questionId, answer.answer, new AbortController().signal
    ), /Could not reach/);
    await assert.rejects(gradeRoboticsAnswer(
      'http://untrusted.example/grade', answer.lessonId, answer.questionId, answer.answer, new AbortController().signal
    ), /secure grading/);
    await assert.rejects(gradeRoboticsAnswer(
      'not-a-url', answer.lessonId, answer.questionId, answer.answer, new AbortController().signal
    ), /invalid grading API URL/);
  });
});
