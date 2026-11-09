import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkEnglishAnswer,
  getEnglishLesson,
  getEnglishLessonForGrade,
  normalizeEnglishAnswer,
  ENGLISH_SECTIONS,
  SHIZA_ENGLISH_LESSON
} from '../data/english';
import {
  getEnglishStorageKey,
  EnglishResult,
  isValidEnglishProgress,
  loadEnglishProgress,
  saveEnglishResult
} from '../utils/englishStorage';

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

describe('Shiza Grade 6 English curriculum & study notes coverage', () => {
  beforeEach(() => mockStorage.clear());

  test('covers all 3 units and 56 questions from the supplied classwork notes compendium', () => {
    assert.equal(getEnglishLesson('shiza'), SHIZA_ENGLISH_LESSON);
    assert.equal(getEnglishLessonForGrade(6), SHIZA_ENGLISH_LESSON);
    assert.equal(SHIZA_ENGLISH_LESSON.grade, 6);
    assert.equal(SHIZA_ENGLISH_LESSON.questions.length, 56);

    // Section breakdown: [unit-1: 12, unit-2: 23, unit-3: 21]
    const sectionCounts = ENGLISH_SECTIONS.map(section =>
      SHIZA_ENGLISH_LESSON.questions.filter(q => q.section === section.id).length
    );
    assert.deepEqual(sectionCounts, [12, 23, 21]);

    // Check all questions have valid prompt, answer, explanation, marking criteria
    for (const q of SHIZA_ENGLISH_LESSON.questions) {
      assert.ok(q.id.startsWith('g6-eng-'));
      assert.ok(q.prompt.length > 5);
      assert.ok(q.answer.length > 0);
      assert.ok(q.markingCriteria.length > 10);
      assert.ok(q.explanation.length > 10);
      assert.ok(q.acceptedAnswers.includes(q.answer));
    }

    // Verify study cards
    assert.equal(SHIZA_ENGLISH_LESSON.cards.length, 6);
    for (const card of SHIZA_ENGLISH_LESSON.cards) {
      assert.ok(card.id.startsWith('g6-eng-card-'));
      assert.ok(card.title.length > 0);
      assert.ok(card.prompt.length > 0);
      assert.ok(card.answer.length > 0);
      assert.ok(card.memoryTip.length > 0);
    }
  });

  test('deterministic matching handles exact answers, casing, punctuation, and aliases', () => {
    // 1. One-word substitution with hyphenation
    const selfConfidentQ = SHIZA_ENGLISH_LESSON.questions.find(q => q.id === 'g6-eng-u2-ows-5');
    assert.ok(selfConfidentQ);
    assert.ok(checkEnglishAnswer(selfConfidentQ, 'Self-confident'));
    assert.ok(checkEnglishAnswer(selfConfidentQ, 'self confident'));
    assert.ok(checkEnglishAnswer(selfConfidentQ, 'Self-confidence'));
    assert.ok(!checkEnglishAnswer(selfConfidentQ, 'nervous'));

    // 2. Word meaning with slash/alternative
    const leadingQ = SHIZA_ENGLISH_LESSON.questions.find(q => q.id === 'g6-eng-u1-wm-4');
    assert.ok(leadingQ);
    assert.ok(checkEnglishAnswer(leadingQ, 'Chief / main'));
    assert.ok(checkEnglishAnswer(leadingQ, 'chief'));
    assert.ok(checkEnglishAnswer(leadingQ, 'main'));
    assert.ok(checkEnglishAnswer(leadingQ, 'Chief or main'));
    assert.ok(!checkEnglishAnswer(leadingQ, 'trailing'));

    // 3. Archaic term aliases
    const thyQ = SHIZA_ENGLISH_LESSON.questions.find(q => q.id === 'g6-eng-u3-vam-2');
    assert.ok(thyQ);
    assert.ok(checkEnglishAnswer(thyQ, "An archaic/poetic form of 'your'"));
    assert.ok(checkEnglishAnswer(thyQ, 'your'));
    assert.ok(checkEnglishAnswer(thyQ, 'Your'));

    const wertQ = SHIZA_ENGLISH_LESSON.questions.find(q => q.id === 'g6-eng-u3-vam-6');
    assert.ok(wertQ);
    assert.ok(checkEnglishAnswer(wertQ, "Archaic second-person past form of 'were' (you were)"));
    assert.ok(checkEnglishAnswer(wertQ, 'you were'));

    // 4. Model sentence deterministic pass for sentence formation
    const panopliedQ = SHIZA_ENGLISH_LESSON.questions.find(q => q.id === 'g6-eng-u2-sf-1');
    assert.ok(panopliedQ);
    assert.ok(checkEnglishAnswer(panopliedQ, 'The sky was panoplied with stars sparkling in the quiet night.'));
    assert.ok(checkEnglishAnswer(panopliedQ, 'the sky was panoplied with stars sparkling in the quiet night'));

    const immemorialSentenceQ = SHIZA_ENGLISH_LESSON.questions.find(q => q.id === 'g6-eng-u3-sa-1');
    assert.ok(immemorialSentenceQ);
    assert.ok(checkEnglishAnswer(immemorialSentenceQ, 'The hills have stood here since time immemorial.'));
    assert.ok(checkEnglishAnswer(immemorialSentenceQ, 'the hills have stood here since time immemorial'));

    // Rejection of empty or irrelevant answer
    assert.equal(checkEnglishAnswer(panopliedQ, ''), false);
    assert.equal(checkEnglishAnswer(panopliedQ, 'I like apples.'), false);
  });

  test('normalizes answers properly', () => {
    assert.equal(normalizeEnglishAnswer('  "Hello—World"  '), 'hello-world');
    assert.equal(normalizeEnglishAnswer("It's ‘good’"), 'its good');
  });

  test('manages English progress lifecycle and clears review question IDs on correct answer', () => {
    const questions = SHIZA_ENGLISH_LESSON.questions;
    const initialProg = loadEnglishProgress('shiza');
    assert.equal(initialProg.practice, null);
    assert.equal(initialProg.exam, null);
    assert.deepEqual(initialProg.reviewQuestionIds, []);

    // 1. First exam with 2 incorrect/assisted questions
    const firstExam: EnglishResult = {
      mode: 'exam',
      completedAt: '2026-11-09T10:00:00Z',
      answers: questions.map((q, idx) => ({
        questionId: q.id,
        answer: q.answer,
        correct: idx >= 2,
        assistance: idx === 1 ? ['hint'] : []
      }))
    };

    const firstSaved = saveEnglishResult('shiza', firstExam);
    assert.ok(firstSaved);
    assert.deepEqual(firstSaved.reviewQuestionIds, [questions[0].id, questions[1].id]);

    // 2. Practice session correctly answering the first missed question
    const practiceResult: EnglishResult = {
      mode: 'practice',
      completedAt: '2026-11-09T11:00:00Z',
      answers: [
        {
          questionId: questions[0].id,
          answer: questions[0].answer,
          correct: true,
          assistance: []
        }
      ]
    };

    const secondSaved = saveEnglishResult('shiza', practiceResult);
    assert.ok(secondSaved);
    // questions[0] should be cleared under practice-or-exam-correct policy
    assert.deepEqual(secondSaved.reviewQuestionIds, [questions[1].id]);

    // Verify persisted state matches
    const loaded = loadEnglishProgress('shiza');
    assert.deepEqual(loaded.reviewQuestionIds, [questions[1].id]);
  });

  test('isolates progress by storage key', () => {
    assert.equal(getEnglishStorageKey('shiza'), 'academy_english_shiza_v1');
    assert.equal(getEnglishStorageKey('fazia'), 'academy_english_fazia_v1');
  });

  test('safely handles non-Grade-6 learner without crashing', () => {
    assert.throws(() => getEnglishLesson('fazia'), /English is not available for Fazia/);
    assert.equal(getEnglishLessonForGrade(2), undefined);

    const result: EnglishResult = {
      mode: 'exam',
      completedAt: '2026-11-09T12:00:00Z',
      answers: SHIZA_ENGLISH_LESSON.questions.map(q => ({
        questionId: q.id,
        answer: q.answer,
        correct: true
      }))
    };

    assert.equal(saveEnglishResult('fazia', result), null);
    const prog = loadEnglishProgress('fazia');
    assert.equal(prog.studentId, 'fazia');
  });

  test('rejects malformed progress safely', () => {
    assert.equal(isValidEnglishProgress(null, 'shiza'), false);
    assert.equal(isValidEnglishProgress({ studentId: 'fazia' }, 'shiza'), false);
    assert.equal(isValidEnglishProgress({ studentId: 'shiza', lessonId: 'wrong' }, 'shiza'), false);
  });
});
