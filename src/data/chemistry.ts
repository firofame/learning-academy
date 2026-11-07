import { StudentId } from '../types';
import { getStudentProfile } from './profiles';

export type ChemistrySectionId =
  | 'introduction'
  | 'matter'
  | 'elements-and-compounds';

export interface ChemistrySection {
  id: ChemistrySectionId;
  chapterNumber: number;
  label: string;
  topic: string;
}

export const CHEMISTRY_SECTIONS: ChemistrySection[] = [
  { id: 'introduction', chapterNumber: 1, label: 'Chapter 1 · Introduction to Chemistry', topic: 'Introduction to Chemistry' },
  { id: 'matter', chapterNumber: 2, label: 'Chapter 2 · Matter and Its States', topic: 'Matter and Its States' },
  { id: 'elements-and-compounds', chapterNumber: 3, label: 'Chapter 3 · Elements and Compounds', topic: 'Elements and Compounds' }
];

export interface ChemistryCard {
  id: string;
  section: ChemistrySectionId;
  title: string;
  prompt: string;
  answer: string;
  memoryTip: string;
  examples?: string;
}

interface QuestionBase {
  id: string;
  section: ChemistrySectionId;
  prompt: string;
  answer: string;
  explanation: string;
}

export type ChemistryQuestion =
  | (QuestionBase & { kind: 'written'; acceptedAnswers: string[]; markingCriteria: string });

export interface ChemistryLesson {
  id: string;
  grade: number;
  title: string;
  sourceName: string;
  memoryTip: string;
  sections: ChemistrySection[];
  cards: ChemistryCard[];
  questions: ChemistryQuestion[];
}

const written = (
  id: string,
  section: ChemistrySectionId,
  prompt: string,
  answer: string,
  markingCriteria: string,
  explanation: string,
  aliases: string[] = []
): ChemistryQuestion => ({
  id,
  section,
  kind: 'written',
  prompt,
  answer,
  acceptedAnswers: [answer, ...aliases],
  markingCriteria,
  explanation
});

const chemistryCards: ChemistryCard[] = [
  {
    id: 'g6-chem-card-science-branches',
    section: 'introduction',
    title: 'Science & Its Primary Branches',
    prompt: 'What is science and what are its primary branches?',
    answer: 'Science is the systematic process of acquiring knowledge about the universe through keen observation and rigorous experimentation. It is broadly classified into three main branches: Physics, Chemistry, and Biology.',
    memoryTip: 'Science = keen observation + rigorous experimentation. 3 branches: Physics, Chemistry, Biology.',
    examples: 'Observation and experimentation form the core scientific method.'
  },
  {
    id: 'g6-chem-card-chemistry-definition',
    section: 'introduction',
    title: 'Definition of Chemistry',
    prompt: 'What is chemistry?',
    answer: 'Chemistry is the specialized branch of science that investigates the composition, molecular structure, properties, and reactions of matter.',
    memoryTip: 'Chemistry investigates: 1. Composition, 2. Molecular structure, 3. Properties, 4. Reactions of matter.',
    examples: 'Explores how atoms combine and react to form new substances.'
  },
  {
    id: 'g6-chem-card-alchemy',
    section: 'introduction',
    title: 'Alchemists & Practical Foundations',
    prompt: 'What was the goal of alchemists and what techniques did they contribute?',
    answer: 'The ultimate goal of alchemists was to discover a mystical substance called the Philosopher\'s Stone, believed to transform base metals like copper and iron into gold. In their pursuit, they laid important foundations for practical chemistry by preparing artificial pearls and developing various metallic alloys.',
    memoryTip: 'Alchemists = Philosopher\'s Stone (copper/iron -> gold). Contributions: artificial pearls & metallic alloys.',
    examples: 'Alchemy was the historical predecessor of modern scientific chemistry.'
  },
  {
    id: 'g6-chem-card-agriculture-food',
    section: 'introduction',
    title: 'Chemistry in Agriculture & Food Preservation',
    prompt: 'How does chemistry contribute to agriculture and food preservation?',
    answer: 'In Agriculture: Chemistry synthesizes vital inorganic fertilizers (urea, nitrates) to increase crop productivity, and protective pesticides (e.g. malathion), insecticides, and fungicides that prevent disease and crop failure. In Food: Food preservatives (e.g. benzoic acid, sodium bisulphite) are chemical agents added to consumables to prevent bacterial decomposition and spoilage by inhibiting microorganisms.',
    memoryTip: 'Fertilizers: urea, nitrates. Pesticide: Malathion. Preservatives: Benzoic acid, Sodium bisulphite.',
    examples: 'Pesticides suppress pests, weeds, and pathogens that damage crops.'
  },
  {
    id: 'g6-chem-card-clothing-textiles',
    section: 'introduction',
    title: 'Chemistry in Clothing & Textiles',
    prompt: 'What synthetic fibres has chemistry pioneered in the textile industry?',
    answer: 'Chemistry has pioneered durable synthetic fibres including Nylon, Terylene, Polyester, and Rayon. These engineered fabrics are lightweight, exceptionally strong, and naturally wrinkle-resistant.',
    memoryTip: 'Synthetic fibres: Nylon, Terylene, Polyester, Rayon. Properties: lightweight, strong, wrinkle-resistant.',
    examples: 'Synthetic fabrics offer high tensile strength and durability.'
  },
  {
    id: 'g6-chem-card-matter-particles',
    section: 'matter',
    title: 'Matter & Molecular Examples',
    prompt: 'What is matter and what are examples of molecules?',
    answer: 'Matter is anything that possesses mass, occupies space (volume), and can be perceived by the senses. Matter is composed of minute particles called atoms or molecules. Examples: An oxygen molecule (O2) consists of 2 oxygen atoms. A water molecule (H2O) consists of 2 hydrogen atoms bonded to 1 oxygen atom.',
    memoryTip: 'Matter = mass + occupies volume + perceived by senses. O2 = 2 O atoms; H2O = 2 H + 1 O.',
    examples: 'All living and non-living substances around us are forms of matter.'
  },
  {
    id: 'g6-chem-card-states-comparison',
    section: 'matter',
    title: 'Comparison: Packing of Molecules in Solids, Liquids & Gases',
    prompt: 'How do solids, liquids, and gases compare across molecular properties?',
    answer: 'Solids: Closely packed rigid geometry; minimum space; extremely strong attraction; definite shape & fixed volume; incompressible. Liquids: Less closely packed (free to slide); moderate space; moderate/weak attraction; no fixed shape (takes container\'s shape) & fixed volume; almost incompressible. Gases: Very loosely packed (vast empty distances); maximum space; negligible attraction; no definite shape & no definite volume; highly compressible under pressure.',
    memoryTip: 'Solids: rigid/fixed. Liquids: slide/fluid. Gases: vast space/highly compressible.',
    examples: 'Ice (solid), water (liquid), and steam (gas) illustrate the three states.'
  },
  {
    id: 'g6-chem-card-interconversion',
    section: 'matter',
    title: 'Interconversion of States of Matter',
    prompt: 'How do the three states of matter interconvert?',
    answer: 'Solid (Ice) ⇌ (Melting / Freezing) ⇌ Liquid (Water) ⇌ (Boiling / Condensation) ⇌ Gas (Steam). Solid ⇌ (Sublimation / Deposition) ⇌ Gas.',
    memoryTip: 'Solid <-> Liquid: melting/freezing. Liquid <-> Gas: boiling/condensation. Solid <-> Gas: sublimation/deposition.',
    examples: 'Dry ice and iodine undergo sublimation directly from solid to gas.'
  },
  {
    id: 'g6-chem-card-particle-characteristics',
    section: 'matter',
    title: 'Characteristics of Particles & Brownian Motion',
    prompt: 'What are the characteristics of particles of matter and what is Brownian motion?',
    answer: 'Particles of matter are extraordinarily small, possess intermolecular spaces between them, exert mutual attractive forces, and remain in continuous, random, zig-zag motion known as Brownian motion.',
    memoryTip: 'Particles: tiny, spaced, mutually attracting, in continuous random zig-zag motion (Brownian motion).',
    examples: 'Pollen grains dancing on water droplets demonstrate Brownian motion.'
  },
  {
    id: 'g6-chem-card-expansion-rigidity',
    section: 'matter',
    title: 'Thermal Expansion/Contraction & Rigidity of Solids',
    prompt: 'Why do substances expand on heating and contract on cooling, and why are solids rigid?',
    answer: 'Heating increases kinetic energy and vigorous molecular movement, widening intermolecular spaces and causing expansion. Cooling decreases kinetic energy, pulling particles closer together and causing contraction. Solids are rigid because intermolecular attractive forces are exceptionally strong and intermolecular spaces are negligible, locking particles into fixed positions.',
    memoryTip: 'Heat -> higher kinetic energy -> wider spaces -> expands. Cool -> particles closer -> contracts. Solids: strong forces lock particles in fixed positions.',
    examples: 'Metal tracks have expansion gaps to accommodate thermal expansion.'
  },
  {
    id: 'g6-chem-card-elements-overview',
    section: 'elements-and-compounds',
    title: 'Elements Overview & Classification',
    prompt: 'How many elements are known and how are they classified?',
    answer: 'A total of 118 elements are known today: 92 occur naturally in the Earth\'s crust and atmosphere, while 26 are synthetic (man-made / artificial elements) synthesized in laboratories. Elements are classified into Metals (e.g. Na, Hg, Zn, Ag), Non-Metals (e.g. O, N, C, Br), and Metalloids (e.g. Si, As, Sb, Ge).',
    memoryTip: '118 elements = 92 natural + 26 synthetic. Three classes: Metals, Non-Metals, Metalloids.',
    examples: 'Silicon and Germanium are metalloids used extensively in semiconductors.'
  },
  {
    id: 'g6-chem-card-definitions-atomicity',
    section: 'elements-and-compounds',
    title: 'Metalloids, Noble Gases & Atomicity',
    prompt: 'What are metalloids, noble gases, and atomicity?',
    answer: 'Metalloids: Elements exhibiting intermediate properties between metals and non-metals (Silicon, Arsenic, Antimony). Noble Gases: Unreactive, monoatomic gaseous elements in Group 18 possessing stable electron structures that do not readily form chemical bonds (Helium, Neon, Argon). Atomicity: The total number of constituent atoms present in a single molecule of an element (Monoatomic: He, Ar; Diatomic: O2, N2; Triatomic: O3).',
    memoryTip: 'Noble gases = Group 18 inert monoatomic gases. Atomicity = number of atoms in an element\'s molecule.',
    examples: 'Ozone (O3) has an atomicity of 3 (triatomic).'
  },
  {
    id: 'g6-chem-card-quick-facts',
    section: 'elements-and-compounds',
    title: 'Quick Facts & Scientific Identifications',
    prompt: 'What are notable element properties and exceptions?',
    answer: 'Liquid metal at room temp: Mercury (Hg). Soft alkali metals sliced with a knife: Sodium (Na) and Potassium (K). Non-malleable, brittle metal: Zinc (Zn). Liquid non-metal at room temp: Bromine (Br). Malleability: property of metals allowing them to be hammered into thin sheets. Ductility: property of metals allowing them to be drawn into thin wires. Brass: alloy of Copper (Cu) and Zinc (Zn). Carbon allotropes: Charcoal, Coal, Diamond, and Graphite.',
    memoryTip: 'Liquid metal = Mercury. Liquid non-metal = Bromine. Soft metals = Sodium & Potassium. Brass = Cu + Zn.',
    examples: 'Gold has high malleability and ductility, making it ideal for thin leaf and wires.'
  },
  {
    id: 'g6-chem-card-applications-give-reasons',
    section: 'elements-and-compounds',
    title: 'Practical Applications & Scientific Reasoning',
    prompt: 'Why are specific elements used for lamps, wires, cookware, and jewellery?',
    answer: 'Argon/Neon in lamps: chemically inert; prevent glowing tungsten filament from oxidizing or burning out. Copper in wiring: exceptionally low resistance, high electrical conductivity, and excellent ductility. Steel pans with wood/bakelite handles: steel is an efficient thermal conductor rapidly distributing heat to food, while wood/bakelite is a thermal insulator preventing burns. Gold in wirework jewellery: permanent brilliant lustre, non-reactive (does not tarnish/rust), and outstanding ductility for microscopic wire threads.',
    memoryTip: 'Argon/Neon = inert/prevent oxidation. Copper = low resistance + ductile. Pan handles = insulator. Gold = lustre + rustproof + ductile.',
    examples: 'Graphite is used as pencil lead, high-temperature industrial lubricant, and electrode material.'
  },
  {
    id: 'g6-chem-card-compounds-properties',
    section: 'elements-and-compounds',
    title: 'Properties of Compounds & Molecules Comparison',
    prompt: 'What are fundamental properties of compounds and how do molecules of elements differ from compounds?',
    answer: 'Compounds: 1. Pure, homogeneous substances composed of 2+ elements. 2. Elements chemically bonded in unalterable definite ratio by mass (in H2O, H and O combine in constant 1:8 mass ratio). 3. Cannot be separated physically; only by chemical/electrochemical reactions. 4. Exhibit properties entirely distinct from constituent elements. 5. Chemical energy is absorbed or released during formation. Molecules of elements: atoms of same single element (O2, Cl2, Br2, I2, N2, H2). Molecules of compounds: atoms of 2+ different elements in fixed ratio (CO2, NO2, H2O, HCl, CaO, C6H12O6).',
    memoryTip: 'Compounds: definite mass ratio (H2O is 1:8), distinct properties, chemical separation only. Element molecule = same atoms; Compound molecule = different elements.',
    examples: 'Water (liquid) has distinct properties from hydrogen (flammable gas) and oxygen (supporter of combustion).'
  }
];

export const SHIZA_CHEMISTRY_LESSON: ChemistryLesson = {
  id: 'chemistry-grade-6-chapters-1-3',
  grade: 6,
  title: 'Grade 6 Chemistry Revision',
  sourceName: 'Chemistry Revision Notes & Question Bank (Chapters 1 to 3)',
  memoryTip: 'Matter, elements, compounds, and practical applications in society.',
  sections: CHEMISTRY_SECTIONS,
  cards: chemistryCards,
  questions: [
    // ---------------- Chapter 1: Introduction to Chemistry (1 - 7) ----------------
    written(
      'g6-chem-ch1-qa-1',
      'introduction',
      'What is science? Name its three primary branches.',
      'Science is the systematic process of acquiring knowledge about the universe through keen observation and rigorous experimentation. Its three primary branches are Physics, Chemistry, and Biology.',
      'Defines science as the systematic process of acquiring knowledge about the universe through keen observation and rigorous experimentation, and names Physics, Chemistry, and Biology.',
      'Science acquires knowledge through keen observation and experimentation, classified into Physics, Chemistry, and Biology.',
      [
        'Science is the systematic process of acquiring knowledge about the universe through keen observation and rigorous experimentation. Primary branches: Physics, Chemistry, and Biology.',
        'Science is the systematic process of acquiring knowledge about the universe through observation and experimentation. The three branches are Physics, Chemistry, and Biology.',
        'The systematic process of acquiring knowledge about the universe through keen observation and rigorous experimentation. Physics, Chemistry, and Biology.',
        'Physics, Chemistry, and Biology',
        'Physics, Chemistry, Biology'
      ]
    ),
    written(
      'g6-chem-ch1-qa-2',
      'introduction',
      'Define chemistry.',
      'Chemistry is the specialized branch of science that investigates the composition, molecular structure, properties, and reactions of matter.',
      'Defines chemistry as the specialized branch of science investigating the composition, molecular structure, properties, and reactions of matter.',
      'Chemistry investigates the composition, molecular structure, properties, and reactions of matter.',
      [
        'The specialized branch of science that investigates the composition, molecular structure, properties, and reactions of matter.',
        'Branch of science that investigates the composition, molecular structure, properties, and reactions of matter.',
        'Chemistry investigates the composition, molecular structure, properties, and reactions of matter.',
        'The branch of science that investigates the composition, molecular structure, properties, and reactions of matter'
      ]
    ),
    written(
      'g6-chem-ch1-qa-3',
      'introduction',
      'What was the ultimate goal of alchemists? Name any two techniques or contributions developed by them.',
      "The ultimate goal of alchemists was to discover a mystical substance called the Philosopher's Stone, believed to transform base metals like copper and iron into gold. Along their pursuit, they laid important foundations for practical chemistry by preparing artificial pearls and developing various metallic alloys.",
      "Identifies the Philosopher's Stone and transforming base metals (copper, iron) into gold as the goal, and names preparing artificial pearls and developing metallic alloys as two contributions.",
      "Alchemists sought the Philosopher's Stone to turn base metals into gold, contributing artificial pearls and metallic alloys.",
      [
        "The ultimate goal of alchemists was to discover the Philosopher's Stone to transform base metals into gold. Contributions: preparing artificial pearls and developing various metallic alloys.",
        "To discover the Philosopher's Stone to transform base metals like copper and iron into gold. Contributions: preparing artificial pearls and developing metallic alloys.",
        "To find the Philosopher's Stone to transform base metals into gold. They prepared artificial pearls and developed metallic alloys.",
        "Discover Philosopher's Stone to turn copper and iron into gold; prepared artificial pearls and developed metallic alloys."
      ]
    ),
    written(
      'g6-chem-ch1-qa-4',
      'introduction',
      'What are pesticides? Give an example.',
      'Pesticides are toxic chemical substances formulated to destroy or suppress pests, weeds, and pathogens that damage agricultural crops and reduce crop yields. Example: Malathion.',
      'Defines pesticides as toxic chemical substances formulated to destroy/suppress pests, weeds, and pathogens that damage agricultural crops, and provides Malathion as an example.',
      'Pesticides destroy or suppress agricultural pests, weeds, and pathogens. Example: Malathion.',
      [
        'Pesticides are toxic chemical substances formulated to destroy or suppress pests, weeds, and pathogens that damage agricultural crops and reduce crop yields. Example: Malathion',
        'Toxic chemical substances formulated to destroy or suppress pests, weeds, and pathogens that damage agricultural crops and reduce crop yields. Example: Malathion.',
        'Toxic chemicals formulated to destroy or suppress pests, weeds, and pathogens that damage crops. Example: Malathion.',
        'Chemical substances formulated to destroy pests, weeds, and pathogens. Example: Malathion',
        'Malathion'
      ]
    ),
    written(
      'g6-chem-ch1-qa-5',
      'introduction',
      'What are food preservatives? Give examples.',
      'Preservatives are chemical agents added to consumables to prevent bacterial decomposition and spoilage by inhibiting the proliferation of microorganisms. Examples: Benzoic acid and Sodium bisulphite.',
      'Defines preservatives as chemical agents added to consumables to prevent bacterial decomposition and spoilage by inhibiting microorganisms, and names Benzoic acid and Sodium bisulphite as examples.',
      'Food preservatives prevent bacterial decomposition and spoilage. Examples: Benzoic acid and Sodium bisulphite.',
      [
        'Preservatives are chemical agents added to consumables to prevent bacterial decomposition and spoilage by inhibiting the proliferation of microorganisms. Examples: Benzoic acid and Sodium bisulphite',
        'Chemical agents added to consumables to prevent bacterial decomposition and spoilage by inhibiting microorganisms. Examples: Benzoic acid and Sodium bisulphite.',
        'Benzoic acid and Sodium bisulphite',
        'Benzoic acid and sodium bisulphite',
        'Benzoic acid, Sodium bisulphite'
      ]
    ),
    written(
      'g6-chem-ch1-qa-6',
      'introduction',
      'Briefly discuss the contribution of chemistry to agriculture.',
      'With rapid global population growth, agricultural demands have risen significantly. Chemistry facilitates increased crop productivity through the synthesis of vital inorganic fertilizers (urea, nitrates), protective pesticides, insecticides, and fungicides that prevent disease and crop failure.',
      'Discusses synthesis of vital inorganic fertilizers (urea, nitrates) to increase crop productivity and protective pesticides/insecticides/fungicides to prevent disease and crop failure.',
      'Chemistry provides inorganic fertilizers (urea, nitrates) and protective pesticides/fungicides to boost crop productivity and prevent failure.',
      [
        'Chemistry facilitates increased crop productivity through the synthesis of vital inorganic fertilizers (urea, nitrates), protective pesticides, insecticides, and fungicides that prevent disease and crop failure.',
        'Synthesis of vital inorganic fertilizers (urea, nitrates) and protective pesticides, insecticides, and fungicides that prevent disease and crop failure.',
        'Synthesis of inorganic fertilizers like urea and nitrates, and protective pesticides, insecticides, and fungicides to prevent crop failure.'
      ]
    ),
    written(
      'g6-chem-ch1-qa-7',
      'introduction',
      'Briefly discuss the contribution of chemistry to clothing and the textile industry.',
      'Chemistry has pioneered the production of durable synthetic fibres, including Nylon, Terylene, Polyester, and Rayon. These engineered fabrics are lightweight, exceptionally strong, and naturally wrinkle-resistant.',
      'Mentions production of durable synthetic fibres including Nylon, Terylene, Polyester, and Rayon, and describes them as lightweight, exceptionally strong, and wrinkle-resistant.',
      'Chemistry creates durable synthetic fibres like Nylon, Terylene, Polyester, and Rayon which are lightweight, strong, and wrinkle-resistant.',
      [
        'Chemistry has pioneered the production of durable synthetic fibres, including Nylon, Terylene, Polyester, and Rayon. These engineered fabrics are lightweight, exceptionally strong, and naturally wrinkle-resistant',
        'Production of durable synthetic fibres including Nylon, Terylene, Polyester, and Rayon, which are lightweight, exceptionally strong, and wrinkle-resistant.',
        'Durable synthetic fibres including Nylon, Terylene, Polyester, and Rayon that are lightweight, strong, and wrinkle-resistant.',
        'Nylon, Terylene, Polyester, and Rayon',
        'Nylon, Terylene, Polyester, Rayon'
      ]
    ),

    // ---------------- Chapter 2: Matter and Its States (8 - 21) ----------------
    written(
      'g6-chem-ch2-qa-1',
      'matter',
      'Define matter and state what it is composed of.',
      'Matter is anything that possesses mass, occupies space (volume), and can be perceived by the senses. Matter is composed of minute particles called atoms or molecules.',
      'Defines matter as anything that possesses mass, occupies space/volume, and can be perceived by the senses, composed of minute particles called atoms or molecules.',
      'Matter has mass, occupies space, is perceived by the senses, and consists of atoms or molecules.',
      [
        'Matter is anything that possesses mass, occupies space (volume), and can be perceived by the senses. Matter is composed of minute particles called atoms or molecules',
        'Anything that possesses mass, occupies space (volume), and can be perceived by the senses. Matter is composed of minute particles called atoms or molecules.',
        'Anything that possesses mass, occupies space, and can be perceived by the senses. It is composed of atoms or molecules.',
        'Anything that has mass, occupies space, and can be perceived by senses. Made of atoms or molecules.'
      ]
    ),
    written(
      'g6-chem-ch2-qa-2',
      'matter',
      'Give molecular examples of an oxygen molecule and a water molecule.',
      'An oxygen molecule (O2) consists of 2 oxygen atoms. A water molecule (H2O) consists of 2 hydrogen atoms bonded to 1 oxygen atom.',
      'States that an oxygen molecule (O2) consists of 2 oxygen atoms, and a water molecule (H2O) consists of 2 hydrogen atoms bonded to 1 oxygen atom.',
      'An oxygen molecule (O2) has 2 oxygen atoms; a water molecule (H2O) has 2 hydrogen atoms bonded to 1 oxygen atom.',
      [
        'An oxygen molecule (O2) consists of 2 oxygen atoms. A water molecule (H2O) consists of 2 hydrogen atoms bonded to 1 oxygen atom',
        'Oxygen molecule (O2) consists of 2 oxygen atoms; water molecule (H2O) consists of 2 hydrogen atoms bonded to 1 oxygen atom.',
        'O2 consists of 2 oxygen atoms; H2O consists of 2 hydrogen atoms bonded to 1 oxygen atom.',
        'O2 has 2 oxygen atoms and H2O has 2 hydrogen atoms and 1 oxygen atom.'
      ]
    ),
    written(
      'g6-chem-ch2-qa-3',
      'matter',
      'Compare solids, liquids, and gases based on molecular arrangement.',
      'Solids: Closely packed in a fixed, rigid geometry. Liquids: Less closely packed; free to slide past one another. Gases: Very loosely packed with vast empty distances.',
      'Compares molecular arrangement: solids closely packed in fixed rigid geometry; liquids less closely packed and free to slide past one another; gases very loosely packed with vast empty distances.',
      'Solids are closely packed in rigid geometry, liquids are less closely packed and slide past each other, and gases are very loosely packed with vast distances.',
      [
        'Solids: Closely packed in a fixed, rigid geometry. Liquids: Less closely packed; free to slide past one another. Gases: Very loosely packed with vast empty distances',
        'Solids are closely packed in a fixed rigid geometry, liquids are less closely packed and free to slide, and gases are very loosely packed with vast empty distances.'
      ]
    ),
    written(
      'g6-chem-ch2-qa-4',
      'matter',
      'Compare solids, liquids, and gases based on intermolecular space.',
      'Solids have the least (minimum) intermolecular space. Liquids have moderate intermolecular space (greater than solids). Gases have the maximum (greatest) intermolecular space.',
      'Compares intermolecular space: solids have least/minimum, liquids moderate (greater than solids), and gases maximum/greatest.',
      'Intermolecular space is least in solids, moderate in liquids, and maximum in gases.',
      [
        'Solids: Least (minimum). Liquids: Moderate (greater than solids). Gases: Maximum (greatest)',
        'Solids have least intermolecular space, liquids have moderate space, and gases have maximum space.',
        'Least in solids, moderate in liquids, and maximum in gases'
      ]
    ),
    written(
      'g6-chem-ch2-qa-5',
      'matter',
      'Compare solids, liquids, and gases based on intermolecular force of attraction.',
      'Solids: Extremely strong force of attraction. Liquids: Moderate / weak force of attraction. Gases: Negligible (almost absent) force of attraction.',
      'Compares force of attraction: solids extremely strong, liquids moderate/weak, and gases negligible/almost absent.',
      'Intermolecular attraction is extremely strong in solids, moderate/weak in liquids, and negligible in gases.',
      [
        'Solids: Extremely strong. Liquids: Moderate / weak. Gases: Negligible (almost absent)',
        'Extremely strong in solids, moderate or weak in liquids, and negligible in gases.',
        'Solids have extremely strong attraction, liquids moderate or weak, and gases negligible'
      ]
    ),
    written(
      'g6-chem-ch2-qa-6',
      'matter',
      'Compare solids, liquids, and gases in terms of shape and volume.',
      'Solids: Definite shape and fixed volume. Liquids: No fixed shape (takes container\'s shape); fixed volume. Gases: No definite shape and no definite volume.',
      'Compares shape and volume: solids have definite shape and fixed volume; liquids have no fixed shape (container\'s shape) and fixed volume; gases have no definite shape and no definite volume.',
      'Solids have definite shape and fixed volume; liquids take container\'s shape with fixed volume; gases have neither definite shape nor definite volume.',
      [
        'Solids: Definite shape and fixed volume. Liquids: No fixed shape (takes container\'s shape); fixed volume. Gases: No definite shape and no definite volume',
        'Solids have definite shape and fixed volume; liquids have no fixed shape and fixed volume; gases have no definite shape and no definite volume.'
      ]
    ),
    written(
      'g6-chem-ch2-qa-7',
      'matter',
      'Compare solids, liquids, and gases in terms of compressibility.',
      'Solids are incompressible. Liquids are almost incompressible. Gases are highly compressible under pressure.',
      'Compares compressibility: solids incompressible, liquids almost incompressible, and gases highly compressible under pressure.',
      'Solids are incompressible, liquids almost incompressible, and gases highly compressible under pressure.',
      [
        'Solids: Incompressible. Liquids: Almost incompressible. Gases: Highly compressible under pressure',
        'Solids are incompressible, liquids are almost incompressible, and gases are highly compressible under pressure.'
      ]
    ),
    written(
      'g6-chem-ch2-qa-8',
      'matter',
      'What are the phase-change processes in the interconversion of states between ice, liquid water, and steam?',
      'Solid (Ice) ⇌ (Melting / Freezing) ⇌ Liquid (Water) ⇌ (Boiling / Condensation) ⇌ Gas (Steam).',
      'Identifies melting and freezing between ice and liquid water, and boiling and condensation between liquid water and steam.',
      'Melting/freezing converts between ice and water; boiling/condensation converts between water and steam.',
      [
        'Solid (Ice) ⇌ (Melting / Freezing) ⇌ Liquid (Water) ⇌ (Boiling / Condensation) ⇌ Gas (Steam)',
        'Melting, Freezing, Boiling, Condensation',
        'Melting, freezing, boiling, and condensation',
        'Melting and freezing between solid and liquid; boiling and condensation between liquid and gas'
      ]
    ),
    written(
      'g6-chem-ch2-qa-9',
      'matter',
      'What is the direct interconversion between solid and gas called without passing through a liquid state?',
      'Solid ⇌ (Sublimation / Deposition) ⇌ Gas. Sublimation is the direct change from solid to gas, and deposition is from gas to solid.',
      'Identifies Sublimation (solid to gas) and Deposition (gas to solid).',
      'Sublimation changes solid directly to gas, and deposition changes gas directly to solid.',
      [
        'Solid ⇌ (Sublimation / Deposition) ⇌ Gas',
        'Sublimation and Deposition',
        'Sublimation and deposition',
        'Sublimation',
        'Deposition and sublimation'
      ]
    ),
    written(
      'g6-chem-ch2-qa-10',
      'matter',
      'Why do substances expand on heating and contract on cooling?',
      'When matter is heated, constituent molecules absorb thermal energy, resulting in increased kinetic energy and vigorous movement. Consequently, intermolecular spaces widen, causing the substance to expand. Conversely, upon cooling, molecular energy and kinetic motion decrease, allowing particles to come closer together, leading to contraction and reduced volume.',
      'Explains that heating increases thermal/kinetic energy causing vigorous movement and widening intermolecular spaces (expansion); cooling decreases kinetic motion, allowing particles to come closer together (contraction).',
      'Heating increases kinetic energy and widens intermolecular spaces (expansion); cooling reduces kinetic energy, moving particles closer (contraction).',
      [
        'When matter is heated, constituent molecules absorb thermal energy, resulting in increased kinetic energy and vigorous movement. Consequently, intermolecular spaces widen, causing the substance to expand. Conversely, upon cooling, molecular energy and kinetic motion decrease, allowing particles to come closer together, leading to contraction and reduced volume',
        'Heating increases kinetic energy and molecular motion, widening intermolecular spaces so the substance expands. Cooling decreases molecular energy and motion, allowing particles to come closer together, causing contraction.'
      ]
    ),
    written(
      'g6-chem-ch2-qa-11',
      'matter',
      'List the primary characteristics of particles of matter.',
      'Particles of matter are extraordinarily small, possess intermolecular spaces between them, exert mutual attractive forces, and remain in continuous, random, zig-zag motion known as Brownian motion.',
      'Lists the four characteristics: extraordinarily small, have intermolecular spaces, exert mutual attractive forces, and remain in continuous random zig-zag motion (Brownian motion).',
      'Particles of matter are extraordinarily small, have intermolecular spaces, exert mutual attractive forces, and exhibit continuous random zig-zag motion (Brownian motion).',
      [
        'Particles of matter are extraordinarily small, possess intermolecular spaces between them, exert mutual attractive forces, and remain in continuous, random, zig-zag motion known as Brownian motion',
        '1. Extraordinarily small, 2. Possess intermolecular spaces, 3. Exert mutual attractive forces, 4. In continuous, random, zig-zag motion (Brownian motion).'
      ]
    ),
    written(
      'g6-chem-ch2-qa-12',
      'matter',
      'What is Brownian motion?',
      'Brownian motion is the continuous, random, zig-zag motion exhibited by particles of matter.',
      'Defines Brownian motion as the continuous, random, zig-zag motion of particles of matter.',
      'Brownian motion is the continuous, random, zig-zag movement of particles.',
      [
        'Continuous, random, zig-zag motion known as Brownian motion',
        'The continuous, random, zig-zag motion of particles of matter.',
        'Continuous, random, zig-zag motion of particles of matter',
        'Continuous random zig-zag motion of particles',
        'Continuous, random, zig-zag motion'
      ]
    ),
    written(
      'g6-chem-ch2-qa-13',
      'matter',
      'Which primary factors govern the physical state of matter?',
      'The physical state (solid, liquid, or gas) is determined by: (1) The magnitude of intermolecular space, (2) The strength of intermolecular forces of attraction, and (3) The kinetic energy and movement of the constituent molecules.',
      'States the three primary factors: magnitude of intermolecular space, strength of intermolecular forces of attraction, and kinetic energy/movement of constituent molecules.',
      'Physical state is governed by intermolecular space, intermolecular force of attraction, and molecular kinetic energy/movement.',
      [
        'The physical state (solid, liquid, or gas) is determined by: (1) The magnitude of intermolecular space, (2) The strength of intermolecular forces of attraction, and (3) The kinetic energy and movement of the constituent molecules',
        '(1) Intermolecular space, (2) Intermolecular forces of attraction, (3) Kinetic energy and movement of molecules.',
        'Intermolecular space, intermolecular force of attraction, and kinetic energy of constituent molecules'
      ]
    ),
    written(
      'g6-chem-ch2-qa-14',
      'matter',
      'Why are solids rigid and able to retain their definitive shape?',
      'In solids, intermolecular attractive forces are exceptionally strong and intermolecular spaces are negligible. As a result, the constituent particles are locked into fixed positions and cannot move freely, rendering the substance rigid with a stable form.',
      'Explains that intermolecular attractive forces are exceptionally strong and intermolecular spaces are negligible, locking constituent particles into fixed positions so they cannot move freely.',
      'Solids are rigid because exceptionally strong attractive forces and negligible intermolecular spaces lock particles into fixed positions.',
      [
        'In solids, intermolecular attractive forces are exceptionally strong and intermolecular spaces are negligible. As a result, the constituent particles are locked into fixed positions and cannot move freely, rendering the substance rigid with a stable form',
        'Intermolecular attractive forces are exceptionally strong and intermolecular spaces are negligible, locking particles into fixed positions so they cannot move freely.'
      ]
    ),

    // ---------------- Chapter 3: Elements and Compounds (22 - 50) ----------------
    written(
      'g6-chem-ch3-qa-1',
      'elements-and-compounds',
      'How many elements are known today? How many occur naturally, and how many are synthetic?',
      "A total of 118 elements are known today. Of these, 92 elements occur naturally in the Earth's crust and atmosphere, while the remaining 26 elements are synthetic (man-made / artificial elements) synthesized in laboratories.",
      'States 118 total elements, 92 naturally occurring, and 26 synthetic (man-made / artificial elements).',
      '118 known elements: 92 natural and 26 synthetic.',
      [
        "A total of 118 elements are known today. Of these, 92 elements occur naturally in the Earth's crust and atmosphere, while the remaining 26 elements are synthetic (man-made / artificial elements) synthesized in laboratories",
        '118 elements total: 92 naturally occurring and 26 synthetic.',
        '118 elements: 92 natural and 26 synthetic',
        '118 total, 92 natural, 26 synthetic',
        '118 known elements, 92 natural, 26 synthetic',
        '118, 92, 26'
      ]
    ),
    written(
      'g6-chem-ch3-qa-2',
      'elements-and-compounds',
      'What are metalloids? Give examples.',
      'Metalloids are elements exhibiting intermediate properties between metals and non-metals. Examples: Silicon (Si), Arsenic (As), and Antimony (Sb).',
      'Defines metalloids as elements exhibiting intermediate properties between metals and non-metals, and gives examples like Silicon, Arsenic, Antimony, or Germanium.',
      'Metalloids have intermediate properties between metals and non-metals (e.g. Silicon, Arsenic, Antimony, Germanium).',
      [
        'Elements exhibiting intermediate properties between metals and non-metals (e.g., Silicon, Arsenic, Antimony)',
        'Elements exhibiting intermediate properties between metals and non-metals. Examples: Silicon, Arsenic, Antimony.',
        'Silicon, Arsenic, Antimony',
        'Silicon, Arsenic, Antimony, Germanium',
        'Silicon, Arsenic, and Antimony'
      ]
    ),
    written(
      'g6-chem-ch3-qa-3',
      'elements-and-compounds',
      'What are noble gases? Give examples.',
      'Noble gases are unreactive, monoatomic gaseous elements in Group 18 that possess stable electron structures and do not readily form chemical bonds. Examples: Helium (He), Neon (Ne), and Argon (Ar).',
      'Defines noble gases as unreactive, monoatomic Group 18 gases possessing stable electron structures that do not readily form chemical bonds, giving examples like Helium, Neon, Argon.',
      'Noble gases are unreactive monoatomic Group 18 gases with stable electron structures (e.g. Helium, Neon, Argon).',
      [
        'Unreactive, monoatomic gaseous elements in Group 18 that possess stable electron structures and do not readily form chemical bonds (e.g., Helium, Neon, Argon)',
        'Unreactive, monoatomic gaseous elements in Group 18 that possess stable electron structures and do not readily form chemical bonds. Examples: Helium, Neon, Argon.',
        'Helium, Neon, Argon',
        'Helium, Neon, and Argon',
        'He, Ne, Ar',
        'Helium, Neon, Argon, Krypton, Xenon, Radon'
      ]
    ),
    written(
      'g6-chem-ch3-qa-4',
      'elements-and-compounds',
      'Define atomicity. Give examples of monoatomic, diatomic, and triatomic molecules of elements.',
      'Atomicity is the total number of constituent atoms present in a single molecule of an element. Examples: Monoatomic: Helium (He), Argon (Ar); Diatomic: Oxygen (O2), Nitrogen (N2); Triatomic: Ozone (O3).',
      'Defines atomicity as the total number of constituent atoms present in a single molecule of an element, providing monoatomic (He, Ar), diatomic (O2, N2), and triatomic (O3) examples.',
      'Atomicity is the total number of atoms in a molecule of an element. Monoatomic: He, Ar; Diatomic: O2, N2; Triatomic: O3.',
      [
        'The total number of constituent atoms present in a single molecule of an element (e.g., Monoatomic: He, Ar; Diatomic: O2, N2; Triatomic: O3)',
        'The total number of constituent atoms present in a single molecule of an element. Monoatomic: He, Ar; Diatomic: O2, N2; Triatomic: O3.',
        'The total number of constituent atoms present in a single molecule of an element',
        'Total number of constituent atoms present in a single molecule of an element'
      ]
    ),
    written(
      'g6-chem-ch3-qa-5',
      'elements-and-compounds',
      'Which is the only metal that exists as a liquid at room temperature?',
      'Mercury (Hg)',
      'Identifies Mercury (Hg) as the only metal existing as a liquid at room temperature.',
      'Mercury (Hg) is the sole liquid metal at room temperature.',
      [
        'Mercury (Hg)',
        'Mercury',
        'Hg',
        'mercury'
      ]
    ),
    written(
      'g6-chem-ch3-qa-6',
      'elements-and-compounds',
      'Name two alkali metals that are soft enough to be sliced with a knife.',
      'Sodium (Na) and Potassium (K)',
      'Identifies Sodium (Na) and Potassium (K) as two soft alkali metals.',
      'Sodium (Na) and Potassium (K) can be sliced easily with a knife.',
      [
        'Sodium (Na) and Potassium (K)',
        'Sodium and Potassium',
        'Sodium, Potassium',
        'Na and K',
        'Na, K',
        'Potassium and Sodium',
        'sodium and potassium'
      ]
    ),
    written(
      'g6-chem-ch3-qa-7',
      'elements-and-compounds',
      'Name a metal that is non-malleable and brittle.',
      'Zinc (Zn)',
      'Identifies Zinc (Zn) as a non-malleable and brittle metal.',
      'Zinc (Zn) is brittle and non-malleable at ordinary temperatures.',
      [
        'Zinc (Zn)',
        'Zinc',
        'Zn',
        'zinc'
      ]
    ),
    written(
      'g6-chem-ch3-qa-8',
      'elements-and-compounds',
      'What is malleability?',
      'Malleability is the property of metals that allows them to be hammered into thin sheets.',
      'Defines malleability as the property of metals allowing them to be hammered into thin sheets.',
      'Malleability is the property of metals allowing them to be beaten into thin sheets.',
      [
        'Property of metals allowing them to be hammered into thin sheets',
        'The property of metals that allows them to be hammered into thin sheets.',
        'Property of metals allowing them to be hammered into thin sheets.',
        'Hammered into thin sheets',
        'Ability to be hammered into thin sheets'
      ]
    ),
    written(
      'g6-chem-ch3-qa-9',
      'elements-and-compounds',
      'What is ductility?',
      'Ductility is the property of metals that allows them to be drawn into thin wires.',
      'Defines ductility as the property of metals allowing them to be drawn into thin wires.',
      'Ductility is the property of metals allowing them to be stretched or drawn into thin wires.',
      [
        'Property of metals allowing them to be drawn into thin wires',
        'The property of metals that allows them to be drawn into thin wires.',
        'Property of metals allowing them to be drawn into thin wires.',
        'Drawn into thin wires',
        'Ability to be drawn into thin wires'
      ]
    ),
    written(
      'g6-chem-ch3-qa-10',
      'elements-and-compounds',
      'Which is the only non-metal that exists as a liquid at room temperature?',
      'Bromine (Br)',
      'Identifies Bromine (Br) as the only non-metal that exists as a liquid at room temperature.',
      'Bromine (Br) is the only liquid non-metal at room temperature.',
      [
        'Bromine (Br)',
        'Bromine',
        'Br',
        'bromine'
      ]
    ),
    written(
      'g6-chem-ch3-qa-11',
      'elements-and-compounds',
      'What metallic constituents form the alloy brass?',
      'Copper (Cu) and Zinc (Zn)',
      'Identifies Copper (Cu) and Zinc (Zn) as the metallic constituents of brass.',
      'Brass is formed by alloying Copper (Cu) and Zinc (Zn).',
      [
        'Copper (Cu) and Zinc (Zn)',
        'Copper and Zinc',
        'Copper, Zinc',
        'Cu and Zn',
        'Cu, Zn',
        'Zinc and Copper',
        'copper and zinc'
      ]
    ),
    written(
      'g6-chem-ch3-qa-12',
      'elements-and-compounds',
      'Name four common allotropic or elementary forms of carbon.',
      'Charcoal, Coal, Diamond, and Graphite',
      'Identifies Charcoal, Coal, Diamond, and Graphite as forms of carbon.',
      'The four forms of carbon are Charcoal, Coal, Diamond, and Graphite.',
      [
        'Charcoal, Coal, Diamond, and Graphite',
        'Charcoal, Coal, Diamond, Graphite',
        'Diamond, Graphite, Charcoal, Coal',
        'Diamond, Graphite, Coal, Charcoal',
        'Diamond, graphite, coal, charcoal'
      ]
    ),
    written(
      'g6-chem-ch3-qa-13',
      'elements-and-compounds',
      'Classify sodium (Na), mercury (Hg), zinc (Zn), and silver (Ag) as metals, non-metals, or metalloids.',
      'They are all Metals.',
      'Classifies Sodium, Mercury, Zinc, and Silver as Metals.',
      'Sodium, Mercury, Zinc, and Silver are all Metals.',
      [
        'Metals',
        'They are all metals',
        'They are all Metals',
        'Metal',
        'metals',
        'All metals',
        'All are metals',
        'They are metals',
        'All of them are metals'
      ]
    ),
    written(
      'g6-chem-ch3-qa-14',
      'elements-and-compounds',
      'Classify oxygen (O), nitrogen (N), carbon (C), and bromine (Br) as metals, non-metals, or metalloids.',
      'They are all Non-Metals.',
      'Classifies Oxygen, Nitrogen, Carbon, and Bromine as Non-Metals.',
      'Oxygen, Nitrogen, Carbon, and Bromine are Non-Metals.',
      [
        'Non-Metals',
        'Non-metals',
        'Nonmetals',
        'They are all non-metals',
        'They are all Non-Metals',
        'non-metals',
        'Non metals',
        'Non metal',
        'Nonmetal',
        'non metals',
        'non metal',
        'nonmetals',
        'All non-metals',
        'All non metals',
        'All are non-metals',
        'All are non metals',
        'They are non-metals',
        'They are non metals',
        'They are all non metals'
      ]
    ),
    written(
      'g6-chem-ch3-qa-15',
      'elements-and-compounds',
      'Classify silicon (Si), arsenic (As), antimony (Sb), and germanium (Ge) as metals, non-metals, or metalloids.',
      'They are all Metalloids.',
      'Classifies Silicon, Arsenic, Antimony, and Germanium as Metalloids.',
      'Silicon, Arsenic, Antimony, and Germanium are Metalloids.',
      [
        'Metalloids',
        'They are all metalloids',
        'They are all Metalloids',
        'Metalloid',
        'metalloids',
        'All metalloids',
        'All are metalloids',
        'They are metalloids',
        'All of them are metalloids'
      ]
    ),
    written(
      'g6-chem-ch3-qa-16',
      'elements-and-compounds',
      'State the practical applications of iron (Fe).',
      'Iron (Fe) is employed in the construction of heavy machinery, architectural frameworks, bridges, and industrial tools.',
      'Mentions construction of heavy machinery, architectural frameworks, bridges, and industrial tools.',
      'Iron is used for heavy machinery, architectural frameworks, bridges, and industrial tools.',
      [
        'Construction of heavy machinery, architectural frameworks, bridges, and industrial tools',
        'Heavy machinery, architectural frameworks, bridges, and industrial tools.',
        'Construction of heavy machinery, frameworks, bridges, and tools'
      ]
    ),
    written(
      'g6-chem-ch3-qa-17',
      'elements-and-compounds',
      'State the practical applications of copper (Cu) and aluminium (Al).',
      'Copper (Cu) and aluminium (Al) are used in manufacturing high-conductivity electrical transmission wires and domestic cooking utensils.',
      'Mentions manufacturing high-conductivity electrical transmission wires and domestic cooking utensils.',
      'Copper and aluminium are used for electrical transmission wires and cooking utensils.',
      [
        'Manufacturing high-conductivity electrical transmission wires and domestic cooking utensils',
        'Electrical transmission wires and domestic cooking utensils.',
        'Electrical wires and domestic cooking utensils',
        'Electrical transmission wires and cooking utensils'
      ]
    ),
    written(
      'g6-chem-ch3-qa-18',
      'elements-and-compounds',
      'State the practical applications of graphite (carbon).',
      'Graphite is employed as pencil "lead", as a high-temperature industrial lubricant, and as an electrode material.',
      'Mentions use as pencil lead, high-temperature industrial lubricant, and electrode material.',
      'Graphite is used as pencil lead, high-temperature lubricant, and electrodes.',
      [
        'Employed as pencil "lead" and as a high-temperature industrial lubricant and electrode material',
        'Pencil lead, high-temperature industrial lubricant, and electrode material.',
        'Pencil lead, industrial lubricant, and electrode material',
        'Pencil lead, lubricant, and electrodes'
      ]
    ),
    written(
      'g6-chem-ch3-qa-19',
      'elements-and-compounds',
      'State the practical applications of argon (Ar) and neon (Ne).',
      'Argon (Ar) and neon (Ne) are used for filling incandescent and discharge bulbs because of their chemical inertness.',
      'Mentions filling incandescent and discharge bulbs because of their chemical inertness.',
      'Argon and neon fill incandescent and discharge bulbs due to their chemical inertness.',
      [
        'Filling incandescent and discharge bulbs because of their chemical inertness',
        'Filling incandescent and discharge bulbs.',
        'Used to fill incandescent and discharge bulbs due to chemical inertness'
      ]
    ),
    written(
      'g6-chem-ch3-qa-20',
      'elements-and-compounds',
      'State the practical applications of gold (Au), silver (Ag), and platinum (Pt).',
      'Gold (Au), silver (Ag), and platinum (Pt) are used for crafting fine jewellery and ornamental items due to high lustre, malleability, and resistance to corrosion.',
      'Mentions crafting fine jewellery and ornamental items due to high lustre, malleability, and resistance to corrosion.',
      'Gold, silver, and platinum are crafted into fine jewellery and ornaments due to high lustre, malleability, and corrosion resistance.',
      [
        'Crafting fine jewellery and ornamental items due to high lustre, malleability, and resistance to corrosion',
        'Crafting jewellery and ornamental items due to lustre, malleability, and corrosion resistance.',
        'Fine jewellery and ornamental items'
      ]
    ),
    written(
      'g6-chem-ch3-qa-21',
      'elements-and-compounds',
      'Give reason: Why are noble gases like argon and neon filled inside electric filament lamps?',
      'Argon and neon are chemically inert. When the tungsten filament glows at extremely high temperatures, these gases prevent the filament from oxidizing or burning out.',
      'Explains that argon and neon are chemically inert and prevent the tungsten filament from oxidizing or burning out at high glowing temperatures.',
      'Argon and neon are chemically inert, preventing the hot tungsten filament from oxidizing or burning out.',
      [
        'Argon and neon are chemically inert. When the tungsten filament glows at extremely high temperatures, these gases prevent the filament from oxidizing or burning out',
        'They are chemically inert. When the tungsten filament glows at extremely high temperatures, these gases prevent the filament from oxidizing or burning out.',
        'Because they are chemically inert and prevent the tungsten filament from oxidizing or burning out.'
      ]
    ),
    written(
      'g6-chem-ch3-qa-22',
      'elements-and-compounds',
      'Give reason: Why is copper specifically chosen for residential and commercial electrical wiring?',
      'Copper exhibits exceptionally low electrical resistance, high electrical conductivity, and excellent ductility, allowing it to be safely drawn into thin wires without breaking.',
      'Mentions exceptionally low electrical resistance, high electrical conductivity, and excellent ductility allowing it to be drawn into thin wires without breaking.',
      'Copper has low electrical resistance, high electrical conductivity, and high ductility, allowing safe wire drawing.',
      [
        'Copper exhibits exceptionally low electrical resistance, high electrical conductivity, and excellent ductility, allowing it to be safely drawn into thin wires without breaking',
        'Low electrical resistance, high electrical conductivity, and excellent ductility, allowing it to be drawn into thin wires without breaking.',
        'Exceptionally low electrical resistance, high conductivity, and excellent ductility'
      ]
    ),
    written(
      'g6-chem-ch3-qa-23',
      'elements-and-compounds',
      'Give reason: Why are frying pans constructed from steel, while their handles are crafted from wood or bakelite?',
      'Steel is an efficient thermal conductor that rapidly distributes heat across food items, whereas wood or bakelite is a poor conductor of heat (thermal insulator), preventing hand burns while cooking.',
      'Explains that steel is an efficient thermal conductor rapidly distributing heat to food, while wood or bakelite is a poor conductor of heat (thermal insulator) that prevents hand burns.',
      'Steel rapidly conducts heat to food, while wood or bakelite handles insulate against heat to prevent burns.',
      [
        'Steel is an efficient thermal conductor that rapidly distributes heat across food items, whereas wood is a poor conductor of heat (thermal insulator), preventing hand burns while cooking',
        'Steel is an efficient thermal conductor that rapidly distributes heat across food items, whereas wood or bakelite is a poor conductor of heat (thermal insulator), preventing hand burns while cooking.',
        'Steel is an efficient thermal conductor that distributes heat to food, whereas wood or bakelite is a thermal insulator preventing burns.'
      ]
    ),
    written(
      'g6-chem-ch3-qa-24',
      'elements-and-compounds',
      'Give reason: Why is gold widely preferred for manufacturing intricate wirework jewellery?',
      'Gold possesses a permanent, brilliant metallic lustre, is highly non-reactive (does not tarnish or rust), and possesses outstanding ductility, permitting it to be drawn into microscopic wire threads.',
      'Mentions permanent brilliant metallic lustre, non-reactivity (does not tarnish or rust), and outstanding ductility permitting it to be drawn into microscopic wire threads.',
      'Gold has brilliant permanent lustre, never tarnishes or rusts, and has exceptional ductility for microscopic wires.',
      [
        'Gold possesses a permanent, brilliant metallic lustre, is highly non-reactive (does not tarnish or rust), and possesses outstanding ductility, permitting it to be drawn into microscopic wire threads',
        'Permanent brilliant metallic lustre, highly non-reactive (does not tarnish or rust), and outstanding ductility permitting it to be drawn into microscopic wire threads.',
        'Permanent lustre, non-reactive (does not rust or tarnish), and outstanding ductility'
      ]
    ),
    written(
      'g6-chem-ch3-qa-25',
      'elements-and-compounds',
      'State the fundamental properties of chemical compounds.',
      '1. Pure, homogeneous substances composed of two or more elements. 2. Constituent elements are chemically bonded in an unalterable, definite ratio by mass. 3. Cannot be separated by physical methods; can only be broken down by chemical or electrochemical reactions. 4. Exhibits properties entirely distinct from its constituent elements. 5. Chemical energy (heat, light, or electricity) is either absorbed or released during formation.',
      'States the 5 properties: pure homogeneous substances of two or more elements, chemically bonded in definite mass ratio, cannot be separated by physical methods, distinct properties from constituent elements, and energy absorbed/released during formation.',
      'Compounds are pure homogeneous substances with elements chemically bonded in definite mass ratios, distinct properties, chemical separation only, and energy change on formation.',
      [
        '1. Pure, homogeneous substances composed of two or more elements. 2. Constituent elements are chemically bonded in an unalterable, definite ratio by mass. 3. Cannot be separated by physical methods; they can only be broken down by chemical or electrochemical reactions. 4. Exhibits chemical and physical properties entirely distinct from constituent elements. 5. Chemical energy is either absorbed or released during formation.'
      ]
    ),
    written(
      'g6-chem-ch3-qa-26',
      'elements-and-compounds',
      'In what constant mass ratio do hydrogen and oxygen combine in a water molecule (H2O)?',
      '1:8',
      'Identifies the constant mass ratio of 1:8 for hydrogen and oxygen in water.',
      'In water (H2O), hydrogen and oxygen combine in a constant mass ratio of 1:8.',
      [
        '1:8',
        '1 to 8',
        '1 : 8',
        '1:8 ratio',
        '1 : 8 ratio',
        'ratio of 1:8',
        '1 is to 8',
        '1/8',
        'Constant mass ratio of 1:8',
        'Hydrogen and Oxygen combine in a constant mass ratio of 1:8',
        '1:8 by mass',
        '1 to 8 by mass'
      ]
    ),
    written(
      'g6-chem-ch3-qa-27',
      'elements-and-compounds',
      'How do molecules of elements differ from molecules of compounds?',
      'Molecules of elements are composed of atoms of the same single chemical element chemically bonded together. Molecules of compounds are composed of atoms of two or more different chemical elements combined in a fixed ratio.',
      'Explains that molecules of elements contain atoms of the same single element, whereas molecules of compounds contain atoms of two or more different elements combined in a fixed ratio.',
      'Molecules of elements contain identical atoms of one element, while molecules of compounds contain different elements combined in a fixed ratio.',
      [
        'Molecules of elements are composed of atoms of the same single chemical element chemically bonded together. Molecules of compounds are composed of atoms of two or more different chemical elements combined in a fixed ratio',
        'Molecules of elements consist of atoms of the same element, while molecules of compounds consist of atoms of two or more different elements in a fixed ratio.'
      ]
    ),
    written(
      'g6-chem-ch3-qa-28',
      'elements-and-compounds',
      'Give chemical examples of molecules of elements.',
      'Diatomic Oxygen (O2), Diatomic Chlorine (Cl2), Diatomic Bromine (Br2), Diatomic Iodine (I2), Diatomic Nitrogen (N2), and Diatomic Hydrogen (H2).',
      'Lists examples of molecules of elements such as O2, Cl2, Br2, I2, N2, or H2.',
      'Examples of molecules of elements include O2, Cl2, Br2, I2, N2, and H2.',
      [
        'Diatomic Oxygen: O2, Diatomic Chlorine: Cl2, Diatomic Bromine: Br2, Diatomic Iodine: I2, Diatomic Nitrogen: N2, Diatomic Hydrogen: H2',
        'O2, Cl2, Br2, I2, N2, H2',
        'O2, Cl2, Br2, I2, N2, and H2',
        'Oxygen (O2), Chlorine (Cl2), Bromine (Br2), Iodine (I2), Nitrogen (N2), Hydrogen (H2)'
      ]
    ),
    written(
      'g6-chem-ch3-qa-29',
      'elements-and-compounds',
      'Give chemical examples of molecules of compounds with their formulas.',
      'Carbon Dioxide (CO2), Nitrogen Dioxide (NO2), Water (H2O), Hydrogen Chloride (HCl), Calcium Oxide (CaO), and Glucose (C6H12O6).',
      'Lists molecules of compounds such as CO2, NO2, H2O, HCl, CaO, or C6H12O6.',
      'Examples of compound molecules include CO2, NO2, H2O, HCl, CaO, and C6H12O6.',
      [
        'Carbon Dioxide: CO2, Nitrogen Dioxide: NO2, Water: H2O, Hydrogen Chloride: HCl, Calcium Oxide: CaO, Glucose: C6H12O6',
        'CO2, NO2, H2O, HCl, CaO, C6H12O6',
        'CO2, NO2, H2O, HCl, CaO, and C6H12O6',
        'Carbon Dioxide (CO2), Nitrogen Dioxide (NO2), Water (H2O), Hydrogen Chloride (HCl), Calcium Oxide (CaO), Glucose (C6H12O6)'
      ]
    )
  ]
};

export function getChemistryLessonForGrade(grade: number): ChemistryLesson | undefined {
  return grade === 6 ? SHIZA_CHEMISTRY_LESSON : undefined;
}

export function getChemistryLesson(studentId: StudentId): ChemistryLesson {
  const profile = getStudentProfile(studentId);
  const lesson = getChemistryLessonForGrade(profile.grade);
  if (!lesson) throw new Error(`Chemistry is not available for ${profile.gradeLabel}.`);
  return lesson;
}

export function normalizeChemistryAnswer(answer: string): string {
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

export function checkChemistryAnswer(question: ChemistryQuestion, answer: string): boolean {
  const normalized = normalizeChemistryAnswer(answer);
  if (!normalized) return false;
  return question.acceptedAnswers.some(candidate => {
    const target = normalizeChemistryAnswer(candidate);
    if (target === normalized) return true;
    const strippedTarget = target.replace(/[,;:]/g, ' ').replace(/\s+/g, ' ').trim();
    const strippedInput = normalized.replace(/[,;:]/g, ' ').replace(/\s+/g, ' ').trim();
    if (strippedTarget === strippedInput) return true;
    const withoutParensTarget = target.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
    const withoutParensInput = normalized.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (withoutParensTarget === withoutParensInput) return true;

    // Hyphen variations (e.g. non-metals vs non metals vs nonmetals)
    const withoutHyphensTarget = target.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    const withoutHyphensInput = normalized.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    if (withoutHyphensTarget === withoutHyphensInput) return true;
    const collapsedHyphensTarget = target.replace(/-/g, '').replace(/\s+/g, ' ').trim();
    const collapsedHyphensInput = normalized.replace(/-/g, '').replace(/\s+/g, ' ').trim();
    if (collapsedHyphensTarget === collapsedHyphensInput) return true;

    // Order-independent list matching (e.g., "Potassium, Sodium" or "Zinc, Copper")
    if (matchesListSet(target, normalized)) return true;
    if (matchesListSet(withoutParensTarget, withoutParensInput)) return true;
    if (matchesListSet(withoutHyphensTarget, withoutHyphensInput)) return true;

    return false;
  });
}
