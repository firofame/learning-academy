import { StudentId } from '../types';
import { checkMalayalamAnswer, getMalayalamLesson, MalayalamLesson } from '../data/malayalam';
import { emitStorageError } from './appStorage';
import { persistProgressSnapshot, getDefaultLearningRepository } from '../learning/persistence';
import { shouldClearMissedQuestion, SUBJECT_REVIEW_POLICIES } from '../learning/domain';
import { CONTENT_VERSIONS } from '../data/contentVersions';
import { createQuizAttempts } from '../learning/attemptRecords';
import { saveLearningAttempts } from '../learning/persistence';
import { isWrittenGrade } from './roboticsGrading';

export type MalayalamQuizMode = 'practice' | 'exam';

export interface MalayalamAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
  skipped?: boolean;
  aiChecked?: boolean;
  aiFeedback?: string;
  attemptId?: string;
  attemptedAt?: string;
}

export interface MalayalamResult {
  mode: MalayalamQuizMode;
  completedAt: string;
  contentVersion?: string;
  answers: MalayalamAnswer[];
}

export interface MalayalamProgress {
  studentId: StudentId;
  lessonId: string;
  practice: MalayalamResult | null;
  exam: MalayalamResult | null;
  reviewQuestionIds: string[];
}

export const getMalayalamStorageKey = (studentId: StudentId): string =>
  `academy_malayalam_${studentId}_v1`;

function emptyProgress(studentId: StudentId): MalayalamProgress {
  return {
    studentId,
    lessonId: getMalayalamLesson(studentId).id,
    practice: null,
    exam: null,
    reviewQuestionIds: []
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidAnswer(value: unknown, lesson: MalayalamLesson): value is MalayalamAnswer {
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
    return (question.kind === 'text' || question.kind === 'written') &&
      Boolean(question.markingCriteria) &&
      isWrittenGrade({ correct: value.correct, feedback: value.aiFeedback });
  }
  return value.aiFeedback === undefined &&
    value.correct === checkMalayalamAnswer(question, value.answer);
}

function isValidResult(
  value: unknown,
  mode: MalayalamQuizMode,
  lesson: MalayalamLesson,
  historical = false
): value is MalayalamResult {
  if (!isRecord(value) || value.mode !== mode ||
      typeof value.completedAt !== 'string' || !Number.isFinite(Date.parse(value.completedAt)) ||
      !Array.isArray(value.answers) || value.answers.length === 0) return false;

  const legacy = historical &&
    (value.contentVersion === undefined || value.contentVersion === 'malayalam-v1');
  if (!legacy && value.contentVersion !== undefined &&
      value.contentVersion !== CONTENT_VERSIONS.malayalam) return false;
  let resultLesson = lesson;
  if (legacy && lesson.grade === 6) {
    // v1 covered only Lessons 1–2 and used the incorrect പ്രതീക്ഷ sentence cue.
    resultLesson = {
      ...lesson,
      questions: lesson.questions
        .filter(question => /^g6-mal-(?:l[12]-|vigraham-)/u.test(question.id))
        .map(question => question.id === 'g6-mal-l2-sentence-2' && question.kind === 'written'
          ? {
              ...question,
              answer: 'പ്രതീക്ഷയോടെ എനിക്ക് ഒരു മിഠായി കിട്ടി.',
              acceptedAnswers: ['പ്രതീക്ഷയോടെ എനിക്ക് ഒരു മിഠായി കിട്ടി.']
            }
          : question)
    };
  }
  const answers = value.answers.filter(answer => isValidAnswer(answer, resultLesson));
  if (answers.length !== value.answers.length) return false;
  const answeredIds = new Set(answers.map(answer => answer.questionId));
  if (answeredIds.size !== answers.length) return false;
  return mode !== 'exam' || answeredIds.size === resultLesson.questions.length &&
    resultLesson.questions.every(question => answeredIds.has(question.id));
}

export function isValidMalayalamProgress(value: unknown, studentId: StudentId): value is MalayalamProgress {
  if (!isRecord(value) || value.studentId !== studentId) return false;
  const lesson = getMalayalamLesson(studentId);
  return value.lessonId === lesson.id &&
    (value.practice === null || isValidResult(value.practice, 'practice', lesson, true)) &&
    (value.exam === null || isValidResult(value.exam, 'exam', lesson, true)) &&
    Array.isArray(value.reviewQuestionIds) &&
    value.reviewQuestionIds.every(id =>
      typeof id === 'string' && lesson.questions.some(question => question.id === id)
    ) &&
    new Set(value.reviewQuestionIds).size === value.reviewQuestionIds.length;
}

export function loadMalayalamProgress(studentId: StudentId): MalayalamProgress {
  if (typeof window === 'undefined') return emptyProgress(studentId);
  try {
    const raw = localStorage.getItem(getMalayalamStorageKey(studentId));
    if (!raw) return emptyProgress(studentId);
    const parsed: unknown = JSON.parse(raw);
    if (isValidMalayalamProgress(parsed, studentId)) return parsed;
    emitStorageError(`Malayalam progress for ${studentId} was malformed. Other progress is unchanged.`);
  } catch {
    emitStorageError(`Unable to read Malayalam progress for ${studentId}. Other progress is unchanged.`);
  }
  return emptyProgress(studentId);
}

export function saveMalayalamResult(
  studentId: StudentId,
  result: MalayalamResult,
  options: { mirrorAttempts?: boolean } = {}
): MalayalamProgress | null {
  const lesson = getMalayalamLesson(studentId);
  if (!isValidResult(result, result.mode, lesson)) {
    emitStorageError('Unable to save an invalid or incomplete Malayalam result.');
    return null;
  }

  const previous = loadMalayalamProgress(studentId);
  const isFullExam = result.mode === 'exam' && result.answers.length === lesson.questions.length;
  const newlyCorrectIds = new Set(result.answers
    .filter(answer => shouldClearMissedQuestion(SUBJECT_REVIEW_POLICIES.malayalam, result.mode, isFullExam, answer.correct ? 'correct' : 'incorrect', false))
    .map(answer => answer.questionId));
  const newlyIncorrectIds = result.answers.filter(answer => !answer.correct).map(answer => answer.questionId);
  const reviewQuestionIds = isFullExam
    ? newlyIncorrectIds
    : Array.from(new Set([
        ...previous.reviewQuestionIds.filter(id => !newlyCorrectIds.has(id)),
        ...newlyIncorrectIds
      ]));
  const next: MalayalamProgress = {
    studentId,
    lessonId: lesson.id,
    practice: result.mode === 'practice'
      ? { ...result, contentVersion: CONTENT_VERSIONS.malayalam } : previous.practice,
    exam: result.mode === 'exam'
      ? { ...result, contentVersion: CONTENT_VERSIONS.malayalam } : previous.exam,
    reviewQuestionIds
  };

  if (typeof window === 'undefined') return next;
  try {
    const serialized = JSON.stringify(next);
    localStorage.setItem(getMalayalamStorageKey(studentId), serialized);
    if (typeof indexedDB !== 'undefined') {
      const repository = getDefaultLearningRepository();
      void persistProgressSnapshot(repository, studentId, 'malayalam', serialized, CONTENT_VERSIONS.malayalam).catch(() => undefined);
      if (options.mirrorAttempts !== false) {
        void saveLearningAttempts(repository, createQuizAttempts({
          learnerId: studentId, subjectId: 'malayalam', lessonId: lesson.id, mode: result.mode,
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
    emitStorageError('Storage save failed: unable to save this Malayalam result. Keep this page open and retry.');
    return null;
  }
}
