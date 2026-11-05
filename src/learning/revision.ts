import type { AttemptOutcome, AssistanceKind, RevisionAttemptKind } from './contracts';

export interface RevisionAttemptEvidence {
  questionId: string;
  outcome: AttemptOutcome;
  assistance: readonly AssistanceKind[];
  revisionAttemptKind?: RevisionAttemptKind;
  revisionBatchId?: string;
  revisionSequence?: number;
  timestamp: string;
}

export interface RevisionQuestionProgress {
  questionId: string;
  checked: boolean;
  initialOutcome?: AttemptOutcome;
  initialAssisted: boolean;
  pendingRecheck: boolean;
  successfulRecheck: boolean;
  gapCount: number;
}

export interface RevisionStep {
  questionId: string;
  attemptKind: 'initial' | 'correction' | 'recheck' | 'exam';
}

function compareAttempts(a: RevisionAttemptEvidence, b: RevisionAttemptEvidence): number {
  const timestampOrder = Date.parse(a.timestamp) - Date.parse(b.timestamp);
  if (timestampOrder !== 0) return timestampOrder;
  return (a.revisionSequence ?? 0) - (b.revisionSequence ?? 0);
}

export function deriveRevisionProgress(
  questionIds: readonly string[],
  attempts: readonly RevisionAttemptEvidence[]
): RevisionQuestionProgress[] {
  const validIds = new Set(questionIds);
  const progress = new Map<string, RevisionQuestionProgress>(
    questionIds.map(questionId => [questionId, {
      questionId,
      checked: false,
      initialAssisted: false,
      pendingRecheck: false,
      successfulRecheck: false,
      gapCount: 0
    }])
  );

  const ordered = [...attempts]
    .filter(attempt => validIds.has(attempt.questionId) && attempt.revisionAttemptKind &&
      attempt.outcome !== 'ungraded')
    .sort(compareAttempts);

  for (const attempt of ordered) {
    for (const item of progress.values()) {
      if (item.pendingRecheck && item.questionId !== attempt.questionId) item.gapCount++;
    }

    const item = progress.get(attempt.questionId)!;
    switch (attempt.revisionAttemptKind) {
      case 'initial':
      case 'exam':
        item.checked = true;
        item.initialOutcome = attempt.outcome;
        item.initialAssisted = attempt.assistance.length > 0;
        item.pendingRecheck = attempt.outcome !== 'correct' || item.initialAssisted;
        item.successfulRecheck = false;
        item.gapCount = 0;
        break;
      case 'correction':
        break;
      case 'recheck':
        item.successfulRecheck = attempt.outcome === 'correct' && attempt.assistance.length === 0;
        item.pendingRecheck = !item.successfulRecheck;
        item.gapCount = 0;
        break;
    }
  }

  return questionIds.map(questionId => progress.get(questionId)!);
}

export function selectRevisionBatch(
  questionIds: readonly string[],
  attempts: readonly RevisionAttemptEvidence[],
  batchId: string,
  batchSize: number,
  progressQuestionIds: readonly string[] = questionIds
): RevisionStep[] {
  if (!Number.isInteger(batchSize) || batchSize < 0) {
    throw new Error('Revision batch size must be a non-negative integer.');
  }
  const allowedIds = new Set(questionIds);
  const progress = deriveRevisionProgress(progressQuestionIds, attempts);
  const limit = batchSize === 0 ? questionIds.length : batchSize;
  const alreadyRechecked = new Set(attempts
    .filter(attempt => attempt.revisionBatchId === batchId && attempt.revisionAttemptKind === 'recheck')
    .map(attempt => attempt.questionId));
  const rechecks = progress
    .filter(item => allowedIds.has(item.questionId) && item.pendingRecheck &&
      item.gapCount >= 2 && !alreadyRechecked.has(item.questionId))
    .map(item => ({ questionId: item.questionId, attemptKind: 'recheck' as const }));
  const remainingSlots = Math.max(0, limit - rechecks.length);
  const initial = progress
    .filter(item => allowedIds.has(item.questionId) && !item.checked)
    .slice(0, remainingSlots)
    .map(item => ({ questionId: item.questionId, attemptKind: 'initial' as const }));
  return [...rechecks.slice(0, limit), ...initial];
}

export function canScheduleRevisionRecheck(
  questionId: string,
  questionIds: readonly string[],
  attempts: readonly RevisionAttemptEvidence[],
  batchId: string
): boolean {
  const item = deriveRevisionProgress(questionIds, attempts).find(progress => progress.questionId === questionId);
  return item?.pendingRecheck === true && item.gapCount >= 2 &&
    !attempts.some(attempt => attempt.questionId === questionId &&
      attempt.revisionBatchId === batchId && attempt.revisionAttemptKind === 'recheck');
}
