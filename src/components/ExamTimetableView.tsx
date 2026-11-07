import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar, Clock, Bus, AlertCircle, Printer, BookOpen, Sparkles } from 'lucide-react';
import { ActiveAppView, StudentId } from '../types';
import { getStudentProfile, STUDENT_PROFILES } from '../data/profiles';
import { getAvailableSubjectsForGrade, LEARNING_SUBJECTS } from '../data/subjects';
import {
  EXAM_GENERAL_INFO,
  getTimetableForGrade,
  getExamStatus,
  getNextExam,
  getNextActualExam,
  TimetableEntry
} from '../data/timetable';

interface ExamTimetableViewProps {
  activeStudent: StudentId;
  onNavigate: (view: ActiveAppView) => void;
  onSwitchStudent?: (studentId: StudentId) => void;
}

export const ExamTimetableView: React.FC<ExamTimetableViewProps> = ({
  activeStudent,
  onNavigate,
  onSwitchStudent
}) => {
  const currentProfile = getStudentProfile(activeStudent);
  const availableSubjects = getAvailableSubjectsForGrade(currentProfile.grade);
  const timetable = getTimetableForGrade(currentProfile.grade);
  const nextExam = getNextExam(currentProfile.grade);
  const nextActualExam = getNextActualExam(currentProfile.grade);

  const handleSelectStudent = (studentId: StudentId) => {
    if (onSwitchStudent && studentId !== activeStudent) {
      onSwitchStudent(studentId);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10 space-y-8">
      {/* Top action bar: back, print & learner selector */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <button
          onClick={() => onNavigate('home')}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Subjects</span>
        </button>

        {/* Learner Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {STUDENT_PROFILES.map(profile => (
            <button
              key={profile.id}
              onClick={() => handleSelectStudent(profile.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeStudent === profile.id
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{profile.avatarEmoji}</span>
              <span>{profile.name}</span>
              <span className="text-slate-400 font-normal">({profile.gradeLabel})</span>
            </button>
          ))}
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Print Schedule</span>
        </button>
      </div>

      {/* Main Header Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
              <Calendar className="w-4 h-4" />
              <span>{EXAM_GENERAL_INFO.schoolName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {EXAM_GENERAL_INFO.examName} ({EXAM_GENERAL_INFO.academicYear})
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Official schedule for <span className="font-semibold text-slate-900">{currentProfile.name}</span> ({currentProfile.gradeLabel})
            </p>
          </div>
          <div className="sm:text-right shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
              <Sparkles className="w-3.5 h-3.5" />
              {currentProfile.gradeLabel} Timetable
            </span>
          </div>
        </div>

        {/* Next Exam Spotlight Banner (if upcoming) */}
        {nextExam && (() => {
          const targetEntry = nextExam.isStudyLeave ? nextActualExam : nextExam;
          const targetSubject = targetEntry?.subjectId && availableSubjects.some(s => s.id === targetEntry.subjectId)
            ? LEARNING_SUBJECTS.find(s => s.id === targetEntry.subjectId)
            : undefined;

          return (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  {nextExam.isStudyLeave
                    ? `Study Leave · ${nextExam.displayDate} (${nextExam.dayOfWeek})`
                    : `Next On Schedule · ${nextExam.displayDate} (${nextExam.dayOfWeek})`}
                </p>
                <p className="text-base font-bold text-slate-900">
                  {nextExam.subject}
                </p>
                {nextExam.isStudyLeave ? (
                  nextActualExam ? (
                    <p className="text-xs text-slate-600">
                      Self revision day. Next exam is <span className="font-semibold text-slate-800">{nextActualExam.subject}</span> on {nextActualExam.displayDate} ({nextActualExam.dayOfWeek}).
                    </p>
                  ) : (
                    <p className="text-xs text-slate-600">Self revision day (no school attendance).</p>
                  )
                ) : (
                  nextExam.notes && <p className="text-xs text-slate-600">{nextExam.notes}</p>
                )}
              </div>
              {targetSubject && (
                <button
                  onClick={() => onNavigate(targetSubject.startView)}
                  className="no-print self-start sm:self-auto px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
                >
                  Revise {targetSubject.name} Now
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* General Instructions & Timings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Reporting & Assembly</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Reach school by <span className="font-semibold text-slate-800">{EXAM_GENERAL_INFO.reportingTime}</span>. Morning Assembly starts at <span className="font-semibold text-slate-800">{EXAM_GENERAL_INFO.morningAssembly}</span>.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Examination Timing</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {EXAM_GENERAL_INFO.twoHourTiming}<br />
            {EXAM_GENERAL_INFO.threeHourTiming}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Bus className="w-4 h-4 text-amber-600" />
            <span>Bus & Dispersal</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {EXAM_GENERAL_INFO.dispersalNote}<br />
            {EXAM_GENERAL_INFO.busTimingNote}
          </p>
        </div>
      </div>

      {/* Full Day-by-Day Timetable */}
      <section aria-label="Exam Schedule" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Day-by-Day Exam Timetable
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {timetable.length} Scheduled Days
          </span>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
          {timetable.map((entry: TimetableEntry) => {
            const status = getExamStatus(entry.date);
            const isRevisableInApp = entry.subjectId && availableSubjects.some(s => s.id === entry.subjectId);
            const targetSubject = isRevisableInApp ? LEARNING_SUBJECTS.find(s => s.id === entry.subjectId) : undefined;

            return (
              <div
                key={entry.id}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  status === 'today'
                    ? 'bg-amber-50/50'
                    : entry.isStudyLeave
                    ? 'bg-slate-50/60'
                    : 'bg-white hover:bg-slate-50/80'
                }`}
              >
                {/* Date & Day */}
                <div className="sm:w-48 shrink-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-base">
                      {entry.displayDate}
                    </span>
                    {status === 'today' && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500 text-white uppercase tracking-wider">
                        Today
                      </span>
                    )}
                    {status === 'past' && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-200 text-slate-700">
                        Completed
                      </span>
                    )}
                    {status === 'upcoming' && !entry.isStudyLeave && (
                      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        Upcoming
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-500">{entry.dayOfWeek}</p>
                </div>

                {/* Subject & Details */}
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`text-base font-bold ${entry.isStudyLeave ? 'text-slate-600 italic' : 'text-slate-900'}`}>
                      {entry.subject}
                    </h3>
                    {entry.isStudyLeave && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700">
                        Study Leave
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                    {entry.sessionTime && <span>🕒 {entry.sessionTime}</span>}
                    {entry.notes && <span className="text-slate-600">📝 {entry.notes}</span>}
                  </div>
                </div>

                {/* Revision Action */}
                <div className="sm:w-44 flex items-center justify-end shrink-0">
                  {targetSubject ? (
                    <button
                      onClick={() => onNavigate(targetSubject.startView)}
                      className="no-print w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Revise {targetSubject.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : entry.isStudyLeave ? (
                    <span className="text-xs font-semibold text-slate-400 italic">Self Revision Day</span>
                  ) : (
                    <span className="text-xs text-slate-400">School Portions</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* General Notes Footer Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <AlertCircle className="w-4 h-4 text-amber-700" />
          <span>General Exam Guidelines</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-600 leading-relaxed">
          {EXAM_GENERAL_INFO.instructions.map((inst, idx) => (
            <li key={idx}>{inst}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
