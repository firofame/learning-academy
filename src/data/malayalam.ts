import { StudentId } from '../types';
import { getStudentProfile } from './wordList';

export type MalayalamSectionId =
  | 'revision'
  | 'synonyms'
  | 'word-pairs'
  | 'names'
  | 'signs'
  | 'fill-in'
  | 'days';

export const MALAYALAM_SECTIONS: {
  id: MalayalamSectionId;
  number: string;
  label: string;
  nativeLabel: string;
}[] = [
  { id: 'revision', number: 'I', label: 'Revision words', nativeLabel: 'ആവർത്തനം' },
  { id: 'synonyms', number: 'II', label: 'Synonyms', nativeLabel: 'പകരം പദം എഴുതുക' },
  { id: 'word-pairs', number: 'III', label: 'Write two words', nativeLabel: 'രണ്ടു വാക്കുകൾ വീതം' },
  { id: 'names', number: 'IV', label: 'Answer the questions', nativeLabel: 'പേരെഴുതുക' },
  { id: 'signs', number: 'V', label: 'Signs', nativeLabel: 'ചിഹ്നങ്ങൾ' },
  { id: 'fill-in', number: 'VI', label: 'Fill in', nativeLabel: 'പൂരിപ്പിക്കുക' },
  { id: 'days', number: 'VII', label: 'Days of the week', nativeLabel: 'ആഴ്ചയിലെ 7 ദിവസങ്ങൾ' }
];

interface MalayalamQuestionBase {
  id: string;
  section: MalayalamSectionId;
  prompt: string;
  answer: string;
}

export interface MalayalamTextQuestion extends MalayalamQuestionBase {
  kind: 'text';
  acceptedAnswers: string[];
  markingCriteria?: string;
}

export interface MalayalamPairQuestion extends MalayalamQuestionBase {
  kind: 'pair';
  answerWords: readonly [string, string];
}

export type MalayalamQuestion = MalayalamTextQuestion | MalayalamPairQuestion;

export interface MalayalamLesson {
  id: string;
  grade: number;
  title: string;
  examDate: string;
  sourceNote: string;
  questions: MalayalamQuestion[];
}

const textQuestion = (
  id: string,
  section: MalayalamSectionId,
  prompt: string,
  answer: string,
  acceptedAnswers: string[] = [],
  markingCriteria?: string
): MalayalamTextQuestion => ({
  id,
  section,
  kind: 'text',
  prompt,
  answer,
  acceptedAnswers: [answer, ...acceptedAnswers],
  markingCriteria
});

const pairQuestion = (
  id: string,
  cluster: string,
  first: string,
  second: string
): MalayalamPairQuestion => ({
  id,
  section: 'word-pairs',
  kind: 'pair',
  prompt: `${cluster} ചേർന്ന രണ്ട് വാക്കുകൾ എഴുതുക.`,
  answer: `${first}, ${second}`,
  answerWords: [first, second]
});

const revisionWords: { word: string; focus: string }[] = [
  { word: 'മഞ്ചാടി', focus: 'ചാ, ഞ്ചാ' },
  { word: 'നെയ്യപ്പം', focus: 'യ്യ, യ' },
  { word: 'പന്ത്', focus: 'ന്ത്, ന്ന്' },
  { word: 'അക്ഷരം', focus: 'ഷ, ക്ഷ' },
  { word: 'വൃക്ഷം', focus: 'ക്ഷ, ഷ' },
  { word: 'പുസ്തകം', focus: 'സ്ഥ, സ്ത' },
  { word: 'ഗാന്ധിജി', focus: 'ന്തി, ന്ധി' },
  { word: 'മുയൽ', focus: 'ൽ, ൻ' },
  { word: 'ഇഷ്ടം', focus: 'ഷ്ടം, ഷ്ട' },
  { word: 'ചെണ്ട', focus: 'ണ്ട, ട്ട' },
  { word: 'പങ്കായം', focus: 'കാ, ങ്കാ' },
  { word: 'തേൻ', focus: 'ൻ, ർ' },
  { word: 'രക്തം', focus: 'ക്ത, ക്ന' },
  { word: 'വവ്വാൽ', focus: 'വാ, വ്വാ' },
  { word: 'ആശ്വാസം', focus: 'ശ്വാ, ശ്യാ' }
];

const synonyms: [string, string][] = [
  ['മരുന്ന്', 'ഔഷധം'],
  ['മയിൽ', 'മയൂരം'],
  ['മീൻ', 'മത്സ്യം'],
  ['പക്ഷി', 'കിളി'],
  ['വൃക്ഷം', 'മരം'],
  ['അക്ഷരം', 'വർണ്ണം'],
  ['നക്ഷത്രം', 'താരം'],
  ['സ്ഥാനം', 'ഇടം'],
  ['ആശ്വാസം', 'സമാധാനം'],
  ['സൂര്യൻ', 'ആദിത്യൻ']
];

const twoWordExamples: [string, string, string][] = [
  ['ഷ്ട', 'ഇഷ്ടം', 'കഷ്ടം'],
  ['ന്ധ', 'ഗാന്ധിജി', 'അന്ധൻ'],
  ['സ്ഥ', 'സ്ഥലം', 'സ്ഥാനം'],
  ['സ്ത', 'പുസ്തകം', 'അസ്തമയം'],
  ['ക്ഷ', 'അക്ഷരം', 'വൃക്ഷം'],
  ['ന്ത', 'പന്ത്', 'ഓന്ത്'],
  ['ങ്ക', 'പങ്കായം', 'തിങ്കൾ'],
  ['ഞ്ച', 'സഞ്ചി', 'ഇഞ്ചി'],
  ['യ്യ', 'നെയ്യ്', 'തയ്യൽ'],
  ['വ്വ', 'വവ്വാൽ', 'ചൊവ്വ'],
  ['ൾ', 'വാൾ', 'തേൾ'],
  ['ൽ', 'മയിൽ', 'മുയൽ'],
  ['ൺ', 'കൂൺ', 'തൂൺ'],
  ['ൻ', 'മാൻ', 'മീൻ'],
  ['ർ', 'കയർ', 'പയർ']
];

const shortAnswers: [string, string][] = [
  ['നമ്മുടെ രാഷ്ട്ര പിതാവ് ആര്?', 'ഗാന്ധിജി'],
  ['ആകാശത്ത് മിന്നുന്നത് എന്ത്?', 'നക്ഷത്രം'],
  ['കൊട്ടാൻ ഉപയോഗിക്കുന്ന വാദ്യം?', 'ചെണ്ട'],
  ['പാലിൽ നിന്ന് നിർമ്മിക്കുന്ന മഞ്ഞ നിറമുള്ള ഭക്ഷ്യ വസ്തു ഏത്?', 'നെയ്യ്'],
  ['ആഴ്ചയിലെ മൂന്നാമത്തെ ദിവസം ഏത്?', 'ചൊവ്വ'],
  ['നമ്മുടെ ദേശീയ പക്ഷി ഏത്?', 'മയിൽ'],
  ['ഒരു സുഗന്ധ ദ്രവ്യത്തിന്റെ പേര് എഴുതുക.', 'മഞ്ഞൾ'],
  ['മുഖം നോക്കാൻ ഉപയോഗിക്കുന്നത് എന്ത്?', 'കണ്ണാടി'],
  ['തേനീച്ച നിർമ്മിക്കുന്ന മധുര വസ്തു ഏത്?', 'തേൻ']
];

const signs: [string, string][] = [
  ['ആ', 'ാ'],
  ['ഇ', 'ി'],
  ['ഈ', 'ീ'],
  ['ഉ', 'ു'],
  ['ഊ', 'ൂ'],
  ['ഋ', 'ൃ'],
  ['എ', 'െ'],
  ['ഏ', 'േ'],
  ['ഐ', 'ൈ'],
  ['ഒ', 'ൊ'],
  ['ഓ', 'ോ'],
  ['ഔ', 'ൗ'],
  ['അം', 'ം'],
  ['അഃ', 'ഃ'],
  ['്ര', '്ര'],
  ['വ', '്വ'],
  ['യ', '്യ']
];

const completions: [string, string][] = [
  ['മുയൽ ______.', 'ഓടി'],
  ['പൂവിൽ ______.', 'തേൻ'],
  ['തൂവൽ ______.', 'പറന്നു'],
  ['മാൻ ______.', 'ചാടി']
];

const days = ['ഞായർ', 'തിങ്കൾ', 'ചൊവ്വ', 'ബുധൻ', 'വ്യാഴം', 'വെള്ളി', 'ശനി'];
const dayOrdinals = ['ഒന്നാമത്തെ', 'രണ്ടാമത്തെ', 'മൂന്നാമത്തെ', 'നാലാമത്തെ', 'അഞ്ചാമത്തെ', 'ആറാമത്തെ', 'ഏഴാമത്തെ'];

export const FAZIA_MALAYALAM_LESSON: MalayalamLesson = {
  id: 'fazia-grade-2-malayalam-first-semester',
  grade: 2,
  title: 'First Semester Exam Portions',
  examDate: '2026-11-05',
  sourceNote: 'Portion sheets dated 6 and 9 October 2026. Teacher note: P Completed.',
  questions: [
    ...revisionWords.map(({ word, focus }, index) =>
      textQuestion(
        `g2-mal-revision-${index + 1}`,
        'revision',
        `ഈ അക്ഷരക്കൂട്ടങ്ങൾക്ക് നൽകിയിരിക്കുന്ന വാക്ക് എഴുതുക: ${focus}.`,
        word
      )
    ),
    ...synonyms.map(([word, answer], index) =>
      textQuestion(
        `g2-mal-synonym-${index + 1}`,
        'synonyms',
        `"${word}" എന്ന വാക്കിന്റെ പകരം പദം എഴുതുക.`,
        answer,
        [],
        'Accept a Malayalam word with the same meaning as the reference answer. Do not accept an unrelated or opposite meaning.'
      )
    ),
    ...twoWordExamples.map(([cluster, first, second], index) =>
      pairQuestion(`g2-mal-pair-${index + 1}`, cluster, first, second)
    ),
    ...shortAnswers.map(([prompt, answer], index) =>
      textQuestion(
        `g2-mal-name-${index + 1}`,
        'names',
        prompt,
        answer,
        [],
        'Accept a concise Malayalam answer that names the same person, object, or thing as the reference answer. Do not accept an unrelated answer.'
      )
    ),
    ...signs.map(([letter, sign], index) =>
      textQuestion(
        `g2-mal-sign-${index + 1}`,
        'signs',
        `പട്ടികയിൽ "${letter}" എന്നതിന് നൽകിയിരിക്കുന്ന ചിഹ്നം എഴുതുക.`,
        sign
      )
    ),
    ...completions.map(([prompt, answer], index) =>
      textQuestion(
        `g2-mal-fill-${index + 1}`,
        'fill-in',
        prompt,
        answer,
        [prompt.replace(' ______.', ` ${answer}.`)]
      )
    ),
    ...days.map((day, index) =>
      textQuestion(
        `g2-mal-day-${index + 1}`,
        'days',
        `ആഴ്ചയിലെ ${dayOrdinals[index]} ദിവസം ഏത്?`,
        day
      )
    )
  ]
};

export function getMalayalamLesson(studentId: StudentId): MalayalamLesson {
  const profile = getStudentProfile(studentId);
  if (profile.grade !== FAZIA_MALAYALAM_LESSON.grade) {
    throw new Error(`Malayalam exam revision is not available for ${profile.gradeLabel}.`);
  }
  return FAZIA_MALAYALAM_LESSON;
}

export function normalizeMalayalamAnswer(answer: string): string {
  return answer
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, '');
}

export function checkMalayalamAnswer(question: MalayalamQuestion, answer: string): boolean {
  if (!answer.trim()) return false;
  if (question.kind === 'pair') {
    const submittedWords = answer
      .normalize('NFC')
      .split(/[,\s/;|،]+/u)
      .map(normalizeMalayalamAnswer)
      .filter(Boolean);
    const expectedWords = question.answerWords.map(normalizeMalayalamAnswer);
    return submittedWords.length === expectedWords.length &&
      new Set(submittedWords).size === expectedWords.length &&
      expectedWords.every(word => submittedWords.includes(word));
  }
  const normalized = normalizeMalayalamAnswer(answer);
  return question.acceptedAnswers.some(
    acceptedAnswer => normalizeMalayalamAnswer(acceptedAnswer) === normalized
  );
}
