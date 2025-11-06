/**
 * Minecraft Assets Data
 *
 * Comprehensive lists of Minecraft items, mobs, biomes, etc. for kids to use.
 */

export interface MinecraftItem {
  id: string;
  name: string;
  emoji: string;
  category: 'tool' | 'weapon' | 'food' | 'block' | 'treasure' | 'other';
}

export interface MinecraftMob {
  id: string;
  name: string;
  emoji: string;
  type: 'hostile' | 'neutral' | 'passive';
}

export interface MinecraftBiome {
  id: string;
  name: string;
  emoji: string;
  climate: 'hot' | 'cold' | 'temperate' | 'ocean';
}

export interface MinecraftLocation {
  id: string;
  name: string;
  emoji: string;
  type: 'structure' | 'dimension' | 'custom';
}

/**
 * Popular Minecraft Items
 */
export const minecraftItems: MinecraftItem[] = [
  // Tools
  { id: 'diamond_pickaxe', name: 'Diamond Pickaxe', emoji: '⛏️', category: 'tool' },
  { id: 'iron_pickaxe', name: 'Iron Pickaxe', emoji: '⛏️', category: 'tool' },
  { id: 'diamond_axe', name: 'Diamond Axe', emoji: '🪓', category: 'tool' },
  { id: 'diamond_shovel', name: 'Diamond Shovel', emoji: '🏗️', category: 'tool' },
  { id: 'fishing_rod', name: 'Fishing Rod', emoji: '🎣', category: 'tool' },

  // Weapons
  { id: 'diamond_sword', name: 'Diamond Sword', emoji: '⚔️', category: 'weapon' },
  { id: 'iron_sword', name: 'Iron Sword', emoji: '⚔️', category: 'weapon' },
  { id: 'bow', name: 'Bow', emoji: '🏹', category: 'weapon' },
  { id: 'crossbow', name: 'Crossbow', emoji: '🏹', category: 'weapon' },
  { id: 'trident', name: 'Trident', emoji: '🔱', category: 'weapon' },

  // Food
  { id: 'golden_apple', name: 'Golden Apple', emoji: '🍎', category: 'food' },
  { id: 'enchanted_golden_apple', name: 'Enchanted Golden Apple', emoji: '🍏', category: 'food' },
  { id: 'bread', name: 'Bread', emoji: '🍞', category: 'food' },
  { id: 'cooked_beef', name: 'Cooked Beef', emoji: '🥩', category: 'food' },
  { id: 'cake', name: 'Cake', emoji: '🍰', category: 'food' },

  // Blocks
  { id: 'dirt', name: 'Dirt', emoji: '🟤', category: 'block' },
  { id: 'stone', name: 'Stone', emoji: '🪨', category: 'block' },
  { id: 'oak_log', name: 'Oak Log', emoji: '🪵', category: 'block' },
  { id: 'glass', name: 'Glass', emoji: '🔳', category: 'block' },
  { id: 'tnt', name: 'TNT', emoji: '💣', category: 'block' },

  // Treasure
  { id: 'diamond', name: 'Diamond', emoji: '💎', category: 'treasure' },
  { id: 'emerald', name: 'Emerald', emoji: '💚', category: 'treasure' },
  { id: 'gold_ingot', name: 'Gold Ingot', emoji: '🟡', category: 'treasure' },
  { id: 'iron_ingot', name: 'Iron Ingot', emoji: '⚪', category: 'treasure' },
  { id: 'netherite_ingot', name: 'Netherite Ingot', emoji: '⬛', category: 'treasure' },

  // Other
  { id: 'torch', name: 'Torch', emoji: '🔦', category: 'other' },
  { id: 'ender_pearl', name: 'Ender Pearl', emoji: '🔮', category: 'other' },
  { id: 'bed', name: 'Bed', emoji: '🛏️', category: 'other' },
  { id: 'compass', name: 'Compass', emoji: '🧭', category: 'other' },
  { id: 'map', name: 'Map', emoji: '🗺️', category: 'other' },
];

/**
 * Common Minecraft Mobs
 */
export const minecraftMobs: MinecraftMob[] = [
  // Hostile
  { id: 'zombie', name: 'Zombie', emoji: '🧟', type: 'hostile' },
  { id: 'skeleton', name: 'Skeleton', emoji: '💀', type: 'hostile' },
  { id: 'creeper', name: 'Creeper', emoji: '💥', type: 'hostile' },
  { id: 'spider', name: 'Spider', emoji: '🕷️', type: 'hostile' },
  { id: 'enderman', name: 'Enderman', emoji: '👤', type: 'hostile' },
  { id: 'witch', name: 'Witch', emoji: '🧙', type: 'hostile' },
  { id: 'ender_dragon', name: 'Ender Dragon', emoji: '🐉', type: 'hostile' },
  { id: 'wither', name: 'Wither', emoji: '☠️', type: 'hostile' },

  // Neutral
  { id: 'iron_golem', name: 'Iron Golem', emoji: '🤖', type: 'neutral' },
  { id: 'wolf', name: 'Wolf', emoji: '🐺', type: 'neutral' },
  { id: 'bee', name: 'Bee', emoji: '🐝', type: 'neutral' },
  { id: 'panda', name: 'Panda', emoji: '🐼', type: 'neutral' },
  { id: 'polar_bear', name: 'Polar Bear', emoji: '🐻‍❄️', type: 'neutral' },

  // Passive
  { id: 'pig', name: 'Pig', emoji: '🐷', type: 'passive' },
  { id: 'cow', name: 'Cow', emoji: '🐄', type: 'passive' },
  { id: 'chicken', name: 'Chicken', emoji: '🐔', type: 'passive' },
  { id: 'sheep', name: 'Sheep', emoji: '🐑', type: 'passive' },
  { id: 'horse', name: 'Horse', emoji: '🐴', type: 'passive' },
  { id: 'cat', name: 'Cat', emoji: '🐱', type: 'passive' },
  { id: 'dog', name: 'Dog', emoji: '🐕', type: 'passive' },
  { id: 'villager', name: 'Villager', emoji: '🧑', type: 'passive' },
];

/**
 * Minecraft Biomes
 */
export const minecraftBiomes: MinecraftBiome[] = [
  // Temperate
  { id: 'plains', name: 'Plains', emoji: '🌾', climate: 'temperate' },
  { id: 'forest', name: 'Forest', emoji: '🌲', climate: 'temperate' },
  { id: 'birch_forest', name: 'Birch Forest', emoji: '🌳', climate: 'temperate' },
  { id: 'dark_forest', name: 'Dark Forest', emoji: '🌲', climate: 'temperate' },
  { id: 'swamp', name: 'Swamp', emoji: '🐊', climate: 'temperate' },

  // Hot
  { id: 'desert', name: 'Desert', emoji: '🏜️', climate: 'hot' },
  { id: 'savanna', name: 'Savanna', emoji: '🦁', climate: 'hot' },
  { id: 'jungle', name: 'Jungle', emoji: '🦜', climate: 'hot' },
  { id: 'badlands', name: 'Badlands', emoji: '🏜️', climate: 'hot' },

  // Cold
  { id: 'taiga', name: 'Taiga', emoji: '🌲', climate: 'cold' },
  { id: 'snowy_plains', name: 'Snowy Plains', emoji: '❄️', climate: 'cold' },
  { id: 'snowy_taiga', name: 'Snowy Taiga', emoji: '⛄', climate: 'cold' },
  { id: 'ice_spikes', name: 'Ice Spikes', emoji: '🧊', climate: 'cold' },

  // Ocean
  { id: 'ocean', name: 'Ocean', emoji: '🌊', climate: 'ocean' },
  { id: 'deep_ocean', name: 'Deep Ocean', emoji: '🌊', climate: 'ocean' },
  { id: 'frozen_ocean', name: 'Frozen Ocean', emoji: '🧊', climate: 'ocean' },
  { id: 'warm_ocean', name: 'Warm Ocean', emoji: '🐠', climate: 'ocean' },
];

/**
 * Minecraft Locations/Structures
 */
export const minecraftLocations: MinecraftLocation[] = [
  // Structures
  { id: 'village', name: 'Village', emoji: '🏘️', type: 'structure' },
  { id: 'mine', name: 'Mine', emoji: '⛏️', type: 'structure' },
  { id: 'cave', name: 'Cave', emoji: '🕳️', type: 'structure' },
  { id: 'dungeon', name: 'Dungeon', emoji: '🏰', type: 'structure' },
  { id: 'temple', name: 'Temple', emoji: '🛕', type: 'structure' },
  { id: 'mansion', name: 'Woodland Mansion', emoji: '🏛️', type: 'structure' },
  { id: 'fortress', name: 'Nether Fortress', emoji: '🏰', type: 'structure' },
  { id: 'stronghold', name: 'Stronghold', emoji: '🗿', type: 'structure' },
  { id: 'end_city', name: 'End City', emoji: '🌃', type: 'structure' },

  // Dimensions
  { id: 'overworld', name: 'Overworld', emoji: '🌍', type: 'dimension' },
  { id: 'nether', name: 'The Nether', emoji: '🔥', type: 'dimension' },
  { id: 'the_end', name: 'The End', emoji: '🌌', type: 'dimension' },

  // Custom
  { id: 'spawn', name: 'Spawn Point', emoji: '🎯', type: 'custom' },
  { id: 'home', name: 'Home Base', emoji: '🏠', type: 'custom' },
  { id: 'secret_base', name: 'Secret Base', emoji: '🤫', type: 'custom' },
];

/**
 * Get item by ID
 */
export function getMinecraftItem(id: string): MinecraftItem | undefined {
  return minecraftItems.find(item => item.id === id);
}

/**
 * Get mob by ID
 */
export function getMinecraftMob(id: string): MinecraftMob | undefined {
  return minecraftMobs.find(mob => mob.id === id);
}

/**
 * Get biome by ID
 */
export function getMinecraftBiome(id: string): MinecraftBiome | undefined {
  return minecraftBiomes.find(biome => biome.id === id);
}

/**
 * Get location by ID
 */
export function getMinecraftLocation(id: string): MinecraftLocation | undefined {
  return minecraftLocations.find(loc => loc.id === id);
}

/**
 * Search items by name
 */
export function searchMinecraftItems(query: string): MinecraftItem[] {
  const lowerQuery = query.toLowerCase();
  return minecraftItems.filter(item =>
    item.name.toLowerCase().includes(lowerQuery) ||
    item.id.includes(lowerQuery)
  );
}

/**
 * Search mobs by name
 */
export function searchMinecraftMobs(query: string): MinecraftMob[] {
  const lowerQuery = query.toLowerCase();
  return minecraftMobs.filter(mob =>
    mob.name.toLowerCase().includes(lowerQuery) ||
    mob.id.includes(lowerQuery)
  );
}
