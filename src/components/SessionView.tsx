import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Volume2, 
  RotateCcw, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  Eye, 
  Sparkles, 
  PenTool, 
  Lightbulb, 
  Volume1, 
  Check, 
  X,
  RefreshCw,
  Award,
  ChevronRight,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { WordEntry, SubjectCategory, StudyMode, StudentId } from '../types';
import { SUBJECT_METADATA, getWordsForStudent, getStudentProfile } from '../data/wordList';
import { audioService } from '../utils/audio';
import { evaluateSpelling } from '../utils/spellingCoach';
import { recordAttempt, selectSessionWords, getWordProgress, AppSettings } from '../utils/storage';

interface SessionViewProps {
  settings: AppSettings;
  activeStudent: StudentId;
  selectedSubject?: SubjectCategory | 'All';
  onSubjectChange: (subj: SubjectCategory | 'All') => void;
  onExploreAll: () => void;
  onOpenParent: () => void;
  onStartSpecificWord?: WordEntry;
  targetedWords?: WordEntry[];
  onClearTargeted?: () => void;
}

export const SessionView: React.FC<SessionViewProps> = ({
  settings,
  activeStudent,
  selectedSubject = 'All',
  onSubjectChange,
  onExploreAll,
  onOpenParent,
  targetedWords,
  onClearTargeted
}) => {
  const currentProfile = getStudentProfile(activeStudent);
  const studentWords = getWordsForStudent(activeStudent);

  // Available subjects for active student
  const availableSubjects: Array<SubjectCategory | 'All'> = [
    'All',
    ...Array.from(new Set(studentWords.map(w => w.subject)))
  ];

  // Session queue and current state
  const [sessionQueue, setSessionQueue] = useState<WordEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [studyMode, setStudyMode] = useState<StudyMode>('learn');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Guided Practice state
  const [guidedSelectedTiles, setGuidedSelectedTiles] = useState<string[]>([]);
  const [guidedAvailableTiles, setGuidedAvailableTiles] = useState<string[]>([]);
  const [guidedCoachingMessage, setGuidedCoachingMessage] = useState<string | null>(null);

  // Submission and assistance tracking
  const [hasSubmittedCurrentCard, setHasSubmittedCurrentCard] = useState<boolean>(false);
  const [isAssistedAttempt, setIsAssistedAttempt] = useState<boolean>(true);
  const submittedRef = useRef(false);
  const [showNativeTiles, setShowNativeTiles] = useState(false);
  const [shuffledNativeTiles, setShuffledNativeTiles] = useState<string[]>([]);

  // Test Mode state (Unaided Recall)
  const [testInput, setTestInput] = useState<string>('');
  const [isPaperMode, setIsPaperMode] = useState<boolean>(settings.paperModeDefault);
  const [paperRevealed, setPaperRevealed] = useState<boolean>(false);
  const [testFeedback, setTestFeedback] = useState<{
    submitted: boolean;
    isCorrect: boolean;
    message: string;
    coachingTip?: string;
  } | null>(null);

  // Active word spelling audio highlight
  const [highlightedLetterIdx, setHighlightedLetterIdx] = useState<number | null>(null);

  // Completed session record
  const [sessionResults, setSessionResults] = useState<Array<{
    word: WordEntry;
    mode: StudyMode;
    wasUnaidedCorrect: boolean;
  }>>([]);

  // Initialize a fresh session
  const startNewSession = (subject: SubjectCategory | 'All' = selectedSubject) => {
    let words: WordEntry[];
    if (targetedWords && targetedWords.length > 0) {
      words = [...targetedWords];
    } else {
      const sessionCount = settings.sessionSize > 0 ? settings.sessionSize : 0;
      words = selectSessionWords(activeStudent, subject, sessionCount);
    }
    setSessionQueue(words);
    setCurrentIndex(0);
    const initialMode = words[0] && getWordProgress(words[0].id, activeStudent).attempts > 0 ? 'test' : 'learn';
    setStudyMode(initialMode);
    setIsCompleted(false);
    setSessionResults([]);
    resetWordStates(words[0], initialMode);
  };

  useEffect(() => {
    startNewSession(selectedSubject);
  }, [activeStudent, selectedSubject, settings.sessionSize, targetedWords]);

  const currentWord = sessionQueue[currentIndex] || null;
  const currentSubjectMeta = currentWord ? SUBJECT_METADATA[currentWord.subject] : null;

  useEffect(() => {
    if (!currentWord || studyMode !== 'test' || isCompleted) return;
    const timer = setTimeout(() => {
      audioService.speak(currentWord.nativeScript || currentWord.canonicalSpelling, currentWord.languageCode);
    }, 400);
    return () => {
      clearTimeout(timer);
      audioService.stopAll();
    };
  }, [currentWord, studyMode, isCompleted]);

  // Reset inputs when switching words
  const resetWordStates = (word: WordEntry | null, mode: StudyMode = studyMode) => {
    if (!word) return;
    setGuidedSelectedTiles([]);
    // Shuffle grapheme/syllable tiles for puzzle assembly
    const tiles = [...word.graphemeTiles].sort(() => Math.random() - 0.5);
    setGuidedAvailableTiles(tiles);
    setGuidedCoachingMessage(null);
    setTestInput('');
    setPaperRevealed(false);
    setTestFeedback(null);
    setHighlightedLetterIdx(null);
    setHasSubmittedCurrentCard(false);
    submittedRef.current = false;
    setIsAssistedAttempt(mode !== 'test');
    setShowNativeTiles(false);
    // Native helpers stay hidden until the learner opts into assisted practice.
    if (word.nativeScript) {
      const nativeTiles = [...word.graphemeTiles].sort(() => Math.random() - 0.5);
      setShuffledNativeTiles(nativeTiles);
    } else {
      setShuffledNativeTiles([]);
    }
  };

  // Play audio pronunciation of current word
  const playWordAudio = () => {
    if (!currentWord) return;
    audioService.speak(
      currentWord.nativeScript || currentWord.canonicalSpelling,
      currentWord.languageCode
    );
  };

  // Play spelling letter-by-letter
  const playSpellOutAudio = () => {
    if (!currentWord) return;
    audioService.spellOut(
      currentWord.letterSpelling,
      (idx) => setHighlightedLetterIdx(idx),
      () => setHighlightedLetterIdx(null)
    );
  };

  // Mode tab change handler
  const handleSelectMode = (mode: StudyMode) => {
    if (settings.soundEffects) audioService.playTileTap();
    setStudyMode(mode);

    // If card was already submitted, PRESERVE feedback and submission protection
    if (!hasSubmittedCurrentCard) {
      // Switching to Learn or Practice reveals answers/hints; mark current card attempt as assisted
      if (mode === 'learn' || mode === 'practice') {
        setIsAssistedAttempt(true);
      }
      setTestFeedback(null);
      setPaperRevealed(false);
    }

  };

  // Guided tile tap
  const handleTileTap = (tile: string, tileIndex: number) => {
    if (settings.soundEffects) audioService.playTileTap();

    const newSelected = [...guidedSelectedTiles, tile];
    const newAvailable = guidedAvailableTiles.filter((_, idx) => idx !== tileIndex);
    
    setGuidedSelectedTiles(newSelected);
    setGuidedAvailableTiles(newAvailable);

    const assembledWord = newSelected.join('');

    // Check if finished
    if (newAvailable.length === 0) {
      if (evaluateSpelling(currentWord, assembledWord).isCorrect) {
        if (settings.soundEffects) audioService.playGentleSuccess();
        setGuidedCoachingMessage("Terrific! You assembled the word correctly.");
        recordAttempt(currentWord.id, activeStudent, true, 'practice');
      } else {
        if (settings.soundEffects) audioService.playGentlePrompt();
        setGuidedCoachingMessage(`Good try! Check the letter pattern: ${currentWord.trickySpot}`);
        recordAttempt(currentWord.id, activeStudent, false, 'practice', assembledWord);

        // Re-queue 2-3 words later for reinforcement
        setSessionQueue(prev => {
          const nextQueue = [...prev];
          const insertPos = Math.min(currentIndex + 3, nextQueue.length);
          nextQueue.splice(insertPos, 0, currentWord);
          return nextQueue;
        });
      }
    }
  };

  // Reset tiles in guided mode
  const handleResetTiles = () => {
    if (!currentWord) return;
    setGuidedSelectedTiles([]);
    setGuidedAvailableTiles([...currentWord.graphemeTiles].sort(() => Math.random() - 0.5));
    setGuidedCoachingMessage(null);
  };

  // Append a tile directly to test input for Indic scripts
  const handleAddScriptTileToInput = (tile: string) => {
    if (submittedRef.current) return;
    if (settings.soundEffects) audioService.playTileTap();
    // Using native virtual helper tiles is assisted practice
    setIsAssistedAttempt(true);
    setTestInput(prev => prev + tile);
  };

  // Submit test mode spelling
  const handleSubmitTest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    // Enforce submission protection in handler!
    if (submittedRef.current) return;
    if (!currentWord || !testInput.trim()) return;

    submittedRef.current = true;
    setHasSubmittedCurrentCard(true);

    const feedback = evaluateSpelling(currentWord, testInput);
    const wasUnaided = !isAssistedAttempt;

    let displayMessage = feedback.message;
    if (feedback.isCorrect && isAssistedAttempt) {
      displayMessage = `Good practice! (Assisted attempt — to earn Test-Ready credit, spell it unaided without tiles or clues).`;
    }

    setTestFeedback({
      submitted: true,
      isCorrect: feedback.isCorrect,
      message: displayMessage,
      coachingTip: feedback.coachingTip
    });

    const targetMode = wasUnaided ? 'test' : 'practice';

    if (feedback.isCorrect) {
      if (settings.soundEffects) audioService.playGentleSuccess();
      const rec = recordAttempt(currentWord.id, activeStudent, true, targetMode, testInput);
      if (rec.saveFailed) {
        setTestFeedback(prev => prev ? {
          ...prev,
          message: `${prev.message} (Note: Storage save failed; progress was not saved).`
        } : null);
      }
    } else {
      if (settings.soundEffects) audioService.playGentlePrompt();
      recordAttempt(currentWord.id, activeStudent, false, targetMode, testInput);

      // SPACED REPETITION INSERTION:
      // Re-insert this word 2 items later in the queue so she tries it again without hints!
      setSessionQueue(prev => {
        const nextQueue = [...prev];
        const insertPos = Math.min(currentIndex + 3, nextQueue.length);
        nextQueue.splice(insertPos, 0, currentWord);
        return nextQueue;
      });
    }
  };

  // Paper mode parent validation
  const handlePaperValidation = (isCorrect: boolean) => {
    // Enforce submission protection in handler!
    if (submittedRef.current) return;
    if (!currentWord || !paperRevealed) return;

    submittedRef.current = true;
    setHasSubmittedCurrentCard(true);
    const targetMode = isAssistedAttempt ? 'practice' : 'paper';

    if (isCorrect) {
      if (settings.soundEffects) audioService.playGentleSuccess();
      const rec = recordAttempt(currentWord.id, activeStudent, true, targetMode);
      setTestFeedback({
        submitted: true,
        isCorrect: true,
        message: rec.saveFailed 
          ? "Notebook attempt checked! (Note: Storage save failed; progress was not saved)."
          : isAssistedAttempt
            ? "Good notebook practice! This assisted attempt does not earn Test-Ready credit."
            : "Excellent! Marked as correctly written in notebook."
      });
    } else {
      if (settings.soundEffects) audioService.playGentlePrompt();
      recordAttempt(currentWord.id, activeStudent, false, targetMode, 'Notebook mistake');
      setTestFeedback({
        submitted: true,
        isCorrect: false,
        message: "Good try! We scheduled this word to review again shortly.",
        coachingTip: currentWord.trickySpot
      });

      // Insert for spaced review
      setSessionQueue(prev => {
        const nextQueue = [...prev];
        const insertPos = Math.min(currentIndex + 3, nextQueue.length);
        nextQueue.splice(insertPos, 0, currentWord);
        return nextQueue;
      });
    }
  };

  // Move to next word or complete session
  const handleNextWord = () => {
    const isLastWord = currentIndex >= sessionQueue.length - 1;

    // Record summary
    if (currentWord) {
      const earnedUnaided = !isAssistedAttempt && (studyMode === 'test' || isPaperMode) && (testFeedback?.isCorrect || false);
      setSessionResults(prev => [
        ...prev,
        {
          word: currentWord,
          mode: isAssistedAttempt ? 'practice' : studyMode,
          wasUnaidedCorrect: earnedUnaided
        }
      ]);
    }

    if (isLastWord) {
      setIsCompleted(true);
      if (settings.soundEffects) {
        audioService.playGentleSuccess();
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch {
          // Ignore
        }
      }
    } else {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      // Keep mode or default to Learn
      resetWordStates(sessionQueue[nextIdx]);
    }
  };

  if (!currentWord && !isCompleted) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="text-slate-600 font-medium">Loading words for {currentProfile.name}...</p>
      </div>
    );
  }

  // Session Complete View
  if (isCompleted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-3xl">
            🌟
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Practice Round Finished!
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto">
              Great work, {currentProfile.name}! Practicing regularly across separate sessions is what builds lasting spelling confidence.
            </p>
          </div>

          {/* Results List */}
          <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 text-left bg-slate-50/50">
            {sessionResults.map((res, i) => {
              const prog = getWordProgress(res.word.id, activeStudent);
              return (
                <div key={i} className="p-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 w-5">
                      {i + 1}.
                    </span>
                    <div>
                      <span className="text-base font-bold text-slate-900">
                        {res.word.word}
                      </span>
                      <span className="text-xs text-slate-500 block">
                        {res.word.meaning}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {prog.level === 'remembered' && (
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Test-Ready
                      </span>
                    )}
                    {prog.level === 'practising' && (
                      <span className="text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Practising
                      </span>
                    )}
                    {prog.level === 'learning' && (
                      <span className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Revisit Due
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => startNewSession(selectedSubject)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 text-white font-semibold text-sm hover:bg-amber-700 transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Practice Another Round</span>
            </button>

            <button
              onClick={onOpenParent}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4 text-slate-500" />
              <span>View Test Readiness</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Subject Filter Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-xl overflow-x-auto max-w-full">
          {availableSubjects.map(subj => (
            <button
              key={subj}
              onClick={() => onSubjectChange(subj)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedSubject === subj
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>

        <button
          onClick={onExploreAll}
          className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 whitespace-nowrap"
        >
          <span>Curriculum ({studentWords.length})</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {targetedWords && targetedWords.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-950 font-medium">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-700" />
            <span>Targeted Practice: <strong>{targetedWords.length} {targetedWords.length === 1 ? 'Word' : 'Words'} Target List</strong></span>
          </div>
          <button 
            onClick={() => {
              onClearTargeted?.();
              startNewSession(selectedSubject);
            }}
            className="text-amber-800 hover:text-amber-950 font-semibold underline cursor-pointer"
          >
            Switch to Regular Session
          </button>
        </div>
      )}

      {/* Progress & 3-Mode Tab Control */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs"
              style={{ 
                backgroundColor: currentSubjectMeta?.bgLight || '#F8FAFC', 
                color: currentSubjectMeta?.accentColor || '#334155' 
              }}
            >
              {currentIndex + 1}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{currentWord.subject}</span>
                <span aria-hidden="true">·</span>
                <span>Word {currentIndex + 1} of {sessionQueue.length}</span>
                {sessionQueue.length > (settings.sessionSize || 5) && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-amber-800 font-semibold">Spaced revisit</span>
                  </>
                )}
              </div>
              <span className="text-sm font-semibold text-slate-900 block truncate max-w-full sm:max-w-sm">
                {currentWord.meaning}
              </span>
            </div>
          </div>

          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md hidden sm:inline">
            {currentProfile.name} ({currentProfile.gradeLabel})
          </span>
        </div>

        {/* 3 Explicit Learning Mode Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1">
          <button
            onClick={() => handleSelectMode('learn')}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              studyMode === 'learn'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>1. Learn</span>
          </button>

          <button
            onClick={() => handleSelectMode('practice')}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              studyMode === 'practice'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>2. Practice (Assisted)</span>
          </button>

          <button
            onClick={() => handleSelectMode('test')}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              studyMode === 'test'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>3. Test (Unaided Recall)</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          MODE 1: LEARN (Discover, Pronunciation, Meaning, Tricky spot)
         ======================================================== */}
      {studyMode === 'learn' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="text-center space-y-3">
            <span className="text-xs uppercase tracking-wider font-bold text-slate-400">
              {currentWord.subject} · Word #{currentWord.categoryNumber}
            </span>

            <div className="py-2">
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
                {currentWord.word}
              </h1>

              {currentWord.transliteration && (
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Transliteration: <span className="text-slate-800 font-semibold">{currentWord.transliteration}</span>
                </p>
              )}
              {currentWord.phoneticGuide && (
                <p className="text-xs font-medium text-slate-500">
                  Sound guide: <span className="font-semibold text-slate-700">{currentWord.phoneticGuide}</span>
                </p>
              )}
            </div>

            {/* Pronunciation & Phonics Buttons */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={playWordAudio}
                className="px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>Hear Word</span>
              </button>

              <button
                onClick={playSpellOutAudio}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Volume1 className="w-4 h-4 text-slate-500" />
                <span>Spell Out</span>
              </button>
            </div>
          </div>

          {/* Letter breakdown */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap py-2">
            {currentWord.letterSpelling.map((letter, idx) => (
              <span
                key={idx}
                className={`w-8 h-9 sm:w-9 sm:h-10 rounded-lg flex items-center justify-center font-bold text-base transition-colors ${
                  highlightedLetterIdx === idx
                    ? 'bg-amber-500 text-white scale-110 shadow-sm'
                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                }`}
              >
                {letter}
              </span>
            ))}
          </div>

          {/* Meaning & Context Card */}
          <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-4 sm:p-5 space-y-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Meaning & Definition
              </span>
              <p className="text-base text-slate-800 font-medium leading-relaxed">
                {currentWord.meaning}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Contextual Sentence
              </span>
              <p className="text-sm text-slate-700 italic">
                "{currentWord.childFriendlySentence}"
              </p>
            </div>
          </div>

          {/* Tricky Spot Spotlight */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-950 block mb-0.5">
                Key Spelling Pattern to Remember
              </span>
              <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
                {currentWord.trickySpot}
              </p>
            </div>
          </div>

          {/* Next Button */}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => handleSelectMode('practice')}
              className="flex-1 py-3 rounded-xl bg-slate-900 text-white font-bold text-sm sm:text-base hover:bg-slate-800 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Practice with Tiles</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSelectMode('test')}
              className="py-3 px-5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Skip to Test
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODE 2: PRACTICE (Guided Scaffolding with Tiles)
         ======================================================== */}
      {studyMode === 'practice' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Assisted Tile Assembly
            </span>
            <h2 className="text-2xl font-bold text-slate-900">
              Build the Word: {currentWord.transliteration || currentWord.word}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Tap the syllable and letter blocks in order. (Note: assisted practice helps you learn, but only unaided test mode counts toward test readiness!)
            </p>
          </div>

          {/* Assembled rack */}
          <div className="min-h-[64px] p-3 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center gap-2 flex-wrap">
            {guidedSelectedTiles.length === 0 ? (
              <span className="text-xs text-slate-400 italic">
                Tap blocks below to assemble
              </span>
            ) : (
              guidedSelectedTiles.map((tile, i) => (
                <span
                  key={i}
                  className="px-3 py-2 rounded-lg bg-white border border-slate-200 font-bold text-slate-900 shadow-xs text-lg"
                >
                  {tile === ' ' ? '␣' : tile}
                </span>
              ))
            )}
          </div>

          {/* Available tiles */}
          <div className="flex items-center justify-center gap-2.5 flex-wrap py-2">
            {guidedAvailableTiles.map((tile, idx) => (
              <button
                key={idx}
                onClick={() => handleTileTap(tile, idx)}
                className="px-4 py-2.5 rounded-xl bg-white border-2 border-slate-200 font-bold text-slate-800 text-lg hover:border-amber-400 hover:bg-amber-50/50 active:scale-95 transition-all shadow-xs cursor-pointer"
              >
                {tile === ' ' ? '␣ Space' : tile}
              </button>
            ))}
          </div>

          {/* Reset button */}
          <div className="flex justify-center">
            <button
              onClick={handleResetTiles}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Blocks</span>
            </button>
          </div>

          {/* Gentle Coaching Message */}
          {guidedCoachingMessage && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              guidedAvailableTiles.length === 0 && evaluateSpelling(currentWord, guidedSelectedTiles.join('')).isCorrect
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}>
              <div className="p-1 rounded-md bg-white/80 shrink-0 mt-0.5">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="text-xs sm:text-sm font-medium leading-relaxed">
                {guidedCoachingMessage}
              </div>
            </div>
          )}

          {/* Next Button */}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={() => handleSelectMode('learn')}
              className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 cursor-pointer"
            >
              Back to Learn
            </button>

            <button
              onClick={() => handleSelectMode('test')}
              className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-bold text-sm sm:text-base hover:bg-amber-700 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Test Word Unaided</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODE 3: TEST (Unaided Recall - Target Word Completely Hidden)
         ======================================================== */}
      {studyMode === 'test' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                {isAssistedAttempt ? 'Assisted Recall Practice' : 'Independent Test Mode (Unaided)'}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Word is Hidden
              </h2>
            </div>

            {/* Paper vs Digital Toggle */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                onClick={() => {
                  if (paperRevealed) setIsAssistedAttempt(true);
                  setIsPaperMode(false);
                }}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  !isPaperMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Type on Screen
              </button>
              <button
                onClick={() => setIsPaperMode(true)}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
                  isPaperMode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                <PenTool className="w-3 h-3" />
                <span>Paper Notebook</span>
              </button>
            </div>
          </div>

          {/* Audio Prompt & Context Sentence with Blank */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 sm:p-5 text-center space-y-3">
            <button
              onClick={playWordAudio}
              className="px-5 py-2.5 rounded-xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors shadow-xs inline-flex items-center gap-2 cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>Hear Word Spoken</span>
            </button>

            <div className="pt-2 text-left bg-white p-3.5 rounded-lg border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                Context Sentence (Spell the missing word):
              </span>
              <p className="text-sm font-medium text-slate-800 italic">
                "{currentWord.hiddenSentence}"
              </p>
            </div>
          </div>

          {/* Option A: Digital Type-in */}
          {!isPaperMode && (
            <form onSubmit={handleSubmitTest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Type the exact spelling:
                </label>
                <input
                  type="text"
                  autoFocus
                  disabled={testFeedback?.submitted}
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Type word here..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-amber-500 focus:outline-none text-xl sm:text-2xl font-bold tracking-wide text-slate-900 bg-white"
                />
              </div>

              {/* Indic Script Virtual Tile Helper */}
              {currentWord.nativeScript && !testFeedback?.submitted && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500 block">
                    Native script helpers count as assisted practice.
                  </span>
                    {!showNativeTiles ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAssistedAttempt(true);
                          setShowNativeTiles(true);
                        }}
                        className="px-3 py-2 text-xs font-semibold bg-slate-100 rounded-lg border border-slate-200"
                      >
                        Show native script tiles (assisted)
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                    {(shuffledNativeTiles.length > 0 ? shuffledNativeTiles : currentWord.graphemeTiles).map((tile, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleAddScriptTileToInput(tile)}
                        className="px-2.5 py-1 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md border border-slate-200 active:scale-95 transition-all cursor-pointer"
                      >
                        {tile === ' ' ? '␣ Space' : tile}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTestInput('')}
                      className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-md"
                    >
                      Clear
                    </button>
                    </div>
                  )}
                </div>
              )}

              {!testFeedback && (
                <button
                  type="submit"
                  disabled={!testInput.trim()}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-base hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  Submit & Check Answer
                </button>
              )}
            </form>
          )}

          {/* Option B: Paper Notebook Mode */}
          {isPaperMode && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs sm:text-sm text-amber-950">
                <p className="font-semibold mb-1">📝 Notebook Handwriting Test:</p>
                <p>Have your child write the spelling with a pen/pencil in her notebook. After she finishes writing, reveal the spelling below to mark whether she got it right.</p>
              </div>

              {!paperRevealed ? (
                <button
                  onClick={() => setPaperRevealed(true)}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Reveal Spelling to Verify</span>
                </button>
              ) : (
                <div className="space-y-4 border border-slate-200 p-4 rounded-xl bg-slate-50/50">
                  <div className="text-center">
                    <span className="text-xs text-slate-400 uppercase font-bold block mb-1">
                      Correct Spelling:
                    </span>
                    <span className="text-3xl font-extrabold text-slate-900 tracking-wide block">
                      {currentWord.word}
                    </span>
                    <span className="text-xs text-slate-500 block mt-1">
                      {currentWord.trickySpot}
                    </span>
                  </div>

                  {!testFeedback && (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => handlePaperValidation(false)}
                        className="flex-1 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 font-semibold text-xs sm:text-sm hover:bg-rose-100 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Needs Practice</span>
                      </button>

                      <button
                        onClick={() => handlePaperValidation(true)}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs sm:text-sm hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Spelled Correctly!</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Feedback & Coaching Response */}
          {testFeedback && (
            <div className={`p-5 rounded-xl border space-y-3 ${
              testFeedback.isCorrect 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}>
              <div className="flex items-start gap-3">
                {testFeedback.isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold text-sm sm:text-base leading-snug">
                    {testFeedback.message}
                  </p>
                  {testFeedback.coachingTip && (
                    <p className="text-xs sm:text-sm font-medium text-amber-900/90">
                      💡 Tip: {testFeedback.coachingTip}
                    </p>
                  )}
                  {!testFeedback.isCorrect && (
                    <p className="text-xs text-amber-800 italic pt-1">
                      This word has been re-queued later in this session so you can test it again without hints!
                    </p>
                  )}
                </div>
              </div>

              {/* Next word button */}
              <div className="pt-2">
                <button
                  onClick={handleNextWord}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>
                    {currentIndex >= sessionQueue.length - 1 ? 'Finish Session' : 'Continue to Next Word'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
