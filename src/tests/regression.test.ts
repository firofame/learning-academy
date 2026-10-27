import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { WordProgress, StudentId } from '../types';
import { 
  GRADE_2_WORDS, 
  GRADE_6_WORDS, 
  getWordsForStudent 
} from '../data/wordList';
import { 
  normalizeSpelling, 
  evaluateSpelling 
} from '../utils/spellingCoach';
import { 
  recordAttempt, 
  selectSessionWords, 
  getAllProgress, 
  getWordProgress, 
  resetStudentProgress, 
  runStorageMigration,
  loadSettings,
  saveSettings,
  isWordDueForReview,
  getLocalDateString,
  subscribeStorageError,
  DEFAULT_SETTINGS,
  LEGACY_STORAGE_KEY,
  MIGRATION_DONE_KEY,
  SETTINGS_KEY
} from '../utils/storage';

// In-memory mock localStorage for isolated testing
class MockLocalStorage {
  private store: Map<string, string> = new Map();
  public shouldThrowOnSet = false;
  public shouldThrowOnGet = false;

  getItem(key: string): string | null {
    if (this.shouldThrowOnGet) throw new Error('Quota or security read error');
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldThrowOnSet) throw new Error('QuotaExceededError');
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const mockStorage = new MockLocalStorage();
// Attach to global window
(global as any).window = { localStorage: mockStorage };
(global as any).localStorage = mockStorage;

describe('Spelling Learning Companion - Regression Test Suite', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockStorage.shouldThrowOnSet = false;
    mockStorage.shouldThrowOnGet = false;
  });

  // -------------------------------------------------------------------------
  // 1. Assisted/revealed answers not earning unaided credit
  // -------------------------------------------------------------------------
  test('1. Assisted answers do not earn unaided credit or advance to test-ready', () => {
    const wordId = 'g2-evs-1'; // land
    const studentId: StudentId = 'fazia';

    // Practice mode (assisted tile assembly or helper used)
    const result = recordAttempt(wordId, studentId, true, 'practice');
    assert.equal(result.unaidedCorrectCount, 0, 'unaidedCorrectCount should not increment on practice');
    assert.equal(result.consecutiveUnaidedCorrect, 0, 'consecutiveUnaidedCorrect should not increment on practice');
    assert.equal(result.unaidedCorrectDates.length, 0, 'no distinct unaided dates on practice');
    assert.equal(result.level, 'learning', 'Level should remain learning after assisted practice');

    // Missed unaided test first
    recordAttempt(wordId, studentId, false, 'test', 'lnd');
    const afterMistake = getWordProgress(wordId, studentId);
    assert.equal(afterMistake.needsRevisit, true, 'needsRevisit should be true after failure');

    // Now child does assisted practice and gets it right
    const afterAssisted = recordAttempt(wordId, studentId, true, 'practice');
    assert.equal(afterAssisted.needsRevisit, true, 'Assisted success must not clear needsRevisit!');
  });

  // -------------------------------------------------------------------------
  // 3. Correct distinct-day mastery behavior
  // -------------------------------------------------------------------------
  test('3. Test-Ready requires qualifying unaided recalls across distinct local calendar days', () => {
    const wordId = 'g2-evs-1';
    const studentId: StudentId = 'fazia';

    // Day 1: First unaided success
    const day1Result = recordAttempt(wordId, studentId, true, 'test');
    assert.equal(day1Result.unaidedCorrectCount, 1);
    assert.equal(day1Result.level, 'practising', 'First unaided success should be practising');

    // Day 1 (later in same day): Second unaided success on SAME local calendar day
    const day1SecondResult = recordAttempt(wordId, studentId, true, 'test');
    assert.equal(day1SecondResult.unaidedCorrectDates.length, 1, 'Same day must not add a second distinct date');
    assert.equal(day1SecondResult.level, 'practising', 'Must remain practising on same day');

    // Manually simulate that previous attempt was yesterday
    const all = getAllProgress(studentId);
    all[wordId].unaidedCorrectDates = ['2026-10-25']; // yesterday
    mockStorage.setItem(`spellbee_progress_${studentId}_v1`, JSON.stringify(all));

    // Day 2 (today): Second distinct day unaided success
    const day2Result = recordAttempt(wordId, studentId, true, 'test');
    assert.equal(day2Result.unaidedCorrectDates.length, 2, 'Should now have 2 distinct calendar days');
    assert.equal(day2Result.consecutiveUnaidedCorrect >= 2, true);
    assert.equal(day2Result.level, 'remembered', 'Should advance to remembered (Test-Ready)');

    // If student makes a mistake later, consecutive streak resets and drops out of remembered
    const mistakeResult = recordAttempt(wordId, studentId, false, 'test', 'lnd');
    assert.equal(mistakeResult.consecutiveUnaidedCorrect, 0);
    assert.equal(mistakeResult.level, 'learning', 'Mistake should downgrade to learning');
    assert.equal(mistakeResult.needsRevisit, true, 'Needs revisit should be marked');
  });

  // -------------------------------------------------------------------------
  // 5. Cubiod rejected and legitimate variants accepted
  // -------------------------------------------------------------------------
  test('5. "cubiod" is rejected for "cuboid", while "esophagus" is accepted for "oesophagus"', () => {
    const allWords = [...GRADE_2_WORDS, ...GRADE_6_WORDS];
    const cuboidWord = allWords.find(w => w.canonicalSpelling === 'cuboid')!;
    const oesophagusWord = allWords.find(w => w.canonicalSpelling === 'oesophagus')!;

    assert.ok(cuboidWord, 'cuboid exists');
    assert.ok(oesophagusWord, 'oesophagus exists');

    // 1. cuboid
    const correctCuboid = evaluateSpelling(cuboidWord, 'cuboid');
    assert.equal(correctCuboid.isCorrect, true, 'Exact "cuboid" is correct');

    const typoCuboid = evaluateSpelling(cuboidWord, 'cubiod');
    assert.equal(typoCuboid.isCorrect, false, '"cubiod" must be rejected as an error');
    assert.equal(typoCuboid.highlightedDiff?.errorType, 'swapped', 'Should diagnose swapped letters');

    // 2. oesophagus regional variant
    const britishSpelling = evaluateSpelling(oesophagusWord, 'oesophagus');
    assert.equal(britishSpelling.isCorrect, true, '"oesophagus" is correct');

    const americanSpelling = evaluateSpelling(oesophagusWord, 'esophagus');
    assert.equal(americanSpelling.isCorrect, true, 'Regional variant "esophagus" is accepted');
  });

  // -------------------------------------------------------------------------
  // 6. Unicode-equivalent native answers and multiword tile boundaries
  // -------------------------------------------------------------------------
  test('6. Unicode canonical equivalence and multiword space boundaries', () => {
    const shizaWords = getWordsForStudent('shiza');
    const bharatSarkar = shizaWords.find(w => w.id === 'g6-hin-80')!;
    const buddhiSamarthyam = shizaWords.find(w => w.id === 'g6-mal-68')!;
    const mayil = getWordsForStudent('fazia').find(w => w.id === 'g2-mal-16')!; // മയിൽ

    assert.ok(bharatSarkar, 'Bharat Sarkar entry exists');
    assert.ok(buddhiSamarthyam, 'Buddhi Samarthyam entry exists');
    assert.ok(mayil, 'Mayil entry exists');

    // Multiword tile boundaries check
    assert.ok(bharatSarkar.graphemeTiles.includes(' '), 'Bharat Sarkar tiles must contain space tile');
    assert.equal(bharatSarkar.graphemeTiles.join(''), 'भारत सरकार', 'Joined tiles must match native script with space');

    assert.ok(buddhiSamarthyam.graphemeTiles.includes(' '), 'Buddhi Samarthyam tiles must contain space tile');
    assert.equal(buddhiSamarthyam.graphemeTiles.join(''), 'ബുദ്ധി സാമർത്ഥ്യം', 'Joined tiles must match native script with space');

    // Evaluation accepts correctly spaced native script
    assert.equal(evaluateSpelling(bharatSarkar, 'भारत सरकार').isCorrect, true);
    assert.equal(evaluateSpelling(buddhiSamarthyam, 'ബുദ്ധി സാമർത്ഥ്യം').isCorrect, true);

    // Malayalam Unicode canonical equivalence:
    // Decomposed composite vowel െ + ാ (U+0D46 + U+0D3E) vs precomposed ൊ (U+0D4A)
    const decomposedO = 'ച\u0D46\u0D3Eവ്വ';
    const chovvaWord = getWordsForStudent('fazia').find(w => w.id === 'g2-mal-20')!; // ചൊവ്വ
    assert.equal(evaluateSpelling(chovvaWord, decomposedO).isCorrect, true, 'Canonically equivalent Malayalam NFC input is accepted');

    // Legacy chillu L (\u0D32\u0D4D\u200D) vs atomic chillu ൽ (\u0D7D) in മയിൽ
    const legacyChilluMayil = 'മയി\u0D32\u0D4D\u200D';
    assert.equal(evaluateSpelling(mayil, legacyChilluMayil).isCorrect, true, 'Legacy decomposed chillu matches atomic chillu');
  });

  // -------------------------------------------------------------------------
  // 7. Malformed storage and failed saves
  // -------------------------------------------------------------------------
  test('7. Malformed storage is handled safely and failed saves are surfaced', () => {
    let capturedError = '';
    const unsubscribe = subscribeStorageError((err) => {
      capturedError = err;
    });

    // Malformed settings: array instead of object
    mockStorage.setItem(SETTINGS_KEY, JSON.stringify([1, 2, 3]));
    const settingsArr = loadSettings();
    assert.deepEqual(settingsArr, DEFAULT_SETTINGS, 'Should fall back to default settings');
    assert.ok(capturedError.includes('malformed') || capturedError.includes('settings'));

    // Malformed settings: literal "null"
    mockStorage.setItem(SETTINGS_KEY, 'null');
    const settingsNull = loadSettings();
    assert.deepEqual(settingsNull, DEFAULT_SETTINGS);

    // Malformed progress: corrupted JSON
    mockStorage.setItem('spellbee_progress_fazia_v1', '{ invalid: JSON }');
    const progressCorrupted = getAllProgress('fazia');
    assert.deepEqual(progressCorrupted, {}, 'Corrupted JSON returns empty object without crash');

    // Malformed progress: null or array
    mockStorage.setItem('spellbee_progress_fazia_v1', 'null');
    assert.deepEqual(getAllProgress('fazia'), {});

    mockStorage.setItem('spellbee_progress_fazia_v1', JSON.stringify(['not an object']));
    assert.deepEqual(getAllProgress('fazia'), {});

    // Failed save handling: simulate QuotaExceededError
    mockStorage.shouldThrowOnSet = true;
    capturedError = '';
    const failedResult = recordAttempt('g2-evs-1', 'fazia', true, 'test');
    assert.equal(failedResult.saveFailed, true, 'recordAttempt must flag saveFailed');
    assert.ok(capturedError.includes('Unable to save') || capturedError.includes('failed'));

    unsubscribe();
  });

  // -------------------------------------------------------------------------
  // 8. Reset remaining effective after migration and reload
  // -------------------------------------------------------------------------
  test('8. Reset remains effective across reloads and migration does not restore data', () => {
    // 1. Initial state with legacy storage
    const legacyPayload = {
      'g2-evs-1': {
        wordId: 'g2-evs-1',
        studentId: 'fazia',
        attempts: 5,
        unaidedCorrectCount: 3,
        consecutiveUnaidedCorrect: 2,
        unaidedCorrectDates: ['2026-10-20', '2026-10-21'],
        lastAttemptDate: '2026-10-21T10:00:00Z',
        level: 'remembered',
        needsRevisit: false,
        history: []
      }
    };
    mockStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacyPayload));

    // First run migration
    runStorageMigration();
    assert.equal(mockStorage.getItem(MIGRATION_DONE_KEY), 'true', 'Migration flag set');
    const migratedProgress = getAllProgress('fazia');
    assert.equal(migratedProgress['g2-evs-1']?.attempts, 5, 'Legacy data was migrated to Fazia');

    // 2. Fazia resets her progress
    resetStudentProgress('fazia');
    const afterReset = getAllProgress('fazia');
    assert.deepEqual(afterReset, {}, 'Fazia progress is now empty');

    // 3. Simulate browser reload (runStorageMigration() called again)
    runStorageMigration();
    const afterReload = getAllProgress('fazia');
    assert.deepEqual(afterReload, {}, 'Reset remains effective; legacy data was NOT re-imported!');
  });

  // -------------------------------------------------------------------------
  // 9. Student progress isolation
  // -------------------------------------------------------------------------
  test('9. Student progress is strictly isolated between students', () => {
    // Record for Fazia
    recordAttempt('g2-evs-1', 'fazia', true, 'test');
    const faziaProg = getAllProgress('fazia');
    const shizaProg = getAllProgress('shiza');

    assert.ok(faziaProg['g2-evs-1'], 'Fazia has progress');
    assert.equal(shizaProg['g2-evs-1'], undefined, 'Shiza must not have Fazia progress');

    // Record for Shiza
    recordAttempt('g6-bio-1', 'shiza', true, 'test');
    assert.ok(getAllProgress('shiza')['g6-bio-1'], 'Shiza has progress');
    assert.equal(getAllProgress('fazia')['g6-bio-1'], undefined, 'Fazia must not have Shiza progress');

    // Resetting Fazia leaves Shiza intact
    resetStudentProgress('fazia');
    assert.deepEqual(getAllProgress('fazia'), {});
    assert.ok(getAllProgress('shiza')['g6-bio-1'], 'Shiza progress intact after Fazia reset');
  });

  // -------------------------------------------------------------------------
  // 10. Scheduling that introduces new words while reviewing due words
  // -------------------------------------------------------------------------
  test('10. Session scheduler introduces new words after successful practice', () => {
    const studentId: StudentId = 'fazia';

    // Student practices 5 words and gets them all correct today
    const firstFive = getWordsForStudent(studentId).slice(0, 5);
    for (const w of firstFive) {
      recordAttempt(w.id, studentId, true, 'test');
    }

    // Now select words for the next session
    const nextSession = selectSessionWords(studentId, 'All', 5);
    assert.equal(nextSession.length, 5);

    // The next session must NOT simply be the exact same 5 words!
    const overlapCount = nextSession.filter(w => firstFive.some(f => f.id === w.id)).length;
    assert.ok(overlapCount < 5, 'Scheduler must introduce new words rather than repeating only successful words');

    // Unseen words should be present
    const unseenInSession = nextSession.filter(w => {
      const p = getWordProgress(w.id, studentId);
      return p.attempts === 0;
    });
    assert.ok(unseenInSession.length > 0, 'New unseen words must be introduced');

    // If one word was missed, it must be prioritized in the next session!
    const missedWord = firstFive[0];
    recordAttempt(missedWord.id, studentId, false, 'test', 'bad');
    const sessionWithMissed = selectSessionWords(studentId, 'All', 5);
    assert.equal(sessionWithMissed[0].id, missedWord.id, 'Missed word must be prioritized at the top');
  });

  // -------------------------------------------------------------------------
  // 11. Consistency between dashboard review lists and session eligibility
  // -------------------------------------------------------------------------
  test('11. Dashboard review list and session eligibility share consistent definition', () => {
    const studentId: StudentId = 'shiza';

    // Word A: missed during practice, needsRevisit: true
    const wordA = 'g6-bio-1';
    recordAttempt(wordA, studentId, false, 'test', 'mistake');
    const progA = getWordProgress(wordA, studentId);
    assert.equal(progA.needsRevisit, true);
    assert.equal(isWordDueForReview(progA), true, 'Missed word must be due for review');

    // Word B: never attempted
    const wordB = 'g6-bio-2';
    const progB = getWordProgress(wordB, studentId);
    assert.equal(isWordDueForReview(progB), false, 'Unseen word is new, not due for review');

    // Word C: practised once today without error (practising)
    const wordC = 'g6-bio-3';
    recordAttempt(wordC, studentId, true, 'test');
    const progC = getWordProgress(wordC, studentId);
    assert.equal(progC.level, 'practising');
    assert.equal(isWordDueForReview(progC), false, 'Practising word passed today is not due today');

    // Word D: practised on a previous day (waiting for 2nd day confirmation)
    const wordD = 'g6-bio-4';
    recordAttempt(wordD, studentId, true, 'test');
    const all = getAllProgress(studentId);
    all[wordD].unaidedCorrectDates = ['2026-10-20'];
    all[wordD].lastAttemptDate = '2026-10-20T12:00:00Z';
    mockStorage.setItem(`spellbee_progress_${studentId}_v1`, JSON.stringify(all));
    const progD = getWordProgress(wordD, studentId);
    assert.equal(isWordDueForReview(progD), true, 'Practising word from past day IS due for 2nd day verification');

    // Verify session selection picks due words
    const session = selectSessionWords(studentId, 'Biology', 5);
    assert.ok(session.some(w => w.id === wordA), 'Due missed word A is included in session');
  });

  test('all curriculum tile assemblies match their actual spelling, including word boundaries', () => {
    for (const word of [...GRADE_2_WORDS, ...GRADE_6_WORDS]) {
      const expected = normalizeSpelling(word.nativeScript || word.canonicalSpelling);
      assert.equal(normalizeSpelling(word.graphemeTiles.join('')), expected, word.id);
      assert.equal(evaluateSpelling(word, word.graphemeTiles.join('')).isCorrect, true, word.id);
      assert.equal(word.hiddenSentence.toLowerCase().includes(word.canonicalSpelling.toLowerCase()), false, word.id);
      assert.equal(word.meaning.toLowerCase().includes(word.canonicalSpelling.toLowerCase()), false, word.id);
    }
  });

  test('partial and malformed records are reported and skipped without losing valid progress', () => {
    const wordId = 'g2-evs-1';
    const valid = recordAttempt(wordId, 'fazia', true, 'test');
    let message = '';
    const unsubscribe = subscribeStorageError(error => { message = error; });
    const invalidFields: Array<Record<string, unknown>> = [
      { history: undefined },
      { history: null },
      { history: [{ date: 'not a date', mode: 'test', wasCorrect: true }] },
      { history: [{ date: new Date().toISOString(), mode: 'invalid', wasCorrect: true }] },
      { history: [{ date: new Date().toISOString(), mode: 'paper', wasCorrect: 'yes' }] },
      { attempts: -1 },
      { unaidedCorrectCount: 0.5 },
      { consecutiveUnaidedCorrect: null },
      { unaidedCorrectDates: ['2026-02-31'] },
      { unaidedCorrectDates: [123] },
      { lastAttemptDate: 'invalid' },
      { lastUnaidedCorrectDate: 'invalid' },
      { lastMistake: {} },
      { needsRevisit: 'false' },
      { wordId: 'wrong-word' },
      { studentId: 'shiza' }
    ];
    try {
      for (const fields of invalidFields) {
        mockStorage.setItem('spellbee_progress_fazia_v1', JSON.stringify({
          [wordId]: { ...valid, ...fields },
          'g2-evs-2': { ...valid, wordId: 'g2-evs-2' }
        }));
        message = '';
        assert.deepEqual(Object.keys(getAllProgress('fazia')), ['g2-evs-2'], JSON.stringify(fields));
        assert.match(message, /malformed progress/);
        const result = recordAttempt(wordId, 'fazia', true, 'test');
        assert.equal(result.attempts, 1, 'submitting after a rejected record must not crash');
        assert.equal(getWordProgress('g2-evs-2', 'fazia').attempts, valid.attempts);
      }
    } finally {
      unsubscribe();
    }
  });

  test('assisted attempts do not postpone retention; unaided success resets the exact three-day clock', () => {
    const wordId = 'g2-evs-1';
    const old = new Date(Date.now() - 4 * 86400000);
    const progress: WordProgress = {
      ...getWordProgress(wordId, 'fazia'),
      attempts: 4, unaidedCorrectCount: 4, consecutiveUnaidedCorrect: 4,
      unaidedCorrectDates: [getLocalDateString(new Date(old.getTime() - 86400000)), getLocalDateString(old)],
      lastAttemptDate: old.toISOString(),
      lastUnaidedCorrectDate: old.toISOString(),
      level: 'remembered'
    };
    mockStorage.setItem('spellbee_progress_fazia_v1', JSON.stringify({ [wordId]: progress }));
    assert.equal(isWordDueForReview(progress), true);
    for (let i = 0; i < 20; i++) {
      assert.equal(isWordDueForReview(recordAttempt(wordId, 'fazia', true, 'practice')), true);
    }
    const recall = recordAttempt(wordId, 'fazia', true, 'paper');
    assert.equal(isWordDueForReview(recall), false);
    assert.equal(recall.lastUnaidedCorrectDate, recall.lastAttemptDate);
    const now = Date.now();
    assert.equal(isWordDueForReview({ ...recall, lastUnaidedCorrectDate: new Date(now - 3 * 86400000 + 1000).toISOString() }), false);
    assert.equal(isWordDueForReview({ ...recall, lastUnaidedCorrectDate: new Date(now - 3 * 86400000).toISOString() }), true);
  });

  test('legacy retention falls back to unaided history or calendar evidence, not recent assisted work', () => {
    const wordId = 'g2-evs-1';
    const old = new Date(Date.now() - 4 * 86400000);
    const progress: WordProgress = {
      ...getWordProgress(wordId, 'fazia'),
      attempts: 4, unaidedCorrectCount: 2, consecutiveUnaidedCorrect: 2,
      unaidedCorrectDates: [getLocalDateString(old)],
      lastAttemptDate: new Date().toISOString(),
      level: 'remembered',
      history: [
        { date: old.toISOString(), mode: 'paper', wasCorrect: true },
        { date: new Date().toISOString(), mode: 'practice', wasCorrect: true }
      ]
    };
    delete progress.lastUnaidedCorrectDate;
    assert.equal(isWordDueForReview(progress), true);
    assert.equal(isWordDueForReview({ ...progress, history: progress.history.slice(1) }), true);
    mockStorage.setItem('spellbee_progress_fazia_v1', JSON.stringify({ [wordId]: progress }));
    const updated = recordAttempt(wordId, 'fazia', true, 'practice');
    assert.equal(updated.lastUnaidedCorrectDate, old.toISOString());
    assert.equal(isWordDueForReview(updated), true);
  });

  test('after a lapse historical mastery cannot replace fresh distinct-day evidence', () => {
    const wordId = 'g2-evs-1';
    const old = new Date(Date.now() - 4 * 86400000);
    const progress: WordProgress = {
      ...getWordProgress(wordId, 'fazia'),
      attempts: 4, unaidedCorrectCount: 4, consecutiveUnaidedCorrect: 4,
      unaidedCorrectDates: [getLocalDateString(new Date(old.getTime() - 86400000)), getLocalDateString(old)],
      lastAttemptDate: old.toISOString(),
      level: 'remembered'
    };
    mockStorage.setItem('spellbee_progress_fazia_v1', JSON.stringify({ [wordId]: progress }));
    const lapse = recordAttempt(wordId, 'fazia', false, 'test', 'lnd');
    assert.deepEqual(lapse.unaidedCorrectDates, []);
    recordAttempt(wordId, 'fazia', true, 'test');
    const sameDayRecovery = recordAttempt(wordId, 'fazia', true, 'test');
    assert.equal(sameDayRecovery.level, 'practising');
    assert.equal(sameDayRecovery.unaidedCorrectDates.length, 1);
    const yesterday = getLocalDateString(new Date(Date.now() - 86400000));
    sameDayRecovery.unaidedCorrectDates = [yesterday];
    mockStorage.setItem('spellbee_progress_fazia_v1', JSON.stringify({ [wordId]: sameDayRecovery }));
    assert.equal(recordAttempt(wordId, 'fazia', true, 'test').level, 'remembered');
  });
});
