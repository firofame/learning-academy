import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { LearningAttempt, SessionMode } from '../learning/contracts';
import {
  deriveReadiness, isQuestionExamReady, isPortionExamReady, isRetentionCheckDue, isReviewDue,
  nextIndependentReviewDate, readinessFromRecallEvidence, shouldClearMissedQuestion, SUBJECT_REVIEW_POLICIES
} from '../learning/domain';
import { createQuizAttempts } from '../learning/attemptRecords';
import {
  canScheduleRevisionRecheck, deriveRevisionProgress, interleaveItems, selectRevisionBatch
} from '../learning/revision';
import { buildSubjectRevision } from '../learning/subjectRevision';
import { getRoboticsLesson } from '../data/robotics';
import { getMalayalamLesson } from '../data/malayalam';
import {
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
  async listForLearner(learnerId: 'fazia' | 'shiza') {
    return [...this.records.values()].filter(record => record.learnerId === learnerId);
  }
  async delete(id: string) { this.records.delete(id); }
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



describe('Shared IndexedDB persistence contracts', () => {

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

  test('pre-expansion Malayalam drafts do not resume with changed content', async () => {
    const repository = new MemoryRepository();
    const draft = {
      sessionId: 'malayalam-before-expansion', learnerId: 'shiza', subjectId: 'malayalam',
      lessonId: getMalayalamLesson('shiza').id,
      contentVersion: 'malayalam-v1', rubricVersion: 'malayalam-rubric-v1',
      savedAt: '2026-11-05T10:00:00Z',
      state: { questionIds: ['g6-mal-l2-sentence-2'], answer: 'പ്രതീക്ഷയോടെ', index: 0 }
    } as const;
    await saveSessionDraft(repository, draft);
    assert.equal(await loadSessionDraft(
      repository, 'shiza', 'malayalam', draft.lessonId, 'malayalam-v2'
    ), null);
    const previous = await loadSessionDraft<typeof draft.state>(
      repository, 'shiza', 'malayalam', draft.lessonId, 'malayalam-v1'
    );
    assert.deepEqual(previous?.state, draft.state);
    assert.equal(await loadSessionDraft(
      repository, 'fazia', 'malayalam', draft.lessonId, 'malayalam-v1'
    ), null);
  });
});

describe('Unified Evidence-Based Learning Framework (Exam-Eve Revision)', () => {
  const revisionItem = (
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

  test('Exam-Ready for Tomorrow definition: unaided correct or successful 2+ lagged recheck', () => {
    // 1. Unaided correct on initial recall is immediately exam-ready
    const [q1Progress] = deriveRevisionProgress(['q1'], [
      revisionItem('q1', 'initial', 'correct', 1, [])
    ]);
    assert.equal(q1Progress.examReady, true);
    assert.equal(isQuestionExamReady(q1Progress), true);

    // 2. Assisted correct on initial recall is NOT exam-ready (pending recheck)
    const [q2Progress] = deriveRevisionProgress(['q2'], [
      revisionItem('q2', 'initial', 'correct', 1, ['hint'])
    ]);
    assert.equal(q2Progress.examReady, false);
    assert.equal(q2Progress.pendingRecheck, true);
    assert.equal(isQuestionExamReady(q2Progress), false);

    // 3. Incorrect initial recall is NOT exam-ready
    const [q3Progress] = deriveRevisionProgress(['q3'], [
      revisionItem('q3', 'initial', 'incorrect', 1, [])
    ]);
    assert.equal(q3Progress.examReady, false);
    assert.equal(q3Progress.pendingRecheck, true);
    assert.equal(isQuestionExamReady(q3Progress), false);

    // 4. Immediate correction aids encoding but strictly requires lagged recheck
    const [q3AfterCorrection] = deriveRevisionProgress(['q3'], [
      revisionItem('q3', 'initial', 'incorrect', 1, []),
      revisionItem('q3', 'correction', 'correct', 2, ['answer-revealed'])
    ]);
    assert.equal(q3AfterCorrection.examReady, false);
    assert.equal(q3AfterCorrection.pendingRecheck, true);
    assert.equal(isQuestionExamReady(q3AfterCorrection), false);

    // 5. After 2 other questions (gapCount >= 2), unaided recheck makes it exam-ready
    const progressWithRecheck = deriveRevisionProgress(['q3', 'q4', 'q5'], [
      revisionItem('q3', 'initial', 'incorrect', 1, []),
      revisionItem('q3', 'correction', 'correct', 2, ['answer-revealed']),
      revisionItem('q4', 'initial', 'correct', 3, []),
      revisionItem('q5', 'initial', 'correct', 4, []),
      revisionItem('q3', 'recheck', 'correct', 5, [])
    ]);
    const q3Resolved = progressWithRecheck.find(p => p.questionId === 'q3')!;
    assert.equal(q3Resolved.successfulRecheck, true);
    assert.equal(q3Resolved.pendingRecheck, false);
    assert.equal(q3Resolved.examReady, true);
    assert.equal(isQuestionExamReady(q3Resolved), true);

    // 6. Portion exam-readiness requires all questions to be exam-ready
    assert.equal(isPortionExamReady(progressWithRecheck), true);
    assert.equal(isPortionExamReady([q1Progress, q2Progress]), false);
  });

  test('Immediate correction on another question does NOT increment gapCount for pending rechecks', () => {
    // q0 is pending recheck (gapCount 0)
    // q1 is attempted (initial incorrect) -> q0 gapCount becomes 1
    // q1 is immediately corrected (correction correct) -> q0 gapCount must REMAIN 1, NOT 2
    // q2 is attempted (initial correct) -> q0 gapCount becomes 2
    const progressAfterCorrection = deriveRevisionProgress(['q0', 'q1', 'q2'], [
      revisionItem('q0', 'initial', 'incorrect', 1, []),
      revisionItem('q1', 'initial', 'incorrect', 2, []),
      revisionItem('q1', 'correction', 'correct', 3, ['answer-revealed'])
    ]);
    const q0Mid = progressAfterCorrection.find(p => p.questionId === 'q0')!;
    assert.equal(q0Mid.gapCount, 1, 'q0 gapCount should be 1 after q1 initial; q1 correction must not count as another intervening question');
    assert.equal(canScheduleRevisionRecheck('q0', ['q0', 'q1', 'q2'], [
      revisionItem('q0', 'initial', 'incorrect', 1, []),
      revisionItem('q1', 'initial', 'incorrect', 2, []),
      revisionItem('q1', 'correction', 'correct', 3, ['answer-revealed'])
    ], 'batch-1'), false, 'q0 cannot be rechecked yet because only 1 intervening question occurred');

    // After q2 is attempted, 2 distinct other questions have intervened
    const progressAfterQ2 = deriveRevisionProgress(['q0', 'q1', 'q2'], [
      revisionItem('q0', 'initial', 'incorrect', 1, []),
      revisionItem('q1', 'initial', 'incorrect', 2, []),
      revisionItem('q1', 'correction', 'correct', 3, ['answer-revealed']),
      revisionItem('q2', 'initial', 'correct', 4, [])
    ]);
    const q0Final = progressAfterQ2.find(p => p.questionId === 'q0')!;
    assert.equal(q0Final.gapCount, 2, 'q0 gapCount reaches 2 only after q2 initial');
    assert.equal(canScheduleRevisionRecheck('q0', ['q0', 'q1', 'q2'], [
      revisionItem('q0', 'initial', 'incorrect', 1, []),
      revisionItem('q1', 'initial', 'incorrect', 2, []),
      revisionItem('q1', 'correction', 'correct', 3, ['answer-revealed']),
      revisionItem('q2', 'initial', 'correct', 4, [])
    ], 'batch-1'), true, 'q0 is now ready for recheck after 2 intervening questions');
  });

  test('Multiple attempts on the same intervening question do NOT increment gapCount beyond 1', () => {
    // q0 is pending recheck
    // q1 is attempted (initial incorrect) -> q0 gapCount becomes 1
    // q1 is rechecked later (recheck incorrect) -> q0 gapCount must remain 1 because only 1 distinct question intervened
    const progressWithRepeatQ1 = deriveRevisionProgress(['q0', 'q1', 'q2'], [
      revisionItem('q0', 'initial', 'incorrect', 1, []),
      revisionItem('q1', 'initial', 'incorrect', 2, []),
      revisionItem('q1', 'recheck', 'incorrect', 3, [])
    ]);
    const q0Item = progressWithRepeatQ1.find(p => p.questionId === 'q0')!;
    assert.equal(q0Item.gapCount, 1, 'q0 gapCount must remain 1 when only q1 was attempted multiple times');
    assert.equal(canScheduleRevisionRecheck('q0', ['q0', 'q1', 'q2'], [
      revisionItem('q0', 'initial', 'incorrect', 1, []),
      revisionItem('q1', 'initial', 'incorrect', 2, []),
      revisionItem('q1', 'recheck', 'incorrect', 3, [])
    ], 'batch-1'), false, 'q0 strictly requires 2 distinct intervening questions');
  });

  test('Interleaved batches: All Portions mixes categories round-robin; single portion keeps sequential order', () => {
    const categoryMap: Record<string, string> = {
      'math-1': 'maths',
      'math-2': 'maths',
      'math-3': 'maths',
      'sci-1': 'science',
      'sci-2': 'science',
      'evs-1': 'evs',
      'evs-2': 'evs'
    };
    const allQuestions = ['math-1', 'math-2', 'math-3', 'sci-1', 'sci-2', 'evs-1', 'evs-2'];

    // Interleave items test
    const interleaved = interleaveItems(allQuestions, id => categoryMap[id]);
    assert.deepEqual(interleaved, [
      'math-1', 'sci-1', 'evs-1',
      'math-2', 'sci-2', 'evs-2',
      'math-3'
    ]);

    // Edge cases: empty array and single item
    assert.deepEqual(interleaveItems([], () => 'default'), []);
    assert.deepEqual(interleaveItems(['only-one'], () => 'default'), ['only-one']);

    // Edge case: unbalanced categories (1 item in A, 4 in B) preserves stability
    const unbalanced = ['a-1', 'b-1', 'b-2', 'b-3', 'b-4'];
    const unbalancedCat: Record<string, string> = { 'a-1': 'A', 'b-1': 'B', 'b-2': 'B', 'b-3': 'B', 'b-4': 'B' };
    assert.deepEqual(
      interleaveItems(unbalanced, id => unbalancedCat[id]),
      ['a-1', 'b-1', 'b-2', 'b-3', 'b-4']
    );

    // selectRevisionBatch with batchSize larger than question count
    const batchOversized = selectRevisionBatch(allQuestions, [], 'batch-1', 50, allQuestions, {
      interleave: true,
      categoryByQuestionId: id => categoryMap[id]
    });
    assert.deepEqual(batchOversized.map(s => s.questionId), interleaved);

    // selectRevisionBatch with batchSize 0 (all remaining)
    const batchZero = selectRevisionBatch(allQuestions, [], 'batch-1', 0, allQuestions, {
      interleave: true,
      categoryByQuestionId: id => categoryMap[id]
    });
    assert.deepEqual(batchZero.map(s => s.questionId), interleaved);

    // selectRevisionBatch with interleave: true
    const batchAll = selectRevisionBatch(allQuestions, [], 'batch-1', 4, allQuestions, {
      interleave: true,
      categoryByQuestionId: id => categoryMap[id]
    });
    assert.deepEqual(batchAll.map(s => s.questionId), ['math-1', 'sci-1', 'evs-1', 'math-2']);

    // Single portion selection keeps sequential order
    const singlePortion = ['math-1', 'math-2', 'math-3'];
    const batchSingle = selectRevisionBatch(singlePortion, [], 'batch-1', 2, allQuestions, {
      interleave: false,
      categoryByQuestionId: id => categoryMap[id]
    });
    assert.deepEqual(batchSingle.map(s => s.questionId), ['math-1', 'math-2']);
  });

  test('All 5 subjects provide subtopics/categories for revision interleaving', () => {
    const subjects = ['spell-bee', 'robotics', 'maths', 'malayalam', 'hindi'] as const;
    for (const subjectId of subjects) {
      const studentId = subjectId === 'hindi' ? 'shiza' : 'fazia';
      const revision = buildSubjectRevision(subjectId, studentId, '');
      assert.ok(revision.questions.length > 0, `${subjectId} has questions`);
      const sections = new Set(revision.questions.map(q => q.section));
      assert.ok(sections.size >= 2, `${subjectId} provides multiple subtopics/categories for interleaving (found ${sections.size})`);
      for (const q of revision.questions) {
        assert.ok(q.prompt, `${subjectId} question ${q.id} has prompt`);
        assert.ok(q.explanation || q.answer, `${subjectId} question ${q.id} has feedback explanation or answer`);
      }
    }
  });
});
