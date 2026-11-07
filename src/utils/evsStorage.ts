import { StudentId } from '../types';
import { getEvsLessonForGrade, EVS_SECTIONS } from '../data/evs';
import { getStudentProfile } from '../data/profiles';
import {
  SubjectAnswer, SubjectResult, SubjectProgress, SubjectQuizMode,
  getSubjectStorageKey, loadSubjectProgressBase, saveSubjectResultBase,
  updateSubjectReviewQuestionIds, isValidSubjectAnswer, isPlainRecord
} from './subjectStorage';

export type EvsQuizMode = SubjectQuizMode;
export type EvsAnswer = SubjectAnswer;
export type EvsResult = SubjectResult;
export type EvsProgress = SubjectProgress;

export const getEvsStorageKey = (studentId: StudentId): string =>
  getSubjectStorageKey('evs', studentId);

function getLesson(studentId: StudentId) {
  const profile = getStudentProfile(studentId);
  return getEvsLessonForGrade(profile.grade);
}

export function isValidEvsProgress(value: unknown, studentId: StudentId): value is EvsProgress {
  if (!isPlainRecord(value) || value.studentId !== studentId) return false;
  const lesson = getLesson(studentId);
  if (!lesson || value.lessonId !== lesson.id) return false;
  if (value.practice !== null && !isValidEvsResult(value.practice, 'practice', lesson)) return false;
  if (value.exam !== null && !isValidEvsResult(value.exam, 'exam', lesson)) return false;
  if (!Array.isArray(value.reviewQuestionIds) || !value.reviewQuestionIds.every(id => typeof id === 'string')) return false;
  return true;
}

function isValidEvsResult(value: unknown, mode: EvsQuizMode, lesson: ReturnType<typeof getLesson>): value is EvsResult {
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
      if (!EVS_SECTIONS.some(s => s.id === section)) return false;
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

export function loadEvsProgress(studentId: StudentId): EvsProgress {
  const lesson = getLesson(studentId);
  return loadSubjectProgressBase('evs', studentId, lesson ? lesson.id : 'evs-grade-2-lessons-1-5', parsed =>
    isValidEvsProgress(parsed, studentId)
  );
}

export function saveEvsResult(studentId: StudentId, result: EvsResult, _options?: { mirrorAttempts?: boolean }): EvsProgress | null {
  const lesson = getLesson(studentId);
  if (!lesson) return null;
  const isFullExam = !result.section || result.section === 'all';
  return saveSubjectResultBase('evs', studentId, result, lesson.id, {
    policy: 'practice-or-exam-correct',
    isFullExam,
    resultValidator: res => isValidEvsResult(res, res.mode, lesson),
    customLoader: () => loadEvsProgress(studentId)
  });
}

export const updateEvsReviewQuestionIds = (
  currentReviewIds: readonly string[],
  answers: readonly EvsAnswer[],
  mode: EvsQuizMode,
  isFullExam = true
) => updateSubjectReviewQuestionIds(currentReviewIds, answers, mode, 'practice-or-exam-correct', isFullExam);
