import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  checkHistoryAnswer,
  getHistoryLesson,
  getHistoryLessonForGrade,
  normalizeHistoryAnswer,
  HISTORY_SECTIONS,
  SHIZA_HISTORY_LESSON
} from '../data/history';
import {
  getHistoryStorageKey,
  HistoryResult,
  isValidHistoryProgress,
  loadHistoryProgress,
  saveHistoryResult,
  updateHistoryReviewQuestionIds
} from '../utils/historyStorage';

import { installMockLocalStorage } from './helpers/storage';

const mockStorage = installMockLocalStorage();

/** The teacher's own notes, used to check that nothing in the app drifts from them. */
const teacherNotes = readFileSync(
  new URL('./fixtures/social-science-revision-notes.txt', import.meta.url),
  'utf8'
).replace(/\s+/g, ' ');

describe('Shiza Grade 6 History curriculum & revision notes coverage', () => {
  beforeEach(() => mockStorage.clear());

  test('covers all 3 parts and 33 questions from the supplied revision notes and compendium', () => {
    assert.equal(getHistoryLesson('shiza'), SHIZA_HISTORY_LESSON);
    assert.equal(getHistoryLessonForGrade(6), SHIZA_HISTORY_LESSON);
    assert.equal(SHIZA_HISTORY_LESSON.grade, 6);
    assert.equal(SHIZA_HISTORY_LESSON.questions.length, 33);

    // Section breakdown: [rural-local-self-government: 9, mesopotamian-civilization: 10, vedic-civilization: 14]
    const sectionCounts = HISTORY_SECTIONS.map(section =>
      SHIZA_HISTORY_LESSON.questions.filter(q => q.section === section.id).length
    );
    assert.deepEqual(sectionCounts, [9, 10, 14]);

    // Unique IDs
    const ids = SHIZA_HISTORY_LESSON.questions.map(q => q.id);
    assert.equal(new Set(ids).size, 33);

    // Prompt and answer checks
    for (const q of SHIZA_HISTORY_LESSON.questions) {
      assert.ok(q.prompt.length > 0, `Question ${q.id} prompt is empty`);
      assert.ok(q.answer.length > 0, `Question ${q.id} answer is empty`);
      assert.ok(q.markingCriteria.length > 0, `Question ${q.id} markingCriteria is empty`);
      assert.equal(checkHistoryAnswer(q, q.answer), true, `Question ${q.id} failed checking its own answer: ${q.answer}`);
      assert.equal(checkHistoryAnswer(q, ''), false, `Question ${q.id} accepted empty answer`);
      assert.equal(checkHistoryAnswer(q, '   '), false, `Question ${q.id} accepted whitespace-only answer`);
    }

    // Availability checks
    assert.throws(() => getHistoryLesson('fazia'), /History is not available for Grade 2/);
    assert.equal(getHistoryLessonForGrade(2), undefined);
    assert.equal(getHistoryLessonForGrade(1), undefined);
  });

  test('every question and answer is the teacher\'s own wording from the notes', () => {
    for (const q of SHIZA_HISTORY_LESSON.questions) {
      assert.ok(
        teacherNotes.includes(q.prompt),
        `Question ${q.id} prompt is not the teacher's wording: ${q.prompt}`
      );

      // Each line of the answer must appear in the notes, so lists and tables stay as written.
      for (const line of q.answer.split('\n')) {
        const probe = line.trim().replace(/^•\s*/, '');
        if (!probe) continue;
        // A line ending in a colon labels a column of the teacher's comparison table.
        const heading = probe.endsWith(':') ? probe.slice(0, -1) : probe;
        assert.ok(
          teacherNotes.includes(probe) || teacherNotes.includes(heading),
          `Question ${q.id} answer line is not the teacher's wording: ${probe}`
        );
      }
    }
  });

  test('grades against the teacher\'s own answer so no outside content can be required', () => {
    for (const q of SHIZA_HISTORY_LESSON.questions) {
      assert.equal(
        q.markingCriteria,
        q.answer,
        `Question ${q.id} rubric drifts from the teacher's answer`
      );
    }
  });

  test('keeps the teacher\'s question groups and list layout', () => {
    const groupOf = (id: string) =>
      SHIZA_HISTORY_LESSON.questions.find(q => q.id === id)?.groupLabel;

    // The notes divide Part 2 and Part 3 into their own sub-headings.
    assert.equal(groupOf('g6-hist-part2-qa-1'), 'I. SHORT ANSWER QUESTIONS');
    assert.equal(groupOf('g6-hist-part2-qa-9'), 'II. GIVE REASONS');
    assert.equal(groupOf('g6-hist-part3-qa-1'), 'I. SHORT ANSWER QUESTIONS');
    assert.equal(groupOf('g6-hist-part3-qa-9'), 'II. LONG ANSWER QUESTIONS');
    assert.equal(groupOf('g6-hist-part3-qa-13'), 'III. GIVE REASONS');
    // Part 1 has no sub-heading in the notes.
    assert.equal(groupOf('g6-hist-part1-qa-1'), undefined);

    // A bulleted answer keeps the teacher's own lines.
    const functions = SHIZA_HISTORY_LESSON.questions.find(q => q.id === 'g6-hist-part1-qa-2')!;
    assert.deepEqual(functions.answer.split('\n'), [
      'The primary functions essential for village welfare include:',
      'Providing clean drinking water and sanitation facilities.',
      'Registering and maintaining vital statistics (birth and death records).',
      'Managing the day-to-day civic administration of the village.',
      'Upkeep and maintenance of general village infrastructure.'
    ]);

    // A comparison table keeps both of the teacher's columns.
    const sabha = SHIZA_HISTORY_LESSON.questions.find(q => q.id === 'g6-hist-part1-qa-8')!;
    assert.ok(sabha.answer.includes('Gram Sabha:'));
    assert.ok(sabha.answer.includes('Gram Panchayat:'));
    assert.ok(sabha.answer.includes('• Headed and presided over by the Sarpanch.'));
    assert.ok(sabha.answer.includes('• Headed and administered by the Pradhan / Sarpanch and elected ward members.'));
  });

  test('normalizes answers and accepts valid aliases and order-independent lists', () => {
    assert.equal(normalizeHistoryAnswer('  Gram Panchayat & Gram Sabha.  '), 'gram panchayat and gram sabha');
    assert.equal(normalizeHistoryAnswer('Sumer, Babylon, and Assyria!'), 'sumer, babylon and assyria');
    assert.equal(normalizeHistoryAnswer('Brahma, Vishnu, and Shiva.'), 'brahma, vishnu and shiva');

    // Mesopotamian middle class order independence
    const middleClassQ = SHIZA_HISTORY_LESSON.questions.find(q => q.id === 'g6-hist-part2-qa-1')!;
    assert.equal(checkHistoryAnswer(middleClassQ, 'Farmers, artisans, craftsmen, and traders.'), true);
    assert.equal(checkHistoryAnswer(middleClassQ, 'farmers, artisans, craftsmen, traders'), true);
    assert.equal(checkHistoryAnswer(middleClassQ, 'traders, craftsmen, artisans, farmers'), true);
    assert.equal(checkHistoryAnswer(middleClassQ, 'nobles and priests'), false);

    // Three civilizations order independence
    const civilizationsQ = SHIZA_HISTORY_LESSON.questions.find(q => q.id === 'g6-hist-part2-qa-2')!;
    assert.equal(checkHistoryAnswer(civilizationsQ, 'Sumer, Babylon, and Assyria'), true);
    assert.equal(checkHistoryAnswer(civilizationsQ, 'Babylon, Sumer, and Assyria'), true);
    assert.equal(checkHistoryAnswer(civilizationsQ, 'Assyria, Babylon, Sumer'), true);
    assert.equal(checkHistoryAnswer(civilizationsQ, 'Sumerians, Babylonians, and Assyrians'), true);
    assert.equal(checkHistoryAnswer(civilizationsQ, 'Egypt, Greece, Rome'), false);

    // Prominent deities order independence
    const deitiesQ = SHIZA_HISTORY_LESSON.questions.find(q => q.id === 'g6-hist-part3-qa-7')!;
    assert.equal(checkHistoryAnswer(deitiesQ, 'Brahma, Vishnu, Shiva'), true);
    assert.equal(checkHistoryAnswer(deitiesQ, 'Brahma (the Creator), Vishnu (the Preserver), and Shiva / Rudra (the Destroyer).'), true);
    assert.equal(checkHistoryAnswer(deitiesQ, 'Vishnu, Shiva, Brahma'), true);
    assert.equal(checkHistoryAnswer(deitiesQ, 'Indra, Agni, Varuna'), false);

    // Ashramas list
    const ashramasQ = SHIZA_HISTORY_LESSON.questions.find(q => q.id === 'g6-hist-part3-qa-6')!;
    assert.equal(checkHistoryAnswer(ashramasQ, 'Brahmacharya, Grihastha, Vanaprastha, Sanyasa'), true);
    assert.equal(checkHistoryAnswer(ashramasQ, 'Brahmacharya, Grihastha, Vanaprastha, and Sanyasa.'), true);

    // A learner who writes the teacher's list as one flowing sentence still matches.
    const functionsQ = SHIZA_HISTORY_LESSON.questions.find(q => q.id === 'g6-hist-part1-qa-2')!;
    assert.equal(
      checkHistoryAnswer(
        functionsQ,
        'The primary functions essential for village welfare include: Providing clean drinking water and sanitation facilities. Registering and maintaining vital statistics (birth and death records). Managing the day-to-day civic administration of the village. Upkeep and maintenance of general village infrastructure.'
      ),
      true
    );
  });

  test('manages History progress in local storage with validation and session support', () => {
    assert.equal(getHistoryStorageKey('shiza'), 'academy_history_shiza_v1');
    assert.equal(getHistoryStorageKey('fazia'), 'academy_history_fazia_v1');

    // Initially clean
    const initial = loadHistoryProgress('shiza');
    assert.equal(initial.studentId, 'shiza');
    assert.equal(initial.lessonId, 'history-grade-6-compendium');
    assert.equal(initial.practice, null);
    assert.equal(initial.exam, null);
    assert.deepEqual(initial.reviewQuestionIds, []);

    // Save a valid practice session
    const practiceResult: HistoryResult = {
      mode: 'practice',
      completedAt: new Date().toISOString(),
      answers: [
        { questionId: 'g6-hist-part1-qa-1', answer: 'Village administrative committee', correct: true },
        { questionId: 'g6-hist-part1-qa-2', answer: 'Water and sanitation', correct: false }
      ]
    };
    const saved = saveHistoryResult('shiza', practiceResult);
    assert.ok(saved);
    assert.deepEqual(saved.practice?.answers, practiceResult.answers);
    assert.deepEqual(saved.reviewQuestionIds, ['g6-hist-part1-qa-2']);

    // Reload matches saved state
    const reloaded = loadHistoryProgress('shiza');
    assert.deepEqual(reloaded.reviewQuestionIds, ['g6-hist-part1-qa-2']);

    // Answering correctly clears review ID under policy 'practice-or-exam-correct'
    const cleared = updateHistoryReviewQuestionIds(
      reloaded.reviewQuestionIds,
      [{ questionId: 'g6-hist-part1-qa-2', answer: 'Providing clean drinking water and sanitation facilities', correct: true }],
      'practice',
      false
    );
    assert.deepEqual(cleared, []);

    // Full exam validation
    const fullExamAnswers = SHIZA_HISTORY_LESSON.questions.map(q => ({
      questionId: q.id,
      answer: q.answer,
      correct: true
    }));
    const examResult: HistoryResult = {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      answers: fullExamAnswers
    };
    const savedExam = saveHistoryResult('shiza', examResult);
    assert.ok(savedExam);
    assert.equal(savedExam.exam?.answers.length, 33);

    // Rejection of invalid progress
    assert.equal(isValidHistoryProgress(null, 'shiza'), false);
    assert.equal(isValidHistoryProgress({}, 'shiza'), false);
    assert.equal(isValidHistoryProgress({ studentId: 'shiza', lessonId: 'wrong-id' }, 'shiza'), false);
    assert.equal(isValidHistoryProgress({ studentId: 'shiza', lessonId: 'history-grade-6-compendium', practice: { mode: 'invalid' } }, 'shiza'), false);
  });
});
