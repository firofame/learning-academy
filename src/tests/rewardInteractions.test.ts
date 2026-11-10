import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { JSDOM } from 'jsdom';
import type { LearningAttempt } from '../learning/contracts';
import type { RevisionQuestion } from '../components/ExamRevisionView';

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

const { render, fireEvent, cleanup, within, act } = await import('@testing-library/react');
const { default: App } = await import('../App');
const { ExamRevisionView } = await import('../components/ExamRevisionView');
const { RewardCelebrations, RewardToast } = await import('../components/RewardToast');
const { deriveRewardState, MILESTONES } = await import('../learning/rewards');
const { buildSubjectRevision } = await import('../learning/subjectRevision');
const { createRevisionAttempts } = await import('../learning/attemptRecords');
const { localCalendarDate } = await import('../learning/domain');
const { useSubjectProgress } = await import('../learning/useSubjectProgress');
const { loadCelebratedMilestones, recordCelebratedMilestone } = await import('../utils/rewardStorage');
const { ACTIVE_PROFILE_KEY, SETTINGS_KEY, DEFAULT_SETTINGS, subscribeStorageError } = await import('../utils/appStorage');
const { audioService } = await import('../utils/audio');

function makeAttempt(id: string): LearningAttempt {
  return createRevisionAttempts({
    learnerId: 'fazia', subjectId: 'spell-bee', lessonId: 'rewards-ui', mode: 'practice',
    completedAt: new Date().toISOString(),
    answers: [{ attemptId: id, questionId: id, answer: 'yes', correct: true, prompt: 'Test', referenceAnswer: 'yes' }]
  })[0];
}

function question(id: string): RevisionQuestion {
  return {
    id, section: 'main', sectionLabel: 'Main', prompt: `Question ${id}`, answer: 'yes',
    responseFormat: 'written',
    grade: async answer => ({ correct: answer === 'yes', source: 'deterministic' })
  };
}

describe('Reward experience interactions', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(ACTIVE_PROFILE_KEY, 'fazia');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, speechAudio: false }));
    window.history.replaceState(null, '', '/');
  });
  afterEach(cleanup);

  test('a real revision answer updates header rewards immediately, and switching profiles isolates them', async () => {
    const view = render(React.createElement(App));
    const shell = view.container.firstElementChild as HTMLElement;
    assert.equal(shell.style.getPropertyValue('--student-page-tint'), '#fff1f2');
    assert.ok(view.getByRole('region', { name: 'Rewards summary' }));
    fireEvent.click(view.getByRole('button', { name: 'Open Spell Bee' }));
    await view.findByRole('region', { name: 'Revision overview' });
    fireEvent.click(view.getByRole('button', { name: 'Start revision' }));
    const definition = buildSubjectRevision('spell-bee', 'fazia');
    const current = definition.questions.find(item => view.queryByRole('heading', { name: item.prompt }));
    assert.ok(current);
    fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: current.answer } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Correct. Keep going.');
    assert.ok(view.getByLabelText('2 stars earned today'));
    assert.ok(view.getByLabelText('1-day study streak, kept alive today'));
    assert.ok(view.getByRole('heading', { name: 'First Spark!' }));

    fireEvent.click(view.getByTitle('Switch student (currently Fazia)'));
    await view.findByText(/Shiza · Grade 6/);
    assert.equal(shell.style.getPropertyValue('--student-page-tint'), '#f5f3ff');
    assert.ok(view.getByLabelText('0 stars earned today'));
    assert.equal(view.queryByRole('heading', { name: 'First Spark!' }), null);
  });

  test('mock exam rewards reappear after exit and hide again when resumed', async () => {
    const view = render(React.createElement(App));
    fireEvent.click(view.getByRole('button', { name: 'Open Spell Bee' }));
    await view.findByRole('region', { name: 'Revision overview' });
    fireEvent.click(view.getByRole('button', { name: 'Optional full mock exam' }));
    assert.ok(!view.queryByLabelText(/stars earned today/), 'header counters are hidden at exam start');
    const definition = buildSubjectRevision('spell-bee', 'fazia');
    const current = definition.questions.find(item => view.queryByRole('heading', { name: item.prompt }));
    assert.ok(current);
    fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: current.answer } });
    fireEvent.click(view.getByRole('button', { name: 'Save answer and continue' }));
    await view.findByText(/Mock exam · Question 2 of/);
    assert.ok(!view.queryByLabelText(/stars earned today/), 'header counters remain hidden after a correct answer');
    assert.ok(!view.queryByRole('heading', { name: 'First Spark!' }), 'milestone does not reveal correctness');
    assert.ok(!view.queryByText(/stars earned$/), 'no inline answer reward in exams');
    fireEvent.click(view.getByRole('button', { name: 'Save and exit' }));
    assert.ok(view.getByLabelText(/stars earned today/), 'rewards reappear after exiting the exam');
    fireEvent.click(view.getByRole('button', { name: 'Resume current session' }));
    assert.ok(!view.queryByLabelText(/stars earned today/), 'resumed exam keeps rewards hidden');
  });

  test('batch stars, completed-step progress, perfect score and new milestones agree', async () => {
    const view = render(React.createElement(ExamRevisionView, {
      learnerId: 'fazia', subjectId: 'spell-bee', lessonId: 'rewards-ui',
      title: 'Reward revision', description: 'Test', questions: [question('one')],
      sessionSize: 1, onSessionSizeChange: () => {}, speechAudio: false
    }));
    await view.findByRole('region', { name: 'Revision overview' });
    fireEvent.click(view.getByRole('button', { name: 'Start revision' }));
    assert.equal(view.getByRole('progressbar', { name: 'Revision progress' }).getAttribute('aria-valuenow'), '0');
    fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: 'yes' } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    await view.findByText('Correct. Keep going.');
    assert.ok(view.getByText('+2 stars earned'));
    assert.equal(view.getByRole('progressbar', { name: 'Revision progress' }).getAttribute('aria-valuenow'), '1');
    fireEvent.click(view.getByRole('button', { name: 'Finish this batch' }));
    const summary = await view.findByRole('region', { name: 'Revision summary' });
    assert.ok(within(summary).getByText(/\+2 Stars earned in this batch!/));
    assert.ok(within(summary).getByText(/Perfect Score/));
    assert.ok(within(view.getByRole('region', { name: 'Milestones unlocked this batch' })).getByText(/First Spark!/));
  });

  test('several unlocked milestones queue one at a time and are remembered per learner', async () => {
    const state = deriveRewardState('fazia', Array.from({ length: 10 }, (_, i) => makeAttempt(`${i}`)), localCalendarDate(new Date()));
    const view = render(React.createElement(RewardCelebrations, { state, enabled: true }));
    assert.ok(view.getByRole('heading', { name: 'First Spark!' }));
    fireEvent.click(view.getByRole('button', { name: 'Dismiss milestone alert' }));
    assert.ok(view.getByRole('heading', { name: 'High Five!' }));
    fireEvent.click(view.getByRole('button', { name: 'Dismiss milestone alert' }));
    assert.ok(view.getByRole('heading', { name: 'Star Collector' }));
    fireEvent.click(view.getByRole('button', { name: 'Dismiss milestone alert' }));
    assert.equal(view.queryByText('Milestone Unlocked!'), null);
    assert.deepEqual(loadCelebratedMilestones('fazia'), ['first-star', 'five-correct', 'twenty-stars']);
    assert.deepEqual(loadCelebratedMilestones('shiza'), []);
    cleanup();
    const reopened = render(React.createElement(RewardCelebrations, { state, enabled: true }));
    assert.equal(reopened.queryByText('Milestone Unlocked!'), null);
  });

  test('a toast dismisses after four seconds without its timer restarting on stable rerenders', t => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let dismissals = 0;
    const dismiss = () => { dismissals++; };
    const props = { milestone: MILESTONES[0], onDismiss: dismiss };
    const view = render(React.createElement(RewardToast, props));
    act(() => t.mock.timers.tick(2000));
    view.rerender(React.createElement(RewardToast, props));
    act(() => t.mock.timers.tick(1999));
    assert.equal(dismissals, 0);
    act(() => t.mock.timers.tick(1));
    assert.equal(dismissals, 1);
  });

  test('an open header rolls today stars over at midnight without losing earned stars', async () => {
    const record = makeAttempt('before-midnight');
    const date = record.learnerLocalDate;
    function Rewards({ reference }: { reference: string }) {
      const { rewardState } = useSubjectProgress('fazia', reference);
      return React.createElement('output', null, JSON.stringify(rewardState));
    }
    const view = render(React.createElement(Rewards, { reference: date }));
    await act(async () => {});
    act(() => window.dispatchEvent(new window.CustomEvent('academy-reward-attempt', { detail: { attempt: record } })));
    assert.match(view.getByRole('status').textContent ?? '', /"todayStars":2/);
    const tomorrow = new Date(`${date}T12:00:00`);
    tomorrow.setDate(tomorrow.getDate() + 1);
    view.rerender(React.createElement(Rewards, { reference: localCalendarDate(tomorrow) }));
    const state = JSON.parse(view.getByRole('status').textContent ?? '{}');
    assert.equal(state.todayStars, 0);
    assert.equal(state.totalStars, 2);
    assert.equal(state.currentStreak, 1);
  });

  test('blocked and malformed celebration storage report an error without changing earned rewards', t => {
    const errors: string[] = [];
    const unsubscribe = subscribeStorageError(message => errors.push(message));
    t.after(unsubscribe);
    localStorage.setItem('academy_celebrated_milestones_fazia', '{"invalid":true}');
    assert.deepEqual(loadCelebratedMilestones('fazia'), []);
    assert.match(errors.pop() ?? '', /Milestone celebrations could not be read/);
    t.mock.method(dom.window.Storage.prototype, 'setItem', () => { throw new Error('QuotaExceededError'); });
    recordCelebratedMilestone('shiza', 'first-star');
    assert.match(errors.pop() ?? '', /Unable to remember this milestone celebration/);
    assert.equal(deriveRewardState('fazia', [makeAttempt('saved')], localCalendarDate(new Date())).totalStars, 2);
  });

  test('mock exams never play correctness cues, only a completion chime', async t => {
    const play = t.mock.method(audioService, 'playFeedback', async () => {});
    const view = render(React.createElement(ExamRevisionView, {
      learnerId: 'fazia', subjectId: 'spell-bee', lessonId: 'rewards-ui',
      title: 'Reward revision', description: 'Test', questions: [question('one'), question('two')],
      sessionSize: 2, onSessionSizeChange: () => {}, speechAudio: true
    }));
    await view.findByRole('region', { name: 'Revision overview' });
    fireEvent.click(view.getByRole('button', { name: 'Optional full mock exam' }));
    fireEvent.change(view.getByRole('textbox', { name: 'Your answer' }), { target: { value: 'yes' } });
    fireEvent.click(view.getByRole('button', { name: 'Save answer and continue' }));
    await view.findByRole('heading', { name: 'Question two' });
    assert.equal(play.mock.callCount(), 0);
    fireEvent.click(view.getByRole('button', { name: 'I don’t know yet' }));
    await view.findByRole('heading', { name: 'Mock exam complete' });
    assert.equal(play.mock.callCount(), 1);
    assert.equal(play.mock.calls[0].arguments[0], 'complete');
  });

  test('synthesized tones obey mute and stop immediately when audio is turned off', async t => {
    let contexts = 0;
    let starts = 0;
    let stops = 0;
    const frequencies: number[] = [];
    class FakeAudioContext {
      state = 'running';
      currentTime = 0;
      destination = {};
      constructor() { contexts++; }
      createOscillator() {
        return {
          frequency: { setValueAtTime: (value: number) => frequencies.push(value) },
          connect: () => {},
          disconnect: () => {},
          start: () => { starts++; },
          stop: () => { stops++; }
        };
      }
      createGain() {
        return {
          gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
          connect: () => {}, disconnect: () => {}
        };
      }
    }
    const descriptor = Object.getOwnPropertyDescriptor(window, 'AudioContext');
    const previousAudio = audioService.speechAudio;
    Object.defineProperty(window, 'AudioContext', { value: FakeAudioContext, configurable: true });
    t.after(() => {
      audioService.stopAll();
      audioService.speechAudio = previousAudio;
      if (descriptor) Object.defineProperty(window, 'AudioContext', descriptor);
      else Reflect.deleteProperty(window, 'AudioContext');
    });
    audioService.speechAudio = false;
    await audioService.playFeedback('correct');
    assert.equal(contexts, 0);
    audioService.speechAudio = true;
    await audioService.playFeedback('correct');
    assert.equal(contexts, 1);
    assert.equal(starts, 2);
    assert.deepEqual(frequencies, [523.25, 659.25]);
    audioService.speechAudio = false;
    audioService.stopAll();
    assert.equal(stops, 4, 'both scheduled tones are also stopped immediately');
    await audioService.playFeedback('complete');
    assert.equal(starts, 2);
  });
});
