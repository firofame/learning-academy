import { StudentId } from '../types';
import { getStudentProfile } from './profiles';

export type HistorySectionId =
  | 'rural-local-self-government'
  | 'mesopotamian-civilization'
  | 'vedic-civilization';

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
    label: 'Part 1 · Rural Local Self Government (Civics)',
    topic: 'Rural Local Self Government'
  },
  {
    id: 'mesopotamian-civilization',
    partNumber: 2,
    label: 'Part 2 · Mesopotamian Civilization (History)',
    topic: 'Mesopotamian Civilization'
  },
  {
    id: 'vedic-civilization',
    partNumber: 3,
    label: 'Part 3 · The Vedic Civilization (History)',
    topic: 'The Vedic Civilization'
  }
];

export interface HistoryCard {
  id: string;
  section: HistorySectionId;
  title: string;
  prompt: string;
  answer: string;
  memoryTip: string;
  examples?: string;
}

interface QuestionBase {
  id: string;
  section: HistorySectionId;
  prompt: string;
  answer: string;
  explanation: string;
}

export type HistoryQuestion = QuestionBase & {
  kind: 'written';
  acceptedAnswers: string[];
  markingCriteria: string;
};

export interface HistoryLesson {
  id: string;
  grade: number;
  title: string;
  sourceName: string;
  memoryTip: string;
  sections: HistorySection[];
  cards: HistoryCard[];
  questions: HistoryQuestion[];
}

const written = (
  id: string,
  section: HistorySectionId,
  prompt: string,
  answer: string,
  markingCriteria: string,
  explanation: string,
  aliases: string[] = []
): HistoryQuestion => ({
  id,
  section,
  kind: 'written',
  prompt,
  answer,
  acceptedAnswers: [answer, ...aliases],
  markingCriteria,
  explanation
});

const historyCards: HistoryCard[] = [
  {
    id: 'g6-hist-card-panchayat',
    section: 'rural-local-self-government',
    title: 'Village Panchayat & Gram Sabha',
    prompt: 'What constitutes the Village Panchayat and how does it relate to the Gram Sabha?',
    answer: 'The Village Panchayat is a local administrative committee of 7 to 30 members elected directly by the Gram Sabha (all adult village voters). It holds office for 5 years and is headed by the Sarpanch.',
    memoryTip: 'Gram Sabha = all adult voters (legislative). Village Panchayat = 7 to 30 elected members, 5-year term, headed by Sarpanch (executive).',
    examples: 'The Gram Sabha votes to elect the Panchayat members and holds them accountable.'
  },
  {
    id: 'g6-hist-card-panchayat-functions',
    section: 'rural-local-self-government',
    title: 'Functions of the Gram Panchayat',
    prompt: 'What are the essential compulsory functions of a Gram Panchayat?',
    answer: 'Compulsory functions include providing clean drinking water and sanitation facilities, maintaining birth and death records, managing day-to-day civic administration, and constructing and repairing village roads, drains, and public buildings.',
    memoryTip: '4 Core Functions: 1. Clean drinking water & sanitation, 2. Birth & death records, 3. Civic administration, 4. Roads, drains, & public buildings.',
    examples: 'Installing water hand-pumps, paving village pathways, registering newborns.'
  },
  {
    id: 'g6-hist-card-three-tier',
    section: 'rural-local-self-government',
    title: 'The Three-Tier Panchayati Raj System',
    prompt: 'How is the Panchayati Raj structured and how does it benefit citizens?',
    answer: 'The three tiers are: 1. Gram Panchayat (village level), 2. Panchayat Samiti (block level), and 3. Zila Parishad (district level). It empowers rural citizens to voice local grievances and manage community affairs through democratic decentralization.',
    memoryTip: 'Three tiers: Village (Gram Panchayat) -> Block (Panchayat Samiti) -> District (Zila Parishad). Promotes grassroots democracy.',
    examples: 'Local self-government reduces administrative burdens on state governments.'
  },
  {
    id: 'g6-hist-card-nyaya-panchayat',
    section: 'rural-local-self-government',
    title: 'Nyaya Panchayat',
    prompt: 'What is a Nyaya Panchayat and what is its role?',
    answer: 'A Nyaya Panchayat is a village-level judicial council elected by the Gram Panchayat to resolve minor civil and criminal disputes quickly, informally, and without heavy legal expenses.',
    memoryTip: 'Nyaya Panchayat = village judicial council for quick, informal, low-cost community justice.',
    examples: 'Settling small boundary disputes between neighboring village farmers.'
  },
  {
    id: 'g6-hist-card-meso-civilizations',
    section: 'mesopotamian-civilization',
    title: 'Mesopotamian Valley Civilizations',
    prompt: 'Which major civilizations flourished in Mesopotamia, and what was its social structure?',
    answer: 'The three major civilizations were Sumer, Babylon, and Assyria, cradled between the Tigris and Euphrates rivers. Its middle class was made up of farmers, artisans, craftsmen, and traders.',
    memoryTip: 'Twin Rivers: Tigris & Euphrates. 3 Civilizations: Sumer, Babylon, Assyria. Middle Class: farmers, artisans, craftsmen, traders.',
    examples: 'Known as the "cradle and grave of many civilizations" due to successive rise and fall of empires.'
  },
  {
    id: 'g6-hist-card-ziggurat-cuneiform',
    section: 'mesopotamian-civilization',
    title: 'Ziggurats & Cuneiform Script',
    prompt: 'What were Ziggurats and what was Cuneiform script?',
    answer: 'A Ziggurat was a monumental stepped temple tower serving as a place of worship, observatory, granary, and trade center. Cuneiform was a Sumerian wedge-shaped writing system written left-to-right on damp clay tablets with reed styluses.',
    memoryTip: 'Ziggurat = stepped temple tower + granary + observatory + market. Cuneiform = Sumerian wedge-shaped writing on clay tablets.',
    examples: 'Baked clay tablets preserved historical records, trade inventories, and laws.'
  },
  {
    id: 'g6-hist-card-hammurabi-nebuchadnezzar',
    section: 'mesopotamian-civilization',
    title: 'Code of Hammurabi & Hanging Gardens',
    prompt: 'Why are Hammurabi and Nebuchadnezzar celebrated in Mesopotamian history?',
    answer: 'King Hammurabi of Babylon codified the world\'s earliest comprehensive written legal code. King Nebuchadnezzar II rebuilt Babylon and created the Hanging Gardens for Queen Amytis.',
    memoryTip: 'Hammurabi = earliest comprehensive written law code. Nebuchadnezzar II = Hanging Gardens of Babylon for Queen Amytis.',
    examples: 'The Code established standardized principles of justice and strict social order.'
  },
  {
    id: 'g6-hist-card-meso-decline',
    section: 'mesopotamian-civilization',
    title: 'Mesopotamian Agriculture & Environmental Decline',
    prompt: 'How did Mesopotamian farming thrive and why did the civilization collapse?',
    answer: 'Farming thrived due to fertile silt from river floods and sophisticated canal networks. The civilization collapsed when the Euphrates shifted course, and severe soil salinization and erosion caused cities to be abandoned.',
    memoryTip: 'Thrived on: silt + canals/reservoirs. Collapsed from: Euphrates shifting course + soil salinization & erosion.',
    examples: 'Once fertile fields turned into barren desert plains when river channels changed.'
  },
  {
    id: 'g6-hist-card-aryans-arrival',
    section: 'vedic-civilization',
    title: 'Aryan Settlement: Sapta-Sindhu to Aryavarta',
    prompt: 'When did the Aryans arrive in India and where did they settle?',
    answer: 'Around 1500 BCE, semi-nomadic pastoral Aryans migrated from Central Asia into India through northwestern passes. They settled first in the Sapta-Sindhu (Brahmavarta) and expanded along the Gangetic plain (Aryavarta) using iron tools.',
    memoryTip: '1500 BCE: Central Asia -> Sapta-Sindhu (Brahmavarta) -> cleared forests eastward with iron -> Aryavarta.',
    examples: 'Their migration coincided with the decline of the Indus Valley Civilization.'
  },
  {
    id: 'g6-hist-card-vedic-texts',
    section: 'vedic-civilization',
    title: 'Vedic Literature: Rigveda, Yajurveda & Epics',
    prompt: 'What are the Rigveda and Yajurveda, and why is the Later Vedic Age called the Epic Age?',
    answer: 'The Rigveda is the oldest Vedic text containing 1,028 hymns (suktas). The Yajurveda contains liturgical prose and sacrificial mantras. The Later Vedic period is called the Epic Age because the Ramayana and Mahabharata were composed then.',
    memoryTip: 'Rigveda = 1,028 nature hymns. Yajurveda = rituals/sacrificial prose. Epic Age = Ramayana & Mahabharata composed.',
    examples: 'Brahmans memorized and orally recited these sacred Vedic compositions.'
  },
  {
    id: 'g6-hist-card-vedic-society',
    section: 'vedic-civilization',
    title: 'Vedic Society, Varna & Ashramas',
    prompt: 'How was Vedic society structured, and what were the four Ashramas?',
    answer: 'Rig Vedic society was patriarchal (headed by the Grihapati) with respected women and an occupation-based four-fold varna system: Brahmans, Kshatriyas, Vaishyas, and Shudras. The four life stages (Ashramas) are Brahmacharya (student), Grihastha (householder), Vanaprastha (retirement), and Sanyasa (renunciation).',
    memoryTip: 'Society: patriarchal + Grihapati. 4 Varnas: Brahman, Kshatriya, Vaishya, Shudra. 4 Ashramas: Brahmacharya, Grihastha, Vanaprastha, Sanyasa.',
    examples: 'The varna system in the Early Vedic age was flexible and based on profession, not birth.'
  },
  {
    id: 'g6-hist-card-sabha-samiti-education',
    section: 'vedic-civilization',
    title: 'Sabha, Samiti, Gurukula & Rajasuya',
    prompt: 'What were Sabha, Samiti, the Gurukula system, and the Rajasuya ceremony?',
    answer: 'Sabha was a selective council of elders/nobles, while Samiti was a popular general assembly. Gurukula was a residential forest ashram school where students served the guru and offered Gurudakshina. Rajasuya was a royal consecration yajna performed at coronation.',
    memoryTip: 'Sabha = council of elders. Samiti = general folk assembly. Gurukula = forest residential education + Gurudakshina. Rajasuya = royal consecration yajna.',
    examples: 'In the Later Vedic period, the Trimurti (Brahma, Vishnu, Shiva) became prominent in sacrificial rites.'
  }
];

export const SHIZA_HISTORY_LESSON: HistoryLesson = {
  id: 'history-grade-6-compendium',
  grade: 6,
  title: 'Grade 6 History & Civics Revision',
  sourceName: 'Social Studies Revision Notebook · Civics & History Study Compendium',
  memoryTip: 'Master Rural Local Self Government, Mesopotamian Civilization, and The Vedic Age through structured recall.',
  sections: HISTORY_SECTIONS,
  cards: historyCards,
  questions: [
    // ==========================================
    // PART 1: Rural Local Self Government (Civics)
    // ==========================================
    written(
      'g6-hist-part1-qa-1',
      'rural-local-self-government',
      'What is a Village Panchayat?',
      'The Village Panchayat is a local administrative committee of 7 to 30 members elected directly by the Gram Sabha. It holds office for a term of 5 years and is headed by the Sarpanch.',
      'Defines the Village Panchayat as a local administrative committee of 7 to 30 members elected by the Gram Sabha for a 5-year term, headed by the Sarpanch.',
      'The Village Panchayat is an elected executive committee of 7 to 30 members chosen by the Gram Sabha for a 5-year term, headed by the Sarpanch.',
      [
        'A local administrative committee of 7 to 30 members elected directly by the Gram Sabha, holding office for 5 years and headed by the Sarpanch.',
        'The Village Panchayat is a local administrative body of 7 to 30 members elected by the Gram Sabha for a term of 5 years, headed by the Sarpanch.',
        'A local committee of 7 to 30 members elected directly by the Gram Sabha for a term of 5 years, headed by the Sarpanch.',
        'An administrative committee of 7 to 30 members elected by the Gram Sabha for a 5 year term and headed by the Sarpanch.'
      ]
    ),
    written(
      'g6-hist-part1-qa-2',
      'rural-local-self-government',
      'What are the essential functions of the Village Panchayat?',
      'The primary functions essential for village welfare include: providing clean drinking water and sanitation facilities; registering and maintaining vital statistics (birth and death records); managing the day-to-day civic administration of the village; and upkeep and maintenance of general village infrastructure.',
      'Mentions essential functions: providing clean drinking water and sanitation, maintaining birth and death records, day-to-day civic administration, and upkeep of village infrastructure.',
      'Essential functions include clean drinking water and sanitation, maintaining vital statistics (birth and death records), managing civic administration, and maintaining village infrastructure.',
      [
        'Providing clean drinking water and sanitation facilities, registering and maintaining vital statistics (birth and death records), managing day-to-day civic administration, and upkeep and maintenance of village infrastructure.',
        'Clean drinking water and sanitation, birth and death records, day-to-day civic administration, and maintenance of village infrastructure.',
        '1. Providing clean drinking water and sanitation facilities. 2. Registering and maintaining vital statistics. 3. Managing day-to-day civic administration. 4. Upkeep and maintenance of general village infrastructure.'
      ]
    ),
    written(
      'g6-hist-part1-qa-3',
      'rural-local-self-government',
      'What are the functions of the Panchayat Samiti?',
      'The Panchayat Samiti functions at the block level. It plans and coordinates development activities among multiple villages, supervises the working of Village Panchayats, prepares development budgets, executes government welfare schemes, and promotes local public welfare.',
      'States that Panchayat Samiti operates at the block level, coordinates activities among villages, supervises Village Panchayats, prepares development budgets, executes welfare schemes, and promotes public welfare.',
      'Operating at the block level, the Panchayat Samiti coordinates multi-village development, supervises Village Panchayats, prepares budgets, and executes welfare schemes.',
      [
        'Functions at the block level: plans and coordinates development activities among multiple villages, supervises Village Panchayats, prepares development budgets, executes government welfare schemes, and promotes local public welfare.',
        'It functions at the block level, plans and coordinates development activities across villages, supervises Village Panchayats, prepares development budgets, and executes government welfare schemes.'
      ]
    ),
    written(
      'g6-hist-part1-qa-4',
      'rural-local-self-government',
      'What is the composition of the Zila Parishad?',
      'The Zila Parishad stands at the apex of the Panchayati Raj system at the district level. It is primarily composed of the chairpersons of all the Block Panchayat Samitis within the district.',
      'States that Zila Parishad is at the apex/district level of the Panchayati Raj system and is composed primarily of chairpersons of all Block Panchayat Samitis within the district.',
      'The Zila Parishad is the apex district-level tier, primarily composed of chairpersons of all Block Panchayat Samitis in the district.',
      [
        'It stands at the apex of the Panchayati Raj system at the district level, primarily composed of the chairpersons of all the Block Panchayat Samitis within the district.',
        'The Zila Parishad is at the district level (apex of Panchayati Raj) and consists of the chairpersons of all Block Panchayat Samitis within the district.',
        'Composed primarily of the chairpersons of all Block Panchayat Samitis within the district at the apex district level.'
      ]
    ),
    written(
      'g6-hist-part1-qa-5',
      'rural-local-self-government',
      'What is the importance of local self-government?',
      'Local self-government empowers citizens at the grassroot level to take direct part in national governance, fostering self-reliance and civic responsibility. It creates vital cooperation between urban and rural areas while significantly reducing the administrative burden on state governments through democratic decentralization.',
      'Explains that local self-government empowers grassroots citizens to participate in governance, fosters self-reliance and civic responsibility, promotes urban-rural cooperation, and reduces state administrative burdens through democratic decentralization.',
      'Local self-government enables grassroots participation in governance, builds self-reliance, and relieves state administrative burdens through decentralization.',
      [
        'It empowers citizens at the grassroots level to participate in national governance, fostering self-reliance and civic responsibility, and reduces the administrative burden on state governments through democratic decentralization.',
        'Empowers citizens at the grassroot level to take direct part in governance, fosters self-reliance and civic responsibility, creates cooperation between urban and rural areas, and reduces state administrative burden through democratic decentralization.'
      ]
    ),
    written(
      'g6-hist-part1-qa-6',
      'rural-local-self-government',
      'Mention any four compulsory functions of the Gram Panchayat.',
      'Four key compulsory functions of the Gram Panchayat are: provision and maintenance of clean drinking water sources; effective implementation of local development and welfare programs; registration and maintenance of birth and death records; and construction, repair, and maintenance of village roads, drains, and public buildings.',
      'Mentions four compulsory functions: clean drinking water sources, local development/welfare programs, birth and death records, and construction/repair of roads, drains, and public buildings.',
      'Four compulsory functions: clean drinking water, local development programs, birth and death records, and maintaining village roads, drains, and public buildings.',
      [
        '1. Provision and maintenance of clean drinking water sources. 2. Effective implementation of local development and welfare programs. 3. Registration and maintenance of birth and death records. 4. Construction, repair, and maintenance of village roads, drains, and public buildings.',
        'Clean drinking water sources, implementation of local development and welfare programs, birth and death records, and construction, repair, and maintenance of village roads, drains, and public buildings.',
        'Provision of clean drinking water, local development and welfare programs, registration of birth and death records, construction and maintenance of village roads, drains, and public buildings.'
      ]
    ),
    written(
      'g6-hist-part1-qa-7',
      'rural-local-self-government',
      'What is the three-tier system of Panchayati Raj? How does it help citizens?',
      'The three-tier structure comprises: 1. Gram Panchayat (Village level), 2. Panchayat Samiti (Block level), and 3. Zila Parishad (District level). It enables rural citizens—who may otherwise lack direct access to distant state or central administrations—to participate in decision-making, voice local grievances, and manage community affairs effectively.',
      'Identifies the three tiers (Gram Panchayat at village level, Panchayat Samiti at block level, Zila Parishad at district level) and explains how it enables rural citizens to participate in decision-making and manage community affairs.',
      'The three tiers are Gram Panchayat (village), Panchayat Samiti (block), and Zila Parishad (district). It allows rural citizens to voice grievances and participate directly in local decision-making.',
      [
        '1. Gram Panchayat (Village level), 2. Panchayat Samiti (Block level), 3. Zila Parishad (District level). It enables rural citizens to participate in decision-making, voice local grievances, and manage community affairs effectively.',
        'The three tiers are Gram Panchayat at village level, Panchayat Samiti at block level, and Zila Parishad at district level. It helps rural citizens participate in decision-making, voice grievances, and manage community affairs.',
        'Gram Panchayat (village), Panchayat Samiti (block), Zila Parishad (district). It empowers rural citizens to participate in local decision-making and resolve grievances.'
      ]
    ),
    written(
      'g6-hist-part1-qa-8',
      'rural-local-self-government',
      'Difference between Gram Sabha and Gram Panchayat',
      'Gram Sabha is the general body consisting of all registered adult voters residing in the village; it functions as the foundational legislative forum of rural democracy and is headed and presided over by the Sarpanch. Gram Panchayat is a small executive committee of elected representatives chosen by the Gram Sabha; it acts as the executive governing body responsible for day-to-day administrative duties, headed and administered by the Pradhan / Sarpanch and elected ward members.',
      'Distinguishes Gram Sabha (general body of all adult voters, legislative forum) from Gram Panchayat (small executive committee of elected representatives, administrative body).',
      'Gram Sabha is the legislative body of all adult village voters, while Gram Panchayat is the elected executive committee carrying out day-to-day administration.',
      [
        'Gram Sabha: general body of all registered adult voters in the village, functions as legislative forum, presided over by Sarpanch. Gram Panchayat: small executive committee of elected representatives chosen by Gram Sabha, responsible for day-to-day administration, headed by Pradhan/Sarpanch and ward members.',
        'Gram Sabha consists of all adult voters in the village (legislative body). Gram Panchayat is an elected executive committee of representatives chosen by Gram Sabha for administrative duties.',
        'Gram Sabha is the general body of all adult voters (legislative forum). Gram Panchayat is the executive governing body of elected representatives handling daily administration.'
      ]
    ),
    written(
      'g6-hist-part1-qa-9',
      'rural-local-self-government',
      'Write a short note on Nyaya Panchayat.',
      'A Nyaya Panchayat is a village-level judicial council designed to resolve minor civil and criminal disputes quickly, informally, and without heavy legal expenses. Its members are elected by the Gram Panchayat, ensuring swift, low-cost community justice.',
      'Explains that Nyaya Panchayat is a village-level judicial council resolving minor civil and criminal disputes swiftly and affordably, with members elected by the Gram Panchayat.',
      'A Nyaya Panchayat is a village judicial council elected by the Gram Panchayat to settle minor disputes swiftly, informally, and without heavy legal costs.',
      [
        'A village-level judicial council designed to resolve minor civil and criminal disputes quickly, informally, and without heavy legal expenses, with members elected by the Gram Panchayat.',
        'It is a village judicial body elected by the Gram Panchayat that settles minor civil and criminal disputes quickly, informally, and at low cost.'
      ]
    ),

    // ==========================================
    // PART 2: Mesopotamian Civilization (History • Chapter 2)
    // ==========================================
    written(
      'g6-hist-part2-qa-1',
      'mesopotamian-civilization',
      'Who constituted the middle class in Mesopotamian society?',
      'The middle class was comprised primarily of farmers, artisans, craftsmen, and traders.',
      'Identifies the middle class as consisting of farmers, artisans, craftsmen, and traders.',
      'In Mesopotamian society, farmers, artisans, craftsmen, and traders constituted the middle class.',
      [
        'Farmers, artisans, craftsmen, and traders.',
        'Farmers, artisans, craftsmen, traders',
        'Farmers, artisans, traders, and craftsmen.',
        'Artisans, craftsmen, farmers, and traders.'
      ]
    ),
    written(
      'g6-hist-part2-qa-2',
      'mesopotamian-civilization',
      'Name the three main civilizations that rose and fell in the Mesopotamian valley.',
      'The three major civilizations were Sumer, Babylon, and Assyria.',
      'Names Sumer, Babylon, and Assyria.',
      'The three primary civilizations of Mesopotamia were Sumer, Babylon, and Assyria.',
      [
        'Sumer, Babylon, and Assyria.',
        'Sumer, Babylon, Assyria',
        'Sumerian, Babylonian, and Assyrian.',
        'Sumerian, Babylonian, Assyrian',
        'Babylon, Sumer, Assyria',
        'Assyria, Babylon, Sumer'
      ]
    ),
    written(
      'g6-hist-part2-qa-3',
      'mesopotamian-civilization',
      'What was a Ziggurat?',
      'A Ziggurat was a monumental stepped temple tower where each successive level was smaller than the one below it. Besides serving as places of worship, Ziggurats functioned as astronomical observatories, grain storehouses (granaries), and commercial trade centers.',
      'Describes a Ziggurat as a monumental stepped temple tower and mentions its functions: place of worship, astronomical observatory, granary/grain storehouse, and commercial trade center.',
      'A Ziggurat was a tiered stepped temple tower serving as a place of worship, astronomical observatory, grain storehouse, and trade center.',
      [
        'A monumental stepped temple tower where each successive level was smaller than the one below it, functioning as a place of worship, astronomical observatory, granary, and trade center.',
        'A stepped temple tower with receding levels, used as a place of worship, astronomical observatory, grain storehouse, and commercial trade center.',
        'A monumental stepped temple tower used for worship, astronomical observations, grain storage, and trade.'
      ]
    ),
    written(
      'g6-hist-part2-qa-4',
      'mesopotamian-civilization',
      'Why is the Code of Hammurabi of historical significance?',
      'Issued by King Hammurabi of Babylon, it represents the world\'s earliest comprehensive written legal code, codified to establish strict social order and standard principles of justice.',
      'Notes it was issued by King Hammurabi of Babylon as the world\'s earliest comprehensive written legal code, establishing social order and standardized justice.',
      'The Code of Hammurabi is historically significant as the world\'s earliest comprehensive written legal code, established by King Hammurabi of Babylon.',
      [
        'Issued by King Hammurabi of Babylon, it represents the world\'s earliest comprehensive written legal code, establishing strict social order and standard principles of justice.',
        'It is the world\'s earliest comprehensive written legal code, issued by King Hammurabi of Babylon to establish social order and principles of justice.',
        'It was issued by King Hammurabi of Babylon and is the earliest known comprehensive written code of law, establishing social order and justice.'
      ]
    ),
    written(
      'g6-hist-part2-qa-5',
      'mesopotamian-civilization',
      'Why is Mesopotamia described as the "cradle and grave of many civilizations"?',
      'It is known as the "cradle" because the fertile region fostered the birth and growth of multiple pioneering human civilizations (Sumerians, Babylonians, Assyrians), and the "grave" because each of these powerful empires successively collapsed and became buried beneath its soil.',
      'Explains "cradle" because fertile land gave birth to multiple civilizations (Sumer, Babylon, Assyria) and "grave" because each empire successively fell and was buried beneath its soil.',
      'Mesopotamia is the "cradle" because it nurtured pioneering civilizations (Sumer, Babylon, Assyria) and the "grave" because each successive empire collapsed and was buried there.',
      [
        'It is called the cradle because the fertile region fostered the birth of multiple pioneering civilizations (Sumerians, Babylonians, Assyrians), and the grave because each empire successively collapsed and was buried beneath its soil.',
        'Cradle because it gave birth to multiple civilizations (Sumer, Babylon, Assyria), and grave because each successively collapsed and became buried beneath its soil.'
      ]
    ),
    written(
      'g6-hist-part2-qa-6',
      'mesopotamian-civilization',
      'How did the Mesopotamian civilization decline?',
      'The civilization underwent an abrupt decline primarily caused by environmental shifts. The river Euphrates repeatedly altered its course, leaving once-fertile centers stranded in arid desert conditions. Severe soil salinization and erosion caused major cities to be abandoned, gradually turning the region into a barren desert plain.',
      'Explains decline due to environmental shifts: Euphrates shifting course, leaving cities in arid desert, along with soil salinization and erosion leading to abandonment.',
      'Mesopotamia declined due to environmental shifts: the Euphrates shifted course, and severe soil salinization and erosion led to abandonment of cities.',
      [
        'The civilization declined due to environmental shifts: the river Euphrates repeatedly altered its course, leaving fertile centers in desert conditions, while severe soil salinization and erosion caused cities to be abandoned.',
        'Primarily caused by environmental shifts: the Euphrates changed its course, stranding cities in desert conditions, and severe soil salinization and erosion caused cities to be abandoned.'
      ]
    ),
    written(
      'g6-hist-part2-qa-7',
      'mesopotamian-civilization',
      'What architectural works were built by Nebuchadnezzar? Describe any one.',
      'King Nebuchadnezzar II undertook extensive reconstruction of Babylon, creating massive fortifications, gates, and palaces. His most celebrated work was the Hanging Gardens of Babylon, built to comfort his queen Amytis, who longed for the lush, tiered vegetation of her mountainous homeland.',
      'Mentions Nebuchadnezzar\'s fortifications, gates, and palaces in Babylon, and describes the Hanging Gardens of Babylon built for his queen Amytis.',
      'Nebuchadnezzar II built massive fortifications, gates, and palaces in Babylon, most notably the Hanging Gardens of Babylon built for Queen Amytis.',
      [
        'King Nebuchadnezzar II reconstructed Babylon with massive fortifications, gates, and palaces. His most celebrated work was the Hanging Gardens of Babylon, built to comfort Queen Amytis with tiered vegetation of her mountainous homeland.',
        'He built massive fortifications, gates, and palaces in Babylon, including the Hanging Gardens of Babylon, which he built for Queen Amytis who missed the green hills of her homeland.'
      ]
    ),
    written(
      'g6-hist-part2-qa-8',
      'mesopotamian-civilization',
      'Write a short note on Cuneiform script.',
      'Invented by the Sumerians, Cuneiform was one of the earliest writing systems in human history. Written from left to right, scribes used reed styluses to impress wedge-shaped characters into damp clay tablets, which were subsequently sun-dried or baked to create permanent records.',
      'Identifies Cuneiform as a Sumerian writing system written left-to-right using reed styluses to press wedge-shaped characters into clay tablets that were sun-dried or baked.',
      'Cuneiform was invented by the Sumerians as a wedge-shaped script written left-to-right on damp clay tablets with reed styluses and then baked or sun-dried.',
      [
        'Invented by the Sumerians, Cuneiform was an early writing system written from left to right using reed styluses to impress wedge-shaped characters into damp clay tablets, which were sun-dried or baked.',
        'A Sumerian wedge-shaped script written from left to right on damp clay tablets using a reed stylus, then dried in the sun or baked to form permanent records.'
      ]
    ),
    written(
      'g6-hist-part2-qa-9',
      'mesopotamian-civilization',
      'Give reasons: The main occupation of ancient Mesopotamia was agriculture.',
      'The civilization was cradled between the twin rivers—the Tigris and Euphrates. Annual floods deposited fertile silt over the floodplains, providing regular irrigation water and rich soil highly favorable for extensive farming.',
      'Explains that Mesopotamia was between the Tigris and Euphrates rivers, whose annual floods deposited fertile silt and provided irrigation water favorable for farming.',
      'The twin rivers Tigris and Euphrates flooded annually, leaving rich, fertile silt on floodplains and providing regular irrigation water for farming.',
      [
        'Because the civilization was cradled between the twin rivers Tigris and Euphrates, whose annual floods deposited fertile silt over the floodplains, providing irrigation water and rich soil favorable for farming.',
        'The Tigris and Euphrates rivers deposited fertile silt during annual floods, providing irrigation water and nutrient-rich soil that made agriculture the ideal main occupation.'
      ]
    ),
    written(
      'g6-hist-part2-qa-10',
      'mesopotamian-civilization',
      'Give reasons: Mesopotamian agricultural yields increased significantly over time.',
      'Yields expanded due to sophisticated irrigation planning. Engineers built extensive canal networks, dykes, and reservoirs to capture floodwaters and channel them efficiently to distant fields far from riverbanks.',
      'Attributes increased yields to sophisticated irrigation planning: canal networks, dykes, and reservoirs capturing floodwaters and delivering them to distant fields.',
      'Agricultural yields increased because engineers constructed extensive irrigation networks, including canals, dykes, and reservoirs, to channel floodwaters to distant fields.',
      [
        'Yields increased due to sophisticated irrigation planning, including canal networks, dykes, and reservoirs to capture floodwaters and channel them efficiently to distant fields.',
        'Because engineers built extensive canal networks, dykes, and reservoirs to capture and distribute floodwaters to fields far from the riverbanks.'
      ]
    ),

    // ==========================================
    // PART 3: The Vedic Civilization (History • Vedic Age)
    // ==========================================
    written(
      'g6-hist-part3-qa-1',
      'vedic-civilization',
      'Who were the Aryans?',
      'The Aryans were semi-nomadic pastoral groups who migrated from Central Asia into the Indian subcontinent around 1500 BCE, bringing their distinct language, rituals, and cultural traditions.',
      'Defines Aryans as semi-nomadic pastoral groups who migrated from Central Asia into the Indian subcontinent around 1500 BCE, bringing their language, rituals, and culture.',
      'The Aryans were semi-nomadic pastoralists who migrated from Central Asia into India around 1500 BCE with their language, rituals, and traditions.',
      [
        'Semi-nomadic pastoral groups who migrated from Central Asia into the Indian subcontinent around 1500 BCE, bringing their distinct language, rituals, and cultural traditions.',
        'The Aryans were pastoral semi-nomadic people who migrated from Central Asia into the Indian subcontinent around 1500 BCE.',
        'Pastoral semi-nomads from Central Asia who migrated into India around 1500 BCE, introducing their Vedic language and culture.'
      ]
    ),
    written(
      'g6-hist-part3-qa-2',
      'vedic-civilization',
      'What is the Rigveda?',
      'The Rigveda is the oldest known religious text of the Vedic tradition, composed during the Early Vedic period. It contains 1,028 sacred hymns (suktas) and mantras addressed to personified forces of nature and various deities.',
      'Identifies Rigveda as the oldest Vedic text from the Early Vedic period containing 1,028 hymns (suktas) and mantras dedicated to nature deities.',
      'The Rigveda is the oldest Vedic religious text, composed in the Early Vedic period with 1,028 hymns (suktas) addressed to personified forces of nature.',
      [
        'The oldest known religious text of the Vedic tradition, composed during the Early Vedic period, containing 1,028 sacred hymns (suktas) and mantras addressed to personified forces of nature and deities.',
        'It is the oldest Vedic text, composed in the Early Vedic period, containing 1,028 sacred hymns (suktas) and mantras addressed to nature gods.',
        'The oldest Vedic sacred text containing 1,028 hymns (suktas) dedicated to forces of nature and deities, composed during the Early Vedic period.'
      ]
    ),
    written(
      'g6-hist-part3-qa-3',
      'vedic-civilization',
      'Difference between Sabha and Samiti',
      'Sabha was a selective assembly of respected elders, eminent nobles, and learned scholars that advised the king on judicial and internal policy matters, checking royal autocracy. Samiti was a broad popular folk assembly representing common citizens and tribal elders that discussed broad political concerns, war decisions, and the election of the king.',
      'Distinguishes Sabha (selective assembly of elders/nobles advising on judicial/internal matters) from Samiti (broad folk assembly representing common citizens discussing politics, war, and electing the king).',
      'The Sabha was a selective council of elders advising on judicial matters, whereas the Samiti was a general assembly representing common citizens for political decisions and king elections.',
      [
        'Sabha: selective assembly of respected elders, eminent nobles, and scholars advising the king on judicial and policy matters. Samiti: broad popular folk assembly representing common citizens discussing politics, war, and the election of the king.',
        'Sabha was a council of elders and nobles advising the king on judicial matters. Samiti was a general assembly of common citizens discussing political affairs, war, and electing the king.',
        'Sabha was an assembly of elders checking royal power and advising on justice. Samiti was a broad folk assembly representing the common people that discussed politics and elected the king.'
      ]
    ),
    written(
      'g6-hist-part3-qa-4',
      'vedic-civilization',
      'Who were the Brahmans?',
      'The Brahmans formed the priestly, scholarly, and intellectual class responsible for preserving oral traditions, reciting Vedic hymns, imparting education, and performing solemn religious sacrifices.',
      'Describes Brahmans as the priestly, scholarly, and intellectual class responsible for preserving oral traditions, reciting Vedic hymns, education, and performing religious sacrifices.',
      'Brahmans were the priestly and scholarly class in Vedic society who performed sacrifices, recited Vedic hymns, and educated students.',
      [
        'The priestly, scholarly, and intellectual class responsible for preserving oral traditions, reciting Vedic hymns, imparting education, and performing solemn religious sacrifices.',
        'They formed the priestly and scholarly class responsible for teaching, reciting Vedic hymns, preserving oral traditions, and conducting sacrifices.',
        'The priestly and intellectual class who performed religious sacrifices, chanted hymns, preserved sacred texts, and imparted education.'
      ]
    ),
    written(
      'g6-hist-part3-qa-5',
      'vedic-civilization',
      'What were the leisure and recreational activities of the Aryans?',
      'Recreational pursuits included chariot racing, hunting, singing, dancing, playing musical instruments (lutes and flutes), and dice games.',
      'Lists recreational pursuits: chariot racing, hunting, singing, dancing, playing musical instruments (lutes and flutes), and dice games.',
      'Aryan leisure activities included chariot racing, hunting, singing, dancing, playing musical instruments like lutes and flutes, and dice games.',
      [
        'Chariot racing, hunting, singing, dancing, playing musical instruments (lutes and flutes), and dice games.',
        'Chariot racing, hunting, singing, dancing, playing lutes and flutes, and dice games.',
        'Chariot racing, hunting, singing, dancing, music (lutes and flutes), and dice.'
      ]
    ),
    written(
      'g6-hist-part3-qa-6',
      'vedic-civilization',
      'List the four Ashramas (stages of life).',
      'The four prescribed ashramas are: 1. Brahmacharya: The stage of celibate studenthood and learning; 2. Grihastha: The householder stage devoted to family, work, and community; 3. Vanaprastha: The stage of gradual retirement and spiritual contemplation; and 4. Sanyasa: The final stage of total renunciation and ascetic pursuit of liberation.',
      'Lists all four stages: Brahmacharya (studenthood/learning), Grihastha (householder/family), Vanaprastha (retirement/contemplation), and Sanyasa (total renunciation/liberation).',
      'The four Ashramas are Brahmacharya (student), Grihastha (householder), Vanaprastha (retirement), and Sanyasa (renunciation).',
      [
        '1. Brahmacharya (studenthood and learning), 2. Grihastha (householder stage), 3. Vanaprastha (retirement and contemplation), 4. Sanyasa (total renunciation and liberation).',
        'Brahmacharya, Grihastha, Vanaprastha, and Sanyasa.',
        'Brahmacharya, Grihastha, Vanaprastha, Sanyasa',
        '1. Brahmacharya: celibate studenthood. 2. Grihastha: householder stage. 3. Vanaprastha: gradual retirement. 4. Sanyasa: total renunciation.'
      ]
    ),
    written(
      'g6-hist-part3-qa-7',
      'vedic-civilization',
      'Name the prominent deities worshipped during the Later Vedic Age.',
      'While early nature gods receded, the Later Vedic period witnessed the ascendance of the Trinity: Brahma (the Creator), Vishnu (the Preserver), and Shiva / Rudra (the Destroyer).',
      'Names the Trinity: Brahma (the Creator), Vishnu (the Preserver), and Shiva / Rudra (the Destroyer).',
      'During the Later Vedic Age, the Hindu Trinity of Brahma (Creator), Vishnu (Preserver), and Shiva/Rudra (Destroyer) was prominently worshipped.',
      [
        'Brahma (the Creator), Vishnu (the Preserver), and Shiva / Rudra (the Destroyer).',
        'Brahma, Vishnu, and Shiva (or Rudra).',
        'Brahma, Vishnu, and Shiva',
        'Brahma, Vishnu, Shiva',
        'Brahma (Creator), Vishnu (Preserver), Shiva/Rudra (Destroyer)'
      ]
    ),
    written(
      'g6-hist-part3-qa-8',
      'vedic-civilization',
      'What does the Yajurveda contain?',
      'The Yajurveda contains liturgical prose, rituals, mantras, and practical instructions formulated specifically for priests officiating complex Vedic sacrifices and ceremonies.',
      'Mentions that Yajurveda contains liturgical prose, rituals, mantras, and practical instructions for priests officiating complex sacrifices.',
      'The Yajurveda contains liturgical prose, mantras, and ritual procedures formulated for priests performing sacrifices and ceremonies.',
      [
        'It contains liturgical prose, rituals, mantras, and practical instructions formulated specifically for priests officiating complex Vedic sacrifices and ceremonies.',
        'Liturgical prose, rituals, mantras, and practical instructions for priests conducting Vedic sacrifices.',
        'Sacrificial rituals, mantras, and liturgical prose for priests officiating ceremonies.'
      ]
    ),
    written(
      'g6-hist-part3-qa-9',
      'vedic-civilization',
      'How and when did the Aryans arrive and settle in India?',
      'Around 1500 BCE, coinciding with the gradual collapse of the urban Indus Valley Civilization, pastoral Indo-Aryan groups crossed the northwestern mountain passes into India. They initially settled in the Sapta-Sindhu (land of the seven rivers), naming it Brahmavarta. As populations grew and iron tools were introduced, they cleared forests eastward along the fertile Gangetic plain, designating the broader northern realm Aryavarta.',
      'Explains arrival around 1500 BCE via northwestern passes, initial settlement in Sapta-Sindhu (Brahmavarta), and expansion eastward into the Gangetic plain (Aryavarta) using iron tools.',
      'Aryans arrived around 1500 BCE through northwestern passes, settled first in the Sapta-Sindhu (Brahmavarta), and later cleared Gangetic forests with iron tools to settle Aryavarta.',
      [
        'Around 1500 BCE, pastoral Indo-Aryan groups crossed northwestern mountain passes into India. They first settled in Sapta-Sindhu (Brahmavarta), and later expanded eastward along the Gangetic plain using iron tools, forming Aryavarta.',
        'Around 1500 BCE, Aryans entered India through northwestern passes, initially settling in Sapta-Sindhu (Brahmavarta) and later moving eastward along the Gangetic plain using iron tools to settle Aryavarta.'
      ]
    ),
    written(
      'g6-hist-part3-qa-10',
      'vedic-civilization',
      'Describe the social life of the Rig Vedic Age.',
      'Early Vedic society was patriarchal and centered upon the joint family system, headed by the eldest male, the Grihapati. Women held a respectable position, had access to education, and actively participated in religious rituals. The varna system was based upon occupation rather than birth and was relatively open and flexible: Brahmans (priests and scholars), Kshatriyas (rulers and warrior defenders), Vaishyas (farmers, pastoralists, and merchants), and Shudras (laborers and artisans serving the community).',
      'Covers patriarchal joint family led by Grihapati, respectful status of women (education, rituals), and an occupation-based flexible varna system (Brahmans, Kshatriyas, Vaishyas, Shudras).',
      'Rig Vedic society was patriarchal under the Grihapati, respected women, and had a flexible four-fold varna system based on occupation rather than birth.',
      [
        'Early Vedic society was patriarchal with a joint family system led by the Grihapati. Women enjoyed a respectable position, had education, and joined rituals. The varna system was based on occupation: Brahmans (priests/scholars), Kshatriyas (warriors/rulers), Vaishyas (farmers/merchants), and Shudras (laborers/artisans).',
        'Patriarchal joint family led by the Grihapati; women held respectable positions and had access to education and rituals; flexible varna system based on occupation: Brahmans, Kshatriyas, Vaishyas, and Shudras.'
      ]
    ),
    written(
      'g6-hist-part3-qa-11',
      'vedic-civilization',
      'Explain the religious practices of the Aryans during the Early and Later Vedic periods.',
      'Early Vedic Period: Religion was simple, direct, and centered on worshipping natural phenomena as anthropomorphic deities (e.g., Agni, Indra, Varuna, Surya). Prayers were recited openly, accompanied by simple offerings of milk, grain, and clarified butter. Later Vedic Period: Ritual practices grew increasingly elaborate, rigid, and expensive. The worship of the Trimurti (Brahma, Vishnu, Shiva) gained prominence, and sacrificial rites (yajnas) became deeply ritualistic, requiring specialized Brahman priests.',
      'Contrasts simple Early Vedic worship of nature gods (Agni, Indra, Varuna) with simple milk/grain offerings against rigid, elaborate Later Vedic yajnas worshipping the Trimurti (Brahma, Vishnu, Shiva) led by Brahman priests.',
      'Early Vedic religion was simple nature worship (Agni, Indra) with milk and grain offerings. Later Vedic religion became rigid and elaborate with expensive yajnas, specialized priests, and worship of the Trimurti.',
      [
        'Early Vedic: simple worship of natural forces (Agni, Indra, Varuna, Surya) with open prayers and simple offerings like milk, grain, and butter. Later Vedic: elaborate, rigid, and expensive rituals, emergence of the Trimurti (Brahma, Vishnu, Shiva), and complex yajnas requiring specialized Brahman priests.',
        'In the Early Vedic period, Aryans simply worshipped nature gods with offerings of milk and grain. In the Later Vedic period, rituals became elaborate, expensive, and priest-dominated, focusing on the Trimurti.'
      ]
    ),
    written(
      'g6-hist-part3-qa-12',
      'vedic-civilization',
      'What was the Gurukula system of education?',
      'The Gurukula was a residential schooling system where disciples left home to reside in their teacher\'s forest hermitage (ashram). Students rendered daily domestic assistance to maintain the hermitage while acquiring knowledge in diverse fields such as philosophy, grammar, mathematics, astronomy, warfare, and logic. Education was provided without fixed monetary fees; upon completing their studies, students offered a voluntary parting tribute known as Gurudakshina.',
      'Describes Gurukula as a residential forest hermitage (ashram) system where students served the guru, studied subjects like philosophy, grammar, mathematics, warfare, and gave Gurudakshina instead of fees.',
      'The Gurukula was a residential forest ashram school where students lived with their guru, helped maintain the hermitage, studied various subjects, and offered Gurudakshina without fixed fees.',
      [
        'A residential schooling system where students lived in their teacher\'s forest ashram, helping with daily chores while learning philosophy, grammar, mathematics, astronomy, warfare, and logic, paying no fixed fees but offering Gurudakshina at completion.',
        'Disciples lived at their guru\'s forest ashram, providing domestic help while studying diverse subjects like philosophy, math, astronomy, and warfare, offering voluntary Gurudakshina instead of fees.'
      ]
    ),
    written(
      'g6-hist-part3-qa-13',
      'vedic-civilization',
      'Why is the Later Vedic Period also known as the Epic Age?',
      'This epoch witnessed the composition and consolidation of India\'s two monumental Sanskrit epics, the Ramayana and the Mahabharata, which vividly depict the sociopolitical, philosophical, and moral fabric of the era.',
      'Explains that the two great Sanskrit epics, the Ramayana and the Mahabharata, were composed and consolidated during this period.',
      'It is known as the Epic Age because the two great Indian Sanskrit epics, the Ramayana and Mahabharata, were composed during this era.',
      [
        'Because India\'s two monumental Sanskrit epics, the Ramayana and the Mahabharata, were composed and consolidated during this period.',
        'It is called the Epic Age because the two monumental Sanskrit epics, the Ramayana and the Mahabharata, were composed during this era.',
        'Because the great Sanskrit epics, Ramayana and Mahabharata, were written and compiled during this period.'
      ]
    ),
    written(
      'g6-hist-part3-qa-14',
      'vedic-civilization',
      'Why was the Rajasuya ceremony performed?',
      'The Rajasuya yajna was a major royal consecration ritual performed during a monarch\'s coronation. It served to proclaim his supreme sovereignty, legitimize his dynastic authority over neighboring rulers, and secure divine blessing for his reign.',
      'Explains that the Rajasuya ceremony was a royal consecration ritual performed during coronation to proclaim sovereignty, legitimize authority, and secure divine blessing.',
      'The Rajasuya ceremony was performed during a king\'s coronation to proclaim supreme sovereignty, legitimize power over neighboring rulers, and seek divine blessing.',
      [
        'It was a major royal consecration ritual performed during a monarch\'s coronation to proclaim supreme sovereignty, legitimize dynastic authority over neighboring rulers, and secure divine blessing.',
        'Performed during a monarch\'s coronation as a consecration ritual to proclaim supreme sovereignty and seek divine blessing for his reign.',
        'To proclaim a king\'s supreme sovereignty, legitimize his rule over neighboring monarchs, and receive divine blessings at his coronation.'
      ]
    )
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
    .replace(/[’‘]/g, "'")
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
