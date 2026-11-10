import { StudentId } from '../types';
import { getHistoryLessonForGrade, HISTORY_SECTIONS } from '../data/history';
import { getStudentProfile } from '../data/profiles';
import {
  SubjectAnswer, SubjectResult, SubjectProgress, SubjectRevisionMode,
  getSubjectStorageKey, loadSubjectProgressBase, saveSubjectResultBase,
  updateSubjectReviewQuestionIds, isValidSubjectAnswer, isPlainRecord
} from './subjectStorage';

export type HistoryRevisionMode = SubjectRevisionMode;
export type HistoryQuizMode = HistoryRevisionMode;
export type HistoryAnswer = SubjectAnswer;
export type HistoryResult = SubjectResult;
export type HistoryProgress = SubjectProgress;

export const getHistoryStorageKey = (studentId: StudentId): string =>
  getSubjectStorageKey('history', studentId);

function getLesson(studentId: StudentId) {
  const profile = getStudentProfile(studentId);
  return getHistoryLessonForGrade(profile.grade);
}

export function isValidHistoryProgress(value: unknown, studentId: StudentId): value is HistoryProgress {
  if (!isPlainRecord(value) || value.studentId !== studentId) return false;
  const lesson = getLesson(studentId);
  if (!lesson || value.lessonId !== lesson.id) return false;
  if (value.practice !== null && !isValidHistoryResult(value.practice, 'practice', lesson)) return false;
  if (value.exam !== null && !isValidHistoryResult(value.exam, 'exam', lesson)) return false;
  if (!Array.isArray(value.reviewQuestionIds) || !value.reviewQuestionIds.every(id => typeof id === 'string')) return false;
  return true;
}

function isValidHistoryResult(value: unknown, mode: HistoryRevisionMode, lesson: ReturnType<typeof getLesson>): value is HistoryResult {
  if (!isPlainRecord(value) || value.mode !== mode ||
      typeof value.completedAt !== 'string' || !Number.isFinite(Date.parse(value.completedAt)) ||
      !Array.isArray(value.answers) || value.answers.length === 0) return false;
  if (!lesson) return false;
  if (!value.answers.every(isValidSubjectAnswer)) return false;

  const section = typeof value.section === 'string' ? value.section : undefined;
  if (mode === 'exam') {
    let expectedQuestionIds: Set<string>;
    if (!section || section === 'all') {
      expectedQuestionIds = new Set(lesson.questions.map(q => q.id));
    } else {
      if (!HISTORY_SECTIONS.some(s => s.id === section)) return false;
      expectedQuestionIds = new Set(lesson.questions.filter(q => q.section === section).map(q => q.id));
      if (expectedQuestionIds.size === 0) return false;
    }
    const answeredIds = new Set(value.answers.map((a: SubjectAnswer) => a.questionId));
    if (answeredIds.size !== expectedQuestionIds.size || !value.answers.every((a: SubjectAnswer) => expectedQuestionIds.has(a.questionId))) {
      return false;
    }
  }
  return true;
}

export function loadHistoryProgress(studentId: StudentId): HistoryProgress {
  const lesson = getLesson(studentId);
  return loadSubjectProgressBase('history', studentId, lesson ? lesson.id : 'history-grade-6-compendium', parsed =>
    isValidHistoryProgress(parsed, studentId)
  );
}

export function saveHistoryResult(studentId: StudentId, result: HistoryResult, _options?: { mirrorAttempts?: boolean }): HistoryProgress | null {
  const lesson = getLesson(studentId);
  if (!lesson) return null;
  const isFullExam = !result.section || result.section === 'all';
  return saveSubjectResultBase('history', studentId, result, lesson.id, {
    policy: 'practice-or-exam-correct',
    isFullExam,
    resultValidator: res => isValidHistoryResult(res, res.mode, lesson),
    customLoader: () => loadHistoryProgress(studentId)
  });
}

export const updateHistoryReviewQuestionIds = (
  currentReviewIds: readonly string[],
  answers: readonly HistoryAnswer[],
  mode: HistoryRevisionMode,
  isFullExam = true
) => updateSubjectReviewQuestionIds(currentReviewIds, answers, mode, 'practice-or-exam-correct', isFullExam);
