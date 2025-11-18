/**
 * @writewhisker/player-ui
 * Drop-in UI components for embedding Whisker stories
 */

import { StoryPlayer } from '@writewhisker/core-ts';
import type { Story, Passage, Choice } from '@writewhisker/core-ts';

export interface PlayerUIOptions {
  theme?: 'dark' | 'light';
  showToolbar?: boolean;
  autoSave?: boolean;
  saveKey?: string;
  onPassageChange?: (passage: Passage) => void;
  onChoiceSelected?: (choice: Choice) => void;
  onComplete?: () => void;
}

export class WhiskerPlayerUI {
  private player: StoryPlayer;
  private container: HTMLElement;
  private options: PlayerUIOptions;
  private passageEl: HTMLElement | null = null;
  private choicesEl: HTMLElement | null = null;
  private toolbarEl: HTMLElement | null = null;

  constructor(container: string | HTMLElement, story: Story, options: PlayerUIOptions = {}) {
    // Get container
    this.container = typeof container === 'string'
      ? document.querySelector(container)!
      : container;

    if (!this.container) {
      throw new Error('Container not found');
    }

    // Set default options
    this.options = {
      theme: 'dark',
      showToolbar: true,
      autoSave: false,
      saveKey: 'whisker-save',
      ...options
    };

    // Create player
    this.player = new StoryPlayer();
    this.player.loadStory(story);

    // Build UI
    this.buildUI();

    // Set up event listeners
    this.setupEventListeners();

    // Load saved state if auto-save enabled
    if (this.options.autoSave) {
      this.load();
    }

    // Start story
    this.player.start();
  }

  private buildUI(): void {
    // Add theme class
    this.container.classList.add('whisker-player');
    this.container.classList.add(`whisker-theme-${this.options.theme}`);

    // Create structure
    this.container.innerHTML = `
      <div class="whisker-player-content">
        <div class="whisker-passage"></div>
        <div class="whisker-choices"></div>
      </div>
      ${this.options.showToolbar ? '<div class="whisker-toolbar"></div>' : ''}
    `;

    // Get elements
    this.passageEl = this.container.querySelector('.whisker-passage');
    this.choicesEl = this.container.querySelector('.whisker-choices');
    this.toolbarEl = this.container.querySelector('.whisker-toolbar');

    // Add toolbar buttons if enabled
    if (this.toolbarEl) {
      this.toolbarEl.innerHTML = `
        <button class="whisker-toolbar-button" data-action="undo">Undo</button>
        <button class="whisker-toolbar-button" data-action="restart">Restart</button>
        ${this.options.autoSave ? '<button class="whisker-toolbar-button" data-action="save">Save</button>' : ''}
        ${this.options.autoSave ? '<button class="whisker-toolbar-button" data-action="load">Load</button>' : ''}
      `;

      // Add toolbar event listeners
      this.toolbarEl.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('whisker-toolbar-button')) {
          const action = target.dataset.action;
          switch (action) {
            case 'undo':
              this.undo();
              break;
            case 'restart':
              this.restart();
              break;
            case 'save':
              this.save();
              break;
            case 'load':
              this.load();
              break;
          }
        }
      });
    }

    // Load base styles
    this.loadStyles();
  }

  private loadStyles(): void {
    // Check if styles already loaded
    if (document.getElementById('whisker-player-styles')) {
      return;
    }

    // Create style element
    const style = document.createElement('style');
    style.id = 'whisker-player-styles';
    style.textContent = this.getStyles();
    document.head.appendChild(style);
  }

  private getStyles(): string {
    return `
      /* Base styles */
      .whisker-player {
        font-family: Georgia, serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 40px 20px;
      }

      .whisker-player-content {
        margin-bottom: 30px;
      }

      .whisker-passage {
        margin-bottom: 30px;
        line-height: 1.8;
        font-size: 18px;
      }

      .whisker-passage h1,
      .whisker-passage h2,
      .whisker-passage h3 {
        margin-top: 1.5em;
        margin-bottom: 0.5em;
      }

      .whisker-choices {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .whisker-choice {
        padding: 15px 20px;
        font-size: 16px;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s;
        text-align: left;
        border: none;
        font-family: inherit;
      }

      .whisker-choice:hover {
        transform: translateX(5px);
      }

      .whisker-end-message {
        text-align: center;
        font-style: italic;
        margin-top: 20px;
      }

      .whisker-toolbar {
        margin-top: 30px;
        padding-top: 20px;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .whisker-toolbar-button {
        padding: 10px 20px;
        cursor: pointer;
        border-radius: 4px;
        font-size: 14px;
        transition: all 0.2s;
        border: none;
        font-family: inherit;
      }

      .whisker-toolbar-button:hover {
        transform: scale(1.05);
      }

      /* Dark theme */
      .whisker-player.whisker-theme-dark {
        background: #1a1a1a;
        color: #e0e0e0;
      }

      .whisker-theme-dark .whisker-choice {
        background: #2d2d2d;
        border: 2px solid #3d3d3d;
        color: #e0e0e0;
      }

      .whisker-theme-dark .whisker-choice:hover {
        background: #4a9eff;
        border-color: #4a9eff;
      }

      .whisker-theme-dark .whisker-end-message {
        color: #a0a0a0;
      }

      .whisker-theme-dark .whisker-toolbar {
        border-top: 1px solid #3d3d3d;
      }

      .whisker-theme-dark .whisker-toolbar-button {
        background: #2d2d2d;
        border: 1px solid #3d3d3d;
        color: #e0e0e0;
      }

      .whisker-theme-dark .whisker-toolbar-button:hover {
        background: #4a9eff;
      }

      /* Light theme */
      .whisker-player.whisker-theme-light {
        background: #ffffff;
        color: #2c2c2c;
      }

      .whisker-theme-light .whisker-choice {
        background: #f5f5f5;
        border: 2px solid #e0e0e0;
        color: #2c2c2c;
      }

      .whisker-theme-light .whisker-choice:hover {
        background: #0066cc;
        border-color: #0066cc;
        color: #ffffff;
      }

      .whisker-theme-light .whisker-end-message {
        color: #666666;
      }

      .whisker-theme-light .whisker-toolbar {
        border-top: 1px solid #e0e0e0;
      }

      .whisker-theme-light .whisker-toolbar-button {
        background: #f5f5f5;
        border: 1px solid #e0e0e0;
        color: #2c2c2c;
      }

      .whisker-theme-light .whisker-toolbar-button:hover {
        background: #0066cc;
        color: #ffffff;
      }
    `;
  }

  private setupEventListeners(): void {
    this.player.on('passageEntered', (data: any) => {
      this.renderPassage(data.passage);

      if (this.options.onPassageChange) {
        this.options.onPassageChange(data.passage);
      }

      // Auto-save if enabled
      if (this.options.autoSave) {
        this.save();
      }
    });

    this.player.on('choiceSelected', (data: any) => {
      if (this.options.onChoiceSelected) {
        this.options.onChoiceSelected(data.choice);
      }
    });
  }

  private renderPassage(passage: Passage): void {
    if (!this.passageEl || !this.choicesEl) return;

    // Render passage content
    this.passageEl.innerHTML = `
      <h2>${passage.title}</h2>
      <div>${passage.content}</div>
    `;

    // Render choices
    const availableChoices = this.player.getAvailableChoices();

    if (availableChoices.length === 0) {
      this.choicesEl.innerHTML = '<p class="whisker-end-message">The End</p>';

      if (this.options.onComplete) {
        this.options.onComplete();
      }
    } else {
      this.choicesEl.innerHTML = '';

      availableChoices.forEach(choice => {
        const button = document.createElement('button');
        button.className = 'whisker-choice';
        button.textContent = choice.text;
        button.onclick = () => this.player.makeChoice(choice.id);
        this.choicesEl!.appendChild(button);
      });
    }

    // Update toolbar state (disable undo if can't undo)
    if (this.toolbarEl) {
      const undoBtn = this.toolbarEl.querySelector('[data-action="undo"]') as HTMLButtonElement;
      if (undoBtn) {
        undoBtn.disabled = this.player.getHistory().length < 2;
      }
    }
  }

  // Public API
  public undo(): boolean {
    return this.player.undo();
  }

  public restart(): void {
    this.player.restart();
  }

  public save(): void {
    const state = this.player.getState();
    localStorage.setItem(this.options.saveKey!, JSON.stringify(state));
    console.log('Game saved!');
  }

  public load(): boolean {
    const saved = localStorage.getItem(this.options.saveKey!);
    if (saved) {
      const state = JSON.parse(saved);
      this.player.restoreState(state);
      console.log('Game loaded!');
      return true;
    }
    console.log('No save found');
    return false;
  }

  public destroy(): void {
    this.player.off('passageEntered', () => {});
    this.player.off('choiceSelected', () => {});
    this.container.innerHTML = '';
    this.container.classList.remove('whisker-player');
    this.container.classList.remove(`whisker-theme-${this.options.theme}`);
  }

  public setTheme(theme: 'dark' | 'light'): void {
    this.container.classList.remove(`whisker-theme-${this.options.theme}`);
    this.options.theme = theme;
    this.container.classList.add(`whisker-theme-${theme}`);
  }

  // Static factory method
  public static create(container: string | HTMLElement, story: Story, options?: PlayerUIOptions): WhiskerPlayerUI {
    return new WhiskerPlayerUI(container, story, options);
  }
}

// Export types
export type { Story, Passage, Choice } from '@writewhisker/core-ts';
