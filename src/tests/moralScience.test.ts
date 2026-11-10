import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BREAKFAST_TABLE_ETIQUETTES,
  checkMoralScienceAnswer,
  FAZIA_MORAL_SCIENCE_LESSON,
  getMoralScienceLesson,
  getMoralScienceLessonForGrade,
  MORAL_SCIENCE_SECTIONS,
  normalizeMoralScienceAnswer
} from '../data/moralScience';
import {
  getMoralScienceStorageKey,
  isValidMoralScienceProgress,
  loadMoralScienceProgress,
  MoralScienceResult,
  saveMoralScienceResult,
  updateMoralScienceReviewQuestionIds
} from '../utils/moralScienceStorage';

import { installMockLocalStorage } from './helpers/storage';

const mockStorage = installMockLocalStorage();

/** The teacher's own notes, used to check that nothing in the app drifts from them. */
const teacherNotes = readFileSync(
  new URL('./fixtures/moral-science-notes.txt', import.meta.url),
  'utf8'
).replace(/\s+/g, ' ');

describe('Fazia Grade 2 Moral Science curriculum & revision notes coverage', () => {
  beforeEach(() => mockStorage.clear());

  test('covers both lessons and every question from the supplied study notes', () => {
    assert.equal(getMoralScienceLesson('fazia'), FAZIA_MORAL_SCIENCE_LESSON);
    assert.equal(getMoralScienceLessonForGrade(2), FAZIA_MORAL_SCIENCE_LESSON);
    assert.equal(FAZIA_MORAL_SCIENCE_LESSON.grade, 2);
    assert.equal(FAZIA_MORAL_SCIENCE_LESSON.questions.length, 22);

    // Section breakdown: [handmade-flag: 11, breakfast-table: 11]
    const sectionCounts = MORAL_SCIENCE_SECTIONS.map(section =>
      FAZIA_MORAL_SCIENCE_LESSON.questions.filter(q => q.section === section.id).length
    );
    assert.deepEqual(sectionCounts, [11, 11]);

    const ids = FAZIA_MORAL_SCIENCE_LESSON.questions.map(q => q.id);
    assert.equal(new Set(ids).size, 22);

    for (const question of FAZIA_MORAL_SCIENCE_LESSON.questions) {
      assert.ok(question.prompt.length > 0, `Question ${question.id} prompt is empty`);
      assert.ok(question.answer.length > 0, `Question ${question.id} answer is empty`);
      assert.equal(checkMoralScienceAnswer(question, question.answer), true, `Question ${question.id} failed checking its own answer`);
      assert.equal(checkMoralScienceAnswer(question, ''), false, `Question ${question.id} accepted an empty answer`);
      assert.equal(checkMoralScienceAnswer(question, '   '), false, `Question ${question.id} accepted a whitespace-only answer`);
    }

    assert.throws(() => getMoralScienceLesson('shiza'), /Moral Science is not available for Grade 6/);
    assert.equal(getMoralScienceLessonForGrade(6), undefined);
    assert.equal(getMoralScienceLessonForGrade(3), undefined);
  });

  test('every question comes from the teacher\'s own notes', () => {
    for (const question of FAZIA_MORAL_SCIENCE_LESSON.questions) {
      assert.ok(
        teacherNotes.includes(question.sourceLine.replace(/\s+/g, ' ')),
        `Question ${question.id} is not the teacher's own wording: ${question.sourceLine}`
      );

      // The answer must be the teacher's own answer from that line.
      const answer = question.answer.replace(/\s+/g, ' ');
      assert.ok(
        teacherNotes.includes(answer),
        `Question ${question.id} answer is not the teacher's own answer: ${answer}`
      );
    }
  });

  test('keeps the teacher\'s exercise headings and lesson dates', () => {
    const groupOf = (id: string) =>
      FAZIA_MORAL_SCIENCE_LESSON.questions.find(q => q.id === id)?.groupLabel;

    assert.equal(groupOf('g2-ms-l1-fill-1'), 'I. FILL UP');
    assert.equal(groupOf('g2-ms-l1-tf-1'), 'II. TRUE OR FALSE');
    assert.equal(groupOf('g2-ms-l1-qa-1'), 'III. ANSWER THE FOLLOWING');
    assert.equal(groupOf('g2-ms-l2-tf-1'), 'I. TRUE OR FALSE');
    assert.equal(groupOf('g2-ms-l2-match-1'), 'II. MATCH THE FOLLOWING');
    assert.equal(groupOf('g2-ms-l2-qa-1'), 'III. ANSWER THE FOLLOWING');

    assert.equal(MORAL_SCIENCE_SECTIONS[0].lessonDate, '7-8-26 (Friday)');
    assert.equal(MORAL_SCIENCE_SECTIONS[1].lessonDate, '18-9-26 / 7-10-26 (Wednesday)');
  });

  test('fills the blanks, true or false items, and matching pairs the way the notes do', () => {
    const fill = FAZIA_MORAL_SCIENCE_LESSON.questions.find(q => q.id === 'g2-ms-l1-fill-1')!;
    assert.equal(fill.kind, 'fill');
    assert.equal(checkMoralScienceAnswer(fill, '26th'), true);
    assert.equal(checkMoralScienceAnswer(fill, ' 26 '), true);
    assert.equal(checkMoralScienceAnswer(fill, '15'), false);

    const chakra = FAZIA_MORAL_SCIENCE_LESSON.questions.find(q => q.id === 'g2-ms-l1-fill-3')!;
    assert.equal(checkMoralScienceAnswer(chakra, '24'), true);
    assert.equal(checkMoralScienceAnswer(chakra, 'twenty four'), true);

    const markerPens = FAZIA_MORAL_SCIENCE_LESSON.questions.find(q => q.id === 'g2-ms-l1-tf-3')!;
    assert.equal(markerPens.kind, 'true-false');
    assert.equal(markerPens.answer, 'False');
    assert.deepEqual(markerPens.options, ['True', 'False']);
    assert.equal(checkMoralScienceAnswer(markerPens, 'False'), true);
    assert.equal(checkMoralScienceAnswer(markerPens, 'true'), false);

    const match = FAZIA_MORAL_SCIENCE_LESSON.questions.find(q => q.id === 'g2-ms-l2-match-3')!;
    assert.equal(match.kind, 'match');
    assert.deepEqual(match.options, BREAKFAST_TABLE_ETIQUETTES);
    assert.equal(checkMoralScienceAnswer(match, 'Mouth closed'), true);
    assert.equal(checkMoralScienceAnswer(match, 'mouth closed'), true);
    assert.equal(checkMoralScienceAnswer(match, 'Cutlery and napkin'), false);
  });

  test('accepts the teacher\'s written answers and close variants, but not unrelated answers', () => {
    const idea = FAZIA_MORAL_SCIENCE_LESSON.questions.find(q => q.id === 'g2-ms-l1-qa-1')!;
    assert.equal(idea.kind, 'written');
    assert.equal(idea.markingCriteria, idea.answer);
    assert.equal(checkMoralScienceAnswer(idea, 'To make a hand-made flag.'), true);
    assert.equal(checkMoralScienceAnswer(idea, 'to make a handmade flag'), true);
    assert.equal(checkMoralScienceAnswer(idea, 'handmade flag'), true);
    assert.equal(checkMoralScienceAnswer(idea, 'To buy a new flag'), false);

    const praised = FAZIA_MORAL_SCIENCE_LESSON.questions.find(q => q.id === 'g2-ms-l1-qa-2')!;
    assert.equal(checkMoralScienceAnswer(praised, 'The principal praised them.'), true);
    assert.equal(checkMoralScienceAnswer(praised, 'The principal'), true);
    assert.equal(checkMoralScienceAnswer(praised, 'The teacher'), false);

    const dosas = FAZIA_MORAL_SCIENCE_LESSON.questions.find(q => q.id === 'g2-ms-l2-qa-1')!;
    assert.equal(checkMoralScienceAnswer(dosas, "Ria's mom make dosas and chutney."), true);
    assert.equal(checkMoralScienceAnswer(dosas, 'dosas and chutney'), true);
    assert.equal(checkMoralScienceAnswer(dosas, 'idli and sambar'), false);

    const chutney = FAZIA_MORAL_SCIENCE_LESSON.questions.find(q => q.id === 'g2-ms-l2-qa-2')!;
    assert.equal(checkMoralScienceAnswer(chutney, "Because Ria's mom gave more chutney."), true);
    assert.equal(checkMoralScienceAnswer(chutney, 'Because she gave more chutney'), true);
    assert.equal(checkMoralScienceAnswer(chutney, 'Because she gave more idli'), false);
  });

  test('normalizes answers before checking them', () => {
    assert.equal(normalizeMoralScienceAnswer('  We celebrate REPUBLIC day.  '), 'we celebrate republic day');
    assert.equal(normalizeMoralScienceAnswer('Hand–made flag!'), 'hand-made flag');
  });

  test('manages Moral Science progress in local storage with validation and session support', () => {
    assert.equal(getMoralScienceStorageKey('fazia'), 'academy_moral-science_fazia_v1');
    assert.equal(getMoralScienceStorageKey('shiza'), 'academy_moral-science_shiza_v1');

    const initial = loadMoralScienceProgress('fazia');
    assert.equal(initial.studentId, 'fazia');
    assert.equal(initial.lessonId, 'moral-science-grade-2-lessons-1-2');
    assert.equal(initial.practice, null);
    assert.equal(initial.exam, null);
    assert.deepEqual(initial.reviewQuestionIds, []);

    const practiceResult: MoralScienceResult = {
      mode: 'practice',
      completedAt: new Date().toISOString(),
      answers: [
        { questionId: 'g2-ms-l1-fill-1', answer: '26th', correct: true },
        { questionId: 'g2-ms-l1-tf-3', answer: 'False', correct: false }
      ]
    };
    const saved = saveMoralScienceResult('fazia', practiceResult);
    assert.ok(saved);
    assert.deepEqual(saved.practice?.answers, practiceResult.answers);
    assert.deepEqual(saved.reviewQuestionIds, ['g2-ms-l1-tf-3']);

    const cleared = updateMoralScienceReviewQuestionIds(
      loadMoralScienceProgress('fazia').reviewQuestionIds,
      [{ questionId: 'g2-ms-l1-tf-3', answer: 'False', correct: true }],
      'practice',
      false
    );
    assert.deepEqual(cleared, []);

    const fullExamAnswers = FAZIA_MORAL_SCIENCE_LESSON.questions.map(q => ({
      questionId: q.id,
      answer: q.answer,
      correct: true
    }));
    const savedExam = saveMoralScienceResult('fazia', {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      answers: fullExamAnswers
    });
    assert.ok(savedExam);
    assert.equal(savedExam.exam?.answers.length, 22);

    assert.equal(isValidMoralScienceProgress(null, 'fazia'), false);
    assert.equal(isValidMoralScienceProgress({}, 'fazia'), false);
    assert.equal(isValidMoralScienceProgress({ studentId: 'fazia', lessonId: 'wrong-id' }, 'fazia'), false);
    assert.equal(isValidMoralScienceProgress({ studentId: 'fazia', lessonId: 'moral-science-grade-2-lessons-1-2', practice: { mode: 'invalid' } }, 'fazia'), false);
  });

  test('keeps Moral Science unavailable for Grade 6 learners', () => {
    assert.equal(isValidMoralScienceProgress({ studentId: 'shiza' }, 'shiza'), false);
    const shizaProgress = loadMoralScienceProgress('shiza');
    assert.equal(shizaProgress.studentId, 'shiza');
    assert.equal(shizaProgress.practice, null);
    assert.equal(shizaProgress.exam, null);

    assert.equal(saveMoralScienceResult('shiza', {
      mode: 'exam',
      completedAt: new Date().toISOString(),
      answers: []
    }), null);
  });
});
