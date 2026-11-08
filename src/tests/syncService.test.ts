import { describe, test, beforeEach } from 'node:test';
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
  type StudentProgressSnapshot
} from '../utils/syncService';
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
});
