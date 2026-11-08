import React, { useState } from 'react';
import { ArrowRight, BookOpen, Bot, Calculator, Languages, Leaf, Dna, FlaskConical, Calendar, RotateCw } from 'lucide-react';
import { ActiveAppView, StudentId } from '../types';
import type { LearningAttempt } from '../learning/contracts';
import { getStudentProfile } from '../data/profiles';
import { getAvailableSubjectsForGrade, LEARNING_SUBJECTS } from '../data/subjects';
import { EXAM_GENERAL_INFO, getNextExam, getNextActualExam } from '../data/timetable';
import { useSubjectProgress } from '../learning/useSubjectProgress';

interface SubjectHomeProps {
  activeStudent: StudentId;
  onNavigate: (view: ActiveAppView) => void;
}

function outcomeLabel(attempt: LearningAttempt): string {
  if (attempt.outcome === 'ungraded') return 'Not checked · retry needed';
  if (attempt.outcome === 'skipped') return 'Skipped · return later';
  return attempt.outcome === 'correct' ? 'Correct' : 'Needs review';
}

export const SubjectHome: React.FC<SubjectHomeProps> = ({ activeStudent, onNavigate }) => {
  const profile = getStudentProfile(activeStudent);
  const subjects = getAvailableSubjectsForGrade(profile.grade);
  const nextExam = getNextExam(profile.grade);
  const nextActualExam = getNextActualExam(profile.grade);

  const [showAllAttempts, setShowAllAttempts] = useState(false);

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
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <header className="space-y-3">
        <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">
          {profile.name} · {profile.gradeLabel}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          What would you like to learn?
        </h1>
        <p className="text-base text-slate-600 max-w-2xl">
          Choose a subject to get started and track your revision progress. Only subjects available for {profile.gradeLabel} are shown.
        </p>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          {error}
        </p>
      )}

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
