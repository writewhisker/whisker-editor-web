/**
 * WLS (Whisker Language Specification) Content Migration
 *
 * Migrates passage content from WLS 1.0 syntax to WLS 2.0 features.
 * Handles:
 * - Variable syntax updates
 * - List to state machine conversion hints
 * - Thread spawn declarations
 * - External function declarations
 * - Audio/effect declarations
 */

/**
 * WLS migration options
 */
export interface WLSMigrationOptions {
  /** Convert simple lists to state machine hints */
  suggestStateMachines?: boolean;
  /** Add thread declarations for spawn patterns */
  detectThreadPatterns?: boolean;
  /** Add external function stubs */
  generateExternalStubs?: boolean;
  /** Detect audio references */
  detectAudioReferences?: boolean;
  /** Detect effect patterns */
  detectEffectPatterns?: boolean;
  /** Add inline comments for migration hints */
  addMigrationComments?: boolean;
}

/**
 * WLS migration result
 */
export interface WLSMigrationResult {
  /** Original content */
  original: string;
  /** Migrated content */
  migrated: string;
  /** Changes made */
  changes: WLSMigrationChange[];
  /** Suggestions for manual review */
  suggestions: WLSMigrationSuggestion[];
}

/**
 * Single migration change
 */
export interface WLSMigrationChange {
  type: 'syntax' | 'declaration' | 'pattern' | 'comment';
  description: string;
  lineNumber?: number;
}

/**
 * Suggestion for manual review
 */
export interface WLSMigrationSuggestion {
  type: 'state_machine' | 'thread' | 'external' | 'audio' | 'effect';
  description: string;
  recommendation: string;
  lineNumber?: number;
}

/**
 * Pattern matchers for WLS content
 */
const WLS_PATTERNS = {
  // Variable patterns
  dollarVar: /\$([a-zA-Z_][a-zA-Z0-9_]*)/g,
  listDeclaration: /^LIST\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/gm,
  listOperation: /([\w]+)\s*\+\+|--\s*([\w]+)|\b([\w]+)\s*\+=\s*([\w]+)/g,

  // Thread patterns
  spawnPattern: /\bspawn\s+(\w+)/gi,
  awaitPattern: /\bawait\s+(\w+)/gi,
  parallelBlock: /@parallel\s*\{/g,

  // External function calls
  externalCall: /\b(EXTERNAL|EXT)\s+(\w+)\s*\(/gi,
  functionCall: /\b([A-Z][a-zA-Z0-9_]*)\s*\(/g,

  // Audio patterns
  playAudio: /\b(play|playSound|playMusic|playAudio)\s*["']([^"']+)["']/gi,
  audioChannel: /\bchannel\s*[=:]\s*["']?(bgm|sfx|voice|ambient)["']?/gi,

  // Effect patterns
  effectTag: /<(shake|pulse|glitch|fade|typewriter)>/gi,
  delayPattern: /@delay\s*\(?\s*(\d+(?:\.\d+)?)\s*(s|ms)?\s*\)?/gi,

  // Conditional patterns (for enhancement)
  simpleIf: /^\s*\{\s*(.+?)\s*:\s*$/gm,
  elsePattern: /^\s*-\s*else\s*:\s*$/gm,
};

/**
 * Migrate WLS 1.0 content to WLS 2.0
 */
export function migrateWLSContent(
  content: string,
  options: WLSMigrationOptions = {}
): WLSMigrationResult {
  const changes: WLSMigrationChange[] = [];
  const suggestions: WLSMigrationSuggestion[] = [];
  let migrated = content;

  // Track line numbers for changes
  const lines = content.split('\n');

  // 1. Detect LIST declarations and suggest state machines
  if (options.suggestStateMachines !== false) {
    const listMatches = [...content.matchAll(WLS_PATTERNS.listDeclaration)];
    for (const match of listMatches) {
      const listName = match[1];
      const listValues = match[2];
      const lineNum = getLineNumber(content, match.index!);

      // Check if this list looks like a state machine (exclusive states)
      const values = listValues.split(',').map(v => v.trim());
      const hasActiveMarker = values.some(v => v.startsWith('(') && v.endsWith(')'));

      if (hasActiveMarker || values.length <= 5) {
        suggestions.push({
          type: 'state_machine',
          description: `LIST '${listName}' could be converted to ListStateMachine`,
          recommendation: `Consider using createExclusiveStateMachine('${listName}', [${values.map(v => `'${v.replace(/[()]/g, '')}'`).join(', ')}]) for event-driven state transitions`,
          lineNumber: lineNum,
        });
      }
    }
  }

  // 2. Detect thread/spawn patterns
  if (options.detectThreadPatterns !== false) {
    const spawnMatches = [...content.matchAll(WLS_PATTERNS.spawnPattern)];
    for (const match of spawnMatches) {
      const passageName = match[1];
      const lineNum = getLineNumber(content, match.index!);

      suggestions.push({
        type: 'thread',
        description: `Thread spawn detected for '${passageName}'`,
        recommendation: `WLS 2.0: Use ThreadedStoryPlayer.spawnThread('${passageName}') for managed thread execution`,
        lineNumber: lineNum,
      });
    }

    const awaitMatches = [...content.matchAll(WLS_PATTERNS.awaitPattern)];
    for (const match of awaitMatches) {
      const threadName = match[1];
      const lineNum = getLineNumber(content, match.index!);

      suggestions.push({
        type: 'thread',
        description: `Thread await detected for '${threadName}'`,
        recommendation: `WLS 2.0: Use await player.awaitThread(threadId) for thread synchronization`,
        lineNumber: lineNum,
      });
    }
  }

  // 3. Detect external function patterns
  if (options.generateExternalStubs !== false) {
    const externalMatches = [...content.matchAll(WLS_PATTERNS.externalCall)];
    for (const match of externalMatches) {
      const funcName = match[2];
      const lineNum = getLineNumber(content, match.index!);

      suggestions.push({
        type: 'external',
        description: `External function '${funcName}' detected`,
        recommendation: `WLS 2.0: Register with ExternalFunctionRegistry.register('${funcName}', implementation)`,
        lineNumber: lineNum,
      });
    }

    // Also detect PascalCase function calls that might be external
    const funcMatches = [...content.matchAll(WLS_PATTERNS.functionCall)];
    for (const match of funcMatches) {
      const funcName = match[1];
      // Skip common keywords
      if (['LIST', 'VAR', 'CONST', 'INCLUDE', 'EXTERNAL', 'If', 'Else'].includes(funcName)) {
        continue;
      }
      const lineNum = getLineNumber(content, match.index!);

      suggestions.push({
        type: 'external',
        description: `Possible external function '${funcName}' detected`,
        recommendation: `If '${funcName}' is a host function, register it with ExternalFunctionRegistry`,
        lineNumber: lineNum,
      });
    }
  }

  // 4. Detect audio references
  if (options.detectAudioReferences !== false) {
    const audioMatches = [...content.matchAll(WLS_PATTERNS.playAudio)];
    for (const match of audioMatches) {
      const audioId = match[2];
      const lineNum = getLineNumber(content, match.index!);

      suggestions.push({
        type: 'audio',
        description: `Audio reference '${audioId}' detected`,
        recommendation: `WLS 2.0: Register with AudioManager.registerTrack({ id: '${audioId}', url: '...', channel: 'sfx' })`,
        lineNumber: lineNum,
      });
    }
  }

  // 5. Detect effect patterns
  if (options.detectEffectPatterns !== false) {
    const effectMatches = [...content.matchAll(WLS_PATTERNS.effectTag)];
    for (const match of effectMatches) {
      const effectName = match[1].toLowerCase();
      const lineNum = getLineNumber(content, match.index!);

      suggestions.push({
        type: 'effect',
        description: `Text effect '${effectName}' detected`,
        recommendation: `WLS 2.0: Use TextEffectManager.applyEffect('${effectName}', text, options, onFrame)`,
        lineNumber: lineNum,
      });
    }

    const delayMatches = [...content.matchAll(WLS_PATTERNS.delayPattern)];
    for (const match of delayMatches) {
      const time = match[1];
      const unit = match[2] || 'ms';
      const lineNum = getLineNumber(content, match.index!);

      suggestions.push({
        type: 'effect',
        description: `Delay pattern '${time}${unit}' detected`,
        recommendation: `WLS 2.0: Use TimedContentManager.schedule(${unit === 's' ? parseFloat(time) * 1000 : time}, content)`,
        lineNumber: lineNum,
      });
    }
  }

  // 6. Add migration comments if requested
  if (options.addMigrationComments && suggestions.length > 0) {
    const commentLines = new Set<number>();
    for (const suggestion of suggestions) {
      if (suggestion.lineNumber && !commentLines.has(suggestion.lineNumber)) {
        commentLines.add(suggestion.lineNumber);
      }
    }

    // Insert comments (from bottom to top to preserve line numbers)
    const sortedLines = Array.from(commentLines).sort((a, b) => b - a);
    const migratedLines = migrated.split('\n');

    for (const lineNum of sortedLines) {
      const relevantSuggestions = suggestions.filter(s => s.lineNumber === lineNum);
      const comments = relevantSuggestions.map(s => `// TODO [WLS 2.0]: ${s.recommendation}`);
      migratedLines.splice(lineNum, 0, ...comments);

      changes.push({
        type: 'comment',
        description: `Added migration comment(s) at line ${lineNum}`,
        lineNumber: lineNum,
      });
    }

    migrated = migratedLines.join('\n');
  }

  return {
    original: content,
    migrated,
    changes,
    suggestions,
  };
}

/**
 * Migrate a full passage
 */
export function migratePassage(
  passage: { title: string; content: string; tags?: string[] },
  options: WLSMigrationOptions = {}
): {
  passage: { title: string; content: string; tags?: string[] };
  result: WLSMigrationResult;
} {
  const result = migrateWLSContent(passage.content, options);

  return {
    passage: {
      ...passage,
      content: result.migrated,
    },
    result,
  };
}

/**
 * Migrate all passages in a story
 */
export function migrateStoryContent(
  passages: Array<{ title: string; content: string; tags?: string[] }>,
  options: WLSMigrationOptions = {}
): {
  passages: Array<{ title: string; content: string; tags?: string[] }>;
  results: Map<string, WLSMigrationResult>;
  summary: WLSMigrationSummary;
} {
  const results = new Map<string, WLSMigrationResult>();
  const migratedPassages: Array<{ title: string; content: string; tags?: string[] }> = [];

  for (const passage of passages) {
    const { passage: migrated, result } = migratePassage(passage, options);
    migratedPassages.push(migrated);
    results.set(passage.title, result);
  }

  const summary = generateMigrationSummary(results);

  return {
    passages: migratedPassages,
    results,
    summary,
  };
}

/**
 * Migration summary
 */
export interface WLSMigrationSummary {
  totalPassages: number;
  passagesWithChanges: number;
  totalChanges: number;
  totalSuggestions: number;
  suggestionsByType: Record<string, number>;
  passagesNeedingReview: string[];
}

/**
 * Generate migration summary
 */
function generateMigrationSummary(
  results: Map<string, WLSMigrationResult>
): WLSMigrationSummary {
  let totalChanges = 0;
  let totalSuggestions = 0;
  let passagesWithChanges = 0;
  const suggestionsByType: Record<string, number> = {};
  const passagesNeedingReview: string[] = [];

  for (const [passageTitle, result] of results) {
    if (result.changes.length > 0 || result.suggestions.length > 0) {
      passagesWithChanges++;
    }

    totalChanges += result.changes.length;
    totalSuggestions += result.suggestions.length;

    for (const suggestion of result.suggestions) {
      suggestionsByType[suggestion.type] = (suggestionsByType[suggestion.type] || 0) + 1;
    }

    if (result.suggestions.length > 0) {
      passagesNeedingReview.push(passageTitle);
    }
  }

  return {
    totalPassages: results.size,
    passagesWithChanges,
    totalChanges,
    totalSuggestions,
    suggestionsByType,
    passagesNeedingReview,
  };
}

/**
 * Get line number from character index
 */
function getLineNumber(content: string, index: number): number {
  const beforeIndex = content.substring(0, index);
  return beforeIndex.split('\n').length;
}

/**
 * Generate WLS 2.0 declarations based on detected patterns
 */
export function generateDeclarations(
  results: Map<string, WLSMigrationResult>
): string {
  const declarations: string[] = [];
  const seenExternals = new Set<string>();
  const seenAudio = new Set<string>();
  const seenEffects = new Set<string>();
  const seenStateMachines = new Set<string>();

  for (const result of results.values()) {
    for (const suggestion of result.suggestions) {
      switch (suggestion.type) {
        case 'external': {
          const match = suggestion.description.match(/function '(\w+)'/);
          if (match && !seenExternals.has(match[1])) {
            seenExternals.add(match[1]);
            declarations.push(`EXTERNAL ${match[1]}()`);
          }
          break;
        }
        case 'audio': {
          const match = suggestion.description.match(/reference '([^']+)'/);
          if (match && !seenAudio.has(match[1])) {
            seenAudio.add(match[1]);
            declarations.push(`AUDIO ${match[1]}: { channel: "sfx", url: "" }`);
          }
          break;
        }
        case 'effect': {
          const match = suggestion.description.match(/effect '(\w+)'/);
          if (match && !seenEffects.has(match[1])) {
            seenEffects.add(match[1]);
            // Built-in effects don't need declarations
            if (!['shake', 'pulse', 'glitch', 'fade', 'typewriter'].includes(match[1])) {
              declarations.push(`EFFECT ${match[1]}: { /* custom effect */ }`);
            }
          }
          break;
        }
        case 'state_machine': {
          const match = suggestion.description.match(/LIST '(\w+)'/);
          if (match && !seenStateMachines.has(match[1])) {
            seenStateMachines.add(match[1]);
            // Add comment suggesting state machine conversion
            declarations.push(`// Consider: ${match[1]} -> ListStateMachine`);
          }
          break;
        }
      }
    }
  }

  if (declarations.length === 0) {
    return '';
  }

  return `// WLS 2.0 Declarations (auto-generated)\n${declarations.join('\n')}\n`;
}

/**
 * Format migration report
 */
export function formatMigrationReport(summary: WLSMigrationSummary): string {
  const lines: string[] = [
    '═══════════════════════════════════════════',
    '         WLS Migration Report              ',
    '═══════════════════════════════════════════',
    '',
    `Total passages analyzed: ${summary.totalPassages}`,
    `Passages with changes:   ${summary.passagesWithChanges}`,
    `Total changes made:      ${summary.totalChanges}`,
    `Total suggestions:       ${summary.totalSuggestions}`,
    '',
  ];

  if (Object.keys(summary.suggestionsByType).length > 0) {
    lines.push('Suggestions by type:');
    for (const [type, count] of Object.entries(summary.suggestionsByType)) {
      lines.push(`  - ${type}: ${count}`);
    }
    lines.push('');
  }

  if (summary.passagesNeedingReview.length > 0) {
    lines.push('Passages needing manual review:');
    for (const passage of summary.passagesNeedingReview.slice(0, 10)) {
      lines.push(`  - ${passage}`);
    }
    if (summary.passagesNeedingReview.length > 10) {
      lines.push(`  ... and ${summary.passagesNeedingReview.length - 10} more`);
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════');

  return lines.join('\n');
}
