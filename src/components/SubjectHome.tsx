import React, { useState, useEffect } from 'react';
import {
  ArrowRight, BookOpen, Bot, Calculator, Languages, Leaf, Dna, FlaskConical,
  Calendar, RotateCw, ChevronDown, ChevronUp, Clock, Bus, AlertCircle, Sparkles
} from 'lucide-react';
import { ActiveAppView, StudentId } from '../types';
import type { LearningAttempt } from '../learning/contracts';
import { getStudentProfile } from '../data/profiles';
import { getAvailableSubjectsForGrade, LEARNING_SUBJECTS } from '../data/subjects';
import {
  EXAM_GENERAL_INFO, getNextExam, getNextActualExam,
  getTimetableForGrade, getExamStatus, type TimetableEntry
} from '../data/timetable';
import { useSubjectProgress } from '../learning/useSubjectProgress';

interface SubjectHomeProps {
  activeStudent: StudentId;
  onNavigate: (view: ActiveAppView) => void;
  initialShowTimetable?: boolean;
}

function outcomeLabel(attempt: LearningAttempt): string {
  if (attempt.outcome === 'ungraded') return 'Not checked · retry needed';
  if (attempt.outcome === 'skipped') return 'Skipped · return later';
  return attempt.outcome === 'correct' ? 'Correct' : 'Needs review';
}

export const SubjectHome: React.FC<SubjectHomeProps> = ({ activeStudent, onNavigate, initialShowTimetable }) => {
  const profile = getStudentProfile(activeStudent);
  const subjects = getAvailableSubjectsForGrade(profile.grade);
  const nextExam = getNextExam(profile.grade);
  const nextActualExam = getNextActualExam(profile.grade);
  const timetable = getTimetableForGrade(profile.grade);

  const [showAllAttempts, setShowAllAttempts] = useState(false);
  const [showTimetable, setShowTimetable] = useState(initialShowTimetable ?? false);

  useEffect(() => {
    if (initialShowTimetable) {
      setShowTimetable(true);
    }
  }, [initialShowTimetable]);

  const {
    loading,
    error,
    summaryMap,
    attempts,
    totalQuestions,
    totalChecked,
    totalPending,
    overallPercentage
  } = useSubjectProgress(activeStudent);

  const targetEntry = nextExam?.isStudyLeave ? nextActualExam : nextExam;
  const targetSubject = targetEntry?.subjectId && subjects.some(s => s.id === targetEntry.subjectId)
    ? LEARNING_SUBJECTS.find(s => s.id === targetEntry.subjectId)
    : undefined;

  const subjectNames = new Map(LEARNING_SUBJECTS.map(subject => [subject.id, subject.name]));
  const recentAttempts = [...attempts].reverse().slice(0, 15);

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Screen-reader accessible heading; visual space saved for mobile */}
      <h1 className="sr-only">What would you like to learn?</h1>

      {error && (
        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          {error}
        </p>
      )}

      {/* Exam Timetable Spotlight & Expandable Schedule */}
      <section aria-label="First Semester Exam Schedule" className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden transition-all">
        {/* Spotlight Top Banner */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/50 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              onClick={() => setShowTimetable(prev => !prev)}
              aria-expanded={showTimetable}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                showTimetable
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                  : targetSubject
                  ? 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>{showTimetable ? 'Hide Timetable' : 'View Full Timetable'}</span>
              {showTimetable ? (
                <ChevronUp className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Timetable Details */}
        {showTimetable && (
          <div className="border-t border-slate-200/80 p-5 sm:p-6 space-y-6 bg-slate-50/40">
            {/* Header info bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                  <Sparkles className="w-3.5 h-3.5" />
                  {profile.gradeLabel} Timetable · {timetable.length} Scheduled Days
                </span>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {EXAM_GENERAL_INFO.academicYear}
                </span>
              </div>
              <button
                onClick={() => setShowTimetable(false)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg cursor-pointer"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
            </div>

            {/* General Instructions & Timings Cards (3 cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>Reporting & Assembly</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Reach school by <strong className="text-slate-800 font-semibold">{EXAM_GENERAL_INFO.reportingTime}</strong>. Morning Assembly at <strong className="text-slate-800 font-semibold">{EXAM_GENERAL_INFO.morningAssembly}</strong>.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>Examination Timing</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {EXAM_GENERAL_INFO.twoHourTiming}<br />
                  {EXAM_GENERAL_INFO.threeHourTiming}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs sm:text-sm">
                  <Bus className="w-4 h-4 text-amber-600" />
                  <span>Bus & Dispersal</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {EXAM_GENERAL_INFO.dispersalNote}<br />
                  {EXAM_GENERAL_INFO.busTimingNote}
                </p>
              </div>
            </div>

            {/* Day-by-Day Exam Timetable */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Day-by-Day Schedule for {profile.name}
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  {timetable.length} entries
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {timetable.map((entry: TimetableEntry) => {
                  const status = getExamStatus(entry.date);
                  const isRevisableInApp = entry.subjectId && subjects.some(s => s.id === entry.subjectId);
                  const targetSub = isRevisableInApp ? LEARNING_SUBJECTS.find(s => s.id === entry.subjectId) : undefined;

                  return (
                    <div
                      key={entry.id}
                      className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        status === 'today'
                          ? 'bg-amber-50/60'
                          : entry.isStudyLeave
                          ? 'bg-slate-50/70'
                          : 'bg-white hover:bg-slate-50/70'
                      }`}
                    >
                      {/* Date & Day */}
                      <div className="sm:w-44 shrink-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm sm:text-base">
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
                      <div className="flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className={`text-sm sm:text-base font-bold ${entry.isStudyLeave ? 'text-slate-600 italic' : 'text-slate-900'}`}>
                            {entry.subject}
                          </h4>
                          {entry.isStudyLeave && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700">
                              Study Leave
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          {entry.sessionTime && <span>🕒 {entry.sessionTime}</span>}
                          {entry.notes && <span className="text-slate-600">📝 {entry.notes}</span>}
                        </div>
                      </div>

                      {/* Revision Action */}
                      <div className="sm:w-40 flex items-center sm:justify-end shrink-0">
                        {targetSub ? (
                          <button
                            onClick={() => onNavigate(targetSub.startView)}
                            className="no-print w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Revise {targetSub.name}</span>
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
            </div>

            {/* General Notes Footer Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1.5 shadow-xs">
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

            {/* Bottom Collapse Button */}
            <div className="no-print flex justify-center pt-2">
              <button
                onClick={() => setShowTimetable(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <ChevronUp className="w-4 h-4" />
                <span>Collapse Timetable</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Overall Revision Coverage Bar */}
      <section aria-label="Current revision coverage" className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Revision Coverage</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              {loading ? (
                'Loading revision coverage…'
              ) : totalQuestions > 0 ? (
                `${totalChecked} of ${totalQuestions} questions checked across all subjects (${overallPercentage}%)`
              ) : (
                'No revision questions scheduled'
              )}
            </p>
          </div>
          {totalPending > 0 && (
            <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <RotateCw className="w-3 h-3 text-amber-700" />
              {totalPending} question{totalPending > 1 ? 's' : ''} to recheck
            </span>
          )}
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-amber-500 h-2.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${overallPercentage}%` }}
            role="progressbar"
            aria-valuenow={overallPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </section>

      {/* Subjects Grid */}
      <section aria-label={`Subjects for ${profile.gradeLabel}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {subjects.map(subject => {
          const summary = summaryMap.get(subject.id);
          const isComplete = summary && summary.questionCount > 0 && summary.checkedCount === summary.questionCount;
          const subjectPct = summary && summary.questionCount > 0 ? Math.round((summary.checkedCount / summary.questionCount) * 100) : 0;

          return (
            <article key={subject.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-5 transition-all hover:border-slate-300">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
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

                  {summary && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      isComplete
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : summary.checkedCount > 0
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {isComplete
                        ? 'Completed'
                        : summary.checkedCount > 0
                        ? `${summary.checkedCount}/${summary.questionCount} checked`
                        : 'Not started'}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900">{subject.name}</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{subject.description}</p>
                </div>

                {summary && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Coverage</span>
                      <span className="font-semibold text-slate-700">{subjectPct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          isComplete ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${subjectPct}%` }}
                      />
                    </div>
                    {summary.pendingCount > 0 && (
                      <p className="text-[11px] text-amber-700 font-medium pt-0.5">
                        {summary.pendingCount} to recheck{summary.readyCount > 0 ? ` (${summary.readyCount} ready)` : ''}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => onNavigate(subject.startView)}
                className="w-full min-h-11 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <span>Open {subject.name}</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </article>
          );
        })}
        {subjects.length === 0 && (
          <p role="status" className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
            No subjects are available for {profile.gradeLabel} yet. Please choose another student profile to explore its subjects.
          </p>
        )}
      </section>

      {/* Recent Activity Feed */}
      <section aria-label="Recent learning history" className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Latest completed answers and feedback
            </p>
          </div>
          {recentAttempts.length > 5 && (
            <button
              onClick={() => setShowAllAttempts(prev => !prev)}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 cursor-pointer"
            >
              {showAllAttempts ? 'Show fewer' : `View all (${recentAttempts.length})`}
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 py-3">Loading saved answers…</p>
        ) : recentAttempts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
            No completed revision answers yet. Choose a subject above to get started!
          </div>
        ) : (
          <ol className="divide-y divide-slate-100">
            {(showAllAttempts ? recentAttempts : recentAttempts.slice(0, 5)).map(attempt => (
              <li key={attempt.attemptId} className="py-3 first:pt-0 last:pb-0 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-800">
                      {subjectNames.get(attempt.subjectId) ?? attempt.subjectId}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                      attempt.outcome === 'correct'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : attempt.outcome === 'skipped'
                        ? 'bg-slate-50 text-slate-600 border-slate-200'
                        : attempt.outcome === 'ungraded'
                        ? 'bg-slate-50 text-slate-600 border-slate-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {outcomeLabel(attempt)}
                    </span>
                    {attempt.revisionAttemptKind === 'recheck' && (
                      <span className="text-[11px] text-slate-500 font-medium">Recheck</span>
                    )}
                    {attempt.gradingSource === 'parent' && (
                      <span className="text-[11px] text-slate-500 font-medium">Parent checked</span>
                    )}
                  </div>
                  <time className="text-xs text-slate-400" dateTime={attempt.timestamp}>
                    {new Date(attempt.timestamp).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric'
                    })} · {new Date(attempt.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </time>
                </div>
                {attempt.questionPrompt && (
                  <p className="text-xs text-slate-700 font-medium line-clamp-2">{attempt.questionPrompt}</p>
                )}
                {attempt.submittedAnswer && (
                  <p className="text-xs text-slate-500 truncate">
                    <span className="text-slate-400">Answer:</span> {attempt.submittedAnswer}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
};
