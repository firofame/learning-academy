import { StudentId } from '../types';
import { getStudentProfile } from './wordList';

export interface RoboticsCard {
  id: string;
  title: string;
  prompt: string;
  answer: string;
  examples?: string;
}

interface QuestionBase {
  id: string;
  prompt: string;
  answer: string;
  explanation?: string;
}

export type RoboticsQuestion =
  | (QuestionBase & { kind: 'choice' | 'true-false'; options: string[] })
  | (QuestionBase & { kind: 'fill'; acceptedAnswers: string[] })
  | (QuestionBase & { kind: 'short' });

export interface RoboticsLesson {
  id: string;
  grade: number;
  title: string;
  sourceName: string;
  memoryTip: string;
  cards: RoboticsCard[];
  questions: RoboticsQuestion[];
}

const choice = (id: string, prompt: string, options: string[], answer: string): RoboticsQuestion =>
  ({ id, kind: 'choice', prompt, options, answer });

const trueFalse = (id: string, prompt: string, correct: boolean, explanation: string): RoboticsQuestion =>
  ({ id, kind: 'true-false', prompt, options: ['True', 'False'], answer: correct ? 'True' : 'False', explanation });

const fill = (id: string, prompt: string, answer: string, aliases: string[] = []): RoboticsQuestion =>
  ({ id, kind: 'fill', prompt, answer, acceptedAnswers: [answer, ...aliases] });

const shortAnswers = (cards: RoboticsCard[]): RoboticsQuestion[] =>
  cards.map(card => ({ id: card.id, kind: 'short', prompt: card.prompt, answer: card.answer }));

const machinesCards: RoboticsCard[] = [
  {
    id: 'g2-machine', title: 'Machines make work easier', prompt: 'What is a machine?',
    answer: 'A machine helps us do work easily.'
  },
  {
    id: 'g2-simple', title: 'Simple machines', prompt: 'What is a simple machine?',
    answer: 'A simple machine has few parts and makes work easier.'
  },
  {
    id: 'g2-examples', title: 'Lever and pulley', prompt: 'Give two examples of simple machines.',
    answer: 'Lever and pulley.',
    examples: 'A pulley uses a wheel and rope to lift things. A wheel and axle is also a simple machine.'
  },
  {
    id: 'g2-complex', title: 'Simple machines working together', prompt: 'What is a complex machine?',
    answer: 'A complex machine is made of two or more simple machines.'
  },
  {
    id: 'g2-bicycle', title: 'A bicycle is a complex machine', prompt: 'Give one example of a complex machine.',
    answer: 'Bicycle.',
    examples: 'Machines help us save effort.'
  }
];

const aiCards: RoboticsCard[] = [
  {
    id: 'g6-domain', title: 'AI domains', prompt: 'What is a domain in AI?',
    answer: 'A domain is a specific area or field of work. In AI, a domain is an area where AI is used to perform specific tasks.',
    examples: 'This lesson explores Natural Language Processing, Computer Vision, and Statistical Data.'
  },
  {
    id: 'g6-nlp', title: 'Natural Language Processing (NLP)', prompt: 'What is Natural Language Processing (NLP)?',
    answer: 'NLP helps computers understand and work with human language.',
    examples: 'Chatbots, voice assistants, and language translation.'
  },
  {
    id: 'g6-cv', title: 'Computer Vision (CV)', prompt: 'What is Computer Vision (CV)?',
    answer: 'Computer Vision helps computers see and understand images and videos.',
    examples: 'Face recognition, object detection, and self-driving cars.'
  },
  {
    id: 'g6-data', title: 'Statistical Data', prompt: 'What is statistical data, and how does AI use it?',
    answer: 'Statistical data is information collected in the form of numbers or facts. AI studies this data to find patterns and make predictions.',
    examples: 'Weather prediction, student marks analysis, and sales reports.'
  }
];

export const ROBOTICS_LESSONS: RoboticsLesson[] = [
  {
    id: 'robotics-grade-2-lesson-1',
    grade: 2,
    title: 'Simple and Complex Machines',
    sourceName: 'Robotics Notes Grade 2 lesson-1-1.pdf',
    memoryTip: 'Simple = few parts. Complex = two or more simple machines together. Machines save effort!',
    cards: machinesCards,
    questions: [
      trueFalse('g2-tf-1', 'A machine helps us do work easily.', true, 'Machines make work easier.'),
      trueFalse('g2-tf-2', 'A simple machine has many complicated parts.', false, 'A simple machine has few parts.'),
      trueFalse('g2-tf-3', 'A lever is a simple machine.', true, 'Lever and pulley are simple machines.'),
      trueFalse('g2-tf-4', 'A bicycle is a complex machine.', true, 'A bicycle combines simple machines.'),
      trueFalse('g2-tf-5', 'A pulley is a complex machine.', false, 'A pulley is a simple machine.'),
      trueFalse('g2-tf-6', 'Machines can save our effort.', true, 'Machines help us do work easily and save effort.'),
      choice('g2-mcq-1', 'Which one is a simple machine?', ['Bicycle', 'Lever', 'Car', 'Computer'], 'Lever'),
      choice('g2-mcq-2', 'Which machine helps us lift things using a wheel and rope?', ['Pulley', 'Spoon', 'Chair', 'Table'], 'Pulley'),
      choice('g2-mcq-3', 'A complex machine is made of:', ['Water', 'One simple machine', 'Two or more simple machines', 'Food'], 'Two or more simple machines'),
      choice('g2-mcq-4', 'Which is an example of a complex machine?', ['Lever', 'Pulley', 'Bicycle', 'Ramp'], 'Bicycle'),
      choice('g2-mcq-5', 'Machines help us to:', ['Make work harder', 'Save effort', 'Stop working', 'Waste time'], 'Save effort'),
      choice('g2-mcq-6', 'Which of these is a simple machine?', ['Wheel and axle', 'Bicycle', 'Car', 'Bus'], 'Wheel and axle'),
      fill('g2-fill-1', 'A machine helps us do ______ easily.', 'work'),
      fill('g2-fill-2', 'A ______ is a simple machine. (Starts with L.)', 'lever'),
      fill('g2-fill-3', 'A ______ is a simple machine. (Uses a wheel and rope.)', 'pulley'),
      fill('g2-fill-4', 'A complex machine is made of ______ simple machines.', 'two or more', ['2 or more']),
      fill('g2-fill-5', 'A ______ is a complex machine. (You ride it by pedalling.)', 'bicycle'),
      fill('g2-fill-6', 'Machines help us save ______.', 'effort'),
      ...shortAnswers(machinesCards)
    ]
  },
  {
    id: 'robotics-grade-6-lesson-1',
    grade: 6,
    title: 'Exploring AI Domains',
    sourceName: 'Robotics Grade 6 lesson1 .pdf',
    memoryTip: 'Language - Pictures - Numbers: NLP works with language; CV with images and videos; Statistical Data with numbers and facts.',
    cards: aiCards,
    questions: [
      trueFalse('g6-tf-1', 'A domain is a specific area or field of work.', true, 'A domain means a specific area or field of work.'),
      trueFalse('g6-tf-2', 'NLP helps computers understand human language.', true, 'NLP stands for Natural Language Processing.'),
      trueFalse('g6-tf-3', 'Computer Vision helps computers understand images and videos.', true, 'Computer Vision works with images and videos.'),
      trueFalse('g6-tf-4', 'Statistical data contains only pictures and videos.', false, 'Statistical data contains numbers or facts.'),
      trueFalse('g6-tf-5', 'Voice assistants can use NLP.', true, 'Voice assistants work with human language.'),
      trueFalse('g6-tf-6', 'Computer Vision cannot be used for face recognition.', false, 'Face recognition is an example of Computer Vision.'),
      fill('g6-fill-1', 'A ______ is a specific area or field of work.', 'domain'),
      fill('g6-fill-2', '______ helps computers understand human language.', 'NLP', ['Natural Language Processing']),
      fill('g6-fill-3', 'NLP stands for ______.', 'Natural Language Processing'),
      fill('g6-fill-4', '______ helps computers understand images and videos.', 'Computer Vision', ['CV']),
      fill('g6-fill-5', 'Computer Vision is also called ______.', 'CV'),
      fill('g6-fill-6', '______ data contains information in the form of numbers and facts.', 'Statistical'),
      choice('g6-mcq-1', 'What is a domain?', ['A computer game', 'A specific area or field', 'A type of robot', 'A computer screen'], 'A specific area or field'),
      choice('g6-mcq-2', 'What does NLP help computers understand?', ['Human language', 'Electricity', 'Weather only', 'Machines'], 'Human language'),
      choice('g6-mcq-3', 'What does NLP stand for?', ['Natural Learning Program', 'Natural Language Processing', 'New Language Process', 'Natural Logic Program'], 'Natural Language Processing'),
      choice('g6-mcq-4', 'What does Computer Vision help computers understand?', ['Music', 'Numbers only', 'Images and videos', 'Books only'], 'Images and videos'),
      choice('g6-mcq-5', 'Which of the following is an example of NLP?', ['Face recognition', 'Voice assistant', 'Object detection', 'Weather sensor'], 'Voice assistant'),
      choice('g6-mcq-6', 'Statistical data mainly contains:', ['Numbers and facts', 'Only pictures', 'Only sounds', 'Only videos'], 'Numbers and facts'),
      ...shortAnswers(aiCards)
    ]
  }
];

export function getRoboticsLessonForGrade(grade: number): RoboticsLesson | undefined {
  return ROBOTICS_LESSONS.find(lesson => lesson.grade === grade);
}

export function getRoboticsLesson(studentId: StudentId): RoboticsLesson {
  const profile = getStudentProfile(studentId);
  const lesson = getRoboticsLessonForGrade(profile.grade);
  if (!lesson) throw new Error(`Robotics is not available for ${profile.gradeLabel}.`);
  return lesson;
}

export function normalizeRoboticsAnswer(answer: string): string {
  return answer.normalize('NFKC').trim().toLowerCase().replace(/[.!?]+$/, '').trim().replace(/\s+/g, ' ');
}

export function checkRoboticsAnswer(question: RoboticsQuestion, answer: string): boolean {
  if (question.kind === 'short') throw new Error('Short robotics answers require a parent check.');
  const accepted = question.kind === 'fill' ? question.acceptedAnswers : [question.answer];
  return accepted.some(value => normalizeRoboticsAnswer(value) === normalizeRoboticsAnswer(answer));
}
