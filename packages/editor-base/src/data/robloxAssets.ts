/**
 * Roblox-themed asset library
 * Provides Roblox-style assets for kids mode
 */

export interface RobloxAsset {
  id: string;
  name: string;
  category: 'character' | 'item' | 'environment' | 'accessory' | 'effect';
  icon: string;
  description: string;
}

export const robloxAssets: RobloxAsset[] = [
  {
    id: 'noob-avatar',
    name: 'Noob Avatar',
    category: 'character',
    icon: '👤',
    description: 'The classic Roblox noob character',
  },
  {
    id: 'sword',
    name: 'Classic Sword',
    category: 'item',
    icon: '⚔️',
    description: 'A basic sword',
  },
  {
    id: 'obby',
    name: 'Obstacle Course',
    category: 'environment',
    icon: '🏃',
    description: 'A parkour obstacle course',
  },
  {
    id: 'top-hat',
    name: 'Top Hat',
    category: 'accessory',
    icon: '🎩',
    description: 'A fancy top hat',
  },
  {
    id: 'sparkles',
    name: 'Sparkles',
    category: 'effect',
    icon: '✨',
    description: 'Sparkle particle effect',
  },
];

export function getRobloxAssetsByCategory(category: RobloxAsset['category']): RobloxAsset[] {
  return robloxAssets.filter((asset) => asset.category === category);
}

export function getRobloxAssetById(id: string): RobloxAsset | undefined {
  return robloxAssets.find((asset) => asset.id === id);
}
