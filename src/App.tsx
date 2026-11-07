import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SubjectHome } from './components/SubjectHome';
import { ActiveAppView, StudentId } from './types';
import {
  loadSettings, 
  saveSettings, 
  loadActiveStudent, 
  saveActiveStudent, 
  subscribeStorageError,
  emitStorageError
} from './utils/appStorage';
import type { AppSettings } from './utils/appStorage';
import { getStudentProfile } from './data/profiles';
import { getAvailableSubjectsForGrade, getSubjectForView } from './data/subjects';
import { audioService } from './utils/audio';

const ProgressDashboard = lazy(() => import('./components/ProgressDashboard').then(module => ({ default: module.ProgressDashboard })));
const SubjectRevisionView = lazy(() => import('./components/SubjectRevisionView').then(module => ({ default: module.SubjectRevisionView })));
const ExamTimetableView = lazy(() => import('./components/ExamTimetableView').then(module => ({ default: module.ExamTimetableView })));

export default function App() {
  const [currentView, setCurrentView] = useState<ActiveAppView>('home');
  const [activeStudent, setActiveStudent] = useState<StudentId>(() => loadActiveStudent());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [storageErrorMessage, setStorageErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeStorageError((msg) => {
      // Storage reads may happen while a child view is rendering.
      queueMicrotask(() => {
        if (active) setStorageErrorMessage(msg);
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    audioService.speechAudio = settings.speechAudio;
    audioService.slowSpeech = settings.slowSpeech;
    if (!settings.speechAudio) audioService.stopAll();
  }, [settings.speechAudio, settings.slowSpeech]);

  const currentProfile = getStudentProfile(activeStudent);
  const availableSubjects = getAvailableSubjectsForGrade(currentProfile.grade);
  const currentSubject = getSubjectForView(currentView);

  const handleNavigate = (view: ActiveAppView) => {
    audioService.stopAll();
    const normalizedView: ActiveAppView = (view as string) === 'session' ? 'spell-bee' : (view as string) === 'parent' ? 'progress' : view;
    const subject = getSubjectForView(normalizedView);
    if (subject && !availableSubjects.some(available => available.id === subject.id)) {
      emitStorageError(`${subject.name} is not available for ${currentProfile.gradeLabel}. Please choose another subject.`);
      setCurrentView('home');
      return;
    }
    setCurrentView(normalizedView);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleSessionSizeChange = (sessionSize: number) => {
    handleUpdateSettings({ ...settings, sessionSize });
  };

  const handleSwitchStudent = (newStudent: StudentId) => {
    audioService.stopAll();
    setActiveStudent(newStudent);
    saveActiveStudent(newStudent);
    const nextGrade = getStudentProfile(newStudent).grade;
    const subject = getSubjectForView(currentView);
    if (subject && !getAvailableSubjectsForGrade(nextGrade).some(available => available.id === subject.id)) {
      setCurrentView('home');
    }
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-800 flex flex-col font-sans">
      {storageErrorMessage && (
        <div role="alert" className="bg-rose-50 border-b border-rose-200 text-rose-800 px-4 py-2.5 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{storageErrorMessage}</span>
          </div>
          <button
            onClick={() => setStorageErrorMessage(null)}
            aria-label="Dismiss storage warning"
            className="text-rose-600 hover:text-rose-900 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Bar Header */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        activeStudent={activeStudent}
        onSwitchStudent={handleSwitchStudent}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Main View Container */}
      <main className="flex-1 min-w-0">
        <Suspense fallback={<div className="max-w-5xl mx-auto p-6 text-sm text-slate-600" role="status">Loading your lesson…</div>}>
        {currentView === 'home' && (
          <SubjectHome activeStudent={activeStudent} onNavigate={handleNavigate} />
        )}

        {currentView === 'progress' && (
          <ProgressDashboard
            key={activeStudent}
            activeStudent={activeStudent}
            onResetComplete={() => setRefreshKey(prev => prev + 1)}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'timetable' && (
          <ExamTimetableView
            key={activeStudent}
            activeStudent={activeStudent}
            onNavigate={handleNavigate}
            onSwitchStudent={handleSwitchStudent}
          />
        )}

        {currentSubject && (
          <SubjectRevisionView
            key={`${currentSubject.id}-${activeStudent}-${refreshKey}`}
            activeStudent={activeStudent}
            subjectId={currentSubject.id}
            settings={settings}
            onSessionSizeChange={handleSessionSizeChange}
          />
        )}
        </Suspense>
      </main>

      {/* Quiet Footer */}
      <footer className="no-print border-t border-slate-200/80 bg-white/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Learning Academy · Learn with confidence, one subject at a time.
          </p>
          <p className="text-slate-400">
            {currentProfile.name} ({currentProfile.gradeLabel}) · {availableSubjects.length} subjects
          </p>
        </div>
      </footer>
    </div>
  );
}
