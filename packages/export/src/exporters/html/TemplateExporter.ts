import Handlebars from 'handlebars';
import type { StoryData } from '@writewhisker/core-ts';
import type { Exporter, ExportOptions } from '../Exporter';

/**
 * Template exporter options
 */
export interface TemplateExportOptions extends ExportOptions {
  /**
   * Custom Handlebars template string
   * If not provided, uses a default template
   */
  template?: string;

  /**
   * Theme name to apply (predefined themes)
   */
  theme?: 'default' | 'dark' | 'minimal' | 'classic';

  /**
   * Additional Handlebars helpers
   */
  helpers?: Record<string, Handlebars.HelperDelegate>;

  /**
   * Custom data to pass to template
   */
  customData?: Record<string, any>;
}

/**
 * HTML template exporter with support for custom themes and templates
 *
 * Allows users to provide their own Handlebars templates and themes
 * for complete control over the exported HTML structure and styling
 */
export class TemplateExporter implements Exporter {
  private compiledTemplates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private customHelpers: Map<string, Handlebars.HelperDelegate> = new Map();

  constructor() {
    this.registerDefaultHelpers();
  }

  /**
   * Register default Handlebars helpers
   */
  private registerDefaultHelpers(): void {
    // JSON stringify helper
    this.customHelpers.set('json', function (context: any) {
      return JSON.stringify(context, null, 2);
    });

    // Conditional helper
    this.customHelpers.set('if_eq', function (a: any, b: any, options: any) {
      return a === b ? options.fn(this) : options.inverse(this);
    });

    // Array length helper
    this.customHelpers.set('length', function (array: any[]) {
      return array ? array.length : 0;
    });

    // First item helper
    this.customHelpers.set('first', function (array: any[]) {
      return array && array.length > 0 ? array[0] : null;
    });

    // Date formatting helper
    this.customHelpers.set('formatDate', function (dateString: string) {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString();
      } catch {
        return dateString;
      }
    });

    // Escape helper for safe HTML
    this.customHelpers.set('escape', function (str: string) {
      return Handlebars.escapeExpression(str);
    });
  }

  /**
   * Get predefined theme CSS
   */
  private getThemeCSS(theme: string): string {
    const themes: Record<string, string> = {
      default: `
        body {
          font-family: 'Georgia', serif;
          line-height: 1.8;
          color: #2c3e50;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 20px;
        }
        #story-container {
          max-width: 700px;
          margin: 0 auto;
          background: white;
          padding: 60px;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        .passage-content {
          font-size: 19px;
          margin-bottom: 40px;
        }
        .choice {
          background: #667eea;
          color: white;
          border: none;
          padding: 18px 30px;
          margin: 10px 0;
          font-size: 17px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          text-align: left;
        }
        .choice:hover {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
      `,
      dark: `
        body {
          font-family: 'Courier New', monospace;
          line-height: 1.7;
          color: #e0e0e0;
          background: #1a1a1a;
          padding: 40px 20px;
        }
        #story-container {
          max-width: 800px;
          margin: 0 auto;
          background: #2d2d2d;
          padding: 50px;
          border-radius: 0;
          border: 2px solid #444;
          box-shadow: 0 0 50px rgba(0, 255, 0, 0.1);
        }
        .passage-content {
          font-size: 16px;
          margin-bottom: 30px;
          color: #00ff00;
          text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
        }
        .choice {
          background: transparent;
          color: #00ff00;
          border: 2px solid #00ff00;
          padding: 15px 25px;
          margin: 8px 0;
          font-size: 16px;
          border-radius: 0;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          text-align: left;
          font-family: 'Courier New', monospace;
        }
        .choice:hover {
          background: #00ff00;
          color: #1a1a1a;
          box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
        }
      `,
      minimal: `
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #000;
          background: #fff;
          padding: 60px 20px;
        }
        #story-container {
          max-width: 600px;
          margin: 0 auto;
        }
        .passage-content {
          font-size: 18px;
          margin-bottom: 40px;
        }
        .choice {
          background: none;
          color: #000;
          border: none;
          border-bottom: 1px solid #000;
          padding: 15px 0;
          margin: 0;
          font-size: 18px;
          border-radius: 0;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          text-align: left;
        }
        .choice:hover {
          padding-left: 20px;
          border-bottom: 2px solid #000;
        }
      `,
      classic: `
        body {
          font-family: 'Times New Roman', serif;
          line-height: 1.7;
          color: #1a1a1a;
          background: #f4f1e8;
          padding: 40px 20px;
        }
        #story-container {
          max-width: 750px;
          margin: 0 auto;
          background: #fff;
          padding: 80px 60px;
          border: 1px solid #d4c5a9;
          box-shadow: 0 0 30px rgba(0, 0, 0, 0.1);
        }
        .passage-content {
          font-size: 20px;
          margin-bottom: 50px;
          text-align: justify;
        }
        .choice {
          background: #f4f1e8;
          color: #1a1a1a;
          border: 2px solid #8b7355;
          padding: 20px 30px;
          margin: 12px 0;
          font-size: 18px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
          text-align: center;
          font-family: 'Times New Roman', serif;
        }
        .choice:hover {
          background: #8b7355;
          color: #fff;
        }
      `,
    };

    return themes[theme] || themes.default;
  }

  /**
   * Get default template
   */
  private getDefaultTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  {{#if includeMetadata}}
  <meta name="author" content="{{author}}">
  {{#if description}}
  <meta name="description" content="{{description}}">
  {{/if}}
  {{#if metadata.created}}
  <meta name="created" content="{{metadata.created}}">
  {{/if}}
  {{/if}}
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    {{{themeCSS}}}
    {{#if customCSS}}
    {{{customCSS}}}
    {{/if}}
  </style>
</head>
<body>
  <div id="story-container">
    <div id="passage-display"></div>
  </div>

  <script>
    // Story data
    const STORY_DATA = {{{storyDataJSON}}};

    // Simple story player
    class StoryPlayer {
      constructor(storyData) {
        this.story = storyData;
        this.currentPassageId = storyData.startPassage;
        this.variables = this.initVariables();
        this.history = [];
      }

      initVariables() {
        const vars = {};
        for (const [name, varData] of Object.entries(this.story.variables || {})) {
          vars[name] = varData.initial;
        }
        return vars;
      }

      start() {
        this.showPassage(this.currentPassageId);
      }

      showPassage(passageId) {
        const passage = this.story.passages[passageId];
        if (!passage) {
          console.error('Passage not found:', passageId);
          return;
        }

        this.currentPassageId = passageId;
        this.history.push(passageId);

        const content = this.processText(passage.content);
        const choices = this.getAvailableChoices(passage.choices);

        let html = '<div class="passage">';
        html += '<div class="passage-content">' + content + '</div>';

        if (choices.length > 0) {
          html += '<div class="choices">';
          for (let i = 0; i < choices.length; i++) {
            const choice = choices[i];
            html += '<button class="choice" data-index="' + i + '">';
            html += this.processText(choice.text);
            html += '</button>';
          }
          html += '</div>';
        }

        html += '</div>';

        const container = document.getElementById('passage-display');
        container.innerHTML = html;

        // Add click handlers
        const buttons = container.querySelectorAll('.choice');
        buttons.forEach((btn, idx) => {
          btn.addEventListener('click', () => {
            const choice = choices[idx];
            if (choice.action) {
              this.executeAction(choice.action);
            }
            this.showPassage(choice.target);
          });
        });
      }

      processText(text) {
        // Simple variable substitution
        return text.replace(/\\{\\{(\\w+)\\}\\}/g, (match, varName) => {
          return this.variables.hasOwnProperty(varName) ? this.variables[varName] : match;
        });
      }

      getAvailableChoices(choices) {
        return choices.filter(choice => {
          if (!choice.condition) return true;
          return this.evaluateCondition(choice.condition);
        });
      }

      evaluateCondition(condition) {
        try {
          const func = new Function(...Object.keys(this.variables), 'return ' + condition);
          return func(...Object.values(this.variables));
        } catch (e) {
          console.error('Condition evaluation error:', e);
          return false;
        }
      }

      executeAction(action) {
        try {
          const func = new Function('vars', action);
          func(this.variables);
        } catch (e) {
          console.error('Action execution error:', e);
        }
      }
    }

    // Start the story
    const player = new StoryPlayer(STORY_DATA);
    player.start();
  </script>
</body>
</html>
    `.trim();
  }

  /**
   * Compile a template with helpers
   */
  private compileTemplate(template: string, helpers?: Record<string, Handlebars.HelperDelegate>): HandlebarsTemplateDelegate {
    // Register all helpers
    const allHelpers = { ...Object.fromEntries(this.customHelpers), ...helpers };

    for (const [name, helper] of Object.entries(allHelpers)) {
      Handlebars.registerHelper(name, helper);
    }

    return Handlebars.compile(template);
  }

  /**
   * Export story using custom template
   */
  async export(story: StoryData, options: TemplateExportOptions = {}): Promise<string> {
    try {
      const templateString = options.template || this.getDefaultTemplate();
      const theme = options.theme || 'default';

      // Compile template
      const template = this.compileTemplate(templateString, options.helpers);

      // Prepare template data
      const templateData = {
        title: story.metadata.title || 'Whisker Story',
        author: story.metadata.author || 'Anonymous',
        description: story.metadata.description || '',
        includeMetadata: options.includeMetadata !== false,
        metadata: story.metadata,
        themeCSS: this.getThemeCSS(theme),
        customCSS: options.customCSS || '',
        storyDataJSON: JSON.stringify(story, null, options.minify ? 0 : 2),
        storyData: story,
        ...options.customData,
      };

      let html = template(templateData);

      // Minify if requested
      if (options.minify) {
        html = this.minifyHTML(html);
      }

      return html;
    } catch (error) {
      throw new Error(
        `Failed to export with template: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Simple HTML minification
   */
  private minifyHTML(html: string): string {
    return html
      .replace(/\n\s+/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .replace(/>\s+</g, '><')
      .trim();
  }

  /**
   * Register a custom helper
   */
  registerHelper(name: string, helper: Handlebars.HelperDelegate): void {
    this.customHelpers.set(name, helper);
  }

  /**
   * Get available themes
   */
  static getAvailableThemes(): string[] {
    return ['default', 'dark', 'minimal', 'classic'];
  }
}
