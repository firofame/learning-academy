import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkBiologyAnswer,
  getBiologyLesson,
  getBiologyLessonForGrade,
  normalizeBiologyAnswer,
  BIOLOGY_SECTIONS,
  SHIZA_BIOLOGY_LESSON
} from '../data/biology';
import {
  getBiologyStorageKey,
  BiologyResult,
  isValidBiologyProgress,
  loadBiologyProgress,
  saveBiologyResult
} from '../utils/biologyStorage';

class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const mockStorage = new MockLocalStorage();
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: mockStorage },
  configurable: true
});
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  configurable: true
});

describe('Shiza Grade 6 Biology curriculum & study guide coverage', () => {
  beforeEach(() => mockStorage.clear());

  test('covers all 4 chapters and 46 questions from the supplied comprehensive study guide', () => {
    assert.equal(getBiologyLesson('shiza'), SHIZA_BIOLOGY_LESSON);
    assert.equal(getBiologyLessonForGrade(6), SHIZA_BIOLOGY_LESSON);
    assert.equal(SHIZA_BIOLOGY_LESSON.grade, 6);
    assert.equal(SHIZA_BIOLOGY_LESSON.questions.length, 46);

    // Section breakdown: [leaf: 12, flower: 13, cell: 11, digestive-system: 10]
    const sectionCounts = BIOLOGY_SECTIONS.map(section =>
      SHIZA_BIOLOGY_LESSON.questions.filter(q => q.section === section.id).length
    );
    assert.deepEqual(sectionCounts, [12, 13, 11, 10]);

    // Unique IDs
    const ids = SHIZA_BIOLOGY_LESSON.questions.map(q => q.id);
    assert.equal(new Set(ids).size, 46);

    // Cards check (3 per chapter)
    assert.equal(SHIZA_BIOLOGY_LESSON.cards.length, 12);
    const cardSectionCounts = BIOLOGY_SECTIONS.map(section =>
      SHIZA_BIOLOGY_LESSON.cards.filter(c => c.section === section.id).length
    );
    assert.deepEqual(cardSectionCounts, [3, 3, 3, 3]);

    // Prompt and answer checks
    for (const q of SHIZA_BIOLOGY_LESSON.questions) {
      assert.ok(q.prompt.length > 0, `Question ${q.id} prompt is empty`);
      assert.ok(q.answer.length > 0, `Question ${q.id} answer is empty`);
      assert.ok(q.markingCriteria.length > 0, `Question ${q.id} markingCriteria is empty`);
      assert.ok(q.explanation.length > 0, `Question ${q.id} explanation is empty`);
      assert.equal(checkBiologyAnswer(q, q.answer), true, `Question ${q.id} failed checking its own answer: ${q.answer}`);
      assert.equal(checkBiologyAnswer(q, ''), false, `Question ${q.id} accepted empty answer`);
      assert.equal(checkBiologyAnswer(q, '   '), false, `Question ${q.id} accepted whitespace-only answer`);
    }

    // Availability checks
    assert.throws(() => getBiologyLesson('fazia'), /Biology is not available for Grade 2/);
    assert.equal(getBiologyLessonForGrade(2), undefined);
    assert.equal(getBiologyLessonForGrade(1), undefined);
  });

  test('cell wall curriculum accurately states occurrence across plants, fungi, and bacteria without plant-only claims', () => {
    const card = SHIZA_BIOLOGY_LESSON.cards.find(c => c.id === 'g6-bio-card-cell-wall-membrane')!;
    assert.ok(card);
    assert.doesNotMatch(card.memoryTip, /plant-only/i);
    assert.match(card.memoryTip, /found in plants, fungi, and bacteria/i);
    assert.match(card.answer, /found in plants, fungi, and bacteria/i);

    const qa = SHIZA_BIOLOGY_LESSON.questions.find(q => q.id === 'g6-bio-ch3-qa-6')!;
    assert.ok(qa);
    assert.doesNotMatch(qa.explanation, /plant-only/i);
    assert.match(qa.explanation, /found in plants, fungi, and bacteria/i);
    assert.doesNotMatch(qa.markingCriteria, /plant-only|plant\/fungi only/i);
    assert.match(qa.markingCriteria, /found in plants\/fungi\/bacteria/i);
    assert.match(qa.answer, /plant cells, bacteria, and fungi/i);
  });

  test('normalizes answers and accepts valid aliases', () => {
    assert.equal(normalizeBiologyAnswer('  Nerium oleander.  '), 'nerium oleander');
    assert.equal(normalizeBiologyAnswer('Pitcher plant & Venus flytrap!'), 'pitcher plant and venus flytrap');
    assert.equal(normalizeBiologyAnswer('Trypsin, Lipase & Amylase.'), 'trypsin, lipase and amylase');
    assert.equal(normalizeBiologyAnswer('Trypsin, Lipase, and Amylase'), 'trypsin, lipase and amylase');
    assert.equal(normalizeBiologyAnswer('host cell’s components'), "host cell's components");

    // Node question aliases
    const nodeQ = SHIZA_BIOLOGY_LESSON.questions.find(q => q.id === 'g6-bio-ch1-qa-1')!;
    assert.equal(checkBiologyAnswer(nodeQ, 'A node is the point on the stem from where a leaf arises'), true);
    assert.equal(checkBiologyAnswer(nodeQ, 'The point on the stem from where a leaf arises'), true);
    assert.equal(checkBiologyAnswer(nodeQ, 'Point on the stem from which a leaf arises'), true);

    // Aliases checks
    const whorledQ = SHIZA_BIOLOGY_LESSON.questions.find(q => q.id === 'g6-bio-ch1-qa-4')!;
    assert.equal(checkBiologyAnswer(whorledQ, 'Nerium oleander'), true);
    assert.equal(checkBiologyAnswer(whorledQ, 'Nerium'), true);
    assert.equal(checkBiologyAnswer(whorledQ, 'Oleander'), true);
    assert.equal(checkBiologyAnswer(whorledQ, 'Nerium plant'), true);
    assert.equal(checkBiologyAnswer(whorledQ, 'Rose'), false);

    const insectivorousQ = SHIZA_BIOLOGY_LESSON.questions.find(q => q.id === 'g6-bio-ch1-qa-5')!;
    assert.equal(checkBiologyAnswer(insectivorousQ, 'Pitcher plant and Venus flytrap'), true);
    assert.equal(checkBiologyAnswer(insectivorousQ, 'Venus flytrap and Pitcher plant'), true);
    assert.equal(checkBiologyAnswer(insectivorousQ, 'Pitcher plant, Venus flytrap'), true);
    assert.equal(checkBiologyAnswer(insectivorousQ, 'Pitcher plant & Venus flytrap'), true);
    assert.equal(checkBiologyAnswer(insectivorousQ, 'Pitcher plant and sundew'), true);
    assert.equal(checkBiologyAnswer(insectivorousQ, 'Sundew and Venus flytrap'), true);

    const nonLivingQ = SHIZA_BIOLOGY_LESSON.questions.find(q => q.id === 'g6-bio-ch3-qa-9')!;
    assert.equal(checkBiologyAnswer(nonLivingQ, 'Cell wall'), true);
    assert.equal(checkBiologyAnswer(nonLivingQ, 'The cell wall'), true);
    assert.equal(checkBiologyAnswer(nonLivingQ, 'cell wall.'), true);

    const lysosomesQ = SHIZA_BIOLOGY_LESSON.questions.find(q => q.id === 'g6-bio-ch3-qa-11')!;
    assert.equal(checkBiologyAnswer(lysosomesQ, "Lysosomes contain hydrolytic enzymes that digest the cell itself when damaged or injured."), true);
    assert.equal(checkBiologyAnswer(lysosomesQ, "Because they contain digestive enzymes that can burst and destroy their own cell."), true);

    const pancreaticQ = SHIZA_BIOLOGY_LESSON.questions.find(q => q.id === 'g6-bio-ch4-qa-8')!;
    assert.equal(checkBiologyAnswer(pancreaticQ, 'Trypsin, Lipase, Amylase'), true);
    assert.equal(checkBiologyAnswer(pancreaticQ, 'Trypsin, lipase and amylase'), true);
    assert.equal(checkBiologyAnswer(pancreaticQ, 'trypsin lipase amylase'), true);
    assert.equal(checkBiologyAnswer(pancreaticQ, 'Trypsin, Pancreatic Lipase, and Pancreatic Amylase'), true);
  });
});

describe('Biology Progress Storage & Isolation', () => {
  beforeEach(() => mockStorage.clear());

  test('loads empty progress when no data is saved', () => {
    const progress = loadBiologyProgress('shiza');
    assert.equal(progress.studentId, 'shiza');
    assert.equal(progress.lessonId, SHIZA_BIOLOGY_LESSON.id);
    assert.equal(progress.practice, null);
    assert.equal(progress.exam, null);
    assert.deepEqual(progress.reviewQuestionIds, []);
  });

  test('saves and reloads a valid full exam result', () => {
    const examResult: BiologyResult = {
      mode: 'exam',
      completedAt: '2026-11-06T10:00:00Z',
      answers: SHIZA_BIOLOGY_LESSON.questions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 0 ? 'Wrong answer' : q.answer,
        correct: idx !== 0
      }))
    };

    const saved = saveBiologyResult('shiza', examResult);
    assert.ok(saved);
    assert.equal(saved.exam?.completedAt, '2026-11-06T10:00:00Z');
    assert.deepEqual(saved.reviewQuestionIds, [SHIZA_BIOLOGY_LESSON.questions[0].id]);

    const loaded = loadBiologyProgress('shiza');
    assert.equal(loaded.exam?.completedAt, '2026-11-06T10:00:00Z');
    assert.deepEqual(loaded.reviewQuestionIds, [SHIZA_BIOLOGY_LESSON.questions[0].id]);
  });

  test('saves and reloads a section-specific exam result', () => {
    const leafQuestions = SHIZA_BIOLOGY_LESSON.questions.filter(q => q.section === 'leaf');
    const sectionResult: BiologyResult = {
      mode: 'exam',
      completedAt: '2026-11-06T11:00:00Z',
      section: 'leaf',
      answers: leafQuestions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 1 ? 'Wrong' : q.answer,
        correct: idx !== 1
      }))
    };

    const saved = saveBiologyResult('shiza', sectionResult);
    assert.ok(saved);
    assert.equal(saved.exam?.section, 'leaf');
    assert.deepEqual(saved.reviewQuestionIds, [leafQuestions[1].id]);
  });

  test('section exams update reviewQuestionIds: remove newly correct and add newly missed', () => {
    const leafQuestions = SHIZA_BIOLOGY_LESSON.questions.filter(q => q.section === 'leaf');

    // First attempt: miss question 0 and question 1
    const result1: BiologyResult = {
      mode: 'exam',
      completedAt: '2026-11-06T11:00:00Z',
      section: 'leaf',
      answers: leafQuestions.map((q, idx) => ({
        questionId: q.id,
        answer: (idx === 0 || idx === 1) ? 'Wrong' : q.answer,
        correct: idx !== 0 && idx !== 1
      }))
    };
    saveBiologyResult('shiza', result1);
    let current = loadBiologyProgress('shiza');
    assert.deepEqual(current.reviewQuestionIds, [leafQuestions[0].id, leafQuestions[1].id]);

    // Second attempt: get question 0 correct, miss question 1 and question 2
    const result2: BiologyResult = {
      mode: 'exam',
      completedAt: '2026-11-06T11:30:00Z',
      section: 'leaf',
      answers: leafQuestions.map((q, idx) => ({
        questionId: q.id,
        answer: (idx === 1 || idx === 2) ? 'Wrong' : q.answer,
        correct: idx !== 1 && idx !== 2
      }))
    };
    saveBiologyResult('shiza', result2);
    current = loadBiologyProgress('shiza');
    assert.deepEqual(current.reviewQuestionIds, [leafQuestions[1].id, leafQuestions[2].id]);
  });

  test('assisted correct answers in section exam do not clear review questions', () => {
    const leafQuestions = SHIZA_BIOLOGY_LESSON.questions.filter(q => q.section === 'leaf');

    // Initial missed question
    const initialResult: BiologyResult = {
      mode: 'exam',
      completedAt: '2026-11-06T11:00:00Z',
      section: 'leaf',
      answers: leafQuestions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 0 ? 'Wrong' : q.answer,
        correct: idx !== 0
      }))
    };
    saveBiologyResult('shiza', initialResult);

    // Assisted correct attempt should NOT clear the missed question
    const assistedResult: BiologyResult = {
      mode: 'exam',
      completedAt: '2026-11-06T11:30:00Z',
      section: 'leaf',
      answers: leafQuestions.map((q, idx) => ({
        questionId: q.id,
        answer: q.answer,
        correct: true,
        assistance: idx === 0 ? ['hint'] : undefined
      }))
    };
    saveBiologyResult('shiza', assistedResult);
    const progress = loadBiologyProgress('shiza');
    assert.ok(progress.reviewQuestionIds.includes(leafQuestions[0].id));
  });

  test('isolates progress by storage key', () => {
    assert.equal(getBiologyStorageKey('shiza'), 'academy_biology_shiza_v1');
    assert.equal(getBiologyStorageKey('fazia'), 'academy_biology_fazia_v1');
  });

  test('safely handles non-Grade-6 learner without crashing', () => {
    const result: BiologyResult = {
      mode: 'exam',
      completedAt: '2026-11-06T12:00:00Z',
      answers: SHIZA_BIOLOGY_LESSON.questions.map(q => ({
        questionId: q.id,
        answer: q.answer,
        correct: true
      }))
    };

    assert.equal(saveBiologyResult('fazia', result), null);
    const prog = loadBiologyProgress('fazia');
    assert.equal(prog.studentId, 'fazia');
  });

  test('rejects malformed progress safely', () => {
    assert.equal(isValidBiologyProgress(null, 'shiza'), false);
    assert.equal(isValidBiologyProgress({ studentId: 'fazia' }, 'shiza'), false);
    assert.equal(isValidBiologyProgress({ studentId: 'shiza', lessonId: 'wrong' }, 'shiza'), false);
  });
});
