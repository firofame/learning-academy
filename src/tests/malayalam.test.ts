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
  isValidMalayalamProgress,
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

  test('covers all 176 supplied exercises across ten sections without renumbering earlier questions', () => {
    const lesson = getMalayalamLesson('shiza');
    assert.equal(lesson.grade, 6);
    assert.equal(lesson, SHIZA_MALAYALAM_LESSON);
    assert.equal(lesson.questions.length, 176);
    assert.deepEqual(
      lesson.sections.map(section =>
        lesson.questions.filter(question => question.section === section.id).length
      ),
      [62, 2, 8, 14, 10, 19, 18, 11, 7, 25]
    );
    assert.equal(new Set(lesson.questions.map(question => question.id)).size, 176);
    const previousQuestions = lesson.questions.slice(0, 69);
    assert.ok(previousQuestions.every(question => /^g6-mal-(?:l[12]-|vigraham-)/u.test(question.id)));
    assert.equal(previousQuestions[0].id, 'g6-mal-l1-meaning-1');
    assert.equal(previousQuestions.at(-1)?.id, 'g6-mal-l2-answer-6');
    for (const [number, count] of [[3, 37], [4, 24], [5, 46]]) {
      const questions = lesson.questions.filter(question => question.id.startsWith(`g6-mal-l${number}-`));
      assert.equal(questions.length, count, `Lesson ${number} matches its supplied exercise count`);
      assert.ok(questions.every(question => question.prompt.startsWith(`പാഠം ${number} · `)));
    }
    for (const question of lesson.questions) {
      assert.ok(question.prompt.length > 0);
      assert.ok(question.answer.length > 0);
      assert.equal(checkMalayalamAnswer(question, question.answer), true);
      assert.equal(checkMalayalamAnswer(question, ''), false);
      assert.equal(/[\u0000\uFFFD]/u.test(question.prompt + question.answer), false);
    }
  });

  test('preserves supplied answers and flags source gaps rather than inventing exercises', () => {
    for (const [id, answer] of [
      ['g6-mal-l3-meaning-6', 'കണ്ടുപിടിച്ചയാൾ'],
      ['g6-mal-l3-gender-3', 'രാജ്ഞി'],
      ['g6-mal-l3-split-3', 'കോർത്ത് + ഇണക്കി'],
      ['g6-mal-l3-join-3', 'ധാരാളമുണ്ട്'],
      ['g6-mal-l3-vigraham-1', 'രാജാവിന്റെ പത്നി'],
      ['g6-mal-l4-meaning-5', 'പതിനായിരം'],
      ['g6-mal-l4-synonym-2', 'ആഗ്രഹം, ഇച്ഛ'],
      ['g6-mal-l4-join-1', 'വസ്ത്രമതുപോലും'],
      ['g6-mal-l5-meaning-13', 'അഭിനന്ദിച്ച് നൽകുന്ന സമ്മാനം'],
      ['g6-mal-l5-synonym-2', 'വ്യസനം, ശോകം, കദനം'],
      ['g6-mal-l5-split-5', 'രക്ഷിക്കാൻ + എത്തിയ'],
      ['g6-mal-l5-vigraham-3', 'ബുദ്ധിയിലുള്ള സാമർഥ്യം']
    ]) {
      assert.equal(lessonQuestion(id).answer, answer);
    }
    assert.deepEqual(
      SHIZA_MALAYALAM_LESSON.questions
        .filter(question => question.id.startsWith('g6-mal-l4-answer-'))
        .map(question => question.id),
      ['g6-mal-l4-answer-4', 'g6-mal-l4-answer-5']
    );
    assert.match(SHIZA_MALAYALAM_LESSON.sourceNote, /poem lines are not supplied/);
    assert.match(SHIZA_MALAYALAM_LESSON.sourceNote, /ആദ്യകൃതി.*teacher confirmation/);
  });

  test('uses the supplied അപ്രതീക്ഷിതം sentence cue under its original stable ID', () => {
    const question = lessonQuestion('g6-mal-l2-sentence-2');
    assert.match(question.prompt, /“അപ്രതീക്ഷിതം”/);
    assert.equal(checkMalayalamAnswer(question, 'അപ്രതീക്ഷിതമായി എനിക്ക് ഒരു മിഠായി കിട്ടി.'), true);
    assert.equal(checkMalayalamAnswer(question, 'പ്രതീക്ഷയോടെ എനിക്ക് ഒരു മിഠായി കിട്ടി.'), false);
    assert.ok(question.kind === 'written');
    assert.match(question.markingCriteria, /uses അപ്രതീക്ഷിതം or an inflected form/);
  });

  test('checks both multiple meanings locally in either order without accepting duplicates', () => {
    const question = lessonQuestion('g6-mal-l4-multiple-meaning-1');
    assert.equal(question.section, 'multiple-meanings');
    assert.equal(checkMalayalamAnswer(question, 'ധനം, ആശയം'), true);
    assert.equal(checkMalayalamAnswer(question, 'ആശയം'), false);
    assert.equal(checkMalayalamAnswer(question, 'ധനം, ധനം'), false);
    const second = lessonQuestion('g6-mal-l5-multiple-meaning-1');
    assert.equal(checkMalayalamAnswer(second, 'മനസ്സിലാക്കിക്കൊടുക്കുക, അണിയിക്കുക'), true);
    assert.equal(checkMalayalamAnswer(second, 'അണിയിക്കുക'), false);
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
    assert.equal(saved.exam?.answers.length, 176);
    assert.equal(saved.exam?.contentVersion, 'malayalam-v2');
    assert.deepEqual(saved.reviewQuestionIds, []);
    assert.equal(getMalayalamStorageKey('shiza'), 'academy_malayalam_shiza_v1');
    assert.equal(loadMalayalamProgress('fazia').exam, null);
    assert.equal(loadMalayalamProgress('shiza').lessonId, SHIZA_MALAYALAM_LESSON.id);
  });

  test('keeps earlier exams and the superseded sentence answer readable without accepting new incomplete exams', () => {
    const oldAnswers = SHIZA_MALAYALAM_LESSON.questions.slice(0, 69).map(question => ({
      questionId: question.id,
      answer: question.id === 'g6-mal-l2-sentence-2'
        ? 'പ്രതീക്ഷയോടെ എനിക്ക് ഒരു മിഠായി കിട്ടി.' : question.answer,
      correct: true
    }));
    const oldExam: MalayalamResult = {
      mode: 'exam', completedAt: '2026-11-05T10:00:00.000Z', answers: oldAnswers
    };
    const oldPractice: MalayalamResult = {
      mode: 'practice', completedAt: oldExam.completedAt,
      answers: oldAnswers.filter(answer => answer.questionId === 'g6-mal-l2-sentence-2')
    };
    const previous = {
      studentId: 'shiza', lessonId: SHIZA_MALAYALAM_LESSON.id,
      exam: oldExam, practice: oldPractice, reviewQuestionIds: ['g6-mal-l1-meaning-1']
    };
    localStorage.setItem(getMalayalamStorageKey('shiza'), JSON.stringify(previous));
    assert.equal(isValidMalayalamProgress(previous, 'shiza'), true);
    assert.deepEqual(loadMalayalamProgress('shiza').exam, oldExam);
    assert.deepEqual(loadMalayalamProgress('shiza').practice, oldPractice);
    assert.equal(isValidMalayalamProgress(previous, 'fazia'), false);
    assert.equal(saveMalayalamResult('shiza', oldExam), null);
    assert.equal(saveMalayalamResult('shiza', oldPractice), null);

    const corrected = lessonQuestion('g6-mal-l2-sentence-2');
    const saved = saveMalayalamResult('shiza', {
      ...oldPractice,
      answers: [{ questionId: corrected.id, answer: corrected.answer, correct: true }]
    });
    assert.ok(saved);
    assert.equal(saved.practice?.contentVersion, 'malayalam-v2');
    assert.deepEqual(saved.exam, oldExam);
    assert.deepEqual(loadMalayalamProgress('shiza').exam, oldExam);
    assert.equal(loadMalayalamProgress('shiza').practice?.answers[0].answer, corrected.answer);
    assert.deepEqual(loadMalayalamProgress('shiza').reviewQuestionIds, ['g6-mal-l1-meaning-1']);
    assert.equal(loadMalayalamProgress('fazia').exam, null);

    assert.equal(isValidMalayalamProgress({
      ...previous, exam: { ...oldExam, contentVersion: 'malayalam-v1' }
    }, 'shiza'), true);
    for (const exam of [
      { ...oldExam, answers: oldAnswers.slice(1) },
      { ...oldExam, contentVersion: 'malayalam-v2' },
      { ...oldExam, contentVersion: 'unknown-version' }
    ]) {
      assert.equal(isValidMalayalamProgress({ ...previous, exam }, 'shiza'), false);
    }
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
