import { StudentId } from '../types';
import { getStudentProfile } from './profiles';

export type EvsSectionId =
  | 'our-food'
  | 'our-clothes'
  | 'our-houses'
  | 'our-transport'
  | 'our-festivals';

export interface EvsSection {
  id: EvsSectionId;
  lessonNumber: number;
  label: string;
  topic: string;
}

export const EVS_SECTIONS: EvsSection[] = [
  { id: 'our-food', lessonNumber: 2, label: 'Lesson 2 · Our Food', topic: 'Our Food' },
  { id: 'our-clothes', lessonNumber: 3, label: 'Lesson 3 · Our Clothes', topic: 'Our Clothes' },
  { id: 'our-houses', lessonNumber: 4, label: 'Lesson 4 · Our Houses', topic: 'Our Houses' },
  { id: 'our-transport', lessonNumber: 5, label: 'Lesson 5 · Our Transport', topic: 'Our Transport' },
  { id: 'our-festivals', lessonNumber: 6, label: 'Lesson 6 · Our Festivals', topic: 'Our Festivals' }
];

export interface EvsCard {
  id: string;
  section: EvsSectionId;
  title: string;
  prompt: string;
  answer: string;
  memoryTip: string;
  examples?: string;
}

interface QuestionBase {
  id: string;
  section: EvsSectionId;
  prompt: string;
  answer: string;
  explanation: string;
}

export type EvsQuestion =
  | (QuestionBase & { kind: 'choice'; options: string[] })
  | (QuestionBase & { kind: 'true-false'; options: ['True', 'False'] })
  | (QuestionBase & { kind: 'fill'; acceptedAnswers: string[] })
  | (QuestionBase & { kind: 'written'; acceptedAnswers: string[]; markingCriteria: string });

export interface EvsLesson {
  id: string;
  grade: number;
  title: string;
  sourceName: string;
  memoryTip: string;
  sections: EvsSection[];
  cards: EvsCard[];
  questions: EvsQuestion[];
}

const choice = (
  id: string,
  section: EvsSectionId,
  prompt: string,
  options: string[],
  answer: string,
  explanation: string
): EvsQuestion => ({
  id,
  section,
  kind: 'choice',
  prompt,
  options,
  answer,
  explanation
});

const trueFalse = (
  id: string,
  section: EvsSectionId,
  prompt: string,
  correct: boolean,
  explanation: string
): EvsQuestion => ({
  id,
  section,
  kind: 'true-false',
  prompt,
  options: ['True', 'False'],
  answer: correct ? 'True' : 'False',
  explanation
});

const fill = (
  id: string,
  section: EvsSectionId,
  prompt: string,
  answer: string,
  explanation: string,
  aliases: string[] = []
): EvsQuestion => ({
  id,
  section,
  kind: 'fill',
  prompt,
  answer,
  acceptedAnswers: [answer, ...aliases],
  explanation
});

const written = (
  id: string,
  section: EvsSectionId,
  prompt: string,
  answer: string,
  markingCriteria: string,
  explanation: string,
  aliases: string[] = []
): EvsQuestion => ({
  id,
  section,
  kind: 'written',
  prompt,
  answer,
  acceptedAnswers: [answer, ...aliases],
  markingCriteria,
  explanation
});

const evsCards: EvsCard[] = [
  {
    id: 'g2-evs-card-food',
    section: 'our-food',
    title: 'Our Food: Energy, Body-Building & Protection',
    prompt: 'Why do we need food, and what are the main food groups?',
    answer: 'We need food to live and grow. Energy-giving food (Rice, Wheat, Butter) gives us energy. Body-building food (Milk, eggs, fish, pulses) makes bones and muscles strong. Protective food (Fruits and vegetables, Carrot, Apple) helps us fight diseases.',
    memoryTip: 'Energy = Rice & Wheat. Body-building = Milk & Eggs (bones & muscles). Protective = Fruits & Vegetables (fight disease).',
    examples: 'Good habits: Wash hands before and after meals, eat fresh clean food, and drink clean water.'
  },
  {
    id: 'g2-evs-card-clothes',
    section: 'our-clothes',
    title: 'Our Clothes: Seasons & Care',
    prompt: 'Why do we wear different clothes in different seasons?',
    answer: 'Clothes protect us from heat, cold, rain, and wind. We wear cotton clothes in summer to keep cool, woollen clothes in winter to keep warm, and waterproof raincoats (made of rubber or plastic) in rain.',
    memoryTip: 'Summer = Cotton (cool). Winter = Wool (warm, from sheep). Rain = Raincoats (rubber/plastic). Silk = Silkworms (for sarees).',
    examples: 'Care: Wash clothes to remove dirt and dust, and dry them in the sun.'
  },
  {
    id: 'g2-evs-card-houses',
    section: 'our-houses',
    title: 'Our Houses: Types & Special Homes',
    prompt: 'What kinds of houses do people live in?',
    answer: 'A house protects us from heat, cold, rain, wind, and wild animals. Pucca houses (bungalows, flats, apartments) are made of bricks, iron, steel, and cement. Kachcha houses (huts) usually have one room. Special houses: Igloos (snow blocks), Stilt houses (heavy rain, sloping roof), Caravans (wheels), Tents (canvas), Houseboats (floating).',
    memoryTip: 'Igloo = snow. Stilt = heavy rain. Caravan = wheels. Tent = canvas. Houseboat = floating.',
    examples: 'Flats and apartments are multi-storeyed buildings.'
  },
  {
    id: 'g2-evs-card-transport',
    section: 'our-transport',
    title: 'Our Transport: Modes & Boarding Stations',
    prompt: 'What are the three modes of transport, and where do they board?',
    answer: 'The three modes of transport are land, water, and air. Land transport uses roads and rail (trains move on railway tracks). Camels are used in deserts, elephants in forests, and mules in hills. Aeroplanes and ships travel long distances. Boarding: Bus at bus stop, Train at railway station, Ship at port, Aeroplane at airport.',
    memoryTip: '3 Modes: Land, Water, Air. Boarding: Bus -> Bus stop; Train -> Railway station; Ship -> Port; Aeroplane -> Airport.',
    examples: 'In villages, people use bicycles, buses, and bullock-carts.'
  },
  {
    id: 'g2-evs-card-festivals',
    section: 'our-festivals',
    title: 'Our Festivals: Religious, Harvest & National',
    prompt: 'What festivals do we celebrate across India?',
    answer: 'Holi is the festival of colours; Diwali is the festival of lights; Eid has sevvian; Christmas is on 25 December; Guruparab remembers the ten Sikh gurus. Harvest festivals: Pongal (Tamil Nadu), Onam (Kerala). National festivals: Republic Day (26 January), Independence Day (15 August), Gandhi Jayanti (2 October).',
    memoryTip: 'Holi = colours, Diwali = lights, Pongal = Tamil Nadu, Onam = Kerala, Republic Day = 26 Jan, Independence Day = 15 Aug, Gandhi Jayanti = 2 Oct.',
    examples: 'On Eid, people share a sweet dish called sevvian.'
  }
];

export const FAZIA_EVS_LESSON: EvsLesson = {
  id: 'evs-grade-2-portions',
  grade: 2,
  title: 'Grade 2 EVS Exam Revision',
  sourceName: 'EVS Class Notes & Revision Notebook.pdf',
  memoryTip: 'Revise Lessons 2 to 6: Food, Clothes, Houses, Transport, and Festivals from your school notebook notes.',
  sections: EVS_SECTIONS,
  cards: evsCards,
  questions: [
    // -----------------------------------------------------------------------
    // Lesson 2: Our Food (11 questions)
    // -----------------------------------------------------------------------
    fill(
      'g2-evs-l2-fill-1',
      'our-food',
      'Food gives us ______ to work and play.',
      'energy',
      'Food provides our bodies with energy to study, run, and play.',
      ['power', 'strength']
    ),
    fill(
      'g2-evs-l2-fill-2',
      'our-food',
      'Food helps us to fight ______.',
      'disease',
      'Nutritious and protective food helps our body fight illnesses and disease.',
      ['diseases', 'illness', 'sickness', 'germs', 'infections']
    ),
    fill(
      'g2-evs-l2-fill-3',
      'our-food',
      'Body-building food make our ______ and ______ strong.',
      'bones and muscles',
      'Body-building foods like milk and eggs build and strengthen our bones and muscles.',
      ['bones and muscle', 'muscles and bones', 'bones, muscles', 'bone and muscle', 'bones,muscles', 'muscles and bone']
    ),
    fill(
      'g2-evs-l2-fill-4',
      'our-food',
      '______ and ______ are energy-giving food.',
      'Rice and Wheat',
      'Grains like rice and wheat provide carbohydrates that give us energy.',
      [
        'Wheat and Rice', 'Wheat and rice', 'Rice and wheat', 'Butter and Wheat', 'Wheat and Butter',
        'Rice, Wheat', 'Wheat, Rice', 'Rice, wheat', 'Wheat, rice', 'rice and wheat', 'rice and butter', 'butter and rice'
      ]
    ),
    fill(
      'g2-evs-l2-fill-5',
      'our-food',
      '______ and ______ are body-building food.',
      'Milk and eggs',
      'Milk, eggs, fish, and pulses are rich in protein for growth.',
      [
        'Milk and egg', 'Eggs and milk', 'milk and eggs', 'Fish and pulses', 'Pulses and fish',
        'Milk, eggs', 'Milk, egg', 'Eggs, milk', 'Milk, fish', 'Fish, milk', 'Milk and fish', 'Fish and milk', 'Eggs and fish', 'Fish and eggs'
      ]
    ),
    fill(
      'g2-evs-l2-fill-6',
      'our-food',
      '______ and ______ are protective food.',
      'Fruits and vegetables',
      'Fruits and vegetables contain vitamins and minerals that protect us from falling ill.',
      [
        'Vegetables and fruits', 'fruits and vegetables', 'Carrot and Apple', 'Apple and carrot', 'Carrots and apples',
        'Fruits, vegetables', 'Vegetables, fruits', 'Fruit and vegetables', 'Fruit and vegetable'
      ]
    ),
    written(
      'g2-evs-l2-qa-1',
      'our-food',
      'Why do we need food?',
      'We need food to live and grow.',
      'Must say we need food to live and grow, stay alive, or gain energy to live and grow.',
      'Food gives us energy to work and play, helps us grow, and keeps us healthy.',
      ['We need food to live and grow', 'To live and grow', 'Food helps us to live and grow', 'We need food to stay alive and grow']
    ),
    written(
      'g2-evs-l2-qa-2',
      'our-food',
      'Name the foods that help us to grow?',
      'Milk, eggs, fish and pulses.',
      'Must name at least two body-building foods that help us grow, such as milk, eggs, fish, or pulses.',
      'Milk, eggs, fish, and pulses are body-building foods that help our bodies grow big and strong.',
      ['Milk, eggs, fish and pulses', 'Milk, eggs, fish, pulses', 'Milk and eggs', 'Milk, eggs, and fish', 'Milk, eggs, fish and pulse']
    ),
    written(
      'g2-evs-l2-qa-3',
      'our-food',
      'Write the names of any two food items that give us energy.',
      'Butter and Wheat.',
      'Must name any two valid energy-giving foods: butter, wheat, rice, bread, or sugar.',
      'Rice, wheat, butter, and bread give our bodies energy.',
      ['Butter and Wheat', 'Rice and Wheat', 'Wheat and rice', 'Butter and rice', 'Rice and butter']
    ),
    written(
      'g2-evs-l2-qa-4',
      'our-food',
      'Write the names of any two food items that help us to fight diseases.',
      'Carrot and Apple.',
      'Must name any two valid protective foods (such as carrot, apple, fruits, or vegetables) that help fight diseases.',
      'Fruits and vegetables like carrots and apples protect us and fight diseases.',
      ['Carrot and Apple', 'Apple and carrot', 'Fruits and vegetables', 'Carrots and apples']
    ),
    written(
      'g2-evs-l2-qa-5',
      'our-food',
      'Write any three good food habits.',
      '(1) Wash your hands with soap before and after every meal. (2) Eat only fresh and clean food. (3) Drink clean water.',
      'Must state at least three good food habits, such as washing hands before/after meals, eating fresh and clean food, or drinking clean water.',
      'Key food habits: wash hands with soap, eat fresh clean food, and drink clean water.',
      [
        'Wash hands with soap before and after every meal, eat fresh clean food, drink clean water',
        'Wash your hands with soap before and after every meal. Eat only fresh and clean food. Drink clean water.',
        'Wash hands, eat clean food, drink clean water'
      ]
    ),

    // -----------------------------------------------------------------------
    // Lesson 3: Our Clothes (16 questions)
    // -----------------------------------------------------------------------
    fill(
      'g2-evs-l3-fill-1',
      'our-clothes',
      'We wear ______ in summer.',
      'cotton clothes',
      'Cotton clothes are light and breathable, keeping us cool in the heat.',
      ['cotton', 'cotton clothes', 'cotton cloth']
    ),
    fill(
      'g2-evs-l3-fill-2',
      'our-clothes',
      'We wear ______ in winter.',
      'woollen clothes',
      'Woollen clothes trap warm air to keep us cozy during cold winter.',
      ['woollen', 'woolen', 'woolen clothes', 'wool', 'woollen clothes', 'woollen cloth']
    ),
    fill(
      'g2-evs-l3-fill-3',
      'our-clothes',
      'We wear ______ in rain.',
      'rain coats',
      'We wear waterproof raincoats to stay dry in rainy weather.',
      ['raincoats', 'raincoat', 'rain coat', 'rain clothes']
    ),
    fill(
      'g2-evs-l3-fill-4',
      'our-clothes',
      'We get cotton from ______.',
      'cotton plant',
      'White fluffy cotton bolls grow on cotton plants.',
      ['cotton plants', 'plants', 'the cotton plant', 'cotton tree']
    ),
    fill(
      'g2-evs-l3-fill-5',
      'our-clothes',
      'We get wool from ______.',
      'sheep',
      'The soft fleece of sheep is sheared and spun into wool.',
      ['the sheep', 'sheeps', 'a sheep']
    ),
    fill(
      'g2-evs-l3-fill-6',
      'our-clothes',
      'We get silk from ______.',
      'silkworm',
      'Silkworms spin silky cocoons from which fine silk thread is made.',
      ['silk worm', 'silkworms', 'the silkworm', 'silk worms']
    ),
    fill(
      'g2-evs-l3-fill-7',
      'our-clothes',
      'Rain coats are made of ______.',
      'rubber or plastics',
      'Waterproof rubber and plastic prevent rainwater from seeping through.',
      ['rubber or plastic', 'plastic or rubber', 'rubber', 'plastics', 'plastic', 'rubber and plastic', 'rubber and plastics', 'plastic and rubber', 'plastics and rubber']
    ),
    trueFalse(
      'g2-evs-l3-tf-1',
      'our-clothes',
      'We wear cotton clothes in summer.',
      true,
      'True. Cotton clothes absorb perspiration and keep us cool in summer.'
    ),
    trueFalse(
      'g2-evs-l3-tf-2',
      'our-clothes',
      'Clothes protect us from heat, cold, rain and wind.',
      true,
      'True. Clothes shield our body from all kinds of weather.'
    ),
    trueFalse(
      'g2-evs-l3-tf-3',
      'our-clothes',
      'We wear different kinds of clothes in different seasons.',
      true,
      'True. We choose cotton for summer, wool for winter, and raincoats for monsoon.'
    ),
    trueFalse(
      'g2-evs-l3-tf-4',
      'our-clothes',
      'We use silk to make sarees.',
      true,
      'True. Silk is a lustrous cloth widely used for making sarees and fine clothing.'
    ),
    trueFalse(
      'g2-evs-l3-tf-5',
      'our-clothes',
      'We wear rain coat in winter.',
      false,
      'False. We wear raincoats in the rainy season, not winter. In winter we wear woollen clothes.'
    ),
    written(
      'g2-evs-l3-qa-1',
      'our-clothes',
      'Why do we wear clothes?',
      'Clothes protect us from heat, cold, rain and wind.',
      'Must say clothes protect us from heat, cold, rain, wind, or weather conditions.',
      'Clothes cover our bodies and protect us from heat, cold, rain, dust, and wind.',
      [
        'Clothes protect us from heat, cold, rain and wind',
        'To protect us from heat, cold, rain and wind',
        'Clothes protect us from heat, cold, rain, and wind',
        'They protect us from heat, cold, rain and wind'
      ]
    ),
    written(
      'g2-evs-l3-qa-2',
      'our-clothes',
      'Why do we wear cotton clothes in summer?',
      'Cotton clothes keep us cool.',
      'Must state that cotton clothes keep us cool or absorb sweat in hot weather.',
      'Cotton clothes are light and allow air to circulate, keeping our bodies cool.',
      [
        'Cotton clothes keep us cool',
        'Because cotton clothes keep us cool',
        'To keep us cool',
        'They keep us cool'
      ]
    ),
    written(
      'g2-evs-l3-qa-3',
      'our-clothes',
      'What do we wear in winter? Why?',
      'We wear woollen clothes in winter. They keep us warm.',
      'Must mention wearing woollen clothes and explain that they keep us warm.',
      'Woollen clothes like sweaters trap body heat and keep us warm during cold winter.',
      [
        'We wear woollen clothes in winter. They keep us warm',
        'Woollen clothes because they keep us warm',
        'Woollen clothes. They keep us warm',
        'We wear woollen clothes in winter because they keep us warm'
      ]
    ),
    written(
      'g2-evs-l3-qa-4',
      'our-clothes',
      'How should we take care of our clothes?',
      '(1) We must wash the clothes to remove dirt and dust. (2) We must dry our clothes in the sun.',
      'Must mention washing clothes (to remove dirt/dust) and/or drying them in the sun.',
      'Taking care of clothes: wash them clean to remove dust and dirt, and dry them in sunlight.',
      [
        'Wash clothes to remove dirt and dust, and dry in the sun',
        'We must wash the clothes to remove dirt and dust. We must dry our clothes in the sun.',
        'Wash them to remove dirt and dry in the sun'
      ]
    ),

    // -----------------------------------------------------------------------
    // Lesson 4: Our Houses (15 questions)
    // -----------------------------------------------------------------------
    fill(
      'g2-evs-l4-fill-1',
      'our-houses',
      'Huts usually have ______.',
      'one room',
      'A hut is a simple, small kachcha home that usually has just one room.',
      ['1 room', 'a single room', 'only one room', 'one']
    ),
    fill(
      'g2-evs-l4-fill-2',
      'our-houses',
      'Multi-storeyed buildings are called ______ or ______.',
      'flats or apartments',
      'Tall buildings with several floors consist of separate homes called flats or apartments.',
      [
        'flats and apartments', 'apartments or flats', 'flats', 'apartments',
        'flats, apartments', 'apartments, flats', 'flat or apartment', 'flat and apartment', 'flats/apartments'
      ]
    ),
    fill(
      'g2-evs-l4-fill-3',
      'our-houses',
      'Stilt houses are found in places where it ______.',
      'rains heavily',
      'Stilt houses stand high on poles above wet ground in places that experience heavy rains.',
      ['rains heavy', 'rains a lot', 'rains heavily', 'heavy rain']
    ),
    fill(
      'g2-evs-l4-fill-4',
      'our-houses',
      'House boats are called ______ houses.',
      'floating',
      'Houseboats float on water in lakes, rivers, and tranquil backwaters.',
      ['floating houses', 'floating house']
    ),
    fill(
      'g2-evs-l4-fill-5',
      'our-houses',
      'Caravans are houses on ______.',
      'wheels',
      'A caravan is a house built on wheels so it can travel anywhere.',
      ['wheel']
    ),
    choice(
      'g2-evs-l4-match-1',
      'our-houses',
      'Match: What is an igloo made of?',
      ['is made of blocks of snow', 'has a sloping roof', 'is a house on wheels', 'is made of canvas'],
      'is made of blocks of snow',
      'An igloo is an arctic dome constructed out of hardened blocks of snow.'
    ),
    choice(
      'g2-evs-l4-match-2',
      'our-houses',
      'Match: A stilt house ______.',
      ['has a sloping roof', 'is made of blocks of snow', 'is a house on wheels', 'is a floating house'],
      'has a sloping roof',
      'Stilt houses feature sloping roofs so torrential rainwater runs off easily.'
    ),
    choice(
      'g2-evs-l4-match-3',
      'our-houses',
      'Match: A caravan ______.',
      ['is a house on wheels', 'is made of canvas', 'has a sloping roof', 'is made of blocks of snow'],
      'is a house on wheels',
      'A caravan has wheels so families can live comfortably while moving around.'
    ),
    choice(
      'g2-evs-l4-match-4',
      'our-houses',
      'Match: A tent ______.',
      ['is made of canvas', 'is a floating house', 'is made of blocks of snow', 'has a sloping roof'],
      'is made of canvas',
      'Tents are mobile shelters pitched using strong waterproof canvas cloth.'
    ),
    choice(
      'g2-evs-l4-match-5',
      'our-houses',
      'Match: A houseboat ______.',
      ['is a floating house', 'is a house on wheels', 'is made of canvas', 'has a sloping roof'],
      'is a floating house',
      'A houseboat is a wooden floating residence on water.'
    ),
    written(
      'g2-evs-l4-qa-1',
      'our-houses',
      'Why do we need a house?',
      'House protect us from heat, cold, rain, wind and wild animals.',
      'Must say a house protects us from heat, cold, rain, wind, thieves, or wild animals.',
      'A house provides shelter and keeps us safe from weather, thieves, and wild animals.',
      [
        'House protect us from heat, cold, rain, wind and wild animals',
        'A house protects us from heat, cold, rain, wind and wild animals',
        'To protect us from heat, cold, rain, wind and wild animals',
        'House protects us from heat, cold, rain, wind and wild animals'
      ]
    ),
    written(
      'g2-evs-l4-qa-2',
      'our-houses',
      'What are pucca houses made of?',
      'Bricks, iron, steel and cement.',
      'Must name strong building materials such as bricks, iron, steel, and cement.',
      'Pucca houses are permanent structures built using bricks, cement, iron, and steel.',
      [
        'Bricks, iron, steel and cement',
        'Bricks, iron, steel, cement',
        'Bricks, cement, iron and steel',
        'Bricks, iron, steel, and cement'
      ]
    ),
    written(
      'g2-evs-l4-qa-3',
      'our-houses',
      'What is a hut?',
      'Hut is a small house with one room.',
      'Must say a hut is a small house with one room (or made of mud and straw).',
      'A hut is a simple, small kachcha dwelling with a single room.',
      [
        'Hut is a small house with one room',
        'A small house with one room',
        'Small house with one room',
        'A hut is a small house with one room'
      ]
    ),
    written(
      'g2-evs-l4-qa-4',
      'our-houses',
      'What is a bungalow?',
      'Bungalow is a large house with many rooms.',
      'Must describe a bungalow as a large or independent house with many rooms.',
      'A bungalow is a spacious residential house with several rooms.',
      [
        'Bungalow is a large house with many rooms',
        'A large house with many rooms',
        'Large house with many rooms',
        'A bungalow is a large house with many rooms'
      ]
    ),
    written(
      'g2-evs-l4-qa-5',
      'our-houses',
      'Write four examples of special houses.',
      'Igloos, caravan, house boats, tent.',
      'Must name four special houses from: igloo, caravan, houseboat, tent, or stilt house.',
      'Special houses include igloos, caravans, houseboats, and tents.',
      [
        'Igloos, caravan, house boats, tent',
        'Igloo, caravan, houseboat, tent',
        'Igloos, caravans, houseboats, tents',
        'Igloo, caravan, houseboat and tent'
      ]
    ),

    // -----------------------------------------------------------------------
    // Lesson 5: Our Transport (19 questions)
    // -----------------------------------------------------------------------
    fill(
      'g2-evs-l5-fill-1',
      'our-transport',
      'Three modes of transport are ______.',
      'land, water and air',
      'People and cargo travel over land, across water, and through the air.',
      [
        'land, water, and air', 'land, water, air', 'land water air', 'land water and air',
        'land, air and water', 'land, air, water', 'air, water and land', 'air, water, land'
      ]
    ),
    fill(
      'g2-evs-l5-fill-2',
      'our-transport',
      'Land transport are ______ and ______.',
      'road and rail',
      'Land vehicles travel either on paved roads or along railway tracks.',
      ['road and rail', 'rail and road', 'road, rail', 'rail, road', 'roads and rails', 'road,rail']
    ),
    fill(
      'g2-evs-l5-fill-3',
      'our-transport',
      'Trains move on ______.',
      'railway tracks',
      'Trains have metal wheels specially designed to glide along railway tracks.',
      ['railway tracks', 'tracks', 'railway track', 'rails', 'train tracks']
    ),
    fill(
      'g2-evs-l5-fill-4',
      'our-transport',
      '______ are used in desert.',
      'Camels',
      'Camels are known as the ship of the desert because they can walk smoothly on dunes.',
      ['Camel', 'camels', 'camel', 'the camel', 'a camel']
    ),
    fill(
      'g2-evs-l5-fill-5',
      'our-transport',
      '______ are used in forest.',
      'Elephants',
      'Strong elephants assist with navigating rough jungle terrain and moving logs in forests.',
      ['Elephant', 'elephants', 'elephant', 'the elephant', 'an elephant']
    ),
    trueFalse(
      'g2-evs-l5-tf-1',
      'our-transport',
      'We travel long distance by bicycle.',
      false,
      'False. Bicycles are meant for short rides around the neighbourhood. For long distances we take trains or planes.'
    ),
    trueFalse(
      'g2-evs-l5-tf-2',
      'our-transport',
      'People use animals to carry heavy things.',
      true,
      'True. Working animals like bullocks, camels, mules, and elephants carry heavy loads.'
    ),
    trueFalse(
      'g2-evs-l5-tf-3',
      'our-transport',
      'A ship is used to travel short distance on water.',
      false,
      'False. Boats are used for short water crossings; large ships voyage across vast oceans.'
    ),
    trueFalse(
      'g2-evs-l5-tf-4',
      'our-transport',
      'A helicopter can carry only a few people.',
      true,
      'True. Helicopters are compact rotorcraft built to carry a small crew or passengers.'
    ),
    trueFalse(
      'g2-evs-l5-tf-5',
      'our-transport',
      'Goods are sent from one country to another by ship.',
      true,
      'True. Large merchant and container ships transport heavy cargo between nations.'
    ),
    choice(
      'g2-evs-l5-match-1',
      'our-transport',
      'Match boarding place: Bus -> ______',
      ['Bus stop', 'Railway station', 'Port', 'Airport'],
      'Bus stop',
      'Passengers get on and off city buses at designated bus stops.'
    ),
    choice(
      'g2-evs-l5-match-2',
      'our-transport',
      'Match boarding place: Train -> ______',
      ['Railway station', 'Bus stop', 'Port', 'Airport'],
      'Railway station',
      'Trains pull into platforms at the railway station for passengers to board.'
    ),
    choice(
      'g2-evs-l5-match-3',
      'our-transport',
      'Match boarding place: Ship -> ______',
      ['Port', 'Airport', 'Railway station', 'Bus stop'],
      'Port',
      'Ships moor at harbours and sea ports to load passengers and freight.'
    ),
    choice(
      'g2-evs-l5-match-4',
      'our-transport',
      'Match boarding place: Aeroplane -> ______',
      ['Airport', 'Port', 'Railway station', 'Bus stop'],
      'Airport',
      'Airplanes take off and touch down on runways at the airport.'
    ),
    written(
      'g2-evs-l5-qa-1',
      'our-transport',
      'What are the three modes of transport?',
      'Land, water, and air.',
      'Must name land, water, and air as the three modes of transport.',
      'The three fundamental modes of transport are land, water, and air.',
      ['Land, water, and air', 'Land, water and air', 'Land, water, air']
    ),
    written(
      'g2-evs-l5-qa-2',
      'our-transport',
      'Name some means of transport that people use to travel long distance.',
      'Aeroplane, Helicopter, Ships.',
      'Must name vehicles suited for long-distance travel, such as aeroplanes, ships, helicopters, or trains.',
      'Aeroplanes, ships, helicopters, and express trains transport travelers over great distances.',
      [
        'Aeroplane, Helicopter, Ships',
        'Aeroplane, helicopter, ships',
        'Aeroplane, train, ship',
        'Aeroplane, Helicopter, Ship',
        'Aeroplane, ships, train'
      ]
    ),
    written(
      'g2-evs-l5-qa-3',
      'our-transport',
      'Name some means of transport used to carry things.',
      'Lorry, camel, elephant.',
      'Must name vehicles or animals used to carry cargo/things, such as lorries, trucks, camels, or elephants.',
      'Lorries, trucks, camels, and elephants carry goods and supplies.',
      ['Lorry, camel, elephant', 'Lorry, camel and elephant', 'Truck, camel, elephant', 'Lorry, camel, and elephant']
    ),
    written(
      'g2-evs-l5-qa-4',
      'our-transport',
      'Name some means of transport used in villages.',
      'Bicycle, Bus and Bullock-cart.',
      'Must name village transport such as bicycles, bullock-carts, buses, or tractors.',
      'In villages, people commonly travel by bicycle, bus, and bullock-cart.',
      [
        'Bicycle, Bus and Bullock-cart',
        'Bicycle, bus, bullock-cart',
        'Bicycle, bus and bullock cart',
        'Bicycle, Bus, Bullock-cart'
      ]
    ),
    written(
      'g2-evs-l5-qa-5',
      'our-transport',
      'Where are mules used as a means of transport?',
      'In hills and mountains.',
      'Must say hills, mountains, or hilly regions.',
      'Mules have steady footing and are relied on along steep mountain and hill trails.',
      [
        'In hills and mountains', 'Hills and mountains', 'Mountains and hills', 'In mountains and hills',
        'Hills and mountain', 'Hills', 'Mountains', 'In hills', 'In the hills and mountains'
      ]
    ),

    // -----------------------------------------------------------------------
    // Lesson 6: Our Festivals (10 questions)
    // -----------------------------------------------------------------------
    fill(
      'g2-evs-l6-fill-1',
      'our-festivals',
      'Holi is the ______.',
      'festival of colours',
      'Holi is known across the country as the vibrant festival of colours.',
      ['festival of colors', 'festival of colours', 'colours', 'colors', 'festival of colour', 'festival of color']
    ),
    fill(
      'g2-evs-l6-fill-2',
      'our-festivals',
      'Diwali is the ______.',
      'festival of lights',
      'Diwali is celebrated with illuminated clay diyas as the festival of lights.',
      ['festival of lights', 'lights', 'festival of light', 'light']
    ),
    fill(
      'g2-evs-l6-fill-3',
      'our-festivals',
      'On Eid day people prepare a special sweet called ______.',
      'sevvian',
      'On Eid, families prepare and enjoy sweet vermicelli called sevvian.',
      ['seviyan', 'sewai', 'sheer khurma', 'semiya', 'sevian', 'sewian', 'seviya']
    ),
    fill(
      'g2-evs-l6-fill-4',
      'our-festivals',
      'Christmas is celebrated on ______.',
      '25 December',
      'Christmas marks the birth of Jesus Christ on 25 December each year.',
      ['December 25', '25th December', '25th of December', 'december 25th', '25 dec']
    ),
    fill(
      'g2-evs-l6-fill-5',
      'our-festivals',
      'Guruparab is celebrated to remember the ______.',
      'ten Sikh gurus',
      'Guruparab honours the lives and wisdom of the ten Sikh gurus.',
      ['10 Sikh gurus', 'ten sikh gurus', 'Sikh gurus', '10 gurus', 'ten gurus', 'the ten sikh gurus', 'the 10 sikh gurus']
    ),
    fill(
      'g2-evs-l6-fill-6',
      'our-festivals',
      'Pongal is the harvest festival of ______.',
      'Tamil Nadu',
      'Pongal is celebrated with thankfulness for crops in Tamil Nadu.',
      ['Tamilnadu', 'tamil nadu', 'tamilnadu']
    ),
    fill(
      'g2-evs-l6-fill-7',
      'our-festivals',
      'Onam is the harvest festival of ______.',
      'Kerala',
      'Onam is celebrated with boat races and floral carpets in Kerala.',
      ['kerala']
    ),
    fill(
      'g2-evs-l6-fill-8',
      'our-festivals',
      'Republic Day is celebrated on ______.',
      '26 January',
      'India honors the enforcement of its Constitution every 26 January.',
      ['January 26', '26th January', '26th of January', 'january 26th', '26 jan']
    ),
    fill(
      'g2-evs-l6-fill-9',
      'our-festivals',
      'Independence Day is celebrated on ______.',
      '15 August',
      'India celebrates gaining its freedom on 15 August 1947.',
      ['August 15', '15th August', '15th of August', 'august 15th', '15 aug']
    ),
    fill(
      'g2-evs-l6-fill-10',
      'our-festivals',
      'Gandhi Jayanti is celebrated on ______.',
      '2 October',
      'Mahatma Gandhi’s birthday is observed nationwide on 2 October.',
      ['October 2', '2nd October', '2nd of October', 'october 2nd', '2 oct']
    )
  ]
};

export function getEvsLessonForGrade(grade: number): EvsLesson | undefined {
  return grade === 2 ? FAZIA_EVS_LESSON : undefined;
}

export function getEvsLesson(studentId: StudentId): EvsLesson {
  const profile = getStudentProfile(studentId);
  const lesson = getEvsLessonForGrade(profile.grade);
  if (!lesson) throw new Error(`EVS is not available for ${profile.gradeLabel}.`);
  return lesson;
}

export function normalizeEvsAnswer(answer: string): string {
  return answer
    .normalize('NFKC')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[\s.,!?;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function checkEvsAnswer(question: EvsQuestion, answer: string): boolean {
  const normalized = normalizeEvsAnswer(answer);
  if (!normalized) return false;
  const accepted = question.kind === 'choice' || question.kind === 'true-false'
    ? [question.answer]
    : question.acceptedAnswers;
  return accepted.some(candidate => normalizeEvsAnswer(candidate) === normalized);
}
