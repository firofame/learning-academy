import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkMalayalamAnswer,
  FAZIA_MALAYALAM_LESSON,
  getMalayalamLesson,
  MALAYALAM_SECTIONS
} from '../data/malayalam';
import { getMalayalamExamDateLabel } from '../components/MalayalamView';
import {
  getMalayalamStorageKey,
  loadMalayalamProgress,
  MalayalamResult,
  saveMalayalamResult
} from '../utils/malayalamStorage';

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

describe('Fazia Grade 2 Malayalam exam portions', () => {
  beforeEach(() => mockStorage.clear());

  test('covers all seven provided sections and 77 practice questions', () => {
    assert.equal(getMalayalamLesson('fazia').grade, 2);
    assert.equal(FAZIA_MALAYALAM_LESSON.questions.length, 77);
    assert.deepEqual(
      MALAYALAM_SECTIONS.map(section =>
        FAZIA_MALAYALAM_LESSON.questions.filter(question => question.section === section.id).length
      ),
      [15, 10, 15, 9, 17, 4, 7]
    );
    for (const question of FAZIA_MALAYALAM_LESSON.questions) {
      assert.ok(question.prompt.length > 0);
      assert.ok(question.answer.length > 0);
      assert.equal(checkMalayalamAnswer(question, question.answer), true);
      assert.equal(checkMalayalamAnswer(question, ''), false);
    }
    assert.throws(() => getMalayalamLesson('shiza'), /not available/);
  });

  test('two-word questions accept either order but require both distinct examples', () => {
    const question = FAZIA_MALAYALAM_LESSON.questions.find(entry => entry.kind === 'pair');
    assert.ok(question && question.kind === 'pair');
    assert.equal(
      checkMalayalamAnswer(question, `${question.answerWords[1]} ${question.answerWords[0]}`),
      true
    );
    assert.equal(checkMalayalamAnswer(question, question.answerWords[0]), false);
    assert.equal(
      checkMalayalamAnswer(question, `${question.answerWords[0]}, ${question.answerWords[0]}`),
      false
    );
  });

  test('text answers normalize Unicode composition and surrounding punctuation', () => {
    const question = FAZIA_MALAYALAM_LESSON.questions.find(entry => entry.answer === 'മുയൽ');
    assert.ok(question);
    assert.equal(checkMalayalamAnswer(question, `${'മുയൽ'.normalize('NFD')}.`), true);
    assert.equal(checkMalayalamAnswer(question, 'മാൻ'), false);
  });

  test('shows the exam as tomorrow for the supplied current date', () => {
    assert.equal(
      getMalayalamExamDateLabel('2026-11-05', new Date(2026, 10, 4)),
      'Exam tomorrow · Thursday, November 5, 2026'
    );
  });

  test('saves exam results separately and clears missed questions after correct practice', () => {
    const firstQuestion = FAZIA_MALAYALAM_LESSON.questions[0];
    const completedAt = '2026-11-04T10:00:00.000Z';
    const exam: MalayalamResult = {
      mode: 'exam',
      completedAt,
      answers: FAZIA_MALAYALAM_LESSON.questions.map(question => {
        const answer = question.id === firstQuestion.id ? 'തെറ്റായ ഉത്തരം' : question.answer;
        return {
          questionId: question.id,
          answer,
          correct: checkMalayalamAnswer(question, answer)
        };
      })
    };

    const afterExam = saveMalayalamResult('fazia', exam);
    assert.ok(afterExam);
    assert.deepEqual(afterExam.reviewQuestionIds, [firstQuestion.id]);
    assert.equal(loadMalayalamProgress('fazia').exam?.answers.length, 77);
    assert.equal(getMalayalamStorageKey('fazia'), 'academy_malayalam_fazia_v1');

    const practice: MalayalamResult = {
      mode: 'practice',
      completedAt,
      answers: [{
        questionId: firstQuestion.id,
        answer: firstQuestion.answer,
        correct: true
      }]
    };
    const afterPractice = saveMalayalamResult('fazia', practice);
    assert.ok(afterPractice);
    assert.deepEqual(afterPractice.reviewQuestionIds, []);
    assert.ok(afterPractice.exam, 'practice does not overwrite the saved exam');
  });

  test('rejects an incomplete mock exam', () => {
    const result: MalayalamResult = {
      mode: 'exam',
      completedAt: '2026-11-04T10:00:00.000Z',
      answers: [{
        questionId: FAZIA_MALAYALAM_LESSON.questions[0].id,
        answer: FAZIA_MALAYALAM_LESSON.questions[0].answer,
        correct: true
      }]
    };
    assert.equal(saveMalayalamResult('fazia', result), null);
  });

  test('persists trusted Gemini feedback for equivalent synonym answers', () => {
    const question = FAZIA_MALAYALAM_LESSON.questions.find(entry => entry.id === 'g2-mal-synonym-1')!;
    const result: MalayalamResult = {
      mode: 'practice',
      completedAt: '2026-11-04T10:00:00.000Z',
      answers: [{
        questionId: question.id,
        answer: 'മരുന്നിന് തുല്യമായ പദം',
        correct: true,
        aiChecked: true,
        aiFeedback: 'നല്ല പകരം പദം!'
      }]
    };
    const saved = saveMalayalamResult('fazia', result);
    assert.ok(saved);
    assert.equal(loadMalayalamProgress('fazia').practice?.answers[0].aiChecked, true);
    assert.equal(loadMalayalamProgress('fazia').practice?.answers[0].aiFeedback, 'നല്ല പകരം പദം!');
  });
});
