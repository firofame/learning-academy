import { StudentId } from '../types';
import { getStudentProfile } from './profiles';

export type BiologySectionId =
  | 'leaf'
  | 'flower'
  | 'cell'
  | 'digestive-system';

export interface BiologySection {
  id: BiologySectionId;
  chapterNumber: number;
  label: string;
  topic: string;
}

export const BIOLOGY_SECTIONS: BiologySection[] = [
  { id: 'leaf', chapterNumber: 1, label: 'Chapter 1 · The Leaf', topic: 'The Leaf' },
  { id: 'flower', chapterNumber: 2, label: 'Chapter 2 · The Flower', topic: 'The Flower' },
  { id: 'cell', chapterNumber: 3, label: 'Chapter 3 · The Cell', topic: 'The Cell' },
  { id: 'digestive-system', chapterNumber: 4, label: 'Chapter 4 · The Digestive System', topic: 'The Digestive System' }
];

export interface BiologyCard {
  id: string;
  section: BiologySectionId;
  title: string;
  prompt: string;
  answer: string;
  memoryTip: string;
  examples?: string;
}

interface QuestionBase {
  id: string;
  section: BiologySectionId;
  prompt: string;
  answer: string;
  explanation: string;
}

export type BiologyQuestion =
  | (QuestionBase & { kind: 'written'; acceptedAnswers: string[]; markingCriteria: string });

export interface BiologyLesson {
  id: string;
  grade: number;
  title: string;
  sourceName: string;
  memoryTip: string;
  sections: BiologySection[];
  cards: BiologyCard[];
  questions: BiologyQuestion[];
}

const written = (
  id: string,
  section: BiologySectionId,
  prompt: string,
  answer: string,
  markingCriteria: string,
  explanation: string,
  aliases: string[] = []
): BiologyQuestion => ({
  id,
  section,
  kind: 'written',
  prompt,
  answer,
  acceptedAnswers: [answer, ...aliases],
  markingCriteria,
  explanation
});

const biologyCards: BiologyCard[] = [
  {
    id: 'g6-bio-card-leaf-parts',
    section: 'leaf',
    title: 'Parts of a Leaf & Petiole',
    prompt: 'What are the main parts of a leaf and the role of the petiole?',
    answer: 'Main parts: Lamina (leaf blade), petiole (leaf stalk), midrib, veins and veinlets, and leaf base. Petiole: short cylindrical stalk that attaches lamina to stem and conducts water and nutrients. Node: point on stem where a leaf arises.',
    memoryTip: 'Lamina = blade, Petiole = stalk, Midrib = central vein, Leaf base = attachment.',
    examples: 'Node is the stem point from where a leaf arises.'
  },
  {
    id: 'g6-bio-card-leaf-functions',
    section: 'leaf',
    title: 'Functions & Venation of Leaves',
    prompt: 'What are leaf functions and types of venation?',
    answer: 'Functions: 1. Food manufacturing (photosynthesis), 2. Gaseous exchange (stomata), 3. Transpiration (cooling & suction pull). Venation: Reticulate (net-like network, e.g. Peepal, Rose, Guava) and Parallel (parallel lines without network, e.g. Banana, Grass).',
    memoryTip: 'Reticulate = net (Peepal). Parallel = lines (Banana).',
    examples: 'Stomata open on the leaf surface for gas exchange and transpiration.'
  },
  {
    id: 'g6-bio-card-leaf-modifications',
    section: 'leaf',
    title: 'Leaf Modifications & Arrangements',
    prompt: 'How are leaves modified for support, defense, and reproduction?',
    answer: 'Tendrils: coiled thread-like climbers for support (Pea). Spines: reduce transpiration & defend against herbivores (Opuntia). Bryophyllum: vegetative propagation via adventitious buds in leaf margin notches. Phyllotaxy: Alternate, Opposite, Whorled (Nerium). Insectivorous: Pitcher plant, Venus flytrap.',
    memoryTip: 'Tendril = support, Spine = defense/water conservation, Bryophyllum = leaf buds.',
    examples: 'Nerium oleander shows whorled phyllotaxy.'
  },
  {
    id: 'g6-bio-card-flower-whorls',
    section: 'flower',
    title: 'Floral Whorls & Carpel Parts',
    prompt: 'What are the concentric whorls of a flower and parts of a carpel?',
    answer: 'Four floral whorls: Calyx (sepals), Corolla (petals), Androecium (stamens: filament + anther producing pollen), and Gynoecium/Pistil (carpels: ovary enclosing ovules, style, stigma). Complete flower has all 4; incomplete lacks one or more.',
    memoryTip: 'Calyx -> Corolla -> Androecium (male) -> Gynoecium (female).',
    examples: 'Complete: Hibiscus, Mustard. Incomplete: Begonia, Maize.'
  },
  {
    id: 'g6-bio-card-flower-pollination',
    section: 'flower',
    title: 'Pollination & Fertilization',
    prompt: 'How do self/cross pollination, wind/insect pollination, and fertilization work?',
    answer: 'Pollination: transfer of pollen from anther to stigma. Self (same plant) vs Cross (different plants of same species). Insect-pollinated: colorful, fragrant, nectar, sticky pollen/stigma. Wind-pollinated: dull, no nectar, abundant light pollen, feathery stigma. Fertilization: male gamete fuses with egg cell in ovule to form diploid zygote.',
    memoryTip: 'Insect = bright/sticky/nectar. Wind = feathery/light/abundant.',
    examples: 'Insect: Rose, Jasmine. Wind: Maize, Rice, Grasses.'
  },
  {
    id: 'g6-bio-card-flower-fruit-germination',
    section: 'flower',
    title: 'Fruit Formation & Germination',
    prompt: 'What is a fruit and what conditions are needed for germination?',
    answer: 'Fruit: mature ripened ovary after fertilization; protects seeds, stores nutrients, aids dispersal. Germination: dormant embryo develops into seedling. Essential conditions: Water (hydrates protoplasm, activates enzymes), Oxygen (respiration), and Suitable Temperature (optimal warmth 20°C–35°C).',
    memoryTip: 'Germination needs WOW: Water, Oxygen, Warmth (20°C–35°C).',
    examples: 'Pericarp covers the fruit and protects developing seeds.'
  },
  {
    id: 'g6-bio-card-cell-unit',
    section: 'cell',
    title: 'Cell as the Unit of Life & Organelles',
    prompt: 'Why is the cell the unit of life, and what are key organelles?',
    answer: 'Cell: structural and functional unit of life because all organisms are assembled from cells and all vital activities occur at cellular level. Nucleus: control room housing genes/chromatin. Mitochondria: powerhouse generating ATP by respiration. Ribosomes: protein synthesis. Lysosomes: suicide bags with hydrolytic enzymes. Chromatin: DNA + proteins.',
    memoryTip: 'Nucleus = control, Mitochondria = ATP powerhouse, Ribosomes = protein, Lysosomes = suicide bags.',
    examples: 'Mitochondria oxidize carbs and fatty acids to synthesize ATP.'
  },
  {
    id: 'g6-bio-card-cell-wall-membrane',
    section: 'cell',
    title: 'Cell Wall vs Cell Membrane',
    prompt: 'How do the cell wall and cell membrane differ?',
    answer: 'Cell Wall: rigid, non-living outer layer found in plants, fungi, and bacteria (composed primarily of cellulose in plants); freely permeable; gives shape and protection. Cell Membrane: delicate, living, flexible boundary in all cells; phospholipid bilayer with proteins; selectively permeable regulating entry and exit.',
    memoryTip: 'Wall = non-living, rigid, found in plants, fungi, and bacteria, and freely permeable. Membrane = living, flexible, all cells, selectively permeable.',
    examples: 'Plant cell wall prevents osmotic bursting.'
  },
  {
    id: 'g6-bio-card-plant-vs-animal-cells',
    section: 'cell',
    title: 'Plant vs Animal Cells & Pigments',
    prompt: 'How do plant and animal cells differ, and why are plant parts colorful?',
    answer: 'Plant cells: cell wall, plastids, large central vacuole, no centrosome. Animal cells: no cell wall or plastids, centrioles/centrosome present, small/no vacuoles, prominent lysosomes. Pigments: yellow papaya (carotenoids in chromoplasts), green spinach (chlorophyll in chloroplasts), red watermelon (lycopene in chromoplasts).',
    memoryTip: 'Plants = wall + plastids + large vacuole. Animals = no wall/plastids + centrosome.',
    examples: 'Chloroplasts synthesize food by photosynthesis.'
  },
  {
    id: 'g6-bio-card-digestion-processes',
    section: 'digestive-system',
    title: 'Digestion, Absorption & Assimilation',
    prompt: 'What are the main nutritional processes and types of digestion?',
    answer: 'Digestion: breaking insoluble complex food macromolecules into simpler soluble diffusible molecules via hydrolytic enzymes. Absorption: uptake of digested nutrients from intestinal lumen into blood and lymph. Assimilation: utilization of absorbed nutrients by body cells for energy, growth, and repair. Mechanical digestion (chewing, churning) vs Chemical digestion (enzymes).',
    memoryTip: 'Digestion = breakdown -> Absorption = uptake into blood -> Assimilation = use by cells.',
    examples: 'Teeth crush food mechanically, increasing surface area for chemical digestion.'
  },
  {
    id: 'g6-bio-card-teeth-saliva',
    section: 'digestive-system',
    title: 'Teeth Types, Plaque & Saliva',
    prompt: 'What are the 4 types of teeth, dental plaque, and salivary functions?',
    answer: 'Teeth: 32 total (16 per jaw) -> Incisors (8, cutting), Canines (4, tearing), Premolars (8, crushing), Molars (12, grinding). Plaque: sticky yellowish biofilm of bacteria, saliva, food debris. Saliva: lubricates food into bolus, salivary amylase (ptyalin) converts cooked starch to maltose, lysozyme destroys bacteria.',
    memoryTip: 'Teeth: 8 Incisors, 4 Canines, 8 Premolars, 12 Molars (32 total). Saliva: ptyalin (starch) + lysozyme (bacteria).',
    examples: 'Dental plaque accumulates on tooth enamel if oral hygiene is neglected.'
  },
  {
    id: 'g6-bio-card-intestines-pancreas',
    section: 'digestive-system',
    title: 'Intestines, Bile & Pancreatic Enzymes',
    prompt: 'How do the intestines, bile, and pancreatic juice digest food?',
    answer: 'Small intestine (6m; Duodenum, Jejunum, Ileum): final digestion & nutrient absorption. Large intestine (1.5m; Caecum, Colon, Rectum): absorbs water/minerals, compacts feces. Bile salts: emulsification (breaks fat globules into micro-droplets). Pancreatic juice: Trypsin (proteins to peptides), Lipase/steapsin (fats to fatty acids & glycerol), Amylase/amylopsin (starch to maltose).',
    memoryTip: 'Small intestine = 6m (absorbs nutrients). Large intestine = 1.5m (absorbs water). Pancreas: Trypsin, Lipase, Amylase.',
    examples: 'Emulsification provides a massive surface area for pancreatic lipase action.'
  }
];

export const SHIZA_BIOLOGY_LESSON: BiologyLesson = {
  id: 'biology-grade-6-chapters-1-4',
  grade: 6,
  title: 'Grade 6 Biology Revision',
  sourceName: 'Biology Comprehensive Study Guide (Chapters 1 to 4)',
  memoryTip: 'Recall key biological definitions and structures first, then review explanations and recheck tricky spots.',
  sections: BIOLOGY_SECTIONS,
  cards: biologyCards,
  questions: [
    // Chapter 1: The Leaf (12 questions)
    written(
      'g6-bio-ch1-qa-1',
      'leaf',
      'What is meant by a node?',
      'The point on the stem from where a leaf arises is called a node.',
      'Mentions the point or place on the stem from where a leaf arises or grows.',
      'A node is the specific point on a plant stem from which a leaf arises.',
      [
        'The point on the stem from where a leaf arises is called a node',
        'The point on the stem from where a leaf arises',
        'A node is the point on the stem from where a leaf arises',
        'Point on the stem from where a leaf arises',
        'Point on the stem from which a leaf arises',
        'The point on the stem from which a leaf arises',
        'point on stem from where leaf arises',
        'point on stem where a leaf arises',
        'point where a leaf arises on the stem',
        'where a leaf arises on the stem'
      ]
    ),
    written(
      'g6-bio-ch1-qa-2',
      'leaf',
      'What are the main parts of a leaf?',
      'Lamina (leaf blade), petiole (leaf stalk), midrib, veins and veinlets, and leaf base.',
      'Names the key parts of a leaf: lamina/leaf blade, petiole/leaf stalk, midrib, veins/veinlets, and leaf base (accept at least 3-4 primary parts: lamina, petiole, midrib, veins, leaf base).',
      'The main parts are lamina (leaf blade), petiole (leaf stalk), midrib (central vein), veins and veinlets, and leaf base.',
      [
        'Lamina, petiole, midrib, veins and veinlets, and leaf base',
        'Lamina, petiole, midrib, veins and veinlets, leaf base',
        'Lamina, petiole, midrib, veins, veinlets, and leaf base',
        'Lamina, petiole, midrib, veins, veinlets, leaf base',
        'Lamina, petiole, midrib, veins, leaf base',
        'Lamina, petiole, midrib, veins and leaf base',
        'Leaf blade, petiole, midrib, veins, leaf base',
        'Leaf blade, petiole, midrib, veins, veinlets, leaf base',
        'Leaf blade, leaf stalk, midrib, veins, leaf base',
        'Lamina, petiole, midrib, veins'
      ]
    ),
    written(
      'g6-bio-ch1-qa-3',
      'leaf',
      'What is a petiole? State its function.',
      'The petiole is the short, narrow, and cylindrical part of a leaf. It attaches the leaf lamina to the stem and conducts water and nutrients.',
      'Defines petiole as the leaf stalk connecting the lamina to the stem and states its function (attaching the blade to the stem and conducting water/nutrients).',
      'The petiole connects the lamina to the stem and conducts water and nutrients between them.',
      [
        'The petiole is the short, narrow, and cylindrical part of a leaf. It attaches the leaf lamina to the stem and conducts water and nutrients',
        'The stalk connecting the leaf lamina to the stem. It attaches the leaf and conducts water and nutrients',
        'The stalk connecting the leaf lamina to the stem. It attaches the leaf lamina to the stem and conducts water and nutrients.',
        'Stalk connecting lamina to stem, conducts water and nutrients',
        'The stalk of a leaf that attaches the blade to the stem and conducts water and nutrients'
      ]
    ),
    written(
      'g6-bio-ch1-qa-4',
      'leaf',
      'Name one plant where a whorled arrangement of leaves is found.',
      'Nerium oleander',
      'Names Nerium or Nerium oleander.',
      'Nerium oleander features a whorled arrangement where more than two leaves arise at each node.',
      ['Nerium oleander', 'Nerium', 'Oleander', 'Nerium plant']
    ),
    written(
      'g6-bio-ch1-qa-5',
      'leaf',
      'Name two insectivorous plants.',
      'Pitcher plant and Venus flytrap',
      'Names Pitcher plant and Venus flytrap (or other valid insectivorous plants such as sundew or bladderwort).',
      'Pitcher plant and Venus flytrap trap and digest insects to obtain essential nutrients.',
      [
        'Pitcher plant and Venus flytrap',
        'Venus flytrap and Pitcher plant',
        'Pitcher plant, Venus flytrap',
        'Venus flytrap, Pitcher plant',
        'Pitcher plant and Venus fly trap',
        'Venus fly trap and pitcher plant',
        'Pitcher plant, Venus fly trap',
        'Pitcher plant & Venus flytrap',
        'Venus flytrap & Pitcher plant',
        'Pitcher plant and sundew',
        'Venus flytrap and sundew',
        'Sundew and pitcher plant',
        'Sundew and Venus flytrap',
        'Pitcher plant, sundew'
      ]
    ),
    written(
      'g6-bio-ch1-qa-6',
      'leaf',
      'What is venation? Describe the various types of leaf venation.',
      'The arrangement of veins and veinlets on the lamina of a leaf is called venation. Reticulate venation: Veins form an interconnected web or net-like network across the blade (e.g., Peepal, Rose, Guava). Parallel venation: Veins run parallel to each other from the base to the apex without forming a network (e.g., Banana, Grass).',
      'Defines venation as the arrangement of veins/veinlets on the leaf blade, and describes reticulate (net-like network; Peepal/Rose) and parallel venation (parallel veins; Banana/Grass) with examples.',
      'Venation is the vein pattern on a leaf blade. Reticulate forms an interconnected web (Peepal, Rose); Parallel veins run side-by-side without a network (Banana, Grass).'
    ),
    written(
      'g6-bio-ch1-qa-7',
      'leaf',
      'State the various functions of leaves.',
      '1. Manufacturing of food: Leaves prepare food for the entire plant by photosynthesis in the presence of chlorophyll, sunlight, water, and carbon dioxide. 2. Gaseous exchange: Minute microscopic pores called stomata present on the surface facilitate the exchange of oxygen and carbon dioxide during photosynthesis and respiration. 3. Transpiration: Excess water absorbed by roots is released into the atmosphere as water vapor through the stomata, which creates suction pull and cools the plant.',
      'States the three primary functions: manufacturing food by photosynthesis, gaseous exchange through stomata, and transpiration (releasing excess water vapor, cooling, suction pull).',
      'Leaves manufacture food (photosynthesis), exchange gases (via stomata), and transpire excess water vapor to cool the plant.'
    ),
    written(
      'g6-bio-ch1-qa-8',
      'leaf',
      'What is a leaf tendril? How does it help the plant?',
      'In many climbers, the leaf or parts of the leaf are modified into a thin, thread-like coiled structure called a tendril. Tendrils stretch out and twine securely around adjacent objects to provide structural support to weak stems (e.g., Pea plant).',
      'Defines leaf tendril as a thin thread-like coiled modified leaf structure, and explains that it twines around supports to provide mechanical support to weak stems.',
      'Leaf tendrils are thread-like coiled structures that twine around supports to help climbing plants with weak stems (like peas).'
    ),
    written(
      'g6-bio-ch1-qa-9',
      'leaf',
      'State the functions of leaf spines.',
      'In certain xerophytic plants (e.g., Opuntia), leaves or leaf parts become modified into sharp, pointed structures called spines: 1. They drastically reduce water loss through transpiration. 2. They defend the plant against grazing herbivorous animals.',
      'Mentions reducing water loss through transpiration and protecting/defending the plant from grazing herbivorous animals.',
      'Leaf spines in xerophytes like Opuntia drastically reduce transpiration water loss and deter grazing herbivores.'
    ),
    written(
      'g6-bio-ch1-qa-10',
      'leaf',
      'Describe vegetative propagation in Bryophyllum.',
      'In Bryophyllum, vegetative reproduction occurs via adventitious buds located along the notches of the leaf margins. Under favorable moist conditions, when a mature leaf falls onto soil, these dormant buds sprout roots and shoots into miniature plantlets that detach to grow as independent plants.',
      'Mentions adventitious buds in notches along leaf margins that sprout roots and shoots into miniature plantlets in moist soil to grow as independent plants.',
      'Bryophyllum reproduces through adventitious buds along the leaf notches that sprout into independent plantlets on moist soil.'
    ),
    written(
      'g6-bio-ch1-qa-11',
      'leaf',
      'Differentiate between a simple leaf and a compound leaf.',
      'Simple Leaf: Consists of a single, undivided leaf blade (lamina). An axillary bud is present in the axil of the leaf. Examples: Mango, Guava, Peepal. Compound Leaf: The leaf blade is completely divided into multiple distinct leaflets. Axillary buds are absent in the axils of individual leaflets (present only in the main leaf stalk axil). Examples: Neem, Rose, Amla.',
      'Contrasts single undivided blade vs divided leaflets, axillary bud present in leaf axil vs absent in leaflet axils, along with examples for both.',
      'Simple leaves have an undivided blade and an axillary bud (Mango). Compound leaves are split into distinct leaflets without axillary buds at individual leaflets (Neem, Rose).'
    ),
    written(
      'g6-bio-ch1-qa-12',
      'leaf',
      'What is meant by phyllotaxy? Name its different types.',
      'The pattern of arrangement of leaves on the stem or branch is known as phyllotaxy. It comprises three primary types: Alternate: A single leaf arises at each node in an alternating sequence (e.g., Mustard, Sunflower). Opposite: Two leaves arise at each node opposite to each other (e.g., Guava, Tulsi). Whorled: More than two leaves arise at a single node forming a circular circle or whorl (e.g., Nerium).',
      'Defines phyllotaxy as the leaf arrangement pattern on stem/branch, and names all three types: alternate, opposite, and whorled with examples.',
      'Phyllotaxy is the leaf arrangement pattern on a stem: Alternate (Mustard), Opposite (Tulsi, Guava), and Whorled (Nerium).'
    ),

    // Chapter 2: The Flower (13 questions)
    written(
      'g6-bio-ch2-qa-1',
      'flower',
      'List the main parts of a flower.',
      'A typical flower consists of four concentric floral whorls: Calyx (sepals), Corolla (petals), Androecium (stamens), and Gynoecium / Pistil (carpels).',
      'Lists all four floral whorls: Calyx (sepals), Corolla (petals), Androecium (stamens), and Gynoecium/Pistil (carpels).',
      'The four concentric whorls are Calyx (sepals), Corolla (petals), Androecium (stamens), and Gynoecium / Pistil (carpels).',
      [
        'Calyx, Corolla, Androecium, and Gynoecium',
        'Calyx, Corolla, Androecium, Gynoecium',
        'Calyx, corolla, androecium, gynoecium',
        'Calyx, corolla, androecium and gynoecium',
        'Calyx, corolla, androecium, and pistil',
        'Calyx, corolla, androecium, pistil',
        'Calyx, corolla, androecium and pistil',
        'Calyx (sepals), Corolla (petals), Androecium (stamens), Gynoecium (carpels)',
        'Sepals, petals, stamens, and carpels',
        'Sepals, petals, stamens, carpels',
        'Sepals, petals, stamens, and pistil',
        'Sepals, petals, stamens, pistil'
      ]
    ),
    written(
      'g6-bio-ch2-qa-2',
      'flower',
      'What are pollen grains? Where are they produced?',
      'Pollen grains are microscopic powdery reproductive structures that contain the male gametes. They are produced inside the anthers of the stamens.',
      'Defines pollen grains as powdery structures containing male gametes, and states that they are produced inside the anthers.',
      'Pollen grains carry male gametes and develop inside the anthers of stamens.',
      [
        'Pollen grains are microscopic powdery reproductive structures that contain the male gametes. They are produced inside the anthers of the stamens',
        'Microscopic powdery reproductive structures that contain the male gametes. They are produced inside the anthers of the stamens',
        'Microscopic powdery structures containing male gametes, produced inside anthers',
        'Pollen grains contain male gametes and are produced inside the anthers',
        'Pollen grains contain male gametes. They are produced in the anthers.',
        'Pollen grains contain male gametes and are produced in the anthers',
        'Pollen grains contain male gametes and are produced in anthers',
        'Produced in the anthers of stamens and contain male gametes'
      ]
    ),
    written(
      'g6-bio-ch2-qa-3',
      'flower',
      'Why are pollen grains produced in large quantities in wind-pollinated flowers?',
      'Wind pollination is a non-directional process where immense amounts of pollen are blown away and lost in the air. A massive quantity ensures that at least a sufficient number reach the receptive feathery stigmas of neighboring flowers.',
      'Explains that wind carries pollen non-directionally leading to huge loss, so large numbers ensure enough pollen lands on receptive feathery stigmas.',
      'Because wind pollination is non-directional and wasteful, huge quantities ensure enough pollen reaches receptive stigmas.'
    ),
    written(
      'g6-bio-ch2-qa-4',
      'flower',
      'What is pollination? What are its various types?',
      'Pollination is the transfer of pollen grains from the ripe anther to the receptive stigma of a flower. It is classified into two main types: Self-pollination: Transfer within the same flower or between flowers of the same individual plant. Cross-pollination: Transfer of pollen grains from the anther of one flower to the stigma of a flower on another plant of the same species.',
      'Defines pollination as pollen transfer from anther to stigma, and explains self-pollination (same plant) and cross-pollination (different plants of same species).',
      'Pollination is the transfer of pollen from anther to stigma. Self-pollination stays on the same plant; cross-pollination transfers pollen to another plant of the same species.',
      [
        'Pollination is the transfer of pollen grains from anther to stigma. Types are self-pollination and cross-pollination.',
        'Transfer of pollen grains from anther to stigma. Types are self-pollination and cross-pollination',
        'Transfer of pollen from anther to stigma. Types: self-pollination and cross-pollination.'
      ]
    ),
    written(
      'g6-bio-ch2-qa-5',
      'flower',
      'What is fertilization?',
      'Fertilization is the process of fusion of the male reproductive gamete (from the pollen tube) with the female gamete (egg cell inside the ovule) to form a diploid zygote.',
      'States the fusion of the male reproductive gamete with the female gamete (egg cell inside the ovule) to form a zygote.',
      'Fertilization is the fusion of a male gamete with a female egg cell in the ovule to produce a zygote.',
      [
        'Fertilization is the process of fusion of the male reproductive gamete with the female gamete to form a diploid zygote',
        'The process of fusion of the male reproductive gamete with the female gamete to form a diploid zygote',
        'Fusion of male gamete with female gamete to form a zygote',
        'The fusion of male and female gametes to form a zygote',
        'Fusion of male and female gametes to form a zygote.',
        'Fusion of male and female gametes to form a diploid zygote.',
        'Process of fusion of male and female gametes to form a zygote'
      ]
    ),
    written(
      'g6-bio-ch2-qa-6',
      'flower',
      'Differentiate between Androecium and Gynoecium.',
      'Androecium: Male reproductive whorl of the flower; consists of individual units called stamens; each stamen consists of a slender filament and a two-lobed anther; anthers synthesize and shed pollen grains carrying male gametes. Gynoecium: Female reproductive whorl of the flower; consists of individual units called carpels or pistils; each carpel consists of an ovary, an elongated style, and a terminal stigma; the ovary encloses ovules that bear the female egg cells.',
      'Contrasts male whorl (stamens, filament, anther, pollen grains/male gametes) with female whorl (carpels/pistil, ovary, ovules/egg cells, style, stigma).',
      'Androecium is the male whorl made of stamens (filament + anther producing pollen). Gynoecium is the female whorl made of carpels (ovary with ovules, style, stigma).'
    ),
    written(
      'g6-bio-ch2-qa-7',
      'flower',
      'Differentiate between Complete Flower and Incomplete Flower.',
      'Complete Flower: Contains all four floral whorls: calyx, corolla, androecium, and gynoecium. Always bisexual in nature. Examples: Hibiscus, Mustard, Pea, Petunia. Incomplete Flower: Lacks one or more of the four principal whorls. Can be unisexual (staminate/pistillate) or neuter. Examples: Begonia, Mulberry, Maize, Date palm.',
      'Contrasts having all four floral whorls and always bisexual (complete) vs lacking one or more principal whorls and unisexual/neuter (incomplete), with examples.',
      'Complete flowers possess all 4 whorls (Hibiscus, Mustard). Incomplete flowers lack one or more whorls (Begonia, Maize).'
    ),
    written(
      'g6-bio-ch2-qa-8',
      'flower',
      'Differentiate between Self-Pollination and Cross-Pollination.',
      'Self-Pollination: Involves only a single parent plant. Pollen transferred to the stigma of the same flower or another flower on the identical plant. External pollinating agents (insects, wind, water) are usually not mandatory. Cross-Pollination: Requires two distinct parent plants of the same species. Pollen transferred from an anther of one flower to the stigma of a flower on a separate plant. External pollinating agents (wind, water, insects, birds) are essential.',
      'Contrasts single parent plant vs two distinct plants of the same species, pollen destination, and whether external pollinating agents are essential.',
      'Self-pollination occurs on the same plant without requiring agents; cross-pollination requires two parent plants of the same species and relies on pollinating agents.'
    ),
    written(
      'g6-bio-ch2-qa-9',
      'flower',
      'Differentiate between Insect-Pollinated and Wind-Pollinated Flowers.',
      'Insect-Pollinated (Entomophilous): Petals are large, conspicuous, and brightly colored. Produce pleasant fragrance and sugary nectar to attract vectors. Pollen grains are fewer, heavier, and covered with a sticky coating. Stigma is sticky, compact, and positioned inside petals. Examples: Rose, Marigold, Jasmine. Wind-Pollinated (Anemophilous): Petals are small, inconspicuous, dull, or absent. Do not produce scent or nectar. Pollen grains are dry, light, non-sticky, and produced in huge numbers. Stigma is large, feathery, and exerted out of the flower to catch pollen. Examples: Maize, Rice, Wheat, Grasses.',
      'Contrasts petal size/color, fragrance/nectar presence, pollen properties (sticky/heavy vs light/dry/abundant), and stigma characteristics (sticky/compact vs large/feathery) with examples.',
      'Insect flowers have large bright petals, fragrance, nectar, and sticky pollen. Wind flowers have small dull petals, no scent/nectar, abundant light pollen, and feathery stigmas.'
    ),
    written(
      'g6-bio-ch2-qa-10',
      'flower',
      'Explain the different parts of a carpel.',
      'The carpel (pistil) is the female reproductive unit consisting of three zones: Ovary: The basal swollen hollow structure that contains one or more rounded ovules holding the female egg cell. Style: The slender, elongated tube-like stalk connecting the ovary to the upper landing platform. Stigma: The expanded, receptive, sticky or disc-like tip designed to capture and hold incoming pollen grains.',
      'Explains all three carpel parts: ovary (basal swollen chamber holding ovules/egg cells), style (slender stalk), and stigma (sticky receptive tip for pollen).',
      'The carpel has three zones: Ovary (swollen base with ovules), Style (slender connecting stalk), and Stigma (sticky receptive tip).'
    ),
    written(
      'g6-bio-ch2-qa-11',
      'flower',
      'Describe the special characteristics of flowers pollinated by insects.',
      '1. They feature brightly pigmented, prominent petals to catch insect attention from distances. 2. They secrete sweet nectar from specialized glands as a food reward. 3. They often produce strong fragrances (especially nocturnal bloomers like Night Jasmine). 4. Their pollen grains and stigmas are rough and sticky to easily adhere to visiting insect bodies.',
      'Lists brightly colored prominent petals, nectar secretion as reward, pleasant fragrance/scent, and rough sticky pollen grains and stigmas.',
      'Insect-pollinated flowers have colorful petals, nectar glands, fragrant scents, and sticky pollen and stigmas to adhere to insects.'
    ),
    written(
      'g6-bio-ch2-qa-12',
      'flower',
      'What is a fruit? State its functions.',
      'A fruit is a mature, ripened ovary developed after fertilization. A fleshy fruit generally comprises a pericarp (epicarp, mesocarp, endocarp) and one or more seeds. Functions: 1. Protects embryonic seeds from environmental fluctuations, predators, and pathogens during development. 2. Stores nutrient reserves (sugars, starches, vitamins, organic acids). 3. Aids in the dispersal of seeds over wide geographical distances by enticing animals.',
      'Defines fruit as a mature ripened ovary formed after fertilization, and lists functions: protecting embryonic seeds, storing nutrients, and aiding seed dispersal.',
      'A fruit is a ripened fertilized ovary. It protects seeds, stores nutrients, and aids seed dispersal by enticing animals.'
    ),
    written(
      'g6-bio-ch2-qa-13',
      'flower',
      'What is germination? List the conditions necessary for germination.',
      'Germination is the physiological process through which a dormant embryo inside a viable seed resumes metabolic activity and develops into a seedling. Essential conditions: Water: To hydrate protoplasm, soften the seed coat, and activate digestive enzymes. Oxygen: Required for aerobic respiration to release energy for rapid cellular growth. Suitable Temperature: Optimal warmth (typically 20°C–35°C) to enable vital enzymatic reactions.',
      'Defines germination as embryo development into a seedling; lists water, oxygen, and suitable temperature (20°C–35°C) along with their physiological reasons.',
      'Germination is the growth of a seed embryo into a seedling. It requires water (hydration/enzymes), oxygen (cellular respiration), and suitable temperature (20-35°C).'
    ),

    // Chapter 3: The Cell (11 questions)
    written(
      'g6-bio-ch3-qa-1',
      'cell',
      'Why is the cell membrane called a selectively permeable membrane?',
      'The cell membrane permits the entry and exit of only selected substances while restricting the passage of others; hence, it is called selectively permeable.',
      'Explains that it allows only selected/certain substances to enter and exit while blocking or restricting others.',
      'The cell membrane regulates transport, allowing only chosen substances to pass in and out of the cell.',
      [
        'The cell membrane permits the entry and exit of only selected substances while restricting the passage of others; hence, it is called selectively permeable',
        'Because it permits the entry and exit of only selected substances while restricting the passage of others',
        'It permits the entry and exit of only selected substances while restricting others',
        'It allows only selected substances to pass while restricting others',
        'It allows only certain substances to pass through while restricting others',
        'Because it allows only selected substances to enter and leave the cell',
        'It allows only selected substances to enter and exit while restricting others'
      ]
    ),
    written(
      'g6-bio-ch3-qa-2',
      'cell',
      'What is the chromatin network?',
      'The chromatin network is an intertwined, diffuse tangle of fine, thread-like structures composed of DNA and proteins suspended in the nucleoplasm of a non-dividing cell. During cell division, it condenses into distinct chromosomes.',
      'Describes it as an intertwined tangle of thread-like structures made of DNA and proteins in the nucleoplasm that condense into chromosomes during cell division.',
      'The chromatin network consists of DNA and protein threads in the nucleus that condense into chromosomes during cell division.',
      [
        'The chromatin network is an intertwined, diffuse tangle of fine, thread-like structures composed of DNA and proteins suspended in the nucleoplasm of a non-dividing cell. During cell division, it condenses into distinct chromosomes',
        'An intertwined tangle of thread-like structures composed of DNA and proteins that condense into chromosomes during cell division',
        'A diffuse tangle of fine thread-like structures composed of DNA and proteins in the nucleoplasm'
      ]
    ),
    written(
      'g6-bio-ch3-qa-3',
      'cell',
      'What are ribosomes?',
      'Ribosomes are dense, minute, non-membrane-bound granular organelles found either freely suspended in the cytoplasm or bound to the endoplasmic reticulum. They serve as the primary sites of protein synthesis.',
      'Identifies ribosomes as tiny granular organelles in cytoplasm or on endoplasmic reticulum that serve as sites of protein synthesis.',
      'Ribosomes are tiny granular organelles that synthesize proteins in the cell.',
      [
        'Ribosomes are dense, minute, non-membrane-bound granular organelles found either freely suspended in the cytoplasm or bound to the endoplasmic reticulum. They serve as the primary sites of protein synthesis',
        'Minute granular organelles that serve as the primary sites of protein synthesis',
        'Organelles that serve as the primary sites of protein synthesis',
        'Sites of protein synthesis in the cell',
        'Ribosomes are the sites of protein synthesis',
        'Ribosomes are organelles that synthesize proteins',
        'Primary sites of protein synthesis'
      ]
    ),
    written(
      'g6-bio-ch3-qa-4',
      'cell',
      'Why is the cell called the structural and functional unit of a living organism?',
      'All living organisms are assembled from cells as their fundamental structural building blocks. Furthermore, every vital physiological and metabolic activity of an organism is carried out at the cellular level, and a single cell possesses the independent capability to sustain life processes.',
      'Explains that all living things are assembled from cells as basic structural units, and all vital metabolic/physiological processes take place inside cells.',
      'Cells provide the structural architecture for living organisms and perform all vital metabolic activities necessary to sustain life.'
    ),
    written(
      'g6-bio-ch3-qa-5',
      'cell',
      'Why is papaya yellow, spinach green, and the edible part of a watermelon red?',
      'Papaya is yellow: Due to carotenoid pigments contained inside chromoplasts. Spinach is green: Due to the abundance of green chlorophyll pigments in chloroplasts. Watermelon pulp is red: Due to the pigment lycopene present in chromoplasts.',
      'Attributes yellow papaya to carotenoids in chromoplasts, green spinach to chlorophyll in chloroplasts, and red watermelon to lycopene in chromoplasts.',
      'Papaya is yellow due to carotenoids (chromoplasts), spinach is green due to chlorophyll (chloroplasts), and watermelon is red due to lycopene (chromoplasts).',
      [
        'Papaya is yellow due to carotenoids in chromoplasts, spinach is green due to chlorophyll in chloroplasts, and watermelon is red due to lycopene in chromoplasts.',
        'Papaya is yellow due to carotenoids (chromoplasts), spinach is green due to chlorophyll (chloroplasts), and watermelon is red due to lycopene (chromoplasts).'
      ]
    ),
    written(
      'g6-bio-ch3-qa-6',
      'cell',
      'Differentiate between Cell Wall and Cell Membrane.',
      'Cell Wall: Outermost rigid, non-living protective layer. Found in plant cells, bacteria, and fungi. Composed primarily of cellulose in plants. Freely permeable to water and dissolved solutes. Cell Membrane (Plasma Membrane): Delicate, living, flexible boundary enclosing protoplasm. Found in all living cells (both plant and animal cells). Composed of a phospholipid bilayer with embedded proteins. Selectively permeable, strictly regulating solute traffic.',
      'Contrasts non-living/rigid vs living/flexible, found in plants/fungi/bacteria vs all living cells, cellulose composition vs phospholipid bilayer with proteins, and freely permeable vs selectively permeable.',
      'Cell wall: rigid, non-living, found in plants, fungi, and bacteria, and freely permeable. Cell membrane: living, flexible, phospholipid bilayer, all cells, selectively permeable.'
    ),
    written(
      'g6-bio-ch3-qa-7',
      'cell',
      '"The nucleus is the most important part of a cell." Explain this statement.',
      'The nucleus is universally regarded as the central control room of the cell because: 1. It directs, regulates, and coordinates all cellular metabolic and life activities. 2. It houses genes on chromatin threads that carry hereditary information from parents to progeny. 3. It orchestrates and initiates cellular division and cell cycle progression.',
      'Explains that the nucleus coordinates and regulates all metabolic activities, carries hereditary genetic information (genes/DNA), and directs cell division.',
      'The nucleus functions as the cell control room: coordinating metabolic activities, housing hereditary genes, and directing cell division.'
    ),
    written(
      'g6-bio-ch3-qa-8',
      'cell',
      'List the functions of mitochondria. Why are they called the "powerhouse of the cell"?',
      'Mitochondria are the primary sites of cellular aerobic respiration. They break down and oxidize carbohydrate and fatty acid substrates to synthesize high-energy Adenosine Triphosphate (ATP) molecules. Because ATP acts as the universal chemical energy currency for all biological tasks, mitochondria are known as the "powerhouse of the cell."',
      'States they perform cellular aerobic respiration to synthesize ATP; explains that they are called powerhouses because ATP powers all cellular activities.',
      'Mitochondria perform aerobic respiration to produce ATP. Because ATP is the universal chemical energy currency, they are called powerhouses of the cell.'
    ),
    written(
      'g6-bio-ch3-qa-9',
      'cell',
      'Which structure of a plant cell is non-living, and what are its functions?',
      'The cell wall is the non-living structure of a plant cell. Key Functions: 1. Provides a definite mechanical shape, rigidity, and structural architecture to the plant cell. 2. Protects the delicate internal protoplast from physical stress and osmotic bursting.',
      'Names the cell wall as the non-living plant cell structure, and gives functions: providing shape/rigidity and protecting internal protoplast from physical stress and osmotic bursting.',
      'The cell wall is non-living. It gives mechanical shape and rigidity, and protects the plant cell against osmotic bursting.',
      [
        'Cell wall. It provides a definite shape and rigidity, and protects the protoplast from physical stress and osmotic bursting.',
        'The cell wall. It provides mechanical shape, rigidity, and protects against osmotic bursting.',
        'Cell wall. Provides shape, rigidity, and protection from osmotic bursting.',
        'The cell wall',
        'Cell wall'
      ]
    ),
    written(
      'g6-bio-ch3-qa-10',
      'cell',
      'Differentiate between a Plant Cell and an Animal Cell.',
      'Plant Cell: Enclosed by a rigid, non-living outer cellulose cell wall. Plastids (chloroplasts, chromoplasts, leucoplasts) are present. Centrosome and centrioles are typically absent. Possesses one large, permanent central vacuole. Lysosomes are rare or absent. Animal Cell: Cell wall is completely absent; bounded only by cell membrane. Plastids are completely absent. Centrosome with centrioles is present near the nucleus. Vacuoles are either absent or small, temporary, and multiple. Lysosomes are prominent and regularly present.',
      'Contrasts cell wall presence, plastids presence, vacuole characteristics (large central vs small/none), centrosome presence, and lysosome occurrence.',
      'Plant cells have a cell wall, plastids, and a large central vacuole. Animal cells lack cell walls and plastids, possess centrosomes, and have prominent lysosomes.'
    ),
    written(
      'g6-bio-ch3-qa-11',
      'cell',
      'Why are lysosomes called the "suicide bags" of the cell?',
      'Lysosomes house potent hydrolytic digestive enzymes. If a cell suffers irreparable physical injury, disease, or metabolic starvation, the lysosomal membranes rupture, releasing enzymes that autolyze and digest the host cell\'s own components. Consequently, they are termed "suicide bags."',
      'Explains that lysosomes contain hydrolytic digestive enzymes that rupture and digest/autolyze the host cell itself when damaged or diseased.',
      'Lysosomes contain hydrolytic enzymes that burst and digest their own damaged or dying cell, earning the title suicide bags.',
      [
        'Lysosomes house potent hydrolytic digestive enzymes. If a cell suffers irreparable physical injury, disease, or metabolic starvation, the lysosomal membranes rupture, releasing enzymes that autolyze and digest the host cell\'s own components. Consequently, they are termed "suicide bags."',
        'Lysosomes contain hydrolytic enzymes that digest the cell itself when damaged or injured.',
        'They contain hydrolytic digestive enzymes that rupture and digest their own cell when damaged.',
        'Because they contain digestive enzymes that can burst and destroy their own cell.'
      ]
    ),

    // Chapter 4: The Digestive System (10 questions)
    written(
      'g6-bio-ch4-qa-1',
      'digestive-system',
      'Differentiate between Digestion and Absorption.',
      'Digestion: The biochemical process of breaking down insoluble, complex food macromolecules into simpler, soluble diffusible molecules via hydrolytic enzymes. Absorption: The physiological uptake of simple soluble digested nutrients from the intestinal lumen across the mucosal membrane into the blood and lymph circulation.',
      'Contrasts breaking down complex insoluble food into simple soluble diffusible molecules (digestion) vs uptake of digested nutrients into blood and lymph (absorption).',
      'Digestion breaks down complex food macromolecules into simpler soluble molecules; absorption takes those nutrients from the gut into blood and lymph.'
    ),
    written(
      'g6-bio-ch4-qa-2',
      'digestive-system',
      'Differentiate between Mechanical Digestion and Chemical Digestion.',
      'Mechanical Digestion: Physical pulverization, crushing, and mastication of food carried out by the teeth and tongue, as well as peristaltic churning in the stomach without altering chemical bonds. Chemical Digestion: Enzymatic cleavage of complex polymers (proteins, polysaccharides, lipids) into monomers catalyzed by specific digestive juices secreted by digestive glands.',
      'Contrasts physical mastication/churning without altering chemical bonds (mechanical) vs enzymatic cleavage of polymers into monomers by digestive juices (chemical).',
      'Mechanical digestion physically pulverizes and churns food. Chemical digestion breaks chemical bonds using digestive enzymes.'
    ),
    written(
      'g6-bio-ch4-qa-3',
      'digestive-system',
      'Differentiate between Small Intestine and Large Intestine.',
      'Small Intestine: Longer (about 6 meters in adults), highly coiled, with a narrower lumen diameter. Comprises three anatomical parts: Duodenum, Jejunum, and Ileum. Site of final enzymatic digestion and active nutrient absorption. Large Intestine: Shorter (about 1.5 meters), but has a broader, wider lumen. Comprises three anatomical parts: Caecum, Colon, and Rectum. Absorbs excess water and minerals; compacts undigested fecal matter.',
      'Contrasts length and lumen width (6m/narrow vs 1.5m/wide), anatomical parts (Duodenum/Jejunum/Ileum vs Caecum/Colon/Rectum), and functions (final digestion/absorption vs water absorption/feces compaction).',
      'Small intestine: 6m long, narrow (Duodenum, Jejunum, Ileum; final digestion & absorption). Large intestine: 1.5m, wide (Caecum, Colon, Rectum; water absorption & fecal compaction).'
    ),
    written(
      'g6-bio-ch4-qa-4',
      'digestive-system',
      'Differentiate between Digestion and Assimilation.',
      'Digestion: The breakdown of ingested solid food substances into absorbable simpler forms. Assimilation: The biological utilization of absorbed nutrient molecules by body cells to generate energy, build protoplasm, and facilitate tissue growth and repair.',
      'Contrasts breakdown of ingested food into absorbable simpler forms (digestion) vs cellular utilization of absorbed nutrients for energy, protoplasm, growth, and repair (assimilation).',
      'Digestion breaks food down into absorbable nutrients; assimilation is the cellular utilization of those nutrients for energy and growth.'
    ),
    written(
      'g6-bio-ch4-qa-5',
      'digestive-system',
      'How do teeth help in digestion?',
      'Teeth mechanically bite, tear, crush, and grind complex food into smaller fragments, thereby increasing the surface area for salivary and digestive enzymes to act efficiently.',
      'Explains that teeth mechanically bite, tear, crush, and grind food into smaller pieces, increasing surface area for digestive enzymes.',
      'Teeth cut and grind food into small particles, greatly amplifying the surface area for digestive enzymes.',
      [
        'Teeth mechanically bite, tear, crush, and grind complex food into smaller fragments, thereby increasing the surface area for salivary and digestive enzymes to act efficiently',
        'They bite, tear, crush, and grind food into smaller fragments, increasing surface area for enzymes',
        'Teeth crush and grind food into smaller fragments, increasing surface area for digestive enzymes',
        'They mechanically grind and crush food, increasing surface area for enzymes'
      ]
    ),
    written(
      'g6-bio-ch4-qa-6',
      'digestive-system',
      'What is dental plaque?',
      'Dental plaque is a sticky, yellowish biofilm that deposits over the surface of teeth, formed by an accumulation of saliva, food remnants, and oral bacterial colonies.',
      'Defines dental plaque as a sticky yellowish biofilm on teeth formed by bacteria, food debris, and saliva.',
      'Dental plaque is a yellowish bacterial biofilm formed on teeth from saliva and food remnants.',
      [
        'Dental plaque is a sticky, yellowish biofilm that deposits over the surface of teeth, formed by an accumulation of saliva, food remnants, and oral bacterial colonies',
        'A sticky, yellowish biofilm on teeth formed by saliva, food remnants, and bacteria',
        'Sticky yellowish biofilm that deposits over teeth, formed by saliva, food remnants, and oral bacteria',
        'A sticky yellowish biofilm formed on teeth by bacteria, saliva, and food particles'
      ]
    ),
    written(
      'g6-bio-ch4-qa-7',
      'digestive-system',
      'What is emulsification of fats?',
      'Emulsification is the mechanical breakdown of large insoluble lipid globules into minute microscopic droplets by bile salts, greatly amplifying the surface area available for lipase action.',
      'Explains the breakdown of large fat/lipid globules into minute droplets by bile salts to increase surface area for lipase action.',
      'Emulsification is the breakdown of large fat globules into tiny droplets by bile salts, amplifying surface area for lipase.',
      [
        'Emulsification is the mechanical breakdown of large insoluble lipid globules into minute microscopic droplets by bile salts, greatly amplifying the surface area available for lipase action',
        'The breakdown of large insoluble lipid globules into minute droplets by bile salts, increasing surface area for lipase',
        'Mechanical breakdown of large fat globules into minute droplets by bile salts to increase surface area for lipase action',
        'Breakdown of large fat globules into small droplets by bile salts'
      ]
    ),
    written(
      'g6-bio-ch4-qa-8',
      'digestive-system',
      'Name the enzymes found in pancreatic juice.',
      'Pancreatic juice contains: Protein-digesting enzyme: Trypsin (breaks peptones and proteoses into peptides). Fat-digesting enzyme: Pancreatic Lipase (steapsin; converts lipids into fatty acids and glycerol). Carbohydrate-digesting enzyme: Pancreatic Amylase (amylopsin; digests starch into maltose).',
      'Names the three enzymes in pancreatic juice: Trypsin (protein-digesting), Pancreatic Lipase / steapsin (fat-digesting), and Pancreatic Amylase / amylopsin (carbohydrate-digesting).',
      'Pancreatic juice contains Trypsin (digests proteins), Pancreatic Lipase (digests fats), and Pancreatic Amylase (digests starches).',
      [
        'Trypsin, Pancreatic Lipase, and Pancreatic Amylase',
        'Trypsin, Pancreatic Lipase, Pancreatic Amylase',
        'Trypsin, Lipase, and Amylase',
        'Trypsin, Lipase, Amylase',
        'Trypsin, lipase, amylase',
        'Trypsin, lipase and amylase',
        'Trypsin, amylase, lipase',
        'Trypsin, amylase and lipase',
        'Trypsin, pancreatic lipase, pancreatic amylase',
        'Trypsin, pancreatic lipase and pancreatic amylase',
        'Amylase, Trypsin, Lipase',
        'Amylase, Lipase, Trypsin',
        'Trypsin, steapsin, amylopsin',
        'Trypsin, Steapsin, and Amylopsin'
      ]
    ),
    written(
      'g6-bio-ch4-qa-9',
      'digestive-system',
      'State the functions of saliva.',
      '1. Lubricates and moistens dry food with mucus and water to mold it into a swallowable mass called a bolus. 2. Contains the enzyme salivary amylase (ptyalin), which initiates chemical digestion by converting cooked starch into maltose. 3. Cleanses the oral cavity and possesses lysozyme to destroy harmful bacteria.',
      'States the three functions: moistening/lubricating food into a bolus, starch digestion by salivary amylase/ptyalin, and cleansing/germ-killing by lysozyme.',
      'Saliva moistens food into a swallowable bolus, converts starch to maltose with amylase (ptyalin), and destroys bacteria with lysozyme.'
    ),
    written(
      'g6-bio-ch4-qa-10',
      'digestive-system',
      'Name the four types of teeth in humans and mention their numbers and functions.',
      'Type of Teeth | Primary Function | Per Jaw | Total (Both Jaws): 1. Incisors: Chisel-shaped for cutting and biting food pieces; 4 per jaw; 8 total. 2. Canines: Pointed and dagger-shaped for tearing tough fibrous food; 2 per jaw; 4 total. 3. Premolars: Broad bicuspid cusps for crushing and grinding food; 4 per jaw; 8 total. 4. Molars: Broad, flat crowns with multiple ridges for thorough grinding; 6 per jaw; 12 total. Total Permanent Dentition: 16 per jaw, 32 total.',
      'Names all four types (incisors, canines, premolars, molars), specifies their counts (8 incisors, 4 canines, 8 premolars, 12 molars; 32 total), and describes their functions (cutting/biting, tearing, crushing, grinding).',
      'The 4 types of teeth are Incisors (8, cutting), Canines (4, tearing), Premolars (8, crushing), and Molars (12, grinding), totaling 32 teeth in permanent dentition.'
    )
  ]
};

export function getBiologyLessonForGrade(grade: number): BiologyLesson | undefined {
  return grade === 6 ? SHIZA_BIOLOGY_LESSON : undefined;
}

export function getBiologyLesson(studentId: StudentId): BiologyLesson {
  const profile = getStudentProfile(studentId);
  const lesson = getBiologyLessonForGrade(profile.grade);
  if (!lesson) throw new Error(`Biology is not available for ${profile.gradeLabel}.`);
  return lesson;
}

export function normalizeBiologyAnswer(answer: string): string {
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

export function checkBiologyAnswer(question: BiologyQuestion, answer: string): boolean {
  const normalized = normalizeBiologyAnswer(answer);
  if (!normalized) return false;
  return question.acceptedAnswers.some(candidate => {
    const target = normalizeBiologyAnswer(candidate);
    if (target === normalized) return true;
    const strippedTarget = target.replace(/[,;:]/g, ' ').replace(/\s+/g, ' ').trim();
    const strippedInput = normalized.replace(/[,;:]/g, ' ').replace(/\s+/g, ' ').trim();
    return strippedTarget === strippedInput;
  });
}
