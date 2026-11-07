import { StudentId } from '../types';
import { checkBiologyAnswer, getBiologyLessonForGrade, BiologyLesson, BIOLOGY_SECTIONS } from '../data/biology';
import { getStudentProfile } from '../data/profiles';
import { emitStorageError } from './appStorage';
import { getDefaultLearningRepository } from '../learning/persistence';
import { shouldClearMissedQuestion, SUBJECT_REVIEW_POLICIES } from '../learning/domain';
import { createQuizAttempts } from '../learning/attemptRecords';
import { saveLearningAttempts } from '../learning/persistence';
import type { AssistanceKind } from '../learning/contracts';
import { isWrittenGrade } from './roboticsGrading';

export type BiologyQuizMode = 'practice' | 'exam';

export interface BiologyAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
  skipped?: boolean;
  assistance?: AssistanceKind[];
  aiChecked?: boolean;
  aiFeedback?: string;
  attemptId?: string;
  attemptedAt?: string;
}

export interface BiologyResult {
  mode: BiologyQuizMode;
  completedAt: string;
  section?: string;
  answers: BiologyAnswer[];
}

export interface BiologyProgress {
  studentId: StudentId;
  lessonId: string;
  practice: BiologyResult | null;
  exam: BiologyResult | null;
  reviewQuestionIds: string[];
}

export const getBiologyStorageKey = (studentId: StudentId): string =>
  `academy_biology_${studentId}_v1`;

function emptyProgress(studentId: StudentId): BiologyProgress {
  const profile = getStudentProfile(studentId);
  const lesson = getBiologyLessonForGrade(profile.grade);
  return {
    studentId,
    lessonId: lesson ? lesson.id : 'biology-grade-6-chapters-1-4',
    practice: null,
    exam: null,
    reviewQuestionIds: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidAnswer(value: unknown, lesson: BiologyLesson): value is BiologyAnswer {
  if (!isRecord(value) || typeof value.questionId !== 'string' ||
      typeof value.answer !== 'string' || typeof value.correct !== 'boolean') return false;
  if (value.skipped !== undefined && typeof value.skipped !== 'boolean') return false;
  if (value.assistance !== undefined && (!Array.isArray(value.assistance) || !value.assistance.every(item =>
    ['answer-revealed', 'tile-helper', 'hint', 'read-aloud', 'other'].includes(String(item))))) return false;
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
    return Boolean(question.markingCriteria) &&
      isWrittenGrade({ correct: value.correct, feedback: value.aiFeedback });
  }
  return value.aiFeedback === undefined && value.correct === checkBiologyAnswer(question, value.answer);
}

function isValidResult(
  value: unknown,
  mode: BiologyQuizMode,
  lesson: BiologyLesson
): value is BiologyResult {
  if (!isRecord(value) || value.mode !== mode ||
      typeof value.completedAt !== 'string' || !Number.isFinite(Date.parse(value.completedAt)) ||
      !Array.isArray(value.answers) || value.answers.length === 0) return false;
  const answers = value.answers.filter(answer => isValidAnswer(answer, lesson));
  if (answers.length !== value.answers.length) return false;
  const answeredIds = new Set(answers.map(answer => answer.questionId));
  if (answeredIds.size !== answers.length) return false;

  const section = typeof value.section === 'string' ? value.section : undefined;
  if (mode === 'exam') {
    let expectedQuestionIds: Set<string>;
    if (!section || section === 'all') {
      expectedQuestionIds = new Set(lesson.questions.map(q => q.id));
    } else {
      if (!BIOLOGY_SECTIONS.some(s => s.id === section)) return false;
      expectedQuestionIds = new Set(lesson.questions.filter(q => q.section === section).map(q => q.id));
      if (expectedQuestionIds.size === 0) return false;
    }
    if (answeredIds.size !== expectedQuestionIds.size) return false;
    for (const id of answeredIds) {
      if (!expectedQuestionIds.has(id)) return false;
    }
  } else {
    if (section && section !== 'all' && !BIOLOGY_SECTIONS.some(s => s.id === section)) return false;
    if (section && section !== 'all') {
      const sectionQuestionIds = new Set(lesson.questions.filter(q => q.section === section).map(q => q.id));
      for (const id of answeredIds) {
        if (!sectionQuestionIds.has(id)) return false;
      }
    }
    if (answers.length > lesson.questions.length) return false;
  }

  return true;
}

export function isValidBiologyProgress(value: unknown, studentId: StudentId): value is BiologyProgress {
  if (!isRecord(value) || value.studentId !== studentId) return false;
  const profile = getStudentProfile(studentId);
  const lesson = getBiologyLessonForGrade(profile.grade);
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

export function loadBiologyProgress(studentId: StudentId): BiologyProgress {
  if (typeof window === 'undefined') return emptyProgress(studentId);
  try {
    const raw = localStorage.getItem(getBiologyStorageKey(studentId));
    if (!raw) return emptyProgress(studentId);
    const parsed: unknown = JSON.parse(raw);
    if (isValidBiologyProgress(parsed, studentId)) return parsed;
    emitStorageError(`Biology progress for ${studentId} was malformed. Other progress is unchanged.`);
  } catch {
    emitStorageError(`Unable to read Biology progress for ${studentId}. Other progress is unchanged.`);
  }
  return emptyProgress(studentId);
}

export function saveBiologyResult(
  studentId: StudentId,
  result: BiologyResult,
  options: { mirrorAttempts?: boolean } = {}
): BiologyProgress | null {
  const profile = getStudentProfile(studentId);
  const lesson = getBiologyLessonForGrade(profile.grade);
  if (!lesson) {
    emitStorageError(`Biology is not available for ${profile.gradeLabel}.`);
    return null;
  }
  if (!isValidResult(result, result.mode, lesson)) {
    emitStorageError('Unable to save an invalid or incomplete Biology result.');
    return null;
  }

  const previous = loadBiologyProgress(studentId);
  const isFullExam = result.mode === 'exam' && (!result.section || result.section === 'all' || result.answers.length === lesson.questions.length);
  const newlyCorrectIds = new Set(result.answers
    .filter(answer => shouldClearMissedQuestion(
      SUBJECT_REVIEW_POLICIES.biology,
      result.mode,
      isFullExam,
      answer.correct ? 'correct' : 'incorrect',
      Boolean(answer.assistance && answer.assistance.length > 0)
    ))
    .map(answer => answer.questionId));
  const newlyIncorrectIds = result.answers.filter(answer => !answer.correct).map(answer => answer.questionId);
  const reviewQuestionIds = Array.from(new Set([
    ...previous.reviewQuestionIds.filter(id => !newlyCorrectIds.has(id)),
    ...newlyIncorrectIds
  ]));
  const next: BiologyProgress = {
    studentId,
    lessonId: lesson.id,
    practice: result.mode === 'practice' ? result : previous.practice,
    exam: result.mode === 'exam' ? result : previous.exam,
    reviewQuestionIds
  };

  if (typeof window === 'undefined') return next;
  try {
    const serialized = JSON.stringify(next);
    localStorage.setItem(getBiologyStorageKey(studentId), serialized);
    if (typeof indexedDB !== 'undefined') {
      const repository = getDefaultLearningRepository();
      if (options.mirrorAttempts !== false) {
        void saveLearningAttempts(repository, createQuizAttempts({
          learnerId: studentId, subjectId: 'biology', lessonId: lesson.id, mode: result.mode,
          completedAt: result.completedAt, provenance: lesson.sourceName,
          answers: result.answers.map(answer => {
            const question = lesson.questions.find(item => item.id === answer.questionId)!;
            return { ...answer, prompt: question.prompt, referenceAnswer: question.answer };
          })
        })).catch(() => undefined);
      }
    }
    return next;
  } catch {
    emitStorageError('Storage save failed: unable to save this Biology result. Keep this page open and retry.');
    return null;
  }
}
