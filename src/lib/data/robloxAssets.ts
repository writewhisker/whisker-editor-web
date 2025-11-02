/**
 * Roblox Assets Data
 *
 * Comprehensive lists of Roblox items, badges, sounds, and game elements for kids to use.
 */

export interface RobloxItem {
  id: string;
  name: string;
  emoji: string;
  category: 'tool' | 'gear' | 'accessory' | 'gamepass' | 'other';
}

export interface RobloxBadge {
  id: string;
  name: string;
  emoji: string;
  type: 'achievement' | 'milestone' | 'special';
}

export interface RobloxSound {
  id: string;
  name: string;
  emoji: string;
  type: 'music' | 'effect' | 'ambient';
}

export interface RobloxLocation {
  id: string;
  name: string;
  emoji: string;
  type: 'game_type' | 'environment' | 'custom';
}

/**
 * Popular Roblox Items/Tools
 */
export const robloxItems: RobloxItem[] = [
  // Tools
  { id: 'sword', name: 'Sword', emoji: '⚔️', category: 'tool' },
  { id: 'bow', name: 'Bow', emoji: '🏹', category: 'tool' },
  { id: 'gun', name: 'Gun', emoji: '🔫', category: 'tool' },
  { id: 'pickaxe', name: 'Pickaxe', emoji: '⛏️', category: 'tool' },
  { id: 'shovel', name: 'Shovel', emoji: '🏗️', category: 'tool' },
  { id: 'hammer', name: 'Hammer', emoji: '🔨', category: 'tool' },

  // Gear
  { id: 'jetpack', name: 'Jetpack', emoji: '🚀', category: 'gear' },
  { id: 'grappling_hook', name: 'Grappling Hook', emoji: '🪝', category: 'gear' },
  { id: 'speed_coil', name: 'Speed Coil', emoji: '⚡', category: 'gear' },
  { id: 'gravity_coil', name: 'Gravity Coil', emoji: '🌀', category: 'gear' },
  { id: 'healing_potion', name: 'Healing Potion', emoji: '🧪', category: 'gear' },
  { id: 'shield', name: 'Shield', emoji: '🛡️', category: 'gear' },

  // Accessories
  { id: 'hat', name: 'Hat', emoji: '🎩', category: 'accessory' },
  { id: 'crown', name: 'Crown', emoji: '👑', category: 'accessory' },
  { id: 'wings', name: 'Wings', emoji: '🦋', category: 'accessory' },
  { id: 'cape', name: 'Cape', emoji: '🦸', category: 'accessory' },
  { id: 'mask', name: 'Mask', emoji: '🎭', category: 'accessory' },

  // Game Passes
  { id: 'vip', name: 'VIP Pass', emoji: '⭐', category: 'gamepass' },
  { id: 'double_coins', name: 'Double Coins', emoji: '💰', category: 'gamepass' },
  { id: 'premium', name: 'Premium Access', emoji: '💎', category: 'gamepass' },

  // Other
  { id: 'robux', name: 'Robux', emoji: '💵', category: 'other' },
  { id: 'trophy', name: 'Trophy', emoji: '🏆', category: 'other' },
  { id: 'key', name: 'Key', emoji: '🔑', category: 'other' },
  { id: 'coin', name: 'Coin', emoji: '🪙', category: 'other' },
  { id: 'gem', name: 'Gem', emoji: '💎', category: 'other' },
];

/**
 * Roblox Badges/Achievements
 */
export const robloxBadges: RobloxBadge[] = [
  // Achievements
  { id: 'first_win', name: 'First Win', emoji: '🥇', type: 'achievement' },
  { id: 'speed_demon', name: 'Speed Demon', emoji: '⚡', type: 'achievement' },
  { id: 'treasure_hunter', name: 'Treasure Hunter', emoji: '🗺️', type: 'achievement' },
  { id: 'master_builder', name: 'Master Builder', emoji: '🏗️', type: 'achievement' },
  { id: 'champion', name: 'Champion', emoji: '🏆', type: 'achievement' },
  { id: 'explorer', name: 'Explorer', emoji: '🧭', type: 'achievement' },

  // Milestones
  { id: 'level_10', name: 'Level 10', emoji: '🔟', type: 'milestone' },
  { id: 'level_50', name: 'Level 50', emoji: '5️⃣0️⃣', type: 'milestone' },
  { id: 'level_100', name: 'Level 100', emoji: '💯', type: 'milestone' },
  { id: 'played_10_hours', name: '10 Hours Played', emoji: '⏰', type: 'milestone' },
  { id: 'visited_100_times', name: '100 Visits', emoji: '📊', type: 'milestone' },

  // Special
  { id: 'beta_tester', name: 'Beta Tester', emoji: '🧪', type: 'special' },
  { id: 'founder', name: 'Founder', emoji: '⭐', type: 'special' },
  { id: 'secret', name: 'Secret Badge', emoji: '❓', type: 'special' },
  { id: 'event', name: 'Event Badge', emoji: '🎉', type: 'special' },
];

/**
 * Roblox Sounds
 */
export const robloxSounds: RobloxSound[] = [
  // Music
  { id: 'happy_music', name: 'Happy Music', emoji: '🎵', type: 'music' },
  { id: 'epic_music', name: 'Epic Music', emoji: '🎼', type: 'music' },
  { id: 'spooky_music', name: 'Spooky Music', emoji: '👻', type: 'music' },
  { id: 'victory_music', name: 'Victory Music', emoji: '🎺', type: 'music' },

  // Effects
  { id: 'coin_collect', name: 'Coin Collect', emoji: '🪙', type: 'effect' },
  { id: 'level_up', name: 'Level Up', emoji: '⬆️', type: 'effect' },
  { id: 'explosion', name: 'Explosion', emoji: '💥', type: 'effect' },
  { id: 'jump', name: 'Jump', emoji: '🦘', type: 'effect' },
  { id: 'door_open', name: 'Door Open', emoji: '🚪', type: 'effect' },
  { id: 'button_click', name: 'Button Click', emoji: '🖱️', type: 'effect' },
  { id: 'success', name: 'Success', emoji: '✅', type: 'effect' },
  { id: 'fail', name: 'Fail', emoji: '❌', type: 'effect' },

  // Ambient
  { id: 'wind', name: 'Wind', emoji: '💨', type: 'ambient' },
  { id: 'rain', name: 'Rain', emoji: '🌧️', type: 'ambient' },
  { id: 'crowd', name: 'Crowd Cheering', emoji: '👏', type: 'ambient' },
];

/**
 * Roblox Game Types & Locations
 */
export const robloxLocations: RobloxLocation[] = [
  // Game Types
  { id: 'obby', name: 'Obby/Parkour', emoji: '🏃', type: 'game_type' },
  { id: 'tycoon', name: 'Tycoon', emoji: '🏭', type: 'game_type' },
  { id: 'simulator', name: 'Simulator', emoji: '🎮', type: 'game_type' },
  { id: 'roleplay', name: 'Roleplay', emoji: '🎭', type: 'game_type' },
  { id: 'pvp', name: 'PvP Arena', emoji: '⚔️', type: 'game_type' },
  { id: 'racing', name: 'Racing', emoji: '🏎️', type: 'game_type' },
  { id: 'survival', name: 'Survival', emoji: '🏕️', type: 'game_type' },

  // Environments
  { id: 'spawn', name: 'Spawn Area', emoji: '🎯', type: 'environment' },
  { id: 'lobby', name: 'Lobby', emoji: '🏢', type: 'environment' },
  { id: 'shop', name: 'Shop', emoji: '🛒', type: 'environment' },
  { id: 'arena', name: 'Arena', emoji: '🏟️', type: 'environment' },
  { id: 'city', name: 'City', emoji: '🏙️', type: 'environment' },
  { id: 'forest', name: 'Forest', emoji: '🌲', type: 'environment' },
  { id: 'beach', name: 'Beach', emoji: '🏖️', type: 'environment' },
  { id: 'space', name: 'Space', emoji: '🚀', type: 'environment' },
  { id: 'castle', name: 'Castle', emoji: '🏰', type: 'environment' },
  { id: 'school', name: 'School', emoji: '🏫', type: 'environment' },
  { id: 'mall', name: 'Mall', emoji: '🛍️', type: 'environment' },

  // Custom
  { id: 'checkpoint', name: 'Checkpoint', emoji: '🚩', type: 'custom' },
  { id: 'teleporter', name: 'Teleporter', emoji: '🌀', type: 'custom' },
  { id: 'secret_room', name: 'Secret Room', emoji: '🤫', type: 'custom' },
];

/**
 * Get item by ID
 */
export function getRobloxItem(id: string): RobloxItem | undefined {
  return robloxItems.find(item => item.id === id);
}

/**
 * Get badge by ID
 */
export function getRobloxBadge(id: string): RobloxBadge | undefined {
  return robloxBadges.find(badge => badge.id === id);
}

/**
 * Get sound by ID
 */
export function getRobloxSound(id: string): RobloxSound | undefined {
  return robloxSounds.find(sound => sound.id === id);
}

/**
 * Get location by ID
 */
export function getRobloxLocation(id: string): RobloxLocation | undefined {
  return robloxLocations.find(loc => loc.id === id);
}

/**
 * Search items by name
 */
export function searchRobloxItems(query: string): RobloxItem[] {
  const lowerQuery = query.toLowerCase();
  return robloxItems.filter(item =>
    item.name.toLowerCase().includes(lowerQuery) ||
    item.id.includes(lowerQuery)
  );
}

/**
 * Search badges by name
 */
export function searchRobloxBadges(query: string): RobloxBadge[] {
  const lowerQuery = query.toLowerCase();
  return robloxBadges.filter(badge =>
    badge.name.toLowerCase().includes(lowerQuery) ||
    badge.id.includes(lowerQuery)
  );
}
