import type { StudentId, WordProgress } from '../types';
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
  'chemistry'
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

  return Array.from(map.values());
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
 * 3. Spell Bee Word Progress Merge:
 * - Merge word history (capped at 15)
 * - Take later lastAttemptDate to preserve mastery levels and streaks
 */
export function mergeSpellingProgress(
  local: Record<string, WordProgress>,
  remote: Record<string, WordProgress>
): Record<string, WordProgress> {
  const merged: Record<string, WordProgress> = {};
  const allWordIds = new Set([...Object.keys(local || {}), ...Object.keys(remote || {})]);

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

    const localTime = loc.lastAttemptDate ? (Date.parse(loc.lastAttemptDate) || 0) : 0;
    const remoteTime = rem.lastAttemptDate ? (Date.parse(rem.lastAttemptDate) || 0) : 0;

    // Side with later lastAttemptDate provides primary mastery, streak, and dates
    const primary = remoteTime > localTime ? rem : loc;
    const secondary = remoteTime > localTime ? loc : rem;

    // Merge history: union, deduplicate by attemptId or date+mode, sort, keep latest 15
    const historyMap = new Map<string, WordProgress['history'][number]>();
    const allHistory = [...(loc.history || []), ...(rem.history || [])];
    for (const entry of allHistory) {
      if (!entry) continue;
      const key = entry.attemptId || `${entry.date}:${entry.mode}`;
      if (!historyMap.has(key)) {
        historyMap.set(key, entry);
      }
    }
    const mergedHistory = Array.from(historyMap.values())
      .sort((a, b) => (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0))
      .slice(-15);

    merged[wordId] = {
      wordId,
      studentId: primary.studentId,
      attempts: Math.max(loc.attempts || 0, rem.attempts || 0, mergedHistory.length),
      unaidedCorrectCount: Math.max(loc.unaidedCorrectCount || 0, rem.unaidedCorrectCount || 0),
      consecutiveUnaidedCorrect: primary.consecutiveUnaidedCorrect,
      unaidedCorrectDates: [...(primary.unaidedCorrectDates || [])],
      lastAttemptDate: primary.lastAttemptDate ?? secondary.lastAttemptDate,
      lastUnaidedCorrectDate: primary.lastUnaidedCorrectDate ?? secondary.lastUnaidedCorrectDate,
      level: primary.level,
      lastMistake: primary.lastMistake,
      needsRevisit: primary.needsRevisit,
      history: mergedHistory
    };
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

  return {
    studentId: local.studentId,
    version: 1,
    syncedAt: new Date().toISOString(),
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
// Sync Status Reporting
// ---------------------------------------------------------------------------

let currentSyncStatus: SyncStatus = 'idle';
const statusListeners = new Set<(status: SyncStatus) => void>();
let resetStatusTimer: ReturnType<typeof setTimeout> | null = null;

function setSyncStatus(status: SyncStatus): void {
  currentSyncStatus = status;
  if (resetStatusTimer) {
    clearTimeout(resetStatusTimer);
    resetStatusTimer = null;
  }
  for (const listener of statusListeners) {
    try {
      listener(status);
    } catch {}
  }
  if (status === 'synced') {
    resetStatusTimer = setTimeout(() => {
      setSyncStatus('idle');
    }, 3000);
  }
}

export function getSyncStatus(): SyncStatus {
  return currentSyncStatus;
}

export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  statusListeners.add(listener);
  listener(currentSyncStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

// ---------------------------------------------------------------------------
// Network Sync Implementation
// ---------------------------------------------------------------------------

let inFlightSync: Promise<StudentProgressSnapshot | null> | null = null;
let queuedStudentId: StudentId | null = null;

export async function syncProgress(
  studentId: StudentId,
  options?: { keepalive?: boolean }
): Promise<StudentProgressSnapshot | null> {
  if (inFlightSync) {
    queuedStudentId = studentId;
    await inFlightSync;
    if (queuedStudentId === studentId) {
      queuedStudentId = null;
      return syncProgress(studentId, options);
    }
    return null;
  }

  const executeSync = async (): Promise<StudentProgressSnapshot | null> => {
    setSyncStatus('syncing');
    try {
      const localSnapshot = buildLocalSnapshot(studentId);

      const response = await fetch(`/api/progress/${studentId}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`GET /api/progress/${studentId} returned ${response.status}`);
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
        const postResponse = await fetch(`/api/progress/${studentId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged),
          keepalive: options?.keepalive ?? false
        });

        if (postResponse.ok) {
          const postResult = await postResponse.json();
          if (postResult && typeof postResult === 'object' && postResult.studentId === studentId) {
            finalSnapshot = postResult as StudentProgressSnapshot;
          }
        }
      }

      saveSnapshotToLocalStorage(finalSnapshot);
      dispatchSyncEvent(studentId);
      setSyncStatus('synced');
      return finalSnapshot;
    } catch {
      setSyncStatus('error');
      return null;
    } finally {
      inFlightSync = null;
    }
  };

  inFlightSync = executeSync();
  return inFlightSync;
}

// ---------------------------------------------------------------------------
// Debounce Controller
// ---------------------------------------------------------------------------

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let debouncedStudentId: StudentId | null = null;

export function scheduleDebouncedSync(studentId: StudentId): void {
  debouncedStudentId = studentId;
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const target = debouncedStudentId;
    debouncedStudentId = null;
    if (target) {
      void syncProgress(target);
    }
  }, 3000);
}

export function cancelDebouncedSync(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  debouncedStudentId = null;
}

export async function flushDebouncedSync(
  studentId?: StudentId,
  options?: { keepalive?: boolean }
): Promise<StudentProgressSnapshot | null> {
  const target = studentId || debouncedStudentId;
  cancelDebouncedSync();
  if (target) {
    return syncProgress(target, options);
  }
  return null;
}

export const flushPendingSync = flushDebouncedSync;
