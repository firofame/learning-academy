import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Bot, Volume2 } from 'lucide-react';
import { StudentId } from '../types';
import { getStudentProfile } from '../data/wordList';
import { checkRoboticsAnswer, getRoboticsLesson, RoboticsQuestion } from '../data/robotics';
import { audioService } from '../utils/audio';
import { AppSettings } from '../utils/storage';
import {
  loadRoboticsProgress, RoboticsAnswer, RoboticsQuizMode, RoboticsResult, saveRoboticsResult
} from '../utils/roboticsStorage';

interface RoboticsViewProps {
  activeStudent: StudentId;
  settings: AppSettings;
}

const primaryButton = 'min-h-12 px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const secondaryButton = 'min-h-12 px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

function ListenButton({ text, label, enabled }: { text: string; label: string; enabled: boolean }) {
  const [unavailable, setUnavailable] = useState(false);
  return (
    <div>
      <button
        type="button" className={`${secondaryButton} inline-flex items-center gap-2`}
        disabled={!enabled} aria-label={label}
        onClick={() => setUnavailable(!audioService.speak(text))}
      >
        <Volume2 className="w-4 h-4" /> Listen
      </button>
      {!enabled && <p className="text-sm text-slate-500 mt-1">Turn on voice audio in the header to listen.</p>}
      {enabled && unavailable && <p role="status" className="text-sm text-amber-800 mt-1">Read-aloud is unavailable in this browser. You can still read and answer below.</p>}
    </div>
  );
}

function ResultSummary({ result }: { result: RoboticsResult }) {
  const correct = result.answers.filter(answer => answer.correct).length;
  const parentChecks = result.answers.filter(answer => answer.parentChecked).length;
  return (
    <div>
      <p className="font-bold">{result.mode === 'exam' ? 'Last exam quiz' : 'Last assisted practice'}: {correct} / {result.answers.length} correct</p>
      <p className="text-sm text-slate-600">
        {new Date(result.completedAt).toLocaleString()}
        {parentChecks > 0 && ` · ${parentChecks} written answer(s) parent-checked`}
      </p>
    </div>
  );
}

export const RoboticsView: React.FC<RoboticsViewProps> = ({ activeStudent, settings }) => {
  const lesson = getRoboticsLesson(activeStudent);
  const profile = getStudentProfile(activeStudent);
  const [progress, setProgress] = useState(() => loadRoboticsProgress(activeStudent));
  const [quiz, setQuiz] = useState<{ mode: RoboticsQuizMode; questions: RoboticsQuestion[] } | null>(null);
  const [result, setResult] = useState<RoboticsResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => audioService.stopAll(), []);
  useEffect(() => { headingRef.current?.focus(); }, [quiz, result]);

  const start = (mode: RoboticsQuizMode, questions = lesson.questions) => {
    audioService.stopAll();
    setResult(null);
    setSaved(false);
    setQuiz({ mode, questions });
  };

  const persist = (completed: RoboticsResult) => {
    const next = saveRoboticsResult(activeStudent, completed);
    setSaved(next !== null);
    if (next) setProgress(next);
  };

  const missedQuestions = lesson.questions.filter(question => progress.reviewQuestionIds.includes(question.id));

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <header className="space-y-2">
        <p className="flex items-center gap-2 text-teal-800 text-sm font-bold uppercase tracking-wide">
          <Bot className="w-5 h-5" /> Robotics · {profile.name} · {profile.gradeLabel}
        </p>
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl sm:text-3xl font-extrabold text-slate-900">{lesson.title}</h1>
        <p className="text-sm text-slate-600">Lesson 1 · Based on your school robotics notes.</p>
      </header>

      {quiz && !result ? (
        <>
          <button type="button" className={`${secondaryButton} inline-flex items-center gap-2`} onClick={() => setConfirmExit(true)}>
            <ArrowLeft className="w-4 h-4" /> Back to lesson
          </button>
          {confirmExit && (
            <div role="alert" className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p>This quiz is not finished. Leaving will discard its answers. Completed results stay saved.</p>
              <div className="flex flex-wrap gap-3">
                <button className={secondaryButton} onClick={() => setConfirmExit(false)}>Keep answering</button>
                <button className={secondaryButton} onClick={() => {
                  audioService.stopAll(); setQuiz(null); setConfirmExit(false);
                }}>Discard unfinished quiz</button>
              </div>
            </div>
          )}
          <RoboticsQuiz
            mode={quiz.mode} questions={quiz.questions} settings={settings}
            onComplete={completed => {
              audioService.stopAll(); setResult(completed); persist(completed);
            }}
          />
        </>
      ) : result ? (
        <section className="space-y-5" aria-label="Robotics results">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 space-y-2" role="status">
            <h2 className="text-xl font-bold">{result.mode === 'exam' ? 'Exam quiz complete' : 'Practice complete'}</h2>
            <ResultSummary result={result} />
            <p className="text-sm">This is a revision snapshot, not a guarantee of exam readiness. Written answers use a parent check.</p>
            <p className="font-semibold">{saved ? `Saved for ${profile.name} on this browser.` : 'Result not saved. Please retry before leaving this page.'}</p>
            {!saved && <button className={secondaryButton} onClick={() => persist(result)}>Retry saving result</button>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button className={primaryButton} onClick={() => { setQuiz(null); setResult(null); }}>Return to revision notes</button>
            {result.answers.some(answer => !answer.correct) && (
              <button className={secondaryButton} onClick={() => start('practice',
                lesson.questions.filter(question => result.answers.some(answer => answer.questionId === question.id && !answer.correct))
              )}>Practise missed questions</button>
            )}
          </div>
          <h2 className="text-xl font-bold">Answer review</h2>
          {result.answers.map(answer => {
            const question = lesson.questions.find(question => question.id === answer.questionId)!;
            return (
              <article key={answer.questionId} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                <h3 className="font-bold">{question.prompt}</h3>
                <p className={answer.correct ? 'text-teal-800 font-semibold' : 'text-amber-900 font-semibold'}>
                  {answer.correct ? 'Correct' : 'Revisit this'}{answer.parentChecked ? ' · Parent-checked' : ''}
                </p>
                <p>Your answer: {answer.answer || 'Not answered yet'}</p>
                <p><strong>Model answer:</strong> {question.answer}</p>
                {question.explanation && <p className="text-slate-600">{question.explanation}</p>}
              </article>
            );
          })}
        </section>
      ) : (
        <>
          <section className="bg-teal-50 border border-teal-200 rounded-2xl p-5 space-y-4">
            <h2 className="text-lg font-bold">Read, cover, recall, check</h2>
            <p>{lesson.memoryTip}</p>
            <p className="text-sm text-slate-700">Read the cards, then cover them and explain aloud. Practise with feedback, then try all {lesson.questions.length} questions without hints. Short answers can be typed or written in a notebook for a parent to check.</p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <button className={primaryButton} onClick={() => start('practice')}>Start practice</button>
              <button className={secondaryButton} onClick={() => start('exam')}>Start exam quiz</button>
              {missedQuestions.length > 0 && (
                <button className={secondaryButton} onClick={() => start('practice', missedQuestions)}>Review missed ({missedQuestions.length})</button>
              )}
            </div>
            <p className="text-sm text-slate-600">Practice is assisted. Exam answers stay hidden until all questions are finished; a parent then checks written answers. Results save only when a quiz is complete. Leaving Robotics or switching student discards an unfinished quiz.</p>
          </section>
          <section className="grid gap-4 sm:grid-cols-2" aria-label="Revision notes">
            {lesson.cards.map(card => (
              <article key={card.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <h2 className="text-lg font-bold text-slate-900">{card.title}</h2>
                <p className="font-semibold">{card.prompt}</p>
                <p className="leading-relaxed">{card.answer}</p>
                {card.examples && <p className="text-slate-600 leading-relaxed">{card.examples}</p>}
                <ListenButton text={`${card.prompt} ${card.answer} ${card.examples || ''}`} label={`Listen to ${card.title}`} enabled={settings.speechAudio} />
              </article>
            ))}
          </section>
          <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4" aria-label="Saved robotics results">
            <h2 className="text-lg font-bold">Saved results for {profile.name}</h2>
            {progress.practice && <ResultSummary result={progress.practice} />}
            {progress.exam && <ResultSummary result={progress.exam} />}
            {!progress.practice && !progress.exam && <p>No completed quizzes yet. Start with the revision cards.</p>}
            <p className="text-sm text-slate-600">The latest practice and exam results are stored separately from spelling progress, on this browser only. Missed questions remain for review until answered correctly in a full exam quiz.</p>
          </section>
          <aside className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <h2 className="font-bold">Quick revision plan</h2>
            <p>5 minutes reading, 5 minutes recalling aloud, 10 minutes answering, then 5 minutes retrying mistakes. Take a short break if needed. Before the exam, recall the main answers once more.</p>
            <p className="text-sm text-slate-600">Source: {lesson.sourceName}. All four school question formats are included: true/false, multiple choice, fill in the blanks, and short answers.</p>
          </aside>
        </>
      )}
    </div>
  );
};

function RoboticsQuiz({ mode, questions, settings, onComplete }: {
  mode: RoboticsQuizMode;
  questions: RoboticsQuestion[];
  settings: AppSettings;
  onComplete: (result: RoboticsResult) => void;
}) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [notebook, setNotebook] = useState(false);
  const [answers, setAnswers] = useState<RoboticsAnswer[]>([]);
  const [feedback, setFeedback] = useState<RoboticsAnswer | null>(null);
  const [pendingWritten, setPendingWritten] = useState(false);
  const [parentReview, setParentReview] = useState(false);
  const submittedRef = useRef(false);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const question = questions[index];
  const unmarked = answers.find(answer => {
    const target = questions.find(question => question.id === answer.questionId);
    return target?.kind === 'short' && answer.answer.trim() && !answer.parentChecked;
  });

  useEffect(() => { promptRef.current?.focus(); }, [index, parentReview, unmarked?.questionId]);
  useEffect(() => { submittedRef.current = false; }, [index]);

  const finish = (completed: RoboticsAnswer[]) => {
    onComplete({ mode, completedAt: new Date().toISOString(), answers: completed });
  };

  const advance = (completed: RoboticsAnswer[]) => {
    audioService.stopAll();
    if (index + 1 === questions.length) {
      if (mode === 'exam' && completed.some(answer => {
        const target = questions.find(question => question.id === answer.questionId);
        return target?.kind === 'short' && answer.answer.trim() && !answer.parentChecked;
      })) {
        setAnswers(completed); setParentReview(true);
      } else finish(completed);
    } else {
      setAnswers(completed); setIndex(index + 1); setInput(''); setNotebook(false);
      setFeedback(null); setPendingWritten(false);
    }
  };

  const submit = (unknown = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    audioService.stopAll();
    const answer = unknown ? '' : notebook ? 'Written in notebook' : input.trim();
    const entry: RoboticsAnswer = {
      questionId: question.id, answer,
      correct: question.kind !== 'short' && checkRoboticsAnswer(question, answer),
      parentChecked: false
    };
    if (mode === 'exam') advance([...answers, entry]);
    else {
      setFeedback(entry);
      setPendingWritten(question.kind === 'short' && answer.length > 0);
    }
  };

  if (parentReview && unmarked) {
    const target = questions.find(question => question.id === unmarked.questionId)!;
    const mark = (correct: boolean) => {
      const completed = answers.map(answer => answer.questionId === target.id ? { ...answer, correct, parentChecked: true } : answer);
      setAnswers(completed);
      const remaining = completed.some(answer => {
        const question = questions.find(question => question.id === answer.questionId);
        return question?.kind === 'short' && answer.answer.trim() && !answer.parentChecked;
      });
      if (!remaining) finish(completed);
    };
    return (
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <h2 ref={promptRef} tabIndex={-1} className="text-xl font-bold">Parent check: written answers</h2>
        <p>All questions are finished. A parent should compare each written answer with the model. Equivalent wording is fine if it includes the key idea.</p>
        <h3 className="font-bold">{target.prompt}</h3>
        <p><strong>Child's answer:</strong> {unmarked.answer}</p>
        <p><strong>Model answer:</strong> {target.answer}</p>
        <div className="flex flex-col sm:flex-row gap-3" key={target.id}>
          <button className={primaryButton} onClick={() => mark(true)}>Parent: answer is correct</button>
          <button className={secondaryButton} onClick={() => mark(false)}>Parent: needs more practice</button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="font-bold text-teal-800">{mode === 'exam' ? 'Exam quiz' : 'Assisted practice'} · Question {index + 1} of {questions.length}</p>
        <ListenButton key={question.id} text={question.prompt} label="Listen to question" enabled={settings.speechAudio} />
      </div>
      <progress className="w-full accent-teal-700" value={index} max={questions.length} aria-label="Quiz progress" />
      <h2 ref={promptRef} tabIndex={-1} className="text-xl font-bold leading-relaxed">{question.prompt}</h2>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); submit(); }}>
        {question.kind === 'choice' || question.kind === 'true-false' ? (
          <fieldset disabled={feedback !== null} className="space-y-3">
            <legend className="text-sm text-slate-600 mb-2">Choose one answer</legend>
            {question.options.map(option => (
              <label key={option} className={`min-h-12 flex items-center gap-3 border rounded-xl p-3 cursor-pointer ${input === option ? 'border-teal-600 bg-teal-50' : 'border-slate-200'}`}>
                <input type="radio" name={question.id} value={option} checked={input === option} onChange={() => setInput(option)} className="accent-teal-700 shrink-0" />
                <span>{option}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <div className="space-y-3">
            {question.kind === 'short' && (
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={notebook} disabled={feedback !== null} onChange={event => setNotebook(event.target.checked)} />
                I wrote my answer in a notebook for a parent to check
              </label>
            )}
            {!notebook && (
              <>
                <label htmlFor="robotics-answer" className="block font-semibold">{question.kind === 'short' ? 'Write your answer' : 'Fill in the blank'}</label>
                <textarea
                  id="robotics-answer" rows={question.kind === 'short' ? 3 : 2}
                  value={input} onChange={event => setInput(event.target.value)} disabled={feedback !== null}
                  autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
                  className="w-full rounded-xl border border-slate-300 p-3 text-base"
                />
              </>
            )}
            {question.kind === 'short' && <p className="text-sm text-slate-600">A parent checks the meaning, not exact spelling. Model answers stay hidden until {mode === 'exam' ? 'the end of the quiz' : 'you submit'}.</p>}
          </div>
        )}
        {!feedback && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" className={primaryButton} disabled={!input.trim() && !notebook}>{mode === 'exam' ? 'Save answer and continue' : 'Check answer'}</button>
            <button type="button" className={secondaryButton} onClick={() => submit(true)}>I don't know yet</button>
          </div>
        )}
      </form>
      {feedback && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3" role="status">
          <p className="font-bold">{pendingWritten ? 'Parent check needed' : feedback.correct ? 'Well done!' : 'Let us practise this again.'}</p>
          <p><strong>Model answer:</strong> {question.answer}</p>
          {question.explanation && <p>{question.explanation}</p>}
          {pendingWritten ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <button className={primaryButton} onClick={() => { setFeedback({ ...feedback, correct: true, parentChecked: true }); setPendingWritten(false); }}>Parent: answer is correct</button>
              <button className={secondaryButton} onClick={() => { setFeedback({ ...feedback, correct: false, parentChecked: true }); setPendingWritten(false); }}>Parent: needs more practice</button>
            </div>
          ) : (
            <button className={`${primaryButton} inline-flex items-center gap-2`} onClick={() => advance([...answers, feedback])}>
              {index + 1 === questions.length ? 'Finish practice' : 'Next question'} <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
