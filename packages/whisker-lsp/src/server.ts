/**
 * Language Server
 *
 * Language Server Protocol implementation for WLS.
 * Implements WLS Chapter 14.2 capabilities.
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentSyncKind,
  CompletionItem,
  CompletionItemKind,
  Hover,
  Definition,
  Location,
  Range,
  Position,
  Diagnostic,
  DiagnosticSeverity,
  CodeAction,
  CodeActionKind,
  CodeActionParams,
  WorkspaceEdit,
  TextEdit,
  RenameParams,
  DocumentSymbol,
  DocumentSymbolParams,
  SymbolKind,
  FoldingRange,
  FoldingRangeParams,
  FoldingRangeKind,
} from 'vscode-languageserver/node.js';

import {
  TextDocument,
} from 'vscode-languageserver-textdocument';

import {
  Parser,
  parseErrorToFormatted,
  generateSuggestion,
  findSimilarName,
  type FormattedError,
} from '@writewhisker/parser';
import type { StoryNode, PassageNode } from '@writewhisker/parser';
import type { ValidationIssue, ValidationSeverity } from '@writewhisker/story-validation';

/**
 * Document cache entry
 */
interface DocumentCache {
  version: number;
  story: StoryNode | null;
  issues: ValidationIssue[];
}

/**
 * WLS Language Server
 */
export class WhiskerLanguageServer {
  private connection = createConnection(ProposedFeatures.all);
  private documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
  private documentCache: Map<string, DocumentCache> = new Map();
  private hasConfigurationCapability = false;
  private hasWorkspaceFolderCapability = false;

  constructor() {
    this.setupHandlers();
  }

  /**
   * Start the language server
   */
  start(): void {
    this.documents.listen(this.connection);
    this.connection.listen();
  }

  /**
   * Setup connection handlers
   */
  private setupHandlers(): void {
    this.connection.onInitialize((params: InitializeParams): InitializeResult => {
      const capabilities = params.capabilities;

      this.hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
      );
      this.hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
      );

      // WLS Chapter 14.2.1 - Supported Capabilities
      const result: InitializeResult = {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental,
          completionProvider: {
            resolveProvider: true,
            // WLS Chapter 14.2.2 - Completion Triggers
            triggerCharacters: ['$', '-', '>', '[', '.', ':', '_'],
          },
          hoverProvider: true,
          definitionProvider: true,
          referencesProvider: true,
          documentSymbolProvider: true,
          foldingRangeProvider: true,
          // WLS Chapter 14.2 - Additional capabilities
          codeActionProvider: {
            codeActionKinds: [CodeActionKind.QuickFix],
          },
          renameProvider: {
            prepareProvider: true,
          },
        },
      };

      if (this.hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
          workspaceFolders: {
            supported: true,
          },
        };
      }

      return result;
    });

    this.connection.onInitialized(() => {
      // Configuration support is already enabled via capabilities
    });

    // Document events
    this.documents.onDidChangeContent((change) => {
      this.validateDocument(change.document);
    });

    this.documents.onDidOpen((event) => {
      this.validateDocument(event.document);
    });

    // Completion
    this.connection.onCompletion((params) => {
      return this.getCompletions(params.textDocument.uri, params.position);
    });

    this.connection.onCompletionResolve((item) => {
      return item;
    });

    // Hover
    this.connection.onHover((params) => {
      return this.getHover(params.textDocument.uri, params.position);
    });

    // Definition
    this.connection.onDefinition((params) => {
      return this.getDefinition(params.textDocument.uri, params.position);
    });

    // References
    this.connection.onReferences((params) => {
      return this.getReferences(params.textDocument.uri, params.position);
    });

    // Code Actions (Quick Fixes) - WLS Chapter 14.2
    this.connection.onCodeAction((params: CodeActionParams) => {
      return this.getCodeActions(params);
    });

    // Document Symbols - WLS Chapter 14.2.1
    this.connection.onDocumentSymbol((params: DocumentSymbolParams) => {
      return this.getDocumentSymbols(params.textDocument.uri);
    });

    // Folding Ranges - WLS Chapter 14.2.1
    this.connection.onFoldingRanges((params: FoldingRangeParams) => {
      return this.getFoldingRanges(params.textDocument.uri);
    });

    // Rename - WLS Chapter 14.2.1
    this.connection.onPrepareRename((params) => {
      return this.prepareRename(params.textDocument.uri, params.position);
    });

    this.connection.onRenameRequest((params: RenameParams) => {
      return this.doRename(params);
    });
  }

  /**
   * Parse and validate a document
   */
  private validateDocument(document: TextDocument): void {
    const uri = document.uri;
    const content = document.getText();

    // Parse the document
    const parser = new Parser();
    const parseResult = parser.parse(content);
    const story = parseResult.ast;

    // Collect issues
    const issues: ValidationIssue[] = [];

    // Add parse errors as validation issues
    for (const error of parseResult.errors) {
      issues.push({
        id: `parse-${error.code}`,
        code: error.code,
        category: 'syntax',
        fixable: false,
        message: error.message,
        severity: 'error',
        line: error.location.start.line,
        column: error.location.start.column,
        suggestion: error.suggestion,
      });
    }

    // Cache the result (note: we don't validate AST since validator expects Story model)
    this.documentCache.set(uri, {
      version: document.version,
      story,
      issues,
    });

    // Send diagnostics
    const diagnostics: Diagnostic[] = issues.map((issue) => ({
      severity: this.mapSeverity(issue.severity),
      range: {
        start: Position.create((issue.line ?? 1) - 1, (issue.column ?? 1) - 1),
        end: Position.create((issue.line ?? 1) - 1, (issue.column ?? 1) - 1 + (issue.length ?? 1)),
      },
      message: issue.message,
      code: issue.code,
      source: 'whisker',
    }));

    this.connection.sendDiagnostics({ uri, diagnostics });
  }

  /**
   * Map WLS severity to LSP severity
   */
  private mapSeverity(severity: ValidationSeverity): DiagnosticSeverity {
    switch (severity) {
      case 'error': return DiagnosticSeverity.Error;
      case 'warning': return DiagnosticSeverity.Warning;
      case 'info': return DiagnosticSeverity.Information;
      default: return DiagnosticSeverity.Hint;
    }
  }

  /**
   * Get completions at position
   */
  private getCompletions(uri: string, position: Position): CompletionItem[] {
    const document = this.documents.get(uri);
    if (!document) return [];

    const cache = this.documentCache.get(uri);
    if (!cache?.story) return [];

    const text = document.getText();
    const offset = document.offsetAt(position);
    const lineText = text.split('\n')[position.line] ?? '';
    const charBefore = lineText.charAt(position.character - 1);
    const textBefore = lineText.substring(0, position.character);

    const completions: CompletionItem[] = [];

    // Passage completions after ->
    if (textBefore.match(/->\s*\w*$/)) {
      for (const passage of cache.story.passages) {
        completions.push({
          label: passage.name,
          kind: CompletionItemKind.Class,
          detail: 'Passage',
          documentation: this.getPassagePreview(passage),
        });
      }
      // Add special targets
      completions.push(
        { label: 'END', kind: CompletionItemKind.Keyword, detail: 'End the story' },
        { label: 'BACK', kind: CompletionItemKind.Keyword, detail: 'Go back to previous passage' },
        { label: 'RESTART', kind: CompletionItemKind.Keyword, detail: 'Restart the story' }
      );
    }

    // Variable completions after $
    if (charBefore === '$' || textBefore.match(/\$\w*$/)) {
      for (const variable of cache.story.variables) {
        completions.push({
          label: variable.name,
          kind: CompletionItemKind.Variable,
          detail: `Variable (${variable.initialValue?.type ?? 'unknown'})`,
        });
      }
    }

    // Function completions
    if (cache.story.functions) {
      for (const func of cache.story.functions) {
        completions.push({
          label: func.name,
          kind: CompletionItemKind.Function,
          detail: `Function(${func.params.map(p => p.name).join(', ')})`,
        });
      }
    }

    return completions;
  }

  /**
   * Get hover information
   */
  private getHover(uri: string, position: Position): Hover | null {
    const document = this.documents.get(uri);
    if (!document) return null;

    const cache = this.documentCache.get(uri);
    if (!cache?.story) return null;

    const word = this.getWordAtPosition(document, position);
    if (!word) return null;

    // Check if it's a passage name
    const passage = cache.story.passages.find(p => p.name === word);
    if (passage) {
      return {
        contents: {
          kind: 'markdown',
          value: this.getPassageHoverContent(passage, cache.story),
        },
      };
    }

    // Check if it's a variable
    if (word.startsWith('$')) {
      const varName = word.substring(1);
      const variable = cache.story.variables.find(v => v.name === varName);
      if (variable) {
        return {
          contents: {
            kind: 'markdown',
            value: this.getVariableHoverContent(variable),
          },
        };
      }
    }

    return null;
  }

  /**
   * Get definition location
   */
  private getDefinition(uri: string, position: Position): Definition | null {
    const document = this.documents.get(uri);
    if (!document) return null;

    const cache = this.documentCache.get(uri);
    if (!cache?.story) return null;

    const word = this.getWordAtPosition(document, position);
    if (!word) return null;

    // Find passage definition
    const passage = cache.story.passages.find(p => p.name === word);
    if (passage) {
      return Location.create(uri, Range.create(
        Position.create(passage.location.start.line - 1, passage.location.start.column - 1),
        Position.create(passage.location.end.line - 1, passage.location.end.column - 1)
      ));
    }

    return null;
  }

  /**
   * Get references to a symbol
   */
  private getReferences(uri: string, position: Position): Location[] | null {
    const document = this.documents.get(uri);
    if (!document) return null;

    const cache = this.documentCache.get(uri);
    if (!cache?.story) return null;

    const word = this.getWordAtPosition(document, position);
    if (!word) return null;

    const locations: Location[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    // Find all references to the passage name
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    for (let i = 0; i < lines.length; i++) {
      let match;
      while ((match = regex.exec(lines[i])) !== null) {
        locations.push(Location.create(uri, Range.create(
          Position.create(i, match.index),
          Position.create(i, match.index + word.length)
        )));
      }
    }

    return locations;
  }

  /**
   * Get word at position
   */
  private getWordAtPosition(document: TextDocument, position: Position): string | null {
    const text = document.getText();
    const offset = document.offsetAt(position);

    // Find word boundaries
    let start = offset;
    let end = offset;

    // Extend backwards
    while (start > 0 && /[\w$_]/.test(text.charAt(start - 1))) {
      start--;
    }

    // Extend forwards
    while (end < text.length && /[\w$_]/.test(text.charAt(end))) {
      end++;
    }

    if (start === end) return null;
    return text.substring(start, end);
  }

  /**
   * Get passage preview for completion
   */
  private getPassagePreview(passage: PassageNode): string {
    // Get first few lines of content
    const contentNodes = passage.content.filter(n => n.type === 'text');
    const preview = contentNodes.slice(0, 3).map(n =>
      'value' in n ? (n as any).value : ''
    ).join('\n');
    return preview.substring(0, 200) + (preview.length > 200 ? '...' : '');
  }

  /**
   * Get passage hover content
   */
  private getPassageHoverContent(passage: PassageNode, story: StoryNode): string {
    const lines: string[] = [];
    lines.push(`## :: ${passage.name}`);
    if (passage.tags.length > 0) {
      lines.push(`Tags: ${passage.tags.join(', ')}`);
    }
    lines.push('---');
    lines.push(this.getPassagePreview(passage));
    lines.push('');

    // Count choices
    const choiceCount = passage.content.filter(n => n.type === 'choice').length;
    lines.push(`Choices: ${choiceCount}`);

    // Find referencing passages
    const referencedBy: string[] = [];
    for (const p of story.passages) {
      for (const node of p.content) {
        if (node.type === 'choice' && 'target' in node && (node as any).target?.name === passage.name) {
          referencedBy.push(p.name);
          break;
        }
      }
    }
    if (referencedBy.length > 0) {
      lines.push(`Referenced by: ${referencedBy.slice(0, 5).join(', ')}${referencedBy.length > 5 ? '...' : ''}`);
    }

    return lines.join('\n');
  }

  /**
   * Get variable hover content
   */
  private getVariableHoverContent(variable: any): string {
    const lines: string[] = [];
    lines.push(`## $${variable.name}`);
    lines.push(`Type: ${variable.initialValue?.type ?? 'unknown'}`);
    if (variable.initialValue) {
      lines.push(`Initial value: ${JSON.stringify(variable.initialValue.value)}`);
    }
    return lines.join('\n');
  }

  // ==========================================================================
  // Code Actions (Quick Fixes) - WLS Chapter 14.2
  // ==========================================================================

  /**
   * Get code actions for diagnostics
   */
  private getCodeActions(params: CodeActionParams): CodeAction[] {
    const document = this.documents.get(params.textDocument.uri);
    if (!document) return [];

    const cache = this.documentCache.get(params.textDocument.uri);
    if (!cache?.story) return [];

    const actions: CodeAction[] = [];

    // Check each diagnostic for possible fixes
    for (const diagnostic of params.context.diagnostics) {
      const code = diagnostic.code?.toString() || '';

      // Dead link - suggest similar passage names
      if (code === 'WLS-LNK-001' || diagnostic.message.includes('non-existent passage')) {
        const passageNames = cache.story.passages.map(p => p.name);
        const match = diagnostic.message.match(/\"([^\"]+)\"/);
        if (match) {
          const targetName = match[1];
          const similar = findSimilarName(targetName, passageNames);
          if (similar) {
            actions.push({
              title: `Change to "${similar}"`,
              kind: CodeActionKind.QuickFix,
              diagnostics: [diagnostic],
              edit: {
                changes: {
                  [params.textDocument.uri]: [{
                    range: diagnostic.range,
                    newText: similar,
                  }],
                },
              },
            });
          }
        }
      }

      // Unclosed conditional - add closing brace
      if (code === 'WLS-SYN-005' || diagnostic.message.includes('closing brace')) {
        const line = diagnostic.range.start.line;
        actions.push({
          title: 'Add {/} to close conditional',
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          edit: {
            changes: {
              [params.textDocument.uri]: [{
                range: Range.create(
                  Position.create(line, 0),
                  Position.create(line, 0)
                ),
                newText: '{/}\n',
              }],
            },
          },
        });
      }

      // Unclosed formatting - add closing marker
      if (code === 'WLS-PRS-006' || diagnostic.message.includes('Unclosed')) {
        const match = diagnostic.message.match(/expected\s+(\S+)/i);
        if (match) {
          const marker = match[1];
          const endPos = diagnostic.range.end;
          actions.push({
            title: `Add closing ${marker}`,
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            edit: {
              changes: {
                [params.textDocument.uri]: [{
                  range: Range.create(endPos, endPos),
                  newText: marker,
                }],
              },
            },
          });
        }
      }
    }

    return actions;
  }

  // ==========================================================================
  // Document Symbols - WLS Chapter 14.2.1
  // ==========================================================================

  /**
   * Get document symbols (outline)
   */
  private getDocumentSymbols(uri: string): DocumentSymbol[] {
    const cache = this.documentCache.get(uri);
    if (!cache?.story) return [];

    const symbols: DocumentSymbol[] = [];

    // Add passages
    for (const passage of cache.story.passages) {
      const passageSymbol: DocumentSymbol = {
        name: passage.name,
        kind: SymbolKind.Class,
        range: Range.create(
          Position.create(passage.location.start.line - 1, passage.location.start.column - 1),
          Position.create(passage.location.end.line - 1, passage.location.end.column - 1)
        ),
        selectionRange: Range.create(
          Position.create(passage.location.start.line - 1, passage.location.start.column - 1),
          Position.create(passage.location.start.line - 1, passage.location.start.column - 1 + passage.name.length + 3)
        ),
        children: [],
      };

      // Add choices as children
      for (const node of passage.content) {
        if (node.type === 'choice') {
          const choice = node as any;
          passageSymbol.children!.push({
            name: choice.text || `-> ${choice.target}`,
            kind: SymbolKind.Method,
            range: Range.create(
              Position.create(node.location.start.line - 1, node.location.start.column - 1),
              Position.create(node.location.end.line - 1, node.location.end.column - 1)
            ),
            selectionRange: Range.create(
              Position.create(node.location.start.line - 1, node.location.start.column - 1),
              Position.create(node.location.start.line - 1, node.location.start.column - 1 + 10)
            ),
          });
        }
      }

      symbols.push(passageSymbol);
    }

    // Add variables
    for (const variable of cache.story.variables) {
      symbols.push({
        name: `$${variable.name}`,
        kind: SymbolKind.Variable,
        range: Range.create(
          Position.create((variable as any).location?.start?.line - 1 || 0, 0),
          Position.create((variable as any).location?.end?.line - 1 || 0, 100)
        ),
        selectionRange: Range.create(
          Position.create((variable as any).location?.start?.line - 1 || 0, 0),
          Position.create((variable as any).location?.start?.line - 1 || 0, variable.name.length + 1)
        ),
      });
    }

    return symbols;
  }

  // ==========================================================================
  // Folding Ranges - WLS Chapter 14.2.1
  // ==========================================================================

  /**
   * Get folding ranges
   */
  private getFoldingRanges(uri: string): FoldingRange[] {
    const cache = this.documentCache.get(uri);
    if (!cache?.story) return [];

    const ranges: FoldingRange[] = [];

    // Fold passages
    for (const passage of cache.story.passages) {
      ranges.push({
        startLine: passage.location.start.line - 1,
        endLine: passage.location.end.line - 1,
        kind: FoldingRangeKind.Region,
      });
    }

    // Fold conditionals (would need AST traversal)
    // For now, just fold passages

    return ranges;
  }

  // ==========================================================================
  // Rename - WLS Chapter 14.2.1
  // ==========================================================================

  /**
   * Prepare rename - validate the symbol can be renamed
   */
  private prepareRename(uri: string, position: Position): Range | null {
    const document = this.documents.get(uri);
    if (!document) return null;

    const word = this.getWordAtPosition(document, position);
    if (!word) return null;

    const cache = this.documentCache.get(uri);
    if (!cache?.story) return null;

    // Check if it's a passage name
    const passage = cache.story.passages.find(p => p.name === word);
    if (passage) {
      const text = document.getText();
      const lines = text.split('\n');
      const lineText = lines[position.line];
      const wordStart = lineText.indexOf(word);
      if (wordStart >= 0) {
        return Range.create(
          Position.create(position.line, wordStart),
          Position.create(position.line, wordStart + word.length)
        );
      }
    }

    // Check if it's a variable
    if (word.startsWith('$')) {
      const varName = word.substring(1);
      const variable = cache.story.variables.find(v => v.name === varName);
      if (variable) {
        const text = document.getText();
        const lines = text.split('\n');
        const lineText = lines[position.line];
        const wordStart = lineText.indexOf(word);
        if (wordStart >= 0) {
          return Range.create(
            Position.create(position.line, wordStart),
            Position.create(position.line, wordStart + word.length)
          );
        }
      }
    }

    return null;
  }

  /**
   * Perform rename
   */
  private doRename(params: RenameParams): WorkspaceEdit | null {
    const document = this.documents.get(params.textDocument.uri);
    if (!document) return null;

    const word = this.getWordAtPosition(document, params.position);
    if (!word) return null;

    const cache = this.documentCache.get(params.textDocument.uri);
    if (!cache?.story) return null;

    const text = document.getText();
    const lines = text.split('\n');
    const edits: TextEdit[] = [];

    // Find all occurrences and create edits
    const isVariable = word.startsWith('$');
    const searchWord = isVariable ? word : word;
    const newName = isVariable && !params.newName.startsWith('$')
      ? `$${params.newName}`
      : params.newName;

    const regex = new RegExp(`\\b${searchWord.replace('$', '\\$')}\\b`, 'g');

    for (let i = 0; i < lines.length; i++) {
      let match;
      while ((match = regex.exec(lines[i])) !== null) {
        edits.push({
          range: Range.create(
            Position.create(i, match.index),
            Position.create(i, match.index + searchWord.length)
          ),
          newText: newName,
        });
      }
    }

    if (edits.length === 0) return null;

    return {
      changes: {
        [params.textDocument.uri]: edits,
      },
    };
  }
}

// Start server if run directly
const server = new WhiskerLanguageServer();
server.start();
