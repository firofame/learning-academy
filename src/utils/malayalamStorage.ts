import { StudentId } from '../types';
import { checkMalayalamAnswer, getMalayalamLesson, MalayalamLesson } from '../data/malayalam';
import {
  SubjectAnswer, SubjectResult, SubjectProgress, SubjectQuizMode,
  getSubjectStorageKey, loadSubjectProgressBase, saveSubjectResultBase,
  updateSubjectReviewQuestionIds, isPlainRecord
} from './subjectStorage';

export type MalayalamQuizMode = SubjectQuizMode;
export type MalayalamAnswer = SubjectAnswer;
export type MalayalamResult = SubjectResult;
export type MalayalamProgress = SubjectProgress;

export const getMalayalamStorageKey = (studentId: StudentId): string =>
  getSubjectStorageKey('malayalam', studentId);

function isValidMalayalamAnswer(value: unknown, lesson: MalayalamLesson, legacy = false): value is MalayalamAnswer {
  if (!isPlainRecord(value) || typeof value.questionId !== 'string' ||
      typeof value.answer !== 'string' || typeof value.correct !== 'boolean') return false;
  const question = lesson.questions.find(entry => entry.id === value.questionId);
  if (!question) return false;
  if (value.aiChecked === true) return true;
  if (legacy) return true;
  return value.correct === checkMalayalamAnswer(question, value.answer);
}

function isValidMalayalamResult(
  value: unknown,
  mode: MalayalamQuizMode,
  lesson: MalayalamLesson,
  historical = false
): value is MalayalamResult {
  if (!isPlainRecord(value) || value.mode !== mode ||
      typeof value.completedAt !== 'string' || !Number.isFinite(Date.parse(value.completedAt)) ||
      !Array.isArray(value.answers) || value.answers.length === 0) return false;

  const legacy = historical && (value.contentVersion === undefined || value.contentVersion === 'malayalam-v1');
  if (!legacy && value.contentVersion !== undefined && value.contentVersion !== 'malayalam-v2') return false;
  if (!value.answers.every(a => isValidMalayalamAnswer(a, lesson, legacy))) return false;

  const expectedCount = legacy && lesson.grade === 6 ? 69 : lesson.questions.length;
  if (mode === 'exam') {
    if (value.answers.length !== expectedCount) return false;
  }
  return true;
}

export function isValidMalayalamProgress(value: unknown, studentId: StudentId): value is MalayalamProgress {
  if (!isPlainRecord(value) || value.studentId !== studentId) return false;
  const lesson = getMalayalamLesson(studentId);
  if (!lesson || value.lessonId !== lesson.id) return false;
  if (value.practice !== null && !isValidMalayalamResult(value.practice, 'practice', lesson, true)) return false;
  if (value.exam !== null && !isValidMalayalamResult(value.exam, 'exam', lesson, true)) return false;
  if (!Array.isArray(value.reviewQuestionIds) || !value.reviewQuestionIds.every(id => typeof id === 'string' && lesson.questions.some(q => q.id === id))) {
    return false;
  }
  return true;
}

export function loadMalayalamProgress(studentId: StudentId): MalayalamProgress {
  const lesson = getMalayalamLesson(studentId);
  return loadSubjectProgressBase('malayalam', studentId, lesson ? lesson.id : 'malayalam-grade-6-lessons-1-5', parsed =>
    isValidMalayalamProgress(parsed, studentId)
  );
}

export function saveMalayalamResult(studentId: StudentId, result: MalayalamResult, _options?: { mirrorAttempts?: boolean }): MalayalamProgress | null {
  const lesson = getMalayalamLesson(studentId);
  if (!lesson) return null;
  if (!isValidMalayalamResult(result, result.mode, lesson, false)) return null;

  const isFullExam = result.mode === 'exam' && result.answers.length === lesson.questions.length;
  const resultWithVersion: MalayalamResult = {
    ...result,
    contentVersion: result.contentVersion ?? 'malayalam-v2'
  };
  return saveSubjectResultBase('malayalam', studentId, resultWithVersion, lesson.id, {
    policy: 'practice-correct-and-full-exam-refresh',
    isFullExam,
    resultValidator: res => isValidMalayalamResult(res, res.mode, lesson, false),
    customLoader: () => loadMalayalamProgress(studentId)
  });
}

export const updateMalayalamReviewQuestionIds = (
  currentReviewIds: readonly string[],
  answers: readonly MalayalamAnswer[],
  mode: MalayalamQuizMode,
  isFullExam = true
) => updateSubjectReviewQuestionIds(currentReviewIds, answers, mode, 'practice-correct-and-full-exam-refresh', isFullExam);
