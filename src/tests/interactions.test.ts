import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import type { ExamRevisionViewProps, RevisionQuestion, RevisionResponse } from '../components/ExamRevisionView';
import type { LearningRecord } from '../learning/persistence';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  localStorage: dom.window.localStorage,
  IS_REACT_ACT_ENVIRONMENT: true
});
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
Object.defineProperty(globalThis, 'indexedDB', { value: undefined, configurable: true });

const { render, fireEvent, cleanup, waitFor } = await import('@testing-library/react');
const { default: App } = await import('../App');
const { ExamRevisionView } = await import('../components/ExamRevisionView');
const { SubjectRevisionView } = await import('../components/SubjectRevisionView');
const { getStudentProfile } = await import('../data/profiles');
const { getAvailableSubjectsForGrade } = await import('../data/subjects');
const { getRoboticsLesson } = await import('../data/robotics');
const { ACTIVE_PROFILE_KEY, DEFAULT_SETTINGS, SETTINGS_KEY } = await import('../utils/appStorage');
const { buildSubjectRevision } = await import('../learning/subjectRevision');
const { loadRoboticsProgress } = await import('../utils/roboticsStorage');
const { loadMathsProgress } = await import('../utils/mathsStorage');
const { loadMalayalamProgress } = await import('../utils/malayalamStorage');
const { loadEvsProgress } = await import('../utils/evsStorage');
const { getAllProgress, getStudentStorageKey, getWordProgress } = await import('../utils/storage');
const { audioService } = await import('../utils/audio');
const { getDefaultLearningRepository } = await import('../learning/persistence');

const settings = { ...DEFAULT_SETTINGS, speechAudio: false };

function question(
  id: string,
  answer: string,
  overrides: Partial<RevisionQuestion> = {}
): RevisionQuestion {
  return {
    id,
    section: 'main',
    sectionLabel: 'Main portion',
    prompt: `What is the answer to ${id}?`,
    answer,
    responseFormat: 'written',
    language: 'en',
    languageCode: 'en-US',
    grade: async response => ({
      correct: response.trim().toLowerCase() === answer.toLowerCase(),
      source: 'deterministic'
    }),
    ...overrides
  };
}

function renderRevision(
  questions: readonly RevisionQuestion[],
  options: {
    sessionSize?: number;
    allowSectionAssessment?: boolean;
    speechAudio?: boolean;
    onComplete?: ExamRevisionViewProps['onComplete'];
  } = {}
) {
  return render(React.createElement(ExamRevisionView, {
    learnerId: 'fazia',
    subjectId: 'spell-bee',
    lessonId: 'interaction-test',
    title: 'Test revision',
    description: 'Recall first, then recheck after other questions.',
    questions,
    sessionSize: options.sessionSize ?? 5,
    onSessionSizeChange: () => {},
    speechAudio: options.speechAudio ?? false,
    ...(options.allowSectionAssessment ? { allowSectionAssessment: true } : {}),
    ...(options.onComplete ? { onComplete: options.onComplete } : {})
  }));
}

describe('Shared exam-eve revision interactions', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(ACTIVE_PROFILE_KEY, 'fazia');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  });

  afterEach(cleanup);

  for (const learnerId of ['fazia', 'shiza'] as const) {
    const grade = getStudentProfile(learnerId).grade;
    for (const subject of getAvailableSubjectsForGrade(grade)) {
      test(`${learnerId}'s ${subject.name} uses the shared revision overview`, async () => {
        const view = render(React.createElement(SubjectRevisionView, {
          activeStudent: learnerId,
          subjectId: subject.id,
          settings,
          onSessionSizeChange: () => {}
        }));

        await view.findByRole('region', { name: 'Revision overview' });
        assert.ok(view.getByRole('heading', { name: 'Exam-eve revision' }));
        assert.ok(view.getByLabelText('Choose a portion'));
        const batchSize = view.getByRole('combobox', { name: 'Questions per batch' });
        assert.ok(batchSize.className.includes('min-h-12'), 'batch control remains touch-friendly on small screens');
        assert.ok(view.getByRole('button', { name: 'Start revision' }));
        assert.ok(view.getByRole('button', { name: 'Optional full mock exam' }));
        assert.ok(view.getByText(/Recall first, get feedback, then recheck mistakes after other questions/));
        if (subject.id === 'maths') {
          const portion = view.getByRole('combobox', { name: 'Choose a portion' }) as HTMLSelectElement;
          const firstPortion = Array.from(portion.options).find(option => option.value !== 'all');
          assert.ok(firstPortion);
          fireEvent.change(portion, { target: { value: firstPortion.value } });
          assert.ok(view.getByRole('button', { name: /Optional .* assessment/ }));
        } else {
          assert.equal(view.queryByRole('button', { name: /Optional .* assessment/ }), null);
        }
      });
    }
  }

  test('the app routes directly to shared Spell Bee revision without legacy subnavigation', async () => {
    const view = render(React.createElement(App));
    assert.ok(view.getByRole('region', { name: 'Subjects for Grade 2' }));
    fireEvent.click(view.getByRole('button', { name: 'Open Spell Bee' }));

    await view.findByRole('heading', { name: 'Exam-eve revision' });
    assert.ok(view.getByRole('region', { name: 'Revision overview' }));
    assert.equal(view.queryByRole('navigation', { name: 'Spell Bee navigation' }), null);
    assert.equal(view.queryByRole('button', { name: /Worksheets/ }), null);
  });

  test('added Malayalam portions stay recall-first and exact multiple meanings need no online grading', async t => {
    const fetcher = t.mock.method(globalThis, 'fetch', async () => {
      throw new Error('Exact multiple meanings must be checked locally.');
    });
    const definition = buildSubjectRevision('malayalam', 'shiza', 'https://grading.example/grade');
    assert.equal(definition.questions.length, 176);
    const questions = definition.questions.filter(item => item.section === 'multiple-meanings');
    assert.equal(questions.length, 2);
    for (const item of questions) {
      assert.equal(item.language, 'ml');
      assert.deepEqual(await item.grade(item.answer, new AbortController().signal), {
        correct: true, source: 'deterministic'
      });
    }

    const view = render(React.createElement(SubjectRevisionView, {
      activeStudent: 'shiza', subjectId: 'malayalam', settings,
      onSessionSizeChange: () => {}, gradingApiUrl: 'https://grading.example/grade'
    }));
    await view.findByRole('region', { name: 'Revision overview' });
    assert.ok(view.getByRole('option', { name: /Multiple meanings/ }));
    fireEvent.change(view.getByRole('combobox', { name: 'Choose a portion' }), {
      target: { value: 'multiple-meanings' }
    });
    fireEvent.click(view.getByRole('button', { name: 'Start revision' }));
    const input = await view.findByRole('textbox', { name: 'Your answer' });
    const active = questions.find(item => view.queryByRole('heading', { name: item.prompt }));
    assert.ok(active);
    for (const item of questions) assert.equal(view.queryByText(item.answer), null);
    fireEvent.change(input, { target: { value: active.answer } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Correct. Keep going.');
    assert.equal(fetcher.mock.callCount(), 0);
  });

  test('an added Malayalam written answer remains ungraded and retryable after a grading outage', async t => {
    const definition = buildSubjectRevision('malayalam', 'shiza', 'https://grading.example/grade');
    const item = definition.questions.find(question => question.id === 'g6-mal-l5-answer-5');
    assert.ok(item);
    const submitted = 'മാംസം മുറിക്കുമ്പോൾ ഒരു തുള്ളി ചോര പോലും വരരുതെന്ന് പോർഷ്യ പറഞ്ഞു.';
    let calls = 0;
    const fetcher: typeof fetch = async (_input, init) => {
      calls++;
      assert.deepEqual(JSON.parse(String(init?.body)), {
        lessonId: definition.lessonId, questionId: item.id, answer: submitted
      });
      return calls === 1
        ? Response.json({ error: 'Temporarily unavailable.' }, { status: 503 })
        : Response.json({ correct: true, feedback: 'ശരിയായ ആശയം പറഞ്ഞു.' });
    };
    t.mock.method(globalThis, 'fetch', fetcher);
    const completed: RevisionResponse[][] = [];
    const view = render(React.createElement(ExamRevisionView, {
      ...definition, questions: [item],
      learnerId: 'shiza', subjectId: 'malayalam', sessionSize: 1,
      onSessionSizeChange: () => {}, speechAudio: false,
      onComplete: result => {
        completed.push(result.answers);
        return definition.onComplete?.(result) ?? false;
      }
    }));
    await view.findByRole('region', { name: 'Revision overview' });
    fireEvent.click(view.getByRole('button', { name: 'Start revision' }));
    const input = await view.findByRole('textbox', { name: 'Your answer' });
    fireEvent.change(input, { target: { value: submitted } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Automatic checking is unavailable. Your answer has not been marked. Please retry.');
    assert.equal((input as HTMLTextAreaElement).value, submitted);
    assert.equal(view.queryByText('Let’s review this answer.'), null);
    assert.equal(loadMalayalamProgress('shiza').practice, null);
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('ശരിയായ ആശയം പറഞ്ഞു.');
    fireEvent.click(view.getByRole('button', { name: 'Finish this batch' }));
    await view.findByRole('heading', { name: 'Revision batch complete' });
    assert.equal(calls, 2);
    assert.equal(completed.length, 1);
    assert.equal(completed[0].length, 1);
    assert.equal(completed[0][0].outcome, 'correct');
    assert.equal(loadMalayalamProgress('shiza').practice?.answers.length, 1);
    assert.equal(loadMalayalamProgress('shiza').practice?.answers[0].aiChecked, true);
    assert.equal(loadMalayalamProgress('fazia').practice, null);
  });

  test('legacy subject summaries keep the initial result after an immediate correction and recheck', () => {
    const definition = buildSubjectRevision('robotics', 'fazia', '');
    if (!definition.onComplete) throw new Error('Robotics revision must save its completed result.');
    const questionId = getRoboticsLesson('fazia').questions[0].id;
    const answers: RevisionResponse[] = [
      {
        questionId, answer: 'not yet', outcome: 'incorrect', attemptKind: 'initial',
        assistance: [], attemptId: 'initial-attempt', attemptedAt: '2026-11-04T10:00:00.000Z'
      },
      {
        questionId, answer: 'corrected answer', outcome: 'correct', attemptKind: 'correction',
        assistance: ['answer-revealed'], attemptId: 'correction-attempt', attemptedAt: '2026-11-04T10:01:00.000Z'
      },
      {
        questionId, answer: 'corrected answer', outcome: 'correct', attemptKind: 'recheck',
        assistance: [], attemptId: 'recheck-attempt', attemptedAt: '2026-11-04T10:05:00.000Z'
      }
    ];

    assert.equal(definition.onComplete({
      mode: 'practice', section: 'all', completedAt: '2026-11-04T10:05:00.000Z', answers
    }), true);
    const savedAnswer = loadRoboticsProgress('fazia').practice?.answers[0];
    assert.equal(savedAnswer?.attemptId, 'initial-attempt');
    assert.equal(savedAnswer?.correct, false);
  });

  test('a correction does not erase the first mistake and a later unaided recheck resolves it', async () => {
    const first = question('q1', 'first answer', {
        helpContent: React.createElement('p', null, 'Hint: recall the first answer.')
    });
    const view = renderRevision([
      first,
      question('q2', 'second answer'),
      question('q3', 'third answer')
    ], { sessionSize: 3 });

    await view.findByRole('region', { name: 'Revision overview' });
    fireEvent.click(view.getByRole('button', { name: 'Start revision' }));
    await view.findByRole('textbox', { name: 'Your answer' });

    fireEvent.click(view.getByRole('button', { name: 'Show help' }));
    assert.ok(view.getByText('Hint: recall the first answer.'));
    fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: 'not yet' } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Let’s review this answer.');
    assert.ok(view.getByText((_, element) =>
      element?.tagName === 'P' && element.textContent?.replace(/\s+/g, ' ').trim() === 'Answer: first answer'
    ));

    fireEvent.click(view.getByRole('button', { name: 'Try once more now' }));
    fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: 'first answer' } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Correct. Keep going.');
    fireEvent.click(view.getByRole('button', { name: 'Continue' }));

    fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: 'second answer' } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Correct. Keep going.');
    fireEvent.click(view.getByRole('button', { name: 'Continue' }));

    fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: 'third answer' } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Correct. Keep going.');
    fireEvent.click(view.getByRole('button', { name: 'Finish this batch' }));

    await view.findByText(/Recheck after other questions/);
    fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: 'first answer' } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Correct. Keep going.');
    fireEvent.click(view.getByRole('button', { name: 'Finish this batch' }));

    await view.findByRole('heading', { name: 'Revision batch complete' });
    assert.ok(view.getAllByText(/Same-day recheck/).length >= 2);
    assert.ok(view.getAllByText(/Help used/).length >= 1);
    fireEvent.click(view.getByRole('button', { name: 'Return to revision' }));
    assert.ok(view.getByText(/3 of 3 checked · 0 to recheck/));
  });

  test('mock exam hides answers until completion and records skips in the result', async () => {
    const completed: Parameters<NonNullable<ExamRevisionViewProps['onComplete']>>[0][] = [];
    const view = renderRevision([
      question('q1', 'first answer'),
      question('q2', 'second answer')
    ], {
      allowSectionAssessment: true,
      onComplete: result => {
        completed.push(result);
        return true;
      }
    });

    await view.findByRole('region', { name: 'Revision overview' });
    fireEvent.click(view.getByRole('button', { name: 'Optional full mock exam' }));
    await view.findByRole('button', { name: 'Save answer and continue' });
    assert.equal(view.queryByText(/Answer: first answer/), null);
    fireEvent.click(view.getByRole('button', { name: /I don’t know yet/ }));

    await view.findByRole('heading', { name: 'What is the answer to q2?' });
    fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: 'second answer' } });
    fireEvent.click(view.getByRole('button', { name: 'Save answer and continue' }));
    await view.findByRole('heading', { name: 'Mock exam complete' });

    assert.ok(view.getByText('1 correct of 2 checked'));
    assert.ok(view.getByText((_, element) =>
      element?.tagName === 'P' && element.textContent?.replace(/\s+/g, ' ').trim() === 'Answer: first answer'
    ));
    assert.equal(completed.length, 1);
    assert.equal(completed[0].mode, 'exam');
    assert.deepEqual(completed[0].answers.map(answer => answer.outcome), ['skipped', 'correct']);
  });

  test('save and exit resumes the same batch with its feedback and unfinished answer', async () => {
    const completed: Parameters<NonNullable<ExamRevisionViewProps['onComplete']>>[0][] = [];
    const view = renderRevision([
      question('q1', 'first answer'),
      question('q2', 'second answer')
    ], {
      onComplete: result => {
        completed.push(result);
        return true;
      }
    });

    await view.findByRole('region', { name: 'Revision overview' });
    fireEvent.click(view.getByRole('button', { name: 'Start revision' }));
    fireEvent.change(await view.findByRole('textbox', { name: 'Your answer' }), {
      target: { value: 'first answer' }
    });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Correct. Keep going.');
    fireEvent.click(view.getByRole('button', { name: 'Save and exit' }));
    assert.equal(view.queryByRole('button', { name: 'Resume saved session' }), null);
    fireEvent.click(view.getByRole('button', { name: 'Resume current session' }));
    assert.ok(view.getByText('Correct. Keep going.'));
    fireEvent.click(view.getByRole('button', { name: 'Continue' }));

    fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), {
      target: { value: 'second answer' }
    });
    fireEvent.click(view.getByRole('button', { name: 'Save and exit' }));
    fireEvent.click(view.getByRole('button', { name: 'Resume current session' }));
    assert.ok(view.getByText('Revision · Question 2 of 2'));
    assert.equal((view.getByRole('textbox', { name: 'Your answer' }) as HTMLTextAreaElement).value, 'second answer');
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Correct. Keep going.');
    fireEvent.click(view.getByRole('button', { name: 'Finish this batch' }));
    await view.findByRole('heading', { name: 'Revision batch complete' });

    assert.equal(completed.length, 1);
    assert.deepEqual(completed[0].answers.map(answer => answer.outcome), ['correct', 'correct']);
    assert.equal(completed[0].answers[0].attemptId.split(':')[0], completed[0].answers[1].attemptId.split(':')[0]);
    fireEvent.click(view.getByRole('button', { name: 'Return to revision' }));
    assert.equal(view.queryByRole('button', { name: 'Resume current session' }), null);
  });

  test('a Maths assessment saves graded answers after read-aloud, including the final question', async t => {
    const speak = t.mock.method(audioService, 'speak', () => true);
    const definition = buildSubjectRevision('maths', 'fazia', '');
    const portion = definition.questions[0].section;
    const questions = definition.questions.filter(item => item.section === portion);
    const view = render(React.createElement(ExamRevisionView, {
      ...definition,
      learnerId: 'fazia',
      subjectId: 'maths',
      sessionSize: 5,
      onSessionSizeChange: () => {},
      speechAudio: true
    }));

    await view.findByRole('region', { name: 'Revision overview' });
    fireEvent.change(view.getByRole('combobox', { name: 'Choose a portion' }), { target: { value: portion } });
    fireEvent.click(view.getByRole('button', { name: /Optional .* assessment/ }));
    for (const item of questions) {
      await view.findByRole('heading', { name: item.prompt });
      fireEvent.click(view.getByRole('button', { name: 'Listen to question' }));
      if (item.options) {
        fireEvent.click(view.getByRole('radio', { name: item.answer }));
      } else {
        fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: item.answer } });
      }
      fireEvent.click(view.getByRole('button', { name: 'Save answer and continue' }));
    }

    await view.findByRole('heading', { name: 'Mock exam complete' });
    assert.ok(view.getByText(`${questions.length} correct of ${questions.length} checked`));
    assert.ok(view.getByText('Result saved on this device.'));
    assert.equal(view.queryByText('Not checked'), null);
    assert.equal(speak.mock.callCount(), questions.length);
    const saved = loadMathsProgress('fazia').exam;
    assert.equal(saved?.answers.length, questions.length);
    assert.ok(saved?.answers.every(answer => answer.correct && answer.assistance?.includes('read-aloud')));
    assert.equal(loadMathsProgress('shiza').exam, null);
  });

  for (const finish of ['check', 'skip'] as const) {
    test(`a failed exam check can ${finish === 'check' ? 'be retried' : 'be skipped'} without retaining an ungraded duplicate`, async () => {
      let checks = 0;
      const completed: Parameters<NonNullable<ExamRevisionViewProps['onComplete']>>[0][] = [];
      const view = renderRevision([
        question('q1', 'first answer'),
        question('q2', 'second answer', {
          grade: async () => {
            checks++;
            if (checks === 1) throw new Error('Checking unavailable. Retry this answer.');
            return { correct: true, source: 'ai', feedback: 'Correct idea.' };
          }
        })
      ], {
        onComplete: result => {
          completed.push(result);
          return result.answers.every(answer => answer.outcome !== 'ungraded');
        }
      });

      await view.findByRole('region', { name: 'Revision overview' });
      fireEvent.click(view.getByRole('button', { name: 'Optional full mock exam' }));
      fireEvent.change(await view.findByRole('textbox', { name: 'Your answer' }), { target: { value: 'first answer' } });
      fireEvent.click(view.getByRole('button', { name: 'Save answer and continue' }));
      await view.findByRole('heading', { name: 'What is the answer to q2?' });
      fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: 'second answer' } });
      fireEvent.click(view.getByRole('button', { name: 'Save answer and continue' }));
      await view.findByText('Checking unavailable. Retry this answer.');
      fireEvent.click(view.getByRole('button', { name: finish === 'check' ? 'Save answer and continue' : 'I don’t know yet' }));

      await view.findByRole('heading', { name: 'Mock exam complete' });
      assert.ok(view.getByText('Result saved on this device.'));
      assert.equal(view.queryByText('Not checked'), null);
      assert.equal(completed.length, 1);
      assert.deepEqual(completed[0].answers.map(answer => answer.outcome), ['correct', finish === 'check' ? 'correct' : 'skipped']);
      assert.equal(new Set(completed[0].answers.map(answer => answer.attemptId)).size, 2);
      assert.equal(checks, finish === 'check' ? 2 : 1);
    });
  }

  test('Spell Bee completion updates only the learner summary, preserves first attempts, and is safe to retry', () => {
    const definition = buildSubjectRevision('spell-bee', 'fazia', '');
    assert.ok(definition.onComplete, 'Spell Bee must save its legacy summary on completion.');
    const [first, second] = definition.questions;
    const answers: RevisionResponse[] = [
      {
        questionId: first.id, answer: 'not yet', outcome: 'incorrect', attemptKind: 'initial',
        assistance: [], attemptId: 'spelling-initial', attemptedAt: '2026-11-04T10:00:00.000Z'
      },
      {
        questionId: first.id, answer: first.answer, outcome: 'correct', attemptKind: 'correction',
        assistance: ['answer-revealed'], attemptId: 'spelling-correction', attemptedAt: '2026-11-04T10:01:00.000Z'
      },
      {
        questionId: first.id, answer: first.answer, outcome: 'correct', attemptKind: 'recheck',
        assistance: [], attemptId: 'spelling-recheck', attemptedAt: '2026-11-04T10:05:00.000Z'
      },
      {
        questionId: second.id, answer: second.answer, outcome: 'ungraded', attemptKind: 'initial',
        assistance: [], attemptId: 'spelling-second', attemptedAt: '2026-11-04T10:06:00.000Z'
      }
    ];
    const result = { mode: 'practice' as const, section: 'all', completedAt: '2026-11-04T10:06:00.000Z', answers };

    assert.equal(definition.onComplete({ ...result, answers: [] }), false);
    assert.equal(definition.onComplete(result), false);
    assert.deepEqual(getAllProgress('fazia'), {});
    answers[3] = { ...answers[3], outcome: 'skipped', answer: '', skipped: true };
    assert.equal(definition.onComplete(result), true);
    assert.equal(definition.onComplete(result), true);
    const saved = getWordProgress(first.id, 'fazia');
    assert.equal(saved.attempts, 1);
    assert.equal(saved.history[0].wasCorrect, false);
    assert.equal(saved.history[0].mode, 'practice');
    assert.equal(saved.lastMistake, 'not yet');
    assert.equal(getWordProgress(second.id, 'fazia').attempts, 1);
    assert.equal(getWordProgress(second.id, 'fazia').needsRevisit, true);
    assert.deepEqual(getAllProgress('shiza'), {});
  });

  test('Spell Bee exam summaries keep assisted answers out of unaided recall evidence', () => {
    const definition = buildSubjectRevision('spell-bee', 'shiza', '');
    assert.ok(definition.onComplete);
    const answers: RevisionResponse[] = definition.questions.slice(0, 2).map((item, index) => ({
      questionId: item.id, answer: item.answer, outcome: 'correct', attemptKind: 'exam',
      assistance: index === 0 ? [] : ['read-aloud'], attemptId: `spell-exam-${index}`,
      attemptedAt: '2026-11-04T10:00:00.000Z'
    }));
    assert.equal(definition.onComplete({
      mode: 'exam', section: 'all', completedAt: '2026-11-04T10:00:00.000Z', answers
    }), true);
    const unaided = getWordProgress(answers[0].questionId, 'shiza');
    const assisted = getWordProgress(answers[1].questionId, 'shiza');
    assert.equal(unaided.history[0].mode, 'test');
    assert.equal(unaided.unaidedCorrectCount, 1);
    assert.equal(assisted.history[0].mode, 'practice');
    assert.equal(assisted.unaidedCorrectCount, 0);
    assert.equal(assisted.lastUnaidedCorrectDate, null);
    assert.deepEqual(getAllProgress('fazia'), {});
  });

  test('Spell Bee save failure remains retryable without counting already saved words twice', t => {
    const definition = buildSubjectRevision('spell-bee', 'fazia', '');
    assert.ok(definition.onComplete);
    const answers: RevisionResponse[] = definition.questions.slice(0, 2).map((item, index) => ({
      questionId: item.id, answer: item.answer, outcome: 'correct', attemptKind: 'exam',
      assistance: [], attemptId: `spell-retry-${index}`, attemptedAt: '2026-11-04T10:00:00.000Z'
    }));
    const result = { mode: 'exam' as const, section: 'all', completedAt: '2026-11-04T10:00:00.000Z', answers };
    const originalSetItem = dom.window.Storage.prototype.setItem;
    let writes = 0;
    const storage = t.mock.method(dom.window.Storage.prototype, 'setItem', function (this: Storage, key: string, value: string) {
      if (key === getStudentStorageKey('fazia') && ++writes === 2) throw new Error('QuotaExceededError');
      originalSetItem.call(this, key, value);
    });

    assert.equal(definition.onComplete(result), false);
    assert.equal(getWordProgress(answers[0].questionId, 'fazia').attempts, 1);
    assert.equal(getWordProgress(answers[1].questionId, 'fazia').attempts, 0);
    storage.mock.restore();
    assert.equal(definition.onComplete(result), true);
    assert.ok(answers.every(answer => getWordProgress(answer.questionId, 'fazia').attempts === 1));
  });

  test('Spell Bee completion mirrors its summary but does not duplicate per-answer history', async t => {
    const records: LearningRecord[] = [];
    t.mock.method(getDefaultLearningRepository(), 'put', async (record: LearningRecord) => { records.push(record); });
    const definition = buildSubjectRevision('spell-bee', 'fazia', '');
    assert.ok(definition.onComplete);
    const item = definition.questions[0];
    Object.defineProperty(globalThis, 'indexedDB', { value: {}, configurable: true });
    try {
      assert.equal(definition.onComplete({
        mode: 'practice', section: 'all', completedAt: '2026-11-04T10:00:00.000Z',
        answers: [{
          questionId: item.id, answer: item.answer, outcome: 'correct', attemptKind: 'initial',
          assistance: [], attemptId: 'already-recorded', attemptedAt: '2026-11-04T10:00:00.000Z'
        }]
      }), true);
      await waitFor(() => assert.equal(records.length, 1));
      assert.equal(records[0].kind, 'progress');
    } finally {
      Object.defineProperty(globalThis, 'indexedDB', { value: undefined, configurable: true });
    }
  });

  test('an unavailable automatic check preserves the answer and allows retry', async () => {
    let checks = 0;
    const writtenQuestion = question('written', 'right answer', {
      grade: async () => {
        checks++;
        if (checks === 1) throw new Error('Automatic written-answer checking is temporarily unavailable.');
        return { correct: true, source: 'ai', feedback: 'The essential idea is present.' };
      }
    });
    const view = renderRevision([writtenQuestion]);

    await view.findByRole('region', { name: 'Revision overview' });
    fireEvent.click(view.getByRole('button', { name: 'Start revision' }));
    const answerField = await view.findByRole('textbox', { name: 'Your answer' });
    fireEvent.change(answerField, { target: { value: 'My saved response' } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));

    await view.findByText('Automatic written-answer checking is temporarily unavailable.');
    assert.equal(
      (view.getByRole('textbox', { name: 'Your answer' }) as HTMLTextAreaElement).value,
      'My saved response'
    );
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Correct. Keep going.');
    assert.ok(view.getByText('The essential idea is present.'));
    assert.equal(checks, 2);
  });

  test('Fazia Grade 2 EVS section revision supports recall, feedback, and saves progress', async () => {
    const view = render(React.createElement(SubjectRevisionView, {
      activeStudent: 'fazia',
      subjectId: 'evs',
      settings: { ...settings, sessionSize: 2 },
      onSessionSizeChange: () => {}
    }));

    await view.findByRole('region', { name: 'Revision overview' });
    assert.ok(view.getByRole('option', { name: /Lesson 2 · Our Food/ }));
    assert.ok(view.getByRole('option', { name: /Lesson 3 · Our Clothes/ }));
    assert.ok(view.getByRole('option', { name: /Lesson 4 · Our Houses/ }));
    assert.ok(view.getByRole('option', { name: /Lesson 5 · Our Transport/ }));
    assert.ok(view.getByRole('option', { name: /Lesson 6 · Our Festivals/ }));

    // Select Lesson 2: Our Food
    fireEvent.change(view.getByRole('combobox', { name: 'Choose a portion' }), {
      target: { value: 'our-food' }
    });

    fireEvent.click(view.getByRole('button', { name: 'Start revision' }));
    const input = await view.findByRole('textbox', { name: 'Your answer' });

    // Active retrieval: answer is not revealed before submitting
    assert.equal(view.queryByText('energy'), null);

    // Answer the first question correctly
    fireEvent.change(input, { target: { value: 'energy' } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));

    await view.findByText('Correct. Keep going.');
  });
});

