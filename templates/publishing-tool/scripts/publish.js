#!/usr/bin/env node

/**
 * Command-line publishing script
 *
 * Usage:
 *   node scripts/publish.js --target web --story story.json --output dist/
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];
  options[key] = value;
}

const { target = 'web', story: storyPath, output = 'dist/' } = options;

async function publish() {
  console.log(`Publishing to ${target}...`);

  try {
    // Load story
    if (!storyPath) {
      throw new Error('--story argument is required');
    }

    const storyData = JSON.parse(readFileSync(resolve(storyPath), 'utf-8'));
    console.log(`Loaded story: ${storyData.metadata?.title || 'Untitled'}`);

    // Simulate publishing
    console.log('Building...');
    console.log('Optimizing...');
    console.log('Packaging...');

    // Create output
    const outputFile = resolve(output, 'story.html');
    const html = generateHTML(storyData);
    writeFileSync(outputFile, html);

    console.log(`✓ Published to: ${outputFile}`);
  } catch (err) {
    console.error('Publishing failed:', err.message);
    process.exit(1);
  }
}

function generateHTML(storyData) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${storyData.metadata?.title || 'Story'}</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { color: #2196f3; }
    .passage { margin-bottom: 2rem; }
    a { color: #2196f3; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>${storyData.metadata?.title || 'Story'}</h1>
  <div id="story-data" style="display: none;">${JSON.stringify(storyData)}</div>
  <div id="story-player">
    <p>Story player would load here...</p>
  </div>
  <script>
    // Story player initialization would go here
    console.log('Story loaded:', ${JSON.stringify(storyData.metadata?.title)});
  </script>
</body>
</html>`;
}

publish();
