import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Languages, RotateCcw, Volume2, XCircle } from 'lucide-react';
import { StudentId } from '../types';
import {
  getMalayalamLesson,
  MALAYALAM_SECTIONS,
  MalayalamQuestion,
  MalayalamSectionId,
  checkMalayalamAnswer
} from '../data/malayalam';
import { audioService } from '../utils/audio';
import { AppSettings } from '../utils/storage';
import {
  loadMalayalamProgress,
  MalayalamAnswer,
  MalayalamQuizMode,
  MalayalamResult,
  saveMalayalamResult
} from '../utils/malayalamStorage';
import { getStudentProfile } from '../data/wordList';
import { gradeWrittenAnswer, MAX_WRITTEN_ANSWER_LENGTH } from '../utils/roboticsGrading';

interface MalayalamViewProps {
  activeStudent: StudentId;
  settings: AppSettings;
  gradingApiUrl?: string;
}

type SelectedSection = MalayalamSectionId | 'all';

const primaryButton =
  'min-h-12 px-5 py-3 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs';
const secondaryButton =
  'min-h-12 px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

export function getMalayalamExamDateLabel(examDate: string, today = new Date()): string {
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
        onClick={() => setUnavailable(!audioService.speak(text))}
      >
        <Volume2 className="w-4 h-4 text-amber-700" aria-hidden="true" /> Listen
      </button>
      {!enabled && <p className="text-xs text-slate-500 mt-1">Turn on voice audio in the header to listen.</p>}
      {enabled && unavailable && (
        <p role="status" className="text-xs text-amber-800 mt-1">
          Read-aloud is unavailable in this browser.
        </p>
      )}
    </div>
  );
}

function getSection(sectionId: MalayalamSectionId) {
  return MALAYALAM_SECTIONS.find(section => section.id === sectionId)!;
}

export const MalayalamView: React.FC<MalayalamViewProps> = ({
  activeStudent,
  settings,
  gradingApiUrl = import.meta.env?.VITE_GRADING_API_URL || ''
}) => {
  const lesson = getMalayalamLesson(activeStudent);
  const profile = getStudentProfile(activeStudent);
  const [progress, setProgress] = useState(() => loadMalayalamProgress(activeStudent));
  const [selectedSection, setSelectedSection] = useState<SelectedSection>('revision');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [quiz, setQuiz] = useState<{
    mode: MalayalamQuizMode;
    questions: MalayalamQuestion[];
    title: string;
  } | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState<MalayalamAnswer[]>([]);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<MalayalamAnswer | null>(null);
  const [result, setResult] = useState<MalayalamResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkingError, setCheckingError] = useState('');
  const [confirmExit, setConfirmExit] = useState(false);
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

  const filteredQuestions = selectedSection === 'all'
    ? lesson.questions
    : lesson.questions.filter(question => question.section === selectedSection);
  const missedQuestions = lesson.questions.filter(question =>
    progress.reviewQuestionIds.includes(question.id)
  );
  const currentQuestion = quiz?.questions[quizIndex];

  const start = (
    mode: MalayalamQuizMode,
    questions: MalayalamQuestion[],
    title: string
  ) => {
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
  };

  const persist = (completed: MalayalamResult) => {
    const next = saveMalayalamResult(activeStudent, completed);
    setSaved(next !== null);
    if (next) setProgress(next);
  };

  const finish = (mode: MalayalamQuizMode, completedAnswers: MalayalamAnswer[]) => {
    const completed: MalayalamResult = {
      mode,
      completedAt: new Date().toISOString(),
      answers: completedAnswers
    };
    audioService.stopAll();
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
    const entry: MalayalamAnswer = {
      questionId: currentQuestion.id,
      answer,
      correct: checkMalayalamAnswer(currentQuestion, answer)
    };
    if (currentQuestion.kind === 'text' && currentQuestion.markingCriteria && !entry.correct) {
      if (!gradingApiUrl) {
        submittedRef.current = false;
        setCheckingError('Gemini checking for equivalent answers is not configured. Try the model answer or ask the site owner to connect the grading service.');
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
    return (
      <section className="space-y-5" aria-label="Malayalam quiz results">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 sm:p-6 space-y-3" role="status">
          <h2 className="text-xl font-bold text-slate-900">
            {result.mode === 'exam' ? 'Mock exam complete!' : 'Practice complete!'}
          </h2>
          <p className="font-bold text-slate-900">
            Score: {correctCount} / {result.answers.length} correct
          </p>
          <p className="text-xs text-slate-600">Completed on {new Date(result.completedAt).toLocaleString()}.</p>
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
          {result.answers.some(answer => !answer.correct) && (
            <button
              type="button"
              className={`${secondaryButton} inline-flex items-center gap-2`}
              onClick={() => {
                const missed = lesson.questions.filter(question =>
                  result.answers.some(answer => answer.questionId === question.id && !answer.correct)
                );
                start('practice', missed, 'Review missed questions');
              }}
            >
              <RotateCcw className="w-4 h-4 text-amber-700" aria-hidden="true" />
              Practise missed questions
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
                <h3 className="font-bold text-slate-900" dir="auto">{question.prompt}</h3>
                <p className="text-sm text-slate-700" dir="auto">
                  Your answer: {answer.answer || '—'}
                </p>
                {!answer.correct && (
                  <p className="text-sm text-slate-800" dir="auto">
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
        <p className="flex items-center gap-2 text-amber-800 text-sm font-bold uppercase tracking-wide">
          <Languages className="w-5 h-5" aria-hidden="true" />
          Malayalam · {profile.name} · {profile.gradeLabel}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          {lesson.title}
        </h1>
        <p className="text-sm font-bold text-amber-900">{getMalayalamExamDateLabel(lesson.examDate)}</p>
        <p className="text-sm text-slate-600">
          Revise all seven portions, then hide the answers and recall them. Try missed questions again later today and once more tomorrow.
        </p>
        <p className="text-xs text-slate-500">{lesson.sourceNote}</p>
      </header>

      {quiz && !result ? (
        <section className="space-y-5" aria-label="Malayalam quiz">
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
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                    {quiz.title} · {quiz.mode === 'exam' ? 'Mock exam' : 'Practice'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Question {quizIndex + 1} of {quiz.questions.length}
                  </span>
                </div>
                <div className="w-24 sm:w-36 bg-slate-100 h-2.5 rounded-full overflow-hidden" aria-hidden="true">
                  <div
                    className="bg-amber-600 h-full transition-all duration-300"
                    style={{ width: `${((quizIndex + 1) / quiz.questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h2
                    ref={promptRef}
                    tabIndex={-1}
                    className="text-lg sm:text-xl font-bold leading-relaxed text-slate-900"
                    dir="auto"
                  >
                    {currentQuestion.prompt}
                  </h2>
                  <ListenButton text={currentQuestion.prompt} enabled={settings.speechAudio} />
                </div>

                <form
                  onSubmit={event => {
                    event.preventDefault();
                    if (feedback) {
                      continuePractice();
                    } else {
                      void submitAnswer();
                    }
                  }}
                  className="space-y-4"
                >
                  <label htmlFor="malayalam-answer-input" className="sr-only">
                    Your Malayalam answer
                  </label>
                  <input
                    id="malayalam-answer-input"
                    type="text"
                    lang="ml"
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
                    placeholder="ഉത്തരം ഇവിടെ എഴുതുക"
                    className="w-full text-lg px-4 py-3 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50 disabled:text-slate-500"
                  />

                  {answerError && <p role="alert" className="text-sm font-semibold text-rose-700">{answerError}</p>}
                  {currentQuestion.kind === 'text' && currentQuestion.markingCriteria && !gradingApiUrl && (
                    <p className="text-xs text-amber-900">
                      Gemini 3.5 Flash-Lite can check equivalent Malayalam answers when configured. The model answer is still checked locally.
                    </p>
                  )}
                  {checking && <p role="status" className="text-sm text-amber-800">Checking with Gemini 3.5 Flash-Lite…</p>}
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
                        {feedback.correct ? 'Correct! Great job!' : "Let's check this one:"}
                      </span>
                    </div>
                    {!feedback.correct && (
                      <p className="text-sm text-slate-800" dir="auto">
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
                  {missedQuestions.length} question(s) to revisit. Answers are checked against the Malayalam word and sign list.
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
                  onClick={() => start('exam', lesson.questions, 'Full Malayalam exam')}
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
                <RotateCcw className="w-4 h-4 text-amber-700" aria-hidden="true" />
                Review missed ({missedQuestions.length})
              </button>
            )}
          </section>

          <section className="space-y-3" aria-label="Malayalam exam sections">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Choose a portion</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setSelectedSection('all')}
                aria-pressed={selectedSection === 'all'}
                className={`min-h-12 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer ${
                  selectedSection === 'all'
                    ? 'bg-amber-700 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50'
                }`}
              >
                All portions ({lesson.questions.length})
              </button>
              {MALAYALAM_SECTIONS.map(section => {
                const count = lesson.questions.filter(question => question.section === section.id).length;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setSelectedSection(section.id)}
                    aria-pressed={selectedSection === section.id}
                    className={`min-h-12 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer ${
                      selectedSection === section.id
                        ? 'bg-amber-700 text-white'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50'
                    }`}
                  >
                    <span className="block">{section.number} · {section.label}</span>
                    <span className="block text-xs opacity-80">{count} prompts</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4" aria-label="Revision prompts">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {selectedSection === 'all'
                  ? 'All exam portions'
                  : `${getSection(selectedSection).number} · ${getSection(selectedSection).nativeLabel}`}
              </h2>
              <p className="text-sm text-slate-600">
                Read the prompt, hide the answer, then try to recall it before revealing.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredQuestions.map((question, index) => {
                const section = getSection(question.section);
                const revealed = revealedAnswers[question.id] === true;
                return (
                  <article key={question.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                      {section.number} · {section.label} · {index + 1}
                    </span>
                    <p className="text-base sm:text-lg font-semibold leading-relaxed text-slate-900" dir="auto">
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
                      <p className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 font-bold text-emerald-900" dir="auto">
                        {question.answer}
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
