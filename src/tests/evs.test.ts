import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkEvsAnswer,
  getEvsLesson,
  getEvsLessonForGrade,
  normalizeEvsAnswer,
  EVS_SECTIONS,
  FAZIA_EVS_LESSON
} from '../data/evs';
import {
  getEvsStorageKey,
  EvsResult,
  isValidEvsProgress,
  loadEvsProgress,
  saveEvsResult
} from '../utils/evsStorage';

import { installMockLocalStorage } from './helpers/storage';

const mockStorage = installMockLocalStorage();

describe('Fazia Grade 2 EVS curriculum & notebook coverage', () => {
  beforeEach(() => mockStorage.clear());

  test('covers all 5 lessons and 71 questions from the supplied primary notebook', () => {
    assert.equal(getEvsLesson('fazia'), FAZIA_EVS_LESSON);
    assert.equal(getEvsLessonForGrade(2), FAZIA_EVS_LESSON);
    assert.equal(FAZIA_EVS_LESSON.grade, 2);
    assert.equal(FAZIA_EVS_LESSON.questions.length, 71);

    // Section breakdown: [Our Food: 11, Our Clothes: 16, Our Houses: 15, Our Transport: 19, Our Festivals: 10]
    const sectionCounts = EVS_SECTIONS.map(section =>
      FAZIA_EVS_LESSON.questions.filter(q => q.section === section.id).length
    );
    assert.deepEqual(sectionCounts, [11, 16, 15, 19, 10]);

    // Unique IDs
    const ids = FAZIA_EVS_LESSON.questions.map(q => q.id);
    assert.equal(new Set(ids).size, 71);

    // Cards check
    assert.equal(FAZIA_EVS_LESSON.cards.length, 5);

    // Prompt and answer checks
    for (const q of FAZIA_EVS_LESSON.questions) {
      assert.ok(q.prompt.length > 0, `Question ${q.id} prompt is empty`);
      assert.ok(q.answer.length > 0, `Question ${q.id} answer is empty`);
      assert.equal(checkEvsAnswer(q, q.answer), true, `Question ${q.id} failed checking its own answer: ${q.answer}`);
      assert.equal(checkEvsAnswer(q, ''), false, `Question ${q.id} accepted empty answer`);
      assert.equal(checkEvsAnswer(q, '   '), false, `Question ${q.id} accepted whitespace-only answer`);
    }

    // Availability checks
    assert.throws(() => getEvsLesson('shiza'), /EVS is not available for Grade 6/);
    assert.equal(getEvsLessonForGrade(6), undefined);
    assert.equal(getEvsLessonForGrade(1), undefined);
  });

  test('normalizes answers and accepts valid aliases', () => {
    assert.equal(normalizeEvsAnswer('  Rice and Wheat.  '), 'rice and wheat');
    assert.equal(normalizeEvsAnswer('Cotton Clothes!'), 'cotton clothes');
    assert.equal(normalizeEvsAnswer('Rice & Wheat.'), 'rice and wheat');
    assert.equal(normalizeEvsAnswer('bones & muscles, ;'), 'bones and muscles');

    // Fill in blanks aliases
    const foodQ3 = FAZIA_EVS_LESSON.questions.find(q => q.id === 'g2-evs-l2-fill-3')!;
    assert.equal(checkEvsAnswer(foodQ3, 'bones and muscles'), true);
    assert.equal(checkEvsAnswer(foodQ3, 'muscles and bones'), true);
    assert.equal(checkEvsAnswer(foodQ3, 'Bones, Muscles'), true);
    assert.equal(checkEvsAnswer(foodQ3, 'bones & muscles'), true);

    const foodQ4 = FAZIA_EVS_LESSON.questions.find(q => q.id === 'g2-evs-l2-fill-4')!;
    assert.equal(checkEvsAnswer(foodQ4, 'Rice & Wheat'), true);
    assert.equal(checkEvsAnswer(foodQ4, 'Rice, wheat'), true);

    const clothesQ7 = FAZIA_EVS_LESSON.questions.find(q => q.id === 'g2-evs-l3-fill-7')!;
    assert.equal(checkEvsAnswer(clothesQ7, 'rubber and plastic'), true);
    assert.equal(checkEvsAnswer(clothesQ7, 'rubber or plastics'), true);

    const housesQ2 = FAZIA_EVS_LESSON.questions.find(q => q.id === 'g2-evs-l4-fill-2')!;
    assert.equal(checkEvsAnswer(housesQ2, 'flats, apartments'), true);
    assert.equal(checkEvsAnswer(housesQ2, 'apartments or flats'), true);

    const transportQ4 = FAZIA_EVS_LESSON.questions.find(q => q.id === 'g2-evs-l5-fill-4')!;
    assert.equal(checkEvsAnswer(transportQ4, 'Camels'), true);
    assert.equal(checkEvsAnswer(transportQ4, 'camel'), true);

    const festivalQ1 = FAZIA_EVS_LESSON.questions.find(q => q.id === 'g2-evs-l6-fill-1')!;
    assert.equal(checkEvsAnswer(festivalQ1, 'festival of colours'), true);
    assert.equal(checkEvsAnswer(festivalQ1, 'festival of colors'), true);

    const festivalQ3 = FAZIA_EVS_LESSON.questions.find(q => q.id === 'g2-evs-l6-fill-3')!;
    assert.equal(checkEvsAnswer(festivalQ3, 'semiya'), true);
    assert.equal(checkEvsAnswer(festivalQ3, 'sevvian'), true);
  });

  test('true/false and multiple-choice questions evaluate correctly', () => {
    const tfQuestion = FAZIA_EVS_LESSON.questions.find(q => q.id === 'g2-evs-l3-tf-1')!;
    assert.equal(checkEvsAnswer(tfQuestion, 'True'), true);
    assert.equal(checkEvsAnswer(tfQuestion, 'true'), true);
    assert.equal(checkEvsAnswer(tfQuestion, 'False'), false);

    const mcqQuestion = FAZIA_EVS_LESSON.questions.find(q => q.id === 'g2-evs-l4-match-1')!;
    assert.equal(checkEvsAnswer(mcqQuestion, 'is made of blocks of snow'), true);
    assert.equal(checkEvsAnswer(mcqQuestion, 'is made of canvas'), false);
  });

  test('written questions have explicit marking criteria', () => {
    const writtenQuestions = FAZIA_EVS_LESSON.questions.filter(q => q.kind === 'written');
    assert.equal(writtenQuestions.length, 19); // 5 (food) + 4 (clothes) + 5 (houses) + 5 (transport)
    for (const q of writtenQuestions) {
      assert.ok('markingCriteria' in q && q.markingCriteria.length > 0, `Written question ${q.id} missing criteria`);
    }
  });
});

describe('EVS Progress Storage & Isolation', () => {
  beforeEach(() => mockStorage.clear());

  test('loads empty progress when no data is saved', () => {
    const progress = loadEvsProgress('fazia');
    assert.equal(progress.studentId, 'fazia');
    assert.equal(progress.lessonId, FAZIA_EVS_LESSON.id);
    assert.equal(progress.practice, null);
    assert.equal(progress.exam, null);
    assert.deepEqual(progress.reviewQuestionIds, []);
  });

  test('saves and reloads a valid full exam result', () => {
    const examResult: EvsResult = {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      section: 'all',
      answers: FAZIA_EVS_LESSON.questions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 0 ? 'wrong answer' : q.answer,
        correct: idx !== 0 // first question is marked incorrect
      }))
    };

    const saved = saveEvsResult('fazia', examResult);
    assert.ok(saved);
    assert.deepEqual(saved.reviewQuestionIds, [FAZIA_EVS_LESSON.questions[0].id]);

    const reloaded = loadEvsProgress('fazia');
    assert.equal(reloaded.exam?.mode, 'exam');
    assert.equal(reloaded.exam.answers.length, 71);
    assert.deepEqual(reloaded.reviewQuestionIds, [FAZIA_EVS_LESSON.questions[0].id]);
  });

  test('saves and reloads a section-specific exam result', () => {
    const foodQuestions = FAZIA_EVS_LESSON.questions.filter(q => q.section === 'our-food');
    const sectionResult: EvsResult = {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      section: 'our-food',
      answers: foodQuestions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 1 ? 'wrong answer' : q.answer,
        correct: idx !== 1
      }))
    };

    const saved = saveEvsResult('fazia', sectionResult);
    assert.ok(saved);
    assert.deepEqual(saved.reviewQuestionIds, [foodQuestions[1].id]);
  });

  test('section exams update reviewQuestionIds: remove newly correct and add newly missed', () => {
    const foodQuestions = FAZIA_EVS_LESSON.questions.filter(q => q.section === 'our-food');
    // Step 1: Miss question 1
    saveEvsResult('fazia', {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      section: 'our-food',
      answers: foodQuestions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 1 ? 'wrong' : q.answer,
        correct: idx !== 1
      }))
    });
    assert.deepEqual(loadEvsProgress('fazia').reviewQuestionIds, [foodQuestions[1].id]);

    // Step 2: Retake section exam unaided, answering question 1 correctly, but question 2 incorrectly
    saveEvsResult('fazia', {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      section: 'our-food',
      answers: foodQuestions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 2 ? 'wrong' : q.answer,
        correct: idx !== 2
      }))
    });
    // Question 1 cleared, question 2 added
    assert.deepEqual(loadEvsProgress('fazia').reviewQuestionIds, [foodQuestions[2].id]);
  });

  test('assisted correct answers in section exam do not clear review questions', () => {
    const foodQuestions = FAZIA_EVS_LESSON.questions.filter(q => q.section === 'our-food');
    // Step 1: Miss question 1
    saveEvsResult('fazia', {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      section: 'our-food',
      answers: foodQuestions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 1 ? 'wrong' : q.answer,
        correct: idx !== 1
      }))
    });
    assert.deepEqual(loadEvsProgress('fazia').reviewQuestionIds, [foodQuestions[1].id]);

    // Step 2: Answer question 1 correctly BUT with assistance (e.g. answer-revealed)
    saveEvsResult('fazia', {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      section: 'our-food',
      answers: foodQuestions.map(q => ({
        questionId: q.id,
        answer: q.answer,
        correct: true,
        ...(q.id === foodQuestions[1].id ? { assistance: ['answer-revealed' as const] } : {})
      }))
    });
    // Question 1 remains in reviewQuestionIds because it was assisted!
    assert.deepEqual(loadEvsProgress('fazia').reviewQuestionIds, [foodQuestions[1].id]);
  });

  test('isolates progress by storage key', () => {
    assert.equal(getEvsStorageKey('fazia'), 'academy_evs_fazia_v1');
    assert.equal(getEvsStorageKey('shiza'), 'academy_evs_shiza_v1');
  });

  test('safely handles non-Grade-2 learner without crashing', () => {
    // Shiza is Grade 6: EVS is not available for her grade
    assert.equal(isValidEvsProgress({ studentId: 'shiza' }, 'shiza'), false);
    const shizaProgress = loadEvsProgress('shiza');
    assert.equal(shizaProgress.studentId, 'shiza');
    assert.equal(shizaProgress.practice, null);
    assert.equal(shizaProgress.exam, null);

    const saveResult = saveEvsResult('shiza', {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      answers: []
    });
    assert.equal(saveResult, null);
  });

  test('rejects malformed progress safely', () => {
    mockStorage.setItem(getEvsStorageKey('fazia'), '{ malformed json');
    const progress = loadEvsProgress('fazia');
    assert.equal(progress.practice, null);
    assert.equal(progress.exam, null);
  });
});
