/**
 * WLS 1.0 Language Server
 * Language Server Protocol implementation for WLS
 * WLS 1.0 Gap 6: Developer Experience
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
} from 'vscode-languageserver/node.js';

import {
  TextDocument,
} from 'vscode-languageserver-textdocument';

import { Parser } from '@writewhisker/parser';
import type { StoryNode, PassageNode } from '@writewhisker/parser';
import { createDefaultValidator } from '@writewhisker/story-validation';
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

      const result: InitializeResult = {
        capabilities: {
          textDocumentSync: TextDocumentSyncKind.Incremental,
          completionProvider: {
            resolveProvider: true,
            triggerCharacters: ['$', '-', '>', '[', '.', ':'],
          },
          hoverProvider: true,
          definitionProvider: true,
          referencesProvider: true,
          documentSymbolProvider: true,
          foldingRangeProvider: true,
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
      if (this.hasConfigurationCapability) {
        this.connection.client.register(
          'workspace/didChangeConfiguration',
          undefined
        );
      }
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
    const story = parseResult.story;

    // Validate the story
    const validator = createDefaultValidator();
    const issues = story ? validator.validate(story) : [];

    // Add parse errors
    for (const error of parseResult.errors) {
      issues.push({
        message: error.message,
        severity: 'error',
        line: error.location.start.line,
        column: error.location.start.column,
        code: error.code,
        suggestion: error.suggestion,
      });
    }

    // Cache the result
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
          detail: `Function(${func.parameters.map(p => p.name).join(', ')})`,
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
}

// Start server if run directly
const server = new WhiskerLanguageServer();
server.start();

export { WhiskerLanguageServer };
