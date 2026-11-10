import { StudentId } from '../types';
import { getStudentProfile } from './profiles';

export type MoralScienceSectionId = 'handmade-flag' | 'breakfast-table';

export interface MoralScienceSection {
  id: MoralScienceSectionId;
  lessonNumber: number;
  label: string;
  topic: string;
  lessonDate: string;
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

export function getMoralScienceLessonForGrade(grade: number): MoralScienceLesson | undefined {
  return grade === 2 ? FAZIA_MORAL_SCIENCE_LESSON : undefined;
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
