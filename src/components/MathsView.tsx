import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Calculator, Volume2, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { StudentId } from '../types';
import { getStudentProfile } from '../data/wordList';
import {
  checkMathsAnswer,
  getMathsLesson,
  MATHS_TOPICS,
  MathsQuestion,
  MathsTopic
} from '../data/maths';
import { audioService } from '../utils/audio';
import { AppSettings } from '../utils/storage';
import {
  loadMathsProgress,
  MathsAnswer,
  MathsQuizMode,
  MathsResult,
  saveMathsResult
} from '../utils/mathsStorage';

interface MathsViewProps {
  activeStudent: StudentId;
  settings: AppSettings;
}

const primaryButton =
  'min-h-12 px-5 py-3 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-xs';
const secondaryButton =
  'min-h-12 px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors';

function ListenButton({ text, label, enabled }: { text: string; label: string; enabled: boolean }) {
  const [unavailable, setUnavailable] = useState(false);
  return (
    <div>
      <button
        type="button"
        className={`${secondaryButton} inline-flex items-center gap-2 text-xs sm:text-sm py-2 px-3`}
        disabled={!enabled}
        aria-label={label}
        onClick={() => setUnavailable(!audioService.speak(text))}
      >
        <Volume2 className="w-4 h-4 text-indigo-600" /> Listen
      </button>
      {!enabled && (
        <p className="text-xs text-slate-500 mt-1">Turn on voice audio in the header to listen.</p>
      )}
      {enabled && unavailable && (
        <p role="status" className="text-xs text-amber-800 mt-1">
          Read-aloud is unavailable in this browser.
        </p>
      )}
    </div>
  );
}

function ResultSummary({ result }: { result: MathsResult }) {
  const correct = result.answers.filter(answer => answer.correct).length;
  const total = result.answers.length;
  const pct = Math.round((correct / total) * 100);
  const topicLabel =
    result.topic && result.topic !== 'all'
      ? MATHS_TOPICS.find(t => t.id === result.topic)?.shortLabel
      : null;
  return (
    <div>
      <p className="font-bold text-slate-900">
        {result.mode === 'exam' ? 'Last exam quiz' : 'Last practice'}
        {topicLabel ? ` (${topicLabel})` : ''}: {correct} / {total} correct ({pct}%)
      </p>
      <p className="text-xs text-slate-600 mt-0.5">
        Completed on {new Date(result.completedAt).toLocaleString()}
      </p>
    </div>
  );
}

function VerticalMathDisplay({
  operand1,
  operand2,
  operator,
  hint
}: {
  operand1: number;
  operand2: number;
  operator: '+' | '-';
  hint?: string;
}) {
  return (
    <div className="inline-flex flex-col items-center bg-indigo-50/70 border border-indigo-200/80 rounded-xl px-6 py-4 my-2">
      {hint && (
        <span className="text-xs font-semibold text-indigo-800 bg-indigo-100/80 px-2.5 py-0.5 rounded-full mb-2">
          {hint}
        </span>
      )}
      <div className="font-mono text-2xl sm:text-3xl font-bold tracking-widest text-slate-900 text-right w-28">
        <div>{operand1}</div>
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-1">
          <span>{operator}</span>
          <span>{operand2}</span>
        </div>
      </div>
    </div>
  );
}

export const MathsView: React.FC<MathsViewProps> = ({ activeStudent, settings }) => {
  const lesson = getMathsLesson(activeStudent);
  const profile = getStudentProfile(activeStudent);
  const [progress, setProgress] = useState(() => loadMathsProgress(activeStudent));
  const [selectedTopic, setSelectedTopic] = useState<MathsTopic | 'all'>('all');
  const [quiz, setQuiz] = useState<{
    mode: MathsQuizMode;
    questions: MathsQuestion[];
    title: string;
    topic: MathsTopic | 'all';
  } | null>(null);
  const [result, setResult] = useState<MathsResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => audioService.stopAll(), []);
  useEffect(() => {
    headingRef.current?.focus();
  }, [quiz, result]);

  const filteredQuestions =
    selectedTopic === 'all'
      ? lesson.questions
      : lesson.questions.filter(q => q.topic === selectedTopic);

  const filteredCards =
    selectedTopic === 'all'
      ? lesson.cards
      : lesson.cards.filter(c => c.topic === selectedTopic);

  const missedQuestions = lesson.questions.filter(q =>
    progress.reviewQuestionIds.includes(q.id)
  );

  const start = (
    mode: MathsQuizMode,
    questions = filteredQuestions,
    title = selectedTopic === 'all'
      ? 'All Grade 2 Maths Questions'
      : MATHS_TOPICS.find(t => t.id === selectedTopic)?.label || 'Topic Quiz',
    topic: MathsTopic | 'all' = selectedTopic
  ) => {
    audioService.stopAll();
    setResult(null);
    setSaved(false);
    setQuiz({ mode, questions, title, topic });
  };

  const persist = (completed: MathsResult) => {
    const next = saveMathsResult(activeStudent, completed);
    setSaved(next !== null);
    if (next) setProgress(next);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-indigo-700 text-sm font-bold uppercase tracking-wide">
          <Calculator className="w-5 h-5" /> Maths · {profile.name} · {profile.gradeLabel}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          {lesson.title}
        </h1>
        <p className="text-sm text-slate-600">
          Full school revision from Fazia's Grade 2 maths notebook: Place Value, Expanded Form, Comparing, Shapes, Number Names, Ordering, and Addition & Subtraction.
        </p>
      </header>

      {quiz && !result ? (
        <>
          <button
            type="button"
            className={`${secondaryButton} inline-flex items-center gap-2`}
            onClick={() => setConfirmExit(true)}
          >
            <ArrowLeft className="w-4 h-4" /> Back to revision notes
          </button>

          {confirmExit && (
            <div role="alert" className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-900">
                This quiz is in progress. Leaving now will discard your current answers. Previously completed results remain safely saved.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => setConfirmExit(false)}
                >
                  Keep answering
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  onClick={() => {
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

          <MathsQuiz
            mode={quiz.mode}
            title={quiz.title}
            topic={quiz.topic}
            questions={quiz.questions}
            settings={settings}
            onComplete={completed => {
              audioService.stopAll();
              setResult(completed);
              persist(completed);
            }}
          />
        </>
      ) : result ? (
        <section className="space-y-6" aria-label="Maths results">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 space-y-3" role="status">
            <h2 className="text-xl font-bold text-slate-900">
              {result.mode === 'exam' ? 'Exam quiz complete!' : 'Practice complete!'}
            </h2>
            <ResultSummary result={result} />
            <p className="text-xs text-slate-600">
              {saved
                ? `Saved for ${profile.name} on this browser.`
                : 'Result not saved to storage. Please retry below.'}
            </p>
            {!saved && (
              <button
                type="button"
                className={secondaryButton}
                onClick={() => persist(result)}
              >
                Retry saving result
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className={primaryButton}
              onClick={() => {
                setQuiz(null);
                setResult(null);
              }}
            >
              Return to revision notes
            </button>
            {result.answers.some(a => !a.correct) && (
              <button
                type="button"
                className={secondaryButton}
                onClick={() => {
                  const missedFromQuiz = lesson.questions.filter(q =>
                    result.answers.some(a => a.questionId === q.id && !a.correct)
                  );
                  const allSameTopic =
                    missedFromQuiz.length > 0 &&
                    missedFromQuiz.every(q => q.topic === missedFromQuiz[0].topic);
                  const reviewTopic = allSameTopic ? missedFromQuiz[0].topic : 'all';
                  start('practice', missedFromQuiz, 'Review Missed Questions', reviewTopic);
                }}
              >
                Practise missed questions
              </button>
            )}
          </div>

          <h2 className="text-xl font-bold text-slate-900">Detailed Answer Review</h2>
          <div className="space-y-3">
            {result.answers.map(answer => {
              const question = lesson.questions.find(q => q.id === answer.questionId)!;
              return (
                <article
                  key={answer.questionId}
                  className={`bg-white border rounded-xl p-4 space-y-2 ${
                    answer.correct ? 'border-emerald-200' : 'border-amber-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900">{question.prompt}</h3>
                    {answer.correct ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-md shrink-0">
                        <XCircle className="w-3.5 h-3.5" /> Revisit
                      </span>
                    )}
                  </div>

                  {question.verticalMath && (
                    <VerticalMathDisplay
                      operand1={question.verticalMath.operand1}
                      operand2={question.verticalMath.operand2}
                      operator={question.verticalMath.operator}
                      hint={question.verticalMath.carryOrBorrowHint}
                    />
                  )}

                  <p className="text-sm">
                    <strong>Your answer:</strong>{' '}
                    <span className={answer.correct ? 'text-emerald-700 font-semibold' : 'text-amber-800 font-semibold'}>
                      {answer.answer || '(Left blank)'}
                    </span>
                  </p>
                  <p className="text-sm text-slate-700">
                    <strong>Correct answer:</strong> {question.answer}
                  </p>
                  {question.explanation && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg">
                      💡 {question.explanation}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <>
          {/* Action & Revision Strategy Banner */}
          <section className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-bold text-indigo-950">Study, Practise, and Test</h2>
            <p className="text-sm text-slate-700 leading-relaxed">{lesson.memoryTip}</p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <button
                type="button"
                className={primaryButton}
                onClick={() => start('practice')}
              >
                Start Practice ({filteredQuestions.length})
              </button>
              <button
                type="button"
                className={secondaryButton}
                onClick={() => start('exam')}
              >
                Start Exam Quiz ({filteredQuestions.length})
              </button>
              {missedQuestions.length > 0 && (
                <button
                  type="button"
                  className={`${secondaryButton} inline-flex items-center gap-2`}
                  onClick={() => start('practice', missedQuestions, 'Missed Questions Review', 'all')}
                >
                  <RotateCcw className="w-4 h-4 text-amber-700" />
                  Review missed ({missedQuestions.length})
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Practice gives immediate step-by-step guidance. The exam quiz tests all questions and saves your verified score.
            </p>
          </section>

          {/* Topic Selector Tabs */}
          <section className="space-y-3" aria-label="Topic filter">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                Filter by Topic:
              </h2>
              <span className="text-xs text-slate-500">
                {filteredQuestions.length} question(s) in view
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedTopic('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  selectedTopic === 'all'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                All Topics ({lesson.questions.length})
              </button>
              {MATHS_TOPICS.map(topic => {
                const count = lesson.questions.filter(q => q.topic === topic.id).length;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopic(topic.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      selectedTopic === topic.id
                        ? 'bg-indigo-700 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {topic.shortLabel} ({count})
                  </button>
                );
              })}
            </div>
          </section>

          {/* Revision Concept Cards */}
          <section className="grid gap-4 sm:grid-cols-2" aria-label="Revision notes">
            {filteredCards.map(card => (
              <article
                key={card.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900">{card.title}</h3>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800">
                      {MATHS_TOPICS.find(t => t.id === card.topic)?.shortLabel}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600">{card.prompt}</p>
                  <p className="text-sm text-slate-800 leading-relaxed">{card.answer}</p>
                  <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-2.5 text-xs text-amber-900">
                    <strong>Rule:</strong> {card.keyRule}
                  </div>
                  {card.examples && (
                    <p className="text-xs text-slate-500">
                      <strong>Examples:</strong> {card.examples}
                    </p>
                  )}
                </div>
                <div className="pt-2">
                  <ListenButton
                    text={`${card.title}. ${card.prompt} ${card.answer}. Key rule: ${card.keyRule}. Examples: ${card.examples}`}
                    label={`Listen to ${card.title}`}
                    enabled={settings.speechAudio}
                  />
                </div>
              </article>
            ))}
          </section>

          {/* Saved Results Card */}
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4" aria-label="Saved maths results">
            <h2 className="text-lg font-bold text-slate-900">Saved Maths Results for {profile.name}</h2>
            {progress.practice && <ResultSummary result={progress.practice} />}
            {progress.exam && <ResultSummary result={progress.exam} />}
            {!progress.practice && !progress.exam && (
              <p className="text-sm text-slate-500">
                No completed maths practice or exam quizzes yet. Start with the revision cards above!
              </p>
            )}
            <p className="text-xs text-slate-500">
              Maths results are saved in this browser and kept separate from spelling and robotics progress.
            </p>
          </section>

          {/* Notebook Attribution & Quick Revision Plan */}
          <aside className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <h2 className="text-sm font-bold text-amber-950">Notebook Revision Guide</h2>
            <p className="text-xs text-slate-700 leading-relaxed">
              Source: <span className="font-semibold">{lesson.sourceName}</span> (Fazia Grade 2 Revision Notebook, dated 12-10-26 to 26-10-26).
              Covers all 7 sections: Place Value, Expanded Form, Standard Form, Comparing (&gt;, &lt;, =), Matching Shapes, Do as Directed (Greatest Numbers, Number Names, Ascending/Descending), and Simplify (Addition &amp; Subtraction with regrouping).
            </p>
          </aside>
        </>
      )}
    </div>
  );
};

function MathsQuiz({
  mode,
  title,
  topic,
  questions,
  settings,
  onComplete
}: {
  mode: MathsQuizMode;
  title: string;
  topic?: string;
  questions: MathsQuestion[];
  settings: AppSettings;
  onComplete: (result: MathsResult) => void;
}) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [answers, setAnswers] = useState<MathsAnswer[]>([]);
  const [feedback, setFeedback] = useState<MathsAnswer | null>(null);
  const [checkingError, setCheckingError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const question = questions[index];

  useEffect(() => {
    promptRef.current?.focus();
    inputRef.current?.focus();
  }, [index]);

  const finish = (completed: MathsAnswer[]) => {
    onComplete({
      mode,
      completedAt: new Date().toISOString(),
      topic,
      answers: completed
    });
  };

  const advance = (completed: MathsAnswer[]) => {
    audioService.stopAll();
    if (index + 1 === questions.length) {
      finish(completed);
    } else {
      setAnswers(completed);
      setIndex(index + 1);
      setInput('');
      setFeedback(null);
      setCheckingError('');
    }
  };

  const submit = (submittedAnswer: string) => {
    audioService.stopAll();
    const answer = submittedAnswer.trim();
    if (!answer) {
      setCheckingError('Please enter or select an answer before continuing.');
      return;
    }

    const correct = checkMathsAnswer(question, answer);
    const entry: MathsAnswer = {
      questionId: question.id,
      answer,
      correct
    };

    if (mode === 'practice') {
      setFeedback(entry);
    } else {
      advance([...answers, entry]);
    }
  };

  const handleNextInPractice = () => {
    if (!feedback) return;
    advance([...answers, feedback]);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 space-y-6 shadow-xs">
      {/* Quiz Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider block">
            {title} · {mode === 'exam' ? 'Exam Quiz' : 'Assisted Practice'}
          </span>
          <span className="text-xs text-slate-500">
            Question {index + 1} of {questions.length}
          </span>
        </div>
        <div className="w-24 sm:w-36 bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2
            ref={promptRef}
            tabIndex={-1}
            className="text-lg sm:text-xl font-bold text-slate-900 leading-snug"
          >
            {question.prompt}
          </h2>
          <ListenButton
            text={question.prompt}
            label="Listen to question"
            enabled={settings.speechAudio}
          />
        </div>

        {/* Vertical Math Display if arithmetic problem */}
        {question.verticalMath && (
          <div className="flex justify-center">
            <VerticalMathDisplay
              operand1={question.verticalMath.operand1}
              operand2={question.verticalMath.operand2}
              operator={question.verticalMath.operator}
              hint={mode === 'practice' ? question.verticalMath.carryOrBorrowHint : undefined}
            />
          </div>
        )}

        {/* Input / Choice Section */}
        {question.kind === 'choice' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {question.options.map(option => (
              <button
                key={option}
                type="button"
                disabled={feedback !== null}
                onClick={() => submit(option)}
                className={`min-h-14 p-4 rounded-xl border text-left font-semibold text-base transition-all cursor-pointer ${
                  feedback && feedback.answer === option
                    ? feedback.correct
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-rose-50 border-rose-400 text-rose-900'
                    : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-800'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <form
            onSubmit={e => {
              e.preventDefault();
              if (feedback) {
                handleNextInPractice();
              } else {
                submit(input);
              }
            }}
            className="space-y-4 pt-2"
          >
            <div>
              <label htmlFor="maths-answer-input" className="sr-only">
                Your answer
              </label>
              <input
                id="maths-answer-input"
                ref={inputRef}
                type="text"
                value={input}
                disabled={feedback !== null}
                onChange={e => {
                  setInput(e.target.value);
                  setCheckingError('');
                }}
                placeholder="Type your answer here..."
                className="w-full text-lg px-4 py-3 border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            {/* Quick helper buttons for comparing questions */}
            {question.topic === 'comparing' && !feedback && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Tap symbol:</span>
                {['<', '=', '>'].map(sym => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => {
                      setInput(sym);
                      submit(sym);
                    }}
                    className="w-10 h-10 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-lg flex items-center justify-center border border-indigo-200 cursor-pointer"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            )}

            {checkingError && (
              <p role="alert" className="text-xs font-semibold text-rose-600">
                {checkingError}
              </p>
            )}

            {!feedback && (
              <div className="flex gap-3">
                <button type="submit" className={primaryButton}>
                  {mode === 'practice' ? 'Check answer' : 'Save answer & continue'}
                </button>
              </div>
            )}
          </form>
        )}

        {/* Practice Mode Feedback Banner */}
        {feedback && (
          <div
            role="status"
            className={`rounded-xl p-4 space-y-3 ${
              feedback.correct ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {feedback.correct ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-emerald-900">Correct! Great job!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-amber-700" />
                  <span className="text-amber-900">Let's check this one:</span>
                </>
              )}
            </div>
            {!feedback.correct && (
              <p className="text-sm text-slate-800">
                <strong>Correct answer:</strong> {question.answer}
              </p>
            )}
            <p className="text-xs text-slate-600">💡 {question.explanation}</p>
            <button
              type="button"
              onClick={handleNextInPractice}
              className={`${primaryButton} inline-flex items-center gap-2`}
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
