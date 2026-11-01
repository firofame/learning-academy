import { StudentId } from '../types';
import { checkMathsAnswer, getMathsLesson, MathsLesson } from '../data/maths';
import { emitStorageError } from './storage';

export type MathsQuizMode = 'practice' | 'exam';

export interface MathsAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
}

export interface MathsResult {
  mode: MathsQuizMode;
  completedAt: string;
  topic?: string;
  answers: MathsAnswer[];
}

export interface MathsProgress {
  studentId: StudentId;
  lessonId: string;
  practice: MathsResult | null;
  exam: MathsResult | null;
  reviewQuestionIds: string[];
}

export const getMathsStorageKey = (studentId: StudentId): string => `academy_maths_${studentId}_v1`;

function emptyProgress(studentId: StudentId): MathsProgress {
  return {
    studentId,
    lessonId: getMathsLesson(studentId).id,
    practice: null,
    exam: null,
    reviewQuestionIds: []
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidAnswer(value: unknown, lesson: MathsLesson): value is MathsAnswer {
  if (!isPlainObject(value)) return false;
  const questionId = value.questionId;
  const answer = value.answer;
  const correct = value.correct;
  if (typeof questionId !== 'string' || typeof answer !== 'string' || typeof correct !== 'boolean') return false;
  const question = lesson.questions.find(q => q.id === questionId);
  if (!question) return false;
  return correct === checkMathsAnswer(question, answer);
}

function isValidResult(value: unknown, mode: MathsQuizMode, lesson: MathsLesson): value is MathsResult {
  if (!isPlainObject(value)) return false;
  if (value.mode !== mode) return false;
  if (typeof value.completedAt !== 'string' || Number.isNaN(Date.parse(value.completedAt))) return false;
  if (value.topic !== undefined && typeof value.topic !== 'string') return false;
  if (!Array.isArray(value.answers) || value.answers.length === 0) return false;

  const validAnswers = value.answers.filter(entry => isValidAnswer(entry, lesson));
  if (validAnswers.length !== value.answers.length) return false;

  const answeredIds = new Set(validAnswers.map(a => a.questionId));
  if (answeredIds.size !== validAnswers.length) return false;

  if (validAnswers.length > lesson.questions.length) return false;

  return true;
}

function isValidProgress(value: unknown, studentId: StudentId): value is MathsProgress {
  if (!isPlainObject(value)) return false;
  if (value.studentId !== studentId) return false;
  const lesson = getMathsLesson(studentId);
  if (value.lessonId !== lesson.id) return false;
  if (value.practice !== null && !isValidResult(value.practice, 'practice', lesson)) return false;
  if (value.exam !== null && !isValidResult(value.exam, 'exam', lesson)) return false;
  if (!Array.isArray(value.reviewQuestionIds) || !value.reviewQuestionIds.every(id => typeof id === 'string' && lesson.questions.some(q => q.id === id))) {
    return false;
  }
  return true;
}

export function loadMathsProgress(studentId: StudentId): MathsProgress {
  try {
    const raw = localStorage.getItem(getMathsStorageKey(studentId));
    if (!raw) return emptyProgress(studentId);
    const parsed = JSON.parse(raw);
    if (!isValidProgress(parsed, studentId)) {
      emitStorageError(`Maths progress for ${studentId} was malformed. Other progress is unchanged.`);
      return emptyProgress(studentId);
    }
    return parsed;
  } catch {
    emitStorageError(`Unable to read maths progress for ${studentId}. Other progress is unchanged.`);
    return emptyProgress(studentId);
  }
}

export function saveMathsResult(studentId: StudentId, result: MathsResult): MathsProgress | null {
  const lesson = getMathsLesson(studentId);
  if (!isValidResult(result, result.mode, lesson)) {
    emitStorageError('Unable to save an invalid or incomplete maths result.');
    return null;
  }

  const previous = loadMathsProgress(studentId);
  const newlyCorrectIds = new Set(result.answers.filter(a => a.correct).map(a => a.questionId));
  const newlyIncorrectIds = result.answers.filter(a => !a.correct).map(a => a.questionId);

  const isFullExam = result.mode === 'exam' && result.answers.length === lesson.questions.length;
  const reviewQuestionIds = isFullExam
    ? newlyIncorrectIds
    : Array.from(
        new Set([
          ...previous.reviewQuestionIds.filter(id => !newlyCorrectIds.has(id)),
          ...newlyIncorrectIds
        ])
      );

  const next: MathsProgress = {
    studentId,
    lessonId: lesson.id,
    practice: result.mode === 'practice' ? result : previous.practice,
    exam: result.mode === 'exam' ? result : previous.exam,
    reviewQuestionIds
  };

  try {
    localStorage.setItem(getMathsStorageKey(studentId), JSON.stringify(next));
    return next;
  } catch {
    emitStorageError('Storage save failed: unable to save this maths result. Keep this page open and retry.');
    return null;
  }
}
