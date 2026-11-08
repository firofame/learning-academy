import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import worker, {
  ProgressDurableObject,
  mergeProgressSnapshots,
  type Env,
  type StudentProgressSnapshot
} from '../../worker/index';
import {
  syncProgress,
  scheduleDebouncedSync,
  flushPendingSync,
  cancelDebouncedSync,
  getSyncStatus,
  setSyncStatus,
  subscribeSyncStatus,
  buildLocalSnapshot,
  saveSnapshotToLocalStorage,
  applyRemoteSnapshotToLocalStorage
} from '../utils/syncService';
import { MockDurableObjectNamespace } from './syncWorker.test';
import type { StudentId, WordProgress } from '../types';

// In-Memory Storage Mock for localStorage
class MockLocalStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = mockStorage;

const ALLOWED_ORIGIN_PROD = 'https://learn.firofame.workers.dev';
const ALLOWED_ORIGIN_PAGES = 'https://firofame.github.io';
const ALLOWED_ORIGIN_LOCAL = 'http://localhost:3000';

function createWorkerEnv(doNamespace?: MockDurableObjectNamespace): Env {
  const env: Env = {
    GEMINI_API_KEY: 'test-api-key',
    ALLOWED_ORIGINS: `${ALLOWED_ORIGIN_PROD},${ALLOWED_ORIGIN_PAGES},${ALLOWED_ORIGIN_LOCAL}`
  };
  env.PROGRESS_DO = doNamespace ?? new MockDurableObjectNamespace(ProgressDurableObject, env);
  return env;
}

describe('Empirical Adversarial Verification: Fault Recovery & Security Boundaries', () => {
  let originalFetch: typeof globalThis.fetch;
  let doNamespace: MockDurableObjectNamespace;
  let env: Env;

  beforeEach(() => {
    mockStorage.clear();
    cancelDebouncedSync();
    setSyncStatus('idle', 'shiza');
    setSyncStatus('idle', 'fazia');
    originalFetch = globalThis.fetch;
    doNamespace = new MockDurableObjectNamespace(ProgressDurableObject);
    env = createWorkerEnv(doNamespace);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    cancelDebouncedSync();
  });

  // =========================================================================
  // 1. Error Recovery, Status Transition, Event Isolation & Stale Snapshot Defense
  // =========================================================================
  describe('1. Error Recovery & Local Snapshot Safety', () => {
    const seedActiveProgress = (studentId: StudentId) => {
      mockStorage.setItem(`spellbee_progress_${studentId}_v1`, JSON.stringify({
        oxygen: {
          wordId: 'oxygen',
          studentId,
          attempts: 5,
          unaidedCorrectCount: 4,
          consecutiveUnaidedCorrect: 4,
          unaidedCorrectDates: ['2026-11-06T10:00:00Z', '2026-11-07T10:00:00Z'],
          lastAttemptDate: '2026-11-07T10:00:00Z',
          lastUnaidedCorrectDate: '2026-11-07T10:00:00Z',
          level: 'remembered',
          needsRevisit: false,
          history: []
        }
      }));
      mockStorage.setItem(`academy_maths_${studentId}_v1`, JSON.stringify({
        studentId,
        lessonId: 'maths-ch14',
        practice: { mode: 'practice', completedAt: '2026-11-07T11:00:00Z', answers: ['Ans1'] },
        exam: { mode: 'exam', completedAt: '2026-11-07T11:30:00Z', answers: ['ExamAns1'] },
        reviewQuestionIds: ['q1']
      }));
    };

    const assertProgressRetained = (studentId: StudentId) => {
      const spell = JSON.parse(mockStorage.getItem(`spellbee_progress_${studentId}_v1`) || '{}');
      assert.equal(spell.oxygen?.consecutiveUnaidedCorrect, 4);
      assert.equal(spell.oxygen?.level, 'remembered');
      assert.equal(spell.oxygen?.attempts, 5);

      const maths = JSON.parse(mockStorage.getItem(`academy_maths_${studentId}_v1`) || '{}');
      assert.equal(maths.exam?.answers?.[0], 'ExamAns1');
      assert.deepEqual(maths.reviewQuestionIds, ['q1']);
    };

    test('HTTP 429 on GET: status becomes error, local progress retained, zero sync events, no stale overwrite', async () => {
      seedActiveProgress('shiza');
      let syncEventsFired = 0;
      const onSync = () => { syncEventsFired++; };
      if (typeof (globalThis as any).addEventListener === 'function') {
        (globalThis as any).addEventListener('academy-progress-synced', onSync);
      }

      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      const result = await syncProgress('shiza');
      assert.equal(result, null, 'Failed sync must return null');
      assert.equal(getSyncStatus('shiza'), 'error', "UI sync status must transition to 'error'");
      assert.equal(syncEventsFired, 0, 'Must NOT emit academy-progress-synced on 429 error');
      assertProgressRetained('shiza');

      if (typeof (globalThis as any).removeEventListener === 'function') {
        (globalThis as any).removeEventListener('academy-progress-synced', onSync);
      }
    });

    test('HTTP 500 on GET: status becomes error, local progress retained, zero sync events', async () => {
      seedActiveProgress('fazia');
      let syncEventsFired = 0;
      const onSync = () => { syncEventsFired++; };
      if (typeof (globalThis as any).addEventListener === 'function') {
        (globalThis as any).addEventListener('academy-progress-synced', onSync);
      }

      (globalThis as any).fetch = async () => {
        return new Response('Internal Server Error', {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        });
      };

      const result = await syncProgress('fazia');
      assert.equal(result, null);
      assert.equal(getSyncStatus('fazia'), 'error');
      assert.equal(syncEventsFired, 0);
      assertProgressRetained('fazia');

      if (typeof (globalThis as any).removeEventListener === 'function') {
        (globalThis as any).removeEventListener('academy-progress-synced', onSync);
      }
    });

    test('Network Rejection (TypeError/Offline): status becomes error, progress retained, zero sync events', async () => {
      seedActiveProgress('shiza');
      let syncEventsFired = 0;
      const onSync = () => { syncEventsFired++; };
      if (typeof (globalThis as any).addEventListener === 'function') {
        (globalThis as any).addEventListener('academy-progress-synced', onSync);
      }

      (globalThis as any).fetch = async () => {
        throw new TypeError('Failed to fetch: Network unreachable');
      };

      const result = await syncProgress('shiza');
      assert.equal(result, null);
      assert.equal(getSyncStatus('shiza'), 'error');
      assert.equal(syncEventsFired, 0);
      assertProgressRetained('shiza');

      if (typeof (globalThis as any).removeEventListener === 'function') {
        (globalThis as any).removeEventListener('academy-progress-synced', onSync);
      }
    });

    test('HTTP 429 on POST: returns stale GET remote snapshot but POST fails; local storage MUST NOT be overwritten', async () => {
      seedActiveProgress('shiza');
      let syncEventsFired = 0;
      const onSync = () => { syncEventsFired++; };
      if (typeof (globalThis as any).addEventListener === 'function') {
        (globalThis as any).addEventListener('academy-progress-synced', onSync);
      }

      // Stale remote snapshot where streak is 0 and exam is null
      const staleRemoteSnapshot: StudentProgressSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: '2026-11-01T00:00:00Z',
        spelling: {
          oxygen: {
            wordId: 'oxygen',
            studentId: 'shiza',
            attempts: 1,
            unaidedCorrectCount: 0,
            consecutiveUnaidedCorrect: 0,
            unaidedCorrectDates: [],
            lastAttemptDate: '2026-11-01T00:00:00Z',
            lastUnaidedCorrectDate: null,
            level: 'learning',
            needsRevisit: true,
            history: []
          }
        },
        subjects: {},
        learningRecords: []
      };

      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify(staleRemoteSnapshot), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        if (init?.method === 'POST') {
          return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response('Not found', { status: 404 });
      };

      const result = await syncProgress('shiza');
      assert.equal(result, null, 'Must return null when POST upload fails');
      assert.equal(getSyncStatus('shiza'), 'error');
      assert.equal(syncEventsFired, 0);

      // Verify localStorage was NOT overwritten by the stale remote snapshot!
      assertProgressRetained('shiza');

      if (typeof (globalThis as any).removeEventListener === 'function') {
        (globalThis as any).removeEventListener('academy-progress-synced', onSync);
      }
    });

    test('HTTP 500 on POST: local storage is NOT overwritten, status becomes error, zero sync events', async () => {
      seedActiveProgress('fazia');
      let syncEventsFired = 0;
      const onSync = () => { syncEventsFired++; };
      if (typeof (globalThis as any).addEventListener === 'function') {
        (globalThis as any).addEventListener('academy-progress-synced', onSync);
      }

      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify(null), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        if (init?.method === 'POST') {
          return new Response('Internal Server Error', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' }
          });
        }
        return new Response('Not found', { status: 404 });
      };

      const result = await syncProgress('fazia');
      assert.equal(result, null);
      assert.equal(getSyncStatus('fazia'), 'error');
      assert.equal(syncEventsFired, 0);
      assertProgressRetained('fazia');

      if (typeof (globalThis as any).removeEventListener === 'function') {
        (globalThis as any).removeEventListener('academy-progress-synced', onSync);
      }
    });

    test('Malformed responses (HTML error page, corrupted JSON, non-object) safely trigger error status without corruption', async () => {
      seedActiveProgress('shiza');

      // Test A: Malformed HTML returned on GET
      (globalThis as any).fetch = async () => {
        return new Response('<!DOCTYPE html><html><body>Error 502 Bad Gateway</body></html>', {
          status: 200, // Misconfigured server returning 200 with HTML error
          headers: { 'Content-Type': 'text/html' }
        });
      };

      let result = await syncProgress('shiza');
      assert.equal(result, null);
      assert.equal(getSyncStatus('shiza'), 'error');
      assertProgressRetained('shiza');

      // Test B: Corrupted JSON syntax on GET
      (globalThis as any).fetch = async () => {
        return new Response('{"studentId": "shiza", "version": 1, "syncedAt": ', {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      };

      result = await syncProgress('shiza');
      assert.equal(result, null);
      assert.equal(getSyncStatus('shiza'), 'error');
      assertProgressRetained('shiza');

      // Test C: Malformed payload returned on POST (wrong studentId in response)
      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify(null), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (init?.method === 'POST') {
          return new Response(JSON.stringify({ studentId: 'wrong_student' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response('Not found', { status: 404 });
      };

      result = await syncProgress('shiza');
      assert.equal(result, null);
      assert.equal(getSyncStatus('shiza'), 'error');
      assertProgressRetained('shiza');
    });

    test('Recovery: after transient 429/500 failure, subsequent sync succeeds and transitions to synced', async () => {
      seedActiveProgress('shiza');
      let failedOnce = false;

      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        if (!failedOnce) {
          failedOnce = true;
          // Fail the first sync attempt with 429
          return new Response(JSON.stringify({ error: 'Rate limit' }), { status: 429 });
        }
        // Succeed on retry
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify(null), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (init?.method === 'POST') {
          return new Response(String(init.body), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response('Not found', { status: 404 });
      };

      // 1. Initial attempt fails
      const res1 = await syncProgress('shiza');
      assert.equal(res1, null);
      assert.equal(getSyncStatus('shiza'), 'error');
      assertProgressRetained('shiza');

      // 2. Next attempt recovers
      const res2 = await syncProgress('shiza');
      assert.ok(res2);
      assert.equal(res2.studentId, 'shiza');
      assert.equal(getSyncStatus('shiza'), 'synced');
      assert.equal(res2.spelling?.oxygen?.consecutiveUnaidedCorrect, 4);
    });
  });

  // =========================================================================
  // 2. Profile Switching Concurrency & Queue Non-Cancellation
  // =========================================================================
  describe('2. Profile Switching Concurrency & Queue Non-Cancellation', () => {
    test('Switching profiles during 3s debounce immediately flushes outgoing learner without dropping or cross-contaminating updates', async () => {
      const serverRecords: Record<string, StudentProgressSnapshot> = {};

      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        const studentId = String(url).split('/').pop() as StudentId;
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify(serverRecords[studentId] ?? null), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        if (init?.method === 'POST') {
          const body = JSON.parse(String(init.body)) as StudentProgressSnapshot;
          serverRecords[studentId] = body;
          return new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response('Not found', { status: 404 });
      };

      // 1. Shiza solves Maths and schedules debounced sync
      mockStorage.setItem('academy_maths_shiza_v1', JSON.stringify({
        studentId: 'shiza',
        lessonId: 'maths-ch14',
        practice: { mode: 'practice', completedAt: '2026-11-08T10:00:00Z', answers: ['ShizaMaths'] },
        exam: null,
        reviewQuestionIds: []
      }));
      scheduleDebouncedSync('shiza');

      // 2. User switches to Fazia before the 3-second debounce expires.
      // Application handles switch: flushes Shiza, activates Fazia
      const flushPromise = flushPendingSync('shiza');

      // Fazia immediately completes EVS lesson
      mockStorage.setItem('academy_evs_fazia_v1', JSON.stringify({
        studentId: 'fazia',
        lessonId: 'evs-l2',
        practice: null,
        exam: { mode: 'exam', completedAt: '2026-11-08T10:00:05Z', answers: ['FaziaEVS'] },
        reviewQuestionIds: []
      }));
      const faziaSyncPromise = syncProgress('fazia');

      await Promise.all([flushPromise, faziaSyncPromise]);

      // Verify Shiza's updates were persisted to server
      assert.ok(serverRecords['shiza'], 'Shiza progress must be on server');
      assert.equal(serverRecords['shiza'].subjects?.maths?.practice?.answers?.[0], 'ShizaMaths');
      assert.ok(!('evs' in serverRecords['shiza'].subjects), "Shiza must NOT have Fazia's EVS");

      // Verify Fazia's updates were persisted to server
      assert.ok(serverRecords['fazia'], 'Fazia progress must be on server');
      assert.equal(serverRecords['fazia'].subjects?.evs?.exam?.answers?.[0], 'FaziaEVS');
      assert.ok(!('maths' in serverRecords['fazia'].subjects), "Fazia must NOT have Shiza's Maths");
    });

    test('Switching profiles while a sync is in-flight preserves pending updates and intermediate saves for both learners', async () => {
      const serverRecords: Record<string, StudentProgressSnapshot> = {};
      let resolveShizaPost!: (value: Response) => void;
      const shizaPostPromise = new Promise<Response>((resolve) => {
        resolveShizaPost = resolve;
      });

      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        const studentId = String(url).split('/').pop() as StudentId;
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify(serverRecords[studentId] ?? null), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        if (init?.method === 'POST') {
          const body = JSON.parse(String(init.body)) as StudentProgressSnapshot;
          serverRecords[studentId] = body;
          if (studentId === 'shiza' && body.subjects?.maths?.practice?.answers?.[0] === 'InFlightPractice') {
            // Delay Shiza's initial upload to keep it strictly in-flight
            return shizaPostPromise;
          }
          return new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response('Not found', { status: 404 });
      };

      // 1. Shiza starts sync (enters in-flight state)
      mockStorage.setItem('academy_maths_shiza_v1', JSON.stringify({
        studentId: 'shiza',
        lessonId: 'maths-ch14',
        practice: { mode: 'practice', completedAt: '2026-11-08T10:00:00Z', answers: ['InFlightPractice'] },
        exam: null,
        reviewQuestionIds: []
      }));
      const shizaInFlight = syncProgress('shiza');

      // 2. While Shiza is in-flight, Shiza completes an exam locally
      mockStorage.setItem('academy_maths_shiza_v1', JSON.stringify({
        studentId: 'shiza',
        lessonId: 'maths-ch14',
        practice: { mode: 'practice', completedAt: '2026-11-08T10:00:00Z', answers: ['InFlightPractice'] },
        exam: { mode: 'exam', completedAt: '2026-11-08T10:02:00Z', answers: ['IntermediateExam'] },
        reviewQuestionIds: []
      }));
      scheduleDebouncedSync('shiza');

      // 3. User switches to Fazia while Shiza is still in-flight
      // Fazia syncs her own work
      mockStorage.setItem('academy_evs_fazia_v1', JSON.stringify({
        studentId: 'fazia',
        lessonId: 'evs-l2',
        practice: { mode: 'practice', completedAt: '2026-11-08T10:03:00Z', answers: ['FaziaInFlight'] },
        exam: null,
        reviewQuestionIds: []
      }));
      const faziaSync = syncProgress('fazia');
      await faziaSync;

      // Fazia completed successfully
      assert.equal(serverRecords['fazia']?.subjects?.evs?.practice?.answers?.[0], 'FaziaInFlight');

      // 4. Release Shiza's in-flight request
      const currentShizaBody = serverRecords['shiza'];
      resolveShizaPost(new Response(JSON.stringify(currentShizaBody), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));

      // Shiza's sync promise finishes AND triggers coalesced follow-up sync for IntermediateExam
      await shizaInFlight;

      // Allow microtask cycle for coalesced sync to settle
      await new Promise(r => setTimeout(r, 20));

      // Assert Shiza's intermediate exam was NOT dropped or cancelled
      assert.ok(serverRecords['shiza']);
      assert.equal(
        serverRecords['shiza'].subjects?.maths?.exam?.answers?.[0],
        'IntermediateExam',
        "Shiza's intermediate save during in-flight upload must be coalesced and persisted"
      );
    });

    test('Rapid profile switches back and forth do not drop any updates or corrupt state', async () => {
      let serverState: Record<string, StudentProgressSnapshot> = {};

      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        const studentId = String(url).split('/').pop() as StudentId;
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify(serverState[studentId] ?? null), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        if (init?.method === 'POST') {
          const body = JSON.parse(String(init.body)) as StudentProgressSnapshot;
          serverState[studentId] = body;
          return new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response('Not found', { status: 404 });
      };

      // Alternating series of rapid actions and switches
      for (let i = 1; i <= 5; i++) {
        // Shiza action
        mockStorage.setItem('academy_maths_shiza_v1', JSON.stringify({
          studentId: 'shiza',
          lessonId: 'maths-ch14',
          practice: { mode: 'practice', completedAt: `2026-11-08T10:0${i}:00Z`, answers: [`ShizaStep${i}`] },
          exam: null,
          reviewQuestionIds: []
        }));
        scheduleDebouncedSync('shiza');

        // Switch to Fazia
        void flushPendingSync('shiza');

        // Fazia action
        mockStorage.setItem('academy_evs_fazia_v1', JSON.stringify({
          studentId: 'fazia',
          lessonId: 'evs-l1',
          practice: { mode: 'practice', completedAt: `2026-11-08T10:0${i}:30Z`, answers: [`FaziaStep${i}`] },
          exam: null,
          reviewQuestionIds: []
        }));
        scheduleDebouncedSync('fazia');

        // Switch back to Shiza
        void flushPendingSync('fazia');
      }

      // Flush both students at end
      await Promise.all([flushPendingSync('shiza'), flushPendingSync('fazia')]);

      assert.equal(serverState['shiza']?.subjects?.maths?.practice?.answers?.[0], 'ShizaStep5');
      assert.equal(serverState['fazia']?.subjects?.evs?.practice?.answers?.[0], 'FaziaStep5');
    });
  });

  // =========================================================================
  // 3. Student ID Whitelist Hardening
  // =========================================================================
  describe('3. Student ID Whitelist Hardening', () => {
    const invalidStudentIds = [
      'admin',
      'root',
      'guest',
      'user',
      'attacker',
      'shiza1',
      'fazia2',
      'shiza_extra',
      'fazia_test',
      'SHIZA',
      'FAZIA',
      'Shiza',
      'Fazia',
      '__proto__',
      'constructor',
      'null',
      'undefined',
      '..%2F..%2Fetc'
    ];

    for (const invalidId of invalidStudentIds) {
      test(`GET /api/progress/${invalidId} is strictly rejected with 400 Bad Request`, async () => {
        const req = new Request(`https://learn.firofame.workers.dev/api/progress/${invalidId}`, {
          method: 'GET'
        });
        const res = await worker.fetch(req, env);
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.ok(data.error);

        // Verify DO was never instantiated or populated
        assert.equal(doNamespace.getStoredSnapshot(invalidId), null);
      });

      test(`POST /api/progress/${invalidId} is strictly rejected with 400 Bad Request`, async () => {
        const req = new Request(`https://learn.firofame.workers.dev/api/progress/${invalidId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: invalidId,
            version: 1,
            syncedAt: new Date().toISOString(),
            spelling: {},
            subjects: {},
            learningRecords: []
          })
        });
        const res = await worker.fetch(req, env);
        assert.equal(res.status, 400);
        assert.equal(doNamespace.getStoredSnapshot(invalidId), null);
      });
    }

    test('POST with mismatched URL studentId and payload studentId is rejected with 400', async () => {
      // URL says shiza, body says fazia
      const req1 = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'fazia',
          version: 1,
          syncedAt: new Date().toISOString(),
          spelling: {},
          subjects: {},
          learningRecords: []
        })
      });
      const res1 = await worker.fetch(req1, env);
      assert.equal(res1.status, 400);
      const data1 = await res1.json();
      assert.match(data1.error, /does not match URL path/i);

      // URL says fazia, body says malicious
      const req2 = new Request('https://learn.firofame.workers.dev/api/progress/fazia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'malicious',
          version: 1,
          syncedAt: new Date().toISOString(),
          spelling: {},
          subjects: {},
          learningRecords: []
        })
      });
      const res2 = await worker.fetch(req2, env);
      assert.equal(res2.status, 400);
    });

    test('Path with missing student ID (/api/progress/) is rejected with 400', async () => {
      const req = new Request('https://learn.firofame.workers.dev/api/progress/', {
        method: 'GET'
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 400);
    });
  });

  // =========================================================================
  // 4. Query String Injection Rejection
  // =========================================================================
  describe('4. Query String Injection Rejection', () => {
    const maliciousQueryUrls = [
      'https://learn.firofame.workers.dev/api/progress/shiza?q=1',
      'https://learn.firofame.workers.dev/api/progress/shiza?bypass=true',
      'https://learn.firofame.workers.dev/api/progress/shiza?cacheBust=12345678',
      'https://learn.firofame.workers.dev/api/progress/fazia?sql=1%20OR%201=1',
      'https://learn.firofame.workers.dev/api/progress/fazia?admin=1&token=xyz',
      'https://learn.firofame.workers.dev/api/progress/shiza?flag',
      'https://learn.firofame.workers.dev/api/progress/shiza?empty=',
      'https://learn.firofame.workers.dev/api/progress/shiza?__proto__=1',
      'https://learn.firofame.workers.dev/api/progress/shiza?studentId=fazia'
    ];

    for (const url of maliciousQueryUrls) {
      test(`GET ${url} is rejected with 400 Bad Request`, async () => {
        const req = new Request(url, { method: 'GET' });
        const res = await worker.fetch(req, env);
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.error, 'Query parameters are not supported.');
      });

      test(`POST ${url} is rejected with 400 Bad Request`, async () => {
        const req = new Request(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: 'shiza',
            version: 1,
            syncedAt: new Date().toISOString(),
            spelling: {},
            subjects: {},
            learningRecords: []
          })
        });
        const res = await worker.fetch(req, env);
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.equal(data.error, 'Query parameters are not supported.');
      });
    }
  });

  // =========================================================================
  // 5. Payload Size Limit Enforcement (2 MiB)
  // =========================================================================
  describe('5. Payload Size Limit Enforcement (2 MiB)', () => {
    const MAX_ALLOWED = 2 * 1024 * 1024; // 2,097,152 bytes

    test('POST with payload exceeding 2 MiB (2,097,153 bytes) is rejected with 413 Payload Too Large', async () => {
      // Create padding to push byte length beyond 2 MiB
      const padding = 'x'.repeat(MAX_ALLOWED);
      const oversizedPayload = {
        studentId: 'shiza',
        version: 1,
        syncedAt: new Date().toISOString(),
        spelling: {},
        subjects: {},
        learningRecords: [],
        padding
      };
      const rawJson = JSON.stringify(oversizedPayload);
      assert.ok(new TextEncoder().encode(rawJson).byteLength > MAX_ALLOWED);

      const req = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(new TextEncoder().encode(rawJson).byteLength)
        },
        body: rawJson
      });

      const res = await worker.fetch(req, env);
      assert.equal(res.status, 413, 'Must return 413 Payload Too Large');
      const data = await res.json();
      assert.match(data.error, /Payload too large/i);
    });

    test('POST with spoofed Content-Length header is caught by body byteLength check and rejected with 413', async () => {
      const padding = 'x'.repeat(MAX_ALLOWED + 100);
      const rawJson = JSON.stringify({ studentId: 'shiza', padding });

      // Spoof Content-Length as 50 bytes while actual body is >2MB
      const req = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': '50'
        },
        body: rawJson
      });

      const res = await worker.fetch(req, env);
      assert.equal(res.status, 413);
      const data = await res.json();
      assert.match(data.error, /Payload too large/i);
    });

    test('POST with declared Content-Length > 2 MiB is rejected with 413 before reading body', async () => {
      const req = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(MAX_ALLOWED + 5000)
        },
        body: JSON.stringify({ studentId: 'shiza' })
      });

      const res = await worker.fetch(req, env);
      assert.equal(res.status, 413);
    });

    test('Direct call to ProgressDurableObject also enforces 2 MiB limit independently', async () => {
      assert.ok(env.PROGRESS_DO);
      const stub = env.PROGRESS_DO.get(env.PROGRESS_DO.idFromName('shiza'));
      const padding = 'x'.repeat(MAX_ALLOWED);
      const rawJson = JSON.stringify({ studentId: 'shiza', padding });

      const req = new Request('https://internal/api/progress/shiza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawJson
      });

      const res = await stub.fetch(req);
      assert.equal(res.status, 413);
    });

    test('POST with valid payload within 2 MiB limit succeeds (200 OK)', async () => {
      const validPayload: StudentProgressSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: new Date().toISOString(),
        spelling: {
          word1: {
            wordId: 'word1',
            studentId: 'shiza',
            attempts: 1,
            unaidedCorrectCount: 1,
            consecutiveUnaidedCorrect: 1,
            unaidedCorrectDates: ['2026-11-08T10:00:00Z'],
            lastAttemptDate: '2026-11-08T10:00:00Z',
            lastUnaidedCorrectDate: '2026-11-08T10:00:00Z',
            level: 'practising',
            needsRevisit: false,
            history: []
          }
        },
        subjects: {},
        learningRecords: []
      };

      const req = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validPayload)
      });

      const res = await worker.fetch(req, env);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.studentId, 'shiza');
      assert.ok(data.spelling.word1);
    });
  });

  // =========================================================================
  // 6. CORS Origin Validation & Unauthorized Origin Rejection
  // =========================================================================
  describe('6. CORS Origin Validation & Unauthorized Origin Rejection', () => {
    test('Allowed origin receives 200 OK and matching Access-Control-Allow-Origin header', async () => {
      const req = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
        method: 'GET',
        headers: { Origin: ALLOWED_ORIGIN_PROD }
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGIN_PROD);
      assert.equal(res.headers.get('Vary'), 'Origin');
    });

    test('Allowed origin secondary domain (GitHub Pages) receives 200 and CORS header', async () => {
      const req = new Request('https://learn.firofame.workers.dev/api/progress/fazia', {
        method: 'GET',
        headers: { Origin: ALLOWED_ORIGIN_PAGES }
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGIN_PAGES);
    });

    test('OPTIONS preflight for allowed origin receives 204 No Content with CORS methods and headers', async () => {
      const req = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
        method: 'OPTIONS',
        headers: { Origin: ALLOWED_ORIGIN_PROD }
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 204);
      assert.equal(res.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGIN_PROD);
      assert.equal(res.headers.get('Access-Control-Allow-Methods'), 'GET, POST, OPTIONS');
      assert.equal(res.headers.get('Access-Control-Allow-Headers'), 'Content-Type');
      assert.equal(res.headers.get('Access-Control-Max-Age'), '600');
    });

    test('Same-origin request matching URL origin is allowed', async () => {
      const req = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
        method: 'GET',
        headers: { Origin: 'https://learn.firofame.workers.dev' }
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://learn.firofame.workers.dev');
    });

    test('Missing Origin header (same-origin browser navigation / server fetch) is allowed without CORS header', async () => {
      const req = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
        method: 'GET'
      });
      const res = await worker.fetch(req, env);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
    });

    const unauthorizedOrigins = [
      'https://evil-site.com',
      'https://attacker.org',
      'https://learn.firofame.workers.dev.attacker.com',
      'https://malicious-firofame.github.io',
      'http://learn.firofame.workers.dev', // Insecure HTTP downgrade
      'null', // Sandboxed iframe origin string
      'https://subdomain.firofame.github.io'
    ];

    for (const origin of unauthorizedOrigins) {
      test(`GET from unauthorized origin '${origin}' is rejected with 403 Forbidden`, async () => {
        const req = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'GET',
          headers: { Origin: origin }
        });
        const res = await worker.fetch(req, env);
        assert.equal(res.status, 403, `Origin ${origin} must be rejected with 403`);
        const data = await res.json();
        assert.equal(data.error, 'Origin not allowed.');
        assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
      });

      test(`OPTIONS preflight from unauthorized origin '${origin}' is rejected with 403 Forbidden`, async () => {
        const req = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'OPTIONS',
          headers: { Origin: origin }
        });
        const res = await worker.fetch(req, env);
        assert.equal(res.status, 403, `Preflight from ${origin} must be rejected with 403`);
        assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
      });

      test(`POST from unauthorized origin '${origin}' is rejected with 403 and does NOT modify state`, async () => {
        const req = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: origin
          },
          body: JSON.stringify({
            studentId: 'shiza',
            version: 1,
            syncedAt: new Date().toISOString(),
            spelling: {
              hackedWord: {
                wordId: 'hackedWord',
                studentId: 'shiza',
                attempts: 99,
                unaidedCorrectCount: 99,
                consecutiveUnaidedCorrect: 99,
                unaidedCorrectDates: [],
                lastAttemptDate: '2026-11-08T10:00:00Z',
                lastUnaidedCorrectDate: '2026-11-08T10:00:00Z',
                level: 'remembered',
                needsRevisit: false,
                history: []
              }
            },
            subjects: {},
            learningRecords: []
          })
        });

        const res = await worker.fetch(req, env);
        assert.equal(res.status, 403);
        assert.equal(doNamespace.getStoredSnapshot('shiza'), null, 'DO storage must NOT be modified');
      });
    }
  });
});
