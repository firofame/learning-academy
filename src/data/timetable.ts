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
  isHoliday?: boolean;
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
    subjectId: 'hindi',
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
    subjectId: 'english',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-11-11',
    date: '2026-11-11',
    displayDate: '11/11/26',
    dayOfWeek: 'Wednesday',
    subject: 'Holiday',
    isStudyLeave: true,
    isHoliday: true,
    notes: 'Holiday'
  },
  {
    id: 'g6-2026-11-12',
    date: '2026-11-12',
    displayDate: '12/11/26',
    dayOfWeek: 'Thursday',
    subject: 'History / MS',
    sessionTime: '8:30 AM – 10:45 AM'
  },
  {
    id: 'g6-2026-11-13',
    date: '2026-11-13',
    displayDate: '13/11/26',
    dayOfWeek: 'Friday',
    subject: 'Biology / SUPW',
    subjectId: 'biology',
    notes: 'Biology / SUPW',
    sessionTime: '8:30 AM – 10:45 AM'
  }
];

export const DEFAULT_EXAM_DISPERSAL_TIME = '11:00';

export interface ParsedReferenceDateTime {
  date: string;
  time?: string;
}

export function normalizeTimeString(timeStr?: string): string | undefined {
  if (!timeStr) return undefined;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?(?:\.\d+)?\s*(AM|PM)?$/i);
  if (!match) return undefined;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3]?.toUpperCase();
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  if (hours < 0 || hours > 23 || parseInt(minutes, 10) < 0 || parseInt(minutes, 10) > 59) {
    return undefined;
  }
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

export function parseReferenceDateTime(
  reference?: string | Date | ParsedReferenceDateTime,
  referenceTime?: string
): ParsedReferenceDateTime {
  const normTime = normalizeTimeString(referenceTime);

  if (!reference) {
    const now = new Date();
    const date = localCalendarDate(now);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return { date, time: normTime ?? `${hours}:${minutes}` };
  }

  if (typeof reference === 'object' && 'date' in reference) {
    return {
      date: reference.date,
      time: normTime ?? normalizeTimeString(reference.time)
    };
  }

  if (reference instanceof Date) {
    const date = localCalendarDate(reference);
    const hours = String(reference.getHours()).padStart(2, '0');
    const minutes = String(reference.getMinutes()).padStart(2, '0');
    return { date, time: normTime ?? `${hours}:${minutes}` };
  }

  if (typeof reference === 'string') {
    const trimmed = reference.trim();
    if (trimmed.includes('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        const date = localCalendarDate(d);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return { date, time: normTime ?? `${hours}:${minutes}` };
      }
    }

    if (trimmed.includes('T') || trimmed.includes(' ')) {
      const parts = trimmed.split(/[T ]/);
      const datePart = parts[0];
      const timePart = parts.slice(1).join(' ').trim();
      return {
        date: datePart,
        time: normTime ?? normalizeTimeString(timePart)
      };
    }

    return {
      date: trimmed,
      time: normTime
    };
  }

  const now = new Date();
  const date = localCalendarDate(now);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return { date, time: normTime ?? `${hours}:${minutes}` };
}

export function getExamEndCutoffTime(entry: TimetableEntry): string {
  if (!entry.sessionTime) {
    return DEFAULT_EXAM_DISPERSAL_TIME;
  }
  const match = entry.sessionTime.match(/[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3]?.toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    const sessionEndTime = `${String(hours).padStart(2, '0')}:${minutes}`;
    return sessionEndTime > DEFAULT_EXAM_DISPERSAL_TIME ? sessionEndTime : DEFAULT_EXAM_DISPERSAL_TIME;
  }
  return DEFAULT_EXAM_DISPERSAL_TIME;
}

export function isExamPast(
  entry: TimetableEntry,
  reference?: string | Date | ParsedReferenceDateTime,
  referenceTime?: string
): boolean {
  const parsedRef = parseReferenceDateTime(reference, referenceTime);

  if (entry.date < parsedRef.date) {
    return true;
  }
  if (entry.date > parsedRef.date) {
    return false;
  }

  // Same date (entry.date === parsedRef.date)
  if (!parsedRef.time) {
    return false;
  }

  // Study leave days and holidays are whole-day self-revision days with no exam hours or dispersal
  if (entry.isStudyLeave || entry.isHoliday) {
    return false;
  }

  const cutoff = getExamEndCutoffTime(entry);
  return parsedRef.time >= cutoff;
}

export function getTimetableForGrade(grade: number): TimetableEntry[] {
  if (grade === 2) return GRADE_2_TIMETABLE;
  if (grade === 6) return GRADE_6_TIMETABLE;
  return [];
}

export function getExamStatus(
  entryOrDate: string | TimetableEntry,
  reference?: string | Date | ParsedReferenceDateTime,
  referenceTimeOrGrade?: string | number,
  gradeParam?: number
): 'past' | 'today' | 'upcoming' {
  const grade = typeof referenceTimeOrGrade === 'number' ? referenceTimeOrGrade : gradeParam;
  const referenceTime = typeof referenceTimeOrGrade === 'string' ? referenceTimeOrGrade : undefined;
  const parsedRef = parseReferenceDateTime(reference, referenceTime);
  const examDate = typeof entryOrDate === 'string' ? entryOrDate : entryOrDate.date;

  if (examDate < parsedRef.date) return 'past';
  if (examDate > parsedRef.date) return 'upcoming';

  // examDate === parsedRef.date
  if (!parsedRef.time) {
    return 'today';
  }

  let entry: TimetableEntry | undefined;
  if (typeof entryOrDate === 'object') {
    entry = entryOrDate;
  } else if (grade) {
    entry = getTimetableForGrade(grade).find(e => e.date === examDate);
  } else {
    entry = GRADE_2_TIMETABLE.find(e => e.date === examDate) ?? GRADE_6_TIMETABLE.find(e => e.date === examDate);
  }

  if (entry) {
    return isExamPast(entry, parsedRef) ? 'past' : 'today';
  }

  return parsedRef.time >= DEFAULT_EXAM_DISPERSAL_TIME ? 'past' : 'today';
}

export function getUpcomingExams(
  grade: number,
  reference?: string | Date | ParsedReferenceDateTime,
  referenceTime?: string
): TimetableEntry[] {
  const timetable = getTimetableForGrade(grade);
  const parsedRef = parseReferenceDateTime(reference, referenceTime);
  return timetable.filter(entry => !isExamPast(entry, parsedRef));
}

export function getNextExam(
  grade: number,
  reference?: string | Date | ParsedReferenceDateTime,
  referenceTime?: string
): TimetableEntry | undefined {
  const upcoming = getUpcomingExams(grade, reference, referenceTime);
  return upcoming[0];
}

export function getNextActualExam(
  grade: number,
  reference?: string | Date | ParsedReferenceDateTime,
  referenceTime?: string
): TimetableEntry | undefined {
  const upcoming = getUpcomingExams(grade, reference, referenceTime);
  return upcoming.find(entry => !entry.isStudyLeave && !entry.isHoliday);
}

export function getNextAppExam(
  grade: number,
  reference?: string | Date | ParsedReferenceDateTime,
  referenceTime?: string
): TimetableEntry | undefined {
  const upcoming = getUpcomingExams(grade, reference, referenceTime);
  return upcoming.find(entry => !entry.isStudyLeave && !entry.isHoliday && Boolean(entry.subjectId));
}

export function getSubjectExamStatus(
  subjectId: LearningSubjectId,
  grade: number,
  reference?: string | Date | ParsedReferenceDateTime,
  referenceTime?: string
): 'past' | 'today' | 'upcoming' | 'unscheduled' {
  const entries = getTimetableForGrade(grade).filter(e => e.subjectId === subjectId);
  if (entries.length === 0) return 'unscheduled';
  const parsedRef = parseReferenceDateTime(reference, referenceTime);
  const statuses = entries.map(entry => getExamStatus(entry, parsedRef));
  if (statuses.includes('today')) return 'today';
  if (statuses.includes('upcoming')) return 'upcoming';
  return 'past';
}

export function isSubjectUpcomingOrToday(
  subjectId: LearningSubjectId,
  grade: number,
  reference?: string | Date | ParsedReferenceDateTime,
  referenceTime?: string
): boolean {
  const status = getSubjectExamStatus(subjectId, grade, reference, referenceTime);
  if (status === 'unscheduled') return true;
  return status === 'upcoming' || status === 'today';
}
