/**
 * Tests for Minecraft Asset Picker
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import MinecraftAssetPicker from './MinecraftAssetPicker.svelte';

describe('MinecraftAssetPicker', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Visibility', () => {
    it('should not render when show is false', () => {
      const { container } = render(MinecraftAssetPicker, {
        props: { show: false }
      });

      expect(container.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('should render when show is true', () => {
      const { container } = render(MinecraftAssetPicker, {
        props: { show: true }
      });

      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });
  });

  describe('Asset Types', () => {
    it('should show items when assetType is item', () => {
      render(MinecraftAssetPicker, {
        props: { show: true, assetType: 'item' }
      });

      expect(screen.getByText(/Choose.*Item/i)).toBeTruthy();
    });

    it('should show mobs when assetType is mob', () => {
      render(MinecraftAssetPicker, {
        props: { show: true, assetType: 'mob' }
      });

      expect(screen.getByText(/Choose.*Mob/i)).toBeTruthy();
    });

    it('should show biomes when assetType is biome', () => {
      render(MinecraftAssetPicker, {
        props: { show: true, assetType: 'biome' }
      });

      expect(screen.getByText(/Choose.*Biome/i)).toBeTruthy();
    });

    it('should show locations when assetType is location', () => {
      render(MinecraftAssetPicker, {
        props: { show: true, assetType: 'location' }
      });

      expect(screen.getByText(/Choose.*Location/i)).toBeTruthy();
    });
  });

  describe('Search', () => {
    it('should have search input', () => {
      const { container } = render(MinecraftAssetPicker, {
        props: { show: true }
      });

      const searchInput = container.querySelector('input[type="text"]');
      expect(searchInput).toBeTruthy();
    });
  });

  describe('Structure', () => {
    it('should have dialog role', () => {
      const { container } = render(MinecraftAssetPicker, {
        props: { show: true }
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    });

    it('should show close button', () => {
      const { container } = render(MinecraftAssetPicker, {
        props: { show: true }
      });

      const closeButton = container.querySelector('[aria-label="Close"]');
      expect(closeButton).toBeTruthy();
    });
  });
});
