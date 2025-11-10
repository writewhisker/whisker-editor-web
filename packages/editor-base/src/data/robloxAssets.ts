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

export type RobloxItem = RobloxAsset & { category: 'item' };
export type RobloxBadge = RobloxAsset & { category: 'accessory' };
export type RobloxSound = RobloxAsset & { category: 'effect' };
export type RobloxLocation = RobloxAsset & { category: 'environment' };

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

export const robloxItems = robloxAssets.filter(a => a.category === 'item') as RobloxItem[];
export const robloxBadges = robloxAssets.filter(a => a.category === 'accessory') as RobloxBadge[];
export const robloxSounds = robloxAssets.filter(a => a.category === 'effect') as RobloxSound[];
export const robloxLocations = robloxAssets.filter(a => a.category === 'environment') as RobloxLocation[];

export function searchRobloxItems(query: string): RobloxItem[] {
  return robloxItems.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
}

export function searchRobloxBadges(query: string): RobloxBadge[] {
  return robloxBadges.filter(badge => badge.name.toLowerCase().includes(query.toLowerCase()));
}
