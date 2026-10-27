import { WordProgress, MasteryLevel, SubjectCategory, WordEntry, StudentId, StudyMode } from '../types';
import { getWordsForStudent } from '../data/wordList';

export const LEGACY_STORAGE_KEY = 'spellbee_progress_v1';
export const MIGRATION_DONE_KEY = 'spellbee_migration_done_v1';
export const ACTIVE_PROFILE_KEY = 'spellbee_active_profile_v1';
export const SETTINGS_KEY = 'spellbee_settings_v1';

export interface AppSettings {
  soundEffects: boolean;
  speechAudio: boolean;
  slowSpeech: boolean;
  paperModeDefault: boolean;
  sessionSize: number; // 5, 10, or 0 (for all)
}

export const DEFAULT_SETTINGS: AppSettings = {
  soundEffects: true,
  speechAudio: true,
  slowSpeech: false,
  paperModeDefault: false,
  sessionSize: 5
};

// Storage event and error subscription system
type StorageErrorListener = (message: string) => void;
const storageErrorListeners: StorageErrorListener[] = [];

export function subscribeStorageError(listener: StorageErrorListener): () => void {
  storageErrorListeners.push(listener);
  return () => {
    const idx = storageErrorListeners.indexOf(listener);
    if (idx >= 0) storageErrorListeners.splice(idx, 1);
  };
}

export function emitStorageError(message: string): void {
  storageErrorListeners.forEach(listener => {
    try {
      listener(message);
    } catch {
      // Safeguard listener execution
    }
  });
}

/**
 * Returns YYYY-MM-DD formatted date string in the learner's local calendar.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      emitStorageError('Settings file was malformed. Reverted to default settings.');
      return DEFAULT_SETTINGS;
    }
    return {
      soundEffects: typeof parsed.soundEffects === 'boolean' ? parsed.soundEffects : DEFAULT_SETTINGS.soundEffects,
      speechAudio: typeof parsed.speechAudio === 'boolean' ? parsed.speechAudio : DEFAULT_SETTINGS.speechAudio,
      slowSpeech: typeof parsed.slowSpeech === 'boolean' ? parsed.slowSpeech : DEFAULT_SETTINGS.slowSpeech,
      paperModeDefault: typeof parsed.paperModeDefault === 'boolean' ? parsed.paperModeDefault : DEFAULT_SETTINGS.paperModeDefault,
      sessionSize: typeof parsed.sessionSize === 'number' && !isNaN(parsed.sessionSize) ? parsed.sessionSize : DEFAULT_SETTINGS.sessionSize
    };
  } catch {
    emitStorageError('Unable to read settings from browser storage. Using default settings.');
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): boolean {
  if (typeof window === 'undefined') return true;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch {
    emitStorageError('Storage save failed: unable to save settings to browser storage.');
    return false;
  }
}

/**
 * Migration routine:
 * Safely migrate single-user progress into Fazia's profile key on first load,
 * tracking completion with an independent migration flag so future resets remain intact.
 */
export function runStorageMigration(): void {
  if (typeof window === 'undefined') return;
  try {
    const isDone = localStorage.getItem(MIGRATION_DONE_KEY);
    if (isDone === 'true') {
      return;
    }

    const faziaKey = getStudentStorageKey('fazia');
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    const existingFazia = localStorage.getItem(faziaKey);

    if (legacyData && !existingFazia) {
      localStorage.setItem(faziaKey, legacyData);
    }
    // Record migration completion independently of whether current student progress exists
    localStorage.setItem(MIGRATION_DONE_KEY, 'true');
  } catch {
    // Migration safeguard
  }
}

// Run migration immediately upon module import in browser
runStorageMigration();

export function loadActiveStudent(): StudentId {
  if (typeof window === 'undefined') return 'shiza';
  try {
    const saved = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (saved === 'fazia' || saved === 'shiza') {
      return saved;
    }
    return 'shiza';
  } catch {
    return 'shiza';
  }
}

export function saveActiveStudent(studentId: StudentId): boolean {
  if (typeof window === 'undefined') return true;
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, studentId);
    return true;
  } catch {
    emitStorageError('Storage save failed: unable to remember active student.');
    return false;
  }
}

export function getStudentStorageKey(studentId: StudentId): string {
  return `spellbee_progress_${studentId}_v1`;
}

function isValidWordProgress(val: unknown): val is WordProgress {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return false;
  const obj = val as Record<string, unknown>;
  return (
    typeof obj.wordId === 'string' &&
    typeof obj.studentId === 'string' &&
    typeof obj.attempts === 'number' &&
    typeof obj.unaidedCorrectCount === 'number' &&
    typeof obj.consecutiveUnaidedCorrect === 'number' &&
    Array.isArray(obj.unaidedCorrectDates) &&
    (obj.level === 'learning' || obj.level === 'practising' || obj.level === 'remembered')
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
    for (const [key, val] of Object.entries(parsed)) {
      if (isValidWordProgress(val)) {
        sanitized[key] = val;
      }
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
 * - Remembered words are due for periodic retention checks (e.g. 3+ days since last attempt).
 */
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
    if (!prog.lastAttemptDate) return true;
    const lastAttemptTime = new Date(prog.lastAttemptDate).getTime();
    const daysSince = (Date.now() - lastAttemptTime) / (1000 * 60 * 60 * 24);
    return daysSince >= 3;
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
  mistakeInput?: string
): ExtendedWordProgress {
  const all = getAllProgress(studentId);
  const current = getWordProgress(wordId, studentId);

  const updatedAttempts = current.attempts + 1;
  const isUnaided = (mode === 'test' || mode === 'paper');
  const todayDateStr = getLocalDateString(); // Learner's local calendar

  let unaidedCount = current.unaidedCorrectCount;
  let consecutiveUnaided = current.consecutiveUnaidedCorrect;
  const distinctDates = new Set(current.unaidedCorrectDates || []);

  if (isUnaided && wasCorrect) {
    unaidedCount += 1;
    consecutiveUnaided += 1;
    distinctDates.add(todayDateStr);
  } else if (isUnaided && !wasCorrect) {
    consecutiveUnaided = 0;
  }

  const updatedDates = Array.from(distinctDates);

  // Evidence-based test-readiness mastery:
  // Requires at least 2 unaided recalls across at least 2 distinct days with consecutive streak >= 2
  let newLevel: MasteryLevel = 'learning';
  if (unaidedCount >= 2 && updatedDates.length >= 2 && consecutiveUnaided >= 2) {
    newLevel = 'remembered';
  } else if (unaidedCount >= 1 && consecutiveUnaided >= 1) {
    newLevel = 'practising';
  } else {
    newLevel = 'learning';
  }

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
    lastAttemptDate: new Date().toISOString(),
    level: newLevel,
    lastMistake: wasCorrect ? undefined : mistakeInput,
    needsRevisit: newNeedsRevisit,
    history: [
      ...current.history.slice(-14),
      {
        date: new Date().toISOString(),
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
