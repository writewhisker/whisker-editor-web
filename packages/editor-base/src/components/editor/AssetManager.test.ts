import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import AssetManager from './AssetManager.svelte';
import { currentStory } from '../../stores';
import { Story } from '@writewhisker/core-ts';

describe('AssetManager', () => {
  let story: Story;

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Tester',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    // Add test assets
    story.assets.set('img1', {
      id: 'img1',
      name: 'test-image.png',
      type: 'image',
      path: 'data:image/png;base64,test',
      mimeType: 'image/png',
      size: 1024,
    });

    story.assets.set('audio1', {
      id: 'audio1',
      name: 'test-audio.mp3',
      type: 'audio',
      path: 'data:audio/mp3;base64,test',
      mimeType: 'audio/mpeg',
      size: 2048,
    });

    currentStory.set(story);
  });

  afterEach(() => {
    currentStory.set(null);
  });

  describe('rendering', () => {
    it('should render asset list', () => {
      const { getByText } = render(AssetManager);

      expect(getByText('test-image.png')).toBeTruthy();
      expect(getByText('test-audio.mp3')).toBeTruthy();
    });

    it('should show empty state when no assets', () => {
      story.assets.clear();
      currentStory.set(story);

      const { getByText } = render(AssetManager);
      expect(getByText('No assets found')).toBeTruthy();
    });

    it('should display asset count', () => {
      const { container } = render(AssetManager);

      const cards = container.querySelectorAll('.asset-card');
      expect(cards.length).toBe(2);
    });
  });

  describe('filtering', () => {
    it('should filter assets by type', async () => {
      const { container } = render(AssetManager);

      const filterSelect = container.querySelector('.filter-select') as HTMLSelectElement;
      await fireEvent.change(filterSelect, { target: { value: 'image' } });

      const cards = container.querySelectorAll('.asset-card');
      expect(cards.length).toBe(1);
    });

    it('should filter assets by search query', async () => {
      const { container } = render(AssetManager);

      const searchInput = container.querySelector('.search-input') as HTMLInputElement;
      await fireEvent.input(searchInput, { target: { value: 'image' } });

      const cards = container.querySelectorAll('.asset-card');
      expect(cards.length).toBe(1);
    });
  });

  describe('asset selection', () => {
    it('should select asset when clicked', async () => {
      const { container } = render(AssetManager);

      const card = container.querySelector('.asset-card') as HTMLElement;
      await fireEvent.click(card);

      expect(card.classList.contains('selected')).toBe(true);
    });

    it('should show asset details when selected', async () => {
      const { container, getByText } = render(AssetManager);

      const card = container.querySelector('.asset-card') as HTMLElement;
      await fireEvent.click(card);

      // The preview section is shown, not "Asset Details"
      expect(getByText('Preview')).toBeTruthy();
    });
  });

  describe('asset operations', () => {
    it('should format file size correctly', () => {
      const { container } = render(AssetManager);

      // Check if size is displayed correctly (1 KB for 1024 bytes)
      expect(container.textContent).toContain('1.0 KB');
    });
  });
});
