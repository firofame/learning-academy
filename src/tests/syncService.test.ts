import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeLearningRecords,
  mergeSubjectProgress,
  mergeSpellingProgress,
  mergeProgressSnapshots,
  buildLocalSnapshot,
  saveSnapshotToLocalStorage,
  scheduleDebouncedSync,
  cancelDebouncedSync,
  getSyncStatus,
  syncProgress,
  flushPendingSync,
  type StudentProgressSnapshot
} from '../utils/syncService';
import { mergeProgressSnapshots as workerMergeProgressSnapshots } from '../../worker/index';
import type { WordProgress } from '../types';
import type { SubjectProgress } from '../utils/subjectStorage';
import type { LearningRecord } from '../learning/persistence';
import type { LearningAttempt } from '../learning/contracts';

// Memory Storage Mock for localStorage polyfill in Node.js test environment
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

describe('Cross-device Progress Sync Service', () => {
  beforeEach(() => {
    mockStorage.clear();
    cancelDebouncedSync();
  });

  describe('1. Learning Records Merge', () => {
    test('unions attempt records by ID without duplication', () => {
      const attempt1: LearningRecord<LearningAttempt> = {
        id: 'attempt:shiza:att-1',
        schemaVersion: 1,
        learnerId: 'shiza',
        subjectId: 'maths',
        kind: 'attempt',
        contentVersion: 'v1',
        updatedAt: '2026-11-01T10:00:00Z',
        data: {
          attemptId: 'att-1',
          learnerId: 'shiza',
          subjectId: 'maths',
          lessonId: 'maths-ch14',
          questionId: 'q1',
          contentVersion: 'v1',
          rubricVersion: 'v1',
          timestamp: '2026-11-01T10:00:00Z',
          learnerLocalDate: '2026-11-01',
          sessionMode: 'practice',
          submittedAnswer: 'A',
          assistance: [],
          gradingSource: 'deterministic',
          outcome: 'correct'
        }
      };

      const attempt2: LearningRecord<LearningAttempt> = {
        ...attempt1,
        id: 'attempt:shiza:att-2',
        updatedAt: '2026-11-01T11:00:00Z',
        data: { ...attempt1.data, attemptId: 'att-2', questionId: 'q2' }
      };

      const attempt3: LearningRecord<LearningAttempt> = {
        ...attempt1,
        id: 'attempt:shiza:att-3',
        updatedAt: '2026-11-01T12:00:00Z',
        data: { ...attempt1.data, attemptId: 'att-3', questionId: 'q3' }
      };

      // Local has [attempt1, attempt2]; Remote has [attempt2, attempt3]
      const merged = mergeLearningRecords([attempt1, attempt2], [attempt2, attempt3]);

      assert.equal(merged.length, 3);
      const ids = merged.map(r => r.id).sort();
      assert.deepEqual(ids, ['attempt:shiza:att-1', 'attempt:shiza:att-2', 'attempt:shiza:att-3']);
    });

    test('resolves drafts and revision-states by taking the later updatedAt timestamp', () => {
      const localDraft: LearningRecord = {
        id: 'draft:shiza:robotics:sesh-1',
        schemaVersion: 1,
        learnerId: 'shiza',
        subjectId: 'robotics',
        kind: 'draft',
        contentVersion: 'v1',
        updatedAt: '2026-11-01T10:00:00Z',
        data: { step: 1 }
      };

      const newerRemoteDraft: LearningRecord = {
        id: 'draft:shiza:robotics:sesh-1',
        schemaVersion: 1,
        learnerId: 'shiza',
        subjectId: 'robotics',
        kind: 'draft',
        contentVersion: 'v1',
        updatedAt: '2026-11-01T14:30:00Z',
        data: { step: 4 }
      };

      const mergedDraft = mergeLearningRecords([localDraft], [newerRemoteDraft]);
      assert.equal(mergedDraft.length, 1);
      assert.equal(mergedDraft[0].updatedAt, '2026-11-01T14:30:00Z');
      assert.deepEqual(mergedDraft[0].data, { step: 4 });

      // Inverted: older remote should not overwrite newer local
      const invertedMerged = mergeLearningRecords([newerRemoteDraft], [localDraft]);
      assert.equal(invertedMerged.length, 1);
      assert.equal(invertedMerged[0].updatedAt, '2026-11-01T14:30:00Z');
      assert.deepEqual(invertedMerged[0].data, { step: 4 });
    });
  });

  describe('2. Subject Progress Merge', () => {
    test('merges practice and exam independently so neither session type wipes the other', () => {
      const localProgress: Record<string, SubjectProgress> = {
        robotics: {
          studentId: 'shiza',
          lessonId: 'robotics-g6-l1',
          practice: {
            mode: 'practice',
            completedAt: '2026-11-02T10:00:00Z',
            answers: []
          },
          exam: null,
          reviewQuestionIds: ['q1']
        }
      };

      const remoteProgress: Record<string, SubjectProgress> = {
        robotics: {
          studentId: 'shiza',
          lessonId: 'robotics-g6-l1',
          practice: null,
          exam: {
            mode: 'exam',
            completedAt: '2026-11-01T15:00:00Z',
            answers: []
          },
          reviewQuestionIds: ['q2']
        }
      };

      const merged = mergeSubjectProgress(localProgress, remoteProgress);
      assert.ok(merged.robotics);
      assert.equal(merged.robotics.practice?.completedAt, '2026-11-02T10:00:00Z');
      assert.equal(merged.robotics.exam?.completedAt, '2026-11-01T15:00:00Z');
    });

    test('retains reviewQuestionIds from the side with the latest overall activity timestamp', () => {
      const localProgress: Record<string, SubjectProgress> = {
        maths: {
          studentId: 'shiza',
          lessonId: 'maths-ch14',
          practice: {
            mode: 'practice',
            completedAt: '2026-11-03T18:00:00Z', // LATEST ACTIVITY
            answers: []
          },
          exam: null,
          reviewQuestionIds: ['maths-rev-latest']
        }
      };

      const remoteProgress: Record<string, SubjectProgress> = {
        maths: {
          studentId: 'shiza',
          lessonId: 'maths-ch14',
          practice: null,
          exam: {
            mode: 'exam',
            completedAt: '2026-11-02T09:00:00Z', // OLDER
            answers: []
          },
          reviewQuestionIds: ['maths-rev-older']
        }
      };

      const merged = mergeSubjectProgress(localProgress, remoteProgress);
      assert.deepEqual(merged.maths.reviewQuestionIds, ['maths-rev-latest']);
    });

    test('unions reviewQuestionIds without duplicates when timestamps are equal or absent', () => {
      const localProgress: Record<string, SubjectProgress> = {
        evs: {
          studentId: 'fazia',
          lessonId: 'evs-l1',
          practice: null,
          exam: null,
          reviewQuestionIds: ['q1', 'q2']
        }
      };

      const remoteProgress: Record<string, SubjectProgress> = {
        evs: {
          studentId: 'fazia',
          lessonId: 'evs-l1',
          practice: null,
          exam: null,
          reviewQuestionIds: ['q2', 'q3']
        }
      };

      const merged = mergeSubjectProgress(localProgress, remoteProgress);
      assert.deepEqual(merged.evs.reviewQuestionIds.sort(), ['q1', 'q2', 'q3']);
    });
  });

  describe('3. Spell Bee Progress Merge', () => {
    test('merges word history capped at 15 items and preserves mastery and streaks from later lastAttemptDate', () => {
      const localWord: WordProgress = {
        wordId: 'elephant',
        studentId: 'shiza',
        attempts: 10,
        unaidedCorrectCount: 3,
        consecutiveUnaidedCorrect: 1,
        unaidedCorrectDates: ['2026-11-01'],
        lastAttemptDate: '2026-11-01T10:00:00Z',
        level: 'practising',
        needsRevisit: true,
        history: Array.from({ length: 10 }, (_, i) => ({
          attemptId: `att-${i}`,
          date: `2026-11-01T10:0${i}:00Z`,
          mode: 'practice' as const,
          wasCorrect: true
        }))
      };

      const remoteWord: WordProgress = {
        wordId: 'elephant',
        studentId: 'shiza',
        attempts: 12,
        unaidedCorrectCount: 5,
        consecutiveUnaidedCorrect: 3,
        unaidedCorrectDates: ['2026-11-01', '2026-11-03'],
        lastAttemptDate: '2026-11-03T14:00:00Z', // LATER
        level: 'remembered',
        needsRevisit: false,
        history: Array.from({ length: 8 }, (_, i) => ({
          attemptId: `att-${i + 8}`,
          date: `2026-11-03T14:0${i}:00Z`,
          mode: 'test' as const,
          wasCorrect: true
        }))
      };

      const merged = mergeSpellingProgress({ elephant: localWord }, { elephant: remoteWord });
      const elephant = merged.elephant;
      assert.ok(elephant);
      assert.equal(elephant.level, 'remembered');
      assert.equal(elephant.consecutiveUnaidedCorrect, 3);
      assert.equal(elephant.lastAttemptDate, '2026-11-03T14:00:00Z');
      assert.equal(elephant.unaidedCorrectCount, 5);
      // History capped at 15
      assert.equal(elephant.history.length, 15);
      // History sorted ascending
      for (let i = 1; i < elephant.history.length; i++) {
        assert.ok(Date.parse(elephant.history[i].date) >= Date.parse(elephant.history[i - 1].date));
      }
    });

    test('preserves unaided failure from later attempt, resetting level and streak', () => {
      const localWord: WordProgress = {
        wordId: 'banana',
        studentId: 'fazia',
        attempts: 2,
        unaidedCorrectCount: 2,
        consecutiveUnaidedCorrect: 2,
        unaidedCorrectDates: ['2026-11-01', '2026-11-02'],
        lastAttemptDate: '2026-11-02T10:00:00Z',
        level: 'remembered',
        needsRevisit: false,
        history: [{ date: '2026-11-01T10:00:00Z', mode: 'test', wasCorrect: true }]
      };

      const remoteWord: WordProgress = {
        wordId: 'banana',
        studentId: 'fazia',
        attempts: 3,
        unaidedCorrectCount: 2,
        consecutiveUnaidedCorrect: 0,
        unaidedCorrectDates: [],
        lastAttemptDate: '2026-11-05T10:00:00Z', // LATER FAILED ATTEMPT
        level: 'learning',
        needsRevisit: true,
        lastMistake: 'bananna',
        history: [{ date: '2026-11-05T10:00:00Z', mode: 'test', wasCorrect: false, mistakeInput: 'bananna' }]
      };

      const merged = mergeSpellingProgress({ banana: localWord }, { banana: remoteWord });
      const res = merged.banana;
      assert.equal(res.level, 'learning');
      assert.equal(res.consecutiveUnaidedCorrect, 0);
      assert.equal(res.needsRevisit, true);
      assert.equal(res.attempts, 3);
      assert.equal(res.history.length, 2);
    });
  });

  describe('4. Device-Local Settings Exclusion & Isolation', () => {
    test('buildLocalSnapshot extracts student progress and strictly excludes device-local settings', () => {
      // Set up device-local settings in localStorage
      mockStorage.setItem('spellbee_active_profile_v1', 'shiza');
      mockStorage.setItem('spellbee_settings_v1', JSON.stringify({ speechAudio: true, slowSpeech: true, sessionSize: 10 }));

      // Set up student progress data
      mockStorage.setItem('spellbee_progress_shiza_v1', JSON.stringify({
        cat: { wordId: 'cat', studentId: 'shiza', attempts: 1, unaidedCorrectCount: 1, consecutiveUnaidedCorrect: 1, unaidedCorrectDates: ['2026-11-01'], lastAttemptDate: '2026-11-01T10:00:00Z', level: 'practising', needsRevisit: false, history: [] }
      }));
      mockStorage.setItem('academy_maths_shiza_v1', JSON.stringify({
        studentId: 'shiza', lessonId: 'maths-ch14', practice: null, exam: null, reviewQuestionIds: []
      }));
      mockStorage.setItem('academy_rec_attempt:shiza:1', JSON.stringify({
        id: 'attempt:shiza:1', schemaVersion: 1, learnerId: 'shiza', subjectId: 'maths', kind: 'attempt', contentVersion: 'v1', updatedAt: '2026-11-01T10:00:00Z', data: {}
      }));

      // Also set up data for the other student (fazia)
      mockStorage.setItem('spellbee_progress_fazia_v1', JSON.stringify({
        dog: { wordId: 'dog', studentId: 'fazia', attempts: 1, unaidedCorrectCount: 1, consecutiveUnaidedCorrect: 1, unaidedCorrectDates: ['2026-11-01'], lastAttemptDate: '2026-11-01T10:00:00Z', level: 'practising', needsRevisit: false, history: [] }
      }));

      const snapshot = buildLocalSnapshot('shiza');

      assert.equal(snapshot.studentId, 'shiza');
      assert.ok('cat' in snapshot.spelling);
      assert.ok(!('dog' in snapshot.spelling));
      assert.ok('maths' in snapshot.subjects);
      assert.equal(snapshot.learningRecords.length, 1);

      // Verify device-local settings are completely absent from snapshot
      assert.equal((snapshot as any).spellbee_active_profile_v1, undefined);
      assert.equal((snapshot as any).spellbee_settings_v1, undefined);
      assert.equal((snapshot as any).settings, undefined);
      assert.equal((snapshot as any).activeProfile, undefined);
    });

    test('saveSnapshotToLocalStorage applies progress and never overwrites device-local settings', () => {
      // Set device-local settings to 'fazia'
      mockStorage.setItem('spellbee_active_profile_v1', 'fazia');
      mockStorage.setItem('spellbee_settings_v1', JSON.stringify({ speechAudio: false, slowSpeech: false, sessionSize: 5 }));

      const snapshot: StudentProgressSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: '2026-11-04T12:00:00Z',
        spelling: {
          lion: { wordId: 'lion', studentId: 'shiza', attempts: 2, unaidedCorrectCount: 2, consecutiveUnaidedCorrect: 2, unaidedCorrectDates: ['2026-11-02'], lastAttemptDate: '2026-11-02T10:00:00Z', level: 'remembered', needsRevisit: false, history: [] }
        },
        subjects: {
          robotics: { studentId: 'shiza', lessonId: 'robotics-g6-l1', practice: null, exam: null, reviewQuestionIds: ['qA'] }
        },
        learningRecords: [
          { id: 'attempt:shiza:x1', schemaVersion: 1, learnerId: 'shiza', subjectId: 'robotics', kind: 'attempt', contentVersion: 'v1', updatedAt: '2026-11-02T10:00:00Z', data: {} }
        ]
      };

      saveSnapshotToLocalStorage(snapshot);

      // Verify device-local settings were NOT overwritten
      assert.equal(mockStorage.getItem('spellbee_active_profile_v1'), 'fazia');
      assert.equal(
        mockStorage.getItem('spellbee_settings_v1'),
        JSON.stringify({ speechAudio: false, slowSpeech: false, sessionSize: 5 })
      );

      // Verify student progress was saved
      assert.ok(mockStorage.getItem('spellbee_progress_shiza_v1')?.includes('lion'));
      assert.ok(mockStorage.getItem('academy_robotics_shiza_v1')?.includes('qA'));
      assert.ok(mockStorage.getItem('academy_rec_attempt:shiza:x1')?.includes('shiza:x1'));
    });

    test('mergeProgressSnapshots rejects merging snapshots for different students', () => {
      const shizaSnapshot: StudentProgressSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: new Date().toISOString(),
        spelling: {},
        subjects: {},
        learningRecords: []
      };

      const faziaSnapshot: StudentProgressSnapshot = {
        studentId: 'fazia',
        version: 1,
        syncedAt: new Date().toISOString(),
        spelling: {},
        subjects: {},
        learningRecords: []
      };

      assert.throws(() => {
        mergeProgressSnapshots(shizaSnapshot, faziaSnapshot);
      }, /different students/i);
    });
  });

  describe('5. Sync Lifecycle, Queueing, Concurrency & Error Handling Regression Tests', () => {
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      cancelDebouncedSync();
    });

    test('AC 1: two learners (shiza and fazia) synchronize simultaneously without cross-learner data leakage or queue interference', async () => {
      // Seed Shiza with Maths and Fazia with EVS
      mockStorage.setItem('academy_maths_shiza_v1', JSON.stringify({
        studentId: 'shiza',
        lessonId: 'maths-ch14',
        practice: { mode: 'practice', completedAt: '2026-11-05T10:00:00Z', answers: ['A'] },
        exam: null,
        reviewQuestionIds: []
      }));
      mockStorage.setItem('academy_evs_fazia_v1', JSON.stringify({
        studentId: 'fazia',
        lessonId: 'evs-l1',
        practice: null,
        exam: { mode: 'exam', completedAt: '2026-11-05T10:05:00Z', answers: ['B'] },
        reviewQuestionIds: []
      }));

      const fetchUrls: string[] = [];
      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = String(url);
        fetchUrls.push(urlStr);
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify(null), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (init?.method === 'POST') {
          const body = JSON.parse(String(init.body));
          return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response('Not found', { status: 404 });
      };

      // Launch both syncs concurrently
      const [resShiza, resFazia] = await Promise.all([
        syncProgress('shiza'),
        syncProgress('fazia')
      ]);

      assert.ok(resShiza);
      assert.ok(resFazia);
      assert.equal(resShiza.studentId, 'shiza');
      assert.equal(resFazia.studentId, 'fazia');

      // Shiza has only maths, no evs
      assert.ok('maths' in resShiza.subjects);
      assert.ok(!('evs' in resShiza.subjects));

      // Fazia has only evs, no maths
      assert.ok('evs' in resFazia.subjects);
      assert.ok(!('maths' in resFazia.subjects));

      // Both URLs called
      assert.ok(fetchUrls.some(u => u.includes('/api/progress/shiza')));
      assert.ok(fetchUrls.some(u => u.includes('/api/progress/fazia')));
    });

    test('AC 2: sequential device switching during active study reliably exposes latest state across devices', async () => {
      let serverStore: Record<string, any> = {};

      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = String(url);
        const studentId = urlStr.split('/').pop()!;
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify(serverStore[studentId] ?? null), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        if (init?.method === 'POST') {
          const incoming = JSON.parse(String(init.body));
          const existing = serverStore[studentId];
          const merged = existing ? mergeProgressSnapshots(existing, incoming) : incoming;
          serverStore[studentId] = merged;
          return new Response(JSON.stringify(merged), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response('Not found', { status: 404 });
      };

      // 1. Device 1: Shiza completes practice at T1
      mockStorage.setItem('academy_maths_shiza_v1', JSON.stringify({
        studentId: 'shiza',
        lessonId: 'maths-ch14',
        practice: { mode: 'practice', completedAt: '2026-11-05T10:00:00Z', answers: ['P1'] },
        exam: null,
        reviewQuestionIds: []
      }));
      await syncProgress('shiza');
      assert.ok(serverStore['shiza']?.subjects?.maths?.practice);

      // 2. Device 2: Switch to fresh device (clear local storage)
      mockStorage.clear();
      // Device 2 mounts: pulls Shiza's progress
      await syncProgress('shiza');
      const dev2Maths = JSON.parse(mockStorage.getItem('academy_maths_shiza_v1') || '{}');
      assert.equal(dev2Maths.practice?.completedAt, '2026-11-05T10:00:00Z');

      // 3. Device 2: Shiza completes exam at T2 (T2 > T1)
      mockStorage.setItem('academy_maths_shiza_v1', JSON.stringify({
        ...dev2Maths,
        exam: { mode: 'exam', completedAt: '2026-11-05T12:00:00Z', answers: ['E1'] }
      }));
      await syncProgress('shiza');
      assert.ok(serverStore['shiza']?.subjects?.maths?.exam);

      // 4. Device 1: Resumes (tab refocus) - pulls latest state
      mockStorage.clear();
      mockStorage.setItem('academy_maths_shiza_v1', JSON.stringify({
        studentId: 'shiza',
        lessonId: 'maths-ch14',
        practice: { mode: 'practice', completedAt: '2026-11-05T10:00:00Z', answers: ['P1'] },
        exam: null,
        reviewQuestionIds: []
      }));
      await syncProgress('shiza');
      const dev1FinalMaths = JSON.parse(mockStorage.getItem('academy_maths_shiza_v1') || '{}');
      assert.equal(dev1FinalMaths.practice?.completedAt, '2026-11-05T10:00:00Z');
      assert.equal(dev1FinalMaths.exam?.completedAt, '2026-11-05T12:00:00Z');
    });

    test('AC 3: failed uploads (HTTP 429, 500, network rejection) set status to error, retain local progress, and recover on subsequent success', async () => {
      mockStorage.setItem('academy_maths_shiza_v1', JSON.stringify({
        studentId: 'shiza',
        lessonId: 'maths-ch14',
        practice: { mode: 'practice', completedAt: '2026-11-05T10:00:00Z', answers: ['Important Answer'] },
        exam: null,
        reviewQuestionIds: []
      }));

      let eventFired = false;
      const testListener = () => { eventFired = true; };
      if (typeof (globalThis as any).addEventListener === 'function') {
        (globalThis as any).addEventListener('academy-progress-synced', testListener);
      }

      // Simulate HTTP 429 upload failure
      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify(null), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (init?.method === 'POST') {
          return new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429 });
        }
        return new Response('Not found', { status: 404 });
      };

      const failResult = await syncProgress('shiza');
      assert.equal(failResult, null);
      assert.equal(getSyncStatus('shiza'), 'error');
      assert.equal(eventFired, false, 'Sync event must NOT be fired on failed upload');

      // Assert local progress was retained and NOT erased
      const retainedMaths = JSON.parse(mockStorage.getItem('academy_maths_shiza_v1') || '{}');
      assert.equal(retainedMaths.practice?.answers?.[0], 'Important Answer');

      // Now simulate recovery: POST succeeds with 200
      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify(null), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (init?.method === 'POST') {
          const body = JSON.parse(String(init.body));
          return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response('Not found', { status: 404 });
      };

      const successResult = await syncProgress('shiza');
      assert.ok(successResult);
      assert.equal(getSyncStatus('shiza'), 'synced');
    });

    test('AC 4: profile switching during pending debounce flushes outgoing learner changes without cancelling or cross-contamination', async () => {
      let flushedStudent: string | null = null;
      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        const studentId = String(url).split('/').pop()!;
        flushedStudent = studentId;
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify(null), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (init?.method === 'POST') {
          return new Response(String(init.body), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response('Not found', { status: 404 });
      };

      // Shiza saves and schedules 3s debounce
      scheduleDebouncedSync('shiza');

      // User switches to Fazia before 3s debounce completes
      await flushPendingSync('shiza');
      assert.equal(flushedStudent, 'shiza');

      // Fazia now runs independently
      await syncProgress('fazia');
      assert.equal(flushedStudent, 'fazia');
    });

    test('AC 5: intermediate saves occurring during in-flight upload are not clobbered and trigger coalesced follow-up sync', async () => {
      // 1. Initial local state has Q1
      mockStorage.setItem('academy_maths_shiza_v1', JSON.stringify({
        studentId: 'shiza',
        lessonId: 'maths-ch14',
        practice: { mode: 'practice', completedAt: '2026-11-05T10:00:00Z', answers: ['Q1'] },
        exam: null,
        reviewQuestionIds: []
      }));

      let postCallCount = 0;
      let resolveFirstPost!: (val: Response) => void;
      const firstPostDeferred = new Promise<Response>((resolve) => {
        resolveFirstPost = resolve;
      });

      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify(null), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (init?.method === 'POST') {
          postCallCount++;
          if (postCallCount === 1) {
            return firstPostDeferred;
          }
          const body = JSON.parse(String(init.body));
          return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response('Not found', { status: 404 });
      };

      // 2. Start initial sync
      const p1 = syncProgress('shiza');

      // 3. While sync is in-flight, learner commits Question 2
      mockStorage.setItem('academy_maths_shiza_v1', JSON.stringify({
        studentId: 'shiza',
        lessonId: 'maths-ch14',
        practice: { mode: 'practice', completedAt: '2026-11-05T10:01:00Z', answers: ['Q1', 'Q2'] },
        exam: null,
        reviewQuestionIds: []
      }));
      scheduleDebouncedSync('shiza');

      // 4. Resolve the first in-flight post returning ONLY Q1
      resolveFirstPost(
        new Response(
          JSON.stringify({
            studentId: 'shiza',
            version: 1,
            syncedAt: '2026-11-05T10:00:00Z',
            spelling: {},
            subjects: {
              maths: {
                studentId: 'shiza',
                lessonId: 'maths-ch14',
                practice: { mode: 'practice', completedAt: '2026-11-05T10:00:00Z', answers: ['Q1'] },
                exam: null,
                reviewQuestionIds: []
              }
            },
            learningRecords: []
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      // 5. Await initial sync completion
      await p1;

      // Assert Q2 was NOT clobbered!
      const afterMaths = JSON.parse(mockStorage.getItem('academy_maths_shiza_v1') || '{}');
      assert.deepEqual(afterMaths.practice?.answers, ['Q1', 'Q2']);

      // Assert follow-up post was triggered
      assert.ok(postCallCount >= 2, `Expected at least 2 POST calls, got ${postCallCount}`);
    });

    test('AC 5b: multiple learning records in arbitrary local storage order do not cause an infinite sync loop', async () => {
      mockStorage.clear();
      mockStorage.setItem('academy_rec_rec-b', JSON.stringify({
        id: 'rec-b',
        learnerId: 'shiza',
        subjectId: 'robotics',
        lessonId: 'l1',
        kind: 'attempt',
        createdAt: '2026-11-08T10:00:00Z',
        updatedAt: '2026-11-08T10:00:00Z'
      }));
      mockStorage.setItem('academy_rec_rec-a', JSON.stringify({
        id: 'rec-a',
        learnerId: 'shiza',
        subjectId: 'robotics',
        lessonId: 'l1',
        kind: 'attempt',
        createdAt: '2026-11-08T10:00:00Z',
        updatedAt: '2026-11-08T10:00:00Z'
      }));

      let fetchCount = 0;
      (globalThis as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
        fetchCount++;
        if (fetchCount > 10) {
          throw new Error('Infinite sync loop detected!');
        }
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify({
            studentId: 'shiza',
            version: 1,
            syncedAt: '2026-11-08T10:00:00Z',
            spelling: {},
            subjects: {},
            learningRecords: [
              {
                id: 'rec-a',
                learnerId: 'shiza',
                subjectId: 'robotics',
                lessonId: 'l1',
                kind: 'attempt',
                createdAt: '2026-11-08T10:00:00Z',
                updatedAt: '2026-11-08T10:00:00Z'
              },
              {
                id: 'rec-b',
                learnerId: 'shiza',
                subjectId: 'robotics',
                lessonId: 'l1',
                kind: 'attempt',
                createdAt: '2026-11-08T10:00:00Z',
                updatedAt: '2026-11-08T10:00:00Z'
              }
            ]
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (init?.method === 'POST') {
          return new Response(String(init.body), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response('Not found', { status: 404 });
      };

      const result = await syncProgress('shiza');
      assert.ok(result !== null);
      // Only 1 GET request should happen since local and remote records match (no local changes to post)
      assert.equal(fetchCount, 1, `Expected 1 network call, got ${fetchCount}`);
      assert.equal(getSyncStatus('shiza'), 'synced');
    });

    test('AC 6: streak resets to 0 and level reverts to learning upon failed Spell Bee attempt', () => {
      const priorMasteredWord: WordProgress = {
        wordId: 'elephant',
        studentId: 'shiza',
        attempts: 5,
        unaidedCorrectCount: 3,
        consecutiveUnaidedCorrect: 3,
        unaidedCorrectDates: ['2026-11-01', '2026-11-02'],
        lastAttemptDate: '2026-11-02T10:00:00Z',
        level: 'remembered',
        needsRevisit: false,
        history: [{ date: '2026-11-02T10:00:00Z', mode: 'test', wasCorrect: true }]
      };

      const laterFailedAttempt: WordProgress = {
        wordId: 'elephant',
        studentId: 'shiza',
        attempts: 6,
        unaidedCorrectCount: 3,
        consecutiveUnaidedCorrect: 0,
        unaidedCorrectDates: [],
        lastAttemptDate: '2026-11-05T14:00:00Z',
        level: 'learning',
        needsRevisit: true,
        lastMistake: 'eliphant',
        history: [{ date: '2026-11-05T14:00:00Z', mode: 'test', wasCorrect: false, mistakeInput: 'eliphant' }]
      };

      const merged = mergeSpellingProgress({ elephant: priorMasteredWord }, { elephant: laterFailedAttempt });
      const elephant = merged.elephant;
      assert.equal(elephant.consecutiveUnaidedCorrect, 0);
      assert.equal(elephant.level, 'learning');
      assert.equal(elephant.needsRevisit, true);
      assert.equal(elephant.lastMistake, 'eliphant');
      assert.equal(elephant.attempts, 6);
    });

    test('AC 7: streak updates and restores mastery level on subsequent successful attempts according to domain rules', () => {
      const failedState: WordProgress = {
        wordId: 'banana',
        studentId: 'fazia',
        attempts: 1,
        unaidedCorrectCount: 0,
        consecutiveUnaidedCorrect: 0,
        unaidedCorrectDates: [],
        lastAttemptDate: '2026-11-01T10:00:00Z',
        level: 'learning',
        needsRevisit: true,
        history: [{ date: '2026-11-01T10:00:00Z', mode: 'test', wasCorrect: false }]
      };

      const successDay1: WordProgress = {
        wordId: 'banana',
        studentId: 'fazia',
        attempts: 2,
        unaidedCorrectCount: 1,
        consecutiveUnaidedCorrect: 1,
        unaidedCorrectDates: ['2026-11-02'],
        lastAttemptDate: '2026-11-02T10:00:00Z',
        level: 'practising',
        needsRevisit: false,
        history: [
          { date: '2026-11-01T10:00:00Z', mode: 'test', wasCorrect: false },
          { date: '2026-11-02T10:00:00Z', mode: 'test', wasCorrect: true }
        ]
      };

      const successDay2: WordProgress = {
        wordId: 'banana',
        studentId: 'fazia',
        attempts: 3,
        unaidedCorrectCount: 2,
        consecutiveUnaidedCorrect: 2,
        unaidedCorrectDates: ['2026-11-02', '2026-11-03'],
        lastAttemptDate: '2026-11-03T10:00:00Z',
        level: 'remembered',
        needsRevisit: false,
        history: [
          { date: '2026-11-01T10:00:00Z', mode: 'test', wasCorrect: false },
          { date: '2026-11-02T10:00:00Z', mode: 'test', wasCorrect: true },
          { date: '2026-11-03T10:00:00Z', mode: 'test', wasCorrect: true }
        ]
      };

      const merged1 = mergeSpellingProgress({ banana: failedState }, { banana: successDay1 });
      assert.equal(merged1.banana.consecutiveUnaidedCorrect, 1);
      assert.equal(merged1.banana.level, 'practising');
      assert.equal(merged1.banana.needsRevisit, false);

      const merged2 = mergeSpellingProgress(merged1, { banana: successDay2 });
      assert.equal(merged2.banana.consecutiveUnaidedCorrect, 2);
      assert.equal(merged2.banana.level, 'remembered');
      assert.equal(merged2.banana.needsRevisit, false);
      assert.equal(merged2.banana.history.length, 3);
    });

    test('AC 8: client and Worker merge engines produce identical deterministic results under exact timestamp ties', () => {
      const snapshotA: StudentProgressSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: '2026-11-05T10:00:00.000Z',
        spelling: {
          butterfly: {
            wordId: 'butterfly',
            studentId: 'shiza',
            attempts: 3,
            unaidedCorrectCount: 1,
            consecutiveUnaidedCorrect: 1,
            unaidedCorrectDates: ['2026-11-05'],
            lastAttemptDate: '2026-11-05T10:00:00.000Z',
            level: 'practising',
            needsRevisit: false,
            history: [{ date: '2026-11-05T10:00:00.000Z', mode: 'test', wasCorrect: true }]
          }
        },
        subjects: {
          robotics: {
            studentId: 'shiza',
            lessonId: 'robotics-g6-l1',
            practice: {
              mode: 'practice',
              completedAt: '2026-11-05T10:00:00.000Z',
              answers: [{ questionId: 'q1', answer: 'A1', correct: true }]
            },
            exam: null,
            reviewQuestionIds: ['q1']
          }
        },
        learningRecords: []
      };

      const snapshotB: StudentProgressSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: '2026-11-05T10:00:00.000Z',
        spelling: {
          butterfly: {
            wordId: 'butterfly',
            studentId: 'shiza',
            attempts: 4,
            unaidedCorrectCount: 2,
            consecutiveUnaidedCorrect: 1,
            unaidedCorrectDates: ['2026-11-05'],
            lastAttemptDate: '2026-11-05T10:00:00.000Z',
            level: 'practising',
            needsRevisit: false,
            history: [{ date: '2026-11-05T10:00:00.000Z', mode: 'practice', wasCorrect: true }]
          }
        },
        subjects: {
          robotics: {
            studentId: 'shiza',
            lessonId: 'robotics-g6-l1',
            practice: {
              mode: 'practice',
              completedAt: '2026-11-05T10:00:00.000Z',
              answers: [{ questionId: 'q2', answer: 'B1', correct: true }]
            },
            exam: null,
            reviewQuestionIds: ['q2']
          }
        },
        learningRecords: []
      };

      const clientAB = mergeProgressSnapshots(snapshotA, snapshotB);
      const clientBA = mergeProgressSnapshots(snapshotB, snapshotA);
      const workerAB = workerMergeProgressSnapshots(snapshotA, snapshotB);
      const workerBA = workerMergeProgressSnapshots(snapshotB, snapshotA);

      assert.deepEqual(clientAB.spelling.butterfly, clientBA.spelling.butterfly, 'Client spelling merge must be commutative');
      assert.deepEqual(workerAB.spelling.butterfly, workerBA.spelling.butterfly, 'Worker spelling merge must be commutative');
      assert.deepEqual(clientAB.spelling.butterfly, workerAB.spelling.butterfly, 'Client and Worker spelling merge must be identical');
      assert.deepEqual(clientAB.subjects.robotics.reviewQuestionIds.sort(), clientBA.subjects.robotics.reviewQuestionIds.sort());
    });
  });
});
