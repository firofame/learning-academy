import type { StudentId } from '../types';
import type { AssistanceKind, ReviewClearingPolicy } from '../learning/contracts';
import { emitStorageError } from './appStorage';

export type SubjectQuizMode = 'practice' | 'exam';

export interface SubjectAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
  skipped?: boolean;
  assistance?: AssistanceKind[];
  aiChecked?: boolean;
  aiFeedback?: string;
  parentChecked?: boolean;
  ungraded?: boolean;
  attemptId?: string;
  attemptedAt?: string;
}

export interface SubjectResult {
  mode: SubjectQuizMode;
  completedAt: string;
  section?: string;
  topic?: string;
  answers: SubjectAnswer[];
  contentVersion?: string;
}

export interface SubjectProgress {
  studentId: StudentId;
  lessonId: string;
  practice: SubjectResult | null;
  exam: SubjectResult | null;
  reviewQuestionIds: string[];
}

export function getSubjectStorageKey(subject: string, studentId: StudentId): string {
  return `academy_${subject}_${studentId}_v1`;
}

export function emptySubjectProgress(studentId: StudentId, lessonId: string): SubjectProgress {
  return {
    studentId,
    lessonId,
    practice: null,
    exam: null,
    reviewQuestionIds: []
  };
}

export function updateSubjectReviewQuestionIds(
  currentReviewIds: readonly string[],
  answers: readonly SubjectAnswer[],
  mode: SubjectQuizMode,
  policy: ReviewClearingPolicy = 'practice-or-exam-correct',
  isFullExam = true
): string[] {
  const result = new Set(currentReviewIds);
  for (const answer of answers) {
    const isUnaided = !answer.assistance || answer.assistance.length === 0;
    const isCorrect = answer.correct && isUnaided;
    const canClear = isCorrect && (
      policy === 'practice-or-exam-correct' ||
      (policy === 'full-exam-correct-only' && mode === 'exam' && isFullExam) ||
      (policy === 'practice-correct-and-full-exam-refresh' && (mode === 'practice' || (mode === 'exam' && isFullExam)))
    );

    if (canClear) {
      result.delete(answer.questionId);
    } else if (!answer.correct || !isUnaided) {
      result.add(answer.questionId);
    }
  }
  return [...result];
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidSubjectAnswer(value: unknown): value is SubjectAnswer {
  if (!isPlainRecord(value) || typeof value.questionId !== 'string' ||
      typeof value.answer !== 'string' || typeof value.correct !== 'boolean') return false;
  if (value.skipped !== undefined && typeof value.skipped !== 'boolean') return false;
  if (value.assistance !== undefined && (!Array.isArray(value.assistance) || !value.assistance.every(item =>
    ['answer-revealed', 'tile-helper', 'hint', 'read-aloud', 'other'].includes(String(item))))) return false;
  if (value.attemptId !== undefined && (typeof value.attemptId !== 'string' || !value.attemptId)) return false;
  if (value.attemptedAt !== undefined && (typeof value.attemptedAt !== 'string' || !Number.isFinite(Date.parse(value.attemptedAt)))) return false;
  if (value.aiChecked !== undefined && typeof value.aiChecked !== 'boolean') return false;
  if (value.aiFeedback !== undefined && typeof value.aiFeedback !== 'string') return false;
  if (value.parentChecked !== undefined && typeof value.parentChecked !== 'boolean') return false;
  return true;
}

export function isValidSubjectResult(value: unknown, mode?: SubjectQuizMode): value is SubjectResult {
  if (!isPlainRecord(value) || (mode && value.mode !== mode) ||
      (value.mode !== 'practice' && value.mode !== 'exam') ||
      typeof value.completedAt !== 'string' || !Number.isFinite(Date.parse(value.completedAt)) ||
      !Array.isArray(value.answers) || value.answers.length === 0) return false;
  return value.answers.every(isValidSubjectAnswer);
}

export function isValidSubjectProgress(
  value: unknown,
  studentId: StudentId,
  expectedLessonId?: string
): value is SubjectProgress {
  if (!isPlainRecord(value) || value.studentId !== studentId ||
      typeof value.lessonId !== 'string' ||
      (expectedLessonId && value.lessonId !== expectedLessonId)) return false;
  if (value.practice !== null && !isValidSubjectResult(value.practice, 'practice')) return false;
  if (value.exam !== null && !isValidSubjectResult(value.exam, 'exam')) return false;
  if (!Array.isArray(value.reviewQuestionIds) || !value.reviewQuestionIds.every(id => typeof id === 'string')) return false;
  return true;
}

export function loadSubjectProgressBase(
  subject: string,
  studentId: StudentId,
  defaultLessonId: string,
  customValidator?: (parsed: unknown) => boolean
): SubjectProgress {
  const empty = emptySubjectProgress(studentId, defaultLessonId);
  if (typeof localStorage === 'undefined') return empty;
  const key = getSubjectStorageKey(subject, studentId);
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    emitStorageError(`Unable to read ${subject} progress for ${studentId} from browser storage.`);
    return empty;
  }
  if (!raw) return empty;

  try {
    const parsed = JSON.parse(raw);
    if (customValidator ? !customValidator(parsed) : !isValidSubjectProgress(parsed, studentId, defaultLessonId)) {
      emitStorageError(`Unable to read ${subject} progress for ${studentId} from browser storage.`);
      return empty;
    }
    return parsed as SubjectProgress;
  } catch {
    emitStorageError(`Unable to read ${subject} progress for ${studentId} from browser storage.`);
    return empty;
  }
}

export function saveSubjectResultBase(
  subject: string,
  studentId: StudentId,
  result: SubjectResult,
  defaultLessonId: string,
  options?: {
    policy?: ReviewClearingPolicy;
    isFullExam?: boolean;
    resultValidator?: (result: SubjectResult) => boolean;
    customLoader?: () => SubjectProgress;
  }
): SubjectProgress | null {
  if (typeof localStorage === 'undefined') return null;
  if (options?.resultValidator && !options.resultValidator(result)) return null;

  const current = options?.customLoader ? options.customLoader() : loadSubjectProgressBase(subject, studentId, defaultLessonId);
  const policy = options?.policy ?? 'practice-or-exam-correct';
  const isFullExam = options?.isFullExam ?? true;
  const nextReviewIds = updateSubjectReviewQuestionIds(current.reviewQuestionIds, result.answers, result.mode, policy, isFullExam);

  const updated: SubjectProgress = {
    ...current,
    practice: result.mode === 'practice' ? result : current.practice,
    exam: result.mode === 'exam' ? result : current.exam,
    reviewQuestionIds: nextReviewIds
  };

  try {
    const key = getSubjectStorageKey(subject, studentId);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch {
    emitStorageError(`Storage save failed for ${subject}.`);
    return null;
  }
}
