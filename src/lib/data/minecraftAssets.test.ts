/**
 * Tests for Minecraft Assets
 */

import { describe, it, expect } from 'vitest';
import {
  minecraftItems,
  minecraftMobs,
  minecraftBiomes,
  minecraftLocations,
  searchMinecraftItems,
  searchMinecraftMobs,
  searchMinecraftBiomes,
  searchMinecraftLocations,
  getMinecraftItemsByCategory,
  getMinecraftMobsByCategory,
} from './minecraftAssets';

describe('minecraftAssets', () => {
  describe('Data Structure', () => {
    it('should have minecraft items', () => {
      expect(minecraftItems.length).toBeGreaterThan(0);
    });

    it('should have minecraft mobs', () => {
      expect(minecraftMobs.length).toBeGreaterThan(0);
    });

    it('should have minecraft biomes', () => {
      expect(minecraftBiomes.length).toBeGreaterThan(0);
    });

    it('should have minecraft locations', () => {
      expect(minecraftLocations.length).toBeGreaterThan(0);
    });

    it('should have valid item structure', () => {
      const item = minecraftItems[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('icon');
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('description');
    });

    it('should have valid mob structure', () => {
      const mob = minecraftMobs[0];
      expect(mob).toHaveProperty('id');
      expect(mob).toHaveProperty('name');
      expect(mob).toHaveProperty('icon');
      expect(mob).toHaveProperty('category');
      expect(mob).toHaveProperty('description');
    });

    it('should have valid biome structure', () => {
      const biome = minecraftBiomes[0];
      expect(biome).toHaveProperty('id');
      expect(biome).toHaveProperty('name');
      expect(biome).toHaveProperty('icon');
      expect(biome).toHaveProperty('description');
    });

    it('should have valid location structure', () => {
      const location = minecraftLocations[0];
      expect(location).toHaveProperty('id');
      expect(location).toHaveProperty('name');
      expect(location).toHaveProperty('icon');
      expect(location).toHaveProperty('description');
    });
  });

  describe('searchMinecraftItems', () => {
    it('should find items by name', () => {
      const results = searchMinecraftItems('diamond');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('diamond');
    });

    it('should be case insensitive', () => {
      const results1 = searchMinecraftItems('DIAMOND');
      const results2 = searchMinecraftItems('diamond');
      expect(results1.length).toBe(results2.length);
    });

    it('should search in descriptions', () => {
      const results = searchMinecraftItems('mine');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return all items for empty query', () => {
      const results = searchMinecraftItems('');
      expect(results.length).toBe(minecraftItems.length);
    });

    it('should return empty array for non-existent item', () => {
      const results = searchMinecraftItems('xyznonexistent123');
      expect(results).toEqual([]);
    });
  });

  describe('searchMinecraftMobs', () => {
    it('should find mobs by name', () => {
      const results = searchMinecraftMobs('zombie');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name.toLowerCase()).toContain('zombie');
    });

    it('should be case insensitive', () => {
      const results1 = searchMinecraftMobs('ZOMBIE');
      const results2 = searchMinecraftMobs('zombie');
      expect(results1.length).toBe(results2.length);
    });

    it('should return all mobs for empty query', () => {
      const results = searchMinecraftMobs('');
      expect(results.length).toBe(minecraftMobs.length);
    });
  });

  describe('searchMinecraftBiomes', () => {
    it('should find biomes by name', () => {
      const results = searchMinecraftBiomes('forest');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const results1 = searchMinecraftBiomes('FOREST');
      const results2 = searchMinecraftBiomes('forest');
      expect(results1.length).toBe(results2.length);
    });

    it('should return all biomes for empty query', () => {
      const results = searchMinecraftBiomes('');
      expect(results.length).toBe(minecraftBiomes.length);
    });
  });

  describe('searchMinecraftLocations', () => {
    it('should find locations by name', () => {
      const results = searchMinecraftLocations('village');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const results1 = searchMinecraftLocations('VILLAGE');
      const results2 = searchMinecraftLocations('village');
      expect(results1.length).toBe(results2.length);
    });

    it('should return all locations for empty query', () => {
      const results = searchMinecraftLocations('');
      expect(results.length).toBe(minecraftLocations.length);
    });
  });

  describe('getMinecraftItemsByCategory', () => {
    it('should filter items by category', () => {
      const categories = [...new Set(minecraftItems.map(item => item.category))];
      const category = categories[0];

      const results = getMinecraftItemsByCategory(category);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(item => item.category === category)).toBe(true);
    });

    it('should return empty array for non-existent category', () => {
      const results = getMinecraftItemsByCategory('NonExistentCategory');
      expect(results).toEqual([]);
    });
  });

  describe('getMinecraftMobsByCategory', () => {
    it('should filter mobs by category', () => {
      const categories = [...new Set(minecraftMobs.map(mob => mob.category))];
      const category = categories[0];

      const results = getMinecraftMobsByCategory(category);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(mob => mob.category === category)).toBe(true);
    });

    it('should return empty array for non-existent category', () => {
      const results = getMinecraftMobsByCategory('NonExistentCategory');
      expect(results).toEqual([]);
    });
  });

  describe('Data Quality', () => {
    it('should have unique item IDs', () => {
      const ids = minecraftItems.map(item => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique mob IDs', () => {
      const ids = minecraftMobs.map(mob => mob.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique biome IDs', () => {
      const ids = minecraftBiomes.map(biome => biome.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique location IDs', () => {
      const ids = minecraftLocations.map(location => location.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have icons for all items', () => {
      expect(minecraftItems.every(item => item.icon.length > 0)).toBe(true);
    });

    it('should have icons for all mobs', () => {
      expect(minecraftMobs.every(mob => mob.icon.length > 0)).toBe(true);
    });

    it('should have descriptions for all items', () => {
      expect(minecraftItems.every(item => item.description.length > 0)).toBe(true);
    });

    it('should have descriptions for all mobs', () => {
      expect(minecraftMobs.every(mob => mob.description.length > 0)).toBe(true);
    });
  });
});
