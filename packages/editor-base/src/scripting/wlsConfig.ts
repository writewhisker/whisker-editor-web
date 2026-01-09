/**
 * WLS Language Configuration for Monaco Editor
 *
 * Provides syntax highlighting, autocomplete, and language configuration
 * for the Whisker Language Specification.
 */

import * as monaco from 'monaco-editor';
import type { languages } from 'monaco-editor';

/**
 * WLS whisker.* API autocomplete suggestions
 */
const whiskerApiCompletions: Omit<languages.CompletionItem, 'range'>[] = [
  // whisker.state namespace
  {
    label: 'whisker.state.get',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get a variable value from story state',
    insertText: 'whisker.state.get("${1:variableName}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'whisker.state.get(name: string): any',
  },
  {
    label: 'whisker.state.set',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Set a variable value in story state',
    insertText: 'whisker.state.set("${1:variableName}", ${2:value})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'whisker.state.set(name: string, value: any): void',
  },
  {
    label: 'whisker.state.has',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Check if a variable exists in story state',
    insertText: 'whisker.state.has("${1:variableName}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'whisker.state.has(name: string): boolean',
  },
  {
    label: 'whisker.state.delete',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Delete a variable from story state',
    insertText: 'whisker.state.delete("${1:variableName}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'whisker.state.delete(name: string): void',
  },
  {
    label: 'whisker.state.all',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get all variables as a table',
    insertText: 'whisker.state.all()',
    detail: 'whisker.state.all(): table',
  },
  {
    label: 'whisker.state.reset',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Reset all state to initial values',
    insertText: 'whisker.state.reset()',
    detail: 'whisker.state.reset(): void',
  },

  // whisker.passage namespace
  {
    label: 'whisker.passage.current',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get current passage name',
    insertText: 'whisker.passage.current()',
    detail: 'whisker.passage.current(): string',
  },
  {
    label: 'whisker.passage.get',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get passage by name',
    insertText: 'whisker.passage.get("${1:passageName}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'whisker.passage.get(name: string): Passage | nil',
  },
  {
    label: 'whisker.passage.go',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Navigate to a passage',
    insertText: 'whisker.passage.go("${1:passageName}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'whisker.passage.go(name: string): void',
  },
  {
    label: 'whisker.passage.exists',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Check if passage exists',
    insertText: 'whisker.passage.exists("${1:passageName}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'whisker.passage.exists(name: string): boolean',
  },
  {
    label: 'whisker.passage.all',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get list of all passage names',
    insertText: 'whisker.passage.all()',
    detail: 'whisker.passage.all(): string[]',
  },
  {
    label: 'whisker.passage.tags',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get tags for a passage',
    insertText: 'whisker.passage.tags("${1:passageName}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'whisker.passage.tags(name?: string): string[]',
  },

  // whisker.history namespace
  {
    label: 'whisker.history.back',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Go back to previous passage',
    insertText: 'whisker.history.back()',
    detail: 'whisker.history.back(): void',
  },
  {
    label: 'whisker.history.canBack',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Check if can go back',
    insertText: 'whisker.history.canBack()',
    detail: 'whisker.history.canBack(): boolean',
  },
  {
    label: 'whisker.history.list',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get history as array of passage names',
    insertText: 'whisker.history.list()',
    detail: 'whisker.history.list(): string[]',
  },
  {
    label: 'whisker.history.count',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get number of entries in history',
    insertText: 'whisker.history.count()',
    detail: 'whisker.history.count(): number',
  },
  {
    label: 'whisker.history.contains',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Check if passage is in history',
    insertText: 'whisker.history.contains("${1:passageName}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'whisker.history.contains(name: string): boolean',
  },
  {
    label: 'whisker.history.clear',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Clear history',
    insertText: 'whisker.history.clear()',
    detail: 'whisker.history.clear(): void',
  },

  // whisker.choice namespace
  {
    label: 'whisker.choice.available',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get list of available choices',
    insertText: 'whisker.choice.available()',
    detail: 'whisker.choice.available(): Choice[]',
  },
  {
    label: 'whisker.choice.select',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Select a choice by index',
    insertText: 'whisker.choice.select(${1:index})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'whisker.choice.select(index: number): void',
  },
  {
    label: 'whisker.choice.count',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get number of available choices',
    insertText: 'whisker.choice.count()',
    detail: 'whisker.choice.count(): number',
  },

  // Top-level whisker functions
  {
    label: 'visited',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get visit count for a passage',
    insertText: 'visited("${1:passageName}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'visited(passageName?: string): number',
  },
  {
    label: 'random',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Generate random number in range',
    insertText: 'random(${1:min}, ${2:max})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'random(min: number, max: number): number',
  },
  {
    label: 'pick',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Pick random element from array',
    insertText: 'pick({${1:...items}})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'pick(array: any[]): any',
  },
  {
    label: 'print',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Print text to story output',
    insertText: 'print("${1:text}")',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'print(...args: any[]): void',
  },

  // Lua standard library
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
  {
    label: 'math.abs',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get absolute value',
    insertText: 'math.abs(${1:x})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'math.abs(x: number): number',
  },
  {
    label: 'math.min',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get minimum value',
    insertText: 'math.min(${1:...})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'math.min(...numbers): number',
  },
  {
    label: 'math.max',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get maximum value',
    insertText: 'math.max(${1:...})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'math.max(...numbers): number',
  },
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
    documentation: 'Convert to lowercase',
    insertText: 'string.lower(${1:s})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'string.lower(s: string): string',
  },
  {
    label: 'string.upper',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Convert to uppercase',
    insertText: 'string.upper(${1:s})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'string.upper(s: string): string',
  },
  {
    label: 'string.sub',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get substring',
    insertText: 'string.sub(${1:s}, ${2:i}, ${3:j})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'string.sub(s: string, i: number, j?: number): string',
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
    label: 'tonumber',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Convert to number',
    insertText: 'tonumber(${1:e})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'tonumber(e: any): number | nil',
  },
  {
    label: 'tostring',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Convert to string',
    insertText: 'tostring(${1:v})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'tostring(v: any): string',
  },
  {
    label: 'type',
    kind: monaco.languages.CompletionItemKind.Function,
    documentation: 'Get type of value',
    insertText: 'type(${1:v})',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'type(v: any): string',
  },
];

/**
 * WLS directive completions
 */
const directiveCompletions: Omit<languages.CompletionItem, 'range'>[] = [
  {
    label: '@title',
    kind: monaco.languages.CompletionItemKind.Keyword,
    documentation: 'Set story title',
    insertText: '@title: ${1:Title}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Story title directive',
  },
  {
    label: '@author',
    kind: monaco.languages.CompletionItemKind.Keyword,
    documentation: 'Set story author',
    insertText: '@author: ${1:Author Name}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Story author directive',
  },
  {
    label: '@version',
    kind: monaco.languages.CompletionItemKind.Keyword,
    documentation: 'Set story version',
    insertText: '@version: ${1:1.0}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Story version directive',
  },
  {
    label: '@start',
    kind: monaco.languages.CompletionItemKind.Keyword,
    documentation: 'Set starting passage',
    insertText: '@start: ${1:PassageName}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Starting passage directive',
  },
  {
    label: '@vars',
    kind: monaco.languages.CompletionItemKind.Keyword,
    documentation: 'Define story variables',
    insertText: '@vars\n$${1:name} = ${2:value}\n@endvars',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Variables block',
  },
  {
    label: '@fallback',
    kind: monaco.languages.CompletionItemKind.Keyword,
    documentation: 'Set fallback passage when no choices available',
    insertText: '@fallback: ${1:PassageName}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Fallback passage directive',
  },
  {
    label: '@onEnter',
    kind: monaco.languages.CompletionItemKind.Keyword,
    documentation: 'Script to run when entering passage',
    insertText: '@onEnter: ${1:functionName}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'On enter script directive',
  },
  {
    label: '@onExit',
    kind: monaco.languages.CompletionItemKind.Keyword,
    documentation: 'Script to run when exiting passage',
    insertText: '@onExit: ${1:functionName}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'On exit script directive',
  },
];

/**
 * WLS snippet completions
 */
const snippetCompletions: Omit<languages.CompletionItem, 'range'>[] = [
  {
    label: 'passage',
    kind: monaco.languages.CompletionItemKind.Snippet,
    documentation: 'Create a new passage',
    insertText: ':: ${1:PassageName}\n${2:Content}\n',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'New passage',
  },
  {
    label: 'passage-tagged',
    kind: monaco.languages.CompletionItemKind.Snippet,
    documentation: 'Create a new passage with tags',
    insertText: ':: ${1:PassageName} [${2:tag1, tag2}]\n${3:Content}\n',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'New passage with tags',
  },
  {
    label: 'choice-once',
    kind: monaco.languages.CompletionItemKind.Snippet,
    documentation: 'Once-only choice (default)',
    insertText: '+ [${1:Choice text}] -> ${2:Target}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Once-only choice',
  },
  {
    label: 'choice-sticky',
    kind: monaco.languages.CompletionItemKind.Snippet,
    documentation: 'Sticky choice (always available)',
    insertText: '* [${1:Choice text}] -> ${2:Target}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Sticky choice',
  },
  {
    label: 'choice-conditional',
    kind: monaco.languages.CompletionItemKind.Snippet,
    documentation: 'Conditional choice',
    insertText: '+ { ${1:condition} } [${2:Choice text}] -> ${3:Target}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Conditional choice',
  },
  {
    label: 'choice-action',
    kind: monaco.languages.CompletionItemKind.Snippet,
    documentation: 'Choice with action code',
    insertText: '+ [${1:Choice text}] { ${2:code} } -> ${3:Target}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Choice with action',
  },
  {
    label: 'if',
    kind: monaco.languages.CompletionItemKind.Snippet,
    documentation: 'Conditional block',
    insertText: '{ ${1:condition} }\n${2:content}\n{/}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'If conditional',
  },
  {
    label: 'if-else',
    kind: monaco.languages.CompletionItemKind.Snippet,
    documentation: 'Conditional with else',
    insertText: '{ ${1:condition} }\n${2:if content}\n{else}\n${3:else content}\n{/}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'If-else conditional',
  },
  {
    label: 'if-elif-else',
    kind: monaco.languages.CompletionItemKind.Snippet,
    documentation: 'Conditional with elif and else',
    insertText:
      '{ ${1:condition1} }\n${2:content1}\n{elif ${3:condition2}}\n${4:content2}\n{else}\n${5:else content}\n{/}',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'If-elif-else conditional',
  },
  {
    label: 'alternatives-sequence',
    kind: monaco.languages.CompletionItemKind.Snippet,
    documentation: 'Text alternatives (sequence mode)',
    insertText: '{| ${1:first} | ${2:second} | ${3:third} }',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Text alternatives (sequence)',
  },
  {
    label: 'alternatives-cycle',
    kind: monaco.languages.CompletionItemKind.Snippet,
    documentation: 'Text alternatives (cycle mode)',
    insertText: '{|~ ${1:first} | ${2:second} | ${3:third} }',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Text alternatives (cycle)',
  },
  {
    label: 'alternatives-shuffle',
    kind: monaco.languages.CompletionItemKind.Snippet,
    documentation: 'Text alternatives (shuffle mode)',
    insertText: '{|! ${1:first} | ${2:second} | ${3:third} }',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Text alternatives (shuffle)',
  },
  {
    label: 'expression',
    kind: monaco.languages.CompletionItemKind.Snippet,
    documentation: 'Expression statement (side effects only)',
    insertText: '{$ ${1:expression} }',
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail: 'Expression statement',
  },
];

/**
 * Register WLS language support with Monaco
 */
export function registerWlsLanguage(): void {
  // Register WLS language
  monaco.languages.register({ id: 'wls' });

  // Set language configuration
  monaco.languages.setLanguageConfiguration('wls', {
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
      { open: '${', close: '}' },
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
        start: /^\s*::\s*\w/,
        end: /^(?=\s*::\s*\w)/,
      },
    },
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
  });

  // Set syntax highlighting using Monarch tokenizer
  monaco.languages.setMonarchTokensProvider('wls', {
    defaultToken: '',
    tokenPostfix: '.wls',

    // Lua keywords
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

    // Lua built-in functions
    builtins: [
      'assert',
      'error',
      'ipairs',
      'next',
      'pairs',
      'pcall',
      'print',
      'select',
      'tonumber',
      'tostring',
      'type',
      'xpcall',
    ],

    // WLS whisker.* API
    whiskerApi: ['whisker', 'visited', 'random', 'pick', 'math', 'string', 'table'],

    // WLS special targets
    specialTargets: ['END', 'BACK', 'RESTART'],

    // WLS directives
    directives: [
      'title',
      'author',
      'version',
      'start',
      'vars',
      'endvars',
      'fallback',
      'onEnter',
      'onExit',
    ],

    // Operators
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
      '+=',
      '-=',
      '*=',
      '/=',
      '..',
    ],

    symbols: /[=><!~?:&|+\-*\/\^%#]+/,
    escapes: /\\(?:[abfnrtv\\"'\$\{\}]|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4})/,

    tokenizer: {
      root: [
        // Passage marker ::
        [/^::/, 'keyword.passage', '@passageHeader'],

        // WLS directive @name
        [/^@\w+/, { cases: { '@directives': 'keyword.directive', '@default': 'tag' } }],

        // Choice markers at line start
        [/^\s*\+/, 'keyword.choice.once'],
        [/^\s*\*/, 'keyword.choice.sticky'],

        // Arrow for choice target
        [/->/, 'keyword.arrow'],

        // Include common rules
        { include: '@common' },
      ],

      passageHeader: [
        // Passage tags [tag1, tag2]
        [/\[/, 'delimiter.bracket', '@passageTags'],
        // Passage name
        [/[a-zA-Z_][\w\s]*/, 'entity.name.passage'],
        // End of header line
        [/$/, '', '@pop'],
        [/./, '', '@pop'],
      ],

      passageTags: [
        [/\]/, 'delimiter.bracket', '@pop'],
        [/,/, 'delimiter'],
        [/\w+/, 'tag'],
        [/\s+/, ''],
      ],

      common: [
        // Variable interpolation $var or ${expr}
        [/\$\{/, 'variable.interpolation', '@interpolation'],
        [/\$[a-zA-Z_]\w*/, 'variable'],
        [/\$_[a-zA-Z_]\w*/, 'variable.temp'],

        // Conditional block { condition }
        [/\{\/\}|\{\s*\/\s*\}/, 'keyword.conditional.end'],
        [/\{else\}/, 'keyword.conditional.else'],
        [/\{elif\s/, 'keyword.conditional.elif', '@conditionalExpr'],
        [/\{\|[~!]?/, 'keyword.alternatives', '@alternatives'],
        [/\{\$/, 'keyword.expression', '@expressionBlock'],
        [/\{(?!\s*[|$])/, 'keyword.conditional', '@conditionalExpr'],

        // Comments
        [/--\[\[/, 'comment', '@blockComment'],
        [/--.*$/, 'comment'],

        // Identifiers and keywords
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@builtins': 'support.function',
              '@whiskerApi': 'support.class',
              '@specialTargets': 'constant.language',
              '@default': 'identifier',
            },
          },
        ],

        // Whitespace
        [/[ \t\r\n]+/, ''],

        // Delimiters and operators
        [/[{}()\[\]]/, '@brackets'],
        [/@symbols/, { cases: { '@operators': 'operator', '@default': '' } }],

        // Numbers
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/\d+/, 'number'],

        // Delimiter
        [/[;,.]/, 'delimiter'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@stringDouble'],
        [/'/, 'string', '@stringSingle'],
      ],

      interpolation: [
        [/\}/, 'variable.interpolation', '@pop'],
        { include: '@common' },
      ],

      conditionalExpr: [
        [/\}/, 'keyword.conditional', '@pop'],
        { include: '@common' },
      ],

      alternatives: [
        [/\}/, 'keyword.alternatives', '@pop'],
        [/\|/, 'keyword.alternatives.separator'],
        { include: '@common' },
      ],

      expressionBlock: [
        [/\}/, 'keyword.expression', '@pop'],
        { include: '@common' },
      ],

      blockComment: [
        [/[^\]]+/, 'comment'],
        [/\]\]/, 'comment', '@pop'],
        [/[\]]/, 'comment'],
      ],

      stringDouble: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop'],
      ],

      stringSingle: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop'],
      ],
    },
  });

  // Register autocomplete provider
  monaco.languages.registerCompletionItemProvider('wls', {
    triggerCharacters: ['.', '@', '$', '{'],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const lineContent = model.getLineContent(position.lineNumber);
      const charBefore = lineContent.charAt(position.column - 2);

      // Combine all completions
      const allCompletions = [
        ...whiskerApiCompletions,
        ...directiveCompletions,
        ...snippetCompletions,
      ];

      // Filter based on context
      let suggestions = allCompletions;

      // If at start of line, prioritize directives and passages
      if (position.column <= 2) {
        suggestions = [...directiveCompletions, ...snippetCompletions];
      }
      // If after @, only show directives
      else if (charBefore === '@') {
        suggestions = directiveCompletions;
      }
      // If after ., show API methods
      else if (charBefore === '.') {
        suggestions = whiskerApiCompletions.filter(c => c.label.toString().includes('.'));
      }

      return {
        suggestions: suggestions.map(item => ({
          ...item,
          range,
        })),
      };
    },
  });
}

/**
 * Register custom theme for WLS stories
 */
export function registerWlsTheme(): void {
  monaco.editor.defineTheme('wls-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      // Passage structure
      { token: 'keyword.passage', foreground: 'FF79C6', fontStyle: 'bold' },
      { token: 'entity.name.passage', foreground: 'F8F8F2', fontStyle: 'bold' },
      { token: 'tag', foreground: '8BE9FD' },

      // Choices
      { token: 'keyword.choice.once', foreground: 'FFB86C', fontStyle: 'bold' },
      { token: 'keyword.choice.sticky', foreground: '50FA7B', fontStyle: 'bold' },
      { token: 'keyword.arrow', foreground: 'FF79C6' },

      // Directives
      { token: 'keyword.directive', foreground: 'BD93F9', fontStyle: 'bold' },

      // Variables
      { token: 'variable', foreground: 'F1FA8C' },
      { token: 'variable.temp', foreground: 'F1FA8C', fontStyle: 'italic' },
      { token: 'variable.interpolation', foreground: 'F1FA8C' },

      // Conditionals and blocks
      { token: 'keyword.conditional', foreground: 'FF79C6' },
      { token: 'keyword.conditional.end', foreground: 'FF79C6' },
      { token: 'keyword.conditional.else', foreground: 'FF79C6' },
      { token: 'keyword.conditional.elif', foreground: 'FF79C6' },
      { token: 'keyword.alternatives', foreground: '8BE9FD' },
      { token: 'keyword.alternatives.separator', foreground: '8BE9FD' },
      { token: 'keyword.expression', foreground: 'FFB86C' },

      // Lua
      { token: 'keyword', foreground: 'FF79C6' },
      { token: 'support.function', foreground: '50FA7B' },
      { token: 'support.class', foreground: '8BE9FD', fontStyle: 'bold' },
      { token: 'constant.language', foreground: 'BD93F9' },

      // Literals
      { token: 'string', foreground: 'F1FA8C' },
      { token: 'string.escape', foreground: 'FF79C6' },
      { token: 'number', foreground: 'BD93F9' },
      { token: 'number.float', foreground: 'BD93F9' },
      { token: 'number.hex', foreground: 'BD93F9' },

      // Comments
      { token: 'comment', foreground: '6272A4', fontStyle: 'italic' },

      // Operators
      { token: 'operator', foreground: 'FF79C6' },
    ],
    colors: {
      'editor.background': '#282A36',
      'editor.foreground': '#F8F8F2',
      'editorLineNumber.foreground': '#6272A4',
      'editor.selectionBackground': '#44475A',
      'editor.inactiveSelectionBackground': '#44475A80',
      'editorCursor.foreground': '#F8F8F2',
      'editor.lineHighlightBackground': '#44475A50',
    },
  });

  // Also register a light theme
  monaco.editor.defineTheme('wls-light', {
    base: 'vs',
    inherit: true,
    rules: [
      // Passage structure
      { token: 'keyword.passage', foreground: 'D63384', fontStyle: 'bold' },
      { token: 'entity.name.passage', foreground: '1A1A1A', fontStyle: 'bold' },
      { token: 'tag', foreground: '0D6EFD' },

      // Choices
      { token: 'keyword.choice.once', foreground: 'DC6900', fontStyle: 'bold' },
      { token: 'keyword.choice.sticky', foreground: '198754', fontStyle: 'bold' },
      { token: 'keyword.arrow', foreground: 'D63384' },

      // Directives
      { token: 'keyword.directive', foreground: '6F42C1', fontStyle: 'bold' },

      // Variables
      { token: 'variable', foreground: '856404' },
      { token: 'variable.temp', foreground: '856404', fontStyle: 'italic' },
      { token: 'variable.interpolation', foreground: '856404' },

      // Conditionals
      { token: 'keyword.conditional', foreground: 'D63384' },
      { token: 'keyword.conditional.end', foreground: 'D63384' },
      { token: 'keyword.conditional.else', foreground: 'D63384' },
      { token: 'keyword.conditional.elif', foreground: 'D63384' },
      { token: 'keyword.alternatives', foreground: '0D6EFD' },
      { token: 'keyword.alternatives.separator', foreground: '0D6EFD' },
      { token: 'keyword.expression', foreground: 'DC6900' },

      // Lua
      { token: 'keyword', foreground: 'D63384' },
      { token: 'support.function', foreground: '198754' },
      { token: 'support.class', foreground: '0D6EFD', fontStyle: 'bold' },
      { token: 'constant.language', foreground: '6F42C1' },

      // Literals
      { token: 'string', foreground: '198754' },
      { token: 'string.escape', foreground: 'D63384' },
      { token: 'number', foreground: '6F42C1' },

      // Comments
      { token: 'comment', foreground: '6C757D', fontStyle: 'italic' },

      // Operators
      { token: 'operator', foreground: 'D63384' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#1A1A1A',
      'editorLineNumber.foreground': '#6C757D',
      'editor.selectionBackground': '#B4D7FF',
      'editor.inactiveSelectionBackground': '#E8E8E8',
    },
  });
}

/**
 * Initialize WLS support for Monaco Editor
 */
export function initializeWlsSupport(): void {
  registerWlsLanguage();
  registerWlsTheme();
}
