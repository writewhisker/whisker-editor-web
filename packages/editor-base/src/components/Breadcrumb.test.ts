import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { get } from 'svelte/store';
import Breadcrumb from './Breadcrumb.svelte';
import { currentStory, selectedPassageId } from '../stores';
import { Story } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';

describe('Breadcrumb', () => {
  let story: Story;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a test story
    story = new Story();
    story.metadata.title = 'Test Story';

    // Create passages: Start -> Middle -> End
    const startPassage = story.addPassage(new Passage({ title: 'Start' }));
    const middlePassage = story.addPassage(new Passage({ title: 'Middle' }));
    const endPassage = story.addPassage(new Passage({ title: 'End' }));

    story.startPassage = startPassage.id;

    // Add choices to connect passages
    startPassage.addChoice({ text: 'Go to middle', target: middlePassage.id, id: 'choice1' } as any);
    middlePassage.addChoice({ text: 'Go to end', target: endPassage.id, id: 'choice2' } as any);

    currentStory.set(story);
    selectedPassageId.set(null);
  });

  describe('rendering without story', () => {
    it('should not render when no story exists', () => {
      currentStory.set(null);
      selectedPassageId.set(null);

      const { container } = render(Breadcrumb);
      expect(container.querySelector('.bg-gray-50')).toBeNull();
    });
  });

  describe('rendering without selection', () => {
    it('should not render when no passage is selected', () => {
      selectedPassageId.set(null);

      const { container } = render(Breadcrumb);
      expect(container.querySelector('.bg-gray-50')).toBeNull();
    });
  });

  describe('rendering with start passage selected', () => {
    it('should render single breadcrumb for start passage', () => {
      const startId = story.startPassage!;
      selectedPassageId.set(startId);

      const { container } = render(Breadcrumb);
      const breadcrumb = container.querySelector('.bg-gray-50');
      expect(breadcrumb).toBeTruthy();

      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(1);
    });

    it('should display home icon for start passage', () => {
      const startId = story.startPassage!;
      selectedPassageId.set(startId);

      const { container } = render(Breadcrumb);
      const text = container.textContent || '';
      expect(text).toContain('🏠');
    });

    it('should display start passage title', () => {
      const startId = story.startPassage!;
      selectedPassageId.set(startId);

      const { getByText } = render(Breadcrumb);
      expect(getByText('Start')).toBeTruthy();
    });

    it('should not show passage count for single passage', () => {
      const startId = story.startPassage!;
      selectedPassageId.set(startId);

      const { container } = render(Breadcrumb);
      const text = container.textContent || '';
      expect(text).not.toContain('passages');
    });
  });

  describe('rendering with path', () => {
    it('should display path from start to selected passage', () => {
      const passages = Array.from(story.passages.values());
      const middlePassage = passages.find(p => p.title === 'Middle');
      selectedPassageId.set(middlePassage!.id);

      const { container } = render(Breadcrumb);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(2);

      const text = container.textContent || '';
      expect(text).toContain('Start');
      expect(text).toContain('Middle');
    });

    it('should display arrows between passages', () => {
      const passages = Array.from(story.passages.values());
      const middlePassage = passages.find(p => p.title === 'Middle');
      selectedPassageId.set(middlePassage!.id);

      const { container } = render(Breadcrumb);
      const arrows = container.querySelectorAll('span.text-gray-400');
      // At least one arrow should exist
      const hasArrow = Array.from(arrows).some(span => span.textContent === '→');
      expect(hasArrow).toBe(true);
    });

    it('should display passage count for multi-passage path', () => {
      const passages = Array.from(story.passages.values());
      const endPassage = passages.find(p => p.title === 'End');
      selectedPassageId.set(endPassage!.id);

      const { container } = render(Breadcrumb);
      const text = container.textContent || '';
      expect(text).toContain('3 passages');
    });

    it('should highlight selected passage', () => {
      const passages = Array.from(story.passages.values());
      const middlePassage = passages.find(p => p.title === 'Middle');
      selectedPassageId.set(middlePassage!.id);

      const { container } = render(Breadcrumb);
      const buttons = container.querySelectorAll('button');
      const middleButton = Array.from(buttons).find(btn => btn.textContent?.includes('Middle'));

      expect(middleButton?.className).toContain('bg-blue-100');
      expect(middleButton?.className).toContain('text-blue-700');
    });

    it('should not highlight non-selected passages', () => {
      const passages = Array.from(story.passages.values());
      const middlePassage = passages.find(p => p.title === 'Middle');
      selectedPassageId.set(middlePassage!.id);

      const { container } = render(Breadcrumb);
      const buttons = container.querySelectorAll('button');
      const startButton = Array.from(buttons).find(btn => btn.textContent?.includes('Start'));

      expect(startButton?.className).not.toContain('bg-blue-100');
    });
  });

  describe('navigation', () => {
    it('should navigate to clicked passage', async () => {
      const passages = Array.from(story.passages.values());
      const endPassage = passages.find(p => p.title === 'End');
      const startPassage = story.passages.get(story.startPassage!);
      selectedPassageId.set(endPassage!.id);

      const { container } = render(Breadcrumb);
      const buttons = container.querySelectorAll('button');
      const startButton = Array.from(buttons).find(btn => btn.textContent?.includes('Start'));

      expect(startButton).toBeTruthy();
      await fireEvent.click(startButton!);

      // Check that selectedPassageId was updated
      const newSelected = get(selectedPassageId);
      expect(newSelected).toBe(startPassage!.id);
    });

    it('should have title attribute on buttons', () => {
      const passages = Array.from(story.passages.values());
      const middlePassage = passages.find(p => p.title === 'Middle');
      selectedPassageId.set(middlePassage!.id);

      const { container } = render(Breadcrumb);
      const buttons = container.querySelectorAll('button');

      buttons.forEach(btn => {
        expect(btn.getAttribute('title')).toBeTruthy();
      });
    });
  });

  describe('disconnected passages', () => {
    it('should show only selected passage when no path from start exists', () => {
      // Create a disconnected passage
      const disconnected = story.addPassage(new Passage({ title: 'Disconnected' }));
      selectedPassageId.set(disconnected.id);

      const { container } = render(Breadcrumb);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length).toBe(1);

      const text = container.textContent || '';
      expect(text).toContain('Disconnected');
      expect(text).not.toContain('Start');
    });
  });

  describe('path icon', () => {
    it('should display path icon', () => {
      const startId = story.startPassage!;
      selectedPassageId.set(startId);

      const { container } = render(Breadcrumb);
      const text = container.textContent || '';
      expect(text).toContain('📍');
      expect(text).toContain('Path:');
    });
  });

  describe('styling', () => {
    it('should have overflow-x-auto for long paths', () => {
      const startId = story.startPassage!;
      selectedPassageId.set(startId);

      const { container } = render(Breadcrumb);
      const breadcrumb = container.querySelector('.overflow-x-auto');
      expect(breadcrumb).toBeTruthy();
    });

    it('should have hover effect on buttons', () => {
      const startId = story.startPassage!;
      selectedPassageId.set(startId);

      const { container } = render(Breadcrumb);
      const button = container.querySelector('button');
      expect(button?.className).toContain('hover:bg-gray-200');
    });
  });
});
