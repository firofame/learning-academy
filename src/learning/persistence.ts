import type { LearningSubjectId, StudentId } from '../types';
import type { LearningAttempt } from './contracts';
import { scheduleDebouncedSync } from '../utils/syncService';

export const LEARNING_DATABASE_NAME = 'learning-academy-progress';
export const LEARNING_DATABASE_VERSION = 1;
export const LEARNING_RECORDS_STORE = 'records';

export type LearningRecordKind = 'attempt' | 'draft' | 'revision-state';

export interface LearningRecord<T = unknown> {
  id: string;
  schemaVersion: 1;
  learnerId: StudentId;
  subjectId: LearningSubjectId;
  kind: LearningRecordKind;
  contentVersion: string;
  rubricVersion?: string;
  updatedAt: string;
  data: T;
}

export interface LearningRepository {
  get(id: string): Promise<LearningRecord | undefined>;
  put(record: LearningRecord): Promise<void>;
  putIfAbsent(record: LearningRecord): Promise<boolean>;
  listForLearner(learnerId: StudentId): Promise<LearningRecord[]>;
  delete(id: string): Promise<void>;
}

export interface SessionDraftRecord<T = unknown> {
  sessionId: string;
  learnerId: StudentId;
  subjectId: LearningSubjectId;
  lessonId: string;
  contentVersion: string;
  rubricVersion: string;
  savedAt: string;
  state: T;
}

export interface RevisionRoundRecord {
  revisionRoundId: string;
  learnerId: StudentId;
  subjectId: LearningSubjectId;
  lessonId: string;
  contentVersion: string;
  startedAt: string;
  questionIds: string[];
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class LocalStorageLearningRepository implements LearningRepository {
  private memory = new Map<string, LearningRecord>();

  private getStorageKey(id: string): string {
    return `academy_rec_${id}`;
  }

  async get(id: string): Promise<LearningRecord | undefined> {
    if (typeof localStorage !== 'undefined') {
      try {
        const item = localStorage.getItem(this.getStorageKey(id));
        return item ? JSON.parse(item) : undefined;
      } catch {
        return undefined;
      }
    }
    return this.memory.get(id);
  }

  async put(record: LearningRecord): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(this.getStorageKey(record.id), JSON.stringify(record));
        scheduleDebouncedSync(record.learnerId);
        return;
      } catch {}
    }
    this.memory.set(record.id, record);
  }

  async putIfAbsent(record: LearningRecord): Promise<boolean> {
    const existing = await this.get(record.id);
    if (existing) return false;
    await this.put(record);
    return true;
  }

  async listForLearner(learnerId: StudentId): Promise<LearningRecord[]> {
    if (typeof localStorage !== 'undefined') {
      try {
        const records: LearningRecord[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('academy_rec_')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const rec = JSON.parse(raw);
              if (rec && rec.learnerId === learnerId) records.push(rec);
            }
          }
        }
        return records;
      } catch {
        return [];
      }
    }
    return [...this.memory.values()].filter(rec => rec.learnerId === learnerId);
  }

  async delete(id: string): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(this.getStorageKey(id));
        return;
      } catch {}
    }
    this.memory.delete(id);
  }
}

export const IndexedDbLearningRepository = LocalStorageLearningRepository;

function isLearningRecord(value: unknown): value is LearningRecord {
  return isPlainRecord(value) && typeof value.id === 'string' && value.schemaVersion === 1 &&
    (value.learnerId === 'fazia' || value.learnerId === 'shiza') &&
    typeof value.subjectId === 'string' && typeof value.kind === 'string' &&
    ['attempt', 'draft', 'revision-state'].includes(value.kind) &&
    typeof value.contentVersion === 'string' && typeof value.updatedAt === 'string' &&
    Number.isFinite(Date.parse(value.updatedAt)) && 'data' in value;
}

function isLearningAttempt(value: unknown): value is LearningAttempt {
  if (!isPlainRecord(value) || typeof value.attemptId !== 'string' || typeof value.learnerId !== 'string' ||
      typeof value.subjectId !== 'string' || typeof value.lessonId !== 'string' || typeof value.questionId !== 'string' ||
      typeof value.contentVersion !== 'string' || typeof value.rubricVersion !== 'string' ||
      typeof value.timestamp !== 'string' || !Number.isFinite(Date.parse(value.timestamp)) ||
      typeof value.learnerLocalDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.learnerLocalDate) ||
      !['practice', 'exam', 'paper'].includes(String(value.sessionMode)) ||
      (value.submittedAnswer !== null && typeof value.submittedAnswer !== 'string') ||
      !Array.isArray(value.assistance) || !value.assistance.every((item: unknown) =>
        ['answer-revealed', 'tile-helper', 'hint', 'read-aloud', 'other'].includes(String(item))) ||
      !['deterministic', 'ai', 'parent', 'none'].includes(String(value.gradingSource)) ||
      !['correct', 'incorrect', 'skipped', 'ungraded'].includes(String(value.outcome))) return false;
  if (!['spell-bee', 'robotics', 'maths', 'malayalam', 'hindi', 'evs', 'biology', 'chemistry', 'english', 'history'].includes(String(value.subjectId))) return false;
  if (value.gradingVersion !== undefined && typeof value.gradingVersion !== 'string') return false;
  if (value.modelId !== undefined && typeof value.modelId !== 'string') return false;
  if (value.feedback !== undefined && typeof value.feedback !== 'string') return false;
  if (value.questionPrompt !== undefined && typeof value.questionPrompt !== 'string') return false;
  if (value.referenceAnswer !== undefined && typeof value.referenceAnswer !== 'string') return false;
  if (value.explanation !== undefined && typeof value.explanation !== 'string') return false;
  if (value.provenance !== undefined && typeof value.provenance !== 'string') return false;
  if (value.gradingSource === 'ai' && typeof value.modelId !== 'string') return false;
  if (value.revisionRoundId !== undefined && typeof value.revisionRoundId !== 'string') return false;
  if (value.revisionBatchId !== undefined && typeof value.revisionBatchId !== 'string') return false;
  if (value.revisionAttemptKind !== undefined &&
      !['initial', 'correction', 'recheck', 'exam'].includes(String(value.revisionAttemptKind))) return false;
  if (value.responseFormat !== undefined && !['written', 'choice'].includes(String(value.responseFormat))) return false;
  if (value.revisionSequence !== undefined &&
      (typeof value.revisionSequence !== 'number' || !Number.isInteger(value.revisionSequence) || value.revisionSequence < 0)) return false;
  return value.learnerId === 'fazia' || value.learnerId === 'shiza';
}

export async function retryPendingProgressWrites(_repository: LearningRepository): Promise<number> {
  return 0;
}

export async function saveLearningAttempt(repository: LearningRepository, attempt: LearningAttempt): Promise<void> {
  if (!isLearningAttempt(attempt)) throw new Error('This learning attempt is not valid and was not saved.');
  const record: LearningRecord<LearningAttempt> = {
    id: `attempt:${attempt.learnerId}:${attempt.attemptId}`,
    schemaVersion: 1,
    learnerId: attempt.learnerId,
    subjectId: attempt.subjectId,
    kind: 'attempt',
    contentVersion: attempt.contentVersion,
    rubricVersion: attempt.rubricVersion,
    updatedAt: attempt.timestamp,
    data: attempt
  };
  await repository.put(record);
}

export async function saveLearningAttempts(repository: LearningRepository, attempts: readonly LearningAttempt[]): Promise<void> {
  for (const attempt of attempts) await saveLearningAttempt(repository, attempt);
}

export async function listLearningAttempts(repository: LearningRepository, learnerId: StudentId): Promise<LearningAttempt[]> {
  return (await repository.listForLearner(learnerId))
    .filter(record => record.kind === 'attempt' && isLearningAttempt(record.data))
    .map(record => record.data as LearningAttempt)
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

export async function saveSessionDraft<T>(
  repository: LearningRepository,
  draft: SessionDraftRecord<T>
): Promise<void> {
  const record: LearningRecord<SessionDraftRecord<T>> = {
    id: `draft:${draft.learnerId}:${draft.subjectId}:${draft.sessionId}`,
    schemaVersion: 1,
    learnerId: draft.learnerId,
    subjectId: draft.subjectId,
    kind: 'draft',
    contentVersion: draft.contentVersion,
    rubricVersion: draft.rubricVersion,
    updatedAt: draft.savedAt,
    data: draft
  };
  await repository.put(record);
}

export async function loadSessionDraft<T>(
  repository: LearningRepository,
  learnerId: StudentId,
  subjectId: LearningSubjectId,
  lessonId: string,
  contentVersion: string
): Promise<SessionDraftRecord<T> | null> {
  const drafts = (await repository.listForLearner(learnerId))
    .filter(record => record.subjectId === subjectId && record.kind === 'draft')
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const matching = drafts.find(record => isPlainRecord(record.data) &&
    record.data.lessonId === lessonId && record.data.contentVersion === contentVersion &&
    isValidSessionDraft(record.data, learnerId, subjectId));
  return matching ? matching.data as SessionDraftRecord<T> : null;
}

function isValidSessionDraft(value: unknown, learnerId: StudentId, subjectId: LearningSubjectId): value is SessionDraftRecord {
  return isPlainRecord(value) && value.learnerId === learnerId && value.subjectId === subjectId &&
    typeof value.sessionId === 'string' && typeof value.lessonId === 'string' &&
    typeof value.contentVersion === 'string' && typeof value.rubricVersion === 'string' &&
    typeof value.savedAt === 'string' && Number.isFinite(Date.parse(value.savedAt)) && 'state' in value;
}

export async function deleteSessionDraft(
  repository: LearningRepository,
  learnerId: StudentId,
  subjectId: LearningSubjectId,
  sessionId: string
): Promise<void> {
  await repository.delete(`draft:${learnerId}:${subjectId}:${sessionId}`);
}

function isRevisionRoundRecord(value: unknown): value is RevisionRoundRecord {
  return isPlainRecord(value) && typeof value.revisionRoundId === 'string' &&
    (value.learnerId === 'fazia' || value.learnerId === 'shiza') &&
    ['spell-bee', 'robotics', 'maths', 'malayalam', 'hindi', 'evs', 'biology', 'chemistry', 'english', 'history'].includes(String(value.subjectId)) &&
    typeof value.lessonId === 'string' && typeof value.contentVersion === 'string' &&
    typeof value.startedAt === 'string' && Number.isFinite(Date.parse(value.startedAt)) &&
    Array.isArray(value.questionIds) && value.questionIds.length > 0 &&
    value.questionIds.every(id => typeof id === 'string') &&
    new Set(value.questionIds).size === value.questionIds.length;
}

export async function loadRevisionRound(
  repository: LearningRepository,
  learnerId: StudentId,
  subjectId: LearningSubjectId,
  lessonId: string,
  contentVersion?: string
): Promise<RevisionRoundRecord | null> {
  const record = await repository.get(`revision:${learnerId}:${subjectId}:${lessonId}`);
  if (!record) return null;
  if (record.kind !== 'revision-state' || record.learnerId !== learnerId ||
      record.subjectId !== subjectId || !isRevisionRoundRecord(record.data) ||
      record.data.learnerId !== learnerId ||
      record.data.subjectId !== subjectId || record.data.lessonId !== lessonId ||
      record.data.contentVersion !== record.contentVersion) {
    throw new Error('The saved revision progress does not match this lesson. Your previous records have been kept.');
  }
  if (contentVersion !== undefined && record.contentVersion !== contentVersion) return null;
  return record.data;
}

export async function saveRevisionRound(
  repository: LearningRepository,
  round: RevisionRoundRecord
): Promise<void> {
  if (!isRevisionRoundRecord(round)) throw new Error('The revision progress is incomplete and was not saved.');
  await repository.put({
    id: `revision:${round.learnerId}:${round.subjectId}:${round.lessonId}`,
    schemaVersion: 1,
    learnerId: round.learnerId,
    subjectId: round.subjectId,
    kind: 'revision-state',
    contentVersion: round.contentVersion,
    updatedAt: new Date().toISOString(),
    data: round
  });
}

export function getDefaultLearningRepository(): LearningRepository {
  return defaultRepository;
}

const defaultRepository = new LocalStorageLearningRepository();

export async function retryLearningPersistence(): Promise<boolean> {
  return true;
}
