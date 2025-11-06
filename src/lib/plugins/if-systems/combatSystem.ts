import type { EditorPlugin } from '../types';

/**
 * Combat System Plugin
 *
 * Turn-based combat system with:
 * - Combat encounters with enemies
 * - Attack/defend/flee actions
 * - Damage calculation with stats integration
 * - Turn management
 * - Combat state tracking
 * - Victory/defeat handling
 */

export interface Enemy {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  loot?: string[];
  xp?: number;
}

export interface CombatState {
  active: boolean;
  turn: number;
  playerTurn: boolean;
  enemy: Enemy | null;
  combatLog: string[];
  playerDefending: boolean;
}

export const combatSystem: EditorPlugin = {
  name: 'combat-system',
  version: '1.0.0',
  author: 'Whisker Team',
  description: 'Turn-based combat system with enemy encounters',

  // Combat passage type
  nodeTypes: [
    {
      type: 'combat',
      label: 'Combat',
      icon: '⚔️',
      color: '#E74C3C',
      description: 'Combat encounter passage',
    },
  ],

  // Combat actions
  actions: [
    {
      type: 'combat.start',
      label: 'Start Combat',
      description: 'Initialize combat with an enemy',
      execute: async (context, params: { enemy: Enemy }) => {
        context.storyState.combat = {
          active: true,
          turn: 1,
          playerTurn: true,
          enemy: { ...params.enemy },
          combatLog: [`Combat started with ${params.enemy.name}!`],
          playerDefending: false,
        };

        context.variables.set('in_combat', true);
        context.variables.set('combat_turn', 1);

        console.log(`[Combat] Started combat with ${params.enemy.name}`);
      },
    },
    {
      type: 'combat.attack',
      label: 'Attack',
      description: 'Player attacks the enemy',
      execute: async (context) => {
        const combat: CombatState = context.storyState.combat;
        if (!combat?.active || !combat.enemy) return;

        // Player stats (from stats system if available)
        const playerAttack = context.storyState.stats?.stats.attack?.value || 10;
        const playerDefense = context.storyState.stats?.stats.defense?.value || 5;

        // Calculate damage
        const baseDamage = Math.max(1, playerAttack - combat.enemy.defense);
        const damage = Math.floor(baseDamage * (0.8 + Math.random() * 0.4)); // 80-120% variance

        combat.enemy.health -= damage;
        combat.combatLog.push(`You deal ${damage} damage to ${combat.enemy.name}!`);

        console.log(`[Combat] Player attacks for ${damage} damage`);

        // Check if enemy defeated
        if (combat.enemy.health <= 0) {
          combat.combatLog.push(`${combat.enemy.name} has been defeated!`);
          combat.active = false;
          context.variables.set('in_combat', false);
          context.variables.set('combat_victory', true);

          // Award XP if available
          if (combat.enemy.xp && context.storyState.stats?.stats.xp) {
            context.storyState.stats.stats.xp.value += combat.enemy.xp;
            context.variables.set('xp', context.storyState.stats.stats.xp.value);
          }

          return;
        }

        // Enemy turn
        combat.playerTurn = false;
        const enemyDamage = Math.max(
          1,
          combat.enemy.attack - (combat.playerDefending ? playerDefense * 2 : playerDefense)
        );
        const actualEnemyDamage = Math.floor(enemyDamage * (0.8 + Math.random() * 0.4));

        // Apply damage to player health
        if (context.storyState.stats?.stats.health) {
          context.storyState.stats.stats.health.value -= actualEnemyDamage;
          context.variables.set('health', context.storyState.stats.stats.health.value);

          combat.combatLog.push(`${combat.enemy.name} deals ${actualEnemyDamage} damage!`);

          // Check player defeat
          if (context.storyState.stats.stats.health.value <= 0) {
            combat.combatLog.push('You have been defeated!');
            combat.active = false;
            context.variables.set('in_combat', false);
            context.variables.set('combat_defeat', true);
            context.variables.set('is_dead', true);
          }
        }

        combat.playerTurn = true;
        combat.turn++;
        combat.playerDefending = false;
        context.variables.set('combat_turn', combat.turn);
      },
    },
    {
      type: 'combat.defend',
      label: 'Defend',
      description: 'Defend to reduce damage taken this turn',
      execute: async (context) => {
        const combat: CombatState = context.storyState.combat;
        if (!combat?.active || !combat.playerTurn) return;

        combat.playerDefending = true;
        combat.combatLog.push('You brace for the next attack!');

        console.log('[Combat] Player defending');

        // Enemy turn (copy logic from attack)
        combat.playerTurn = false;
        const playerDefense = context.storyState.stats?.stats.defense?.value || 5;
        const enemyDamage = Math.max(1, (combat.enemy?.attack || 10) - playerDefense * 2);
        const actualDamage = Math.floor(enemyDamage * (0.8 + Math.random() * 0.4));

        if (context.storyState.stats?.stats.health && combat.enemy) {
          context.storyState.stats.stats.health.value -= actualDamage;
          context.variables.set('health', context.storyState.stats.stats.health.value);

          combat.combatLog.push(`${combat.enemy.name} deals ${actualDamage} damage (reduced)!`);

          if (context.storyState.stats.stats.health.value <= 0) {
            combat.combatLog.push('You have been defeated!');
            combat.active = false;
            context.variables.set('in_combat', false);
            context.variables.set('combat_defeat', true);
          }
        }

        combat.playerTurn = true;
        combat.turn++;
        combat.playerDefending = false;
        context.variables.set('combat_turn', combat.turn);
      },
    },
    {
      type: 'combat.flee',
      label: 'Flee',
      description: 'Attempt to flee from combat',
      execute: async (context) => {
        const combat: CombatState = context.storyState.combat;
        if (!combat?.active) return;

        // Flee chance based on speed
        const playerSpeed = context.storyState.stats?.stats.speed?.value || 10;
        const enemySpeed = combat.enemy?.speed || 10;
        const fleeChance = Math.min(0.9, 0.5 + (playerSpeed - enemySpeed) * 0.05);

        if (Math.random() < fleeChance) {
          combat.combatLog.push('You successfully fled from combat!');
          combat.active = false;
          context.variables.set('in_combat', false);
          context.variables.set('combat_fled', true);

          console.log('[Combat] Player fled successfully');
        } else {
          combat.combatLog.push('Failed to flee!');

          // Enemy gets a free attack
          const playerDefense = context.storyState.stats?.stats.defense?.value || 5;
          const enemyDamage = Math.max(1, (combat.enemy?.attack || 10) - playerDefense);
          const damage = Math.floor(enemyDamage * (0.8 + Math.random() * 0.4));

          if (context.storyState.stats?.stats.health) {
            context.storyState.stats.stats.health.value -= damage;
            context.variables.set('health', context.storyState.stats.stats.health.value);

            combat.combatLog.push(`${combat.enemy?.name} attacks as you flee! ${damage} damage!`);
          }

          console.log('[Combat] Flee failed');
        }

        combat.turn++;
        context.variables.set('combat_turn', combat.turn);
      },
    },
    {
      type: 'combat.end',
      label: 'End Combat',
      description: 'Force end combat',
      execute: async (context) => {
        if (context.storyState.combat) {
          context.storyState.combat.active = false;
          context.variables.set('in_combat', false);
          console.log('[Combat] Combat ended');
        }
      },
    },
  ],

  // Combat conditions
  conditions: [
    {
      type: 'combat.active',
      label: 'In Combat',
      description: 'Check if combat is active',
      evaluate: (context) => {
        return context.storyState.combat?.active || false;
      },
    },
    {
      type: 'combat.victory',
      label: 'Combat Victory',
      description: 'Check if player won last combat',
      evaluate: (context) => {
        return context.variables.get('combat_victory') === true;
      },
    },
    {
      type: 'combat.defeat',
      label: 'Combat Defeat',
      description: 'Check if player was defeated',
      evaluate: (context) => {
        return context.variables.get('combat_defeat') === true;
      },
    },
    {
      type: 'combat.enemyHealth',
      label: 'Enemy Health Check',
      description: 'Check enemy health threshold',
      evaluate: (context, params: { operator: 'lt' | 'gt' | 'lte' | 'gte'; percent: number }) => {
        const enemy = context.storyState.combat?.enemy;
        if (!enemy) return false;

        const healthPercent = (enemy.health / enemy.maxHealth) * 100;

        switch (params.operator) {
          case 'lt':
            return healthPercent < params.percent;
          case 'gt':
            return healthPercent > params.percent;
          case 'lte':
            return healthPercent <= params.percent;
          case 'gte':
            return healthPercent >= params.percent;
          default:
            return false;
        }
      },
    },
  ],

  // Runtime hooks
  runtime: {
    onInit: (context) => {
      if (!context.storyState.combat) {
        context.storyState.combat = {
          active: false,
          turn: 0,
          playerTurn: true,
          enemy: null,
          combatLog: [],
          playerDefending: false,
        };
      }

      console.log('[Combat System] Initialized');
    },
  },

  onRegister: () => {
    console.log('[Combat System] Plugin registered');
  },

  onUnregister: () => {
    console.log('[Combat System] Plugin unregistered');
  },
};
