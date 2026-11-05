import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkMalayalamAnswer,
  FAZIA_MALAYALAM_LESSON,
  getMalayalamLesson,
  getMalayalamLessonForGrade,
  MALAYALAM_SECTIONS,
  SHIZA_MALAYALAM_LESSON
} from '../data/malayalam';
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
    assert.equal(getMalayalamLessonForGrade(2), FAZIA_MALAYALAM_LESSON);
    assert.equal(getMalayalamLessonForGrade(3), undefined);
  });

  test('frames revision cues as paired lookups and preserves the supplied final sign rows', () => {
    const revisionQuestions = FAZIA_MALAYALAM_LESSON.questions.filter(question => question.section === 'revision');
    assert.ok(revisionQuestions.every(question =>
      question.prompt.startsWith('ഈ അക്ഷരക്കൂട്ടങ്ങൾക്ക് നൽകിയിരിക്കുന്ന വാക്ക് എഴുതുക:')
    ));
    assert.equal(revisionQuestions[2].prompt, 'ഈ അക്ഷരക്കൂട്ടങ്ങൾക്ക് നൽകിയിരിക്കുന്ന വാക്ക് എഴുതുക: ന്ത്, ന്ന്.');
    assert.equal(revisionQuestions[2].answer, 'പന്ത്');
    assert.equal(revisionQuestions[5].prompt, 'ഈ അക്ഷരക്കൂട്ടങ്ങൾക്ക് നൽകിയിരിക്കുന്ന വാക്ക് എഴുതുക: സ്ഥ, സ്ത.');
    assert.equal(revisionQuestions[5].answer, 'പുസ്തകം');

    const signQuestions = FAZIA_MALAYALAM_LESSON.questions.filter(question => question.section === 'signs');
    assert.deepEqual(signQuestions.slice(-3).map(question => [question.prompt, question.answer]), [
      ['പട്ടികയിൽ "്ര" എന്നതിന് നൽകിയിരിക്കുന്ന ചിഹ്നം എഴുതുക.', '്ര'],
      ['പട്ടികയിൽ "വ" എന്നതിന് നൽകിയിരിക്കുന്ന ചിഹ്നം എഴുതുക.', '്വ'],
      ['പട്ടികയിൽ "യ" എന്നതിന് നൽകിയിരിക്കുന്ന ചിഹ്നം എഴുതുക.', '്യ']
    ]);
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

describe('Shiza Grade 6 Malayalam exam portions', () => {
  beforeEach(() => mockStorage.clear());

  test('covers Lessons 1 and 2 with 69 questions across nine exercise sections', () => {
    const lesson = getMalayalamLesson('shiza');
    assert.equal(lesson.grade, 6);
    assert.equal(lesson, SHIZA_MALAYALAM_LESSON);
    assert.equal(lesson.questions.length, 69);
    assert.deepEqual(
      lesson.sections.map(section =>
        lesson.questions.filter(question => question.section === section.id).length
      ),
      [25, 4, 4, 2, 8, 8, 5, 2, 11]
    );
    assert.equal(new Set(lesson.questions.map(question => question.id)).size, 69);
    for (const question of lesson.questions) {
      assert.ok(question.prompt.length > 0);
      assert.ok(question.answer.length > 0);
      assert.equal(checkMalayalamAnswer(question, question.answer), true);
      assert.equal(checkMalayalamAnswer(question, ''), false);
    }
  });

  test('checks split words in order and accepts the notebook’s alternative split', () => {
    const standard = lessonQuestion('g6-mal-l1-split-1');
    assert.equal(checkMalayalamAnswer(standard, 'ചാലെ + പിടിച്ച് + അങ്ങ്'), true);
    assert.equal(checkMalayalamAnswer(standard, 'ചാലെ, പിടിച്ച്, അങ്ങ്'), true);
    assert.equal(checkMalayalamAnswer(standard, 'ചാലെ പിടിച്ച് അങ്ങ്'), true);
    assert.equal(checkMalayalamAnswer(standard, 'ചാലെ + പിടിച്ച് അങ്ങ്'), true);
    assert.equal(checkMalayalamAnswer(standard, 'ചാലെ, പിടിച്ച് + അങ്ങ്'), true);
    assert.equal(checkMalayalamAnswer(standard, 'പിടിച്ച് + ചാലെ + അങ്ങ്'), false);
    assert.equal(checkMalayalamAnswer(standard, 'ചാലെ + പിടിച്ച്'), false);

    const notebookVariant = lessonQuestion('g6-mal-l2-split-4');
    assert.equal(checkMalayalamAnswer(notebookVariant, 'വഴങ്ങുക + ഇല്ല'), true);
    assert.equal(checkMalayalamAnswer(notebookVariant, 'വഴങ്ങി + ഇല്ല'), true);
  });

  test('accepts all three synonyms in any order and requires every word', () => {
    const question = lessonQuestion('g6-mal-l2-synonym-1');
    assert.equal(checkMalayalamAnswer(question, 'ജഗത്ത്, ഭുവനം, വിശ്വം'), true);
    assert.equal(checkMalayalamAnswer(question, 'വിശ്വം ജഗത്ത് ഭുവനം'), true);
    assert.equal(checkMalayalamAnswer(question, 'ജഗത്ത്, ഭുവനം'), false);
    assert.equal(checkMalayalamAnswer(question, 'ജഗത്ത്, ഭുവനം, ജഗത്ത്'), false);
  });

  test('saves Shiza’s full mock exam separately from Fazia’s progress', () => {
    const exam: MalayalamResult = {
      mode: 'exam',
      completedAt: '2026-11-05T10:00:00.000Z',
      answers: SHIZA_MALAYALAM_LESSON.questions.map(question => ({
        questionId: question.id,
        answer: question.answer,
        correct: true
      }))
    };
    const saved = saveMalayalamResult('shiza', exam);
    assert.ok(saved);
    assert.equal(saved.exam?.answers.length, 69);
    assert.deepEqual(saved.reviewQuestionIds, []);
    assert.equal(getMalayalamStorageKey('shiza'), 'academy_malayalam_shiza_v1');
    assert.equal(loadMalayalamProgress('fazia').exam, null);
    assert.equal(loadMalayalamProgress('shiza').lessonId, SHIZA_MALAYALAM_LESSON.id);
  });

  test('persists Gemini-checked Grade 6 written answers with feedback', () => {
    const question = lessonQuestion('g6-mal-l1-answer-1');
    assert.ok(question.kind === 'written');
    const result: MalayalamResult = {
      mode: 'practice',
      completedAt: '2026-11-05T10:00:00.000Z',
      answers: [{
        questionId: question.id,
        answer: 'കണ്ണനെ കണ്ടപ്പോൾ യശോദ ഓടിയെത്തി അവനെ കെട്ടിപ്പിടിച്ചു.',
        correct: true,
        aiChecked: true,
        aiFeedback: 'ശരിയായ ആശയം പറഞ്ഞു.'
      }]
    };
    const saved = saveMalayalamResult('shiza', result);
    assert.ok(saved);
    assert.equal(saved.practice?.answers[0].aiChecked, true);
    assert.equal(saved.practice?.answers[0].aiFeedback, 'ശരിയായ ആശയം പറഞ്ഞു.');
  });
});

function lessonQuestion(id: string) {
  return SHIZA_MALAYALAM_LESSON.questions.find(question => question.id === id)!;
}
