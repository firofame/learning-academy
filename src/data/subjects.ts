import { ActiveAppView, LearningSubject, LearningSubjectId } from '../types';

export const LEARNING_SUBJECTS: LearningSubject[] = [
  {
    id: 'spell-bee',
    name: 'Spell Bee',
    description: 'Revise school spelling words with recall, feedback, and same-day rechecks.',
    availableGrades: [2, 6],
    startView: 'session',
    views: ['session']
  },
  {
    id: 'robotics',
    name: 'Robotics',
    description: 'Revise school lessons with recall, feedback, and same-day rechecks.',
    availableGrades: [2, 6],
    startView: 'robotics',
    views: ['robotics']
  },
  {
    id: 'maths',
    name: 'Maths',
    description: 'Revise school mathematics with visual questions, feedback, and same-day rechecks.',
    availableGrades: [2, 6],
    startView: 'maths',
    views: ['maths']
  },
  {
    id: 'malayalam',
    name: 'Malayalam',
    description: 'Revise the current school portions with native-script answers, feedback, and same-day rechecks.',
    availableGrades: [2, 6],
    startView: 'malayalam',
    views: ['malayalam']
  },
  {
    id: 'hindi',
    name: 'Hindi',
    description: 'Revise school Hindi portions with native-script answers, feedback, and same-day rechecks.',
    availableGrades: [6],
    startView: 'hindi',
    views: ['hindi']
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
