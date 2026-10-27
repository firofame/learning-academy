import React from 'react';
import { Volume2, VolumeX, Sparkles, BookOpen, HeartHandshake, Printer, ArrowRightLeft } from 'lucide-react';
import { ActiveAppView, StudentId } from '../types';
import { AppSettings } from '../utils/storage';
import { STUDENT_PROFILES, getWordsForStudent } from '../data/wordList';

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
  const currentProfile = STUDENT_PROFILES.find(p => p.id === activeStudent) || STUDENT_PROFILES[0];
  const studentWords = getWordsForStudent(activeStudent);

  const toggleStudent = () => {
    const next = activeStudent === 'shiza' ? 'fazia' : 'shiza';
    onSwitchStudent(next);
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 sticky top-0 z-40 backdrop-blur-sm no-print">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand & Profile Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <div 
            onClick={() => onNavigate('session')}
            className="flex items-center gap-2 cursor-pointer group select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-base shadow-xs group-hover:bg-amber-600 transition-colors">
              🐝
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-amber-700 transition-colors whitespace-nowrap hidden sm:inline">
              Spell Bee
            </span>
          </div>

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
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onNavigate('session')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              currentView === 'session'
                ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Practice</span>
          </button>

          <button
            onClick={() => onNavigate('curriculum')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              currentView === 'curriculum'
                ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-600" />
            <span>All {studentWords.length} Words</span>
          </button>

          <button
            onClick={() => onNavigate('parent')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              currentView === 'parent'
                ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Parent Insights</span>
            <span className="sm:hidden">Insights</span>
          </button>

          <button
            onClick={() => onNavigate('worksheet')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              currentView === 'worksheet'
                ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Worksheets</span>
            <span className="sm:hidden">Sheets</span>
          </button>
        </nav>

        {/* Zone 3: Settings & Audio Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Session Size Selector */}
          <select
            value={settings.sessionSize}
            onChange={(e) => onUpdateSettings({ ...settings, sessionSize: Number(e.target.value) })}
            title="Practice session length"
            className="text-xs font-semibold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 cursor-pointer hidden md:block"
          >
            <option value={5}>5 words</option>
            <option value={10}>10 words</option>
            <option value={0}>All due</option>
          </select>

          {/* Turtle Mode (Slow speech) */}
          <button
            onClick={() => onUpdateSettings({ ...settings, slowSpeech: !settings.slowSpeech })}
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
          >
            {settings.speechAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
