import { ActiveAppView, LearningSubject, LearningSubjectId } from '../types';

export const LEARNING_SUBJECTS: LearningSubject[] = [
  {
    id: 'spell-bee',
    name: 'Spell Bee',
    description: 'Build spelling confidence with guided learning, word practice, independent recall, and printable worksheets.',
    availableGrades: [2, 6],
    startView: 'session',
    views: ['session', 'curriculum', 'parent', 'worksheet']
  },
  {
    id: 'robotics',
    name: 'Robotics',
    description: 'Explore your school lessons with revision cards, assisted practice, and exam quizzes.',
    availableGrades: [2, 6],
    startView: 'robotics',
    views: ['robotics']
  }
];

export function getAvailableSubjectsForGrade(grade: number): LearningSubject[] {
  return LEARNING_SUBJECTS.filter(subject => subject.availableGrades.includes(grade));
}

export function isSubjectAvailableForGrade(subjectId: LearningSubjectId, grade: number): boolean {
  return getAvailableSubjectsForGrade(grade).some(subject => subject.id === subjectId);
}

export function getSubjectForView(view: ActiveAppView): LearningSubject | undefined {
  return LEARNING_SUBJECTS.find(subject => subject.views.includes(view));
}
