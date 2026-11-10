import React, { useCallback, useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { getNewlyUnlockedMilestones, type Milestone, type RewardState } from '../learning/rewards';
import { loadCelebratedMilestones, recordCelebratedMilestone } from '../utils/rewardStorage';

export function RewardCelebrations({ state, enabled }: { state: RewardState; enabled: boolean }) {
  const [celebrated, setCelebrated] = useState(() => loadCelebratedMilestones(state.learnerId));
  const milestone = enabled ? getNewlyUnlockedMilestones(state, celebrated)[0] : undefined;
  const dismiss = useCallback(() => {
    if (milestone) setCelebrated(previous => [...previous, milestone.id]);
  }, [milestone]);

  useEffect(() => {
    if (milestone) recordCelebratedMilestone(state.learnerId, milestone.id);
  }, [milestone, state.learnerId]);

  return milestone ? <RewardToast key={milestone.id} milestone={milestone} onDismiss={dismiss} /> : null;
}

interface RewardToastProps {
  milestone: Milestone;
  onDismiss: () => void;
}

export const RewardToast: React.FC<RewardToastProps> = ({ milestone, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-50 max-w-sm w-[calc(100vw-2.5rem)] animate-pop-in"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-0.5 shadow-xl">
        <div className="relative flex items-center gap-3.5 rounded-[14px] bg-slate-900/95 backdrop-blur-md p-4 text-white">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl shadow-inner animate-gentle-bounce">
            {milestone.emoji}
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Milestone Unlocked!</span>
            </div>
            <h4 className="text-sm sm:text-base font-extrabold text-white">
              {milestone.title}
            </h4>
            <p className="text-xs text-slate-300">
              {milestone.description}
            </p>
          </div>
          <button
            onClick={onDismiss}
            aria-label="Dismiss milestone alert"
            className="flex min-h-12 min-w-12 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
