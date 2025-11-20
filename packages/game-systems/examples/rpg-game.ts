/**
 * RPG Game Example
 *
 * Demonstrates using all game systems together to create
 * a simple RPG game loop with inventory, stats, quests, and achievements.
 */

import {
  InventorySystem,
  StatsSystem,
  QuestSystem,
  AchievementSystem,
  exportGameSystems,
  importGameSystems,
} from '../src/index';

// Initialize game systems
const inventory = new InventorySystem(25); // 25 slot inventory
const stats = new StatsSystem();
const quests = new QuestSystem();
const achievements = new AchievementSystem();

// Setup event logging
function setupEventListeners() {
  // Log all inventory changes
  inventory.on('*', (event) => {
    console.log(`[Inventory] ${event.type}:`, event.data);
  });

  // Log stat changes
  stats.on('statModified', (event) => {
    const { stat, delta, newValue } = event.data;
    console.log(`[Stats] ${stat.name}: ${delta > 0 ? '+' : ''}${delta} (now ${newValue})`);
  });

  // Log quest progress
  quests.on('objectiveCompleted', (event) => {
    const { quest, objective } = event.data;
    console.log(`[Quest] Completed: ${objective.description}`);
    console.log(`  Progress: ${quests.getQuestProgress(quest.id) * 100}%`);
  });

  quests.on('questCompleted', (event) => {
    const { quest } = event.data;
    console.log(`[Quest] 🎉 QUEST COMPLETED: ${quest.title}`);

    // Award quest rewards
    if (quest.rewards) {
      for (const reward of quest.rewards) {
        if (reward.type === 'item' && reward.itemId) {
          const item = getItemTemplate(reward.itemId);
          if (item) {
            inventory.addItem({ ...item, quantity: reward.quantity || 1 });
            console.log(`  Reward: ${item.name} x${reward.quantity || 1}`);
          }
        } else if (reward.type === 'xp') {
          stats.modifyStat('experience', reward.quantity || 0);
          console.log(`  Reward: ${reward.quantity} XP`);
        }
      }
    }
  });

  // Log achievement unlocks
  achievements.on('achievementUnlocked', (event) => {
    const { achievement } = event.data;
    console.log(`[Achievement] 🏆 ${achievement.name}`);
    console.log(`  ${achievement.description}`);
    if (achievement.points) {
      console.log(`  +${achievement.points} points`);
    }
  });
}

// Item templates
function getItemTemplate(itemId: string) {
  const templates: Record<string, any> = {
    health_potion: {
      id: 'health_potion',
      name: 'Health Potion',
      description: 'Restores 50 HP',
      category: 'potion',
      value: 25,
      properties: { healing: 50 },
    },
    mana_potion: {
      id: 'mana_potion',
      name: 'Mana Potion',
      description: 'Restores 30 MP',
      category: 'potion',
      value: 20,
      properties: { manaRestore: 30 },
    },
    iron_sword: {
      id: 'iron_sword',
      name: 'Iron Sword',
      description: 'A sturdy iron blade',
      category: 'weapon',
      value: 100,
      stackable: false,
      properties: { damage: 15 },
    },
    goblin_tooth: {
      id: 'goblin_tooth',
      name: 'Goblin Tooth',
      description: 'A trophy from a defeated goblin',
      category: 'material',
      value: 5,
      maxStack: 99,
    },
  };

  return templates[itemId];
}

// Initialize character stats
function initializeCharacter() {
  console.log('=== Character Creation ===\n');

  stats.setStat('health', 100, 100, 0);
  stats.setStat('mana', 50, 50, 0);
  stats.setStat('attack', 10);
  stats.setStat('defense', 5);
  stats.setStat('level', 1, undefined, 1);
  stats.setStat('experience', 0);

  console.log('Character stats initialized:');
  console.log(`  Health: ${stats.getStat('health')}/${stats.getStatObject('health')?.maxValue}`);
  console.log(`  Mana: ${stats.getStat('mana')}/${stats.getStatObject('mana')?.maxValue}`);
  console.log(`  Attack: ${stats.getStat('attack')}`);
  console.log(`  Defense: ${stats.getStat('defense')}`);
  console.log(`  Level: ${stats.getStat('level')}`);
  console.log('');
}

// Setup starting inventory
function setupStartingInventory() {
  console.log('=== Starting Inventory ===\n');

  inventory.addItem({ ...getItemTemplate('health_potion'), quantity: 3 });
  inventory.addItem({ ...getItemTemplate('mana_potion'), quantity: 2 });

  console.log('Starting items:');
  for (const item of inventory.getItems()) {
    console.log(`  ${item.name} x${item.quantity}`);
  }
  console.log('');
}

// Create quests
function setupQuests() {
  console.log('=== Available Quests ===\n');

  // Main quest
  const mainQuest = quests.addQuest({
    title: 'The Goblin Threat',
    description: 'The village is being terrorized by goblins. Help defend the village!',
    category: 'main',
    mainQuest: true,
    objectives: [
      {
        id: 'talk_to_elder',
        description: 'Talk to the village elder',
        completed: false,
      },
      {
        id: 'defeat_goblins',
        description: 'Defeat 5 goblins',
        completed: false,
        progress: 0,
        target: 5,
      },
      {
        id: 'return_to_elder',
        description: 'Return to the elder',
        completed: false,
      },
    ],
    rewards: [
      { type: 'item', itemId: 'iron_sword', quantity: 1 },
      { type: 'xp', quantity: 100 },
    ],
  });

  // Side quest
  const sideQuest = quests.addQuest({
    title: 'Potion Collector',
    description: 'The apothecary needs ingredients',
    category: 'side',
    objectives: [
      {
        id: 'collect_teeth',
        description: 'Collect 10 goblin teeth',
        completed: false,
        progress: 0,
        target: 10,
      },
    ],
    rewards: [
      { type: 'item', itemId: 'health_potion', quantity: 5 },
      { type: 'xp', quantity: 50 },
    ],
  });

  console.log('Quests available:');
  for (const quest of quests.getAllQuests()) {
    console.log(`  [${quest.mainQuest ? 'MAIN' : 'SIDE'}] ${quest.title}`);
    console.log(`    ${quest.description}`);
  }
  console.log('');

  return { mainQuest, sideQuest };
}

// Setup achievements
function setupAchievements() {
  console.log('=== Achievements Setup ===\n');

  achievements.addAchievement({
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first quest',
    category: 'progress',
    rarity: 'common',
    points: 10,
  });

  achievements.addAchievement({
    id: 'goblin_slayer',
    name: 'Goblin Slayer',
    description: 'Defeat 20 goblins',
    category: 'combat',
    rarity: 'uncommon',
    points: 25,
    progress: 0,
    target: 20,
  });

  achievements.addAchievement({
    id: 'well_equipped',
    name: 'Well Equipped',
    description: 'Acquire 10 different items',
    category: 'collection',
    rarity: 'common',
    points: 15,
    progress: 0,
    target: 10,
  });

  achievements.addAchievement({
    id: 'secret_power',
    name: 'Secret Power',
    description: 'Unlock a hidden ability',
    category: 'secret',
    rarity: 'legendary',
    points: 100,
    hidden: true,
  });

  console.log(`${achievements.getAllAchievements().length} achievements available`);
  console.log('');
}

// Simulate combat
function combatEncounter(enemyName: string, enemyAttack: number) {
  console.log(`\n=== Combat: ${enemyName} ===\n`);

  const playerAttack = stats.getStat('attack');
  const playerDefense = stats.getStat('defense');

  // Player attacks
  const damage = Math.max(1, playerAttack - Math.floor(enemyAttack / 2));
  console.log(`You deal ${damage} damage to ${enemyName}`);

  // Enemy attacks
  const damageTaken = Math.max(1, enemyAttack - playerDefense);
  stats.modifyStat('health', -damageTaken);

  const currentHealth = stats.getStat('health');
  console.log(`${enemyName} deals ${damageTaken} damage`);
  console.log(`Your health: ${currentHealth}/${stats.getStatObject('health')?.maxValue}`);

  // Check for low health
  if (stats.compare('health', '<', 30)) {
    console.log('⚠️  Low health! Consider using a potion.');

    // Use potion if available
    if (inventory.hasItemByName('Health Potion')) {
      console.log('Using Health Potion...');
      inventory.removeItemByName('Health Potion', 1);
      stats.modifyStat('health', 50);
      console.log(`Health restored to ${stats.getStat('health')}`);
    }
  }

  // Loot
  const goblinTooth = getItemTemplate('goblin_tooth');
  inventory.addItem({ ...goblinTooth, quantity: 1 });
  console.log('Looted: Goblin Tooth');

  console.log('');
}

// Game loop simulation
function runGameSimulation() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎮 RPG GAME SIMULATION\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  setupEventListeners();
  initializeCharacter();
  setupStartingInventory();
  const { mainQuest, sideQuest } = setupQuests();
  setupAchievements();

  // Start main quest
  console.log('=== Starting Main Quest ===\n');
  quests.startQuest(mainQuest);

  // Complete first objective
  console.log('Talking to the village elder...\n');
  quests.completeObjective(mainQuest, 'talk_to_elder');

  // Combat sequence
  for (let i = 0; i < 5; i++) {
    combatEncounter('Goblin', 8);

    // Update quest progress
    quests.updateObjectiveProgress(mainQuest, 'defeat_goblins', i + 1);
    quests.updateObjectiveProgress(sideQuest, 'collect_teeth', i + 1);

    // Update achievement progress
    achievements.incrementProgress('goblin_slayer', 1);
  }

  // Return to elder
  console.log('=== Returning to Village Elder ===\n');
  quests.completeObjective(mainQuest, 'return_to_elder');

  // Check if first quest achievement unlocked
  if (quests.isQuestCompleted(mainQuest)) {
    achievements.unlock('first_steps');
  }

  // Display final status
  console.log('\n=== Final Status ===\n');

  console.log('Stats:');
  for (const statName of stats.getStatNames()) {
    const stat = stats.getStatObject(statName);
    const value = stats.getStat(statName);
    if (stat?.maxValue) {
      console.log(`  ${statName}: ${value}/${stat.maxValue}`);
    } else {
      console.log(`  ${statName}: ${value}`);
    }
  }

  console.log('\nInventory:');
  for (const item of inventory.sortItems('name')) {
    console.log(`  ${item.name} x${item.quantity}`);
  }
  console.log(`  Total value: ${inventory.getTotalValue()} gold`);

  console.log('\nQuests:');
  const completed = quests.getQuestsByStatus('completed');
  const active = quests.getQuestsByStatus('active');
  console.log(`  Completed: ${completed.length}`);
  console.log(`  Active: ${active.length}`);

  console.log('\nAchievements:');
  console.log(`  Unlocked: ${achievements.getUnlockedAchievements().length}/${achievements.getAllAchievements().length}`);
  console.log(`  Total points: ${achievements.getTotalPoints()}/${achievements.getMaxPoints()}`);
  console.log(`  Progress: ${achievements.getUnlockPercentage().toFixed(1)}%`);

  // Save game
  console.log('\n=== Saving Game ===\n');
  const saveData = exportGameSystems({ inventory, stats, quests, achievements });
  console.log('Game saved successfully!');
  console.log(`Save data size: ${JSON.stringify(saveData).length} bytes`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Run the simulation
runGameSimulation();
