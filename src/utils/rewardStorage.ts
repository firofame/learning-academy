import type { StudentId } from '../types';
import { emitStorageError } from './appStorage';

const CELEBRATED_KEY_PREFIX = 'academy_celebrated_milestones_';

export function loadCelebratedMilestones(studentId: StudentId): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${CELEBRATED_KEY_PREFIX}${studentId}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(item => typeof item === 'string')) {
      emitStorageError('Milestone celebrations could not be read. Earned stars are unchanged.');
      return [];
    }
    return parsed;
  } catch {
    emitStorageError('Unable to read milestone celebrations. Earned stars are unchanged.');
    return [];
  }
}

export function recordCelebratedMilestone(studentId: StudentId, milestoneId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadCelebratedMilestones(studentId);
    if (!current.includes(milestoneId)) {
      current.push(milestoneId);
      window.localStorage.setItem(`${CELEBRATED_KEY_PREFIX}${studentId}`, JSON.stringify(current));
    }
  } catch {
    emitStorageError('Unable to remember this milestone celebration. Earned stars are unchanged.');
  }
}
