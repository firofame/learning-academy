import { StudentId } from '../types';
import { getStudentProfile } from './profiles';

export type HistorySectionId =
  | 'rural-local-self-government'
  | 'mesopotamian-civilization'
  | 'vedic-civilization'
;

export interface HistorySection {
  id: HistorySectionId;
  partNumber: number;
  label: string;
  topic: string;
}

export const HISTORY_SECTIONS: HistorySection[] = [
  {
    id: 'rural-local-self-government',
    partNumber: 1,
    label: 'Part 1: Rural Local Self Government Civics',
    topic: 'Rural Local Self Government Civics'
  },
  {
    id: 'mesopotamian-civilization',
    partNumber: 2,
    label: 'Part 2: Mesopotamian Civilization History • Chapter 2',
    topic: 'Mesopotamian Civilization History'
  },
  {
    id: 'vedic-civilization',
    partNumber: 3,
    label: 'Part 3: The Vedic Civilization History • Vedic Age',
    topic: 'The Vedic Civilization History'
  },
];

export interface HistoryQuestion {
  id: string;
  section: HistorySectionId;
  /** The teacher's own sub-heading above this question, e.g. "I. SHORT ANSWER QUESTIONS". */
  groupLabel?: string;
  kind: 'written';
  prompt: string;
  /** The teacher's answer, kept exactly as written, including its list and table layout. */
  answer: string;
  acceptedAnswers: string[];
  /** The grading rubric is the teacher's own answer, so nothing outside the notes can be required. */
  markingCriteria: string;
}

export interface HistoryLesson {
  id: string;
  grade: number;
  title: string;
  sourceName: string;
  sections: HistorySection[];
  questions: HistoryQuestion[];
}

/**
 * Builds a question from the teacher's notes.
 *
 * The answer keeps the teacher's own line breaks, bullets and table headings so the app shows the
 * notes exactly as they were written. The marking rubric is that same text, so a learner is only
 * ever asked for what the teacher actually wrote.
 */
const written = (
  id: string,
  section: HistorySectionId,
  groupLabel: string | undefined,
  prompt: string,
  answerLines: string[],
  aliases: string[] = []
): HistoryQuestion => {
  const answer = answerLines.join('\n');
  const flowing = answerLines.map(line => line.replace(/^•\s+/, '')).join(' ');
  return {
    id,
    section,
    ...(groupLabel ? { groupLabel } : {}),
    kind: 'written',
    prompt,
    answer,
    acceptedAnswers: [answer, flowing, ...aliases],
    markingCriteria: answer
  };
};

export const SHIZA_HISTORY_LESSON: HistoryLesson = {
  id: 'history-grade-6-compendium',
  grade: 6,
  title: 'Grade 6 History & Civics Revision',
  sourceName: 'Social Studies Revision Notebook · Civics & History Study Compendium',
  sections: HISTORY_SECTIONS,
  questions: [

    // ==========================================
    // Part 1: Rural Local Self Government Civics
    // ==========================================
    written(
      'g6-hist-part1-qa-1',
      'rural-local-self-government',
      undefined,
      'What is a Village Panchayat?',
      [
        'The Village Panchayat is a local administrative committee of 7 to 30 members elected directly by the Gram Sabha. It holds office for a term of 5 years and is headed by the Sarpanch.'
      ]
    ),
    written(
      'g6-hist-part1-qa-2',
      'rural-local-self-government',
      undefined,
      'What are the essential functions of the Village Panchayat?',
      [
        'The primary functions essential for village welfare include:',
        'Providing clean drinking water and sanitation facilities.',
        'Registering and maintaining vital statistics (birth and death records).',
        'Managing the day-to-day civic administration of the village.',
        'Upkeep and maintenance of general village infrastructure.'
      ]
    ),
    written(
      'g6-hist-part1-qa-3',
      'rural-local-self-government',
      undefined,
      'What are the functions of the Panchayat Samiti?',
      [
        'The Panchayat Samiti functions at the block level. It plans and coordinates development activities among multiple villages, supervises the working of Village Panchayats, prepares development budgets, executes government welfare schemes, and promotes local public welfare.'
      ]
    ),
    written(
      'g6-hist-part1-qa-4',
      'rural-local-self-government',
      undefined,
      'What is the composition of the Zila Parishad?',
      [
        'The Zila Parishad stands at the apex of the Panchayati Raj system at the district level. It is primarily composed of the chairpersons of all the Block Panchayat Samitis within the district.'
      ]
    ),
    written(
      'g6-hist-part1-qa-5',
      'rural-local-self-government',
      undefined,
      'What is the importance of local self-government?',
      [
        'Local self-government empowers citizens at the grassroot level to take direct part in national governance, fostering self-reliance and civic responsibility. It creates vital cooperation between urban and rural areas while significantly reducing the administrative burden on state governments through democratic decentralization.'
      ]
    ),
    written(
      'g6-hist-part1-qa-6',
      'rural-local-self-government',
      undefined,
      'Mention any four compulsory functions of the Gram Panchayat.',
      [
        'Four key compulsory functions of the Gram Panchayat are:',
        'Provision and maintenance of clean drinking water sources.',
        'Effective implementation of local development and welfare programs.',
        'Registration and maintenance of birth and death records.',
        'Construction, repair, and maintenance of village roads, drains, and public buildings.'
      ]
    ),
    written(
      'g6-hist-part1-qa-7',
      'rural-local-self-government',
      undefined,
      'What is the three-tier system of Panchayati Raj? How does it help citizens?',
      [
        'The three-tier structure comprises:',
        '1. Gram Panchayat (Village level)',
        '2. Panchayat Samiti (Block level)',
        '3. Zila Parishad (District level)',
        'It enables rural citizens—who may otherwise lack direct access to distant state or central administrations—to participate in decision-making, voice local grievances, and manage community affairs effectively.'
      ],
      [
        'Gram Panchayat, Panchayat Samiti, and Zila Parishad',
      ]
    ),
    written(
      'g6-hist-part1-qa-8',
      'rural-local-self-government',
      undefined,
      'Difference between Gram Sabha and Gram Panchayat',
      [
        'Gram Sabha:',
        '• The general body consisting of all registered adult voters residing in the village.',
        '• Functions as the foundational legislative forum of rural democracy.',
        '• Headed and presided over by the Sarpanch.',
        '',
        'Gram Panchayat:',
        '• A small executive committee of elected representatives chosen by the Gram Sabha.',
        '• Acts as the executive governing body responsible for day-to-day administrative duties.',
        '• Headed and administered by the Pradhan / Sarpanch and elected ward members.'
      ]
    ),
    written(
      'g6-hist-part1-qa-9',
      'rural-local-self-government',
      undefined,
      'Write a short note on Nyaya Panchayat.',
      [
        'A Nyaya Panchayat is a village-level judicial council designed to resolve minor civil and criminal disputes quickly, informally, and without heavy legal expenses. Its members are elected by the Gram Panchayat, ensuring swift, low-cost community justice.'
      ]
    ),

    // ==========================================
    // Part 2: Mesopotamian Civilization History • Chapter 2
    // ==========================================
    written(
      'g6-hist-part2-qa-1',
      'mesopotamian-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'Who constituted the middle class in Mesopotamian society?',
      [
        'The middle class was comprised primarily of farmers, artisans, craftsmen, and traders.'
      ],
      [
        'Farmers, artisans, craftsmen, and traders',
      ]
    ),
    written(
      'g6-hist-part2-qa-2',
      'mesopotamian-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'Name the three main civilizations that rose and fell in the Mesopotamian valley.',
      [
        'The three major civilizations were Sumer, Babylon, and Assyria.'
      ],
      [
        'Sumer, Babylon, and Assyria',
        'Sumerians, Babylonians, and Assyrians',
      ]
    ),
    written(
      'g6-hist-part2-qa-3',
      'mesopotamian-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'What was a Ziggurat?',
      [
        'A Ziggurat was a monumental stepped temple tower where each successive level was smaller than the one below it. Besides serving as places of worship, Ziggurats functioned as astronomical observatories, grain storehouses (granaries), and commercial trade centers.'
      ]
    ),
    written(
      'g6-hist-part2-qa-4',
      'mesopotamian-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'Why is the Code of Hammurabi of historical significance?',
      [
        'Issued by King Hammurabi of Babylon, it represents the world\'s earliest comprehensive written legal code, codified to establish strict social order and standard principles of justice.'
      ]
    ),
    written(
      'g6-hist-part2-qa-5',
      'mesopotamian-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'Why is Mesopotamia described as the "cradle and grave of many civilizations"?',
      [
        'It is known as the "cradle" because the fertile region fostered the birth and growth of multiple pioneering human civilizations (Sumerians, Babylonians, Assyrians), and the "grave" because each of these powerful empires successively collapsed and became buried beneath its soil.'
      ]
    ),
    written(
      'g6-hist-part2-qa-6',
      'mesopotamian-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'How did the Mesopotamian civilization decline?',
      [
        'The civilization underwent an abrupt decline primarily caused by environmental shifts. The river Euphrates repeatedly altered its course, leaving once-fertile centers stranded in arid desert conditions. Severe soil salinization and erosion caused major cities to be abandoned, gradually turning the region into a barren desert plain.'
      ]
    ),
    written(
      'g6-hist-part2-qa-7',
      'mesopotamian-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'What architectural works were built by Nebuchadnezzar? Describe any one.',
      [
        'King Nebuchadnezzar II undertook extensive reconstruction of Babylon, creating massive fortifications, gates, and palaces. His most celebrated work was the Hanging Gardens of Babylon, built to comfort his queen Amytis, who longed for the lush, tiered vegetation of her mountainous homeland.'
      ]
    ),
    written(
      'g6-hist-part2-qa-8',
      'mesopotamian-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'Write a short note on Cuneiform script.',
      [
        'Invented by the Sumerians, Cuneiform was one of the earliest writing systems in human history. Written from left to right, scribes used reed styluses to impress wedge-shaped characters into damp clay tablets, which were subsequently sun-dried or baked to create permanent records.'
      ]
    ),
    written(
      'g6-hist-part2-qa-9',
      'mesopotamian-civilization',
      'II. GIVE REASONS',
      'The main occupation of ancient Mesopotamia was agriculture.',
      [
        'The civilization was cradled between the twin rivers—the Tigris and Euphrates. Annual floods deposited fertile silt over the floodplains, providing regular irrigation water and rich soil highly favorable for extensive farming.'
      ]
    ),
    written(
      'g6-hist-part2-qa-10',
      'mesopotamian-civilization',
      'II. GIVE REASONS',
      'Mesopotamian agricultural yields increased significantly over time.',
      [
        'Yields expanded due to sophisticated irrigation planning. Engineers built extensive canal networks, dykes, and reservoirs to capture floodwaters and channel them efficiently to distant fields far from riverbanks.'
      ]
    ),

    // ==========================================
    // Part 3: The Vedic Civilization History • Vedic Age
    // ==========================================
    written(
      'g6-hist-part3-qa-1',
      'vedic-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'Who were the Aryans?',
      [
        'The Aryans were semi-nomadic pastoral groups who migrated from Central Asia into the Indian subcontinent around 1500 BCE, bringing their distinct language, rituals, and cultural traditions.'
      ]
    ),
    written(
      'g6-hist-part3-qa-2',
      'vedic-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'What is the Rigveda?',
      [
        'The Rigveda is the oldest known religious text of the Vedic tradition, composed during the Early Vedic period. It contains 1,028 sacred hymns (suktas) and mantras addressed to personified forces of nature and various deities.'
      ]
    ),
    written(
      'g6-hist-part3-qa-3',
      'vedic-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'Difference between Sabha and Samiti',
      [
        'Sabha:',
        '• A selective assembly of respected elders, eminent nobles, and learned scholars.',
        '• Advised the king on judicial and internal policy matters, checking royal autocracy.',
        '',
        'Samiti:',
        '• A broad popular folk assembly representing common citizens and tribal elders.',
        '• Discussed broad political concerns, war decisions, and the election of the king.'
      ]
    ),
    written(
      'g6-hist-part3-qa-4',
      'vedic-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'Who were the Brahmans?',
      [
        'The Brahmans formed the priestly, scholarly, and intellectual class responsible for preserving oral traditions, reciting Vedic hymns, imparting education, and performing solemn religious sacrifices.'
      ]
    ),
    written(
      'g6-hist-part3-qa-5',
      'vedic-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'What were the leisure and recreational activities of the Aryans?',
      [
        'Recreational pursuits included chariot racing, hunting, singing, dancing, playing musical instruments (lutes and flutes), and dice games.'
      ]
    ),
    written(
      'g6-hist-part3-qa-6',
      'vedic-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'List the four Ashramas (stages of life).',
      [
        'The four prescribed ashramas are:',
        '1. Brahmacharya: The stage of celibate studenthood and learning.',
        '2. Grihastha: The householder stage devoted to family, work, and community.',
        '3. Vanaprastha: The stage of gradual retirement and spiritual contemplation.',
        '4. Sanyasa: The final stage of total renunciation and ascetic pursuit of liberation.'
      ],
      [
        'Brahmacharya, Grihastha, Vanaprastha, and Sanyasa',
      ]
    ),
    written(
      'g6-hist-part3-qa-7',
      'vedic-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'Name the prominent deities worshipped during the Later Vedic Age.',
      [
        'While early nature gods receded, the Later Vedic period witnessed the ascendance of the Trinity: Brahma (the Creator), Vishnu (the Preserver), and Shiva / Rudra (the Destroyer).'
      ],
      [
        'Brahma, Vishnu, and Shiva',
        'Brahma (the Creator), Vishnu (the Preserver), and Shiva / Rudra (the Destroyer)',
      ]
    ),
    written(
      'g6-hist-part3-qa-8',
      'vedic-civilization',
      'I. SHORT ANSWER QUESTIONS',
      'What does the Yajurveda contain?',
      [
        'The Yajurveda contains liturgical prose, rituals, mantras, and practical instructions formulated specifically for priests officiating complex Vedic sacrifices and ceremonies.'
      ]
    ),
    written(
      'g6-hist-part3-qa-9',
      'vedic-civilization',
      'II. LONG ANSWER QUESTIONS',
      'How and when did the Aryans arrive and settle in India?',
      [
        'Around 1500 BCE, coinciding with the gradual collapse of the urban Indus Valley Civilization, pastoral Indo-Aryan groups crossed the northwestern mountain passes into India. They initially settled in the Sapta-Sindhu (land of the seven rivers), naming it Brahmavarta. As populations grew and iron tools were introduced, they cleared forests eastward along the fertile Gangetic plain, designating the broader northern realm Aryavarta.'
      ]
    ),
    written(
      'g6-hist-part3-qa-10',
      'vedic-civilization',
      'II. LONG ANSWER QUESTIONS',
      'Describe the social life of the Rig Vedic Age.',
      [
        'Early Vedic society was patriarchal and centered upon the joint family system, headed by the eldest male, the Grihapati. Women held a respectable position, had access to education, and actively participated in religious rituals. The varna system was based upon occupation rather than birth and was relatively open and flexible:',
        'Brahmans: Priests and scholars.',
        'Kshatriyas: Rulers and warrior defenders.',
        'Vaishyas: Farmers, pastoralists, and merchants.',
        'Shudras: Laborers and artisans serving the community.'
      ],
      [
        'Brahmans, Kshatriyas, Vaishyas, and Shudras',
      ]
    ),
    written(
      'g6-hist-part3-qa-11',
      'vedic-civilization',
      'II. LONG ANSWER QUESTIONS',
      'Explain the religious practices of the Aryans during the Early and Later Vedic periods.',
      [
        'Early Vedic Period: Religion was simple, direct, and centered on worshipping natural phenomena as anthropomorphic deities (e.g., Agni, Indra, Varuna, Surya). Prayers were recited openly, accompanied by simple offerings of milk, grain, and clarified butter.',
        'Later Vedic Period: Ritual practices grew increasingly elaborate, rigid, and expensive. The worship of the Trimurti (Brahma, Vishnu, Shiva) gained prominence, and sacrificial rites (yajnas) became deeply ritualistic, requiring specialized Brahman priests.'
      ]
    ),
    written(
      'g6-hist-part3-qa-12',
      'vedic-civilization',
      'II. LONG ANSWER QUESTIONS',
      'What was the Gurukula system of education?',
      [
        'The Gurukula was a residential schooling system where disciples left home to reside in their teacher\'s forest hermitage (ashram). Students rendered daily domestic assistance to maintain the hermitage while acquiring knowledge in diverse fields such as philosophy, grammar, mathematics, astronomy, warfare, and logic. Education was provided without fixed monetary fees; upon completing their studies, students offered a voluntary parting tribute known as Gurudakshina.'
      ]
    ),
    written(
      'g6-hist-part3-qa-13',
      'vedic-civilization',
      'III. GIVE REASONS',
      'Why is the Later Vedic Period also known as the Epic Age?',
      [
        'This epoch witnessed the composition and consolidation of India\'s two monumental Sanskrit epics, the Ramayana and the Mahabharata, which vividly depict the sociopolitical, philosophical, and moral fabric of the era.'
      ]
    ),
    written(
      'g6-hist-part3-qa-14',
      'vedic-civilization',
      'III. GIVE REASONS',
      'Why was the Rajasuya ceremony performed?',
      [
        'The Rajasuya yajna was a major royal consecration ritual performed during a monarch\'s coronation. It served to proclaim his supreme sovereignty, legitimize his dynastic authority over neighboring rulers, and secure divine blessing for his reign.'
      ]
    ),
  ]
};

export function getHistoryLessonForGrade(grade: number): HistoryLesson | undefined {
  return grade === 6 ? SHIZA_HISTORY_LESSON : undefined;
}

export function getHistoryLesson(studentId: StudentId): HistoryLesson {
  const profile = getStudentProfile(studentId);
  const lesson = getHistoryLessonForGrade(profile.grade);
  if (!lesson) throw new Error(`History is not available for ${profile.gradeLabel}.`);
  return lesson;
}

export function normalizeHistoryAnswer(answer: string): string {
  return answer
    .normalize('NFKC')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/,\s*and\b/g, ' and')
    .replace(/[\s.,!?;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function matchesListSet(target: string, input: string): boolean {
  const splitItems = (str: string) =>
    str
    .split(/,|\band\b/)
    .map(s => s.trim().replace(/^[.,;:]+|[.,;:]+$/g, ''))
    .filter(Boolean);
  const targetItems = splitItems(target);
  const inputItems = splitItems(input);
  if (targetItems.length < 2 || targetItems.length !== inputItems.length) return false;
  if (!targetItems.every(item => item.split(/\s+/).length <= 4)) return false;
  if (!inputItems.every(item => item.split(/\s+/).length <= 4)) return false;
  const sortedTarget = [...targetItems].sort().join('|');
  const sortedInput = [...inputItems].sort().join('|');
  return sortedTarget === sortedInput;
}

export function checkHistoryAnswer(question: HistoryQuestion, answer: string): boolean {
  const normalized = normalizeHistoryAnswer(answer);
  if (!normalized) return false;
  return question.acceptedAnswers.some(candidate => {
    const target = normalizeHistoryAnswer(candidate);
    if (target === normalized) return true;
    const strippedTarget = target.replace(/[,;:]/g, ' ').replace(/\s+/g, ' ').trim();
    const strippedInput = normalized.replace(/[,;:]/g, ' ').replace(/\s+/g, ' ').trim();
    if (strippedTarget === strippedInput) return true;
    const withoutParensTarget = target.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
    const withoutParensInput = normalized.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (withoutParensTarget === withoutParensInput) return true;

    const withoutHyphensTarget = target.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    const withoutHyphensInput = normalized.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    if (withoutHyphensTarget === withoutHyphensInput) return true;
    const collapsedHyphensTarget = target.replace(/-/g, '').replace(/\s+/g, ' ').trim();
    const collapsedHyphensInput = normalized.replace(/-/g, '').replace(/\s+/g, ' ').trim();
    if (collapsedHyphensTarget === collapsedHyphensInput) return true;

    // Order-independent list matching (e.g., "Sumer, Babylon, Assyria")
    if (matchesListSet(target, normalized)) return true;
    if (matchesListSet(withoutParensTarget, withoutParensInput)) return true;
    if (matchesListSet(withoutHyphensTarget, withoutHyphensInput)) return true;

    return false;
  });
}
