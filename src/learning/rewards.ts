import type { LearningSubjectId, StudentId } from '../types';
import type { LearningAttempt } from './contracts';
import { getStudentProfile } from '../data/profiles';
import { getAvailableSubjectsForGrade } from '../data/subjects';

export interface Milestone {
  id: string;
  title: string;
  description: string;
  emoji: string;
  starTarget?: number;
  check: (state: RewardState) => boolean;
}

export interface RewardState {
  learnerId: StudentId;
  totalStars: number;
  todayStars: number;
  todayCorrectCount: number;
  totalCorrectCount: number;
  currentStreak: number;
  longestStreak: number;
  activeDatesCount: number;
  subjectsPractisedCount: number;
  allSubjectsPractised: boolean;
  unlockedMilestoneIds: string[];
}

export const MILESTONES: readonly Milestone[] = [
  {
    id: 'first-star',
    title: 'First Spark!',
    description: 'Earned your very first star',
    emoji: '⭐',
    starTarget: 1,
    check: s => s.totalStars >= 1
  },
  {
    id: 'five-correct',
    title: 'High Five!',
    description: 'Answered 5 questions correctly',
    emoji: '✋',
    check: s => s.totalCorrectCount >= 5
  },
  {
    id: 'twenty-stars',
    title: 'Star Collector',
    description: 'Reached 20 total stars',
    emoji: '🌟',
    starTarget: 20,
    check: s => s.totalStars >= 20
  },
  {
    id: 'fifty-stars',
    title: 'Galaxy Explorer',
    description: 'Reached 50 total stars',
    emoji: '🚀',
    starTarget: 50,
    check: s => s.totalStars >= 50
  },
  {
    id: 'hundred-stars',
    title: 'Superstar Centurion',
    description: 'Earned 100 stars',
    emoji: '👑',
    starTarget: 100,
    check: s => s.totalStars >= 100
  },
  {
    id: 'streak-3',
    title: 'Streak Starter',
    description: 'Studied 3 days in a row',
    emoji: '🔥',
    check: s => s.currentStreak >= 3 || s.longestStreak >= 3
  },
  {
    id: 'five-streak',
    title: 'Five-Day Streak',
    description: 'Studied 5 days in a row',
    emoji: '🔥',
    check: s => s.longestStreak >= 5
  },
  {
    id: 'streak-7',
    title: 'Weekly Champion',
    description: 'Studied 7 days in a row',
    emoji: '🏆',
    check: s => s.currentStreak >= 7 || s.longestStreak >= 7
  },
  {
    id: 'ten-streak',
    title: 'Ten-Day Streak!',
    description: 'Studied 10 days in a row',
    emoji: '🔥',
    check: s => s.longestStreak >= 10
  },
  {
    id: 'all-rounder',
    title: 'All-Rounder',
    description: 'Studied 3 or more different subjects',
    emoji: '🎨',
    check: s => s.subjectsPractisedCount >= 3
  },
  {
    id: 'all-subjects',
    title: 'Renaissance Mind',
    description: 'Answered correctly in every available subject',
    emoji: '🧠',
    check: s => s.allSubjectsPractised
  }
];

/**
 * Calculates stars awarded for an attempt:
 * - Unaided correct = 2 stars
 * - Assisted correct = 1 star
 * - Incorrect / skipped / ungraded = 0 stars
 */
export function starsForAttempt(attempt: Pick<LearningAttempt, 'outcome' | 'assistance'>): number {
  if (attempt.outcome !== 'correct') return 0;
  const wasAssisted = Array.isArray(attempt.assistance) && attempt.assistance.length > 0;
  return wasAssisted ? 1 : 2;
}

/**
 * Checks if date string `prevDate` immediately precedes `nextDate` (1 calendar day apart).
 * Format: 'YYYY-MM-DD'.
 */
function isConsecutiveDay(prevDate: string, nextDate: string): boolean {
  const d1 = new Date(`${prevDate}T12:00:00Z`);
  const d2 = new Date(`${nextDate}T12:00:00Z`);
  const diffMs = d2.getTime() - d1.getTime();
  return diffMs === 86400000;
}

/**
 * Calculates current and longest consecutive streaks from sorted distinct date strings.
 */
export function calculateStreaks(dates: readonly string[], today: string): { currentStreak: number; longestStreak: number } {
  const distinctDates = [...new Set(dates)].filter(date => date <= today).sort();
  if (distinctDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Calculate longest streak across all dates
  let longestStreak = 1;
  let running = 1;
  for (let i = 1; i < distinctDates.length; i++) {
    if (isConsecutiveDay(distinctDates[i - 1], distinctDates[i])) {
      running++;
      if (running > longestStreak) longestStreak = running;
    } else {
      running = 1;
    }
  }

  // Calculate current streak ending today or yesterday
  const hasToday = distinctDates.includes(today);
  const yesterday = new Date(new Date(`${today}T12:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10);
  const hasYesterday = distinctDates.includes(yesterday);

  let currentStreak = 0;
  if (hasToday || hasYesterday) {
    const endAnchor = hasToday ? today : yesterday;
    currentStreak = 1;
    let checkDate = endAnchor;
    // Walk backward through dates
    while (true) {
      const prevExpected = new Date(new Date(`${checkDate}T12:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10);
      if (distinctDates.includes(prevExpected)) {
        currentStreak++;
        checkDate = prevExpected;
      } else {
        break;
      }
    }
  }

  return { currentStreak, longestStreak };
}

/**
 * Pure derivation of RewardState from attempts.
 */
export function deriveRewardState(
  learnerId: StudentId,
  attempts: readonly LearningAttempt[],
  today: string
): RewardState {
  let totalStars = 0;
  let todayStars = 0;
  let todayCorrectCount = 0;
  let totalCorrectCount = 0;
  const activeDatesSet = new Set<string>();
  const correctSubjectsSet = new Set<LearningSubjectId>();

  for (const attempt of attempts) {
    if (attempt.learnerId !== learnerId) continue;

    const stars = starsForAttempt(attempt);
    totalStars += stars;

    if (attempt.outcome === 'correct') {
      totalCorrectCount++;
      activeDatesSet.add(attempt.learnerLocalDate);
      correctSubjectsSet.add(attempt.subjectId);

      if (attempt.learnerLocalDate === today) {
        todayCorrectCount++;
        todayStars += stars;
      }
    }
  }

  const sortedDates = Array.from(activeDatesSet).sort();
  const { currentStreak, longestStreak } = calculateStreaks(sortedDates, today);

  const partialState: Omit<RewardState, 'unlockedMilestoneIds'> = {
    learnerId,
    totalStars,
    todayStars,
    todayCorrectCount,
    totalCorrectCount,
    currentStreak,
    longestStreak,
    activeDatesCount: sortedDates.length,
    subjectsPractisedCount: correctSubjectsSet.size,
    allSubjectsPractised: getAvailableSubjectsForGrade(getStudentProfile(learnerId).grade)
      .every(subject => correctSubjectsSet.has(subject.id))
  };

  const fullState: RewardState = {
    ...partialState,
    unlockedMilestoneIds: []
  };

  fullState.unlockedMilestoneIds = MILESTONES
    .filter(milestone => milestone.check(fullState))
    .map(m => m.id);

  return fullState;
}

/**
 * Compares previously celebrated milestones with the current state to find newly unlocked ones.
 */
export function getNewlyUnlockedMilestones(
  currentState: RewardState,
  alreadyCelebratedIds: readonly string[]
): Milestone[] {
  const celebratedSet = new Set(alreadyCelebratedIds);
  return MILESTONES.filter(
    m => currentState.unlockedMilestoneIds.includes(m.id) && !celebratedSet.has(m.id)
  );
}
