import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Volume2 } from 'lucide-react';
import type { AssistanceKind, AttemptOutcome, LearningAttempt, RevisionAttemptKind, RevisionResponseFormat } from '../learning/contracts';
import { canScheduleRevisionRecheck, deriveRevisionProgress, interleaveItems, selectRevisionBatch, type RevisionStep } from '../learning/revision';
import { createRevisionAttempts, recordRevisionAnswerAttempt } from '../learning/attemptRecords';
import {
  getDefaultLearningRepository, listLearningAttempts, loadRevisionRound, saveRevisionRound,
  type RevisionRoundRecord
} from '../learning/persistence';
import { getStudentProfile } from '../data/profiles';
import { isPortionExamReady, localCalendarDate } from '../learning/domain';
import { createSessionId } from '../learning/revision';
import { emitStorageError } from '../utils/appStorage';
import { audioService } from '../utils/audio';
import type { LearningSubjectId, StudentId } from '../types';

export interface RevisionGrade {
  correct: boolean;
  source: 'deterministic' | 'ai';
  feedback?: string;
}

export interface RevisionQuestion {
  id: string;
  section: string;
  sectionLabel: string;
  prompt: string;
  answer: string;
  responseFormat: RevisionResponseFormat;
  options?: readonly string[];
  explanation?: string;
  provenance?: string;
  helpContent?: React.ReactNode;
  promptContent?: React.ReactNode;
  languageClass?: string;
  language?: string;
  direction?: 'auto' | 'ltr' | 'rtl';
  listenText?: string;
  languageCode?: 'en-US' | 'hi-IN' | 'ml-IN';
  maxLength?: number;
  grade: (answer: string, signal: AbortSignal) => Promise<RevisionGrade>;
}

export interface RevisionResponse {
  questionId: string;
  answer: string;
  outcome: AttemptOutcome;
  attemptKind: RevisionAttemptKind;
  assistance: AssistanceKind[];
  attemptId: string;
  attemptedAt: string;
  aiChecked?: boolean;
  aiFeedback?: string;
  feedback?: string;
  skipped?: boolean;
}

export interface RevisionSessionResult {
  mode: 'practice' | 'exam';
  section: string;
  completedAt: string;
  answers: RevisionResponse[];
}

interface RevisionDraft {
  revisionRoundId: string;
  batchId: string;
  mode: 'practice' | 'exam';
  section: string;
  steps: RevisionStep[];
  index: number;
  answer: string;
  assistance: AssistanceKind[];
  answers: RevisionResponse[];
  phase: 'answering' | 'feedback';
  feedback: RevisionResponse | null;
  activeAttemptId: string | null;
  scheduledRechecks: string[];
}

export interface ExamRevisionViewProps {
  learnerId: StudentId;
  subjectId: LearningSubjectId;
  lessonId: string;
  title: string;
  description: string;
  questions: readonly RevisionQuestion[];
  sessionSize: number;
  onSessionSizeChange: (size: number) => void;
  allowSectionAssessment?: boolean;
  speechAudio: boolean;
  onComplete?: (result: RevisionSessionResult) => boolean | Promise<boolean>;
}

const buttonPrimary = 'min-h-12 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50';
const buttonSecondary = 'min-h-12 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

function isAssistance(value: unknown): value is AssistanceKind {
  return ['answer-revealed', 'tile-helper', 'hint', 'read-aloud', 'other'].includes(String(value));
}

function isRevisionResponse(value: unknown): value is RevisionResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return typeof item.questionId === 'string' && typeof item.answer === 'string' &&
    ['correct', 'incorrect', 'skipped', 'ungraded'].includes(String(item.outcome)) &&
    ['initial', 'correction', 'recheck', 'exam'].includes(String(item.attemptKind)) &&
    Array.isArray(item.assistance) && item.assistance.every(isAssistance) &&
    typeof item.attemptId === 'string' && typeof item.attemptedAt === 'string' &&
    Number.isFinite(Date.parse(item.attemptedAt)) &&
    (item.aiChecked === undefined || typeof item.aiChecked === 'boolean') &&
    (item.aiFeedback === undefined || typeof item.aiFeedback === 'string') &&
    (item.feedback === undefined || typeof item.feedback === 'string') &&
    (item.skipped === undefined || typeof item.skipped === 'boolean');
}

export const ExamRevisionView: React.FC<ExamRevisionViewProps> = ({
  learnerId, subjectId, lessonId, title, description, questions, sessionSize, onSessionSizeChange,
  allowSectionAssessment = false, speechAudio, onComplete
}) => {
  const profile = getStudentProfile(learnerId);
  const [selectedSection, setSelectedSection] = useState('all');
  const [round, setRound] = useState<RevisionRoundRecord | null>(null);
  const [attempts, setAttempts] = useState<LearningAttempt[]>([]);
  const attemptsRef = useRef<LearningAttempt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<'overview' | 'session' | 'summary'>('overview');
  const [session, setSession] = useState<RevisionDraft | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [savedResult, setSavedResult] = useState<boolean | null>(null);
  const [storageMessage, setStorageMessage] = useState('');
  const abortController = useRef<AbortController | null>(null);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const [revisionReloadKey, setRevisionReloadKey] = useState(0);

  const questionById = useMemo(() => new Map(questions.map(question => [question.id, question])), [questions]);
  const questionIdsKey = questions.map(question => question.id).join('\u001f');
  const sectionOptions = useMemo(() => [
    { id: 'all', label: 'All portions', count: questions.length },
    ...Array.from(new Map(questions.map(question => [
      question.section,
      question.sectionLabel
    ])).entries()).map(([id, label]) => ({
      id,
      label,
      count: questions.filter(question => question.section === id).length
    }))
  ], [questions]);
  const roundAttempts = attempts.filter(attempt =>
    attempt.revisionRoundId === round?.revisionRoundId
  );
  const roundQuestionIds = round?.questionIds ?? questions.map(question => question.id);
  const progress = useMemo(
    () => deriveRevisionProgress(roundQuestionIds, roundAttempts),
    [roundQuestionIds, roundAttempts]
  );
  const progressById = useMemo(() => new Map(progress.map(item => [item.questionId, item])), [progress]);
  const coveredCount = progress.filter(item => item.checked).length;
  const readyCount = progress.filter(item => item.examReady).length;
  const pendingCount = progress.filter(item => item.pendingRecheck).length;
  const remainingCount = progress.filter(item => !item.checked).length;
  const currentStep = session?.steps[session.index];
  const currentQuestion = currentStep ? questionById.get(currentStep.questionId) : undefined;

  const priorAssistance = (
    questionId: string,
    attemptKind: RevisionAttemptKind
  ): AssistanceKind[] => {
    if (attemptKind === 'recheck' || attemptKind === 'correction') return [];
    const today = localCalendarDate(new Date());
    return Array.from(new Set(attemptsRef.current
      .filter(attempt => attempt.learnerLocalDate === today && attempt.questionId === questionId &&
        attempt.outcome === 'ungraded')
      .flatMap(attempt => attempt.assistance)));
  };

  // Reactive update when cross-device sync merges new progress
  useEffect(() => {
    const handleProgressSynced = (event: Event) => {
      const customEvent = event as CustomEvent<{ studentId?: StudentId }>;
      if (customEvent.detail?.studentId && customEvent.detail.studentId !== learnerId) {
        return;
      }
      // Protect in-flight student inputs: reload only when NOT actively taking a quiz session
      if (screen !== 'session') {
        setRevisionReloadKey(prev => prev + 1);
      }
    };
    window.addEventListener('academy-progress-synced', handleProgressSynced);
    return () => {
      window.removeEventListener('academy-progress-synced', handleProgressSynced);
    };
  }, [learnerId, screen]);

  useEffect(() => {
    let active = true;
    const repository = getDefaultLearningRepository();
    void Promise.all([
      loadRevisionRound(repository, learnerId, subjectId, lessonId),
      listLearningAttempts(repository, learnerId)
    ]).then(([savedRound, savedAttempts]) => {
      if (!active) return;
      if (savedRound && (savedRound.questionIds.length !== questions.length ||
          savedRound.questionIds.some((id, index) => id !== questions[index]?.id))) {
        setRound(null);
      } else {
        setRound(savedRound);
      }
      const currentAttempts = savedAttempts.filter(attempt =>
        attempt.subjectId === subjectId && attempt.lessonId === lessonId
      );
      attemptsRef.current = currentAttempts;
      setAttempts(currentAttempts);
    }).catch(cause => {
      if (!active) return;
      const message = cause instanceof Error ? cause.message : 'Unable to load saved revision progress.';
      setError(message);
      emitStorageError(message);
    }).finally(() => {
      if (active) setLoaded(true);
    });
    return () => { active = false; };
  }, [learnerId, lessonId, questionIdsKey, subjectId, revisionReloadKey]);

  useEffect(() => {
    promptRef.current?.focus();
  }, [session?.index, screen]);

  useEffect(() => () => abortController.current?.abort(), []);

  const persistRound = async (revisionRoundId: string): Promise<RevisionRoundRecord> => {
    const next: RevisionRoundRecord = {
      revisionRoundId,
      learnerId,
      subjectId,
      lessonId,
      contentVersion: 'v1',
      startedAt: new Date().toISOString(),
      questionIds: questions.map(question => question.id)
    };
    setRound(next);
    try {
      await saveRevisionRound(getDefaultLearningRepository(), next);
      setStorageMessage('');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to save this revision round.';
      setStorageMessage(`${message} Keep this page open and retry if needed.`);
      emitStorageError(message);
    }
    return next;
  };

  const makeSession = (
    revisionRoundId: string,
    mode: 'practice' | 'exam',
    section: string,
    batchId = createSessionId()
  ) => {
    const isAllPortions = section === 'all';
    const sectionIds = questions
      .filter(question => isAllPortions || question.section === section)
      .map(question => question.id);
    const batchSize = sessionSize > 0 ? sessionSize : 0;
    const steps = mode === 'exam'
      ? (isAllPortions
          ? interleaveItems(sectionIds, id => questionById.get(id)?.section ?? 'all')
              .map(questionId => ({ questionId, attemptKind: 'exam' as const }))
          : sectionIds.map(questionId => ({ questionId, attemptKind: 'exam' as const })))
      : selectRevisionBatch(
          sectionIds,
          attemptsRef.current.filter(attempt => attempt.revisionRoundId === revisionRoundId),
          batchId,
          batchSize,
          roundQuestionIds,
          {
            interleave: isAllPortions,
            categoryByQuestionId: id => questionById.get(id)?.section
          }
        );
    if (steps.length === 0) {
      setError(mode === 'exam'
        ? 'There are no questions in this portion.'
        : 'This portion has no unchecked questions or ready rechecks. Choose another portion or recheck mistakes after more questions.');
      return;
    }
    const next: RevisionDraft = {
      revisionRoundId,
      batchId,
      mode,
      section,
      steps,
      index: 0,
      answer: '',
      assistance: priorAssistance(steps[0].questionId, steps[0].attemptKind),
      answers: [],
      phase: 'answering',
      feedback: null,
      activeAttemptId: null,
      scheduledRechecks: steps.filter(step => step.attemptKind === 'recheck').map(step => step.questionId)
    };
    setSession(next);
    setShowHelp(false);
    setSavedResult(null);
    setError('');
    setScreen('session');
  };

  const startRevision = (newRound = false) => {
    let revisionRoundId = round?.revisionRoundId;
    if (newRound || !revisionRoundId) {
      revisionRoundId = createSessionId();
      void persistRound(revisionRoundId);
    }
    makeSession(revisionRoundId, 'practice', selectedSection);
  };

  const startExam = (section = 'all') => {
    let revisionRoundId = round?.revisionRoundId;
    if (!revisionRoundId) {
      revisionRoundId = createSessionId();
      void persistRound(revisionRoundId);
    }
    makeSession(revisionRoundId, 'exam', section);
  };

  const recordResponse = async (
    input: string,
    outcome: AttemptOutcome,
    grade?: RevisionGrade,
    skipped = false,
    attemptIdOverride?: string,
    assistanceOverride?: readonly AssistanceKind[]
  ) => {
    if (!session || !currentQuestion || !currentStep) return;
    const attemptedAt = new Date().toISOString();
    const attemptId = attemptIdOverride ?? session.activeAttemptId ??
      `${session.batchId}:${currentQuestion.id}:${currentStep.attemptKind}:${createSessionId()}`;
    const response: RevisionResponse = {
      questionId: currentQuestion.id,
      answer: input,
      outcome,
      attemptKind: currentStep.attemptKind,
      assistance: [...(assistanceOverride ?? session.assistance)],
      attemptId,
      attemptedAt,
      ...(grade?.source === 'ai' ? { aiChecked: true } : {}),
      ...(grade?.feedback ? { aiFeedback: grade.feedback } : {}),
      ...(grade?.feedback ? { feedback: grade.feedback } : {}),
      ...(skipped ? { skipped: true } : {})
    };
    const revisionSequence = attemptsRef.current.filter(attempt =>
      attempt.revisionRoundId === session.revisionRoundId
    ).length;
    const [learningAttempt] = createRevisionAttempts({
      learnerId,
      subjectId,
      lessonId,
      mode: session.mode,
      completedAt: attemptedAt,
      answers: [{
        questionId: currentQuestion.id,
        answer: input,
        correct: outcome === 'correct',
        skipped,
        ungraded: outcome === 'ungraded',
        prompt: currentQuestion.prompt,
        referenceAnswer: currentQuestion.answer,
        explanation: currentQuestion.explanation,
        provenance: currentQuestion.provenance,
        attemptId,
        attemptedAt,
        assistance: assistanceOverride ?? session.assistance,
        aiChecked: grade?.source === 'ai',
        aiFeedback: grade?.feedback,
        revisionRoundId: session.revisionRoundId,
        revisionBatchId: session.batchId,
        revisionAttemptKind: currentStep.attemptKind,
        responseFormat: currentQuestion.responseFormat,
        revisionSequence
      }]
    });

    const nextAttempts = [
      ...attemptsRef.current.filter(attempt => attempt.attemptId !== attemptId),
      learningAttempt
    ].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp) ||
      (a.revisionSequence ?? 0) - (b.revisionSequence ?? 0));
    attemptsRef.current = nextAttempts;
    setAttempts(nextAttempts);
    setSession(previous => previous ? {
      ...previous,
      answers: [
        ...previous.answers.filter(answer => answer.attemptId !== attemptId),
        response
      ],
      activeAttemptId: outcome === 'ungraded' ? attemptId : null
    } : previous);
    if (typeof indexedDB !== 'undefined') {
      try {
        await recordRevisionAnswerAttempt({
          learnerId, subjectId, lessonId, mode: session.mode,
          answer: {
            questionId: currentQuestion.id,
            answer: input,
            correct: outcome === 'correct',
            skipped,
            ungraded: outcome === 'ungraded',
            prompt: currentQuestion.prompt,
            referenceAnswer: currentQuestion.answer,
            explanation: currentQuestion.explanation,
            provenance: currentQuestion.provenance,
            attemptId,
            attemptedAt,
            assistance: assistanceOverride ?? session.assistance,
            aiChecked: grade?.source === 'ai',
            aiFeedback: grade?.feedback,
            revisionRoundId: session.revisionRoundId,
            revisionBatchId: session.batchId,
            revisionAttemptKind: currentStep.attemptKind,
            responseFormat: currentQuestion.responseFormat,
            revisionSequence
          }
        });
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'The revision answer was checked but could not be saved.';
        setStorageMessage(message);
      }
    }
    return response;
  };

  const markAssistance = async (kind: AssistanceKind) => {
    if (!session || !currentQuestion || !currentStep || session.phase !== 'answering' ||
        session.assistance.includes(kind)) return;
    const assistance = [...session.assistance, kind];
    setSession(previous => previous ? { ...previous, assistance } : previous);
    await recordResponse(
      session.answer, 'ungraded', undefined, false, session.activeAttemptId ?? undefined, assistance
    );
  };

  const checkAnswer = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || !currentQuestion || !currentStep || checking || session.phase !== 'answering') return;
    const answer = session.answer.trim();
    if (!answer) {
      setError('Write or choose an answer, or select “I don’t know yet.”');
      return;
    }
    setError('');
    const attemptId = session.activeAttemptId ??
      `${session.batchId}:${currentQuestion.id}:${currentStep.attemptKind}:${createSessionId()}`;
    setSession(previous => previous ? { ...previous, activeAttemptId: attemptId } : previous);
    setChecking(true);
    const controller = new AbortController();
    abortController.current = controller;
    try {
      const grade = await currentQuestion.grade(answer, controller.signal);
      if (controller.signal.aborted) return;
      const response = await recordResponse(answer, grade.correct ? 'correct' : 'incorrect', grade, false, attemptId);
      if (session.mode === 'exam') {
        moveToNext(response);
      } else {
        if (response) {
          setSession(previous => previous ? {
            ...previous, phase: 'feedback', feedback: response, activeAttemptId: null
          } : previous);
        }
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        const message = cause instanceof Error ? cause.message : 'This answer could not be checked. Please retry.';
        setError(message);
        await recordResponse(answer, 'ungraded', undefined, false, attemptId);
      }
    } finally {
      if (!controller.signal.aborted) {
        setChecking(false);
        abortController.current = null;
      }
    }
  };

  const finishSession = (completedSession = session) => {
    if (!completedSession) return;
    setScreen('summary');
    setShowHelp(false);
    setSavedResult(null);
    try {
      const outcome = onComplete?.({
        mode: completedSession.mode,
        section: completedSession.section,
        completedAt: new Date().toISOString(),
        answers: completedSession.answers
      });
      if (outcome instanceof Promise) {
        outcome
          .then(saved => setSavedResult(saved))
          .catch(cause => {
            const message = cause instanceof Error ? cause.message : 'Unable to save the revision result.';
            setStorageMessage(message);
            emitStorageError(message);
            setSavedResult(false);
          });
      } else {
        setSavedResult(outcome ?? null);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to save the revision result.';
      setStorageMessage(message);
      emitStorageError(message);
    }
  };

  function moveToNext(latestResponse?: RevisionResponse) {
    if (!session) return;
    const completedSession = latestResponse
      ? {
          ...session,
          answers: [
            ...session.answers.filter(answer => answer.attemptId !== latestResponse.attemptId),
            latestResponse
          ]
        }
      : session;
    let steps = [...session.steps];
    let scheduled = [...session.scheduledRechecks];
    const nextIndex = session.index + 1;
    if (session.mode === 'practice' && currentStep?.attemptKind !== 'recheck') {
      const updatedAttempts = attemptsRef.current;
      const candidate = deriveRevisionProgress(roundQuestionIds, updatedAttempts)
        .find(item => item.pendingRecheck && item.gapCount >= 2 &&
          !scheduled.includes(item.questionId) &&
          canScheduleRevisionRecheck(item.questionId, roundQuestionIds, updatedAttempts, session.batchId));
      if (candidate) {
        steps.splice(nextIndex, 0, { questionId: candidate.questionId, attemptKind: 'recheck' });
        scheduled = [...scheduled, candidate.questionId];
      }
    }
    if (nextIndex >= steps.length) {
      const finished = { ...completedSession, steps, scheduledRechecks: scheduled };
      setSession(finished);
      finishSession(finished);
      return;
    }
    setSession({
      ...completedSession,
      steps,
      scheduledRechecks: scheduled,
      index: nextIndex,
      answer: '',
      assistance: priorAssistance(
        steps[nextIndex].questionId, steps[nextIndex].attemptKind
      ),
      phase: 'answering',
      feedback: null,
      activeAttemptId: null
    });
    setShowHelp(false);
    setError('');
  }

  const skipQuestion = async () => {
    if (!session || !currentQuestion || !currentStep || checking) return;
    const answer = '';
    const response = await recordResponse(answer, 'skipped', undefined, true);
    if (session.mode === 'exam') {
      moveToNext(response);
    } else {
      setSession(previous => previous && response ? {
        ...previous,
        phase: 'feedback',
        feedback: response
      } : previous);
    }
  };

  const tryAgainNow = () => {
    if (!session || !currentStep) return;
    setSession(previous => previous ? {
      ...previous,
      steps: previous.steps.map((step, index) =>
        index === previous.index ? { ...step, attemptKind: 'correction' as const } : step
      ),
      answer: '',
      assistance: Array.from(new Set([...previous.assistance, 'answer-revealed' as const])),
      phase: 'answering',
      feedback: null,
      activeAttemptId: null
    } : previous);
    setShowHelp(false);
    setError('');
  };

  const beginNextBatch = (section = selectedSection) => {
    if (!round) return;
    setSelectedSection(section);
    makeSession(round.revisionRoundId, 'practice', section);
  };

  const restartAsNewRound = async () => {
    await startRevision(true);
  };

  const retrySaveResult = () => {
    if (!session) return;
    try {
      const outcome = onComplete?.({
        mode: session.mode,
        section: session.section,
        completedAt: new Date().toISOString(),
        answers: session.answers
      });
      if (outcome instanceof Promise) {
        outcome
          .then(saved => setSavedResult(saved))
          .catch(cause => {
            const message = cause instanceof Error ? cause.message : 'Unable to save the revision result.';
            setStorageMessage(message);
            emitStorageError(message);
            setSavedResult(false);
          });
      } else {
        setSavedResult(outcome ?? null);
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to save the revision result.';
      setStorageMessage(message);
      emitStorageError(message);
    }
  };

  const canStartNewRound = Boolean(round && remainingCount === 0 && pendingCount === 0);

  if (!loaded) {
    return <p className="mx-auto max-w-4xl p-6 text-sm text-slate-600" role="status">Loading your saved revision…</p>;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-3 py-5 sm:px-5 sm:py-8">
      <header className="space-y-2">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-600">
          {title} · {profile.name} · {profile.gradeLabel}
        </p>
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{title}</h1>
        <p className="text-sm leading-relaxed text-slate-700">{description}</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{error}</p>}
      {storageMessage && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{storageMessage}</p>}

      {screen === 'overview' && (
        <>
          {session && (
            <section className="space-y-3 rounded-xl border border-sky-200 bg-sky-50 p-4" aria-label="Current revision session">
              <p className="font-semibold text-sky-950">Your unfinished revision session is ready to continue.</p>
              <button type="button" className={buttonPrimary} onClick={() => setScreen('session')}>
                Resume current session
              </button>
            </section>
          )}

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" aria-label="Revision overview">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Exam-eve revision</h2>
                <p className="text-sm text-slate-600">Recall first, get feedback, then recheck mistakes after other questions.</p>
              </div>
              {round && (
                <p className="text-sm font-semibold text-slate-700" aria-live="polite">
                  {coveredCount} of {round.questionIds.length} checked · {pendingCount} to recheck
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="revision-portion" className="block text-sm font-semibold text-slate-800">Choose a portion</label>
              <select
                id="revision-portion"
                value={selectedSection}
                onChange={event => setSelectedSection(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base"
              >
                {sectionOptions.map(option => <option key={option.id} value={option.id}>{option.label} ({option.count})</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="revision-batch-size" className="block text-sm font-semibold text-slate-800">Questions per batch</label>
              <select
                id="revision-batch-size"
                value={sessionSize}
                onChange={event => onSessionSizeChange(Number(event.target.value))}
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base"
              >
                {!([5, 10, 0] as number[]).includes(sessionSize) && (
                  <option value={sessionSize}>{sessionSize > 0 ? `${sessionSize} questions` : 'All remaining questions'}</option>
                )}
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
                <option value={0}>All remaining questions</option>
              </select>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" className={buttonPrimary} onClick={() => void startRevision(!round || canStartNewRound)}>
                {canStartNewRound ? 'Start a new revision round' : round ? 'Continue revision' : 'Start revision'}
              </button>
              {round && pendingCount > 0 && (
                <button type="button" className={buttonSecondary} onClick={() => beginNextBatch()}>
                  Recheck mistakes ({pendingCount})
                </button>
              )}
              {allowSectionAssessment && selectedSection !== 'all' && (
                <button type="button" className={buttonSecondary} onClick={() => startExam(selectedSection)}>
                  Optional {sectionOptions.find(option => option.id === selectedSection)?.label} assessment
                </button>
              )}
              <button type="button" className={buttonSecondary} onClick={() => void startExam('all')}>
                Optional full mock exam
              </button>
            </div>

            {round && (
              <div className="space-y-2 text-sm text-slate-700">
                <p><strong>Exam-Ready for tomorrow:</strong> {readyCount} of {round.questionIds.length} question(s) ready.</p>
                {remainingCount > 0 && <p>{remainingCount} question(s) have not been checked in this revision round.</p>}
                {pendingCount > 0 && <p>Rechecks need two other completed questions first. Once rechecked unaided, questions are exam-ready for tomorrow.</p>}
                {isPortionExamReady(progress) && <p>All questions are exam-ready for tomorrow! Start a new round to practise them again.</p>}
              </div>
            )}
          </section>

          <section className="space-y-3" aria-label="Revision portions">
            <h2 className="text-lg font-bold text-slate-900">Portions</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {sectionOptions.map(option => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => setSelectedSection(option.id)}
                  aria-pressed={selectedSection === option.id}
                  className={`min-h-12 rounded-xl border p-3 text-left text-sm font-semibold ${
                    selectedSection === option.id ? 'border-slate-800 bg-slate-100' : 'border-slate-200 bg-white'
                  }`}
                >
                  {option.label} · {option.count} question(s)
                  {round && option.id !== 'all' && (
                    <span className="mt-1 block text-xs font-normal text-slate-600">
                      {questions.filter(question => question.section === option.id &&
                        progressById.get(question.id)?.checked).length} checked
                    </span>
                  )}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {screen === 'session' && session && currentQuestion && currentStep && (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold text-slate-700">
              {session.mode === 'exam' ? 'Mock exam' : currentStep.attemptKind === 'recheck' ? 'Recheck after other questions' : 'Revision'} · Question {session.index + 1} of {session.steps.length}
            </p>
            <button type="button" className={buttonSecondary} onClick={() => { setScreen('overview'); setError(''); }}>
              <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" /> Save and exit
            </button>
          </div>
          <progress className="h-2 w-full accent-slate-800" value={session.index + 1} max={session.steps.length} aria-label="Revision progress" />
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{currentQuestion.sectionLabel}</p>
          <div className="flex items-start justify-between gap-3">
            <div className={`min-w-0 flex-1 text-lg font-bold leading-relaxed text-slate-900 sm:text-xl ${currentQuestion.languageClass ?? ''}`}>
              <h2 ref={promptRef} tabIndex={-1} dir={currentQuestion.direction ?? 'auto'} lang={currentQuestion.language}>
                {currentQuestion.prompt}
              </h2>
              {currentQuestion.promptContent}
            </div>
            {speechAudio && session.phase === 'answering' && currentQuestion.listenText && (
              <button
                type="button"
                className={buttonSecondary}
                aria-label="Listen to question"
                onClick={() => {
                  if (audioService.speak(currentQuestion.listenText!, currentQuestion.languageCode)) {
                    void markAssistance('read-aloud');
                  }
                }}
              >
                <Volume2 className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>

          {session.mode === 'practice' && session.phase === 'answering' && currentQuestion.helpContent && (
            <div>
              <button
                type="button"
                className={buttonSecondary}
                aria-expanded={showHelp}
                onClick={() => {
                  setShowHelp(value => !value);
                  if (!showHelp) void markAssistance('answer-revealed');
                }}
              >
                {showHelp ? 'Hide help' : 'Show help'}
              </button>
              {showHelp && <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-4">{currentQuestion.helpContent}</div>}
            </div>
          )}

          {session.phase === 'answering' && (
            <form className="space-y-4" onSubmit={event => void checkAnswer(event)}>
              {currentQuestion.responseFormat === 'choice' && currentQuestion.options ? (
                <fieldset disabled={checking} className="space-y-2">
                  <legend className="mb-2 text-sm text-slate-600">Choose one answer</legend>
                  {currentQuestion.options.map(option => (
                    <label key={option} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 p-3">
                      <input
                        type="radio"
                        name={`${session.batchId}-${currentQuestion.id}`}
                        value={option}
                        checked={session.answer === option}
                        onChange={() => setSession(previous => previous ? { ...previous, answer: option } : previous)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-800">Your answer</span>
                  <textarea
                    value={session.answer}
                    onChange={event => {
                      setSession(previous => previous ? { ...previous, answer: event.target.value } : previous);
                      setError('');
                    }}
                    dir={currentQuestion.direction ?? 'auto'}
                    lang={currentQuestion.language}
                    maxLength={currentQuestion.maxLength ?? 1200}
                    rows={currentQuestion.answer.length > 120 ? 4 : 2}
                    disabled={checking}
                    className={`min-h-12 w-full rounded-xl border border-slate-300 p-3 text-base ${currentQuestion.languageClass ?? ''}`}
                    autoComplete="off"
                  />
                </label>
              )}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="submit" className={buttonPrimary} disabled={checking || !session.answer.trim()}>
                  {checking ? 'Checking answer…' : session.mode === 'exam' ? 'Save answer and continue' : 'Check answer'}
                </button>
                <button type="button" className={buttonSecondary} disabled={checking} onClick={() => void skipQuestion()}>
                  I don’t know yet
                </button>
              </div>
            </form>
          )}

          {checking && <p role="status" className="text-sm text-slate-600">Checking your answer…</p>}

          {session.phase === 'feedback' && session.feedback && (
            <div role="status" className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-bold">
                {session.feedback.outcome === 'correct'
                  ? 'Correct. Keep going.'
                  : session.feedback.outcome === 'skipped'
                    ? 'We’ll come back to this after other questions.'
                    : 'Let’s review this answer.'}
              </p>
              {session.feedback.feedback && <p>{session.feedback.feedback}</p>}
              {session.feedback.outcome !== 'correct' && (
                <p dir={currentQuestion.direction ?? 'auto'} lang={currentQuestion.language}>
                  <strong>Answer:</strong> {currentQuestion.answer}
                </p>
              )}
              {currentQuestion.explanation && <p className="text-sm text-slate-700">{currentQuestion.explanation}</p>}
              {currentStep.attemptKind !== 'recheck' &&
                (session.feedback.outcome !== 'correct' ||
                  (currentStep.attemptKind === 'initial' && session.feedback.assistance.length > 0)) && (
                <button type="button" className={buttonSecondary} onClick={tryAgainNow}>
                  Try once more now
                </button>
              )}
              {(session.feedback.outcome !== 'correct' || session.feedback.assistance.length > 0) && currentStep.attemptKind === 'recheck' && (
                <p className="text-sm text-slate-600">This still needs another recheck after more questions.</p>
              )}
              <button type="button" className={buttonPrimary} onClick={() => moveToNext()}>
                {session.index + 1 === session.steps.length ? 'Finish this batch' : 'Continue'}
                <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </section>
      )}

      {screen === 'summary' && session && (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" aria-label="Revision summary">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{session.mode === 'exam' ? 'Mock exam complete' : 'Revision batch complete'}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {session.mode === 'exam'
                ? 'This score is an exam snapshot.'
                : 'Same-day rechecks make questions Exam-Ready for tomorrow once answered correctly unaided or after a 2-question lag.'}
            </p>
          </div>
          {session.mode === 'exam' && (
            <p className="text-lg font-semibold">
              {session.answers.filter(answer => answer.outcome === 'correct').length} correct of {session.answers.filter(answer => answer.outcome !== 'ungraded').length} checked
            </p>
          )}
          {session.answers.length > 0 && (
            <div className="space-y-3">
              {session.answers.map((answer, index) => {
                const question = questionById.get(answer.questionId);
                return (
                  <article key={`${answer.attemptId}-${index}`} className="rounded-xl border border-slate-200 p-3">
                    <p className="font-semibold" dir={question?.direction ?? 'auto'}>{question?.prompt}</p>
                    <p className="text-sm text-slate-700">
                      {answer.outcome === 'correct' ? 'Correct' : answer.outcome === 'ungraded' ? 'Not checked' : 'Revisit'}
                      {answer.attemptKind === 'recheck' ? ' · Same-day recheck' : ''}
                      {answer.assistance.length > 0 ? ' · Help used' : ''}
                    </p>
                    {answer.outcome !== 'correct' && question && (
                      <p className="mt-1 text-sm" dir={question.direction ?? 'auto'}><strong>Answer:</strong> {question.answer}</p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
          {savedResult !== null && <p role="status" className="text-sm text-slate-700">{savedResult ? 'Result saved on this device.' : 'The result could not be saved. Retry saving it below.'}</p>}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="button" className={buttonPrimary} onClick={() => { setScreen('overview'); setSession(null); setError(''); }}>
              Return to revision
            </button>
            {session.mode === 'practice' && remainingCount > 0 && (
              <button type="button" className={buttonSecondary} onClick={() => { setSession(null); beginNextBatch('all'); }}>
                Continue remaining portions ({remainingCount})
              </button>
            )}
            {session.mode === 'practice' && pendingCount > 0 && (
              <button type="button" className={buttonSecondary} onClick={() => { setSession(null); beginNextBatch('all'); }}>
                Recheck mistakes ({pendingCount})
              </button>
            )}
            {savedResult === false && onComplete && (
              <button type="button" className={buttonSecondary} onClick={retrySaveResult}>Retry saving result</button>
            )}
            {session.mode === 'practice' && canStartNewRound && (
              <button type="button" className={buttonSecondary} onClick={() => void restartAsNewRound()}>
                Start a new revision round
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
};
