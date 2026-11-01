import { StudentId } from '../types';
import { getStudentProfile } from './wordList';

export type MathsTopic =
  | 'place-value'
  | 'expanded-standard'
  | 'comparing'
  | 'shapes'
  | 'ordering-names'
  | 'simplify'
  | 'geometry-fundamentals'
  | 'geometry-3d-shapes'
  | 'geometry-lines-planes'
  | 'geometry-curves-regions';

export interface MathsCard {
  id: string;
  topic: MathsTopic;
  title: string;
  prompt: string;
  answer: string;
  keyRule: string;
  examples: string;
  diagramType?: string;
  symbolNotation?: string;
}

interface QuestionBase {
  id: string;
  topic: MathsTopic;
  prompt: string;
  answer: string;
  explanation: string;
  diagramType?: string;
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

export interface MathsSolutionStep {
  part?: string;
  questionText: string;
  answer: string;
  explanation: string;
}

export interface MathsSolutionItem {
  questionNumber: number;
  title: string;
  prompt: string;
  diagramType?: string;
  steps: MathsSolutionStep[];
}

export interface MathsLesson {
  id: string;
  grade: number;
  title: string;
  sourceName: string;
  memoryTip: string;
  cards: MathsCard[];
  questions: MathsQuestion[];
  solutions?: MathsSolutionItem[];
}

const choice = (
  id: string,
  topic: MathsTopic,
  prompt: string,
  options: string[],
  answer: string,
  explanation: string,
  diagramType?: string
): MathsQuestion => ({
  id,
  topic,
  kind: 'choice',
  prompt,
  options,
  answer,
  explanation,
  diagramType
});

const fill = (
  id: string,
  topic: MathsTopic,
  prompt: string,
  answer: string,
  explanation: string,
  aliases: string[] = [],
  verticalMath?: MathsQuestion['verticalMath'],
  diagramType?: string
): MathsQuestion => ({
  id,
  topic,
  kind: 'fill',
  prompt,
  answer,
  acceptedAnswers: [answer, ...aliases],
  explanation,
  verticalMath,
  diagramType
});

export const MATHS_TOPICS: { id: MathsTopic; label: string; shortLabel: string }[] = [
  { id: 'place-value', label: 'Place Value', shortLabel: 'Place Value' },
  { id: 'expanded-standard', label: 'Expanded & Standard Form', shortLabel: 'Forms' },
  { id: 'comparing', label: 'Comparing Numbers (<, >, =)', shortLabel: 'Compare' },
  { id: 'shapes', label: '2D & 3D Shapes', shortLabel: 'Shapes' },
  { id: 'ordering-names', label: 'Ordering & Number Names', shortLabel: 'Order & Names' },
  { id: 'simplify', label: 'Addition & Subtraction (Simplify)', shortLabel: 'Simplify' },
  { id: 'geometry-fundamentals', label: 'Points, Lines, Segments & Rays', shortLabel: 'Line Basics' },
  { id: 'geometry-3d-shapes', label: '3D Solid (Cuboid)', shortLabel: 'Cuboid (3D)' },
  { id: 'geometry-lines-planes', label: 'Parallel & Intersecting Lines', shortLabel: 'Lines & Transversals' },
  { id: 'geometry-curves-regions', label: 'Open, Closed Figures & Regions', shortLabel: 'Curves & Regions' }
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
    'Write the place value of the digit 7 in 78:',
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

const grade6Cards: MathsCard[] = [
  {
    id: 'g6-card-point',
    topic: 'geometry-fundamentals',
    title: 'Point',
    prompt: 'What is a point in geometry?',
    answer: 'A point is an exact location in space. It is represented by a fine dot and named with a capital letter (e.g. Point A).',
    keyRule: 'A point has zero size, no length, width, or thickness (dimensionless). Infinite lines can pass through a single point.',
    examples: 'A star on a map, the tip of a sharpened pencil, or vertex A of a square.',
    diagramType: 'line-pqr',
    symbolNotation: 'Point A, Point P'
  },
  {
    id: 'g6-card-line',
    topic: 'geometry-fundamentals',
    title: 'Line (Straight Line)',
    prompt: 'What is a line and how is it represented?',
    answer: 'A line is a straight one-dimensional path that extends infinitely in both directions without endpoints.',
    keyRule: 'Represented with arrowheads at both ends (<--->). It has infinite length and cannot be measured.',
    examples: 'Line l passing through points P and Q, denoted as Line PQ or Line QP.',
    diagramType: 'line-pqr',
    symbolNotation: 'Line AB (AB) or Line l'
  },
  {
    id: 'g6-card-segment',
    topic: 'geometry-fundamentals',
    title: 'Line Segment',
    prompt: 'What is a line segment and how does it differ from a line?',
    answer: 'A line segment is a definite part of a line bounded by two distinct endpoints. It has a definite, measurable length.',
    keyRule: 'A line segment has 2 fixed endpoints (no arrows). It is the shortest distance between two points and can be measured with a ruler.',
    examples: 'The edge of a ruler, side AB of a polygon, or segment PQ on line l.',
    diagramType: 'line-pqr',
    symbolNotation: 'Segment AB (AB)'
  },
  {
    id: 'g6-card-ray',
    topic: 'geometry-fundamentals',
    title: 'Ray',
    prompt: 'What is a ray and how is it named?',
    answer: 'A ray is a straight path that starts at a fixed point (origin or initial point) and extends endlessly in one direction.',
    keyRule: 'A ray has 1 fixed endpoint and 1 arrowhead. Order of letters matters: Ray AB starts at A and goes through B; it is not the same as Ray BA!',
    examples: 'Light beam from a torch, laser beam, or ray OA from the sun.',
    diagramType: 'line-pqr',
    symbolNotation: 'Ray AB (AB)'
  },
  {
    id: 'g6-card-cuboid',
    topic: 'geometry-3d-shapes',
    title: '3D Solid: The Cuboid',
    prompt: 'How many vertices, planes (faces), and line segments (edges) does a cuboid have?',
    answer: 'A cuboid has 8 vertices (points), 6 flat planes (faces), and 12 line segments (edges).',
    keyRule: '8 Vertices (A, B, C, D, P, Q, R, S). 6 Planes (Top, Bottom, Front, Back, Left, Right). 12 Edges (4 top, 4 bottom, 4 vertical).',
    examples: 'A shoebox, brick, textbook, or cereal box.',
    diagramType: 'cuboid',
    symbolNotation: 'Vertices A, B, C, D, P, Q, R, S'
  },
  {
    id: 'g6-card-lines-relationship',
    topic: 'geometry-lines-planes',
    title: 'Parallel & Intersecting Lines',
    prompt: 'What is the difference between parallel and intersecting lines?',
    answer: 'Parallel lines never meet and remain at a constant distance. Intersecting lines cross each other at a single common point.',
    keyRule: 'Parallel lines (l || m) never intersect. Intersecting lines cross at exactly one point of intersection. A transversal crosses two or more lines.',
    examples: 'Railway tracks are parallel. A road crossroads or the letter X forms intersecting lines.',
    diagramType: 'parallel-transversals',
    symbolNotation: 'l || m (parallel), l x q at P (intersecting)'
  },
  {
    id: 'g6-card-open-closed',
    topic: 'geometry-curves-regions',
    title: 'Open vs Closed Figures',
    prompt: 'How do you tell if a geometric figure is open or closed?',
    answer: 'A closed figure begins and ends at the exact same point, enclosing a boundary. An open figure has separate endpoints that do not meet.',
    keyRule: 'Closed figure: Start point = End point, encloses an interior area. Open figure: Start point != End point, cannot enclose space.',
    examples: 'Circle, rectangle, and figure-8 are closed. U-shape, C-shape, and zig-zag paths are open.',
    diagramType: 'open-closed',
    symbolNotation: 'Closed: O, rectangle | Open: U, C, zig-zag'
  },
  {
    id: 'g6-card-regions',
    topic: 'geometry-curves-regions',
    title: 'Interior, Boundary, & Exterior Regions',
    prompt: 'What are the three regions formed by a closed curve in a plane?',
    answer: 'A closed curve divides the plane into the interior (inside), the boundary (the curve itself), and the exterior (outside).',
    keyRule: 'Interior: points completely inside. Boundary: points lying directly on the outline. Exterior: points outside the shape.',
    examples: 'In Exercise 14: K, L, M, N are interior; P, Q, R, S are boundary; A, B, C, D are exterior.',
    diagramType: 'regions',
    symbolNotation: 'Interior, Boundary, Exterior'
  }
];

export const GRADE_6_MATHS_QUESTIONS: MathsQuestion[] = [
  fill(
    'g6-q1-pts',
    'geometry-fundamentals',
    'Look at the figure of a straight line extending both ways. Name the three marked points.',
    'P, Q, R',
    'The three distinct points marked with solid dots on the line are Point P, Point Q, and Point R.',
    ['P, Q, R', 'P,Q,R', 'P Q R', 'Point P, Point Q, Point R', 'P, R, Q', 'Q, P, R'],
    undefined,
    'line-pqr'
  ),
  choice(
    'g6-q1-segs',
    'geometry-fundamentals',
    'How many line segments are formed between the points P, Q, and R on the line?',
    ['1', '2', '3', '4'],
    '3',
    'There are 3 segments: PQ (or QP), QR (or RQ), and the full span PR (or RP).',
    'line-pqr'
  ),
  choice(
    'g6-q2-rays',
    'geometry-fundamentals',
    'In Figure 2(i), three horizontal rays extend to the right from points A, B, and C. Name them.',
    ['AE, BF, CG', 'AB, BC, CD', 'EA, FB, GC', 'EF, FG, GH'],
    'AE, BF, CG',
    'Each ray starts at an origin on the vertical line and shoots right: Ray AE (origin A), Ray BF (origin B), and Ray CG (origin C).',
    'fig2-arms'
  ),
  choice(
    'g6-q2-w-shape',
    'geometry-fundamentals',
    'In Figure 2(ii) (the W-shaped figure with vertices A, B, C, D, E), which parts represent rays?',
    ['Rays BA and DE', 'Rays BC and CD', 'Rays AB and ED', 'Rays AC and CE'],
    'Rays BA and DE',
    'The upward arrows extend from vertex B through A (Ray BA) and from vertex D through E (Ray DE). BC and CD are bounded line segments.',
    'fig2-w'
  ),
  choice(
    'g6-q3-pts',
    'geometry-3d-shapes',
    'How many points (vertices) are marked on the 3D cuboid figure?',
    ['6', '8', '10', '12'],
    '8',
    'A cuboid has 8 vertices: points A, B, C, D, P, Q, R, and S.',
    'cuboid'
  ),
  choice(
    'g6-q3-planes',
    'geometry-3d-shapes',
    'How many flat planes (faces) does a cuboid have?',
    ['4', '6', '8', '12'],
    '6',
    'A cuboid has 6 rectangular faces (top, bottom, front, back, left, and right planes).',
    'cuboid'
  ),
  choice(
    'g6-q3-edges',
    'geometry-3d-shapes',
    'How many line segments form the edges of the cuboid?',
    ['6', '8', '10', '12'],
    '12',
    'There are 12 line segments: 4 top edges (PB, BA, AC, CP), 4 bottom edges (QR, RD, DS, SQ), and 4 vertical edges (PQ, CR, AD, BS).',
    'cuboid'
  ),
  choice(
    'g6-q4-intersect',
    'geometry-lines-planes',
    'In Figure 4, which two lines intersect at point P?',
    ['Line l and Line q', 'Line m and Line p', 'Line n and Line r', 'Line l and Line r'],
    'Line l and Line q',
    'Point P is the intersection of horizontal Line l and transversal Line q.',
    'parallel-transversals'
  ),
  choice(
    'g6-q4-parallel',
    'geometry-lines-planes',
    'Which set of lines are parallel to each other in Figure 4?',
    ['Lines l, m, and n', 'Lines p, q, and r', 'Lines l and p', 'Lines m and q'],
    'Lines l, m, and n',
    'Lines l, m, and n are parallel horizontal lines that never meet: l || m, m || n, and l || n.',
    'parallel-transversals'
  ),
  choice(
    'g6-q5-naming',
    'geometry-fundamentals',
    'In the figure, line t passes through points A, B, and C. Which is another correct name for line t?',
    ['Line AB', 'Line AD', 'Line BD', 'Line CD'],
    'Line AB',
    'Line t contains A, B, and C, so any two of these points name the same line: Line AB, Line BC, or Line AC.',
    'line-m-t'
  ),
  choice(
    'g6-q6-boat',
    'geometry-curves-regions',
    'Is an enclosed boat-shaped outline an open figure or a closed figure?',
    ['Closed figure', 'Open figure'],
    'Closed figure',
    'It starts and ends at the exact same point with no breaks in the boundary, completely enclosing an area.',
    'open-closed'
  ),
  choice(
    'g6-q6-zigzag',
    'geometry-curves-regions',
    'Is a zig-zag line path with two separate ends an open figure or a closed figure?',
    ['Open figure', 'Closed figure'],
    'Open figure',
    'Its starting and ending points are disconnected, so it does not enclose an interior region.',
    'open-closed'
  ),
  choice(
    'g6-q7-interior',
    'geometry-curves-regions',
    'In Figure 7, which points lie in the INTERIOR of the closed curve?',
    ['K, L, M, N', 'P, Q, R, S', 'A, B, C, D', 'A, K, P'],
    'K, L, M, N',
    'Points K, L, M, and N lie entirely inside the enclosed region of the curve.',
    'regions'
  ),
  choice(
    'g6-q7-boundary',
    'geometry-curves-regions',
    'In Figure 7, which points lie directly ON THE BOUNDARY of the curve?',
    ['P, Q, R, S', 'K, L, M, N', 'A, B, C, D', 'None'],
    'P, Q, R, S',
    'Points P, Q, R, and S are plotted directly on the perimeter curve itself.',
    'regions'
  ),
  choice(
    'g6-q7-exterior',
    'geometry-curves-regions',
    'In Figure 7, which points lie in the EXTERIOR of the closed curve?',
    ['A, B, C, D', 'P, Q, R, S', 'K, L, M, N', 'K, A, B'],
    'A, B, C, D',
    'Points A, B, C, and D are situated outside the boundary in the surrounding plane.',
    'regions'
  ),
  choice(
    'g6-q8-mcq',
    'geometry-fundamentals',
    'In a figure showing a horizontal ray with origin O passing through A and then B to the right, which of the following does NOT represent a ray?',
    ['OA', 'OB', 'BA', 'AB'],
    'BA',
    'Ray OA starts at O and passes through A, Ray OB starts at O and passes through B, and Ray AB starts at A and passes through B. All three extend to the right. BA would need to start at B and extend left through A, which is not shown, so BA is NOT a ray in this figure.',
    'mcq-rays'
  ),
  choice(
    'g6-q9-mcq',
    'geometry-fundamentals',
    'A figure shows a fixed starting point A extending in one direction through B and D. Which of the following is NOT found in this figure?',
    ['Point', 'Ray', 'Line', 'Line segment'],
    'Line',
    'The figure contains Points (A, B, D), a Ray (origin A extending through D), and Line Segments (AB, BD, AD). A Line requires arrows extending endlessly in BOTH directions, which is absent here.',
    'mcq-line'
  ),
  choice(
    'g6-q10-mcq',
    'geometry-fundamentals',
    'Which of the following geometric figures has a definite length and can be measured?',
    ['Line', 'Ray', 'Point', 'Line segment'],
    'Line segment',
    'A line segment has two fixed endpoints, giving it a fixed and measurable length. Lines and rays extend endlessly without fixed bounds, and points have no dimensions.'
  )
];

export const MATHS_GRADE_6_SOLUTIONS: MathsSolutionItem[] = [
  {
    questionNumber: 1,
    title: 'Points and Line Segments on a Straight Line',
    prompt: 'Look at the given figure and answer the following questions: (i) Name the three points. (ii) Name all the line segments.',
    diagramType: 'line-pqr',
    steps: [
      {
        part: '(i)',
        questionText: 'Name the three points.',
        answer: 'Point P, Point Q, and Point R.',
        explanation: 'Three locations on the line are marked with clear dots and capital letters P, Q, and R.'
      },
      {
        part: '(ii)',
        questionText: 'Name all the line segments.',
        answer: '3 line segments: PQ (or QP), QR (or RQ), and PR (or RP).',
        explanation: 'A line segment connects two endpoints. The segments between P, Q, and R are the two smaller segments PQ and QR, plus the full outer segment PR.'
      }
    ]
  },
  {
    questionNumber: 2,
    title: 'Naming Line Segments and Rays in Figures',
    prompt: 'Name the line segments and rays in the following figures.',
    diagramType: 'fig2-all',
    steps: [
      {
        part: 'Figure (i)',
        questionText: 'Vertical ray with origin A passing through B and C, plus three horizontal arms E, F, G.',
        answer: 'Line Segments: AB, BC, AC, AE, BF, CG. Rays: Ray AE, Ray BF, Ray CG, Ray AB (downward).',
        explanation: 'Segments are bounded between pairs of marked points. Ray AB starts at A and continues downward through B, while Rays AE, BF, and CG start on the vertical ray and extend rightwards indefinitely through their arrowheads.'
      },
      {
        part: 'Figure (ii)',
        questionText: 'W-shaped figure with marked points A, B, C, D, E.',
        answer: 'Line Segments: AB, BC, CD, DE. Rays: Ray BA (origin B) and Ray DE (origin D).',
        explanation: 'The four segments AB, BC, CD, and DE join consecutive marked points. Rays BA and DE start at vertices B and D and shoot upwards through A and E.'
      },
      {
        part: 'Figure (iii)',
        questionText: 'Slanted line segment QR with rays QP and RS.',
        answer: 'Line Segments: QR, QP, RS. Rays: Ray QP (origin Q) and Ray RS (origin R).',
        explanation: 'QR connects the two main turning points. Ray QP starts at Q extending left past P; Ray RS starts at R extending right past S.'
      }
    ]
  },
  {
    questionNumber: 3,
    title: '3D Cuboid: Vertices, Faces (Planes), and Edges (Segments)',
    prompt: 'In the given figure of a 3D box (cuboid): (i) How many points are marked? Name them. (ii) How many planes are shown? Name them. (iii) How many line segments are shown? Name them.',
    diagramType: 'cuboid',
    steps: [
      {
        part: '(i)',
        questionText: 'How many points are marked in the figure? Name them.',
        answer: '8 points: A, B, C, D, P, Q, R, S.',
        explanation: 'These 8 points form the 8 corner vertices of the cuboid.'
      },
      {
        part: '(ii)',
        questionText: 'How many planes are shown in the figure? Name them.',
        answer: '6 planes: Top (PBAC), Bottom (QRDS), Front (CADR), Back (PBSQ), Left (PCRQ), Right (BADS).',
        explanation: 'Each flat rectangular surface of the solid is a plane face.'
      },
      {
        part: '(iii)',
        questionText: 'How many line segments are shown in the figure? Name them.',
        answer: '12 line segments: Top edges (PB, BA, AC, CP), Bottom edges (QR, RD, DS, SQ), and Vertical edges (PQ, CR, AD, BS).',
        explanation: 'A cuboid has 12 edges, each bounded by two corner vertices as a line segment.'
      }
    ]
  },
  {
    questionNumber: 4,
    title: 'Parallel and Intersecting Lines',
    prompt: 'In the figure showing lines l, m, n and transversals p, q, r:',
    diagramType: 'parallel-transversals',
    steps: [
      {
        part: '(i)',
        questionText: 'Lines whose point of intersection is P:',
        answer: 'Line l and Line q.',
        explanation: 'Point P is where the transversal q crosses horizontal line l.'
      },
      {
        part: '(ii)',
        questionText: 'Lines whose point of intersection is T:',
        answer: 'Line m and Line r.',
        explanation: 'Point T is the crossing point of line m and line r.'
      },
      {
        part: '(iii)',
        questionText: 'All pairs of parallel lines:',
        answer: '(Line l, Line m), (Line m, Line n), and (Line l, Line n).',
        explanation: 'Lines l, m, and n are equidistant horizontal lines that never meet.'
      },
      {
        part: '(iv)',
        questionText: 'All pairs of intersecting lines:',
        answer: '(l, q), (l, p), (l, r), (m, q), (m, p), (m, r), (n, q), (n, p), (n, r), plus transversals (p, q), (p, r), and (q, r).',
        explanation: 'Any pair of non-parallel lines in the same plane intersect at a unique point.'
      },
      {
        part: '(v)',
        questionText: 'Lines whose point of intersection is I:',
        answer: 'Line m and Line p.',
        explanation: 'Point I is the intersection of line m and line p.'
      },
      {
        part: '(vi)',
        questionText: 'Lines whose point of intersection is S:',
        answer: 'Line l and Line r.',
        explanation: 'Point S is where line l crosses line r.'
      }
    ]
  },
  {
    questionNumber: 5,
    title: 'Naming Lines, Line Segments, and Rays',
    prompt: 'In the figure (lines l, m, n and t): (i) Name line l in two other ways. (ii) Name line m in two other ways. (iii) Name a line segment on line n. (iv) Name 3 line segments on line t. (v) Name 2 rays on line l. (vi) Name 4 rays on line t.',
    diagramType: 'line-m-t',
    steps: [
      {
        part: '(i)',
        questionText: 'Name line l in two other ways.',
        answer: 'Line CD or Line DC.',
        explanation: 'Line l passes through points C and D, so those two points give it another name.'
      },
      {
        part: '(ii)',
        questionText: 'Name line m in two other ways.',
        answer: 'Line BD or Line DB.',
        explanation: 'Line m is the vertical line through points B and D.'
      },
      {
        part: '(iii)',
        questionText: 'Name a line segment on line n.',
        answer: 'Segment AD (or Segment DA).',
        explanation: 'Line n passes through A and D, so the part between these two points is segment AD.'
      },
      {
        part: '(iv)',
        questionText: 'Name 3 line segments on line t (printed as line l in the book).',
        answer: 'Segment AB, Segment BC, and Segment AC.',
        explanation: 'Line t carries the three marked points A, B, and C. The segments between them are AB, BC, and the full span AC. The printed part says "line l", but line l has only two marked points (C and D), so the three-segment answer must refer to line t.'
      },
      {
        part: '(v)',
        questionText: 'Name 2 rays on line l.',
        answer: 'Ray CD and Ray DC.',
        explanation: 'Ray CD starts at C and passes through D; Ray DC starts at D and passes through C. They are opposite rays on line l.'
      },
      {
        part: '(vi)',
        questionText: 'Name 4 rays on line t.',
        answer: 'Ray AB, Ray BA, Ray BC, and Ray CB.',
        explanation: 'The three points on line t give exactly four different rays: from A through B (also named ray AC), from B through A, from B through C, and from C through B (also named ray CA).'
      }
    ]
  },
  {
    questionNumber: 6,
    title: 'Classifying Open and Closed Figures',
    prompt: 'Identify the following figures as open or closed figures:',
    diagramType: 'open-closed',
    steps: [
      {
        part: '(i)',
        questionText: 'Curved line with separate endpoints:',
        answer: 'Open figure',
        explanation: 'The start and end points do not meet, leaving the curve unclosed.'
      },
      {
        part: '(ii)',
        questionText: 'Enclosed boat-like shape:',
        answer: 'Closed figure',
        explanation: 'Begins and ends at the same point, completely enclosing an interior area.'
      },
      {
        part: '(iii)',
        questionText: 'Curved loops with open lower ends:',
        answer: 'Open figure',
        explanation: 'The two ends remain disconnected.'
      },
      {
        part: '(iv)',
        questionText: 'Figure-8 / two touching enclosed loops:',
        answer: 'Closed figure',
        explanation: 'Both loops form completely enclosed boundaries with no open ends.'
      },
      {
        part: '(v)',
        questionText: 'U-shaped open curve:',
        answer: 'Open figure',
        explanation: 'The top ends do not join.'
      },
      {
        part: '(vi)',
        questionText: 'Tilted four-sided polygon (rectangle):',
        answer: 'Closed figure',
        explanation: 'A polygon is always a closed plane figure formed by line segments.'
      },
      {
        part: '(vii)',
        questionText: 'Zig-zag path:',
        answer: 'Open figure',
        explanation: 'Start and end vertices are open.'
      },
      {
        part: '(viii)',
        questionText: 'Bowtie-shaped polygon:',
        answer: 'Closed figure',
        explanation: 'Enclosed perimeter formed by straight line segments.'
      }
    ]
  },
  {
    questionNumber: 7,
    title: 'Regions of a Closed Figure: Interior, Boundary, Exterior',
    prompt: 'Look at the given figure of a closed shape and answer the following questions:',
    diagramType: 'regions',
    steps: [
      {
        part: '(i)',
        questionText: 'Which points lie in the interior of the figure?',
        answer: 'Points K, L, M, N.',
        explanation: 'These points are situated entirely inside the perimeter curve.'
      },
      {
        part: '(ii)',
        questionText: 'Which points lie on the boundary of the figure?',
        answer: 'Points P, Q, R, S.',
        explanation: 'These points lie directly on the outline curve that separates the interior from the exterior.'
      },
      {
        part: '(iii)',
        questionText: 'Which points lie in the exterior of the figure?',
        answer: 'Points A, B, C, D.',
        explanation: 'These points are located outside the enclosed region in the surrounding plane.'
      }
    ]
  },
  {
    questionNumber: 8,
    title: 'MCQ: Direction and Origin of a Ray',
    prompt: 'Which of the following does not represent a ray in the given figure? (a) OA (b) OB (c) BA (d) AB',
    diagramType: 'mcq-rays',
    steps: [
      {
        part: 'Answer',
        questionText: 'Choose the correct option:',
        answer: '(c) BA',
        explanation: 'In the figure, point O is the fixed origin and the ray shoots rightward through A and B. Ray OA and Ray OB both start at O, and Ray AB starts at A and passes through B, so all three are rays. BA would need to start at B and continue leftward through A; no such ray is drawn. Therefore, BA does not represent a ray.'
      }
    ]
  },
  {
    questionNumber: 9,
    title: 'MCQ: Components of a Geometric Figure',
    prompt: 'Which of the following is not found in the given figure? (a) Point (b) Ray (c) Line (d) Line segment',
    diagramType: 'mcq-line',
    steps: [
      {
        part: 'Answer',
        questionText: 'Choose the correct option:',
        answer: '(c) Line',
        explanation: 'The figure shows an initial point A with a ray extending rightward through points B and D. It includes points (A, B, D), a ray (AD), and line segments (AB, BD, AD). A line extends endlessly in BOTH directions with two arrowheads, which is not present here.'
      }
    ]
  },
  {
    questionNumber: 10,
    title: 'MCQ: Measurable Geometric Figures',
    prompt: 'Which of the following can be measured? (a) Line (b) Ray (c) Point (d) Line segment',
    steps: [
      {
        part: 'Answer',
        questionText: 'Choose the correct option:',
        answer: '(d) Line segment',
        explanation: 'A line segment has two fixed endpoints, giving it a definite length that can be measured with a ruler. Lines and rays extend endlessly without bound, and a point has zero dimensions.'
      }
    ]
  }
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
  },
  {
    id: 'maths-grade-6-lesson-1',
    grade: 6,
    title: 'Chapter 14: Basic Geometry',
    sourceName: 'Grade 6 Mathematics — Chapter 14: Basic Geometry (Exercise 14)',
    memoryTip: 'Point = zero dimension. Line = extends forever in both directions. Line segment = 2 fixed endpoints, measurable. Ray = 1 fixed endpoint, extends forever in one direction.',
    cards: grade6Cards,
    questions: GRADE_6_MATHS_QUESTIONS,
    solutions: MATHS_GRADE_6_SOLUTIONS
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
