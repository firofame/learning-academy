import { StudentId } from '../types';
import { getEnglishLessonForGrade, ENGLISH_SECTIONS } from '../data/english';
import { getStudentProfile } from '../data/profiles';
import {
  SubjectAnswer, SubjectResult, SubjectProgress, SubjectRevisionMode,
  getSubjectStorageKey, loadSubjectProgressBase, saveSubjectResultBase,
  updateSubjectReviewQuestionIds, isValidSubjectAnswer, isPlainRecord
} from './subjectStorage';

export type EnglishRevisionMode = SubjectRevisionMode;
export type EnglishQuizMode = EnglishRevisionMode;
export type EnglishAnswer = SubjectAnswer;
export type EnglishResult = SubjectResult;
export type EnglishProgress = SubjectProgress;

export const getEnglishStorageKey = (studentId: StudentId): string =>
  getSubjectStorageKey('english', studentId);

function getLesson(studentId: StudentId) {
  const profile = getStudentProfile(studentId);
  return getEnglishLessonForGrade(profile.grade);
}

export function isValidEnglishProgress(value: unknown, studentId: StudentId): value is EnglishProgress {
  if (!isPlainRecord(value) || value.studentId !== studentId) return false;
  const lesson = getLesson(studentId);
  if (!lesson || value.lessonId !== lesson.id) return false;
  if (value.practice !== null && !isValidEnglishResult(value.practice, 'practice', lesson)) return false;
  if (value.exam !== null && !isValidEnglishResult(value.exam, 'exam', lesson)) return false;
  if (!Array.isArray(value.reviewQuestionIds) || !value.reviewQuestionIds.every(id => typeof id === 'string')) return false;
  return true;
}

function isValidEnglishResult(value: unknown, mode: EnglishRevisionMode, lesson: ReturnType<typeof getLesson>): value is EnglishResult {
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
      if (!ENGLISH_SECTIONS.some(s => s.id === section)) return false;
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

export function loadEnglishProgress(studentId: StudentId): EnglishProgress {
  const lesson = getLesson(studentId);
  return loadSubjectProgressBase('english', studentId, lesson ? lesson.id : 'english-grade-6-units-1-3', parsed =>
    isValidEnglishProgress(parsed, studentId)
  );
}

export function saveEnglishResult(studentId: StudentId, result: EnglishResult, _options?: { mirrorAttempts?: boolean }): EnglishProgress | null {
  const lesson = getLesson(studentId);
  if (!lesson) return null;
  const isFullExam = !result.section || result.section === 'all';
  return saveSubjectResultBase('english', studentId, result, lesson.id, {
    policy: 'practice-or-exam-correct',
    isFullExam,
    resultValidator: res => isValidEnglishResult(res, res.mode, lesson),
    customLoader: () => loadEnglishProgress(studentId)
  });
}

export const updateEnglishReviewQuestionIds = (
  currentReviewIds: readonly string[],
  answers: readonly EnglishAnswer[],
  mode: EnglishRevisionMode,
  isFullExam = true
) => updateSubjectReviewQuestionIds(currentReviewIds, answers, mode, 'practice-or-exam-correct', isFullExam);
