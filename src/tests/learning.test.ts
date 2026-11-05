import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { LearningAttempt, SessionMode } from '../learning/contracts';
import {
  deriveReadiness, isRetentionCheckDue, isReviewDue, nextIndependentReviewDate,
  readinessFromRecallEvidence, shouldClearMissedQuestion, SUBJECT_REVIEW_POLICIES
} from '../learning/domain';
import { sessionReducer, startSession } from '../learning/sessionController';
import { createQuizAttempts } from '../learning/attemptRecords';
import { canScheduleRevisionRecheck, deriveRevisionProgress, selectRevisionBatch } from '../learning/revision';
import { getRoboticsLesson } from '../data/robotics';
import {
  exportLearnerBackup, importLearnerBackup, migrateLegacyProgress,
  MAX_BACKUP_BYTES, MAX_BACKUP_RECORDS,
  type LearningRepository, type LearningRecord as PersistedRecord, type RevisionRoundRecord,
  loadRevisionRound, loadSessionDraft, saveRevisionRound, saveSessionDraft
} from '../learning/persistence';

function attempt(overrides: Partial<LearningAttempt> = {}): LearningAttempt {
  return {
    attemptId: 'a1', learnerId: 'fazia', subjectId: 'spell-bee', lessonId: 'words-g2', questionId: 'g2-evs-1',
    contentVersion: 'spell-bee-v1', rubricVersion: 'spelling-v1', timestamp: '2026-11-01T10:00:00.000Z',
    learnerLocalDate: '2026-11-01', sessionMode: 'exam', submittedAnswer: 'land', assistance: [],
    gradingSource: 'deterministic', gradingVersion: 'spelling-v1', outcome: 'correct', ...overrides
  };
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

class MemoryRepository implements LearningRepository {
  readonly records = new Map<string, PersistedRecord>();
  async get(id: string) { return this.records.get(id); }
  async put(record: PersistedRecord) { this.records.set(record.id, structuredClone(record)); }
  async putIfAbsent(record: PersistedRecord) {
    if (this.records.has(record.id)) return false;
    this.records.set(record.id, structuredClone(record));
    return true;
  }
  async listForLearner(learnerId: 'fazia' | 'shiza' | 'global') {
    return [...this.records.values()].filter(record => record.learnerId === learnerId);
  }
  async delete(id: string) { this.records.delete(id); }
}

function backupRecord(id: string, data: unknown = { answer: 'A saved response.' }): PersistedRecord {
  return {
    id, schemaVersion: 1, learnerId: 'fazia', subjectId: 'robotics', kind: 'result',
    contentVersion: 'robotics-v1', rubricVersion: 'robotics-rubric-v1',
    updatedAt: '2026-11-04T10:00:00Z', data
  };
}

describe('Shared learning domain', () => {
  test('local-calendar readiness requires two distinct unaided days and a fresh streak after failure', () => {
    assert.equal(readinessFromRecallEvidence(1, ['2026-11-01', '2026-11-02']), 'practising');
    assert.equal(readinessFromRecallEvidence(2, ['2026-11-01', '2026-11-01']), 'practising');
    assert.equal(readinessFromRecallEvidence(2, ['2026-11-01', '2026-11-02']), 'remembered');
    const evidence = deriveReadiness([
      attempt({ timestamp: '2026-11-01T10:00:00Z', learnerLocalDate: '2026-11-01' }),
      attempt({ attemptId: 'assisted', timestamp: '2026-11-02T10:00:00Z', learnerLocalDate: '2026-11-02', assistance: ['hint'] }),
      attempt({ attemptId: 'miss', timestamp: '2026-11-03T10:00:00Z', learnerLocalDate: '2026-11-03', outcome: 'incorrect' }),
      attempt({ attemptId: 'new-1', timestamp: '2026-11-03T11:00:00Z', learnerLocalDate: '2026-11-03' }),
      attempt({ attemptId: 'new-2', timestamp: '2026-11-04T11:00:00Z', learnerLocalDate: '2026-11-04' })
    ]);
    assert.deepEqual(evidence.distinctLocalDates, ['2026-11-03', '2026-11-04']);
    assert.equal(evidence.level, 'remembered');
  });

  test('ungraded and pending checks are not wrong answers', () => {
    assert.equal(deriveReadiness([attempt({ outcome: 'ungraded' })]).level, 'learning');
    assert.equal(isReviewDue(null, new Date('2026-11-04T12:00:00Z')), false);
  });

  test('assisted activity cannot move an independent retention check later', () => {
    const attempts = [
      { timestamp: '2026-11-01T08:00:00Z', learnerLocalDate: '2026-11-01', outcome: 'correct' as const, assisted: false },
      { timestamp: '2026-11-03T08:00:00Z', learnerLocalDate: '2026-11-03', outcome: 'correct' as const, assisted: true }
    ];
    const due = nextIndependentReviewDate(attempts, new Date('2026-11-04T12:00:00Z'), 1);
    assert.equal(due, '2026-11-04');
    assert.equal(isRetentionCheckDue('2026-11-01T08:00:00Z', new Date('2026-11-04T08:00:00Z'), 3), true);
    assert.equal(isRetentionCheckDue('2026-11-01T08:00:00Z', new Date('2026-11-04T07:59:59Z'), 3), false);
  });

  test('subject review rules remain explicit and preserve different policies', () => {
    assert.equal(shouldClearMissedQuestion(SUBJECT_REVIEW_POLICIES.robotics, 'practice', false, 'correct', false), false);
    assert.equal(shouldClearMissedQuestion(SUBJECT_REVIEW_POLICIES.robotics, 'exam', true, 'correct', false), true);
    assert.equal(shouldClearMissedQuestion(SUBJECT_REVIEW_POLICIES.maths, 'practice', false, 'correct', false), true);
    assert.equal(shouldClearMissedQuestion(SUBJECT_REVIEW_POLICIES.malayalam, 'practice', false, 'correct', false), true);
    assert.equal(shouldClearMissedQuestion(SUBJECT_REVIEW_POLICIES.hindi, 'exam', false, 'correct', false), false);
    assert.equal(shouldClearMissedQuestion(SUBJECT_REVIEW_POLICIES.maths, 'practice', false, 'correct', true), false);
  });
});

describe('Versioned answer attempts', () => {
  test('keeps the answer timestamp, provenance, assistance, AI model, and skipped outcome', () => {
    const [skipped, checked] = createQuizAttempts({
      learnerId: 'shiza', subjectId: 'robotics', lessonId: 'robotics-grade-6-lesson-1',
      mode: 'exam', completedAt: '2026-11-04T12:00:00.000Z', provenance: 'school lesson PDF',
      answers: [
        {
          questionId: 'q1', answer: '', correct: false, skipped: true, prompt: 'What is a domain?',
          referenceAnswer: 'A specific area of work.', attemptId: 'session:q1',
          attemptedAt: '2026-11-04T11:45:00.000Z', assistance: []
        },
        {
          questionId: 'q2', answer: 'It understands speech.', correct: true, aiChecked: true,
          aiFeedback: 'Good explanation.', prompt: 'What does NLP do?', referenceAnswer: 'It works with human language.',
          attemptId: 'session:q2', attemptedAt: '2026-11-04T11:46:00.000Z',
          assistance: ['hint'], provenance: 'notebook page 4'
        }
      ]
    });

    assert.equal(skipped.outcome, 'skipped');
    assert.equal(skipped.attemptId, 'session:q1');
    assert.equal(skipped.timestamp, '2026-11-04T11:45:00.000Z');
    assert.equal(skipped.provenance, 'school lesson PDF');
    assert.equal(checked.outcome, 'correct');
    assert.equal(checked.gradingSource, 'ai');
    assert.equal(checked.modelId, 'gemini-3.5-flash-lite');
    assert.deepEqual(checked.assistance, ['hint']);
    assert.equal(checked.provenance, 'notebook page 4');

    const [unavailable] = createQuizAttempts({
      learnerId: 'shiza', subjectId: 'hindi', lessonId: 'shiza-hindi',
      mode: 'practice', completedAt: '2026-11-04T12:00:00.000Z',
      answers: [{
        questionId: 'written-1', answer: 'typed answer', correct: false, ungraded: true,
        prompt: 'Explain the idea', referenceAnswer: 'Expected meaning'
      }]
    });
    assert.equal(unavailable.outcome, 'ungraded');
    assert.equal(unavailable.gradingSource, 'none');
  });
});

describe('Same-day revision rechecks', () => {
  const revisionAttempt = (
    questionId: string,
    revisionAttemptKind: LearningAttempt['revisionAttemptKind'],
    outcome: LearningAttempt['outcome'],
    revisionSequence: number,
    assistance: LearningAttempt['assistance'] = [],
    revisionBatchId = 'batch-1'
  ) => ({
    questionId,
    revisionAttemptKind,
    outcome,
    revisionSequence,
    revisionBatchId,
    timestamp: `2026-11-04T10:${String(revisionSequence).padStart(2, '0')}:00.000Z`,
    assistance
  });

  test('an immediate correction keeps the initial mistake pending for a later recheck', () => {
    const attempts = [
      revisionAttempt('q1', 'initial', 'incorrect', 1),
      revisionAttempt('q1', 'correction', 'correct', 2, ['answer-revealed'])
    ];
    const [progress] = deriveRevisionProgress(['q1'], attempts);
    assert.equal(progress.checked, true);
    assert.equal(progress.initialOutcome, 'incorrect');
    assert.equal(progress.pendingRecheck, true);
    assert.equal(progress.successfulRecheck, false);
  });

  test('two other questions make a pending item eligible across portions and batches', () => {
    const attempts = [
      revisionAttempt('q1', 'initial', 'incorrect', 1),
      revisionAttempt('q2', 'initial', 'correct', 2),
      revisionAttempt('q3', 'initial', 'skipped', 3)
    ];
    const [first] = deriveRevisionProgress(['q1', 'q2', 'q3'], attempts);
    assert.equal(first.gapCount, 2);
    assert.equal(canScheduleRevisionRecheck('q1', ['q1', 'q2', 'q3'], attempts, 'batch-2'), true);
    assert.deepEqual(
      selectRevisionBatch(['q1'], attempts, 'batch-2', 5, ['q1', 'q2', 'q3']),
      [{ questionId: 'q1', attemptKind: 'recheck' }]
    );
  });

  test('assisted, skipped, and incorrect rechecks remain pending; an unaided correct recheck clears it', () => {
    const initial = [
      revisionAttempt('q1', 'initial', 'correct', 1, ['hint']),
      revisionAttempt('q2', 'initial', 'correct', 2),
      revisionAttempt('q3', 'initial', 'correct', 3)
    ];
    const assisted = deriveRevisionProgress(['q1', 'q2', 'q3'], [
      ...initial,
      revisionAttempt('q1', 'recheck', 'correct', 4, ['hint'], 'batch-2')
    ])[0];
    assert.equal(assisted.pendingRecheck, true);
    assert.equal(assisted.successfulRecheck, false);

    const skipped = deriveRevisionProgress(['q1', 'q2', 'q3'], [
      ...initial,
      revisionAttempt('q1', 'recheck', 'skipped', 4, [], 'batch-2')
    ])[0];
    assert.equal(skipped.pendingRecheck, true);

    const incorrect = deriveRevisionProgress(['q1', 'q2', 'q3'], [
      ...initial,
      revisionAttempt('q1', 'recheck', 'incorrect', 4, [], 'batch-2')
    ])[0];
    assert.equal(incorrect.pendingRecheck, true);

    const resolved = deriveRevisionProgress(['q1', 'q2', 'q3'], [
      ...initial,
      revisionAttempt('q1', 'recheck', 'correct', 4, [], 'batch-2')
    ])[0];
    assert.equal(resolved.pendingRecheck, false);
    assert.equal(resolved.successfulRecheck, true);
  });

  test('ungraded checks neither satisfy the gap nor consume an automatic recheck', () => {
    const attempts = [
      revisionAttempt('q1', 'initial', 'incorrect', 1),
      revisionAttempt('q2', 'initial', 'ungraded', 2),
      revisionAttempt('q3', 'initial', 'correct', 3)
    ];
    const [first] = deriveRevisionProgress(['q1', 'q2', 'q3'], attempts);
    assert.equal(first.gapCount, 1);
    assert.equal(canScheduleRevisionRecheck('q1', ['q1', 'q2', 'q3'], attempts, 'batch-2'), false);
    assert.deepEqual(
      selectRevisionBatch(['q1'], attempts, 'batch-2', 5, ['q1', 'q2', 'q3']),
      []
    );
  });

  test('one item is automatically rechecked at most once in a batch', () => {
    const attempts = [
      revisionAttempt('q1', 'initial', 'incorrect', 1),
      revisionAttempt('q2', 'initial', 'correct', 2),
      revisionAttempt('q3', 'initial', 'correct', 3),
      revisionAttempt('q1', 'recheck', 'incorrect', 4, [], 'batch-2'),
      revisionAttempt('q4', 'initial', 'correct', 5)
    ];
    assert.equal(canScheduleRevisionRecheck('q1', ['q1', 'q2', 'q3', 'q4'], attempts, 'batch-2'), false);
    assert.deepEqual(
      selectRevisionBatch(['q1'], attempts, 'batch-2', 5, ['q1', 'q2', 'q3', 'q4']),
      []
    );
  });
});

describe('Session controller', () => {
  const freshSession = (mode: SessionMode = 'practice') => startSession({
    sessionId: 'session-1', learnerId: 'fazia', subjectId: 'robotics', lessonId: 'lesson-1',
    contentVersion: 'robotics-v1', rubricVersion: 'robotics-rubric-v1', mode, questionIds: ['q1', 'q2']
  });

  test('prevents duplicate checks, ignores stale results, and keeps failed answers for retry', () => {
    let state = sessionReducer(freshSession(), { type: 'edit-answer', answer: 'It helps.' });
    state = sessionReducer(state, { type: 'begin-check', submissionId: 'submit-1' });
    const duplicate = sessionReducer(state, { type: 'begin-check', submissionId: 'submit-2' });
    assert.equal(duplicate.submissionId, 'submit-1');
    assert.equal(sessionReducer(state, { type: 'check-resolved', submissionId: 'stale', outcome: 'incorrect' }), state);
    state = sessionReducer(state, { type: 'check-failed', submissionId: 'submit-1' });
    assert.equal(state.phase, 'answering');
    assert.equal(state.draftAnswer, 'It helps.');
    state = sessionReducer(state, { type: 'begin-check', submissionId: 'retry-1' });
    state = sessionReducer(state, { type: 'check-resolved', submissionId: 'retry-1', outcome: 'ungraded' });
    assert.equal(state.phase, 'answering');
    assert.equal(state.draftAnswer, 'It helps.');
    assert.equal(state.answers.length, 0);
  });

  test('practice shows feedback immediately; exam hides it until completion', () => {
    let practice = freshSession();
    practice = sessionReducer(practice, { type: 'edit-answer', answer: 'response' });
    practice = sessionReducer(practice, { type: 'begin-check', submissionId: 'p1' });
    practice = sessionReducer(practice, { type: 'check-resolved', submissionId: 'p1', outcome: 'correct', feedback: 'Good.' });
    assert.equal(practice.phase, 'feedback');
    assert.equal(practice.feedbackVisible, true);

    let exam = freshSession('exam');
    exam = sessionReducer(exam, { type: 'edit-answer', answer: 'response' });
    exam = sessionReducer(exam, { type: 'begin-check', submissionId: 'e1' });
    exam = sessionReducer(exam, { type: 'check-resolved', submissionId: 'e1', outcome: 'correct', feedback: 'Hidden.' });
    assert.equal(exam.phase, 'answering');
    assert.equal(exam.questionIndex, 1);
    assert.equal(exam.feedbackVisible, false);
    exam = sessionReducer(exam, { type: 'edit-answer', answer: 'second' });
    exam = sessionReducer(exam, { type: 'begin-check', submissionId: 'e2' });
    exam = sessionReducer(exam, { type: 'check-resolved', submissionId: 'e2', outcome: 'incorrect', feedback: 'Hidden too.' });
    assert.equal(exam.phase, 'complete');
    assert.equal(exam.feedbackVisible, false);
    exam = sessionReducer(exam, { type: 'show-results' });
    assert.equal(exam.feedbackVisible, true);
  });
});

describe('Shared IndexedDB persistence contracts', () => {
  test('legacy import is learner-separated, verified, idempotent, and leaves browser data intact', async () => {
    const storage = new MemoryStorage();
    const repository = new MemoryRepository();
    storage.setItem('spellbee_progress_v1', '{"g2-evs-1":{"legacySummary":true}}');
    storage.setItem('academy_maths_shiza_v1', '{"exam":{"parentChecked":true}}');
    storage.setItem('spellbee_settings_v1', '{"slowSpeech":true}');
    const first = await migrateLegacyProgress(repository, storage);
    assert.equal(first.migrated, 3);
    assert.equal(storage.getItem('spellbee_progress_v1') !== null, true);
    assert.equal(storage.getItem('academy_maths_shiza_v1') !== null, true);
    assert.equal((await repository.listForLearner('fazia')).length, 1);
    assert.equal((await repository.listForLearner('shiza')).length, 1);
    assert.equal((await repository.listForLearner('global')).length, 2);
    assert.deepEqual(await migrateLegacyProgress(repository, storage), { migrated: 0, alreadyDone: true });
  });

  test('backup export and restore round trip while preserving progress already on the device', async () => {
    const sourceStorage = new MemoryStorage();
    const sourceRepository = new MemoryRepository();
    sourceStorage.setItem('spellbee_progress_fazia_v1', JSON.stringify({
      'word-1': {
        wordId: 'word-1', studentId: 'fazia', attempts: 2, unaidedCorrectCount: 0,
        consecutiveUnaidedCorrect: 0, unaidedCorrectDates: [], lastAttemptDate: null,
        lastUnaidedCorrectDate: null, level: 'learning', needsRevisit: false, history: []
      }
    }));
    sourceStorage.setItem('academy_robotics_fazia_v1', JSON.stringify({
      studentId: 'fazia', lessonId: getRoboticsLesson('fazia').id,
      practice: null, exam: null, reviewQuestionIds: []
    }));
    sourceStorage.setItem('academy_maths_shiza_v1', '{"exam":null}');
    await sourceRepository.put({
      id: 'result:fazia:robotics:1', schemaVersion: 1, learnerId: 'fazia', subjectId: 'robotics',
      kind: 'result', contentVersion: 'robotics-v1', rubricVersion: 'robotics-rubric-v1',
      updatedAt: '2026-11-04T10:00:00Z', data: { historicalAnswer: 'Saved as graded at the time.' }
    });

    const backup = await exportLearnerBackup('fazia', sourceRepository, sourceStorage);
    assert.equal(Object.keys(backup.progress).length, 2);
    assert.equal(backup.progress['academy_maths_shiza_v1'], undefined);
    assert.equal(backup.records.length, 1);

    const targetStorage = new MemoryStorage();
    const targetRepository = new MemoryRepository();
    targetStorage.setItem('spellbee_progress_fazia_v1', '{"word-1":{"attempts":9}}');
    const restored = await importLearnerBackup(backup, 'fazia', targetRepository, targetStorage);
    assert.equal(restored.imported, 1);
    assert.equal(restored.skippedExisting, 1);
    assert.equal(targetStorage.getItem('spellbee_progress_fazia_v1'), '{"word-1":{"attempts":9}}');
    assert.equal(targetStorage.getItem('academy_robotics_fazia_v1'), backup.progress['academy_robotics_fazia_v1']);
    assert.equal((await targetRepository.get('result:fazia:robotics:1'))?.contentVersion, 'robotics-v1');
  });

  test('backup export rejects histories beyond the restore record limit', async () => {
    const storage = new MemoryStorage();
    const repository = new MemoryRepository();
    for (let index = 0; index <= MAX_BACKUP_RECORDS; index++) {
      const record = backupRecord(`result:fazia:robotics:${index}`);
      repository.records.set(record.id, record);
    }

    await assert.rejects(exportLearnerBackup('fazia', repository, storage), /restorable backup/);
  });

  test('backup export enforces the formatted download UTF-8 byte limit', async () => {
    const storage = new MemoryStorage();
    const repository = new MemoryRepository();
    const unicodeContent = '📚'.repeat(Math.ceil(MAX_BACKUP_BYTES / 4));
    const record = backupRecord('result:fazia:robotics:unicode', { response: unicodeContent });
    repository.records.set(record.id, record);

    await assert.rejects(exportLearnerBackup('fazia', repository, storage), /5 MB restore limit/);
  });

  test('backup export rejects malformed legacy progress JSON', async () => {
    const storage = new MemoryStorage();
    const repository = new MemoryRepository();
    storage.setItem('academy_maths_fazia_v1', '{malformed progress');

    await assert.rejects(exportLearnerBackup('fazia', repository, storage), /restorable backup/);
  });

  test('backup export rejects syntactically valid progress with an invalid subject schema', async () => {
    const storage = new MemoryStorage();
    const repository = new MemoryRepository();
    for (const raw of ['[]', 'null', '"invalid"', '{}']) {
      storage.clear();
      storage.setItem('academy_maths_fazia_v1', raw);
      await assert.rejects(exportLearnerBackup('fazia', repository, storage), /restorable backup/);
    }
  });

  test('malformed, oversized-shape, or cross-learner backups are rejected before writes', async () => {
    const storage = new MemoryStorage();
    const repository = new MemoryRepository();
    const backup = {
      format: 'learning-academy-backup', schemaVersion: 1, learnerId: 'fazia',
      exportedAt: '2026-11-04T10:00:00Z', progress: { academy_maths_shiza_v1: '{"exam":null}' }, records: []
    };
    await assert.rejects(importLearnerBackup(backup, 'fazia', repository, storage), /invalid, too large, or belongs/);
    await assert.rejects(importLearnerBackup(backup, 'shiza', repository, storage), /invalid, too large, or belongs/);
    assert.equal(storage.length, 0);
  });

  test('session drafts only resume for the same learner, lesson, and content version', async () => {
    const repository = new MemoryRepository();
    await saveSessionDraft(repository, {
      sessionId: 'draft-1', learnerId: 'fazia', subjectId: 'robotics', lessonId: 'lesson-1',
      contentVersion: 'robotics-v1', rubricVersion: 'robotics-rubric-v1', savedAt: '2026-11-04T10:00:00Z',
      state: { questionIds: ['q2', 'q1'], index: 1, answer: 'My saved response', assisted: true }
    });
    const resumed = await loadSessionDraft<{ answer: string; index: number }>(repository, 'fazia', 'robotics', 'lesson-1', 'robotics-v1');
    assert.equal(resumed?.state.answer, 'My saved response');
    assert.equal(resumed?.state.index, 1);
    assert.equal(await loadSessionDraft(repository, 'shiza', 'robotics', 'lesson-1', 'robotics-v1'), null);
    assert.equal(await loadSessionDraft(repository, 'fazia', 'robotics', 'lesson-1', 'robotics-v2'), null);
  });

  test('stale revision rounds are ignored but corrupted records still fail validation', async () => {
    const repository = new MemoryRepository();
    const round: RevisionRoundRecord = {
      revisionRoundId: 'round-1', learnerId: 'fazia', subjectId: 'robotics', lessonId: 'lesson-1',
      contentVersion: 'robotics-v1', startedAt: '2026-11-04T10:00:00Z', questionIds: ['q1', 'q2']
    };
    const currentContentVersion = 'robotics-v2';
    await saveRevisionRound(repository, round);

    assert.deepEqual(await loadRevisionRound(repository, 'fazia', 'robotics', 'lesson-1', 'robotics-v1'), round);
    assert.equal(await loadRevisionRound(repository, 'fazia', 'robotics', 'lesson-1', currentContentVersion), null);

    const recordId = `revision:${round.learnerId}:${round.subjectId}:${round.lessonId}`;
    const savedRecord = repository.records.get(recordId);
    assert.ok(savedRecord);
    const invalidRecords: PersistedRecord[] = [
      { ...savedRecord, learnerId: 'shiza' },
      { ...savedRecord, subjectId: 'maths' },
      { ...savedRecord, data: { ...round, learnerId: 'shiza' } },
      { ...savedRecord, data: { ...round, subjectId: 'maths' } },
      { ...savedRecord, data: { ...round, lessonId: 'another-lesson' } },
      { ...savedRecord, data: { ...round, questionIds: [] } },
      { ...savedRecord, contentVersion: currentContentVersion }
    ];

    for (const invalidRecord of invalidRecords) {
      repository.records.set(recordId, invalidRecord);
      await assert.rejects(
        loadRevisionRound(repository, 'fazia', 'robotics', 'lesson-1', currentContentVersion),
        /does not match this lesson/
      );
    }
  });
});
