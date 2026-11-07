import { LearningSubjectId } from '../types';
import { localCalendarDate } from '../learning/domain';

export interface TimetableEntry {
  id: string;
  date: string; // ISO date 'YYYY-MM-DD'
  displayDate: string; // e.g. '28/10/26'
  dayOfWeek: string; // 'Wednesday', 'Thursday', etc.
  subject: string; // Display subject name
  subjectId?: LearningSubjectId; // App revision subject if available
  isStudyLeave?: boolean;
  notes?: string;
  sessionTime?: string;
}

export interface ExamGeneralInfo {
  schoolName: string;
  examName: string;
  academicYear: string;
  reportingTime: string;
  morningAssembly: string;
  twoHourTiming: string;
  threeHourTiming: string;
  dispersalNote: string;
  busTimingNote: string;
  instructions: string[];
}

export const EXAM_GENERAL_INFO: ExamGeneralInfo = {
  schoolName: 'Marion Villa Convent ISC School',
  examName: 'First Semester Examination',
  academicYear: '2026-2027',
  reportingTime: '8:10 AM',
  morningAssembly: '8:15 AM',
  twoHourTiming: '8:30 AM – 10:45 AM (for 2 hours)',
  threeHourTiming: '8:30 AM – 11:45 AM (for 3 hours)',
  dispersalNote: 'From 31/10/26 onwards: School will leave at 11:00 AM.',
  busTimingNote: 'School bus will leave at 10:50 AM (from 31/10/26 onwards).',
  instructions: [
    'Students should reach school by 8:10 AM.',
    'Morning Assembly begins at 8:15 AM.',
    'Examination Time: 8:30 AM – 10:45 AM (2 hours) or 8:30 AM – 11:45 AM (3 hours).',
    'From 31/10/26 onwards: School leaves at 11:00 AM, school bus leaves at 10:50 AM.'
  ]
};

export const GRADE_2_TIMETABLE: TimetableEntry[] = [
  {
    id: 'g2-2026-10-28',
    date: '2026-10-28',
    displayDate: '28/10/26',
    dayOfWeek: 'Wednesday',
    subject: 'Regular class / G.K',
    notes: 'Handwritten correction: Regular class / G.K',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g2-2026-10-29',
    date: '2026-10-29',
    displayDate: '29/10/26',
    dayOfWeek: 'Thursday',
    subject: 'Robotics',
    subjectId: 'robotics',
    notes: 'Robotics / Regular class',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g2-2026-10-30',
    date: '2026-10-30',
    displayDate: '30/10/26',
    dayOfWeek: 'Friday',
    subject: 'Spell Bee / Reading',
    subjectId: 'spell-bee',
    notes: 'Spell bee / reading / Regular class',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g2-2026-10-31',
    date: '2026-10-31',
    displayDate: '31/10/26',
    dayOfWeek: 'Saturday',
    subject: 'Computer',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g2-2026-11-02',
    date: '2026-11-02',
    displayDate: '02/11/26',
    dayOfWeek: 'Monday',
    subject: 'Maths',
    subjectId: 'maths',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g2-2026-11-03',
    date: '2026-11-03',
    displayDate: '03/11/26',
    dayOfWeek: 'Tuesday',
    subject: 'English II',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g2-2026-11-04',
    date: '2026-11-04',
    displayDate: '04/11/26',
    dayOfWeek: 'Wednesday',
    subject: 'Study Leave',
    isStudyLeave: true,
    notes: 'Study Leave (-)'
  },
  {
    id: 'g2-2026-11-05',
    date: '2026-11-05',
    displayDate: '05/11/26',
    dayOfWeek: 'Thursday',
    subject: 'Malayalam (മലയാളം)',
    subjectId: 'malayalam',
    notes: 'Mal',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g2-2026-11-06',
    date: '2026-11-06',
    displayDate: '06/11/26',
    dayOfWeek: 'Friday',
    subject: 'English I',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g2-2026-11-09',
    date: '2026-11-09',
    displayDate: '09/11/26',
    dayOfWeek: 'Monday',
    subject: 'EVS',
    subjectId: 'evs',
    notes: 'Environmental Studies',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g2-2026-11-10',
    date: '2026-11-10',
    displayDate: '10/11/26',
    dayOfWeek: 'Tuesday',
    subject: 'Study Leave',
    isStudyLeave: true,
    notes: 'Study Leave (-)'
  },
  {
    id: 'g2-2026-11-11',
    date: '2026-11-11',
    displayDate: '11/11/26',
    dayOfWeek: 'Wednesday',
    subject: 'Hindi (हिन्दी)',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g2-2026-11-12',
    date: '2026-11-12',
    displayDate: '12/11/26',
    dayOfWeek: 'Thursday',
    subject: 'Study Leave',
    isStudyLeave: true,
    notes: 'Study Leave (-)'
  },
  {
    id: 'g2-2026-11-13',
    date: '2026-11-13',
    displayDate: '13/11/26',
    dayOfWeek: 'Friday',
    subject: 'SUPW / Moral Science / Regular class',
    notes: 'Supw//ms/ regular class'
  }
];

export const GRADE_6_TIMETABLE: TimetableEntry[] = [
  {
    id: 'g6-2026-10-28',
    date: '2026-10-28',
    displayDate: '28/10/26',
    dayOfWeek: 'Wednesday',
    subject: 'Spell Bee / Reading',
    subjectId: 'spell-bee',
    notes: 'Spell bee / Reading',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-10-29',
    date: '2026-10-29',
    displayDate: '29/10/26',
    dayOfWeek: 'Thursday',
    subject: 'Robotics',
    subjectId: 'robotics',
    notes: 'Robotics / Regular class',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-10-30',
    date: '2026-10-30',
    displayDate: '30/10/26',
    dayOfWeek: 'Friday',
    subject: 'GK / Computer',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-10-31',
    date: '2026-10-31',
    displayDate: '31/10/26',
    dayOfWeek: 'Saturday',
    subject: 'English I',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-11-02',
    date: '2026-11-02',
    displayDate: '02/11/26',
    dayOfWeek: 'Monday',
    subject: 'Maths',
    subjectId: 'maths',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-11-03',
    date: '2026-11-03',
    displayDate: '03/11/26',
    dayOfWeek: 'Tuesday',
    subject: 'Geography',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-11-04',
    date: '2026-11-04',
    displayDate: '04/11/26',
    dayOfWeek: 'Wednesday',
    subject: 'Physics',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-11-05',
    date: '2026-11-05',
    displayDate: '05/11/26',
    dayOfWeek: 'Thursday',
    subject: 'Hindi (हिन्दी)',
    subjectId: 'hindi',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-11-06',
    date: '2026-11-06',
    displayDate: '06/11/26',
    dayOfWeek: 'Friday',
    subject: 'Malayalam (മലയാളം)',
    subjectId: 'malayalam',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-11-09',
    date: '2026-11-09',
    displayDate: '09/11/26',
    dayOfWeek: 'Monday',
    subject: 'Chemistry',
    subjectId: 'chemistry',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-11-10',
    date: '2026-11-10',
    displayDate: '10/11/26',
    dayOfWeek: 'Tuesday',
    subject: 'English II',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-11-11',
    date: '2026-11-11',
    displayDate: '11/11/26',
    dayOfWeek: 'Wednesday',
    subject: 'Biology',
    subjectId: 'biology',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-11-12',
    date: '2026-11-12',
    displayDate: '12/11/26',
    dayOfWeek: 'Thursday',
    subject: 'History',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-11-13',
    date: '2026-11-13',
    displayDate: '13/11/26',
    dayOfWeek: 'Friday',
    subject: 'SUPW / Moral Science / Regular class',
    notes: 'Supw//ms/ regular class'
  }
];

export function getTimetableForGrade(grade: number): TimetableEntry[] {
  if (grade === 2) return GRADE_2_TIMETABLE;
  if (grade === 6) return GRADE_6_TIMETABLE;
  return [];
}

export function getExamStatus(examDate: string, referenceDateString?: string): 'past' | 'today' | 'upcoming' {
  const ref = referenceDateString ?? localCalendarDate(new Date());
  if (examDate < ref) return 'past';
  if (examDate === ref) return 'today';
  return 'upcoming';
}

export function getUpcomingExams(grade: number, referenceDateString?: string): TimetableEntry[] {
  const timetable = getTimetableForGrade(grade);
  const ref = referenceDateString ?? localCalendarDate(new Date());
  return timetable.filter(entry => entry.date >= ref);
}

export function getNextExam(grade: number, referenceDateString?: string): TimetableEntry | undefined {
  const upcoming = getUpcomingExams(grade, referenceDateString);
  return upcoming[0];
}

export function getNextActualExam(grade: number, referenceDateString?: string): TimetableEntry | undefined {
  const upcoming = getUpcomingExams(grade, referenceDateString);
  return upcoming.find(entry => !entry.isStudyLeave);
}
