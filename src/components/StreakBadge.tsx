import React from 'react';
import { Flame } from 'lucide-react';

interface StreakBadgeProps {
  streak: number;
  todayActive?: boolean;
  className?: string;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  streak,
  todayActive = false,
  className = ''
}) => {
  if (streak <= 0 && !todayActive) {
    return (
      <div
        role="img"
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 select-none ${className}`}
        title="Start a study streak today!"
        aria-label="No current study streak. Start one today!"
      >
        <Flame className="w-3.5 h-3.5 text-slate-400" />
        <span>0</span>
      </div>
    );
  }

  return (
    <div
      role="img"
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all select-none ${
        todayActive
          ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
          : 'bg-orange-50 text-orange-800 border border-orange-200 animate-glow-pulse'
      } ${className}`}
      title={
        todayActive
          ? `${streak}-day study streak! Kept alive today.`
          : `${streak}-day streak at risk! Answer a question today to keep it going.`
      }
      aria-label={`${streak}-day study streak${todayActive ? ', kept alive today' : ', answer correctly today to continue'}`}
    >
      <Flame
        className={`w-3.5 h-3.5 ${
          todayActive ? 'text-amber-600 fill-amber-500' : 'text-orange-500'
        }`}
      />
      <span>{streak}</span>
      <span className="hidden sm:inline font-normal text-[11px] opacity-80">
        {streak === 1 ? 'day' : 'days'}
      </span>
    </div>
  );
};
