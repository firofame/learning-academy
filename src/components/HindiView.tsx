import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Languages, RotateCcw, Volume2, XCircle } from 'lucide-react';
import { StudentId } from '../types';
import {
  checkHindiAnswer,
  getHindiLesson,
  HINDI_SECTIONS,
  HindiQuestion,
  HindiSectionId
} from '../data/hindi';
import { audioService } from '../utils/audio';
import type { AppSettings } from '../utils/appStorage';
import {
  HindiAnswer,
  HindiQuizMode,
  HindiResult,
  loadHindiProgress,
  saveHindiResult
} from '../utils/hindiStorage';
import { getStudentProfile } from '../data/profiles';
import { gradeWrittenAnswer, MAX_WRITTEN_ANSWER_LENGTH } from '../utils/roboticsGrading';
import { createSessionId } from '../learning/sessionController';
import { recordQuizAnswerAttempt } from '../learning/attemptRecords';
import { usePersistentDraft } from '../learning/usePersistentDraft';

interface HindiViewProps {
  activeStudent: StudentId;
  settings: AppSettings;
  gradingApiUrl?: string;
}

type SelectedSection = HindiSectionId | 'all';

interface HindiSessionDraftState {
  mode: HindiQuizMode;
  questionIds: string[];
  title: string;
  quizIndex: number;
  answers: HindiAnswer[];
  input: string;
  feedback: HindiAnswer | null;
}

function isHindiAnswer(value: unknown): value is HindiAnswer {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const answer = value as Record<string, unknown>;
  return typeof answer.questionId === 'string' && typeof answer.answer === 'string' &&
    typeof answer.correct === 'boolean' &&
    (answer.aiChecked === undefined || typeof answer.aiChecked === 'boolean') &&
    (answer.aiFeedback === undefined || typeof answer.aiFeedback === 'string') &&
    (answer.attemptId === undefined || typeof answer.attemptId === 'string') &&
    (answer.attemptedAt === undefined || (typeof answer.attemptedAt === 'string' && Number.isFinite(Date.parse(answer.attemptedAt))));
}

const primaryButton =
  'min-h-12 px-5 py-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs';
const secondaryButton =
  'min-h-12 px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

export function getHindiExamDateLabel(examDate: string, today = new Date()): string {
  const [year, month, day] = examDate.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysUntil = Math.round((target.getTime() - localToday.getTime()) / 86_400_000);
  const dateLabel = target.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  if (daysUntil === 1) return `Exam tomorrow · ${dateLabel}`;
  if (daysUntil === 0) return `Exam today · ${dateLabel}`;
  if (daysUntil < 0) return `Exam date · ${dateLabel}`;
  return `Exam on ${dateLabel}`;
}

function ListenButton({ text, enabled }: { text: string; enabled: boolean }) {
  const [unavailable, setUnavailable] = useState(false);
  return (
    <div>
      <button
        type="button"
        className={`${secondaryButton} inline-flex items-center gap-2 text-xs sm:text-sm py-2 px-3`}
        disabled={!enabled}
        aria-label="Listen"
        onClick={() => setUnavailable(!audioService.speak(text, 'hi-IN'))}
      >
        <Volume2 className="w-4 h-4 text-indigo-700" aria-hidden="true" /> Listen
      </button>
      {!enabled && <p className="text-xs text-slate-500 mt-1">Turn on voice audio in the header to listen.</p>}
      {enabled && unavailable && (
        <p role="status" className="text-xs text-indigo-800 mt-1">
          Read-aloud is unavailable in this browser.
        </p>
      )}
    </div>
  );
}

function getSection(sectionId: HindiSectionId) {
  return HINDI_SECTIONS.find(section => section.id === sectionId)!;
}

export const HindiView: React.FC<HindiViewProps> = ({
  activeStudent,
  settings,
  gradingApiUrl = import.meta.env?.VITE_GRADING_API_URL || ''
}) => {
  const lesson = getHindiLesson(activeStudent);
  const profile = getStudentProfile(activeStudent);
  const { restoredDraft, loadingDraft, saveDraft, discardDraft, forgetRestoredDraft } = usePersistentDraft<HindiSessionDraftState>({
    learnerId: activeStudent, subjectId: 'hindi', lessonId: lesson.id
  });
  const [progress, setProgress] = useState(() => loadHindiProgress(activeStudent));
  const [selectedSection, setSelectedSection] = useState<SelectedSection>('meanings');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [quiz, setQuiz] = useState<{
    mode: HindiQuizMode;
    questions: HindiQuestion[];
    title: string;
  } | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<HindiAnswer[]>([]);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<HindiAnswer | null>(null);
  const [result, setResult] = useState<HindiResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkingError, setCheckingError] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draftError, setDraftError] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => () => {
    controllerRef.current?.abort();
    audioService.stopAll();
  }, []);
  useEffect(() => {
    if (quiz && !result) promptRef.current?.focus();
    else headingRef.current?.focus();
  }, [quiz, quizIndex, result]);

  useEffect(() => {
    if (!quiz || !sessionId || result) return;
    saveDraft(sessionId, {
      mode: quiz.mode,
      questionIds: quiz.questions.map(question => question.id),
      title: quiz.title,
      quizIndex,
      answers,
      input,
      feedback
    });
  }, [quiz, quizIndex, answers, input, feedback, result, sessionId, saveDraft]);

  const filteredQuestions = selectedSection === 'all'
    ? lesson.questions
    : lesson.questions.filter(question => question.section === selectedSection);
  const missedQuestions = lesson.questions.filter(question =>
    progress.reviewQuestionIds.includes(question.id)
  );
  const currentQuestion = quiz?.questions[quizIndex];

  const start = (
    mode: HindiQuizMode,
    questions: HindiQuestion[],
    title: string
  ) => {
    if (questions.length === 0) return;
    if (sessionId) void discardDraft(sessionId).catch(() => undefined);
    if (restoredDraft) void discardDraft(restoredDraft.sessionId).catch(() => undefined);
    controllerRef.current?.abort();
    controllerRef.current = null;
    submittedRef.current = false;
    setChecking(false);
    setCheckingError('');
    audioService.stopAll();
    setQuiz({ mode, questions, title });
    setQuizIndex(0);
    setAnswers([]);
    setInput('');
    setFeedback(null);
    setResult(null);
    setSaved(false);
    setAnswerError('');
    setConfirmExit(false);
    setSessionId(createSessionId());
    setDraftError('');
  };

  const resumeSavedQuiz = () => {
    if (!restoredDraft) return;
    const draft = restoredDraft.state as unknown;
    if (typeof draft !== 'object' || draft === null || Array.isArray(draft)) {
      setDraftError('The saved quiz could not be restored. Its data has been kept for recovery.');
      return;
    }
    const saved = draft as Partial<HindiSessionDraftState>;
    const questions = Array.isArray(saved.questionIds)
      ? saved.questionIds.map(id => typeof id === 'string' ? lesson.questions.find(question => question.id === id) : undefined)
      : [];
    const valid = (saved.mode === 'practice' || saved.mode === 'exam') &&
      typeof saved.title === 'string' && saved.title.length > 0 &&
      Number.isInteger(saved.quizIndex) && saved.quizIndex! >= 0 && saved.quizIndex! < questions.length &&
      questions.length > 0 && questions.every((question): question is HindiQuestion => question !== undefined) &&
      Array.isArray(saved.answers) && saved.answers.every(isHindiAnswer) &&
      typeof saved.input === 'string' && (saved.feedback === null || isHindiAnswer(saved.feedback)) &&
      (saved.mode !== 'exam' || saved.feedback === null) &&
      saved.answers.every((answer, index) => answer.questionId === saved.questionIds?.[index]) &&
      (!saved.feedback || saved.feedback.questionId === saved.questionIds?.[saved.quizIndex!]);
    if (!valid) {
      setDraftError('This saved quiz does not match the current Hindi lesson. It has been kept, and you can start a new quiz.');
      return;
    }
    controllerRef.current?.abort();
    submittedRef.current = saved.feedback !== null;
    setQuiz({ mode: saved.mode!, questions: questions as HindiQuestion[], title: saved.title! });
    setQuizIndex(saved.quizIndex!);
    setAnswers(saved.answers!);
    setInput(saved.input!);
    setFeedback(saved.feedback!);
    setResult(null);
    setSaved(false);
    setAnswerError('');
    setChecking(false);
    setCheckingError('');
    setConfirmExit(false);
    setSessionId(restoredDraft.sessionId);
    setDraftError('');
    forgetRestoredDraft();
  };

  const persist = (completed: HindiResult) => {
    const next = saveHindiResult(activeStudent, completed);
    setSaved(next !== null);
    if (next) setProgress(next);
  };

  const finish = (mode: HindiQuizMode, completedAnswers: HindiAnswer[]) => {
    const completed: HindiResult = {
      mode,
      completedAt: new Date().toISOString(),
      answers: completedAnswers
    };
    audioService.stopAll();
    if (sessionId) void discardDraft(sessionId).catch(() => undefined);
    setSessionId(null);
    setQuiz(null);
    setResult(completed);
    setFeedback(null);
    persist(completed);
  };

  const submitAnswer = async () => {
    if (!quiz || !currentQuestion || submittedRef.current) return;
    const answer = input.trim();
    if (!answer) {
      setAnswerError('Write an answer before continuing.');
      return;
    }
    submittedRef.current = true;
    setAnswerError('');
    const entry: HindiAnswer = {
      questionId: currentQuestion.id,
      answer,
      correct: checkHindiAnswer(currentQuestion, answer),
      attemptedAt: new Date().toISOString(),
      attemptId: `${sessionId ?? createSessionId()}:${currentQuestion.id}`
    };
    if (currentQuestion.kind !== 'pair' && currentQuestion.markingCriteria && !entry.correct) {
      if (!gradingApiUrl) {
        submittedRef.current = false;
        setCheckingError('Gemini checking for equivalent Hindi answers is not configured. Try the model answer or ask the site owner to connect the grading service.');
        return;
      }
      const controller = new AbortController();
      controllerRef.current = controller;
      setChecking(true);
      setCheckingError('');
      try {
        const grade = await gradeWrittenAnswer(
          gradingApiUrl, lesson.id, currentQuestion.id, answer, controller.signal
        );
        if (controller.signal.aborted) return;
        entry.correct = grade.correct;
        entry.aiChecked = true;
        entry.aiFeedback = grade.feedback;
      } catch (error) {
        void recordQuizAnswerAttempt({
          learnerId: activeStudent, subjectId: 'hindi', lessonId: lesson.id, mode: quiz.mode,
          answer: {
            ...entry,
            correct: false,
            ungraded: true,
            prompt: currentQuestion.prompt,
            referenceAnswer: currentQuestion.answer,
            provenance: lesson.sourceNote
          }
        }).catch(() => undefined);
        if (!controller.signal.aborted) {
          submittedRef.current = false;
          setCheckingError(error instanceof Error
            ? error.message
            : 'Automatic checking failed. Your answer has not been marked. Please retry.');
        }
        return;
      } finally {
        if (!controller.signal.aborted) {
          setChecking(false);
          controllerRef.current = null;
        }
      }
    }
    void recordQuizAnswerAttempt({
      learnerId: activeStudent, subjectId: 'hindi', lessonId: lesson.id, mode: quiz.mode,
      answer: {
        ...entry,
        prompt: currentQuestion.prompt,
        referenceAnswer: currentQuestion.answer,
        provenance: lesson.sourceNote
      }
    }).catch(() => undefined);
    if (quiz.mode === 'practice') {
      setFeedback(entry);
      return;
    }
    const nextAnswers = [...answers, entry];
    if (quizIndex + 1 === quiz.questions.length) {
      finish(quiz.mode, nextAnswers);
      return;
    }
    setAnswers(nextAnswers);
    setQuizIndex(quizIndex + 1);
    setInput('');
    submittedRef.current = false;
  };

  const continuePractice = () => {
    if (!quiz || !feedback) return;
    const nextAnswers = [...answers, feedback];
    if (quizIndex + 1 === quiz.questions.length) {
      finish(quiz.mode, nextAnswers);
      return;
    }
    setAnswers(nextAnswers);
    setQuizIndex(quizIndex + 1);
    setInput('');
    setFeedback(null);
    submittedRef.current = false;
    setCheckingError('');
  };

  const showResults = () => {
    if (!result) return null;
    const correctCount = result.answers.filter(answer => answer.correct).length;
    const missed = lesson.questions.filter(question =>
      result.answers.some(answer => answer.questionId === question.id && !answer.correct)
    );
    return (
      <section className="space-y-5" aria-label="Hindi quiz results">
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 sm:p-6 space-y-3" role="status">
          <h2 className="text-xl font-bold text-slate-900">
            {result.mode === 'exam' ? 'Mock exam complete!' : 'Practice complete!'}
          </h2>
          <p className="font-bold text-slate-900">Score: {correctCount} / {result.answers.length} correct</p>
          <p className="text-xs text-slate-600">
            Completed on {new Date(result.completedAt).toLocaleString()}.
            {result.answers.some(answer => answer.aiChecked) &&
              ` ${result.answers.filter(answer => answer.aiChecked).length} written answer(s) checked with Gemini 3.5 Flash-Lite.`}
          </p>
          <p className="text-xs text-slate-600">
            {saved
              ? `Saved for ${profile.name} on this browser.`
              : 'This result was not saved. Retry saving before leaving this page.'}
          </p>
          {!saved && (
            <button type="button" className={secondaryButton} onClick={() => persist(result)}>
              Retry saving result
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <button type="button" className={primaryButton} onClick={() => setResult(null)}>
            Return to revision
          </button>
          {missed.length > 0 && (
            <button
              type="button"
              className={`${secondaryButton} inline-flex items-center gap-2`}
              onClick={() => start('practice', missed, 'Review missed questions')}
            >
              <RotateCcw className="w-4 h-4 text-indigo-700" aria-hidden="true" />
              Practise missed questions ({missed.length})
            </button>
          )}
        </div>

        <h2 className="text-xl font-bold text-slate-900">Answer review</h2>
        <div className="space-y-3">
          {result.answers.map(answer => {
            const question = lesson.questions.find(entry => entry.id === answer.questionId)!;
            return (
              <article
                key={answer.questionId}
                className={`bg-white border rounded-xl p-4 space-y-2 ${
                  answer.correct ? 'border-emerald-200' : 'border-amber-200'
                }`}
              >
                <h3 className="font-bold text-slate-900 font-devanagari" dir="auto">{question.prompt}</h3>
                <p className="text-sm text-slate-700 font-devanagari" dir="auto">
                  Your answer: {answer.answer || '—'}
                </p>
                {!answer.correct && (
                  <p className="text-sm text-slate-800 font-devanagari" dir="auto">
                    <strong>Answer:</strong> {question.answer}
                  </p>
                )}
                {answer.aiFeedback && <p className="text-sm text-slate-600">AI feedback: {answer.aiFeedback}</p>}
              </article>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-indigo-800 text-sm font-bold uppercase tracking-wide">
          <Languages className="w-5 h-5" aria-hidden="true" />
          Hindi · {profile.name} · {profile.gradeLabel}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          {lesson.title}
        </h1>
        <p className="text-sm font-bold text-indigo-900">{getHindiExamDateLabel(lesson.examDate)}</p>
        <p className="text-sm text-slate-600">
          Recall answers before revealing them. A question leaves Review missed after one correct practice answer; if it still feels tricky, practise the section again later today or tomorrow.
        </p>
        <p className="text-xs text-slate-500">{lesson.sourceNote}</p>
      </header>

      {!quiz && !result && !loadingDraft && restoredDraft && (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3" aria-label="Saved Hindi quiz">
          <p className="font-semibold text-indigo-950">An unfinished Hindi quiz is saved on this device.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={primaryButton} onClick={resumeSavedQuiz}>Resume saved quiz</button>
            <button type="button" className={secondaryButton} onClick={() => void discardDraft(restoredDraft.sessionId).catch(() => undefined)}>Discard saved quiz</button>
          </div>
        </section>
      )}
      {draftError && <p role="alert" className="text-amber-900">{draftError}</p>}

      {quiz && !result ? (
        <section className="space-y-5" aria-label="Hindi quiz">
          <button
            type="button"
            className={`${secondaryButton} inline-flex items-center gap-2`}
            onClick={() => setConfirmExit(true)}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to revision
          </button>

          {confirmExit && (
            <div role="alert" className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-900">
                Leaving now will discard this unfinished quiz. Completed results stay saved.
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" className={secondaryButton} onClick={() => setConfirmExit(false)}>
                  Keep answering
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => {
                    controllerRef.current?.abort();
                    controllerRef.current = null;
                    submittedRef.current = false;
                    setChecking(false);
                    audioService.stopAll();
                    if (sessionId) void discardDraft(sessionId).catch(() => undefined);
                    setSessionId(null);
                    setQuiz(null);
                    setConfirmExit(false);
                  }}
                >
                  Discard and exit
                </button>
              </div>
            </div>
          )}

          {currentQuestion && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider block">
                    {quiz.title} · {quiz.mode === 'exam' ? 'Mock exam' : 'Practice'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Question {quizIndex + 1} of {quiz.questions.length}
                  </span>
                </div>
                <div className="w-24 sm:w-36 bg-slate-100 h-2.5 rounded-full overflow-hidden" aria-hidden="true">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${((quizIndex + 1) / quiz.questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h2
                    ref={promptRef}
                    tabIndex={-1}
                    className="text-lg sm:text-xl font-bold leading-relaxed text-slate-900 font-devanagari"
                    dir="auto"
                  >
                    {currentQuestion.prompt}
                  </h2>
                  <ListenButton text={currentQuestion.prompt} enabled={settings.speechAudio} />
                </div>

                <form
                  onSubmit={event => {
                    event.preventDefault();
                    if (feedback) continuePractice();
                    else void submitAnswer();
                  }}
                  className="space-y-4"
                >
                  <label htmlFor="hindi-answer-input" className="sr-only">Your Hindi answer</label>
                  {currentQuestion.kind === 'written' ? (
                    <textarea
                      id="hindi-answer-input"
                      lang="hi"
                      dir="auto"
                      autoComplete="off"
                      rows={5}
                      value={input}
                      disabled={feedback !== null || checking}
                      maxLength={MAX_WRITTEN_ANSWER_LENGTH}
                      onChange={event => {
                        setInput(event.target.value);
                        setAnswerError('');
                        setCheckingError('');
                      }}
                      placeholder="अपना उत्तर यहाँ लिखिए"
                      className="w-full text-lg px-4 py-3 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 font-devanagari"
                    />
                  ) : (
                    <input
                      id="hindi-answer-input"
                      type="text"
                      lang="hi"
                      dir="auto"
                      autoComplete="off"
                      value={input}
                      disabled={feedback !== null || checking}
                      maxLength={MAX_WRITTEN_ANSWER_LENGTH}
                      onChange={event => {
                        setInput(event.target.value);
                        setAnswerError('');
                        setCheckingError('');
                      }}
                      placeholder="उत्तर यहाँ लिखिए"
                      className="w-full text-lg px-4 py-3 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 font-devanagari"
                    />
                  )}

                  {answerError && <p role="alert" className="text-sm font-semibold text-rose-700">{answerError}</p>}
                  {currentQuestion.kind !== 'pair' && currentQuestion.markingCriteria && !gradingApiUrl && (
                    <p className="text-xs text-indigo-900">
                      Gemini 3.5 Flash-Lite can check equivalent written answers when the grading service is configured.
                    </p>
                  )}
                  {checking && <p role="status" className="text-sm text-indigo-800">Checking with Gemini 3.5 Flash-Lite…</p>}
                  {checkingError && <p role="alert" className="text-sm text-amber-900">{checkingError}</p>}

                  {!feedback && (
                    <button type="submit" className={primaryButton} disabled={checking || !input.trim()}>
                      {checking
                        ? 'Checking answer…'
                        : checkingError
                          ? 'Retry checking answer'
                          : quiz.mode === 'practice'
                            ? 'Check answer'
                            : quizIndex + 1 === quiz.questions.length
                              ? 'Finish mock exam'
                              : 'Save answer and continue'}
                    </button>
                  )}
                </form>

                {feedback && (
                  <div
                    role="status"
                    className={`rounded-xl p-4 space-y-3 ${
                      feedback.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {feedback.correct
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                        : <XCircle className="w-5 h-5 text-amber-700" aria-hidden="true" />}
                      <span className={feedback.correct ? 'text-emerald-900' : 'text-amber-900'}>
                        {feedback.correct ? 'Correct! Great job!' : 'Let’s check this one:'}
                      </span>
                    </div>
                    {!feedback.correct && (
                      <p className="text-sm text-slate-800 font-devanagari" dir="auto">
                        <strong>Correct answer:</strong> {currentQuestion.answer}
                      </p>
                    )}
                    {feedback.aiFeedback && <p className="text-sm text-slate-600">AI feedback: {feedback.aiFeedback}</p>}
                    <button
                      type="button"
                      onClick={continuePractice}
                      className={`${primaryButton} inline-flex items-center gap-2`}
                    >
                      Continue <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      ) : result ? (
        showResults()
      ) : (
        <>
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4" aria-label="Exam practice">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Practise for the exam</h2>
                <p className="text-sm text-slate-600">
                  {progress.exam
                    ? `Last mock exam: ${progress.exam.answers.filter(answer => answer.correct).length} / ${progress.exam.answers.length} correct.`
                    : 'No mock exam completed yet.'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {missedQuestions.length} question(s) to revisit. Try answering from memory before checking.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  className={primaryButton}
                  onClick={() => start('practice', filteredQuestions, 'Section practice')}
                >
                  Practice this section ({filteredQuestions.length})
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => start('exam', lesson.questions, 'Full Hindi exam')}
                >
                  Full mock exam ({lesson.questions.length})
                </button>
              </div>
            </div>
            {missedQuestions.length > 0 && (
              <button
                type="button"
                className={`${secondaryButton} inline-flex items-center gap-2`}
                onClick={() => start('practice', missedQuestions, 'Review missed questions')}
              >
                <RotateCcw className="w-4 h-4 text-indigo-700" aria-hidden="true" />
                Review missed ({missedQuestions.length})
              </button>
            )}
          </section>

          <section className="space-y-3" aria-label="Hindi exam sections">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Choose a portion</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedSection('all')}
                aria-pressed={selectedSection === 'all'}
                className={`min-h-12 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer ${
                  selectedSection === 'all'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50'
                }`}
              >
                All portions ({lesson.questions.length})
              </button>
              {HINDI_SECTIONS.map(section => {
                const count = lesson.questions.filter(question => question.section === section.id).length;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setSelectedSection(section.id)}
                    aria-pressed={selectedSection === section.id}
                    className={`min-h-12 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer ${
                      selectedSection === section.id
                        ? 'bg-indigo-700 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50'
                    }`}
                  >
                    <span className="block">{section.label} ({count})</span>
                    <span className="block text-xs opacity-80 font-devanagari">{section.nativeLabel}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4" aria-label="Hindi revision prompts">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {selectedSection === 'all'
                  ? 'All exam portions'
                  : `${getSection(selectedSection).label} · ${getSection(selectedSection).nativeLabel}`}
              </h2>
              <p className="text-sm text-slate-600">
                Read the prompt, recall the answer, then reveal it. Short practice sessions make review easier to revisit.
              </p>
            </div>
            {selectedSection === 'poem' && (
              <details className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <summary className="font-bold text-indigo-900 cursor-pointer">Show the complete poem: पेड़</summary>
                <div className="mt-3 space-y-1 font-devanagari text-lg leading-relaxed" lang="hi">
                  {lesson.poem.map(line => <p key={line}>{line}</p>)}
                </div>
              </details>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredQuestions.map((question, index) => {
                const section = getSection(question.section);
                const revealed = revealedAnswers[question.id] === true;
                return (
                  <article key={question.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">
                      {section.label} · {index + 1}
                    </span>
                    <p className="text-base sm:text-lg font-semibold leading-relaxed text-slate-900 font-devanagari" dir="auto">
                      {question.prompt}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className={secondaryButton}
                        aria-expanded={revealed}
                        onClick={() => setRevealedAnswers(current => ({
                          ...current,
                          [question.id]: !current[question.id]
                        }))}
                      >
                        {revealed ? 'Hide answer' : 'Show answer'}
                      </button>
                      <ListenButton text={question.prompt} enabled={settings.speechAudio} />
                    </div>
                    {revealed && (
                      <p className="bg-indigo-50 text-indigo-950 rounded-lg p-3 font-semibold font-devanagari" dir="auto">
                        <strong>Answer:</strong> {question.answer}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
