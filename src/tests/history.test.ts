import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
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

    // Cards check (12 cards total across sections)
    assert.equal(SHIZA_HISTORY_LESSON.cards.length, 12);
    const cardSectionCounts = HISTORY_SECTIONS.map(section =>
      SHIZA_HISTORY_LESSON.cards.filter(c => c.section === section.id).length
    );
    assert.deepEqual(cardSectionCounts, [4, 4, 4]);

    // Prompt and answer checks
    for (const q of SHIZA_HISTORY_LESSON.questions) {
      assert.ok(q.prompt.length > 0, `Question ${q.id} prompt is empty`);
      assert.ok(q.answer.length > 0, `Question ${q.id} answer is empty`);
      assert.ok(q.markingCriteria.length > 0, `Question ${q.id} markingCriteria is empty`);
      assert.ok(q.explanation.length > 0, `Question ${q.id} explanation is empty`);
      assert.equal(checkHistoryAnswer(q, q.answer), true, `Question ${q.id} failed checking its own answer: ${q.answer}`);
      assert.equal(checkHistoryAnswer(q, ''), false, `Question ${q.id} accepted empty answer`);
      assert.equal(checkHistoryAnswer(q, '   '), false, `Question ${q.id} accepted whitespace-only answer`);
    }

    // Availability checks
    assert.throws(() => getHistoryLesson('fazia'), /History is not available for Grade 2/);
    assert.equal(getHistoryLessonForGrade(2), undefined);
    assert.equal(getHistoryLessonForGrade(1), undefined);
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
    assert.equal(checkHistoryAnswer(civilizationsQ, 'Sumerian, Babylonian, Assyrian'), true);
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

    // Rigveda definition
    const rigvedaQ = SHIZA_HISTORY_LESSON.questions.find(q => q.id === 'g6-hist-part3-qa-2')!;
    assert.equal(checkHistoryAnswer(rigvedaQ, rigvedaQ.answer), true);
    assert.equal(
      checkHistoryAnswer(
        rigvedaQ,
        'It is the oldest Vedic text, composed in the Early Vedic period, containing 1,028 sacred hymns (suktas) and mantras addressed to nature gods.'
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
