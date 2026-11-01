import { StudentId } from '../types';
import { getStudentProfile } from './wordList';

export type MathsTopic =
  | 'place-value'
  | 'expanded-standard'
  | 'comparing'
  | 'shapes'
  | 'ordering-names'
  | 'simplify';

export interface MathsCard {
  id: string;
  topic: MathsTopic;
  title: string;
  prompt: string;
  answer: string;
  keyRule: string;
  examples: string;
}

interface QuestionBase {
  id: string;
  topic: MathsTopic;
  prompt: string;
  answer: string;
  explanation: string;
  verticalMath?: {
    operand1: number;
    operand2: number;
    operator: '+' | '-';
    carryOrBorrowHint?: string;
  };
}

export type MathsQuestion =
  | (QuestionBase & { kind: 'choice'; options: string[] })
  | (QuestionBase & { kind: 'fill'; acceptedAnswers: string[] });

export interface MathsLesson {
  id: string;
  grade: number;
  title: string;
  sourceName: string;
  memoryTip: string;
  cards: MathsCard[];
  questions: MathsQuestion[];
}

const choice = (
  id: string,
  topic: MathsTopic,
  prompt: string,
  options: string[],
  answer: string,
  explanation: string
): MathsQuestion => ({
  id,
  topic,
  kind: 'choice',
  prompt,
  options,
  answer,
  explanation
});

const fill = (
  id: string,
  topic: MathsTopic,
  prompt: string,
  answer: string,
  explanation: string,
  aliases: string[] = [],
  verticalMath?: MathsQuestion['verticalMath']
): MathsQuestion => ({
  id,
  topic,
  kind: 'fill',
  prompt,
  answer,
  acceptedAnswers: [answer, ...aliases],
  explanation,
  verticalMath
});

export const MATHS_TOPICS: { id: MathsTopic; label: string; shortLabel: string }[] = [
  { id: 'place-value', label: 'Place Value', shortLabel: 'Place Value' },
  { id: 'expanded-standard', label: 'Expanded & Standard Form', shortLabel: 'Forms' },
  { id: 'comparing', label: 'Comparing Numbers (<, >, =)', shortLabel: 'Compare' },
  { id: 'shapes', label: '2D & 3D Shapes', shortLabel: 'Shapes' },
  { id: 'ordering-names', label: 'Ordering & Number Names', shortLabel: 'Order & Names' },
  { id: 'simplify', label: 'Addition & Subtraction (Simplify)', shortLabel: 'Simplify' }
];

const grade2Cards: MathsCard[] = [
  {
    id: 'g2-card-place-value',
    topic: 'place-value',
    title: 'Place Value of Digits',
    prompt: 'How do you find the place value of a digit in a 2-digit number?',
    answer: 'The tens digit tells how many tens (e.g. 9 in 92 has a place value of 90). The ones digit tells how many ones (e.g. 2 in 92 has a place value of 2).',
    keyRule: 'Tens place = value is digit x 10. Ones place = value is the digit itself.',
    examples: 'In 78, 7 is in tens place (70), and 8 is in ones place (8). In 43, 4 is 40 and 3 is 3.'
  },
  {
    id: 'g2-card-expanded-form',
    topic: 'expanded-standard',
    title: 'Expanded and Standard Form',
    prompt: 'What are expanded form and standard (short) form?',
    answer: 'Expanded form shows the value of each digit added together (e.g. 36 = 3 tens + 6 ones = 30 + 6). Standard form is writing the number as a single numeral (e.g. 30 + 1 = 31; 300 + 20 + 7 = 327).',
    keyRule: 'Expanded form expands tens and ones: 45 = 40 + 5. Standard form puts them together: 50 + 6 = 56.',
    examples: '2 tens + 4 ones = 24; 2 hundred + 3 tens + 2 ones = 232.'
  },
  {
    id: 'g2-card-comparing',
    topic: 'comparing',
    title: 'Comparing Numbers (<, >, =)',
    prompt: 'How do you compare two numbers using <, >, or =?',
    answer: 'Compare the digits starting from the highest place value (hundreds first, then tens, then ones). The open mouth of < or > always points to the bigger number!',
    keyRule: '> means greater than (140 > 28). < means less than (36 < 63). = means both numbers are equal (69 = 69).',
    examples: '369 < 436 (3 hundreds < 4 hundreds); 46 < 50.'
  },
  {
    id: 'g2-card-shapes',
    topic: 'shapes',
    title: '2D and 3D Shapes',
    prompt: 'What are the key properties of Square, Triangle, Cone, and Cylinder?',
    answer: 'Square: 4 equal sides and 4 corners. Triangle: 3 sides and 3 corners. Cone: 1 flat circular base, 1 curved surface, and 1 pointed vertex. Cylinder: 2 flat circular faces and 1 curved surface.',
    keyRule: 'Square & Triangle are flat 2D shapes. Cone & Cylinder are solid 3D shapes.',
    examples: 'A party hat or ice cream cone is a cone. A soda can or tube is a cylinder.'
  },
  {
    id: 'g2-card-ordering-names',
    topic: 'ordering-names',
    title: 'Greatest Numbers, Number Names & Ordering',
    prompt: 'How do you form greatest numbers and arrange ascending / descending order?',
    answer: 'To form the greatest number from given digits, arrange digits from greatest to smallest (e.g. 2, 9, 7 gives 972; 0, 2, 6 gives 620). Ascending order goes smallest to largest (48, 386, 421, 632). Descending order goes largest to smallest (369, 236, 162, 71).',
    keyRule: 'Ascending = climbing up (small to big). Descending = sliding down (big to small).',
    examples: 'Number names: 761 = Seven hundred sixty-one; 536 = Five hundred thirty-six.'
  },
  {
    id: 'g2-card-simplify-addition',
    topic: 'simplify',
    title: 'Column Addition (With and Without Regrouping)',
    prompt: 'How do you add 2-digit and 3-digit numbers?',
    answer: 'Line up ones under ones and tens under tens. Always add the ones column first! If the sum of ones is 10 or more, write down the ones digit and carry 1 ten over to the tens column.',
    keyRule: 'Always start adding from the right (ones place). Carry 1 ten when ones sum >= 10.',
    examples: '14 + 23 = 37 (no carry). 14 + 29 = 43 (4 + 9 = 13, write 3, carry 1; 1 + 2 + 1 = 4). 324 + 146 = 470.'
  },
  {
    id: 'g2-card-simplify-subtraction',
    topic: 'simplify',
    title: 'Column Subtraction (With and Without Regrouping / Borrowing)',
    prompt: 'How do you subtract 2-digit and 3-digit numbers?',
    answer: 'Subtract ones first, then tens, then hundreds. If the top digit in the ones place is smaller than the bottom digit, borrow 1 ten (10 ones) from the tens place!',
    keyRule: 'Top number smaller in ones column? Borrow 1 from tens: tens becomes 1 less, ones gets +10.',
    examples: '96 - 32 = 64 (no borrowing). 83 - 47: borrow 1 ten so 3 becomes 13; 13 - 7 = 6; tens: 7 - 4 = 3, so answer is 36.'
  }
];

export const GRADE_2_MATHS_QUESTIONS: MathsQuestion[] = [
  // --- Section I: Place Value ---
  fill(
    'g2-pv-1',
    'place-value',
    'Write the place value of the underlined digit 7 in 78:',
    '70',
    'In 78, 7 is in the tens place, so its place value is 7 tens = 70.',
    ['7 tens', '70 (tens)']
  ),
  fill(
    'g2-pv-1b',
    'place-value',
    'Write the place value of the digit 8 in 78:',
    '8',
    'In 78, 8 is in the ones place, so its place value is 8.',
    ['8 ones']
  ),
  fill(
    'g2-pv-2',
    'place-value',
    'Write the place value of 9 in 92:',
    '90',
    'In 92, 9 is in the tens place, so its place value is 90.',
    ['9 tens']
  ),
  fill(
    'g2-pv-3',
    'place-value',
    'Write the place value of 3 in 43:',
    '3',
    'In 43, 3 is in the ones place, so its place value is 3.',
    ['3 ones']
  ),
  fill(
    'g2-pv-4',
    'place-value',
    'Write the place value of 7 in 70:',
    '70',
    'In 70, 7 is in the tens place, so its place value is 70.',
    ['7 tens']
  ),
  fill(
    'g2-pv-5',
    'place-value',
    'Write the place value of 1 in 19:',
    '10',
    'In 19, 1 is in the tens place, so its place value is 10.',
    ['1 ten']
  ),
  fill(
    'g2-pv-6',
    'place-value',
    'Write the place value of 5 in 35:',
    '5',
    'In 35, 5 is in the ones place, so its place value is 5.',
    ['5 ones']
  ),
  fill(
    'g2-pv-7',
    'place-value',
    'Write the place value of 4 in 42:',
    '40',
    'In 42, 4 is in the tens place, so its place value is 40.',
    ['4 tens']
  ),

  // --- Section II: Expanded Form ---
  fill(
    'g2-exp-1',
    'expanded-standard',
    'Write the expanded form of 36 in tens and ones (e.g. 3 tens + 6 ones):',
    '3 tens + 6 ones',
    '36 has 3 tens and 6 ones, so expanded form is 3 tens + 6 ones (or 30 + 6).',
    ['30 + 6', '30+6', '3 tens and 6 ones']
  ),
  fill(
    'g2-exp-2',
    'expanded-standard',
    'Write the expanded form of 45 in addition form (e.g. 40 + 5):',
    '40 + 5',
    '45 has 4 tens (40) and 5 ones (5), so expanded form is 40 + 5.',
    ['4 tens + 5 ones', '40+5']
  ),
  fill(
    'g2-exp-3',
    'expanded-standard',
    'Write the expanded form of 91 in tens and ones:',
    '9 tens + 1 one',
    '91 has 9 tens and 1 one, so expanded form is 9 tens + 1 one (or 90 + 1).',
    ['90 + 1', '90+1', '9 tens and 1 one', '9 tens + 1 ones']
  ),
  fill(
    'g2-exp-4',
    'expanded-standard',
    'Write the expanded form of 56 in addition form:',
    '50 + 6',
    '56 has 5 tens (50) and 6 ones (6), so expanded form is 50 + 6.',
    ['5 tens + 6 ones', '50+6']
  ),
  fill(
    'g2-exp-5',
    'expanded-standard',
    'Write the expanded form of 39 in tens and ones:',
    '3 tens + 9 ones',
    '39 has 3 tens and 9 ones, so expanded form is 3 tens + 9 ones (or 30 + 9).',
    ['30 + 9', '30+9', '3 tens and 9 ones']
  ),

  // --- Section III: Short Form / Standard Form ---
  fill(
    'g2-std-1',
    'expanded-standard',
    'Write the standard form: 2 tens + 4 ones = ______',
    '24',
    '2 tens (20) + 4 ones (4) = 24.',
    ['24']
  ),
  fill(
    'g2-std-2',
    'expanded-standard',
    'Write the standard form: 30 + 1 = ______',
    '31',
    '30 + 1 = 31.',
    ['31']
  ),
  fill(
    'g2-std-3',
    'expanded-standard',
    'Write the standard form: 9 tens + 2 ones = ______',
    '92',
    '9 tens (90) + 2 ones (2) = 92.',
    ['92']
  ),
  fill(
    'g2-std-4',
    'expanded-standard',
    'Write the standard form: 50 + 6 = ______',
    '56',
    '50 + 6 = 56.',
    ['56']
  ),
  fill(
    'g2-std-5',
    'expanded-standard',
    'Write the standard form: 1 ten + 3 ones = ______',
    '13',
    '1 ten (10) + 3 ones (3) = 13.',
    ['13']
  ),
  fill(
    'g2-std-6',
    'expanded-standard',
    'Write the standard form: 300 + 20 + 7 = ______',
    '327',
    '3 hundreds (300) + 2 tens (20) + 7 ones (7) = 327.',
    ['327']
  ),
  fill(
    'g2-std-7',
    'expanded-standard',
    'Write the standard form: 2 hundred + 3 tens + 2 ones = ______',
    '232',
    '2 hundreds (200) + 3 tens (30) + 2 ones (2) = 232.',
    ['232']
  ),

  // --- Section IV: Use >, < or = ---
  choice(
    'g2-cmp-1',
    'comparing',
    'Compare: 36 [ ? ] 63',
    ['<', '>', '='],
    '<',
    '36 is less than 63 (3 tens < 6 tens), so 36 < 63.'
  ),
  choice(
    'g2-cmp-2',
    'comparing',
    'Compare: 140 [ ? ] 28',
    ['<', '>', '='],
    '>',
    '140 has 3 digits while 28 has 2 digits, so 140 > 28.'
  ),
  choice(
    'g2-cmp-3',
    'comparing',
    'Compare: 69 [ ? ] 69',
    ['<', '>', '='],
    '=',
    'Both numbers are identical, so 69 = 69.'
  ),
  choice(
    'g2-cmp-4',
    'comparing',
    'Compare: 369 [ ? ] 436',
    ['<', '>', '='],
    '<',
    'Comparing the hundreds digit: 3 hundreds is less than 4 hundreds, so 369 < 436.'
  ),
  choice(
    'g2-cmp-5',
    'comparing',
    'Compare: 46 [ ? ] 50',
    ['<', '>', '='],
    '<',
    '46 is less than 50 (4 tens < 5 tens), so 46 < 50.'
  ),

  // --- Section V: Match the following (Shapes) ---
  choice(
    'g2-shp-1',
    'shapes',
    'Which 2D shape has 4 equal straight sides and 4 corners?',
    ['Square', 'Triangle', 'Cone', 'Cylinder'],
    'Square',
    'A square has 4 equal sides and 4 corners.'
  ),
  choice(
    'g2-shp-2',
    'shapes',
    'Which 2D shape has 3 sides and 3 corners?',
    ['Square', 'Triangle', 'Cone', 'Cylinder'],
    'Triangle',
    'A triangle has 3 sides and 3 corners.'
  ),
  choice(
    'g2-shp-3',
    'shapes',
    'Which 3D shape has 1 flat circular base, 1 curved surface, and 1 sharp vertex (pointed tip), like a party hat?',
    ['Square', 'Triangle', 'Cone', 'Cylinder'],
    'Cone',
    'A cone has 1 circular flat base, a curved surface tapering up to 1 vertex.'
  ),
  choice(
    'g2-shp-4',
    'shapes',
    'Which 3D shape has 2 flat circular faces and 1 curved surface, shaped like a can or tube?',
    ['Square', 'Triangle', 'Cone', 'Cylinder'],
    'Cylinder',
    'A cylinder has 2 identical flat circular ends and 1 curved side.'
  ),

  // --- Section VI: Do as direct ---
  fill(
    'g2-dir-1',
    'ordering-names',
    'Form the greatest 3-digit number using the digits 2, 9, 7 (use each digit once):',
    '972',
    'To make the greatest number, arrange the digits from largest to smallest: 9, 7, 2 -> 972.',
    ['972']
  ),
  fill(
    'g2-dir-2',
    'ordering-names',
    'Form the greatest 3-digit number using the digits 0, 2, 6 (use each digit once):',
    '620',
    'To make the greatest number, arrange the digits from largest to smallest: 6, 2, 0 -> 620.',
    ['620']
  ),
  fill(
    'g2-dir-3',
    'ordering-names',
    'Write the number name of 761 in words:',
    'Seven hundred sixty-one',
    '761 in words is Seven hundred sixty-one (or Seven hundred and sixty-one).',
    ['Seven hundred sixty one', 'Seven hundred and sixty-one', 'Seven hundred and sixty one', 'seven hundred sixty-one', 'seven hundred sixty one']
  ),
  fill(
    'g2-dir-4',
    'ordering-names',
    'Write the number name of 536 in words:',
    'Five hundred thirty-six',
    '536 in words is Five hundred thirty-six (or Five hundred and thirty-six).',
    ['Five hundred thirty six', 'Five hundred and thirty-six', 'Five hundred and thirty six', 'five hundred thirty-six', 'five hundred thirty six']
  ),
  fill(
    'g2-dir-5',
    'ordering-names',
    'Arrange into ascending order (smallest to greatest): 632, 48, 421, 386',
    '48, 386, 421, 632',
    'Smallest is 48 (2-digit), then 386, then 421, and largest is 632: 48, 386, 421, 632.',
    ['48,386,421,632', '48 386 421 632', '48, 386, 421, 632']
  ),
  fill(
    'g2-dir-6',
    'ordering-names',
    'Arrange into descending order (greatest to smallest): 162, 236, 71, 369',
    '369, 236, 162, 71',
    'Largest is 369, then 236, then 162, and smallest is 71: 369, 236, 162, 71.',
    ['369,236,162,71', '369 236 162 71', '369, 236, 162, 71']
  ),

  // --- Section VII: Simplify (Addition & Subtraction) ---
  fill(
    'g2-sim-1',
    'simplify',
    'Simplify: 34 + 12 = ______',
    '46',
    'Ones: 4 + 2 = 6. Tens: 3 + 1 = 4. Total = 46.',
    ['46'],
    { operand1: 34, operand2: 12, operator: '+' }
  ),
  fill(
    'g2-sim-2',
    'simplify',
    'Simplify: 14 + 23 = ______',
    '37',
    'Ones: 4 + 3 = 7. Tens: 1 + 2 = 3. Total = 37.',
    ['37'],
    { operand1: 14, operand2: 23, operator: '+' }
  ),
  fill(
    'g2-sim-3',
    'simplify',
    'Simplify: 426 + 103 = ______',
    '529',
    'Ones: 6 + 3 = 9. Tens: 2 + 0 = 2. Hundreds: 4 + 1 = 5. Total = 529.',
    ['529'],
    { operand1: 426, operand2: 103, operator: '+' }
  ),
  fill(
    'g2-sim-4',
    'simplify',
    'Simplify: 14 + 29 = ______',
    '43',
    'Ones: 4 + 9 = 13 (write 3, carry 1 to tens). Tens: 1 + 2 + 1 (carry) = 4. Total = 43.',
    ['43'],
    { operand1: 14, operand2: 29, operator: '+', carryOrBorrowHint: 'Carry 1 ten (4 + 9 = 13)' }
  ),
  fill(
    'g2-sim-5',
    'simplify',
    'Simplify: 342 + 157 = ______',
    '499',
    'Ones: 2 + 7 = 9. Tens: 4 + 5 = 9. Hundreds: 3 + 1 = 4. Total = 499.',
    ['499'],
    { operand1: 342, operand2: 157, operator: '+' }
  ),
  fill(
    'g2-sim-6',
    'simplify',
    'Simplify: 39 + 56 = ______',
    '95',
    'Ones: 9 + 6 = 15 (write 5, carry 1 to tens). Tens: 3 + 5 + 1 (carry) = 9. Total = 95.',
    ['95'],
    { operand1: 39, operand2: 56, operator: '+', carryOrBorrowHint: 'Carry 1 ten (9 + 6 = 15)' }
  ),
  fill(
    'g2-sim-7',
    'simplify',
    'Simplify: 96 - 32 = ______',
    '64',
    'Ones: 6 - 2 = 4. Tens: 9 - 3 = 6. Total = 64.',
    ['64'],
    { operand1: 96, operand2: 32, operator: '-' }
  ),
  fill(
    'g2-sim-8',
    'simplify',
    'Simplify: 40 - 20 = ______',
    '20',
    'Ones: 0 - 0 = 0. Tens: 4 - 2 = 2. Total = 20.',
    ['20'],
    { operand1: 40, operand2: 20, operator: '-' }
  ),
  fill(
    'g2-sim-9',
    'simplify',
    'Simplify: 346 - 222 = ______',
    '124',
    'Ones: 6 - 2 = 4. Tens: 4 - 2 = 2. Hundreds: 3 - 2 = 1. Total = 124.',
    ['124'],
    { operand1: 346, operand2: 222, operator: '-' }
  ),
  fill(
    'g2-sim-10',
    'simplify',
    'Simplify: 492 - 172 = ______',
    '320',
    'Ones: 2 - 2 = 0. Tens: 9 - 7 = 2. Hundreds: 4 - 1 = 3. Total = 320.',
    ['320'],
    { operand1: 492, operand2: 172, operator: '-' }
  ),
  fill(
    'g2-sim-11',
    'simplify',
    'Simplify: 83 - 47 = ______',
    '36',
    'Borrow 1 ten from 8 (becomes 7 tens). Ones: 13 - 7 = 6. Tens: 7 - 4 = 3. Total = 36.',
    ['36'],
    { operand1: 83, operand2: 47, operator: '-', carryOrBorrowHint: 'Borrow 1 ten: 13 - 7 = 6, 7 - 4 = 3' }
  ),
  fill(
    'g2-sim-12',
    'simplify',
    'Simplify: 45 - 29 = ______',
    '16',
    'Borrow 1 ten from 4 (becomes 3 tens). Ones: 15 - 9 = 6. Tens: 3 - 2 = 1. Total = 16.',
    ['16'],
    { operand1: 45, operand2: 29, operator: '-', carryOrBorrowHint: 'Borrow 1 ten: 15 - 9 = 6, 3 - 2 = 1' }
  ),
  fill(
    'g2-sim-13',
    'simplify',
    'Simplify: 324 + 146 = ______',
    '470',
    'Ones: 4 + 6 = 10 (write 0, carry 1). Tens: 2 + 4 + 1 (carry) = 7. Hundreds: 3 + 1 = 4. Total = 470.',
    ['470'],
    { operand1: 324, operand2: 146, operator: '+', carryOrBorrowHint: 'Carry 1 ten (4 + 6 = 10)' }
  ),
  fill(
    'g2-sim-14',
    'simplify',
    'Simplify: 463 - 212 = ______',
    '251',
    'Ones: 3 - 2 = 1. Tens: 6 - 1 = 5. Hundreds: 4 - 2 = 2. Total = 251.',
    ['251'],
    { operand1: 463, operand2: 212, operator: '-' }
  )
];

export const MATHS_LESSONS: MathsLesson[] = [
  {
    id: 'maths-grade-2-revision',
    grade: 2,
    title: 'Grade 2 Maths Revision',
    sourceName: 'fazia grade 2 maths.pdf',
    memoryTip: 'Place Value & Forms: 36 = 30 + 6. Shapes: Square (4 sides), Triangle (3 sides), Cone (party hat), Cylinder (can). Addition & Subtraction: Always start with the ones column on the right!',
    cards: grade2Cards,
    questions: GRADE_2_MATHS_QUESTIONS
  }
];

export function getMathsLessonForGrade(grade: number): MathsLesson | undefined {
  return MATHS_LESSONS.find(lesson => lesson.grade === grade);
}

export function getMathsLesson(studentId: StudentId): MathsLesson {
  const profile = getStudentProfile(studentId);
  const lesson = getMathsLessonForGrade(profile.grade);
  if (!lesson) throw new Error(`Maths is not available for ${profile.gradeLabel}.`);
  return lesson;
}

export function normalizeMathsAnswer(answer: string): string {
  return answer
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/, '')
    .trim()
    .replace(/\s+/g, ' ')
    // normalize plus signs with spaces: e.g. "30+6" -> "30 + 6"
    .replace(/\s*\+\s*/g, ' + ')
    // normalize commas with spaces: e.g. "48,386,421,632" -> "48, 386, 421, 632"
    .replace(/\s*,\s*/g, ', ')
    // remove dashes in compound numbers: "sixty-one" -> "sixty one"
    .replace(/-/g, ' ')
    // remove optional "and" between hundred and tens/ones: "seven hundred and sixty one" -> "seven hundred sixty one"
    .replace(/\bhundred and\b/g, 'hundred')
    .replace(/\s+/g, ' ')
    .trim();
}

export function checkMathsAnswer(question: MathsQuestion, answer: string): boolean {
  const normalizedInput = normalizeMathsAnswer(answer);
  if (!normalizedInput) return false;

  const accepted = question.kind === 'fill' ? question.acceptedAnswers : [question.answer];
  return accepted.some(value => {
    const normalizedTarget = normalizeMathsAnswer(value);
    if (normalizedTarget === normalizedInput) return true;

    // Also match space-separated list for comma-separated numbers (e.g. "48 386 421 632")
    const commasRemovedTarget = normalizedTarget.replace(/,/g, '').replace(/\s+/g, ' ').trim();
    const commasRemovedInput = normalizedInput.replace(/,/g, '').replace(/\s+/g, ' ').trim();
    if (commasRemovedTarget === commasRemovedInput) return true;

    return false;
  });
}
