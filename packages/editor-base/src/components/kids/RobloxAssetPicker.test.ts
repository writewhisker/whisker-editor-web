/**
 * Tests for Roblox Asset Picker
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/svelte';
import RobloxAssetPicker from './RobloxAssetPicker.svelte';

describe('RobloxAssetPicker', () => {
  afterEach(() => {
    cleanup();
  });

  describe('Visibility', () => {
    it('should not render when show is false', () => {
      const { container } = render(RobloxAssetPicker, {
        props: { show: false }
      });

      expect(container.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('should render when show is true', () => {
      const { container } = render(RobloxAssetPicker, {
        props: { show: true }
      });

      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });
  });

  describe('Asset Types', () => {
    it('should show items when assetType is item', () => {
      render(RobloxAssetPicker, {
        props: { show: true, assetType: 'item' }
      });

      expect(screen.getByText(/Choose.*Item/i)).toBeTruthy();
    });

    it('should show badges when assetType is badge', () => {
      render(RobloxAssetPicker, {
        props: { show: true, assetType: 'badge' }
      });

      expect(screen.getByText(/Choose.*Badge/i)).toBeTruthy();
    });

    it('should show sounds when assetType is sound', () => {
      render(RobloxAssetPicker, {
        props: { show: true, assetType: 'sound' }
      });

      expect(screen.getByText(/Choose.*Sound/i)).toBeTruthy();
    });

    it('should show locations when assetType is location', () => {
      render(RobloxAssetPicker, {
        props: { show: true, assetType: 'location' }
      });

      expect(screen.getByText(/Choose.*Location/i)).toBeTruthy();
    });
  });

  describe('Search', () => {
    it('should have search input', () => {
      const { container } = render(RobloxAssetPicker, {
        props: { show: true }
      });

      const searchInput = container.querySelector('input[type="text"]');
      expect(searchInput).toBeTruthy();
    });
  });

  describe('Structure', () => {
    it('should have dialog role', () => {
      const { container } = render(RobloxAssetPicker, {
        props: { show: true }
      });

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
    });

    it('should show close button', () => {
      const { container } = render(RobloxAssetPicker, {
        props: { show: true }
      });

      const closeButton = container.querySelector('[aria-label="Close"]');
      expect(closeButton).toBeTruthy();
    });
  });
});
