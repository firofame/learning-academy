import { StudentId } from '../types';
import { getBiologyLessonForGrade, BIOLOGY_SECTIONS } from '../data/biology';
import { getStudentProfile } from '../data/profiles';
import {
  SubjectAnswer, SubjectResult, SubjectProgress, SubjectRevisionMode,
  getSubjectStorageKey, loadSubjectProgressBase, saveSubjectResultBase,
  updateSubjectReviewQuestionIds, isValidSubjectAnswer, isPlainRecord
} from './subjectStorage';

export type BiologyRevisionMode = SubjectRevisionMode;
export type BiologyQuizMode = BiologyRevisionMode;
export type BiologyAnswer = SubjectAnswer;
export type BiologyResult = SubjectResult;
export type BiologyProgress = SubjectProgress;

export const getBiologyStorageKey = (studentId: StudentId): string =>
  getSubjectStorageKey('biology', studentId);

function getLesson(studentId: StudentId) {
  const profile = getStudentProfile(studentId);
  return getBiologyLessonForGrade(profile.grade);
}

export function isValidBiologyProgress(value: unknown, studentId: StudentId): value is BiologyProgress {
  if (!isPlainRecord(value) || value.studentId !== studentId) return false;
  const lesson = getLesson(studentId);
  if (!lesson || value.lessonId !== lesson.id) return false;
  if (value.practice !== null && !isValidBiologyResult(value.practice, 'practice', lesson)) return false;
  if (value.exam !== null && !isValidBiologyResult(value.exam, 'exam', lesson)) return false;
  if (!Array.isArray(value.reviewQuestionIds) || !value.reviewQuestionIds.every(id => typeof id === 'string')) return false;
  return true;
}

function isValidBiologyResult(value: unknown, mode: BiologyRevisionMode, lesson: ReturnType<typeof getLesson>): value is BiologyResult {
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
      if (!BIOLOGY_SECTIONS.some(s => s.id === section)) return false;
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

export function loadBiologyProgress(studentId: StudentId): BiologyProgress {
  const lesson = getLesson(studentId);
  return loadSubjectProgressBase('biology', studentId, lesson ? lesson.id : 'biology-grade-6-chapters-1-4', parsed =>
    isValidBiologyProgress(parsed, studentId)
  );
}

export function saveBiologyResult(studentId: StudentId, result: BiologyResult, _options?: { mirrorAttempts?: boolean }): BiologyProgress | null {
  const lesson = getLesson(studentId);
  if (!lesson) return null;
  const isFullExam = !result.section || result.section === 'all';
  return saveSubjectResultBase('biology', studentId, result, lesson.id, {
    policy: 'practice-or-exam-correct',
    isFullExam,
    resultValidator: res => isValidBiologyResult(res, res.mode, lesson),
    customLoader: () => loadBiologyProgress(studentId)
  });
}

export const updateBiologyReviewQuestionIds = (
  currentReviewIds: readonly string[],
  answers: readonly BiologyAnswer[],
  mode: BiologyRevisionMode,
  isFullExam = true
) => updateSubjectReviewQuestionIds(currentReviewIds, answers, mode, 'practice-or-exam-correct', isFullExam);
