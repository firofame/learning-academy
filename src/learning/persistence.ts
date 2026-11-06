import type { LearningSubjectId, StudentId } from '../types';
import type { LearningAttempt } from './contracts';
import { emitStorageError } from '../utils/appStorage';
import { isValidSpellingProgress } from '../utils/storage';
import { isValidRoboticsProgress } from '../utils/roboticsStorage';
import { isValidMathsProgress } from '../utils/mathsStorage';
import { isValidMalayalamProgress } from '../utils/malayalamStorage';
import { isValidHindiProgress } from '../utils/hindiStorage';
import { isValidEvsProgress } from '../utils/evsStorage';

export const LEARNING_DATABASE_NAME = 'learning-academy-progress';
export const LEARNING_DATABASE_VERSION = 1;
export const LEARNING_RECORDS_STORE = 'records';
const MIGRATION_RECORD_ID = 'migration:local-storage:v1';
const BACKUP_FORMAT = 'learning-academy-backup';
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const MAX_BACKUP_RECORDS = 5000;

export type LearningRecordKind = 'progress' | 'attempt' | 'draft' | 'revision-state' | 'result' | 'legacy-summary';

export interface LearningRecord<T = unknown> {
  id: string;
  schemaVersion: 1;
  learnerId: StudentId | 'global';
  subjectId: LearningSubjectId | 'app' | 'legacy';
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
  listForLearner(learnerId: StudentId | 'global'): Promise<LearningRecord[]>;
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

export class IndexedDbLearningRepository implements LearningRepository {
  private databasePromise?: Promise<IDBDatabase>;

  constructor(private readonly databaseName = LEARNING_DATABASE_NAME) {}

  private open(): Promise<IDBDatabase> {
    if (typeof indexedDB === 'undefined') return Promise.reject(new Error('IndexedDB is not available in this browser.'));
    if (!this.databasePromise) {
      this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(this.databaseName, LEARNING_DATABASE_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(LEARNING_RECORDS_STORE)) {
            const store = db.createObjectStore(LEARNING_RECORDS_STORE, { keyPath: 'id' });
            store.createIndex('learnerId', 'learnerId', { unique: false });
            store.createIndex('kind', 'kind', { unique: false });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('Could not open local learning storage.'));
        request.onblocked = () => reject(new Error('Local learning storage is blocked by another open tab.'));
      }).catch(error => {
        this.databasePromise = undefined;
        throw error;
      });
    }
    return this.databasePromise!;
  }

  async get(id: string): Promise<LearningRecord | undefined> {
    const db = await this.open();
    return requestValue<LearningRecord | undefined>(db.transaction(LEARNING_RECORDS_STORE).objectStore(LEARNING_RECORDS_STORE).get(id));
  }

  async put(record: LearningRecord): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction(LEARNING_RECORDS_STORE, 'readwrite');
    transaction.objectStore(LEARNING_RECORDS_STORE).put(record);
    await transactionDone(transaction);
  }

  async putIfAbsent(record: LearningRecord): Promise<boolean> {
    const db = await this.open();
    const transaction = db.transaction(LEARNING_RECORDS_STORE, 'readwrite');
    const store = transaction.objectStore(LEARNING_RECORDS_STORE);
    const existing = await requestValue<LearningRecord | undefined>(store.get(record.id));
    if (existing) {
      await transactionDone(transaction);
      return false;
    }
    store.add(record);
    await transactionDone(transaction);
    return true;
  }

  async listForLearner(learnerId: StudentId | 'global'): Promise<LearningRecord[]> {
    const db = await this.open();
    const index = db.transaction(LEARNING_RECORDS_STORE).objectStore(LEARNING_RECORDS_STORE).index('learnerId');
    const values = await requestValue<unknown[]>(index.getAll(learnerId));
    return values.filter(isLearningRecord);
  }

  async delete(id: string): Promise<void> {
    const db = await this.open();
    const transaction = db.transaction(LEARNING_RECORDS_STORE, 'readwrite');
    transaction.objectStore(LEARNING_RECORDS_STORE).delete(id);
    await transactionDone(transaction);
  }
}

function requestValue<T>(request: IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error ?? new Error('Local learning storage request failed.'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('Local learning storage transaction was aborted.'));
    transaction.onerror = () => reject(transaction.error ?? new Error('Local learning storage transaction failed.'));
  });
}

function isLearningRecord(value: unknown): value is LearningRecord {
  return isPlainRecord(value) && typeof value.id === 'string' && value.schemaVersion === 1 &&
    (value.learnerId === 'fazia' || value.learnerId === 'shiza' || value.learnerId === 'global') &&
    typeof value.subjectId === 'string' && typeof value.kind === 'string' &&
    ['progress', 'attempt', 'draft', 'revision-state', 'result', 'legacy-summary'].includes(value.kind) &&
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
  if (!['spell-bee', 'robotics', 'maths', 'malayalam', 'hindi', 'evs'].includes(String(value.subjectId))) return false;
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

interface LegacyEntry {
  key: string;
  value: string;
  learnerId: StudentId | 'global';
  subjectId: LearningSubjectId | 'app';
}

const SUBJECT_KEYS: ReadonlyArray<{ pattern: RegExp; subjectId: LearningSubjectId }> = [
  { pattern: /^spellbee_progress_(fazia|shiza)_v1$/, subjectId: 'spell-bee' },
  { pattern: /^academy_robotics_(fazia|shiza)_v1$/, subjectId: 'robotics' },
  { pattern: /^academy_maths_(fazia|shiza)_v1$/, subjectId: 'maths' },
  { pattern: /^academy_malayalam_(fazia|shiza)_v1$/, subjectId: 'malayalam' },
  { pattern: /^academy_hindi_(fazia|shiza)_v1$/, subjectId: 'hindi' },
  { pattern: /^academy_evs_(fazia|shiza)_v1$/, subjectId: 'evs' }
];

function classifyLegacyKey(key: string): Omit<LegacyEntry, 'value'> | undefined {
  if (key === 'spellbee_active_profile_v1' || key === 'spellbee_settings_v1') {
    return { key, learnerId: 'global', subjectId: 'app' };
  }
  if (key === 'spellbee_progress_v1') return { key, learnerId: 'fazia', subjectId: 'spell-bee' };
  for (const { pattern, subjectId } of SUBJECT_KEYS) {
    const match = key.match(pattern);
    if (match) return { key, learnerId: match[1] as StudentId, subjectId };
  }
  return undefined;
}

function readLegacyEntries(storage: Storage): LegacyEntry[] {
  const entries: LegacyEntry[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key) continue;
    const classified = classifyLegacyKey(key);
    if (!classified) continue;
    const value = storage.getItem(key);
    if (value !== null) entries.push({ ...classified, value });
  }
  return entries;
}

function snapshotRecord(entry: LegacyEntry): LearningRecord<{ sourceKey: string; rawValue: string }> {
  return {
    id: `legacy:${entry.learnerId}:${entry.key}`,
    schemaVersion: 1,
    learnerId: entry.learnerId,
    subjectId: entry.subjectId,
    kind: 'legacy-summary',
    contentVersion: 'unknown-legacy',
    updatedAt: new Date().toISOString(),
    data: { sourceKey: entry.key, rawValue: entry.value }
  };
}

/** Idempotently copies the old browser records; source keys are retained for rollback and recovery. */
export async function migrateLegacyProgress(repository: LearningRepository, storage: Storage): Promise<{ migrated: number; alreadyDone: boolean }> {
  const marker = await repository.get(MIGRATION_RECORD_ID);
  if (marker?.kind === 'result') return { migrated: 0, alreadyDone: true };

  const entries = readLegacyEntries(storage);
  const records = entries.map(snapshotRecord);
  for (const record of records) await repository.put(record);

  const verified = await Promise.all(records.map(record => repository.get(record.id)));
  if (verified.some((record, index) => !record || !isPlainRecord(record.data) ||
      record.data.rawValue !== entries[index].value)) {
    throw new Error('Legacy progress could not be verified in IndexedDB. The original browser records were kept.');
  }

  const completion: LearningRecord<{ importedKeys: string[] }> = {
    id: MIGRATION_RECORD_ID,
    schemaVersion: 1,
    learnerId: 'global',
    subjectId: 'app',
    kind: 'result',
    contentVersion: 'legacy-import-v1',
    updatedAt: new Date().toISOString(),
    data: { importedKeys: entries.map(entry => entry.key) }
  };
  await repository.put(completion);
  const verifiedMarker = await repository.get(MIGRATION_RECORD_ID);
  if (!verifiedMarker || !isLearningRecord(verifiedMarker)) {
    throw new Error('Legacy progress migration could not be confirmed. The original browser records were kept.');
  }
  return { migrated: records.length, alreadyDone: false };
}

const pendingWrites = new Map<string, LearningRecord>();

export async function persistProgressSnapshot(
  repository: LearningRepository,
  learnerId: StudentId,
  subjectId: LearningSubjectId,
  rawValue: string,
  contentVersion = 'legacy-current'
): Promise<void> {
  const record: LearningRecord<{ rawValue: string }> = {
    id: `progress:${learnerId}:${subjectId}`,
    schemaVersion: 1,
    learnerId,
    subjectId,
    kind: 'progress',
    contentVersion,
    updatedAt: new Date().toISOString(),
    data: { rawValue }
  };
  pendingWrites.set(record.id, record);
  try {
    await repository.put(record);
    pendingWrites.delete(record.id);
  } catch (error) {
    emitStorageError('Your browser copy was saved, but the IndexedDB progress backup did not finish. Retry the backup from Progress & backup.');
    throw error;
  }
}

export async function retryPendingProgressWrites(repository: LearningRepository): Promise<number> {
  let saved = 0;
  for (const record of [...pendingWrites.values()]) {
    await repository.put(record);
    pendingWrites.delete(record.id);
    saved++;
  }
  return saved;
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
  pendingWrites.set(record.id, record);
  try {
    await repository.put(record);
    pendingWrites.delete(record.id);
  } catch (error) {
    emitStorageError('The browser result was saved, but its IndexedDB attempt history did not finish. Retry the save from Progress & backup.');
    throw error;
  }
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

export async function deleteProgressSnapshot(
  repository: LearningRepository,
  learnerId: StudentId,
  subjectId: LearningSubjectId
): Promise<void> {
  await repository.delete(`progress:${learnerId}:${subjectId}`);
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
    ['spell-bee', 'robotics', 'maths', 'malayalam', 'hindi', 'evs'].includes(String(value.subjectId)) &&
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
  contentVersion: string
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
  if (record.contentVersion !== contentVersion) return null;
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

const defaultRepository = new IndexedDbLearningRepository();

export async function initializeLearningPersistence(): Promise<boolean> {
  if (typeof window === 'undefined') return true;
  try {
    await migrateLegacyProgress(defaultRepository, window.localStorage);
    return true;
  } catch (error) {
    emitStorageError(`Local IndexedDB setup did not finish. Your existing browser progress remains available. ${error instanceof Error ? error.message : ''}`.trim());
    return false;
  }
}

export async function retryLearningPersistence(): Promise<boolean> {
  const migrated = await initializeLearningPersistence();
  if (!migrated) return false;
  try {
    await retryPendingProgressWrites(defaultRepository);
    return true;
  } catch {
    return false;
  }
}

export interface LearnerBackup {
  format: typeof BACKUP_FORMAT;
  schemaVersion: 1;
  learnerId: StudentId;
  exportedAt: string;
  progress: Record<string, string>;
  records: LearningRecord[];
}

export async function exportLearnerBackup(
  learnerId: StudentId,
  repository: LearningRepository = defaultRepository,
  storage: Storage = window.localStorage
): Promise<LearnerBackup> {
  const progress: Record<string, string> = {};
  for (const entry of readLegacyEntries(storage)) {
    if (entry.learnerId === learnerId) progress[entry.key] = entry.value;
  }
  const records = (await repository.listForLearner(learnerId)).filter(record => record.kind !== 'legacy-summary');
  const backup: LearnerBackup = {
    format: BACKUP_FORMAT,
    schemaVersion: 1,
    learnerId,
    exportedAt: new Date().toISOString(),
    progress,
    records
  };
  const formattedJson = JSON.stringify(backup, null, 2);
  if (!validateBackup(backup, learnerId) || !hasValidProgress(backup.progress, learnerId)) {
    throw new Error('This learner history cannot be exported as a restorable backup. No backup file was created.');
  }
  if (new TextEncoder().encode(formattedJson).byteLength > MAX_BACKUP_BYTES) {
    throw new Error('This backup would exceed the 5 MB restore limit. No backup file was created.');
  }
  return backup;
}

function isSupportedBackupProgressKey(key: string, learnerId: StudentId): boolean {
  const classified = classifyLegacyKey(key);
  return classified?.learnerId === learnerId;
}

function hasValidProgress(progress: Record<string, string>, learnerId: StudentId): boolean {
  return Object.entries(progress).every(([key, raw]) => {
    const source = classifyLegacyKey(key);
    if (!source || source.learnerId !== learnerId) return false;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return false;
    }

    switch (source.subjectId) {
      case 'spell-bee': return isValidSpellingProgress(parsed, learnerId);
      case 'robotics': return isValidRoboticsProgress(parsed, learnerId);
      case 'maths': return isValidMathsProgress(parsed, learnerId);
      case 'malayalam': return isValidMalayalamProgress(parsed, learnerId);
      case 'hindi': return isValidHindiProgress(parsed, learnerId);
      case 'evs': return isValidEvsProgress(parsed, learnerId);
      default: return false;
    }
  });
}

function validateBackup(value: unknown, requestedLearner: StudentId): value is LearnerBackup {
  if (!isPlainRecord(value) || value.format !== BACKUP_FORMAT || value.schemaVersion !== 1 ||
      value.learnerId !== requestedLearner || typeof value.exportedAt !== 'string' ||
      !Number.isFinite(Date.parse(value.exportedAt)) || !isPlainRecord(value.progress) || !Array.isArray(value.records)) return false;
  if (Object.entries(value.progress).some(([key, raw]) => typeof raw !== 'string' || raw.length > 2_000_000 ||
      !isSupportedBackupProgressKey(key, requestedLearner))) return false;
  return value.records.length <= MAX_BACKUP_RECORDS && value.records.every(record => isLearningRecord(record) && record.learnerId === requestedLearner);
}

export async function importLearnerBackup(
  value: unknown,
  learnerId: StudentId,
  repository: LearningRepository = defaultRepository,
  storage: Storage = window.localStorage
): Promise<{ imported: number; skippedExisting: number }> {
  const encoded = JSON.stringify(value);
  if (typeof encoded !== 'string' || new TextEncoder().encode(encoded).byteLength > MAX_BACKUP_BYTES || !validateBackup(value, learnerId)) {
    throw new Error('This backup is invalid, too large, or belongs to another learner. No progress was changed.');
  }

  // Preserve local progress and fill only empty keys. This makes restore safe to retry.
  const additions: Array<[string, string, LearningSubjectId]> = [];
  let skippedExisting = 0;
  for (const [key, raw] of Object.entries(value.progress)) {
    if (storage.getItem(key) !== null) {
      skippedExisting++;
      continue;
    }
    try { JSON.parse(raw); } catch { throw new Error(`Backup entry ${key} is unreadable. No progress was changed.`); }
    const source = classifyLegacyKey(key);
    if (!source || source.learnerId !== learnerId || source.subjectId === 'app') {
      throw new Error(`Backup entry ${key} does not belong to this learner.`);
    }
    additions.push([key, raw, source.subjectId]);
  }

  for (const record of value.records) await repository.putIfAbsent(record);
  for (const [key, raw, subjectId] of additions) {
    storage.setItem(key, raw);
    if (storage.getItem(key) !== raw) throw new Error(`Backup entry ${key} could not be verified after restore.`);
    await persistProgressSnapshot(repository, learnerId, subjectId, raw);
  }
  return { imported: additions.length, skippedExisting };
}
