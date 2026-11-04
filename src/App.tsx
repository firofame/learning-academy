import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SubjectHome } from './components/SubjectHome';
import { ActiveAppView, SubjectCategory, WordEntry, StudentId } from './types';
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
import { retryLearningPersistence } from './learning/persistence';

const SessionView = lazy(() => import('./components/SessionView').then(module => ({ default: module.SessionView })));
const AllWordsView = lazy(() => import('./components/AllWordsView').then(module => ({ default: module.AllWordsView })));
const ParentDashboard = lazy(() => import('./components/ParentDashboard').then(module => ({ default: module.ParentDashboard })));
const WorksheetView = lazy(() => import('./components/WorksheetView').then(module => ({ default: module.WorksheetView })));
const RoboticsView = lazy(() => import('./components/RoboticsView').then(module => ({ default: module.RoboticsView })));
const MathsView = lazy(() => import('./components/MathsView').then(module => ({ default: module.MathsView })));
const MalayalamView = lazy(() => import('./components/MalayalamView').then(module => ({ default: module.MalayalamView })));
const HindiView = lazy(() => import('./components/HindiView').then(module => ({ default: module.HindiView })));

export default function App() {
  const [currentView, setCurrentView] = useState<ActiveAppView>('home');
  const [activeStudent, setActiveStudent] = useState<StudentId>(() => loadActiveStudent());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [sessionSubject, setSessionSubject] = useState<SubjectCategory | 'All'>('All');
  const [targetedWords, setTargetedWords] = useState<WordEntry[] | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [storageErrorMessage, setStorageErrorMessage] = useState<string | null>(null);
  const [retryingStorage, setRetryingStorage] = useState(false);

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
    audioService.speechEnabled = settings.speechAudio;
    audioService.slowMode = settings.slowSpeech;
    if (!settings.speechAudio) audioService.stopAll();
  }, [settings.speechAudio, settings.slowSpeech]);

  const currentProfile = getStudentProfile(activeStudent);
  const availableSubjects = getAvailableSubjectsForGrade(currentProfile.grade);

  const handleNavigate = (view: ActiveAppView) => {
    audioService.stopAll();
    const subject = getSubjectForView(view);
    if (subject && !availableSubjects.some(available => available.id === subject.id)) {
      emitStorageError(`${subject.name} is not available for ${currentProfile.gradeLabel}. Please choose another subject.`);
      setCurrentView('home');
      return;
    }
    setCurrentView(view);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
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
    // Reset filters and active session inputs
    setSessionSubject('All');
    setTargetedWords(null);
    setRefreshKey(prev => prev + 1);
  };

  const handlePracticeSpecificWord = (word: WordEntry) => {
    setTargetedWords([word]);
    setSessionSubject(word.subject);
    handleNavigate('session');
    setRefreshKey(prev => prev + 1);
  };

  const handleStartSubjectSession = (subject: SubjectCategory) => {
    setTargetedWords(null);
    setSessionSubject(subject);
    handleNavigate('session');
    setRefreshKey(prev => prev + 1);
  };

  const handleStartTargetedSession = (words: WordEntry[]) => {
    setTargetedWords(words);
    if (words.length > 0) {
      setSessionSubject(words[0].subject);
    } else {
      setSessionSubject('All');
    }
    handleNavigate('session');
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
          <div className="flex items-center gap-3 shrink-0">
            {storageErrorMessage.includes('IndexedDB') && (
              <button
                disabled={retryingStorage}
                onClick={async () => {
                  setRetryingStorage(true);
                  const saved = await retryLearningPersistence();
                  setRetryingStorage(false);
                  if (saved) setStorageErrorMessage(null);
                }}
                className="underline underline-offset-2 disabled:opacity-60"
              >
                {retryingStorage ? 'Retrying…' : 'Retry'}
              </button>
            )}
            <button
              onClick={() => setStorageErrorMessage(null)}
              aria-label="Dismiss storage warning"
              className="text-rose-600 hover:text-rose-900 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
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

        {currentView === 'session' && (
          <SessionView
            key={`${activeStudent}-${refreshKey}`}
            settings={settings}
            activeStudent={activeStudent}
            selectedSubject={sessionSubject}
            onSubjectChange={(subj) => {
              setTargetedWords(null);
              setSessionSubject(subj);
            }}
            targetedWords={targetedWords || undefined}
            onClearTargeted={() => setTargetedWords(null)}
            onExploreAll={() => handleNavigate('curriculum')}
            onOpenParent={() => handleNavigate('parent')}
          />
        )}

        {currentView === 'curriculum' && (
          <AllWordsView
            key={`${activeStudent}-${refreshKey}`}
            activeStudent={activeStudent}
            onPracticeSpecificWord={handlePracticeSpecificWord}
            onStartSubjectSession={handleStartSubjectSession}
          />
        )}

        {currentView === 'parent' && (
          <ParentDashboard
            key={activeStudent}
            activeStudent={activeStudent}
            onStartTargetedSession={handleStartTargetedSession}
            onOpenWorksheet={() => handleNavigate('worksheet')}
            onResetComplete={() => setRefreshKey(prev => prev + 1)}
            onOpenRobotics={() => handleNavigate('robotics')}
            onOpenMaths={() => handleNavigate('maths')}
            onOpenMalayalam={() => handleNavigate('malayalam')}
            onOpenHindi={() => handleNavigate('hindi')}
          />
        )}

        {currentView === 'worksheet' && (
          <WorksheetView
            key={activeStudent}
            activeStudent={activeStudent}
            onBackToPractice={() => handleNavigate('session')}
          />
        )}

        {currentView === 'robotics' && (
          <RoboticsView key={activeStudent} activeStudent={activeStudent} settings={settings} />
        )}

        {currentView === 'maths' && (
          <MathsView key={activeStudent} activeStudent={activeStudent} settings={settings} />
        )}

        {currentView === 'malayalam' && (
          <MalayalamView key={activeStudent} activeStudent={activeStudent} settings={settings} />
        )}

        {currentView === 'hindi' && (
          <HindiView key={activeStudent} activeStudent={activeStudent} settings={settings} />
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
