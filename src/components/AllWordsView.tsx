import React, { useState } from 'react';
import { Search, Volume2, Sparkles, Check, HelpCircle, ArrowRight, Play, ShieldCheck } from 'lucide-react';
import { WordEntry, SubjectCategory, MasteryLevel, StudentId } from '../types';
import { SUBJECT_METADATA, getWordsForStudent, getStudentProfile } from '../data/wordList';
import { audioService } from '../utils/audio';
import { getAllProgress, getWordProgress } from '../utils/storage';
import { SubjectFilter } from './SubjectFilter';

interface AllWordsViewProps {
  activeStudent: StudentId;
  onPracticeSpecificWord: (word: WordEntry) => void;
  onStartSubjectSession: (subject: SubjectCategory) => void;
}

export const AllWordsView: React.FC<AllWordsViewProps> = ({
  activeStudent,
  onPracticeSpecificWord,
  onStartSubjectSession
}) => {
  const currentProfile = getStudentProfile(activeStudent);
  const studentWords = getWordsForStudent(activeStudent);
  const allProgress = getAllProgress(activeStudent);

  const [selectedSubject, setSelectedSubject] = useState<SubjectCategory | 'All'>('All');
  const [selectedMastery, setSelectedMastery] = useState<MasteryLevel | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const availableSubjects: Array<SubjectCategory | 'All'> = [
    'All',
    ...Array.from(new Set(studentWords.map(w => w.subject)))
  ];

  const filteredWords = studentWords.filter(w => {
    // Subject filter
    if (selectedSubject !== 'All' && w.subject !== selectedSubject) {
      return false;
    }

    // Mastery filter
    const prog = allProgress[w.id];
    const currentLevel: MasteryLevel = prog?.level || 'learning';
    if (selectedMastery !== 'All' && currentLevel !== selectedMastery) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchWord = w.word.toLowerCase().includes(q);
      const matchMeaning = w.meaning.toLowerCase().includes(q);
      const matchTranslit = w.transliteration?.toLowerCase().includes(q) || false;
      const matchNative = w.nativeScript?.toLowerCase().includes(q) || false;
      return matchWord || matchMeaning || matchTranslit || matchNative;
    }

    return true;
  });

  // Calculate dynamic tallies for active student
  const rememberedCount = studentWords.filter(w => allProgress[w.id]?.level === 'remembered').length;
  const practisingCount = studentWords.filter(w => allProgress[w.id]?.level === 'practising').length;
  const learningCount = studentWords.length - rememberedCount - practisingCount;

  const playWord = (w: WordEntry) => {
    audioService.speak(w.nativeScript || w.canonicalSpelling, w.languageCode);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{currentProfile.avatarEmoji}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {currentProfile.name}'s Curriculum · {currentProfile.gradeLabel}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            All {studentWords.length} Words Matrix
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Spell Bee words organized by word category, with verified definitions and tricky spelling patterns.
          </p>
        </div>

        {selectedSubject !== 'All' && (
          <button
            onClick={() => onStartSubjectSession(selectedSubject)}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold text-xs sm:text-sm hover:bg-amber-700 transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Practice {selectedSubject} Words</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Subject Segmented Buttons */}
        <SubjectFilter subjects={availableSubjects} value={selectedSubject} onChange={setSelectedSubject} />

        {/* Search input */}
        <div className="relative min-w-0 md:min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search words"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search word or meaning..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Mastery Status Filter */}
      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
        <span className="font-semibold text-slate-700">Filter by Status:</span>
        <button
          onClick={() => setSelectedMastery('All')}
          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
            selectedMastery === 'All' ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          All ({studentWords.length})
        </button>
        <button
          onClick={() => setSelectedMastery('remembered')}
          className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
            selectedMastery === 'remembered' ? 'bg-emerald-800 text-white font-semibold' : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Test-Ready ({rememberedCount})</span>
        </button>
        <button
          onClick={() => setSelectedMastery('practising')}
          className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
            selectedMastery === 'practising' ? 'bg-blue-800 text-white font-semibold' : 'bg-blue-50 text-blue-900 hover:bg-blue-100'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Practising ({practisingCount})</span>
        </button>
        <button
          onClick={() => setSelectedMastery('learning')}
          className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
            selectedMastery === 'learning' ? 'bg-amber-800 text-white font-semibold' : 'bg-amber-50 text-amber-950 hover:bg-amber-100'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Needs Practice ({learningCount})</span>
        </button>
      </div>

      {/* Words Grid */}
      {filteredWords.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <p className="text-slate-500 text-sm">No words matched your current search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWords.map((word) => {
            const prog = getWordProgress(word.id, activeStudent);
            const meta = SUBJECT_METADATA[word.subject];

            return (
              <div
                key={word.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Clean unboxed metadata with separators */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span style={{ color: meta?.accentColor || '#334155' }} className="font-semibold">
                        {word.subject}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>#{word.categoryNumber}</span>
                    </div>

                    {/* Evidence-based status */}
                    {prog.level === 'remembered' && (
                      <span className="text-emerald-800 font-semibold flex items-center gap-1 text-[11px]">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> Test-Ready
                      </span>
                    )}
                    {prog.level === 'practising' && (
                      <span className="text-blue-800 font-semibold flex items-center gap-1 text-[11px]">
                        <Sparkles className="w-3 h-3 text-blue-600" /> Practising
                      </span>
                    )}
                    {prog.level === 'learning' && (
                      <span className="text-amber-950 font-semibold flex items-center gap-1 text-[11px]">
                        <HelpCircle className="w-3 h-3 text-amber-600" /> Needs Practice
                      </span>
                    )}
                  </div>

                  {/* Word title */}
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {word.word}
                    </h3>

                    <button
                      onClick={() => playWord(word)}
                      title="Listen to pronunciation"
                      className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      aria-label="Listen"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Transliteration if any */}
                  {word.transliteration && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Transliteration: <span className="text-slate-700 font-semibold">{word.transliteration}</span>
                    </p>
                  )}

                  {/* Meaning */}
                  <p className="text-xs sm:text-sm text-slate-700 font-medium mt-2 leading-relaxed">
                    {word.meaning}
                  </p>

                  {/* Tricky spot */}
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 text-[11px] text-amber-950 leading-snug">
                    <span className="font-bold">Pattern to note: </span>
                    {word.trickySpot}
                  </div>
                </div>

                {/* Card Action */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onPracticeSpecificWord(word)}
                    className="w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Practice This Word</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
