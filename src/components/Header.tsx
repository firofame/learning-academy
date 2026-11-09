import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, BookOpen, ArrowRightLeft, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { ActiveAppView, StudentId } from '../types';
import type { AppSettings } from '../utils/appStorage';
import { getStudentProfile, STUDENT_PROFILES } from '../data/profiles';
import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from '../utils/syncService';

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
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => getSyncStatus(activeStudent));

  useEffect(() => {
    setSyncStatus(getSyncStatus(activeStudent));
    return subscribeSyncStatus((status, studentId) => {
      if (!studentId || studentId === activeStudent) {
        setSyncStatus(status);
      }
    }, activeStudent);
  }, [activeStudent]);
  const currentProfile = getStudentProfile(activeStudent);

  const toggleStudent = () => {
    const index = STUDENT_PROFILES.findIndex(profile => profile.id === activeStudent);
    onSwitchStudent(STUDENT_PROFILES[(index + 1) % STUDENT_PROFILES.length].id);
  };

  return (
    <header className="border-b border-slate-200 bg-white/95 sm:sticky top-0 z-40 backdrop-blur-sm no-print">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-3">
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

        {/* Zone 2: Navigation & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <nav aria-label="Main navigation" className="flex items-center">
            <button
              onClick={() => onNavigate('home')}
              aria-current={currentView === 'home' || currentView === 'timetable' ? 'page' : undefined}
              className={`px-3 py-1.5 sm:py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                currentView === 'home' || currentView === 'timetable'
                  ? 'bg-amber-50 text-amber-900 border border-amber-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Subjects
            </button>
          </nav>

          {/* Minimal Sync Status Indicator */}
          <div
            role="status"
            aria-live="polite"
            aria-label={
              syncStatus === 'syncing'
                ? 'Syncing progress with cloud…'
                : syncStatus === 'error'
                ? 'Offline · changes saved locally'
                : syncStatus === 'synced'
                ? 'Progress synced with cloud'
                : 'Waiting to sync'
            }
            title={
              syncStatus === 'syncing'
                ? 'Syncing progress…'
                : syncStatus === 'error'
                ? 'Offline · changes saved locally'
                : syncStatus === 'synced'
                ? 'Progress synced'
                : 'Waiting to sync'
            }
            className="flex items-center justify-center w-8 h-8 rounded-lg select-none transition-colors"
          >
            {syncStatus === 'syncing' && (
              <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
            )}
            {syncStatus === 'synced' && (
              <Cloud className="w-4 h-4 text-emerald-600" />
            )}
            {syncStatus === 'error' && (
              <CloudOff className="w-4 h-4 text-amber-500" />
            )}
          </div>

          {/* Audio and Turtle controls only in Spell Bee */}
          {currentView === 'spell-bee' && (
            <>
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
            </>
          )}
        </div>
      </div>
    </header>
  );
};
