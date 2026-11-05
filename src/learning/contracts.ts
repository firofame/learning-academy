import type { LearningSubjectId, StudentId } from '../types';

/** Framework-neutral curriculum contracts shared by the browser and Worker. */

export type GradingPolicy = 'deterministic' | 'ai' | 'parent';

export type QuestionInteraction =
  | { kind: 'choice'; options: readonly { id: string; label: string }[] }
  | { kind: 'written'; inputMode: 'text' | 'numeric'; grading: GradingPolicy }
  | { kind: 'tiles'; tileSetId: string }
  | { kind: 'matching'; pairs: readonly { left: string; right: string }[] }
  | { kind: 'diagram'; diagramId: string; response: 'choice' | 'written' };

export interface VersionedLesson {
  subjectId: string;
  grade: number;
  chapterId: string;
  lessonId: string;
  contentVersion: string;
  rubricVersion: string;
  provenance?: string;
}

export type SessionMode = 'practice' | 'exam' | 'paper';
export type AttemptOutcome = 'correct' | 'incorrect' | 'skipped' | 'ungraded';
export type AttemptGradingSource = 'deterministic' | 'ai' | 'parent' | 'none';
export type AssistanceKind = 'answer-revealed' | 'tile-helper' | 'hint' | 'read-aloud' | 'other';
export type RevisionAttemptKind = 'initial' | 'correction' | 'recheck' | 'exam';
export type RevisionResponseFormat = 'written' | 'choice';

export interface LearningAttempt {
  attemptId: string;
  learnerId: StudentId;
  subjectId: LearningSubjectId;
  lessonId: string;
  questionId: string;
  contentVersion: string;
  rubricVersion: string;
  timestamp: string;
  learnerLocalDate: string;
  sessionMode: SessionMode;
  submittedAnswer: string | null;
  questionPrompt?: string;
  referenceAnswer?: string;
  explanation?: string;
  provenance?: string;
  assistance: readonly AssistanceKind[];
  gradingSource: AttemptGradingSource;
  gradingVersion?: string;
  modelId?: string;
  revisionRoundId?: string;
  revisionBatchId?: string;
  revisionAttemptKind?: RevisionAttemptKind;
  responseFormat?: RevisionResponseFormat;
  revisionSequence?: number;
  outcome: AttemptOutcome;
  feedback?: string;
}

export type ReviewClearingPolicy =
  | 'practice-or-exam-correct'
  | 'practice-correct-only'
  | 'practice-correct-and-full-exam-refresh'
  | 'full-exam-correct-only';
