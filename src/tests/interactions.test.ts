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
const { getRoboticsLesson } = await import('../data/robotics');
const { getRoboticsStorageKey, loadRoboticsProgress, saveRoboticsResult } = await import('../utils/roboticsStorage');
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

  test('robotics selects the right lesson and resets unfinished work when switching profiles', () => {
    const view = render(React.createElement(App));
    fireEvent.click(view.getByRole('button', { name: 'Robotics' }));
    assert.ok(view.getByRole('heading', { name: 'Simple and Complex Machines' }));
    assert.equal(view.getByRole('button', { name: 'Robotics' }).getAttribute('aria-current'), 'page');
    fireEvent.click(view.getByRole('button', { name: 'Start exam quiz' }));
    assert.ok(view.getByText('Exam quiz · Question 1 of 23'));
    fireEvent.click(view.getByTitle('Switch student (currently Fazia)'));
    assert.ok(view.getByRole('heading', { name: 'Exploring AI Domains' }));
    assert.ok(view.getByRole('button', { name: 'Start exam quiz' }));
    assert.equal(loadRoboticsProgress('fazia').exam, null);
    assert.equal(loadRoboticsProgress('shiza').exam, null);
  });

  test('robotics practice gives feedback, saves a completed review, and retains revisit flags', () => {
    const question = getRoboticsLesson('fazia').questions[0];
    saveRoboticsResult('fazia', {
      mode: 'practice', completedAt: new Date().toISOString(),
      answers: [{ questionId: question.id, answer: 'False', correct: false, parentChecked: false }]
    });
    const view = render(React.createElement(App));
    fireEvent.click(view.getByRole('button', { name: 'Robotics' }));
    fireEvent.click(view.getByRole('button', { name: 'Review missed (1)' }));
    fireEvent.click(view.getByRole('radio', { name: 'True' }));
    const form = view.getByRole('button', { name: 'Check answer' }).closest('form')!;
    act(() => { fireEvent.submit(form); fireEvent.submit(form); });
    assert.ok(view.getByText('Well done!'));
    assert.ok(view.getByRole('radio', { name: 'False' }).closest('fieldset')!.disabled);
    fireEvent.click(view.getByRole('button', { name: 'Finish practice' }));
    assert.ok(view.getByRole('heading', { name: 'Practice complete' }));
    assert.equal(loadRoboticsProgress('fazia').practice?.answers.length, 1);
    assert.equal(loadRoboticsProgress('fazia').exam, null);
    assert.deepEqual(loadRoboticsProgress('fazia').reviewQuestionIds, [question.id]);
  });

  for (const studentId of ['fazia', 'shiza'] as const) {
    test(`${studentId}'s full exam hides feedback, requires parent marking, and persists the exact score`, () => {
      localStorage.setItem(ACTIVE_PROFILE_KEY, studentId);
      const view = render(React.createElement(App));
      const lesson = getRoboticsLesson(studentId);
      fireEvent.click(view.getByRole('button', { name: 'Robotics' }));
      fireEvent.click(view.getByRole('button', { name: 'Start exam quiz' }));
      for (const [index, question] of lesson.questions.entries()) {
        assert.ok(view.getByText(`Exam quiz · Question ${index + 1} of ${lesson.questions.length}`));
        assert.equal(view.queryByText('Model answer:'), null);
        assert.equal(view.queryByText('Well done!'), null);
        if (index === 0) {
          fireEvent.click(view.getByRole('button', { name: "I don't know yet" }));
          continue;
        }
        if (question.kind === 'choice' || question.kind === 'true-false') {
          fireEvent.click(view.getByRole('radio', { name: question.answer }));
        } else if (question.kind === 'fill') {
          const field = view.getByLabelText('Fill in the blank');
          assert.notEqual(document.activeElement, field);
          assert.equal(field.getAttribute('spellcheck'), 'false');
          fireEvent.change(field, { target: { value: question.answer.toUpperCase() } });
        } else {
          fireEvent.click(view.getByRole('checkbox', { name: 'I wrote my answer in a notebook for a parent to check' }));
        }
        fireEvent.click(view.getByRole('button', { name: 'Save answer and continue' }));
        assert.equal(loadRoboticsProgress(studentId).exam, null, 'unfinished or unmarked exams are not saved');
      }
      assert.ok(view.getByRole('heading', { name: 'Parent check: written answers' }));
      for (const question of lesson.questions.filter(question => question.kind === 'short')) {
        assert.ok(view.getByRole('heading', { name: question.prompt }));
        fireEvent.click(view.getByRole('button', { name: 'Parent: answer is correct' }));
      }
      assert.ok(view.getByRole('heading', { name: 'Exam quiz complete' }));
      const result = loadRoboticsProgress(studentId).exam!;
      assert.equal(result.answers.length, lesson.questions.length);
      assert.equal(result.answers.filter(answer => answer.correct).length, lesson.questions.length - 1);
      assert.equal(result.answers.filter(answer => answer.parentChecked).length, lesson.cards.length);
      assert.deepEqual(loadRoboticsProgress(studentId).reviewQuestionIds, [lesson.questions[0].id]);
      assert.deepEqual(getAllProgress(studentId), {}, 'robotics does not alter spelling mastery');
      view.unmount();

      const reopened = render(React.createElement(App));
      fireEvent.click(reopened.getByRole('button', { name: 'Robotics' }));
      assert.ok(reopened.getByText(`Last exam quiz: ${lesson.questions.length - 1} / ${lesson.questions.length} correct`));
      fireEvent.click(reopened.getByRole('button', { name: /Parent Insights/ }));
      assert.match(reopened.getByRole('region', { name: 'Robotics progress' }).textContent!, /Last exam quiz:/);
      fireEvent.click(reopened.getByRole('button', { name: 'Open robotics revision' }));
      assert.ok(reopened.getByRole('heading', { name: lesson.title }));
    });
  }

  test('robotics short-answer practice waits for parent confirmation and permits equivalent wording', () => {
    const question = getRoboticsLesson('fazia').questions.find(question => question.kind === 'short')!;
    saveRoboticsResult('fazia', {
      mode: 'practice', completedAt: new Date().toISOString(),
      answers: [{ questionId: question.id, answer: '', correct: false, parentChecked: false }]
    });
    const view = render(React.createElement(App));
    fireEvent.click(view.getByRole('button', { name: 'Robotics' }));
    fireEvent.click(view.getByRole('button', { name: 'Review missed (1)' }));
    fireEvent.change(view.getByLabelText('Write your answer'), { target: { value: 'It makes our work easier.' } });
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    assert.ok(view.getByText('Parent check needed'));
    assert.equal(view.queryByRole('button', { name: 'Finish practice' }), null);
    fireEvent.click(view.getByRole('button', { name: 'Parent: answer is correct' }));
    fireEvent.click(view.getByRole('button', { name: 'Finish practice' }));
    assert.equal(loadRoboticsProgress('fazia').practice?.answers[0].parentChecked, true);
    assert.equal(loadRoboticsProgress('fazia').practice?.answers[0].correct, true);
  });

  test('robotics read-aloud honors mute and slow speech and stops when the lesson is left', () => {
    const view = render(React.createElement(App));
    fireEvent.click(view.getByRole('button', { name: 'Robotics' }));
    const listen = view.getByRole('button', { name: 'Listen to Machines make work easier' });
    assert.equal(listen.hasAttribute('disabled'), true);
    fireEvent.click(view.getByRole('button', { name: 'Toggle audio' }));
    fireEvent.click(view.getByTitle('Normal speech speed'));
    fireEvent.click(listen);
    assert.match(utterances.at(-1)!.text, /A machine helps us do work easily/);
    assert.equal(utterances.at(-1)!.rate, 0.72);
    const previous = cancellations;
    fireEvent.click(view.getByRole('button', { name: /All 45 Words/ }));
    assert.ok(cancellations > previous);
  });

  test('malformed robotics progress is visibly reported without hiding the lesson', async () => {
    localStorage.setItem(getRoboticsStorageKey('fazia'), '{"exam":"bad"}');
    const view = render(React.createElement(App));
    fireEvent.click(view.getByRole('button', { name: 'Robotics' }));
    await waitFor(() => assert.match(view.getByRole('alert').textContent!, /Robotics progress.*malformed/));
    assert.ok(view.getByRole('heading', { name: 'Simple and Complex Machines' }));
  });

  test('leaving an unfinished quiz asks for confirmation and does not save it', () => {
    const view = render(React.createElement(App));
    fireEvent.click(view.getByRole('button', { name: 'Robotics' }));
    fireEvent.click(view.getByRole('button', { name: 'Start practice' }));
    fireEvent.click(view.getByRole('button', { name: 'Back to lesson' }));
    assert.ok(view.getByRole('alert'));
    fireEvent.click(view.getByRole('button', { name: 'Keep answering' }));
    assert.ok(view.getByText('Assisted practice · Question 1 of 23'));
    fireEvent.click(view.getByRole('button', { name: 'Back to lesson' }));
    fireEvent.click(view.getByRole('button', { name: 'Discard unfinished quiz' }));
    assert.ok(view.getByRole('button', { name: 'Start practice' }));
    assert.equal(loadRoboticsProgress('fazia').practice, null);
  });

  test('a failed robotics save is visible and retry preserves the completed answers', async () => {
    const question = getRoboticsLesson('fazia').questions[0];
    saveRoboticsResult('fazia', {
      mode: 'practice', completedAt: new Date().toISOString(),
      answers: [{ questionId: question.id, answer: 'False', correct: false, parentChecked: false }]
    });
    const view = render(React.createElement(App));
    fireEvent.click(view.getByRole('button', { name: 'Robotics' }));
    fireEvent.click(view.getByRole('button', { name: 'Review missed (1)' }));
    fireEvent.click(view.getByRole('radio', { name: 'True' }));
    fireEvent.click(view.getByRole('button', { name: 'Check answer' }));
    const prototype = Object.getPrototypeOf(localStorage);
    const original = prototype.setItem;
    try {
      prototype.setItem = function(key: string, value: string) {
        if (key === getRoboticsStorageKey('fazia')) throw new Error('Storage quota exceeded');
        return original.call(this, key, value);
      };
      fireEvent.click(view.getByRole('button', { name: 'Finish practice' }));
      await waitFor(() => assert.match(view.getByRole('alert').textContent!, /Storage save failed/));
      assert.ok(view.getByText('Result not saved. Please retry before leaving this page.'));
      assert.equal(loadRoboticsProgress('fazia').practice?.answers[0].correct, false);
    } finally { prototype.setItem = original; }
    fireEvent.click(view.getByRole('button', { name: 'Retry saving result' }));
    assert.equal(loadRoboticsProgress('fazia').practice?.answers[0].correct, true);
    assert.ok(view.getByText('Saved for Fazia on this browser.'));
  });
});
