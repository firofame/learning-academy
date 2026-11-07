import React from 'react';
import type { LearningSubjectId, StudentId, WordEntry } from '../types';
import { getWordsForStudent, SUBJECT_METADATA } from '../data/wordList';
import { getStudentProfile } from '../data/profiles';
import {
  checkRoboticsAnswer, getRoboticsLesson, type RoboticsLesson, type RoboticsQuestion
} from '../data/robotics';
import {
  checkMathsAnswer, getMathsLesson, MATHS_TOPICS, type MathsQuestion
} from '../data/maths';
import {
  checkMalayalamAnswer, getMalayalamLesson, type MalayalamQuestion, type MalayalamSection
} from '../data/malayalam';
import {
  checkHindiAnswer, getHindiLesson, HINDI_SECTIONS, type HindiQuestion
} from '../data/hindi';
import {
  checkEvsAnswer, getEvsLesson, EVS_SECTIONS, type EvsLesson, type EvsQuestion
} from '../data/evs';
import {
  checkBiologyAnswer, getBiologyLesson, BIOLOGY_SECTIONS, type BiologyLesson, type BiologyQuestion
} from '../data/biology';
import {
  checkChemistryAnswer, getChemistryLesson, CHEMISTRY_SECTIONS, type ChemistryLesson, type ChemistryQuestion
} from '../data/chemistry';
import { MathsDiagram } from '../components/MathsDiagram';
import type {
  RevisionQuestion, RevisionResponse,
  RevisionSessionResult
} from '../components/ExamRevisionView';
import { evaluateSpelling } from '../utils/spellingCoach';
import {
  gradeWrittenAnswer, MAX_WRITTEN_ANSWER_LENGTH
} from '../utils/writtenGrading';
import { saveRoboticsResult } from '../utils/roboticsStorage';
import { saveMathsResult } from '../utils/mathsStorage';
import { saveMalayalamResult } from '../utils/malayalamStorage';
import { saveHindiResult } from '../utils/hindiStorage';
import { saveEvsResult } from '../utils/evsStorage';
import { saveBiologyResult } from '../utils/biologyStorage';
import { saveChemistryResult } from '../utils/chemistryStorage';
import { recordAttempt } from '../utils/storage';

interface RevisionDefinition {
  lessonId: string;
  title: string;
  description: string;
  questions: readonly RevisionQuestion[];
  allowSectionAssessment?: boolean;
  onComplete?: (result: RevisionSessionResult) => boolean;
}

function finalResponses(result: RevisionSessionResult): RevisionResponse[] {
  const primary = new Map<string, RevisionResponse>();
  const fallback = new Map<string, RevisionResponse>();
  for (const response of result.answers) {
    if (response.attemptKind === 'initial' || response.attemptKind === 'exam') {
      primary.set(response.questionId, response);
    } else if (!fallback.has(response.questionId)) {
      fallback.set(response.questionId, response);
    }
  }
  return [...new Set([...primary.keys(), ...fallback.keys()])]
    .map(questionId => primary.get(questionId) ?? fallback.get(questionId)!);
}

function canSave(answers: readonly RevisionResponse[]): boolean {
  return answers.length > 0 && !answers.some(answer => answer.outcome === 'ungraded');
}

function saveSpellBeeSession(
  learnerId: StudentId,
  result: RevisionSessionResult
): boolean {
  const responses = finalResponses(result);
  if (!canSave(responses)) return false;
  return responses.every(response => !recordAttempt(
    response.questionId,
    learnerId,
    response.outcome === 'correct',
    result.mode === 'exam' && response.assistance.length === 0 ? 'test' : 'practice',
    response.answer,
    { attemptId: response.attemptId, mirrorAttempts: false }
  ).saveFailed);
}

function spellingQuestion(word: WordEntry): RevisionQuestion {
  const subject = SUBJECT_METADATA[word.subject];
  return {
    id: word.id,
    section: word.subject,
    sectionLabel: subject.label,
    prompt: word.hiddenSentence,
    answer: word.canonicalSpelling,
    responseFormat: 'written',
    explanation: word.trickySpot,
    provenance: `Spell Bee Grade ${word.studentGrade} word list`,
    helpContent: (
      <div className="space-y-2 text-sm text-slate-800">
        <p><strong>Meaning:</strong> {word.meaning}</p>
        <p><strong>Example:</strong> {word.childFriendlySentence}</p>
        <p><strong>Spelling clue:</strong> {word.trickySpot}</p>
        {word.nativeScript && <p><strong>Native script:</strong> <span lang={word.languageCode}>{word.nativeScript}</span></p>}
      </div>
    ),
    language: word.languageCode,
    languageClass: word.scriptType === 'malayalam' ? 'font-malayalam'
      : word.scriptType === 'devanagari' ? 'font-devanagari' : undefined,
    direction: 'auto',
    listenText: word.word,
    languageCode: word.languageCode,
    maxLength: MAX_WRITTEN_ANSWER_LENGTH,
    grade: async answer => {
      const feedback = evaluateSpelling(word, answer);
      return {
        correct: feedback.isCorrect,
        source: 'deterministic',
        ...(!feedback.isCorrect ? { feedback: feedback.message } : {})
      };
    }
  };
}

function roboticsSectionInfo(question: RoboticsQuestion): { id: string; label: string } {
  switch (question.kind) {
    case 'true-false':
      return { id: 'true-false', label: 'True or False' };
    case 'choice':
      return { id: 'choice', label: 'Multiple Choice' };
    case 'fill':
      return { id: 'fill', label: 'Fill in the Blanks' };
    case 'short':
      return { id: 'short', label: 'Short Answers' };
  }
}

function roboticsQuestion(
  question: RoboticsQuestion,
  lesson: RoboticsLesson,
  gradingApiUrl: string
): RevisionQuestion {
  const isChoice = question.kind === 'choice' || question.kind === 'true-false';
  const sourceCard = question.sourceCardId
    ? lesson.cards.find(card => card.id === question.sourceCardId)
    : undefined;
  const sectionInfo = roboticsSectionInfo(question);
  return {
    id: question.id,
    section: sectionInfo.id,
    sectionLabel: sectionInfo.label,
    prompt: question.prompt,
    answer: question.answer,
    responseFormat: isChoice ? 'choice' : 'written',
    ...(isChoice ? { options: question.options } : {}),
    explanation: question.explanation,
    provenance: lesson.sourceName,
    ...(question.kind === 'short' ? {
      helpContent: (
        <div className="space-y-2 text-sm text-slate-800">
          <p><strong>What to include:</strong> {question.gradingCriteria}</p>
          {sourceCard?.examples && <p><strong>Examples:</strong> {sourceCard.examples}</p>}
        </div>
      )
    } : {}),
    listenText: question.prompt,
    language: 'en',
    languageCode: 'en-US',
    maxLength: MAX_WRITTEN_ANSWER_LENGTH,
    grade: async (answer, signal) => {
      if (answer.length > MAX_WRITTEN_ANSWER_LENGTH) {
        throw new Error(`Keep your answer to ${MAX_WRITTEN_ANSWER_LENGTH} characters or fewer.`);
      }
      if (question.kind === 'short') {
        if (!gradingApiUrl) {
          throw new Error('Automatic written-answer checking is not configured. Your answer has not been marked; try again when checking is available.');
        }
        const grade = await gradeWrittenAnswer(gradingApiUrl, lesson.id, question.id, answer, signal);
        return { correct: grade.correct, source: 'ai', feedback: grade.feedback };
      }
      return { correct: checkRoboticsAnswer(question, answer), source: 'deterministic' };
    }
  };
}

function mathsQuestion(question: MathsQuestion, lesson: ReturnType<typeof getMathsLesson>): RevisionQuestion {
  const topic = MATHS_TOPICS.find(item => item.id === question.topic);
  const cards = lesson.cards.filter(card => card.topic === question.topic);
  const solutions = lesson.solutions?.filter(solution => solution.questionIds?.includes(question.id)) ?? [];
  return {
    id: question.id,
    section: question.topic,
    sectionLabel: topic?.label ?? question.topic,
    prompt: question.prompt,
    answer: question.answer,
    responseFormat: question.kind === 'choice' ? 'choice' : 'written',
    ...(question.kind === 'choice' ? { options: question.options } : {}),
    explanation: question.explanation,
    provenance: lesson.sourceName,
    promptContent: (
      <div className="space-y-3">
        {question.diagramType && <MathsDiagram type={question.diagramType} className="my-2" />}
        {question.verticalMath && (
          <div className="flex justify-center">
            <div className="inline-flex flex-col items-center rounded-xl border border-indigo-200 bg-indigo-50/70 px-6 py-4 font-mono text-2xl font-bold text-slate-900">
              <span>{question.verticalMath.operand1}</span>
              <span className="w-full border-b-2 border-slate-800 pb-1 text-right">
                {question.verticalMath.operator} {question.verticalMath.operand2}
              </span>
            </div>
          </div>
        )}
      </div>
    ),
    helpContent: (
      <div className="space-y-4 text-sm text-slate-800">
        {cards.map(card => (
          <article key={card.id} className="space-y-1">
            <h3 className="font-bold">{card.title}</h3>
            <p>{card.keyRule}</p>
            <p><strong>Example:</strong> {card.examples}</p>
            <p><strong>Reference:</strong> {card.answer}</p>
          </article>
        ))}
        {question.verticalMath?.carryOrBorrowHint && (
          <p><strong>Calculation hint:</strong> {question.verticalMath.carryOrBorrowHint}</p>
        )}
        {solutions.map(solution => (
          <article key={solution.questionNumber} className="space-y-2 border-t border-slate-200 pt-3">
            <h3 className="font-bold">Worked solution: {solution.title}</h3>
            {solution.steps.map((step, index) => (
              <div key={`${solution.questionNumber}-${index}`}>
                <p><strong>{step.part ? `${step.part} ` : ''}{step.questionText}</strong></p>
                <p>{step.answer}</p>
                <p className="text-slate-600">{step.explanation}</p>
              </div>
            ))}
          </article>
        ))}
        {!cards.length && !solutions.length && <p>{question.explanation}</p>}
      </div>
    ),
    listenText: question.prompt,
    language: 'en',
    languageCode: 'en-US',
    grade: async answer => ({
      correct: checkMathsAnswer(question, answer),
      source: 'deterministic'
    })
  };
}

function malayalamSectionLabel(section: MalayalamSection): string {
  return section.number ? `${section.number} · ${section.label}` : section.label;
}

function malayalamQuestion(
  question: MalayalamQuestion,
  lesson: ReturnType<typeof getMalayalamLesson>,
  gradingApiUrl: string
): RevisionQuestion {
  const section = lesson.sections.find(item => item.id === question.section);
  const markingCriteria = question.kind === 'pair' || question.kind === 'parts'
    ? undefined : question.markingCriteria;
  return {
    id: question.id,
    section: question.section,
    sectionLabel: section ? malayalamSectionLabel(section) : question.section,
    prompt: question.prompt,
    answer: question.answer,
    responseFormat: 'written',
    explanation: markingCriteria,
    provenance: lesson.sourceNote,
    helpContent: (
      <div className="space-y-2 text-sm text-slate-800">
        <p><strong>Reference answer:</strong> <span lang="ml" className="font-malayalam">{question.answer}</span></p>
        {markingCriteria && <p><strong>Marking guidance:</strong> {markingCriteria}</p>}
      </div>
    ),
    language: 'ml',
    languageClass: 'font-malayalam',
    direction: 'auto',
    listenText: question.prompt,
    languageCode: 'ml-IN',
    maxLength: MAX_WRITTEN_ANSWER_LENGTH,
    grade: async (answer, signal) => {
      if (answer.length > MAX_WRITTEN_ANSWER_LENGTH) {
        throw new Error(`Keep your answer to ${MAX_WRITTEN_ANSWER_LENGTH} characters or fewer.`);
      }
      if (checkMalayalamAnswer(question, answer)) {
        return { correct: true, source: 'deterministic' };
      }
      if (!markingCriteria) return { correct: false, source: 'deterministic' };
      if (!gradingApiUrl) {
        throw new Error('Automatic Malayalam checking is not configured. Your answer has not been marked; try again when checking is available.');
      }
      const grade = await gradeWrittenAnswer(gradingApiUrl, lesson.id, question.id, answer, signal);
      return { correct: grade.correct, source: 'ai', feedback: grade.feedback };
    }
  };
}

function hindiQuestion(
  question: HindiQuestion,
  lesson: ReturnType<typeof getHindiLesson>,
  gradingApiUrl: string
): RevisionQuestion {
  const section = HINDI_SECTIONS.find(item => item.id === question.section);
  const markingCriteria = question.kind === 'pair' ? undefined : question.markingCriteria;
  const referenceContent = question.section === 'poem'
    ? <ol className="list-decimal space-y-1 pl-5 font-devanagari" lang="hi">{lesson.poem.map((line, index) => <li key={index}>{line}</li>)}</ol>
    : question.section === 'essay'
      ? <p className="font-devanagari" lang="hi">{lesson.essay}</p>
      : null;
  return {
    id: question.id,
    section: question.section,
    sectionLabel: section?.label ?? question.section,
    prompt: question.prompt,
    answer: question.answer,
    responseFormat: 'written',
    explanation: markingCriteria,
    provenance: lesson.sourceNote,
    helpContent: (
      <div className="space-y-2 text-sm text-slate-800">
        {referenceContent}
        <p><strong>Reference answer:</strong> <span lang="hi" className="font-devanagari">{question.answer}</span></p>
        {markingCriteria && <p><strong>Marking guidance:</strong> {markingCriteria}</p>}
      </div>
    ),
    language: 'hi',
    languageClass: 'font-devanagari',
    direction: 'auto',
    listenText: question.prompt,
    languageCode: 'hi-IN',
    maxLength: MAX_WRITTEN_ANSWER_LENGTH,
    grade: async (answer, signal) => {
      if (answer.length > MAX_WRITTEN_ANSWER_LENGTH) {
        throw new Error(`Keep your answer to ${MAX_WRITTEN_ANSWER_LENGTH} characters or fewer.`);
      }
      if (checkHindiAnswer(question, answer)) {
        return { correct: true, source: 'deterministic' };
      }
      if (!markingCriteria) return { correct: false, source: 'deterministic' };
      if (!gradingApiUrl) {
        throw new Error('Automatic Hindi checking is not configured. Your answer has not been marked; try again when checking is available.');
      }
      const grade = await gradeWrittenAnswer(gradingApiUrl, lesson.id, question.id, answer, signal);
      return { correct: grade.correct, source: 'ai', feedback: grade.feedback };
    }
  };
}

function evsQuestion(
  question: EvsQuestion,
  lesson: EvsLesson,
  gradingApiUrl: string
): RevisionQuestion {
  const isChoice = question.kind === 'choice' || question.kind === 'true-false';
  const section = EVS_SECTIONS.find(item => item.id === question.section);
  const cards = lesson.cards.filter(card => card.section === question.section);
  return {
    id: question.id,
    section: question.section,
    sectionLabel: section?.label ?? question.section,
    prompt: question.prompt,
    answer: question.answer,
    responseFormat: isChoice ? 'choice' : 'written',
    ...(isChoice ? { options: question.options } : {}),
    explanation: question.explanation,
    provenance: lesson.sourceName,
    helpContent: (
      <div className="space-y-3 text-sm text-slate-800">
        {question.kind === 'written' && (
          <p><strong>What to include:</strong> {question.markingCriteria}</p>
        )}
        {cards.map(card => (
          <article key={card.id} className="space-y-1">
            <h3 className="font-bold">{card.title}</h3>
            <p>{card.prompt}</p>
            <p><strong>Summary:</strong> {card.answer}</p>
            {card.examples && <p><strong>Examples:</strong> {card.examples}</p>}
          </article>
        ))}
      </div>
    ),
    listenText: question.prompt,
    language: 'en',
    languageCode: 'en-US',
    maxLength: MAX_WRITTEN_ANSWER_LENGTH,
    grade: async (answer, signal) => {
      if (answer.length > MAX_WRITTEN_ANSWER_LENGTH) {
        throw new Error(`Keep your answer to ${MAX_WRITTEN_ANSWER_LENGTH} characters or fewer.`);
      }
      if (question.kind === 'written') {
        if (checkEvsAnswer(question, answer)) {
          return { correct: true, source: 'deterministic' };
        }
        if (!gradingApiUrl) {
          throw new Error('Automatic written-answer checking is not configured. Your answer has not been marked; try again when checking is available.');
        }
        const grade = await gradeWrittenAnswer(gradingApiUrl, lesson.id, question.id, answer, signal);
        return { correct: grade.correct, source: 'ai', feedback: grade.feedback };
      }
      return { correct: checkEvsAnswer(question, answer), source: 'deterministic' };
    }
  };
}

function biologyQuestion(
  question: BiologyQuestion,
  lesson: BiologyLesson,
  gradingApiUrl: string
): RevisionQuestion {
  const section = BIOLOGY_SECTIONS.find(item => item.id === question.section);
  const cards = lesson.cards.filter(card => card.section === question.section);
  return {
    id: question.id,
    section: question.section,
    sectionLabel: section?.label ?? question.section,
    prompt: question.prompt,
    answer: question.answer,
    responseFormat: 'written',
    explanation: question.explanation,
    provenance: lesson.sourceName,
    helpContent: (
      <div className="space-y-3 text-sm text-slate-800">
        {question.markingCriteria && (
          <p><strong>What to include:</strong> {question.markingCriteria}</p>
        )}
        {cards.map(card => (
          <article key={card.id} className="space-y-1">
            <h3 className="font-bold">{card.title}</h3>
            <p>{card.prompt}</p>
            <p><strong>Summary:</strong> {card.answer}</p>
            {card.examples && <p><strong>Examples:</strong> {card.examples}</p>}
          </article>
        ))}
      </div>
    ),
    listenText: question.prompt,
    language: 'en',
    languageCode: 'en-US',
    maxLength: MAX_WRITTEN_ANSWER_LENGTH,
    grade: async (answer, signal) => {
      if (answer.length > MAX_WRITTEN_ANSWER_LENGTH) {
        throw new Error(`Keep your answer to ${MAX_WRITTEN_ANSWER_LENGTH} characters or fewer.`);
      }
      if (checkBiologyAnswer(question, answer)) {
        return { correct: true, source: 'deterministic' };
      }
      if (!gradingApiUrl) {
        throw new Error('Automatic written-answer checking is not configured. Your answer has not been marked; try again when checking is available.');
      }
      const grade = await gradeWrittenAnswer(gradingApiUrl, lesson.id, question.id, answer, signal);
      return { correct: grade.correct, source: 'ai', feedback: grade.feedback };
    }
  };
}

function chemistryQuestion(
  question: ChemistryQuestion,
  lesson: ChemistryLesson,
  gradingApiUrl: string
): RevisionQuestion {
  const section = CHEMISTRY_SECTIONS.find(item => item.id === question.section);
  const cards = lesson.cards.filter(card => card.section === question.section);
  return {
    id: question.id,
    section: question.section,
    sectionLabel: section?.label ?? question.section,
    prompt: question.prompt,
    answer: question.answer,
    responseFormat: 'written',
    explanation: question.explanation,
    provenance: lesson.sourceName,
    helpContent: (
      <div className="space-y-3 text-sm text-slate-800">
        {question.markingCriteria && (
          <p><strong>What to include:</strong> {question.markingCriteria}</p>
        )}
        {cards.map(card => (
          <article key={card.id} className="space-y-1">
            <h3 className="font-bold">{card.title}</h3>
            <p>{card.prompt}</p>
            <p><strong>Summary:</strong> {card.answer}</p>
            {card.examples && <p><strong>Examples:</strong> {card.examples}</p>}
          </article>
        ))}
      </div>
    ),
    listenText: question.prompt,
    language: 'en',
    languageCode: 'en-US',
    maxLength: MAX_WRITTEN_ANSWER_LENGTH,
    grade: async (answer, signal) => {
      if (answer.length > MAX_WRITTEN_ANSWER_LENGTH) {
        throw new Error(`Keep your answer to ${MAX_WRITTEN_ANSWER_LENGTH} characters or fewer.`);
      }
      if (checkChemistryAnswer(question, answer)) {
        return { correct: true, source: 'deterministic' };
      }
      if (!gradingApiUrl) {
        throw new Error('Automatic written-answer checking is not configured. Your answer has not been marked; try again when checking is available.');
      }
      const grade = await gradeWrittenAnswer(gradingApiUrl, lesson.id, question.id, answer, signal);
      return { correct: grade.correct, source: 'ai', feedback: grade.feedback };
    }
  };
}

function saveRoboticsSession(
  learnerId: StudentId,
  result: RevisionSessionResult
): boolean {
  const responses = finalResponses(result);
  if (!canSave(responses)) return false;
  return saveRoboticsResult(learnerId, {
    mode: result.mode,
    completedAt: result.completedAt,
    answers: responses.map(response => ({
      questionId: response.questionId,
      answer: response.answer,
      correct: response.outcome === 'correct',
      parentChecked: false,
      ...(response.aiChecked ? { aiChecked: true, aiFeedback: response.aiFeedback } : {}),
      attemptId: response.attemptId,
      attemptedAt: response.attemptedAt
    }))
  }, { mirrorAttempts: false }) !== null;
}

function saveMathsSession(
  learnerId: StudentId,
  result: RevisionSessionResult
): boolean {
  const responses = finalResponses(result);
  if (!canSave(responses)) return false;
  return saveMathsResult(learnerId, {
    mode: result.mode,
    completedAt: result.completedAt,
    topic: result.section,
    answers: responses.map(response => ({
      questionId: response.questionId,
      answer: response.answer,
      correct: response.outcome === 'correct',
      ...(response.assistance.length ? { assistance: response.assistance } : {}),
      attemptId: response.attemptId,
      attemptedAt: response.attemptedAt
    }))
  }, { mirrorAttempts: false }) !== null;
}

function saveMalayalamSession(
  learnerId: StudentId,
  result: RevisionSessionResult
): boolean {
  const responses = finalResponses(result);
  if (!canSave(responses)) return false;
  return saveMalayalamResult(learnerId, {
    mode: result.mode,
    completedAt: result.completedAt,
    answers: responses.map(response => ({
      questionId: response.questionId,
      answer: response.answer,
      correct: response.outcome === 'correct',
      ...(response.outcome === 'skipped' ? { skipped: true } : {}),
      ...(response.aiChecked ? { aiChecked: true, aiFeedback: response.aiFeedback } : {}),
      attemptId: response.attemptId,
      attemptedAt: response.attemptedAt
    }))
  }, { mirrorAttempts: false }) !== null;
}

function saveHindiSession(
  learnerId: StudentId,
  result: RevisionSessionResult
): boolean {
  const responses = finalResponses(result);
  if (!canSave(responses)) return false;
  return saveHindiResult(learnerId, {
    mode: result.mode,
    completedAt: result.completedAt,
    answers: responses.map(response => ({
      questionId: response.questionId,
      answer: response.answer,
      correct: response.outcome === 'correct',
      ...(response.outcome === 'skipped' ? { skipped: true } : {}),
      ...(response.aiChecked ? { aiChecked: true, aiFeedback: response.aiFeedback } : {}),
      attemptId: response.attemptId,
      attemptedAt: response.attemptedAt
    }))
  }, { mirrorAttempts: false }) !== null;
}

function saveEvsSession(
  learnerId: StudentId,
  result: RevisionSessionResult
): boolean {
  const responses = finalResponses(result);
  if (!canSave(responses)) return false;
  return saveEvsResult(learnerId, {
    mode: result.mode,
    completedAt: result.completedAt,
    section: result.section,
    answers: responses.map(response => ({
      questionId: response.questionId,
      answer: response.answer,
      correct: response.outcome === 'correct',
      ...(response.outcome === 'skipped' ? { skipped: true } : {}),
      ...(response.assistance.length ? { assistance: response.assistance } : {}),
      ...(response.aiChecked ? { aiChecked: true, aiFeedback: response.aiFeedback } : {}),
      attemptId: response.attemptId,
      attemptedAt: response.attemptedAt
    }))
  }, { mirrorAttempts: false }) !== null;
}

function saveBiologySession(
  learnerId: StudentId,
  result: RevisionSessionResult
): boolean {
  const responses = finalResponses(result);
  if (!canSave(responses)) return false;
  return saveBiologyResult(learnerId, {
    mode: result.mode,
    completedAt: result.completedAt,
    section: result.section,
    answers: responses.map(response => ({
      questionId: response.questionId,
      answer: response.answer,
      correct: response.outcome === 'correct',
      ...(response.outcome === 'skipped' ? { skipped: true } : {}),
      ...(response.assistance.length ? { assistance: response.assistance } : {}),
      ...(response.aiChecked ? { aiChecked: true, aiFeedback: response.aiFeedback } : {}),
      attemptId: response.attemptId,
      attemptedAt: response.attemptedAt
    }))
  }, { mirrorAttempts: false }) !== null;
}

function saveChemistrySession(
  learnerId: StudentId,
  result: RevisionSessionResult
): boolean {
  const responses = finalResponses(result);
  if (!canSave(responses)) return false;
  return saveChemistryResult(learnerId, {
    mode: result.mode,
    completedAt: result.completedAt,
    section: result.section,
    answers: responses.map(response => ({
      questionId: response.questionId,
      answer: response.answer,
      correct: response.outcome === 'correct',
      ...(response.outcome === 'skipped' ? { skipped: true } : {}),
      ...(response.assistance.length ? { assistance: response.assistance } : {}),
      ...(response.aiChecked ? { aiChecked: true, aiFeedback: response.aiFeedback } : {}),
      attemptId: response.attemptId,
      attemptedAt: response.attemptedAt
    }))
  }, { mirrorAttempts: false }) !== null;
}

export function buildSubjectRevision(
  subjectId: LearningSubjectId,
  learnerId: StudentId,
  gradingApiUrl = import.meta.env?.VITE_GRADING_API_URL || ''
): RevisionDefinition {
  const profile = getStudentProfile(learnerId);
  switch (subjectId) {
    case 'spell-bee': {
      const words = getWordsForStudent(learnerId);
      return {
        lessonId: `spelling-grade-${profile.grade}`,
        title: 'Spell Bee',
        description: 'Recall the spelling from its clue. Use help when needed, then recheck difficult words after other questions.',
        questions: words.map(spellingQuestion),
        onComplete: result => saveSpellBeeSession(learnerId, result)
      };
    }
    case 'robotics': {
      const lesson = getRoboticsLesson(learnerId);
      return {
        lessonId: lesson.id,
        title: lesson.title,
        description: `${lesson.memoryTip} Revise from your school notes.`,
        questions: lesson.questions.map(question =>
          roboticsQuestion(question, lesson, gradingApiUrl)),
        onComplete: result => saveRoboticsSession(learnerId, result)
      };
    }
    case 'maths': {
      const lesson = getMathsLesson(learnerId);
      return {
        lessonId: lesson.id,
        title: lesson.title,
        description: lesson.memoryTip,
        questions: lesson.questions.map(question => mathsQuestion(question, lesson)),
        allowSectionAssessment: true,
        onComplete: result => saveMathsSession(learnerId, result)
      };
    }
    case 'malayalam': {
      const lesson = getMalayalamLesson(learnerId);
      return {
        lessonId: lesson.id,
        title: lesson.title,
        description: `Exam-eve revision · Based on ${lesson.sourceNote}.`,
        questions: lesson.questions.map(question => malayalamQuestion(question, lesson, gradingApiUrl)),
        onComplete: result => saveMalayalamSession(learnerId, result)
      };
    }
    case 'hindi': {
      const lesson = getHindiLesson(learnerId);
      return {
        lessonId: lesson.id,
        title: 'Hindi Exam Revision',
        description: `Grade ${lesson.grade} portions · Based on ${lesson.sourceNote}.`,
        questions: lesson.questions.map(question => hindiQuestion(question, lesson, gradingApiUrl)),
        onComplete: result => saveHindiSession(learnerId, result)
      };
    }
    case 'evs': {
      const lesson = getEvsLesson(learnerId);
      return {
        lessonId: lesson.id,
        title: lesson.title,
        description: `Exam-eve revision · Based on ${lesson.sourceName}.`,
        questions: lesson.questions.map(question => evsQuestion(question, lesson, gradingApiUrl)),
        allowSectionAssessment: true,
        onComplete: result => saveEvsSession(learnerId, result)
      };
    }
    case 'biology': {
      const lesson = getBiologyLesson(learnerId);
      return {
        lessonId: lesson.id,
        title: lesson.title,
        description: `Exam-eve revision · Based on ${lesson.sourceName}.`,
        questions: lesson.questions.map(question => biologyQuestion(question, lesson, gradingApiUrl)),
        allowSectionAssessment: true,
        onComplete: result => saveBiologySession(learnerId, result)
      };
    }
    case 'chemistry': {
      const lesson = getChemistryLesson(learnerId);
      return {
        lessonId: lesson.id,
        title: lesson.title,
        description: `Exam-eve revision · Based on ${lesson.sourceName}.`,
        questions: lesson.questions.map(question => chemistryQuestion(question, lesson, gradingApiUrl)),
        allowSectionAssessment: true,
        onComplete: result => saveChemistrySession(learnerId, result)
      };
    }
  }
}
