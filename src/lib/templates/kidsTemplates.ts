/**
 * Kids Mode Story Templates
 *
 * Pre-made story templates for Minecraft and Roblox that kids can use as starting points.
 */

import { nanoid } from 'nanoid';

export interface KidsTemplate {
  id: string;
  name: string;
  description: string;
  platform: 'minecraft' | 'roblox' | 'both';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: string;
  tags: string[];
  generateStory: () => any; // Returns plain story data
}

/**
 * Create a basic story structure
 */
function createBaseStory(title: string, author: string = 'Young Creator'): any {
  return {
    metadata: {
      title,
      author,
      ifid: nanoid(),
      version: '1.0.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      format: 'Whisker',
      formatVersion: '1.0.0',
    },
    passages: {},
    variables: {},
    startPassage: '',
    version: '1.0.0',
  };
}

/**
 * Minecraft: Cave Adventure Template
 */
export const minecraftCaveAdventure: KidsTemplate = {
  id: 'minecraft-cave-adventure',
  name: 'Minecraft Cave Adventure',
  description: 'Explore a mysterious cave filled with treasures and dangers!',
  platform: 'minecraft',
  difficulty: 'beginner',
  icon: '⛏️',
  tags: ['adventure', 'exploration', 'mining'],
  generateStory: () => {
    const story = createBaseStory('My Cave Adventure');
    const startId = nanoid();
    const caveEntranceId = nanoid();
    const darkTunnelId = nanoid();
    const treasureRoomId = nanoid();
    const mobEncounterId = nanoid();
    const escapeId = nanoid();

    story.passages[startId] = {
      id: startId,
      title: 'Start',
      content: `You're standing at the entrance of a dark cave. You can hear strange sounds coming from inside.

What do you do?`,
      choices: [
        { text: 'Enter the cave bravely', target: caveEntranceId, condition: '' },
        { text: 'Get some torches first', target: caveEntranceId, condition: '' },
      ],
      tags: [],
      position: { x: 100, y: 100 },
      metadata: {},
    };

    story.passages[caveEntranceId] = {
      id: caveEntranceId,
      title: 'Cave Entrance',
      content: `You step into the cave with your torch. The walls sparkle with different ores!

You see two tunnels ahead.`,
      choices: [
        { text: 'Go left (you hear water)', target: treasureRoomId, condition: '' },
        { text: 'Go right (you see glowing eyes)', target: mobEncounterId, condition: '' },
      ],
      tags: ['cave'],
      position: { x: 300, y: 100 },
      metadata: {},
    };

    story.passages[darkTunnelId] = {
      id: darkTunnelId,
      title: 'Dark Tunnel',
      content: `The tunnel gets darker. You hear a zombie groaning nearby!`,
      choices: [
        { text: 'Fight the zombie', target: mobEncounterId, condition: '' },
        { text: 'Run back to the entrance', target: caveEntranceId, condition: '' },
      ],
      tags: ['danger'],
      position: { x: 500, y: 200 },
      metadata: {},
    };

    story.passages[treasureRoomId] = {
      id: treasureRoomId,
      title: 'Treasure Room',
      content: `You found a hidden treasure room! There's a chest filled with diamonds!

🎉 You won!`,
      choices: [
        { text: 'Take the treasure and go home', target: escapeId, condition: '' },
      ],
      tags: ['treasure', 'victory'],
      position: { x: 500, y: 0 },
      metadata: {},
    };

    story.passages[mobEncounterId] = {
      id: mobEncounterId,
      title: 'Zombie Attack',
      content: `A zombie appears! What do you do?`,
      choices: [
        { text: 'Fight with your sword', target: treasureRoomId, condition: '' },
        { text: 'Run away', target: caveEntranceId, condition: '' },
      ],
      tags: ['combat'],
      position: { x: 500, y: 300 },
      metadata: {},
    };

    story.passages[escapeId] = {
      id: escapeId,
      title: 'Escape',
      content: `You made it out with the treasure! Great job, adventurer!

THE END`,
      choices: [],
      tags: ['ending'],
      position: { x: 700, y: 0 },
      metadata: {},
    };

    story.startPassage = startId;
    return story;
  },
};

/**
 * Minecraft: Village Quest Template
 */
export const minecraftVillageQuest: KidsTemplate = {
  id: 'minecraft-village-quest',
  name: 'Village Helper Quest',
  description: 'Help the villagers with their problems and become a hero!',
  platform: 'minecraft',
  difficulty: 'beginner',
  icon: '🏘️',
  tags: ['quest', 'helping', 'village'],
  generateStory: () => {
    const story = createBaseStory('Village Hero');
    const startId = nanoid();
    const villageId = nanoid();
    const farmerId = nanoid();
    const blacksmithId = nanoid();
    const celebrationId = nanoid();

    story.passages[startId] = {
      id: startId,
      title: 'Start',
      content: `You arrive at a peaceful village. The villagers look worried.

A villager runs up to you: "Please help us! We need a hero!"`,
      choices: [
        { text: 'Ask what they need', target: villageId, condition: '' },
        { text: 'Ignore them and explore', target: villageId, condition: '' },
      ],
      tags: [],
      position: { x: 100, y: 100 },
      metadata: {},
    };

    story.passages[villageId] = {
      id: villageId,
      title: 'Village Square',
      content: `You're in the village square. Who do you want to help?`,
      choices: [
        { text: 'Help the farmer (needs wheat)', target: farmerId, condition: '' },
        { text: 'Help the blacksmith (needs iron)', target: blacksmithId, condition: '' },
      ],
      tags: ['village'],
      position: { x: 300, y: 100 },
      metadata: {},
    };

    story.passages[farmerId] = {
      id: farmerId,
      title: 'Farmer',
      content: `The farmer says: "Thank you for the wheat! Here's a reward!"

You got: Golden Apple 🍎`,
      choices: [
        { text: 'Help someone else', target: blacksmithId, condition: '' },
        { text: 'Celebrate with the village', target: celebrationId, condition: '' },
      ],
      tags: ['quest-complete'],
      position: { x: 500, y: 0 },
      metadata: {},
    };

    story.passages[blacksmithId] = {
      id: blacksmithId,
      title: 'Blacksmith',
      content: `The blacksmith says: "Thanks for the iron! I made you a diamond sword!"

You got: Diamond Sword ⚔️`,
      choices: [
        { text: 'Celebrate with the village', target: celebrationId, condition: '' },
      ],
      tags: ['quest-complete'],
      position: { x: 500, y: 200 },
      metadata: {},
    };

    story.passages[celebrationId] = {
      id: celebrationId,
      title: 'Celebration',
      content: `The whole village celebrates! You're a hero!

🎉 Congratulations! THE END`,
      choices: [],
      tags: ['ending', 'victory'],
      position: { x: 700, y: 100 },
      metadata: {},
    };

    story.startPassage = startId;
    return story;
  },
};

/**
 * Roblox: Obby Adventure Template
 */
export const robloxObbyAdventure: KidsTemplate = {
  id: 'roblox-obby-adventure',
  name: 'Roblox Obby Challenge',
  description: 'Complete challenging obstacles and reach the end!',
  platform: 'roblox',
  difficulty: 'beginner',
  icon: '🎮',
  tags: ['obby', 'parkour', 'challenge'],
  generateStory: () => {
    const story = createBaseStory('My Obby Adventure');
    const startId = nanoid();
    const level1Id = nanoid();
    const level2Id = nanoid();
    const level3Id = nanoid();
    const victoryId = nanoid();
    const failId = nanoid();

    story.passages[startId] = {
      id: startId,
      title: 'Start',
      content: `Welcome to the Ultimate Obby Challenge!

Can you make it to the end?`,
      choices: [
        { text: 'Start the challenge!', target: level1Id, condition: '' },
      ],
      tags: [],
      position: { x: 100, y: 100 },
      metadata: {},
    };

    story.passages[level1Id] = {
      id: level1Id,
      title: 'Level 1: Easy Jumps',
      content: `Jump across the platforms. Don't fall!

⭐ Progress: 33%`,
      choices: [
        { text: 'Jump carefully', target: level2Id, condition: '' },
        { text: 'Rush through', target: failId, condition: '' },
      ],
      tags: ['level'],
      position: { x: 300, y: 100 },
      metadata: {},
    };

    story.passages[level2Id] = {
      id: level2Id,
      title: 'Level 2: Moving Platforms',
      content: `Watch out! These platforms move!

⭐ Progress: 66%`,
      choices: [
        { text: 'Time your jumps', target: level3Id, condition: '' },
        { text: 'Jump randomly', target: failId, condition: '' },
      ],
      tags: ['level'],
      position: { x: 500, y: 100 },
      metadata: {},
    };

    story.passages[level3Id] = {
      id: level3Id,
      title: 'Level 3: Final Challenge',
      content: `This is it! The final obstacle!

⭐ Progress: 99%`,
      choices: [
        { text: 'Make the final jump!', target: victoryId, condition: '' },
      ],
      tags: ['level'],
      position: { x: 700, y: 100 },
      metadata: {},
    };

    story.passages[victoryId] = {
      id: victoryId,
      title: 'Victory!',
      content: `🎉 You did it! You completed the obby!

You earned: Champion Badge 🏆

THE END`,
      choices: [],
      tags: ['ending', 'victory'],
      position: { x: 900, y: 100 },
      metadata: {},
    };

    story.passages[failId] = {
      id: failId,
      title: 'Oops!',
      content: `You fell! Don't give up!`,
      choices: [
        { text: 'Try again from Level 1', target: level1Id, condition: '' },
      ],
      tags: ['failure'],
      position: { x: 500, y: 300 },
      metadata: {},
    };

    story.startPassage = startId;
    return story;
  },
};

/**
 * Roblox: Roleplay School Template
 */
export const robloxRoleplaySchool: KidsTemplate = {
  id: 'roblox-roleplay-school',
  name: 'School Roleplay',
  description: 'Experience a day at school and make friends!',
  platform: 'roblox',
  difficulty: 'beginner',
  icon: '🏫',
  tags: ['roleplay', 'social', 'school'],
  generateStory: () => {
    const story = createBaseStory('School Day');
    const startId = nanoid();
    const classroomId = nanoid();
    const cafeteriaId = nanoid();
    const playgroundId = nanoid();
    const endId = nanoid();

    story.passages[startId] = {
      id: startId,
      title: 'Start',
      content: `It's your first day at a new school!

The bell rings. Time to go to class!`,
      choices: [
        { text: 'Go to classroom', target: classroomId, condition: '' },
      ],
      tags: [],
      position: { x: 100, y: 100 },
      metadata: {},
    };

    story.passages[classroomId] = {
      id: classroomId,
      title: 'Classroom',
      content: `The teacher welcomes you. You see other students.

"Class, we have a new student!"`,
      choices: [
        { text: 'Introduce yourself', target: cafeteriaId, condition: '' },
        { text: 'Stay quiet', target: cafeteriaId, condition: '' },
      ],
      tags: ['class'],
      position: { x: 300, y: 100 },
      metadata: {},
    };

    story.passages[cafeteriaId] = {
      id: cafeteriaId,
      title: 'Cafeteria',
      content: `It's lunch time! Where do you want to sit?`,
      choices: [
        { text: 'Sit with the friendly group', target: playgroundId, condition: '' },
        { text: 'Sit alone and eat', target: playgroundId, condition: '' },
      ],
      tags: ['lunch'],
      position: { x: 500, y: 100 },
      metadata: {},
    };

    story.passages[playgroundId] = {
      id: playgroundId,
      title: 'Playground',
      content: `Recess time! Kids are playing games.

"Want to join us?" asks a friendly student.`,
      choices: [
        { text: 'Play with them', target: endId, condition: '' },
        { text: 'Explore the playground', target: endId, condition: '' },
      ],
      tags: ['recess'],
      position: { x: 700, y: 100 },
      metadata: {},
    };

    story.passages[endId] = {
      id: endId,
      title: 'End of Day',
      content: `The school day is over! You made some new friends!

Great job! 🎉

THE END`,
      choices: [],
      tags: ['ending'],
      position: { x: 900, y: 100 },
      metadata: {},
    };

    story.startPassage = startId;
    return story;
  },
};

/**
 * All available kids templates
 */
export const kidsTemplates: KidsTemplate[] = [
  minecraftCaveAdventure,
  minecraftVillageQuest,
  robloxObbyAdventure,
  robloxRoleplaySchool,
];

/**
 * Get templates filtered by platform
 */
export function getTemplatesByPlatform(platform: 'minecraft' | 'roblox' | 'both'): KidsTemplate[] {
  return kidsTemplates.filter(t => t.platform === platform || t.platform === 'both');
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): KidsTemplate | undefined {
  return kidsTemplates.find(t => t.id === id);
}
