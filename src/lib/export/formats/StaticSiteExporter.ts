import type { IExporter } from '../types';
import type { ExportContext, ExportResult } from '../types';

/**
 * Exports stories as standalone HTML files with embedded player
 */
export class StaticSiteExporter implements IExporter {
  readonly name = 'Static Site Exporter';
  readonly format = 'html-standalone';
  readonly description = 'Exports story as standalone HTML with embedded player';
  readonly extensions = ['.html'];
  readonly mimeType = 'text/html';

  async export(context: ExportContext): Promise<ExportResult> {
    try {
      const { story, options } = context;

      if (!story) {
        return {
          success: false,
          format: this.format,
          error: 'No story provided for export',
        };
      }

      // Get player template
      const template = this.getPlayerTemplate();

      // Serialize story data
      const storyData = this.serializeStory(story);

      // Generate HTML
      const html = this.generateHTML(template, story, storyData, options);

      return {
        success: true,
        format: this.format,
        data: html,
        filename: `${this.sanitizeFilename(story.metadata.title || 'story')}.html`,
      };
    } catch (error) {
      return {
        success: false,
        format: this.format,
        error: error instanceof Error ? error.message : 'Unknown export error',
      };
    }
  }

  private getPlayerTemplate(): string {
    // In a real implementation, this would load from a file
    // For now, return a basic template
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="{{DESCRIPTION}}">
    <title>{{TITLE}}</title>
    <style>
        {{STYLES}}
    </style>
</head>
<body>
    <div id="whisker-player">
        <div id="passage-container"></div>
        <div id="controls"></div>
    </div>
    <script>
        {{STORY_DATA}}
    </script>
    <script>
        {{PLAYER_SCRIPT}}
    </script>
</body>
</html>`;
  }

  private serializeStory(story: any): string {
    // Serialize story to JSON
    const serialized = story.serialize();
    return `const STORY_DATA = ${JSON.stringify(serialized, null, 2)};`;
  }

  private generateHTML(
    template: string,
    story: any,
    storyData: string,
    options: any
  ): string {
    let html = template;

    // Get title and description with defaults
    const title = story.metadata.title?.trim() || 'Interactive Story';
    const description = story.metadata.description?.trim() || 'An interactive story';

    // Replace template variables (use global replace)
    html = html.replace(/\{\{TITLE\}\}/g, this.escapeHTML(title));
    html = html.replace(/\{\{DESCRIPTION\}\}/g, this.escapeHTML(description));
    html = html.replace(/\{\{STORY_DATA\}\}/g, storyData);
    html = html.replace(/\{\{STYLES\}\}/g, this.getPlayerStyles());
    html = html.replace(/\{\{PLAYER_SCRIPT\}\}/g, this.getPlayerScript());

    return html;
  }

  private getPlayerStyles(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }

        #whisker-player {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 40px;
        }

        #passage-container {
            min-height: 300px;
            margin-bottom: 30px;
        }

        .passage {
            animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .passage h1 {
            font-size: 2em;
            margin-bottom: 20px;
            color: #2c3e50;
        }

        .passage p {
            margin-bottom: 15px;
        }

        .choices {
            margin-top: 30px;
        }

        .choice {
            display: block;
            padding: 15px 20px;
            margin: 10px 0;
            background: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.2s;
            cursor: pointer;
            border: none;
            width: 100%;
            text-align: left;
            font-size: 16px;
        }

        .choice:hover {
            background: #2980b9;
        }

        #controls {
            display: flex;
            gap: 10px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }

        .control-btn {
            padding: 10px 20px;
            background: #95a5a6;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .control-btn:hover {
            background: #7f8c8d;
        }

        .control-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        @media (max-width: 600px) {
            body {
                padding: 10px;
            }

            #whisker-player {
                padding: 20px;
            }
        }
    `;
  }

  private getPlayerScript(): string {
    return `
        class WhiskerPlayer {
            constructor(storyData) {
                this.story = storyData;
                this.currentPassageId = storyData.startPassage;
                this.history = [];
                this.variables = {};

                // Initialize variables
                if (this.story.variables) {
                    this.story.variables.forEach(v => {
                        this.variables[v.name] = v.default;
                    });
                }

                this.render();
            }

            render() {
                const passage = this.story.passages.find(p => p.id === this.currentPassageId);
                if (!passage) {
                    console.error('Passage not found:', this.currentPassageId);
                    return;
                }

                const container = document.getElementById('passage-container');
                container.innerHTML = '';

                // Create passage element
                const passageEl = document.createElement('div');
                passageEl.className = 'passage';

                // Title
                const title = document.createElement('h1');
                title.textContent = passage.title;
                passageEl.appendChild(title);

                // Content
                const content = document.createElement('div');
                content.innerHTML = this.processContent(passage.content);
                passageEl.appendChild(content);

                // Choices
                if (passage.choices && passage.choices.length > 0) {
                    const choicesEl = document.createElement('div');
                    choicesEl.className = 'choices';

                    passage.choices.forEach(choice => {
                        if (this.evaluateCondition(choice.condition)) {
                            const choiceBtn = document.createElement('button');
                            choiceBtn.className = 'choice';
                            choiceBtn.textContent = choice.text;
                            choiceBtn.onclick = () => this.makeChoice(choice);
                            choicesEl.appendChild(choiceBtn);
                        }
                    });

                    passageEl.appendChild(choicesEl);
                }

                container.appendChild(passageEl);

                // Update controls
                this.updateControls();
            }

            processContent(content) {
                // Simple variable substitution
                return content.replace(/\\{\\{(\\w+)\\}\\}/g, (match, varName) => {
                    return this.variables[varName] !== undefined ? this.variables[varName] : match;
                });
            }

            evaluateCondition(condition) {
                if (!condition) return true;
                // Simple condition evaluation (would need more robust implementation)
                try {
                    return eval(condition.replace(/\\{\\{(\\w+)\\}\\}/g, (m, v) => this.variables[v]));
                } catch (e) {
                    return true;
                }
            }

            makeChoice(choice) {
                // Execute effects
                if (choice.effects) {
                    choice.effects.forEach(effect => {
                        this.variables[effect.variable] = effect.value;
                    });
                }

                // Add to history
                this.history.push(this.currentPassageId);

                // Navigate to target
                this.currentPassageId = choice.targetPassageId;
                this.render();
            }

            goBack() {
                if (this.history.length > 0) {
                    this.currentPassageId = this.history.pop();
                    this.render();
                }
            }

            restart() {
                this.currentPassageId = this.story.startPassage;
                this.history = [];

                // Reset variables
                if (this.story.variables) {
                    this.story.variables.forEach(v => {
                        this.variables[v.name] = v.default;
                    });
                }

                this.render();
            }

            updateControls() {
                const controls = document.getElementById('controls');
                controls.innerHTML = '';

                // Back button
                const backBtn = document.createElement('button');
                backBtn.className = 'control-btn';
                backBtn.textContent = 'Back';
                backBtn.disabled = this.history.length === 0;
                backBtn.onclick = () => this.goBack();
                controls.appendChild(backBtn);

                // Restart button
                const restartBtn = document.createElement('button');
                restartBtn.className = 'control-btn';
                restartBtn.textContent = 'Restart';
                restartBtn.onclick = () => {
                    if (confirm('Are you sure you want to restart?')) {
                        this.restart();
                    }
                };
                controls.appendChild(restartBtn);
            }
        }

        // Initialize player when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                new WhiskerPlayer(STORY_DATA);
            });
        } else {
            new WhiskerPlayer(STORY_DATA);
        }
    `;
  }

  private sanitizeFilename(filename: string): string {
    if (!filename || !filename.trim()) {
      return 'story';
    }
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'story';
  }

  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
