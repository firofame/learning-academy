import { afterEach, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import type { WordEntry, WordProgress } from '../types';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  localStorage: dom.window.localStorage,
  IS_REACT_ACT_ENVIRONMENT: true
});
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });

class MockUtterance {
  constructor(public text: string) {}
  lang = '';
  rate = 1;
  pitch = 1;
}
const utterances: MockUtterance[] = [];
let cancellations = 0;
Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { value: MockUtterance });
Object.defineProperty(window, 'speechSynthesis', {
  value: {
    cancel: () => { cancellations++; },
    getVoices: () => [],
    speak: (utterance: MockUtterance) => { utterances.push(utterance); }
  }
});

const { render, fireEvent, cleanup, waitFor } = await import('@testing-library/react');
const { SessionView } = await import('../components/SessionView');
const { ParentDashboard } = await import('../components/ParentDashboard');
const { default: App } = await import('../App');
const { getWordsForStudent } = await import('../data/wordList');
const {
  DEFAULT_SETTINGS, SETTINGS_KEY, ACTIVE_PROFILE_KEY, MIGRATION_DONE_KEY,
  getWordProgress, getAllProgress, getStudentStorageKey, recordAttempt, getLocalDateString
} = await import('../utils/storage');

const settings = { ...DEFAULT_SETTINGS, soundEffects: false, speechAudio: false };
const words = getWordsForStudent('fazia');
const land = words.find(word => word.canonicalSpelling === 'land')!;

function renderSession(targetedWords: WordEntry[] = [land]) {
  return render(React.createElement(SessionView, {
    settings,
    activeStudent: 'fazia',
    targetedWords,
    onSubjectChange: () => {},
    onExploreAll: () => {},
    onOpenParent: () => {}
  }));
}

function saveProgress(progress: Record<string, WordProgress>) {
  localStorage.setItem(getStudentStorageKey('fazia'), JSON.stringify(progress));
}

describe('Production component interactions', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(MIGRATION_DONE_KEY, 'true');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(ACTIVE_PROFILE_KEY, 'fazia');
    utterances.length = 0;
    cancellations = 0;
  });

  afterEach(() => cleanup());

  test('initial Learn exposure cannot earn unaided typed credit; a fresh recall can', () => {
    const view = renderSession();
    assert.ok(view.getByRole('heading', { name: land.word }));
    fireEvent.click(view.getByRole('button', { name: 'Skip to Test' }));
    assert.ok(view.getByText('Assisted Recall Practice'));
    fireEvent.change(view.getByPlaceholderText('Type word here...'), { target: { value: 'land' } });
    fireEvent.click(view.getByRole('button', { name: 'Submit & Check Answer' }));
    assert.equal(getWordProgress(land.id, 'fazia').unaidedCorrectCount, 0);
    view.unmount();

    const recall = renderSession();
    assert.ok(recall.getByText('Independent Test Mode (Unaided)'));
    assert.equal(recall.queryByRole('heading', { name: land.word }), null);
    assert.equal(recall.queryByText(/Sound guide:/), null);
    assert.equal(recall.queryByText(land.word, { exact: true }), null);
    fireEvent.change(recall.getByPlaceholderText('Type word here...'), { target: { value: 'land' } });
    fireEvent.click(recall.getByRole('button', { name: 'Submit & Check Answer' }));
    assert.equal(getWordProgress(land.id, 'fazia').unaidedCorrectCount, 1);
  });

  test('duplicate events and switching modes or input methods cannot score a card twice', () => {
    recordAttempt(land.id, 'fazia', true, 'practice');
    const view = renderSession();
    const input = view.getByPlaceholderText('Type word here...');
    fireEvent.change(input, { target: { value: 'land' } });
    const form = input.closest('form')!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    assert.equal(getWordProgress(land.id, 'fazia').attempts, 2);
    fireEvent.click(view.getByRole('button', { name: '1. Learn' }));
    fireEvent.click(view.getByRole('button', { name: '3. Test (Unaided Recall)' }));
    fireEvent.submit(view.getByPlaceholderText('Type word here...').closest('form')!);
    fireEvent.click(view.getByRole('button', { name: 'Paper Notebook' }));
    fireEvent.click(view.getByRole('button', { name: 'Reveal Spelling to Verify' }));
    assert.equal(view.queryByRole('button', { name: 'Spelled Correctly!' }), null);
    assert.equal(getWordProgress(land.id, 'fazia').attempts, 2);
  });

  test('assisted notebook validation preserves revisit status and earns no unaided credit', () => {
    recordAttempt(land.id, 'fazia', false, 'test', 'lnd');
    const view = renderSession();
    fireEvent.click(view.getByRole('button', { name: '2. Practice (Assisted)' }));
    fireEvent.click(view.getByRole('button', { name: 'Test Word Unaided' }));
    fireEvent.click(view.getByRole('button', { name: 'Paper Notebook' }));
    fireEvent.click(view.getByRole('button', { name: 'Reveal Spelling to Verify' }));
    fireEvent.click(view.getByRole('button', { name: 'Spelled Correctly!' }));
    const progress = getWordProgress(land.id, 'fazia');
    assert.equal(progress.unaidedCorrectCount, 0);
    assert.equal(progress.needsRevisit, true);
    assert.equal(progress.history.at(-1)?.mode, 'practice');
    assert.ok(view.getByText(/This assisted attempt does not earn Test-Ready credit/));
  });

  test('independent notebook checks qualify, but revealing then typing does not', () => {
    recordAttempt(land.id, 'fazia', true, 'practice');
    const view = renderSession();
    fireEvent.click(view.getByRole('button', { name: 'Paper Notebook' }));
    fireEvent.click(view.getByRole('button', { name: 'Reveal Spelling to Verify' }));
    fireEvent.click(view.getByRole('button', { name: 'Spelled Correctly!' }));
    assert.equal(getWordProgress(land.id, 'fazia').unaidedCorrectCount, 1);
    assert.equal(getWordProgress(land.id, 'fazia').history.at(-1)?.mode, 'paper');
    view.unmount();

    const typing = renderSession();
    fireEvent.click(typing.getByRole('button', { name: 'Paper Notebook' }));
    fireEvent.click(typing.getByRole('button', { name: 'Reveal Spelling to Verify' }));
    fireEvent.click(typing.getByRole('button', { name: 'Type on Screen' }));
    fireEvent.change(typing.getByPlaceholderText('Type word here...'), { target: { value: 'land' } });
    fireEvent.click(typing.getByRole('button', { name: 'Submit & Check Answer' }));
    assert.equal(getWordProgress(land.id, 'fazia').unaidedCorrectCount, 1);
  });

  test('native helpers are hidden until requested and opening them makes recall assisted', () => {
    const word = words.find(word => word.nativeScript)!;
    recordAttempt(word.id, 'fazia', true, 'practice');
    const view = renderSession([word]);
    assert.equal(view.queryByRole('button', { name: word.graphemeTiles[0] }), null);
    fireEvent.click(view.getByRole('button', { name: 'Show native script tiles (assisted)' }));
    assert.ok(view.getByText('Assisted Recall Practice'));
    fireEvent.change(view.getByPlaceholderText('Type word here...'), { target: { value: word.nativeScript } });
    fireEvent.click(view.getByRole('button', { name: 'Submit & Check Answer' }));
    assert.equal(getWordProgress(word.id, 'fazia').unaidedCorrectCount, 0);
  });

  test('typing waits for a tap and requests no keyboard spelling hints', () => {
    recordAttempt(land.id, 'fazia', true, 'practice');
    const view = renderSession();
    const input = view.getByLabelText('Type the exact spelling:');
    assert.notEqual(document.activeElement, input);
    assert.equal(input.hasAttribute('autofocus'), false);
    assert.equal(input.getAttribute('autocomplete'), 'off');
    assert.equal(input.getAttribute('autocapitalize'), 'none');
    assert.equal(input.getAttribute('autocorrect'), 'off');
    assert.equal(input.getAttribute('spellcheck'), 'false');
    assert.equal(input.getAttribute('enterkeyhint'), 'done');
    fireEvent.change(input, { target: { value: 'land' } });
    fireEvent.submit(input.closest('form')!);
    assert.equal(getWordProgress(land.id, 'fazia').unaidedCorrectCount, 1);
  });

  test('native subject pickers work in practice, curriculum, and worksheets', () => {
    const view = render(React.createElement(App));
    const subjects = ['All', ...new Set(words.map(word => word.subject))];
    let picker = view.getByRole('combobox', { name: 'Subject' });
    assert.deepEqual(
      Array.from(picker.querySelectorAll('option'), option => option.value),
      subjects
    );
    fireEvent.change(picker, { target: { value: 'Hindi' } });
    assert.equal((picker as HTMLSelectElement).value, 'Hindi');
    assert.ok(view.getByRole('button', { name: 'Hindi', pressed: true }));
    assert.ok(view.getByRole('heading', { name: words.find(word => word.subject === 'Hindi')!.word }));

    fireEvent.click(view.getByRole('button', { name: /All 45 Words/ }));
    picker = view.getByRole('combobox', { name: 'Subject' });
    fireEvent.change(picker, { target: { value: 'Hindi' } });
    assert.ok(view.getByRole('button', { name: 'Practice Hindi Words' }));
    assert.equal(
      view.getAllByRole('button', { name: 'Practice This Word' }).length,
      words.filter(word => word.subject === 'Hindi').length
    );

    fireEvent.click(view.getByRole('button', { name: /Worksheets/ }));
    picker = view.getByRole('combobox', { name: 'Subject' });
    assert.match(picker.querySelector('option[value="Hindi"]')!.textContent!, /Hindi \(\d+\)/);
    fireEvent.change(picker, { target: { value: 'Hindi' } });
    assert.ok(view.getByRole('heading', { name: 'Hindi Spelling Test' }));
    fireEvent.click(view.getByRole('button', { name: 'Teacher Answer Key' }));
    assert.ok(view.getByRole('heading', { name: 'Hindi Exam Answer Key' }));
  });

  test('targeted queues use requested words and advance to a fresh hidden card', () => {
    const target = [words[3], words[1]];
    const view = renderSession(target);
    assert.ok(view.getByRole('heading', { name: target[0].word }));
    fireEvent.click(view.getByRole('button', { name: 'Skip to Test' }));
    fireEvent.change(view.getByPlaceholderText('Type word here...'), { target: { value: target[0].canonicalSpelling } });
    fireEvent.click(view.getByRole('button', { name: 'Submit & Check Answer' }));
    fireEvent.click(view.getByRole('button', { name: /Next Word/ }));
    assert.ok(view.getByText('Word 2 of 2'));
    assert.ok(view.getByText('Independent Test Mode (Unaided)'));
    fireEvent.change(view.getByPlaceholderText('Type word here...'), { target: { value: target[1].canonicalSpelling } });
    fireEvent.click(view.getByRole('button', { name: 'Submit & Check Answer' }));
    assert.deepEqual(Object.keys(getAllProgress('fazia')).sort(), target.map(word => word.id).sort());
    assert.equal(getWordProgress(target[0].id, 'fazia').unaidedCorrectCount, 0);
    assert.equal(getWordProgress(target[1].id, 'fazia').unaidedCorrectCount, 1);
  });

  test('multiword practice uses space tiles and the same evaluator as typed recall', () => {
    const word = words.find(word => word.canonicalSpelling === 'scroll wheel')!;
    const view = renderSession([word]);
    fireEvent.click(view.getByRole('button', { name: 'Practice with Tiles' }));
    for (const tile of word.graphemeTiles) {
      fireEvent.click(view.getByRole('button', { name: tile === ' ' ? '␣ Space' : tile }));
    }
    assert.ok(view.getByText('Terrific! You assembled the word correctly.'));
    assert.equal(getWordProgress(word.id, 'fazia').history.at(-1)?.wasCorrect, true);
  });

  for (const level of ['practising', 'remembered'] as const) {
    test(`dashboard exposes actual due reviews when all words are ${level}`, () => {
      const old = new Date(Date.now() - 4 * 86400000);
      const oldDate = getLocalDateString(old);
      saveProgress(Object.fromEntries(words.map(word => [word.id, {
        ...getWordProgress(word.id, 'fazia'),
        attempts: 2,
        unaidedCorrectCount: 2,
        consecutiveUnaidedCorrect: 2,
        unaidedCorrectDates: [oldDate],
        lastAttemptDate: old.toISOString(),
        lastUnaidedCorrectDate: old.toISOString(),
        level
      }])));
      let requested: WordEntry[] = [];
      const view = render(React.createElement(ParentDashboard, {
        activeStudent: 'fazia',
        onStartTargetedSession: (targets: WordEntry[]) => { requested = targets; },
        onOpenWorksheet: () => {},
        onResetComplete: () => {}
      }));
      fireEvent.click(view.getByRole('button', { name: 'Review 5 Words Due for Review' }));
      assert.deepEqual(requested.map(word => word.id), words.slice(0, 5).map(word => word.id));
    });
  }

  test('mute and slow-speech settings affect actual speech on the curriculum screen', () => {
    const view = render(React.createElement(App));
    fireEvent.click(view.getByRole('button', { name: /All 45 Words/ }));
    const hear = view.getAllByTitle('Listen to pronunciation')[0];
    fireEvent.click(hear);
    assert.equal(utterances.length, 0);
    fireEvent.click(view.getByRole('button', { name: 'Toggle audio' }));
    fireEvent.click(hear);
    assert.equal(utterances.at(-1)?.rate, 0.9);
    fireEvent.click(view.getByTitle('Normal speech speed'));
    fireEvent.click(hear);
    assert.equal(utterances.at(-1)?.rate, 0.72);
    const count = utterances.length;
    const priorCancellations = cancellations;
    fireEvent.click(view.getByRole('button', { name: 'Toggle audio' }));
    fireEvent.click(hear);
    assert.equal(utterances.length, count);
    assert.ok(cancellations > priorCancellations, 'muting cancels active speech');
    assert.equal(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).speechAudio, false);
  });

  test('malformed progress is visibly reported on initial load and a new submission still works', async () => {
    const partial = { ...getWordProgress(land.id, 'fazia'), attempts: 2, history: undefined };
    localStorage.setItem(getStudentStorageKey('fazia'), JSON.stringify({ [land.id]: partial }));
    const view = render(React.createElement(App));
    await waitFor(() => assert.match(view.getByRole('alert').textContent || '', /malformed progress/));
    fireEvent.click(view.getByRole('button', { name: 'Skip to Test' }));
    fireEvent.change(view.getByPlaceholderText('Type word here...'), { target: { value: 'land' } });
    fireEvent.click(view.getByRole('button', { name: 'Submit & Check Answer' }));
    assert.equal(getWordProgress(land.id, 'fazia').attempts, 1);
    assert.equal(getWordProgress(land.id, 'fazia').unaidedCorrectCount, 0);
  });
});
