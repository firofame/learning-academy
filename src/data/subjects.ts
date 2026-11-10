import { ActiveAppView, LearningSubject, LearningSubjectId } from '../types';

export const LEARNING_SUBJECTS: LearningSubject[] = [
  {
    id: 'spell-bee',
    name: 'Spell Bee',
    emoji: '🐝',
    color: 'amber',
    buttonBg: 'bg-amber-700 hover:bg-amber-800',
    progressBg: 'bg-amber-500',
    lightBg: 'bg-amber-50',
    darkText: 'text-amber-800',
    iconBg: 'bg-amber-100 text-amber-700',
    description: 'Revise school spelling words with recall, feedback, and same-day rechecks.',
    availableGrades: [2, 6],
    startView: 'spell-bee',
    views: ['spell-bee']
  },
  {
    id: 'robotics',
    name: 'Robotics',
    emoji: '🤖',
    color: 'teal',
    buttonBg: 'bg-teal-700 hover:bg-teal-800',
    progressBg: 'bg-teal-500',
    lightBg: 'bg-teal-50',
    darkText: 'text-teal-800',
    iconBg: 'bg-teal-100 text-teal-700',
    description: 'Revise school lessons with recall, feedback, and same-day rechecks.',
    availableGrades: [2, 6],
    startView: 'robotics',
    views: ['robotics']
  },
  {
    id: 'maths',
    name: 'Maths',
    emoji: '🔢',
    color: 'indigo',
    buttonBg: 'bg-indigo-700 hover:bg-indigo-800',
    progressBg: 'bg-indigo-500',
    lightBg: 'bg-indigo-50',
    darkText: 'text-indigo-800',
    iconBg: 'bg-indigo-100 text-indigo-700',
    description: 'Revise school mathematics with visual questions, feedback, and same-day rechecks.',
    availableGrades: [2, 6],
    startView: 'maths',
    views: ['maths']
  },
  {
    id: 'malayalam',
    name: 'Malayalam',
    emoji: '📜',
    color: 'orange',
    buttonBg: 'bg-orange-700 hover:bg-orange-800',
    progressBg: 'bg-orange-500',
    lightBg: 'bg-orange-50',
    darkText: 'text-orange-800',
    iconBg: 'bg-orange-100 text-orange-700',
    description: 'Revise the current school portions with native-script answers, feedback, and same-day rechecks.',
    availableGrades: [2, 6],
    startView: 'malayalam',
    views: ['malayalam']
  },
  {
    id: 'hindi',
    name: 'Hindi',
    emoji: '🪷',
    color: 'rose',
    buttonBg: 'bg-rose-700 hover:bg-rose-800',
    progressBg: 'bg-rose-500',
    lightBg: 'bg-rose-50',
    darkText: 'text-rose-800',
    iconBg: 'bg-rose-100 text-rose-700',
    description: 'Revise school Hindi portions with native-script answers, feedback, and same-day rechecks.',
    availableGrades: [2, 6],
    startView: 'hindi',
    views: ['hindi']
  },
  {
    id: 'evs',
    name: 'EVS',
    emoji: '🌿',
    color: 'emerald',
    buttonBg: 'bg-emerald-700 hover:bg-emerald-800',
    progressBg: 'bg-emerald-500',
    lightBg: 'bg-emerald-50',
    darkText: 'text-emerald-800',
    iconBg: 'bg-emerald-100 text-emerald-700',
    description: 'Revise school Environmental Studies lessons with recall, feedback, and same-day rechecks.',
    availableGrades: [2],
    startView: 'evs',
    views: ['evs']
  },
  {
    id: 'biology',
    name: 'Biology',
    emoji: '🧬',
    color: 'green',
    buttonBg: 'bg-green-700 hover:bg-green-800',
    progressBg: 'bg-green-500',
    lightBg: 'bg-green-50',
    darkText: 'text-green-800',
    iconBg: 'bg-green-100 text-green-700',
    description: 'Revise school Biology portions with recall, feedback, and same-day rechecks.',
    availableGrades: [6],
    startView: 'biology',
    views: ['biology']
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    emoji: '🧪',
    color: 'purple',
    buttonBg: 'bg-purple-700 hover:bg-purple-800',
    progressBg: 'bg-purple-500',
    lightBg: 'bg-purple-50',
    darkText: 'text-purple-800',
    iconBg: 'bg-purple-100 text-purple-700',
    description: 'Revise school Chemistry portions with recall, feedback, and same-day rechecks.',
    availableGrades: [6],
    startView: 'chemistry',
    views: ['chemistry']
  },
  {
    id: 'english',
    name: 'English',
    emoji: '📖',
    color: 'sky',
    buttonBg: 'bg-sky-700 hover:bg-sky-800',
    progressBg: 'bg-sky-500',
    lightBg: 'bg-sky-50',
    darkText: 'text-sky-800',
    iconBg: 'bg-sky-100 text-sky-700',
    description: 'Revise school English portions with recall, feedback, and same-day rechecks.',
    availableGrades: [6],
    startView: 'english',
    views: ['english']
  },
  {
    id: 'history',
    name: 'History',
    emoji: '🏛️',
    color: 'amber',
    buttonBg: 'bg-amber-800 hover:bg-amber-900',
    progressBg: 'bg-amber-600',
    lightBg: 'bg-amber-50',
    darkText: 'text-amber-900',
    iconBg: 'bg-amber-100 text-amber-800',
    description: 'Revise school History and Civics portions with recall, feedback, and same-day rechecks.',
    availableGrades: [6],
    startView: 'history',
    views: ['history']
  },
  {
    id: 'moral-science',
    name: 'Moral Science',
    emoji: '💛',
    color: 'cyan',
    buttonBg: 'bg-cyan-700 hover:bg-cyan-800',
    progressBg: 'bg-cyan-500',
    lightBg: 'bg-cyan-50',
    darkText: 'text-cyan-800',
    iconBg: 'bg-cyan-100 text-cyan-700',
    description: 'Revise school Moral Values lessons with recall, feedback, and same-day rechecks.',
    availableGrades: [2],
    startView: 'moral-science',
    views: ['moral-science']
  }
];

export function getAvailableSubjectsForGrade(grade: number): LearningSubject[] {
  return LEARNING_SUBJECTS.filter(subject => subject.availableGrades.includes(grade));
}

export function isSubjectAvailableForGrade(subjectId: LearningSubjectId, grade: number): boolean {
  return getAvailableSubjectsForGrade(grade).some(subject => subject.id === subjectId);
}

export function getSubjectForView(view: ActiveAppView): LearningSubject | undefined {
  const normalizedView = (view as string) === 'session' ? 'spell-bee' : view;
  return LEARNING_SUBJECTS.find(subject => subject.views.includes(normalizedView));
}
