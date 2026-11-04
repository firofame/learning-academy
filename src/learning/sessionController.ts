import type { AttemptOutcome, AssistanceKind, SessionMode } from './contracts';

export type SessionPhase = 'answering' | 'checking' | 'feedback' | 'complete';

export function createSessionId(now = Date.now(), random = Math.random): string {
  return `session-${now.toString(36)}-${random().toString(36).slice(2)}`;
}

export interface SessionAnswer {
  questionId: string;
  answer: string | null;
  outcome: AttemptOutcome;
  assisted: boolean;
  feedback?: string;
}

export interface SessionControllerState {
  sessionId: string;
  learnerId: string;
  subjectId: string;
  lessonId: string;
  contentVersion: string;
  rubricVersion: string;
  mode: SessionMode;
  questionIds: readonly string[];
  questionIndex: number;
  phase: SessionPhase;
  draftAnswer: string;
  assistance: readonly AssistanceKind[];
  answers: readonly SessionAnswer[];
  submissionId?: string;
  feedbackVisible: boolean;
}

export type SessionAction =
  | { type: 'edit-answer'; answer: string }
  | { type: 'mark-assisted'; reason: AssistanceKind }
  | { type: 'begin-check'; submissionId: string }
  | { type: 'check-resolved'; submissionId: string; outcome: AttemptOutcome; feedback?: string }
  | { type: 'check-failed'; submissionId: string }
  | { type: 'advance' }
  | { type: 'finish-ungraded' }
  | { type: 'show-results' };

export function startSession(input: Omit<SessionControllerState,
  'questionIndex' | 'phase' | 'draftAnswer' | 'assistance' | 'answers' | 'feedbackVisible' | 'submissionId'>): SessionControllerState {
  if (input.questionIds.length === 0) throw new Error('A session needs at least one question.');
  return {
    ...input,
    questionIds: [...input.questionIds],
    questionIndex: 0,
    phase: 'answering',
    draftAnswer: '',
    assistance: [],
    answers: [],
    feedbackVisible: input.mode !== 'exam'
  };
}

export function sessionReducer(state: SessionControllerState, action: SessionAction): SessionControllerState {
  switch (action.type) {
    case 'edit-answer':
      return state.phase === 'answering' ? { ...state, draftAnswer: action.answer } : state;
    case 'mark-assisted':
      return state.phase === 'answering' && !state.assistance.includes(action.reason)
        ? { ...state, assistance: [...state.assistance, action.reason] }
        : state;
    case 'begin-check':
      return state.phase === 'answering'
        ? { ...state, phase: 'checking', submissionId: action.submissionId }
        : state;
    case 'check-resolved':
      if (state.phase !== 'checking' || state.submissionId !== action.submissionId) return state;
      if (action.outcome === 'ungraded') {
        return { ...state, phase: 'answering', submissionId: undefined };
      }
      if (state.mode === 'exam') {
        const nextIndex = state.questionIndex + 1;
        return {
          ...state,
          phase: nextIndex >= state.questionIds.length ? 'complete' : 'answering',
          questionIndex: Math.min(nextIndex, state.questionIds.length - 1),
          answers: [...state.answers, {
            questionId: state.questionIds[state.questionIndex],
            answer: state.draftAnswer,
            outcome: action.outcome,
            assisted: state.assistance.length > 0
          }],
          draftAnswer: '',
          assistance: [],
          submissionId: undefined,
          feedbackVisible: false
        };
      }
      return {
        ...state,
        phase: 'feedback',
        answers: [...state.answers, {
          questionId: state.questionIds[state.questionIndex],
          answer: state.draftAnswer,
          outcome: action.outcome,
          assisted: state.assistance.length > 0,
          feedback: action.feedback
        }],
        draftAnswer: '',
        assistance: [],
        submissionId: undefined,
        feedbackVisible: true
      };
    case 'check-failed':
      return state.phase === 'checking' && state.submissionId === action.submissionId
        ? { ...state, phase: 'answering', submissionId: undefined }
        : state;
    case 'advance':
      if (state.phase !== 'feedback') return state;
      return state.questionIndex + 1 >= state.questionIds.length
        ? { ...state, phase: 'complete' }
        : { ...state, phase: 'answering', questionIndex: state.questionIndex + 1 };
    case 'finish-ungraded':
      if (state.phase !== 'answering') return state;
      return {
        ...state,
        phase: state.questionIndex + 1 >= state.questionIds.length ? 'complete' : 'answering',
        answers: [...state.answers, {
          questionId: state.questionIds[state.questionIndex],
          answer: state.draftAnswer || null,
          outcome: 'ungraded',
          assisted: state.assistance.length > 0
        }],
        draftAnswer: '',
        assistance: [],
        questionIndex: Math.min(state.questionIndex + 1, state.questionIds.length - 1),
        feedbackVisible: state.mode !== 'exam'
      };
    case 'show-results':
      return state.phase === 'complete' ? { ...state, feedbackVisible: true } : state;
  }
}
