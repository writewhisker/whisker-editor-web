/**
 * Reusable Lua Function
 *
 * Represents a reusable Lua function that can be saved in a library
 * and inserted into scripts.
 */

import { nanoid } from 'nanoid';

export interface LuaFunctionData {
  id: string;
  name: string;
  description: string;
  code: string;
  category: string;
  parameters?: string;
  returnType?: string;
  tags?: string[];
  created?: string;
  modified?: string;
}

export class LuaFunction {
  id: string;
  name: string;
  description: string;
  code: string;
  category: string;
  parameters: string;
  returnType: string;
  tags: string[];
  created: string;
  modified: string;

  constructor(data?: Partial<LuaFunctionData>) {
    const now = new Date().toISOString();

    this.id = data?.id || nanoid();
    this.name = data?.name || 'New Function';
    this.description = data?.description || '';
    this.code = data?.code || 'function myFunction()\n  -- Add code here\nend';
    this.category = data?.category || 'General';
    this.parameters = data?.parameters || '';
    this.returnType = data?.returnType || '';
    this.tags = data?.tags ? [...data.tags] : []; // Create a copy of the array
    this.created = data?.created || now;
    this.modified = data?.modified || now;
  }

  /**
   * Serialize to plain object
   */
  serialize(): LuaFunctionData {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      code: this.code,
      category: this.category,
      parameters: this.parameters,
      returnType: this.returnType,
      tags: this.tags,
      created: this.created,
      modified: this.modified,
    };
  }

  /**
   * Deserialize from plain object
   */
  static deserialize(data: LuaFunctionData): LuaFunction {
    return new LuaFunction(data);
  }

  /**
   * Clone this function with a new ID
   */
  clone(): LuaFunction {
    return new LuaFunction({
      ...this.serialize(),
      id: nanoid(),
      name: `${this.name} (Copy)`,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    });
  }

  /**
   * Update modification timestamp
   */
  touch(): void {
    this.modified = new Date().toISOString();
  }
}

/**
 * Default function templates
 */
export const DEFAULT_FUNCTION_TEMPLATES: LuaFunctionData[] = [
  {
    id: 'template-damage-calc',
    name: 'calculateDamage',
    description: 'Calculate damage with random variance',
    category: 'Combat',
    parameters: 'baseDamage: number, variance: number',
    returnType: 'number',
    code: `function calculateDamage(baseDamage, variance)
  local min = baseDamage - variance
  local max = baseDamage + variance
  return random(min, max)
end`,
    tags: ['combat', 'damage', 'random'],
  },
  {
    id: 'template-health-check',
    name: 'checkHealth',
    description: 'Check if entity health is in a specific range',
    category: 'Combat',
    parameters: 'health: number, minHealth: number, maxHealth: number',
    returnType: 'boolean',
    code: `function checkHealth(health, minHealth, maxHealth)
  return health >= minHealth and health <= maxHealth
end`,
    tags: ['combat', 'health', 'condition'],
  },
  {
    id: 'template-inventory-add',
    name: 'addToInventory',
    description: 'Add item to player inventory',
    category: 'Inventory',
    parameters: 'itemName: string, quantity: number',
    returnType: 'void',
    code: `function addToInventory(itemName, quantity)
  local current = game_state.get("inventory_" .. itemName) or 0
  game_state.set("inventory_" .. itemName, current + quantity)
  print(format("Added {0}x {1}", quantity, itemName))
end`,
    tags: ['inventory', 'items'],
  },
  {
    id: 'template-inventory-remove',
    name: 'removeFromInventory',
    description: 'Remove item from player inventory',
    category: 'Inventory',
    parameters: 'itemName: string, quantity: number',
    returnType: 'boolean',
    code: `function removeFromInventory(itemName, quantity)
  local current = game_state.get("inventory_" .. itemName) or 0
  if current >= quantity then
    game_state.set("inventory_" .. itemName, current - quantity)
    print(format("Removed {0}x {1}", quantity, itemName))
    return true
  else
    print(format("Not enough {0} (have {1}, need {2})", itemName, current, quantity))
    return false
  end
end`,
    tags: ['inventory', 'items'],
  },
  {
    id: 'template-inventory-has',
    name: 'hasItem',
    description: 'Check if player has enough of an item',
    category: 'Inventory',
    parameters: 'itemName: string, quantity: number',
    returnType: 'boolean',
    code: `function hasItem(itemName, quantity)
  local current = game_state.get("inventory_" .. itemName) or 0
  return current >= quantity
end`,
    tags: ['inventory', 'items', 'condition'],
  },
  {
    id: 'template-dialogue-choice',
    name: 'makeDialogueChoice',
    description: 'Record dialogue choice and affect relationship',
    category: 'Dialogue',
    parameters: 'npcName: string, choiceType: string, relationshipChange: number',
    returnType: 'void',
    code: `function makeDialogueChoice(npcName, choiceType, relationshipChange)
  -- Record the choice
  local choiceKey = "dialogue_" .. npcName .. "_" .. choiceType
  game_state.set(choiceKey, true)

  -- Update relationship
  local relationKey = "relationship_" .. npcName
  local current = game_state.get(relationKey) or 0
  game_state.set(relationKey, current + relationshipChange)

  print(format("Relationship with {0} changed by {1}", npcName, relationshipChange))
end`,
    tags: ['dialogue', 'relationship', 'choices'],
  },
  {
    id: 'template-quest-start',
    name: 'startQuest',
    description: 'Initialize a quest in the game state',
    category: 'Quests',
    parameters: 'questId: string',
    returnType: 'void',
    code: `function startQuest(questId)
  game_state.set("quest_" .. questId .. "_status", "active")
  game_state.set("quest_" .. questId .. "_started", os.time())
  print(format("Quest started: {0}", questId))
end`,
    tags: ['quest', 'progression'],
  },
  {
    id: 'template-quest-complete',
    name: 'completeQuest',
    description: 'Mark a quest as completed',
    category: 'Quests',
    parameters: 'questId: string',
    returnType: 'void',
    code: `function completeQuest(questId)
  game_state.set("quest_" .. questId .. "_status", "completed")
  game_state.set("quest_" .. questId .. "_completed", os.time())

  -- Increment quest counter
  local completed = game_state.get("quests_completed") or 0
  game_state.set("quests_completed", completed + 1)

  print(format("Quest completed: {0}", questId))
end`,
    tags: ['quest', 'progression'],
  },
  {
    id: 'template-stat-check',
    name: 'checkStat',
    description: 'Check if player stat meets threshold',
    category: 'Stats',
    parameters: 'statName: string, threshold: number',
    returnType: 'boolean',
    code: `function checkStat(statName, threshold)
  local value = game_state.get("stat_" .. statName) or 0
  return value >= threshold
end`,
    tags: ['stats', 'condition'],
  },
  {
    id: 'template-stat-modify',
    name: 'modifyStat',
    description: 'Modify a player stat by a delta value',
    category: 'Stats',
    parameters: 'statName: string, delta: number',
    returnType: 'number',
    code: `function modifyStat(statName, delta)
  local key = "stat_" .. statName
  local current = game_state.get(key) or 0
  local newValue = current + delta
  game_state.set(key, newValue)
  print(format("{0} changed by {1} (now {2})", statName, delta, newValue))
  return newValue
end`,
    tags: ['stats', 'modification'],
  },
];
