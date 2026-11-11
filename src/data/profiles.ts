import { StudentId, StudentProfile } from '../types';

/** Learner identity and grade stay separate from curriculum modules. */
export const STUDENT_PROFILES: StudentProfile[] = [
  {
    id: 'fazia',
    name: 'Fazia',
    grade: 2,
    gradeLabel: 'Grade 2',
    avatarEmoji: '🌸',
    theme: {
      primary: 'rose',
      gradient: 'from-rose-900 via-pink-800 to-orange-900',
      accentBg: 'bg-rose-50',
      accentText: 'text-rose-700',
      accentBorder: 'border-rose-200',
      cardGlow: 'shadow-rose-100/60',
      greeting: 'Hello Fazia! 🌸 Ready to explore?',
      pageTint: '#fff1f2'
    },
    description: 'Grade 2 multi-subject revision across Spell Bee, Robotics, Maths, Malayalam, Hindi, EVS, and Moral Science'
  },
  {
    id: 'shiza',
    name: 'Shiza',
    grade: 6,
    gradeLabel: 'Grade 6',
    avatarEmoji: '⭐',
    theme: {
      primary: 'violet',
      gradient: 'from-violet-900 via-purple-900 to-indigo-800',
      accentBg: 'bg-violet-50',
      accentText: 'text-violet-700',
      accentBorder: 'border-violet-200',
      cardGlow: 'shadow-violet-100/60',
      greeting: 'Hey Shiza! ⭐ Ready to master your exams?',
      pageTint: '#f5f3ff'
    },
    description: 'Grade 6 multi-subject revision across Spell Bee, Robotics, Maths, Malayalam, Hindi, Biology, Chemistry, English, History, and Moral Science'
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
