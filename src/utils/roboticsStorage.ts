import { StudentId } from '../types';
import { getRoboticsLesson, checkRoboticsAnswer, RoboticsLesson } from '../data/robotics';
import { emitStorageError } from './appStorage';
import { isWrittenGrade } from './writtenGrading';
import {
  SubjectAnswer, SubjectResult, SubjectProgress, SubjectRevisionMode,
  getSubjectStorageKey, loadSubjectProgressBase, saveSubjectResultBase,
  updateSubjectReviewQuestionIds, isPlainRecord
} from './subjectStorage';

export type RoboticsRevisionMode = SubjectRevisionMode;
export type RoboticsQuizMode = RoboticsRevisionMode;
export type RoboticsAnswer = SubjectAnswer;
export type RoboticsResult = SubjectResult;
export type RoboticsProgress = SubjectProgress;

export const getRoboticsStorageKey = (studentId: StudentId): string =>
  getSubjectStorageKey('robotics', studentId);

function isValidRoboticsAnswer(value: unknown, lesson: RoboticsLesson): value is RoboticsAnswer {
  if (!isPlainRecord(value) || typeof value.questionId !== 'string' ||
      typeof value.answer !== 'string' || typeof value.correct !== 'boolean') return false;
  if (value.skipped !== undefined && typeof value.skipped !== 'boolean') return false;
  if (value.aiChecked !== undefined && typeof value.aiChecked !== 'boolean') return false;
  if (value.parentChecked !== undefined && typeof value.parentChecked !== 'boolean') return false;

  const aiChecked = value.aiChecked === true;
  if (aiChecked && !isWrittenGrade({ correct: value.correct, feedback: typeof value.aiFeedback === 'string' ? value.aiFeedback : undefined })) return false;
  if (!aiChecked && value.aiFeedback !== undefined) return false;

  const question = lesson.questions.find(q => q.id === value.questionId);
  if (!question) return false;

  if (question.kind === 'short') {
    const parentChecked = value.parentChecked === true;
    const hasSingleCheck = parentChecked !== aiChecked;
    if (value.answer.trim() ? !hasSingleCheck : value.correct || parentChecked || aiChecked) return false;
  } else {
    if (value.parentChecked || aiChecked || value.correct !== checkRoboticsAnswer(question, value.answer)) {
      return false;
    }
  }
  return true;
}

function isValidRoboticsResult(value: unknown, mode: RoboticsRevisionMode, lesson: RoboticsLesson): value is RoboticsResult {
  if (!isPlainRecord(value) || value.mode !== mode ||
      typeof value.completedAt !== 'string' || !Number.isFinite(Date.parse(value.completedAt)) ||
      !Array.isArray(value.answers) || value.answers.length === 0) return false;
  if (!value.answers.every(a => isValidRoboticsAnswer(a, lesson))) return false;

  const answeredIds = new Set(value.answers.map((a: SubjectAnswer) => a.questionId));
  if (answeredIds.size !== value.answers.length) return false;

  if (mode === 'exam') {
    const expected = new Set(lesson.questions.map(q => q.id));
    if (value.answers.length !== expected.size || !value.answers.every((a: SubjectAnswer) => expected.has(a.questionId))) {
      return false;
    }
  }
  return true;
}

export function isValidRoboticsProgress(value: unknown, studentId: StudentId): value is RoboticsProgress {
  if (!isPlainRecord(value) || value.studentId !== studentId) return false;
  const lesson = getRoboticsLesson(studentId);
  if (value.lessonId !== lesson.id) return false;
  if (value.practice !== null && !isValidRoboticsResult(value.practice, 'practice', lesson)) return false;
  if (value.exam !== null && !isValidRoboticsResult(value.exam, 'exam', lesson)) return false;
  if (!Array.isArray(value.reviewQuestionIds) || !value.reviewQuestionIds.every(id => typeof id === 'string' && lesson.questions.some(q => q.id === id))) {
    return false;
  }
  return true;
}

export function loadRoboticsProgress(studentId: StudentId): RoboticsProgress {
  const lesson = getRoboticsLesson(studentId);
  return loadSubjectProgressBase('robotics', studentId, lesson.id, parsed =>
    isValidRoboticsProgress(parsed, studentId)
  );
}

export function saveRoboticsResult(studentId: StudentId, result: RoboticsResult, _options?: { mirrorAttempts?: boolean }): RoboticsProgress | null {
  const lesson = getRoboticsLesson(studentId);
  if (!isValidRoboticsResult(result, result.mode, lesson)) {
    emitStorageError('Unable to save an invalid or incomplete robotics result.');
    return null;
  }

  const isFullExam = result.mode === 'exam' && result.answers.length === lesson.questions.length;
  return saveSubjectResultBase('robotics', studentId, result, lesson.id, {
    policy: 'full-exam-correct-only',
    isFullExam,
    resultValidator: res => isValidRoboticsResult(res, res.mode, lesson),
    customLoader: () => loadRoboticsProgress(studentId)
  });
}

export const updateRoboticsReviewQuestionIds = (
  currentReviewIds: readonly string[],
  answers: readonly RoboticsAnswer[],
  mode: RoboticsRevisionMode,
  isFullExam = true
) => updateSubjectReviewQuestionIds(currentReviewIds, answers, mode, 'full-exam-correct-only', isFullExam);
