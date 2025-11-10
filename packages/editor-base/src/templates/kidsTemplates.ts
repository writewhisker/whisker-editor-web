/**
 * Kids Story Templates
 * Pre-made story templates suitable for children
 */

import type { Story, Passage } from '@whisker/core-ts';

export interface StoryTemplate {
  id: string;
  name: string;
  description: string;
  ageGroup: string;
  category: string;
  platform?: 'minecraft' | 'roblox' | 'generic';
  passages: Partial<Passage>[];
}

export const kidsTemplates: StoryTemplate[] = [
  {
    id: 'choose-your-pet',
    name: 'Choose Your Pet',
    description: 'A simple story about choosing and caring for a pet',
    ageGroup: '6-8',
    category: 'Animals',
    passages: [
      {
        title: 'Start',
        content: 'You can get a new pet! What kind of pet do you want?',
      },
      {
        title: 'Dog',
        content: 'You chose a friendly dog! What will you name it?',
      },
      {
        title: 'Cat',
        content: 'You chose a cute cat! What will you name it?',
      },
    ],
  },
  {
    id: 'space-adventure',
    name: 'Space Adventure',
    description: 'Explore the solar system and meet alien friends',
    ageGroup: '9-11',
    category: 'Science Fiction',
    passages: [
      {
        title: 'Start',
        content: "You're an astronaut! Where do you want to go?",
      },
      {
        title: 'Moon',
        content: 'You landed on the Moon! You can see Earth from here.',
      },
      {
        title: 'Mars',
        content: 'You landed on Mars! The red planet is amazing!',
      },
    ],
  },
  {
    id: 'magic-school',
    name: 'Magic School',
    description: 'Learn spells and make friends at a school for wizards',
    ageGroup: '9-11',
    category: 'Fantasy',
    passages: [
      {
        title: 'Start',
        content: "Welcome to Magic School! What's your first class?",
      },
      {
        title: 'Potions',
        content: "You're learning to make potions! What will you brew?",
      },
      {
        title: 'Spells',
        content: "You're learning spells! What spell do you want to learn first?",
      },
    ],
  },
];

export function getTemplatesByAgeGroup(ageGroup: string): StoryTemplate[] {
  return kidsTemplates.filter((template) => template.ageGroup === ageGroup);
}

export function getTemplatesByCategory(category: string): StoryTemplate[] {
  return kidsTemplates.filter((template) => template.category === category);
}

export function getTemplateById(id: string): StoryTemplate | undefined {
  return kidsTemplates.find((template) => template.id === id);
}
