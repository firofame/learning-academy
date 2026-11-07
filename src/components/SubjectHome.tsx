import React from 'react';
import { ArrowRight, BookOpen, Bot, Calculator, Languages, Leaf, Dna, FlaskConical, Calendar } from 'lucide-react';
import { ActiveAppView, StudentId } from '../types';
import { getStudentProfile } from '../data/profiles';
import { getAvailableSubjectsForGrade, LEARNING_SUBJECTS } from '../data/subjects';
import { EXAM_GENERAL_INFO, getNextExam, getNextActualExam } from '../data/timetable';

interface SubjectHomeProps {
  activeStudent: StudentId;
  onNavigate: (view: ActiveAppView) => void;
}

export const SubjectHome: React.FC<SubjectHomeProps> = ({ activeStudent, onNavigate }) => {
  const profile = getStudentProfile(activeStudent);
  const subjects = getAvailableSubjectsForGrade(profile.grade);
  const nextExam = getNextExam(profile.grade);
  const nextActualExam = getNextActualExam(profile.grade);

  const targetEntry = nextExam?.isStudyLeave ? nextActualExam : nextExam;
  const targetSubject = targetEntry?.subjectId && subjects.some(s => s.id === targetEntry.subjectId)
    ? LEARNING_SUBJECTS.find(s => s.id === targetEntry.subjectId)
    : undefined;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">
          {profile.name} · {profile.gradeLabel}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          What would you like to learn?
        </h1>
        <p className="text-base text-slate-600 max-w-2xl">
          Choose a subject to get started. Only subjects available for {profile.gradeLabel} are shown.
        </p>
      </header>

      {/* Exam Timetable Spotlight */}
      <section aria-label="First Semester Exam Schedule" className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/50 border border-amber-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-amber-700" />
            <span>{EXAM_GENERAL_INFO.examName} · {EXAM_GENERAL_INFO.schoolName}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            {nextExam ? (
              nextExam.isStudyLeave ? (
                <span>Study Leave ({nextExam.displayDate})</span>
              ) : (
                <span>Next Exam: {nextExam.subject} ({nextExam.displayDate})</span>
              )
            ) : (
              <span>First Semester Exam Timetable</span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            {nextExam?.isStudyLeave ? (
              nextActualExam ? (
                <span>Self revision day. Next exam is <strong className="text-slate-800 font-semibold">{nextActualExam.subject}</strong> on {nextActualExam.displayDate} ({nextActualExam.dayOfWeek}).</span>
              ) : (
                <span>Self revision day (no school attendance).</span>
              )
            ) : nextExam ? (
              <span>{nextExam.notes ? `${nextExam.notes} · ` : ''}Morning Assembly at {EXAM_GENERAL_INFO.morningAssembly} (reach by {EXAM_GENERAL_INFO.reportingTime}).</span>
            ) : (
              <span>View full exam schedule, timings, and dispersal notes for {profile.name}.</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {targetSubject && (
            <button
              onClick={() => onNavigate(targetSubject.startView)}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span>Revise {targetSubject.name} Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onNavigate('timetable')}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
              targetSubject
                ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            <span>View Full Timetable</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <section aria-label={`Subjects for ${profile.gradeLabel}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {subjects.map(subject => (
          <article key={subject.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col items-start gap-4">
            {subject.id === 'robotics' ? (
              <Bot className="w-8 h-8 text-teal-700" aria-hidden="true" />
            ) : subject.id === 'maths' ? (
              <Calculator className="w-8 h-8 text-indigo-700" aria-hidden="true" />
            ) : subject.id === 'malayalam' || subject.id === 'hindi' ? (
              <Languages className="w-8 h-8 text-amber-700" aria-hidden="true" />
            ) : subject.id === 'evs' ? (
              <Leaf className="w-8 h-8 text-emerald-700" aria-hidden="true" />
            ) : subject.id === 'biology' ? (
              <Dna className="w-8 h-8 text-emerald-700" aria-hidden="true" />
            ) : subject.id === 'chemistry' ? (
              <FlaskConical className="w-8 h-8 text-purple-700" aria-hidden="true" />
            ) : (
              <BookOpen className="w-8 h-8 text-amber-700" aria-hidden="true" />
            )}
            <div className="space-y-2 flex-1">
              <h2 className="text-2xl font-bold text-slate-900">{subject.name}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{subject.description}</p>
            </div>
            <button
              onClick={() => onNavigate(subject.startView)}
              className="min-h-12 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              Open {subject.name} <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </article>
        ))}
        {subjects.length === 0 && (
          <p role="status" className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
            No subjects are available for {profile.gradeLabel} yet. Please choose another student profile to explore its subjects.
          </p>
        )}
      </section>
    </div>
  );
};
