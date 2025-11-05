/**
 * Fix Accessibility Warnings Script
 *
 * This script fixes common accessibility issues:
 * 1. Labels without associated controls (96 warnings)
 * 2. Click handlers without keyboard handlers (25 warnings)
 * 3. Menu roles without tabindex
 * 4. Autofocus warnings
 * 5. Divs with keydown handlers need ARIA role
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface Fix {
  file: string;
  line: number;
  type: string;
  applied: boolean;
}

const fixes: Fix[] = [];

/**
 * Fix #1: Add `for` attribute to labels and `id` to inputs
 * Pattern: <label>...text...</label><input> becomes <label for="id">...text...</label><input id="id">
 */
function fixLabelAssociations(content: string, filePath: string): string {
  let modified = content;
  let fixCount = 0;

  // Match label followed by input/select/textarea
  const labelInputPattern = /<label\s+([^>]*class="[^"]*"[^>]*)>\s*([^<]+)\s*<\/label>\s*<(input|select|textarea)([^>]*)>/gi;

  modified = modified.replace(labelInputPattern, (match, labelAttrs, labelText, elementType, elementAttrs) => {
    // Skip if label already has 'for' attribute
    if (/<label[^>]+for=/.test(match)) {
      return match;
    }

    // Generate unique ID from label text
    const idBase = labelText.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const id = `${idBase}-${Math.random().toString(36).substr(2, 9)}`;

    // Check if input already has id
    const hasId = /\sid=/.test(elementAttrs);

    const newLabel = `<label for="${id}" ${labelAttrs}>${labelText}</label>`;
    const newElement = hasId
      ? `<${elementType}${elementAttrs}>`
      : `<${elementType} id="${id}"${elementAttrs}>`;

    fixCount++;
    return `${newLabel}\n        ${newElement}`;
  });

  if (fixCount > 0) {
    console.log(`  Fixed ${fixCount} label associations in ${path.basename(filePath)}`);
  }

  return modified;
}

/**
 * Fix #2: Add keyboard handlers to clickable elements
 * Pattern: <div on:click={handler}> becomes <div on:click={handler} on:keydown={(e) => e.key === 'Enter' && handler(e)} role="button" tabindex="0">
 */
function fixClickHandlers(content: string, filePath: string): string {
  let modified = content;
  let fixCount = 0;

  // Match divs and spans with on:click but no on:keydown
  const clickPattern = /<(div|span)([^>]*)\son:click=\{([^}]+)\}([^>]*)>/gi;

  modified = modified.replace(clickPattern, (match, tag, beforeClick, handler, afterClick) => {
    // Skip if already has keydown handler
    if (match.includes('on:keydown')) {
      return match;
    }

    // Skip if it's already a button or link
    if (match.includes('role="button"') || match.includes('role="link"')) {
      return match;
    }

    const needsRole = !match.includes('role=');
    const needsTabindex = !match.includes('tabindex');

    let additions = '';
    if (needsRole) additions += ' role="button"';
    if (needsTabindex) additions += ' tabindex="0"';
    additions += ` on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && ${handler}(e)}`;

    fixCount++;
    return `<${tag}${beforeClick} on:click={${handler}}${additions}${afterClick}>`;
  });

  if (fixCount > 0) {
    console.log(`  Fixed ${fixCount} click handlers in ${path.basename(filePath)}`);
  }

  return modified;
}

/**
 * Fix #3: Add tabindex to menu roles
 */
function fixMenuTabindex(content: string, filePath: string): string {
  let modified = content;
  let fixCount = 0;

  const menuPattern = /<([a-z]+)([^>]*)\srole="menu"([^>]*)>/gi;

  modified = modified.replace(menuPattern, (match, tag, before, after) => {
    if (match.includes('tabindex')) {
      return match;
    }

    fixCount++;
    return `<${tag}${before} role="menu" tabindex="0"${after}>`;
  });

  if (fixCount > 0) {
    console.log(`  Fixed ${fixCount} menu tabindex in ${path.basename(filePath)}`);
  }

  return modified;
}

/**
 * Fix #4: Remove autofocus (replace with programmatic focus in onMount)
 */
function fixAutofocus(content: string, filePath: string): string {
  let modified = content;
  let fixCount = 0;

  // Just comment it out with a TODO for now
  const autofocusPattern = /\s+autofocus/gi;

  modified = modified.replace(autofocusPattern, () => {
    fixCount++;
    return ' {/* autofocus */}';
  });

  if (fixCount > 0) {
    console.log(`  Commented out ${fixCount} autofocus attributes in ${path.basename(filePath)} (replace with programmatic focus)`);
  }

  return modified;
}

/**
 * Fix #5: Add role to divs with keydown handlers
 */
function fixKeydownRole(content: string, filePath: string): string {
  let modified = content;
  let fixCount = 0;

  const keydownPattern = /<div([^>]*)\son:keydown=([^>]*)>/gi;

  modified = modified.replace(keydownPattern, (match, before, after) => {
    if (match.includes('role=')) {
      return match;
    }

    // Check if it's likely interactive
    const needsTabindex = !match.includes('tabindex');

    fixCount++;
    return `<div${before} role="button"${needsTabindex ? ' tabindex="0"' : ''} on:keydown=${after}>`;
  });

  if (fixCount > 0) {
    console.log(`  Fixed ${fixCount} keydown roles in ${path.basename(filePath)}`);
  }

  return modified;
}

async function main() {
  console.log('🔧 Fixing accessibility warnings...\n');

  // Find all Svelte files
  const files = await glob('src/**/*.svelte', { ignore: 'node_modules/**' });

  console.log(`Found ${files.length} Svelte files\n`);

  let totalFixed = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    let modified = content;

    // Apply all fixes
    modified = fixLabelAssociations(modified, file);
    modified = fixClickHandlers(modified, file);
    modified = fixMenuTabindex(modified, file);
    modified = fixAutofocus(modified, file);
    modified = fixKeydownRole(modified, file);

    // Write back if changed
    if (modified !== content) {
      fs.writeFileSync(file, modified, 'utf-8');
      totalFixed++;
    }
  }

  console.log(`\n✅ Fixed accessibility issues in ${totalFixed} files`);
  console.log('\nRun `npm run check` to verify remaining warnings');
}

main().catch(console.error);
