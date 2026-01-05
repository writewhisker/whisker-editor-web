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

// ============================================================================
// AST Transformation Support
// ============================================================================

/**
 * WLS 2.0 reserved words that need renaming if used as identifiers
 */
export const WLS2_RESERVED_WORDS = [
  // Control flow
  'spawn', 'await', 'thread', 'parallel',
  // Type keywords
  'state', 'machine', 'effect', 'audio',
  // Built-in functions
  'emit', 'subscribe', 'transition',
  // Modifiers
  'exclusive', 'concurrent', 'async',
];

/**
 * Deprecated patterns in WLS 1.0
 */
export const DEPRECATED_PATTERNS = [
  {
    pattern: /\bLIST\s+\w+\s*=\s*\([^)]+\)/g,
    message: 'LIST declarations with parenthesized active states are deprecated',
    replacement: 'Use ListStateMachine.create() instead',
    severity: 'warning' as const,
  },
  {
    pattern: /\+\+\s*(\w+)|\(\s*(\w+)\s*\+\+\s*\)/g,
    message: 'Increment operators (++) on list values are deprecated',
    replacement: 'Use stateMachine.transition(value) instead',
    severity: 'warning' as const,
  },
  {
    pattern: /--\s*(\w+)|\(\s*(\w+)\s*--\s*\)/g,
    message: 'Decrement operators (--) on list values are deprecated',
    replacement: 'Use stateMachine.reset() instead',
    severity: 'warning' as const,
  },
  {
    pattern: /\bEXTERNAL\s+\w+\s*\(/g,
    message: 'EXTERNAL function declarations will require explicit registration in WLS 2.0',
    replacement: 'Register with ExternalFunctionRegistry.register()',
    severity: 'info' as const,
  },
  {
    pattern: /\bTUNNEL\s*:/g,
    message: 'TUNNEL syntax is deprecated',
    replacement: 'Use explicit function calls with return values',
    severity: 'warning' as const,
  },
];

/**
 * AST node types for WLS transformation
 */
export interface WLSASTNode {
  type: string;
  value?: string;
  children?: WLSASTNode[];
  line?: number;
  column?: number;
}

/**
 * AST transformation options
 */
export interface ASTTransformOptions {
  /** Transform LIST declarations to state machine calls */
  transformLists?: boolean;
  /** Rename reserved words */
  renameReservedWords?: boolean;
  /** Transform variable syntax */
  transformVariables?: boolean;
  /** Generate deprecation warnings */
  generateDeprecationWarnings?: boolean;
  /** Custom reserved word prefix for renaming */
  reservedWordPrefix?: string;
}

/**
 * AST transformation result
 */
export interface ASTTransformResult {
  transformed: string;
  changes: ASTChange[];
  warnings: DeprecationWarning[];
  renamedIdentifiers: Map<string, string>;
}

/**
 * AST change record
 */
export interface ASTChange {
  type: 'rename' | 'transform' | 'remove' | 'add';
  original: string;
  replacement: string;
  line: number;
  description: string;
}

/**
 * Deprecation warning
 */
export interface DeprecationWarning {
  message: string;
  replacement: string;
  severity: 'info' | 'warning' | 'error';
  line: number;
  code: string;
}

/**
 * Detect reserved word usage in content
 */
export function detectReservedWords(content: string): Array<{
  word: string;
  line: number;
  column: number;
  context: string;
}> {
  const results: Array<{ word: string; line: number; column: number; context: string }> = [];
  const lines = content.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    for (const word of WLS2_RESERVED_WORDS) {
      // Match word as identifier (not inside string or comment)
      const regex = new RegExp(`\\b${word}\\b(?=\\s*[=:(])`, 'g');
      let match;

      while ((match = regex.exec(line)) !== null) {
        // Skip if inside string or comment
        const beforeMatch = line.substring(0, match.index);
        const inString = (beforeMatch.match(/"/g) || []).length % 2 !== 0;
        const inComment = beforeMatch.includes('//') || beforeMatch.includes('--');

        if (!inString && !inComment) {
          results.push({
            word,
            line: lineNum + 1,
            column: match.index + 1,
            context: line.trim(),
          });
        }
      }
    }
  }

  return results;
}

/**
 * Rename reserved words in content
 */
export function renameReservedWords(
  content: string,
  options: { prefix?: string; suffix?: string } = {}
): { content: string; renames: Map<string, string> } {
  const prefix = options.prefix || '_wls_';
  const suffix = options.suffix || '';
  const renames = new Map<string, string>();
  let result = content;

  for (const word of WLS2_RESERVED_WORDS) {
    // Only rename if used as identifier
    const identifierRegex = new RegExp(`\\b(${word})\\b(?=\\s*[=:(])`, 'g');

    if (identifierRegex.test(result)) {
      const newName = `${prefix}${word}${suffix}`;
      renames.set(word, newName);

      // Replace all occurrences as identifiers
      result = result.replace(
        new RegExp(`\\b${word}\\b`, 'g'),
        (match, offset) => {
          const beforeMatch = result.substring(0, offset);
          const inString = (beforeMatch.match(/"/g) || []).length % 2 !== 0;
          const inComment = beforeMatch.includes('//') || beforeMatch.includes('--');
          return inString || inComment ? match : newName;
        }
      );
    }
  }

  return { content: result, renames };
}

/**
 * Detect deprecated patterns in content
 */
export function detectDeprecations(content: string): DeprecationWarning[] {
  const warnings: DeprecationWarning[] = [];
  const lines = content.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    for (const deprecated of DEPRECATED_PATTERNS) {
      const matches = line.match(deprecated.pattern);
      if (matches) {
        warnings.push({
          message: deprecated.message,
          replacement: deprecated.replacement,
          severity: deprecated.severity,
          line: lineNum + 1,
          code: line.trim(),
        });
      }
    }
  }

  return warnings;
}

/**
 * Transform WLS 1.0 content to WLS 2.0 syntax
 */
export function transformToWLS2(
  content: string,
  options: ASTTransformOptions = {}
): ASTTransformResult {
  const {
    transformLists = true,
    renameReservedWords: doRename = true,
    transformVariables = true,
    generateDeprecationWarnings = true,
    reservedWordPrefix = '_wls_',
  } = options;

  let transformed = content;
  const changes: ASTChange[] = [];
  const warnings: DeprecationWarning[] = [];
  let renamedIdentifiers = new Map<string, string>();

  const lines = content.split('\n');

  // 1. Detect and add deprecation warnings
  if (generateDeprecationWarnings) {
    warnings.push(...detectDeprecations(content));
  }

  // 2. Rename reserved words
  if (doRename) {
    const reserved = detectReservedWords(content);
    if (reserved.length > 0) {
      const result = renameReservedWords(transformed, { prefix: reservedWordPrefix });
      transformed = result.content;
      renamedIdentifiers = result.renames;

      for (const [original, newName] of result.renames) {
        changes.push({
          type: 'rename',
          original,
          replacement: newName,
          line: 0, // Applies to all occurrences
          description: `Renamed reserved word '${original}' to '${newName}'`,
        });
      }
    }
  }

  // 3. Transform LIST declarations to state machine calls
  if (transformLists) {
    transformed = transformed.replace(
      /^(\s*)LIST\s+(\w+)\s*=\s*(.+)$/gm,
      (match, indent, name, values, offset) => {
        const lineNum = content.substring(0, offset).split('\n').length;

        // Parse values
        const valueList = values.split(',').map((v: string) => v.trim());
        const hasActiveState = valueList.some((v: string) => v.startsWith('(') && v.endsWith(')'));

        // Determine active state if any
        let activeState = '';
        const cleanValues = valueList.map((v: string) => {
          if (v.startsWith('(') && v.endsWith(')')) {
            activeState = v.slice(1, -1);
            return activeState;
          }
          return v;
        });

        changes.push({
          type: 'transform',
          original: match.trim(),
          replacement: `${indent}-- STATE_MACHINE: ${name}`,
          line: lineNum,
          description: `Transformed LIST '${name}' to state machine declaration`,
        });

        // Generate state machine style comment/code
        const stateList = cleanValues.map((v: string) => `"${v}"`).join(', ');
        const declaration = `${indent}-- WLS 2.0: Use createExclusiveStateMachine("${name}", [${stateList}])`;
        const initialState = activeState ? `\n${indent}-- Initial state: "${activeState}"` : '';

        return declaration + initialState;
      }
    );
  }

  // 4. Transform variable syntax
  if (transformVariables) {
    // Transform ${var} to {var}
    const dollarBraceCount = (transformed.match(/\$\{(\w+)\}/g) || []).length;
    if (dollarBraceCount > 0) {
      transformed = transformed.replace(/\$\{(\w+)\}/g, '{$1}');
      changes.push({
        type: 'transform',
        original: '${var}',
        replacement: '{var}',
        line: 0,
        description: `Transformed ${dollarBraceCount} variable interpolation(s) from \${var} to {var}`,
      });
    }

    // Transform $var to {var} (outside of conditions)
    transformed = transformed.replace(
      /(?<![{])\$(\w+)(?![}])/g,
      (match, varName, offset) => {
        // Don't transform inside conditions or existing braces
        const before = transformed.substring(Math.max(0, offset - 10), offset);
        if (before.includes('{') || before.includes('if ') || before.includes('when ')) {
          return match;
        }
        return `{${varName}}`;
      }
    );
  }

  return {
    transformed,
    changes,
    warnings,
    renamedIdentifiers,
  };
}

/**
 * Format deprecation warnings for display
 */
export function formatDeprecationWarnings(warnings: DeprecationWarning[]): string {
  if (warnings.length === 0) {
    return '';
  }

  const lines: string[] = [
    '',
    '⚠️  Deprecation Warnings',
    '─'.repeat(40),
  ];

  const grouped = new Map<string, DeprecationWarning[]>();

  for (const warning of warnings) {
    const key = warning.message;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(warning);
  }

  for (const [message, items] of grouped) {
    const icon = items[0].severity === 'error' ? '❌' : items[0].severity === 'warning' ? '⚠️' : 'ℹ️';
    lines.push(`${icon} ${message}`);
    lines.push(`   Replacement: ${items[0].replacement}`);
    lines.push(`   Occurrences: ${items.length}`);
    if (items.length <= 3) {
      for (const item of items) {
        lines.push(`     Line ${item.line}: ${item.code.substring(0, 50)}${item.code.length > 50 ? '...' : ''}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Validate content for WLS 2.0 compatibility
 */
export function validateWLS2Compatibility(content: string): {
  compatible: boolean;
  issues: Array<{ type: string; message: string; line: number }>;
} {
  const issues: Array<{ type: string; message: string; line: number }> = [];

  // Check for reserved words
  const reservedWords = detectReservedWords(content);
  for (const usage of reservedWords) {
    issues.push({
      type: 'reserved_word',
      message: `'${usage.word}' is a reserved word in WLS 2.0`,
      line: usage.line,
    });
  }

  // Check for deprecated patterns
  const deprecations = detectDeprecations(content);
  for (const dep of deprecations) {
    if (dep.severity === 'error') {
      issues.push({
        type: 'deprecated',
        message: dep.message,
        line: dep.line,
      });
    }
  }

  return {
    compatible: issues.length === 0,
    issues,
  };
}

// ============================================================================
// Thread Migration Patterns
// ============================================================================

/**
 * Thread migration patterns for WLS 1.0 to 2.0
 */
export const THREAD_PATTERNS = {
  // Legacy spawn patterns
  spawn: /\bspawn\s+["']?(\w+)["']?\s*(?:\((.*?)\))?/g,
  // Legacy await patterns
  await: /\bawait\s+["']?(\w+)["']?/g,
  // Legacy parallel block
  parallel: /@parallel\s*\{([^}]+)\}/g,
  // Legacy thread join
  join: /\bjoin\s+["']?(\w+)["']?/g,
  // Legacy thread cancel
  cancel: /\bcancel\s+["']?(\w+)["']?/g,
};

/**
 * Thread migration result
 */
export interface ThreadMigrationResult {
  transformed: string;
  threadDeclarations: string[];
  changes: Array<{
    type: 'spawn' | 'await' | 'parallel' | 'join' | 'cancel';
    original: string;
    replacement: string;
    line: number;
  }>;
}

/**
 * Transform thread patterns from WLS 1.0 to WLS 2.0
 */
export function transformThreadPatterns(content: string): ThreadMigrationResult {
  let transformed = content;
  const changes: ThreadMigrationResult['changes'] = [];
  const threadDeclarations: string[] = [];
  const detectedThreads = new Set<string>();

  // Transform spawn patterns
  transformed = transformed.replace(
    /\bspawn\s+["']?(\w+)["']?\s*(?:\((.*?)\))?/g,
    (match, threadName, args, offset) => {
      const lineNum = content.substring(0, offset).split('\n').length;
      detectedThreads.add(threadName);

      const replacement = args
        ? `ThreadedStoryPlayer.spawnThread("${threadName}", { args: [${args}] })`
        : `ThreadedStoryPlayer.spawnThread("${threadName}")`;

      changes.push({
        type: 'spawn',
        original: match,
        replacement,
        line: lineNum,
      });

      return replacement;
    }
  );

  // Transform await patterns
  transformed = transformed.replace(
    /\bawait\s+["']?(\w+)["']?/g,
    (match, threadName, offset) => {
      const lineNum = content.substring(0, offset).split('\n').length;
      const replacement = `await ThreadedStoryPlayer.awaitThread("${threadName}")`;

      changes.push({
        type: 'await',
        original: match,
        replacement,
        line: lineNum,
      });

      return replacement;
    }
  );

  // Transform parallel blocks
  transformed = transformed.replace(
    /@parallel\s*\{([^}]+)\}/g,
    (match, body, offset) => {
      const lineNum = content.substring(0, offset).split('\n').length;
      const statements = body.split(';').map((s: string) => s.trim()).filter((s: string) => s);

      const replacement = `await ThreadedStoryPlayer.parallel([\n${statements.map((s: string) => `    () => ${s}`).join(',\n')}\n  ])`;

      changes.push({
        type: 'parallel',
        original: match,
        replacement,
        line: lineNum,
      });

      return replacement;
    }
  );

  // Transform join patterns
  transformed = transformed.replace(
    /\bjoin\s+["']?(\w+)["']?/g,
    (match, threadName, offset) => {
      const lineNum = content.substring(0, offset).split('\n').length;
      const replacement = `await ThreadedStoryPlayer.joinThread("${threadName}")`;

      changes.push({
        type: 'join',
        original: match,
        replacement,
        line: lineNum,
      });

      return replacement;
    }
  );

  // Transform cancel patterns
  transformed = transformed.replace(
    /\bcancel\s+["']?(\w+)["']?/g,
    (match, threadName, offset) => {
      const lineNum = content.substring(0, offset).split('\n').length;
      const replacement = `ThreadedStoryPlayer.cancelThread("${threadName}")`;

      changes.push({
        type: 'cancel',
        original: match,
        replacement,
        line: lineNum,
      });

      return replacement;
    }
  );

  // Generate thread declarations
  for (const thread of detectedThreads) {
    threadDeclarations.push(`THREAD ${thread}: { passage: "${thread}", autoStart: false }`);
  }

  return {
    transformed,
    threadDeclarations,
    changes,
  };
}

// ============================================================================
// Timed Content Migration Patterns
// ============================================================================

/**
 * Timed content patterns for WLS 1.0 to 2.0
 */
export const TIMED_CONTENT_PATTERNS = {
  // Delay pattern: @delay(1000) or @delay(1s) or @delay 500ms
  delay: /@delay\s*\(?\s*(\d+(?:\.\d+)?)\s*(s|ms|sec|seconds?)?\s*\)?/gi,
  // Wait pattern: wait 1000 or wait 1s
  wait: /\bwait\s+(\d+(?:\.\d+)?)\s*(s|ms|sec|seconds?)?/gi,
  // Typewriter effect: <typewriter>text</typewriter> or <typewriter speed="50">
  typewriter: /<typewriter(?:\s+speed\s*=\s*["']?(\d+)["']?)?>([^<]*)<\/typewriter>/gi,
  // Timed text: {text|delay:1000}
  timedText: /\{([^|]+)\|delay:(\d+)\}/g,
  // Auto-advance: @auto(5000) or @auto 5s
  autoAdvance: /@auto\s*\(?\s*(\d+(?:\.\d+)?)\s*(s|ms)?\s*\)?/gi,
  // Pause: @pause or @pause(click)
  pause: /@pause\s*(?:\(([^)]*)\))?/gi,
};

/**
 * Timed content migration result
 */
export interface TimedContentMigrationResult {
  transformed: string;
  changes: Array<{
    type: 'delay' | 'wait' | 'typewriter' | 'timedText' | 'autoAdvance' | 'pause';
    original: string;
    replacement: string;
    line: number;
  }>;
}

/**
 * Convert time value to milliseconds
 */
function toMilliseconds(value: number, unit?: string): number {
  if (!unit) return value; // Assume milliseconds if no unit
  const u = unit.toLowerCase();
  if (u === 's' || u === 'sec' || u === 'second' || u === 'seconds') {
    return value * 1000;
  }
  return value; // Default to milliseconds
}

/**
 * Transform timed content patterns from WLS 1.0 to WLS 2.0
 */
export function transformTimedContentPatterns(content: string): TimedContentMigrationResult {
  let transformed = content;
  const changes: TimedContentMigrationResult['changes'] = [];

  // Transform delay patterns
  transformed = transformed.replace(
    /@delay\s*\(?\s*(\d+(?:\.\d+)?)\s*(s|ms|sec|seconds?)?\s*\)?/gi,
    (match, time, unit, offset) => {
      const lineNum = content.substring(0, offset).split('\n').length;
      const ms = toMilliseconds(parseFloat(time), unit);
      const replacement = `await TimedContentManager.delay(${ms})`;

      changes.push({
        type: 'delay',
        original: match,
        replacement,
        line: lineNum,
      });

      return replacement;
    }
  );

  // Transform wait patterns
  transformed = transformed.replace(
    /\bwait\s+(\d+(?:\.\d+)?)\s*(s|ms|sec|seconds?)?/gi,
    (match, time, unit, offset) => {
      const lineNum = content.substring(0, offset).split('\n').length;
      const ms = toMilliseconds(parseFloat(time), unit);
      const replacement = `await TimedContentManager.delay(${ms})`;

      changes.push({
        type: 'wait',
        original: match,
        replacement,
        line: lineNum,
      });

      return replacement;
    }
  );

  // Transform typewriter effects
  transformed = transformed.replace(
    /<typewriter(?:\s+speed\s*=\s*["']?(\d+)["']?)?>([^<]*)<\/typewriter>/gi,
    (match, speed, text, offset) => {
      const lineNum = content.substring(0, offset).split('\n').length;
      const speedVal = speed ? parseInt(speed) : 50;
      const replacement = `<span data-effect="typewriter" data-speed="${speedVal}">${text}</span>`;

      changes.push({
        type: 'typewriter',
        original: match,
        replacement,
        line: lineNum,
      });

      return replacement;
    }
  );

  // Transform timed text patterns
  transformed = transformed.replace(
    /\{([^|]+)\|delay:(\d+)\}/g,
    (match, text, delayMs, offset) => {
      const lineNum = content.substring(0, offset).split('\n').length;
      const replacement = `<span data-timed="${delayMs}">${text}</span>`;

      changes.push({
        type: 'timedText',
        original: match,
        replacement,
        line: lineNum,
      });

      return replacement;
    }
  );

  // Transform auto-advance patterns
  transformed = transformed.replace(
    /@auto\s*\(?\s*(\d+(?:\.\d+)?)\s*(s|ms)?\s*\)?/gi,
    (match, time, unit, offset) => {
      const lineNum = content.substring(0, offset).split('\n').length;
      const ms = toMilliseconds(parseFloat(time), unit);
      const replacement = `TimedContentManager.setAutoAdvance(${ms})`;

      changes.push({
        type: 'autoAdvance',
        original: match,
        replacement,
        line: lineNum,
      });

      return replacement;
    }
  );

  // Transform pause patterns
  transformed = transformed.replace(
    /@pause\s*(?:\(([^)]*)\))?/gi,
    (match, trigger, offset) => {
      const lineNum = content.substring(0, offset).split('\n').length;
      const triggerType = trigger?.trim() || 'click';
      const replacement = `await TimedContentManager.waitForTrigger("${triggerType}")`;

      changes.push({
        type: 'pause',
        original: match,
        replacement,
        line: lineNum,
      });

      return replacement;
    }
  );

  return {
    transformed,
    changes,
  };
}

/**
 * Full WLS 1.0 to 2.0 content transformation
 * Combines all transformation functions
 */
export function transformFullContent(
  content: string,
  options: {
    transformThreads?: boolean;
    transformTimedContent?: boolean;
    transformVariables?: boolean;
    transformLists?: boolean;
    renameReservedWords?: boolean;
    generateWarnings?: boolean;
  } = {}
): {
  transformed: string;
  threadChanges: ThreadMigrationResult['changes'];
  timedContentChanges: TimedContentMigrationResult['changes'];
  astChanges: ASTChange[];
  warnings: DeprecationWarning[];
  declarations: string[];
} {
  const {
    transformThreads = true,
    transformTimedContent = true,
    transformVariables = true,
    transformLists = true,
    renameReservedWords: doRenameReserved = true,
    generateWarnings = true,
  } = options;

  let result = content;
  let threadChanges: ThreadMigrationResult['changes'] = [];
  let timedContentChanges: TimedContentMigrationResult['changes'] = [];
  let astChanges: ASTChange[] = [];
  let warnings: DeprecationWarning[] = [];
  const declarations: string[] = [];

  // 1. Transform thread patterns
  if (transformThreads) {
    const threadResult = transformThreadPatterns(result);
    result = threadResult.transformed;
    threadChanges = threadResult.changes;
    declarations.push(...threadResult.threadDeclarations);
  }

  // 2. Transform timed content patterns
  if (transformTimedContent) {
    const timedResult = transformTimedContentPatterns(result);
    result = timedResult.transformed;
    timedContentChanges = timedResult.changes;
  }

  // 3. Apply AST transformations (variables, lists, reserved words)
  const astResult = transformToWLS2(result, {
    transformVariables,
    transformLists,
    renameReservedWords: doRenameReserved,
    generateDeprecationWarnings: generateWarnings,
  });
  result = astResult.transformed;
  astChanges = astResult.changes;
  warnings = astResult.warnings;

  return {
    transformed: result,
    threadChanges,
    timedContentChanges,
    astChanges,
    warnings,
    declarations,
  };
}
