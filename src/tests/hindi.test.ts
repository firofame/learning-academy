import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkHindiAnswer,
  getHindiLesson,
  getHindiLessonForGrade,
  HINDI_SECTIONS,
  SHIZA_HINDI_LESSON
} from '../data/hindi';
import { getHindiExamDateLabel } from '../components/HindiView';
import {
  getHindiStorageKey,
  HindiResult,
  loadHindiProgress,
  saveHindiResult
} from '../utils/hindiStorage';

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

describe('Shiza Grade 6 Hindi exam portions', () => {
  beforeEach(() => mockStorage.clear());

  test('covers all supplied revision sections with unique, checkable prompts', () => {
    assert.equal(getHindiLesson('shiza'), SHIZA_HINDI_LESSON);
    assert.equal(getHindiLessonForGrade(6), SHIZA_HINDI_LESSON);
    assert.equal(SHIZA_HINDI_LESSON.questions.length, 74);
    assert.deepEqual(
      HINDI_SECTIONS.map(section =>
        SHIZA_HINDI_LESSON.questions.filter(question => question.section === section.id).length
      ),
      [38, 20, 4, 3, 5, 3, 1]
    );
    assert.equal(new Set(SHIZA_HINDI_LESSON.questions.map(question => question.id)).size, 74);
    for (const question of SHIZA_HINDI_LESSON.questions) {
      assert.ok(question.prompt.length > 0);
      assert.ok(question.answer.length > 0);
      assert.equal(checkHindiAnswer(question, question.answer), true);
      assert.equal(checkHindiAnswer(question, ''), false);
    }
    assert.throws(() => getHindiLesson('fazia'), /not available/);
    assert.equal(getHindiLessonForGrade(3), undefined);
  });

  test('uses corrected meanings and keeps the Hindi synonym pairs complete', () => {
    const meaning = (word: string) =>
      SHIZA_HINDI_LESSON.questions.find(question =>
        question.section === 'meanings' && question.prompt.includes(`“${word}”`)
      )!;
    assert.equal(meaning('जग').answer, 'World');
    assert.equal(meaning('बिजली').answer, 'Lightning');
    assert.equal(meaning('समझदार').answer, 'Wise');
    assert.equal(checkHindiAnswer(meaning('समझदार'), 'Intelligent'), true);

    const trees = SHIZA_HINDI_LESSON.questions.find(question =>
      question.kind === 'pair' && question.prompt.includes('पेड़')
    );
    assert.ok(trees && trees.kind === 'pair');
    assert.equal(checkHindiAnswer(trees, 'तरु और वृक्ष'), true);
    assert.equal(checkHindiAnswer(trees, 'वृक्ष, वृक्ष'), false);
    assert.equal(checkHindiAnswer(trees, 'वृक्ष'), false);
  });

  test('normalizes Hindi punctuation and Unicode and labels the exam date', () => {
    const line = SHIZA_HINDI_LESSON.questions.find(question => question.id === 'g6-hin-poem-3')!;
    assert.equal(checkHindiAnswer(line, 'तेज़ कड़क हो।'), true);
    const newWord = SHIZA_HINDI_LESSON.questions.find(question => question.id === 'g6-hin-translation-5')!;
    assert.equal(checkHindiAnswer(newWord, 'ताजा'), true);
    assert.equal(
      getHindiExamDateLabel('2026-11-05', new Date(2026, 10, 4)),
      'Exam tomorrow · Thursday, November 5, 2026'
    );
  });

  test('saves exam and practice separately and revisits missed questions', () => {
    const firstQuestion = SHIZA_HINDI_LESSON.questions[0];
    const completedAt = '2026-11-04T10:00:00.000Z';
    const exam: HindiResult = {
      mode: 'exam',
      completedAt,
      answers: SHIZA_HINDI_LESSON.questions.map(question => {
        const answer = question.id === firstQuestion.id ? 'incorrect answer' : question.answer;
        return {
          questionId: question.id,
          answer,
          correct: checkHindiAnswer(question, answer)
        };
      })
    };

    const afterExam = saveHindiResult('shiza', exam);
    assert.ok(afterExam);
    assert.deepEqual(afterExam.reviewQuestionIds, [firstQuestion.id]);
    assert.equal(loadHindiProgress('shiza').exam?.answers.length, 74);
    assert.equal(getHindiStorageKey('shiza'), 'academy_hindi_shiza_v1');

    const practice: HindiResult = {
      mode: 'practice',
      completedAt,
      answers: [{
        questionId: firstQuestion.id,
        answer: firstQuestion.answer,
        correct: true
      }]
    };
    const afterPractice = saveHindiResult('shiza', practice);
    assert.ok(afterPractice);
    assert.deepEqual(afterPractice.reviewQuestionIds, []);
    assert.ok(afterPractice.exam, 'practice does not overwrite the saved exam');
  });

  test('rejects incomplete exams and retains trusted Gemini feedback for written answers', () => {
    const firstQuestion = SHIZA_HINDI_LESSON.questions[0];
    const incomplete: HindiResult = {
      mode: 'exam',
      completedAt: '2026-11-04T10:00:00.000Z',
      answers: [{
        questionId: firstQuestion.id,
        answer: firstQuestion.answer,
        correct: true
      }]
    };
    assert.equal(saveHindiResult('shiza', incomplete), null);

    const written = SHIZA_HINDI_LESSON.questions.find(question => question.id === 'g6-hin-tree-answer-1')!;
    const practice: HindiResult = {
      mode: 'practice',
      completedAt: '2026-11-04T10:00:00.000Z',
      answers: [{
        questionId: written.id,
        answer: 'पेड़ खड़े रहकर मुस्कुराते हैं',
        correct: true,
        aiChecked: true,
        aiFeedback: 'आपने सही बात याद रखी।'
      }]
    };
    const saved = saveHindiResult('shiza', practice);
    assert.ok(saved);
    assert.equal(loadHindiProgress('shiza').practice?.answers[0].aiChecked, true);
    assert.equal(loadHindiProgress('shiza').practice?.answers[0].aiFeedback, 'आपने सही बात याद रखी।');
  });
});
