import type { LearningSubjectId, StudentId } from '../types';
import type { AssistanceKind, AttemptGradingSource, AttemptOutcome, LearningAttempt, SessionMode } from './contracts';
import { CONTENT_VERSIONS, RUBRIC_VERSIONS } from '../data/contentVersions';
import { GRADING_MODEL } from '../utils/roboticsGrading';
import { localCalendarDate } from './domain';
import { getDefaultLearningRepository, saveLearningAttempt } from './persistence';

export interface QuizAnswerForAttempt {
  questionId: string;
  answer: string;
  correct: boolean;
  prompt: string;
  referenceAnswer: string;
  explanation?: string;
  provenance?: string;
  aiChecked?: boolean;
  aiFeedback?: string;
  parentChecked?: boolean;
  ungraded?: boolean;
  assistance?: readonly AssistanceKind[];
  attemptedAt?: string;
  attemptId?: string;
  skipped?: boolean;
}

export function createQuizAttempts(input: {
  learnerId: StudentId;
  subjectId: LearningSubjectId;
  lessonId: string;
  mode: SessionMode;
  completedAt: string;
  provenance?: string;
  answers: readonly QuizAnswerForAttempt[];
}): LearningAttempt[] {
  const timestamp = Number.isFinite(Date.parse(input.completedAt)) ? input.completedAt : new Date().toISOString();
  const contentVersion = CONTENT_VERSIONS[input.subjectId];
  const rubricVersion = RUBRIC_VERSIONS[input.subjectId];
  return input.answers.map(answer => {
    const attemptTimestamp = answer.attemptedAt && Number.isFinite(Date.parse(answer.attemptedAt))
      ? answer.attemptedAt
      : timestamp;
    const gradingSource: AttemptGradingSource = answer.ungraded
      ? 'none'
      : answer.parentChecked ? 'parent' : answer.aiChecked ? 'ai' : 'deterministic';
    const outcome: AttemptOutcome = answer.ungraded
      ? 'ungraded'
      : answer.correct ? 'correct' : answer.skipped || answer.answer.trim() === '' ? 'skipped' : 'incorrect';
    return {
      attemptId: answer.attemptId ?? `${input.subjectId}:${input.learnerId}:${input.mode}:${attemptTimestamp}:${answer.questionId}`,
      learnerId: input.learnerId,
      subjectId: input.subjectId,
      lessonId: input.lessonId,
      questionId: answer.questionId,
      contentVersion,
      rubricVersion,
      timestamp: attemptTimestamp,
      learnerLocalDate: localCalendarDate(new Date(attemptTimestamp)),
      sessionMode: input.mode,
      submittedAnswer: answer.answer,
      questionPrompt: answer.prompt,
      referenceAnswer: answer.referenceAnswer,
      explanation: answer.explanation,
      provenance: answer.provenance ?? input.provenance,
      assistance: answer.assistance ?? [],
      gradingSource,
      gradingVersion: gradingSource === 'ai' ? rubricVersion : `${input.subjectId}-deterministic-v1`,
      ...(gradingSource === 'ai' ? { modelId: GRADING_MODEL } : {}),
      outcome,
      ...(answer.aiFeedback ? { feedback: answer.aiFeedback } : {})
    };
  });
}

export async function recordQuizAnswerAttempt(input: {
  learnerId: StudentId;
  subjectId: LearningSubjectId;
  lessonId: string;
  mode: SessionMode;
  answer: QuizAnswerForAttempt;
}): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const attemptedAt = input.answer.attemptedAt ?? new Date().toISOString();
  const [attempt] = createQuizAttempts({
    learnerId: input.learnerId,
    subjectId: input.subjectId,
    lessonId: input.lessonId,
    mode: input.mode,
    completedAt: attemptedAt,
    answers: [{ ...input.answer, attemptedAt }]
  });
  await saveLearningAttempt(getDefaultLearningRepository(), attempt);
}

export function createSpellingAttempt(input: {
  attemptId: string;
  learnerId: StudentId;
  grade: number;
  questionId: string;
  timestamp: string;
  sessionMode: SessionMode;
  submittedAnswer: string | null;
  questionPrompt?: string;
  referenceAnswer?: string;
  explanation?: string;
  provenance?: string;
  assisted: boolean;
  outcome: AttemptOutcome;
}): LearningAttempt {
  return {
    attemptId: input.attemptId,
    learnerId: input.learnerId,
    subjectId: 'spell-bee',
    lessonId: `spelling-grade-${input.grade}`,
    questionId: input.questionId,
    contentVersion: CONTENT_VERSIONS['spell-bee'],
    rubricVersion: RUBRIC_VERSIONS['spell-bee'],
    timestamp: input.timestamp,
    learnerLocalDate: localCalendarDate(new Date(input.timestamp)),
    sessionMode: input.sessionMode,
    submittedAnswer: input.submittedAnswer,
    questionPrompt: input.questionPrompt,
    referenceAnswer: input.referenceAnswer,
    explanation: input.explanation,
    provenance: input.provenance,
    assistance: input.assisted ? ['answer-revealed'] : [],
    gradingSource: 'deterministic',
    gradingVersion: RUBRIC_VERSIONS['spell-bee'],
    outcome: input.outcome
  };
}
