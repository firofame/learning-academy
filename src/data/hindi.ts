import { StudentId } from '../types';
import { getStudentProfile } from './wordList';

export type HindiSectionId =
  | 'meanings'
  | 'translations'
  | 'synonyms'
  | 'poem'
  | 'trees'
  | 'sreedharan'
  | 'essay';

export const HINDI_SECTIONS: {
  id: HindiSectionId;
  label: string;
  nativeLabel: string;
}[] = [
  { id: 'meanings', label: 'Word meanings', nativeLabel: 'अर्थ लिखो' },
  { id: 'translations', label: 'Translations', nativeLabel: 'हिन्दी / अंग्रेज़ी में लिखो' },
  { id: 'synonyms', label: 'Synonyms', nativeLabel: 'पर्यायवाची शब्द' },
  { id: 'poem', label: 'Poem: पेड़', nativeLabel: 'कविता की पंक्तियाँ' },
  { id: 'trees', label: 'पेड़ questions', nativeLabel: 'उत्तर लिखो' },
  { id: 'sreedharan', label: 'श्रीधरन questions', nativeLabel: 'उत्तर लिखो' },
  { id: 'essay', label: 'Tree paragraph', nativeLabel: 'पेड़ पर अनुच्छेद' }
];

interface HindiQuestionBase {
  id: string;
  section: HindiSectionId;
  prompt: string;
  answer: string;
}

export interface HindiTextQuestion extends HindiQuestionBase {
  kind: 'text';
  acceptedAnswers: string[];
  markingCriteria?: string;
}

export interface HindiWrittenQuestion extends HindiQuestionBase {
  kind: 'written';
  acceptedAnswers: string[];
  markingCriteria: string;
}

export interface HindiPairQuestion extends HindiQuestionBase {
  kind: 'pair';
  answerWords: readonly [string, string];
}

export type HindiQuestion = HindiTextQuestion | HindiWrittenQuestion | HindiPairQuestion;

export interface HindiLesson {
  id: string;
  grade: number;
  title: string;
  examDate: string;
  sourceNote: string;
  poem: string[];
  essay: string;
  questions: HindiQuestion[];
}

const textQuestion = (
  id: string,
  section: HindiSectionId,
  prompt: string,
  answer: string,
  acceptedAnswers: string[] = [],
  markingCriteria?: string
): HindiTextQuestion => ({
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
  section: HindiSectionId,
  prompt: string,
  answer: string,
  markingCriteria: string,
  acceptedAnswers: string[] = []
): HindiWrittenQuestion => ({
  id,
  section,
  kind: 'written',
  prompt,
  answer,
  acceptedAnswers: [answer, ...acceptedAnswers],
  markingCriteria
});

const pairQuestion = (
  id: string,
  word: string,
  first: string,
  second: string
): HindiPairQuestion => ({
  id,
  section: 'synonyms',
  kind: 'pair',
  prompt: `“${word}” के दोनों पर्यायवाची लिखिए।`,
  answer: `${first}, ${second}`,
  answerWords: [first, second]
});

const meanings: {
  word: string;
  answer: string;
  acceptedAnswers?: string[];
}[] = [
  { word: 'किरण', answer: 'Ray' },
  { word: 'खुशियाँ', answer: 'Happiness' },
  { word: 'पूरब', answer: 'East' },
  { word: 'भोर', answer: 'Dawn', acceptedAnswers: ['morning'] },
  { word: 'नभ', answer: 'Sky' },
  { word: 'थाली', answer: 'Plate' },
  { word: 'जग', answer: 'World' },
  { word: 'मुस्कान', answer: 'Smile' },
  { word: 'पर्वत', answer: 'Mountain' },
  { word: 'मस्ती', answer: 'Joy', acceptedAnswers: ['fun'] },
  { word: 'अद्भुत', answer: 'Wonderful' },
  { word: 'घाटी', answer: 'Valley' },
  { word: 'बिजली', answer: 'Lightning' },
  { word: 'वर्षा', answer: 'Rain' },
  { word: 'सैनिक', answer: 'Soldier', acceptedAnswers: ['soldiers'] },
  { word: 'सज्जनता', answer: 'Kindness', acceptedAnswers: ['gentleness', 'goodness'] },
  { word: 'दृश्य', answer: 'Scene', acceptedAnswers: ['view'] },
  { word: 'बगीचा', answer: 'Garden' },
  { word: 'अनोखा', answer: 'Unique', acceptedAnswers: ['wonderful', 'unusual', 'special'] },
  { word: 'स्वस्थ', answer: 'Healthy' },
  { word: 'रिश्तेदार', answer: 'Relatives', acceptedAnswers: ['relative'] },
  { word: 'सुरक्षित', answer: 'Safe' },
  { word: 'सुनहरी', answer: 'Golden' },
  { word: 'ताकत', answer: 'Power', acceptedAnswers: ['strength'] },
  { word: 'रोज़', answer: 'Every day', acceptedAnswers: ['everyday', 'daily'] },
  { word: 'परिवहन', answer: 'Transport' },
  { word: 'समझदार', answer: 'Wise', acceptedAnswers: ['intelligent'] },
  { word: 'दोबारा', answer: 'Again' },
  { word: 'बखूबी', answer: 'Thoroughly', acceptedAnswers: ['skillfully', 'completely', 'well'] },
  { word: 'योग्यता', answer: 'Ability', acceptedAnswers: ['qualification', 'capability'] },
  { word: 'पुरस्कार', answer: 'Award', acceptedAnswers: ['prize'] },
  { word: 'कार्यप्रणाली', answer: 'Method of working', acceptedAnswers: ['work system', 'working method', 'procedure'] },
  { word: 'परियोजना', answer: 'Project' },
  { word: 'वास्तव', answer: 'Reality', acceptedAnswers: ['actuality'] },
  { word: 'भरोसा', answer: 'Trust', acceptedAnswers: ['confidence'] },
  { word: 'ईमानदारी', answer: 'Honesty' },
  { word: 'कुशलता', answer: 'Skill', acceptedAnswers: ['proficiency'] },
  { word: 'सेवा', answer: 'Service' }
];

const translations: {
  prompt: string;
  answer: string;
  acceptedAnswers?: string[];
}[] = [
  { prompt: '“New” हिन्दी में लिखिए।', answer: 'नया' },
  { prompt: '“Sweet” हिन्दी में लिखिए।', answer: 'मीठा' },
  { prompt: '“Song” हिन्दी में लिखिए।', answer: 'गीत' },
  { prompt: '“Sun” हिन्दी में लिखिए।', answer: 'सूरज' },
  { prompt: '“Fresh” हिन्दी में लिखिए।', answer: 'ताज़ा', acceptedAnswers: ['ताजा'] },
  { prompt: '“Cloud” हिन्दी में लिखिए।', answer: 'बादल' },
  { prompt: '“Pink” हिन्दी में लिखिए।', answer: 'गुलाबी' },
  { prompt: '“Attraction” हिन्दी में लिखिए।', answer: 'माया' },
  { prompt: '“Green” हिन्दी में लिखिए।', answer: 'हरा', acceptedAnswers: ['हरे'] },
  { prompt: '“Road” हिन्दी में लिखिए।', answer: 'सड़क', acceptedAnswers: ['सडक'] },
  { prompt: '“बादल” का अंग्रेज़ी अर्थ लिखिए।', answer: 'Cloud', acceptedAnswers: ['clouds'] },
  { prompt: '“गुलाबी” का अंग्रेज़ी अर्थ लिखिए।', answer: 'Pink' },
  { prompt: '“माया” का अंग्रेज़ी अर्थ लिखिए।', answer: 'Attraction', acceptedAnswers: ['charm'] },
  { prompt: '“Green” का हिन्दी अर्थ लिखिए।', answer: 'हरा', acceptedAnswers: ['हरे'] },
  { prompt: '“सड़क” का अंग्रेज़ी अर्थ लिखिए।', answer: 'Road' },
  { prompt: '“Public” हिन्दी में लिखिए।', answer: 'सार्वजनिक' },
  { prompt: '“Bridge” हिन्दी में लिखिए।', answer: 'पुल' },
  { prompt: '“Difficult” हिन्दी में लिखिए।', answer: 'कठिन' },
  { prompt: '“Problem” हिन्दी में लिखिए।', answer: 'परेशानी', acceptedAnswers: ['समस्या'] },
  { prompt: '“Skilled” हिन्दी में लिखिए।', answer: 'कुशल' }
];

const synonyms: [string, string, string][] = [
  ['पेड़', 'वृक्ष', 'तरु'],
  ['वर्षा', 'बरसात', 'वृष्टि'],
  ['पर्वत', 'पहाड़', 'गिरि'],
  ['बादल', 'मेघ', 'जलधर']
];

const poemCompletions: [string, string, string[]][] = [
  ['पूरी कीजिए: जंगल हो ______।', 'या तड़क-भड़क', ['तड़क-भड़क', 'तड़क भड़क']],
  ['पूरी कीजिए: पर्वत-घाटी ______।', 'खुली सड़क', ['पर्वत-घाटी, खुली सड़क', 'खुली सडक']],
  ['पूरी कीजिए: बादल, बिजली ______।', 'तेज़ कड़क हो', ['तेज कड़क हो', 'तेज कडक हो']]
];

const treeAnswers: [string, string, string, string][] = [
  [
    'पेड़ खड़े-खड़े क्या करते हैं?',
    'पेड़ खड़े-खड़े मुस्काते हैं।',
    'The answer must say that the trees smile while standing still. Accept equivalent Hindi wording.',
    'खड़े-खड़े मुस्काते हैं।'
  ],
  [
    'पेड़ किससे नहीं घबराते हैं?',
    'पेड़ बादल और बिजली की कड़क से नहीं घबराते हैं।',
    'The answer must say that trees are not frightened by clouds, lightning, or thunder. Accept equivalent Hindi wording.',
    'पेड़ बादल, बिजली और तेज कड़क से नहीं घबराते हैं।'
  ],
  [
    'पेड़ क्या सहते हैं?',
    'पेड़ तेज धूप सहते हैं।',
    'The answer must say that trees endure strong or intense sunshine. Accept equivalent Hindi wording.',
    'तेज़ धूप सहते हैं।'
  ],
  [
    'पेड़ कैसे फूल खिलाते हैं?',
    'पेड़ खुशबू वाले फूल खिलाते हैं।',
    'The answer must say that trees bloom or produce fragrant flowers. Accept equivalent Hindi wording.',
    'खुशबूदार फूल खिलाते हैं।'
  ],
  [
    'पेड़ों की माया कैसी है?',
    'पेड़ों की अद्भुत माया है।',
    'The answer must describe the magic or wonder of trees as अद्भुत (wonderful). Accept equivalent Hindi wording.',
    'पेड़ों की माया अद्भुत है।'
  ]
];

const sreedharanAnswers: [string, string, string][] = [
  [
    'श्रीधरन का जन्म कब तथा कहाँ हुआ?',
    'श्रीधरन का जन्म 12 जून, 1932 को केरल के पलक्कड़ जिले में हुआ।',
    'The answer must include the date 12 June 1932 and the place Palakkad district in Kerala. Accept equivalent Hindi wording; do not accept an answer missing the date or place.'
  ],
  [
    'श्रीधरन ने पुल का निर्माण कितने दिनों में पूरा किया?',
    'श्रीधरन ने पुल का निर्माण 46 दिनों में पूरा किया।',
    'The answer must say that Sreedharan completed the bridge construction in 46 days. Accept equivalent Hindi wording but require the number 46.'
  ],
  [
    'भारत में पहली मेट्रो रेल कहाँ बनाई गई?',
    'भारत में पहली मेट्रो रेल कोलकाता में बनाई गई।',
    'The answer must identify Kolkata (कोलकाता) as the place where India’s first metro rail was built.'
  ]
];

export const HINDI_TREE_ESSAY =
  'पेड़ प्रकृति की सुंदर देन हैं। वे हमें फल, फूल और लकड़ी देते हैं। पेड़ों की लकड़ी से हम कई चीज़ें बना सकते हैं। पेड़ हमें शुद्ध हवा प्रदान करते हैं। शुद्ध हवा के बिना हम जीवित नहीं रह सकते। पेड़ों से हमें अन्न प्राप्त होता है। पेड़ों से दवाइयाँ और काग़ज़ भी बनाए जा सकते हैं। पेड़ वर्षा होने में भी सहायक होते हैं। वृक्षों को मनुष्य का सच्चा मित्र कहा जाता है।';

export const SHIZA_HINDI_LESSON: HindiLesson = {
  id: 'shiza-grade-6-hindi-exam',
  grade: 6,
  title: 'Grade 6 Hindi Exam Revision',
  examDate: '2026-11-05',
  sourceNote: 'Prepared from the notebook transcription. The page 39 “वचन बदलो” list and one unclear vocabulary entry were not complete, so they are not guessed.',
  poem: [
    'खड़े-खड़े मुसकाते पेड़।',
    'कहीं न आते-जाते पेड़॥',
    'जंगल हो या तड़क-भड़क।',
    'पर्वत-घाटी, खुली सड़क।',
    'बादल, बिजली, तेज कड़क हो।',
    'किंतु नहीं घबराते पेड़॥',
    'कड़ी धूप में बनते साया।',
    'सारा जीवन सुखी बनाया।',
    'पेड़ों की है अद्भुत माया।'
  ],
  essay: HINDI_TREE_ESSAY,
  questions: [
    ...meanings.map(({ word, answer, acceptedAnswers }, index) =>
      textQuestion(
        `g6-hin-meaning-${index + 1}`,
        'meanings',
        `“${word}” का अर्थ अंग्रेज़ी में लिखिए।`,
        answer,
        acceptedAnswers
      )
    ),
    ...translations.map(({ prompt, answer, acceptedAnswers }, index) =>
      textQuestion(
        `g6-hin-translation-${index + 1}`,
        'translations',
        prompt,
        answer,
        acceptedAnswers
      )
    ),
    ...synonyms.map(([word, first, second], index) =>
      pairQuestion(`g6-hin-synonym-${index + 1}`, word, first, second)
    ),
    ...poemCompletions.map(([prompt, answer, acceptedAnswers], index) =>
      textQuestion(
        `g6-hin-poem-${index + 1}`,
        'poem',
        prompt,
        answer,
        acceptedAnswers
      )
    ),
    ...treeAnswers.map(([prompt, answer, criteria, acceptedAnswer], index) =>
      writtenQuestion(
        `g6-hin-tree-answer-${index + 1}`,
        'trees',
        prompt,
        answer,
        criteria,
        [acceptedAnswer]
      )
    ),
    ...sreedharanAnswers.map(([prompt, answer, criteria], index) =>
      writtenQuestion(
        `g6-hin-sreedharan-${index + 1}`,
        'sreedharan',
        prompt,
        answer,
        criteria
      )
    ),
    writtenQuestion(
      'g6-hin-tree-essay',
      'essay',
      'पेड़ों के महत्व पर एक अनुच्छेद लिखिए।',
      HINDI_TREE_ESSAY,
      'Write a connected Hindi paragraph about trees. Include several key ideas from the reference: trees are a gift of nature; they provide fruit, flowers, wood, and pure air; trees support food, medicines, or paper; they help with rainfall; and they are people’s true friends. Accept equivalent Hindi wording and do not require the exact model paragraph.'
    )
  ]
};

export function getHindiLessonForGrade(grade: number): HindiLesson | undefined {
  return grade === SHIZA_HINDI_LESSON.grade ? SHIZA_HINDI_LESSON : undefined;
}

export function getHindiLesson(studentId: StudentId): HindiLesson {
  const profile = getStudentProfile(studentId);
  const lesson = getHindiLessonForGrade(profile.grade);
  if (!lesson) {
    throw new Error(`Hindi exam revision is not available for ${profile.gradeLabel}.`);
  }
  return lesson;
}

export function normalizeHindiAnswer(answer: string): string {
  return answer
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/gu, '')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

export function checkHindiAnswer(question: HindiQuestion, answer: string): boolean {
  if (!answer.trim()) return false;
  if (question.kind === 'pair') {
    const submittedWords = answer
      .normalize('NFC')
      .split(/[,\s/;|،]+/u)
      .map(normalizeHindiAnswer)
      .filter(word => word && word !== 'और' && word !== 'तथा' && word !== 'and');
    const expectedWords = question.answerWords.map(normalizeHindiAnswer);
    return submittedWords.length === expectedWords.length &&
      new Set(submittedWords).size === expectedWords.length &&
      expectedWords.every(word => submittedWords.includes(word));
  }
  const normalized = normalizeHindiAnswer(answer);
  return question.acceptedAnswers.some(
    acceptedAnswer => normalizeHindiAnswer(acceptedAnswer) === normalized
  );
}
