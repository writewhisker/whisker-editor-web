/**
 * VS Code Extension Helpers
 *
 * Utilities for creating VS Code extensions for Whisker stories.
 * Provides language support, syntax highlighting, and editor commands.
 */

import type { Story, Passage } from '@writewhisker/story-models';

export interface VSCodeLanguageConfiguration {
  comments?: {
    lineComment?: string;
    blockComment?: [string, string];
  };
  brackets?: Array<[string, string]>;
  autoClosingPairs?: Array<{ open: string; close: string; notIn?: string[] }>;
  surroundingPairs?: Array<{ open: string; close: string }>;
  folding?: {
    markers?: {
      start: RegExp;
      end: RegExp;
    };
  };
}

export interface VSCodeTokensProvider {
  provideDocumentSymbols(document: string): DocumentSymbol[];
  provideCompletionItems(document: string, position: number): CompletionItem[];
  provideHover(document: string, position: number): HoverInfo | null;
  provideDefinition(document: string, position: number): Location | null;
}

export interface DocumentSymbol {
  name: string;
  kind: SymbolKind;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

export enum SymbolKind {
  File = 0,
  Module = 1,
  Namespace = 2,
  Package = 3,
  Class = 4,
  Method = 5,
  Property = 6,
  Field = 7,
  Constructor = 8,
  Enum = 9,
  Interface = 10,
  Function = 11,
  Variable = 12,
  Constant = 13,
  String = 14,
  Number = 15,
  Boolean = 16,
  Array = 17,
  Object = 18,
  Key = 19,
  Null = 20,
}

export interface CompletionItem {
  label: string;
  kind: CompletionItemKind;
  detail?: string;
  documentation?: string;
  insertText?: string;
}

export enum CompletionItemKind {
  Text = 0,
  Method = 1,
  Function = 2,
  Constructor = 3,
  Field = 4,
  Variable = 5,
  Class = 6,
  Interface = 7,
  Module = 8,
  Property = 9,
  Unit = 10,
  Value = 11,
  Enum = 12,
  Keyword = 13,
  Snippet = 14,
  Color = 15,
  File = 16,
  Reference = 17,
}

export interface HoverInfo {
  contents: string[];
  range?: Range;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Position {
  line: number;
  character: number;
}

/**
 * Whisker Language Configuration for VS Code
 */
export const whiskerLanguageConfig: VSCodeLanguageConfiguration = {
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
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
    { open: '"', close: '"', notIn: ['string'] },
    { open: "'", close: "'", notIn: ['string'] },
    { open: '[[', close: ']]' }, // Whisker links
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '[[', close: ']]' },
  ],
  folding: {
    markers: {
      start: /^\s*\/\/\s*#region/,
      end: /^\s*\/\/\s*#endregion/,
    },
  },
};

/**
 * Whisker Tokens Provider for Syntax Highlighting
 */
export class WhiskerTokensProvider implements VSCodeTokensProvider {
  /**
   * Provide document symbols (outline view)
   */
  public provideDocumentSymbols(document: string): DocumentSymbol[] {
    const symbols: DocumentSymbol[] = [];
    const lines = document.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect passage headers (e.g., ":: Passage Name")
      const passageMatch = line.match(/^::\s+(.+?)(?:\s+\[(.+?)\])?$/);
      if (passageMatch) {
        symbols.push({
          name: passageMatch[1].trim(),
          kind: SymbolKind.Module,
          range: {
            start: { line: i, character: 0 },
            end: { line: i, character: line.length },
          },
          selectionRange: {
            start: { line: i, character: 0 },
            end: { line: i, character: line.length },
          },
        });
      }

      // Detect links (e.g., "[[Target]]" or "[[Text|Target]]")
      const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
      let linkMatch;
      while ((linkMatch = linkRegex.exec(line)) !== null) {
        const target = linkMatch[2] || linkMatch[1];
        symbols.push({
          name: `→ ${target}`,
          kind: SymbolKind.String,
          range: {
            start: { line: i, character: linkMatch.index },
            end: { line: i, character: linkMatch.index + linkMatch[0].length },
          },
          selectionRange: {
            start: { line: i, character: linkMatch.index },
            end: { line: i, character: linkMatch.index + linkMatch[0].length },
          },
        });
      }
    }

    return symbols;
  }

  /**
   * Provide completion items (autocomplete)
   */
  public provideCompletionItems(document: string, position: number): CompletionItem[] {
    const items: CompletionItem[] = [];
    const beforeCursor = document.substring(0, position);

    // If user is typing "[[", suggest passage names
    if (beforeCursor.endsWith('[[')) {
      const passages = this.extractPassageNames(document);
      for (const passage of passages) {
        items.push({
          label: passage,
          kind: CompletionItemKind.Reference,
          detail: 'Link to passage',
          insertText: `${passage}]]`,
        });
      }
    }

    // Suggest common Whisker syntax
    if (beforeCursor.match(/^\s*$/)) {
      items.push(
        {
          label: ':: Passage',
          kind: CompletionItemKind.Snippet,
          detail: 'Create new passage',
          insertText: ':: ${1:Passage Name}\n$0',
        },
        {
          label: '[[Link]]',
          kind: CompletionItemKind.Snippet,
          detail: 'Create link',
          insertText: '[[${1:Target}]]',
        },
        {
          label: '[[Text|Target]]',
          kind: CompletionItemKind.Snippet,
          detail: 'Create link with custom text',
          insertText: '[[${1:Link Text}|${2:Target}]]',
        }
      );
    }

    return items;
  }

  /**
   * Provide hover information
   */
  public provideHover(document: string, position: number): HoverInfo | null {
    const lines = document.split('\n');
    let currentPos = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = currentPos;
      const lineEnd = currentPos + line.length;

      if (position >= lineStart && position <= lineEnd) {
        const charPos = position - lineStart;

        // Check if hovering over a link
        const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
        let linkMatch;
        while ((linkMatch = linkRegex.exec(line)) !== null) {
          if (charPos >= linkMatch.index && charPos <= linkMatch.index + linkMatch[0].length) {
            const target = linkMatch[2] || linkMatch[1];
            const linkText = linkMatch[2] ? linkMatch[1] : target;
            return {
              contents: [
                `**Link to:** ${target}`,
                linkMatch[2] ? `**Display text:** ${linkText}` : '',
              ].filter(Boolean),
            };
          }
        }

        // Check if hovering over a passage header
        const passageMatch = line.match(/^::\s+(.+?)(?:\s+\[(.+?)\])?$/);
        if (passageMatch) {
          const tags = passageMatch[2] ? passageMatch[2].split(/\s+/) : [];
          return {
            contents: [
              `**Passage:** ${passageMatch[1]}`,
              tags.length > 0 ? `**Tags:** ${tags.join(', ')}` : '',
            ].filter(Boolean),
          };
        }
      }

      currentPos = lineEnd + 1; // +1 for newline
    }

    return null;
  }

  /**
   * Provide definition (go to passage)
   */
  public provideDefinition(document: string, position: number): Location | null {
    const lines = document.split('\n');
    let currentPos = 0;

    // Find the link at the cursor position
    let targetPassage: string | null = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = currentPos;
      const lineEnd = currentPos + line.length;

      if (position >= lineStart && position <= lineEnd) {
        const charPos = position - lineStart;

        // Check if cursor is in a link
        const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
        let linkMatch;
        while ((linkMatch = linkRegex.exec(line)) !== null) {
          if (charPos >= linkMatch.index && charPos <= linkMatch.index + linkMatch[0].length) {
            targetPassage = linkMatch[2] || linkMatch[1];
            break;
          }
        }
        break;
      }

      currentPos = lineEnd + 1;
    }

    if (!targetPassage) return null;

    // Find the passage definition
    currentPos = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const passageMatch = line.match(/^::\s+(.+?)(?:\s+\[(.+?)\])?$/);
      if (passageMatch && passageMatch[1].trim() === targetPassage) {
        return {
          uri: 'current-document', // In real implementation, this would be the document URI
          range: {
            start: { line: i, character: 0 },
            end: { line: i, character: line.length },
          },
        };
      }
      currentPos += line.length + 1;
    }

    return null;
  }

  private extractPassageNames(document: string): string[] {
    const passages: string[] = [];
    const lines = document.split('\n');

    for (const line of lines) {
      const match = line.match(/^::\s+(.+?)(?:\s+\[(.+?)\])?$/);
      if (match) {
        passages.push(match[1].trim());
      }
    }

    return passages;
  }
}

/**
 * Command Palette Commands
 */
export interface VSCodeCommand {
  command: string;
  title: string;
  category: string;
  handler: (args?: any) => void | Promise<void>;
}

export function createWhiskerCommands(story: Story): VSCodeCommand[] {
  return [
    {
      command: 'whisker.createPassage',
      title: 'Create New Passage',
      category: 'Whisker',
      handler: async () => {
        // Implementation would prompt for passage name and create it
        console.log('Create new passage');
      },
    },
    {
      command: 'whisker.renamePassage',
      title: 'Rename Passage',
      category: 'Whisker',
      handler: async () => {
        console.log('Rename passage');
      },
    },
    {
      command: 'whisker.deletePassage',
      title: 'Delete Passage',
      category: 'Whisker',
      handler: async () => {
        console.log('Delete passage');
      },
    },
    {
      command: 'whisker.findBrokenLinks',
      title: 'Find Broken Links',
      category: 'Whisker',
      handler: async () => {
        console.log('Find broken links');
      },
    },
    {
      command: 'whisker.showStoryMap',
      title: 'Show Story Map',
      category: 'Whisker',
      handler: async () => {
        console.log('Show story map');
      },
    },
    {
      command: 'whisker.exportStory',
      title: 'Export Story',
      category: 'Whisker',
      handler: async () => {
        console.log('Export story');
      },
    },
    {
      command: 'whisker.importStory',
      title: 'Import Story',
      category: 'Whisker',
      handler: async () => {
        console.log('Import story');
      },
    },
  ];
}

/**
 * Diagnostics Provider (linting)
 */
export interface Diagnostic {
  range: Range;
  message: string;
  severity: DiagnosticSeverity;
  source: string;
}

export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3,
}

export function provideDiagnostics(document: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const lines = document.split('\n');

  // Extract all passage names
  const passageNames = new Set<string>();
  for (const line of lines) {
    const match = line.match(/^::\s+(.+?)(?:\s+\[(.+?)\])?$/);
    if (match) {
      passageNames.add(match[1].trim());
    }
  }

  // Check for broken links
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let linkMatch;

    while ((linkMatch = linkRegex.exec(line)) !== null) {
      const target = linkMatch[2] || linkMatch[1];
      if (!passageNames.has(target)) {
        diagnostics.push({
          range: {
            start: { line: i, character: linkMatch.index },
            end: { line: i, character: linkMatch.index + linkMatch[0].length },
          },
          message: `Broken link: Passage "${target}" not found`,
          severity: DiagnosticSeverity.Error,
          source: 'whisker',
        });
      }
    }
  }

  return diagnostics;
}
