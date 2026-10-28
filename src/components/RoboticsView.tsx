import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Bot, Volume2 } from 'lucide-react';
import { StudentId } from '../types';
import { getStudentProfile } from '../data/wordList';
import { checkRoboticsAnswer, getRoboticsLesson, RoboticsQuestion } from '../data/robotics';
import { audioService } from '../utils/audio';
import { AppSettings } from '../utils/storage';
import { gradeRoboticsAnswer, MAX_WRITTEN_ANSWER_LENGTH } from '../utils/roboticsGrading';
import {
  loadRoboticsProgress, RoboticsAnswer, RoboticsQuizMode, RoboticsResult, saveRoboticsResult
} from '../utils/roboticsStorage';

interface RoboticsViewProps {
  activeStudent: StudentId;
  settings: AppSettings;
  gradingApiUrl?: string;
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
  const aiChecks = result.answers.filter(answer => answer.aiChecked).length;
  return (
    <div>
      <p className="font-bold">{result.mode === 'exam' ? 'Last exam quiz' : 'Last assisted practice'}: {correct} / {result.answers.length} correct</p>
      <p className="text-sm text-slate-600">
        {new Date(result.completedAt).toLocaleString()}
        {parentChecks > 0 && ` · ${parentChecks} written answer(s) parent-checked`}
        {aiChecks > 0 && ` · ${aiChecks} written answer(s) AI-checked`}
      </p>
    </div>
  );
}

export const RoboticsView: React.FC<RoboticsViewProps> = ({
  activeStudent, settings, gradingApiUrl = import.meta.env?.VITE_GRADING_API_URL || ''
}) => {
  const lesson = getRoboticsLesson(activeStudent);
  const profile = getStudentProfile(activeStudent);
  const [progress, setProgress] = useState(() => loadRoboticsProgress(activeStudent));
  const [quiz, setQuiz] = useState<{ mode: RoboticsQuizMode; questions: RoboticsQuestion[] } | null>(null);
  const [result, setResult] = useState<RoboticsResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [accessCode, setAccessCode] = useState('');
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
            lessonId={lesson.id} gradingApiUrl={gradingApiUrl}
            accessCode={accessCode} onAccessCodeChange={setAccessCode}
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
            <p className="text-sm">This is a revision snapshot, not a guarantee of exam readiness. AI checks written answers and can make mistakes.</p>
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
                  {answer.correct ? 'Correct' : 'Revisit this'}{answer.parentChecked ? ' · Parent-checked' : answer.aiChecked ? ' · AI-checked' : ''}
                </p>
                <p>Your answer: {answer.answer || 'Not answered yet'}</p>
                <p><strong>Model answer:</strong> {question.answer}</p>
                {answer.aiFeedback && <p className="text-slate-600">AI feedback: {answer.aiFeedback}</p>}
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
            <p className="text-sm text-slate-700">Read the cards, then cover them and explain aloud. Practise with feedback, then try all {lesson.questions.length} questions without hints. Type short answers for automatic checking by meaning, not exact spelling. Do not include names or personal information.</p>
            {!gradingApiUrl && <p role="status" className="text-sm text-amber-900">Automatic written-answer checking is not configured. Fixed-answer practice still works. The site owner must set VITE_GRADING_API_URL to the grading Worker URL.</p>}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <button className={primaryButton} onClick={() => start('practice')}>Start practice</button>
              <button className={secondaryButton} onClick={() => start('exam')}>Start exam quiz</button>
              {missedQuestions.length > 0 && (
                <button className={secondaryButton} onClick={() => start('practice', missedQuestions)}>Review missed ({missedQuestions.length})</button>
              )}
            </div>
            <p className="text-sm text-slate-600">Practice is assisted. Exam feedback stays hidden until all questions are finished. Written answers are checked automatically; service failures leave your answer unmarked so you can retry. Results save only when a quiz is complete. Leaving Robotics or switching student discards an unfinished quiz.</p>
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

function RoboticsQuiz({
  mode, questions, settings, lessonId, gradingApiUrl, accessCode, onAccessCodeChange, onComplete
}: {
  mode: RoboticsQuizMode;
  questions: RoboticsQuestion[];
  settings: AppSettings;
  lessonId: string;
  gradingApiUrl: string;
  accessCode: string;
  onAccessCodeChange: (value: string) => void;
  onComplete: (result: RoboticsResult) => void;
}) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [answers, setAnswers] = useState<RoboticsAnswer[]>([]);
  const [feedback, setFeedback] = useState<RoboticsAnswer | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkingError, setCheckingError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const submittedRef = useRef(false);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const question = questions[index];

  useEffect(() => () => controllerRef.current?.abort(), []);
  useEffect(() => { promptRef.current?.focus(); }, [index]);
  useEffect(() => { submittedRef.current = false; }, [index]);

  const finish = (completed: RoboticsAnswer[]) => {
    onComplete({ mode, completedAt: new Date().toISOString(), answers: completed });
  };

  const advance = (completed: RoboticsAnswer[]) => {
    audioService.stopAll();
    if (index + 1 === questions.length) {
      finish(completed);
    } else {
      setAnswers(completed); setIndex(index + 1); setInput('');
      setFeedback(null); setCheckingError('');
    }
  };

  const submit = async (unknown = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    audioService.stopAll();
    const answer = unknown ? '' : input.trim();
    if (!unknown && (!answer || (question.kind === 'short' && (!gradingApiUrl || !accessCode.trim())))) {
      submittedRef.current = false;
      setCheckingError('Enter your answer and grading access code before checking.');
      return;
    }
    const entry: RoboticsAnswer = {
      questionId: question.id, answer,
      correct: question.kind !== 'short' && checkRoboticsAnswer(question, answer),
      parentChecked: false
    };
    if (question.kind === 'short' && answer) {
      const controller = new AbortController();
      controllerRef.current = controller;
      setChecking(true);
      setCheckingError('');
      try {
        const grade = await gradeRoboticsAnswer(
          gradingApiUrl, accessCode, lessonId, question.id, answer, controller.signal
        );
        if (controller.signal.aborted) return;
        entry.correct = grade.correct;
        entry.aiChecked = true;
        entry.aiFeedback = grade.feedback;
      } catch (error) {
        if (!controller.signal.aborted) {
          submittedRef.current = false;
          setCheckingError(error instanceof Error ? error.message : 'Checking failed. Your answer has not been marked. Please retry.');
        }
        return;
      } finally {
        if (!controller.signal.aborted) {
          setChecking(false);
          controllerRef.current = null;
        }
      }
    }
    if (mode === 'exam') advance([...answers, entry]);
    else setFeedback(entry);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <p className="font-bold text-teal-800">{mode === 'exam' ? 'Exam quiz' : 'Assisted practice'} · Question {index + 1} of {questions.length}</p>
        <ListenButton key={question.id} text={question.prompt} label="Listen to question" enabled={settings.speechAudio} />
      </div>
      <progress className="w-full accent-teal-700" value={index} max={questions.length} aria-label="Quiz progress" />
      <h2 ref={promptRef} tabIndex={-1} className="text-xl font-bold leading-relaxed">{question.prompt}</h2>
      <form className="space-y-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
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
            <label htmlFor="robotics-answer" className="block font-semibold">{question.kind === 'short' ? 'Write your answer' : 'Fill in the blank'}</label>
            <textarea
              id="robotics-answer" rows={question.kind === 'short' ? 3 : 2}
              value={input} onChange={event => setInput(event.target.value)} disabled={feedback !== null || checking}
              maxLength={MAX_WRITTEN_ANSWER_LENGTH}
              autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
              className="w-full rounded-xl border border-slate-300 p-3 text-base"
            />
            {question.kind === 'short' && !feedback && (
              <>
                <p className="text-sm text-slate-600">AI checks your meaning, not exact spelling. Feedback stays hidden until {mode === 'exam' ? 'the end of the quiz' : 'you submit'}. Do not include personal information.</p>
                <label htmlFor="grading-access-code" className="block font-semibold">Grading access code</label>
                <input
                  id="grading-access-code" type="password" autoComplete="off" maxLength={128}
                  value={accessCode} onChange={event => onAccessCodeChange(event.target.value)} disabled={checking}
                  className="min-h-12 w-full rounded-xl border border-slate-300 p-3"
                  aria-describedby="grading-access-help"
                />
                <p id="grading-access-help" className="text-sm text-slate-600">Use your family's grading code, not a Gemini API key. It stays in memory only while Robotics is open.</p>
                {!gradingApiUrl && <p role="alert" className="text-amber-900">Automatic checking is not configured. The site owner must connect the grading service.</p>}
              </>
            )}
          </div>
        )}
        {!feedback && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button type="submit" className={primaryButton} disabled={checking || !input.trim() || (question.kind === 'short' && (!gradingApiUrl || !accessCode.trim()))}>
              {checking ? 'Checking answer…' : checkingError ? 'Retry checking answer' : mode === 'exam' ? 'Save answer and continue' : 'Check answer'}
            </button>
            <button type="button" className={secondaryButton} disabled={checking} onClick={() => void submit(true)}>I don't know yet</button>
          </div>
        )}
      </form>
      {checking && <p role="status" className="text-teal-800">Checking your answer. Please wait.</p>}
      {checkingError && <p role="alert" className="text-amber-900">{checkingError}</p>}
      {feedback && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3" role="status">
          <p className="font-bold">{feedback.correct ? 'Well done!' : 'Let us practise this again.'}</p>
          {feedback.aiFeedback && <p>AI feedback: {feedback.aiFeedback}</p>}
          <p><strong>Model answer:</strong> {question.answer}</p>
          {question.explanation && <p>{question.explanation}</p>}
          <button className={`${primaryButton} inline-flex items-center gap-2`} onClick={() => advance([...answers, feedback])}>
            {index + 1 === questions.length ? 'Finish practice' : 'Next question'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
}
