import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Story } from '@writewhisker/core-ts';
import { WhiskerPlayerUI } from '@writewhisker/player-ui';

@customElement('whisker-player')
export class WhiskerPlayer extends LitElement {
  @property({ type: String, attribute: 'story-url' })
  storyUrl?: string;

  @property({ type: String })
  theme: 'light' | 'dark' = 'dark';

  private player?: WhiskerPlayerUI;
  private container?: HTMLDivElement;

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .player-container {
      width: 100%;
      min-height: 400px;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      color: #666;
    }

    .error {
      padding: 2rem;
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 4px;
      color: #856404;
    }
  `;

  async firstUpdated() {
    await this.loadPlayer();
  }

  async loadPlayer() {
    try {
      let story: Story;

      if (this.storyUrl) {
        const response = await fetch(this.storyUrl);
        const data = await response.json();
        story = Story.deserialize(data);
      } else {
        story = this.createDemoStory();
      }

      // Wait for container to be available
      await this.updateComplete;
      this.container = this.shadowRoot?.querySelector(
        '.player-container'
      ) as HTMLDivElement;

      if (this.container) {
        this.player = new WhiskerPlayerUI(this.container, story, {
          theme: this.theme,
          showToolbar: true,
          autoSave: false,
        });
      }
    } catch (err) {
      console.error('Failed to load story:', err);
    }
  }

  createDemoStory(): Story {
    const story = new Story({
      metadata: {
        title: 'Embedded Player Demo',
        author: 'Whisker',
        description: 'A short demo story',
      },
    });

    story.createPassage({
      name: 'Start',
      content: 'Welcome to the embedded Whisker player!\\n\\n[[Continue->Next]]',
      tags: ['start'],
    });

    story.createPassage({
      name: 'Next',
      content: 'This player can be embedded anywhere as a Web Component.\\n\\nThe End.',
    });

    return story;
  }

  render() {
    return html`<div class="player-container"></div>`;
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.player?.destroy();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'whisker-player': WhiskerPlayer;
  }
}
