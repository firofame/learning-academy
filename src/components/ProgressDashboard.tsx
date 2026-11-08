import React, { useEffect, useState } from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import type { ActiveAppView, LearningSubjectId, StudentId } from '../types';
import type { LearningAttempt } from '../learning/contracts';
import { getStudentProfile } from '../data/profiles';
import { getAvailableSubjectsForGrade, LEARNING_SUBJECTS } from '../data/subjects';
import { EXAM_GENERAL_INFO, getNextExam, getNextActualExam } from '../data/timetable';
import { deriveRevisionProgress } from '../learning/revision';
import {
  getDefaultLearningRepository, listLearningAttempts, loadRevisionRound,
  type RevisionRoundRecord
} from '../learning/persistence';
import { buildSubjectRevision } from '../learning/subjectRevision';

export interface ProgressDashboardProps {
  activeStudent: StudentId;
  onResetComplete?: () => void;
  onNavigate?: (view: ActiveAppView) => void;
}

export type ParentDashboardProps = ProgressDashboardProps;

interface SubjectRevisionSummary {
  subjectId: LearningSubjectId;
  lessonId: string;
  title: string;
  questionCount: number;
  round: RevisionRoundRecord | null;
  checkedCount: number;
  pendingCount: number;
  readyCount: number;
  error?: string;
}

function outcomeLabel(attempt: LearningAttempt): string {
  if (attempt.outcome === 'ungraded') return 'Not checked · retry needed';
  if (attempt.outcome === 'skipped') return 'Skipped · return later';
  return attempt.outcome === 'correct' ? 'Correct' : 'Needs review';
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ activeStudent, onResetComplete, onNavigate }) => {
  const profile = getStudentProfile(activeStudent);
  const nextExam = getNextExam(profile.grade);
  const nextActualExam = getNextActualExam(profile.grade);
  const [attempts, setAttempts] = useState<LearningAttempt[]>([]);
  const [summaries, setSummaries] = useState<SubjectRevisionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const availableSubjects = getAvailableSubjectsForGrade(profile.grade);

  // Reactive update when cross-device sync merges new progress
  useEffect(() => {
    const handleProgressSynced = (event: Event) => {
      const customEvent = event as CustomEvent<{ studentId?: StudentId }>;
      if (!customEvent.detail?.studentId || customEvent.detail.studentId === activeStudent) {
        setRefreshKey(prev => prev + 1);
      }
    };
    window.addEventListener('academy-progress-synced', handleProgressSynced);
    return () => {
      window.removeEventListener('academy-progress-synced', handleProgressSynced);
    };
  }, [activeStudent]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const repository = getDefaultLearningRepository();
    const definitions = availableSubjects.map(subject => ({
      subjectId: subject.id,
      definition: buildSubjectRevision(subject.id, activeStudent)
    }));

    void Promise.all([
      listLearningAttempts(repository, activeStudent),
      Promise.all(definitions.map(async ({ subjectId, definition }): Promise<SubjectRevisionSummary> => {
        try {
          const round = await loadRevisionRound(
            repository, activeStudent, subjectId, definition.lessonId
          );
          return {
            subjectId,
            lessonId: definition.lessonId,
            title: definition.title,
            questionCount: definition.questions.length,
            round,
            checkedCount: 0,
            pendingCount: 0,
            readyCount: 0
          };
        } catch (cause) {
          return {
            subjectId,
            lessonId: definition.lessonId,
            title: definition.title,
            questionCount: definition.questions.length,
            round: null,
            checkedCount: 0,
            pendingCount: 0,
            readyCount: 0,
            error: cause instanceof Error ? cause.message : 'Unable to load this revision summary.'
          };
        }
      }))
    ]).then(([savedAttempts, loadedSummaries]) => {
      if (!active) return;
      setAttempts(savedAttempts);
      const nextSummaries = loadedSummaries.map(summary => {
        if (!summary.round || summary.error) return summary;
        const roundAttempts = savedAttempts.filter(attempt =>
          attempt.subjectId === summary.subjectId && attempt.lessonId === summary.lessonId &&
          attempt.revisionRoundId === summary.round?.revisionRoundId
        );
        const progress = deriveRevisionProgress(summary.round.questionIds, roundAttempts);
        return {
          ...summary,
          checkedCount: progress.filter(item => item.checked).length,
          pendingCount: progress.filter(item => item.pendingRecheck).length,
          readyCount: progress.filter(item => item.pendingRecheck && item.gapCount >= 2).length
        };
      });
      setSummaries(nextSummaries);
      const failures = nextSummaries.filter(summary => summary.error);
      if (failures.length) setError(failures.map(summary => summary.error).join(' '));
    }).catch(cause => {
      if (!active) return;
      setError(cause instanceof Error ? cause.message : 'Unable to load saved learning history.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [activeStudent, refreshKey]);

  const subjectNames = new Map(LEARNING_SUBJECTS.map(subject => [subject.id, subject.name]));
  const recentAttempts = [...attempts].reverse().slice(0, 12);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-3 py-5 sm:px-5 sm:py-8">
      <header className="space-y-2">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-600">
          {profile.name} · {profile.gradeLabel}
        </p>
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Progress</h1>
        <p className="text-sm leading-relaxed text-slate-700">
          See what has been checked in each current revision round. Same-day rechecks are revision evidence, not proof of long-term mastery.
        </p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{error}</p>}

      {/* First Semester Exam Schedule Banner */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-800">
            <Calendar className="w-3.5 h-3.5" />
            <span>{EXAM_GENERAL_INFO.examName} ({EXAM_GENERAL_INFO.academicYear})</span>
          </div>
          <p className="text-sm font-bold text-slate-900">
            {nextExam ? (
              nextExam.isStudyLeave ? (
                `Study Leave · ${nextExam.displayDate} (${nextExam.dayOfWeek})`
              ) : (
                `Next: ${nextExam.subject} · ${nextExam.displayDate} (${nextExam.dayOfWeek})`
              )
            ) : 'First Semester Exam Timetable'}
          </p>
          <p className="text-xs text-slate-600">
            {nextExam?.isStudyLeave ? (
              nextActualExam ? (
                `Self revision day · Next exam: ${nextActualExam.subject} on ${nextActualExam.displayDate} (${nextActualExam.dayOfWeek})`
              ) : 'Self revision day (no school attendance)'
            ) : (
              `Assembly: ${EXAM_GENERAL_INFO.morningAssembly} · Reporting: ${EXAM_GENERAL_INFO.reportingTime} · Dispersal: 11:00 AM (Bus 10:50 AM from 31/10)`
            )}
          </p>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('timetable')}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
          >
            <span>View Full Timetable</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" aria-label="Current revision coverage">
        <h2 className="text-lg font-bold text-slate-900">Current revision coverage</h2>
        {loading ? (
          <p role="status" className="text-sm text-slate-600">Loading revision history…</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {summaries.map(summary => (
              <article key={summary.subjectId} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{subjectNames.get(summary.subjectId)}</h3>
                  <p className="text-sm text-slate-600">
                    {summary.round
                      ? `${summary.checkedCount} of ${summary.questionCount} questions checked`
                      : `Not started · 0 of ${summary.questionCount} questions checked`}
                  </p>
                </div>
                {summary.round && (
                  <p className="text-sm text-slate-600">
                    {summary.pendingCount} to recheck · {summary.readyCount} ready after a gap
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" aria-label="Recent learning history">
        <h2 className="text-lg font-bold text-slate-900">Recent learning history</h2>
        {loading ? (
          <p className="text-sm text-slate-600">Loading saved answers…</p>
        ) : recentAttempts.length === 0 ? (
          <p className="text-sm text-slate-600">Completed answers will appear here.</p>
        ) : (
          <ol className="space-y-3">
            {recentAttempts.map(attempt => (
              <li key={attempt.attemptId} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-slate-900">
                    {subjectNames.get(attempt.subjectId) ?? attempt.subjectId} · {outcomeLabel(attempt)}
                    {attempt.revisionAttemptKind === 'recheck' ? ' · Same-day recheck' : ''}
                    {attempt.gradingSource === 'parent' ? ' · Parent checked' : ''}
                    {attempt.assistance.length > 0 ? ' · Help used' : ''}
                  </p>
                  <time className="text-xs text-slate-500" dateTime={attempt.timestamp}>
                    {new Date(attempt.timestamp).toLocaleString()}
                  </time>
                </div>
                {attempt.questionPrompt && <p className="mt-1 text-sm text-slate-700">{attempt.questionPrompt}</p>}
                {attempt.submittedAnswer !== null && attempt.submittedAnswer !== '' && (
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">
                    <strong>Answer:</strong> {attempt.submittedAnswer}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
};

export const ParentDashboard = ProgressDashboard;
export default ProgressDashboard;
