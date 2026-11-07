import { StudentId } from '../types';
import { checkHindiAnswer, getHindiLesson, getHindiLessonForGrade, HindiLesson } from '../data/hindi';
import { getStudentProfile } from '../data/profiles';
import { emitStorageError } from './appStorage';
import { getDefaultLearningRepository } from '../learning/persistence';
import { shouldClearMissedQuestion, SUBJECT_REVIEW_POLICIES } from '../learning/domain';
import { createQuizAttempts } from '../learning/attemptRecords';
import { saveLearningAttempts } from '../learning/persistence';
import { isWrittenGrade } from './roboticsGrading';

export type HindiQuizMode = 'practice' | 'exam';

export interface HindiAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
  skipped?: boolean;
  aiChecked?: boolean;
  aiFeedback?: string;
  attemptId?: string;
  attemptedAt?: string;
}

export interface HindiResult {
  mode: HindiQuizMode;
  completedAt: string;
  answers: HindiAnswer[];
}

export interface HindiProgress {
  studentId: StudentId;
  lessonId: string;
  practice: HindiResult | null;
  exam: HindiResult | null;
  reviewQuestionIds: string[];
}

export const getHindiStorageKey = (studentId: StudentId): string =>
  `academy_hindi_${studentId}_v1`;

function emptyProgress(studentId: StudentId): HindiProgress {
  return {
    studentId,
    lessonId: getHindiLesson(studentId).id,
    practice: null,
    exam: null,
    reviewQuestionIds: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidAnswer(value: unknown, lesson: HindiLesson): value is HindiAnswer {
  if (!isRecord(value) || typeof value.questionId !== 'string' ||
      typeof value.answer !== 'string' || typeof value.correct !== 'boolean') return false;
  if (value.skipped !== undefined && typeof value.skipped !== 'boolean') return false;
  if (value.attemptId !== undefined && (typeof value.attemptId !== 'string' || !value.attemptId) ||
      value.attemptedAt !== undefined && (typeof value.attemptedAt !== 'string' || !Number.isFinite(Date.parse(value.attemptedAt)))) return false;
  const question = lesson.questions.find(entry => entry.id === value.questionId);
  if (!question || value.aiChecked !== undefined && typeof value.aiChecked !== 'boolean') return false;
  if (value.skipped === true) {
    return value.answer.trim() === '' && value.correct === false && value.aiChecked !== true &&
      value.aiFeedback === undefined;
  }
  if (!value.answer.trim()) return false;
  if (value.aiChecked === true) {
    return question.kind !== 'pair' && Boolean(question.markingCriteria) &&
      isWrittenGrade({ correct: value.correct, feedback: value.aiFeedback });
  }
  return value.aiFeedback === undefined && value.correct === checkHindiAnswer(question, value.answer);
}

function isValidResult(
  value: unknown,
  mode: HindiQuizMode,
  lesson: HindiLesson
): value is HindiResult {
  if (!isRecord(value) || value.mode !== mode ||
      typeof value.completedAt !== 'string' || !Number.isFinite(Date.parse(value.completedAt)) ||
      !Array.isArray(value.answers) || value.answers.length === 0) return false;
  const answers = value.answers.filter(answer => isValidAnswer(answer, lesson));
  if (answers.length !== value.answers.length) return false;
  const answeredIds = new Set(answers.map(answer => answer.questionId));
  return answeredIds.size === answers.length &&
    (mode !== 'exam' || answeredIds.size === lesson.questions.length &&
      lesson.questions.every(question => answeredIds.has(question.id)));
}

export function isValidHindiProgress(value: unknown, studentId: StudentId): value is HindiProgress {
  if (!isRecord(value) || value.studentId !== studentId) return false;
  const profile = getStudentProfile(studentId);
  const lesson = getHindiLessonForGrade(profile.grade);
  if (!lesson) return false;
  return value.lessonId === lesson.id &&
    (value.practice === null || isValidResult(value.practice, 'practice', lesson)) &&
    (value.exam === null || isValidResult(value.exam, 'exam', lesson)) &&
    Array.isArray(value.reviewQuestionIds) &&
    value.reviewQuestionIds.every(id =>
      typeof id === 'string' && lesson.questions.some(question => question.id === id)
    ) &&
    new Set(value.reviewQuestionIds).size === value.reviewQuestionIds.length;
}

export function loadHindiProgress(studentId: StudentId): HindiProgress {
  if (typeof window === 'undefined') return emptyProgress(studentId);
  try {
    const raw = localStorage.getItem(getHindiStorageKey(studentId));
    if (!raw) return emptyProgress(studentId);
    const parsed: unknown = JSON.parse(raw);
    if (isValidHindiProgress(parsed, studentId)) return parsed;
    emitStorageError(`Hindi progress for ${studentId} was malformed. Other progress is unchanged.`);
  } catch {
    emitStorageError(`Unable to read Hindi progress for ${studentId}. Other progress is unchanged.`);
  }
  return emptyProgress(studentId);
}

export function saveHindiResult(
  studentId: StudentId,
  result: HindiResult,
  options: { mirrorAttempts?: boolean } = {}
): HindiProgress | null {
  const profile = getStudentProfile(studentId);
  const lesson = getHindiLessonForGrade(profile.grade);
  if (!lesson) {
    emitStorageError(`Hindi exam revision is not available for ${profile.gradeLabel}.`);
    return null;
  }
  if (!isValidResult(result, result.mode, lesson)) {
    emitStorageError('Unable to save an invalid or incomplete Hindi result.');
    return null;
  }

  const previous = loadHindiProgress(studentId);
  const isFullExam = result.mode === 'exam' && result.answers.length === lesson.questions.length;
  const newlyCorrectIds = new Set(result.answers
    .filter(answer => shouldClearMissedQuestion(SUBJECT_REVIEW_POLICIES.hindi, result.mode, isFullExam, answer.correct ? 'correct' : 'incorrect', false))
    .map(answer => answer.questionId));
  const newlyIncorrectIds = result.answers.filter(answer => !answer.correct).map(answer => answer.questionId);
  const reviewQuestionIds = isFullExam
    ? newlyIncorrectIds
    : Array.from(new Set([
        ...previous.reviewQuestionIds.filter(id => !newlyCorrectIds.has(id)),
        ...newlyIncorrectIds
      ]));
  const next: HindiProgress = {
    studentId,
    lessonId: lesson.id,
    practice: result.mode === 'practice' ? result : previous.practice,
    exam: result.mode === 'exam' ? result : previous.exam,
    reviewQuestionIds
  };

  if (typeof window === 'undefined') return next;
  try {
    const serialized = JSON.stringify(next);
    localStorage.setItem(getHindiStorageKey(studentId), serialized);
    if (typeof indexedDB !== 'undefined') {
      const repository = getDefaultLearningRepository();
      if (options.mirrorAttempts !== false) {
        void saveLearningAttempts(repository, createQuizAttempts({
          learnerId: studentId, subjectId: 'hindi', lessonId: lesson.id, mode: result.mode,
          completedAt: result.completedAt, provenance: lesson.sourceNote,
          answers: result.answers.map(answer => {
            const question = lesson.questions.find(item => item.id === answer.questionId)!;
            return { ...answer, prompt: question.prompt, referenceAnswer: question.answer };
          })
        })).catch(() => undefined);
      }
    }
    return next;
  } catch {
    emitStorageError('Storage save failed: unable to save this Hindi result. Keep this page open and retry.');
    return null;
  }
}
