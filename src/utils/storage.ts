import { WordProgress, MasteryLevel, SubjectCategory, WordEntry, StudentId, StudyMode } from '../types';
import { getWordsForStudent } from '../data/wordList';
import { isRetentionCheckDue, localCalendarDate, readinessFromRecallEvidence } from '../learning/domain';
import { getDefaultLearningRepository, saveLearningAttempt } from '../learning/persistence';
import { createSpellingAttempt } from '../learning/attemptRecords';
import { getStudentProfile } from '../data/profiles';
import { emitStorageError } from './appStorage';
export {
  ACTIVE_PROFILE_KEY, DEFAULT_SETTINGS, SETTINGS_KEY, emitStorageError,
  loadActiveStudent, loadSettings, saveActiveStudent, saveSettings, subscribeStorageError
} from './appStorage';
export type { AppSettings } from './appStorage';

/**
 * Returns YYYY-MM-DD formatted date string in the learner's local calendar.
 */
export function getLocalDateString(date: Date = new Date()): string {
  return localCalendarDate(date);
}

export function getStudentStorageKey(studentId: StudentId): string {
  return `spellbee_progress_${studentId}_v1`;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isLocalDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    isTimestamp(value) && new Date(value).toISOString().slice(0, 10) === value;
}

function isCounter(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isValidWordProgress(val: unknown): val is WordProgress {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.wordId === 'string' &&
    (obj.studentId === 'fazia' || obj.studentId === 'shiza') &&
    isCounter(obj.attempts) &&
    isCounter(obj.unaidedCorrectCount) &&
    isCounter(obj.consecutiveUnaidedCorrect) &&
    Array.isArray(obj.unaidedCorrectDates) &&
    obj.unaidedCorrectDates.every(isLocalDate) &&
    (obj.lastAttemptDate === null || isTimestamp(obj.lastAttemptDate)) &&
    (obj.lastUnaidedCorrectDate === undefined || obj.lastUnaidedCorrectDate === null || isTimestamp(obj.lastUnaidedCorrectDate)) &&
    (obj.lastMistake === undefined || typeof obj.lastMistake === 'string') &&
    typeof obj.needsRevisit === 'boolean' &&
    Array.isArray(obj.history) &&
    obj.history.every(entry => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
      return isTimestamp(entry.date) &&
        (entry.attemptId === undefined || typeof entry.attemptId === 'string') &&
        ['learn', 'practice', 'test', 'paper'].includes(entry.mode) &&
        typeof entry.wasCorrect === 'boolean' &&
        (entry.mistakeInput === undefined || typeof entry.mistakeInput === 'string');
    }) &&
    (obj.level === 'learning' || obj.level === 'practising' || obj.level === 'remembered')
  );
}

export function isValidSpellingProgress(value: unknown, studentId: StudentId): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([wordId, progress]) =>
    isValidWordProgress(progress) && progress.wordId === wordId && progress.studentId === studentId
  );
}

export function getAllProgress(studentId: StudentId): Record<string, WordProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getStudentStorageKey(studentId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      emitStorageError(`Student progress data for ${studentId} was malformed.`);
      return {};
    }

    const sanitized: Record<string, WordProgress> = {};
    let invalidCount = 0;
    for (const [key, val] of Object.entries(parsed)) {
      if (isValidWordProgress(val) && val.wordId === key && val.studentId === studentId) {
        sanitized[key] = val;
      } else {
        invalidCount++;
      }
    }
    if (invalidCount > 0) {
      emitStorageError(`Skipped ${invalidCount} malformed progress record(s) for ${studentId}. Valid progress was preserved.`);
    }
    return sanitized;
  } catch {
    emitStorageError(`Failed to load progress for ${studentId} from browser storage.`);
    return {};
  }
}

export function getWordProgress(wordId: string, studentId: StudentId): WordProgress {
  const all = getAllProgress(studentId);
  if (all[wordId]) {
    return all[wordId];
  }

  return {
    wordId,
    studentId,
    attempts: 0,
    unaidedCorrectCount: 0,
    consecutiveUnaidedCorrect: 0,
    unaidedCorrectDates: [],
    lastAttemptDate: null,
    lastUnaidedCorrectDate: null,
    level: 'learning',
    needsRevisit: false,
    history: []
  };
}

/**
 * Shared definition of whether a word is currently due for review.
 * - Words never attempted (attempts === 0) are new, not "due for review".
 * - Missed words (needsRevisit === true) are highest urgency.
 * - Learning words (mistakes or assisted only) are due.
 * - Practising words waiting for distinct calendar day verification are due if not passed unaided today.
 * - Remembered words are due 3+ days after the last qualifying unaided recall.
 */
function getLastUnaidedCorrectDate(prog: WordProgress): string | null {
  if (prog.lastUnaidedCorrectDate) return prog.lastUnaidedCorrectDate;
  const qualifyingDates = prog.history
    .filter(attempt => attempt.wasCorrect && (attempt.mode === 'test' || attempt.mode === 'paper'))
    .map(attempt => attempt.date);
  if (qualifyingDates.length > 0) {
    return qualifyingDates.reduce((latest, date) => Date.parse(date) > Date.parse(latest) ? date : latest);
  }
  // Legacy histories are capped; calendar-day evidence is a conservative fallback.
  const latestDay = [...prog.unaidedCorrectDates].sort().at(-1);
  return latestDay ? new Date(`${latestDay}T00:00:00`).toISOString() : null;
}

export function isWordDueForReview(prog?: WordProgress): boolean {
  if (!prog || prog.attempts === 0) return false;
  if (prog.needsRevisit) return true;
  if (prog.level === 'learning') return true;

  const today = getLocalDateString();
  if (prog.level === 'practising') {
    // If it has not been tested unaided today, it is due for distinct-day verification
    const passedUnaidedToday = prog.unaidedCorrectDates.includes(today);
    return !passedUnaidedToday;
  }

  if (prog.level === 'remembered') {
    const lastRecall = getLastUnaidedCorrectDate(prog);
    return isRetentionCheckDue(lastRecall, new Date(), 3);
  }

  return false;
}

export interface ExtendedWordProgress extends WordProgress {
  saveFailed?: boolean;
}

/**
 * Record an attempt and calculate test-readiness mastery:
 * - 'learning': word made mistakes, was assisted with tiles/hints, or never attempted unaided.
 * - 'practising': spelled correctly independently at least once.
 * - 'remembered': spelled correctly independently across AT LEAST TWO separate distinct calendar days without hints.
 */
export function recordAttempt(
  wordId: string,
  studentId: StudentId,
  wasCorrect: boolean,
  mode: 'learn' | 'practice' | 'test' | 'paper',
  mistakeInput?: string,
  options: { attemptId?: string; mirrorAttempts?: boolean } = {}
): ExtendedWordProgress {
  const all = getAllProgress(studentId);
  const current = getWordProgress(wordId, studentId);
  if (options.attemptId && current.history.some(entry => entry.attemptId === options.attemptId)) return current;

  const updatedAttempts = current.attempts + 1;
  const isUnaided = (mode === 'test' || mode === 'paper');
  const todayDateStr = getLocalDateString(); // Learner's local calendar
  const now = new Date().toISOString();

  let unaidedCount = current.unaidedCorrectCount;
  let consecutiveUnaided = current.consecutiveUnaidedCorrect;
  const distinctDates = new Set(current.unaidedCorrectDates || []);

  if (isUnaided && wasCorrect) {
    unaidedCount += 1;
    consecutiveUnaided += 1;
    distinctDates.add(todayDateStr);
  } else if (isUnaided && !wasCorrect) {
    consecutiveUnaided = 0;
    distinctDates.clear();
  }

  const updatedDates = Array.from(distinctDates);

  // Evidence-based test-readiness mastery:
  // Requires at least 2 unaided recalls across at least 2 distinct days with consecutive streak >= 2
  const newLevel: MasteryLevel = readinessFromRecallEvidence(consecutiveUnaided, updatedDates);

  // Assisted success MUST NOT erase the need for an outstanding unaided verification.
  // Only qualifying unaided success clears needsRevisit.
  let newNeedsRevisit = current.needsRevisit;
  if (isUnaided) {
    newNeedsRevisit = !wasCorrect;
  } else if (!wasCorrect) {
    newNeedsRevisit = true;
  }

  const updatedProgress: ExtendedWordProgress = {
    wordId,
    studentId,
    attempts: updatedAttempts,
    unaidedCorrectCount: unaidedCount,
    consecutiveUnaidedCorrect: consecutiveUnaided,
    unaidedCorrectDates: updatedDates,
    lastAttemptDate: now,
    lastUnaidedCorrectDate: isUnaided && wasCorrect ? now : getLastUnaidedCorrectDate(current),
    level: newLevel,
    lastMistake: wasCorrect ? undefined : mistakeInput,
    needsRevisit: newNeedsRevisit,
    history: [
      ...current.history.slice(-14),
      {
        ...(options.attemptId ? { attemptId: options.attemptId } : {}),
        date: now,
        mode,
        wasCorrect,
        mistakeInput
      }
    ]
  };

  all[wordId] = updatedProgress;
  let saveFailed = false;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(getStudentStorageKey(studentId), JSON.stringify(all));
      if (typeof indexedDB !== 'undefined') {
        const repository = getDefaultLearningRepository();
        if (options.mirrorAttempts !== false) {
          const word = getWordsForStudent(studentId).find(item => item.id === wordId);
          const attempt = createSpellingAttempt({
            attemptId: options.attemptId ?? `${studentId}:${wordId}:${now}:${Math.random().toString(36).slice(2, 8)}`,
            learnerId: studentId,
            grade: getStudentProfile(studentId).grade,
            questionId: wordId,
            timestamp: now,
            sessionMode: mode === 'paper' ? 'paper' : mode === 'test' ? 'exam' : 'practice',
            submittedAnswer: mistakeInput ?? null,
            questionPrompt: word?.hiddenSentence,
            referenceAnswer: word?.canonicalSpelling,
            explanation: word?.meaning,
            assisted: !isUnaided,
            outcome: wasCorrect ? 'correct' : 'incorrect'
          });
          void saveLearningAttempt(repository, attempt).catch(() => undefined);
        }
      }
    } catch {
      saveFailed = true;
      updatedProgress.saveFailed = true;
      emitStorageError('Unable to save progress to local storage. Your browser storage may be full or disabled.');
    }
  }

  return updatedProgress;
}

/**
 * Picks words for a session tailored to the student:
 * Balances genuinely due reviews (missed, learning, distinct-day practising, retention checks)
 * with new, unseen words so students aren't stuck repeating successful words indefinitely.
 */
export function selectSessionWords(
  studentId: StudentId,
  subjectFilter?: SubjectCategory | 'All',
  count: number = 5
): WordEntry[] {
  const studentWords = getWordsForStudent(studentId);
  const eligible = subjectFilter && subjectFilter !== 'All'
    ? studentWords.filter(w => w.subject === subjectFilter)
    : studentWords;

  if (eligible.length === 0) return [];

  const allProgress = getAllProgress(studentId);

  // Group into due reviews, unseen words, and other already practicing/remembered words
  const dueReviewWords: WordEntry[] = [];
  const unseenWords: WordEntry[] = [];
  const otherWords: WordEntry[] = [];

  for (const word of eligible) {
    const prog = allProgress[word.id];
    if (!prog || prog.attempts === 0) {
      unseenWords.push(word);
    } else if (isWordDueForReview(prog)) {
      dueReviewWords.push(word);
    } else {
      otherWords.push(word);
    }
  }

  // Sort due reviews: missed words first, then learning, then oldest lastAttemptDate
  dueReviewWords.sort((a, b) => {
    const progA = allProgress[a.id];
    const progB = allProgress[b.id];
    const scoreA = (progA?.needsRevisit ? 0 : 10) + (progA?.level === 'learning' ? 0 : 5);
    const scoreB = (progB?.needsRevisit ? 0 : 10) + (progB?.level === 'learning' ? 0 : 5);
    if (scoreA !== scoreB) return scoreA - scoreB;
    const timeA = progA?.lastAttemptDate ? new Date(progA.lastAttemptDate).getTime() : 0;
    const timeB = progB?.lastAttemptDate ? new Date(progB.lastAttemptDate).getTime() : 0;
    return timeA - timeB;
  });

  // Sort other words by least recently attempted
  otherWords.sort((a, b) => {
    const progA = allProgress[a.id];
    const progB = allProgress[b.id];
    const timeA = progA?.lastAttemptDate ? new Date(progA.lastAttemptDate).getTime() : 0;
    const timeB = progB?.lastAttemptDate ? new Date(progB.lastAttemptDate).getTime() : 0;
    return timeA - timeB;
  });

  if (count <= 0 || count >= eligible.length) {
    return [...dueReviewWords, ...unseenWords, ...otherWords];
  }

  // Balanced selection policy:
  // When both due reviews and new words are available, split session to introduce new words
  const result: WordEntry[] = [];
  if (dueReviewWords.length > 0 && unseenWords.length > 0) {
    const dueCount = Math.max(1, Math.min(Math.ceil(count / 2), dueReviewWords.length));
    result.push(...dueReviewWords.slice(0, dueCount));
    const newCountNeeded = count - result.length;
    result.push(...unseenWords.slice(0, newCountNeeded));
    // If more words still needed to reach count
    if (result.length < count) {
      const remainingDue = dueReviewWords.slice(dueCount);
      const remainingSlots = count - result.length;
      result.push(...remainingDue.slice(0, remainingSlots));
    }
    if (result.length < count) {
      const remainingSlots = count - result.length;
      result.push(...otherWords.slice(0, remainingSlots));
    }
  } else if (dueReviewWords.length > 0) {
    result.push(...dueReviewWords.slice(0, count));
    if (result.length < count) {
      const remainingSlots = count - result.length;
      result.push(...otherWords.slice(0, remainingSlots));
    }
  } else {
    // No due reviews: introduce unseen words
    result.push(...unseenWords.slice(0, count));
    if (result.length < count) {
      const remainingSlots = count - result.length;
      result.push(...otherWords.slice(0, remainingSlots));
    }
  }

  return result.slice(0, count);
}

export function resetStudentProgress(studentId: StudentId): boolean {
  if (typeof window === 'undefined') return true;
  try {
    localStorage.removeItem(getStudentStorageKey(studentId));
    return true;
  } catch {
    emitStorageError(`Unable to reset progress for ${studentId}.`);
    return false;
  }
}
