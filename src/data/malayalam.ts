import { StudentId } from '../types';
import { getStudentProfile } from './profiles';

export type MalayalamSectionId =
  | 'revision'
  | 'synonyms'
  | 'word-pairs'
  | 'names'
  | 'signs'
  | 'fill-in'
  | 'days'
  | 'meanings'
  | 'multiple-meanings'
  | 'opposites'
  | 'gender'
  | 'split'
  | 'join'
  | 'vigraham'
  | 'sentence'
  | 'answers';

export interface MalayalamSection {
  id: MalayalamSectionId;
  number?: string;
  label: string;
  nativeLabel: string;
}

export const MALAYALAM_SECTIONS: MalayalamSection[] = [
  { id: 'revision', number: 'I', label: 'Revision words', nativeLabel: 'ആവർത്തനം' },
  { id: 'synonyms', number: 'II', label: 'Synonyms', nativeLabel: 'പകരം പദം എഴുതുക' },
  { id: 'word-pairs', number: 'III', label: 'Write two words', nativeLabel: 'രണ്ടു വാക്കുകൾ വീതം' },
  { id: 'names', number: 'IV', label: 'Answer the questions', nativeLabel: 'പേരെഴുതുക' },
  { id: 'signs', number: 'V', label: 'Signs', nativeLabel: 'ചിഹ്നങ്ങൾ' },
  { id: 'fill-in', number: 'VI', label: 'Fill in', nativeLabel: 'പൂരിപ്പിക്കുക' },
  { id: 'days', number: 'VII', label: 'Days of the week', nativeLabel: 'ആഴ്ചയിലെ 7 ദിവസങ്ങൾ' }
];

export const SHIZA_MALAYALAM_SECTIONS: MalayalamSection[] = [
  { id: 'meanings', label: 'Word meanings', nativeLabel: 'അർഥം' },
  { id: 'multiple-meanings', label: 'Multiple meanings', nativeLabel: 'നാനാർഥം' },
  { id: 'synonyms', label: 'Synonyms', nativeLabel: 'പര്യായം' },
  { id: 'opposites', label: 'Opposites', nativeLabel: 'വിപരീതം' },
  { id: 'gender', label: 'Opposite gender', nativeLabel: 'എതിർലിംഗം' },
  { id: 'split', label: 'Split the words', nativeLabel: 'പിരിച്ചെഴുതുക' },
  { id: 'join', label: 'Join the words', nativeLabel: 'ചേർത്തെഴുതുക' },
  { id: 'vigraham', label: 'Expand the compound', nativeLabel: 'വിഗ്രഹിച്ചെഴുതുക' },
  { id: 'sentence', label: 'Use in a sentence', nativeLabel: 'വാക്യത്തിൽ പ്രയോഗിക്കുക' },
  { id: 'answers', label: 'Answer the questions', nativeLabel: 'ഉത്തരം എഴുതുക' }
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

export interface MalayalamWrittenQuestion extends MalayalamQuestionBase {
  kind: 'written';
  acceptedAnswers: string[];
  markingCriteria: string;
}

export interface MalayalamPairQuestion extends MalayalamQuestionBase {
  kind: 'pair';
  answerWords: readonly string[];
}

export interface MalayalamPartsQuestion extends MalayalamQuestionBase {
  kind: 'parts';
  answerParts: readonly string[];
  acceptedPartAnswers?: readonly (readonly string[])[];
}

export type MalayalamQuestion =
  | MalayalamTextQuestion
  | MalayalamWrittenQuestion
  | MalayalamPairQuestion
  | MalayalamPartsQuestion;

export interface MalayalamLesson {
  id: string;
  grade: number;
  title: string;
  examDate: string;
  sourceNote: string;
  sections: MalayalamSection[];
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

const writtenQuestion = (
  id: string,
  section: MalayalamSectionId,
  prompt: string,
  answer: string,
  markingCriteria: string
): MalayalamWrittenQuestion => ({
  id,
  section,
  kind: 'written',
  prompt,
  answer,
  acceptedAnswers: [answer],
  markingCriteria
});

const pairQuestion = (
  id: string,
  section: MalayalamSectionId,
  prompt: string,
  words: readonly string[]
): MalayalamPairQuestion => ({
  id,
  section,
  kind: 'pair',
  prompt,
  answer: words.join(', '),
  answerWords: words
});

const partsQuestion = (
  id: string,
  section: MalayalamSectionId,
  prompt: string,
  parts: readonly string[],
  acceptedPartAnswers: readonly (readonly string[])[] = []
): MalayalamPartsQuestion => ({
  id,
  section,
  kind: 'parts',
  prompt,
  answer: parts.join(' + '),
  answerParts: parts,
  acceptedPartAnswers
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

const MEANING_CRITERIA =
  'Accept a Malayalam word or phrase with the same meaning as the reference answer. Do not accept an unrelated or opposite meaning.';

interface ShizaMeaning {
  word: string;
  answer: string;
  acceptedAnswers?: string[];
}

const shizaLessonOneMeanings: ShizaMeaning[] = [
  { word: 'പുണർന്നിത്', answer: 'ആലിംഗനം ചെയ്ത്', acceptedAnswers: ['ആലിംഘനം ചെയ്ത്', 'കെട്ടിപ്പിടിച്ചു'] },
  { word: 'മേവുക', answer: 'വസിക്കുക', acceptedAnswers: ['താമസിക്കുക'] },
  { word: 'വേപിച്ചു', answer: 'വിറച്ച്', acceptedAnswers: ['വിറച്ചു'] },
  { word: 'മേനി', answer: 'ശരീരം', acceptedAnswers: ['ദേഹം'] },
  { word: 'ചാലെ', answer: 'നന്നായി', acceptedAnswers: ['നല്ലപോലെ'] },
  { word: 'പാരിച്ചു നിന്നുള്ള', answer: 'വലുതായ', acceptedAnswers: ['വളരെയധികമായ', 'പെരുകിയ'] },
  { word: 'പാഴ്മ', answer: 'കുസൃതി', acceptedAnswers: ['കുരുത്തം', 'വികൃതി'] },
  { word: 'പാശം', answer: 'കയർ', acceptedAnswers: ['ചരട്'] },
  { word: 'തിണ്ണം', answer: 'വേഗത്തിൽ', acceptedAnswers: ['വേഗം'] },
  { word: 'പുണ്ണ്', answer: 'വ്രണം', acceptedAnswers: ['മുറിവ്'] },
  { word: 'നന്ദജൻ', answer: 'ശ്രീകൃഷ്ണൻ', acceptedAnswers: ['കൃഷ്ണൻ'] },
  { word: 'വാഴ്ക', answer: 'സുഖമായി ജീവിക്കുക', acceptedAnswers: ['സുഖമായി ജീവിക്കൂ'] },
  { word: 'നന്മുഖം', answer: 'നല്ല മുഖം', acceptedAnswers: ['സുന്ദരമായ മുഖം'] },
  { word: 'നുകർന്നൂ', answer: 'ചുംബിച്ചു', acceptedAnswers: ['ചുംബിച്ച്'] },
  { word: 'ചിത്തം', answer: 'മനസ്സ്', acceptedAnswers: ['മനസ്'] },
  { word: 'വേണ്ടാതോ', answer: 'വേണ്ടേ' },
  { word: 'വലിക്കേണ്ടാതോ', answer: 'വലിക്കേണ്ടേ' }
];

const shizaLessonTwoMeanings: ShizaMeaning[] = [
  { word: 'തൂലികാനാമം', answer: 'എഴുത്തുകാർ സ്വീകരിക്കുന്ന പേര്' },
  { word: 'വസ്തുത', answer: 'വാസ്തവം' },
  { word: 'സമഗ്രം', answer: 'പൂർണ്ണമായ', acceptedAnswers: ['പൂർണമായ'] },
  { word: 'പിതൃതുല്യം', answer: 'പിതാവിന് തുല്യം' },
  { word: 'കെണി', answer: 'കുരുക്ക്' },
  { word: 'ചാമ്പൽ', answer: 'ചാരം' },
  { word: 'തീവ്രം', answer: 'കഠിനം', acceptedAnswers: ['തീക്ഷ്ണം'] },
  { word: 'ചമയ്ക്കുക', answer: 'ഉണ്ടാക്കുക', acceptedAnswers: ['നിർമ്മിക്കുക'] }
];

const shizaLessonOneSynonyms: { word: string; words: string[] }[] = [
  { word: 'മുഖം', words: ['ആനനം', 'വദനം'] },
  { word: 'മകൻ', words: ['പുത്രൻ', 'സുതൻ'] }
];

const shizaLessonTwoSynonyms: { word: string; words: string[] }[] = [
  { word: 'ലോകം', words: ['ജഗത്ത്', 'ഭുവനം', 'വിശ്വം'] },
  { word: 'ചാരം', words: ['ചാമ്പൽ', 'ഭസ്മം', 'ക്ഷാരം'] }
];

const opposites: [string, string][] = [
  ['ഭാഗ്യം', 'നിർഭാഗ്യം'],
  ['അനാഥൻ', 'സനാഥൻ'],
  ['തിന്മ', 'നന്മ'],
  ['ഉയർച്ച', 'താഴ്ച']
];

const oppositeGender: [string, string][] = [
  ['അനുജൻ', 'അനുജത്തി'],
  ['മുത്തച്ഛൻ', 'മുത്തശ്ശി']
];

const lessonOneSplits: { compound: string; parts: string[] }[] = [
  { compound: 'ചാലെപ്പിടിച്ചങ്ങ്', parts: ['ചാലെ', 'പിടിച്ച്', 'അങ്ങ്'] },
  { compound: 'ഉണ്ണിപ്പൂമേനി', parts: ['ഉണ്ണി', 'പൂ', 'മേനി'] },
  { compound: 'നന്മുഖം', parts: ['നൽ', 'മുഖം'] },
  { compound: 'നന്ദനുമന്നേരം', parts: ['നന്ദനും', 'അന്നേരം'] }
];

const lessonTwoSplits: { compound: string; parts: string[]; acceptedParts?: string[][] }[] = [
  { compound: 'ഇത്രയുമായിരുന്ന', parts: ['ഇത്രയും', 'ആയിരുന്ന'] },
  { compound: 'നാമറിയുക', parts: ['നാം', 'അറിയുക'] },
  { compound: 'അയാളൊരുക്കുന്ന', parts: ['അയാൾ', 'ഒരുക്കുന്ന'] },
  {
    compound: 'വഴങ്ങില്ല',
    parts: ['വഴങ്ങുക', 'ഇല്ല'],
    acceptedParts: [['വഴങ്ങി', 'ഇല്ല']]
  }
];

const lessonOneJoins: [string, string][] = [
  ['ഓടി + വന്ന് + എന്നുടെ', 'ഓടിവന്നെന്നുടെ'],
  ['ചെന്ന് + അങ്ങ്', 'ചെന്നങ്ങ്'],
  ['ചൊല്ലി + തലോടി + തുടങ്ങി', 'ചൊല്ലിത്തലോടിത്തുടങ്ങി'],
  ['വീഴ്ത്തി + അണഞ്ഞു', 'വീഴ്ത്തിയണഞ്ഞു']
];

const lessonTwoJoins: [string, string][] = [
  ['മനോഹരം + ആയിരുന്നു', 'മനോഹരമായിരുന്നു'],
  ['ഇനി + അങ്ങോട്ട്', 'ഇനിയങ്ങോട്ട്'],
  ['അയാൾ + അങ്ങനെ', 'അയാളങ്ങനെ'],
  ['ജയിലിൽ + ആയി', 'ജയിലിലായി']
];

const vigrahams: { compound: string; answer: string; criteria: string }[] = [
  {
    compound: 'ഉണ്ണിപ്പൂമേനി',
    answer: 'ഉണ്ണിയുടെ പൂമേനി',
    criteria: 'The answer must expand the compound as ഉണ്ണിയുടെ പൂമേനി (the child’s flower-like body). Accept equivalent Malayalam wording that keeps the meaning of ഉണ്ണി and പൂമേനി.'
  },
  {
    compound: 'വാത്സല്യപൂരം',
    answer: 'വാത്സല്യത്തിന്റെ പൂരം',
    criteria: 'The supplied notes expand the compound as വാത്സല്യത്തിന്റെ പൂരം. Accept equivalent Malayalam wording that preserves the meaning of the fullness of affection. Reject an expansion that changes the meaning.'
  },
  {
    compound: 'കഥാഗതി',
    answer: 'കഥയുടെ ഗതി',
    criteria: 'The answer must expand the compound as കഥയുടെ ഗതി (the course of the story). Accept equivalent Malayalam wording with the same meaning.'
  },
  {
    compound: 'തീവ്രപരിശീലനം',
    answer: 'തീവ്രമായ പരിശീലനം',
    criteria: 'The answer must expand the compound as തീവ്രമായ പരിശീലനം (intense training). Accept equivalent Malayalam wording with the same meaning.'
  },
  {
    compound: 'പരമസത്യം',
    answer: 'പരമമായ സത്യം',
    criteria: 'The answer must expand the compound as പരമമായ സത്യം (the supreme truth). Accept equivalent Malayalam wording with the same meaning.'
  }
];

const lessonOneAnswers: { prompt: string; answer: string; criteria: string }[] = [
  {
    prompt: 'കണ്ണനെ കണ്ടപ്പോൾ യശോദ എന്താണ് ചെയ്തത്?',
    answer: 'കണ്ണനെ കണ്ടപ്പോൾ യശോദ കരഞ്ഞു കൊണ്ട് ഓടിയെത്തി കുട്ടിയായിരുന്ന കാലത്ത് ചെയ്തിരുന്നു പോലെ കെട്ടിപ്പിടിച്ചു നിന്നു.',
    criteria: 'The answer must say that when Yashoda saw Kannan she came running, crying, and hugged him as she used to when he was a baby. Accept equivalent Malayalam wording; require the idea of coming or running to him and embracing him.'
  },
  {
    prompt: 'കൃഷ്ണന്റെ മുഖത്ത് ഉമ്മവച്ചുകൊണ്ട് അമ്മയായ യശോദ എന്താണ് പറഞ്ഞത്?',
    answer: '“എന്റെ മുഖത്തു നോക്കി പുഞ്ചിരിക്കുന്ന നിന്റെ നല്ല മുഖം കാണട്ടെ” എന്നാണ് യശോദ പറഞ്ഞത്.',
    criteria: 'The answer must give Yashoda’s words: that she wants to see his good face smiling at her. Accept a paraphrase of the quoted words in equivalent Malayalam. The kiss does not need to be repeated because the prompt already includes it.'
  },
  {
    prompt: 'നന്ദഗോപരുടെ മനസ്സുതെളിയാനുള്ള കാരണമെന്ത്?',
    answer: 'പുത്രനെ കണ്ടതാണ് നന്ദഗോപരുടെ മനസ്സു തെളിയാനുള്ള കാരണം.',
    criteria: 'The answer must say that Nandagopan’s mind became clear or happy because he saw his son. Accept equivalent Malayalam wording.'
  },
  {
    prompt: 'ശ്രീകൃഷ്ണൻ അമ്മയുടെ മുഖത്തു നോക്കി പുഞ്ചിരിതൂകിയത് എപ്പോൾ?',
    answer: 'മടിയിൽ വച്ച് എൻ മകൻ വാഴ്കെന്നു പറയുമ്പോഴാണ് അമ്മയുടെ മുഖത്തു നോക്കി കണ്ണൻ പുഞ്ചിരി തൂകിയത്.',
    criteria: 'The answer must say that Krishna smiled looking at his mother’s face when she held him on her lap and said “വാഴ്ക” (live happily). Accept equivalent Malayalam wording.'
  },
  {
    prompt: 'കൃഷ്ണന്റെ എന്തൊക്കെ ബാലലീലകളാണ് നന്ദഗോപൻ ഓർക്കുന്നത്?',
    answer: 'മുതുകിൽ കയറി ആനകളിക്കുക, അമ്പിളിയെപ്പിടിക്കാൻ കഴുത്തിൽ കയറുക, മടിയിലിരുന്ന് താടി പിടിച്ചു വലിക്കുക തുടങ്ങിയ ബാലലീലകളാണ് നന്ദഗോപൻ ഓർക്കുന്നത്.',
    criteria: 'The answer must mention at least two of Krishna’s childhood pranks: climbing on Nandagopan’s back and playing elephant, climbing on his neck to catch the moon, and sitting on his lap and pulling his beard. Accept equivalent Malayalam wording.'
  }
];

const lessonTwoAnswers: { prompt: string; answer: string; criteria: string }[] = [
  {
    prompt: '“മാലി” എന്ന തൂലികാനാമത്തിൽ അറിയപ്പെടുന്ന കഥാകൃത്ത് ആര്?',
    answer: 'വി. മാധവൻ നായർ ആണ് “മാലി” എന്ന തൂലികാനാമത്തിൽ അറിയപ്പെടുന്നത്.',
    criteria: 'The answer must name വി. മാധവൻ നായർ (V. Madhavan Nair) as the story writer known by the pen name മാലി. Accept equivalent Malayalam wording.'
  },
  {
    prompt: 'കോമൻ സർക്കസ്സിലെ മുഖ്യകഥാപാത്രങ്ങൾ ആരൊക്കെയായിരുന്നു?',
    answer: 'ഒരാന, ഒരു സിംഹം, ഒരു കുറുക്കൻ, രണ്ടു കുരങ്ങന്മാർ, രണ്ടു കടുവകൾ, രണ്ടു കരടികൾ, എട്ട് ഒട്ടകങ്ങൾ, എട്ടുകുതിരകൾ ഇത്രയുമായിരുന്നു കോമൻ സർക്കസിലെ മൃഗങ്ങൾ.',
    criteria: 'The answer must list the main animals of Koman Circus: one elephant, one lion, one fox, two monkeys, two tigers, two bears, eight camels, and eight horses. Accept equivalent Malayalam wording and require most of the list.'
  },
  {
    prompt: 'ജന്തുസർക്കസ്സ് തുടങ്ങുവാൻ ചിമ്പനെ പ്രേരിപ്പിച്ചത് എന്ത്?',
    answer: 'സ്വപ്നത്തിൽ ചിമ്പന് ലഭിച്ച ദർശനമാണ് ജന്തുസർക്കസ് തുടങ്ങുവാൻ ചിമ്പനെ പ്രേരിപ്പിച്ചത്.',
    criteria: 'The answer must say that a vision or dream that Chimban received inspired him to start the animal circus. Accept equivalent Malayalam wording.'
  },
  {
    prompt: 'മൃഗങ്ങളുടെ ദുരിതകാലം അവസാനിച്ചതെങ്ങനെ?',
    answer: 'ചിമ്പന്റെ അനുജനായ കൊച്ചീപ്പനും കൂട്ടുകാരും ചേർന്ന് ചിമ്പനെ രക്ഷിക്കുകയും ചെയ്തു. ഇതറിയാതെ ചാപ്പനെ വെടിവച്ചു കൊന്ന് കേളൻ ജയിലിലായി. അതോടെ മൃഗങ്ങളുടെ ദുരിതകാലം അവസാനിച്ചു.',
    criteria: 'The answer must say that Kochippan, Chimban’s younger brother, and his friends rescued Chimban; Kelan shot Chappan without knowing and was jailed; and that ended the animals’ suffering. Accept equivalent Malayalam wording; require the rescue and Kelan’s imprisonment.'
  },
  {
    prompt: 'സർക്കസ്സ് എന്ന ബാലനോവൽ നൽകുന്ന സന്ദേശം എന്ത്?',
    answer: 'സ്നേഹം കൊണ്ട് ഈ ഭൂമിയിൽ സ്വർഗം ചമയ്ക്കാം. ഇതാണ് സർക്കസ്സ് എന്ന ബാലനോവൽ നൽകുന്ന സന്ദേശം.',
    criteria: 'The answer must state the message that we can make a heaven on earth through love. Accept equivalent Malayalam wording.'
  },
  {
    prompt: 'പ്രശസ്തിയുടെ കൊടുമുടിയിൽ നിൽക്കവേ എങ്ങനെയാണ് സർക്കസ്സ് കമ്പനി പൊളിഞ്ഞത്?',
    answer: 'കമ്പനി മാനേജരായ കേളനാണ് സർക്കസ്സ് കമ്പനി പൊളിയാൻ കാരണമായത്. കുബുദ്ധിയായ അയാൾ ഒരുക്കിയ കെണിയിൽപ്പെട്ട് കോമൻ സർക്കസ്സ് കമ്പനി കേളന് വിട്ടു കൊടുത്തു.',
    criteria: 'The answer must say that Kelan, the company manager, used his cunning and a trap to take over the Koman Circus company, which caused it to collapse. Accept equivalent Malayalam wording.'
  }
];

interface ShizaLessonExercises {
  number: number;
  meanings: [string, string][];
  opposites: [string, string][];
  synonyms?: { word: string; words: string[] }[];
  multipleMeanings?: { word: string; words: string[] }[];
  gender?: [string, string][];
  splits: { compound: string; parts: string[] }[];
  joins: [string, string][];
  vigrahams?: [string, string][];
  sentences?: [string, string][];
  answers: { number?: number; prompt: string; answer: string; criteria: string }[];
}

const shizaAdditionalLessons: ShizaLessonExercises[] = [
  {
    number: 3,
    meanings: [
      ['പ്രാചീനം', 'മുമ്പുള്ളത്'],
      ['ത്രയം', 'മൂന്ന്'],
      ['ആശ്രിതൻ', 'ആശ്രയിച്ചു കഴിയുന്നവൻ'],
      ['ഇമ്പം', 'ഇഷ്ടം'],
      ['ആചാര്യൻ', 'ഗുരു'],
      ['ഉപജ്ഞാതാവ്', 'കണ്ടുപിടിച്ചയാൾ'],
      ['ഫലിതം', 'തമാശ'],
      ['സുലഭം', 'എളുപ്പം ലഭിക്കുന്നത്'],
      ['സുപരിചിതം', 'നല്ല പരിചയമുള്ള'],
      ['കനകം', 'സ്വർണ്ണം'],
      ['ലജ്ജിതൻ', 'നാണിച്ചവൻ']
    ],
    opposites: [
      ['പ്രാചീനം', 'നവീനം'],
      ['സുപരിചിതം', 'അപരിചിതം'],
      ['ധർമ്മം', 'അധർമ്മം'],
      ['സുലഭം', 'ദുർലഭം']
    ],
    gender: [
      ['കവി', 'കവയിത്രി'],
      ['ആശ്രിതൻ', 'ആശ്രിത'],
      ['രാജാവ്', 'രാജ്ഞി'],
      ['ആചാര്യൻ', 'ആചാര്യ']
    ],
    splits: [
      { compound: 'വ്യക്തമായറിയില്ല', parts: ['വ്യക്തമായി', 'അറിയില്ല'] },
      { compound: 'തൊട്ടിലാട്ടി', parts: ['തൊട്ടിൽ', 'ആട്ടി'] },
      { compound: 'കോർത്തിണക്കി', parts: ['കോർത്ത്', 'ഇണക്കി'] }
    ],
    joins: [
      ['തോൽക്കും + എന്ന', 'തോൽക്കുമെന്ന'],
      ['കാവ്യം + ആക്കാൻ', 'കാവ്യമാക്കാൻ'],
      ['ധാരാളം + ഉണ്ട്', 'ധാരാളമുണ്ട്']
    ],
    vigrahams: [
      ['നൃപപത്നി', 'രാജാവിന്റെ പത്നി'],
      ['ഉറക്കുപാട്ട്', 'ഉറക്കാനുള്ള പാട്ട്'],
      ['പ്രകൃതിദൃശ്യം', 'പ്രകൃതിയുടെ ദൃശ്യം']
    ],
    sentences: [
      ['വിശേഷിപ്പിക്കുക', 'റൊണാൾഡോ നല്ല കളിക്കാരൻ എന്ന് വിശേഷിപ്പിക്കുന്നു.'],
      ['സസന്തോഷം', 'തങ്ങൾക്ക് ലഭിച്ച പുതിയ നേതാവിനെ ജനങ്ങൾ സസന്തോഷം സ്വീകരിച്ചു.'],
      ['സുപരിചിതം', 'സമൂഹമാധ്യമങ്ങൾ ഇന്നത്തെ കുട്ടികൾക്ക് സുപരിചിതമാണ്.']
    ],
    answers: [
      {
        prompt: 'മലയാളസാഹിത്യത്തിലെ പ്രാചീനകവിത്രയം എന്നറിയപ്പെടുന്ന മഹാകവികൾ ആരെല്ലാം?',
        answer: 'ചെറുശ്ശേരി, എഴുത്തച്ഛൻ, കുഞ്ചൻ നമ്പ്യാർ എന്നിവരാണ് പ്രാചീനകവിത്രയത്തിൽപ്പെട്ട മഹാകവികൾ.',
        criteria: 'Name all three poets: ചെറുശ്ശേരി, എഴുത്തച്ഛൻ, and കുഞ്ചൻ നമ്പ്യാർ. Accept equivalent Malayalam wording and any order; do not substitute other poets.'
      },
      {
        prompt: 'മലയാള ഭാഷയുടെ ആദ്യകൃതി എന്നറിയപ്പെടുന്ന മഹാകാവ്യം ഏത്?',
        answer: 'മലയാള ഭാഷയുടെ ആദ്യകൃതി എന്നറിയപ്പെടുന്നത് കൃഷ്ണഗാഥയാണ്.',
        criteria: 'The supplied notes give കൃഷ്ണഗാഥ as the answer. Require that title in Malayalam; accept equivalent wording. The source wording is flagged for teacher confirmation.'
      },
      {
        prompt: 'എഴുത്തച്ഛൻ തന്റെ കാവ്യങ്ങളിൽ ലക്ഷ്യമിടുന്നത് എന്താണ്?',
        answer: 'നന്മയെ വളർത്തുകയും തിന്മയെ നശിപ്പിക്കുകയും ചെയ്യുക എന്നതാണ് എഴുത്തച്ഛൻ തന്റെ കാവ്യങ്ങളിൽ ലക്ഷ്യമിടുന്നത്.',
        criteria: 'Require both ideas: encouraging goodness and destroying evil. Accept equivalent Malayalam wording.'
      },
      {
        prompt: 'എഴുത്തച്ഛൻ കിളിപ്പാട്ടു പ്രസ്ഥാനത്തിന്റെ ഉപജ്ഞാതാവ് എന്നറിയപ്പെടാൻ കാരണമെന്ത്?',
        answer: 'കിളിയെക്കൊണ്ട് കഥ പറയിപ്പിക്കുന്ന രീതിയാണ് എഴുത്തച്ഛൻ സ്വീകരിച്ചത്. അതുകൊണ്ടാണ് എഴുത്തച്ഛൻ കിളിപ്പാട്ടു പ്രസ്ഥാനത്തിന്റെ ഉപജ്ഞാതാവ് എന്നു വിശേഷിപ്പിക്കപ്പെടുന്നത്.',
        criteria: 'Explain that Ezhuthachan adopted the method of having a bird narrate the story. Accept equivalent Malayalam wording.'
      },
      {
        prompt: 'നമ്പ്യാരെ ജനകീയകവി എന്നു വിളിക്കാൻ കാരണമെന്ത്?',
        answer: 'സാധാരണ ജനങ്ങൾ സംസാരിക്കുന്ന ഭാഷയും, അവരെ രസിപ്പിക്കുന്ന കഥാരീതിയുമാണ് നമ്പ്യാർ സ്വീകരിച്ചത്. അതിനാൽ നമ്പ്യാരെ ജനകീയ കവി എന്നു വിശേഷിപ്പിക്കുന്നു.',
        criteria: 'Require both ordinary people’s spoken language and a storytelling style that entertains them. Accept equivalent Malayalam wording.'
      },
      {
        prompt: 'നമ്പ്യാർ സാമൂഹിക പരിഷ്കർത്താവ് ആകുന്നതെങ്ങനെ?',
        answer: 'മടിയന്മാരായ ജോലിക്കാർ, അഴിമതി കാണിക്കുന്ന ഉദ്യോഗസ്ഥർ, ഭക്ഷണപ്രിയരായ ആളുകൾ, അസൂയക്കാർ, അത്യാഗ്രഹികൾ തുടങ്ങിയവരെയെല്ലാം നമ്പ്യാർ തന്റെ കൃതികളിലൂടെ പരിഹസിക്കുന്നു. അങ്ങനെ സമൂഹത്തെ പരിഹസിച്ചു നന്നാക്കാൻ ശ്രമിച്ച അദ്ദേഹം സാമൂഹ്യ പരിഷ്കർത്താവായി മാറുന്നു.',
        criteria: 'Explain that Nambiar used satire in his works to expose social faults and improve society. Include at least two supplied examples: lazy workers, corrupt officials, excessive love of food, jealousy, or greed. Accept equivalent Malayalam wording.'
      }
    ]
  },
  {
    number: 4,
    meanings: [
      ['അർഥം', 'ധനം'],
      ['തൃപ്തിയാകാ', 'മതിയാകില്ല'],
      ['സഹസ്രം', 'ആയിരം'],
      ['ശതം', 'നൂറ്'],
      ['അയുതം', 'പതിനായിരം'],
      ['സത്തുക്കൾ', 'നല്ല ആളുകൾ'],
      ['ചെന്നിരന്നാൽ', 'ചെന്ന് യാചിച്ചാൽ'],
      ['കൊടാ', 'കൊടുക്കില്ല'],
      ['ഒത്തിടാ', 'ഒക്കുകയില്ല'],
      ['കരേറുക', 'കയറിപ്പോവുക']
    ],
    opposites: [
      ['തൃപ്തി', 'അതൃപ്തി'],
      ['ആശ', 'നിരാശ'],
      ['ദുഷ്ടൻ', 'ശിഷ്ടൻ']
    ],
    synonyms: [
      { word: 'വസ്ത്രം', words: ['ആട', 'ചേല'] },
      { word: 'ആശ', words: ['ആഗ്രഹം', 'ഇച്ഛ'] }
    ],
    multipleMeanings: [
      { word: 'അർഥം', words: ['ആശയം', 'ധനം'] }
    ],
    splits: [
      { compound: 'അർഥമെത്ര', parts: ['അർഥം', 'എത്ര'] },
      { compound: 'അയുതമാകിലും', parts: ['അയുതം', 'ആകിലും'] },
      { compound: 'ആശയായുള്ള', parts: ['ആശ', 'ആയുള്ള'] }
    ],
    joins: [
      ['വസ്ത്രം + അത് + പോലും', 'വസ്ത്രമതുപോലും'],
      ['ചെന്ന് + ഇരന്നാൽ', 'ചെന്നിരന്നാൽ'],
      ['വളരെ + ഉണ്ടായാലും', 'വളരെയുണ്ടായാലും']
    ],
    answers: [
      {
        number: 4,
        prompt: 'കവി എന്തുകൊണ്ടാണ് ചിലരെ ദുഷ്ടന്മാർ എന്നു വിളിക്കുന്നത്?',
        answer: 'നല്ലയാളുകൾ ചെന്ന് യാചിച്ചാലും ചിലർ ഉള്ള സ്വത്തിൽ നിന്ന് അല്പം പോലും കൊടുക്കില്ല. അവരെയാണ് കവി ദുഷ്ടന്മാർ എന്നു വിളിക്കുന്നത്.',
        criteria: 'Explain that some people refuse to give even a little of their wealth when good people ask for help. Accept equivalent Malayalam wording.'
      },
      {
        number: 5,
        prompt: 'ധനമോഹം ഏറെയുള്ളവർക്ക് കവി നൽകുന്ന ഉപദേശമെന്ത്?',
        answer: 'മരിച്ചു കഴിയുമ്പോൾ ആർക്കും സ്വന്തം വസ്ത്രം പോലും കൊണ്ടു പോകാൻ കഴിയില്ല. ഇതാണ് ധനമോഹം ഏറെയുള്ളവർക്ക് കവി നൽകുന്ന ഉപദേശം.',
        criteria: 'Explain that after death nobody can take possessions with them, not even their own clothes. Accept equivalent Malayalam wording; require the idea of being unable to take even clothing.'
      }
    ]
  },
  {
    number: 5,
    meanings: [
      ['വ്യാപാരി', 'കച്ചവടക്കാരൻ'],
      ['കുബേരൻ', 'വലിയ പണക്കാരൻ'],
      ['പുച്ഛം', 'വെറുപ്പ്'],
      ['ദയാലു', 'ദയയുള്ളവൻ'],
      ['ഉറ്റതോഴൻ', 'അടുത്ത സുഹൃത്ത്'],
      ['ഞെരുക്കം', 'ബുദ്ധിമുട്ട്'],
      ['തെല്ലും', 'അല്പം പോലും'],
      ['ഉടമ്പടി', 'കരാറ്'],
      ['അമാന്തിക്കുക', 'മടിക്കുക'],
      ['വ്യസനിക്കുക', 'ദുഃഖിക്കുക'],
      ['മതിമറന്നു', 'സ്വയം മറന്നു'],
      ['വിഷണ്ണനായി', 'ദുഃഖിതനായി'],
      ['പാരിതോഷികം', 'അഭിനന്ദിച്ച് നൽകുന്ന സമ്മാനം'],
      ['ആദ്യാവസാനം', 'തുടക്കം മുതൽ ഒടുക്കം വരെ'],
      ['ശണ്ഠ', 'വഴക്ക്'],
      ['സ്തബ്ധനായി', 'നിശ്ചലനായി']
    ],
    opposites: [
      ['സമ്മതം', 'വിസമ്മതം'],
      ['ശ്രദ്ധ', 'അശ്രദ്ധ'],
      ['രക്ഷ', 'ശിക്ഷ']
    ],
    synonyms: [
      { word: 'ചങ്ങാതി', words: ['സുഹൃത്ത്', 'തോഴൻ', 'സ്നേഹിതൻ'] },
      { word: 'ദുഃഖം', words: ['വ്യസനം', 'ശോകം', 'കദനം'] }
    ],
    multipleMeanings: [
      { word: 'ധരിപ്പിക്കുക', words: ['അണിയിക്കുക', 'മനസ്സിലാക്കിക്കൊടുക്കുക'] }
    ],
    gender: [
      ['ധനികൻ', 'ധനിക'],
      ['യുവാവ്', 'യുവതി'],
      ['ഭർത്താവ്', 'ഭാര്യ'],
      ['ബുദ്ധിമാൻ', 'ബുദ്ധിമതി']
    ],
    splits: [
      { compound: 'ഇത്തവണ', parts: ['ഇ', 'തവണ'] },
      { compound: 'ഒരുടമ്പടി', parts: ['ഒരു', 'ഉടമ്പടി'] },
      { compound: 'ലജ്ജിതനായി', parts: ['ലജ്ജിതൻ', 'ആയി'] },
      { compound: 'മുറിച്ചെടുക്കാം', parts: ['മുറിച്ച്', 'എടുക്കാം'] },
      { compound: 'രക്ഷിക്കാനെത്തിയ', parts: ['രക്ഷിക്കാൻ', 'എത്തിയ'] }
    ],
    joins: [
      ['അത് + ഓർത്തപ്പോൾ', 'അതോർത്തപ്പോൾ'],
      ['കാത്ത് + ഇരുന്നു', 'കാത്തിരുന്നു'],
      ['അതി + അധികം', 'അത്യധികം'],
      ['മടക്കി + തന്നാൽ', 'മടക്കിത്തന്നാൽ']
    ],
    vigrahams: [
      ['ദൃഢസ്വരം', 'ദൃഢമായ സ്വരം'],
      ['ധനികയുവതി', 'ധനികയായ യുവതി'],
      ['ബുദ്ധിസാമർഥ്യം', 'ബുദ്ധിയിലുള്ള സാമർഥ്യം']
    ],
    sentences: [
      ['സ്തബ്ധനാവുക', 'ഒരു വാഹനാപകടം നേരിട്ടു കണ്ടപ്പോൾ ഞാൻ സ്തബ്ധനായിപ്പോയി.'],
      ['അത്യധികം', 'സ്റ്റേജിൽ പാടാൻ അവസരം ലഭിച്ചപ്പോൾ രാമു അത്യധികം സന്തോഷിച്ചു.']
    ],
    answers: [
      {
        prompt: 'ഷൈലോക്ക് എങ്ങനെയാണ് കുബേരനായിത്തീർന്നത്?',
        answer: 'ഷൈലോക്ക് കച്ചവടം ചെയ്തും ചെറിയ വ്യാപാരികൾക്ക് പണം പലിശയ്ക്കു കടം കൊടുത്തുമാണ് കുബേരനായിത്തീർന്നത്.',
        criteria: 'Require both trading and lending money at interest to small traders as the ways Shylock became wealthy. Accept equivalent Malayalam wording.'
      },
      {
        prompt: 'അന്റോണിയോടു പകരം വീട്ടാൻ ഷൈലോക്ക് കാത്തിരിക്കാൻ കാരണമെന്ത്?',
        answer: 'അന്റോണിയോ പലിശ വാങ്ങാതെ മറ്റുള്ളവരെ സഹായിച്ചിരുന്നു. കൊള്ളപ്പലിശ വാങ്ങുന്ന ഷൈലോക്കിനെ തരം കിട്ടുമ്പോഴൊക്കെ അന്റോണിയോ കളിയാക്കുമായിരുന്നു. അതു കൊണ്ടാണ് അന്റോണിയോയോട് പകരം വീട്ടാൻ ഷൈലോക്ക് കാത്തിരുന്നത്.',
        criteria: 'Require both that Antonio helped others without charging interest and that he mocked Shylock for charging excessive interest. Accept equivalent Malayalam wording.'
      },
      {
        prompt: 'പണം നൽകാനുള്ള ഷൈലോക്കിന്റെ വ്യവസ്ഥ എന്തായിരുന്നു?',
        answer: 'അന്റോണിയോ പണം തിരികെ തന്നില്ലെങ്കിൽ അയാളുടെ ദേഹത്തു നിന്ന് ഒരു റാത്തൽ മാംസം മുറിച്ചെടുക്കും എന്നതായിരുന്നു ഷൈലോക്കിന്റെ വ്യവസ്ഥ.',
        criteria: 'State that if Antonio failed to repay, Shylock could take one pound (ഒരു റാത്തൽ) of flesh from his body. Require the repayment condition and the amount; accept equivalent Malayalam wording.'
      },
      {
        prompt: 'അന്റോണിയോയുടെ സന്ദേശം എന്തുകൊണ്ടാണ് ബസാനിയോയെ വിഷമിപ്പിച്ചത്?',
        answer: 'തന്നെ സഹായിച്ചതിനാൽ അന്റോണിയോയ്ക്കു കഷ്ടകാലം വന്നിരിക്കുന്നു എന്നറിഞ്ഞതാണ് ബസാനിയോയെ വിഷമിപ്പിച്ചത്.',
        criteria: 'Explain that Bassanio learned Antonio had fallen into trouble because he had helped him. Accept equivalent Malayalam wording.'
      },
      {
        prompt: 'ബുദ്ധിമതിയായ പോർഷ്യ എങ്ങനെയാണ് അന്റോണിയോയെ രക്ഷിച്ചത്?',
        answer: 'ഷൈലോക്കിന്റെ ഉടമ്പടി അനുസരിച്ച് മാംസം മുറിക്കുമ്പോൾ ഒരു തുള്ളി ചോര പോലും പൊടിയാൻ പാടില്ല എന്ന കാര്യം ദൃഢസ്വരത്തിൽ പോർഷ്യ അറിയിച്ചു. അങ്ങനെയാണ് ബുദ്ധിമതിയായ പോർഷ്യ അന്റോണിയോയെ രക്ഷിച്ചത്.',
        criteria: 'Explain that Portia insisted the bond allowed flesh to be cut but not even one drop of blood to be shed, thereby saving Antonio. Accept equivalent Malayalam wording; require the no-blood condition.'
      },
      {
        prompt: 'തന്റെ സുഹൃത്തിനെ രക്ഷിച്ച വക്കീലിന് എന്ത് പാരിതോഷികമാണ് ബസാനിയോ നൽകിയത്?',
        answer: 'പോർഷ്യ തന്നെ അണിയിച്ച മോതിരമാണ് വക്കീലിന് പാരിതോഷികമായി ബസാനിയോ നൽകിയത്.',
        criteria: 'Identify the ring that Portia had given Bassanio as the reward he gave the lawyer. Accept equivalent Malayalam wording; require both the ring and its connection to Portia.'
      }
    ]
  }
];

const shizaAdditionalQuestions: MalayalamQuestion[] = shizaAdditionalLessons.flatMap(lesson => {
  const prefix = `g6-mal-l${lesson.number}`;
  const promptPrefix = `പാഠം ${lesson.number} · `;
  return [
    ...lesson.meanings.map(([word, answer], index) =>
      textQuestion(`${prefix}-meaning-${index + 1}`, 'meanings',
        `${promptPrefix}“${word}” എന്ന വാക്കിന്റെ അർഥം എഴുതുക.`, answer, [], MEANING_CRITERIA)),
    ...(lesson.multipleMeanings ?? []).map(({ word, words }, index) =>
      pairQuestion(`${prefix}-multiple-meaning-${index + 1}`, 'multiple-meanings',
        `${promptPrefix}“${word}” എന്ന വാക്കിന്റെ നാനാർഥങ്ങൾ എഴുതുക.`, words)),
    ...(lesson.synonyms ?? []).map(({ word, words }, index) =>
      pairQuestion(`${prefix}-synonym-${index + 1}`, 'synonyms',
        `${promptPrefix}“${word}” എന്ന വാക്കിന്റെ പര്യായപദങ്ങൾ എഴുതുക.`, words)),
    ...lesson.opposites.map(([word, answer], index) =>
      textQuestion(`${prefix}-opposite-${index + 1}`, 'opposites',
        `${promptPrefix}“${word}” എന്ന വാക്കിന്റെ വിപരീതപദം എഴുതുക.`, answer, [],
        'Accept a Malayalam word with the opposite meaning to the given word. Do not accept a synonym or an unrelated word.')),
    ...(lesson.gender ?? []).map(([word, answer], index) =>
      textQuestion(`${prefix}-gender-${index + 1}`, 'gender',
        `${promptPrefix}“${word}” എന്ന വാക്കിന്റെ എതിർലിംഗം എഴുതുക.`, answer, [],
        'Accept the Malayalam word that correctly changes the gender of the given word. Do not accept an unrelated word.')),
    ...lesson.splits.map(({ compound, parts }, index) =>
      partsQuestion(`${prefix}-split-${index + 1}`, 'split',
        `${promptPrefix}പിരിച്ചെഴുതുക: ${compound}`, parts)),
    ...lesson.joins.map(([prompt, answer], index) =>
      textQuestion(`${prefix}-join-${index + 1}`, 'join',
        `${promptPrefix}ചേർത്തെഴുതുക: ${prompt}`, answer)),
    ...(lesson.vigrahams ?? []).map(([compound, answer], index) =>
      textQuestion(`${prefix}-vigraham-${index + 1}`, 'vigraham',
        `${promptPrefix}വിഗ്രഹിച്ചെഴുതുക: ${compound}`, answer, [],
        'Expand the compound with the same meaning and relationship as the reference answer. Accept equivalent Malayalam wording, not an unrelated definition.')),
    ...(lesson.sentences ?? []).map(([word, answer], index) =>
      writtenQuestion(`${prefix}-sentence-${index + 1}`, 'sentence',
        `${promptPrefix}“${word}” എന്ന വാക്ക് ഉൾപ്പെടുത്തി ഒരു വാക്യം എഴുതുക.`, answer,
        `The answer must be a complete, meaningful Malayalam sentence using ${word} or an inflected form of it. Accept any suitable context; the reference is only the supplied model. Reject a fragment or a sentence that does not use the word.`)),
    ...lesson.answers.map(({ number, prompt, answer, criteria }, index) =>
      writtenQuestion(`${prefix}-answer-${number ?? index + 1}`, 'answers',
        `${promptPrefix}${prompt}`, answer, criteria))
  ];
});

export const FAZIA_MALAYALAM_LESSON: MalayalamLesson = {
  id: 'fazia-grade-2-malayalam-first-semester',
  grade: 2,
  title: 'First Semester Exam Portions',
  examDate: '2026-11-05',
  sourceNote: 'Portion sheets dated 6 and 9 October 2026. Teacher note: P Completed.',
  sections: MALAYALAM_SECTIONS,
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
      pairQuestion(
        `g2-mal-pair-${index + 1}`,
        'word-pairs',
        `${cluster} ചേർന്ന രണ്ട് വാക്കുകൾ എഴുതുക.`,
        [first, second]
      )
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

export const SHIZA_MALAYALAM_LESSON: MalayalamLesson = {
  id: 'shiza-grade-6-malayalam-first-semester',
  grade: 6,
  title: 'Grade 6 Malayalam Exam Revision',
  examDate: '2026-11-05',
  sourceNote:
    'Prepared from the supplied Malayalam study notes for Lessons 1–5: വാത്സല്യപൂരം, സർക്കസ്സ്, പ്രാചീനകവിത്രയം, ധനമോഹം, and വെനീസിലെ വ്യാപാരി. ' +
    'The notes mark Lessons 1–2 and the first eight poem lines as first mid-semester portions; all five supplied lessons are available for revision. ' +
    'The poem lines are not supplied and are not guessed. Lesson 4 supplies written questions 4–5 only; questions 1–3 are not invented. ' +
    'Lesson 3’s ആദ്യകൃതി wording and answer are retained from the notes and need teacher confirmation. ' +
    'The notebook’s വഴങ്ങില്ല - വഴങ്ങി + ഇല്ല split is non-standard; the correct split is shown and the notebook form is also accepted.',
  sections: SHIZA_MALAYALAM_SECTIONS,
  questions: [
    ...shizaLessonOneMeanings.map(({ word, answer, acceptedAnswers }, index) =>
      textQuestion(
        `g6-mal-l1-meaning-${index + 1}`,
        'meanings',
        `പാഠം 1 · “${word}” എന്ന വാക്കിന്റെ അർഥം എഴുതുക.`,
        answer,
        acceptedAnswers,
        MEANING_CRITERIA
      )
    ),
    ...shizaLessonTwoMeanings.map(({ word, answer, acceptedAnswers }, index) =>
      textQuestion(
        `g6-mal-l2-meaning-${index + 1}`,
        'meanings',
        `പാഠം 2 · “${word}” എന്ന വാക്കിന്റെ അർഥം എഴുതുക.`,
        answer,
        acceptedAnswers,
        MEANING_CRITERIA
      )
    ),
    ...shizaLessonOneSynonyms.map(({ word, words }, index) =>
      pairQuestion(
        `g6-mal-l1-synonym-${index + 1}`,
        'synonyms',
        `പാഠം 1 · “${word}” എന്ന വാക്കിന്റെ പര്യായപദങ്ങൾ എഴുതുക.`,
        words
      )
    ),
    ...shizaLessonTwoSynonyms.map(({ word, words }, index) =>
      pairQuestion(
        `g6-mal-l2-synonym-${index + 1}`,
        'synonyms',
        `പാഠം 2 · “${word}” എന്ന വാക്കിന്റെ പര്യായപദങ്ങൾ എഴുതുക.`,
        words
      )
    ),
    ...opposites.map(([word, answer], index) =>
      textQuestion(
        `g6-mal-l2-opposite-${index + 1}`,
        'opposites',
        `പാഠം 2 · “${word}” എന്ന വാക്കിന്റെ വിപരീതപദം എഴുതുക.`,
        answer,
        [],
        'Accept a Malayalam word with the opposite meaning to the given word. Do not accept a synonym or an unrelated word.'
      )
    ),
    ...oppositeGender.map(([word, answer], index) =>
      textQuestion(
        `g6-mal-l2-gender-${index + 1}`,
        'gender',
        `പാഠം 2 · “${word}” എന്ന വാക്കിന്റെ എതിർലിംഗം എഴുതുക.`,
        answer,
        [],
        'Accept the Malayalam word that correctly changes the gender of the given word. Do not accept an unrelated word.'
      )
    ),
    ...lessonOneSplits.map(({ compound, parts }, index) =>
      partsQuestion(
        `g6-mal-l1-split-${index + 1}`,
        'split',
        `പാഠം 1 · പിരിച്ചെഴുതുക: ${compound}`,
        parts
      )
    ),
    ...lessonTwoSplits.map(({ compound, parts, acceptedParts }, index) =>
      partsQuestion(
        `g6-mal-l2-split-${index + 1}`,
        'split',
        `പാഠം 2 · പിരിച്ചെഴുതുക: ${compound}`,
        parts,
        acceptedParts
      )
    ),
    ...lessonOneJoins.map(([prompt, answer], index) =>
      textQuestion(
        `g6-mal-l1-join-${index + 1}`,
        'join',
        `പാഠം 1 · ചേർത്തെഴുതുക: ${prompt}`,
        answer
      )
    ),
    ...lessonTwoJoins.map(([prompt, answer], index) =>
      textQuestion(
        `g6-mal-l2-join-${index + 1}`,
        'join',
        `പാഠം 2 · ചേർത്തെഴുതുക: ${prompt}`,
        answer
      )
    ),
    ...vigrahams.map(({ compound, answer, criteria }, index) =>
      textQuestion(
        `g6-mal-vigraham-${index + 1}`,
        'vigraham',
        `വിഗ്രഹിച്ചെഴുതുക: ${compound}`,
        answer,
        [],
        criteria
      )
    ),
    writtenQuestion(
      'g6-mal-l2-sentence-1',
      'sentence',
      'പാഠം 2 · “ദുരിതകാലം” എന്ന വാക്ക് ഉൾപ്പെടുത്തി ഒരു വാക്യം എഴുതുക.',
      'കോവിഡ് എന്ന മഹാമാരി നൽകിയ ദുരിതകാലത്തിൽ നിന്ന് കരകയറാൻ നമുക്ക് കഴിഞ്ഞു.',
      'The answer must be a complete, meaningful Malayalam sentence that uses ദുരിതകാലം or an inflected form of it. Any suitable context is acceptable; the COVID example is only a model. Reject a fragment or a sentence that does not use the word.'
    ),
    writtenQuestion(
      'g6-mal-l2-sentence-2',
      'sentence',
      'പാഠം 2 · “അപ്രതീക്ഷിതം” എന്ന വാക്ക് ഉൾപ്പെടുത്തി ഒരു വാക്യം എഴുതുക.',
      'അപ്രതീക്ഷിതമായി എനിക്ക് ഒരു മിഠായി കിട്ടി.',
      'The answer must be a complete, meaningful Malayalam sentence that uses അപ്രതീക്ഷിതം or an inflected form of it. Accept any suitable context; the candy example is only a model. Reject a fragment or a sentence that only uses പ്രതീക്ഷ without അപ്രതീക്ഷിതം.'
    ),
    ...lessonOneAnswers.map(({ prompt, answer, criteria }, index) =>
      writtenQuestion(
        `g6-mal-l1-answer-${index + 1}`,
        'answers',
        `പാഠം 1 · ${prompt}`,
        answer,
        criteria
      )
    ),
    ...lessonTwoAnswers.map(({ prompt, answer, criteria }, index) =>
      writtenQuestion(
        `g6-mal-l2-answer-${index + 1}`,
        'answers',
        `പാഠം 2 · ${prompt}`,
        answer,
        criteria
      )
    ),
    ...shizaAdditionalQuestions
  ]
};

export function getMalayalamLessonForGrade(grade: number): MalayalamLesson | undefined {
  if (grade === FAZIA_MALAYALAM_LESSON.grade) return FAZIA_MALAYALAM_LESSON;
  if (grade === SHIZA_MALAYALAM_LESSON.grade) return SHIZA_MALAYALAM_LESSON;
  return undefined;
}

export function getMalayalamLesson(studentId: StudentId): MalayalamLesson {
  const profile = getStudentProfile(studentId);
  const lesson = getMalayalamLessonForGrade(profile.grade);
  if (!lesson) {
    throw new Error(`Malayalam exam revision is not available for ${profile.gradeLabel}.`);
  }
  return lesson;
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

function splitAnswerParts(answer: string): string[] {
  return answer
    .normalize('NFC')
    .split(/[+,/;|\s]+/u)
    .map(normalizeMalayalamAnswer)
    .filter(Boolean);
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
  if (question.kind === 'parts') {
    const submittedParts = splitAnswerParts(answer);
    const expectedOptions = [question.answerParts, ...(question.acceptedPartAnswers ?? [])];
    return expectedOptions.some(expectedParts => {
      const normalizedExpected = expectedParts.map(normalizeMalayalamAnswer);
      return submittedParts.length === normalizedExpected.length &&
        normalizedExpected.every((part, index) => submittedParts[index] === part);
    });
  }
  const normalized = normalizeMalayalamAnswer(answer);
  return question.acceptedAnswers.some(
    acceptedAnswer => normalizeMalayalamAnswer(acceptedAnswer) === normalized
  );
}
