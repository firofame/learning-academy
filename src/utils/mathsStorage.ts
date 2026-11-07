import { StudentId } from '../types';
import { getMathsLesson, MathsLesson, MATHS_TOPICS, checkMathsAnswer } from '../data/maths';
import { emitStorageError } from './appStorage';
import {
  SubjectAnswer, SubjectResult, SubjectProgress, SubjectQuizMode,
  getSubjectStorageKey, loadSubjectProgressBase, saveSubjectResultBase,
  updateSubjectReviewQuestionIds, isPlainRecord
} from './subjectStorage';

export type MathsQuizMode = SubjectQuizMode;
export type MathsAnswer = SubjectAnswer;
export interface MathsResult extends SubjectResult {
  topic?: string;
}
export type MathsProgress = SubjectProgress;

export const getMathsStorageKey = (studentId: StudentId): string =>
  getSubjectStorageKey('maths', studentId);

function isValidMathsAnswer(value: unknown, lesson: MathsLesson): value is MathsAnswer {
  if (!isPlainRecord(value) || typeof value.questionId !== 'string' ||
      typeof value.answer !== 'string' || typeof value.correct !== 'boolean') return false;
  if (value.skipped !== undefined && typeof value.skipped !== 'boolean') return false;
  const question = lesson.questions.find(q => q.id === value.questionId);
  if (!question) return false;
  if (value.skipped === true) return value.answer.trim() === '' && !value.correct;
  if (!value.answer.trim()) return false;
  return value.correct === checkMathsAnswer(question, value.answer);
}

function isValidMathsResult(value: unknown, mode: MathsQuizMode, lesson: MathsLesson): value is MathsResult {
  if (!isPlainRecord(value) || value.mode !== mode ||
      typeof value.completedAt !== 'string' || !Number.isFinite(Date.parse(value.completedAt)) ||
      !Array.isArray(value.answers) || value.answers.length === 0) return false;
  if (!value.answers.every(a => isValidMathsAnswer(a, lesson))) return false;

  const topic = typeof value.topic === 'string' ? value.topic : undefined;
  const answeredIds = new Set(value.answers.map((a: SubjectAnswer) => a.questionId));
  if (answeredIds.size !== value.answers.length) return false;

  if (mode === 'exam') {
    let expectedQuestionIds: Set<string>;
    if (!topic || topic === 'all') {
      expectedQuestionIds = new Set(lesson.questions.map(q => q.id));
    } else {
      if (!MATHS_TOPICS.some(t => t.id === topic)) return false;
      expectedQuestionIds = new Set(lesson.questions.filter(q => q.topic === topic).map(q => q.id));
      if (expectedQuestionIds.size === 0) return false;
    }
    if (answeredIds.size !== expectedQuestionIds.size) return false;
    for (const id of answeredIds) {
      if (!expectedQuestionIds.has(id)) return false;
    }
  } else {
    if (topic && topic !== 'all' && !MATHS_TOPICS.some(t => t.id === topic)) return false;
    if (topic && topic !== 'all') {
      const topicQuestionIds = new Set(lesson.questions.filter(q => q.topic === topic).map(q => q.id));
      for (const id of answeredIds) {
        if (!topicQuestionIds.has(id)) return false;
      }
    }
  }
  return true;
}

export function isValidMathsProgress(value: unknown, studentId: StudentId): value is MathsProgress {
  if (!isPlainRecord(value) || value.studentId !== studentId) return false;
  const lesson = getMathsLesson(studentId);
  if (value.lessonId !== lesson.id) return false;
  if (value.practice !== null && !isValidMathsResult(value.practice, 'practice', lesson)) return false;
  if (value.exam !== null && !isValidMathsResult(value.exam, 'exam', lesson)) return false;
  if (!Array.isArray(value.reviewQuestionIds) || !value.reviewQuestionIds.every(id => typeof id === 'string' && lesson.questions.some(q => q.id === id))) {
    return false;
  }
  return true;
}

export function loadMathsProgress(studentId: StudentId): MathsProgress {
  const lesson = getMathsLesson(studentId);
  return loadSubjectProgressBase('maths', studentId, lesson.id, parsed =>
    isValidMathsProgress(parsed, studentId)
  );
}

export function saveMathsResult(studentId: StudentId, result: MathsResult, _options?: { mirrorAttempts?: boolean }): MathsProgress | null {
  const lesson = getMathsLesson(studentId);
  if (!isValidMathsResult(result, result.mode, lesson)) {
    emitStorageError('Unable to save an invalid or incomplete maths result.');
    return null;
  }

  const isFullExam = result.mode === 'exam' && (!result.topic || result.topic === 'all');
  return saveSubjectResultBase('maths', studentId, result, lesson.id, {
    policy: 'practice-or-exam-correct',
    isFullExam,
    resultValidator: res => isValidMathsResult(res, res.mode, lesson),
    customLoader: () => loadMathsProgress(studentId)
  });
}

export const updateMathsReviewQuestionIds = (
  currentReviewIds: readonly string[],
  answers: readonly MathsAnswer[],
  mode: MathsQuizMode,
  isFullExam = true
) => updateSubjectReviewQuestionIds(currentReviewIds, answers, mode, 'practice-or-exam-correct', isFullExam);
