import type { AttemptOutcome, AssistanceKind, RevisionAttemptKind } from './contracts';

export function createSessionId(now = Date.now(), random = Math.random): string {
  return `session-${now.toString(36)}-${random().toString(36).slice(2)}`;
}

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
  examReady: boolean;
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

export function interleaveItems<T>(
  items: readonly T[],
  getCategory: (item: T) => string
): T[] {
  if (items.length <= 1) return [...items];
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const cat = getCategory(item);
    let group = groups.get(cat);
    if (!group) {
      group = [];
      groups.set(cat, group);
    }
    group.push(item);
  }
  if (groups.size <= 1) return [...items];

  const queues = Array.from(groups.values()).map(g => [...g]);
  const interleaved: T[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const queue of queues) {
      if (queue.length > 0) {
        interleaved.push(queue.shift()!);
        added = true;
      }
    }
  }
  return interleaved;
}

export interface SelectRevisionBatchOptions {
  interleave?: boolean;
  categoryByQuestionId?: (questionId: string) => string | undefined;
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
      gapCount: 0,
      examReady: false
    }])
  );

  const interveningQuestions = new Map<string, Set<string>>(
    questionIds.map(questionId => [questionId, new Set<string>()])
  );

  const ordered = [...attempts]
    .filter(attempt => validIds.has(attempt.questionId) && attempt.revisionAttemptKind &&
      attempt.outcome !== 'ungraded')
    .sort(compareAttempts);

  for (const attempt of ordered) {
    if (attempt.revisionAttemptKind !== 'correction') {
      for (const item of progress.values()) {
        if (item.pendingRecheck && item.questionId !== attempt.questionId) {
          interveningQuestions.get(item.questionId)?.add(attempt.questionId);
          item.gapCount = interveningQuestions.get(item.questionId)?.size ?? 0;
        }
      }
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
        interveningQuestions.get(attempt.questionId)?.clear();
        item.gapCount = 0;
        item.examReady = item.initialOutcome === 'correct' && !item.initialAssisted;
        break;
      case 'correction':
        break;
      case 'recheck':
        item.successfulRecheck = attempt.outcome === 'correct' && attempt.assistance.length === 0;
        item.pendingRecheck = !item.successfulRecheck;
        interveningQuestions.get(attempt.questionId)?.clear();
        item.gapCount = 0;
        item.examReady = item.successfulRecheck;
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
  progressQuestionIds: readonly string[] = questionIds,
  options?: SelectRevisionBatchOptions
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

  let candidateRechecks = progress
    .filter(item => allowedIds.has(item.questionId) && item.pendingRecheck &&
      item.gapCount >= 2 && !alreadyRechecked.has(item.questionId));

  if (options?.interleave && options.categoryByQuestionId) {
    candidateRechecks = interleaveItems(
      candidateRechecks,
      item => options.categoryByQuestionId!(item.questionId) ?? 'default'
    );
  }

  const rechecks = candidateRechecks
    .map(item => ({ questionId: item.questionId, attemptKind: 'recheck' as const }));

  const remainingSlots = Math.max(0, limit - rechecks.length);

  let candidateInitial = progress
    .filter(item => allowedIds.has(item.questionId) && !item.checked);

  if (options?.interleave && options.categoryByQuestionId) {
    candidateInitial = interleaveItems(
      candidateInitial,
      item => options.categoryByQuestionId!(item.questionId) ?? 'default'
    );
  }

  const initial = candidateInitial
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
