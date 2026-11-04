import { StudentId } from '../types';
import { checkMathsAnswer, getMathsLesson, MATHS_TOPICS, MathsLesson } from '../data/maths';
import { emitStorageError } from './appStorage';
import { persistProgressSnapshot, getDefaultLearningRepository } from '../learning/persistence';
import { shouldClearMissedQuestion, SUBJECT_REVIEW_POLICIES } from '../learning/domain';
import { CONTENT_VERSIONS } from '../data/contentVersions';
import { createQuizAttempts } from '../learning/attemptRecords';
import { saveLearningAttempts } from '../learning/persistence';
import type { AssistanceKind } from '../learning/contracts';

export type MathsQuizMode = 'practice' | 'exam';

export interface MathsAnswer {
  questionId: string;
  answer: string;
  correct: boolean;
  assistance?: AssistanceKind[];
  attemptId?: string;
  attemptedAt?: string;
}

export interface MathsResult {
  mode: MathsQuizMode;
  completedAt: string;
  topic?: string;
  answers: MathsAnswer[];
}

export interface MathsProgress {
  studentId: StudentId;
  lessonId: string;
  practice: MathsResult | null;
  exam: MathsResult | null;
  reviewQuestionIds: string[];
}

export const getMathsStorageKey = (studentId: StudentId): string => `academy_maths_${studentId}_v1`;

function emptyProgress(studentId: StudentId): MathsProgress {
  return {
    studentId,
    lessonId: getMathsLesson(studentId).id,
    practice: null,
    exam: null,
    reviewQuestionIds: []
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidAnswer(value: unknown, lesson: MathsLesson): value is MathsAnswer {
  if (!isPlainObject(value)) return false;
  const questionId = value.questionId;
  const answer = value.answer;
  const correct = value.correct;
  if (typeof questionId !== 'string' || typeof answer !== 'string' || typeof correct !== 'boolean') return false;
  if (value.assistance !== undefined && (!Array.isArray(value.assistance) || !value.assistance.every(item =>
    ['answer-revealed', 'tile-helper', 'hint', 'read-aloud', 'other'].includes(String(item))))) return false;
  if (value.attemptId !== undefined && (typeof value.attemptId !== 'string' || !value.attemptId) ||
      value.attemptedAt !== undefined && (typeof value.attemptedAt !== 'string' || !Number.isFinite(Date.parse(value.attemptedAt)))) return false;
  const question = lesson.questions.find(q => q.id === questionId);
  if (!question) return false;
  return correct === checkMathsAnswer(question, answer);
}

function isValidResult(value: unknown, mode: MathsQuizMode, lesson: MathsLesson): value is MathsResult {
  if (!isPlainObject(value)) return false;
  if (value.mode !== mode) return false;
  if (typeof value.completedAt !== 'string' || Number.isNaN(Date.parse(value.completedAt))) return false;
  if (value.topic !== undefined && typeof value.topic !== 'string') return false;
  if (!Array.isArray(value.answers) || value.answers.length === 0) return false;

  const validAnswers = value.answers.filter(entry => isValidAnswer(entry, lesson));
  if (validAnswers.length !== value.answers.length) return false;

  const answeredIds = new Set(validAnswers.map(a => (a as MathsAnswer).questionId));
  if (answeredIds.size !== validAnswers.length) return false;

  const topic = typeof value.topic === 'string' ? value.topic : undefined;

  if (mode === 'exam') {
    // Determine the expected question set based on the declared topic
    let expectedQuestionIds: Set<string>;
    if (!topic || topic === 'all') {
      // Full-curriculum exam: must contain every question
      expectedQuestionIds = new Set(lesson.questions.map(q => q.id));
    } else {
      // Topic-specific exam: topic must be a known topic
      if (!MATHS_TOPICS.some(t => t.id === topic)) return false;
      // Must contain exactly the questions belonging to that topic
      expectedQuestionIds = new Set(
        lesson.questions.filter(q => q.topic === topic).map(q => q.id)
      );
      if (expectedQuestionIds.size === 0) return false;
    }
    // Answers must match the expected set exactly
    if (answeredIds.size !== expectedQuestionIds.size) return false;
    for (const id of answeredIds) {
      if (!expectedQuestionIds.has(id)) return false;
    }
  } else {
    // Practice: any valid subset of lesson questions is fine, but reject unknown topics
    if (topic && topic !== 'all' && !MATHS_TOPICS.some(t => t.id === topic)) return false;
    // All answered questions must belong to the declared topic (if one is set)
    if (topic && topic !== 'all') {
      const topicQuestionIds = new Set(
        lesson.questions.filter(q => q.topic === topic).map(q => q.id)
      );
      for (const id of answeredIds) {
        if (!topicQuestionIds.has(id)) return false;
      }
    }
    if (validAnswers.length > lesson.questions.length) return false;
  }

  return true;
}

export function isValidMathsProgress(value: unknown, studentId: StudentId): value is MathsProgress {
  if (!isPlainObject(value)) return false;
  if (value.studentId !== studentId) return false;
  const lesson = getMathsLesson(studentId);
  if (value.lessonId !== lesson.id) return false;
  if (value.practice !== null && !isValidResult(value.practice, 'practice', lesson)) return false;
  if (value.exam !== null && !isValidResult(value.exam, 'exam', lesson)) return false;
  if (!Array.isArray(value.reviewQuestionIds) || !value.reviewQuestionIds.every(id => typeof id === 'string' && lesson.questions.some(q => q.id === id))) {
    return false;
  }
  return true;
}

export function loadMathsProgress(studentId: StudentId): MathsProgress {
  try {
    const raw = localStorage.getItem(getMathsStorageKey(studentId));
    if (!raw) return emptyProgress(studentId);
    const parsed = JSON.parse(raw);
    if (!isValidMathsProgress(parsed, studentId)) {
      emitStorageError(`Maths progress for ${studentId} was malformed. Other progress is unchanged.`);
      return emptyProgress(studentId);
    }
    return parsed;
  } catch {
    emitStorageError(`Unable to read maths progress for ${studentId}. Other progress is unchanged.`);
    return emptyProgress(studentId);
  }
}

export function saveMathsResult(studentId: StudentId, result: MathsResult): MathsProgress | null {
  const lesson = getMathsLesson(studentId);
  if (!isValidResult(result, result.mode, lesson)) {
    emitStorageError('Unable to save an invalid or incomplete maths result.');
    return null;
  }

  const previous = loadMathsProgress(studentId);
  const newlyIncorrectIds = result.answers.filter(a => !a.correct).map(a => a.questionId);

  const isFullExam = result.mode === 'exam' && result.answers.length === lesson.questions.length;
  const newlyCorrectIds = new Set(result.answers
    .filter(answer => shouldClearMissedQuestion(
      SUBJECT_REVIEW_POLICIES.maths,
      result.mode,
      isFullExam,
      answer.correct ? 'correct' : 'incorrect',
      (answer.assistance?.length ?? 0) > 0
    ))
    .map(answer => answer.questionId));
  const reviewQuestionIds = Array.from(
    new Set([
      ...previous.reviewQuestionIds.filter(id => !newlyCorrectIds.has(id)),
      ...newlyIncorrectIds
    ])
  );

  const next: MathsProgress = {
    studentId,
    lessonId: lesson.id,
    practice: result.mode === 'practice' ? result : previous.practice,
    exam: result.mode === 'exam' ? result : previous.exam,
    reviewQuestionIds
  };

  try {
    const serialized = JSON.stringify(next);
    localStorage.setItem(getMathsStorageKey(studentId), serialized);
    if (typeof indexedDB !== 'undefined') {
      const repository = getDefaultLearningRepository();
      void persistProgressSnapshot(repository, studentId, 'maths', serialized, CONTENT_VERSIONS.maths).catch(() => undefined);
      void saveLearningAttempts(repository, createQuizAttempts({
        learnerId: studentId, subjectId: 'maths', lessonId: lesson.id, mode: result.mode,
        completedAt: result.completedAt, provenance: lesson.sourceName,
        answers: result.answers.map(answer => {
          const question = lesson.questions.find(item => item.id === answer.questionId)!;
          return { ...answer, prompt: question.prompt, referenceAnswer: question.answer, explanation: question.explanation };
        })
      })).catch(() => undefined);
    }
    return next;
  } catch {
    emitStorageError('Storage save failed: unable to save this maths result. Keep this page open and retry.');
    return null;
  }
}
