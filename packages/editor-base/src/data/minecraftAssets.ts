/**
 * Minecraft-themed asset library
 * Provides Minecraft-style assets for kids mode
 */

export interface MinecraftAsset {
  id: string;
  name: string;
  category: 'block' | 'item' | 'mob' | 'biome' | 'structure';
  icon: string;
  description: string;
}

export type MinecraftItem = MinecraftAsset & { category: 'item' };
export type MinecraftMob = MinecraftAsset & { category: 'mob' };
export type MinecraftBiome = MinecraftAsset & { category: 'biome' };
export type MinecraftLocation = MinecraftAsset & { category: 'biome' | 'structure' };

export const minecraftAssets: MinecraftAsset[] = [
  {
    id: 'grass-block',
    name: 'Grass Block',
    category: 'block',
    icon: '🟩',
    description: 'A basic grass block',
  },
  {
    id: 'stone',
    name: 'Stone',
    category: 'block',
    icon: '🪨',
    description: 'A stone block',
  },
  {
    id: 'creeper',
    name: 'Creeper',
    category: 'mob',
    icon: '💚',
    description: 'A green explosive mob',
  },
  {
    id: 'diamond-sword',
    name: 'Diamond Sword',
    category: 'item',
    icon: '⚔️',
    description: 'A powerful sword',
  },
  {
    id: 'forest',
    name: 'Forest',
    category: 'biome',
    icon: '🌲',
    description: 'A lush forest biome',
  },
];

export function getMinecraftAssetsByCategory(category: MinecraftAsset['category']): MinecraftAsset[] {
  return minecraftAssets.filter((asset) => asset.category === category);
}

export function getMinecraftAssetById(id: string): MinecraftAsset | undefined {
  return minecraftAssets.find((asset) => asset.id === id);
}

export const minecraftItems = minecraftAssets.filter(a => a.category === 'item') as MinecraftItem[];
export const minecraftMobs = minecraftAssets.filter(a => a.category === 'mob') as MinecraftMob[];
export const minecraftBiomes = minecraftAssets.filter(a => a.category === 'biome') as MinecraftBiome[];
export const minecraftLocations = minecraftAssets.filter(a => a.category === 'biome' || a.category === 'structure') as MinecraftLocation[];

export function searchMinecraftItems(query: string): MinecraftItem[] {
  return minecraftItems.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
}

export function searchMinecraftMobs(query: string): MinecraftMob[] {
  return minecraftMobs.filter(mob => mob.name.toLowerCase().includes(query.toLowerCase()));
}
