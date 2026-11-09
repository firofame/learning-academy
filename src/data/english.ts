import { StudentId } from '../types';
import { getStudentProfile } from './profiles';

export type EnglishSectionId = 'unit-1' | 'unit-2' | 'unit-3';

export interface EnglishSection {
  id: EnglishSectionId;
  unitNumber: number;
  label: string;
  topic: string;
}

export const ENGLISH_SECTIONS: EnglishSection[] = [
  { id: 'unit-1', unitNumber: 1, label: "Unit 1 · Pa's School Days", topic: "Pa's School Days" },
  { id: 'unit-2', unitNumber: 2, label: 'Unit 2 · Fierce Face & The Jungle', topic: 'Fierce Face & The Jungle' },
  { id: 'unit-3', unitNumber: 3, label: 'Unit 3 · Ode to Mother India', topic: 'Ode to Mother India' }
];

export interface EnglishCard {
  id: string;
  section: EnglishSectionId;
  title: string;
  prompt: string;
  answer: string;
  memoryTip: string;
  examples?: string;
}

interface QuestionBase {
  id: string;
  section: EnglishSectionId;
  prompt: string;
  answer: string;
  explanation: string;
}

export type EnglishQuestion = QuestionBase & {
  kind: 'written';
  acceptedAnswers: string[];
  markingCriteria: string;
};

export interface EnglishLesson {
  id: string;
  grade: number;
  title: string;
  sourceName: string;
  memoryTip: string;
  sections: EnglishSection[];
  cards: EnglishCard[];
  questions: EnglishQuestion[];
}

const written = (
  id: string,
  section: EnglishSectionId,
  prompt: string,
  answer: string,
  markingCriteria: string,
  explanation: string,
  aliases: string[] = []
): EnglishQuestion => ({
  id,
  section,
  kind: 'written',
  prompt,
  answer,
  acceptedAnswers: [answer, ...aliases],
  markingCriteria,
  explanation
});

const englishCards: EnglishCard[] = [
  {
    id: 'g6-eng-card-u1-words',
    section: 'unit-1',
    title: "Pa's School Days · Vocabulary & Word Meanings",
    prompt: "What are the key word meanings from Pa's School Days?",
    answer: "Infinitive: The basic form of a verb. Unusual: Unexpected. Awful: A very large amount of. Leading: Chief / main. As a rule: Usually. Mighty: Extremely.",
    memoryTip: "Infinitive = verb root, Awful = very large amount, Leading = chief/main.",
    examples: "My Pa's forgot an awful lot (a very large amount)."
  },
  {
    id: 'g6-eng-card-u1-story',
    section: 'unit-1',
    title: "Pa's School Days · Comprehension & Context",
    prompt: "Why was Pa famous in school and why could he not help his son?",
    answer: "Pa got a hundred in school because he paid attention to his teachers and studied hard, and his teacher called him an intelligent boy. However, he could not help his son because he had forgotten what he had learnt when he was a boy. He used to know capitals of states, rivers, mountains, grammar rules, compositions, and arithmetic.",
    memoryTip: "Pa scored 100 by studying hard, but forgot his school lessons as an adult.",
    examples: "Reference to context: 'My Pa's forgot an awful lot' highlights his forgetfulness."
  },
  {
    id: 'g6-eng-card-u2-substitutions',
    section: 'unit-2',
    title: 'Fierce Face & The Jungle · One-Word Substitutions',
    prompt: 'What are the one-word substitutions for Unit 2?',
    answer: 'Apparently: As far as someone knows. Intention: Something that you want and plan to do. Disdained: Considers to be unworthy of one\'s consideration. Apparition: A remarkable sight or appearance of someone / something. Self-confident: A feeling of trust in one\'s abilities.',
    memoryTip: 'Apparently (as far as known), Intention (plan), Disdained (unworthy), Apparition (remarkable sight), Self-confident (trust in ability).',
    examples: 'She disdained his advice. The sky was an apparition of beauty.'
  },
  {
    id: 'g6-eng-card-u2-story',
    section: 'unit-2',
    title: 'Fierce Face & The Jungle · Story & Characters',
    prompt: 'Who was Fierce Face, who was Bagni, and what was the threat of the man-eater?',
    answer: 'Fierce Face was a young tiger cub. His mother Bagni disciplined him to hunt by night, sleep by day, and avoid humans/cattle. The old man-eater was sixteen years past his prime, yet could run fast on four legs to prey on domestic animals and people. Fierce Face became a true hunter by killing a cow left by a cowherd.',
    memoryTip: 'Bagni = caring mother teaching jungle survival rules. Fierce Face = cub learning to hunt.',
    examples: 'Villagers beat drums and blew trumpets to drive the tigers away.'
  },
  {
    id: 'g6-eng-card-u3-archaic',
    section: 'unit-3',
    title: 'Ode to Mother India · Vocabulary & Archaic Meanings',
    prompt: 'What archaic and literary terms appear in Ode to Mother India?',
    answer: 'Thy = your (archaic). Wert = were (archaic second-person past). Immemorial = extending back beyond memory. Regenerate = grow back, renew. Beget = produce/create. Fettered = tied up/chained. Sovereign = supreme ruler. Crave = intense desire. Crescent = growing/waxing. Slumber = inactivity/sleep.',
    memoryTip: 'Thy (your), Wert (were), Fettered (chained), Sovereign (ruler), Slumber (sleep).',
    examples: 'Violence only begets more violence. Hills have stood since time immemorial.'
  },
  {
    id: 'g6-eng-card-u3-theme',
    section: 'unit-3',
    title: 'Ode to Mother India · Themes & Analysis',
    prompt: 'What is the poet\'s message in Ode to Mother India?',
    answer: 'Although India has thousands of years of ancient civilization, she lies in slumber under foreign subjugation. Other enslaved nations look up to Mother India to lead them to freedom. The poet implores Mother India to awaken, rise for her children, reclaim her glorious past sovereignty, and be crowned queen among nations.',
    memoryTip: 'Ancient heritage, unawakened slumber, call to rise and lead enslaved nations to freedom.',
    examples: 'The poet evokes India\'s proud past to inspire her to reclaim sovereignty.'
  }
];

export const SHIZA_ENGLISH_LESSON: EnglishLesson = {
  id: 'english-grade-6-units-1-3',
  grade: 6,
  title: 'Grade 6 English Literature & Language Revision',
  sourceName: 'English Literature & Language Study Notes (Units I, II & III)',
  memoryTip: "Pa's School Days, Fierce Face & The Jungle, and Ode to Mother India.",
  sections: ENGLISH_SECTIONS,
  cards: englishCards,
  questions: [
    // =========================================================================
    // UNIT 1: PA'S SCHOOL DAYS
    // =========================================================================

    // I. Word Meanings (1 - 6)
    written(
      'g6-eng-u1-wm-1',
      'unit-1',
      'Give the meaning of the word / phrase: "Infinitive"',
      'The basic form of a verb',
      'Defines "Infinitive" as the basic form of a verb.',
      'Infinitive refers to the basic, uninflected form of a verb (e.g. to run, to see).',
      [
        'the basic form of a verb',
        'The basic form of a verb.',
        'basic form of a verb',
        'A basic form of a verb',
        'The base form of a verb'
      ]
    ),
    written(
      'g6-eng-u1-wm-2',
      'unit-1',
      'Give the meaning of the word: "Unusual"',
      'Unexpected',
      'Defines "Unusual" as unexpected, uncommon, or not ordinary.',
      'Unusual means unexpected or not commonly occurring.',
      [
        'unexpected',
        'Unexpected.',
        'Not usual',
        'not usual',
        'Not common',
        'not common'
      ]
    ),
    written(
      'g6-eng-u1-wm-3',
      'unit-1',
      'Give the meaning of the word: "Awful" (as used in the poem / lesson)',
      'A very large amount of',
      'Defines "Awful" in this context as a very large amount of.',
      'In the phrase "forgot an awful lot", awful means a very large amount or great quantity.',
      [
        'a very large amount of',
        'A very large amount of.',
        'A very large amount',
        'a very large amount',
        'Very large amount of',
        'very large amount of'
      ]
    ),
    written(
      'g6-eng-u1-wm-4',
      'unit-1',
      'Give the meaning of the word: "Leading"',
      'Chief / main',
      'Defines "Leading" as chief or main.',
      'Leading means principal, main, or chief.',
      [
        'chief / main',
        'Chief / main.',
        'Chief / Main',
        'Chief or main',
        'chief or main',
        'Chief',
        'chief',
        'Main',
        'main',
        'Principal',
        'principal'
      ]
    ),
    written(
      'g6-eng-u1-wm-5',
      'unit-1',
      'Give the meaning of the phrase: "As a rule"',
      'Usually',
      'Defines "As a rule" as usually, normally, or generally.',
      'As a rule means usually or as a general practice.',
      [
        'usually',
        'Usually.',
        'Normally',
        'normally',
        'Generally',
        'generally',
        'As a general rule'
      ]
    ),
    written(
      'g6-eng-u1-wm-6',
      'unit-1',
      'Give the meaning of the word: "Mighty"',
      'Extremely',
      'Defines "Mighty" as extremely or very.',
      'Mighty used as an adverb means extremely or very.',
      [
        'extremely',
        'Extremely.',
        'Very',
        'very',
        'Highly'
      ]
    ),

    // II. Comprehension Questions (7 - 9)
    written(
      'g6-eng-u1-comp-1',
      'unit-1',
      'Why did Pa get a hundred when he was in school?',
      'Pa got a hundred because he paid attention to his teachers and studied hard.',
      'Explains that Pa got a hundred because he paid attention to his teachers and studied hard.',
      'Pa scored top marks by paying close attention to his teachers and studying with diligence.',
      [
        'Pa got a hundred because he paid attention to his teachers and studied hard.',
        'He got a hundred because he paid attention to his teachers and studied hard.',
        'Because he paid attention to his teachers and studied hard.',
        'Because he paid attention to his teachers and studied hard',
        'Pa paid attention to his teachers and studied hard.'
      ]
    ),
    written(
      'g6-eng-u1-comp-2',
      'unit-1',
      'Why was Pa not able to help his son?',
      'Pa was not able to help his son because he had forgotten what he had learnt when he was a boy in school.',
      'Explains that Pa could not help his son because he had forgotten what he had learned in school as a boy.',
      'Pa was unable to assist with schoolwork because he forgot the lessons he studied during childhood.',
      [
        'Pa was not able to help his son because he had forgotten what he had learnt when he was a boy in school.',
        'Pa was not able to help his son because he had forgotten what he had learned when he was a boy in school.',
        'Because he had forgotten what he had learnt when he was a boy in school.',
        'Because he had forgotten what he had learned when he was a boy in school.',
        'He had forgotten what he had learnt when he was a boy in school.',
        'He forgot what he learnt when he was a boy in school.'
      ]
    ),
    written(
      'g6-eng-u1-comp-3',
      'unit-1',
      'What did the teacher say about Pa when he was a boy?',
      'The teacher said that he was an intelligent boy.',
      'States that the teacher described Pa as an intelligent boy.',
      'Pa\'s teacher praised him as an intelligent boy.',
      [
        'The teacher said that he was an intelligent boy.',
        'The teacher said that he was an intelligent boy',
        'The teacher said he was an intelligent boy.',
        'That he was an intelligent boy.',
        'He was an intelligent boy.'
      ]
    ),

    // III. Reference to Context (10 - 12)
    written(
      'g6-eng-u1-rtc-1',
      'unit-1',
      'Reference to Context: "But just the same I noticed now... My Pa\'s forgot an awful lot."\n\nWhat odd thing does the son notice about Pa?',
      'The odd thing that the boy noticed about his father is his forgetfulness.',
      'Identifies the odd thing as Pa\'s forgetfulness / that his father forgets so much.',
      'The boy found it odd that his father, who was once a top student, had grown so forgetful.',
      [
        'The odd thing that the boy noticed about his father is his forgetfulness.',
        'The odd thing that the boy noticed about his father is his forgetfulness',
        'His forgetfulness.',
        'his forgetfulness',
        'That his father is forgetful.',
        'The boy noticed his father\'s forgetfulness.'
      ]
    ),
    written(
      'g6-eng-u1-rtc-2',
      'unit-1',
      'Reference to Context: "But just the same I noticed now... My Pa\'s forgot an awful lot."\n\nAccording to Pa, why was he not able to answer his son\'s question?',
      'Pa couldn\'t answer his son\'s question because he could not remember the answer.',
      'States that Pa could not answer because he could not remember the answer.',
      'Pa explained that he simply could not recall the answer anymore.',
      [
        'Pa couldn\'t answer his son\'s question because he could not remember the answer.',
        'Pa couldn\'t answer his son\'s question because he could not remember the answer',
        'Because he could not remember the answer.',
        'Because he couldn\'t remember the answer.',
        'He could not remember the answer.',
        'He could not remember the answer'
      ]
    ),
    written(
      'g6-eng-u1-rtc-3',
      'unit-1',
      'Reference to Context: "But just the same I noticed now... My Pa\'s forgot an awful lot."\n\nName at least five things that the child\'s Pa could do well when he was a boy:',
      'He knew all the capitals of states, the names of rivers and mountains, grammar rules, how to write compositions well, and he was also good at arithmetic.',
      'Lists at least five things: capitals of states, names of rivers and mountains, grammar rules, writing compositions, and arithmetic.',
      'As a boy, Pa mastered state capitals, rivers and mountains, grammar rules, essay writing, and arithmetic.',
      [
        'He knew all the capitals of states, the names of rivers and mountains, grammar rules, how to write compositions well, and he was also good at arithmetic.',
        'Capitals of states, names of rivers and mountains, grammar rules, how to write compositions well, and arithmetic.',
        'Capitals of states, names of rivers and mountains, grammar rules, composition, and arithmetic.',
        'Capitals of states, rivers and mountains, grammar rules, compositions, and arithmetic'
      ]
    ),

    // =========================================================================
    // UNIT 2: FIERCE FACE & THE JUNGLE
    // =========================================================================

    // I. One-Word Substitutions (13 - 17)
    written(
      'g6-eng-u2-ows-1',
      'unit-2',
      'Give the one-word term for: "As far as someone knows"',
      'Apparently',
      'Identifies the one-word substitution as "Apparently".',
      'Apparently means according to what one has heard or as far as someone knows.',
      [
        'apparently',
        'Apparently.'
      ]
    ),
    written(
      'g6-eng-u2-ows-2',
      'unit-2',
      'Give the one-word term for: "Something that you want and plan to do"',
      'Intention',
      'Identifies the one-word substitution as "Intention".',
      'Intention is an aim, plan, or purpose that one resolves to do.',
      [
        'intention',
        'Intention.'
      ]
    ),
    written(
      'g6-eng-u2-ows-3',
      'unit-2',
      'Give the one-word term for: "Considers to be unworthy of one\'s consideration"',
      'Disdained',
      'Identifies the one-word substitution as "Disdained".',
      'Disdained means regarded with contempt or considered unworthy of consideration.',
      [
        'disdained',
        'Disdained.',
        'Disdain',
        'disdain'
      ]
    ),
    written(
      'g6-eng-u2-ows-4',
      'unit-2',
      'Give the one-word term for: "A remarkable sight or appearance of someone / something"',
      'Apparition',
      'Identifies the one-word substitution as "Apparition".',
      'Apparition means a remarkable or unexpected appearance or ghostly sight.',
      [
        'apparition',
        'Apparition.'
      ]
    ),
    written(
      'g6-eng-u2-ows-5',
      'unit-2',
      'Give the one-word term for: "A feeling of trust in one\'s abilities"',
      'Self-confident',
      'Identifies the one-word substitution as "Self-confident" or "Self-confidence".',
      'Self-confident describes having complete trust in one\'s own abilities.',
      [
        'self-confident',
        'Self-confident.',
        'Self confident',
        'self confident',
        'Self-confidence',
        'self-confidence',
        'Self confidence',
        'self confidence'
      ]
    ),

    // II. Sentence Formation (18 - 26)
    written(
      'g6-eng-u2-sf-1',
      'unit-2',
      'Frame a meaningful sentence using the word: "Panoplied"',
      'The sky was panoplied with stars sparkling in the quiet night.',
      'Requires a meaningful English sentence correctly using "panoplied" (splendidly covered or adorned). The model sentence is: "The sky was panoplied with stars sparkling in the quiet night.", but any grammatically sound sentence using the word in proper context is acceptable.',
      'Panoplied means splendidly arrayed or magnificent in display.',
      [
        'The sky was panoplied with stars sparkling in the quiet night.',
        'The sky was panoplied with stars sparkling in the quiet night'
      ]
    ),
    written(
      'g6-eng-u2-sf-2',
      'unit-2',
      'Frame a meaningful sentence using the word: "Raiment"',
      'The hills were clutched in the green raiment of spring.',
      'Requires a meaningful English sentence correctly using "raiment" (clothing or garments). The model sentence is: "The hills were clutched in the green raiment of spring.", but any meaningful sentence using the word appropriately is acceptable.',
      'Raiment is a literary word for clothing or covering.',
      [
        'The hills were clutched in the green raiment of spring.',
        'The hills were clutched in the green raiment of spring'
      ]
    ),
    written(
      'g6-eng-u2-sf-3',
      'unit-2',
      'Frame a meaningful sentence using the word: "Wretched"',
      'He felt wretched after losing his toy.',
      'Requires a meaningful English sentence correctly using "wretched" (unhappy, miserable). The model sentence is: "He felt wretched after losing his toy.", but any meaningful sentence using the word appropriately is acceptable.',
      'Wretched expresses deep unhappiness, misery, or distress.',
      [
        'He felt wretched after losing his toy.',
        'He felt wretched after losing his toy'
      ]
    ),
    written(
      'g6-eng-u2-sf-4',
      'unit-2',
      'Frame a meaningful sentence using the word: "Relentless"',
      'The rain was relentless and would not stop.',
      'Requires a meaningful English sentence correctly using "relentless" (unceasing, unyielding). The model sentence is: "The rain was relentless and would not stop.", but any meaningful sentence using the word appropriately is acceptable.',
      'Relentless describes something oppressive or intense that refuses to abate.',
      [
        'The rain was relentless and would not stop.',
        'The rain was relentless and would not stop'
      ]
    ),
    written(
      'g6-eng-u2-sf-5',
      'unit-2',
      'Frame a meaningful sentence using the word: "Parched"',
      'She was parched and needed a drink of water.',
      'Requires a meaningful English sentence correctly using "parched" (extremely thirsty or dried out). The model sentence is: "She was parched and needed a drink of water.", but any meaningful sentence using the word appropriately is acceptable.',
      'Parched signifies being dried out by heat or extremely thirsty.',
      [
        'She was parched and needed a drink of water.',
        'She was parched and needed a drink of water'
      ]
    ),
    written(
      'g6-eng-u2-sf-6',
      'unit-2',
      'Frame a meaningful sentence using the word: "Cringing"',
      'The cringing man did whatever he was told.',
      'Requires a meaningful English sentence correctly using "cringing" (shrinking back in fear or subservience). The model sentence is: "The cringing man did whatever he was told.", but any meaningful sentence using the word appropriately is acceptable.',
      'Cringing indicates subservient or fearful shrinking behavior.',
      [
        'The cringing man did whatever he was told.',
        'The cringing man did whatever he was told'
      ]
    ),
    written(
      'g6-eng-u2-sf-7',
      'unit-2',
      'Frame a meaningful sentence using the word: "Disdained"',
      'She disdained his advice and walked away.',
      'Requires a meaningful English sentence correctly using "disdained" (treated with scorn or regarded as unworthy). The model sentence is: "She disdained his advice and walked away.", but any meaningful sentence using the word appropriately is acceptable.',
      'Disdained means rejected or spurned with contempt.',
      [
        'She disdained his advice and walked away.',
        'She disdained his advice and walked away'
      ]
    ),
    written(
      'g6-eng-u2-sf-8',
      'unit-2',
      'Frame a meaningful sentence using the word: "Apparition"',
      'The children screamed when they saw a ghostly apparition.',
      'Requires a meaningful English sentence correctly using "apparition" (a remarkable, ghost-like appearance). The model sentence is: "The children screamed when they saw a ghostly apparition.", but any meaningful sentence using the word appropriately is acceptable.',
      'Apparition refers to an extraordinary sight, especially a ghostly presence.',
      [
        'The children screamed when they saw a ghostly apparition.',
        'The children screamed when they saw a ghostly apparition'
      ]
    ),
    written(
      'g6-eng-u2-sf-9',
      'unit-2',
      'Frame a meaningful sentence using the word: "Growl"',
      'The dog began to growl at the stranger.',
      'Requires a meaningful English sentence correctly using "growl" (a low guttural menacing sound). The model sentence is: "The dog began to growl at the stranger.", but any meaningful sentence using the word appropriately is acceptable.',
      'Growl represents a low threatening sound made by an animal.',
      [
        'The dog began to growl at the stranger.',
        'The dog began to growl at the stranger'
      ]
    ),

    // III. Comprehension Questions (27 - 31)
    written(
      'g6-eng-u2-comp-1',
      'unit-2',
      'How do wild animals respond to the heat wave?',
      'The heat wave drives the animals in two directions: some go to the depths of the jungle where the thick branches of aged trees save them from completely drying up, while the rest go to the land of wide rivers and onto the banks where men live.',
      'Explains the two directions: some seek deep jungle shade under thick branches of aged trees to prevent drying up, while others head to wide rivers and banks where humans dwell.',
      'Animals adapt to the scorching heat either by retreating deep into dense foliage or by moving toward riverbanks inhabited by humans.',
      [
        'The heat wave drives the animals in two directions: some go to the depths of the jungle where the thick branches of aged trees save them from completely drying up, while the rest go to the land of wide rivers and onto the banks where men live.',
        'Some go to the depths of the jungle where thick branches of aged trees save them from drying up, while the rest go to the land of wide rivers where men live.',
        'Animals go to the depths of the jungle under thick trees or to the land of wide rivers where men live.'
      ]
    ),
    written(
      'g6-eng-u2-comp-2',
      'unit-2',
      'Describe the man-eater.',
      'The man-eater was about sixteen years past his prime; his muscles, though regularly exercised, were only good enough to chase and kill domestic animals rather than wild jungle animals.',
      'Describes the man-eater as about 16 years past his prime, with muscles only capable of catching domestic animals rather than wild quarry.',
      'The aged tiger was past his prime and lacked the speed for wild prey, restricting his hunting to domestic livestock and humans.',
      [
        'The man-eater was about sixteen years past his prime; his muscles, though regularly exercised, were only good enough to chase and kill domestic animals rather than wild jungle animals.',
        'The man-eater was about 16 years past his prime and could only kill domestic animals rather than wild jungle animals.',
        'He was sixteen years past his prime, and his muscles were only good enough to kill domestic animals instead of wild animals.'
      ]
    ),
    written(
      'g6-eng-u2-comp-3',
      'unit-2',
      'What advantage did the man-eater have over people?',
      'The advantage that the man-eater had over people was that he had four legs and could run much faster than two-footed humans, who were no match for his speed.',
      'Explains that having four legs allowed him to run much faster than two-footed humans who could not match his speed.',
      'The man-eater\'s four-legged locomotion gave him vastly superior speed compared to two-footed people.',
      [
        'The advantage that the man-eater had over people was that he had four legs and could run much faster than two-footed humans, who were no match for his speed.',
        'He had four legs and could run much faster than two-footed humans who were no match for his speed.',
        'He had four legs and ran much faster than two-footed humans.',
        'He had four legs and could run faster than humans.'
      ]
    ),
    written(
      'g6-eng-u2-comp-4',
      'unit-2',
      'Why was it difficult for Fierce Face and his mother to hunt in an area inhabited by humans?',
      'It was dangerous, and prey was hard to find.',
      'States that human-inhabited areas were dangerous and natural prey was hard to find.',
      'Hunting near humans posed severe danger and offered scarce natural prey.',
      [
        'It was dangerous, and prey was hard to find.',
        'It was dangerous, and prey was hard to find',
        'It was dangerous and prey was hard to find.',
        'Because it was dangerous and prey was hard to find.',
        'Because it was dangerous and prey was hard to find'
      ]
    ),
    written(
      'g6-eng-u2-comp-5',
      'unit-2',
      'How did Fierce Face finally learn to be a hunter?',
      'By killing the cow left behind by the cowherd, he took his first real step as a hunter.',
      'Explains that Fierce Face took his first step as a hunter by killing the cow left behind by the cowherd.',
      'Fierce Face began his career as an independent hunter when he attacked and killed an abandoned cow.',
      [
        'By killing the cow left behind by the cowherd, he took his first real step as a hunter.',
        'By killing the cow left behind by the cowherd, he took his first real step as a hunter',
        'By killing the cow left behind by the cowherd.',
        'By killing a cow left behind by the cowherd.',
        'He killed the cow left behind by the cowherd.'
      ]
    ),

    // IV. Reference to Context & Character Analysis (32 - 35)
    written(
      'g6-eng-u2-rtc-1',
      'unit-2',
      'Reference to Context: "Little Fierce Face was disturbed, not his mother. Her discipline grew harsher... She insisted that they sleep by day and hunt by night."\n\nWhy was Fierce Face disturbed?',
      'Fierce Face was disturbed because the villagers were beating drums and blowing trumpets to drive them away.',
      'Explains that Fierce Face was disturbed by the noise of villagers beating drums and blowing trumpets to drive them away.',
      'The noisy clamour of drums and trumpets from the villagers distressed the young cub.',
      [
        'Fierce Face was disturbed because the villagers were beating drums and blowing trumpets to drive them away.',
        'Because the villagers were beating drums and blowing trumpets to drive them away.',
        'The villagers were beating drums and blowing trumpets to drive them away.',
        'Because villagers were beating drums and blowing trumpets.'
      ]
    ),
    written(
      'g6-eng-u2-rtc-2',
      'unit-2',
      'Reference to Context: "Little Fierce Face was disturbed, not his mother. Her discipline grew harsher... She insisted that they sleep by day and hunt by night."\n\nWhy was Bagni determined to make a tiger out of Fierce Face?',
      'Bagni was determined to make a capable tiger out of Fierce Face so that he would be able to hunt for food independently and learn how to defend himself from enemies, humans, and other jungle hazards.',
      'Explains that Bagni wanted Fierce Face to hunt independently for food and defend himself against enemies, humans, and jungle hazards.',
      'Bagni prepared her cub to ensure he could sustain himself and survive hostile encounters in the wilderness.',
      [
        'Bagni was determined to make a capable tiger out of Fierce Face so that he would be able to hunt for food independently and learn how to defend himself from enemies, humans, and other jungle hazards.',
        'So that he would be able to hunt for food independently and learn how to defend himself from enemies, humans, and other jungle hazards.',
        'So he could hunt for food independently and defend himself from enemies, humans, and other jungle hazards.',
        'To enable him to hunt food independently and defend against enemies and hazards.'
      ]
    ),
    written(
      'g6-eng-u2-rtc-3',
      'unit-2',
      'Reference to Context: "Little Fierce Face was disturbed, not his mother. Her discipline grew harsher... She insisted that they sleep by day and hunt by night."\n\nWhat kind of rules had Bagni made for Fierce Face?',
      'Bagni insisted that they sleep by day and hunt at night. She also refused to hunt man or domesticated livestock, forcing herself and Fierce Face to live solely on prey that approached the river.',
      'States the rules: sleep by day, hunt by night, avoid hunting humans or domestic livestock, and live solely on prey approaching the river.',
      'Bagni instituted nocturnal hunting, daytime sleep, and a strict ban on attacking humans or cattle.',
      [
        'Bagni insisted that they sleep by day and hunt at night. She also refused to hunt man or domesticated livestock, forcing herself and Fierce Face to live solely on prey that approached the river.',
        'They must sleep by day and hunt at night, and never hunt man or domesticated livestock.',
        'Sleep by day, hunt at night, and refuse to hunt humans or domesticated livestock.'
      ]
    ),
    written(
      'g6-eng-u2-rtc-4',
      'unit-2',
      'Reference to Context: "Little Fierce Face was disturbed, not his mother. Her discipline grew harsher... She insisted that they sleep by day and hunt by night."\n\nDo you think Bagni was a good mother? Give reasons.',
      'Yes, Bagni was a good mother because she diligently taught Fierce Face the fundamental laws of survival in the jungle. She trained him to hunt, defend himself against predators, and beware of broader perils such as forest fires, floods, droughts, and disease.',
      'Affirms that Bagni was a good mother because she taught him survival laws, trained him to hunt, defend against predators, and beware of jungle dangers like fires, floods, droughts, and disease.',
      'Bagni demonstrated good motherhood by instilling discipline, self-defense, hunting skills, and awareness of natural perils in her cub.',
      [
        'Yes, Bagni was a good mother because she diligently taught Fierce Face the fundamental laws of survival in the jungle. She trained him to hunt, defend himself against predators, and beware of broader perils such as forest fires, floods, droughts, and disease.',
        'Yes, because she taught Fierce Face the fundamental laws of survival in the jungle, trained him to hunt, and defend himself against predators and perils like forest fires, floods, droughts, and disease.',
        'Yes, Bagni was a good mother because she taught him how to survive, hunt, defend against predators, and avoid forest fires, floods, droughts, and disease.'
      ]
    ),

    // =========================================================================
    // UNIT 3: ODE TO MOTHER INDIA
    // =========================================================================

    // I. Vocabulary & Archaic Meanings (36 - 45)
    written(
      'g6-eng-u3-vam-1',
      'unit-3',
      'Give the meaning / modern interpretation of the literary word: "Immemorial"',
      'Extending back beyond memory or record; past many years',
      'Defines "Immemorial" as extending back beyond memory or record, or past many years.',
      'Immemorial refers to a time so far back in history that it cannot be remembered or recorded.',
      [
        'extending back beyond memory or record; past many years',
        'Extending back beyond memory or record; past many years.',
        'Extending back beyond memory or record',
        'extending back beyond memory or record',
        'Past many years'
      ]
    ),
    written(
      'g6-eng-u3-vam-2',
      'unit-3',
      'Give the archaic / poetic meaning of the word: "Thy"',
      'An archaic/poetic form of \'your\'',
      'Defines "Thy" as an archaic or poetic form of "your".',
      'Thy is the old poetic possessive form corresponding to "your".',
      [
        "An archaic/poetic form of 'your'",
        "an archaic/poetic form of 'your'",
        "Archaic/poetic form of 'your'",
        "An archaic form of 'your'",
        "Poetic form of 'your'",
        "Your",
        "your"
      ]
    ),
    written(
      'g6-eng-u3-vam-3',
      'unit-3',
      'Give the meaning of the word: "Regenerate"',
      'To grow back, renew, or revitalize',
      'Defines "Regenerate" as to grow back, renew, or revitalize.',
      'Regenerate means to revive, recreate, or give new life and vigor to something.',
      [
        'to grow back, renew, or revitalize',
        'To grow back, renew, or revitalize.',
        'To grow back, renew or revitalize',
        'Grow back, renew, or revitalize',
        'Renew or revitalize'
      ]
    ),
    written(
      'g6-eng-u3-vam-4',
      'unit-3',
      'Give the meaning of the word: "Beget"',
      'To produce, cause, or create',
      'Defines "Beget" as to produce, cause, or create.',
      'Beget means to give rise to, bring about, or father/produce.',
      [
        'to produce, cause, or create',
        'To produce, cause, or create.',
        'To produce, cause or create',
        'Produce, cause, or create',
        'produce, cause, or create'
      ]
    ),
    written(
      'g6-eng-u3-vam-5',
      'unit-3',
      'Give the meaning of the word: "Fettered"',
      'Tied up, chained, or restricted in progress',
      'Defines "Fettered" as tied up, chained, or restricted in progress.',
      'Fettered signifies being bound with chains or severely restrained from making progress.',
      [
        'tied up, chained, or restricted in progress',
        'Tied up, chained, or restricted in progress.',
        'Tied up, chained or restricted in progress',
        'Chained or restricted in progress',
        'Restricted in progress'
      ]
    ),
    written(
      'g6-eng-u3-vam-6',
      'unit-3',
      'Give the archaic / poetic meaning of the word: "Wert"',
      'Archaic second-person past form of \'were\' (you were)',
      'Defines "Wert" as the archaic second-person past form of "were" ("you were").',
      'Wert is the archaic form of "were", used with "thou" (thou wert = you were).',
      [
        "Archaic second-person past form of 'were' (you were)",
        "archaic second-person past form of 'were' (you were)",
        "Archaic second-person past form of 'were'",
        "Archaic form of 'were'",
        "You were",
        "you were"
      ]
    ),
    written(
      'g6-eng-u3-vam-7',
      'unit-3',
      'Give the meaning of the word: "Sovereign"',
      'Supreme ruler; possessing ultimate authority',
      'Defines "Sovereign" as supreme ruler or possessing ultimate authority.',
      'Sovereign describes an independent ruler or state holding supreme autonomous power.',
      [
        'supreme ruler; possessing ultimate authority',
        'Supreme ruler; possessing ultimate authority.',
        'Supreme ruler possessing ultimate authority',
        'Supreme ruler',
        'supreme ruler',
        'Possessing ultimate authority'
      ]
    ),
    written(
      'g6-eng-u3-vam-8',
      'unit-3',
      'Give the meaning of the word: "Crave"',
      'To feel a powerful or intense desire for',
      'Defines "Crave" as feeling a powerful or intense desire for something.',
      'Crave denotes longing for or strongly desiring something.',
      [
        'to feel a powerful or intense desire for',
        'To feel a powerful or intense desire for.',
        'Feel a powerful or intense desire for',
        'A powerful or intense desire for',
        'To desire strongly'
      ]
    ),
    written(
      'g6-eng-u3-vam-9',
      'unit-3',
      'Give the meaning of the word: "Crescent"',
      'Growing, waxing, or increasing in size',
      'Defines "Crescent" as growing, waxing, or increasing in size.',
      'Crescent in this literary sense describes something that is expanding or waxing.',
      [
        'growing, waxing, or increasing in size',
        'Growing, waxing, or increasing in size.',
        'Growing, waxing or increasing in size',
        'Increasing in size',
        'Waxing or growing'
      ]
    ),
    written(
      'g6-eng-u3-vam-10',
      'unit-3',
      'Give the meaning of the word: "Slumber"',
      'A state of inactivity, sleep, or dormancy',
      'Defines "Slumber" as a state of inactivity, sleep, or dormancy.',
      'Slumber represents sleep or a quiet dormant state.',
      [
        'a state of inactivity, sleep, or dormancy',
        'A state of inactivity, sleep, or dormancy.',
        'A state of inactivity, sleep or dormancy',
        'Sleep or dormancy',
        'Inactivity, sleep, or dormancy',
        'Sleep',
        'sleep'
      ]
    ),

    // II. Sentence Application (46 - 52)
    written(
      'g6-eng-u3-sa-1',
      'unit-3',
      'Use the word "Immemorial" in a meaningful sentence.',
      'The hills have stood here since time immemorial.',
      'Requires a meaningful English sentence correctly using "immemorial" (ancient beyond human memory). The model sentence is: "The hills have stood here since time immemorial.", but any grammatically appropriate sentence is acceptable.',
      'Immemorial emphasizes an ancient past beyond living memory.',
      [
        'The hills have stood here since time immemorial.',
        'The hills have stood here since time immemorial'
      ]
    ),
    written(
      'g6-eng-u3-sa-2',
      'unit-3',
      'Use the word "Regenerate" in a meaningful sentence.',
      'Heavy rains help the forests regenerate after a long summer.',
      'Requires a meaningful English sentence correctly using "regenerate" (regrow, renew, or revitalize). The model sentence is: "Heavy rains help the forests regenerate after a long summer.", but any grammatically appropriate sentence is acceptable.',
      'Regenerate illustrates restoration and revival.',
      [
        'Heavy rains help the forests regenerate after a long summer.',
        'Heavy rains help the forests regenerate after a long summer'
      ]
    ),
    written(
      'g6-eng-u3-sa-3',
      'unit-3',
      'Use the word "Begets" in a meaningful sentence.',
      'Violence only begets more violence.',
      'Requires a meaningful English sentence correctly using "begets" (causes or produces). The model sentence is: "Violence only begets more violence.", but any grammatically appropriate sentence is acceptable.',
      'Begets conveys how one action engenders or breeds another.',
      [
        'Violence only begets more violence.',
        'Violence only begets more violence'
      ]
    ),
    written(
      'g6-eng-u3-sa-4',
      'unit-3',
      'Use the word "Fettered" in a meaningful sentence.',
      'She felt fettered by the strict and rigid rules of her new job.',
      'Requires a meaningful English sentence correctly using "fettered" (restrained or chained). The model sentence is: "She felt fettered by the strict and rigid rules of her new job.", but any grammatically appropriate sentence is acceptable.',
      'Fettered evokes a sense of restriction and confinement.',
      [
        'She felt fettered by the strict and rigid rules of her new job.',
        'She felt fettered by the strict and rigid rules of her new job'
      ]
    ),
    written(
      'g6-eng-u3-sa-5',
      'unit-3',
      'Use the word "Craved" in a meaningful sentence.',
      'I craved chocolates after eating spicy meals.',
      'Requires a meaningful English sentence correctly using "craved" (strongly desired). The model sentence is: "I craved chocolates after eating spicy meals.", but any grammatically appropriate sentence is acceptable.',
      'Craved shows an intense appetite or longing.',
      [
        'I craved chocolates after eating spicy meals.',
        'I craved chocolates after eating spicy meals'
      ]
    ),
    written(
      'g6-eng-u3-sa-6',
      'unit-3',
      'Use the word "Manifold" in a meaningful sentence.',
      'The botanical garden offered manifold varieties of plants and flowers.',
      'Requires a meaningful English sentence correctly using "manifold" (many and diverse). The model sentence is: "The botanical garden offered manifold varieties of plants and flowers.", but any grammatically appropriate sentence is acceptable.',
      'Manifold emphasizes multiplicity and great variety.',
      [
        'The botanical garden offered manifold varieties of plants and flowers.',
        'The botanical garden offered manifold varieties of plants and flowers'
      ]
    ),
    written(
      'g6-eng-u3-sa-7',
      'unit-3',
      'Use the word "Sovereign" in a meaningful sentence.',
      'The queen reigned as the sovereign of her independent nation.',
      'Requires a meaningful English sentence correctly using "sovereign" (supreme independent ruler or authority). The model sentence is: "The queen reigned as the sovereign of her independent nation.", but any grammatically appropriate sentence is acceptable.',
      'Sovereign indicates independent royal supremacy or supreme power.',
      [
        'The queen reigned as the sovereign of her independent nation.',
        'The queen reigned as the sovereign of her independent nation'
      ]
    ),

    // III. Poetry Comprehension Questions (53 - 56)
    written(
      'g6-eng-u3-comp-1',
      'unit-3',
      'Why does the poet say that India is young though she is thousands of years old?',
      'The poet feels that although India has an ancient civilizational history thousands of years old, she remains in an unawakened and naive state under foreign subjugation, needing to arise from her slumber to face the injustice inflicted upon her.',
      'Explains that despite her ancient history of thousands of years, India remains in an unawakened, naive state under foreign rule, needing to awaken from slumber to confront injustice.',
      'India possesses ancient wisdom, yet political subjection leaves her dormant and in need of national awakening.',
      [
        'The poet feels that although India has an ancient civilizational history thousands of years old, she remains in an unawakened and naive state under foreign subjugation, needing to arise from her slumber to face the injustice inflicted upon her.',
        'Although India has an ancient history thousands of years old, she remains unawakened under foreign subjugation and needs to rise from slumber.',
        'Because she remains in an unawakened state under foreign rule despite having an ancient history thousands of years old.'
      ]
    ),
    written(
      'g6-eng-u3-comp-2',
      'unit-3',
      'What do other enslaved nations expect Mother India to do for them?',
      'Other nations that are chained in colonial servitude look up to Mother India to lead them to freedom and guide them out of the clutches of foreign rule.',
      'Explains that enslaved nations look up to Mother India to lead them to freedom and guide them out of foreign servitude.',
      'Subjugated nations look toward India as a beacon of moral leadership in the worldwide fight for freedom.',
      [
        'Other nations that are chained in colonial servitude look up to Mother India to lead them to freedom and guide them out of the clutches of foreign rule.',
        'They expect Mother India to lead them to freedom and guide them out of the clutches of foreign rule.',
        'To lead them to freedom and guide them out of the clutches of foreign rule.',
        'They look up to Mother India to lead them to freedom.'
      ]
    ),
    written(
      'g6-eng-u3-comp-3',
      'unit-3',
      'What does the poet persuade Mother India to do for her children\'s sake?',
      'The poet fervently implores Mother India to awaken from her deep slumber, rise to her feet, and lead the struggle for liberation for the welfare of her citizens.',
      'Explains that the poet implores Mother India to awaken from slumber, rise up, and lead the struggle for liberation for her children\'s welfare.',
      'The poet calls upon Mother India to cast aside her slumber and spearhead the movement for liberty.',
      [
        'The poet fervently implores Mother India to awaken from her deep slumber, rise to her feet, and lead the struggle for liberation for the welfare of her citizens.',
        'To awaken from her deep slumber, rise to her feet, and lead the struggle for liberation for the welfare of her citizens.',
        'To awaken from deep slumber and lead the struggle for liberation for her children.',
        'To awaken from her sleep and lead the struggle for freedom for her children.'
      ]
    ),
    written(
      'g6-eng-u3-comp-4',
      'unit-3',
      'In the final lines, why does the poet remind Mother India of her glorious past?',
      'The poet evokes India\'s glorious past—a time when she enjoyed true sovereignty, cultural dignity, and strength—to inspire her to reclaim that proud heritage and be crowned once again as the queen among nations.',
      'Explains that evoking her glorious past (sovereignty, cultural dignity, and strength) inspires her to reclaim that proud heritage and become queen among nations again.',
      'Recalling historical greatness rekindles national dignity and inspires Mother India to regain her preeminent world status.',
      [
        'The poet evokes India\'s glorious past—a time when she enjoyed true sovereignty, cultural dignity, and strength—to inspire her to reclaim that proud heritage and be crowned once again as the queen among nations.',
        'To inspire her to reclaim that proud heritage and be crowned once again as the queen among nations.',
        'To inspire her to reclaim her proud heritage of sovereignty and dignity and become queen among nations again.',
        'To remind her of her strength and dignity and inspire her to be crowned queen among nations again.'
      ]
    )
  ]
};

export function getEnglishLessonForGrade(grade: number): EnglishLesson | undefined {
  if (grade === 6) return SHIZA_ENGLISH_LESSON;
  return undefined;
}

export function getEnglishLesson(studentId: StudentId): EnglishLesson {
  const profile = getStudentProfile(studentId);
  const lesson = getEnglishLessonForGrade(profile.grade);
  if (!lesson) {
    throw new Error(`English is not available for ${profile.name} (${profile.gradeLabel}).`);
  }
  return lesson;
}

export function normalizeEnglishAnswer(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/["'“”‘’]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ');
}

export function checkEnglishAnswer(question: EnglishQuestion, answer: string): boolean {
  const normalized = normalizeEnglishAnswer(answer);
  if (!normalized) return false;

  return question.acceptedAnswers.some(candidate => {
    const target = normalizeEnglishAnswer(candidate);
    if (target === normalized) return true;

    // Compare with punctuation stripped (e.g. trailing period, commas)
    const strippedTarget = target.replace(/[.,;:!?/\\()]/g, ' ').replace(/\s+/g, ' ').trim();
    const strippedInput = normalized.replace(/[.,;:!?/\\()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (strippedTarget === strippedInput) return true;

    // Hyphen variations (e.g. self-confident vs self confident)
    const noHyphenTarget = target.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    const noHyphenInput = normalized.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    if (noHyphenTarget === noHyphenInput) return true;

    const collapsedHyphenTarget = target.replace(/-/g, '').replace(/\s+/g, ' ').trim();
    const collapsedHyphenInput = normalized.replace(/-/g, '').replace(/\s+/g, ' ').trim();
    if (collapsedHyphenTarget === collapsedHyphenInput) return true;

    return false;
  });
}
