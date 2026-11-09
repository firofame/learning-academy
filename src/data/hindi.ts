import { StudentId } from '../types';
import { getStudentProfile } from './profiles';

export type HindiSectionId =
  | 'meanings'
  | 'translations'
  | 'synonyms'
  | 'poem'
  | 'trees'
  | 'sreedharan'
  | 'essay'
  | 'sentences'
  | 'word-pairs'
  | 'combine'
  | 'word-making'
  | 'complete-words'
  | 'choose-word'
  | 'read-and-write';

export interface HindiSection {
  id: HindiSectionId;
  number?: string;
  label: string;
  nativeLabel: string;
}

export const HINDI_SECTIONS: HindiSection[] = [
  { id: 'meanings', label: 'Word meanings', nativeLabel: 'अर्थ लिखो' },
  { id: 'translations', label: 'Translations', nativeLabel: 'हिन्दी / अंग्रेज़ी में लिखो' },
  { id: 'synonyms', label: 'Synonyms', nativeLabel: 'पर्यायवाची शब्द' },
  { id: 'poem', label: 'Poem: पेड़', nativeLabel: 'कविता की पंक्तियाँ' },
  { id: 'trees', label: 'पेड़ questions', nativeLabel: 'उत्तर लिखो' },
  { id: 'sreedharan', label: 'श्रीधरन questions', nativeLabel: 'उत्तर लिखो' },
  { id: 'essay', label: 'Tree paragraph', nativeLabel: 'पेड़ पर अनुच्छेद' }
];

export const SHIZA_HINDI_SECTIONS = HINDI_SECTIONS;

export const FAZIA_HINDI_SECTIONS: HindiSection[] = [
  { id: 'meanings', number: 'I', label: 'Word meanings (Hindi to English)', nativeLabel: 'अर्थ लिखो' },
  { id: 'translations', number: 'II', label: 'Word meanings (English to Hindi)', nativeLabel: 'अंग्रेज़ी शब्दों के अर्थ हिन्दी में लिखो' },
  { id: 'sentences', number: 'III', label: 'Complete the sentences', nativeLabel: 'रिक्त स्थान भरकर वाक्य पूरा करो' },
  { id: 'word-pairs', number: 'IV', label: 'Write two words for each letter', nativeLabel: 'दो-दो शब्द लिखो' },
  { id: 'combine', number: 'V', label: 'Combine letters to form words', nativeLabel: 'अक्षरों को मिलाकर शब्द बनाइए' },
  { id: 'word-making', number: 'VI', label: 'Frame the words', nativeLabel: 'शब्द बनाओ' },
  { id: 'complete-words', number: 'VII', label: 'Complete picture name', nativeLabel: 'सही मात्रा वाला वर्ण लिखकर नाम पूरा करो' },
  { id: 'choose-word', number: 'VIII', label: 'Choose the correct word', nativeLabel: 'चित्र देखकर सही शब्द चुनो' },
  { id: 'read-and-write', number: 'IX', label: 'Read and write', nativeLabel: 'शब्दों को पढ़ो और सुंदर अक्षरों में लिखो' }
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
  acceptedPairs?: readonly (readonly [string, string])[];
}

export interface HindiChoiceQuestion extends HindiQuestionBase {
  kind: 'choice';
  options: string[];
  clue?: string;
  visualEmoji?: string;
}

export type HindiQuestion =
  | HindiTextQuestion
  | HindiWrittenQuestion
  | HindiPairQuestion
  | HindiChoiceQuestion;

export interface HindiLesson {
  id: string;
  grade: number;
  title: string;
  examDate: string;
  sourceNote: string;
  sections: HindiSection[];
  poem?: string[];
  essay?: string;
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

const choiceQuestion = (
  id: string,
  section: HindiSectionId,
  prompt: string,
  options: string[],
  answer: string,
  clue?: string,
  visualEmoji?: string
): HindiChoiceQuestion => ({
  id,
  section,
  kind: 'choice',
  prompt,
  options,
  answer,
  clue,
  visualEmoji
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
  sections: SHIZA_HINDI_SECTIONS,
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

const faziaMeanings: {
  word: string;
  answer: string;
  acceptedAnswers?: string[];
}[] = [
  { word: 'नल', answer: 'Tap', acceptedAnswers: ['tap'] },
  { word: 'कमल', answer: 'Lotus', acceptedAnswers: ['lotus'] },
  { word: 'घर', answer: 'House', acceptedAnswers: ['home'] },
  { word: 'किसान', answer: 'Farmer' },
  { word: 'मगर', answer: 'Crocodile', acceptedAnswers: ['alligator'] },
  { word: 'बकरी', answer: 'Goat' },
  { word: 'अनार', answer: 'Pomegranate' },
  { word: 'लड़की', answer: 'Girl' },
  { word: 'सुबह', answer: 'Morning', acceptedAnswers: ['dawn'] },
  { word: 'सड़क', answer: 'Road', acceptedAnswers: ['street'] },
  { word: 'इडली', answer: 'Idli' },
  { word: 'शलगम', answer: 'Turnip' },
  { word: 'वृषभ', answer: 'Bull', acceptedAnswers: ['ox'] },
  { word: 'मृग', answer: 'Deer' },
  { word: 'नाक', answer: 'Nose' },
  { word: 'सवेरा', answer: 'Morning', acceptedAnswers: ['dawn'] }
];

const faziaTranslations: {
  word: string;
  answer: string;
  acceptedAnswers?: string[];
}[] = [
  { word: 'Wool', answer: 'ऊन' },
  { word: 'Tree', answer: 'वृक्ष', acceptedAnswers: ['पेड़', 'पेड'] },
  { word: 'Beauty', answer: 'रूप', acceptedAnswers: ['सुंदरता'] },
  { word: 'Saint', answer: 'ऋषि', acceptedAnswers: ['मुनि', 'साधु'] },
  { word: 'Bear', answer: 'भालू', acceptedAnswers: ['रीछ'] },
  { word: 'Flower', answer: 'फूल', acceptedAnswers: ['पुष्प'] },
  { word: 'Sun', answer: 'सूरज', acceptedAnswers: ['सूर्य'] },
  { word: 'Rose', answer: 'गुलाब' },
  { word: 'Book', answer: 'किताब', acceptedAnswers: ['पुस्तक'] },
  { word: 'Heel', answer: 'एड़ी', acceptedAnswers: ['एडी'] },
  { word: 'Train', answer: 'रेल', acceptedAnswers: ['रेलगाड़ी', 'रेलगाडी'] },
  { word: 'Water', answer: 'पानी', acceptedAnswers: ['जल'] },
  { word: 'Fish', answer: 'मछली', acceptedAnswers: ['मत्स्य'] },
  { word: 'Happy', answer: 'खुश', acceptedAnswers: ['प्रसन्न'] },
  { word: 'Fire', answer: 'आग', acceptedAnswers: ['अग्नि'] },
  { word: 'Umbrella', answer: 'छाता', acceptedAnswers: ['छतरी'] }
];

const faziaSentences: {
  prompt: string;
  answer: string;
  acceptedAnswers?: string[];
}[] = [
  {
    prompt: 'रिक्त स्थान भरकर वाक्य पूरा कीजिए: “नाक ______ साफ कर।”',
    answer: 'कान',
    acceptedAnswers: ['नाक कान साफ कर', 'नाक कान साफ कर।']
  },
  {
    prompt: 'रिक्त स्थान भरकर वाक्य पूरा कीजिए: “अपना ______ याद कर।”',
    answer: 'पाठ',
    acceptedAnswers: ['अपना पाठ याद कर', 'अपना पाठ याद कर।']
  },
  {
    prompt: 'रिक्त स्थान भरकर वाक्य पूरा कीजिए: “______ ला।”',
    answer: 'छाता',
    acceptedAnswers: ['छाता ला', 'छाता ला।']
  },
  {
    prompt: 'रिक्त स्थान भरकर वाक्य पूरा कीजिए: “गीता ______ पढ़।”',
    answer: 'किताब',
    acceptedAnswers: ['गीता किताब पढ़', 'गीता किताब पढ़।', 'गीता किताब पढ', 'गीता किताब पढ।', 'किताब पढ']
  },
  {
    prompt: 'रिक्त स्थान भरकर वाक्य पूरा कीजिए: “मृग ______ चर रहा है।”',
    answer: 'तृण',
    acceptedAnswers: ['मृग तृण चर रहा है', 'मृग तृण चर रहा है।']
  },
  {
    prompt: 'रिक्त स्थान भरकर वाक्य पूरा कीजिए: “______ का आदर कर।”',
    answer: 'ऋषि',
    acceptedAnswers: ['ऋषि का आदर कर', 'ऋषि का आदर कर।']
  }
];

const faziaLetterPairs: {
  letter: string;
  first: string;
  second: string;
  acceptedPairs?: readonly (readonly [string, string])[];
}[] = [
  { letter: 'ई', first: 'ईख', second: 'ईंट', acceptedPairs: [['ईंट', 'ईख']] },
  { letter: 'रु', first: 'रुपया', second: 'रुकना', acceptedPairs: [['रुकना', 'रुपया']] },
  { letter: 'उ', first: 'उल्लू', second: 'उपहार', acceptedPairs: [['उपहार', 'उल्लू']] },
  { letter: 'ऋ', first: 'ऋषि', second: 'ऋषभ', acceptedPairs: [['ऋषभ', 'ऋषि']] },
  { letter: 'ऊ', first: 'ऊँट', second: 'ऊन', acceptedPairs: [['ऊंट', 'ऊन'], ['ऊन', 'ऊँट'], ['ऊन', 'ऊंट']] },
  { letter: 'ए', first: 'एड़ी', second: 'एक', acceptedPairs: [['एडी', 'एक'], ['एक', 'एड़ी'], ['एक', 'एडी']] }
];

const faziaCombineLetters: {
  letters: string;
  answer: string;
  acceptedAnswers?: string[];
}[] = [
  { letters: 'ब + र + ग + द', answer: 'बरगद' },
  { letters: 'अ + द + र + क', answer: 'अदरक' },
  { letters: 'कि + सा + न', answer: 'किसान' },
  { letters: 'म + छ + ली', answer: 'मछली' },
  { letters: 'अ + ज + ग + र', answer: 'अजगर' },
  { letters: 'रु + प + या', answer: 'रुपया' },
  { letters: 'कृ + पा', answer: 'कृपा' },
  { letters: 'ब + क + री', answer: 'बकरी' }
];

const faziaWordMaking: {
  formula: string;
  answer: string;
  acceptedAnswers?: string[];
}[] = [
  { formula: 'कि + ताब', answer: 'किताब' },
  { formula: 'कि + वाड़', answer: 'किवाड़', acceptedAnswers: ['किवाड़'] },
  { formula: 'कि + नारा', answer: 'किनारा' },
  { formula: 'मछ + ली', answer: 'मछली' },
  { formula: 'बद + ली', answer: 'बदली' },
  { formula: 'बिज + ली', answer: 'बिजली' },
  { formula: 'भा + लू', answer: 'भालू' },
  { formula: 'आ + लू', answer: 'आलू' },
  { formula: 'शा + लू', answer: 'शालू' },
  { formula: 'का + लू', answer: 'कालू' }
];

const faziaCompleteWords: {
  incomplete: string;
  letter: string;
  fullWord: string;
}[] = [
  { incomplete: '...लाब', letter: 'गु', fullWord: 'गुलाब' },
  { incomplete: '...रज', letter: 'सू', fullWord: 'सूरज' },
  { incomplete: '...न', letter: 'ऊ', fullWord: 'ऊन' },
  { incomplete: '...ल्लू', letter: 'उ', fullWord: 'उल्लू' },
  { incomplete: 'भा...', letter: 'लू', fullWord: 'भालू' },
  { incomplete: 'क...तर', letter: 'बू', fullWord: 'कबूतर' },
  { incomplete: 'क...आ', letter: 'छु', fullWord: 'कछुआ' },
  { incomplete: 'आ...', letter: 'लू', fullWord: 'आलू' },
  { incomplete: 'ख...र', letter: 'जू', fullWord: 'खजूर' },
  { incomplete: 'चू...', letter: 'हा', fullWord: 'चूहा' }
];

const faziaChooseWords: {
  clue: string;
  emoji: string;
  options: string[];
  answer: string;
}[] = [
  { clue: 'Elephant', emoji: '🐘', options: ['हाथी', 'राजा'], answer: 'हाथी' },
  { clue: 'Clay Lamp', emoji: '🪔', options: ['दीपक', 'चिड़िया'], answer: 'दीपक' },
  { clue: 'Book', emoji: '📖', options: ['किताब', 'किसान'], answer: 'किताब' },
  { clue: 'Water', emoji: '🥛', options: ['पानी', 'नानी'], answer: 'पानी' },
  { clue: 'Bird', emoji: '🐦', options: ['चिड़िया', 'नदिया'], answer: 'चिड़िया' },
  { clue: 'Girl', emoji: '👧', options: ['लड़की', 'मकड़ी'], answer: 'लड़की' }
];

const faziaReadAndWrite: string[] = [
  'किरण',
  'विमान',
  'डाकिया',
  'सितार',
  'किताब',
  'दिन',
  'चीनी',
  'दीवार',
  'दीपक',
  'सीटी',
  'बकरी',
  'झील'
];

export const FAZIA_HINDI_LESSON: HindiLesson = {
  id: 'fazia-grade-2-hindi-sem1',
  grade: 2,
  title: 'Grade 2 Hindi Exam Revision',
  examDate: '2026-11-11',
  sourceNote: 'हिन्दी रीडर (भाग-2) • अभ्यास एवं परीक्षा कार्य · मॉडल प्रश्न-पत्र : प्रथम सत्र परीक्षा (I Sem Exam) · नोटबुक कार्य एवं पाठ्यपुस्तक अभ्यास (पृष्ठ 20, 21, 26)',
  sections: FAZIA_HINDI_SECTIONS,
  questions: [
    ...faziaMeanings.map(({ word, answer, acceptedAnswers }, index) =>
      textQuestion(
        `g2-hin-meaning-${index + 1}`,
        'meanings',
        `“${word}” का अर्थ अंग्रेज़ी में लिखिए।`,
        answer,
        acceptedAnswers
      )
    ),
    ...faziaTranslations.map(({ word, answer, acceptedAnswers }, index) =>
      textQuestion(
        `g2-hin-translation-${index + 1}`,
        'translations',
        `“${word}” का अर्थ हिन्दी में लिखिए।`,
        answer,
        acceptedAnswers
      )
    ),
    ...faziaSentences.map(({ prompt, answer, acceptedAnswers }, index) =>
      textQuestion(
        `g2-hin-sentence-${index + 1}`,
        'sentences',
        prompt,
        answer,
        acceptedAnswers
      )
    ),
    ...faziaLetterPairs.map(({ letter, first, second, acceptedPairs }, index) => ({
      id: `g2-hin-pair-${index + 1}`,
      section: 'word-pairs' as const,
      kind: 'pair' as const,
      prompt: `“${letter}” वर्ण से दो शब्द लिखिए।`,
      answer: `${first}, ${second}`,
      answerWords: [first, second] as const,
      acceptedPairs
    })),
    ...faziaCombineLetters.map(({ letters, answer, acceptedAnswers }, index) =>
      textQuestion(
        `g2-hin-combine-${index + 1}`,
        'combine',
        `अक्षरों को मिलाकर शब्द बनाइए: “${letters}”`,
        answer,
        acceptedAnswers
      )
    ),
    ...faziaWordMaking.map(({ formula, answer, acceptedAnswers }, index) =>
      textQuestion(
        `g2-hin-word-making-${index + 1}`,
        'word-making',
        `वर्ण जोड़कर शब्द बनाइए: “${formula}”`,
        answer,
        acceptedAnswers
      )
    ),
    ...faziaCompleteWords.map(({ incomplete, letter, fullWord }, index) =>
      textQuestion(
        `g2-hin-complete-${index + 1}`,
        'complete-words',
        `सही मात्रा वाला वर्ण लिखकर नाम पूरा कीजिए: “${incomplete}”`,
        letter,
        [fullWord]
      )
    ),
    ...faziaChooseWords.map(({ clue, emoji, options, answer }, index) =>
      choiceQuestion(
        `g2-hin-choose-${index + 1}`,
        'choose-word',
        `सही शब्द चुनिए: ${clue}`,
        options,
        answer,
        clue,
        emoji
      )
    ),
    ...faziaReadAndWrite.map((word, index) =>
      textQuestion(
        `g2-hin-readwrite-${index + 1}`,
        'read-and-write',
        `पढ़कर सुंदर अक्षरों में लिखिए: “${word}”`,
        word
      )
    )
  ]
};

export function getHindiLessonForGrade(grade: number): HindiLesson | undefined {
  if (grade === FAZIA_HINDI_LESSON.grade) return FAZIA_HINDI_LESSON;
  if (grade === SHIZA_HINDI_LESSON.grade) return SHIZA_HINDI_LESSON;
  return undefined;
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
  if (question.kind === 'choice') {
    return normalizeHindiAnswer(answer) === normalizeHindiAnswer(question.answer);
  }
  if (question.kind === 'pair') {
    const submittedWords = answer
      .normalize('NFC')
      .split(/[,\s/;|،]+/u)
      .map(normalizeHindiAnswer)
      .filter(word => word && word !== 'और' && word !== 'तथा' && word !== 'and');
    const pairMatches = (expectedPair: readonly [string, string]) => {
      const expectedWords = expectedPair.map(normalizeHindiAnswer);
      return submittedWords.length === expectedWords.length &&
        new Set(submittedWords).size === expectedWords.length &&
        expectedWords.every(word => submittedWords.includes(word));
    };
    if (pairMatches(question.answerWords)) return true;
    if (question.acceptedPairs?.some(pairMatches)) return true;
    return false;
  }
  const normalized = normalizeHindiAnswer(answer);
  return question.acceptedAnswers.some(
    acceptedAnswer => normalizeHindiAnswer(acceptedAnswer) === normalized
  );
}
