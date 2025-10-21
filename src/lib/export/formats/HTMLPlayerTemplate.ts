/**
 * HTML Player Template
 *
 * Self-contained HTML template for playing Whisker stories in a browser.
 */

/**
 * Generate HTML player template
 */
export function generateHTMLPlayer(
  storyData: string,
  title: string,
  options: {
    theme?: 'light' | 'dark' | 'auto';
    customCSS?: string;
    customJS?: string;
  } = {}
): string {
  const { theme = 'auto', customCSS = '', customJS = '' } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>
    /* Base Styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f3f4f6;
      --text-primary: #111827;
      --text-secondary: #6b7280;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --border: #e5e7eb;
    }

    @media (prefers-color-scheme: dark) {
      :root${theme === 'auto' ? '' : '.dark-theme'} {
        --bg-primary: #1f2937;
        --bg-secondary: #111827;
        --text-primary: #f9fafb;
        --text-secondary: #9ca3af;
        --accent: #60a5fa;
        --accent-hover: #3b82f6;
        --border: #374151;
      }
    }

    ${theme === 'dark' ? ':root { --bg-primary: #1f2937; --bg-secondary: #111827; --text-primary: #f9fafb; --text-secondary: #9ca3af; --accent: #60a5fa; --accent-hover: #3b82f6; --border: #374151; }' : ''}

    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    #app {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      flex: 1;
    }

    .passage {
      margin-bottom: 2rem;
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .passage-title {
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 1rem;
      color: var(--text-primary);
    }

    .passage-content {
      font-size: 1.125rem;
      margin-bottom: 1.5rem;
      white-space: pre-wrap;
    }

    .choices {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .choice {
      background: var(--accent);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    }

    .choice:hover {
      background: var(--accent-hover);
      transform: translateX(4px);
    }

    .choice:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .meta-bar {
      position: sticky;
      top: 0;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      color: var(--text-secondary);
      z-index: 10;
    }

    .meta-bar button {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      cursor: pointer;
      color: var(--text-primary);
      font-size: 0.875rem;
    }

    .meta-bar button:hover {
      background: var(--border);
    }

    .game-over {
      text-align: center;
      padding: 3rem 0;
    }

    .game-over h2 {
      font-size: 2rem;
      margin-bottom: 1rem;
    }

    ${customCSS}
  </style>
</head>
<body>
  <div class="meta-bar">
    <div id="story-title">${escapeHTML(title)}</div>
    <div>
      <button onclick="player.restart()">Restart</button>
    </div>
  </div>
  <div id="app"></div>

  <script>
    // Story Data (embedded)
    const STORY_DATA = ${storyData};

    // Simple Story Player
    class StoryPlayer {
      constructor(storyData) {
        this.story = storyData;
        this.currentPassageId = null;
        this.variables = new Map();
        this.history = [];
        this.appEl = document.getElementById('app');

        // Initialize variables
        if (this.story.variables) {
          Object.entries(this.story.variables).forEach(([name, data]) => {
            this.variables.set(name, data.value);
          });
        }
      }

      start() {
        this.currentPassageId = this.story.startPassage;
        if (!this.currentPassageId) {
          const firstPassage = Object.keys(this.story.passages)[0];
          this.currentPassageId = firstPassage;
        }
        this.render();
      }

      restart() {
        this.currentPassageId = null;
        this.variables.clear();
        this.history = [];

        // Re-initialize variables
        if (this.story.variables) {
          Object.entries(this.story.variables).forEach(([name, data]) => {
            this.variables.set(name, data.value);
          });
        }

        this.start();
      }

      makeChoice(choiceId) {
        const passage = this.story.passages[this.currentPassageId];
        const choice = passage.choices.find(c => c.id === choiceId);

        if (!choice) return;

        // Save to history
        this.history.push({
          passageId: this.currentPassageId,
          choiceId: choiceId,
        });

        // Navigate to target
        this.currentPassageId = choice.target;
        this.render();
      }

      render() {
        if (!this.currentPassageId || !this.story.passages[this.currentPassageId]) {
          this.appEl.innerHTML = \`
            <div class="game-over">
              <h2>The End</h2>
              <button onclick="player.restart()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: var(--accent); color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem;">
                Play Again
              </button>
            </div>
          \`;
          return;
        }

        const passage = this.story.passages[this.currentPassageId];

        // Substitute variables in content
        let content = passage.content || '';
        this.variables.forEach((value, name) => {
          content = content.replace(new RegExp(\`{{\\\\s*\${name}\\\\s*}}\`, 'g'), value);
        });

        // Render passage
        const html = \`
          <div class="passage">
            <div class="passage-title">\${this.escapeHTML(passage.title)}</div>
            <div class="passage-content">\${this.escapeHTML(content)}</div>
            <div class="choices">
              \${passage.choices.map(choice => \`
                <button class="choice" onclick="player.makeChoice('\${choice.id}')">
                  \${this.escapeHTML(choice.text)}
                </button>
              \`).join('')}
            </div>
          </div>
        \`;

        this.appEl.innerHTML = html;
      }

      escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
      }
    }

    // Initialize and start the player
    const player = new StoryPlayer(STORY_DATA);
    player.start();

    ${customJS}
  </script>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
