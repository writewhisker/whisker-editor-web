/**
 * Web Components
 *
 * Custom element wrappers for Whisker Editor.
 */

import type { Story, Passage } from '@writewhisker/story-models';

/**
 * Base Web Component class
 */
export class WhiskerElement extends HTMLElement {
  protected shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  /**
   * Render component
   */
  protected render(): void {
    // Override in subclasses
  }

  /**
   * Connected callback
   */
  connectedCallback(): void {
    this.render();
  }

  /**
   * Create element
   */
  protected createElement(tag: string, props?: Record<string, any>, children?: (HTMLElement | string)[]): HTMLElement {
    const element = document.createElement(tag);

    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (key.startsWith('on') && typeof value === 'function') {
          const event = key.slice(2).toLowerCase();
          element.addEventListener(event, value);
        } else if (key === 'className') {
          element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
          Object.assign(element.style, value);
        } else {
          element.setAttribute(key, value);
        }
      }
    }

    if (children) {
      for (const child of children) {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else {
          element.appendChild(child);
        }
      }
    }

    return element;
  }
}

/**
 * Story Player Web Component
 */
export class StoryPlayer extends WhiskerElement {
  private story: Story | null = null;
  private currentPassage: string | null = null;

  static get observedAttributes(): string[] {
    return ['story-data'];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (name === 'story-data' && newValue) {
      try {
        this.story = JSON.parse(newValue);
        this.currentPassage = this.story?.startPassage || null;
        this.render();
      } catch (error) {
        console.error('Failed to parse story data:', error);
      }
    }
  }

  /**
   * Set story
   */
  public setStory(story: Story): void {
    this.story = story;
    this.currentPassage = story.startPassage || null;
    this.render();
  }

  /**
   * Navigate to passage
   */
  public navigateTo(passageTitle: string): void {
    this.currentPassage = passageTitle;
    this.render();
    this.dispatchEvent(new CustomEvent('navigate', { detail: { passage: passageTitle } }));
  }

  /**
   * Render component
   */
  protected render(): void {
    if (!this.story || !this.currentPassage) {
      this.shadow.innerHTML = '<div>No story loaded</div>';
      return;
    }

    const passage = this.story.findPassage(p => p.title === this.currentPassage);

    if (!passage) {
      this.shadow.innerHTML = `<div>Passage not found: ${this.currentPassage}</div>`;
      return;
    }

    this.shadow.innerHTML = '';

    // Add styles
    const style = this.createElement('style', {}, [
      `
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          line-height: 1.6;
        }

        .passage {
          padding: 2rem;
        }

        .passage-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #2c3e50;
        }

        .passage-content {
          white-space: pre-wrap;
          margin-bottom: 1rem;
        }

        .link {
          display: inline-block;
          margin: 0.5rem 0.5rem 0.5rem 0;
          padding: 0.5rem 1rem;
          background: #3498db;
          color: white;
          text-decoration: none;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .link:hover {
          background: #2980b9;
        }
      `
    ]);

    this.shadow.appendChild(style);

    // Create passage container
    const container = this.createElement('div', { className: 'passage' });

    // Add title
    const title = this.createElement('h2', { className: 'passage-title' }, [passage.title]);
    container.appendChild(title);

    // Add content with links
    const content = this.createElement('div', { className: 'passage-content' });
    content.innerHTML = this.processContent(passage.content);
    container.appendChild(content);

    this.shadow.appendChild(container);

    // Add click handlers to links
    const links = this.shadow.querySelectorAll('.link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = (e.target as HTMLElement).getAttribute('data-target');
        if (target) {
          this.navigateTo(target);
        }
      });
    });
  }

  /**
   * Process content with links
   */
  private processContent(content: string): string {
    return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, p1, p2) => {
      const text = p2 ? p1 : p1;
      const target = p2 || p1;
      return `<button class="link" data-target="${this.escapeHTML(target)}">${this.escapeHTML(text)}</button>`;
    });
  }

  /**
   * Escape HTML
   */
  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/**
 * Passage Editor Web Component
 */
export class PassageEditor extends WhiskerElement {
  private passage: Passage | null = null;

  /**
   * Set passage
   */
  public setPassage(passage: Passage): void {
    this.passage = passage;
    this.render();
  }

  /**
   * Get passage
   */
  public getPassage(): Passage | null {
    return this.passage;
  }

  /**
   * Render component
   */
  protected render(): void {
    if (!this.passage) {
      this.shadow.innerHTML = '<div>No passage loaded</div>';
      return;
    }

    this.shadow.innerHTML = '';

    // Add styles
    const style = this.createElement('style', {}, [
      `
        :host {
          display: block;
        }

        .editor {
          padding: 1rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .field {
          margin-bottom: 1rem;
        }

        label {
          display: block;
          margin-bottom: 0.25rem;
          font-weight: 600;
          color: #333;
        }

        input, textarea {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-family: inherit;
        }

        textarea {
          min-height: 200px;
          resize: vertical;
        }
      `
    ]);

    this.shadow.appendChild(style);

    // Create editor container
    const container = this.createElement('div', { className: 'editor' });

    // Title field
    const titleField = this.createElement('div', { className: 'field' });
    const titleLabel = this.createElement('label', {}, ['Title']);
    const titleInput = this.createElement('input', {
      type: 'text',
      value: this.passage.title,
      onInput: (e: Event) => {
        if (this.passage) {
          this.passage.title = (e.target as HTMLInputElement).value;
          this.dispatchEvent(new CustomEvent('change', { detail: { passage: this.passage } }));
        }
      }
    }) as HTMLInputElement;

    titleField.appendChild(titleLabel);
    titleField.appendChild(titleInput);
    container.appendChild(titleField);

    // Content field
    const contentField = this.createElement('div', { className: 'field' });
    const contentLabel = this.createElement('label', {}, ['Content']);
    const contentTextarea = this.createElement('textarea', {
      value: this.passage.content,
      onInput: (e: Event) => {
        if (this.passage) {
          this.passage.content = (e.target as HTMLTextAreaElement).value;
          this.dispatchEvent(new CustomEvent('change', { detail: { passage: this.passage } }));
        }
      }
    }) as HTMLTextAreaElement;
    contentTextarea.value = this.passage.content;

    contentField.appendChild(contentLabel);
    contentField.appendChild(contentTextarea);
    container.appendChild(contentField);

    this.shadow.appendChild(container);
  }
}

/**
 * Register custom elements
 */
export function registerComponents(): void {
  if (!customElements.get('whisker-story-player')) {
    customElements.define('whisker-story-player', StoryPlayer);
  }

  if (!customElements.get('whisker-passage-editor')) {
    customElements.define('whisker-passage-editor', PassageEditor);
  }
}

/**
 * Auto-register when module loads
 */
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  registerComponents();
}
