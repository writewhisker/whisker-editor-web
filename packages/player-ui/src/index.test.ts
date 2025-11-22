import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WhiskerPlayerUI, type PlayerUIOptions } from './index';
import type { Story, Passage } from '@writewhisker/core-ts';

describe('@writewhisker/player-ui', () => {
  let container: HTMLDivElement;
  let mockStory: Story;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    mockStory = {
      id: 'test-story',
      name: 'Test Story',
      startPassage: 'start',
      passages: [
        {
          id: 'start',
          title: 'Start',
          content: 'Welcome to the story',
          choices: [
            { id: 'choice1', text: 'Option 1', target: 'passage2' },
          ],
        } as Passage,
        {
          id: 'passage2',
          title: 'Passage 2',
          content: 'You chose option 1',
          choices: [],
        } as Passage,
      ],
    } as Story;
  });

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('constructor', () => {
    it('should create player with container element', () => {
      const player = new WhiskerPlayerUI(container, mockStory);
      expect(player).toBeInstanceOf(WhiskerPlayerUI);
      player.destroy();
    });

    it('should create player with container selector', () => {
      const player = new WhiskerPlayerUI('#test-container', mockStory);
      expect(player).toBeInstanceOf(WhiskerPlayerUI);
      player.destroy();
    });

    it('should throw error for invalid container selector', () => {
      expect(() => {
        new WhiskerPlayerUI('#non-existent', mockStory);
      }).toThrow('Container not found');
    });

    it('should apply default options', () => {
      const player = new WhiskerPlayerUI(container, mockStory);
      expect(container.classList.contains('whisker-player')).toBe(true);
      expect(container.classList.contains('whisker-theme-dark')).toBe(true);
      player.destroy();
    });

    it('should apply custom theme option', () => {
      const player = new WhiskerPlayerUI(container, mockStory, { theme: 'light' });
      expect(container.classList.contains('whisker-theme-light')).toBe(true);
      player.destroy();
    });

    it('should hide toolbar when showToolbar is false', () => {
      const player = new WhiskerPlayerUI(container, mockStory, { showToolbar: false });
      const toolbar = container.querySelector('.whisker-toolbar');
      expect(toolbar).toBeNull();
      player.destroy();
    });

    it('should show toolbar when showToolbar is true', () => {
      const player = new WhiskerPlayerUI(container, mockStory, { showToolbar: true });
      const toolbar = container.querySelector('.whisker-toolbar');
      expect(toolbar).not.toBeNull();
      player.destroy();
    });
  });

  describe('UI rendering', () => {
    it('should render passage container', () => {
      const player = new WhiskerPlayerUI(container, mockStory);
      const passageEl = container.querySelector('.whisker-passage');
      expect(passageEl).not.toBeNull();
      player.destroy();
    });

    it('should render choices container', () => {
      const player = new WhiskerPlayerUI(container, mockStory);
      const choicesEl = container.querySelector('.whisker-choices');
      expect(choicesEl).not.toBeNull();
      player.destroy();
    });

    it('should load base styles', () => {
      const player = new WhiskerPlayerUI(container, mockStory);
      const styleEl = document.getElementById('whisker-player-styles');
      expect(styleEl).not.toBeNull();
      player.destroy();
    });

    it('should not duplicate styles on multiple instances', () => {
      const player1 = new WhiskerPlayerUI(container, mockStory);
      const container2 = document.createElement('div');
      document.body.appendChild(container2);
      const player2 = new WhiskerPlayerUI(container2, mockStory);

      const styleElements = document.querySelectorAll('#whisker-player-styles');
      expect(styleElements.length).toBe(1);

      player1.destroy();
      player2.destroy();
      container2.parentNode?.removeChild(container2);
    });
  });

  describe('theme management', () => {
    it('should set initial theme', () => {
      const player = new WhiskerPlayerUI(container, mockStory, { theme: 'dark' });
      expect(container.classList.contains('whisker-theme-dark')).toBe(true);
      player.destroy();
    });

    it('should change theme dynamically', () => {
      const player = new WhiskerPlayerUI(container, mockStory, { theme: 'dark' });
      player.setTheme('light');
      expect(container.classList.contains('whisker-theme-light')).toBe(true);
      expect(container.classList.contains('whisker-theme-dark')).toBe(false);
      player.destroy();
    });
  });

  describe('player actions', () => {
    it('should restart story', () => {
      const player = new WhiskerPlayerUI(container, mockStory);
      player.restart();
      // Verify restart occurred
      expect(container.querySelector('.whisker-passage')).not.toBeNull();
      player.destroy();
    });

    it('should undo action', () => {
      const player = new WhiskerPlayerUI(container, mockStory);
      const result = player.undo();
      expect(typeof result).toBe('boolean');
      player.destroy();
    });
  });

  describe('save/load functionality', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should save game state', () => {
      const player = new WhiskerPlayerUI(container, mockStory, {
        autoSave: true,
        saveKey: 'test-save',
      });

      player.save();

      const saved = localStorage.getItem('test-save');
      expect(saved).not.toBeNull();

      player.destroy();
    });

    it('should load game state', () => {
      const player = new WhiskerPlayerUI(container, mockStory, {
        autoSave: true,
        saveKey: 'test-save',
      });

      player.save();
      const loaded = player.load();

      expect(loaded).toBe(true);

      player.destroy();
    });

    it('should return false when no save exists', () => {
      const player = new WhiskerPlayerUI(container, mockStory, {
        autoSave: true,
        saveKey: 'non-existent-save',
      });

      const loaded = player.load();
      expect(loaded).toBe(false);

      player.destroy();
    });
  });

  describe('event callbacks', () => {
    it('should call onPassageChange callback', (done) => {
      const onPassageChange = vi.fn((passage) => {
        expect(passage).toBeDefined();
        done();
      });

      const player = new WhiskerPlayerUI(container, mockStory, {
        onPassageChange,
      });

      // Wait for initial passage to load
      setTimeout(() => {
        expect(onPassageChange).toHaveBeenCalled();
        player.destroy();
      }, 100);
    });
  });

  describe('destroy', () => {
    it('should clean up DOM', () => {
      const player = new WhiskerPlayerUI(container, mockStory);
      player.destroy();

      expect(container.innerHTML).toBe('');
      expect(container.classList.contains('whisker-player')).toBe(false);
    });

    it('should remove theme classes', () => {
      const player = new WhiskerPlayerUI(container, mockStory, { theme: 'dark' });
      player.destroy();

      expect(container.classList.contains('whisker-theme-dark')).toBe(false);
    });
  });

  describe('static factory method', () => {
    it('should create player using factory method', () => {
      const player = WhiskerPlayerUI.create(container, mockStory);
      expect(player).toBeInstanceOf(WhiskerPlayerUI);
      player.destroy();
    });

    it('should accept options in factory method', () => {
      const player = WhiskerPlayerUI.create(container, mockStory, { theme: 'light' });
      expect(container.classList.contains('whisker-theme-light')).toBe(true);
      player.destroy();
    });
  });

  describe('module exports', () => {
    it('should export WhiskerPlayerUI class', () => {
      expect(WhiskerPlayerUI).toBeDefined();
      expect(typeof WhiskerPlayerUI).toBe('function');
    });
  });
});
