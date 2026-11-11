import { StudentId } from '../types';
import { getStudentProfile } from './profiles';

export type MoralScienceSectionId = 'handmade-flag' | 'breakfast-table' | 'public-property' | 'be-a-lifesaver';

export interface MoralScienceSection {
  id: MoralScienceSectionId;
  lessonNumber: number;
  label: string;
  topic: string;
  lessonDate?: string;
}

export const MORAL_SCIENCE_SECTIONS: MoralScienceSection[] = [
  {
    id: 'handmade-flag',
    lessonNumber: 1,
    label: 'Lesson 1 · The Handmade Flag',
    topic: 'The Handmade Flag',
    lessonDate: '7-8-26 (Friday)'
  },
  {
    id: 'breakfast-table',
    lessonNumber: 2,
    label: 'Lesson 2 · On the Breakfast Table',
    topic: 'On the Breakfast Table',
    lessonDate: '18-9-26 / 7-10-26 (Wednesday)'
  }
];

export const SHIZA_MORAL_SCIENCE_SECTIONS: MoralScienceSection[] = [
  {
    id: 'public-property',
    lessonNumber: 1,
    label: 'Lesson 1 · An Unforgettable School Trip',
    topic: 'An Unforgettable School Trip'
  },
  {
    id: 'be-a-lifesaver',
    lessonNumber: 2,
    label: 'Lesson 2 · Be a Lifesaver',
    topic: 'Be a Lifesaver'
  }
];

/** The right-hand column of the teacher's "Match the Following" table. */
export const BREAKFAST_TABLE_ETIQUETTES: string[] = [
  'with a prayer',
  'everyone is served',
  'Mouth closed',
  'Cutlery and napkin'
];

export interface MoralScienceQuestionBase {
  id: string;
  section: MoralScienceSectionId;
  /** The teacher's own exercise heading above this question, e.g. "I. FILL UP". */
  groupLabel: string;
  prompt: string;
  answer: string;
  /** The teacher's own line from the notes, so the app can be checked against them. */
  sourceLine: string;
  explanation: string;
}

export type MoralScienceQuestion =
  | (MoralScienceQuestionBase & { kind: 'fill'; acceptedAnswers: string[] })
  | (MoralScienceQuestionBase & { kind: 'true-false'; options: ['True', 'False'] })
  | (MoralScienceQuestionBase & { kind: 'match'; options: string[] })
  | (MoralScienceQuestionBase & { kind: 'written'; acceptedAnswers: string[]; markingCriteria: string });

export interface MoralScienceLesson {
  id: string;
  grade: number;
  title: string;
  sourceName: string;
  sections: MoralScienceSection[];
  questions: MoralScienceQuestion[];
}

const fill = (
  id: string,
  section: MoralScienceSectionId,
  groupLabel: string,
  prompt: string,
  answer: string,
  sourceLine: string,
  aliases: string[] = []
): MoralScienceQuestion => ({
  id,
  section,
  groupLabel,
  kind: 'fill',
  prompt,
  answer,
  acceptedAnswers: [answer, ...aliases],
  sourceLine,
  explanation: sourceLine
});

const trueFalse = (
  id: string,
  section: MoralScienceSectionId,
  groupLabel: string,
  statement: string,
  correct: boolean,
  sourceLine: string
): MoralScienceQuestion => ({
  id,
  section,
  groupLabel,
  kind: 'true-false',
  prompt: statement,
  options: ['True', 'False'],
  answer: correct ? 'True' : 'False',
  sourceLine,
  explanation: sourceLine
});

const match = (
  id: string,
  section: MoralScienceSectionId,
  groupLabel: string,
  prompt: string,
  answer: string,
  sourceLine: string
): MoralScienceQuestion => ({
  id,
  section,
  groupLabel,
  kind: 'match',
  prompt,
  options: [...BREAKFAST_TABLE_ETIQUETTES],
  answer,
  sourceLine,
  explanation: sourceLine
});

const written = (
  id: string,
  section: MoralScienceSectionId,
  groupLabel: string,
  prompt: string,
  answer: string,
  sourceLine: string,
  aliases: string[] = []
): MoralScienceQuestion => ({
  id,
  section,
  groupLabel,
  kind: 'written',
  prompt,
  answer,
  acceptedAnswers: [answer, ...aliases],
  sourceLine,
  explanation: sourceLine,
  markingCriteria: answer
});

export const FAZIA_MORAL_SCIENCE_LESSON: MoralScienceLesson = {
  id: 'moral-science-grade-2-lessons-1-2',
  grade: 2,
  title: 'Grade 2 Moral Science Revision',
  sourceName: 'Primary English & Moral Science Study Notes · Lessons 1 & 2',
  sections: MORAL_SCIENCE_SECTIONS,
  questions: [
    // -----------------------------------------------------------------------
    // Lesson 1: The Handmade Flag (11 questions)
    // -----------------------------------------------------------------------
    fill(
      'g2-ms-l1-fill-1',
      'handmade-flag',
      'I. FILL UP',
      'We celebrate republic day on ______ January.',
      '26th',
      'We celebrate republic day on 26th January.',
      ['26', '26th January', '26 January', 'January 26', 'january 26']
    ),
    fill(
      'g2-ms-l1-fill-2',
      'handmade-flag',
      'I. FILL UP',
      'We celebrate independence day on ______ August.',
      '15',
      'We celebrate independence day on 15 August.',
      ['15th', '15 August', '15th August', 'August 15', 'august 15']
    ),
    fill(
      'g2-ms-l1-fill-3',
      'handmade-flag',
      'I. FILL UP',
      'An ashoka chakra has ______ spokes.',
      '24',
      'An ashoka chakra has 24 spokes.',
      ['twenty four', '24 spokes']
    ),
    fill(
      'g2-ms-l1-fill-4',
      'handmade-flag',
      'I. FILL UP',
      'Saffron colour in the flag indicates the ______ and courage.',
      'strength',
      'Saffron colour in the flag indicates the strength and courage.',
      ['strength and courage']
    ),
    fill(
      'g2-ms-l1-fill-5',
      'handmade-flag',
      'I. FILL UP',
      'The white colour shows ______ and truth.',
      'peace',
      'The white colour shows peace and truth.',
      ['peace and truth']
    ),
    trueFalse(
      'g2-ms-l1-tf-1',
      'handmade-flag',
      'II. TRUE OR FALSE',
      'Noni and her friends made a national flag to gift to their school.',
      true,
      'Noni and her friends made a national flag to gift to their school. — True'
    ),
    trueFalse(
      'g2-ms-l1-tf-2',
      'handmade-flag',
      'II. TRUE OR FALSE',
      'Sarbjeet got poster paints.',
      true,
      'Sarbjeet got poster paints. — True'
    ),
    trueFalse(
      'g2-ms-l1-tf-3',
      'handmade-flag',
      'II. TRUE OR FALSE',
      'Laila brought coloured marker pens.',
      false,
      'Laila brought coloured marker pens. — False'
    ),
    trueFalse(
      'g2-ms-l1-tf-4',
      'handmade-flag',
      'II. TRUE OR FALSE',
      'The green colour shows the growth and prosperity.',
      true,
      'The green colour shows the growth and prosperity. — True'
    ),
    written(
      'g2-ms-l1-qa-1',
      'handmade-flag',
      'III. ANSWER THE FOLLOWING',
      "What was Noni's idea for the Republic Day celebration?",
      'To make a hand-made flag.',
      'Ans: To make a hand-made flag.',
      ['To make a hand-made flag', 'To make a handmade flag', 'hand-made flag', 'handmade flag', 'A hand-made flag']
    ),
    written(
      'g2-ms-l1-qa-2',
      'handmade-flag',
      'III. ANSWER THE FOLLOWING',
      'Who praised their handmade flag in school?',
      'The principal praised them.',
      'Ans: The principal praised them.',
      ['The principal praised them', 'The principal', 'principal', 'Their principal']
    ),

    // -----------------------------------------------------------------------
    // Lesson 2: On the Breakfast Table (11 questions)
    // -----------------------------------------------------------------------
    trueFalse(
      'g2-ms-l2-tf-1',
      'breakfast-table',
      'I. TRUE OR FALSE',
      'Ria sit in front of the TV.',
      false,
      'Ria sit in front of the TV. — False'
    ),
    trueFalse(
      'g2-ms-l2-tf-2',
      'breakfast-table',
      'I. TRUE OR FALSE',
      'Ria asks for more chutney politely.',
      true,
      'Ria asks for more chutney politely. — True'
    ),
    trueFalse(
      'g2-ms-l2-tf-3',
      'breakfast-table',
      'I. TRUE OR FALSE',
      'Ankita burps loudly.',
      true,
      'Ankita burps loudly. — True'
    ),
    trueFalse(
      'g2-ms-l2-tf-4',
      'breakfast-table',
      'I. TRUE OR FALSE',
      'Ria goes to wash her hands.',
      true,
      'Ria goes to wash her hands. — True'
    ),
    trueFalse(
      'g2-ms-l2-tf-5',
      'breakfast-table',
      'I. TRUE OR FALSE',
      'Ankita talks with her mouth full of dosa.',
      true,
      'Ankita talks with her mouth full of dosa. — True'
    ),
    match(
      'g2-ms-l2-match-1',
      'breakfast-table',
      'II. MATCH THE FOLLOWING',
      'Starting the meal',
      'with a prayer',
      'Starting the meal | with a prayer'
    ),
    match(
      'g2-ms-l2-match-2',
      'breakfast-table',
      'II. MATCH THE FOLLOWING',
      'Waiting until',
      'everyone is served',
      'Waiting until | everyone is served'
    ),
    match(
      'g2-ms-l2-match-3',
      'breakfast-table',
      'II. MATCH THE FOLLOWING',
      'Chewing',
      'Mouth closed',
      'Chewing | Mouth closed'
    ),
    match(
      'g2-ms-l2-match-4',
      'breakfast-table',
      'II. MATCH THE FOLLOWING',
      'Use',
      'Cutlery and napkin',
      'Use | Cutlery and napkin'
    ),
    written(
      'g2-ms-l2-qa-1',
      'breakfast-table',
      'III. ANSWER THE FOLLOWING',
      "What did Ria's mom make for the girls?",
      "Ria's mom make dosas and chutney.",
      "Ans: Ria's mom make dosas and chutney.",
      [
        "Ria's mom make dosas and chutney",
        "Ria's mom made dosas and chutney",
        'dosas and chutney',
        'dosa and chutney',
        'She made dosas and chutney'
      ]
    ),
    written(
      'g2-ms-l2-qa-2',
      'breakfast-table',
      'III. ANSWER THE FOLLOWING',
      "Why did Anika thank Ria's mom?",
      "Because Ria's mom gave more chutney.",
      "Ans: Because Ria's mom gave more chutney.",
      [
        "Because Ria's mom gave more chutney",
        "Because Ria's mom gave more chutney.",
        "Ria's mom gave more chutney",
        'Because she gave more chutney',
        'Because her mom gave more chutney'
      ]
    )
  ]
};

export const SHIZA_MORAL_SCIENCE_LESSON: MoralScienceLesson = {
  id: 'moral-science-grade-6-lessons-1-2',
  grade: 6,
  title: 'Grade 6 Moral Science Revision',
  sourceName: 'Student Notebook & Study Notes · Civics & Health Studies, Lessons 1 & 2',
  sections: SHIZA_MORAL_SCIENCE_SECTIONS,
  questions: [
    fill(
      'g6-ms-l1-fill-1',
      'public-property',
      'I. FILL IN THE BLANKS',
      "Sameer's school trip was to the ______.",
      'India Gate',
      "Sameer's school trip was to the India Gate."
    ),
    fill(
      'g6-ms-l1-fill-2',
      'public-property',
      'I. FILL IN THE BLANKS',
      'Public property is built with ______.',
      'public money',
      'Public property is built with public money.'
    ),
    fill(
      'g6-ms-l1-fill-3',
      'public-property',
      'I. FILL IN THE BLANKS',
      'People had scribbled on the ______ and thrown trash in the garden.',
      'monument',
      'People had scribbled on the monument and thrown trash in the garden.'
    ),
    fill(
      'g6-ms-l1-fill-4',
      'public-property',
      'I. FILL IN THE BLANKS',
      'The children promised to take care of public property like their ______.',
      'own belongings',
      'The children promised to take care of public property like their own belongings.'
    ),
    fill(
      'g6-ms-l1-fill-5',
      'public-property',
      'I. FILL IN THE BLANKS',
      'Misusing public property has become a pressing problem around the ______.',
      'world',
      'Misusing public property has become a pressing problem around the world.'
    ),
    fill(
      'g6-ms-l1-fill-6',
      'public-property',
      'I. FILL IN THE BLANKS',
      'Public properties include schools, parks, museums, zoos, and ______.',
      'libraries',
      'Public properties include schools, parks, museums, zoos, and libraries.'
    ),
    fill(
      'g6-ms-l1-fill-7',
      'public-property',
      'I. FILL IN THE BLANKS',
      "Destroying public property harms a country's ______.",
      'progress',
      "Destroying public property harms a country's progress."
    ),
    trueFalse(
      'g6-ms-l1-tf-1',
      'public-property',
      'II. TRUE OR FALSE',
      "Sameer's parents gave him a plastic bag.",
      false,
      "Sameer's parents gave him a plastic bag. False"
    ),
    trueFalse(
      'g6-ms-l1-tf-2',
      'public-property',
      'II. TRUE OR FALSE',
      'The children ignored the litter in the park.',
      false,
      'The children ignored the litter in the park. False'
    ),
    trueFalse(
      'g6-ms-l1-tf-3',
      'public-property',
      'II. TRUE OR FALSE',
      'Public property belongs to all citizens.',
      true,
      'Public property belongs to all citizens. True'
    ),
    trueFalse(
      'g6-ms-l1-tf-4',
      'public-property',
      'II. TRUE OR FALSE',
      'Only the government should take care of public property.',
      false,
      'Only the government should take care of public property. False'
    ),
    written(
      'g6-ms-l1-qa-1',
      'public-property',
      'III. ANSWER THE FOLLOWING QUESTIONS',
      'What is public property?',
      'Public property is said to be owned by the people and held in trust by the government for the common benefit.',
      'Ans: Public property is said to be owned by the people and held in trust by the government for the common benefit.'
    ),
    written(
      'g6-ms-l1-qa-2',
      'public-property',
      'III. ANSWER THE FOLLOWING QUESTIONS',
      'What is the punishment for damaging public property?',
      'Anyone who damages public property faces a five-year imprisonment and a certain amount of money as a fine.',
      'Ans: Anyone who damages public property faces a five-year imprisonment and a certain amount of money as a fine.'
    ),
    written(
      'g6-ms-l1-qa-3',
      'public-property',
      'III. ANSWER THE FOLLOWING QUESTIONS',
      'What lesson did Sameer and his friends learn?',
      'Sameer and his friends learned the importance of protecting public property.',
      'Ans: Sameer and his friends learned the importance of protecting public property.'
    ),
    written(
      'g6-ms-l1-qa-4',
      'public-property',
      'III. ANSWER THE FOLLOWING QUESTIONS',
      'What plays an important role in cultivating the pride of our heritage and of our glorious past?',
      'Preserving and maintaining national monuments and public property plays an important role in cultivating the pride of our heritage and of our glorious past.',
      'Ans: Preserving and maintaining national monuments and public property plays an important role in cultivating the pride of our heritage and of our glorious past.'
    ),
    written(
      'g6-ms-l1-qa-5',
      'public-property',
      'III. ANSWER THE FOLLOWING QUESTIONS',
      'What are public properties situated in different parts of our country?',
      'Schools, buses, colleges, hospitals, parks, museums, and libraries.',
      'Ans: Schools, buses, colleges, hospitals, parks, museums, and libraries.'
    ),
    written(
      'g6-ms-l1-qa-6',
      'public-property',
      'III. ANSWER THE FOLLOWING QUESTIONS',
      'Sameer felt bad to see his friend eat a banana and throw the peel outside. If your friend does so, what would you tell him?',
      'If I were Sameer, I would politely tell my friend that throwing banana peels out of the window is wrong. I would explain that someone could slip on the peel and get seriously hurt. I would also mention that it makes the surroundings dirty and ask him to keep the litter until we find a dustbin.',
      'Ans: If I were Sameer, I would politely tell my friend that throwing banana peels out of the window is wrong. I would explain that someone could slip on the peel and get seriously hurt. I would also mention that it makes the surroundings dirty and ask him to keep the litter until we find a dustbin.'
    ),
    written(
      'g6-ms-l1-qa-7',
      'public-property',
      'III. ANSWER THE FOLLOWING QUESTIONS',
      'Sameer whispered to his friends to help him clean the park. Have you ever made such a request to your friends? How did your friends react to this? What was the outcome of your request?',
      'Yes, I have made a similar request to my friends during school lunch time when our seating area was littered with wrappers. Together we picked up all the trash within five minutes, leaving the area completely clean and tidy.',
      'Ans: Yes, I have made a similar request to my friends during school lunch time when our seating area was littered with wrappers. Together we picked up all the trash within five minutes, leaving the area completely clean and tidy.'
    ),
    written(
      'g6-ms-l2-qa-1',
      'be-a-lifesaver',
      'I. ANSWER THE FOLLOWING QUESTIONS',
      'How do you think Soniya can use everyday items to give first aid?',
      'Clean cloth helps to cover wounds.\nA belt or scarf can be used as a bandage.\nCold water can be applied for burns.',
      'Ans: Everyday items can be used in the following ways: a. Clean cloth helps to cover wounds. b. A belt or scarf can be used as a bandage. c. Cold water can be applied for burns.'
    ),
    written(
      'g6-ms-l2-qa-2',
      'be-a-lifesaver',
      'I. ANSWER THE FOLLOWING QUESTIONS',
      "What did Soniya do to stop bleeding on Ricky's arm?",
      'Soniya pressed the wound with a clean towel to stop the bleeding.',
      "Ans: Soniya pressed the wound with a clean towel to stop the bleeding."
    ),
    written(
      'g6-ms-l2-qa-3',
      'be-a-lifesaver',
      'I. ANSWER THE FOLLOWING QUESTIONS',
      'How did the jacket help save the head of the woman who was having a seizure?',
      "Soniya removed her jacket and placed it under the woman's head. She loosened her tight clothes and tilted her head back to help her breathe.",
      "Ans: Soniya removed her jacket and placed it under the woman's head. She loosened her tight clothes and tilted her head back to help her breathe."
    ),
    written(
      'g6-ms-l2-qa-4',
      'be-a-lifesaver',
      'I. ANSWER THE FOLLOWING QUESTIONS',
      'Why and how is first aid akin to kindness?',
      'First aid is akin to kindness because it involves helping someone in need with care and compassion.',
      'Ans: First aid is akin to kindness because it involves helping someone in need with care and compassion.'
    ),
    written(
      'g6-ms-l2-qa-5',
      'be-a-lifesaver',
      'I. ANSWER THE FOLLOWING QUESTIONS',
      'What first aid can be applied for cardiac arrest?',
      'We can give CPR (Cardiopulmonary Resuscitation) for cardiac arrest.',
      'Ans: We can give CPR (Cardiopulmonary Resuscitation) for cardiac arrest.'
    )
  ]
};

export function getMoralScienceLessonForGrade(grade: number): MoralScienceLesson | undefined {
  if (grade === 2) return FAZIA_MORAL_SCIENCE_LESSON;
  if (grade === 6) return SHIZA_MORAL_SCIENCE_LESSON;
  return undefined;
}

export function getMoralScienceLesson(studentId: StudentId): MoralScienceLesson {
  const profile = getStudentProfile(studentId);
  const lesson = getMoralScienceLessonForGrade(profile.grade);
  if (!lesson) throw new Error(`Moral Science is not available for ${profile.gradeLabel}.`);
  return lesson;
}

export function normalizeMoralScienceAnswer(answer: string): string {
  return answer
    .normalize('NFKC')
    .replace(/["'“”‘’]/g, '')
    .replace(/[–—]/g, '-')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[\s.,!?;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function checkMoralScienceAnswer(question: MoralScienceQuestion, answer: string): boolean {
  const normalized = normalizeMoralScienceAnswer(answer);
  if (!normalized) return false;
  const accepted = question.kind === 'true-false' || question.kind === 'match'
    ? [question.answer]
    : question.acceptedAnswers;
  return accepted.some(candidate => {
    const target = normalizeMoralScienceAnswer(candidate);
    if (target === normalized) return true;
    // Hyphen variants (e.g. "hand-made flag" vs "handmade flag").
    return target.replace(/-/g, '').replace(/\s+/g, '') === normalized.replace(/-/g, '').replace(/\s+/g, '');
  });
}
