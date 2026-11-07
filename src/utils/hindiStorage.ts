import { StudentId } from '../types';
import { getHindiLessonForGrade, HINDI_SECTIONS } from '../data/hindi';
import { getStudentProfile } from '../data/profiles';
import {
  SubjectAnswer, SubjectResult, SubjectProgress, SubjectQuizMode,
  getSubjectStorageKey, loadSubjectProgressBase, saveSubjectResultBase,
  updateSubjectReviewQuestionIds, isValidSubjectAnswer, isPlainRecord
} from './subjectStorage';

export type HindiQuizMode = SubjectQuizMode;
export type HindiAnswer = SubjectAnswer;
export type HindiResult = SubjectResult;
export type HindiProgress = SubjectProgress;

export const getHindiStorageKey = (studentId: StudentId): string =>
  getSubjectStorageKey('hindi', studentId);

function getLesson(studentId: StudentId) {
  const profile = getStudentProfile(studentId);
  return getHindiLessonForGrade(profile.grade);
}

export function isValidHindiProgress(value: unknown, studentId: StudentId): value is HindiProgress {
  if (!isPlainRecord(value) || value.studentId !== studentId) return false;
  const lesson = getLesson(studentId);
  if (!lesson || value.lessonId !== lesson.id) return false;
  if (value.practice !== null && !isValidHindiResult(value.practice, 'practice', lesson)) return false;
  if (value.exam !== null && !isValidHindiResult(value.exam, 'exam', lesson)) return false;
  if (!Array.isArray(value.reviewQuestionIds) || !value.reviewQuestionIds.every(id => typeof id === 'string')) return false;
  return true;
}

function isValidHindiResult(value: unknown, mode: HindiQuizMode, lesson: ReturnType<typeof getLesson>): value is HindiResult {
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
      if (!HINDI_SECTIONS.some(s => s.id === section)) return false;
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

export function loadHindiProgress(studentId: StudentId): HindiProgress {
  const lesson = getLesson(studentId);
  return loadSubjectProgressBase('hindi', studentId, lesson ? lesson.id : 'hindi-grade-6-chapters-3-4', parsed =>
    isValidHindiProgress(parsed, studentId)
  );
}

export function saveHindiResult(studentId: StudentId, result: HindiResult, _options?: { mirrorAttempts?: boolean }): HindiProgress | null {
  const lesson = getLesson(studentId);
  if (!lesson) return null;
  const isFullExam = !result.section || result.section === 'all';
  return saveSubjectResultBase('hindi', studentId, result, lesson.id, {
    policy: 'practice-correct-and-full-exam-refresh',
    isFullExam,
    resultValidator: res => isValidHindiResult(res, res.mode, lesson),
    customLoader: () => loadHindiProgress(studentId)
  });
}

export const updateHindiReviewQuestionIds = (
  currentReviewIds: readonly string[],
  answers: readonly HindiAnswer[],
  mode: HindiQuizMode,
  isFullExam = true
) => updateSubjectReviewQuestionIds(currentReviewIds, answers, mode, 'practice-correct-and-full-exam-refresh', isFullExam);
