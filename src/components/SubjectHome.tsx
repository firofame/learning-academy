import React, { useState, useEffect } from 'react';
import {
  ArrowRight, BookOpen, Bot, Calculator, Languages, Leaf, Dna, FlaskConical, Landmark,
  Calendar, RotateCw, ChevronDown, ChevronUp, Clock, Bus, AlertCircle, Sparkles,
  Star, Flame, Trophy, HeartHandshake
} from 'lucide-react';
import { ActiveAppView, StudentId } from '../types';
import type { LearningAttempt } from '../learning/contracts';
import { getStudentProfile } from '../data/profiles';
import { getAvailableSubjectsForGrade, LEARNING_SUBJECTS } from '../data/subjects';
import {
  EXAM_GENERAL_INFO, getNextExam, getNextActualExam,
  getTimetableForGrade, getExamStatus, isSubjectUpcomingOrToday, type TimetableEntry
} from '../data/timetable';
import { localCalendarDate } from '../learning/domain';
import { useSubjectProgress } from '../learning/useSubjectProgress';
import { MILESTONES } from '../learning/rewards';

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

  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    const updateDateIfChanged = () => {
      setCurrentDate(prev => {
        const now = new Date();
        if (
          prev.getHours() === now.getHours() &&
          prev.getMinutes() === now.getMinutes() &&
          prev.getDate() === now.getDate() &&
          prev.getMonth() === now.getMonth() &&
          prev.getFullYear() === now.getFullYear()
        ) {
          return prev;
        }
        return now;
      });
    };

    // Check every 10 seconds to automatically advance past exam hours (e.g. 11:00 AM dispersal)
    const timer = setInterval(updateDateIfChanged, 10000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateDateIfChanged();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', updateDateIfChanged);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', updateDateIfChanged);
    };
  }, []);

  const nextExam = getNextExam(profile.grade, currentDate);
  const nextActualExam = getNextActualExam(profile.grade, currentDate);
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
    rewardState,
    nextAppExam,
    totalQuestions,
    totalChecked,
    totalPending,
    overallPercentage,
    hasUpcomingExams
  } = useSubjectProgress(activeStudent, currentDate);

  const targetEntry = nextActualExam ?? nextExam;
  const targetSubjects = targetEntry
    ? [targetEntry.subjectId, ...(targetEntry.additionalSubjectIds ?? [])]
        .flatMap(subjectId => {
          const subject = subjects.find(candidate => candidate.id === subjectId);
          return subject ? [subject] : [];
        })
    : [];

  const subjectNames = new Map(LEARNING_SUBJECTS.map(subject => [subject.id, subject.name]));
  const recentAttempts = [...attempts].reverse().slice(0, 15);
  const todayStr = localCalendarDate(currentDate);
  const isHolidayActive = Boolean(nextExam?.isHoliday);

  const hour = currentDate.getHours();
  const timeOfDayGreeting =
    hour < 5
      ? 'Time to rest'
      : hour < 12
      ? 'Good morning'
      : hour < 17
      ? 'Good afternoon'
      : hour < 21
      ? 'Good evening'
      : 'Time to rest';

  const tomorrow = new Date(currentDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const studyNudge = (() => {
    if (!nextExam) return 'All exams complete! Well done for all your hard work!';
    if (nextActualExam?.date === localCalendarDate(tomorrow)) {
      return `Tomorrow's exam is ${nextActualExam.subject}! A little revision can help you feel ready.`;
    }
    if (hour < 5 || hour >= 21) return 'Rest helps your brain remember. You can revise again tomorrow.';
    if (rewardState.todayCorrectCount === 0) {
      return rewardState.currentStreak > 0
        ? 'A quick revision round can keep your study streak going. One step at a time!'
        : 'Start with a short revision round. Every little bit of practice helps!';
    }
    if (targetEntry && !targetEntry.isHoliday) {
      return `Next exam: ${targetEntry.subject} on ${targetEntry.displayDate}. Stay confident!`;
    }
    return `Awesome job today! ${rewardState.todayCorrectCount} questions answered correctly.`;
  })();
  const nextStarMilestone = MILESTONES.find(milestone =>
    milestone.starTarget !== undefined && milestone.starTarget > rewardState.totalStars
  );
  const earnedMilestones = MILESTONES.filter(milestone => rewardState.unlockedMilestoneIds.includes(milestone.id));

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Screen-reader accessible heading */}
      <h1 className="sr-only">What would you like to learn?</h1>

      {error && (
        <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          {error}
        </p>
      )}

      {/* Hero Welcome Banner */}
      <section
        aria-label={`Welcome ${profile.name}`}
        className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r ${profile.theme.gradient} p-5 sm:p-7 text-white shadow-md animate-slide-up`}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4 sm:gap-5">
            <span className="text-4xl sm:text-5xl select-none filter drop-shadow-md animate-gentle-bounce">
              {profile.avatarEmoji}
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-extrabold text-white/80">
                  {timeOfDayGreeting}
                </span>
                <span className="inline-block w-1 h-1 rounded-full bg-white/60" />
                <span className="text-xs font-semibold text-white/90">
                  {profile.gradeLabel}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white drop-shadow-xs">
                {profile.theme.greeting}
              </h2>
              <p className="text-xs sm:text-sm text-white/90 font-medium">
                {studyNudge}
              </p>
            </div>
          </div>

          {/* Quick Stats Pill Row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
            {/* Stars Pill */}
            <div className="flex flex-col items-center gap-1 px-2 py-3 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 shadow-xs">
              <Star className="w-4 h-4 fill-amber-300 text-amber-300 shrink-0" aria-hidden="true" />
              <div className="text-center">
                <p className="text-sm sm:text-base font-extrabold leading-tight text-white">
                  {rewardState.totalStars}
                </p>
                <p className="text-xs text-white font-semibold">
                  Stars
                </p>
              </div>
            </div>

            {/* Streak Pill */}
            <div className="flex flex-col items-center gap-1 px-2 py-3 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 shadow-xs">
              <Flame className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0" aria-hidden="true" />
              <div className="text-center">
                <p className="text-sm sm:text-base font-extrabold leading-tight text-white">
                  {rewardState.currentStreak}
                </p>
                <p className="text-xs text-white font-semibold">
                  Streak
                </p>
              </div>
            </div>

            {/* Coverage Pill */}
            <div className="flex flex-col items-center gap-1 px-2 py-3 rounded-xl bg-white/15 backdrop-blur-md border border-white/20 shadow-xs">
              <Trophy className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
              <div className="text-center">
                <p className="text-sm sm:text-base font-extrabold leading-tight text-white">
                  {overallPercentage}%
                </p>
                <p className="text-xs text-white font-semibold">
                  Coverage
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Rewards summary" className={`rounded-2xl border ${profile.theme.accentBorder} ${profile.theme.accentBg} p-5 space-y-3`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={`font-bold ${profile.theme.accentText}`}>Your star journey</h2>
          <p className="text-sm text-slate-700">{rewardState.totalStars} stars · Best streak: {rewardState.longestStreak} {rewardState.longestStreak === 1 ? 'day' : 'days'}</p>
        </div>
        {nextStarMilestone?.starTarget !== undefined ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              Next milestone: <strong>{nextStarMilestone.title}</strong> · {rewardState.totalStars}/{nextStarMilestone.starTarget} stars
            </p>
            <progress
              aria-label={`Progress to ${nextStarMilestone.title}`}
              value={rewardState.totalStars}
              max={nextStarMilestone.starTarget}
              className="reward-progress h-2 w-full"
            />
          </div>
        ) : <p className="text-sm text-slate-700">All star milestones unlocked! Keep learning at your own pace.</p>}
        {earnedMilestones.length > 0 && (
          <ul aria-label="Earned milestones" className="flex flex-wrap gap-2">
            {earnedMilestones.map(milestone => (
              <li key={milestone.id} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800">
                <span aria-hidden="true">{milestone.emoji}</span> {milestone.title}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Exam Timetable Spotlight & Expandable Schedule */}
      <section aria-label="First Semester Exam Schedule" className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden transition-all">
        {/* Spotlight Top Banner */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/50 p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                <Calendar className="w-4 h-4 text-amber-700" />
                <span>{EXAM_GENERAL_INFO.examName} · {EXAM_GENERAL_INFO.schoolName}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                {targetEntry ? (
                  targetEntry.isHoliday ? (
                    <span>Holiday ({targetEntry.displayDate})</span>
                  ) : (
                    <span>Next Exam: {targetEntry.subject} ({targetEntry.displayDate})</span>
                  )
                ) : (
                  <span>First Semester Exam Timetable</span>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                {nextActualExam ? (
                  isHolidayActive ? (
                    <span>
                      {nextExam?.date === todayStr ? 'Today is a holiday' : `${nextExam?.displayDate} is a holiday`} (self-revision day). Morning Assembly at {EXAM_GENERAL_INFO.morningAssembly} on {nextActualExam.dayOfWeek} (reach by {EXAM_GENERAL_INFO.reportingTime}).
                    </span>
                  ) : (
                    <span>
                      {nextActualExam.notes ? `${nextActualExam.notes} · ` : ''}Morning Assembly at {EXAM_GENERAL_INFO.morningAssembly} (reach by {EXAM_GENERAL_INFO.reportingTime}).
                    </span>
                  )
                ) : nextExam ? (
                  <span>
                    {nextExam.isHoliday ? 'Holiday (no school attendance).' : `${nextExam.notes ? `${nextExam.notes} · ` : ''}Regular classes.`}
                  </span>
                ) : (
                  <span>View full exam schedule, timings, and dispersal notes for {profile.name}.</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {targetSubjects.map(targetSubject => (
                <button
                  key={targetSubject.id}
                  onClick={() => onNavigate(targetSubject.startView)}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <span>Revise {targetSubject.name} Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ))}
              <button
                onClick={() => setShowTimetable(prev => !prev)}
                aria-expanded={showTimetable}
                className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                  showTimetable
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                    : targetSubjects.length > 0
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

          {/* Integrated Revision Coverage Row */}
          <div
            role="region"
            aria-label="Current revision coverage"
            className="pt-4 border-t border-amber-200/60 space-y-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Revision Coverage{nextAppExam ? ` · ${nextAppExam.subject}` : ''}
                </span>
                <span className="text-xs text-slate-600">
                  {loading ? (
                    'Loading revision coverage…'
                  ) : nextAppExam && totalQuestions > 0 ? (
                    `${totalChecked} of ${totalQuestions} questions checked (${overallPercentage}%)`
                  ) : nextAppExam ? (
                    `No revision questions scheduled for ${nextAppExam.subject}`
                  ) : (
                    'All scheduled exams completed'
                  )}
                </span>
              </div>
              {totalPending > 0 && (
                <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white text-amber-800 border border-amber-300/80 shadow-2xs">
                  <RotateCw className="w-3 h-3 text-amber-700" />
                  {totalPending} question{totalPending > 1 ? 's' : ''} to recheck
                </span>
              )}
            </div>
            <div className="w-full bg-white/80 rounded-full h-2 overflow-hidden border border-amber-200/50">
              <div
                className={`h-2 rounded-full transition-all duration-500 ease-out ${
                  !loading && !hasUpcomingExams ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${!loading && !hasUpcomingExams ? 100 : overallPercentage}%` }}
                role="progressbar"
                aria-valuenow={!loading && !hasUpcomingExams ? 100 : overallPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
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
                  const status = getExamStatus(entry, currentDate);
                  const isRevisableInApp = entry.subjectId && subjects.some(s => s.id === entry.subjectId);
                  const targetSub = isRevisableInApp ? LEARNING_SUBJECTS.find(s => s.id === entry.subjectId) : undefined;

                  return (
                    <div
                      key={entry.id}
                      className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        status === 'today'
                          ? 'bg-amber-50/60'
                          : entry.isHoliday
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
                          {status === 'upcoming' && !entry.isHoliday && (
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
                          <h4 className={`text-sm sm:text-base font-bold ${entry.isHoliday ? 'text-slate-600 italic' : 'text-slate-900'}`}>
                            {entry.subject}
                          </h4>
                          {entry.isHoliday && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700">
                              Holiday
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
                        ) : entry.isHoliday ? (
                          <span className="text-xs font-semibold text-slate-400 italic">Holiday</span>
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

      {/* Subjects Grid */}
      <section aria-label={`Subjects for ${profile.gradeLabel}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {subjects.map(subject => {
          const summary = summaryMap.get(subject.id);
          const isComplete = summary && summary.questionCount > 0 && summary.checkedCount === summary.questionCount;
          const subjectPct = summary && summary.questionCount > 0 ? Math.round((summary.checkedCount / summary.questionCount) * 100) : 0;
          const isPastExam = !isSubjectUpcomingOrToday(subject.id, profile.grade, currentDate);

          return (
            <article
              key={subject.id}
              className={`bg-white border ${profile.theme.accentBorder} rounded-2xl p-6 shadow-xs ${profile.theme.cardGlow} flex flex-col justify-between gap-5 transition-all duration-200 motion-safe:hover:-translate-y-1 hover:shadow-md animate-slide-up`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${subject.iconBg ?? 'bg-amber-100 text-amber-700'} shadow-2xs`}>
                    {subject.id === 'robotics' ? (
                      <Bot className="w-6 h-6" aria-hidden="true" />
                    ) : subject.id === 'maths' ? (
                      <Calculator className="w-6 h-6" aria-hidden="true" />
                    ) : subject.id === 'malayalam' || subject.id === 'hindi' ? (
                      <Languages className="w-6 h-6" aria-hidden="true" />
                    ) : subject.id === 'evs' ? (
                      <Leaf className="w-6 h-6" aria-hidden="true" />
                    ) : subject.id === 'biology' ? (
                      <Dna className="w-6 h-6" aria-hidden="true" />
                    ) : subject.id === 'chemistry' ? (
                      <FlaskConical className="w-6 h-6" aria-hidden="true" />
                    ) : subject.id === 'english' ? (
                      <BookOpen className="w-6 h-6" aria-hidden="true" />
                    ) : subject.id === 'history' ? (
                      <Landmark className="w-6 h-6" aria-hidden="true" />
                    ) : subject.id === 'moral-science' ? (
                      <HeartHandshake className="w-6 h-6" aria-hidden="true" />
                    ) : (
                      <BookOpen className="w-6 h-6" aria-hidden="true" />
                    )}
                  </div>

                  {summary && (
                    <div className="flex items-center gap-1.5">
                      {isPastExam && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          Exam completed
                        </span>
                      )}
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
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {subject.emoji && <span className="text-xl select-none">{subject.emoji}</span>}
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">{subject.name}</h2>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{subject.description}</p>
                </div>

                {summary && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Coverage</span>
                      <span className="font-semibold text-slate-700">{subjectPct}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isComplete ? 'bg-emerald-500' : subject.progressBg
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
                className={`w-full min-h-12 px-4 py-2.5 rounded-xl ${subject.buttonBg} active:scale-[0.99] text-white font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs group`}
              >
                <span>Open {subject.name}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
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
