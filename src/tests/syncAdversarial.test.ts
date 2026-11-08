import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeLearningRecords as clientMergeLearningRecords,
  mergeSubjectProgress as clientMergeSubjectProgress,
  mergeSpellingProgress as clientMergeSpellingProgress,
  mergeProgressSnapshots as clientMergeProgressSnapshots,
  buildLocalSnapshot,
  saveSnapshotToLocalStorage,
  type StudentProgressSnapshot as ClientSnapshot
} from '../utils/syncService';
import worker, {
  ProgressDurableObject,
  mergeLearningRecords as workerMergeLearningRecords,
  mergeSubjectProgress as workerMergeSubjectProgress,
  mergeSpellingProgress as workerMergeSpellingProgress,
  mergeProgressSnapshots as workerMergeProgressSnapshots,
  type Env,
  type StudentProgressSnapshot as WorkerSnapshot
} from '../../worker/index';
import { MockDurableObjectNamespace } from './syncWorker.test';
import type { WordProgress, StudentId } from '../types';
import { loadSubjectProgressBase, type SubjectProgress, type SubjectResult } from '../utils/subjectStorage';
import type { LearningRecord } from '../learning/persistence';
import type { LearningAttempt } from '../learning/contracts';

// In-Memory Storage Mock for localStorage polyfill in Node.js test environment
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

// In-Memory KV Namespace Mock
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

const mockStorage = new MockLocalStorage();
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = mockStorage;

function createWorkerEnv(doNamespace?: MockDurableObjectNamespace): Env {
  const env: Env = {
    GEMINI_API_KEY: 'test-key',
    ALLOWED_ORIGINS: 'https://learn.firofame.workers.dev,https://firofame.github.io'
  };
  env.PROGRESS_DO = doNamespace ?? new MockDurableObjectNamespace(ProgressDurableObject, env);
  return env;
}

describe('Adversarial Stress Testing: Client & Worker Sync Engine', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  // =========================================================================
  // 1. DETERMINISTIC MERGE EDGE CASES
  // =========================================================================

  describe('1.1 Identical Timestamps', () => {
    test('identical updatedAt timestamps for mutable learning records (drafts)', () => {
      const recA: LearningRecord = {
        id: 'draft:shiza:bio-ch1',
        schemaVersion: 1,
        learnerId: 'shiza',
        subjectId: 'biology',
        kind: 'draft',
        contentVersion: 'v1',
        updatedAt: '2026-11-01T12:00:00.000Z',
        data: { state: 'draft_device_A' }
      };

      const recB: LearningRecord = {
        ...recA,
        data: { state: 'draft_device_B' }
      };

      // Client merge: existing record (first in local) is maintained if remote is not strictly greater
      const mergedLocalFirst = clientMergeLearningRecords([recA], [recB]);
      assert.equal(mergedLocalFirst.length, 1);
      assert.deepEqual(mergedLocalFirst[0].data, { state: 'draft_device_A' });

      // Worker merge: same deterministic behavior
      const workerMerged = workerMergeLearningRecords([recA], [recB]);
      assert.equal(workerMerged.length, 1);
      assert.deepEqual(workerMerged[0].data, { state: 'draft_device_A' });
    });

    test('identical completedAt timestamps in subject progress practice/exam', () => {
      const subA: SubjectProgress = {
        studentId: 'shiza',
        lessonId: 'bio-lesson-1',
        practice: {
          mode: 'practice',
          completedAt: '2026-11-01T10:00:00.000Z',
          answers: ['ans-device-A'] as any
        },
        exam: {
          mode: 'exam',
          completedAt: '2026-11-01T11:00:00.000Z',
          answers: ['exam-device-A'] as any
        },
        reviewQuestionIds: ['q1', 'q2']
      };

      const subB: SubjectProgress = {
        studentId: 'shiza',
        lessonId: 'bio-lesson-1',
        practice: {
          mode: 'practice',
          completedAt: '2026-11-01T10:00:00.000Z', // identical timestamp
          answers: ['ans-device-B'] as any
        },
        exam: {
          mode: 'exam',
          completedAt: '2026-11-01T11:00:00.000Z', // identical timestamp
          answers: ['exam-device-B'] as any
        },
        reviewQuestionIds: ['q2', 'q3']
      };

      const merged = clientMergeSubjectProgress({ biology: subA }, { biology: subB });
      assert.ok(merged.biology);
      // When timestamps are identical, pickLaterSubjectResult maintains a (local)
      assert.deepEqual(merged.biology.practice?.answers, ['ans-device-A']);
      assert.deepEqual(merged.biology.exam?.answers, ['exam-device-A']);
      // When overall activity is identical, reviewQuestionIds are unioned without duplicates
      assert.deepEqual(merged.biology.reviewQuestionIds.sort(), ['q1', 'q2', 'q3']);
    });

    test('identical lastAttemptDate in spell bee progress', () => {
      const wordA: WordProgress = {
        wordId: 'accommodate',
        studentId: 'shiza',
        attempts: 5,
        unaidedCorrectCount: 3,
        consecutiveUnaidedCorrect: 2,
        unaidedCorrectDates: ['2026-11-01'],
        lastAttemptDate: '2026-11-01T10:00:00.000Z',
        level: 'learning',
        needsRevisit: false,
        history: [
          { date: '2026-11-01T10:00:00.000Z', mode: 'practice', wasCorrect: true }
        ]
      };

      const wordB: WordProgress = {
        wordId: 'accommodate',
        studentId: 'shiza',
        attempts: 6,
        unaidedCorrectCount: 4,
        consecutiveUnaidedCorrect: 1,
        unaidedCorrectDates: ['2026-11-01'],
        lastAttemptDate: '2026-11-01T10:00:00.000Z', // identical
        level: 'learning',
        needsRevisit: false,
        history: [
          { date: '2026-11-01T10:00:00.000Z', mode: 'practice', wasCorrect: false }
        ]
      };

      const merged = clientMergeSpellingProgress({ accommodate: wordA }, { accommodate: wordB });
      // When timestamps are equal, primary is local (wordA)
      assert.equal(merged.accommodate.consecutiveUnaidedCorrect, 2);
      // Cumulative counters take the max
      assert.equal(merged.accommodate.attempts, 6);
      assert.equal(merged.accommodate.unaidedCorrectCount, 4);
      // History deduplicates identical date:mode
      assert.equal(merged.accommodate.history.length, 1);
    });

    test('commutative merge: identical lastAttemptDate produces identical results in both call orders', () => {
      const wordA: WordProgress = {
        wordId: 'accommodate',
        studentId: 'shiza',
        attempts: 5,
        unaidedCorrectCount: 3,
        consecutiveUnaidedCorrect: 2,
        unaidedCorrectDates: ['2026-11-01'],
        lastAttemptDate: '2026-11-01T10:00:00.000Z',
        level: 'learning',
        needsRevisit: false,
        history: [{ date: '2026-11-01T10:00:00.000Z', mode: 'practice', wasCorrect: true }]
      };

      const wordB: WordProgress = {
        wordId: 'accommodate',
        studentId: 'shiza',
        attempts: 6,
        unaidedCorrectCount: 4,
        consecutiveUnaidedCorrect: 1,
        unaidedCorrectDates: ['2026-11-01'],
        lastAttemptDate: '2026-11-01T10:00:00.000Z',
        level: 'learning',
        needsRevisit: false,
        history: [{ date: '2026-11-01T10:00:00.000Z', mode: 'practice', wasCorrect: false }]
      };

      const clientAB = clientMergeSpellingProgress({ accommodate: wordA }, { accommodate: wordB });
      const clientBA = clientMergeSpellingProgress({ accommodate: wordB }, { accommodate: wordA });
      const workerAB = workerMergeSpellingProgress({ accommodate: wordA }, { accommodate: wordB });
      const workerBA = workerMergeSpellingProgress({ accommodate: wordB }, { accommodate: wordA });

      assert.deepEqual(clientAB, clientBA, 'Client merge must be commutative');
      assert.deepEqual(workerAB, workerBA, 'Worker merge must be commutative');
      assert.deepEqual(clientAB, workerAB, 'Client and Worker merge must be identical');
      assert.equal(JSON.stringify(clientAB), JSON.stringify(workerBA), 'JSON key order must match identically');
    });

    test('assisted practice after unaided failure preserves needsRevisit: true and lastMistake', () => {
      // Device A: Failed unaided test at 10:00
      const deviceA: WordProgress = {
        wordId: 'separate',
        studentId: 'shiza',
        attempts: 3,
        unaidedCorrectCount: 1,
        consecutiveUnaidedCorrect: 0,
        unaidedCorrectDates: [],
        lastAttemptDate: '2026-11-01T10:00:00.000Z',
        level: 'learning',
        needsRevisit: true,
        lastMistake: 'seperate',
        history: [
          { date: '2026-11-01T10:00:00.000Z', mode: 'test', wasCorrect: false, mistakeInput: 'seperate' }
        ]
      };

      // Device B: Succeeded in assisted practice at 10:15
      const deviceB: WordProgress = {
        wordId: 'separate',
        studentId: 'shiza',
        attempts: 4,
        unaidedCorrectCount: 1,
        consecutiveUnaidedCorrect: 0,
        unaidedCorrectDates: [],
        lastAttemptDate: '2026-11-01T10:15:00.000Z',
        level: 'learning',
        needsRevisit: false,
        history: [
          { date: '2026-11-01T10:15:00.000Z', mode: 'practice', wasCorrect: true }
        ]
      };

      const mergedAB = clientMergeSpellingProgress({ separate: deviceA }, { separate: deviceB }).separate;
      const mergedBA = clientMergeSpellingProgress({ separate: deviceB }, { separate: deviceA }).separate;

      assert.equal(mergedAB.needsRevisit, true, 'Assisted success must not clear needsRevisit');
      assert.equal(mergedBA.needsRevisit, true, 'Symmetric call must also preserve needsRevisit');
      assert.equal(mergedAB.lastMistake, 'seperate');
      assert.equal(mergedBA.lastMistake, 'seperate');
      assert.equal(mergedAB.consecutiveUnaidedCorrect, 0);
    });

    test('assisted practice on stale device does not resurrect wiped unaided streak', () => {
      // Device A had unaided failure at 11:00
      const deviceA: WordProgress = {
        wordId: 'calendar',
        studentId: 'fazia',
        attempts: 5,
        unaidedCorrectCount: 2,
        consecutiveUnaidedCorrect: 0,
        unaidedCorrectDates: [],
        lastAttemptDate: '2026-11-02T11:00:00.000Z',
        level: 'learning',
        needsRevisit: true,
        history: [
          { date: '2026-11-02T11:00:00.000Z', mode: 'test', wasCorrect: false, mistakeInput: 'calender' }
        ]
      };

      // Device B was offline with stale streak 3 from yesterday, and did assisted practice at 11:10
      const deviceB: WordProgress = {
        wordId: 'calendar',
        studentId: 'fazia',
        attempts: 6,
        unaidedCorrectCount: 2,
        consecutiveUnaidedCorrect: 3,
        unaidedCorrectDates: ['2026-11-01'],
        lastAttemptDate: '2026-11-02T11:10:00.000Z',
        level: 'remembered',
        needsRevisit: false,
        history: [
          { date: '2026-11-02T11:10:00.000Z', mode: 'practice', wasCorrect: true }
        ]
      };

      const mergedAB = clientMergeSpellingProgress({ calendar: deviceA }, { calendar: deviceB }).calendar;
      const mergedBA = clientMergeSpellingProgress({ calendar: deviceB }, { calendar: deviceA }).calendar;

      assert.equal(mergedAB.consecutiveUnaidedCorrect, 0, 'Streak must remain 0 after unaided failure');
      assert.equal(mergedBA.consecutiveUnaidedCorrect, 0);
      assert.equal(mergedAB.level, 'learning');
      assert.equal(mergedBA.level, 'learning');
      assert.equal(mergedAB.needsRevisit, true);
      assert.equal(mergedAB.needsRevisit, true);
    });
  });

  describe('1.2 Invalid Date Formats', () => {
    test('handles invalid date strings in learning records without crashing or throwing', () => {
      const recValid: LearningRecord = {
        id: 'rev:shiza:bio-1',
        schemaVersion: 1,
        learnerId: 'shiza',
        subjectId: 'biology',
        kind: 'revision-state',
        contentVersion: 'v1',
        updatedAt: '2026-11-01T12:00:00.000Z',
        data: { step: 1 }
      };

      const recInvalid1: LearningRecord = {
        ...recValid,
        updatedAt: 'not-a-valid-date',
        data: { step: 2 }
      };

      const recInvalid2: LearningRecord = {
        ...recValid,
        updatedAt: '99999-99-99T99:99:99Z',
        data: { step: 3 }
      };

      // Invalid updatedAt vs valid: valid timestamp (> 0) should overwrite invalid (NaN -> 0)
      const merged1 = clientMergeLearningRecords([recInvalid1], [recValid]);
      assert.equal(merged1[0].updatedAt, '2026-11-01T12:00:00.000Z');
      assert.deepEqual(merged1[0].data, { step: 1 });

      // Invalid remote vs valid local: valid local remains
      const merged2 = clientMergeLearningRecords([recValid], [recInvalid2]);
      assert.equal(merged2[0].updatedAt, '2026-11-01T12:00:00.000Z');
      assert.deepEqual(merged2[0].data, { step: 1 });

      // Both invalid: does not throw, retains first seen
      const merged3 = clientMergeLearningRecords([recInvalid1], [recInvalid2]);
      assert.equal(merged3.length, 1);
      assert.deepEqual(merged3[0].data, { step: 2 });
    });

    test('handles invalid date strings in subject progress completedAt', () => {
      const subA: SubjectProgress = {
        studentId: 'shiza',
        lessonId: 'ch1',
        practice: {
          mode: 'practice',
          completedAt: 'corrupted-date',
          answers: ['A'] as any
        },
        exam: null,
        reviewQuestionIds: ['q1']
      };

      const subB: SubjectProgress = {
        studentId: 'shiza',
        lessonId: 'ch1',
        practice: {
          mode: 'practice',
          completedAt: '2026-11-01T10:00:00.000Z',
          answers: ['B'] as any
        },
        exam: null,
        reviewQuestionIds: ['q2']
      };

      const merged = clientMergeSubjectProgress({ maths: subA }, { maths: subB });
      // Valid completedAt (subB) beats corrupted-date (subA)
      assert.equal(merged.maths.practice?.completedAt, '2026-11-01T10:00:00.000Z');
      assert.deepEqual(merged.maths.practice?.answers, ['B']);
    });

    test('handles invalid date strings in spell bee lastAttemptDate and history', () => {
      const wordA: WordProgress = {
        wordId: 'cat',
        studentId: 'fazia',
        attempts: 1,
        unaidedCorrectCount: 1,
        consecutiveUnaidedCorrect: 1,
        unaidedCorrectDates: ['2026-11-01'],
        lastAttemptDate: 'garbage-date',
        level: 'learning',
        needsRevisit: false,
        history: [
          { date: 'garbage-date', mode: 'practice', wasCorrect: true },
          { date: '2026-11-02T10:00:00.000Z', mode: 'test', wasCorrect: true }
        ]
      };

      const wordB: WordProgress = {
        wordId: 'cat',
        studentId: 'fazia',
        attempts: 2,
        unaidedCorrectCount: 2,
        consecutiveUnaidedCorrect: 2,
        unaidedCorrectDates: ['2026-11-02'],
        lastAttemptDate: '2026-11-02T10:00:00.000Z',
        level: 'mastered' as any,
        needsRevisit: false,
        history: [
          { date: '2026-11-01T10:00:00.000Z', mode: 'practice', wasCorrect: true }
        ]
      };

      const merged = clientMergeSpellingProgress({ cat: wordA }, { cat: wordB });
      assert.equal(merged.cat.lastAttemptDate, '2026-11-02T10:00:00.000Z');
      assert.equal(merged.cat.level, 'mastered');
      assert.equal(merged.cat.consecutiveUnaidedCorrect, 2);
      // History sorted cleanly without NaN explosions
      assert.ok(merged.cat.history.length >= 2);
    });
  });

  describe('1.3 Missing Fields, Null, and Undefined Properties', () => {
    test('handles null/undefined fields in snapshots and records', () => {
      const localSnapshot: ClientSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: '2026-11-01T10:00:00.000Z',
        spelling: null as any,
        subjects: undefined as any,
        learningRecords: null as any
      };

      const remoteSnapshot: ClientSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: '2026-11-01T11:00:00.000Z',
        spelling: {},
        subjects: {},
        learningRecords: []
      };

      // Should not throw TypeError on null/undefined
      const merged = clientMergeProgressSnapshots(localSnapshot, remoteSnapshot);
      assert.equal(merged.studentId, 'shiza');
      assert.deepEqual(merged.spelling, {});
      assert.deepEqual(merged.subjects, {});
      assert.deepEqual(merged.learningRecords, []);
    });

    test('handles sparse or partially empty subject progress objects', () => {
      const localSparse = {
        chemistry: {
          studentId: 'shiza',
          lessonId: 'chem-1',
          practice: null,
          exam: null,
          reviewQuestionIds: undefined as any
        }
      } as any;

      const remoteSparse = {
        chemistry: {
          studentId: 'shiza',
          lessonId: 'chem-1',
          // practice is omitted/undefined (a missing field)
          exam: {
            mode: 'exam' as const,
            completedAt: '2026-11-01T10:00:00.000Z',
            answers: [{ questionId: 'q1', answer: 'A', correct: true }]
          },
          reviewQuestionIds: ['q10']
        }
      } as any;

      const merged = clientMergeSubjectProgress(localSparse, remoteSparse);
      assert.ok(merged.chemistry);

      // Save to localStorage
      saveSnapshotToLocalStorage({
        studentId: 'shiza',
        version: 1,
        syncedAt: new Date().toISOString(),
        spelling: {},
        subjects: merged,
        learningRecords: []
      });

      // Now verify how the app reads this back from localStorage
      const loaded = loadSubjectProgressBase('chemistry', 'shiza', 'chem-1');
      // If practice was undefined, loadSubjectProgressBase will fail validation and reset progress!
      assert.ok(loaded.exam !== null, 'Saved exam progress must NOT be wiped/reset on reload');
      assert.equal(loaded.exam?.completedAt, '2026-11-01T10:00:00.000Z');
    });

    test('handles learning records array containing null, undefined, or empty objects', () => {
      const local = [
        null as any,
        undefined as any,
        {} as any,
        { id: 'att-1', kind: 'attempt', learnerId: 'shiza', updatedAt: '2026-11-01T10:00:00.000Z' }
      ];

      const remote = [
        undefined as any,
        { id: 'att-2', kind: 'attempt', learnerId: 'shiza', updatedAt: '2026-11-01T11:00:00.000Z' },
        { noId: true } as any
      ];

      const merged = clientMergeLearningRecords(local as any, remote as any);
      assert.equal(merged.length, 2);
      assert.equal(merged[0].id, 'att-1');
      assert.equal(merged[1].id, 'att-2');
    });

    test('handles spelling word records with null history or missing counters', () => {
      const wordLocal: any = {
        wordId: 'tree',
        studentId: 'fazia',
        attempts: undefined,
        unaidedCorrectCount: null,
        history: null
      };

      const wordRemote: any = {
        wordId: 'tree',
        studentId: 'fazia',
        attempts: 3,
        unaidedCorrectCount: 2,
        history: [
          null,
          undefined,
          { date: '2026-11-01T10:00:00.000Z', mode: 'practice', wasCorrect: true }
        ]
      };

      const merged = clientMergeSpellingProgress({ tree: wordLocal }, { tree: wordRemote });
      assert.ok(merged.tree);
      assert.equal(merged.tree.attempts, 3);
      assert.equal(merged.tree.unaidedCorrectCount, 2);
      assert.equal(merged.tree.history.length, 1);
    });
  });

  describe('1.4 Out-of-Order Attempts & Attempt ID Collisions', () => {
    test('unions attempts across devices regardless of arrival order', () => {
      const makeAttempt = (id: string, time: string): LearningRecord<LearningAttempt> => ({
        id: `attempt:shiza:${id}`,
        schemaVersion: 1,
        learnerId: 'shiza',
        subjectId: 'maths',
        kind: 'attempt',
        contentVersion: 'v1',
        updatedAt: time,
        data: {
          attemptId: id,
          learnerId: 'shiza',
          subjectId: 'maths',
          lessonId: 'maths-1',
          questionId: `q-${id}`,
          contentVersion: 'v1',
          rubricVersion: 'v1',
          timestamp: time,
          learnerLocalDate: '2026-11-01',
          sessionMode: 'practice',
          submittedAnswer: 'A',
          assistance: [],
          gradingSource: 'deterministic',
          outcome: 'correct'
        }
      });

      // Local has attempts 1, 3, 5; Remote has attempts 2, 4
      const local = [
        makeAttempt('att-1', '2026-11-01T10:00:00.000Z'),
        makeAttempt('att-3', '2026-11-01T12:00:00.000Z'),
        makeAttempt('att-5', '2026-11-01T14:00:00.000Z')
      ];

      const remote = [
        makeAttempt('att-4', '2026-11-01T13:00:00.000Z'),
        makeAttempt('att-2', '2026-11-01T11:00:00.000Z')
      ];

      const merged = clientMergeLearningRecords(local, remote);
      assert.equal(merged.length, 5);
      const ids = merged.map(r => r.id);
      assert.ok(ids.includes('attempt:shiza:att-1'));
      assert.ok(ids.includes('attempt:shiza:att-2'));
      assert.ok(ids.includes('attempt:shiza:att-3'));
      assert.ok(ids.includes('attempt:shiza:att-4'));
      assert.ok(ids.includes('attempt:shiza:att-5'));
    });

    test('attempt ID collision preserves immutable existing attempt record without duplication', () => {
      const attempt1: LearningRecord = {
        id: 'attempt:shiza:uuid-fixed',
        schemaVersion: 1,
        learnerId: 'shiza',
        subjectId: 'maths',
        kind: 'attempt',
        contentVersion: 'v1',
        updatedAt: '2026-11-01T10:00:00.000Z',
        data: { answer: 'original' }
      };

      const attemptColliding: LearningRecord = {
        id: 'attempt:shiza:uuid-fixed',
        schemaVersion: 1,
        learnerId: 'shiza',
        subjectId: 'maths',
        kind: 'attempt',
        contentVersion: 'v1',
        updatedAt: '2026-11-01T12:00:00.000Z', // later time!
        data: { answer: 'conflicting_modification_attempt' }
      };

      // Because attempts are immutable event logs, kind === 'attempt' MUST NOT be overwritten
      const merged = clientMergeLearningRecords([attempt1], [attemptColliding]);
      assert.equal(merged.length, 1);
      assert.deepEqual(merged[0].data, { answer: 'original' });
    });
  });

  describe('1.5 Rapid Alternating Practice and Exam Sessions', () => {
    test('rapid interleaved practice and exam sessions preserve both modalities and track latest reviewQuestionIds', () => {
      // Step 1: Device A completes practice at T1
      let deviceA: SubjectProgress = {
        studentId: 'shiza',
        lessonId: 'robotics-l1',
        practice: {
          mode: 'practice',
          completedAt: '2026-11-01T09:00:00.000Z',
          answers: ['p1'] as any
        },
        exam: null,
        reviewQuestionIds: ['q-practice-1']
      };

      // Step 2: Device B completes exam at T2 (T2 > T1)
      let deviceB: SubjectProgress = {
        studentId: 'shiza',
        lessonId: 'robotics-l1',
        practice: null,
        exam: {
          mode: 'exam',
          completedAt: '2026-11-01T10:00:00.000Z',
          answers: ['e1'] as any
        },
        reviewQuestionIds: ['q-exam-1']
      };

      // Merge 1
      let merged = clientMergeSubjectProgress({ robotics: deviceA }, { robotics: deviceB }).robotics;
      assert.equal(merged.practice?.completedAt, '2026-11-01T09:00:00.000Z');
      assert.equal(merged.exam?.completedAt, '2026-11-01T10:00:00.000Z');
      // T2 (exam) > T1 (practice), so reviewQuestionIds reflect exam
      assert.deepEqual(merged.reviewQuestionIds, ['q-exam-1']);

      // Step 3: Device A completes new practice at T3 (T3 > T2)
      deviceA = {
        ...merged,
        practice: {
          mode: 'practice',
          completedAt: '2026-11-01T11:00:00.000Z',
          answers: ['p2'] as any
        },
        reviewQuestionIds: ['q-practice-2']
      };

      merged = clientMergeSubjectProgress({ robotics: deviceA }, { robotics: deviceB }).robotics;
      assert.equal(merged.practice?.completedAt, '2026-11-01T11:00:00.000Z');
      assert.equal(merged.exam?.completedAt, '2026-11-01T10:00:00.000Z'); // preserved!
      // T3 (practice) > T2 (exam), so reviewQuestionIds reflect latest practice
      assert.deepEqual(merged.reviewQuestionIds, ['q-practice-2']);

      // Step 4: Device B completes new exam at T4 (T4 > T3)
      deviceB = {
        ...merged,
        exam: {
          mode: 'exam',
          completedAt: '2026-11-01T12:00:00.000Z',
          answers: ['e2'] as any
        },
        reviewQuestionIds: []
      };

      merged = clientMergeSubjectProgress({ robotics: deviceA }, { robotics: deviceB }).robotics;
      assert.equal(merged.practice?.completedAt, '2026-11-01T11:00:00.000Z'); // preserved!
      assert.equal(merged.exam?.completedAt, '2026-11-01T12:00:00.000Z');
      assert.deepEqual(merged.reviewQuestionIds, []);
    });
  });

  describe('1.6 Spell Bee Mastery Resets', () => {
    test('unaided failure on Device B after success on Device A resets streak to 0 and level to learning', () => {
      // Device A: Learner mastered the word on Nov 1
      const deviceA: WordProgress = {
        wordId: 'pronunciation',
        studentId: 'shiza',
        attempts: 10,
        unaidedCorrectCount: 8,
        consecutiveUnaidedCorrect: 5,
        unaidedCorrectDates: ['2026-10-30', '2026-10-31', '2026-11-01'],
        lastAttemptDate: '2026-11-01T10:00:00.000Z',
        lastUnaidedCorrectDate: '2026-11-01T10:00:00.000Z',
        level: 'mastered' as any,
        needsRevisit: false,
        history: [
          { date: '2026-11-01T10:00:00.000Z', mode: 'practice', wasCorrect: true }
        ]
      };

      // Device B: Learner attempts unaided on Nov 2 and FAILS
      const deviceB: WordProgress = {
        wordId: 'pronunciation',
        studentId: 'shiza',
        attempts: 11,
        unaidedCorrectCount: 8,
        consecutiveUnaidedCorrect: 0, // Reset!
        unaidedCorrectDates: ['2026-10-30', '2026-10-31', '2026-11-01'],
        lastAttemptDate: '2026-11-02T15:00:00.000Z', // LATER
        lastUnaidedCorrectDate: '2026-11-01T10:00:00.000Z',
        level: 'learning', // Demoted!
        lastMistake: 'pronounciation',
        needsRevisit: true, // Needs revisit!
        history: [
          { date: '2026-11-02T15:00:00.000Z', mode: 'test', wasCorrect: false, mistakeInput: 'pronounciation' }
        ]
      };

      // Merge on Client: Device A (local) merged with Device B (remote)
      const mergedClient = clientMergeSpellingProgress({ pronunciation: deviceA }, { pronunciation: deviceB }).pronunciation;
      assert.equal(mergedClient.consecutiveUnaidedCorrect, 0, 'Streak must be 0 after later unaided failure');
      assert.equal(mergedClient.level, 'learning', 'Level must reset to learning');
      assert.equal(mergedClient.needsRevisit, true, 'needsRevisit must be true');
      assert.equal(mergedClient.lastMistake, 'pronounciation');
      assert.equal(mergedClient.lastAttemptDate, '2026-11-02T15:00:00.000Z');
      assert.equal(mergedClient.attempts, 11);
      assert.equal(mergedClient.unaidedCorrectCount, 8);

      // Symmetrical test: Device B (local) merged with Device A (remote)
      const mergedSymmetric = clientMergeSpellingProgress({ pronunciation: deviceB }, { pronunciation: deviceA }).pronunciation;
      assert.equal(mergedSymmetric.consecutiveUnaidedCorrect, 0);
      assert.equal(mergedSymmetric.level, 'learning');
      assert.equal(mergedSymmetric.needsRevisit, true);

      // Worker merge: exact same result
      const mergedWorker = workerMergeSpellingProgress({ pronunciation: deviceA }, { pronunciation: deviceB }).pronunciation;
      assert.equal(mergedWorker.consecutiveUnaidedCorrect, 0);
      assert.equal(mergedWorker.level, 'learning');
      assert.equal(mergedWorker.needsRevisit, true);
    });

    test('fresh success after earlier lapse restores streak and advances', () => {
      // Device A: Failed on Nov 1
      const deviceA: WordProgress = {
        wordId: 'rhythm',
        studentId: 'shiza',
        attempts: 5,
        unaidedCorrectCount: 2,
        consecutiveUnaidedCorrect: 0,
        unaidedCorrectDates: ['2026-11-01'],
        lastAttemptDate: '2026-11-01T10:00:00.000Z',
        level: 'learning',
        needsRevisit: true,
        history: [
          { date: '2026-11-01T10:00:00.000Z', mode: 'practice', wasCorrect: false }
        ]
      };

      // Device B: Succeeded on Nov 2
      const deviceB: WordProgress = {
        wordId: 'rhythm',
        studentId: 'shiza',
        attempts: 6,
        unaidedCorrectCount: 3,
        consecutiveUnaidedCorrect: 1,
        unaidedCorrectDates: ['2026-11-02'],
        lastAttemptDate: '2026-11-02T10:00:00.000Z',
        level: 'learning',
        needsRevisit: false,
        history: [
          { date: '2026-11-02T10:00:00.000Z', mode: 'practice', wasCorrect: true }
        ]
      };

      const merged = clientMergeSpellingProgress({ rhythm: deviceA }, { rhythm: deviceB }).rhythm;
      assert.equal(merged.consecutiveUnaidedCorrect, 1);
      assert.equal(merged.needsRevisit, false);
      assert.equal(merged.lastAttemptDate, '2026-11-02T10:00:00.000Z');
    });
  });

  describe('1.7 Word History Truncation & Chronological Ordering', () => {
    test('history merges entries from both devices, deduplicates, caps at exactly 15, and sorts ascending', () => {
      // Device A: 12 entries (days 1 to 12)
      const historyA = Array.from({ length: 12 }, (_, i) => ({
        attemptId: `att-A-${i + 1}`,
        date: `2026-11-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`,
        mode: 'practice' as const,
        wasCorrect: true
      }));

      // Device B: 12 entries (days 7 to 18), where days 7 to 12 share attempt IDs with Device A
      const historyB = [
        ...historyA.slice(6), // att-A-7 to att-A-12
        ...Array.from({ length: 6 }, (_, i) => ({
          attemptId: `att-B-${i + 13}`,
          date: `2026-11-${String(i + 13).padStart(2, '0')}T10:00:00.000Z`,
          mode: 'test' as const,
          wasCorrect: false
        }))
      ];

      const wordA: WordProgress = {
        wordId: 'necessary',
        studentId: 'shiza',
        attempts: 12,
        history: historyA,
        level: 'learning'
      } as any;

      const wordB: WordProgress = {
        wordId: 'necessary',
        studentId: 'shiza',
        attempts: 18,
        history: historyB,
        level: 'learning'
      } as any;

      const merged = clientMergeSpellingProgress({ necessary: wordA }, { necessary: wordB }).necessary;

      // Unique days: 1 to 18 = 18 total unique attempts. Capped at latest 15.
      assert.equal(merged.history.length, 15, 'Merged history must have exactly 15 entries');

      // The 15 entries must be strictly days 4 to 18
      const dates = merged.history.map(h => h.date);
      for (let i = 0; i < 15; i++) {
        const expectedDay = String(i + 4).padStart(2, '0');
        assert.equal(dates[i], `2026-11-${expectedDay}T10:00:00.000Z`);
      }

      // Verify ascending order
      for (let i = 0; i < dates.length - 1; i++) {
        assert.ok(Date.parse(dates[i]) <= Date.parse(dates[i + 1]));
      }
    });

    test('history with scrambled/unsorted input dates is strictly sorted in chronological order', () => {
      const scrambledA = [
        { attemptId: 'h-10', date: '2026-11-10T00:00:00.000Z', mode: 'practice' as const, wasCorrect: true },
        { attemptId: 'h-02', date: '2026-11-02T00:00:00.000Z', mode: 'practice' as const, wasCorrect: true },
        { attemptId: 'h-15', date: '2026-11-15T00:00:00.000Z', mode: 'practice' as const, wasCorrect: true }
      ];

      const scrambledB = [
        { attemptId: 'h-05', date: '2026-11-05T00:00:00.000Z', mode: 'practice' as const, wasCorrect: true },
        { attemptId: 'h-20', date: '2026-11-20T00:00:00.000Z', mode: 'practice' as const, wasCorrect: true },
        { attemptId: 'h-01', date: '2026-11-01T00:00:00.000Z', mode: 'practice' as const, wasCorrect: true }
      ];

      const merged = clientMergeSpellingProgress(
        { w: { wordId: 'w', studentId: 'shiza', attempts: 3, history: scrambledA, level: 'learning' } as any },
        { w: { wordId: 'w', studentId: 'shiza', attempts: 3, history: scrambledB, level: 'learning' } as any }
      ).w;

      assert.equal(merged.history.length, 6);
      const expectedIds = ['h-01', 'h-02', 'h-05', 'h-10', 'h-15', 'h-20'];
      assert.deepEqual(merged.history.map(h => h.attemptId), expectedIds);
    });
  });

  // =========================================================================
  // 2. DEVICE-LOCAL SETTINGS ISOLATION
  // =========================================================================

  describe('2. Device-Local Settings Isolation', () => {
    test('injected device-local settings in snapshot are stripped and never leak into storage', () => {
      // Create a malicious or rogue snapshot attempting to overwrite device-local settings
      const rogueSnapshot: any = {
        studentId: 'shiza',
        version: 1,
        syncedAt: new Date().toISOString(),
        spelling: {
          testword: {
            wordId: 'testword',
            studentId: 'shiza',
            attempts: 1,
            level: 'learning',
            history: []
          }
        },
        subjects: {
          robotics: {
            studentId: 'shiza',
            lessonId: 'l1',
            practice: null,
            exam: null,
            reviewQuestionIds: []
          }
        },
        learningRecords: [],
        // ROGUE / INJECTED DEVICE-LOCAL KEYS:
        spellbee_active_profile_v1: 'fazia',
        spellbee_settings_v1: { volume: 0, voice: 'evil-tts' },
        device_uuid: 'hacker-device-id',
        role: 'admin'
      };

      // Seed localStorage with existing device-local profile & settings
      mockStorage.setItem('spellbee_active_profile_v1', 'shiza');
      mockStorage.setItem('spellbee_settings_v1', JSON.stringify({ volume: 80, voice: 'default' }));
      mockStorage.setItem('unrelated_local_key', 'should-not-change');

      // 1. Call saveSnapshotToLocalStorage with the rogue snapshot
      saveSnapshotToLocalStorage(rogueSnapshot);

      // Verify that device-local keys were NOT modified
      assert.equal(mockStorage.getItem('spellbee_active_profile_v1'), 'shiza');
      assert.equal(
        mockStorage.getItem('spellbee_settings_v1'),
        JSON.stringify({ volume: 80, voice: 'default' })
      );
      assert.equal(mockStorage.getItem('unrelated_local_key'), 'should-not-change');

      // Verify that rogue root keys were NOT written to localStorage
      assert.equal(mockStorage.getItem('device_uuid'), null);
      assert.equal(mockStorage.getItem('role'), null);

      // 2. Call buildLocalSnapshot and verify device-local keys are NOT included
      const localSnapshot = buildLocalSnapshot('shiza');
      assert.equal((localSnapshot as any).spellbee_active_profile_v1, undefined);
      assert.equal((localSnapshot as any).spellbee_settings_v1, undefined);
      assert.equal((localSnapshot as any).unrelated_local_key, undefined);

      // 3. Verify clientMergeProgressSnapshots drops any rogue properties
      const normalSnapshot: ClientSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: new Date().toISOString(),
        spelling: {},
        subjects: {},
        learningRecords: []
      };

      const merged = clientMergeProgressSnapshots(rogueSnapshot, normalSnapshot);
      assert.equal((merged as any).spellbee_active_profile_v1, undefined);
      assert.equal((merged as any).spellbee_settings_v1, undefined);
      assert.equal((merged as any).device_uuid, undefined);
    });

    test('worker endpoint strips injected device-local settings from incoming POST requests', async () => {
      const doNamespace = new MockDurableObjectNamespace(ProgressDurableObject);
      const env = createWorkerEnv(doNamespace);

      const injectedPayload = {
        studentId: 'shiza',
        version: 1,
        syncedAt: '2026-11-01T10:00:00.000Z',
        spelling: {},
        subjects: {},
        learningRecords: [],
        spellbee_active_profile_v1: 'fazia',
        spellbee_settings_v1: { malicious: true },
        injected_admin_flag: true
      };

      const request = new Request('https://learn.firofame.workers.dev/api/progress/shiza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(injectedPayload)
      });

      const response = await worker.fetch(request, env);
      assert.equal(response.status, 200);

      const returnedJson = await response.json();
      assert.equal((returnedJson as any).spellbee_active_profile_v1, undefined);
      assert.equal((returnedJson as any).spellbee_settings_v1, undefined);
      assert.equal((returnedJson as any).injected_admin_flag, undefined);

      // Verify DO storage does not contain injected fields
      const storedObj = doNamespace.getStoredSnapshot('shiza');
      assert.ok(storedObj);
      assert.equal((storedObj as any).spellbee_active_profile_v1, undefined);
      assert.equal((storedObj as any).spellbee_settings_v1, undefined);
      assert.equal((storedObj as any).injected_admin_flag, undefined);
    });

    test('localStorage cross-contamination resistance when snapshot contains records with foreign learnerId', () => {
      // A snapshot for 'shiza' should NEVER write records belonging to 'fazia'
      const crossSnapshot: ClientSnapshot = {
        studentId: 'shiza',
        version: 1,
        syncedAt: new Date().toISOString(),
        spelling: {
          word1: {
            wordId: 'word1',
            studentId: 'fazia', // Mismatched studentId!
            attempts: 1,
            level: 'learning',
            history: []
          } as any
        },
        subjects: {
          robotics: {
            studentId: 'fazia', // Mismatched studentId!
            lessonId: 'l1',
            practice: null,
            exam: null,
            reviewQuestionIds: []
          }
        },
        learningRecords: [
          {
            id: 'fazia-rec-1',
            schemaVersion: 1,
            learnerId: 'fazia', // Mismatched learnerId!
            subjectId: 'maths',
            kind: 'attempt',
            contentVersion: 'v1',
            updatedAt: '2026-11-01T10:00:00.000Z',
            data: {}
          }
        ]
      };

      saveSnapshotToLocalStorage(crossSnapshot);

      // Verify fazia's keys were NOT touched
      assert.equal(mockStorage.getItem('academy_robotics_fazia_v1'), null);
      assert.equal(mockStorage.getItem('academy_rec_fazia-rec-1'), null);
    });
  });

  // =========================================================================
  // 3. STRESS & FUZZING TESTS
  // =========================================================================

  describe('3. Stress & Heavy Payload Simulation', () => {
    test('handles 500 interleaved learning records without performance degradation or data loss', () => {
      const recordsA: LearningRecord[] = [];
      const recordsB: LearningRecord[] = [];

      for (let i = 0; i < 250; i++) {
        recordsA.push({
          id: `att-A-${i}`,
          schemaVersion: 1,
          learnerId: 'shiza',
          subjectId: 'maths',
          kind: 'attempt',
          contentVersion: 'v1',
          updatedAt: new Date(1761990000000 + i * 1000).toISOString(),
          data: { idx: i, source: 'A' }
        });
      }

      for (let i = 0; i < 250; i++) {
        recordsB.push({
          id: `att-B-${i}`,
          schemaVersion: 1,
          learnerId: 'shiza',
          subjectId: 'maths',
          kind: 'attempt',
          contentVersion: 'v1',
          updatedAt: new Date(1761990500000 + i * 1000).toISOString(),
          data: { idx: i, source: 'B' }
        });
      }

      const startTime = performance.now();
      const merged = clientMergeLearningRecords(recordsA, recordsB);
      const elapsed = performance.now() - startTime;

      assert.equal(merged.length, 500);
      assert.ok(elapsed < 100, `500-record merge took ${elapsed.toFixed(2)}ms, should be < 100ms`);
    });

    test('deep equality between client merge engine and worker merge engine', () => {
      const snapshotA: ClientSnapshot = {
        studentId: 'fazia',
        version: 1,
        syncedAt: '2026-11-01T10:00:00.000Z',
        spelling: {
          cat: {
            wordId: 'cat',
            studentId: 'fazia',
            attempts: 5,
            consecutiveUnaidedCorrect: 3,
            lastAttemptDate: '2026-11-01T09:00:00.000Z',
            level: 'mastered' as any,
            history: [{ date: '2026-11-01T09:00:00.000Z', mode: 'practice', wasCorrect: true }]
          } as any
        },
        subjects: {
          evs: {
            studentId: 'fazia',
            lessonId: 'l1',
            practice: { mode: 'practice', completedAt: '2026-11-01T08:00:00.000Z', answers: ['p1'] as any },
            exam: null,
            reviewQuestionIds: ['q1']
          }
        },
        learningRecords: [
          {
            id: 'draft:fazia:1',
            schemaVersion: 1,
            learnerId: 'fazia',
            subjectId: 'evs',
            kind: 'draft',
            contentVersion: 'v1',
            updatedAt: '2026-11-01T08:00:00.000Z',
            data: { draft: 1 }
          }
        ]
      };

      const snapshotB: ClientSnapshot = {
        studentId: 'fazia',
        version: 1,
        syncedAt: '2026-11-01T12:00:00.000Z',
        spelling: {
          cat: {
            wordId: 'cat',
            studentId: 'fazia',
            attempts: 6,
            consecutiveUnaidedCorrect: 0,
            lastAttemptDate: '2026-11-01T11:00:00.000Z',
            level: 'learning',
            history: [{ date: '2026-11-01T11:00:00.000Z', mode: 'test', wasCorrect: false }]
          } as any
        },
        subjects: {
          evs: {
            studentId: 'fazia',
            lessonId: 'l1',
            practice: null,
            exam: { mode: 'exam', completedAt: '2026-11-01T10:00:00.000Z', answers: ['e1'] as any },
            reviewQuestionIds: ['q2']
          }
        },
        learningRecords: [
          {
            id: 'draft:fazia:1',
            schemaVersion: 1,
            learnerId: 'fazia',
            subjectId: 'evs',
            kind: 'draft',
            contentVersion: 'v1',
            updatedAt: '2026-11-01T11:00:00.000Z', // newer!
            data: { draft: 2 }
          }
        ]
      };

      const clientMerged = clientMergeProgressSnapshots(snapshotA, snapshotB);
      const workerMerged = workerMergeProgressSnapshots(snapshotA, snapshotB);

      // Both engines must agree on spelling, subjects, and learningRecords
      assert.deepEqual(clientMerged.spelling, workerMerged.spelling);
      assert.deepEqual(clientMerged.subjects, workerMerged.subjects);
      assert.deepEqual(clientMerged.learningRecords, workerMerged.learningRecords);
    });
  });
});
