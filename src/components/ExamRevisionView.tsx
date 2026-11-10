import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Volume2, Star, Sparkles } from 'lucide-react';
import type { AssistanceKind, AttemptOutcome, LearningAttempt, RevisionAttemptKind, RevisionResponseFormat } from '../learning/contracts';
import { canScheduleRevisionRecheck, deriveRevisionProgress, interleaveItems, isRevisionRecheckReady, selectRevisionBatch, type RevisionStep } from '../learning/revision';
import { createRevisionAttempts, recordRevisionAnswerAttempt } from '../learning/attemptRecords';
import {
  getDefaultLearningRepository, listLearningAttempts, loadRevisionRound, saveRevisionRound,
  type RevisionRoundRecord
} from '../learning/persistence';
import { getStudentProfile } from '../data/profiles';
import { LEARNING_SUBJECTS } from '../data/subjects';
import { deriveRewardState, getNewlyUnlockedMilestones, starsForAttempt } from '../learning/rewards';
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
  onExamActiveChange?: (active: boolean) => void;
}

const buttonPrimary = 'min-h-12 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50';
const buttonSecondary = 'min-h-12 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

const ENCOURAGING_CORRECT_MESSAGES = [
  "Brilliant! You nailed it! 🌟",
  "That's right! You're on fire! 🔥",
  "Perfect answer! Keep going! ✨",
  "Spot on! Excellent recall! 💪",
  "Awesome work! You've got this! 🎯"
];
const SUPPORTIVE_REVIEW_MESSAGES = [
  "Good try! Let's look at this together.",
  "Not quite yet. Each practice helps you remember.",
  "Let's strengthen this one. You've got this!"
];
const SUPPORTIVE_SKIP_MESSAGES = [
  "No worries. We'll revisit this one together.",
  "It's okay not to know yet. There's time to practise."
];

function getEncouragement(index: number): string {
  return ENCOURAGING_CORRECT_MESSAGES[index % ENCOURAGING_CORRECT_MESSAGES.length];
}

const CONFETTI_PIECES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 3.6 + 1.5) % 98}%`,
  delay: `${(i % 7) * 0.1}s`,
  duration: `${1.8 + (i % 5) * 0.25}s`,
  color: [
    '#10b981', // emerald
    '#f59e0b', // amber
    '#3b82f6', // sky
    '#ec4899', // pink
    '#8b5cf6', // purple
    '#14b8a6', // teal
    '#f97316'  // orange
  ][i % 7],
  width: i % 2 === 0 ? '8px' : '6px',
  height: i % 2 === 0 ? '14px' : '9px',
  borderRadius: i % 3 === 0 ? '9999px' : '2px'
}));

const CelebrationConfetti: React.FC = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    {CONFETTI_PIECES.map(piece => (
      <span
        key={piece.id}
        className="animate-confetti absolute pointer-events-none"
        style={{
          left: piece.left,
          top: '-12px',
          width: piece.width,
          height: piece.height,
          backgroundColor: piece.color,
          borderRadius: piece.borderRadius,
          animationDelay: piece.delay,
          animationDuration: piece.duration
        }}
      />
    ))}
  </div>
);

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
  allowSectionAssessment = false, speechAudio, onComplete, onExamActiveChange
}) => {
  const profile = getStudentProfile(learnerId);
  const subject = LEARNING_SUBJECTS.find(item => item.id === subjectId);
  const [selectedSection, setSelectedSection] = useState('all');
  const [round, setRound] = useState<RevisionRoundRecord | null>(null);
  const [attempts, setAttempts] = useState<LearningAttempt[]>([]);
  const attemptsRef = useRef<LearningAttempt[]>([]);
  const rewardAttemptsRef = useRef<LearningAttempt[]>([]);
  const [batchMilestonesBefore, setBatchMilestonesBefore] = useState<string[]>([]);
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
  const allRoundChecked = remainingCount === 0;
  const canStartNewRound = Boolean(round && remainingCount === 0 && pendingCount === 0);
  const readyRecheckCount = progress.filter(item =>
    isRevisionRecheckReady(item, progress, allRoundChecked)
  ).length;
  const waitingRecheckCount = pendingCount - readyRecheckCount;
  const currentStep = session?.steps[session.index];
  const currentQuestion = currentStep ? questionById.get(currentStep.questionId) : undefined;
  const summaryAnswers = session?.answers.filter(answer => answer.outcome !== 'ungraded') ?? [];
  const summaryCorrectCount = session?.answers.filter(answer => answer.outcome === 'correct').length ?? 0;
  const isBatchPerfect = summaryAnswers.length > 0 && summaryCorrectCount === summaryAnswers.length;
  const completedSteps = session ? session.index + (session.phase === 'feedback' ? 1 : 0) : 0;
  const batchStars = session?.answers.reduce((total, answer) => total + starsForAttempt(answer), 0) ?? 0;
  const batchMilestones = screen === 'summary'
    ? getNewlyUnlockedMilestones(
        deriveRewardState(learnerId, rewardAttemptsRef.current, localCalendarDate(new Date())),
        batchMilestonesBefore
      )
    : [];
  const hasHiddenExam = session?.mode === 'exam' && screen !== 'summary';

  useEffect(() => {
    onExamActiveChange?.(hasHiddenExam);
  }, [hasHiddenExam, onExamActiveChange]);

  useEffect(() => () => onExamActiveChange?.(false), [onExamActiveChange]);

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
      rewardAttemptsRef.current = savedAttempts;
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

  useEffect(() => () => {
    abortController.current?.abort();
    audioService.stopAll();
  }, []);

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
    batchId = createSessionId(),
    rechecksOnly = false
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
            categoryByQuestionId: id => questionById.get(id)?.section,
            rechecksOnly
          }
        );
    if (steps.length === 0) {
      let message = 'There are no questions in this portion.';
      if (mode === 'practice') {
        if (canStartNewRound) {
          message = 'All questions in this revision round are complete and exam-ready! Start a new round to practice again.';
        } else if (allRoundChecked && pendingCount > 0) {
          message = readyRecheckCount === 0
            ? 'This question was recently rechecked. Answer more questions before rechecking it again.'
            : 'This portion has no remaining mistakes. Choose another portion or click “Recheck mistakes” to review them.';
        } else {
          message = 'This portion has no unchecked questions or ready rechecks. Choose another portion or recheck mistakes after more questions.';
        }
      }
      setError(message);
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
    setBatchMilestonesBefore(
      deriveRewardState(learnerId, rewardAttemptsRef.current, localCalendarDate(new Date())).unlockedMilestoneIds
    );
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
    rewardAttemptsRef.current = [
      ...rewardAttemptsRef.current.filter(attempt => attempt.attemptId !== attemptId),
      learningAttempt
    ];
    window.dispatchEvent(new window.CustomEvent('academy-reward-attempt', { detail: { attempt: learningAttempt } }));
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
          if (speechAudio) void audioService.playFeedback(grade.correct ? 'correct' : 'review');
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
    if (speechAudio) void audioService.playFeedback('complete');
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
      setSavedResult(false);
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

  const beginRecheckBatch = (section = 'all') => {
    if (!round || readyRecheckCount === 0) return;
    setSelectedSection(section);
    makeSession(round.revisionRoundId, 'practice', section, createSessionId(), true);
  };

  const restartAsNewRound = async () => {
    await startRevision(true);
  };

  const retrySaveResult = () => {
    if (!session) return;
    setSavedResult(null);
    setStorageMessage('');
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
      setSavedResult(false);
    }
  };

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
              {round && readyRecheckCount > 0 && (
                <button type="button" className={buttonSecondary} onClick={() => beginRecheckBatch('all')}>
                  Recheck mistakes ({readyRecheckCount})
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
                {pendingCount > 0 && (
                  <p>
                    {allRoundChecked && readyRecheckCount > 0
                      ? 'All portion questions are checked. Recheck your remaining mistakes to make them exam-ready.'
                      : 'Rechecks need two other completed questions first. Once rechecked unaided, questions are exam-ready for tomorrow.'}
                  </p>
                )}
                {isPortionExamReady(progress) && <p className="rounded-xl bg-emerald-50 p-3 text-emerald-900 animate-glow-pulse">All questions are exam-ready for tomorrow! Start a new round to practise them again.</p>}
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
                    selectedSection === option.id ? `border-current ${subject?.lightBg} ${subject?.darkText}` : 'border-slate-200 bg-white'
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
        <section className="space-y-5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs sm:p-6 animate-slide-up">
          <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 ${subject?.lightBg}`}>
            <p className={`font-bold ${subject?.darkText}`}>
              <span aria-hidden="true">{subject?.emoji} </span>
              {session.mode === 'exam' ? 'Mock exam' : currentStep.attemptKind === 'recheck' ? 'Recheck after other questions' : 'Revision'} · Question {session.index + 1} of {session.steps.length}
            </p>
            <button type="button" className={buttonSecondary} onClick={() => { setScreen('overview'); setError(''); }}>
              <ArrowLeft className="mr-1 inline h-4 w-4" aria-hidden="true" /> Save and exit
            </button>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200/60">
              <div
                className={`h-2.5 rounded-full transition-all duration-300 ease-out ${subject?.progressBg}`}
                style={{ width: `${Math.round((completedSteps / session.steps.length) * 100)}%` }}
                role="progressbar"
                aria-valuenow={completedSteps}
                aria-valuemin={0}
                aria-valuemax={session.steps.length}
                aria-label="Revision progress"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1" aria-hidden="true">
              {session.steps.map((step, index) => (
                <span
                  key={`${step.questionId}-${index}`}
                  className={`h-2 w-2 rounded-full ${
                    index < completedSteps ? subject?.progressBg
                      : index === session.index ? `${subject?.progressBg} animate-glow-pulse`
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
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
            <div
              role="status"
              className={`relative overflow-hidden space-y-3 rounded-xl border p-4 sm:p-5 transition-all duration-200 animate-pop-in ${
                session.feedback.outcome === 'correct'
                  ? 'border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/80 shadow-xs'
                  : session.feedback.outcome === 'skipped'
                  ? 'border-sky-200 bg-sky-50/80 text-sky-950'
                  : 'border-amber-200 bg-amber-50/80 text-amber-950'
              }`}
            >
              {/* Floating Star Badge on Correct */}
              {session.feedback.outcome === 'correct' && (
                <div key={session.feedback.attemptId} aria-hidden="true" className="animate-star-float w-fit pointer-events-none flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-amber-950 font-black text-xs sm:text-sm shadow-md">
                  <Star className="w-3.5 h-3.5 fill-amber-950" />
                  <span>+{starsForAttempt(session.feedback)} ⭐</span>
                </div>
              )}
              <p className="text-sm font-semibold">
                {session.feedback.outcome === 'correct'
                  ? `+${starsForAttempt(session.feedback)} ${starsForAttempt(session.feedback) === 1 ? 'star' : 'stars'} earned`
                  : session.feedback.outcome === 'skipped'
                    ? SUPPORTIVE_SKIP_MESSAGES[session.index % SUPPORTIVE_SKIP_MESSAGES.length]
                    : SUPPORTIVE_REVIEW_MESSAGES[session.index % SUPPORTIVE_REVIEW_MESSAGES.length]}
              </p>

              <div
                className={`font-extrabold text-base flex flex-wrap items-center gap-2 ${
                  session.feedback.outcome === 'correct'
                    ? 'text-emerald-950'
                    : session.feedback.outcome === 'skipped'
                    ? 'text-sky-950'
                    : 'text-amber-950'
                }`}
              >
                {session.feedback.outcome === 'correct' && (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 animate-gentle-bounce" aria-hidden="true" />
                )}
                <span>
                  {session.feedback.outcome === 'correct'
                    ? 'Correct. Keep going.'
                    : session.feedback.outcome === 'skipped'
                      ? 'We’ll come back to this after other questions.'
                      : 'Let’s review this answer.'}
                </span>
                {session.feedback.outcome === 'correct' && (
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                    {getEncouragement(session.index)}
                  </span>
                )}
              </div>
              {session.feedback.feedback && (
                <p className={session.feedback.outcome === 'correct' ? 'text-emerald-900 font-medium' : 'text-slate-800'}>
                  {session.feedback.feedback}
                </p>
              )}
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
                <p className="text-sm text-amber-800 font-medium">This still needs another recheck after more questions.</p>
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
        <section className="relative overflow-hidden space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" aria-label="Revision summary">
          {isBatchPerfect && <CelebrationConfetti />}
          <div>
            <h2 className="text-xl font-bold text-slate-900">{session.mode === 'exam' ? 'Mock exam complete' : 'Revision batch complete'}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {session.mode === 'exam'
                ? 'This score is an exam snapshot.'
                : 'Same-day rechecks make questions Exam-Ready for tomorrow once answered correctly unaided or after a 2-question lag.'}
            </p>
          </div>

          {session.mode === 'practice' && waitingRecheckCount > 0 && remainingCount > 0 && (
            <p role="status" className="text-sm text-slate-700">
              {readyRecheckCount === 0
                ? 'No mistakes are ready to recheck yet. Continue with the remaining questions; a mistake becomes ready after two other questions.'
                : `${waitingRecheckCount} more ${waitingRecheckCount === 1 ? 'mistake needs' : 'mistakes need'} two other questions before ${waitingRecheckCount === 1 ? 'it is' : 'they are'} ready to recheck.`}
            </p>
          )}

          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 sm:p-4 text-emerald-950">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xl" role="img" aria-label="Celebration">
              🎉
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm sm:text-base">
                {isBatchPerfect
                  ? `Fantastic effort, ${profile.name}! All ${summaryCorrectCount} correct in this batch!`
                  : `Well done, ${profile.name}! You finished this revision batch.`}
              </p>
              <p className="text-xs text-emerald-800">
                {session.mode === 'exam'
                  ? `${summaryCorrectCount} of ${summaryAnswers.length} questions answered correctly.`
                  : 'Keep the momentum going to make all your portions Exam-Ready!'}
              </p>
            </div>
          </div>

          {/* Batch Stars Celebratory Pill */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300 font-extrabold text-xs sm:text-sm shadow-2xs">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
              <span>
                +{batchStars}{' '}
                Stars earned in this batch!
              </span>
            </span>
            {isBatchPerfect && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 font-extrabold text-xs shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Perfect Score 🎯</span>
              </span>
            )}
          </div>
          {batchMilestones.length > 0 && (
            <div className="space-y-2" aria-label="Milestones unlocked this batch" role="region">
              <h3 className="font-bold text-amber-900">New milestones!</h3>
              <ul className="flex flex-wrap gap-2">
                {batchMilestones.map(milestone => (
                  <li key={milestone.id} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
                    <span aria-hidden="true">{milestone.emoji}</span> {milestone.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {session.mode === 'exam' && (
            <p className="text-lg font-semibold">
              {summaryCorrectCount} correct of {summaryAnswers.length} checked
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
            {session.mode === 'practice' && readyRecheckCount > 0 && (
              <button type="button" className={buttonSecondary} onClick={() => { setSession(null); beginRecheckBatch('all'); }}>
                Recheck mistakes ({readyRecheckCount})
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
