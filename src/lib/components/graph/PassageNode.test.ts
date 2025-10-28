import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import PassageNode from './PassageNode.svelte';
import { Passage } from '../../models/Passage';
import type { ValidationIssue } from '../../validation/types';

// Mock @xyflow/svelte
vi.mock('@xyflow/svelte', () => ({
  Handle: vi.fn(() => ({ $$: {}, $set: vi.fn(), $on: vi.fn() })),
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right',
  },
}));

// Mock player store
vi.mock('../../stores/playerStore', () => {
  const { writable } = require('svelte/store');
  return {
    breakpoints: writable(new Set()),
    currentPreviewPassage: writable(null),
    visitedPassages: writable(new Map()),
    debugMode: writable(false),
    playerActions: {
      toggleBreakpoint: vi.fn(),
    },
  };
});

// Mock tag store
vi.mock('../../stores/tagStore', () => ({
  tagActions: {
    getTagColor: vi.fn((tag: string) => '#3b82f6'), // Default blue color
  },
}));

describe('PassageNode', () => {
  let passage: Passage;
  let breakpoints: any;
  let currentPreviewPassage: any;
  let visitedPassages: any;
  let debugMode: any;
  let tagActions: any;
  let playerActions: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import mocked stores
    const playerStore = await import('../../stores/playerStore');
    breakpoints = playerStore.breakpoints;
    currentPreviewPassage = playerStore.currentPreviewPassage;
    visitedPassages = playerStore.visitedPassages;
    debugMode = playerStore.debugMode;
    playerActions = playerStore.playerActions;

    const tagStore = await import('../../stores/tagStore');
    tagActions = tagStore.tagActions;

    // Reset stores
    breakpoints.set(new Set());
    currentPreviewPassage.set(null);
    visitedPassages.set(new Map());
    debugMode.set(false);

    // Create basic passage
    passage = new Passage({
      title: 'Test Passage',
      content: 'This is test content.',
      position: { x: 0, y: 0 },
    });
  });

  describe('basic rendering', () => {
    it('should render passage title', () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('Test Passage');
    });

    it('should render passage content', () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('This is test content.');
    });

    it('should display initial choice count of 0', () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('0');
    });
  });

  describe('start passage', () => {
    it('should show start indicator when isStart is true', () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: true,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('⭐');
    });

    it('should not show start indicator when isStart is false', () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).not.toContain('⭐');
    });

    it('should have green styling for start passage', () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: true,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const node = container.querySelector('.passage-node');
      expect(node?.className).toContain('border-green-500');
    });
  });

  describe('orphan passage', () => {
    it('should show orphan indicator when isOrphan is true', () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: true,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('⚠️');
    });

    it('should have orange styling for orphan passage', () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: true,
            isDead: false,
          },
        },
      });

      const node = container.querySelector('.passage-node');
      expect(node?.className).toContain('border-orange-300');
    });
  });

  describe('dead end passage', () => {
    it('should show dead end indicator when isDead is true', () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: true,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('🔚');
    });

    it('should have red styling for dead end passage', () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: true,
          },
        },
      });

      const node = container.querySelector('.passage-node');
      expect(node?.className).toContain('border-red-300');
    });
  });

  describe('validation issues', () => {
    it('should show error badge with count', () => {
      const issues: ValidationIssue[] = [
        {
          id: 'error-1',
          severity: 'error',
          category: 'structure',
          message: 'Test error',
          passageId: passage.id,
          fixable: false,
        },
      ];

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
            validationIssues: issues,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('1❌');
    });

    it('should show warning badge with count', () => {
      const issues: ValidationIssue[] = [
        {
          id: 'warning-1',
          severity: 'warning',
          category: 'content',
          message: 'Test warning',
          passageId: passage.id,
          fixable: false,
        },
        {
          id: 'warning-2',
          severity: 'warning',
          category: 'quality',
          message: 'Another warning',
          passageId: passage.id,
          fixable: false,
        },
      ];

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
            validationIssues: issues,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('2⚠️');
    });

    it('should show both errors and warnings', () => {
      const issues: ValidationIssue[] = [
        {
          id: 'error-1',
          severity: 'error',
          category: 'links',
          message: 'Test error',
          passageId: passage.id,
          fixable: false,
        },
        {
          id: 'warning-1',
          severity: 'warning',
          category: 'content',
          message: 'Test warning',
          passageId: passage.id,
          fixable: false,
        },
      ];

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
            validationIssues: issues,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('1❌');
      expect(text).toContain('1⚠️');
    });
  });

  describe('content truncation', () => {
    it('should show full content when under 80 characters', () => {
      passage.content = 'Short content';

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('Short content');
      expect(text).not.toContain('...');
    });

    it('should truncate content when over 80 characters', () => {
      passage.content = 'a'.repeat(100);

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('...');
    });

    it('should show "Empty passage" when content is empty', () => {
      passage.content = '';

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('Empty passage');
    });
  });

  describe('tags', () => {
    it('should display passage tags', () => {
      passage.tags = ['tag1', 'tag2'];

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('tag1');
      expect(text).toContain('tag2');
    });

    it('should limit display to first 3 tags', () => {
      passage.tags = ['tag1', 'tag2', 'tag3'];

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('tag1');
      expect(text).toContain('tag2');
      expect(text).toContain('tag3');
      expect(text).not.toContain('+');
    });

    it('should show +X indicator when more than 3 tags', () => {
      passage.tags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('tag1');
      expect(text).toContain('tag2');
      expect(text).toContain('tag3');
      expect(text).toContain('+2');
      expect(text).not.toContain('tag4');
    });

    it('should call getTagColor for each tag', () => {
      passage.tags = ['tag1', 'tag2'];

      render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      expect(tagActions.getTagColor).toHaveBeenCalledWith('tag1');
      expect(tagActions.getTagColor).toHaveBeenCalledWith('tag2');
    });
  });

  describe('custom color', () => {
    it('should apply custom color when provided', () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
            color: '#ff0000',
          },
        },
      });

      const node = container.querySelector('.passage-node');
      const style = node?.getAttribute('style') || '';
      // Check for RGB format or hex format
      expect(style).toMatch(/(rgb\(255, 0, 0\)|#ff0000)/);
    });

    it('should use custom color instead of status color', () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: true,
            isOrphan: false,
            isDead: false,
            color: '#ff0000',
          },
        },
      });

      const node = container.querySelector('.passage-node');
      // Should not have green border from isStart
      expect(node?.className).not.toContain('border-green-500');
      // Should have custom style with red color
      const style = node?.getAttribute('style') || '';
      expect(style).toMatch(/(rgb\(255, 0, 0\)|#ff0000)/);
    });
  });

  describe('preview state', () => {
    it('should show current preview indicator', () => {
      currentPreviewPassage.set(passage);

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('▶️');
    });

    it('should have purple styling for current preview', () => {
      currentPreviewPassage.set(passage);

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const node = container.querySelector('.passage-node');
      expect(node?.className).toContain('border-purple-500');
    });

    it('should show visited opacity when passage was visited', () => {
      const visitedMap = new Map();
      visitedMap.set(passage.id, 1);
      visitedPassages.set(visitedMap);

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const node = container.querySelector('.passage-node');
      expect(node?.className).toContain('opacity-70');
    });

    it('should not show visited opacity for current preview', () => {
      const visitedMap = new Map();
      visitedMap.set(passage.id, 1);
      visitedPassages.set(visitedMap);
      currentPreviewPassage.set(passage);

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const node = container.querySelector('.passage-node');
      expect(node?.className).toContain('opacity-100');
      expect(node?.className).not.toContain('opacity-70');
    });
  });

  describe('breakpoints', () => {
    it('should not show breakpoint button when debugMode is false', () => {
      debugMode.set(false);

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const breakpointButton = container.querySelector('button[title*="breakpoint"]');
      expect(breakpointButton).toBeNull();
    });

    it('should show breakpoint button when debugMode is true', () => {
      debugMode.set(true);

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const breakpointButton = container.querySelector('button');
      expect(breakpointButton).toBeTruthy();
    });

    it('should show inactive breakpoint indicator when no breakpoint set', () => {
      debugMode.set(true);

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('⚪');
    });

    it('should show active breakpoint indicator when breakpoint is set', () => {
      debugMode.set(true);
      const bp = new Set([passage.id]);
      breakpoints.set(bp);

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('🔴');
    });

    it('should toggle breakpoint on button click', async () => {
      debugMode.set(true);

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const breakpointButton = container.querySelector('button');
      expect(breakpointButton).toBeTruthy();

      if (breakpointButton) {
        await fireEvent.click(breakpointButton);
        expect(playerActions.toggleBreakpoint).toHaveBeenCalledWith(passage.id);
      }
    });
  });

  describe('node color priority', () => {
    it('should prioritize current preview over start', () => {
      currentPreviewPassage.set(passage);

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: true,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const node = container.querySelector('.passage-node');
      expect(node?.className).toContain('border-purple-500');
      expect(node?.className).not.toContain('border-green-500');
    });

    it('should prioritize custom color over all status colors', () => {
      currentPreviewPassage.set(passage);

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: true,
            isOrphan: false,
            isDead: false,
            color: '#ff0000',
          },
        },
      });

      const node = container.querySelector('.passage-node');
      expect(node?.className).not.toContain('border-purple-500');
      expect(node?.className).not.toContain('border-green-500');
      const style = node?.getAttribute('style') || '';
      expect(style).toMatch(/(rgb\(255, 0, 0\)|#ff0000)/);
    });
  });

  describe('resize functionality', () => {
    it('should render all 8 resize handles', () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      // Check for corner handles
      expect(container.querySelector('.resize-se')).toBeTruthy();
      expect(container.querySelector('.resize-sw')).toBeTruthy();
      expect(container.querySelector('.resize-ne')).toBeTruthy();
      expect(container.querySelector('.resize-nw')).toBeTruthy();

      // Check for edge handles
      expect(container.querySelector('.resize-e')).toBeTruthy();
      expect(container.querySelector('.resize-w')).toBeTruthy();
      expect(container.querySelector('.resize-s')).toBeTruthy();
      expect(container.querySelector('.resize-n')).toBeTruthy();
    });

    it('should use default size when passage.size is not set', () => {
      delete passage.size;

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const node = container.querySelector('.passage-node') as HTMLElement;
      const style = node?.getAttribute('style') || '';
      expect(style).toContain('width: 200px');
      expect(style).toContain('height: 150px');
    });

    it('should use custom size when passage.size is set', () => {
      passage.size = { width: 300, height: 250 };

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const node = container.querySelector('.passage-node') as HTMLElement;
      const style = node?.getAttribute('style') || '';
      expect(style).toContain('width: 300px');
      expect(style).toContain('height: 250px');
    });

    it('should start resize on mousedown of resize handle', async () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const resizeHandle = container.querySelector('.resize-se') as HTMLElement;
      expect(resizeHandle).toBeTruthy();

      // Simulate mousedown
      await fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });

      // Check that cursor style was set
      expect(document.body.style.cursor).toBeTruthy();
    });

    it('should constrain width to minimum 150px', async () => {
      passage.size = { width: 200, height: 150 };

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const resizeHandle = container.querySelector('.resize-e') as HTMLElement;

      // Start resize
      await fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });

      // Try to resize smaller than minimum
      await fireEvent.mouseMove(window, { clientX: 0, clientY: 100 });

      // Width should not go below 150px
      expect(passage.size.width).toBeGreaterThanOrEqual(150);
    });

    it('should constrain height to minimum 100px', async () => {
      passage.size = { width: 200, height: 150 };

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const resizeHandle = container.querySelector('.resize-s') as HTMLElement;

      // Start resize
      await fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });

      // Try to resize smaller than minimum
      await fireEvent.mouseMove(window, { clientX: 100, clientY: 0 });

      // Height should not go below 100px
      expect(passage.size.height).toBeGreaterThanOrEqual(100);
    });

    it('should increase width when dragging east handle right', async () => {
      passage.size = { width: 200, height: 150 };

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const resizeHandle = container.querySelector('.resize-e') as HTMLElement;
      const initialWidth = passage.size.width;

      // Start resize
      await fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });

      // Drag right by 50px
      await fireEvent.mouseMove(window, { clientX: 150, clientY: 100 });

      // Width should increase
      expect(passage.size.width).toBeGreaterThan(initialWidth);
    });

    it('should increase height when dragging south handle down', async () => {
      passage.size = { width: 200, height: 150 };

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const resizeHandle = container.querySelector('.resize-s') as HTMLElement;
      const initialHeight = passage.size.height;

      // Start resize
      await fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });

      // Drag down by 50px
      await fireEvent.mouseMove(window, { clientX: 100, clientY: 150 });

      // Height should increase
      expect(passage.size.height).toBeGreaterThan(initialHeight);
    });

    it('should handle southeast corner resize (both dimensions)', async () => {
      passage.size = { width: 200, height: 150 };

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const resizeHandle = container.querySelector('.resize-se') as HTMLElement;
      const initialWidth = passage.size.width;
      const initialHeight = passage.size.height;

      // Start resize
      await fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });

      // Drag diagonally (right and down)
      await fireEvent.mouseMove(window, { clientX: 150, clientY: 150 });

      // Both dimensions should increase
      expect(passage.size.width).toBeGreaterThan(initialWidth);
      expect(passage.size.height).toBeGreaterThan(initialHeight);
    });

    it('should reset cursor style on mouseup', async () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const resizeHandle = container.querySelector('.resize-se') as HTMLElement;

      // Start resize
      await fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });
      expect(document.body.style.cursor).toBeTruthy();

      // End resize
      await fireEvent.mouseUp(window);

      // Cursor should be reset
      expect(document.body.style.cursor).toBe('');
    });

    it('should stop propagation on resize handle mousedown', async () => {
      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const resizeHandle = container.querySelector('.resize-se') as HTMLElement;
      let propagated = false;

      container.addEventListener('mousedown', () => {
        propagated = true;
      });

      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100
      });

      resizeHandle.dispatchEvent(event);

      // Event should have been stopped
      expect(event.defaultPrevented).toBe(true);
    });

    it('should initialize passage.size if not present during resize', async () => {
      delete passage.size;

      const { container } = render(PassageNode, {
        props: {
          data: {
            passage,
            isStart: false,
            isOrphan: false,
            isDead: false,
          },
        },
      });

      const resizeHandle = container.querySelector('.resize-se') as HTMLElement;

      // Start resize
      await fireEvent.mouseDown(resizeHandle, { clientX: 100, clientY: 100 });

      // Move mouse
      await fireEvent.mouseMove(window, { clientX: 150, clientY: 150 });

      // passage.size should now be initialized
      expect(passage.size).toBeDefined();
      expect(passage.size?.width).toBeDefined();
      expect(passage.size?.height).toBeDefined();
    });
  });
});
