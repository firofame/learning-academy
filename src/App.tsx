import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SessionView } from './components/SessionView';
import { AllWordsView } from './components/AllWordsView';
import { ParentDashboard } from './components/ParentDashboard';
import { WorksheetView } from './components/WorksheetView';
import { ActiveAppView, SubjectCategory, WordEntry, StudentId } from './types';
import { 
  loadSettings, 
  saveSettings, 
  AppSettings, 
  loadActiveStudent, 
  saveActiveStudent, 
  subscribeStorageError 
} from './utils/storage';
import { getWordsForStudent, getStudentProfile } from './data/wordList';
import { audioService } from './utils/audio';

export default function App() {
  const [currentView, setCurrentView] = useState<ActiveAppView>('session');
  const [activeStudent, setActiveStudent] = useState<StudentId>(() => loadActiveStudent());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [sessionSubject, setSessionSubject] = useState<SubjectCategory | 'All'>('All');
  const [targetedWords, setTargetedWords] = useState<WordEntry[] | null>(null);
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
    audioService.speechEnabled = settings.speechAudio;
    audioService.slowMode = settings.slowSpeech;
    if (!settings.speechAudio) audioService.stopAll();
  }, [settings.speechAudio, settings.slowSpeech]);

  const studentWords = getWordsForStudent(activeStudent);
  const currentProfile = getStudentProfile(activeStudent);

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleSwitchStudent = (newStudent: StudentId) => {
    setActiveStudent(newStudent);
    saveActiveStudent(newStudent);
    // Reset filters and active session inputs
    setSessionSubject('All');
    setTargetedWords(null);
    setRefreshKey(prev => prev + 1);
  };

  const handlePracticeSpecificWord = (word: WordEntry) => {
    setTargetedWords([word]);
    setSessionSubject(word.subject);
    setCurrentView('session');
    setRefreshKey(prev => prev + 1);
  };

  const handleStartSubjectSession = (subject: SubjectCategory) => {
    setTargetedWords(null);
    setSessionSubject(subject);
    setCurrentView('session');
    setRefreshKey(prev => prev + 1);
  };

  const handleStartTargetedSession = (words: WordEntry[]) => {
    setTargetedWords(words);
    if (words.length > 0) {
      setSessionSubject(words[0].subject);
    } else {
      setSessionSubject('All');
    }
    setCurrentView('session');
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
            className="text-rose-600 hover:text-rose-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Bar Header */}
      <Header
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        activeStudent={activeStudent}
        onSwitchStudent={handleSwitchStudent}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Main View Container */}
      <main className="flex-1 min-w-0">
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
            onExploreAll={() => setCurrentView('curriculum')}
            onOpenParent={() => setCurrentView('parent')}
          />
        )}

        {currentView === 'curriculum' && (
          <AllWordsView
            activeStudent={activeStudent}
            onPracticeSpecificWord={handlePracticeSpecificWord}
            onStartSubjectSession={handleStartSubjectSession}
          />
        )}

        {currentView === 'parent' && (
          <ParentDashboard
            activeStudent={activeStudent}
            onStartTargetedSession={handleStartTargetedSession}
            onOpenWorksheet={() => setCurrentView('worksheet')}
            onResetComplete={() => setRefreshKey(prev => prev + 1)}
          />
        )}

        {currentView === 'worksheet' && (
          <WorksheetView
            activeStudent={activeStudent}
            onBackToPractice={() => setCurrentView('session')}
          />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="no-print border-t border-slate-200/80 bg-white/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Spell Bee Learning Companion · Designed for calm, evidence-based spelling mastery.
          </p>
          <p className="text-slate-400">
            {currentProfile.name} ({currentProfile.gradeLabel}) · {studentWords.length} Curriculum Words
          </p>
        </div>
      </footer>
    </div>
  );
}
