import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker, { type Env, type StudentProgressSnapshot } from '../../worker/index';

// In-Memory KV Namespace Mock for Cloudflare Worker KV testing
class MockKVNamespace {
  private store = new Map<string, string>();

  async get(key: string, type?: 'text' | 'json'): Promise<any> {
    const raw = this.store.get(key);
    if (raw === undefined) return null;
    if (type === 'json') {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return raw;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

const ALLOWED_ORIGIN = 'https://learn.firofame.workers.dev';
const ALLOWED_ORIGIN_2 = 'https://firofame.github.io';

function createEnv(kv = new MockKVNamespace()): Env {
  return {
    GEMINI_API_KEY: 'test-key',
    ALLOWED_ORIGINS: `${ALLOWED_ORIGIN},${ALLOWED_ORIGIN_2},http://localhost:3000`,
    PROGRESS_KV: kv as any,
    GRADING_RATE_LIMITER: { limit: async () => ({ success: true }) }
  };
}

describe('Worker Progress Sync Endpoints', () => {
  let kv: MockKVNamespace;
  let env: Env;

  beforeEach(() => {
    kv = new MockKVNamespace();
    env = createEnv(kv);
  });

  describe('CORS and Origin Validation', () => {
    test('allows GET with origin: null (same-origin browser navigation / node fetch)', async () => {
      const request = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
        method: 'GET'
      });
      const response = await worker.fetch(request, env);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      // When origin is null/omitted, Access-Control-Allow-Origin is not reflected
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
    });

    test('allows GET with configured allowed origin and returns Access-Control-Allow-Origin', async () => {
      const request = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
        method: 'GET',
        headers: { Origin: ALLOWED_ORIGIN_2 }
      });
      const response = await worker.fetch(request, env);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGIN_2);
    });

    test('rejects request from untrusted origin with 403', async () => {
      const request = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
        method: 'GET',
        headers: { Origin: 'https://malicious-site.example' }
      });
      const response = await worker.fetch(request, env);
      assert.equal(response.status, 403);
      const data = await response.json() as { error: string };
      assert.match(data.error, /Origin not allowed/i);
    });

    test('handles OPTIONS preflight with 204 and CORS headers for allowed origin', async () => {
      const request = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
        method: 'OPTIONS',
        headers: { Origin: ALLOWED_ORIGIN }
      });
      const response = await worker.fetch(request, env);
      assert.equal(response.status, 204);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGIN);
      assert.ok(response.headers.get('Access-Control-Allow-Methods')?.includes('POST'));
      assert.ok(response.headers.get('Access-Control-Allow-Methods')?.includes('GET'));
    });
  });

  describe('Student ID Validation and Whitelisting', () => {
    test('accepts requests for allowed students shiza and fazia', async () => {
      const resShiza = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza'),
        env
      );
      assert.equal(resShiza.status, 200);

      const resFazia = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/fazia'),
        env
      );
      assert.equal(resFazia.status, 200);
    });

    test('rejects invalid or unauthorized student IDs with 400 Bad Request', async () => {
      for (const invalidId of ['other', 'unknown', 'admin', 'guest', 'shiza1', 'FAZIA']) {
        const response = await worker.fetch(
          new Request(`https://learn.firofame.workers.dev/api/progress/${invalidId}`),
          env
        );
        assert.equal(response.status, 400, `Expected 400 for studentId: ${invalidId}`);
        const body = await response.json() as { error: string };
        assert.match(body.error, /Invalid student ID/i);
      }
    });

    test('rejects GET requests with unexpected query parameters with 400 Bad Request', async () => {
      const response = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/fazia?query=1'),
        env
      );
      assert.equal(response.status, 400);
      const body = await response.json() as { error: string };
      assert.match(body.error, /Query parameters are not supported/i);
    });

    test('rejects POST requests with unexpected query parameters with 400 Bad Request', async () => {
      const response = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza?extra=true', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: 'shiza',
            version: 1,
            syncedAt: '2026-11-07T12:00:00Z',
            spelling: {},
            subjects: {},
            learningRecords: []
          })
        }),
        env
      );
      assert.equal(response.status, 400);
      const body = await response.json() as { error: string };
      assert.match(body.error, /Query parameters are not supported/i);
    });

    test('rejects unsupported HTTP methods with 405 Method Not Allowed', async () => {
      for (const method of ['PUT', 'DELETE', 'PATCH']) {
        const response = await worker.fetch(
          new Request('https://learn.firofame.workers.dev/api/progress/shiza', { method }),
          env
        );
        assert.equal(response.status, 405);
      }
    });

    test('returns 503 when PROGRESS_KV binding is missing', async () => {
      const envWithoutKV = { ...env, PROGRESS_KV: undefined };
      const response = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza'),
        envWithoutKV
      );
      assert.equal(response.status, 503);
    });
  });

  describe('GET & POST Progress Synchronization & KV Persistence', () => {
    test('GET returns 200 with null when KV is empty', async () => {
      const response = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza'),
        env
      );
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data, null);
    });

    test('POST persists snapshot to KV and returns merged result', async () => {
      const snapshot: StudentProgressSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: '2026-11-04T10:00:00Z',
        spelling: {
          elephant: {
            wordId: 'elephant',
            studentId: 'shiza',
            attempts: 3,
            unaidedCorrectCount: 2,
            consecutiveUnaidedCorrect: 2,
            unaidedCorrectDates: ['2026-11-04'],
            lastAttemptDate: '2026-11-04T10:00:00Z',
            level: 'practising',
            needsRevisit: false,
            history: []
          }
        },
        subjects: {
          robotics: {
            studentId: 'shiza',
            lessonId: 'robotics-g6-l1',
            practice: { mode: 'practice', completedAt: '2026-11-04T10:00:00Z', answers: [] },
            exam: null,
            reviewQuestionIds: []
          }
        },
        learningRecords: [
          {
            id: 'attempt:shiza:1',
            schemaVersion: 1,
            learnerId: 'shiza',
            subjectId: 'robotics',
            kind: 'attempt',
            contentVersion: 'v1',
            updatedAt: '2026-11-04T10:00:00Z',
            data: {}
          }
        ]
      };

      const postResponse = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: ALLOWED_ORIGIN },
          body: JSON.stringify(snapshot)
        }),
        env
      );

      assert.equal(postResponse.status, 200);
      const postResult = await postResponse.json() as any;
      assert.equal(postResult.studentId, 'shiza');
      assert.ok('elephant' in postResult.spelling);
      assert.equal(postResult.learningRecords.length, 1);

      // Verify KV received the record
      const stored = await kv.get('progress:shiza', 'json');
      assert.ok(stored);
      assert.equal(stored.studentId, 'shiza');
      assert.equal(stored.learningRecords.length, 1);

      // Subsequent GET returns the saved snapshot
      const getResponse = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza'),
        env
      );
      assert.equal(getResponse.status, 200);
      const getData = await getResponse.json() as any;
      assert.equal(getData.studentId, 'shiza');
      assert.ok('elephant' in getData.spelling);
    });

    test('POST merges second device payload with existing KV snapshot deterministically', async () => {
      // 1. Initial snapshot from Device 1
      const device1Snapshot: StudentProgressSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: '2026-11-04T10:00:00Z',
        spelling: {},
        subjects: {
          robotics: {
            studentId: 'shiza',
            lessonId: 'robotics-g6-l1',
            practice: { mode: 'practice', completedAt: '2026-11-04T10:00:00Z', answers: [] },
            exam: null,
            reviewQuestionIds: ['q1']
          }
        },
        learningRecords: [
          {
            id: 'attempt:shiza:dev1',
            schemaVersion: 1,
            learnerId: 'shiza',
            subjectId: 'robotics',
            kind: 'attempt',
            contentVersion: 'v1',
            updatedAt: '2026-11-04T10:00:00Z',
            data: {}
          }
        ]
      };

      await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(device1Snapshot)
        }),
        env
      );

      // 2. Second snapshot from Device 2 with an exam and another attempt
      const device2Snapshot: StudentProgressSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: '2026-11-04T12:00:00Z',
        spelling: {},
        subjects: {
          robotics: {
            studentId: 'shiza',
            lessonId: 'robotics-g6-l1',
            practice: null,
            exam: { mode: 'exam', completedAt: '2026-11-04T12:00:00Z', answers: [] },
            reviewQuestionIds: []
          }
        },
        learningRecords: [
          {
            id: 'attempt:shiza:dev2',
            schemaVersion: 1,
            learnerId: 'shiza',
            subjectId: 'robotics',
            kind: 'attempt',
            contentVersion: 'v1',
            updatedAt: '2026-11-04T12:00:00Z',
            data: {}
          }
        ]
      };

      const res = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(device2Snapshot)
        }),
        env
      );

      assert.equal(res.status, 200);
      const merged = await res.json() as any;

      // Attempts unioned
      assert.equal(merged.learningRecords.length, 2);
      const attemptIds = merged.learningRecords.map((r: any) => r.id).sort();
      assert.deepEqual(attemptIds, ['attempt:shiza:dev1', 'attempt:shiza:dev2']);

      // Practice and exam merged independently
      assert.ok(merged.subjects.robotics.practice);
      assert.ok(merged.subjects.robotics.exam);
      assert.equal(merged.subjects.robotics.practice.completedAt, '2026-11-04T10:00:00Z');
      assert.equal(merged.subjects.robotics.exam.completedAt, '2026-11-04T12:00:00Z');
    });

    test('POST payload > 8KB succeeds (not constrained by 8KB readBody limit)', async () => {
      // Create large learningRecords array > 15KB
      const manyRecords = Array.from({ length: 150 }, (_, i) => ({
        id: `attempt:shiza:bulk-${i}`,
        schemaVersion: 1 as const,
        learnerId: 'shiza' as const,
        subjectId: 'robotics' as const,
        kind: 'attempt' as const,
        contentVersion: 'v1',
        updatedAt: '2026-11-04T10:00:00Z',
        data: { text: 'Some detailed justification text for question attempt '.repeat(4) }
      }));

      const largeSnapshot: StudentProgressSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: '2026-11-04T10:00:00Z',
        spelling: {},
        subjects: {},
        learningRecords: manyRecords
      };

      const jsonString = JSON.stringify(largeSnapshot);
      assert.ok(jsonString.length > 15000, `Expected payload > 15KB, got ${jsonString.length}`);

      const response = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: jsonString
        }),
        env
      );

      assert.equal(response.status, 200);
      const result = await response.json() as any;
      assert.equal(result.learningRecords.length, 150);
    });

    test('rejects POST with mismatched studentId in body and URL', async () => {
      const response = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: 'fazia', version: 1, syncedAt: '', spelling: {}, subjects: {}, learningRecords: [] })
        }),
        env
      );
      assert.equal(response.status, 400);
      const body = await response.json() as any;
      assert.match(body.error, /does not match/i);
    });

    test('rejects POST with non-JSON or malformed payload', async () => {
      const response = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{ invalid-json }'
        }),
        env
      );
      assert.equal(response.status, 400);
    });
  });
});
