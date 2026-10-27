import React, { useState } from 'react';
import { Printer, Eye, EyeOff, ArrowLeft, FileText, CheckSquare } from 'lucide-react';
import { SubjectCategory, WordEntry, StudentId } from '../types';
import { getWordsForStudent, getStudentProfile, SUBJECT_METADATA } from '../data/wordList';
import { SubjectFilter } from './SubjectFilter';

interface WorksheetViewProps {
  activeStudent: StudentId;
  onBackToPractice: () => void;
}

export const WorksheetView: React.FC<WorksheetViewProps> = ({
  activeStudent,
  onBackToPractice
}) => {
  const currentProfile = getStudentProfile(activeStudent);
  const studentWords = getWordsForStudent(activeStudent);

  const [selectedSubject, setSelectedSubject] = useState<SubjectCategory | 'All'>('All');
  const [sheetType, setSheetType] = useState<'student_test' | 'answer_key'>('student_test');

  const availableSubjects: Array<SubjectCategory | 'All'> = [
    'All',
    ...Array.from(new Set(studentWords.map(w => w.subject)))
  ];

  const filteredWords = selectedSubject === 'All' 
    ? studentWords 
    : studentWords.filter(w => w.subject === selectedSubject);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Controls (Hidden on print) */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={onBackToPractice}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to App</span>
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
              Printable School Worksheets for {currentProfile.name}
            </h1>
            <p className="text-xs text-slate-500">
              Generating physical pencil-and-paper tests reinforces tactile handwriting recall.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sheet Type Toggle */}
            <div className="w-full sm:w-auto grid grid-cols-1 sm:flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setSheetType('student_test')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  sheetType === 'student_test'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Student Test Sheet</span>
              </button>

              <button
                onClick={() => setSheetType('answer_key')}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                  sheetType === 'answer_key'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Teacher Answer Key</span>
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>
          </div>
        </div>

        {/* Subject Filter Bar */}
        <SubjectFilter
          subjects={availableSubjects}
          value={selectedSubject}
          onChange={setSelectedSubject}
          getWordCount={subject => subject === 'All'
            ? studentWords.length
            : studentWords.filter(word => word.subject === subject).length}
        />
      </div>

      {/* Printable Sheet Container */}
      <div className="bg-white border border-slate-300 rounded-2xl p-4 sm:p-12 shadow-sm space-y-6 print-container">
        {/* Worksheet Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <span className="text-xs font-bold tracking-widest text-slate-500 uppercase block">
              Spell Bee · {currentProfile.name} ({currentProfile.gradeLabel})
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {sheetType === 'student_test' ? (
                selectedSubject === 'All' ? 'Complete Spelling Exam Sheet' : `${selectedSubject} Spelling Test`
              ) : (
                selectedSubject === 'All' ? 'Parent & Teacher Answer Key' : `${selectedSubject} Exam Answer Key`
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {sheetType === 'student_test'
                ? 'Listen to the prompt or read the clue, then write the correct spelling on the ruled line.'
                : 'Verified spelling answers, phonetic guides, and tricky spot rubrics.'}
            </p>
          </div>

          <div className="text-xs sm:text-sm text-slate-700 space-y-1 text-right font-medium">
            <div>Student: <span className="inline-block border-b border-slate-400 w-40 font-bold">{sheetType === 'student_test' ? '' : currentProfile.name}</span></div>
            <div>Date: <span className="inline-block border-b border-slate-400 w-28"></span> Score: ____ / {filteredWords.length}</div>
          </div>
        </div>

        {/* Practice items list */}
        <div className="divide-y divide-slate-200">
          {filteredWords.map((word, index) => (
            <div key={word.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 sm:max-w-md">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-6">
                    {index + 1}.
                  </span>
                  <span className="text-xs font-bold text-slate-600">
                    [{word.subject}]
                  </span>

                  {/* On Answer Key, highlight target spelling */}
                  {sheetType === 'answer_key' && (
                    <span className="text-base font-extrabold text-slate-950 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {word.word}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-800 font-medium pl-8">
                  <span className="font-semibold text-slate-900">Definition: </span>
                  {word.meaning}
                </p>

                <p className="text-xs text-slate-600 italic pl-8">
                  "{word.hiddenSentence}"
                </p>

                {/* Additional rubric details on Answer Key */}
                {sheetType === 'answer_key' && (
                  <div className="pl-8 text-[11px] text-slate-500 space-y-0.5 pt-1">
                    <div>
                      <span className="font-bold text-slate-700">Canonical: </span>
                      <span className="font-mono text-slate-900">{word.canonicalSpelling}</span>
                      {word.transliteration && ` · Transliteration: ${word.transliteration}`}
                      {word.phoneticGuide && ` · Sound: ${word.phoneticGuide}`}
                    </div>
                    <div>
                      <span className="font-bold text-slate-700">Tricky Pattern to Check: </span>
                      {word.trickySpot}
                    </div>
                  </div>
                )}
              </div>

              {/* Ruled Handwriting Lines for Student Sheet */}
              <div className="pl-8 sm:pl-0 sm:w-64 flex flex-col justify-end space-y-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block text-right">
                  {sheetType === 'student_test' ? 'Handwritten spelling:' : 'Teacher check:'}
                </span>
                <div className="border-b-2 border-slate-300 w-full min-h-8 flex flex-wrap items-end justify-between gap-2">
                  {sheetType === 'answer_key' ? (
                    <>
                      <span className="text-xs font-mono font-bold text-slate-800 tracking-wider pl-1">
                        {word.canonicalSpelling}
                      </span>
                      <span className="text-xs text-slate-400 pr-1">[  ] Correct</span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Worksheet Footer */}
        <div className="border-t-2 border-slate-900 pt-4 flex items-center justify-between text-xs text-slate-500">
          <span>Spell Bee Learning Companion · {currentProfile.name} ({currentProfile.gradeLabel})</span>
          <span>{filteredWords.length} Test Words</span>
        </div>
      </div>
    </div>
  );
};
