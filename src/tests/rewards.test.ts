import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  starsForAttempt,
  calculateStreaks,
  deriveRewardState,
  getNewlyUnlockedMilestones,
  MILESTONES
} from '../learning/rewards';
import type { LearningAttempt } from '../learning/contracts';
import { createRevisionAttempts } from '../learning/attemptRecords';
import { getAvailableSubjectsForGrade } from '../data/subjects';

function attempt(id: string, overrides: Partial<LearningAttempt> = {}): LearningAttempt {
  const [record] = createRevisionAttempts({
    learnerId: 'fazia',
    subjectId: 'maths',
    lessonId: 'reward-test',
    mode: 'practice',
    completedAt: '2026-11-10T10:00:00Z',
    answers: [{ attemptId: id, questionId: id, answer: '4', correct: true, prompt: '2 + 2', referenceAnswer: '4' }]
  });
  return { ...record, learnerLocalDate: '2026-11-10', ...overrides };
}

describe('Rewards & Motivation Engine', () => {
  test('starsForAttempt awards 2 stars for unaided correct and 1 star for assisted correct', () => {
    assert.equal(starsForAttempt({ outcome: 'correct', assistance: [] }), 2);
    assert.equal(starsForAttempt({ outcome: 'correct', assistance: ['hint'] }), 1);
    assert.equal(starsForAttempt({ outcome: 'incorrect', assistance: [] }), 0);
    assert.equal(starsForAttempt({ outcome: 'skipped', assistance: [] }), 0);
    assert.equal(starsForAttempt({ outcome: 'ungraded', assistance: [] }), 0);
  });

  test('calculateStreaks handles empty and single dates', () => {
    assert.deepEqual(calculateStreaks([], '2026-11-10'), { currentStreak: 0, longestStreak: 0 });
    assert.deepEqual(calculateStreaks(['2026-11-10'], '2026-11-10'), { currentStreak: 1, longestStreak: 1 });
    assert.deepEqual(calculateStreaks(['2026-11-09'], '2026-11-10'), { currentStreak: 1, longestStreak: 1 }); // yesterday is still alive!
    assert.deepEqual(calculateStreaks(['2026-11-08'], '2026-11-10'), { currentStreak: 0, longestStreak: 1 }); // gap of >1 day
  });

  test('no attempts produces no stars, streaks or milestones', () => {
    const state = deriveRewardState('fazia', [], '2026-11-10');
    assert.equal(state.totalStars, 0);
    assert.equal(state.todayStars, 0);
    assert.equal(state.currentStreak, 0);
    assert.equal(state.longestStreak, 0);
    assert.deepEqual(state.unlockedMilestoneIds, []);
  });

  test('calculateStreaks calculates consecutive runs properly', () => {
    const dates = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06'];
    const { currentStreak, longestStreak } = calculateStreaks(dates, '2026-11-06');
    assert.equal(currentStreak, 2);
    assert.equal(longestStreak, 3);
  });

  test('deriveRewardState calculates total and today stars accurately', () => {
    const attempts: LearningAttempt[] = [
      {
        attemptId: '1',
        learnerId: 'fazia',
        subjectId: 'maths',
        lessonId: 'l1',
        questionId: 'q1',
        contentVersion: 'v1',
        rubricVersion: 'v1',
        timestamp: '2026-11-09T10:00:00Z',
        learnerLocalDate: '2026-11-09',
        sessionMode: 'practice',
        submittedAnswer: '4',
        assistance: [],
        gradingSource: 'deterministic',
        outcome: 'correct'
      },
      {
        attemptId: '2',
        learnerId: 'fazia',
        subjectId: 'maths',
        lessonId: 'l1',
        questionId: 'q2',
        contentVersion: 'v1',
        rubricVersion: 'v1',
        timestamp: '2026-11-10T10:00:00Z',
        learnerLocalDate: '2026-11-10',
        sessionMode: 'practice',
        submittedAnswer: '6',
        assistance: [],
        gradingSource: 'deterministic',
        outcome: 'correct'
      },
      {
        attemptId: '3',
        learnerId: 'fazia',
        subjectId: 'evs',
        lessonId: 'l2',
        questionId: 'q3',
        contentVersion: 'v1',
        rubricVersion: 'v1',
        timestamp: '2026-11-10T10:05:00Z',
        learnerLocalDate: '2026-11-10',
        sessionMode: 'practice',
        submittedAnswer: 'tree',
        assistance: ['hint'],
        gradingSource: 'deterministic',
        outcome: 'correct'
      },
      {
        attemptId: '4',
        learnerId: 'shiza', // other learner, should be excluded
        subjectId: 'biology',
        lessonId: 'l1',
        questionId: 'q1',
        contentVersion: 'v1',
        rubricVersion: 'v1',
        timestamp: '2026-11-10T10:00:00Z',
        learnerLocalDate: '2026-11-10',
        sessionMode: 'practice',
        submittedAnswer: 'cell',
        assistance: [],
        gradingSource: 'deterministic',
        outcome: 'correct'
      }
    ];

    const state = deriveRewardState('fazia', attempts, '2026-11-10');
    assert.equal(state.learnerId, 'fazia');
    assert.equal(state.totalStars, 5); // 2 + 2 + 1
    assert.equal(state.todayStars, 3); // 2 + 1
    assert.equal(state.todayCorrectCount, 2);
    assert.equal(state.currentStreak, 2); // 2026-11-09 and 2026-11-10
    assert.equal(state.subjectsPractisedCount, 2); // maths and evs
    assert.ok(state.unlockedMilestoneIds.includes('first-star'));
  });

  test('getNewlyUnlockedMilestones surfaces uncelebrated achievements', () => {
    const mockState = {
      learnerId: 'shiza' as const,
      totalStars: 52,
      todayStars: 10,
      todayCorrectCount: 5,
      totalCorrectCount: 26,
      currentStreak: 4,
      longestStreak: 4,
      activeDatesCount: 4,
      subjectsPractisedCount: 3,
      allSubjectsPractised: false,
      unlockedMilestoneIds: ['first-star', 'five-correct', 'twenty-stars', 'fifty-stars', 'streak-3', 'all-rounder']
    };

    const celebrated = ['first-star', 'five-correct'];
    const newlyUnlocked = getNewlyUnlockedMilestones(mockState, celebrated);
    const newIds = newlyUnlocked.map(m => m.id);

    assert.ok(newIds.includes('twenty-stars'));
    assert.ok(newIds.includes('fifty-stars'));
    assert.ok(newIds.includes('streak-3'));
    assert.ok(newIds.includes('all-rounder'));
    assert.ok(!newIds.includes('first-star'));
  });

  test('streaks use calendar days across month, year and daylight-saving boundaries', () => {
    assert.deepEqual(calculateStreaks(['2025-12-31', '2026-01-01'], '2026-01-01'), {
      currentStreak: 2, longestStreak: 2
    });
    assert.deepEqual(calculateStreaks(['2026-03-07', '2026-03-08', '2026-03-09'], '2026-03-09'), {
      currentStreak: 3, longestStreak: 3
    });
    assert.deepEqual(calculateStreaks(['2024-02-28', '2024-02-29', '2024-03-01'], '2024-03-01'), {
      currentStreak: 3, longestStreak: 3
    });
    assert.deepEqual(calculateStreaks(['2026-11-10', '2026-11-09', '2026-11-10', '2026-11-11'], '2026-11-10'), {
      currentStreak: 2, longestStreak: 2
    });
  });

  test('only correct answers earn stars or extend streaks; a missed day resets the current run', () => {
    const records = [
      attempt('first', { learnerLocalDate: '2026-11-07' }),
      attempt('second', { learnerLocalDate: '2026-11-08', assistance: ['hint'] }),
      attempt('failed', { learnerLocalDate: '2026-11-09', outcome: 'incorrect' }),
      attempt('skip', { outcome: 'skipped' }),
      attempt('outage', { outcome: 'ungraded', gradingSource: 'none' })
    ];
    const before = deriveRewardState('fazia', records, '2026-11-10');
    assert.equal(before.currentStreak, 0);
    assert.equal(before.totalStars, 3);
    assert.equal(before.todayStars, 0);
    const after = deriveRewardState('fazia', [...records, attempt('today')], '2026-11-10');
    assert.equal(after.currentStreak, 1);
    assert.equal(after.longestStreak, 2);
    assert.equal(after.totalStars, 5);
  });

  test('five correct answers count assisted answers across days without losing the milestone at midnight', () => {
    const records = Array.from({ length: 5 }, (_, i) =>
      attempt(`assisted-${i}`, { assistance: ['hint'], learnerLocalDate: '2026-11-09' })
    );
    const state = deriveRewardState('fazia', records, '2026-11-10');
    assert.equal(state.totalStars, 5);
    assert.equal(state.totalCorrectCount, 5);
    assert.equal(state.todayCorrectCount, 0);
    assert.ok(state.unlockedMilestoneIds.includes('five-correct'));
  });

  test('star thresholds and five/ten-day streak milestones unlock at the exact boundary', () => {
    for (const milestone of MILESTONES) {
      const target = milestone.starTarget;
      if (target === undefined) continue;
      const records = Array.from({ length: target }, (_, i) => attempt(`star-${i}`, { assistance: ['hint'] }));
      assert.equal(deriveRewardState('fazia', records.slice(1), '2026-11-10').unlockedMilestoneIds.includes(milestone.id), false);
      assert.equal(deriveRewardState('fazia', records, '2026-11-10').unlockedMilestoneIds.includes(milestone.id), true);
    }
    const records = Array.from({ length: 10 }, (_, i) =>
      attempt(`day-${i}`, { learnerLocalDate: `2026-11-${String(i + 1).padStart(2, '0')}` })
    );
    assert.equal(deriveRewardState('fazia', records.slice(0, 4), '2026-11-04').unlockedMilestoneIds.includes('five-streak'), false);
    assert.ok(deriveRewardState('fazia', records.slice(0, 5), '2026-11-05').unlockedMilestoneIds.includes('five-streak'));
    assert.equal(deriveRewardState('fazia', records.slice(0, 9), '2026-11-09').unlockedMilestoneIds.includes('ten-streak'), false);
    assert.ok(deriveRewardState('fazia', records, '2026-11-12').unlockedMilestoneIds.includes('ten-streak'));
  });

  test('all-subjects uses the active learner grade, not another learner or a three-subject proxy', () => {
    const records = getAvailableSubjectsForGrade(2).map(subject =>
      attempt(subject.id, { subjectId: subject.id })
    );
    assert.equal(deriveRewardState('fazia', records.slice(1), '2026-11-10').allSubjectsPractised, false);
    assert.equal(deriveRewardState('fazia', records, '2026-11-10').allSubjectsPractised, true);
    assert.ok(deriveRewardState('fazia', records, '2026-11-10').unlockedMilestoneIds.includes('all-subjects'));
    assert.equal(deriveRewardState('shiza', records, '2026-11-10').totalStars, 0);
  });
});
