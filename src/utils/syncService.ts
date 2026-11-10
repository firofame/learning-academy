import type { StudentId, WordProgress, MasteryLevel } from '../types';
import type { SubjectProgress, SubjectResult } from './subjectStorage';
import type { LearningRecord } from '../learning/persistence';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface StudentProgressSnapshot {
  studentId: StudentId;
  version: 1;
  syncedAt: string; // ISO 8601
  spelling: Record<string, WordProgress>;
  subjects: Record<string, SubjectProgress>;
  learningRecords: LearningRecord[];
}

export const ALL_SUBJECT_KEYS = [
  'robotics',
  'maths',
  'malayalam',
  'hindi',
  'evs',
  'biology',
  'chemistry',
  'english',
  'history'
] as const;

// ---------------------------------------------------------------------------
// Environment-safe LocalStorage abstraction (compatible with Worker tsconfig)
// ---------------------------------------------------------------------------

interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length: number;
  key(index: number): string | null;
}

function getLocalStorage(): LocalStorageLike | null {
  if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
    return (globalThis as Record<string, unknown>).localStorage as LocalStorageLike ?? null;
  }
  return null;
}

export function dispatchSyncEvent(studentId: StudentId): void {
  if (typeof globalThis !== 'undefined' && 'dispatchEvent' in globalThis && typeof CustomEvent !== 'undefined') {
    try {
      (globalThis as unknown as { dispatchEvent: (evt: CustomEvent) => boolean }).dispatchEvent(
        new CustomEvent('academy-progress-synced', { detail: { studentId } })
      );
    } catch {}
  }
}

// ---------------------------------------------------------------------------
// Pure Deterministic Merge Engine (Shared by Client and Worker)
// ---------------------------------------------------------------------------

/**
 * 1. Learning Records Merge:
 * - Union attempts by ID
 * - For drafts and revision-states, take later updatedAt timestamp
 */
export function mergeLearningRecords(
  local: readonly LearningRecord[],
  remote: readonly LearningRecord[]
): LearningRecord[] {
  const map = new Map<string, LearningRecord>();

  for (const record of local) {
    if (record && typeof record.id === 'string') {
      map.set(record.id, record);
    }
  }

  for (const record of remote) {
    if (!record || typeof record.id !== 'string') continue;
    const existing = map.get(record.id);
    if (!existing) {
      map.set(record.id, record);
      continue;
    }

    if (record.kind === 'attempt') {
      // Attempts are immutable event logs with unique IDs; keep existing
      continue;
    }

    const existingTime = Date.parse(existing.updatedAt) || 0;
    const remoteTime = Date.parse(record.updatedAt) || 0;
    if (remoteTime > existingTime) {
      map.set(record.id, record);
    }
  }

  return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function pickLaterSubjectResult(a: SubjectResult | null, b: SubjectResult | null): SubjectResult | null {
  if (!a) return b ?? null;
  if (!b) return a ?? null;
  const timeA = Date.parse(a.completedAt) || 0;
  const timeB = Date.parse(b.completedAt) || 0;
  return timeB > timeA ? (b ?? null) : (a ?? null);
}

/**
 * 2. Subject Progress Merge:
 * - Merge practice and exam independently so neither session type wipes the other
 * - Retain reviewQuestionIds from whichever side had the latest overall activity timestamp
 */
export function mergeSubjectProgress(
  local: Record<string, SubjectProgress>,
  remote: Record<string, SubjectProgress>
): Record<string, SubjectProgress> {
  const merged: Record<string, SubjectProgress> = {};
  const allSubjects = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);

  for (const subject of allSubjects) {
    const loc = local?.[subject];
    const rem = remote?.[subject];

    if (!loc) {
      if (rem) {
        merged[subject] = {
          studentId: rem.studentId,
          lessonId: rem.lessonId,
          practice: rem.practice ?? null,
          exam: rem.exam ?? null,
          reviewQuestionIds: Array.isArray(rem.reviewQuestionIds) ? [...rem.reviewQuestionIds] : []
        };
      }
      continue;
    }
    if (!rem) {
      merged[subject] = {
        studentId: loc.studentId,
        lessonId: loc.lessonId,
        practice: loc.practice ?? null,
        exam: loc.exam ?? null,
        reviewQuestionIds: Array.isArray(loc.reviewQuestionIds) ? [...loc.reviewQuestionIds] : []
      };
      continue;
    }

    // Merge practice and exam independently
    const practice = pickLaterSubjectResult(loc.practice, rem.practice);
    const exam = pickLaterSubjectResult(loc.exam, rem.exam);

    // Compute latest overall activity timestamp for each side
    const localActivity = Math.max(
      loc.practice?.completedAt ? (Date.parse(loc.practice.completedAt) || 0) : 0,
      loc.exam?.completedAt ? (Date.parse(loc.exam.completedAt) || 0) : 0
    );
    const remoteActivity = Math.max(
      rem.practice?.completedAt ? (Date.parse(rem.practice.completedAt) || 0) : 0,
      rem.exam?.completedAt ? (Date.parse(rem.exam.completedAt) || 0) : 0
    );

    let reviewQuestionIds: string[];
    if (localActivity > remoteActivity) {
      reviewQuestionIds = [...(loc.reviewQuestionIds || [])];
    } else if (remoteActivity > localActivity) {
      reviewQuestionIds = [...(rem.reviewQuestionIds || [])];
    } else {
      // Identical or no timestamps: union without duplicates
      reviewQuestionIds = Array.from(new Set([
        ...(loc.reviewQuestionIds || []),
        ...(rem.reviewQuestionIds || [])
      ]));
    }

    const lessonId = localActivity >= remoteActivity ? loc.lessonId : rem.lessonId;
    const studentId = loc.studentId || rem.studentId;

    merged[subject] = {
      studentId,
      lessonId,
      practice: practice ?? null,
      exam: exam ?? null,
      reviewQuestionIds
    };
  }

  return merged;
}

/**
 * 3. Commutative Spell Bee Word Progress Merge:
 * Guarantees merge(A, B) === merge(B, A) under all conditions including timestamp ties.
 */

/**
 * Generates an unambiguous canonical representation of a WordProgress record
 * used as the final total-order tie-breaker. Fully independent of object key order.
 */
export function canonicalWordProgressString(w: WordProgress): string {
  const dates = Array.isArray(w.unaidedCorrectDates)
    ? [...w.unaidedCorrectDates].sort().join(',')
    : '';

  const sortedHist = (w.history || [])
    .map(h => `${h.date || ''}:${h.mode || ''}:${h.wasCorrect}:${h.attemptId || ''}:${h.mistakeInput || ''}`)
    .sort()
    .join(';');

  return [
    w.wordId || '',
    w.studentId || '',
    w.attempts || 0,
    w.unaidedCorrectCount || 0,
    w.consecutiveUnaidedCorrect || 0,
    dates,
    w.lastAttemptDate || '',
    w.lastUnaidedCorrectDate || '',
    w.level || '',
    w.lastMistake || '',
    Boolean(w.needsRevisit),
    sortedHist
  ].join('|');
}

/**
 * Strict total ordering comparator for WordProgress records.
 *
 * Invariants:
 * 1. Antisymmetry: compareWordProgress(a, b) === -compareWordProgress(b, a)
 * 2. Transitivity: if a > b and b > c, then a > c
 * 3. Totality: exactly one of a > b, b > a, or a === b holds
 */
export function compareWordProgress(a: WordProgress, b: WordProgress): number {
  const timeA = a.lastAttemptDate ? (Date.parse(a.lastAttemptDate) || 0) : 0;
  const timeB = b.lastAttemptDate ? (Date.parse(b.lastAttemptDate) || 0) : 0;
  if (timeA !== timeB) return timeA - timeB;

  const histTimeA = (a.history && a.history.length > 0)
    ? Math.max(...a.history.map(h => (h && h.date ? (Date.parse(h.date) || 0) : 0)))
    : 0;
  const histTimeB = (b.history && b.history.length > 0)
    ? Math.max(...b.history.map(h => (h && h.date ? (Date.parse(h.date) || 0) : 0)))
    : 0;
  if (histTimeA !== histTimeB) return histTimeA - histTimeB;

  const revisitA = Boolean(a.needsRevisit);
  const revisitB = Boolean(b.needsRevisit);
  if (revisitA !== revisitB) return revisitA ? 1 : -1;

  const streakA = a.consecutiveUnaidedCorrect || 0;
  const streakB = b.consecutiveUnaidedCorrect || 0;
  if (streakA !== streakB) return streakA - streakB;

  const unaidedA = a.unaidedCorrectCount || 0;
  const unaidedB = b.unaidedCorrectCount || 0;
  if (unaidedA !== unaidedB) return unaidedA - unaidedB;

  const attemptsA = a.attempts || 0;
  const attemptsB = b.attempts || 0;
  if (attemptsA !== attemptsB) return attemptsA - attemptsB;

  const histLenA = a.history ? a.history.length : 0;
  const histLenB = b.history ? b.history.length : 0;
  if (histLenA !== histLenB) return histLenA - histLenB;

  const levelRank: Record<string, number> = { learning: 1, practising: 2, remembered: 3 };
  const rankA = levelRank[a.level] || 0;
  const rankB = levelRank[b.level] || 0;
  if (rankA !== rankB) return rankA - rankB;

  const strA = canonicalWordProgressString(a);
  const strB = canonicalWordProgressString(b);
  if (strA < strB) return -1;
  if (strA > strB) return 1;

  return 0;
}

function canonicalHistoryEntryKey(h: WordProgress['history'][number]): string {
  return h.attemptId || `${h.date}:${h.mode}`;
}

function canonicalHistorySortKey(h: WordProgress['history'][number]): string {
  return `${h.date}|${h.mode}|${h.wasCorrect ? 1 : 0}|${h.attemptId || ''}|${h.mistakeInput || ''}`;
}

export function mergeHistoryRecords(
  historyA?: WordProgress['history'],
  historyB?: WordProgress['history']
): WordProgress['history'] {
  const historyMap = new Map<string, WordProgress['history'][number]>();
  const combined = [...(historyA || []), ...(historyB || [])];

  for (const entry of combined) {
    if (!entry || !entry.date) continue;
    const key = canonicalHistoryEntryKey(entry);
    const existing = historyMap.get(key);
    if (!existing) {
      historyMap.set(key, entry);
    } else {
      if (canonicalHistorySortKey(entry) > canonicalHistorySortKey(existing)) {
        historyMap.set(key, entry);
      }
    }
  }

  return Array.from(historyMap.values())
    .sort((x, y) => {
      const timeX = Date.parse(x.date) || 0;
      const timeY = Date.parse(y.date) || 0;
      if (timeX !== timeY) return timeX - timeY;
      const keyX = canonicalHistorySortKey(x);
      const keyY = canonicalHistorySortKey(y);
      if (keyX < keyY) return -1;
      if (keyX > keyY) return 1;
      return 0;
    })
    .slice(-15);
}

export function mergeLastUnaidedCorrectDate(
  dateA?: string | null,
  dateB?: string | null
): string | null {
  if (!dateA) return dateB ?? null;
  if (!dateB) return dateA ?? null;
  const timeA = Date.parse(dateA) || 0;
  const timeB = Date.parse(dateB) || 0;
  if (timeA !== timeB) return timeA > timeB ? dateA : dateB;
  return dateA > dateB ? dateA : dateB;
}

function readinessFromRecallEvidence(
  consecutive: number,
  dates: string[]
): 'learning' | 'practising' | 'remembered' {
  if (consecutive >= 2 && new Set(dates).size >= 2) return 'remembered';
  return consecutive > 0 ? 'practising' : 'learning';
}

function resolveWorkingMemoryState(
  primary: WordProgress,
  secondary: WordProgress,
  mergedHistory: WordProgress['history']
): {
  consecutiveUnaidedCorrect: number;
  unaidedCorrectDates: string[];
  level: WordProgress['level'];
} {
  let latestUnaidedFailureTime = -1;
  let latestUnaidedSuccessTime = -1;

  for (const entry of mergedHistory) {
    if (!entry || !entry.date) continue;
    const isUnaided = entry.mode === 'test' || entry.mode === 'paper';
    if (!isUnaided) continue;

    const t = Date.parse(entry.date) || 0;
    if (entry.wasCorrect) {
      if (t > latestUnaidedSuccessTime) latestUnaidedSuccessTime = t;
    } else {
      if (t > latestUnaidedFailureTime) latestUnaidedFailureTime = t;
    }
  }

  if (latestUnaidedFailureTime >= 0 && latestUnaidedFailureTime >= latestUnaidedSuccessTime) {
    return {
      consecutiveUnaidedCorrect: 0,
      unaidedCorrectDates: [],
      level: 'learning'
    };
  }

  const consecutiveUnaidedCorrect = primary.consecutiveUnaidedCorrect || 0;
  const unaidedCorrectDates = Array.isArray(primary.unaidedCorrectDates)
    ? [...primary.unaidedCorrectDates]
    : [];

  const level = (consecutiveUnaidedCorrect === 0)
    ? 'learning'
    : (primary.level || readinessFromRecallEvidence(consecutiveUnaidedCorrect, unaidedCorrectDates));

  return { consecutiveUnaidedCorrect, unaidedCorrectDates, level };
}

function resolveNeedsRevisitAndMistake(
  primary: WordProgress,
  secondary: WordProgress,
  mergedHistory: WordProgress['history']
): { needsRevisit: boolean; lastMistake?: string } {
  let latestUnaidedFailureTime = -1;
  let latestUnaidedSuccessTime = -1;
  let latestFailureMistake: string | undefined;

  for (const entry of mergedHistory) {
    if (!entry || !entry.date) continue;
    const isUnaided = entry.mode === 'test' || entry.mode === 'paper';
    if (!isUnaided) continue;

    const t = Date.parse(entry.date) || 0;
    if (entry.wasCorrect) {
      if (t > latestUnaidedSuccessTime) latestUnaidedSuccessTime = t;
    } else {
      if (t >= latestUnaidedFailureTime) {
        latestUnaidedFailureTime = t;
        if (entry.mistakeInput) latestFailureMistake = entry.mistakeInput;
      }
    }
  }

  // If there is an outstanding unaided failure (not cleared by a subsequent unaided success),
  // needsRevisit MUST remain true, because assisted practice cannot clear an unaided failure.
  if (latestUnaidedFailureTime >= 0 && latestUnaidedFailureTime >= latestUnaidedSuccessTime) {
    return {
      needsRevisit: true,
      lastMistake: latestFailureMistake || primary.lastMistake || secondary.lastMistake || undefined
    };
  }

  // If there is no outstanding unaided failure, inspect the chronologically latest attempt in mergedHistory
  const latestEntry = mergedHistory.length > 0 ? mergedHistory[mergedHistory.length - 1] : undefined;
  if (latestEntry) {
    if (!latestEntry.wasCorrect) {
      return {
        needsRevisit: true,
        lastMistake: latestEntry.mistakeInput || primary.lastMistake || secondary.lastMistake || undefined
      };
    }
    const isUnaided = latestEntry.mode === 'test' || latestEntry.mode === 'paper';
    if (isUnaided && latestEntry.wasCorrect) {
      return {
        needsRevisit: false,
        lastMistake: undefined
      };
    }
  }

  const needsRevisit = Boolean(primary.needsRevisit);
  const lastMistake = needsRevisit
    ? (primary.lastMistake ?? secondary.lastMistake ?? undefined)
    : undefined;

  return { needsRevisit, lastMistake };
}

export function mergeSingleWordProgress(
  loc: WordProgress,
  rem: WordProgress
): WordProgress {
  const comparison = compareWordProgress(loc, rem);
  const primary = comparison >= 0 ? loc : rem;
  const secondary = comparison >= 0 ? rem : loc;

  const mergedHistory = mergeHistoryRecords(loc.history, rem.history);
  const attempts = Math.max(loc.attempts || 0, rem.attempts || 0, mergedHistory.length);
  const unaidedCorrectCount = Math.max(loc.unaidedCorrectCount || 0, rem.unaidedCorrectCount || 0);

  const { consecutiveUnaidedCorrect, unaidedCorrectDates, level } =
    resolveWorkingMemoryState(primary, secondary, mergedHistory);

  const { needsRevisit, lastMistake } =
    resolveNeedsRevisitAndMistake(primary, secondary, mergedHistory);

  const lastAttemptDate = primary.lastAttemptDate ?? secondary.lastAttemptDate ?? null;
  const lastUnaidedCorrectDate = mergeLastUnaidedCorrectDate(loc.lastUnaidedCorrectDate, rem.lastUnaidedCorrectDate);

  const result: WordProgress = {
    wordId: primary.wordId,
    studentId: primary.studentId,
    attempts,
    unaidedCorrectCount,
    consecutiveUnaidedCorrect,
    unaidedCorrectDates,
    lastAttemptDate,
    level,
    needsRevisit,
    history: mergedHistory
  };

  if (lastUnaidedCorrectDate) {
    result.lastUnaidedCorrectDate = lastUnaidedCorrectDate;
  }
  if (lastMistake !== undefined) {
    result.lastMistake = lastMistake;
  }

  return result;
}

export function mergeSpellingProgress(
  local: Record<string, WordProgress>,
  remote: Record<string, WordProgress>
): Record<string, WordProgress> {
  const merged: Record<string, WordProgress> = {};
  const allWordIds = Array.from(
    new Set([...Object.keys(local || {}), ...Object.keys(remote || {})])
  ).sort();

  for (const wordId of allWordIds) {
    const loc = local?.[wordId];
    const rem = remote?.[wordId];

    if (!loc) {
      if (rem) merged[wordId] = rem;
      continue;
    }
    if (!rem) {
      merged[wordId] = loc;
      continue;
    }

    merged[wordId] = mergeSingleWordProgress(loc, rem);
  }

  return merged;
}

/**
 * 4. Overall Progress Snapshot Merge:
 * Combines spelling, subject progress, and learning records deterministically.
 */
export function mergeProgressSnapshots(
  local: StudentProgressSnapshot,
  remote: StudentProgressSnapshot
): StudentProgressSnapshot {
  if (local.studentId !== remote.studentId) {
    throw new Error(`Cannot merge snapshots for different students: ${local.studentId} vs ${remote.studentId}`);
  }

  const timeL = Date.parse(local.syncedAt || '') || 0;
  const timeR = Date.parse(remote.syncedAt || '') || 0;
  let syncedAt: string;
  if (timeL > timeR) {
    syncedAt = local.syncedAt;
  } else if (timeR > timeL) {
    syncedAt = remote.syncedAt;
  } else if (local.syncedAt && remote.syncedAt) {
    syncedAt = local.syncedAt.localeCompare(remote.syncedAt) >= 0 ? local.syncedAt : remote.syncedAt;
  } else {
    syncedAt = local.syncedAt || remote.syncedAt || new Date().toISOString();
  }

  return {
    studentId: local.studentId,
    version: 1,
    syncedAt,
    spelling: mergeSpellingProgress(local.spelling || {}, remote.spelling || {}),
    subjects: mergeSubjectProgress(local.subjects || {}, remote.subjects || {}),
    learningRecords: mergeLearningRecords(local.learningRecords || [], remote.learningRecords || [])
  };
}

// ---------------------------------------------------------------------------
// Client Storage Extraction & Application (Strict Device-Local Isolation)
// ---------------------------------------------------------------------------

export function buildLocalSnapshot(studentId: StudentId): StudentProgressSnapshot {
  const storage = getLocalStorage();
  const spelling: Record<string, WordProgress> = {};
  const subjects: Record<string, SubjectProgress> = {};
  const learningRecords: LearningRecord[] = [];

  if (storage) {
    // 1. Spelling Progress
    const rawSpelling = storage.getItem(`spellbee_progress_${studentId}_v1`);
    if (rawSpelling) {
      try {
        const parsed = JSON.parse(rawSpelling);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [key, val] of Object.entries(parsed)) {
            if (val && typeof val === 'object' && (val as WordProgress).studentId === studentId) {
              spelling[key] = val as WordProgress;
            }
          }
        }
      } catch {}
    }

    // 2. Subject Progress
    for (const sub of ALL_SUBJECT_KEYS) {
      const rawSubject = storage.getItem(`academy_${sub}_${studentId}_v1`);
      if (rawSubject) {
        try {
          const parsed = JSON.parse(rawSubject);
          if (parsed && typeof parsed === 'object' && parsed.studentId === studentId) {
            subjects[sub] = parsed as SubjectProgress;
          }
        } catch {}
      }
    }

    // 3. Learning Records
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith('academy_rec_')) {
        const rawRec = storage.getItem(key);
        if (rawRec) {
          try {
            const parsed = JSON.parse(rawRec);
            if (parsed && typeof parsed === 'object' && parsed.learnerId === studentId && typeof parsed.id === 'string') {
              learningRecords.push(parsed as LearningRecord);
            }
          } catch {}
        }
      }
    }
  }

  learningRecords.sort((a, b) => a.id.localeCompare(b.id));

  // NOTE: Device-local keys 'spellbee_active_profile_v1' and 'spellbee_settings_v1'
  // are NEVER read into the snapshot.

  return {
    studentId,
    version: 1,
    syncedAt: new Date().toISOString(),
    spelling,
    subjects,
    learningRecords
  };
}

export function saveSnapshotToLocalStorage(snapshot: StudentProgressSnapshot): void {
  const storage = getLocalStorage();
  if (!storage) return;

  const { studentId } = snapshot;

  // 1. Save Spelling
  try {
    storage.setItem(`spellbee_progress_${studentId}_v1`, JSON.stringify(snapshot.spelling || {}));
  } catch {}

  // 2. Save Subjects
  if (snapshot.subjects) {
    for (const [sub, progress] of Object.entries(snapshot.subjects)) {
      if (progress && progress.studentId === studentId) {
        try {
          const normalized: SubjectProgress = {
            studentId: progress.studentId,
            lessonId: progress.lessonId,
            practice: progress.practice ?? null,
            exam: progress.exam ?? null,
            reviewQuestionIds: Array.isArray(progress.reviewQuestionIds) ? [...progress.reviewQuestionIds] : []
          };
          storage.setItem(`academy_${sub}_${studentId}_v1`, JSON.stringify(normalized));
        } catch {}
      }
    }
  }

  // 3. Save Learning Records
  if (Array.isArray(snapshot.learningRecords)) {
    for (const record of snapshot.learningRecords) {
      if (record && typeof record.id === 'string' && record.learnerId === studentId) {
        try {
          storage.setItem(`academy_rec_${record.id}`, JSON.stringify(record));
        } catch {}
      }
    }
  }

  // NOTE: Device-local keys 'spellbee_active_profile_v1' and 'spellbee_settings_v1'
  // are NEVER written by this function.
}

// ---------------------------------------------------------------------------
// Endpoint Resolver & Local Storage Safe Snapshot Apply
// ---------------------------------------------------------------------------

export function getProgressApiUrl(studentId: StudentId): string {
  const envBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PROGRESS_API_URL)
    ? String(import.meta.env.VITE_PROGRESS_API_URL).replace(/\/+$/, '')
    : '';
  return envBase ? `${envBase}/${studentId}` : `/api/progress/${studentId}`;
}

export function applyRemoteSnapshotToLocalStorage(
  incoming: StudentProgressSnapshot
): StudentProgressSnapshot {
  if (!incoming || (incoming.studentId !== 'shiza' && incoming.studentId !== 'fazia')) {
    return incoming;
  }
  const freshLocal = buildLocalSnapshot(incoming.studentId);
  const safelyMerged = mergeProgressSnapshots(freshLocal, incoming);
  saveSnapshotToLocalStorage(safelyMerged);
  return safelyMerged;
}

// ---------------------------------------------------------------------------
// Per-Learner Sync Status Reporting
// ---------------------------------------------------------------------------

const studentSyncStatuses = new Map<StudentId, SyncStatus>([
  ['shiza', 'idle'],
  ['fazia', 'idle']
]);
let currentSyncStatus: SyncStatus = 'idle';
const statusListeners = new Set<(status: SyncStatus, studentId?: StudentId) => void>();
const resetStatusTimers = new Map<StudentId, ReturnType<typeof setTimeout>>();

export function setSyncStatus(status: SyncStatus, studentId?: StudentId): void {
  currentSyncStatus = status;
  if (studentId) {
    studentSyncStatuses.set(studentId, status);
    const existingReset = resetStatusTimers.get(studentId);
    if (existingReset) {
      clearTimeout(existingReset);
      resetStatusTimers.delete(studentId);
    }
  }

  for (const listener of statusListeners) {
    try {
      listener(status, studentId);
    } catch {}
  }

  if (status === 'synced') {
    const timer = setTimeout(() => {
      if (studentId) {
        resetStatusTimers.delete(studentId);
        setSyncStatus('idle', studentId);
      } else {
        setSyncStatus('idle');
      }
    }, 3000);
    if (studentId) {
      resetStatusTimers.set(studentId, timer);
    }
  }
}

export function getSyncStatus(studentId?: StudentId): SyncStatus {
  if (studentId && studentSyncStatuses.has(studentId)) {
    return studentSyncStatuses.get(studentId)!;
  }
  return currentSyncStatus;
}

export function subscribeSyncStatus(
  listener: (status: SyncStatus, studentId?: StudentId) => void,
  studentId?: StudentId
): () => void {
  statusListeners.add(listener);
  listener(getSyncStatus(studentId), studentId);
  return () => {
    statusListeners.delete(listener);
  };
}

// ---------------------------------------------------------------------------
// Network Sync & Per-Learner In-Flight Queue
// ---------------------------------------------------------------------------

const debounceTimers = new Map<StudentId, ReturnType<typeof setTimeout>>();
const inFlightSyncs = new Map<StudentId, Promise<StudentProgressSnapshot | null>>();
const pendingSyncFlags = new Map<StudentId, boolean>([
  ['shiza', false],
  ['fazia', false]
]);

export async function syncProgress(
  studentId: StudentId,
  options?: { keepalive?: boolean }
): Promise<StudentProgressSnapshot | null> {
  const currentInFlight = inFlightSyncs.get(studentId);
  if (currentInFlight) {
    pendingSyncFlags.set(studentId, true);
    await currentInFlight;
    if (pendingSyncFlags.get(studentId)) {
      pendingSyncFlags.set(studentId, false);
      return syncProgress(studentId, options);
    }
    const nextInFlight = inFlightSyncs.get(studentId);
    if (nextInFlight) {
      return nextInFlight;
    }
    return null;
  }

  const executeSync = async (): Promise<StudentProgressSnapshot | null> => {
    setSyncStatus('syncing', studentId);
    let result: StudentProgressSnapshot | null = null;

    try {
      const localSnapshot = buildLocalSnapshot(studentId);
      const url = getProgressApiUrl(studentId);

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`GET ${url} returned ${response.status}`);
      }

      const remoteData = await response.json();
      const remoteSnapshot: StudentProgressSnapshot = (remoteData && typeof remoteData === 'object' && remoteData.studentId === studentId)
        ? (remoteData as StudentProgressSnapshot)
        : {
            studentId,
            version: 1,
            syncedAt: '',
            spelling: {},
            subjects: {},
            learningRecords: []
          };

      const merged = mergeProgressSnapshots(localSnapshot, remoteSnapshot);

      const hasLocalChanges = !remoteData ||
        JSON.stringify(merged.spelling) !== JSON.stringify(remoteSnapshot.spelling) ||
        JSON.stringify(merged.subjects) !== JSON.stringify(remoteSnapshot.subjects) ||
        merged.learningRecords.length !== remoteSnapshot.learningRecords.length ||
        JSON.stringify(merged.learningRecords) !== JSON.stringify(remoteSnapshot.learningRecords);

      let finalSnapshot = merged;

      if (hasLocalChanges) {
        const postResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged),
          keepalive: options?.keepalive ?? false
        });

        if (!postResponse.ok) {
          throw new Error(`POST ${url} returned ${postResponse.status}`);
        }

        const postResult = await postResponse.json();
        if (!postResult || typeof postResult !== 'object' || postResult.studentId !== studentId) {
          throw new Error(`POST ${url} returned malformed payload`);
        }
        finalSnapshot = postResult as StudentProgressSnapshot;
      }

      result = applyRemoteSnapshotToLocalStorage(finalSnapshot);
      dispatchSyncEvent(studentId);
      setSyncStatus('synced', studentId);
    } catch (err) {
      setSyncStatus('error', studentId);
      pendingSyncFlags.set(studentId, true);
      result = null;
    } finally {
      inFlightSyncs.delete(studentId);
    }

    if (result !== null && pendingSyncFlags.get(studentId)) {
      pendingSyncFlags.set(studentId, false);
      const timer = debounceTimers.get(studentId);
      if (timer) {
        clearTimeout(timer);
        debounceTimers.delete(studentId);
      }
      return syncProgress(studentId, options);
    }

    return result;
  };

  const promise = executeSync();
  inFlightSyncs.set(studentId, promise);
  return promise;
}

// ---------------------------------------------------------------------------
// Per-Learner Debounce Controller
// ---------------------------------------------------------------------------

export function scheduleDebouncedSync(studentId: StudentId): void {
  if (inFlightSyncs.has(studentId)) {
    pendingSyncFlags.set(studentId, true);
  }

  const existingTimer = debounceTimers.get(studentId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(() => {
    debounceTimers.delete(studentId);
    void syncProgress(studentId);
  }, 3000);

  debounceTimers.set(studentId, timer);
}

export function cancelDebouncedSync(studentId?: StudentId): void {
  if (studentId) {
    const timer = debounceTimers.get(studentId);
    if (timer) {
      clearTimeout(timer);
      debounceTimers.delete(studentId);
    }
  } else {
    for (const [, timer] of debounceTimers.entries()) {
      clearTimeout(timer);
    }
    debounceTimers.clear();
  }
}

export async function flushDebouncedSync(
  studentId?: StudentId,
  options?: { keepalive?: boolean }
): Promise<StudentProgressSnapshot | null> {
  if (studentId) {
    cancelDebouncedSync(studentId);
    return syncProgress(studentId, options);
  }

  const activeStudents = Array.from(debounceTimers.keys());
  cancelDebouncedSync();
  if (activeStudents.length === 0) return null;
  const results = await Promise.all(activeStudents.map(sId => syncProgress(sId, options)));
  return results[0] ?? null;
}

export const flushPendingSync = flushDebouncedSync;
