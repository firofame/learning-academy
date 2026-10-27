import React, { useState } from 'react';
import { 
  HeartHandshake, 
  CheckCircle2, 
  HelpCircle, 
  Sparkles, 
  RotateCcw, 
  Printer, 
  Play, 
  AlertTriangle,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { WordEntry, SubjectCategory, StudentId } from '../types';
import { SUBJECT_METADATA, getWordsForStudent, getStudentProfile } from '../data/wordList';
import { getAllProgress, resetStudentProgress, getWordProgress, isWordDueForReview } from '../utils/storage';

interface ParentDashboardProps {
  activeStudent: StudentId;
  onStartTargetedSession: (words: WordEntry[]) => void;
  onOpenWorksheet: () => void;
  onResetComplete: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({
  activeStudent,
  onStartTargetedSession,
  onOpenWorksheet,
  onResetComplete
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const currentProfile = getStudentProfile(activeStudent);
  const studentWords = getWordsForStudent(activeStudent);
  const allProgress = getAllProgress(activeStudent);

  // Categorize words by evidence-based test-readiness mastery
  const rememberedWords: WordEntry[] = [];
  const practisingWords: WordEntry[] = [];
  const needsHelpWords: WordEntry[] = [];

  studentWords.forEach(word => {
    const prog = allProgress[word.id];
    if (prog?.needsRevisit) {
      needsHelpWords.push(word);
    } else if (prog?.level === 'remembered') {
      rememberedWords.push(word);
    } else if (prog?.level === 'practising') {
      practisingWords.push(word);
    } else {
      needsHelpWords.push(word);
    }
  });

  const wordsDueForReview = studentWords.filter(w => isWordDueForReview(allProgress[w.id]));
  const reviewTargets = wordsDueForReview.length > 0 ? wordsDueForReview : needsHelpWords;

  // Collect words with recorded mistakes for diagnostics
  const wordsWithMistakes = studentWords.filter(w => {
    const prog = allProgress[w.id];
    return prog && prog.lastMistake;
  });

  const handleStartNeedsHelpSession = () => {
    if (reviewTargets.length > 0) {
      onStartTargetedSession(reviewTargets.slice(0, 5));
    }
  };

  const handleConfirmReset = () => {
    resetStudentProgress(activeStudent);
    setShowResetConfirm(false);
    onResetComplete();
  };

  // Distinct subjects for the active student
  const activeSubjects = Array.from(new Set(studentWords.map(w => w.subject))) as SubjectCategory[];
  const testReadinessPercent = Math.round((rememberedWords.length / studentWords.length) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2 text-amber-800 font-semibold text-xs tracking-wider uppercase mb-1">
          <HeartHandshake className="w-4 h-4" />
          <span>Parent & Educator Insights · {currentProfile.name} ({currentProfile.gradeLabel})</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Verifiable Spelling Mastery & Test Readiness
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
          Assisted practice helps understanding, but true test readiness requires unaided recall across separate days. Here is {currentProfile.name}'s verified progress across all {studentWords.length} school words.
        </p>
      </div>

      {/* Readiness Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            School Exam Readiness
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
              {rememberedWords.length}
            </span>
            <span className="text-sm font-semibold text-slate-500">
              of {studentWords.length} words verified Test-Ready ({testReadinessPercent}%)
            </span>
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            A word is marked Test-Ready only after being spelled unaided without hints across at least 2 separate calendar days.
          </span>
        </div>

        <div className="w-full sm:w-44 bg-slate-100 h-3 rounded-full overflow-hidden shrink-0">
          <div 
            className="bg-emerald-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${testReadinessPercent}%` }}
          />
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Remembered / Test-Ready */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
              Test-Ready
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 block">
              {rememberedWords.length}
            </span>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Recalled unaided 2+ times
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        {/* Practising */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
              Practising
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 block">
              {practisingWords.length}
            </span>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Needs 2nd confirmation test
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        {/* Needs Practice */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
              Needs Practice
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1 block">
              {needsHelpWords.length}
            </span>
            <span className="text-xs text-slate-500 mt-0.5 block">
              Missed or unattempted
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
            <HelpCircle className="w-5 h-5 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="flex flex-wrap items-center gap-3">
        {reviewTargets.length > 0 && (
          <button
            onClick={handleStartNeedsHelpSession}
            className="px-5 py-2.5 rounded-xl bg-amber-600 text-white font-semibold text-xs sm:text-sm hover:bg-amber-700 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>{wordsDueForReview.length > 0 ? 'Review' : 'Practice'} {Math.min(5, reviewTargets.length)} Words{wordsDueForReview.length > 0 ? ' Due for Review' : ' Needing Practice'}</span>
          </button>
        )}

        <button
          onClick={onOpenWorksheet}
          className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Generate Paper Worksheets</span>
        </button>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="px-4 py-2.5 rounded-xl text-rose-700 hover:bg-rose-50 font-semibold text-xs transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset {currentProfile.name}'s Progress</span>
        </button>
      </div>

      {/* Diagnostic Mistake Log */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          Diagnostic Mistake Log for {currentProfile.name}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600">
          Pinpointing exact letter patterns (e.g. double consonants, silent letters, root suffixes) helps focus study time.
        </p>

        {wordsWithMistakes.length === 0 ? (
          <div className="py-6 text-center bg-slate-50 rounded-xl">
            <p className="text-xs sm:text-sm text-slate-500">
              No recent mistakes logged for {currentProfile.name}! As she practices, any difficult patterns will appear here.
            </p>
          </div>
        ) : (
          <div className="border border-slate-100 rounded-xl divide-y divide-slate-100">
            {wordsWithMistakes.map(word => {
              const prog = getWordProgress(word.id, activeStudent);
              return (
                <div key={word.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{word.word}</span>
                      <span className="text-xs text-slate-500 font-medium">({word.subject})</span>
                    </div>
                    <div className="text-xs text-rose-700 mt-1">
                      Recorded attempt: <span className="font-mono bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{prog.lastMistake}</span>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-700 sm:max-w-sm bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                    <span className="font-bold text-slate-900">Pattern Guide: </span>
                    {word.trickySpot}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subject by Subject Mastery Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          Progress by Subject ({activeSubjects.length} Subjects)
        </h2>

        <div className="space-y-4">
          {activeSubjects.map(subj => {
            const meta = SUBJECT_METADATA[subj];
            const subjectWords = studentWords.filter(w => w.subject === subj);
            const remembered = subjectWords.filter(w => allProgress[w.id]?.level === 'remembered').length;
            const percentage = Math.round((remembered / subjectWords.length) * 100);

            return (
              <div key={subj} className="space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs sm:text-sm font-semibold">
                  <div className="flex flex-wrap items-center gap-2">
                    <span style={{ color: meta?.accentColor || '#1e293b' }} className="font-bold">
                      {subj}
                    </span>
                    <span className="text-slate-400 font-normal">({meta?.description || ''})</span>
                  </div>
                  <span className="font-mono text-slate-600">
                    {remembered} / {subjectWords.length} test-ready ({percentage}%)
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: meta?.accentColor || '#059669' 
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Modal for Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">
                Reset {currentProfile.name}'s Progress?
              </h3>
              <p className="text-xs text-slate-600">
                This will clear all saved attempts and reset all {studentWords.length} words for {currentProfile.name} back to the beginning. The other student's progress will remain untouched.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-semibold text-xs hover:bg-rose-700 shadow-xs cursor-pointer"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
