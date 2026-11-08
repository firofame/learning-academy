import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import worker, { ProgressDurableObject, type Env, type StudentProgressSnapshot } from '../../worker/index';

// ---------------------------------------------------------------------------
// Zero-Dependency Mock Harness for Cloudflare Durable Objects
// ---------------------------------------------------------------------------

export class MockDurableObjectStorage {
  private store = new Map<string, unknown>();

  async get<T = unknown>(key: string): Promise<T | undefined> {
    // Microtask delay simulates async storage I/O and exposes concurrency races
    await new Promise(resolve => setTimeout(resolve, 1));
    const value = this.store.get(key);
    if (value === undefined) return undefined;
    return structuredClone(value) as T;
  }

  async put<T>(key: string, value: T): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1));
    this.store.set(key, structuredClone(value));
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async deleteAll(): Promise<void> {
    this.store.clear();
  }

  getRaw(key: string): unknown {
    return this.store.get(key);
  }
}

export class MockDurableObjectState {
  storage: MockDurableObjectStorage;
  id: { toString(): string; name: string };

  constructor(idString: string) {
    this.storage = new MockDurableObjectStorage();
    this.id = { toString: () => idString, name: idString };
  }

  waitUntil(_promise: Promise<unknown>): void {}
}

export class MockDurableObjectStub {
  constructor(private instance: { fetch(request: Request): Promise<Response> }) {}

  async fetch(request: Request | string, init?: RequestInit): Promise<Response> {
    const req = typeof request === 'string' ? new Request(request, init) : request;
    return this.instance.fetch(req);
  }
}

export class MockDurableObjectNamespace {
  private instances = new Map<string, any>();

  constructor(
    private DOClass: new (state: any, env: any) => { fetch(req: Request): Promise<Response> },
    private env: any = {}
  ) {}

  idFromName(name: string): { toString(): string; name: string } {
    return { toString: () => name, name };
  }

  get(id: { toString(): string }): MockDurableObjectStub {
    const key = id.toString();
    if (!this.instances.has(key)) {
      const state = new MockDurableObjectState(key);
      const instance = new this.DOClass(state, this.env);
      this.instances.set(key, instance);
    }
    return new MockDurableObjectStub(this.instances.get(key));
  }

  getStoredSnapshot(studentId: string): StudentProgressSnapshot | null {
    const instance = this.instances.get(studentId);
    if (!instance) return null;
    const snap = (instance.state?.storage as MockDurableObjectStorage)?.getRaw('snapshot');
    return snap ? (structuredClone(snap) as StudentProgressSnapshot) : null;
  }

  reset(): void {
    this.instances.clear();
  }
}

const ALLOWED_ORIGIN = 'https://learn.firofame.workers.dev';
const ALLOWED_ORIGIN_2 = 'https://firofame.github.io';

function createEnv(doNamespace?: MockDurableObjectNamespace): Env {
  const env: Env = {
    GEMINI_API_KEY: 'test-key',
    ALLOWED_ORIGINS: `${ALLOWED_ORIGIN},${ALLOWED_ORIGIN_2},http://localhost:3000`,
    GRADING_RATE_LIMITER: { limit: async () => ({ success: true }) }
  };
  env.PROGRESS_DO = doNamespace ?? new MockDurableObjectNamespace(ProgressDurableObject, env);
  return env;
}

describe('Worker Progress Sync Endpoints', () => {
  let doNamespace: MockDurableObjectNamespace;
  let env: Env;

  beforeEach(() => {
    doNamespace = new MockDurableObjectNamespace(ProgressDurableObject);
    env = createEnv(doNamespace);
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

    test('returns 503 when PROGRESS_DO binding is missing', async () => {
      const envWithoutDO = { ...env, PROGRESS_DO: undefined };
      const response = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza'),
        envWithoutDO
      );
      assert.equal(response.status, 503);
      const body = await response.json() as { error: string };
      assert.match(body.error, /Progress storage is not configured/i);
    });
  });

  describe('GET & POST Progress Synchronization & DO Persistence', () => {
    test('GET returns 200 with null when DO storage is empty', async () => {
      const response = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza'),
        env
      );
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data, null);
    });

    test('POST persists snapshot to DO and returns merged result', async () => {
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

      // Verify DO received the record
      const stored = doNamespace.getStoredSnapshot('shiza');
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

    test('POST merges second device payload with existing DO snapshot deterministically', async () => {
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

    test('rejects POST with malformed spelling record history (not an array)', async () => {
      const response = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: 'shiza',
            version: 1,
            spelling: {
              apple: {
                wordId: 'apple',
                studentId: 'shiza',
                history: 'invalid-string-history'
              }
            }
          })
        }),
        env
      );
      assert.equal(response.status, 400);
      const data = await response.json() as any;
      assert.match(data.error, /Invalid history in spelling record "apple"/i);
    });

    test('rejects POST with learner ID mismatch in nested records', async () => {
      // 1. Mismatch in spelling wordData.studentId
      const spellingMismatch = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: 'shiza',
            version: 1,
            spelling: {
              apple: {
                wordId: 'apple',
                studentId: 'fazia'
              }
            }
          })
        }),
        env
      );
      assert.equal(spellingMismatch.status, 400);
      assert.match(((await spellingMismatch.json()) as any).error, /Student ID mismatch in spelling record/i);

      // 2. Mismatch in subject progress studentId
      const subjectMismatch = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: 'shiza',
            version: 1,
            subjects: {
              robotics: {
                studentId: 'fazia',
                lessonId: 'l1'
              }
            }
          })
        }),
        env
      );
      assert.equal(subjectMismatch.status, 400);
      assert.match(((await subjectMismatch.json()) as any).error, /Student ID mismatch in subject progress/i);

      // 3. Mismatch in learning record learnerId
      const recordMismatch = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: 'shiza',
            version: 1,
            learningRecords: [
              {
                id: 'attempt:1',
                learnerId: 'fazia',
                subjectId: 'robotics',
                kind: 'attempt',
                contentVersion: 'v1',
                updatedAt: new Date().toISOString(),
                data: {}
              }
            ]
          })
        }),
        env
      );
      assert.equal(recordMismatch.status, 400);
      assert.match(((await recordMismatch.json()) as any).error, /Learner ID mismatch in learning record/i);
    });

    test('rejects POST with malformed subject answers or invalid learning record id', async () => {
      // Invalid practice answers (string instead of array)
      const badAnswers = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: 'shiza',
            version: 1,
            subjects: {
              robotics: {
                studentId: 'shiza',
                lessonId: 'l1',
                practice: { mode: 'practice', completedAt: '2026-11-04', answers: 'not-an-array' }
              }
            }
          })
        }),
        env
      );
      assert.equal(badAnswers.status, 400);
      assert.match(((await badAnswers.json()) as any).error, /Invalid practice answers in subject "robotics"/i);

      // Missing learning record ID
      const badRecord = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: 'shiza',
            version: 1,
            learningRecords: [
              {
                learnerId: 'shiza',
                subjectId: 'robotics',
                kind: 'attempt'
              }
            ]
          })
        }),
        env
      );
      assert.equal(badRecord.status, 400);
      assert.match(((await badRecord.json()) as any).error, /Invalid learning record: id is required/i);
    });

    test('rejects POST with payload exceeding 2MB with 413 Payload Too Large', async () => {
      const largeData = 'A'.repeat(2 * 1024 * 1024 + 100);
      const oversizedPayload = JSON.stringify({
        studentId: 'shiza',
        version: 1,
        syncedAt: '2026-11-04T10:00:00Z',
        spelling: {},
        subjects: {},
        learningRecords: [
          {
            id: 'attempt:shiza:huge',
            schemaVersion: 1,
            learnerId: 'shiza',
            subjectId: 'robotics',
            kind: 'attempt',
            contentVersion: 'v1',
            updatedAt: '2026-11-04T10:00:00Z',
            data: { text: largeData }
          }
        ]
      });

      const response = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': String(new TextEncoder().encode(oversizedPayload).byteLength)
          },
          body: oversizedPayload
        }),
        env
      );

      assert.equal(response.status, 413);
      const body = await response.json() as { error: string };
      assert.match(body.error, /Payload too large/i);
    });

    test('strictly isolates storage between learners shiza and fazia', async () => {
      const testDONamespace = new MockDurableObjectNamespace(ProgressDurableObject);
      const testEnv = createEnv(testDONamespace);

      const shizaSnapshot: StudentProgressSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: '2026-11-04T10:00:00Z',
        spelling: {
          apple: {
            wordId: 'apple',
            studentId: 'shiza',
            attempts: 1,
            unaidedCorrectCount: 1,
            consecutiveUnaidedCorrect: 1,
            unaidedCorrectDates: ['2026-11-04'],
            lastAttemptDate: '2026-11-04T10:00:00Z',
            level: 'learning',
            needsRevisit: false,
            history: []
          }
        },
        subjects: {},
        learningRecords: []
      };

      // POST for Shiza
      const postShiza = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shizaSnapshot)
        }),
        testEnv
      );
      assert.equal(postShiza.status, 200);

      // Fazia DO storage must remain strictly empty (null)
      const getFazia = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/fazia'),
        testEnv
      );
      assert.equal(getFazia.status, 200);
      const faziaData = await getFazia.json();
      assert.equal(faziaData, null);
      assert.equal(testDONamespace.getStoredSnapshot('fazia'), null);

      // Shiza DO storage must contain 'apple'
      const shizaStored = testDONamespace.getStoredSnapshot('shiza');
      assert.ok(shizaStored);
      assert.ok('apple' in shizaStored.spelling);
    });

    test('sequential device switching guarantees immediate read-after-write consistency', async () => {
      const testDONamespace = new MockDurableObjectNamespace(ProgressDurableObject);
      const testEnv = createEnv(testDONamespace);

      // Device 1 (Mobile): POSTs newly practiced word
      const mobileSnapshot: StudentProgressSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: '2026-11-04T15:00:00Z',
        spelling: {
          butterfly: {
            wordId: 'butterfly',
            studentId: 'shiza',
            attempts: 2,
            unaidedCorrectCount: 2,
            consecutiveUnaidedCorrect: 2,
            unaidedCorrectDates: ['2026-11-04'],
            lastAttemptDate: '2026-11-04T15:00:00Z',
            level: 'practising',
            needsRevisit: false,
            history: []
          }
        },
        subjects: {},
        learningRecords: []
      };

      const postRes = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mobileSnapshot)
        }),
        testEnv
      );
      assert.equal(postRes.status, 200);

      // Device 2 (Chromebook): Immediately performs GET
      const chromebookGet = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza'),
        testEnv
      );
      assert.equal(chromebookGet.status, 200);
      const chromebookData = await chromebookGet.json() as StudentProgressSnapshot;

      // Must read the exact committed state without replication delay
      assert.equal(chromebookData.studentId, 'shiza');
      assert.equal(chromebookData.spelling['butterfly'].level, 'practising');
      assert.equal(chromebookData.spelling['butterfly'].consecutiveUnaidedCorrect, 2);
    });

    test('serializes concurrent POST operations per learner without lost updates', async () => {
      const testDONamespace = new MockDurableObjectNamespace(ProgressDurableObject);
      const testEnv = createEnv(testDONamespace);

      const attempts = Array.from({ length: 10 }, (_, i) => ({
        id: `attempt:shiza:concurrent-${i}`,
        schemaVersion: 1 as const,
        learnerId: 'shiza' as const,
        subjectId: 'robotics' as const,
        kind: 'attempt' as const,
        contentVersion: 'v1',
        updatedAt: new Date(Date.now() + i * 1000).toISOString(),
        data: { index: i }
      }));

      // Fire 10 concurrent POST requests
      const promises = attempts.map(attempt => {
        const payload: StudentProgressSnapshot = {
          studentId: 'shiza',
          version: 1,
          syncedAt: new Date().toISOString(),
          spelling: {},
          subjects: {},
          learningRecords: [attempt]
        };
        return worker.fetch(
          new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }),
          testEnv
        );
      });

      const responses = await Promise.all(promises);
      for (const res of responses) {
        assert.equal(res.status, 200);
      }

      // Verify DO storage has all 10 attempts without any lost updates
      const finalGet = await worker.fetch(
        new Request('https://learn.firofame.workers.dev/api/progress/shiza'),
        testEnv
      );
      assert.equal(finalGet.status, 200);
      const finalData = await finalGet.json() as StudentProgressSnapshot;
      assert.equal(finalData.learningRecords.length, 10);
      const ids = finalData.learningRecords.map(r => r.id).sort();
      assert.equal(ids.length, 10);
      for (let i = 0; i < 10; i++) {
        assert.ok(ids.includes(`attempt:shiza:concurrent-${i}`));
      }
    });
  });
});
