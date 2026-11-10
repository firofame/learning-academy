import { afterEach, beforeEach, describe, test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import worker, {
  ProgressDurableObject,
  mergeProgressSnapshots as workerMergeSnapshots,
  type DurableObjectStorageLike,
  type Env
} from '../../worker/index';
import {
  buildLocalSnapshot,
  cancelDebouncedSync,
  flushPendingSync,
  getSyncStatus,
  mergeProgressSnapshots,
  saveSnapshotToLocalStorage,
  scheduleDebouncedSync,
  setSyncStatus,
  syncProgress,
  type StudentProgressSnapshot
} from '../utils/syncService';
import type { LearningRecord } from '../learning/persistence';
import type { StudentId, WordProgress } from '../types';
import type { SubjectProgress, SubjectResult } from '../utils/subjectStorage';
import { installMockLocalStorage } from './helpers/storage';

const storage = installMockLocalStorage();
const workerOrigin = 'https://learn.firofame.workers.dev';
const allowedOrigin = 'https://firofame.github.io';
const earlier = '2026-11-07T10:00:00.000Z';
const later = '2026-11-07T11:00:00.000Z';
const nextDay = '2026-11-08T10:00:00.000Z';

function snapshot(overrides: Partial<StudentProgressSnapshot> = {}): StudentProgressSnapshot {
  return {
    studentId: 'shiza', version: 1, syncedAt: earlier,
    spelling: {}, subjects: {}, learningRecords: [], ...overrides
  };
}

function record(id: string, overrides: Partial<LearningRecord> = {}): LearningRecord {
  return {
    id, schemaVersion: 1, learnerId: 'shiza', subjectId: 'maths',
    kind: 'attempt', contentVersion: 'v1', updatedAt: earlier,
    data: { answer: 'first' }, ...overrides
  };
}

function result(mode: SubjectResult['mode'], completedAt = earlier, answer = 'first'): SubjectResult {
  return { mode, completedAt, answers: [{ questionId: 'q1', answer, correct: true }] };
}

function subject(overrides: Partial<SubjectProgress> = {}): SubjectProgress {
  return {
    studentId: 'shiza', lessonId: 'maths-ch14', practice: null,
    exam: null, reviewQuestionIds: [], ...overrides
  };
}

function word(overrides: Partial<WordProgress> = {}): WordProgress {
  return {
    wordId: 'separate', studentId: 'shiza', attempts: 0,
    unaidedCorrectCount: 0, consecutiveUnaidedCorrect: 0, unaidedCorrectDates: [],
    lastAttemptDate: earlier, level: 'learning', needsRevisit: false, history: [],
    ...overrides
  };
}

function postRequest(body: unknown, studentId: StudentId = 'shiza'): Request {
  return new Request(`${workerOrigin}/api/progress/${studentId}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

class MemoryDurableStorage implements DurableObjectStorageLike {
  private values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    // Yield during storage I/O so concurrent writes can expose lost-update bugs.
    await new Promise<void>(resolve => setImmediate(resolve));
    return structuredClone(this.values.get(key)) as T | undefined;
  }

  async put<T>(key: string, value: T): Promise<void> {
    await new Promise<void>(resolve => setImmediate(resolve));
    this.values.set(key, structuredClone(value));
  }
}

function workerHarness() {
  const objects = new Map<string, ProgressDurableObject>();
  const env: Env = {
    ALLOWED_ORIGINS: allowedOrigin,
    PROGRESS_DO: {
      idFromName: name => ({ toString: () => name }),
      get: id => ({
        fetch: async (input, init) => objectFor(id.toString()).fetch(
          typeof input === 'string' ? new Request(input, init) : input
        )
      })
    }
  };

  function objectFor(studentId: string): ProgressDurableObject {
    let instance = objects.get(studentId);
    if (!instance) {
      instance = new ProgressDurableObject({ storage: new MemoryDurableStorage() }, env);
      objects.set(studentId, instance);
    }
    return instance;
  }

  return { env, objectFor };
}

function connectWorker(
  t: TestContext,
  env: Env,
  intercept?: (request: Request) => Response | Promise<Response> | undefined
): Request[] {
  const calls: Request[] = [];
  t.mock.method(globalThis, 'fetch', async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const request = new Request(
      input instanceof Request ? input : new URL(String(input), workerOrigin), init
    );
    calls.push(request.clone());
    return intercept?.(request) ?? worker.fetch(request, env);
  });
  return calls;
}

function syncEvents(t: TestContext): EventTarget {
  const events = new EventTarget();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'dispatchEvent');
  Object.defineProperty(globalThis, 'dispatchEvent', {
    configurable: true, value: events.dispatchEvent.bind(events)
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'dispatchEvent', original);
    else Reflect.deleteProperty(globalThis, 'dispatchEvent');
  });
  return events;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
}

beforeEach(() => {
  storage.clear();
  cancelDebouncedSync();
  setSyncStatus('idle', 'shiza');
  setSyncStatus('idle', 'fazia');
});

afterEach(() => {
  cancelDebouncedSync();
  setSyncStatus('idle', 'shiza');
  setSyncStatus('idle', 'fazia');
});

for (const [name, merge] of [
  ['Client', mergeProgressSnapshots],
  ['Worker', workerMergeSnapshots]
] as const) {
  describe(`${name} progress merging`, () => {
    test('unions and sorts learning records without replacing immutable attempts', () => {
      const first = record('attempt-a');
      const second = record('attempt-b');
      const collision = { ...first, updatedAt: later, data: { answer: 'changed' } };
      const merged = merge(
        snapshot({ learningRecords: [second, first] }),
        snapshot({ learningRecords: [collision, record('attempt-c')] })
      );
      assert.deepEqual(merged.learningRecords, [first, second, record('attempt-c')]);
    });

    test('keeps the newest draft and revision state, retaining the existing value on ties', () => {
      for (const kind of ['draft', 'revision-state'] as const) {
        const old = record(kind, { kind });
        const fresh = { ...old, updatedAt: later, data: { answer: 'revised' } };
        const local = snapshot({ learningRecords: [old] });
        const remote = snapshot({ learningRecords: [fresh] });
        assert.deepEqual(merge(local, remote).learningRecords, [fresh]);
        assert.deepEqual(merge(remote, local).learningRecords, [fresh]);
        const tie = snapshot({ learningRecords: [{ ...fresh, data: { answer: 'other' } }] });
        assert.deepEqual(merge(remote, tie).learningRecords, [fresh]);
      }
    });

    test('merges practice and exam independently and takes review questions from the latest activity', () => {
      const local = subject({
        practice: result('practice'), exam: result('exam', later),
        reviewQuestionIds: ['old-miss']
      });
      const remote = subject({
        practice: result('practice', nextDay, 'revised'), exam: result('exam'),
        reviewQuestionIds: ['new-miss']
      });
      const merged = merge(
        snapshot({ subjects: { maths: local } }), snapshot({ subjects: { maths: remote } })
      );
      assert.deepEqual(merged.subjects.maths, {
        ...remote, practice: remote.practice, exam: local.exam
      });
      assert.equal(merged.syncedAt, earlier);
    });

    test('retains existing answers on timestamp ties and unions review questions without duplicates', () => {
      for (const practice of [null, result('practice')]) {
        const local = subject({ practice, reviewQuestionIds: ['q1', 'q2'] });
        const remote = subject({
          practice: practice && result('practice', earlier, 'other'),
          reviewQuestionIds: ['q2', 'q3']
        });
        const merged = merge(
          snapshot({ subjects: { maths: local } }), snapshot({ subjects: { maths: remote } })
        );
        assert.deepEqual(merged.subjects.maths.practice, practice);
        assert.deepEqual(merged.subjects.maths.reviewQuestionIds, ['q1', 'q2', 'q3']);
      }
    });

    test('an unaided failure resets mastery and later assisted practice cannot restore it', () => {
      const mastered = word({
        attempts: 3, unaidedCorrectCount: 3, consecutiveUnaidedCorrect: 3,
        unaidedCorrectDates: ['2026-11-06', '2026-11-07'], level: 'remembered',
        history: [{ date: earlier, mode: 'test', wasCorrect: true }]
      });
      const failed = word({
        attempts: 4, lastAttemptDate: later, needsRevisit: true, lastMistake: 'seperate',
        history: [{ date: later, mode: 'test', wasCorrect: false, mistakeInput: 'seperate' }]
      });
      const assisted = {
        ...mastered, attempts: 5, lastAttemptDate: nextDay,
        history: [{ date: nextDay, mode: 'practice' as const, wasCorrect: true }]
      };
      const mergedFailure = merge(
        snapshot({ spelling: { separate: mastered } }), snapshot({ spelling: { separate: failed } })
      );
      const reset = snapshot({ spelling: mergedFailure.spelling });
      assert.equal(reset.spelling.separate.level, 'learning');
      for (const [a, b] of [[reset, snapshot({ spelling: { separate: assisted } })],
        [snapshot({ spelling: { separate: assisted } }), reset]]) {
        const merged = merge(a, b).spelling.separate;
        assert.equal(merged.consecutiveUnaidedCorrect, 0);
        assert.deepEqual(merged.unaidedCorrectDates, []);
        assert.equal(merged.level, 'learning');
        assert.equal(merged.needsRevisit, true);
        assert.equal(merged.lastMistake, 'seperate');
      }
    });

    test('a later unaided success clears a mistake and preserves the new recall evidence', () => {
      const failed = word({
        attempts: 1, needsRevisit: true, lastMistake: 'seperate',
        history: [{ date: earlier, mode: 'test', wasCorrect: false, mistakeInput: 'seperate' }]
      });
      const success = word({
        attempts: 2, unaidedCorrectCount: 1, consecutiveUnaidedCorrect: 1,
        unaidedCorrectDates: ['2026-11-07'], lastAttemptDate: later,
        lastUnaidedCorrectDate: later, level: 'practising',
        history: [{ date: later, mode: 'test', wasCorrect: true }]
      });
      const merged = merge(
        snapshot({ spelling: { separate: success } }), snapshot({ spelling: { separate: failed } })
      ).spelling.separate;
      assert.equal(merged.level, 'practising');
      assert.equal(merged.consecutiveUnaidedCorrect, 1);
      assert.deepEqual(merged.unaidedCorrectDates, ['2026-11-07']);
      assert.equal(merged.lastUnaidedCorrectDate, later);
      assert.equal(merged.needsRevisit, false);
      assert.equal(merged.lastMistake, undefined);
    });

    test('spelling timestamp ties converge in either direction and repeated merges are stable', () => {
      const local = snapshot({ spelling: { separate: word({
        attempts: 3, unaidedCorrectCount: 3, consecutiveUnaidedCorrect: 3,
        level: 'remembered', unaidedCorrectDates: ['2026-11-06', '2026-11-07'],
        history: [{ attemptId: 'success', date: earlier, mode: 'test', wasCorrect: true }]
      }) } });
      const remote = snapshot({ spelling: { separate: word({
        attempts: 4, needsRevisit: true,
        history: [{ attemptId: 'failure', date: earlier, mode: 'test', wasCorrect: false }]
      }) } });
      const merged = merge(local, remote);
      assert.deepEqual(merged, merge(remote, local));
      assert.deepEqual(merge(snapshot({ spelling: merged.spelling }), remote), merged);
      assert.equal(merged.spelling.separate.attempts, 4);
      assert.equal(merged.spelling.separate.unaidedCorrectCount, 3);
      assert.equal(merged.spelling.separate.consecutiveUnaidedCorrect, 0);
      assert.equal(merged.spelling.separate.needsRevisit, true);
    });

    test('deduplicates history, sorts chronologically, and retains exactly the latest 15 entries', () => {
      const history: WordProgress['history'] = Array.from({ length: 20 }, (_, i) => ({
        attemptId: `attempt-${i}`, date: `2026-11-07T10:${String(i).padStart(2, '0')}:00.000Z`,
        mode: 'practice', wasCorrect: true
      }));
      const local = snapshot({ spelling: { separate: word({ history: history.slice(0, 12).reverse() }) } });
      const remote = snapshot({ spelling: { separate: word({ history: history.slice(8).reverse() }) } });
      const merged = merge(local, remote).spelling.separate;
      assert.deepEqual(merged.history, history.slice(-15));
      assert.equal(merged.attempts, 15);
    });

    test('invalid timestamps cannot displace newer valid progress', () => {
      const local = snapshot({
        syncedAt: 'invalid',
        subjects: { maths: subject({ practice: result('practice', 'invalid') }) },
        learningRecords: [record('draft', { kind: 'draft', updatedAt: 'invalid' })]
      });
      const remote = snapshot({
        syncedAt: later,
        subjects: { maths: subject({ practice: result('practice', later) }) },
        learningRecords: [record('draft', { kind: 'draft', updatedAt: later })]
      });
      assert.deepEqual(merge(local, remote), remote);
    });

    test('does not merge progress belonging to different learners', () => {
      assert.throws(() => merge(snapshot(), snapshot({ studentId: 'fazia' })), /different students/);
    });
  });
}

describe('Local sync storage', () => {
  test('round-trips progress without transferring device settings or another learner’s records', () => {
    storage.setItem('spellbee_active_profile_v1', 'fazia');
    storage.setItem('spellbee_settings_v1', '{"volume":80}');
    const otherLearner = snapshot({
      studentId: 'fazia', subjects: { evs: subject({ studentId: 'fazia', lessonId: 'evs-l1' }) }
    });
    saveSnapshotToLocalStorage(otherLearner);
    const own = snapshot({
      spelling: { separate: word() },
      subjects: { maths: subject(), history: subject({ lessonId: 'history-l1' }) },
      learningRecords: [record('own')]
    });
    saveSnapshotToLocalStorage({
      ...own,
      subjects: { ...own.subjects, evs: otherLearner.subjects.evs },
      learningRecords: [...own.learningRecords, record('foreign', { learnerId: 'fazia' })],
      ...{ spellbee_active_profile_v1: 'shiza', spellbee_settings_v1: { volume: 0 } }
    });
    const extracted = buildLocalSnapshot('shiza');
    assert.deepEqual({ ...extracted, syncedAt: own.syncedAt }, own);
    assert.equal(storage.getItem('spellbee_active_profile_v1'), 'fazia');
    assert.equal(storage.getItem('spellbee_settings_v1'), '{"volume":80}');
    assert.equal(storage.getItem('academy_rec_foreign'), null);
    assert.equal(storage.getItem('academy_evs_shiza_v1'), null);
    assert.deepEqual(buildLocalSnapshot('fazia').subjects, otherLearner.subjects);
  });

  test('skips corrupt cached JSON and foreign records instead of uploading them', () => {
    storage.setItem('spellbee_progress_shiza_v1', '{broken');
    storage.setItem('academy_maths_shiza_v1', 'null');
    storage.setItem('academy_history_shiza_v1', JSON.stringify(subject({ studentId: 'fazia' })));
    storage.setItem('academy_rec_bad', 'not json');
    storage.setItem('academy_rec_foreign', JSON.stringify(record('foreign', { learnerId: 'fazia' })));
    storage.setItem('academy_rec_good', JSON.stringify(record('good')));
    const extracted = buildLocalSnapshot('shiza');
    assert.deepEqual(extracted.spelling, {});
    assert.deepEqual(extracted.subjects, {});
    assert.deepEqual(extracted.learningRecords, [record('good')]);
  });
});

describe('Client and Worker sync lifecycle', () => {
  test('both learners sync concurrently into separate server and local stores', async t => {
    const { env } = workerHarness();
    connectWorker(t, env);
    saveSnapshotToLocalStorage(snapshot({ subjects: { maths: subject({ practice: result('practice') }) } }));
    saveSnapshotToLocalStorage(snapshot({
      studentId: 'fazia',
      subjects: { evs: subject({ studentId: 'fazia', lessonId: 'evs-l1', exam: result('exam') }) }
    }));
    const [shiza, fazia] = await Promise.all([syncProgress('shiza'), syncProgress('fazia')]);
    assert.ok(shiza);
    assert.ok(fazia);
    assert.deepEqual(Object.keys(shiza.subjects), ['maths']);
    assert.deepEqual(Object.keys(fazia.subjects), ['evs']);
    for (const synced of [shiza, fazia]) {
      const response = await worker.fetch(new Request(`${workerOrigin}/api/progress/${synced.studentId}`), env);
      const stored = await response.json() as StudentProgressSnapshot;
      assert.equal(stored.studentId, synced.studentId);
      assert.deepEqual(stored.subjects, synced.subjects);
      assert.equal(getSyncStatus(synced.studentId), 'synced');
    }
  });

  test('switching devices preserves practice while pulling a later exam without redundant uploads', async t => {
    const { env } = workerHarness();
    const calls = connectWorker(t, env);
    const practice = subject({ practice: result('practice') });
    saveSnapshotToLocalStorage(snapshot({ subjects: { maths: practice } }));
    assert.ok(await syncProgress('shiza'));

    storage.clear();
    assert.ok(await syncProgress('shiza'));
    assert.deepEqual(buildLocalSnapshot('shiza').subjects.maths, practice);
    assert.equal(calls.filter(call => call.method === 'POST').length, 1);

    const completed = { ...practice, exam: result('exam', later) };
    saveSnapshotToLocalStorage(snapshot({ subjects: { maths: completed } }));
    assert.ok(await syncProgress('shiza'));
    storage.clear();
    saveSnapshotToLocalStorage(snapshot({ subjects: { maths: practice } }));
    assert.ok(await syncProgress('shiza'));
    assert.deepEqual(buildLocalSnapshot('shiza').subjects.maths, completed);
    assert.equal(calls.filter(call => call.method === 'POST').length, 2);
  });

  const failures = [
    { method: 'GET', name: '429', respond: () => new Response('Rate limited', { status: 429 }) },
    { method: 'GET', name: '500', respond: () => new Response('Unavailable', { status: 500 }) },
    { method: 'GET', name: 'offline', respond: () => { throw new TypeError('Offline'); } },
    { method: 'GET', name: 'invalid JSON', respond: () => new Response('<html>Unavailable</html>') },
    { method: 'POST', name: '429', respond: () => new Response('Rate limited', { status: 429 }) },
    { method: 'POST', name: '500', respond: () => new Response('Unavailable', { status: 500 }) },
    { method: 'POST', name: 'offline', respond: () => { throw new TypeError('Offline'); } },
    { method: 'POST', name: 'invalid JSON', respond: () => new Response('{broken') },
    { method: 'POST', name: 'wrong learner', respond: () => Response.json(snapshot({ studentId: 'fazia' })) }
  ];

  for (const failure of failures) {
    test(`${failure.method} ${failure.name} retains local progress, emits no success event, and can recover`, async t => {
      const { env } = workerHarness();
      await worker.fetch(postRequest(snapshot({ subjects: { maths: subject({ practice: result('practice') }) } })), env);
      const local = snapshot({
        spelling: { separate: word({ attempts: 3 }) },
        subjects: { maths: subject({ practice: result('practice', later), reviewQuestionIds: ['q2'] }) },
        learningRecords: [record('saved-answer')]
      });
      saveSnapshotToLocalStorage(local);
      let events = 0;
      syncEvents(t).addEventListener('academy-progress-synced', () => { events++; });
      let failing = true;
      const calls = connectWorker(t, env, request =>
        failing && request.method === failure.method ? failure.respond() : undefined
      );

      assert.equal(await syncProgress('shiza'), null);
      assert.equal(getSyncStatus('shiza'), 'error');
      assert.equal(events, 0);
      assert.deepEqual({ ...buildLocalSnapshot('shiza'), syncedAt: local.syncedAt }, local);
      assert.equal(calls.filter(call => call.method === 'POST').length, failure.method === 'POST' ? 1 : 0);

      failing = false;
      const recovered = await syncProgress('shiza');
      assert.ok(recovered);
      assert.equal(getSyncStatus('shiza'), 'synced');
      assert.ok(events > 0);
      const saved = await worker.fetch(new Request(`${workerOrigin}/api/progress/shiza`), env);
      const remote = await saved.json() as StudentProgressSnapshot;
      assert.deepEqual(remote.subjects, local.subjects);
      assert.deepEqual(remote.learningRecords, local.learningRecords);
      assert.deepEqual(remote.spelling, recovered.spelling);
    });
  }

  test('profile switching flushes the outgoing debounce without cancelling the other learner', async t => {
    const { env } = workerHarness();
    const calls = connectWorker(t, env);
    for (const studentId of ['shiza', 'fazia'] as const) {
      saveSnapshotToLocalStorage(snapshot({
        studentId, learningRecords: [record(`${studentId}-answer`, { learnerId: studentId })]
      }));
      scheduleDebouncedSync(studentId);
    }
    assert.equal(calls.length, 0);
    assert.ok(await flushPendingSync('shiza', { keepalive: true }));
    assert.ok(calls.every(call => call.url.endsWith('/shiza')));
    assert.equal(calls.find(call => call.method === 'POST')?.keepalive, true);
    assert.equal(getSyncStatus('fazia'), 'idle');

    assert.ok(await flushPendingSync());
    const remote = await worker.fetch(new Request(`${workerOrigin}/api/progress/fazia`), env);
    assert.deepEqual((await remote.json() as StudentProgressSnapshot).learningRecords,
      [record('fazia-answer', { learnerId: 'fazia' })]);
  });

  test('in-flight saves survive stale responses, coalesce into a follow-up upload, and do not block another learner',
    { timeout: 5000 }, async t => {
      const { env } = workerHarness();
      const postStarted = deferred<void>();
      const releasePost = deferred<void>();
      t.after(() => releasePost.resolve());
      let blocked = false;
      const calls = connectWorker(t, env, request => {
        if (request.method === 'POST' && request.url.endsWith('/shiza') && !blocked) {
          blocked = true;
          postStarted.resolve();
          return releasePost.promise.then(() => worker.fetch(request, env));
        }
      });
      saveSnapshotToLocalStorage(snapshot({
        subjects: { maths: subject({ practice: result('practice') }) }
      }));
      const syncing = syncProgress('shiza');
      await postStarted.promise;
      const latest = subject({ practice: result('practice', later, 'second answer') });
      saveSnapshotToLocalStorage(snapshot({ subjects: { maths: latest } }));
      scheduleDebouncedSync('shiza');
      scheduleDebouncedSync('shiza');
      const queued = syncProgress('shiza');
      assert.ok(await syncProgress('fazia'));
      releasePost.resolve();
      await Promise.all([syncing, queued]);

      assert.deepEqual(buildLocalSnapshot('shiza').subjects.maths, latest);
      const saved = await worker.fetch(new Request(`${workerOrigin}/api/progress/shiza`), env);
      assert.deepEqual((await saved.json() as StudentProgressSnapshot).subjects.maths, latest);
      assert.equal(calls.filter(call => call.url.endsWith('/shiza') && call.method === 'POST').length, 2);
    });

  test('different local record insertion order does not trigger an upload or sync loop', async t => {
    const { env } = workerHarness();
    const records = [record('a'), record('b')];
    await worker.fetch(postRequest(snapshot({ learningRecords: records })), env);
    saveSnapshotToLocalStorage(snapshot({ learningRecords: [...records].reverse() }));
    const calls = connectWorker(t, env);
    assert.ok(await syncProgress('shiza'));
    assert.deepEqual(calls.map(call => call.method), ['GET']);
    assert.deepEqual(buildLocalSnapshot('shiza').learningRecords, records);
  });
});

describe('Worker progress endpoint', () => {
  test('allows configured, same-origin and absent origins, with CORS preflights and no-store responses', async () => {
    const { env } = workerHarness();
    for (const origin of [allowedOrigin, workerOrigin, undefined]) {
      const headers = origin ? { Origin: origin } : undefined;
      const response = await worker.fetch(new Request(`${workerOrigin}/api/progress/shiza`, { headers }), env);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal(response.headers.get('Vary'), 'Origin');
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin ?? null);
      assert.equal(await response.json(), null);
    }
    const preflight = await worker.fetch(new Request(`${workerOrigin}/api/progress/shiza`, {
      method: 'OPTIONS', headers: { Origin: allowedOrigin }
    }), env);
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), allowedOrigin);
    assert.match(preflight.headers.get('Access-Control-Allow-Methods') ?? '', /GET, POST/);
    assert.equal(preflight.headers.get('Access-Control-Allow-Headers'), 'Content-Type');
  });

  test('rejects disallowed origins before they can read or change stored progress', async () => {
    const { env } = workerHarness();
    await worker.fetch(postRequest(snapshot()), env);
    for (const method of ['GET', 'POST', 'OPTIONS']) {
      const response = await worker.fetch(new Request(`${workerOrigin}/api/progress/shiza`, {
        method, headers: { Origin: 'https://untrusted.example', 'Content-Type': 'application/json' },
        ...(method === 'POST' ? { body: JSON.stringify(snapshot({ learningRecords: [record('injected')] })) } : {})
      }), env);
      assert.equal(response.status, 403, method);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    }
    const stored = await worker.fetch(new Request(`${workerOrigin}/api/progress/shiza`), env);
    assert.deepEqual(await stored.json(), snapshot());
  });

  test('rejects unsupported routes, learners, queries and methods, and reports missing storage', async () => {
    const { env } = workerHarness();
    for (const [path, method, status] of [
      ['/api/progress/', 'GET', 400],
      ['/api/progress/other', 'GET', 400],
      ['/api/progress/other', 'POST', 400],
      ['/api/progress/SHIZA', 'GET', 400],
      ['/api/progress/shiza?extra=1', 'GET', 400],
      ['/api/progress/shiza?extra=1', 'POST', 400],
      ['/api/progress/shiza', 'PUT', 405]
    ] as const) {
      const response = await worker.fetch(new Request(`${workerOrigin}${path}`, { method }), env);
      assert.equal(response.status, status, `${method} ${path}`);
      assert.equal(typeof (await response.json() as { error: string }).error, 'string');
    }
    const response = await worker.fetch(new Request(`${workerOrigin}/api/progress/shiza`), {});
    assert.equal(response.status, 503);
  });

  test('persists normalized progress while stripping device-local root fields', async () => {
    const { env } = workerHarness();
    const progress = snapshot({
      subjects: { maths: subject({ practice: result('practice') }) },
      learningRecords: [record('answer')]
    });
    const response = await worker.fetch(postRequest({
      ...progress, spellbee_settings_v1: { volume: 0 }, spellbee_active_profile_v1: 'fazia'
    }), env);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), progress);
    const stored = await worker.fetch(new Request(`${workerOrigin}/api/progress/shiza`), env);
    assert.deepEqual(await stored.json(), progress);
    const other = await worker.fetch(new Request(`${workerOrigin}/api/progress/fazia`), env);
    assert.equal(await other.json(), null);
  });

  test('normalizes omitted optional collections and subject fields into loadable progress', async () => {
    const { env } = workerHarness();
    const response = await worker.fetch(postRequest({
      studentId: 'shiza', syncedAt: earlier, subjects: { maths: { lessonId: 'maths-ch14' } }
    }), env);
    assert.equal(response.status, 200);
    const normalized = await response.json() as StudentProgressSnapshot;
    assert.deepEqual(normalized, snapshot({ subjects: { maths: subject() } }));
    saveSnapshotToLocalStorage(normalized);
    assert.deepEqual(buildLocalSnapshot('shiza').subjects.maths, subject());
  });

  test('rejects malformed or cross-learner payloads without changing existing progress', async () => {
    const { env } = workerHarness();
    await worker.fetch(postRequest(snapshot()), env);
    const invalid: Array<[string, unknown]> = [
      ['non-object', null],
      ['learner mismatch', snapshot({ studentId: 'fazia' })],
      ['version', { version: 'one' }],
      ['timestamp', { syncedAt: 123 }],
      ['spelling collection', { spelling: [] }],
      ['spelling learner', { spelling: { separate: word({ studentId: 'fazia' }) } }],
      ['spelling count', { spelling: { separate: { attempts: -1 } } }],
      ['history collection', { spelling: { separate: { history: 'wrong' } } }],
      ['history entry', { spelling: { separate: { history: [null] } } }],
      ['subject collection', { subjects: [] }],
      ['subject learner', { subjects: { maths: subject({ studentId: 'fazia' }) } }],
      ['practice answers', { subjects: { maths: { practice: { answers: 'wrong' } } } }],
      ['exam answers', { subjects: { maths: { exam: { answers: 'wrong' } } } }],
      ['review questions', { subjects: { maths: { reviewQuestionIds: 'wrong' } } }],
      ['learning collection', { learningRecords: {} }],
      ['learning ID', { learningRecords: [{ id: '' }] }],
      ['learning learner', { learningRecords: [record('foreign', { learnerId: 'fazia' })] }]
    ];
    for (const [label, body] of invalid) {
      const response = await worker.fetch(postRequest(body), env);
      assert.equal(response.status, 400, label);
      assert.equal(typeof (await response.json() as { error: string }).error, 'string', label);
    }
    for (const [contentType, body, status] of [
      ['application/json', '{broken', 400],
      ['text/plain', '{}', 415]
    ] as const) {
      const response = await worker.fetch(new Request(`${workerOrigin}/api/progress/shiza`, {
        method: 'POST', headers: { 'Content-Type': contentType }, body
      }), env);
      assert.equal(response.status, status);
    }
    const stored = await worker.fetch(new Request(`${workerOrigin}/api/progress/shiza`), env);
    assert.deepEqual(await stored.json(), snapshot());
  });

  test('enforces the exact 2 MiB byte limit in both the Worker and Durable Object', async () => {
    const { env, objectFor } = workerHarness();
    const limit = 2 * 1024 * 1024;
    const emptyBody = JSON.stringify({ ...snapshot(), padding: '' });
    const atLimit = JSON.stringify({ ...snapshot(), padding: 'x'.repeat(limit - emptyBody.length) });
    assert.equal(new TextEncoder().encode(atLimit).byteLength, limit);
    const overLimit = `${atLimit} `;
    const multibyte = JSON.stringify({ ...snapshot(), padding: '\u0d05'.repeat(Math.floor(limit / 3)) });
    assert.ok(multibyte.length < limit);
    assert.ok(new TextEncoder().encode(multibyte).byteLength > limit);

    for (const send of [
      (request: Request) => worker.fetch(request, env),
      (request: Request) => objectFor('shiza').fetch(request)
    ]) {
      for (const [body, extraHeaders, status] of [
        [atLimit, {}, 200],
        [overLimit, {}, 413],
        [overLimit, { 'Content-Length': '1' }, 413],
        [multibyte, {}, 413],
        [emptyBody, { 'Content-Length': String(limit + 1) }, 413]
      ] as const) {
        const response = await send(new Request(`${workerOrigin}/api/progress/shiza`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...extraHeaders }, body
        }));
        assert.equal(response.status, status);
      }
    }
  });

  test('serializes concurrent device writes without losing answers and keeps learners isolated', async () => {
    const { env } = workerHarness();
    const responses = await Promise.all([
      worker.fetch(postRequest(snapshot({
        subjects: { maths: subject({ practice: result('practice') }) },
        learningRecords: [record('a')]
      })), env),
      worker.fetch(postRequest(snapshot({
        subjects: { maths: subject({ exam: result('exam', later) }) },
        learningRecords: [record('b')]
      })), env),
      worker.fetch(postRequest(snapshot({
        studentId: 'fazia', learningRecords: [record('fazia', { learnerId: 'fazia' })]
      }), 'fazia'), env)
    ]);
    assert.deepEqual(responses.map(response => response.status), [200, 200, 200]);
    const stored = await worker.fetch(new Request(`${workerOrigin}/api/progress/shiza`), env);
    const shiza = await stored.json() as StudentProgressSnapshot;
    assert.deepEqual(shiza.learningRecords, [record('a'), record('b')]);
    assert.deepEqual(shiza.subjects.maths.practice, result('practice'));
    assert.deepEqual(shiza.subjects.maths.exam, result('exam', later));
    const other = await worker.fetch(new Request(`${workerOrigin}/api/progress/fazia`), env);
    assert.deepEqual((await other.json() as StudentProgressSnapshot).learningRecords,
      [record('fazia', { learnerId: 'fazia' })]);
  });
});
