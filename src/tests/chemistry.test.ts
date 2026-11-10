import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkChemistryAnswer,
  getChemistryLesson,
  getChemistryLessonForGrade,
  normalizeChemistryAnswer,
  CHEMISTRY_SECTIONS,
  SHIZA_CHEMISTRY_LESSON
} from '../data/chemistry';
import {
  getChemistryStorageKey,
  ChemistryResult,
  isValidChemistryProgress,
  loadChemistryProgress,
  saveChemistryResult
} from '../utils/chemistryStorage';

import { installMockLocalStorage } from './helpers/storage';

const mockStorage = installMockLocalStorage();

describe('Shiza Grade 6 Chemistry curriculum & revision notes coverage', () => {
  beforeEach(() => mockStorage.clear());

  test('covers all 3 chapters and 50 questions from the supplied revision notes and question bank', () => {
    assert.equal(getChemistryLesson('shiza'), SHIZA_CHEMISTRY_LESSON);
    assert.equal(getChemistryLessonForGrade(6), SHIZA_CHEMISTRY_LESSON);
    assert.equal(SHIZA_CHEMISTRY_LESSON.grade, 6);
    assert.equal(SHIZA_CHEMISTRY_LESSON.questions.length, 50);

    // Section breakdown: [introduction: 7, matter: 14, elements-and-compounds: 29]
    const sectionCounts = CHEMISTRY_SECTIONS.map(section =>
      SHIZA_CHEMISTRY_LESSON.questions.filter(q => q.section === section.id).length
    );
    assert.deepEqual(sectionCounts, [7, 14, 29]);

    // Unique IDs
    const ids = SHIZA_CHEMISTRY_LESSON.questions.map(q => q.id);
    assert.equal(new Set(ids).size, 50);

    // Cards check (5 per chapter, 15 total)
    assert.equal(SHIZA_CHEMISTRY_LESSON.cards.length, 15);
    const cardSectionCounts = CHEMISTRY_SECTIONS.map(section =>
      SHIZA_CHEMISTRY_LESSON.cards.filter(c => c.section === section.id).length
    );
    assert.deepEqual(cardSectionCounts, [5, 5, 5]);

    // Prompt and answer checks
    for (const q of SHIZA_CHEMISTRY_LESSON.questions) {
      assert.ok(q.prompt.length > 0, `Question ${q.id} prompt is empty`);
      assert.ok(q.answer.length > 0, `Question ${q.id} answer is empty`);
      assert.ok(q.markingCriteria.length > 0, `Question ${q.id} markingCriteria is empty`);
      assert.ok(q.explanation.length > 0, `Question ${q.id} explanation is empty`);
      assert.equal(checkChemistryAnswer(q, q.answer), true, `Question ${q.id} failed checking its own answer: ${q.answer}`);
      assert.equal(checkChemistryAnswer(q, ''), false, `Question ${q.id} accepted empty answer`);
      assert.equal(checkChemistryAnswer(q, '   '), false, `Question ${q.id} accepted whitespace-only answer`);
    }

    // Availability checks
    assert.throws(() => getChemistryLesson('fazia'), /Chemistry is not available for Grade 2/);
    assert.equal(getChemistryLessonForGrade(2), undefined);
    assert.equal(getChemistryLessonForGrade(1), undefined);
  });

  test('normalizes answers and accepts valid aliases and chemical formulas', () => {
    assert.equal(normalizeChemistryAnswer('  Mercury (Hg).  '), 'mercury (hg)');
    assert.equal(normalizeChemistryAnswer('Copper & Zinc!'), 'copper and zinc');
    assert.equal(normalizeChemistryAnswer('Sodium, Potassium, and Lithium.'), 'sodium, potassium and lithium');
    assert.equal(normalizeChemistryAnswer('1:8'), '1:8');

    // Mercury identification
    const mercuryQ = SHIZA_CHEMISTRY_LESSON.questions.find(q => q.id === 'g6-chem-ch3-qa-5')!;
    assert.equal(checkChemistryAnswer(mercuryQ, 'Mercury'), true);
    assert.equal(checkChemistryAnswer(mercuryQ, 'mercury'), true);
    assert.equal(checkChemistryAnswer(mercuryQ, 'Hg'), true);
    assert.equal(checkChemistryAnswer(mercuryQ, 'Mercury (Hg)'), true);
    assert.equal(checkChemistryAnswer(mercuryQ, 'Iron'), false);

    // Soft alkali metals (including order permutations and symbol combinations)
    const softMetalsQ = SHIZA_CHEMISTRY_LESSON.questions.find(q => q.id === 'g6-chem-ch3-qa-6')!;
    assert.equal(checkChemistryAnswer(softMetalsQ, 'Sodium (Na) and Potassium (K)'), true);
    assert.equal(checkChemistryAnswer(softMetalsQ, 'Sodium and Potassium'), true);
    assert.equal(checkChemistryAnswer(softMetalsQ, 'Potassium and Sodium'), true);
    assert.equal(checkChemistryAnswer(softMetalsQ, 'Potassium, Sodium'), true);
    assert.equal(checkChemistryAnswer(softMetalsQ, 'Potassium, sodium'), true);
    assert.equal(checkChemistryAnswer(softMetalsQ, 'Na and K'), true);
    assert.equal(checkChemistryAnswer(softMetalsQ, 'Na, K'), true);
    assert.equal(checkChemistryAnswer(softMetalsQ, 'K, Na'), true);
    assert.equal(checkChemistryAnswer(softMetalsQ, 'K and Na'), true);

    // Bromine liquid non-metal
    const bromineQ = SHIZA_CHEMISTRY_LESSON.questions.find(q => q.id === 'g6-chem-ch3-qa-10')!;
    assert.equal(checkChemistryAnswer(bromineQ, 'Bromine'), true);
    assert.equal(checkChemistryAnswer(bromineQ, 'Bromine (Br)'), true);
    assert.equal(checkChemistryAnswer(bromineQ, 'Br'), true);

    // Brass alloy constituents (order independent)
    const brassQ = SHIZA_CHEMISTRY_LESSON.questions.find(q => q.id === 'g6-chem-ch3-qa-11')!;
    assert.equal(checkChemistryAnswer(brassQ, 'Copper and Zinc'), true);
    assert.equal(checkChemistryAnswer(brassQ, 'Copper (Cu) and Zinc (Zn)'), true);
    assert.equal(checkChemistryAnswer(brassQ, 'Cu and Zn'), true);
    assert.equal(checkChemistryAnswer(brassQ, 'Zinc and Copper'), true);
    assert.equal(checkChemistryAnswer(brassQ, 'Zinc, Copper'), true);
    assert.equal(checkChemistryAnswer(brassQ, 'Zn, Cu'), true);
    assert.equal(checkChemistryAnswer(brassQ, 'Zn and Cu'), true);

    // Carbon allotropes order independence
    const carbonFormsQ = SHIZA_CHEMISTRY_LESSON.questions.find(q => q.id === 'g6-chem-ch3-qa-12')!;
    assert.equal(checkChemistryAnswer(carbonFormsQ, 'Charcoal, Coal, Diamond, and Graphite'), true);
    assert.equal(checkChemistryAnswer(carbonFormsQ, 'Coal, charcoal, diamond, graphite'), true);
    assert.equal(checkChemistryAnswer(carbonFormsQ, 'Diamond, graphite, coal, charcoal'), true);

    // Branches of science order independence
    const scienceQ = SHIZA_CHEMISTRY_LESSON.questions.find(q => q.id === 'g6-chem-ch1-qa-1')!;
    assert.equal(checkChemistryAnswer(scienceQ, 'Physics, Chemistry, and Biology'), true);
    assert.equal(checkChemistryAnswer(scienceQ, 'Physics, Biology, Chemistry'), true);
    assert.equal(checkChemistryAnswer(scienceQ, 'Biology, Physics, Chemistry'), true);

    // Classifications & hyphen variants
    const metalsClassQ = SHIZA_CHEMISTRY_LESSON.questions.find(q => q.id === 'g6-chem-ch3-qa-13')!;
    assert.equal(checkChemistryAnswer(metalsClassQ, 'Metals'), true);
    assert.equal(checkChemistryAnswer(metalsClassQ, 'All metals'), true);
    assert.equal(checkChemistryAnswer(metalsClassQ, 'All are metals'), true);
    assert.equal(checkChemistryAnswer(metalsClassQ, 'They are metals'), true);

    const nonMetalsClassQ = SHIZA_CHEMISTRY_LESSON.questions.find(q => q.id === 'g6-chem-ch3-qa-14')!;
    assert.equal(checkChemistryAnswer(nonMetalsClassQ, 'Non-Metals'), true);
    assert.equal(checkChemistryAnswer(nonMetalsClassQ, 'non metals'), true);
    assert.equal(checkChemistryAnswer(nonMetalsClassQ, 'non metal'), true);
    assert.equal(checkChemistryAnswer(nonMetalsClassQ, 'nonmetals'), true);
    assert.equal(checkChemistryAnswer(nonMetalsClassQ, 'All non-metals'), true);
    assert.equal(checkChemistryAnswer(nonMetalsClassQ, 'All non metals'), true);
    assert.equal(checkChemistryAnswer(nonMetalsClassQ, 'They are non-metals'), true);

    const metalloidsClassQ = SHIZA_CHEMISTRY_LESSON.questions.find(q => q.id === 'g6-chem-ch3-qa-15')!;
    assert.equal(checkChemistryAnswer(metalloidsClassQ, 'Metalloids'), true);
    assert.equal(checkChemistryAnswer(metalloidsClassQ, 'All metalloids'), true);
    assert.equal(checkChemistryAnswer(metalloidsClassQ, 'All are metalloids'), true);
    assert.equal(checkChemistryAnswer(metalloidsClassQ, 'They are metalloids'), true);

    // Water mass ratio
    const ratioQ = SHIZA_CHEMISTRY_LESSON.questions.find(q => q.id === 'g6-chem-ch3-qa-26')!;
    assert.equal(checkChemistryAnswer(ratioQ, '1:8'), true);
    assert.equal(checkChemistryAnswer(ratioQ, '1 to 8'), true);
    assert.equal(checkChemistryAnswer(ratioQ, '1 : 8'), true);
    assert.equal(checkChemistryAnswer(ratioQ, '1:8 by mass'), true);
    assert.equal(checkChemistryAnswer(ratioQ, '1:8 ratio'), true);
    assert.equal(checkChemistryAnswer(ratioQ, 'ratio of 1:8'), true);
    assert.equal(checkChemistryAnswer(ratioQ, '1 is to 8'), true);
    assert.equal(checkChemistryAnswer(ratioQ, '1/8'), true);
    assert.equal(checkChemistryAnswer(ratioQ, '8:1'), false); // Ratio order matters!

    // Pesticide malathion
    const pesticideQ = SHIZA_CHEMISTRY_LESSON.questions.find(q => q.id === 'g6-chem-ch1-qa-4')!;
    assert.equal(checkChemistryAnswer(pesticideQ, 'Malathion'), true);

    // Food preservatives
    const preservativeQ = SHIZA_CHEMISTRY_LESSON.questions.find(q => q.id === 'g6-chem-ch1-qa-5')!;
    assert.equal(checkChemistryAnswer(preservativeQ, 'Benzoic acid and Sodium bisulphite'), true);
    assert.equal(checkChemistryAnswer(preservativeQ, 'Benzoic acid, Sodium bisulphite'), true);
    assert.equal(checkChemistryAnswer(preservativeQ, 'Sodium bisulphite and Benzoic acid'), true);

    // Noble gases give reasons
    const lampQ = SHIZA_CHEMISTRY_LESSON.questions.find(q => q.id === 'g6-chem-ch3-qa-21')!;
    assert.equal(checkChemistryAnswer(lampQ, 'Argon and neon are chemically inert. When the tungsten filament glows at extremely high temperatures, these gases prevent the filament from oxidizing or burning out'), true);
    assert.equal(checkChemistryAnswer(lampQ, 'They are chemically inert. When the tungsten filament glows at extremely high temperatures, these gases prevent the filament from oxidizing or burning out.'), true);
  });
});

describe('Chemistry Progress Storage & Isolation', () => {
  beforeEach(() => mockStorage.clear());

  test('loads empty progress when no data is saved', () => {
    const progress = loadChemistryProgress('shiza');
    assert.equal(progress.studentId, 'shiza');
    assert.equal(progress.lessonId, SHIZA_CHEMISTRY_LESSON.id);
    assert.equal(progress.practice, null);
    assert.equal(progress.exam, null);
    assert.deepEqual(progress.reviewQuestionIds, []);
  });

  test('saves and reloads a valid full exam result', () => {
    const examResult: ChemistryResult = {
      mode: 'exam',
      completedAt: '2026-11-06T10:00:00Z',
      answers: SHIZA_CHEMISTRY_LESSON.questions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 0 ? 'Wrong answer' : q.answer,
        correct: idx !== 0
      }))
    };

    const saved = saveChemistryResult('shiza', examResult);
    assert.ok(saved);
    assert.equal(saved.exam?.completedAt, '2026-11-06T10:00:00Z');
    assert.deepEqual(saved.reviewQuestionIds, [SHIZA_CHEMISTRY_LESSON.questions[0].id]);

    const reloaded = loadChemistryProgress('shiza');
    assert.equal(reloaded.exam?.answers.length, 50);
    assert.equal(reloaded.reviewQuestionIds.length, 1);
  });

  test('saves and reloads a section-specific exam result', () => {
    const sectionQuestions = SHIZA_CHEMISTRY_LESSON.questions.filter(q => q.section === 'introduction');
    const examResult: ChemistryResult = {
      mode: 'exam',
      section: 'introduction',
      completedAt: '2026-11-06T11:00:00Z',
      answers: sectionQuestions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 0 ? 'Incorrect' : q.answer,
        correct: idx !== 0
      }))
    };

    const saved = saveChemistryResult('shiza', examResult);
    assert.ok(saved);
    assert.equal(saved.exam?.section, 'introduction');
    assert.equal(saved.exam?.answers.length, 7);
    assert.deepEqual(saved.reviewQuestionIds, [sectionQuestions[0].id]);
  });

  test('section exams update reviewQuestionIds: remove newly correct and add newly missed', () => {
    const ch1Questions = SHIZA_CHEMISTRY_LESSON.questions.filter(q => q.section === 'introduction');

    // First exam: miss Q1
    saveChemistryResult('shiza', {
      mode: 'exam',
      section: 'introduction',
      completedAt: '2026-11-06T11:00:00Z',
      answers: ch1Questions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 0 ? 'Wrong' : q.answer,
        correct: idx !== 0
      }))
    });
    assert.deepEqual(loadChemistryProgress('shiza').reviewQuestionIds, [ch1Questions[0].id]);

    // Second exam: pass Q1, miss Q2
    saveChemistryResult('shiza', {
      mode: 'exam',
      section: 'introduction',
      completedAt: '2026-11-06T12:00:00Z',
      answers: ch1Questions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 1 ? 'Wrong' : q.answer,
        correct: idx !== 1
      }))
    });
    assert.deepEqual(loadChemistryProgress('shiza').reviewQuestionIds, [ch1Questions[1].id]);
  });

  test('assisted correct answers in section exam do not clear review questions', () => {
    const ch1Questions = SHIZA_CHEMISTRY_LESSON.questions.filter(q => q.section === 'introduction');

    // Seed with Q1 in review
    saveChemistryResult('shiza', {
      mode: 'exam',
      section: 'introduction',
      completedAt: '2026-11-06T11:00:00Z',
      answers: ch1Questions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 0 ? 'Wrong' : q.answer,
        correct: idx !== 0
      }))
    });

    // Retake where Q1 is answered correctly but assisted
    saveChemistryResult('shiza', {
      mode: 'exam',
      section: 'introduction',
      completedAt: '2026-11-06T12:00:00Z',
      answers: ch1Questions.map((q, idx) => ({
        questionId: q.id,
        answer: q.answer,
        correct: true,
        assistance: idx === 0 ? ['hint' as const] : undefined
      }))
    });

    // Q1 should NOT be cleared because it was assisted
    assert.deepEqual(loadChemistryProgress('shiza').reviewQuestionIds, [ch1Questions[0].id]);
  });

  test('full exams retain assisted correct misses, clear unaided correct answers, and add new misses', () => {
    // 1. Initial exam: miss Q0
    saveChemistryResult('shiza', {
      mode: 'exam',
      completedAt: '2026-11-06T10:00:00Z',
      answers: SHIZA_CHEMISTRY_LESSON.questions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 0 ? 'Wrong' : q.answer,
        correct: idx !== 0
      }))
    });
    assert.deepEqual(loadChemistryProgress('shiza').reviewQuestionIds, [SHIZA_CHEMISTRY_LESSON.questions[0].id]);

    // 2. Next exam: Q0 correct with assistance; Q1 missed
    saveChemistryResult('shiza', {
      mode: 'exam',
      completedAt: '2026-11-06T11:00:00Z',
      answers: SHIZA_CHEMISTRY_LESSON.questions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 1 ? 'Wrong' : q.answer,
        correct: idx !== 1,
        assistance: idx === 0 ? ['answer-revealed' as const] : undefined
      }))
    });
    assert.deepEqual(loadChemistryProgress('shiza').reviewQuestionIds, [
      SHIZA_CHEMISTRY_LESSON.questions[0].id,
      SHIZA_CHEMISTRY_LESSON.questions[1].id
    ]);

    // 3. Final exam: Q0 unaided correct; Q1 still wrong
    saveChemistryResult('shiza', {
      mode: 'exam',
      completedAt: '2026-11-06T12:00:00Z',
      answers: SHIZA_CHEMISTRY_LESSON.questions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 1 ? 'Wrong' : q.answer,
        correct: idx !== 1
      }))
    });
    assert.deepEqual(loadChemistryProgress('shiza').reviewQuestionIds, [SHIZA_CHEMISTRY_LESSON.questions[1].id]);
  });

  test('isolates progress by storage key', () => {
    assert.equal(getChemistryStorageKey('shiza'), 'academy_chemistry_shiza_v1');
    assert.equal(getChemistryStorageKey('fazia'), 'academy_chemistry_fazia_v1');
  });

  test('safely handles non-Grade-6 learner without crashing', () => {
    assert.equal(loadChemistryProgress('fazia').practice, null);
    const result: ChemistryResult = {
      mode: 'practice',
      completedAt: '2026-11-06T10:00:00Z',
      answers: [{ questionId: 'g6-chem-ch1-qa-1', answer: 'Science', correct: true }]
    };
    assert.equal(saveChemistryResult('fazia', result), null);
  });

  test('rejects malformed progress safely', () => {
    assert.equal(isValidChemistryProgress(null, 'shiza'), false);
    assert.equal(isValidChemistryProgress({}, 'shiza'), false);
    assert.equal(isValidChemistryProgress({ studentId: 'wrong' }, 'shiza'), false);
    assert.equal(isValidChemistryProgress({ studentId: 'shiza', lessonId: 'wrong' }, 'shiza'), false);
  });
});
