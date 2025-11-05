/**
 * Tests for Roblox Assets
 */

import { describe, it, expect } from 'vitest';
import {
  robloxItems,
  robloxBadges,
  robloxSounds,
  robloxLocations,
  searchRobloxItems,
  searchRobloxBadges,
  searchRobloxSounds,
  searchRobloxLocations,
  getRobloxItemsByCategory,
} from './robloxAssets';

describe('robloxAssets', () => {
  describe('Data Structure', () => {
    it('should have roblox items', () => {
      expect(robloxItems.length).toBeGreaterThan(0);
    });

    it('should have roblox badges', () => {
      expect(robloxBadges.length).toBeGreaterThan(0);
    });

    it('should have roblox sounds', () => {
      expect(robloxSounds.length).toBeGreaterThan(0);
    });

    it('should have roblox locations', () => {
      expect(robloxLocations.length).toBeGreaterThan(0);
    });

    it('should have valid item structure', () => {
      const item = robloxItems[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('icon');
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('description');
    });

    it('should have valid badge structure', () => {
      const badge = robloxBadges[0];
      expect(badge).toHaveProperty('id');
      expect(badge).toHaveProperty('name');
      expect(badge).toHaveProperty('icon');
      expect(badge).toHaveProperty('description');
    });

    it('should have valid sound structure', () => {
      const sound = robloxSounds[0];
      expect(sound).toHaveProperty('id');
      expect(sound).toHaveProperty('name');
      expect(sound).toHaveProperty('icon');
      expect(sound).toHaveProperty('description');
    });

    it('should have valid location structure', () => {
      const location = robloxLocations[0];
      expect(location).toHaveProperty('id');
      expect(location).toHaveProperty('name');
      expect(location).toHaveProperty('icon');
      expect(location).toHaveProperty('description');
    });
  });

  describe('searchRobloxItems', () => {
    it('should find items by name', () => {
      const results = searchRobloxItems('sword');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const results1 = searchRobloxItems('SWORD');
      const results2 = searchRobloxItems('sword');
      expect(results1.length).toBe(results2.length);
    });

    it('should search in descriptions', () => {
      const results = searchRobloxItems('power');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return all items for empty query', () => {
      const results = searchRobloxItems('');
      expect(results.length).toBe(robloxItems.length);
    });

    it('should return empty array for non-existent item', () => {
      const results = searchRobloxItems('xyznonexistent123');
      expect(results).toEqual([]);
    });
  });

  describe('searchRobloxBadges', () => {
    it('should find badges by name', () => {
      const results = searchRobloxBadges('winner');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const results1 = searchRobloxBadges('WINNER');
      const results2 = searchRobloxBadges('winner');
      expect(results1.length).toBe(results2.length);
    });

    it('should return all badges for empty query', () => {
      const results = searchRobloxBadges('');
      expect(results.length).toBe(robloxBadges.length);
    });
  });

  describe('searchRobloxSounds', () => {
    it('should find sounds by name', () => {
      const results = searchRobloxSounds('music');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const results1 = searchRobloxSounds('MUSIC');
      const results2 = searchRobloxSounds('music');
      expect(results1.length).toBe(results2.length);
    });

    it('should return all sounds for empty query', () => {
      const results = searchRobloxSounds('');
      expect(results.length).toBe(robloxSounds.length);
    });
  });

  describe('searchRobloxLocations', () => {
    it('should find locations by name', () => {
      const results = searchRobloxLocations('castle');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const results1 = searchRobloxLocations('CASTLE');
      const results2 = searchRobloxLocations('castle');
      expect(results1.length).toBe(results2.length);
    });

    it('should return all locations for empty query', () => {
      const results = searchRobloxLocations('');
      expect(results.length).toBe(robloxLocations.length);
    });
  });

  describe('getRobloxItemsByCategory', () => {
    it('should filter items by category', () => {
      const categories = [...new Set(robloxItems.map(item => item.category))];
      const category = categories[0];

      const results = getRobloxItemsByCategory(category);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(item => item.category === category)).toBe(true);
    });

    it('should return empty array for non-existent category', () => {
      const results = getRobloxItemsByCategory('NonExistentCategory');
      expect(results).toEqual([]);
    });
  });

  describe('Data Quality', () => {
    it('should have unique item IDs', () => {
      const ids = robloxItems.map(item => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique badge IDs', () => {
      const ids = robloxBadges.map(badge => badge.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique sound IDs', () => {
      const ids = robloxSounds.map(sound => sound.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique location IDs', () => {
      const ids = robloxLocations.map(location => location.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have icons for all items', () => {
      expect(robloxItems.every(item => item.icon.length > 0)).toBe(true);
    });

    it('should have icons for all badges', () => {
      expect(robloxBadges.every(badge => badge.icon.length > 0)).toBe(true);
    });

    it('should have descriptions for all items', () => {
      expect(robloxItems.every(item => item.description.length > 0)).toBe(true);
    });

    it('should have descriptions for all badges', () => {
      expect(robloxBadges.every(badge => badge.description.length > 0)).toBe(true);
    });
  });
});
