import { StudentId, StudentProfile } from '../types';

/** Learner identity and grade stay separate from curriculum modules. */
export const STUDENT_PROFILES: StudentProfile[] = [
  {
    id: 'fazia',
    name: 'Fazia',
    grade: 2,
    gradeLabel: 'Grade 2',
    avatarEmoji: '🌸',
    description: 'Foundational spelling bee vocabulary across 6 word categories'
  },
  {
    id: 'shiza',
    name: 'Shiza',
    grade: 6,
    gradeLabel: 'Grade 6',
    avatarEmoji: '⭐',
    description: 'Advanced academic vocabulary across 9 word categories'
  }
];

// Kept beside profile metadata so the application shell does not import the word bank.
export const SPELLING_WORD_COUNTS: Record<StudentId, number> = {
  fazia: 45,
  shiza: 80
};

export function getStudentProfile(studentId: StudentId): StudentProfile {
  const profile = STUDENT_PROFILES.find(candidate => candidate.id === studentId);
  if (!profile) throw new Error(`Unknown student profile: ${studentId}`);
  return profile;
}

export function getStudentWordCount(studentId: StudentId): number {
  return SPELLING_WORD_COUNTS[studentId];
}
