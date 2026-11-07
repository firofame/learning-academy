import { StudentId } from '../types';
import { getChemistryLessonForGrade, CHEMISTRY_SECTIONS } from '../data/chemistry';
import { getStudentProfile } from '../data/profiles';
import {
  SubjectAnswer, SubjectResult, SubjectProgress, SubjectQuizMode,
  getSubjectStorageKey, loadSubjectProgressBase, saveSubjectResultBase,
  updateSubjectReviewQuestionIds, isValidSubjectAnswer, isPlainRecord
} from './subjectStorage';

export type ChemistryQuizMode = SubjectQuizMode;
export type ChemistryAnswer = SubjectAnswer;
export type ChemistryResult = SubjectResult;
export type ChemistryProgress = SubjectProgress;

export const getChemistryStorageKey = (studentId: StudentId): string =>
  getSubjectStorageKey('chemistry', studentId);

function getLesson(studentId: StudentId) {
  const profile = getStudentProfile(studentId);
  return getChemistryLessonForGrade(profile.grade);
}

export function isValidChemistryProgress(value: unknown, studentId: StudentId): value is ChemistryProgress {
  if (!isPlainRecord(value) || value.studentId !== studentId) return false;
  const lesson = getLesson(studentId);
  if (!lesson || value.lessonId !== lesson.id) return false;
  if (value.practice !== null && !isValidChemistryResult(value.practice, 'practice', lesson)) return false;
  if (value.exam !== null && !isValidChemistryResult(value.exam, 'exam', lesson)) return false;
  if (!Array.isArray(value.reviewQuestionIds) || !value.reviewQuestionIds.every(id => typeof id === 'string')) return false;
  return true;
}

function isValidChemistryResult(value: unknown, mode: ChemistryQuizMode, lesson: ReturnType<typeof getLesson>): value is ChemistryResult {
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
      if (!CHEMISTRY_SECTIONS.some(s => s.id === section)) return false;
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

export function loadChemistryProgress(studentId: StudentId): ChemistryProgress {
  const lesson = getLesson(studentId);
  return loadSubjectProgressBase('chemistry', studentId, lesson ? lesson.id : 'chemistry-grade-6-chapters-1-3', parsed =>
    isValidChemistryProgress(parsed, studentId)
  );
}

export function saveChemistryResult(studentId: StudentId, result: ChemistryResult, _options?: { mirrorAttempts?: boolean }): ChemistryProgress | null {
  const lesson = getLesson(studentId);
  if (!lesson) return null;
  const isFullExam = !result.section || result.section === 'all';
  return saveSubjectResultBase('chemistry', studentId, result, lesson.id, {
    policy: 'practice-or-exam-correct',
    isFullExam,
    resultValidator: res => isValidChemistryResult(res, res.mode, lesson),
    customLoader: () => loadChemistryProgress(studentId)
  });
}

export const updateChemistryReviewQuestionIds = (
  currentReviewIds: readonly string[],
  answers: readonly ChemistryAnswer[],
  mode: ChemistryQuizMode,
  isFullExam = true
) => updateSubjectReviewQuestionIds(currentReviewIds, answers, mode, 'practice-or-exam-correct', isFullExam);
