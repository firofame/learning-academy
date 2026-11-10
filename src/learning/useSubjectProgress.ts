import { useEffect, useState, useMemo, useCallback } from 'react';
import type { LearningSubjectId, StudentId } from '../types';
import type { LearningAttempt } from './contracts';
import { getStudentProfile } from '../data/profiles';
import { getAvailableSubjectsForGrade } from '../data/subjects';
import { getNextAppExam, isSubjectUpcomingOrToday, type TimetableEntry } from '../data/timetable';
import { deriveRevisionProgress, isRevisionRecheckReady } from './revision';
import { deriveRewardState, type RewardState } from './rewards';
import { localCalendarDate } from './domain';
import {
  getDefaultLearningRepository,
  listLearningAttempts,
  loadRevisionRound,
  type RevisionRoundRecord
} from './persistence';
import { buildSubjectRevision } from './subjectRevision';

export interface SubjectRevisionSummary {
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

export interface UseSubjectProgressResult {
  loading: boolean;
  error: string;
  summaries: SubjectRevisionSummary[];
  summaryMap: Map<LearningSubjectId, SubjectRevisionSummary>;
  attempts: LearningAttempt[];
  rewardState: RewardState;
  nextAppExam?: TimetableEntry;
  totalQuestions: number;
  totalChecked: number;
  totalPending: number;
  overallPercentage: number;
  hasUpcomingExams: boolean;
  upcomingSubjectsCount: number;
  refresh: () => void;
}

export function useSubjectProgress(
  activeStudent: StudentId,
  referenceDate?: string | Date
): UseSubjectProgressResult {
  const [attempts, setAttempts] = useState<LearningAttempt[]>([]);
  const [summaries, setSummaries] = useState<SubjectRevisionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  useEffect(() => {
    if (referenceDate !== undefined) return;
    const updateDate = () => setCurrentDate(new Date());
    const timer = window.setInterval(updateDate, 30000);
    window.addEventListener('focus', updateDate);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', updateDate);
    };
  }, [referenceDate]);

  const profile = getStudentProfile(activeStudent);
  const availableSubjects = useMemo(
    () => getAvailableSubjectsForGrade(profile.grade),
    [profile.grade]
  );

  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Reactive update when cross-device sync merges new progress
  useEffect(() => {
    const handleAttempt = (event: Event) => {
      const { attempt } = (event as CustomEvent<{ attempt: LearningAttempt }>).detail;
      if (attempt.learnerId !== activeStudent) return;
      setAttempts(previous => [
        ...previous.filter(item => item.attemptId !== attempt.attemptId),
        attempt
      ]);
    };
    const handleProgressSynced = (event: Event) => {
      const customEvent = event as CustomEvent<{ studentId?: StudentId }>;
      if (!customEvent.detail?.studentId || customEvent.detail.studentId === activeStudent) {
        setRefreshKey(prev => prev + 1);
      }
    };
    window.addEventListener('academy-progress-synced', handleProgressSynced);
    window.addEventListener('academy-reward-attempt', handleAttempt);
    return () => {
      window.removeEventListener('academy-progress-synced', handleProgressSynced);
      window.removeEventListener('academy-reward-attempt', handleAttempt);
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
        const allChecked = !progress.some(item => !item.checked);
        return {
          ...summary,
          checkedCount: progress.filter(item => item.checked).length,
          pendingCount: progress.filter(item => item.pendingRecheck).length,
          readyCount: progress.filter(item =>
            isRevisionRecheckReady(item, progress, allChecked)
          ).length
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

    return () => {
      active = false;
    };
  }, [activeStudent, availableSubjects, refreshKey]);

  const summaryMap = useMemo(() => {
    return new Map(summaries.map(s => [s.subjectId, s]));
  }, [summaries]);

  const nextAppExam = useMemo(() => {
    return getNextAppExam(profile.grade, referenceDate ?? currentDate);
  }, [profile.grade, referenceDate, currentDate]);

  const { totalQuestions, totalChecked, totalPending } = useMemo(() => {
    if (nextAppExam?.subjectId) {
      const target = summaries.find(s => s.subjectId === nextAppExam.subjectId);
      return {
        totalQuestions: target?.questionCount ?? 0,
        totalChecked: target?.checkedCount ?? 0,
        totalPending: target?.pendingCount ?? 0
      };
    }
    return {
      totalQuestions: 0,
      totalChecked: 0,
      totalPending: 0
    };
  }, [summaries, nextAppExam]);

  const hasUpcomingExams = Boolean(nextAppExam);
  const upcomingSubjectsCount = hasUpcomingExams ? 1 : 0;
  const overallPercentage = totalQuestions > 0 ? Math.round((totalChecked / totalQuestions) * 100) : 0;

  const todayStr = useMemo(() => {
    if (typeof referenceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) return referenceDate;
    return localCalendarDate(typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate ?? currentDate);
  }, [referenceDate, currentDate]);

  const rewardState = useMemo(() => {
    return deriveRewardState(activeStudent, attempts, todayStr);
  }, [activeStudent, attempts, todayStr]);

  return {
    loading,
    error,
    summaries,
    summaryMap,
    attempts,
    rewardState,
    nextAppExam,
    totalQuestions,
    totalChecked,
    totalPending,
    overallPercentage,
    hasUpcomingExams,
    upcomingSubjectsCount,
    refresh
  };
}
