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
