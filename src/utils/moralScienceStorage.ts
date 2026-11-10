import { StudentId } from '../types';
import { getMoralScienceLessonForGrade, MORAL_SCIENCE_SECTIONS } from '../data/moralScience';
import { getStudentProfile } from '../data/profiles';
import {
  SubjectAnswer, SubjectResult, SubjectProgress, SubjectRevisionMode,
  getSubjectStorageKey, loadSubjectProgressBase, saveSubjectResultBase,
  updateSubjectReviewQuestionIds, isValidSubjectAnswer, isPlainRecord
} from './subjectStorage';

export type MoralScienceRevisionMode = SubjectRevisionMode;
export type MoralScienceQuizMode = MoralScienceRevisionMode;
export type MoralScienceAnswer = SubjectAnswer;
export type MoralScienceResult = SubjectResult;
export type MoralScienceProgress = SubjectProgress;

export const getMoralScienceStorageKey = (studentId: StudentId): string =>
  getSubjectStorageKey('moral-science', studentId);

function getLesson(studentId: StudentId) {
  const profile = getStudentProfile(studentId);
  return getMoralScienceLessonForGrade(profile.grade);
}

export function isValidMoralScienceProgress(value: unknown, studentId: StudentId): value is MoralScienceProgress {
  if (!isPlainRecord(value) || value.studentId !== studentId) return false;
  const lesson = getLesson(studentId);
  if (!lesson || value.lessonId !== lesson.id) return false;
  if (value.practice !== null && !isValidMoralScienceResult(value.practice, 'practice', lesson)) return false;
  if (value.exam !== null && !isValidMoralScienceResult(value.exam, 'exam', lesson)) return false;
  if (!Array.isArray(value.reviewQuestionIds) || !value.reviewQuestionIds.every(id => typeof id === 'string')) return false;
  return true;
}

function isValidMoralScienceResult(
  value: unknown,
  mode: MoralScienceRevisionMode,
  lesson: ReturnType<typeof getLesson>
): value is MoralScienceResult {
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
      if (!MORAL_SCIENCE_SECTIONS.some(s => s.id === section)) return false;
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

export function loadMoralScienceProgress(studentId: StudentId): MoralScienceProgress {
  const lesson = getLesson(studentId);
  return loadSubjectProgressBase('moral-science', studentId, lesson ? lesson.id : 'moral-science-grade-2-lessons-1-2', parsed =>
    isValidMoralScienceProgress(parsed, studentId)
  );
}

export function saveMoralScienceResult(
  studentId: StudentId,
  result: MoralScienceResult,
  _options?: { mirrorAttempts?: boolean }
): MoralScienceProgress | null {
  const lesson = getLesson(studentId);
  if (!lesson) return null;
  const isFullExam = !result.section || result.section === 'all';
  return saveSubjectResultBase('moral-science', studentId, result, lesson.id, {
    policy: 'practice-or-exam-correct',
    isFullExam,
    resultValidator: res => isValidMoralScienceResult(res, res.mode, lesson),
    customLoader: () => loadMoralScienceProgress(studentId)
  });
}

export const updateMoralScienceReviewQuestionIds = (
  currentReviewIds: readonly string[],
  answers: readonly MoralScienceAnswer[],
  mode: MoralScienceRevisionMode,
  isFullExam = true
) => updateSubjectReviewQuestionIds(currentReviewIds, answers, mode, 'practice-or-exam-correct', isFullExam);
