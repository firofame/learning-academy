import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { ActiveAppView, StudentId } from '../types';
import { getStudentProfile } from '../data/wordList';
import { getAvailableSubjectsForGrade } from '../data/subjects';

interface SubjectHomeProps {
  activeStudent: StudentId;
  onNavigate: (view: ActiveAppView) => void;
}

export const SubjectHome: React.FC<SubjectHomeProps> = ({ activeStudent, onNavigate }) => {
  const profile = getStudentProfile(activeStudent);
  const subjects = getAvailableSubjectsForGrade(profile.grade);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">
          {profile.name} · {profile.gradeLabel}
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          What would you like to learn?
        </h1>
        <p className="text-base text-slate-600 max-w-2xl">
          Choose a subject to get started. Only subjects available for {profile.gradeLabel} are shown.
        </p>
      </header>

      <section aria-label={`Subjects for ${profile.gradeLabel}`} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {subjects.map(subject => (
          <article key={subject.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col items-start gap-4">
            <BookOpen className="w-8 h-8 text-amber-700" aria-hidden="true" />
            <div className="space-y-2 flex-1">
              <h2 className="text-2xl font-bold text-slate-900">{subject.name}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{subject.description}</p>
            </div>
            <button
              onClick={() => onNavigate(subject.startView)}
              className="min-h-12 px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              Open {subject.name} <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </article>
        ))}
        {subjects.length === 0 && (
          <p role="status" className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
            No subjects are available for {profile.gradeLabel} yet. Please choose another student profile to explore its subjects.
          </p>
        )}
      </section>
    </div>
  );
};
