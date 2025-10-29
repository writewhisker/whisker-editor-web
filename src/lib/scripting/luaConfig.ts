/**
 * Lua Language Configuration for Monaco Editor
 *
 * Provides syntax highlighting, autocomplete, and Story API definitions.
 */

import * as monaco from 'monaco-editor';
import type { languages } from 'monaco-editor';

/**
 * Story API autocomplete suggestions
 */
const storyApiCompletions: languages.CompletionItem[] = [
  // Variables API
  {
    label: 'game_state.get',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get a variable value from game state',
    insertText: 'game_state.get("${1:variableName}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'game_state.get(name: string): any',
  },
  {
    label: 'game_state.set',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Set a variable value in game state',
    insertText: 'game_state.set("${1:variableName}", ${2:value})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'game_state.set(name: string, value: any): void',
  },
  {
    label: 'game_state.exists',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Check if a variable exists in game state',
    insertText: 'game_state.exists("${1:variableName}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'game_state.exists(name: string): boolean',
  },
  {
    label: 'game_state.delete',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Delete a variable from game state',
    insertText: 'game_state.delete("${1:variableName}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'game_state.delete(name: string): void',
  },

  // Passages API
  {
    label: 'passages.get',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get passage by ID or name',
    insertText: 'passages.get("${1:passageId}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'passages.get(id: string): Passage | null',
  },
  {
    label: 'passages.current',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get current passage',
    insertText: 'passages.current()',
    detail: 'passages.current(): Passage',
  },
  {
    label: 'passages.goto',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Navigate to a passage',
    insertText: 'passages.goto("${1:passageId}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'passages.goto(id: string): void',
  },
  {
    label: 'passages.list',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get list of all passages',
    insertText: 'passages.list()',
    detail: 'passages.list(): Passage[]',
  },

  // History API
  {
    label: 'history.length',
    kind: monaco.languages.CompletionItemKind.Property,
    documentation: 'Get length of history',
    insertText: 'history.length',
    detail: 'history.length: number',
  },
  {
    label: 'history.back',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Go back in history',
    insertText: 'history.back()',
    detail: 'history.back(): void',
  },
  {
    label: 'history.get',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get history entry at index',
    insertText: 'history.get(${1:index})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'history.get(index: number): HistoryEntry | null',
  },

  // Tags API
  {
    label: 'tags.has',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Check if current passage has a tag',
    insertText: 'tags.has("${1:tagName}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'tags.has(tag: string): boolean',
  },
  {
    label: 'tags.list',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get list of all tags for current passage',
    insertText: 'tags.list()',
    detail: 'tags.list(): string[]',
  },

  // Output API
  {
    label: 'print',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Print text to story output',
    insertText: 'print("${1:text}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'print(text: string): void',
  },
  {
    label: 'format',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Format text with variables',
    insertText: 'format("${1:template}", ${2:...args})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'format(template: string, ...args: any[]): string',
  },

  // Math helpers
  {
    label: 'random',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Generate random number between min and max',
    insertText: 'random(${1:min}, ${2:max})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'random(min: number, max: number): number',
  },
  {
    label: 'choice',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Pick random element from array',
    insertText: 'choice({${1:...items}})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'choice(array: any[]): any',
  },

  // Lua standard library
  {
    label: 'string.format',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Format string with values',
    insertText: 'string.format("${1:format}", ${2:...})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'string.format(format: string, ...): string',
  },
  {
    label: 'string.len',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get string length',
    insertText: 'string.len(${1:s})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'string.len(s: string): number',
  },
  {
    label: 'string.lower',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Convert string to lowercase',
    insertText: 'string.lower(${1:s})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'string.lower(s: string): string',
  },
  {
    label: 'string.upper',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Convert string to uppercase',
    insertText: 'string.upper(${1:s})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'string.upper(s: string): string',
  },
  {
    label: 'table.insert',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Insert element into table',
    insertText: 'table.insert(${1:t}, ${2:value})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'table.insert(t: table, value: any): void',
  },
  {
    label: 'table.remove',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Remove element from table',
    insertText: 'table.remove(${1:t}, ${2:pos})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'table.remove(t: table, pos?: number): any',
  },
  {
    label: 'math.random',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Generate random number',
    insertText: 'math.random(${1:m}, ${2:n})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'math.random(m?: number, n?: number): number',
  },
  {
    label: 'math.floor',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Round down to nearest integer',
    insertText: 'math.floor(${1:x})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'math.floor(x: number): number',
  },
  {
    label: 'math.ceil',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Round up to nearest integer',
    insertText: 'math.ceil(${1:x})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'math.ceil(x: number): number',
  },
];

/**
 * Register Lua language support with Monaco
 */
export function registerLuaLanguage(): void {
  // Register Lua language
  monaco.languages.register({ id: 'lua' });

  // Set language configuration
  monaco.languages.setLanguageConfiguration('lua', {
    comments: {
      lineComment: '--',
      blockComment: ['--[[', ']]'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    folding: {
      markers: {
        start: /^\s*--\s*#?region\b/,
        end: /^\s*--\s*#?endregion\b/,
      },
    },
  });

  // Set syntax highlighting
  monaco.languages.setMonarchTokensProvider('lua', {
    defaultToken: '',
    tokenPostfix: '.lua',

    keywords: [
      'and',
      'break',
      'do',
      'else',
      'elseif',
      'end',
      'false',
      'for',
      'function',
      'goto',
      'if',
      'in',
      'local',
      'nil',
      'not',
      'or',
      'repeat',
      'return',
      'then',
      'true',
      'until',
      'while',
    ],

    builtins: [
      '_G',
      '_VERSION',
      'assert',
      'collectgarbage',
      'dofile',
      'error',
      'getfenv',
      'getmetatable',
      'ipairs',
      'load',
      'loadfile',
      'loadstring',
      'module',
      'next',
      'pairs',
      'pcall',
      'print',
      'rawequal',
      'rawget',
      'rawset',
      'require',
      'select',
      'setfenv',
      'setmetatable',
      'tonumber',
      'tostring',
      'type',
      'unpack',
      'xpcall',
    ],

    storyApi: [
      'game_state',
      'passages',
      'history',
      'tags',
      'random',
      'choice',
      'format',
    ],

    operators: [
      '+',
      '-',
      '*',
      '/',
      '%',
      '^',
      '#',
      '==',
      '~=',
      '<=',
      '>=',
      '<',
      '>',
      '=',
      '(',
      ')',
      '{',
      '}',
      '[',
      ']',
      ';',
      ':',
      ',',
      '.',
      '..',
      '...',
    ],

    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    tokenizer: {
      root: [
        // identifiers and keywords
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@builtins': 'type.identifier',
              '@storyApi': 'support.function',
              '@default': 'identifier',
            },
          },
        ],

        // whitespace
        { include: '@whitespace' },

        // delimiters and operators
        [/[{}()\[\]]/, '@brackets'],
        [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],

        // numbers
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/\d+/, 'number'],

        // delimiter: after number because of .\d floats
        [/[;,.]/, 'delimiter'],

        // strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
        [/'([^'\\]|\\.)*$/, 'string.invalid'], // non-teminated string
        [/"/, 'string', '@string."'],
        [/'/, 'string', "@string.'"],
      ],

      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/--\[\[/, 'comment', '@comment'],
        [/--.*$/, 'comment'],
      ],

      comment: [
        [/[^\]]+/, 'comment'],
        [/\]\]/, 'comment', '@pop'],
        [/[\]]/, 'comment'],
      ],

      string: [
        [/[^\\"']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [
          /["']/,
          {
            cases: {
              '$#==$S2': { token: 'string', next: '@pop' },
              '@default': 'string',
            },
          },
        ],
      ],
    },
  });

  // Register autocomplete provider
  monaco.languages.registerCompletionItemProvider('lua', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return {
        suggestions: storyApiCompletions.map(item => ({
          ...item,
          range,
        })),
      };
    },
  });
}

/**
 * Register custom theme for Story scripting
 */
export function registerStoryTheme(): void {
  monaco.editor.defineTheme('story-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'support.function', foreground: '4EC9B0', fontStyle: 'bold' },
      { token: 'keyword', foreground: 'C586C0' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'comment', foreground: '6A9955' },
      { token: 'type.identifier', foreground: '4FC1FF' },
    ],
    colors: {
      'editor.background': '#1e1e1e',
      'editor.foreground': '#d4d4d4',
      'editorLineNumber.foreground': '#858585',
      'editor.selectionBackground': '#264f78',
      'editor.inactiveSelectionBackground': '#3a3d41',
    },
  });
}

/**
 * Initialize Lua support for Monaco Editor
 */
export function initializeLuaSupport(): void {
  registerLuaLanguage();
  registerStoryTheme();
}
