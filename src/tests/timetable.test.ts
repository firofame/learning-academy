import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXAM_GENERAL_INFO,
  GRADE_2_TIMETABLE,
  GRADE_6_TIMETABLE,
  getTimetableForGrade,
  getExamStatus,
  getUpcomingExams,
  getNextExam,
  getNextActualExam
} from '../data/timetable';
import { getAvailableSubjectsForGrade, getSubjectForView } from '../data/subjects';

describe('Marion Villa Convent First Semester Exam Timetable', () => {
  test('general exam information captures school, timings, and dispersal rules accurately', () => {
    assert.equal(EXAM_GENERAL_INFO.schoolName, 'Marion Villa Convent ISC School');
    assert.equal(EXAM_GENERAL_INFO.examName, 'First Semester Examination');
    assert.equal(EXAM_GENERAL_INFO.academicYear, '2026-2027');
    assert.equal(EXAM_GENERAL_INFO.reportingTime, '8:10 AM');
    assert.equal(EXAM_GENERAL_INFO.morningAssembly, '8:15 AM');
    assert.ok(EXAM_GENERAL_INFO.twoHourTiming.includes('8:30 AM') && EXAM_GENERAL_INFO.twoHourTiming.includes('10:45 AM'));
    assert.ok(EXAM_GENERAL_INFO.threeHourTiming.includes('8:30 AM') && EXAM_GENERAL_INFO.threeHourTiming.includes('11:45 AM'));
    assert.ok(EXAM_GENERAL_INFO.dispersalNote.includes('11:00 AM') && EXAM_GENERAL_INFO.dispersalNote.includes('31/10/26'));
    assert.ok(EXAM_GENERAL_INFO.busTimingNote.includes('10:50 AM'));
  });

  test('Grade 2 timetable contains all 14 scheduled days from 28/10/26 to 13/11/26', () => {
    assert.equal(GRADE_2_TIMETABLE.length, 14);

    const expectedEntries = [
      { date: '2026-10-28', displayDate: '28/10/26', day: 'Wednesday', subject: 'Regular class / G.K', isLeave: false },
      { date: '2026-10-29', displayDate: '29/10/26', day: 'Thursday', subject: 'Robotics', subjectId: 'robotics', isLeave: false },
      { date: '2026-10-30', displayDate: '30/10/26', day: 'Friday', subject: 'Spell Bee / Reading', subjectId: 'spell-bee', isLeave: false },
      { date: '2026-10-31', displayDate: '31/10/26', day: 'Saturday', subject: 'Computer', isLeave: false },
      { date: '2026-11-02', displayDate: '02/11/26', day: 'Monday', subject: 'Maths', subjectId: 'maths', isLeave: false },
      { date: '2026-11-03', displayDate: '03/11/26', day: 'Tuesday', subject: 'English II', isLeave: false },
      { date: '2026-11-04', displayDate: '04/11/26', day: 'Wednesday', subject: 'Study Leave', isLeave: true },
      { date: '2026-11-05', displayDate: '05/11/26', day: 'Thursday', subject: 'Malayalam (മലയാളം)', subjectId: 'malayalam', isLeave: false },
      { date: '2026-11-06', displayDate: '06/11/26', day: 'Friday', subject: 'English I', isLeave: false },
      { date: '2026-11-09', displayDate: '09/11/26', day: 'Monday', subject: 'EVS', subjectId: 'evs', isLeave: false },
      { date: '2026-11-10', displayDate: '10/11/26', day: 'Tuesday', subject: 'Study Leave', isLeave: true },
      { date: '2026-11-11', displayDate: '11/11/26', day: 'Wednesday', subject: 'Hindi (हिन्दी)', isLeave: false },
      { date: '2026-11-12', displayDate: '12/11/26', day: 'Thursday', subject: 'Study Leave', isLeave: true },
      { date: '2026-11-13', displayDate: '13/11/26', day: 'Friday', subject: 'SUPW / Moral Science / Regular class', isLeave: false }
    ];

    expectedEntries.forEach((expected, i) => {
      const entry = GRADE_2_TIMETABLE[i];
      assert.equal(entry.date, expected.date, `Mismatch date at index ${i}`);
      assert.equal(entry.displayDate, expected.displayDate);
      assert.equal(entry.dayOfWeek, expected.day);
      assert.equal(entry.subject, expected.subject);
      assert.equal(Boolean(entry.isStudyLeave), expected.isLeave);
      if (expected.subjectId) {
        assert.equal(entry.subjectId, expected.subjectId);
      }
    });

    // Check handwritten correction
    assert.ok(GRADE_2_TIMETABLE[0].notes?.includes('Handwritten correction'));
  });

  test('Grade 6 timetable contains all 14 scheduled days from 28/10/26 to 13/11/26', () => {
    assert.equal(GRADE_6_TIMETABLE.length, 14);

    const expectedEntries = [
      { date: '2026-10-28', displayDate: '28/10/26', day: 'Wednesday', subject: 'Spell Bee / Reading', subjectId: 'spell-bee' },
      { date: '2026-10-29', displayDate: '29/10/26', day: 'Thursday', subject: 'Robotics', subjectId: 'robotics' },
      { date: '2026-10-30', displayDate: '30/10/26', day: 'Friday', subject: 'GK / Computer' },
      { date: '2026-10-31', displayDate: '31/10/26', day: 'Saturday', subject: 'English I' },
      { date: '2026-11-02', displayDate: '02/11/26', day: 'Monday', subject: 'Maths', subjectId: 'maths' },
      { date: '2026-11-03', displayDate: '03/11/26', day: 'Tuesday', subject: 'Geography' },
      { date: '2026-11-04', displayDate: '04/11/26', day: 'Wednesday', subject: 'Physics' },
      { date: '2026-11-05', displayDate: '05/11/26', day: 'Thursday', subject: 'Hindi (हिन्दी)', subjectId: 'hindi' },
      { date: '2026-11-06', displayDate: '06/11/26', day: 'Friday', subject: 'Malayalam (മലയാളം)', subjectId: 'malayalam' },
      { date: '2026-11-09', displayDate: '09/11/26', day: 'Monday', subject: 'Chemistry', subjectId: 'chemistry' },
      { date: '2026-11-10', displayDate: '10/11/26', day: 'Tuesday', subject: 'English II' },
      { date: '2026-11-11', displayDate: '11/11/26', day: 'Wednesday', subject: 'Biology', subjectId: 'biology' },
      { date: '2026-11-12', displayDate: '12/11/26', day: 'Thursday', subject: 'History' },
      { date: '2026-11-13', displayDate: '13/11/26', day: 'Friday', subject: 'SUPW / Moral Science / Regular class' }
    ];

    expectedEntries.forEach((expected, i) => {
      const entry = GRADE_6_TIMETABLE[i];
      assert.equal(entry.date, expected.date, `Mismatch date at index ${i}`);
      assert.equal(entry.displayDate, expected.displayDate);
      assert.equal(entry.dayOfWeek, expected.day);
      assert.equal(entry.subject, expected.subject);
      if (expected.subjectId) {
        assert.equal(entry.subjectId, expected.subjectId);
      }
      if (entry.sessionTime) {
        assert.equal(entry.sessionTime, '8:30 AM – 10:45 AM');
      }
    });
  });

  test('preserves Malayalam and Hindi scripts in timetable entries', () => {
    // Both Grade 2 and Grade 6 contain native scripts for Malayalam and Hindi
    const g2Malayalam = GRADE_2_TIMETABLE.find(e => e.date === '2026-11-05');
    const g2Hindi = GRADE_2_TIMETABLE.find(e => e.date === '2026-11-11');
    assert.ok(g2Malayalam?.subject.includes('മലയാളം'));
    assert.ok(g2Hindi?.subject.includes('हिन्दी'));

    const g6Malayalam = GRADE_6_TIMETABLE.find(e => e.date === '2026-11-06');
    const g6Hindi = GRADE_6_TIMETABLE.find(e => e.date === '2026-11-05');
    assert.ok(g6Malayalam?.subject.includes('മലയാളം'));
    assert.ok(g6Hindi?.subject.includes('हिन्दी'));
  });

  test('timetable subject mappings strictly match available grade revision subjects in the app', () => {
    const grade2Available = getAvailableSubjectsForGrade(2).map(s => s.id);
    const grade6Available = getAvailableSubjectsForGrade(6).map(s => s.id);

    for (const entry of GRADE_2_TIMETABLE) {
      if (entry.subjectId) {
        assert.ok(
          grade2Available.includes(entry.subjectId),
          `Grade 2 entry ${entry.subject} has subjectId ${entry.subjectId} which is not available for Grade 2`
        );
      }
    }

    for (const entry of GRADE_6_TIMETABLE) {
      if (entry.subjectId) {
        assert.ok(
          grade6Available.includes(entry.subjectId),
          `Grade 6 entry ${entry.subject} has subjectId ${entry.subjectId} which is not available for Grade 6`
        );
      }
    }
  });

  test('helper functions handle grade lookup, edge dates, and status transitions', () => {
    assert.equal(getTimetableForGrade(2), GRADE_2_TIMETABLE);
    assert.equal(getTimetableForGrade(6), GRADE_6_TIMETABLE);
    assert.deepEqual(getTimetableForGrade(1), []);
    assert.deepEqual(getTimetableForGrade(99), []);

    // Status calculations
    assert.equal(getExamStatus('2026-10-28', '2026-11-07'), 'past');
    assert.equal(getExamStatus('2026-11-07', '2026-11-07'), 'today');
    assert.equal(getExamStatus('2026-11-09', '2026-11-07'), 'upcoming');

    // Upcoming exams from mid-exam period (e.g. 2026-11-07)
    const upcomingG2 = getUpcomingExams(2, '2026-11-07');
    assert.equal(upcomingG2.length, 5); // 09/11 EVS, 10/11 Study Leave, 11/11 Hindi, 12/11 Study Leave, 13/11 SUPW
    assert.equal(upcomingG2[0].date, '2026-11-09');
    assert.equal(upcomingG2[0].subject, 'EVS');

    const nextG2 = getNextExam(2, '2026-11-07');
    assert.equal(nextG2?.date, '2026-11-09');
    assert.equal(nextG2?.subject, 'EVS');
    assert.equal(getNextActualExam(2, '2026-11-07')?.date, '2026-11-09');

    const nextG6 = getNextExam(6, '2026-11-07');
    assert.equal(nextG6?.date, '2026-11-09');
    assert.equal(nextG6?.subject, 'Chemistry');
    assert.equal(getNextActualExam(6, '2026-11-07')?.date, '2026-11-09');

    // Study leave day edge case (e.g. 2026-11-04 is study leave for Grade 2)
    const onStudyLeaveDay = getNextExam(2, '2026-11-04');
    assert.equal(onStudyLeaveDay?.date, '2026-11-04');
    assert.equal(onStudyLeaveDay?.isStudyLeave, true);
    // getNextActualExam correctly identifies the upcoming exam after study leave
    const actualAfterLeave = getNextActualExam(2, '2026-11-04');
    assert.equal(actualAfterLeave?.date, '2026-11-05');
    assert.equal(actualAfterLeave?.subject, 'Malayalam (മലയാളം)');

    // Edge case: all exams completed
    const pastAll = getUpcomingExams(2, '2026-11-20');
    assert.deepEqual(pastAll, []);
    assert.equal(getNextExam(2, '2026-11-20'), undefined);
    assert.equal(getNextActualExam(2, '2026-11-20'), undefined);

    // Edge case: before exams started
    const beforeAll = getUpcomingExams(2, '2026-10-01');
    assert.equal(beforeAll.length, 14);
    assert.equal(getNextExam(2, '2026-10-01')?.date, '2026-10-28');
    assert.equal(getNextActualExam(2, '2026-10-01')?.date, '2026-10-28');
  });

  test('timetable view does not collide with learning subjects', () => {
    assert.equal(getSubjectForView('timetable'), undefined);
    assert.equal(getSubjectForView('home'), undefined);
    assert.equal(getSubjectForView('progress'), undefined);
  });
});
