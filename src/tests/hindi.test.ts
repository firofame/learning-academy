import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkHindiAnswer,
  FAZIA_HINDI_LESSON,
  FAZIA_HINDI_SECTIONS,
  getHindiLesson,
  getHindiLessonForGrade,
  HINDI_SECTIONS,
  SHIZA_HINDI_LESSON
} from '../data/hindi';
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
    assert.equal(getHindiLesson('fazia'), FAZIA_HINDI_LESSON);
    assert.equal(getHindiLessonForGrade(2), FAZIA_HINDI_LESSON);
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

  test('normalizes Hindi punctuation and Unicode', () => {
    const line = SHIZA_HINDI_LESSON.questions.find(question => question.id === 'g6-hin-poem-3')!;
    assert.equal(checkHindiAnswer(line, 'तेज़ कड़क हो।'), true);
    const newWord = SHIZA_HINDI_LESSON.questions.find(question => question.id === 'g6-hin-translation-5')!;
    assert.equal(checkHindiAnswer(newWord, 'ताजा'), true);
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

describe('Fazia Grade 2 Hindi exam portions', () => {
  beforeEach(() => mockStorage.clear());

  test('covers all 9 revision sections with unique, checkable prompts across 90 questions', () => {
    assert.equal(getHindiLesson('fazia'), FAZIA_HINDI_LESSON);
    assert.equal(getHindiLessonForGrade(2), FAZIA_HINDI_LESSON);
    assert.equal(FAZIA_HINDI_LESSON.grade, 2);
    assert.equal(FAZIA_HINDI_LESSON.questions.length, 90);
    assert.deepEqual(
      FAZIA_HINDI_SECTIONS.map(section =>
        FAZIA_HINDI_LESSON.questions.filter(question => question.section === section.id).length
      ),
      [16, 16, 6, 6, 8, 10, 10, 6, 12]
    );
    assert.equal(new Set(FAZIA_HINDI_LESSON.questions.map(question => question.id)).size, 90);

    for (const question of FAZIA_HINDI_LESSON.questions) {
      assert.ok(question.prompt.length > 0, `Question ${question.id} missing prompt`);
      assert.ok(question.answer.length > 0, `Question ${question.id} missing answer`);
      assert.equal(checkHindiAnswer(question, question.answer), true, `Question ${question.id} reference answer failed check`);
      assert.equal(checkHindiAnswer(question, ''), false);
      assert.equal(checkHindiAnswer(question, '   '), false);
    }
  });

  test('verifies word meanings in Hindi to English and English to Hindi', () => {
    const meaning = (word: string) =>
      FAZIA_HINDI_LESSON.questions.find(question =>
        question.section === 'meanings' && question.prompt.includes(`“${word}”`)
      )!;
    assert.equal(meaning('नल').answer, 'Tap');
    assert.equal(checkHindiAnswer(meaning('कमल'), 'Lotus'), true);
    assert.equal(checkHindiAnswer(meaning('कमल'), 'lotus'), true);
    assert.equal(checkHindiAnswer(meaning('घर'), 'home'), true);
    assert.equal(checkHindiAnswer(meaning('मृग'), 'Deer'), true);

    const translation = (word: string) =>
      FAZIA_HINDI_LESSON.questions.find(question =>
        question.section === 'translations' && question.prompt.includes(`“${word}”`)
      )!;
    assert.equal(translation('Wool').answer, 'ऊन');
    assert.equal(translation('Tree').answer, 'वृक्ष');
    assert.equal(checkHindiAnswer(translation('Tree'), 'पेड़'), true);
    assert.equal(checkHindiAnswer(translation('Saint'), 'ऋषि'), true);
    assert.equal(checkHindiAnswer(translation('Book'), 'किताब'), true);
    assert.equal(checkHindiAnswer(translation('Heel'), 'एड़ी'), true);
    assert.equal(checkHindiAnswer(translation('Heel'), 'एडी'), true);
  });

  test('verifies fill in sentence questions accepting either word or full sentence', () => {
    const ear = FAZIA_HINDI_LESSON.questions.find(q => q.id === 'g2-hin-sentence-1')!;
    assert.equal(checkHindiAnswer(ear, 'कान'), true);
    assert.equal(checkHindiAnswer(ear, 'नाक कान साफ कर'), true);
    assert.equal(checkHindiAnswer(ear, 'नाक कान साफ कर।'), true);

    const lesson = FAZIA_HINDI_LESSON.questions.find(q => q.id === 'g2-hin-sentence-2')!;
    assert.equal(checkHindiAnswer(lesson, 'पाठ'), true);
    assert.equal(checkHindiAnswer(lesson, 'अपना पाठ याद कर'), true);

    const umbrella = FAZIA_HINDI_LESSON.questions.find(q => q.id === 'g2-hin-sentence-3')!;
    assert.equal(checkHindiAnswer(umbrella, 'छाता'), true);
    assert.equal(checkHindiAnswer(umbrella, 'छाता ला।'), true);

    const book = FAZIA_HINDI_LESSON.questions.find(q => q.id === 'g2-hin-sentence-4')!;
    assert.equal(checkHindiAnswer(book, 'किताब'), true);
    assert.equal(checkHindiAnswer(book, 'गीता किताब पढ़।'), true);

    const grass = FAZIA_HINDI_LESSON.questions.find(q => q.id === 'g2-hin-sentence-5')!;
    assert.equal(checkHindiAnswer(grass, 'तृण'), true);

    const sage = FAZIA_HINDI_LESSON.questions.find(q => q.id === 'g2-hin-sentence-6')!;
    assert.equal(checkHindiAnswer(sage, 'ऋषि'), true);
  });

  test('verifies pair questions for two words from each letter with order independence', () => {
    const ee = FAZIA_HINDI_LESSON.questions.find(q => q.id === 'g2-hin-pair-1')!;
    assert.equal(ee.kind, 'pair');
    assert.equal(checkHindiAnswer(ee, 'ईख, ईंट'), true);
    assert.equal(checkHindiAnswer(ee, 'ईंट, ईख'), true);
    assert.equal(checkHindiAnswer(ee, 'ईख और ईंट'), true);
    assert.equal(checkHindiAnswer(ee, 'ईख'), false);
    assert.equal(checkHindiAnswer(ee, 'ईख, ईख'), false);

    const camel = FAZIA_HINDI_LESSON.questions.find(q => q.id === 'g2-hin-pair-5')!;
    assert.equal(checkHindiAnswer(camel, 'ऊँट, ऊन'), true);
    assert.equal(checkHindiAnswer(camel, 'ऊंट, ऊन'), true);
    assert.equal(checkHindiAnswer(camel, 'ऊन और ऊंट'), true);

    const heel = FAZIA_HINDI_LESSON.questions.find(q => q.id === 'g2-hin-pair-6')!;
    assert.equal(checkHindiAnswer(heel, 'एड़ी, एक'), true);
    assert.equal(checkHindiAnswer(heel, 'एडी, एक'), true);
  });

  test('verifies combine letters, word-making, complete words, choice, and read-and-write', () => {
    const bargad = FAZIA_HINDI_LESSON.questions.find(q => q.id === 'g2-hin-combine-1')!;
    assert.equal(checkHindiAnswer(bargad, 'बरगद'), true);

    const door = FAZIA_HINDI_LESSON.questions.find(q => q.id === 'g2-hin-word-making-2')!;
    assert.equal(checkHindiAnswer(door, 'किवाड़'), true);
    assert.equal(checkHindiAnswer(door, 'किवाड़'), true);

    const rose = FAZIA_HINDI_LESSON.questions.find(q => q.id === 'g2-hin-complete-1')!;
    assert.equal(checkHindiAnswer(rose, 'गु'), true);
    assert.equal(checkHindiAnswer(rose, 'गुलाब'), true);

    const elephant = FAZIA_HINDI_LESSON.questions.find(q => q.id === 'g2-hin-choose-1')!;
    assert.equal(elephant.kind, 'choice');
    assert.equal(checkHindiAnswer(elephant, 'हाथी'), true);
    assert.equal(checkHindiAnswer(elephant, 'राजा'), false);
    assert.equal(elephant.prompt, 'सही शब्द चुनिए: Elephant');
    assert.ok(!elephant.prompt.includes('हाथी'), 'Question prompt must not leak the correct Hindi answer');

    const chooseQuestions = FAZIA_HINDI_LESSON.questions.filter(q => q.section === 'choose-word');
    assert.equal(chooseQuestions.length, 6);
    for (const q of chooseQuestions) {
      assert.equal(q.kind, 'choice');
      assert.ok(!q.prompt.includes(q.answer), `Prompt "${q.prompt}" must not reveal answer "${q.answer}"`);
      assert.ok(q.prompt.startsWith('सही शब्द चुनिए:'), `Prompt "${q.prompt}" must use neutral prompt prefix`);
    }

    const ray = FAZIA_HINDI_LESSON.questions.find(q => q.id === 'g2-hin-readwrite-1')!;
    assert.equal(checkHindiAnswer(ray, 'किरण'), true);
  });

  test('saves exam and practice progress for Fazia Grade 2 Hindi and isolates review questions', () => {
    const firstQuestion = FAZIA_HINDI_LESSON.questions[0];
    const completedAt = '2026-11-09T10:00:00.000Z';
    const exam: HindiResult = {
      mode: 'exam',
      completedAt,
      answers: FAZIA_HINDI_LESSON.questions.map(question => {
        const answer = question.id === firstQuestion.id ? 'incorrect answer' : question.answer;
        return {
          questionId: question.id,
          answer,
          correct: checkHindiAnswer(question, answer)
        };
      })
    };

    const afterExam = saveHindiResult('fazia', exam);
    assert.ok(afterExam);
    assert.deepEqual(afterExam.reviewQuestionIds, [firstQuestion.id]);
    assert.equal(loadHindiProgress('fazia').exam?.answers.length, 90);
    assert.equal(getHindiStorageKey('fazia'), 'academy_hindi_fazia_v1');

    const practice: HindiResult = {
      mode: 'practice',
      completedAt,
      answers: [{
        questionId: firstQuestion.id,
        answer: firstQuestion.answer,
        correct: true
      }]
    };
    const afterPractice = saveHindiResult('fazia', practice);
    assert.ok(afterPractice);
    assert.deepEqual(afterPractice.reviewQuestionIds, []);
    assert.ok(afterPractice.exam, 'practice does not overwrite the saved exam');
  });
});
