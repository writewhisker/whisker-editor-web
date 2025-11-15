import Handlebars from 'handlebars';
import type { StoryData } from '@writewhisker/core-ts';
import type { Exporter, ExportOptions } from '../Exporter';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Standalone HTML exporter that embeds the player in a single HTML file
 *
 * Creates a self-contained HTML file with:
 * - Embedded story data
 * - Embedded player JavaScript
 * - Embedded CSS styles
 * - No external dependencies
 */
export class StandaloneExporter implements Exporter {
  private template: HandlebarsTemplateDelegate | null = null;

  /**
   * Load and compile the handlebars template
   */
  private async loadTemplate(): Promise<HandlebarsTemplateDelegate> {
    if (this.template) {
      return this.template;
    }

    try {
      const templatePath = join(__dirname, '../../templates/standalone.hbs');
      const templateSource = readFileSync(templatePath, 'utf-8');
      this.template = Handlebars.compile(templateSource);
      return this.template;
    } catch (error) {
      throw new Error(
        `Failed to load standalone template: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get embedded player JavaScript
   * In a real implementation, this would bundle @writewhisker/player-ui
   */
  private async getPlayerJS(): Promise<string> {
    // TODO: Bundle the actual player-ui package
    // For now, return a minimal player implementation
    return `
      (function() {
        'use strict';

        class WhiskerPlayer {
          constructor(storyData, containerId) {
            this.story = storyData;
            this.container = document.getElementById(containerId);
            this.currentPassage = null;
            this.variables = this.initializeVariables();
            this.history = [];

            if (!this.container) {
              throw new Error('Container element not found: ' + containerId);
            }
          }

          initializeVariables() {
            const vars = {};
            for (const [name, varData] of Object.entries(this.story.variables || {})) {
              vars[name] = varData.initial;
            }
            return vars;
          }

          start() {
            const startId = this.story.startPassage;
            if (!startId || !this.story.passages[startId]) {
              throw new Error('Start passage not found: ' + startId);
            }
            this.showPassage(startId);
          }

          showPassage(passageId) {
            const passage = this.story.passages[passageId];
            if (!passage) {
              throw new Error('Passage not found: ' + passageId);
            }

            this.currentPassage = passageId;
            this.history.push(passageId);

            // Execute onEnter script
            if (passage.onEnterScript) {
              try {
                this.executeScript(passage.onEnterScript);
              } catch (error) {
                console.error('Error in onEnter script:', error);
              }
            }

            this.render(passage);
          }

          render(passage) {
            const content = this.processContent(passage.content);
            const choices = this.filterChoices(passage.choices);

            let html = '<div class="passage">';
            html += '<div class="passage-content">' + content + '</div>';

            if (choices.length > 0) {
              html += '<div class="choices">';
              for (const choice of choices) {
                html += '<button class="choice" data-target="' + choice.target + '" data-action="' + (choice.action || '') + '">';
                html += this.processContent(choice.text);
                html += '</button>';
              }
              html += '</div>';
            }

            html += '</div>';

            this.container.innerHTML = html;

            // Add event listeners to choices
            const choiceButtons = this.container.querySelectorAll('.choice');
            choiceButtons.forEach(button => {
              button.addEventListener('click', (e) => {
                const target = e.target.closest('.choice').dataset.target;
                const action = e.target.closest('.choice').dataset.action;

                if (action) {
                  try {
                    this.executeScript(action);
                  } catch (error) {
                    console.error('Error in choice action:', error);
                  }
                }

                // Execute onExit script
                if (passage.onExitScript) {
                  try {
                    this.executeScript(passage.onExitScript);
                  } catch (error) {
                    console.error('Error in onExit script:', error);
                  }
                }

                this.showPassage(target);
              });
            });
          }

          processContent(text) {
            // Simple variable replacement: {{varName}}
            return text.replace(/\\{\\{(\\w+)\\}\\}/g, (match, varName) => {
              return this.variables[varName] !== undefined ? this.variables[varName] : match;
            });
          }

          filterChoices(choices) {
            return choices.filter(choice => {
              if (!choice.condition) return true;
              try {
                return this.evaluateCondition(choice.condition);
              } catch (error) {
                console.error('Error evaluating choice condition:', error);
                return false;
              }
            });
          }

          evaluateCondition(condition) {
            // Simple condition evaluation
            // In production, use a proper expression evaluator
            try {
              const func = new Function(...Object.keys(this.variables), 'return ' + condition);
              return func(...Object.values(this.variables));
            } catch (error) {
              console.error('Failed to evaluate condition:', condition, error);
              return false;
            }
          }

          executeScript(script) {
            // Simple script execution
            // In production, use a proper Lua interpreter or safe JS evaluator
            try {
              const func = new Function('vars', 'player', script);
              func(this.variables, this);
            } catch (error) {
              console.error('Script execution error:', error);
              throw error;
            }
          }
        }

        // Export to global scope
        window.WhiskerPlayer = WhiskerPlayer;
      })();
    `;
  }

  /**
   * Get default player CSS
   */
  private getPlayerCSS(customCSS?: string): string {
    const defaultCSS = `
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

      #story-container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .passage {
        animation: fadeIn 0.3s ease-in;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .passage-content {
        margin-bottom: 30px;
        font-size: 18px;
      }

      .passage-content p {
        margin-bottom: 1em;
      }

      .choices {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .choice {
        background: #007bff;
        color: white;
        border: none;
        padding: 15px 25px;
        font-size: 16px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
      }

      .choice:hover {
        background: #0056b3;
        transform: translateX(5px);
      }

      .choice:active {
        transform: translateX(5px) scale(0.98);
      }
    `;

    return customCSS ? defaultCSS + '\n\n' + customCSS : defaultCSS;
  }

  /**
   * Export story to standalone HTML
   */
  async export(story: StoryData, options: ExportOptions = {}): Promise<string> {
    try {
      const template = await this.loadTemplate();
      const playerJS = await this.getPlayerJS();
      const playerCSS = this.getPlayerCSS(options.customCSS);

      // Prepare story data for embedding
      const storyJSON = JSON.stringify(story, null, options.minify ? 0 : 2);

      const templateData = {
        title: story.metadata.title || 'Whisker Story',
        author: story.metadata.author || 'Anonymous',
        description: story.metadata.description || '',
        includeMetadata: options.includeMetadata !== false,
        metadata: story.metadata,
        css: playerCSS,
        playerJS: playerJS,
        storyData: storyJSON,
        minify: options.minify || false,
      };

      let html = template(templateData);

      // Minify if requested
      if (options.minify) {
        html = this.minifyHTML(html);
      }

      return html;
    } catch (error) {
      throw new Error(
        `Failed to export standalone HTML: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Simple HTML minification
   */
  private minifyHTML(html: string): string {
    return html
      .replace(/\n\s+/g, '\n') // Remove leading whitespace
      .replace(/\n{2,}/g, '\n') // Remove multiple newlines
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .trim();
  }
}
