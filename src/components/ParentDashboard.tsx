import React, { useEffect, useState } from 'react';
import type { LearningSubjectId, StudentId } from '../types';
import type { LearningAttempt } from '../learning/contracts';
import { getStudentProfile } from '../data/profiles';
import { getAvailableSubjectsForGrade, LEARNING_SUBJECTS } from '../data/subjects';
import { CONTENT_VERSIONS } from '../data/contentVersions';
import { deriveRevisionProgress } from '../learning/revision';
import {
  getDefaultLearningRepository, listLearningAttempts, loadRevisionRound,
  type RevisionRoundRecord
} from '../learning/persistence';
import { buildSubjectRevision } from '../learning/subjectRevision';
import { resetStudentProgress } from '../utils/storage';
import { ProgressBackupControls } from './ProgressBackupControls';

interface ParentDashboardProps {
  activeStudent: StudentId;
  onResetComplete: () => void;
}

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

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ activeStudent, onResetComplete }) => {
  const profile = getStudentProfile(activeStudent);
  const [attempts, setAttempts] = useState<LearningAttempt[]>([]);
  const [summaries, setSummaries] = useState<SubjectRevisionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const availableSubjects = getAvailableSubjectsForGrade(profile.grade);

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
            repository, activeStudent, subjectId, definition.lessonId, CONTENT_VERSIONS[subjectId]
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

  const resetOldSpellingProgress = () => {
    if (resetStudentProgress(activeStudent)) {
      setConfirmReset(false);
      setRefreshKey(value => value + 1);
      onResetComplete();
    } else {
      setError('The older Spell Bee word summary could not be reset.');
    }
  };

  const subjectNames = new Map(LEARNING_SUBJECTS.map(subject => [subject.id, subject.name]));
  const recentAttempts = [...attempts].reverse().slice(0, 12);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-3 py-5 sm:px-5 sm:py-8">
      <header className="space-y-2">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-600">
          {profile.name} · {profile.gradeLabel}
        </p>
        <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Progress &amp; backup</h1>
        <p className="text-sm leading-relaxed text-slate-700">
          See what has been checked in each current revision round. Same-day rechecks are revision evidence, not proof of long-term mastery.
        </p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{error}</p>}

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

      <ProgressBackupControls
        learnerId={activeStudent}
        learnerName={profile.name}
        onRestored={() => setRefreshKey(value => value + 1)}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-slate-900">Older Spell Bee word summary</h2>
        <p className="mt-1 text-sm text-slate-600">
          Reset only the legacy word summary. Saved answer history and other subjects are not affected.
        </p>
        {!confirmReset ? (
          <button
            type="button"
            className="mt-3 min-h-12 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            onClick={() => setConfirmReset(true)}
          >
            Reset old Spell Bee summary
          </button>
        ) : (
          <div className="mt-3 space-y-3" role="group" aria-label="Confirm reset Spell Bee summary">
            <p className="text-sm text-amber-900">This removes the older per-word summary for {profile.name}; saved attempt history remains available.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="min-h-12 rounded-xl border border-slate-300 px-4 py-3 font-semibold" onClick={() => setConfirmReset(false)}>Cancel</button>
              <button type="button" className="min-h-12 rounded-xl bg-rose-700 px-4 py-3 font-semibold text-white" onClick={resetOldSpellingProgress}>Confirm reset</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
