import { StudentId } from '../types';
import { checkRoboticsAnswer, getRoboticsLesson, RoboticsLesson } from '../data/robotics';
import { emitStorageError } from './storage';
import { isWrittenGrade } from './roboticsGrading';

export type RoboticsQuizMode = 'practice' | 'exam';

export interface RoboticsAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
  parentChecked: boolean;
  aiChecked?: boolean;
  aiFeedback?: string;
}

export interface RoboticsResult {
  mode: RoboticsQuizMode;
  completedAt: string;
  answers: RoboticsAnswer[];
}

export interface RoboticsProgress {
  studentId: StudentId;
  lessonId: string;
  practice: RoboticsResult | null;
  exam: RoboticsResult | null;
  reviewQuestionIds: string[];
}

export const getRoboticsStorageKey = (studentId: StudentId): string => `academy_robotics_${studentId}_v1`;

function emptyProgress(studentId: StudentId): RoboticsProgress {
  return {
    studentId, lessonId: getRoboticsLesson(studentId).id,
    practice: null, exam: null, reviewQuestionIds: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidResult(value: unknown, mode: RoboticsQuizMode, lesson: RoboticsLesson): value is RoboticsResult {
  if ((mode !== 'practice' && mode !== 'exam') || !isRecord(value) || value.mode !== mode ||
      typeof value.completedAt !== 'string' || !Number.isFinite(Date.parse(value.completedAt)) ||
      !Array.isArray(value.answers) || value.answers.length === 0) return false;
  const ids = new Set<string>();
  for (const entry of value.answers) {
    if (!isRecord(entry) || typeof entry.questionId !== 'string' || ids.has(entry.questionId) ||
        typeof entry.answer !== 'string' || typeof entry.correct !== 'boolean' ||
        typeof entry.parentChecked !== 'boolean') return false;
    if (entry.aiChecked !== undefined && typeof entry.aiChecked !== 'boolean') return false;
    const aiChecked = entry.aiChecked === true;
    if (aiChecked && !isWrittenGrade({ correct: entry.correct, feedback: entry.aiFeedback })) return false;
    if (!aiChecked && entry.aiFeedback !== undefined) return false;
    const question = lesson.questions.find(question => question.id === entry.questionId);
    if (!question) return false;
    if (question.kind === 'short') {
      const hasSingleCheck = entry.parentChecked !== aiChecked;
      if (entry.answer.trim() ? !hasSingleCheck : entry.correct || entry.parentChecked || aiChecked) return false;
    } else if (entry.parentChecked || aiChecked || entry.correct !== checkRoboticsAnswer(question, entry.answer)) {
      return false;
    }
    ids.add(entry.questionId);
  }
  return mode !== 'exam' || ids.size === lesson.questions.length;
}

function isValidProgress(value: unknown, studentId: StudentId): value is RoboticsProgress {
  const lesson = getRoboticsLesson(studentId);
  return isRecord(value) && value.studentId === studentId && value.lessonId === lesson.id &&
    (value.practice === null || isValidResult(value.practice, 'practice', lesson)) &&
    (value.exam === null || isValidResult(value.exam, 'exam', lesson)) &&
    Array.isArray(value.reviewQuestionIds) &&
    value.reviewQuestionIds.every(id => typeof id === 'string' && lesson.questions.some(question => question.id === id)) &&
    new Set(value.reviewQuestionIds).size === value.reviewQuestionIds.length;
}

export function loadRoboticsProgress(studentId: StudentId): RoboticsProgress {
  if (typeof window === 'undefined') return emptyProgress(studentId);
  try {
    const raw = localStorage.getItem(getRoboticsStorageKey(studentId));
    if (!raw) return emptyProgress(studentId);
    const parsed: unknown = JSON.parse(raw);
    if (isValidProgress(parsed, studentId)) return parsed;
    emitStorageError(`Robotics progress for ${studentId} was malformed. Spelling progress is unchanged.`);
  } catch {
    emitStorageError(`Unable to read robotics progress for ${studentId}. Spelling progress is unchanged.`);
  }
  return emptyProgress(studentId);
}

export function saveRoboticsResult(studentId: StudentId, result: RoboticsResult): RoboticsProgress | null {
  const lesson = getRoboticsLesson(studentId);
  if (!isValidResult(result, result.mode, lesson)) {
    emitStorageError('Unable to save an invalid or incomplete robotics result.');
    return null;
  }
  const previous = loadRoboticsProgress(studentId);
  const review = new Set(previous.reviewQuestionIds);
  for (const answer of result.answers) {
    if (!answer.correct) review.add(answer.questionId);
    // Assisted practice must not erase a missed exam question.
    else if (result.mode === 'exam') review.delete(answer.questionId);
  }
  const next: RoboticsProgress = {
    ...previous, [result.mode]: result, reviewQuestionIds: [...review]
  };
  if (typeof window === 'undefined') return next;
  try {
    localStorage.setItem(getRoboticsStorageKey(studentId), JSON.stringify(next));
    return next;
  } catch {
    emitStorageError('Storage save failed: unable to save this robotics result. Keep this page open and retry.');
    return null;
  }
}
