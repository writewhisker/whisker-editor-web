/**
 * Build script for CSS files
 * Copies CSS from src/styles to dist/styles
 */

import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const stylesToCopy = [
  'src/styles/index.css',
  'src/styles/theme.css',
  'src/styles/base.css',
  'src/styles/utilities.css',
];

const distDir = join(root, 'dist/styles');
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

for (const file of stylesToCopy) {
  const source = join(root, file);
  const dest = join(root, 'dist/styles', file.split('/').pop());

  try {
    copyFileSync(source, dest);
    console.log(`Copied: ${file} -> dist/styles/`);
  } catch (error) {
    console.error(`Error copying ${file}:`, error.message);
    process.exit(1);
  }
}

console.log('✓ Styles built successfully');
