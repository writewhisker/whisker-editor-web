/**
 * CLI Build Command
 *
 * Build and compilation commands for Whisker stories.
 */

import type { Command, CommandContext } from './types.js';
import { Story } from '@writewhisker/story-models';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{ type: string; message: string }>;
}

/**
 * Build format
 */
export type BuildFormat = 'html' | 'json' | 'markdown' | 'pdf';

/**
 * Build options
 */
export interface BuildOptions {
  input: string;
  output: string;
  format: BuildFormat;
  minify?: boolean;
  validate?: boolean;
  watch?: boolean;
  sourcemap?: boolean;
}

/**
 * Build a story
 */
export async function buildStory(options: BuildOptions): Promise<void> {
  const fs = await import('fs/promises');

  // Read story file and deserialize to Story instance
  const storyContent = await fs.readFile(options.input, 'utf-8');
  const story = new Story(JSON.parse(storyContent));

  // Validate if requested
  if (options.validate) {
    const validation = await validateStory(story);
    if (!validation.valid) {
      console.error('Validation errors:');
      for (const error of validation.errors) {
        console.error(`  - ${error.message} (${error.type})`);
      }
      throw new Error('Story validation failed');
    }
  }

  // Build based on format
  let output: string;
  switch (options.format) {
    case 'html':
      output = await buildHTML(story, options);
      break;
    case 'json':
      output = await buildJSON(story, options);
      break;
    case 'markdown':
      output = await buildMarkdown(story, options);
      break;
    case 'pdf':
      output = await buildPDF(story, options);
      break;
    default:
      throw new Error(`Unknown format: ${options.format}`);
  }

  // Write output
  await fs.writeFile(options.output, output);
}

/**
 * Build HTML output
 */
async function buildHTML(story: Story, options: BuildOptions): Promise<string> {
  const template = await getHTMLTemplate();
  // Use story.serialize() to properly convert Maps to plain objects
  const serialized = story.serialize();
  const storyData = options.minify ? JSON.stringify(serialized) : JSON.stringify(serialized, null, 2);

  return template
    .replace('{{STORY_TITLE}}', escapeHTML(story.metadata.title))
    .replace('{{STORY_DATA}}', escapeHTML(storyData))
    .replace('{{MINIFIED}}', options.minify ? 'true' : 'false');
}

/**
 * Build JSON output
 */
async function buildJSON(story: Story, options: BuildOptions): Promise<string> {
  const serialized = story.serialize();
  return options.minify ? JSON.stringify(serialized) : JSON.stringify(serialized, null, 2);
}

/**
 * Build Markdown output
 */
async function buildMarkdown(story: Story, options: BuildOptions): Promise<string> {
  let markdown = `# ${story.metadata.title}\n\n`;

  if (story.metadata?.author) {
    markdown += `**Author:** ${story.metadata.author}\n\n`;
  }

  if (story.metadata?.description) {
    markdown += `${story.metadata.description}\n\n`;
  }

  markdown += `---\n\n`;

  // Add passages
  for (const passage of story.passages.values()) {
    markdown += `## ${passage.title}\n\n`;
    markdown += `${passage.content}\n\n`;

    if (passage.tags && passage.tags.length > 0) {
      markdown += `*Tags: ${passage.tags.join(', ')}*\n\n`;
    }

    markdown += `---\n\n`;
  }

  return markdown;
}

/**
 * Build PDF output (placeholder)
 */
async function buildPDF(story: Story, options: BuildOptions): Promise<string> {
  // This would require a PDF generation library
  // For now, return markdown that can be converted to PDF
  return buildMarkdown(story, options);
}

/**
 * Get HTML template
 */
async function getHTMLTemplate(): Promise<string> {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{STORY_TITLE}}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 2rem;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 1rem;
      color: #2c3e50;
    }

    .passage {
      margin: 2rem 0;
    }

    .passage-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #34495e;
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
      border-radius: 4px;
      transition: background 0.2s;
    }

    .link:hover {
      background: #2980b9;
    }

    .current-passage {
      display: block;
    }

    .hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="story"></div>
  </div>

  <script>
    const storyData = {{STORY_DATA}};
    let currentPassage = storyData.startPassage;

    function renderPassage(passageId) {
      // passages is an object keyed by ID, not an array
      const passage = storyData.passages[passageId];
      if (!passage) {
        return '<p>Passage not found: ' + passageId + '</p>';
      }

      let html = '<div class="passage">';
      html += '<h2 class="passage-title">' + escapeHTML(passage.title) + '</h2>';
      html += '<div class="passage-content">' + processContent(passage.content) + '</div>';
      html += '</div>';

      return html;
    }

    function processContent(content) {
      // Convert [[link]] or [[text|target]] to clickable links
      return content.replace(/\\[\\[([^\\]|]+)(?:\\|([^\\]]+))?\\]\\]/g, (match, p1, p2) => {
        const text = p2 ? p1 : p1;
        const target = p2 || p1;
        return '<a href="#" class="link" onclick="navigateTo(\\'+ target + '\\'); return false;">' + escapeHTML(text) + '</a>';
      });
    }

    function navigateTo(passageTitle) {
      currentPassage = passageTitle;
      render();
    }

    function render() {
      document.getElementById('story').innerHTML = renderPassage(currentPassage);
    }

    function escapeHTML(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    // Initial render
    render();
  </script>
</body>
</html>`;
}

/**
 * Validate a story
 */
async function validateStory(story: Story): Promise<ValidationResult> {
  const errors: Array<{ type: string; message: string }> = [];

  // Check for start passage (startPassage is a passage ID in the new format)
  if (!story.startPassage) {
    errors.push({ type: 'missing-start', message: 'Story has no start passage' });
  } else {
    // Check if passage exists by ID
    const startExists = story.passages.has(story.startPassage);
    if (!startExists) {
      errors.push({
        type: 'invalid-start',
        message: `Start passage "${story.startPassage}" not found`,
      });
    }
  }

  // Check for broken links
  // Links can target either passage titles or passage IDs
  const passageTitles = new Set(story.mapPassages(p => p.title));
  const passageIds = new Set(story.passages.keys());
  const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

  for (const passage of story.passages.values()) {
    let match;
    while ((match = linkRegex.exec(passage.content)) !== null) {
      const target = match[2] || match[1];
      // Check if target matches either a title or an ID
      if (!passageTitles.has(target) && !passageIds.has(target)) {
        errors.push({
          type: 'broken-link',
          message: `Broken link in "${passage.title}": ${target}`,
        });
      }
    }
  }

  // Check for duplicate titles
  const titles = story.mapPassages(p => p.title);
  const duplicates = titles.filter((title, index) => titles.indexOf(title) !== index);
  if (duplicates.length > 0) {
    errors.push({
      type: 'duplicate-title',
      message: `Duplicate passage titles: ${Array.from(new Set(duplicates)).join(', ')}`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Escape HTML
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Watch for file changes
 */
export async function watchBuild(options: BuildOptions): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  console.log(`Watching ${options.input} for changes...`);

  let building = false;

  fs.watch(options.input, async (eventType) => {
    if (eventType === 'change' && !building) {
      building = true;
      console.log('Rebuilding...');

      try {
        await buildStory(options);
        console.log('✓ Build complete');
      } catch (error) {
        console.error('✗ Build failed:', error);
      }

      building = false;
    }
  });

  // Keep process alive
  await new Promise(() => {});
}

/**
 * Build command
 */
export const buildCommand: Command = {
  name: 'build',
  description: 'Build a Whisker story',
  options: [
    {
      name: 'input',
      alias: 'i',
      description: 'Input story file',
      type: 'string',
      default: 'story.json',
    },
    {
      name: 'output',
      alias: 'o',
      description: 'Output file',
      type: 'string',
      default: 'dist/story.html',
    },
    {
      name: 'format',
      alias: 'f',
      description: 'Output format (html, json, markdown, pdf)',
      type: 'string',
      default: 'html',
    },
    {
      name: 'minify',
      description: 'Minify output',
      type: 'boolean',
      default: false,
    },
    {
      name: 'validate',
      description: 'Validate story before building',
      type: 'boolean',
      default: true,
    },
    {
      name: 'watch',
      alias: 'w',
      description: 'Watch for changes',
      type: 'boolean',
      default: false,
    },
  ],
  execute: async (context: CommandContext) => {
    const { options, cwd } = context;
    const path = await import('path');

    const buildOptions: BuildOptions = {
      input: path.resolve(cwd, options.input || 'story.json'),
      output: path.resolve(cwd, options.output || 'dist/story.html'),
      format: (options.format || 'html') as BuildFormat,
      minify: options.minify || false,
      validate: options.validate !== false,
      watch: options.watch || false,
    };

    console.log('Building story...');
    console.log(`  Input: ${buildOptions.input}`);
    console.log(`  Output: ${buildOptions.output}`);
    console.log(`  Format: ${buildOptions.format}`);
    console.log('');

    // Create output directory
    const fs = await import('fs/promises');
    const outputDir = path.dirname(buildOptions.output);
    await fs.mkdir(outputDir, { recursive: true });

    if (buildOptions.watch) {
      await watchBuild(buildOptions);
    } else {
      await buildStory(buildOptions);
      console.log('✓ Build complete!');
    }
  },
};
