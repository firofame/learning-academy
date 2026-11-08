import React from 'react';
import type { ActiveAppView, StudentId } from '../types';
import { STUDENT_PROFILES } from '../data/profiles';
import { SubjectHome } from './SubjectHome';

export interface ExamTimetableViewProps {
  activeStudent: StudentId;
  onNavigate?: (view: ActiveAppView) => void;
  onSwitchStudent?: (studentId: StudentId) => void;
}

export const ExamTimetableView: React.FC<ExamTimetableViewProps> = ({
  activeStudent,
  onNavigate,
  onSwitchStudent
}) => {
  return (
    <div className="space-y-4">
      {onSwitchStudent && (
        <div className="max-w-5xl mx-auto px-4 pt-4 flex justify-end">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {STUDENT_PROFILES.map(profile => (
              <button
                key={profile.id}
                onClick={() => onSwitchStudent(profile.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeStudent === profile.id
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{profile.avatarEmoji}</span>
                <span>{profile.name}</span>
                <span className="text-slate-400 font-normal">({profile.gradeLabel})</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <SubjectHome
        activeStudent={activeStudent}
        onNavigate={onNavigate ?? (() => {})}
        initialShowTimetable={true}
      />
    </div>
  );
};

export default ExamTimetableView;
