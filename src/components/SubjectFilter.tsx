import React, { useId } from 'react';
import { SubjectCategory } from '../types';

type SubjectChoice = SubjectCategory | 'All';

interface SubjectFilterProps {
  subjects: SubjectChoice[];
  value: SubjectChoice;
  onChange: (subject: SubjectChoice) => void;
  getWordCount?: (subject: SubjectChoice) => number;
}

export const SubjectFilter: React.FC<SubjectFilterProps> = ({
  subjects,
  value,
  onChange,
  getWordCount
}) => {
  const selectId = useId();
  const labelFor = (subject: SubjectChoice) =>
    getWordCount ? `${subject} (${getWordCount(subject)})` : subject;

  return (
    <div className="min-w-0 w-full sm:w-auto max-w-full">
      <div className="flex items-center gap-3 sm:hidden">
        <label htmlFor={selectId} className="text-sm font-semibold text-slate-700">Word category</label>
        <select
          id={selectId}
          value={value}
          onChange={(event) => {
            const subject = subjects.find(subject => subject === event.target.value);
            if (!subject) throw new Error(`Unknown subject selected: ${event.target.value}`);
            onChange(subject);
          }}
          className="min-w-0 flex-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-base font-semibold text-slate-900"
        >
          {subjects.map(subject => (
            <option key={subject} value={subject}>{labelFor(subject)}</option>
          ))}
        </select>
      </div>
      <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto max-w-full">
        {subjects.map(subject => (
          <button
            key={subject}
            onClick={() => onChange(subject)}
            aria-pressed={value === subject}
            className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              value === subject
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {labelFor(subject)}
          </button>
        ))}
      </div>
    </div>
  );
};
