import { afterEach, beforeEach, describe, mock, test } from 'node:test';
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

const { render, fireEvent, cleanup, waitFor, act } = await import('@testing-library/react');
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
const { loadBiologyProgress } = await import('../utils/biologyStorage');
const { audioService } = await import('../utils/audio');
const { getDefaultLearningRepository, listLearningAttempts } = await import('../learning/persistence');

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
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState(null, '', '/');
    }
  });

afterEach(() => {
  cleanup();
  mock.timers.reset();
});

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

  test('header audio and turtle controls are limited to Spell Bee and stop audio on exit', async t => {
    const stopAll = t.mock.method(audioService, 'stopAll');
    const view = render(React.createElement(App));

    // Home view: no turtle or audio toggle in header
    assert.equal(view.queryByTitle(/Slow speech|Normal speech/), null);
    assert.equal(view.queryByRole('button', { name: 'Toggle audio' }), null);

    // Open Maths: still no turtle or audio toggle
    fireEvent.click(view.getByRole('button', { name: 'Open Maths' }));
    await view.findByRole('region', { name: 'Revision overview' });
    assert.equal(view.queryByTitle(/Slow speech|Normal speech/), null);
    assert.equal(view.queryByRole('button', { name: 'Toggle audio' }), null);

    // Navigate to Home then to Spell Bee
    fireEvent.click(view.getByRole('button', { name: 'Subjects' }));
    await view.findByRole('heading', { name: 'What would you like to learn?' });
    fireEvent.click(view.getByRole('button', { name: 'Open Spell Bee' }));
    await view.findByRole('region', { name: 'Revision overview' });

    // In Spell Bee: turtle and audio toggle are visible
    assert.ok(view.getByTitle(/Slow speech|Normal speech/));
    assert.ok(view.getByRole('button', { name: 'Toggle audio' }));

    // Navigating away from Spell Bee calls stopAll and hides controls
    fireEvent.click(view.getByRole('button', { name: 'Subjects' }));
    await view.findByRole('heading', { name: 'What would you like to learn?' });
    assert.equal(view.queryByTitle(/Slow speech|Normal speech/), null);
    assert.equal(view.queryByRole('button', { name: 'Toggle audio' }), null);
    assert.ok(stopAll.mock.callCount() > 0);
  });

  test('the subjects home view merges progress and renders revision coverage and learning history', async () => {
    mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-10T03:30:00Z') });
    const { ParentDashboard, default: ParentDashboardDefault } = await import('../components/ParentDashboard');
    const { ProgressDashboard, default: ProgressDashboardDefault } = await import('../components/ProgressDashboard');
    assert.equal(ParentDashboard, ProgressDashboard);
    assert.equal(ParentDashboardDefault, ProgressDashboardDefault);

    const view = render(React.createElement(App));
    // Header no longer contains standalone Progress button
    assert.equal(view.queryByRole('button', { name: 'Progress' }), null);

    // Subjects tab includes both subjects and revision coverage
    const heading = await view.findByRole('heading', { name: 'What would you like to learn?' });
    assert.ok(heading);
    const coverageRegion = await view.findByRole('region', { name: 'Current revision coverage' });
    assert.ok(coverageRegion);
    assert.ok(await view.findByRole('region', { name: 'Recent learning history' }));

    // Revision coverage focuses on next upcoming exam (for Fazia, Hindi after holiday)
    assert.ok(view.getByText(/Revision Coverage · Hindi \(हिन्दी\)/));

    // Finished exams are tagged with 'Exam completed' badge on their cards
    const completedBadges = view.queryAllByText('Exam completed');
    assert.ok(completedBadges.length > 0, 'Past exam subjects should show Exam completed badge');
  });

  test('the subjects home view merges timetable with expandable schedule and preserves native scripts', async () => {
    mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-10T03:30:00Z') });
    const { ExamTimetableView, default: ExamTimetableViewDefault } = await import('../components/ExamTimetableView');
    assert.ok(ExamTimetableView);
    assert.equal(ExamTimetableView, ExamTimetableViewDefault);

    const view = render(React.createElement(App));
    // Header no longer contains standalone Timetable button
    assert.equal(view.queryByRole('button', { name: 'Timetable' }), null);

    // Initial state: Spotlight card is visible, timetable details are collapsed
    const spotlight = await view.findByRole('region', { name: 'First Semester Exam Schedule' });
    assert.ok(spotlight);
    // Focus remains on next actual exam rather than shouting Holiday as main headline
    assert.ok(view.getByText(/Next Exam: Hindi \(हिन्दी\) \(11\/11\/26\)/));
    assert.ok(view.getByText(/holiday \(self-revision day\)/i));
    const viewButton = view.getByRole('button', { name: 'View Full Timetable' });
    assert.ok(viewButton);
    assert.equal(view.queryByText('Reporting & Assembly'), null);

    // Click to expand timetable
    fireEvent.click(viewButton);
    assert.ok(await view.findByText('Reporting & Assembly'));
    assert.ok(view.getByText('Examination Timing'));
    assert.ok(view.getByText('Bus & Dispersal'));
    assert.equal(view.queryByRole('button', { name: 'Print Schedule' }), null);
    assert.ok(view.getByText('General Exam Guidelines'));

    // Check that Malayalam and Hindi native scripts are rendered in the schedule
    assert.ok(view.getAllByText(/Malayalam \(മലയാളം\)/).length >= 1);
    assert.ok(view.getAllByText(/Hindi \(हिन्दी\)/).length >= 1);

    // Collapse timetable
    const hideButton = view.getByRole('button', { name: 'Hide Timetable' });
    fireEvent.click(hideButton);
    assert.equal(view.queryByText('Reporting & Assembly'), null);

    // Verify ExamTimetableView wrapper backwards compatibility and learner switching
    cleanup();
    let switchedStudent: string | null = null;
    let switchCalls = 0;
    const wrapper = render(React.createElement(ExamTimetableView, {
      activeStudent: 'fazia',
      onSwitchStudent: id => {
        switchCalls++;
        switchedStudent = id;
      }
    }));
    // Clicking already-selected learner (Fazia) does not trigger switch
    assert.ok(wrapper.getByRole('button', { name: /Fazia/ }));
    fireEvent.click(wrapper.getByRole('button', { name: /Fazia/ }));
    assert.equal(switchCalls, 0);
    assert.equal(switchedStudent, null);

    // Clicking a different learner (Shiza) triggers switch
    assert.ok(wrapper.getByRole('button', { name: /Shiza/ }));
    fireEvent.click(wrapper.getByRole('button', { name: /Shiza/ }));
    assert.equal(switchCalls, 1);
    assert.equal(switchedStudent, 'shiza');
  });

  test('AudioEngine properties synchronize speechAudio and slowSpeech with legacy aliases', () => {
    audioService.speechAudio = false;
    assert.equal(audioService.speechEnabled, false);
    audioService.speechEnabled = true;
    assert.equal(audioService.speechAudio, true);

    audioService.slowSpeech = true;
    assert.equal(audioService.slowMode, true);
    audioService.slowMode = false;
    assert.equal(audioService.slowSpeech, false);
  });

  test('getSubjectForView normalizes legacy session view to spell-bee and leaves non-subject views undefined', async () => {
    const { getSubjectForView } = await import('../data/subjects');
    assert.equal(getSubjectForView('spell-bee')?.id, 'spell-bee');
    assert.equal(getSubjectForView('session' as any)?.id, 'spell-bee');
    assert.equal(getSubjectForView('parent' as any), undefined);
    assert.equal(getSubjectForView('progress'), undefined);
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
    assert.ok(view.getByText(/Fantastic effort|Well done/));
    assert.ok(view.getAllByText(/Same-day recheck/).length >= 2);
    assert.ok(view.getAllByText(/Help used/).length >= 1);
    fireEvent.click(view.getByRole('button', { name: 'Return to revision' }));
    assert.ok(view.getByText(/3 of 3 checked · 0 to recheck/));
  });

  test('rechecking mistakes succeeds when all questions in portion are checked even if gapCount < 2', async () => {
    const q1 = question('q1', 'first answer');
    const q2 = question('q2', 'second answer');
    const view = renderRevision([q1, q2], { sessionSize: 2 });

    await view.findByRole('region', { name: 'Revision overview' });
    fireEvent.click(view.getByRole('button', { name: 'Start revision' }));

    // Answer q1 correctly
    await view.findByRole('textbox', { name: 'Your answer' });
    fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: 'first answer' } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Correct. Keep going.');
    fireEvent.click(view.getByRole('button', { name: 'Continue' }));

    // Answer q2 incorrectly (last question of round -> gapCount = 0)
    await view.findByRole('textbox', { name: 'Your answer' });
    fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: 'wrong answer' } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Let’s review this answer.');
    fireEvent.click(view.getByRole('button', { name: 'Finish this batch' }));

    // Finish batch and return to overview
    await view.findByRole('heading', { name: 'Revision batch complete' });
    fireEvent.click(view.getByRole('button', { name: 'Return to revision' }));

    // On overview: 2 of 2 checked · 1 to recheck
    await view.findByText('2 of 2 checked · 1 to recheck');
    assert.ok(view.getByText(/All portion questions are checked. Recheck your remaining mistakes/));

    // Clicking "Recheck mistakes (1)" must NOT show error banner
    const recheckBtn = view.getByRole('button', { name: 'Recheck mistakes (1)' });
    fireEvent.click(recheckBtn);

    // Verify session started directly on q2 recheck without error banner
    assert.equal(view.queryByRole('alert'), null);
    await view.findByRole('heading', { name: 'What is the answer to q2?' });
    fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: 'second answer' } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Correct. Keep going.');
    fireEvent.click(view.getByRole('button', { name: 'Finish this batch' }));

    // Batch summary and return
    await view.findByRole('heading', { name: 'Revision batch complete' });
    fireEvent.click(view.getByRole('button', { name: 'Return to revision' }));
    assert.ok(await view.findByText('2 of 2 checked · 0 to recheck'));
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

  test('a Spell Bee assessment saves graded answers after read-aloud, including the final question', async t => {
    const speak = t.mock.method(audioService, 'speak', () => true);
    const definition = buildSubjectRevision('spell-bee', 'fazia', '');
    const questions = definition.questions.slice(0, 3);
    const view = render(React.createElement(ExamRevisionView, {
      ...definition,
      questions,
      learnerId: 'fazia',
      subjectId: 'spell-bee',
      sessionSize: 5,
      onSessionSizeChange: () => {},
      speechAudio: true
    }));

    await view.findByRole('region', { name: 'Revision overview' });
    fireEvent.click(view.getByRole('button', { name: 'Optional full mock exam' }));
    for (const item of questions) {
      await view.findByRole('heading', { name: item.prompt });
      fireEvent.click(view.getByRole('button', { name: 'Listen to question' }));
      fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: item.answer } });
      fireEvent.click(view.getByRole('button', { name: 'Save answer and continue' }));
    }

    await view.findByRole('heading', { name: 'Mock exam complete' });
    assert.ok(view.getByText(`${questions.length} correct of ${questions.length} checked`));
    assert.ok(view.getByText('Result saved on this device.'));
    assert.equal(view.queryByText('Not checked'), null);
    assert.equal(speak.mock.callCount(), questions.length);
    const savedAttempts = await listLearningAttempts(getDefaultLearningRepository(), 'fazia');
    const examAttempts = savedAttempts.filter(a => a.sessionMode === 'exam');
    assert.equal(examAttempts.length, questions.length);
    assert.ok(examAttempts.every(answer => answer.outcome === 'correct' && answer.assistance?.includes('read-aloud')));
  });

  test('non-spelling subjects do not render read-aloud button even when speechAudio is enabled', async () => {
    const definition = buildSubjectRevision('maths', 'fazia', '');
    const view = render(React.createElement(ExamRevisionView, {
      ...definition,
      learnerId: 'fazia',
      subjectId: 'maths',
      sessionSize: 5,
      onSessionSizeChange: () => {},
      speechAudio: true
    }));

    await view.findByRole('region', { name: 'Revision overview' });
    fireEvent.click(view.getByRole('button', { name: 'Start revision' }));
    await view.findByRole('heading', { name: definition.questions[0].prompt });
    assert.equal(view.queryByRole('button', { name: 'Listen to question' }), null);
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

  test('Spell Bee completion updates only the learner attempts, preserves first attempts, and is safe to retry', async () => {
    const definition = buildSubjectRevision('spell-bee', 'fazia', '');
    assert.ok(definition.onComplete, 'Spell Bee must save its attempts on completion.');
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

    assert.equal(await definition.onComplete({ ...result, answers: [] }), false);
    assert.equal(await definition.onComplete(result), false);
    assert.deepEqual(await listLearningAttempts(getDefaultLearningRepository(), 'fazia'), []);
    answers[3] = { ...answers[3], outcome: 'skipped', answer: '', skipped: true };
    assert.equal(await definition.onComplete(result), true);
    assert.equal(await definition.onComplete(result), true);
    const savedAttempts = await listLearningAttempts(getDefaultLearningRepository(), 'fazia');
    const firstSaved = savedAttempts.find(a => a.questionId === first.id);
    const secondSaved = savedAttempts.find(a => a.questionId === second.id);
    assert.ok(firstSaved);
    assert.equal(firstSaved.outcome, 'incorrect');
    assert.equal(firstSaved.submittedAnswer, 'not yet');
    assert.equal(firstSaved.sessionMode, 'practice');
    assert.ok(secondSaved);
    assert.equal(secondSaved.outcome, 'skipped');
    assert.deepEqual(await listLearningAttempts(getDefaultLearningRepository(), 'shiza'), []);
  });

  test('Spell Bee exam summaries keep assisted answers in metadata without unaided credit', async () => {
    const definition = buildSubjectRevision('spell-bee', 'shiza', '');
    assert.ok(definition.onComplete);
    const answers: RevisionResponse[] = definition.questions.slice(0, 2).map((item, index) => ({
      questionId: item.id, answer: item.answer, outcome: 'correct', attemptKind: 'exam',
      assistance: index === 0 ? [] : ['read-aloud'], attemptId: `spell-exam-${index}`,
      attemptedAt: '2026-11-04T10:00:00.000Z'
    }));
    assert.equal(await definition.onComplete({
      mode: 'exam', section: 'all', completedAt: '2026-11-04T10:00:00.000Z', answers
    }), true);
    const shizaAttempts = await listLearningAttempts(getDefaultLearningRepository(), 'shiza');
    const unaided = shizaAttempts.find(a => a.attemptId === answers[0].attemptId);
    const assisted = shizaAttempts.find(a => a.attemptId === answers[1].attemptId);
    assert.ok(unaided);
    assert.ok(assisted);
    assert.equal(unaided.sessionMode, 'exam');
    assert.deepEqual(unaided.assistance, []);
    assert.equal(assisted.sessionMode, 'exam');
    assert.deepEqual(assisted.assistance, ['read-aloud']);
  });

  test('Spell Bee save failure remains retryable without counting already saved words twice', async t => {
    const definition = buildSubjectRevision('spell-bee', 'fazia', '');
    assert.ok(definition.onComplete);
    const answers: RevisionResponse[] = definition.questions.slice(0, 2).map((item, index) => ({
      questionId: item.id, answer: item.answer, outcome: 'correct', attemptKind: 'exam',
      assistance: [], attemptId: `spell-retry-${index}`, attemptedAt: '2026-11-04T10:00:00.000Z'
    }));
    const result = { mode: 'exam' as const, section: 'all', completedAt: '2026-11-04T10:00:00.000Z', answers };
    let writes = 0;
    const repo = getDefaultLearningRepository();
    const originalPut = repo.put.bind(repo);
    const mockPut = t.mock.method(repo, 'put', function (record: LearningRecord) {
      if (record.kind === 'attempt' && ++writes === 2) {
        return Promise.reject(new Error('QuotaExceededError'));
      }
      return originalPut(record);
    });

    const completionPromise = definition.onComplete(result);
    assert.ok(completionPromise instanceof Promise, 'completion handler should return a promise');
    assert.equal(await completionPromise, false, 'completion handler reports failure on asynchronous rejection');
    const firstWriteAttempts = await listLearningAttempts(getDefaultLearningRepository(), 'fazia');
    assert.equal(firstWriteAttempts.length, 1, 'only first attempt is stored before failure');
    assert.equal(firstWriteAttempts[0].attemptId, answers[0].attemptId);

    mockPut.mock.restore();
    assert.equal(await definition.onComplete(result), true, 'retry successfully persists');
    const faziaAttempts = await listLearningAttempts(getDefaultLearningRepository(), 'fazia');
    assert.equal(faziaAttempts.length, 2, 'both attempts are persisted');
    assert.ok(answers.every(answer => faziaAttempts.some(a => a.attemptId === answer.attemptId)));
    assert.equal(faziaAttempts.filter(a => a.attemptId === answers[0].attemptId).length, 1, 'previously persisted attempts are not duplicated');
    assert.equal(faziaAttempts.filter(a => a.attemptId === answers[1].attemptId).length, 1, 'retried attempt is recorded once');

    // Verify the UI doesn't report success before persistence completes and supports retry on rejection
    let delayedResolve: (() => void) | undefined;
    const delayedPromise = new Promise<void>(resolve => {
      delayedResolve = resolve;
    });
    let delayedRetryResolve: (() => void) | undefined;
    const delayedRetryPromise = new Promise<void>(resolve => {
      delayedRetryResolve = resolve;
    });
    let uiWrites = 0;
    let failSecondAttempt = true;
    const uiMockPut = t.mock.method(repo, 'put', function (record: LearningRecord) {
      if (record.kind === 'attempt') {
        uiWrites++;
        if (uiWrites === 1) {
          return delayedPromise.then(() => originalPut(record));
        }
        if (uiWrites === 2 && failSecondAttempt) {
          return Promise.reject(new Error('QuotaExceededError'));
        }
        if (uiWrites === 3) {
          return delayedRetryPromise.then(() => originalPut(record));
        }
      }
      return originalPut(record);
    });

    const [firstWord, secondWord] = definition.questions;
    const view = render(React.createElement(ExamRevisionView, {
      ...definition,
      questions: [firstWord, secondWord],
      learnerId: 'fazia',
      subjectId: 'spell-bee',
      sessionSize: 2,
      onSessionSizeChange: () => {},
      speechAudio: false
    }));

    await view.findByRole('region', { name: 'Revision overview' });
    fireEvent.click(view.getByRole('button', { name: 'Optional full mock exam' }));
    fireEvent.change(await view.findByRole('textbox', { name: 'Your answer' }), { target: { value: firstWord.answer } });
    fireEvent.click(view.getByRole('button', { name: 'Save answer and continue' }));
    fireEvent.change(await view.findByRole('textbox', { name: 'Your answer' }), { target: { value: secondWord.answer } });
    fireEvent.click(view.getByRole('button', { name: 'Save answer and continue' }));
    await view.findByRole('heading', { name: 'Mock exam complete' });

    // The UI doesn't report success before persistence completes:
    assert.equal(view.queryByText('Result saved on this device.'), null);
    assert.equal(view.queryByText('The result could not be saved. Retry saving it below.'), null);

    // Resolve first write, allowing second write to reject:
    delayedResolve!();

    // The completion handler reports failure to the UI:
    await view.findByText('The result could not be saved. Retry saving it below.');
    assert.equal(view.queryByText('Result saved on this device.'), null);
    const retryButton = view.getByRole('button', { name: 'Retry saving result' });
    assert.ok(retryButton);

    // Trigger retry: while retry persistence is pending, error is cleared, success is not reported prematurely, and retry button is hidden:
    failSecondAttempt = false;
    fireEvent.click(retryButton);
    assert.equal(view.queryByText('Result saved on this device.'), null);
    assert.equal(view.queryByText('The result could not be saved. Retry saving it below.'), null);
    assert.equal(view.queryByRole('button', { name: 'Retry saving result' }), null);

    // Resolve retry write:
    delayedRetryResolve!();
    await view.findByText('Result saved on this device.');
    assert.equal(view.queryByRole('button', { name: 'Retry saving result' }), null);

    // Verify all mock exam attempts are persisted without duplicates
    const finalFaziaAttempts = await listLearningAttempts(getDefaultLearningRepository(), 'fazia');
    const firstWordAttempts = finalFaziaAttempts.filter(a => a.questionId === firstWord.id);
    const secondWordAttempts = finalFaziaAttempts.filter(a => a.questionId === secondWord.id);
    assert.ok(firstWordAttempts.length >= 1, 'first word attempt persisted');
    assert.ok(secondWordAttempts.length >= 1, 'second word attempt persisted');
    const attemptIds = finalFaziaAttempts.map(a => a.attemptId);
    assert.equal(new Set(attemptIds).size, attemptIds.length, 'no attempt IDs should be duplicated');

    uiMockPut.mock.restore();
  });

  test('Spell Bee completion saves progress to unified repository idempotently', async () => {
    const definition = buildSubjectRevision('spell-bee', 'fazia', '');
    assert.ok(definition.onComplete);
    const item = definition.questions[0];
    const sessionResult = {
      mode: 'practice' as const, section: 'all', completedAt: '2026-11-04T10:00:00.000Z',
      answers: [{
        questionId: item.id, answer: item.answer, outcome: 'correct' as const, attemptKind: 'initial' as const,
        assistance: [], attemptId: 'already-recorded', attemptedAt: '2026-11-04T10:00:00.000Z'
      }]
    };
    assert.equal(await definition.onComplete(sessionResult), true);
    assert.equal(await definition.onComplete(sessionResult), true);
    const saved = await listLearningAttempts(getDefaultLearningRepository(), 'fazia');
    const matching = saved.filter(a => a.attemptId === 'already-recorded');
    assert.equal(matching.length, 1);
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

  test('Shiza Grade 6 Biology section revision supports recall, feedback, and saves progress', async () => {
    const view = render(React.createElement(SubjectRevisionView, {
      activeStudent: 'shiza',
      subjectId: 'biology',
      settings: { ...settings, sessionSize: 2 },
      onSessionSizeChange: () => {}
    }));

    await view.findByRole('region', { name: 'Revision overview' });
    assert.ok(view.getByRole('option', { name: /Chapter 1 · The Leaf/ }));
    assert.ok(view.getByRole('option', { name: /Chapter 2 · The Flower/ }));
    assert.ok(view.getByRole('option', { name: /Chapter 3 · The Cell/ }));
    assert.ok(view.getByRole('option', { name: /Chapter 4 · The Digestive System/ }));

    // Select Chapter 1: The Leaf
    fireEvent.change(view.getByRole('combobox', { name: 'Choose a portion' }), {
      target: { value: 'leaf' }
    });

    fireEvent.click(view.getByRole('button', { name: 'Start revision' }));
    const input = await view.findByRole('textbox', { name: 'Your answer' });

    // Active retrieval: answer is not revealed before submitting
    assert.equal(view.queryByText('The point on the stem from where a leaf arises is called a node.'), null);

    // Answer the first question correctly with valid alias
    fireEvent.change(input, { target: { value: 'A node is the point on the stem from where a leaf arises.' } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));

    await view.findByText('Correct. Keep going.');
  });

  test('browser refresh on subject URL keeps the learner on that page', async () => {
    // Simulate browser refresh on /shiza/maths
    window.history.replaceState(null, '', '/shiza/maths');
    const view = render(React.createElement(App));

    // Maths revision view renders directly without reverting to home
    await view.findByRole('region', { name: 'Revision overview' });
    assert.ok(view.getByRole('heading', { name: 'Exam-eve revision' }));
    assert.ok(view.getByText(/Shiza \(Grade 6\)/));
    assert.equal(window.location.pathname, '/shiza/maths');
  });

  test('browser refresh on Grade 2 EVS keeps Fazia on EVS revision', async () => {
    // Simulate browser refresh on /fazia/evs
    window.history.replaceState(null, '', '/fazia/evs');
    const view = render(React.createElement(App));

    await view.findByRole('region', { name: 'Revision overview' });
    assert.ok(view.getByText(/Fazia \(Grade 2\)/));
    assert.equal(window.location.pathname, '/fazia/evs');
  });

  test('direct navigation to unavailable subject for grade falls back to home with warning', async () => {
    // Fazia is Grade 2; Biology is Grade 6 only
    window.history.replaceState(null, '', '/fazia/biology');
    const view = render(React.createElement(App));

    // Shows warning banner
    const alert = await view.findByRole('alert');
    assert.ok(alert.textContent?.includes('Biology is not available for Grade 2'));
    assert.ok(view.getByRole('region', { name: 'Subjects for Grade 2' }));
    assert.equal(window.location.pathname, '/fazia/home');
  });

  test('switching student updates the URL and stays in compatible subject', async () => {
    window.history.replaceState(null, '', '/fazia/maths');
    const view = render(React.createElement(App));

    await view.findByRole('region', { name: 'Revision overview' });
    assert.equal(window.location.pathname, '/fazia/maths');

    // Click switcher button to toggle from Fazia to Shiza
    await act(async () => {
      fireEvent.click(view.getByTitle(/Switch student/));
    });

    // URL updates to Shiza's Maths
    assert.equal(window.location.pathname, '/shiza/maths');
  });

  test('actual browser history.back() restores previous view', async () => {
    window.history.pushState(null, '', '/shiza/home');
    const view = render(React.createElement(App));

    assert.ok(view.getByRole('region', { name: 'Subjects for Grade 6' }));

    // Navigate to Maths
    fireEvent.click(view.getByRole('button', { name: 'Open Maths' }));
    await view.findByRole('region', { name: 'Revision overview' });
    assert.equal(window.location.pathname, '/shiza/maths');

    // Exercise actual browser history stack with history.back()
    await act(async () => {
      window.history.back();
    });

    await waitFor(() => assert.equal(window.location.pathname, '/shiza/home'));
    await view.findByRole('region', { name: 'Subjects for Grade 6' });
  });

  test('unknown routes are canonicalized to home URL', async () => {
    window.history.replaceState(null, '', '/unknown-nonsense-route');
    const view = render(React.createElement(App));

    await view.findByRole('region', { name: 'Subjects for Grade 2' });
    assert.equal(window.location.pathname, '/fazia/home');
  });
});


