import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  getMathsLesson,
  getMathsLessonForGrade,
  checkMathsAnswer,
  normalizeMathsAnswer,
  MATHS_TOPICS,
  GRADE_2_MATHS_QUESTIONS
} from '../data/maths';
import { MathsDiagram } from '../components/MathsDiagram';
import {
  loadMathsProgress,
  saveMathsResult,
  getMathsStorageKey,
  MathsResult
} from '../utils/mathsStorage';
import { subscribeStorageError } from '../utils/storage';

class MockLocalStorage {
  private store = new Map<string, string>();
  shouldThrowOnSet = false;
  shouldThrowOnGet = false;

  getItem(key: string): string | null {
    if (this.shouldThrowOnGet) throw new Error('Simulated read failure');
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.shouldThrowOnSet) throw new Error('Simulated write failure');
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
(global as any).window = { localStorage: mockStorage };
(global as any).localStorage = mockStorage;

describe('Grade 2 Maths Curriculum & Notebook Coverage', () => {
  const lesson = getMathsLesson('fazia');

  test('lesson covers all topics and properties from Fazia’s revision notebook', () => {
    assert.equal(lesson.grade, 2);
    assert.equal(lesson.sourceName, 'fazia grade 2 maths.pdf');
    assert.ok(lesson.cards.length >= 7, 'Includes cards for all core math concepts');
    assert.equal(lesson.questions.length, 49, 'Includes all notebook questions');

    const grade2Topics = MATHS_TOPICS.filter(t => lesson.cards.some(c => c.topic === t.id));
    for (const topic of grade2Topics) {
      const topicQuestions = lesson.questions.filter(q => q.topic === topic.id);
      assert.ok(topicQuestions.length > 0, `Topic ${topic.id} has questions`);
    }
  });

  test('every question has a valid answer key and educational explanation', () => {
    for (const question of lesson.questions) {
      assert.ok(question.prompt.length > 0);
      assert.ok(question.explanation.length > 0);
      assert.equal(checkMathsAnswer(question, question.answer), true);
      assert.equal(checkMathsAnswer(question, ''), false);
      assert.equal(checkMathsAnswer(question, 'completely wrong answer'), false);
    }
  });

  test('place value questions verify tens and ones values', () => {
    const pv78Tens = lesson.questions.find(q => q.id === 'g2-pv-1')!;
    assert.equal(checkMathsAnswer(pv78Tens, '70'), true);
    assert.equal(checkMathsAnswer(pv78Tens, '7 tens'), true);
    assert.equal(checkMathsAnswer(pv78Tens, '7'), false);

    const pv78Ones = lesson.questions.find(q => q.id === 'g2-pv-1b')!;
    assert.equal(checkMathsAnswer(pv78Ones, '8'), true);
    assert.equal(checkMathsAnswer(pv78Ones, '8 ones'), true);
    assert.equal(checkMathsAnswer(pv78Ones, '80'), false);

    const pv92 = lesson.questions.find(q => q.id === 'g2-pv-2')!;
    assert.equal(checkMathsAnswer(pv92, '90'), true);

    const pv43 = lesson.questions.find(q => q.id === 'g2-pv-3')!;
    assert.equal(checkMathsAnswer(pv43, '3'), true);
  });

  test('expanded form accepts tens/ones notation and addition format', () => {
    const exp36 = lesson.questions.find(q => q.id === 'g2-exp-1')!;
    assert.equal(checkMathsAnswer(exp36, '3 tens + 6 ones'), true);
    assert.equal(checkMathsAnswer(exp36, '30 + 6'), true);
    assert.equal(checkMathsAnswer(exp36, '30+6'), true);
    assert.equal(checkMathsAnswer(exp36, '3 tens and 6 ones'), true);
    assert.equal(checkMathsAnswer(exp36, '30 + 5'), false);

    const exp45 = lesson.questions.find(q => q.id === 'g2-exp-2')!;
    assert.equal(checkMathsAnswer(exp45, '40 + 5'), true);
    assert.equal(checkMathsAnswer(exp45, '40+5'), true);
    assert.equal(checkMathsAnswer(exp45, '4 tens + 5 ones'), true);
  });

  test('standard form combines place values into correct numerals', () => {
    const std1 = lesson.questions.find(q => q.id === 'g2-std-1')!;
    assert.equal(checkMathsAnswer(std1, '24'), true);
    assert.equal(checkMathsAnswer(std1, '20'), false);

    const std6 = lesson.questions.find(q => q.id === 'g2-std-6')!;
    assert.equal(checkMathsAnswer(std6, '327'), true);

    const std7 = lesson.questions.find(q => q.id === 'g2-std-7')!;
    assert.equal(checkMathsAnswer(std7, '232'), true);
  });

  test('comparing questions evaluate <, >, and = correctly', () => {
    const cmp1 = lesson.questions.find(q => q.id === 'g2-cmp-1')!;
    assert.equal(checkMathsAnswer(cmp1, '<'), true);
    assert.equal(checkMathsAnswer(cmp1, '>'), false);

    const cmp2 = lesson.questions.find(q => q.id === 'g2-cmp-2')!;
    assert.equal(checkMathsAnswer(cmp2, '>'), true);

    const cmp3 = lesson.questions.find(q => q.id === 'g2-cmp-3')!;
    assert.equal(checkMathsAnswer(cmp3, '='), true);
  });

  test('shape identification matches 2D and 3D geometric properties', () => {
    const square = lesson.questions.find(q => q.id === 'g2-shp-1')!;
    assert.equal(checkMathsAnswer(square, 'Square'), true);
    assert.equal(checkMathsAnswer(square, 'square'), true);

    const cone = lesson.questions.find(q => q.id === 'g2-shp-3')!;
    assert.equal(checkMathsAnswer(cone, 'Cone'), true);

    const cylinder = lesson.questions.find(q => q.id === 'g2-shp-4')!;
    assert.equal(checkMathsAnswer(cylinder, 'Cylinder'), true);
  });

  test('greatest number, number names, and ordering questions are evaluated correctly', () => {
    const dir1 = lesson.questions.find(q => q.id === 'g2-dir-1')!;
    assert.equal(checkMathsAnswer(dir1, '972'), true);

    const dir2 = lesson.questions.find(q => q.id === 'g2-dir-2')!;
    assert.equal(checkMathsAnswer(dir2, '620'), true);

    const name761 = lesson.questions.find(q => q.id === 'g2-dir-3')!;
    assert.equal(checkMathsAnswer(name761, 'Seven hundred sixty-one'), true);
    assert.equal(checkMathsAnswer(name761, 'Seven hundred sixty one'), true);
    assert.equal(checkMathsAnswer(name761, 'Seven hundred and sixty-one'), true);
    assert.equal(checkMathsAnswer(name761, 'seven hundred and sixty one'), true);

    const asc = lesson.questions.find(q => q.id === 'g2-dir-5')!;
    assert.equal(checkMathsAnswer(asc, '48, 386, 421, 632'), true);
    assert.equal(checkMathsAnswer(asc, '48,386,421,632'), true);
    assert.equal(checkMathsAnswer(asc, '48 386 421 632'), true);
  });

  test('simplify arithmetic tests column addition and subtraction with and without regrouping', () => {
    const simAddNoCarry = lesson.questions.find(q => q.id === 'g2-sim-1')!;
    assert.equal(checkMathsAnswer(simAddNoCarry, '46'), true);

    const simAddCarry = lesson.questions.find(q => q.id === 'g2-sim-4')!;
    assert.equal(checkMathsAnswer(simAddCarry, '43'), true);
    assert.ok(simAddCarry.verticalMath?.carryOrBorrowHint);

    const simSubNoBorrow = lesson.questions.find(q => q.id === 'g2-sim-7')!;
    assert.equal(checkMathsAnswer(simSubNoBorrow, '64'), true);

    const simSubBorrow = lesson.questions.find(q => q.id === 'g2-sim-11')!;
    assert.equal(checkMathsAnswer(simSubBorrow, '36'), true);
    assert.ok(simSubBorrow.verticalMath?.carryOrBorrowHint);

    const sim3DigitCarry = lesson.questions.find(q => q.id === 'g2-sim-13')!;
    assert.equal(checkMathsAnswer(sim3DigitCarry, '470'), true);
  });
});

describe('Maths Progress Storage & Isolation', () => {
  beforeEach(() => {
    mockStorage.clear();
    mockStorage.shouldThrowOnSet = false;
    mockStorage.shouldThrowOnGet = false;
  });

  const fullLesson = getMathsLesson('fazia');

  function makeExamResult(): MathsResult {
    return {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      answers: fullLesson.questions.map(q => ({
        questionId: q.id,
        answer: q.answer,
        correct: true
      }))
    };
  }

  test('loads empty progress when no data is saved', () => {
    const prog = loadMathsProgress('fazia');
    assert.equal(prog.studentId, 'fazia');
    assert.equal(prog.lessonId, fullLesson.id);
    assert.equal(prog.practice, null);
    assert.equal(prog.exam, null);
    assert.deepEqual(prog.reviewQuestionIds, []);
  });

  test('saves and reloads a valid exam result', () => {
    const exam = makeExamResult();
    const saved = saveMathsResult('fazia', exam);
    assert.ok(saved);
    assert.equal(saved?.exam?.answers.length, fullLesson.questions.length);

    const reloaded = loadMathsProgress('fazia');
    assert.ok(reloaded.exam);
    assert.equal(reloaded.exam?.answers.length, fullLesson.questions.length);
    assert.deepEqual(reloaded.reviewQuestionIds, []);
  });

  test('tracks reviewQuestionIds for missed answers', () => {
    const exam = makeExamResult();
    exam.answers[0] = { questionId: fullLesson.questions[0].id, answer: 'wrong', correct: false };
    exam.answers[1] = { questionId: fullLesson.questions[1].id, answer: 'wrong', correct: false };

    const saved = saveMathsResult('fazia', exam);
    assert.ok(saved);
    assert.deepEqual(saved?.reviewQuestionIds, [fullLesson.questions[0].id, fullLesson.questions[1].id]);
  });

  test('rejects malformed progress safely and reports storage error', () => {
    const messages: string[] = [];
    const unsubscribe = subscribeStorageError(msg => messages.push(msg));
    try {
      mockStorage.setItem(getMathsStorageKey('fazia'), '{invalid json');
      const prog = loadMathsProgress('fazia');
      assert.equal(prog.exam, null);
      assert.ok(messages.some(m => m.includes('Unable to read maths progress')));
    } finally {
      unsubscribe();
    }
  });

  test('surfaces storage write failures without crashing', () => {
    const messages: string[] = [];
    const unsubscribe = subscribeStorageError(msg => messages.push(msg));
    try {
      mockStorage.shouldThrowOnSet = true;
      const res = saveMathsResult('fazia', makeExamResult());
      assert.equal(res, null);
      assert.ok(messages.some(m => m.includes('Storage save failed')));
    } finally {
      unsubscribe();
    }
  });

  test('saves and reloads topic-specific exam results without requiring all 49 questions', () => {
    const placeValueQuestions = fullLesson.questions.filter(q => q.topic === 'place-value');
    const topicExam: MathsResult = {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      topic: 'place-value',
      answers: placeValueQuestions.map(q => ({
        questionId: q.id,
        answer: q.answer,
        correct: true
      }))
    };

    const saved = saveMathsResult('fazia', topicExam);
    assert.ok(saved);
    assert.equal(saved?.exam?.answers.length, placeValueQuestions.length);
    assert.equal(saved?.exam?.topic, 'place-value');

    const reloaded = loadMathsProgress('fazia');
    assert.ok(reloaded.exam);
    assert.equal(reloaded.exam?.answers.length, placeValueQuestions.length);
    assert.equal(reloaded.exam?.topic, 'place-value');
  });

  test('topic exams update reviewQuestionIds: remove newly correct and add newly missed', () => {
    const pvQuestions = fullLesson.questions.filter(q => q.topic === 'place-value');
    // First exam: miss the first question
    const topicExam1: MathsResult = {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      topic: 'place-value',
      answers: pvQuestions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 0 ? 'wrong' : q.answer,
        correct: idx !== 0
      }))
    };
    const saved1 = saveMathsResult('fazia', topicExam1);
    assert.ok(saved1);
    assert.deepEqual(saved1?.reviewQuestionIds, [pvQuestions[0].id]);

    // Second exam: answer all correctly, clearing the previously missed question
    const topicExam2: MathsResult = {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      topic: 'place-value',
      answers: pvQuestions.map(q => ({
        questionId: q.id,
        answer: q.answer,
        correct: true
      }))
    };
    const saved2 = saveMathsResult('fazia', topicExam2);
    assert.ok(saved2);
    assert.deepEqual(saved2?.reviewQuestionIds, []);
  });

  test('rejects exam results with unknown topics, cross-topic answers, or incomplete topic sets', () => {
    const messages: string[] = [];
    const unsubscribe = subscribeStorageError(msg => messages.push(msg));
    try {
      const pvQuestions = fullLesson.questions.filter(q => q.topic === 'place-value');
      const simplifyQuestions = fullLesson.questions.filter(q => q.topic === 'simplify');

      // Unknown topic
      const unknownTopic: MathsResult = {
        mode: 'exam',
        completedAt: new Date().toISOString(),
        topic: 'nonexistent-topic',
        answers: pvQuestions.map(q => ({
          questionId: q.id, answer: q.answer, correct: true
        }))
      };
      assert.equal(saveMathsResult('fazia', unknownTopic), null);

      // Cross-topic: labelled place-value but contains simplify answers
      const crossTopic: MathsResult = {
        mode: 'exam',
        completedAt: new Date().toISOString(),
        topic: 'place-value',
        answers: simplifyQuestions.map(q => ({
          questionId: q.id, answer: q.answer, correct: true
        }))
      };
      assert.equal(saveMathsResult('fazia', crossTopic), null);

      // Incomplete: labelled place-value but only has one answer
      const incomplete: MathsResult = {
        mode: 'exam',
        completedAt: new Date().toISOString(),
        topic: 'place-value',
        answers: [{ questionId: pvQuestions[0].id, answer: pvQuestions[0].answer, correct: true }]
      };
      assert.equal(saveMathsResult('fazia', incomplete), null);

      // Full-curriculum exam missing questions
      const partialFull: MathsResult = {
        mode: 'exam',
        completedAt: new Date().toISOString(),
        answers: pvQuestions.map(q => ({
          questionId: q.id, answer: q.answer, correct: true
        }))
      };
      assert.equal(saveMathsResult('fazia', partialFull), null);

      assert.ok(messages.length >= 4, 'all invalid results reported errors');
    } finally {
      unsubscribe();
    }
  });

  test('practice review combining questions across multiple topics saves cleanly with topic: all', () => {
    const pvQuestion = fullLesson.questions.find(q => q.topic === 'place-value')!;
    const shapeQuestion = fullLesson.questions.find(q => q.topic === 'shapes')!;
    const crossTopicPractice: MathsResult = {
      mode: 'practice',
      completedAt: new Date().toISOString(),
      topic: 'all',
      answers: [
        { questionId: pvQuestion.id, answer: pvQuestion.answer, correct: true },
        { questionId: shapeQuestion.id, answer: shapeQuestion.answer, correct: true }
      ]
    };

    const saved = saveMathsResult('fazia', crossTopicPractice);
    assert.ok(saved);
    assert.equal(saved?.practice?.answers.length, 2);
    assert.equal(saved?.practice?.topic, 'all');
  });
});

describe('Grade 6 Maths Curriculum: Chapter 14 Basic Geometry', () => {
  const lesson = getMathsLesson('shiza');

  test('lesson covers basic geometry cards, questions, and textbook solutions', () => {
    assert.equal(lesson.grade, 6);
    assert.equal(lesson.title, 'Chapter 14: Basic Geometry');
    assert.ok(lesson.cards.length >= 8);
    assert.ok(lesson.questions.length >= 17);
    assert.equal(lesson.solutions?.length, 10);
  });

  test('answers to Chapter 14 questions are checked accurately', () => {
    const q1 = lesson.questions.find(q => q.id === 'g6-q1-pts')!;
    assert.ok(checkMathsAnswer(q1, 'P, Q, R'));
    assert.ok(checkMathsAnswer(q1, 'p, q, r'));
    assert.ok(checkMathsAnswer(q1, 'P,Q,R'));

    const q3 = lesson.questions.find(q => q.id === 'g6-q3-edges')!;
    assert.ok(checkMathsAnswer(q3, '12'));

    const q8 = lesson.questions.find(q => q.id === 'g6-q8-mcq')!;
    assert.ok(checkMathsAnswer(q8, 'BA'));

    const q10 = lesson.questions.find(q => q.id === 'g6-q10-mcq')!;
    assert.ok(checkMathsAnswer(q10, 'Line segment'));
  });

  test('textbook solutions include every intersecting pair and the corrected ray wording', () => {
    const q2 = lesson.solutions?.find(solution => solution.questionNumber === 2)!;
    assert.match(q2.steps[0].questionText, /Vertical ray with origin A/);
    assert.match(q2.steps[0].answer, /Ray AB \(downward\)/);

    const q4 = lesson.solutions?.find(solution => solution.questionNumber === 4)!;
    const intersecting = q4.steps.find(step => step.part === '(iv)')!;
    const pairs = intersecting.answer.match(/\([^)]+\)/g) ?? [];
    assert.equal(pairs.length, 12);
    assert.ok(pairs.includes('(q, r)'));

    const q3 = lesson.solutions?.find(solution => solution.questionNumber === 3)!;
    assert.doesNotMatch(q3.prompt, /ABCD-PQRS/);
    assert.match(q3.steps[1].answer, /Front \(CADR\)/);

    const q8 = lesson.solutions?.find(solution => solution.questionNumber === 8)!;
    assert.match(q8.prompt, /rays is NOT shown/);
    assert.match(q8.steps[0].explanation, /Ray BA starts at B and extends leftward through A/);
    assert.match(q8.steps[0].explanation, /Therefore, BA is not shown/);
    assert.doesNotMatch(q8.steps[0].explanation, /does not represent a ray/);
  });

  test('Question 5 matches the six-part textbook figure and resolves the line-l typo', () => {
    const q5 = lesson.solutions?.find(solution => solution.questionNumber === 5)!;
    assert.equal(q5.steps.length, 6);
    assert.match(q5.prompt, /Name line l in two other ways/);
    assert.equal(q5.steps[0].answer, 'Line CD or Line DC.');
    assert.equal(q5.steps[1].answer, 'Line BD or Line DB.');
    assert.equal(q5.steps[2].answer, 'Segment AD (or Segment DA).');
    assert.match(q5.steps[3].questionText, /line t/);
    assert.equal(q5.steps[3].answer, 'Segment AB, Segment BC, and Segment AC.');
    assert.match(q5.steps[3].explanation, /line l has only two marked points/);
    assert.equal(q5.steps[4].answer, 'Ray CD and Ray DC.');
    assert.equal(q5.steps[5].answer, 'Ray AB, Ray BA, Ray BC, and Ray CB.');

    const q5mcq = lesson.questions.find(q => q.id === 'g6-q5-naming')!;
    assert.deepEqual(q5mcq.kind === 'choice' ? q5mcq.options : [], ['Line AB', 'Line AD', 'Line BD', 'Line CD']);
    assert.equal(q5mcq.answer, 'Line AB');

    const q5Markup = renderToStaticMarkup(
      React.createElement(MathsDiagram, { type: 'line-m-t' })
    );
    assert.match(q5Markup, /aria-label="Lines l, m, n and t with points A, B, C, and D"/);
    assert.equal((q5Markup.match(/<line /g) ?? []).length, 4);
    assert.match(q5Markup, /x1="144" y1="20" x2="293" y2="270"/);
    assert.match(q5Markup, /x1="216" y1="20" x2="67" y2="270"/);
    assert.match(q5Markup, />A</);
    assert.match(q5Markup, />B</);
    assert.match(q5Markup, />C</);
    assert.match(q5Markup, />D</);
  });

  test('MCQ options are ordered to match their lettered textbook prompts', () => {
    const q8 = lesson.questions.find(q => q.id === 'g6-q8-mcq')!;
    assert.equal(q8.kind, 'choice');
    assert.deepEqual(q8.kind === 'choice' ? q8.options : [], ['OA', 'OB', 'BA', 'AB']);
    assert.match(q8.kind === 'choice' ? q8.prompt : '', /which of the following rays is NOT shown\?/);
    assert.equal(q8.answer, 'BA');

    const q9 = lesson.questions.find(q => q.id === 'g6-q9-mcq')!;
    assert.deepEqual(q9.kind === 'choice' ? q9.options : [], ['Point', 'Ray', 'Line', 'Line segment']);

    const q10 = lesson.questions.find(q => q.id === 'g6-q10-mcq')!;
    assert.deepEqual(q10.kind === 'choice' ? q10.options : [], ['Line', 'Ray', 'Point', 'Line segment']);
  });

  test('geometry diagrams show the corrected ray origins', () => {
    const q2Markup = renderToStaticMarkup(
      React.createElement(MathsDiagram, { type: 'fig2-arms' })
    );
    assert.match(q2Markup, /x1="40" y1="40" x2="40" y2="140"/);

    const q8Markup = renderToStaticMarkup(
      React.createElement(MathsDiagram, { type: 'mcq-rays' })
    );
    assert.match(q8Markup, /aria-label="Ray with origin O passing through A and B"/);
    assert.match(q8Markup, />O</);
    assert.match(q8Markup, />A</);
    assert.match(q8Markup, />B</);
  });

  test('textbook figure 6(iv) draws a figure-eight with two loops meeting at one point', () => {
    const markup = renderToStaticMarkup(
      React.createElement(MathsDiagram, { type: 'open-closed' })
    );
    assert.doesNotMatch(markup, /<ellipse/);
    assert.match(
      markup,
      /d="M 40 30 C 28 12, 10 12, 10 30 C 10 48, 28 48, 40 30 C 52 12, 70 12, 70 30 C 70 48, 52 48, 40 30 Z"/
    );
  });

  test('Grade 6 Maths results persist and isolate review questions', () => {
    const topicQuestions = lesson.questions.filter(q => q.topic === 'geometry-fundamentals');
    const examResult: MathsResult = {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      topic: 'geometry-fundamentals',
      answers: topicQuestions.map((q, idx) => ({
        questionId: q.id,
        answer: idx === 0 ? 'wrong' : q.answer,
        correct: idx !== 0
      }))
    };

    const saved = saveMathsResult('shiza', examResult);
    assert.ok(saved);
    assert.deepEqual(saved?.reviewQuestionIds, [topicQuestions[0].id]);
    assert.equal(loadMathsProgress('shiza').exam?.answers.length, topicQuestions.length);
  });
});
