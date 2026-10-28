import React from 'react';
import { Volume2, VolumeX, Sparkles, BookOpen, HeartHandshake, Printer, ArrowRightLeft, Bot } from 'lucide-react';
import { ActiveAppView, StudentId } from '../types';
import { AppSettings } from '../utils/storage';
import { STUDENT_PROFILES, getStudentProfile, getWordsForStudent } from '../data/wordList';
import { getAvailableSubjectsForGrade, getSubjectForView } from '../data/subjects';

interface HeaderProps {
  currentView: ActiveAppView;
  onNavigate: (view: ActiveAppView) => void;
  activeStudent: StudentId;
  onSwitchStudent: (studentId: StudentId) => void;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  activeStudent,
  onSwitchStudent,
  settings,
  onUpdateSettings
}) => {
  const currentProfile = getStudentProfile(activeStudent);
  const studentWords = getWordsForStudent(activeStudent);
  const availableSubjects = getAvailableSubjectsForGrade(currentProfile.grade);
  const currentSubject = getSubjectForView(currentView);
  const spellingViews: { view: ActiveAppView; label: string; shortLabel: string; icon: typeof BookOpen }[] = [
    { view: 'session', label: 'Practice', shortLabel: 'Practice', icon: Sparkles },
    { view: 'curriculum', label: `All ${studentWords.length} Words`, shortLabel: 'Words', icon: BookOpen },
    { view: 'parent', label: 'Parent Insights', shortLabel: 'Insights', icon: HeartHandshake },
    { view: 'worksheet', label: 'Worksheets', shortLabel: 'Sheets', icon: Printer }
  ];

  const toggleStudent = () => {
    const index = STUDENT_PROFILES.findIndex(profile => profile.id === activeStudent);
    onSwitchStudent(STUDENT_PROFILES[(index + 1) % STUDENT_PROFILES.length].id);
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 sm:sticky top-0 z-40 backdrop-blur-sm no-print">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 sm:py-3 lg:py-2 lg:min-h-16 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        {/* Zone 1: Brand & Profile Switcher */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => onNavigate('home')}
            aria-label="Learning Academy home"
            className="flex items-center gap-2 cursor-pointer group select-none"
          >
            <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-base shadow-xs group-hover:bg-amber-600 transition-colors">
              <BookOpen className="w-5 h-5" />
            </span>
            <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-amber-700 transition-colors whitespace-nowrap">
              Learning Academy
            </span>
          </button>

          {/* Profile Switcher Button */}
          <button
            onClick={toggleStudent}
            title={`Switch student (currently ${currentProfile.name})`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-all cursor-pointer whitespace-nowrap active:scale-95"
          >
            <span>{currentProfile.avatarEmoji}</span>
            <span className="font-bold text-slate-900">{currentProfile.name}</span>
            <span className="text-slate-500 font-normal">({currentProfile.gradeLabel})</span>
            <ArrowRightLeft className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav aria-label="Main navigation" className="order-last lg:order-none w-full lg:w-auto flex flex-wrap items-center gap-1 sm:gap-2">
          <button
            onClick={() => onNavigate('home')}
            aria-current={currentView === 'home' ? 'page' : undefined}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
              currentView === 'home'
                ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Subjects
          </button>
          {availableSubjects.map(subject => (
            <button
              key={subject.id}
              onClick={() => onNavigate(subject.startView)}
              aria-current={currentSubject?.id === subject.id ? 'page' : undefined}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-1.5 ${
                currentSubject?.id === subject.id
                  ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {subject.id === 'robotics' ? <Bot className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
              {subject.name}
            </button>
          ))}
        </nav>

        {/* Zone 3: Settings & Audio Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Session Size Selector */}
          {currentSubject?.id === 'spell-bee' && <select
            value={settings.sessionSize}
            onChange={(e) => onUpdateSettings({ ...settings, sessionSize: Number(e.target.value) })}
            aria-label="Practice session length"
            title="Practice session length"
            className="text-xs font-semibold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer hidden md:block"
          >
            <option value={5}>5 words</option>
            <option value={10}>10 words</option>
            <option value={0}>All due</option>
          </select>}

          {/* Turtle Mode (Slow speech) */}
          <button
            onClick={() => onUpdateSettings({ ...settings, slowSpeech: !settings.slowSpeech })}
            aria-pressed={settings.slowSpeech}
            title={settings.slowSpeech ? 'Slow speech (Turtle mode) is ON' : 'Normal speech speed'}
            className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-colors ${
              settings.slowSpeech 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-sm">🐢</span>
            <span className="hidden lg:inline">{settings.slowSpeech ? 'Slow' : 'Normal'}</span>
          </button>

          {/* Audio Sound Toggle */}
          <button
            onClick={() => onUpdateSettings({ ...settings, speechAudio: !settings.speechAudio })}
            title={settings.speechAudio ? 'Voice audio is ON' : 'Voice audio is OFF'}
            className={`p-2 rounded-lg border text-slate-600 transition-colors ${
              settings.speechAudio 
                ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800' 
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
            aria-label="Toggle audio"
            aria-pressed={settings.speechAudio}
          >
            {settings.speechAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
        {currentSubject?.id === 'spell-bee' && (
          <nav aria-label="Spell Bee navigation" className="max-w-6xl mx-auto px-3 sm:px-6 pb-2 grid grid-cols-4 sm:flex gap-1 sm:gap-2">
            {spellingViews.map(({ view, label, shortLabel, icon: Icon }) => (
              <button
                key={view}
                onClick={() => onNavigate(view)}
                aria-label={label}
                aria-current={currentView === view ? 'page' : undefined}
                className={`min-w-0 px-1 sm:px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 cursor-pointer ${
                  currentView === view ? 'bg-amber-50 text-amber-900' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{shortLabel}</span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
};
