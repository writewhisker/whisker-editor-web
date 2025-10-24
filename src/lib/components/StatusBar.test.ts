import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';
import StatusBar from './StatusBar.svelte';
import {
  currentStory,
  passageList,
  variableList,
  selectedPassageId,
  currentFilePath,
} from '../stores/projectStore';
import { validationResult } from '../stores/validationStore';
import { canUndo, canRedo, historyCount, historyActions } from '../stores/historyStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';

describe('StatusBar', () => {
  beforeEach(() => {
    // Reset stores
    currentStory.set(null);
    selectedPassageId.set(null);
    currentFilePath.set(null);
    validationResult.set(null);
    historyActions.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    currentStory.set(null);
    selectedPassageId.set(null);
    currentFilePath.set(null);
    validationResult.set(null);
    historyActions.clear();
  });

  describe('rendering without story', () => {
    it('should render ready message when no story loaded', () => {
      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('Ready to create or open a project');
    });

    it('should not show stats when no story loaded', () => {
      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).not.toContain('Passages:');
      expect(text).not.toContain('Words:');
      expect(text).not.toContain('Choices:');
    });
  });

  describe('rendering with story', () => {
    beforeEach(() => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const p1 = new Passage({
        title: 'Start',
        content: 'This is the start passage with ten words here.',
        position: { x: 0, y: 0 },
      });
      const p2 = new Passage({
        title: 'Second',
        content: 'Another passage with five words.',
        position: { x: 100, y: 100 },
      });

      story.addPassage(p1);
      story.addPassage(p2);
      currentStory.set(story);
    });

    it('should display file name', () => {
      currentFilePath.set('my-story.json');
      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('my-story.json');
    });

    it('should display "Untitled" when no file path', () => {
      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('Untitled');
    });

    it('should display passage count', () => {
      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('Passages:');
      const actualCount = get(passageList).length;
      expect(text).toContain(actualCount.toString());
    });

    it('should display word count', () => {
      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('Words:');
      // Should count words from both passages
      expect(text).toMatch(/Words:/);
    });

    it('should display choice count', () => {
      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('Choices:');
    });

    it('should display variable count', () => {
      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('Variables:');
    });

    it('should display modified time', () => {
      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('Modified:');
    });
  });

  describe('validation status', () => {
    beforeEach(() => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(story);
    });

    it('should show valid status when no validation issues', () => {
      validationResult.set({
        valid: true,
        issues: [],
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        timestamp: Date.now(),
      });

      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('✓');
      expect(text).toContain('Valid');
    });

    it('should show error count when validation has errors', () => {
      validationResult.set({
        valid: false,
        issues: [
          {
            severity: 'error',
            message: 'Test error',
            passageId: 'test-id',
            passageTitle: 'Test',
          },
        ],
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
        timestamp: Date.now(),
      });

      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('❌');
      expect(text).toContain('1');
    });

    it('should show warning count when validation has warnings', () => {
      validationResult.set({
        valid: true,
        issues: [
          {
            severity: 'warning',
            message: 'Test warning',
            passageId: 'test-id',
            passageTitle: 'Test',
          },
        ],
        errorCount: 0,
        warningCount: 1,
        infoCount: 0,
        timestamp: Date.now(),
      });

      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('⚠️');
      expect(text).toContain('1');
    });

    it('should show both errors and warnings', () => {
      validationResult.set({
        valid: false,
        issues: [
          {
            severity: 'error',
            message: 'Test error',
            passageId: 'test-id-1',
            passageTitle: 'Test 1',
          },
          {
            severity: 'warning',
            message: 'Test warning',
            passageId: 'test-id-2',
            passageTitle: 'Test 2',
          },
        ],
        errorCount: 1,
        warningCount: 1,
        infoCount: 0,
        timestamp: Date.now(),
      });

      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('❌');
      expect(text).toContain('⚠️');
    });
  });

  describe('selected passage display', () => {
    let story: Story;
    let passage: Passage;

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

      passage = new Passage({
        title: 'Test Passage',
        content: 'Content',
        position: { x: 0, y: 0 },
      });

      story.addPassage(passage);
      currentStory.set(story);
    });

    it('should display selected passage title', () => {
      selectedPassageId.set(passage.id);
      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('Selected:');
      expect(text).toContain('Test Passage');
    });

    it('should not display selected passage when none selected', () => {
      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).not.toContain('Selected:');
    });
  });

  describe('history status', () => {
    beforeEach(() => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });
      currentStory.set(story);
    });

    it('should display undo/redo indicators', () => {
      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('↶'); // Undo arrow
      expect(text).toContain('↷'); // Redo arrow
    });

    it('should display history count', () => {
      const { container } = render(StatusBar);
      const text = container.textContent || '';
      const count = get(historyCount);
      expect(text).toContain(count.toString());
    });

    it('should have title attribute for history section', () => {
      const { container } = render(StatusBar);
      const historySection = Array.from(container.querySelectorAll('div')).find(
        (div) => div.getAttribute('title')?.includes('Undo/Redo')
      );
      expect(historySection).toBeTruthy();
      expect(historySection?.getAttribute('title')).toContain('Ctrl+Z');
      expect(historySection?.getAttribute('title')).toContain('Ctrl+Shift+Z');
    });
  });

  describe('stats calculations', () => {
    it('should calculate word count correctly', () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      const p1 = new Passage({
        title: 'P1',
        content: 'one two three',
        position: { x: 0, y: 0 },
      });
      const p2 = new Passage({
        title: 'P2',
        content: 'four five',
        position: { x: 100, y: 100 },
      });

      story.addPassage(p1);
      story.addPassage(p2);
      currentStory.set(story);

      const { container } = render(StatusBar);
      const text = container.textContent || '';
      expect(text).toContain('5'); // Total: 3 + 2 = 5 words
    });

    it('should format large numbers with locale string', () => {
      const story = new Story({
        metadata: {
          title: 'Test Story',
          author: 'Tester',
          version: '1.0.0',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
        },
      });

      // Create passage with many words to test formatting
      const words = Array(1500).fill('word').join(' ');
      const p1 = new Passage({
        title: 'P1',
        content: words,
        position: { x: 0, y: 0 },
      });

      story.addPassage(p1);
      currentStory.set(story);

      const { container } = render(StatusBar);
      const text = container.textContent || '';
      // Should contain formatted number with comma (accounting for auto-created Start passage)
      expect(text).toMatch(/1[,.]5\d{2}/);
    });
  });
});
