import type { AttemptOutcome, LearningAttempt, ReviewClearingPolicy } from './contracts';

export type ReadinessLevel = 'learning' | 'practising' | 'remembered';

export interface ReadinessEvidence {
  qualifyingAttempts: number;
  distinctLocalDates: readonly string[];
  level: ReadinessLevel;
}

export function readinessFromRecallEvidence(
  consecutiveUnaidedCorrect: number,
  distinctLocalDates: readonly string[]
): ReadinessLevel {
  if (consecutiveUnaidedCorrect >= 2 && new Set(distinctLocalDates).size >= 2) return 'remembered';
  return consecutiveUnaidedCorrect > 0 ? 'practising' : 'learning';
}

export interface ReviewAttempt {
  timestamp: string;
  learnerLocalDate: string;
  outcome: AttemptOutcome;
  assisted: boolean;
}

/** Local calendar date, intentionally independent of UTC date boundaries. */
export function localCalendarDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isIndependentCorrectRecall(attempt: LearningAttempt): boolean {
  return attempt.outcome === 'correct' && attempt.assistance.length === 0 &&
    (attempt.sessionMode === 'exam' || attempt.sessionMode === 'paper' || attempt.sessionMode === 'practice');
}

export function countsAsIncorrect(outcome: AttemptOutcome): boolean {
  return outcome === 'incorrect' || outcome === 'skipped';
}
export interface ExamReadinessEvidence {
  checked: boolean;
  initialOutcome?: AttemptOutcome;
  initialAssisted?: boolean;
  pendingRecheck?: boolean;
  successfulRecheck?: boolean;
}

/**
 * Exam-Ready for Tomorrow:
 * A question or portion is Exam-Ready once answered correctly unaided
 * OR successfully rechecked after a 2+ question lag in the revision session.
 * Multi-day requirements contradict exam-eve study and do not apply.
 */
export function isQuestionExamReady(question: ExamReadinessEvidence): boolean {
  if (!question.checked) return false;
  if (question.pendingRecheck) return false;
  if (question.initialOutcome === 'correct' && !question.initialAssisted) return true;
  return Boolean(question.successfulRecheck);
}

export function isPortionExamReady(questions: readonly ExamReadinessEvidence[]): boolean {
  return questions.length > 0 && questions.every(isQuestionExamReady);
}

/** Legacy Test-Ready rule maintained for historical record evaluation. For exam-eve revision, use isQuestionExamReady. */
export function deriveReadiness(attempts: readonly LearningAttempt[]): ReadinessEvidence {
  const eligible = [...attempts]
    .filter(attempt => attempt.assistance.length === 0 &&
      (attempt.sessionMode === 'exam' || attempt.sessionMode === 'paper'))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const lastFailure = eligible.reduce((last, attempt, index) =>
    countsAsIncorrect(attempt.outcome) ? index : last, -1);
  const qualifying = eligible.slice(lastFailure + 1).filter(isIndependentCorrectRecall);
  const dates = [...new Set(qualifying.map(attempt => attempt.learnerLocalDate))].sort();
  const level = readinessFromRecallEvidence(qualifying.length, dates);
  return { qualifyingAttempts: qualifying.length, distinctLocalDates: dates, level };
}

/**
 * Named review-clearing policies preserve the intentional differences already
 * present in subject storage: Robotics needs a correct full exam; Maths clears
 * on a correct practice or exam answer; the language revision subjects clear
 * after correct practice.
 */
export const SUBJECT_REVIEW_POLICIES = {
  robotics: 'full-exam-correct-only',
  maths: 'practice-or-exam-correct',
  malayalam: 'practice-correct-and-full-exam-refresh',
  hindi: 'practice-correct-and-full-exam-refresh'
} as const satisfies Record<string, ReviewClearingPolicy>;

export function shouldClearMissedQuestion(
  policy: ReviewClearingPolicy,
  mode: 'practice' | 'exam',
  isFullExam: boolean,
  outcome: AttemptOutcome,
  assisted: boolean
): boolean {
  if (outcome !== 'correct' || assisted) return false;
  switch (policy) {
    case 'practice-or-exam-correct':
      return true;
    case 'practice-correct-only':
      return mode === 'practice';
    case 'practice-correct-and-full-exam-refresh':
      return mode === 'practice' || (mode === 'exam' && isFullExam);
    case 'full-exam-correct-only':
      return mode === 'exam' && isFullExam;
  }
}

const RETENTION_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;

/** Return the next independent retrieval date without letting assisted work move it. */
export function nextIndependentReviewDate(
  attempts: readonly ReviewAttempt[],
  today: Date,
  successfulRecallsBeforeToday: number
): string | null {
  if (attempts.some(attempt => countsAsIncorrect(attempt.outcome))) return localCalendarDate(today);
  const independent = [...attempts]
    .filter(attempt => !attempt.assisted && attempt.outcome !== 'ungraded')
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const latest = independent.at(-1);
  if (!latest) return null;
  if (countsAsIncorrect(latest.outcome)) return localCalendarDate(today);

  const interval = RETENTION_INTERVAL_DAYS[Math.min(successfulRecallsBeforeToday, RETENTION_INTERVAL_DAYS.length - 1)];
  const due = new Date(`${latest.learnerLocalDate}T12:00:00`);
  due.setDate(due.getDate() + interval);
  return localCalendarDate(due);
}

export function isReviewDue(dueDate: string | null, today: Date): boolean {
  return dueDate !== null && dueDate <= localCalendarDate(today);
}

export function isRetentionCheckDue(lastIndependentRecallAt: string | null, now: Date, intervalDays: number): boolean {
  if (!lastIndependentRecallAt || !Number.isFinite(Date.parse(lastIndependentRecallAt))) return true;
  return now.getTime() - Date.parse(lastIndependentRecallAt) >= intervalDays * 24 * 60 * 60 * 1000;
}
