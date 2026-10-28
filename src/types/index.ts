/**
 * Core type definitions for Learning Academy
 */

export type StudentId = 'fazia' | 'shiza';

export interface StudentProfile {
  id: StudentId;
  name: string;
  grade: number;
  gradeLabel: string;
  avatarEmoji: string;
  description: string;
}

export type SubjectCategory =
  | 'EVS'
  | 'Biology'
  | 'Physics'
  | 'Chemistry'
  | 'Computer'
  | 'Maths'
  | 'English'
  | 'History'
  | 'Malayalam'
  | 'Hindi';

export type ScriptType = 'english' | 'malayalam' | 'devanagari';

export type MasteryLevel = 'learning' | 'practising' | 'remembered';

export type StudyMode = 'learn' | 'practice' | 'test';

export interface WordEntry {
  id: string;
  studentGrade: number;
  word: string; // Display word (e.g., "Phyllotaxy", "Bicycle", "രാജ്യപത്നി", "भरोसा")
  canonicalSpelling: string; // The primary spelling to check in lowercase
  nativeScript?: string; // For Indic words (e.g. "രാജ്യപത്നി", "भरोसा")
  transliteration?: string; // e.g. "Rajyapathni", "Bharosa"
  subject: SubjectCategory;
  scriptType: ScriptType;
  meaning: string;
  childFriendlySentence: string; // Full sentence with the word
  hiddenSentence: string; // Sentence with blank "______" for clue/test mode
  trickySpot: string; // Pedagogical hint explaining roots, silent letters, or conjuncts
  phoneticGuide: string; // e.g. "FIL-oh-tak-see", "BY-sih-kull"
  letterSpelling: string[]; // ["P", "H", "Y", ...]
  graphemeTiles: string[]; // Syllable or akshara tiles for guided puzzle
  languageCode: 'en-US' | 'hi-IN' | 'ml-IN';
  categoryNumber: number; // 1 to N within subject
}

export interface WordProgress {
  wordId: string;
  studentId: StudentId;
  attempts: number;
  unaidedCorrectCount: number; // Correct in independent test mode without hints
  consecutiveUnaidedCorrect: number;
  unaidedCorrectDates: string[]; // Distinct local dates (YYYY-MM-DD) in the current unaided success streak
  lastAttemptDate: string | null;
  lastUnaidedCorrectDate?: string | null; // Timestamp of the latest qualifying recall; optional for legacy records
  level: MasteryLevel;
  lastMistake?: string;
  needsRevisit: boolean;
  history: Array<{
    date: string;
    mode: 'learn' | 'practice' | 'test' | 'paper';
    wasCorrect: boolean;
    mistakeInput?: string;
  }>;
}

export type ActiveAppView = 'home' | 'session' | 'curriculum' | 'parent' | 'worksheet' | 'robotics';

export type LearningSubjectId = 'spell-bee' | 'robotics';

export interface LearningSubject {
  id: LearningSubjectId;
  name: string;
  description: string;
  availableGrades: number[];
  startView: ActiveAppView;
  views: ActiveAppView[];
}

export interface PracticeSessionState {
  words: WordEntry[];
  currentIndex: number;
  studyMode: StudyMode;
  attemptsThisWord: number;
  revisitQueue: WordEntry[]; // Words pushed back 2-3 cards later after an error
  sessionStats: {
    totalWords: number;
    testedUnaided: number;
    unaidedPassed: number;
    assistedPracticed: number;
  };
}

export interface SpellingFeedback {
  isCorrect: boolean;
  userInput: string;
  targetWord: string;
  message: string;
  coachingTip: string;
  highlightedDiff?: {
    expected: string;
    actual: string;
    errorType: 'missing' | 'extra' | 'swapped' | 'vowel' | 'typo';
  };
}
