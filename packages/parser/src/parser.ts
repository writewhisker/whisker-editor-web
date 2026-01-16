/**
 * WLS Parser
 * Recursive descent parser for Whisker Language Specification
 */

import { Lexer } from './lexer';
import type { Token, SourceSpan } from './types';
import { TokenType } from './types';
import type {
  StoryNode,
  PassageNode,
  PassageMetadataNode,
  MetadataNode,
  VariableDeclarationNode,
  ListDeclarationNode,
  ListValueNode,
  ArrayDeclarationNode,
  ArrayElementNode,
  MapDeclarationNode,
  MapEntryNode,
  IncludeDeclarationNode,
  FunctionDeclarationNode,
  FunctionParameterNode,
  NamespaceDeclarationNode,
  ContentNode,
  TextNode,
  InterpolationNode,
  DoBlockNode,
  ConditionalNode,
  ConditionalBranchNode,
  ChoiceNode,
  AlternativesNode,
  GatherNode,
  TunnelCallNode,
  TunnelReturnNode,
  HookDefinitionNode,
  HookOperationNode,
  ThreadPassageNode,
  AwaitExpressionNode,
  SpawnExpressionNode,
  ExpressionNode,
  VariableNode,
  CallExpressionNode,
  MemberExpressionNode,
  ParseError,
  ParseResult,
  BinaryOperator,
  AssignmentOperator,
  WLSErrorCode,
  AudioDeclarationNode,
  EffectDeclarationNode,
  ExternalDeclarationNode,
  FormattedTextNode,
  BlockquoteNode,
  ListNode,
  ListItemNode,
  HorizontalRuleNode,
  ImageNode,
  AudioNode,
  VideoNode,
  EmbedNode,
  MediaAttributes,
  AudioAttributes,
  VideoAttributes,
  EmbedAttributes,
  ThemeDirectiveNode,
  StyleBlockNode,
  ClassedBlockNode,
  ClassedInlineNode,
} from './ast';
import { WLS_ERROR_CODES } from './ast';
import {
  parseAudioDeclaration,
  parseEffectDeclaration,
  parseExternalDeclaration,
} from './declarations';

/**
 * Parser for WLS format
 */
export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private errors: ParseError[] = [];
  private namespaceStack: string[] = [];  // Current namespace context

  /**
   * Parse source code into an AST
   */
  parse(source: string): ParseResult {
    const lexer = new Lexer(source);
    const lexResult = lexer.tokenize();

    // Add lexer errors
    this.errors = lexResult.errors.map(e => ({
      message: e.message,
      location: { start: e.location, end: e.location },
      suggestion: e.suggestion,
    }));

    this.tokens = lexResult.tokens;
    this.pos = 0;

    // Handle empty input
    if (this.tokens.length === 0 || (this.tokens.length === 1 && this.tokens[0].type === TokenType.EOF)) {
      const emptyLocation: SourceSpan = {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 1, offset: 0 },
      };
      return {
        ast: {
          type: 'story',
          metadata: [],
          variables: [],
          lists: [],
          arrays: [],
          maps: [],
          includes: [],
          functions: [],
          namespaces: [],
          threads: [],
          audioDeclarations: [],
          effectDeclarations: [],
          externalDeclarations: [],
          theme: null,
          styles: null,
          passages: [],
          location: emptyLocation,
        },
        errors: this.errors,
      };
    }

    try {
      const ast = this.parseStory();
      return { ast, errors: this.errors };
    } catch (e) {
      const error = e as Error;
      this.addError(error.message);
      return { ast: null, errors: this.errors };
    }
  }

  // ============================================================================
  // Token Helpers
  // ============================================================================

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.pos] || this.tokens[this.tokens.length - 1];
  }

  private peekNext(): Token {
    return this.tokens[this.pos + 1] || this.tokens[this.tokens.length - 1];
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.pos++;
    }
    return this.tokens[this.pos - 1];
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private expect(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw this.error(message);
  }

  private error(message: string): Error {
    this.addError(message);
    return new Error(message);
  }

  private addError(
    message: string,
    options?: {
      code?: WLSErrorCode;
      suggestion?: string;
      severity?: 'error' | 'warning';
    }
  ): void {
    this.errors.push({
      message,
      location: this.peek().location,
      code: options?.code,
      suggestion: options?.suggestion,
      severity: options?.severity || 'error',
    });
  }

  private skipNewlines(): void {
    while (this.match(TokenType.NEWLINE)) {
      // Skip
    }
  }

  private skipToNextLine(): void {
    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      this.advance();
    }
    this.match(TokenType.NEWLINE);
  }

  private getLocation(start: Token, end?: Token): SourceSpan {
    return {
      start: start.location.start,
      end: (end || this.tokens[this.pos - 1]).location.end,
    };
  }

  // ============================================================================
  // Story Parsing
  // ============================================================================

  private parseStory(): StoryNode {
    const start = this.peek();
    const metadata: MetadataNode[] = [];
    const variables: VariableDeclarationNode[] = [];
    const lists: ListDeclarationNode[] = [];
    const arrays: ArrayDeclarationNode[] = [];
    const maps: MapDeclarationNode[] = [];
    const includes: IncludeDeclarationNode[] = [];
    const functions: FunctionDeclarationNode[] = [];
    const namespaces: NamespaceDeclarationNode[] = [];
    const passages: PassageNode[] = [];
    const threads: ThreadPassageNode[] = [];  // Thread passages
    const audioDeclarations: AudioDeclarationNode[] = [];      // Audio declarations
    const effectDeclarations: EffectDeclarationNode[] = [];    // Effect declarations
    const externalDeclarations: ExternalDeclarationNode[] = []; // External declarations
    let theme: ThemeDirectiveNode | null = null;               // Theme directive
    let styles: StyleBlockNode | null = null;                  // Style block

    this.namespaceStack = [];  // Reset namespace context

    this.skipNewlines();

    // Handle empty input
    if (this.isAtEnd()) {
      return {
        type: 'story',
        metadata,
        variables,
        lists,
        arrays,
        maps,
        includes,
        functions,
        namespaces,
        theme,
        styles,
        passages,
        threads,
        audioDeclarations,
        effectDeclarations,
        externalDeclarations,
        location: this.getLocation(start),
      };
    }

    // Parse metadata, variables, collections, and modules before first passage
    while (!this.isAtEnd() && !this.check(TokenType.PASSAGE_MARKER) && !this.check(TokenType.THREAD_MARKER)) {
      if (this.check(TokenType.DIRECTIVE)) {
        const directive = this.parseDirective();
        if (directive.type === 'metadata') {
          metadata.push(directive);
        } else if (directive.type === 'variable_declaration') {
          variables.push(directive);
        } else if (directive.type === 'audio_declaration') {
          audioDeclarations.push(directive);
        } else if (directive.type === 'effect_declaration') {
          effectDeclarations.push(directive);
        } else if (directive.type === 'external_declaration') {
          externalDeclarations.push(directive);
        }
      } else if (this.check(TokenType.LIST)) {
        // LIST declaration
        const list = this.parseListDeclaration();
        if (list) lists.push(list);
      } else if (this.check(TokenType.ARRAY)) {
        // ARRAY declaration
        const array = this.parseArrayDeclaration();
        if (array) arrays.push(array);
      } else if (this.check(TokenType.MAP)) {
        // MAP declaration
        const map = this.parseMapDeclaration();
        if (map) maps.push(map);
      } else if (this.check(TokenType.INCLUDE)) {
        // INCLUDE declaration
        const include = this.parseIncludeDeclaration();
        if (include) includes.push(include);
      } else if (this.check(TokenType.CONST)) {
        // CONST declaration
        const constVar = this.parseConstDeclaration();
        if (constVar) variables.push(constVar);
      } else if (this.check(TokenType.VAR)) {
        // VAR declaration (top-level)
        const varDecl = this.parseVarDeclaration();
        if (varDecl) variables.push(varDecl);
      } else if (this.check(TokenType.FUNCTION)) {
        // FUNCTION declaration
        const func = this.parseFunctionDeclaration();
        if (func) functions.push(func);
      } else if (this.check(TokenType.NAMESPACE)) {
        // NAMESPACE block
        const ns = this.parseNamespaceDeclaration(passages, functions);
        if (ns) namespaces.push(ns);
      } else if (this.check(TokenType.END)) {
        // END NAMESPACE
        this.parseEndNamespace();
      } else if (this.check(TokenType.THEME)) {
        // THEME directive
        const themeNode = this.parseThemeDirective();
        if (themeNode) theme = themeNode;
      } else if (this.check(TokenType.STYLE)) {
        // STYLE block
        const styleNode = this.parseStyleBlock();
        if (styleNode) styles = styleNode;
      } else if (this.check(TokenType.NEWLINE)) {
        this.advance();
      } else if (this.check(TokenType.COMMENT)) {
        this.advance(); // Skip comments
      } else {
        // Unknown content before first passage
        this.addError('Expected passage marker (::) or directive (@)', {
          code: WLS_ERROR_CODES.EXPECTED_PASSAGE_MARKER,
          suggestion: 'Add "::" before passage name or "@" before directive',
        });
        this.skipToNextLine();
      }
    }

    // Parse passages, threads, and handle interleaved namespace/function declarations
    while (!this.isAtEnd()) {
      if (this.check(TokenType.PASSAGE_MARKER)) {
        passages.push(this.parsePassage());
      } else if (this.check(TokenType.THREAD_MARKER)) {
        // Thread passage
        threads.push(this.parseThreadPassage());
      } else if (this.check(TokenType.NAMESPACE)) {
        // NAMESPACE block in passage section
        const ns = this.parseNamespaceDeclaration(passages, functions);
        if (ns) namespaces.push(ns);
      } else if (this.check(TokenType.END)) {
        // END NAMESPACE
        this.parseEndNamespace();
      } else if (this.check(TokenType.FUNCTION)) {
        // FUNCTION in passage section
        const func = this.parseFunctionDeclaration();
        if (func) functions.push(func);
      } else if (this.check(TokenType.NEWLINE) || this.check(TokenType.COMMENT)) {
        this.advance();
      } else {
        this.addError('Expected passage marker (::) or thread marker (==)', {
          code: WLS_ERROR_CODES.EXPECTED_PASSAGE_MARKER,
        });
        this.skipToNextLine();
      }
    }

    return {
      type: 'story',
      metadata,
      variables,
      lists,
      arrays,
      maps,
      includes,
      functions,
      namespaces,
      theme,
      styles,
      passages,
      threads,
      audioDeclarations,
      effectDeclarations,
      externalDeclarations,
      location: this.getLocation(start),
    };
  }

  // ============================================================================
  // THEME and STYLE Parsing
  // ============================================================================

  /**
   * Parse THEME directive: THEME "name"
   * Built-in themes: default, dark, classic, minimal, sepia
   */
  private parseThemeDirective(): ThemeDirectiveNode | null {
    const start = this.advance(); // consume THEME

    this.skipWhitespaceOnLine();

    // Expect string for theme name
    if (!this.check(TokenType.STRING)) {
      this.addError('Expected theme name string after THEME');
      this.skipToNextLine();
      return null;
    }

    const themeToken = this.advance();
    const themeName = themeToken.value;

    return {
      type: 'theme_directive',
      themeName,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse STYLE block: STYLE { --prop: value; }
   * CSS custom properties for theming
   *
   * Note: CSS custom properties start with -- which the lexer treats as comments.
   * So we need to handle COMMENT tokens that are actually CSS properties.
   */
  private parseStyleBlock(): StyleBlockNode | null {
    const start = this.advance(); // consume STYLE

    this.skipWhitespaceOnLine();
    this.skipNewlines();

    // Expect opening brace
    if (!this.match(TokenType.LBRACE)) {
      this.addError('Expected "{" after STYLE');
      this.skipToNextLine();
      return null;
    }

    const properties = new Map<string, string>();

    // Parse CSS custom properties
    // The lexer treats -- as comment start, so CSS properties like --bg-color: value
    // become COMMENT tokens with value "bg-color: value"
    while (!this.isAtEnd() && !this.check(TokenType.RBRACE)) {
      this.skipNewlines();

      if (this.check(TokenType.RBRACE)) break;

      // Check for COMMENT token which is actually a CSS property
      if (this.check(TokenType.COMMENT)) {
        const commentToken = this.advance();
        // The comment value is "--bg-color: #value" or "bg-color: #value"
        // depending on how the lexer handles it
        let propLine = commentToken.value;

        // Remove leading -- if the lexer kept it
        if (propLine.startsWith('--')) {
          propLine = propLine.slice(2);
        }

        // Parse "name: value" from the comment
        const colonIndex = propLine.indexOf(':');
        if (colonIndex > 0) {
          const propName = '--' + propLine.slice(0, colonIndex).trim();
          let propValue = propLine.slice(colonIndex + 1).trim();

          // Remove trailing semicolon if present
          if (propValue.endsWith(';')) {
            propValue = propValue.slice(0, -1).trim();
          }

          properties.set(propName, propValue);
        }
        continue;
      }

      // Handle non-CSS-property lines (regular identifier-based properties)
      let propName = '';

      while (!this.isAtEnd() &&
             !this.check(TokenType.COLON) &&
             !this.check(TokenType.NEWLINE) &&
             !this.check(TokenType.RBRACE) &&
             !this.check(TokenType.COMMENT)) {
        propName += this.peek().value;
        this.advance();
      }

      propName = propName.trim();

      if (!propName) {
        if (!this.check(TokenType.RBRACE) && !this.check(TokenType.COMMENT)) {
          this.skipToNextLine();
        }
        continue;
      }

      // Expect colon
      if (!this.match(TokenType.COLON)) {
        this.addError(`Expected ":" after property name "${propName}"`);
        this.skipToNextLine();
        continue;
      }

      this.skipWhitespaceOnLine();

      // Collect property value until ; or newline or }
      let propValue = '';
      while (!this.isAtEnd() &&
             !this.check(TokenType.SEMICOLON) &&
             !this.check(TokenType.NEWLINE) &&
             !this.check(TokenType.RBRACE)) {
        propValue += this.peek().value;
        this.advance();
      }

      properties.set(propName, propValue.trim());

      // Consume semicolon if present
      this.match(TokenType.SEMICOLON);
      this.skipNewlines();
    }

    // Expect closing brace
    if (!this.match(TokenType.RBRACE)) {
      this.addError('Expected "}" to close STYLE block');
    }

    return {
      type: 'style_block',
      properties,
      location: this.getLocation(start),
    };
  }

  // ============================================================================
  // CSS Class Parsing
  // ============================================================================

  /**
   * Check if this is a classed block (.class { content })
   * Lookahead: DOT IDENTIFIER ... LBRACE
   */
  private isClassedBlock(): boolean {
    if (!this.check(TokenType.DOT)) return false;

    // Lookahead to see if we have .identifier followed eventually by {
    let pos = this.pos;
    const tokens = this.tokens;

    // Skip DOT
    pos++;
    if (pos >= tokens.length) return false;

    // Need IDENTIFIER after DOT
    if (tokens[pos].type !== TokenType.IDENTIFIER) return false;
    pos++;

    // Skip any additional .class specifiers and whitespace
    while (pos < tokens.length) {
      const token = tokens[pos];
      if (token.type === TokenType.DOT) {
        pos++;
        if (pos < tokens.length && tokens[pos].type === TokenType.IDENTIFIER) {
          pos++;
        }
      } else if (token.type === TokenType.NEWLINE || token.type === TokenType.EOF) {
        return false; // No brace found on this line
      } else if (token.type === TokenType.LBRACE) {
        return true;
      } else {
        // Skip other tokens (whitespace, etc.)
        pos++;
      }
    }

    return false;
  }

  /**
   * Check if this is a classed inline ([.class content])
   * Lookahead: LBRACKET DOT
   */
  private isClassedInline(): boolean {
    if (!this.check(TokenType.LBRACKET)) return false;

    // Lookahead to see if next token is DOT
    const nextPos = this.pos + 1;
    if (nextPos >= this.tokens.length) return false;

    return this.tokens[nextPos].type === TokenType.DOT;
  }

  /**
   * Parse classed block: .class { content }
   * Can have multiple classes: .dialog.merchant { content }
   */
  private parseClassedBlock(): ClassedBlockNode {
    const start = this.peek();
    const classes: string[] = [];

    // Parse class names
    while (this.check(TokenType.DOT)) {
      this.advance(); // consume DOT
      if (this.check(TokenType.IDENTIFIER)) {
        classes.push(this.advance().value);
      }
    }

    this.skipWhitespaceOnLine();
    this.skipNewlines();

    // Expect opening brace
    if (!this.match(TokenType.LBRACE)) {
      this.addError('Expected "{" after CSS class names');
      return {
        type: 'classed_block',
        classes,
        content: [],
        location: this.getLocation(start),
      };
    }

    // Parse content until closing brace
    const content: ContentNode[] = [];
    let braceDepth = 1;

    while (!this.isAtEnd() && braceDepth > 0) {
      if (this.check(TokenType.LBRACE)) {
        braceDepth++;
        // Add brace as text since it's nested
        content.push({
          type: 'text',
          value: '{',
          location: this.peek().location,
        });
        this.advance();
      } else if (this.check(TokenType.RBRACE)) {
        braceDepth--;
        if (braceDepth > 0) {
          // Nested closing brace
          content.push({
            type: 'text',
            value: '}',
            location: this.peek().location,
          });
          this.advance();
        }
      } else if (this.check(TokenType.NEWLINE)) {
        content.push({
          type: 'text',
          value: '\n',
          location: this.peek().location,
        });
        this.advance();
      } else {
        const node = this.parseContentNode();
        if (node) {
          content.push(node);
        } else {
          // Unknown token, add as text
          const token = this.advance();
          content.push({
            type: 'text',
            value: token.value,
            location: token.location,
          });
        }
      }
    }

    // Consume closing brace
    this.match(TokenType.RBRACE);

    return {
      type: 'classed_block',
      classes,
      content,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse classed inline: [.class content]
   * Can have multiple classes: [.damage.critical 15 damage]
   */
  private parseClassedInline(): ClassedInlineNode {
    const start = this.advance(); // consume LBRACKET
    const classes: string[] = [];

    // Parse class names
    while (this.check(TokenType.DOT)) {
      this.advance(); // consume DOT
      if (this.check(TokenType.IDENTIFIER)) {
        classes.push(this.advance().value);
      }
    }

    this.skipWhitespaceOnLine();

    // Parse content until closing bracket
    const content: ContentNode[] = [];

    while (!this.isAtEnd() && !this.check(TokenType.RBRACKET)) {
      const node = this.parseContentNode();
      if (node) {
        content.push(node);
      } else if (this.check(TokenType.NEWLINE)) {
        this.advance(); // Skip newlines inside classed inline
      } else {
        // Unknown token, add as text
        const token = this.advance();
        content.push({
          type: 'text',
          value: token.value,
          location: token.location,
        });
      }
    }

    // Consume closing bracket
    this.expect(TokenType.RBRACKET, 'Expected "]" after classed inline content');

    return {
      type: 'classed_inline',
      classes,
      content,
      location: this.getLocation(start),
    };
  }

  // ============================================================================
  // Directive Parsing
  // ============================================================================

  private parseDirective(): MetadataNode | VariableDeclarationNode | AudioDeclarationNode | EffectDeclarationNode | ExternalDeclarationNode {
    const start = this.advance(); // @directive
    const directiveName = start.value.slice(1); // Remove @

    if (directiveName === 'vars') {
      return this.parseVarsBlock(start);
    }

    // Audio declaration
    if (directiveName === 'audio') {
      return this.parseAudioDirective(start);
    }

    // Effect declaration
    if (directiveName === 'effect') {
      return this.parseEffectDirective(start);
    }

    // External function declaration
    if (directiveName === 'external') {
      return this.parseExternalDirective(start);
    }

    // Simple metadata directive
    this.skipWhitespaceOnLine();

    let value = '';
    if (this.check(TokenType.COLON)) {
      this.advance();
      this.skipWhitespaceOnLine();
    }

    // Collect rest of line as value
    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      value += this.peek().value;
      this.advance();
    }

    return {
      type: 'metadata',
      key: directiveName,
      value: value.trim(),
      location: this.getLocation(start),
    };
  }

  /**
   * Collect remaining tokens on line as a string with whitespace preserved
   */
  private collectLineContent(): string {
    const parts: string[] = [];
    let lastEnd = -1;

    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
      const token = this.peek();

      // Add space between tokens if there's a gap
      if (lastEnd >= 0 && token.location.start.column > lastEnd + 1) {
        parts.push(' ');
      }

      // Add quotes back for string tokens (lexer strips them)
      if (token.type === TokenType.STRING) {
        parts.push(`"${token.value}"`);
      } else {
        parts.push(token.value);
      }

      lastEnd = token.location.end.column - 1;
      this.advance();
    }

    return parts.join('');
  }

  /**
   * Parse @audio directive
   * @audio bgm = "music/theme.mp3" loop channel:bgm
   */
  private parseAudioDirective(start: Token): AudioDeclarationNode {
    this.skipWhitespaceOnLine();

    const declaration = this.collectLineContent();

    try {
      return parseAudioDeclaration(declaration, this.getLocation(start));
    } catch (e) {
      this.addError((e as Error).message);
      // Return a placeholder node on error
      return {
        type: 'audio_declaration',
        id: 'error',
        url: '',
        channel: 'bgm',
        loop: false,
        volume: 1.0,
        preload: false,
        location: this.getLocation(start),
      };
    }
  }

  /**
   * Parse @effect directive
   * @effect shake 500ms
   * @effect typewriter speed:50
   */
  private parseEffectDirective(start: Token): EffectDeclarationNode {
    this.skipWhitespaceOnLine();

    const declaration = this.collectLineContent();

    try {
      return parseEffectDeclaration(declaration, this.getLocation(start));
    } catch (e) {
      this.addError((e as Error).message);
      // Return a placeholder node on error
      return {
        type: 'effect_declaration',
        name: 'error',
        duration: null,
        options: {},
        location: this.getLocation(start),
      };
    }
  }

  /**
   * Parse @external directive
   * @external playSound(id: string): void
   * @external getUserName(): string
   */
  private parseExternalDirective(start: Token): ExternalDeclarationNode {
    this.skipWhitespaceOnLine();

    const declaration = this.collectLineContent();

    try {
      return parseExternalDeclaration(declaration, this.getLocation(start));
    } catch (e) {
      this.addError((e as Error).message);
      // Return a placeholder node on error
      return {
        type: 'external_declaration',
        name: 'error',
        params: [],
        returnType: null,
        location: this.getLocation(start),
      };
    }
  }

  private parseVarsBlock(start: Token): VariableDeclarationNode {
    // For now, treat @vars as a single declaration placeholder
    // Full implementation would parse the indented block
    this.skipToNextLine();

    // Parse indented variable declarations
    const variables: VariableDeclarationNode[] = [];

    while (!this.isAtEnd() && !this.check(TokenType.PASSAGE_MARKER) && !this.check(TokenType.DIRECTIVE)) {
      this.skipNewlines();
      if (this.check(TokenType.IDENTIFIER)) {
        const varStart = this.peek();
        const name = this.advance().value;

        let initialValue: ExpressionNode | null = null;
        if (this.match(TokenType.COLON)) {
          this.skipWhitespaceOnLine();
          initialValue = this.parseExpression();
        }

        variables.push({
          type: 'variable_declaration',
          name,
          scope: 'story',
          initialValue,
          location: this.getLocation(varStart),
        });

        this.skipToNextLine();
      } else if (this.check(TokenType.NEWLINE)) {
        this.advance();
      } else {
        break;
      }
    }

    // Return first variable or empty placeholder
    if (variables.length > 0) {
      return variables[0];
    }

    return {
      type: 'variable_declaration',
      name: '',
      scope: 'story',
      initialValue: null,
      location: this.getLocation(start),
    };
  }

  private skipWhitespaceOnLine(): void {
    // Skip tokens that represent whitespace (handled by lexer)
    // Our lexer doesn't emit whitespace tokens, so this is a no-op
  }

  // ============================================================================
  // Collection Declaration Parsing   // ============================================================================

  /**
   * Parse a LIST declaration: LIST name = value1, (active_value), value2
   */
  private parseListDeclaration(): ListDeclarationNode | null {
    const start = this.advance(); // consume LIST
    this.skipWhitespaceOnLine();

    // Parse list name
    if (!this.check(TokenType.IDENTIFIER)) {
      this.addError('Expected list name after LIST', {
        code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
        suggestion: 'Provide a name for the list: LIST moods = happy, sad',
      });
      this.skipToNextLine();
      return null;
    }

    const name = this.advance().value;

    // Expect =
    if (!this.match(TokenType.ASSIGN)) {
      this.addError('Expected "=" after list name', {
        code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
        suggestion: 'Add "=" after the list name: LIST moods = happy, sad',
      });
      this.skipToNextLine();
      return null;
    }

    // Parse list values
    const values: ListValueNode[] = [];
    let expectComma = false;

    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE) && !this.check(TokenType.PASSAGE_MARKER)) {
      if (expectComma) {
        if (this.match(TokenType.COMMA)) {
          expectComma = false;
          continue;
        } else {
          break;
        }
      }

      // Check for active value: (value)
      if (this.match(TokenType.LPAREN)) {
        if (this.check(TokenType.IDENTIFIER)) {
          values.push({ value: this.advance().value, active: true });
        } else {
          this.addError('Expected identifier inside parentheses');
        }
        this.expect(TokenType.RPAREN, 'Expected ")" after active value');
        expectComma = true;
      } else if (this.check(TokenType.IDENTIFIER)) {
        values.push({ value: this.advance().value, active: false });
        expectComma = true;
      } else {
        break;
      }
    }

    return {
      type: 'list_declaration',
      name,
      values,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse an ARRAY declaration: ARRAY name = [elem1, elem2] or [0: elem1, 2: elem2]
   */
  private parseArrayDeclaration(): ArrayDeclarationNode | null {
    const start = this.advance(); // consume ARRAY
    this.skipWhitespaceOnLine();

    // Parse array name
    if (!this.check(TokenType.IDENTIFIER)) {
      this.addError('Expected array name after ARRAY', {
        code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
        suggestion: 'Provide a name for the array: ARRAY items = [1, 2, 3]',
      });
      this.skipToNextLine();
      return null;
    }

    const name = this.advance().value;

    // Expect =
    if (!this.match(TokenType.ASSIGN)) {
      this.addError('Expected "=" after array name', {
        code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
        suggestion: 'Add "=" after the array name: ARRAY items = [1, 2, 3]',
      });
      this.skipToNextLine();
      return null;
    }

    // Expect [
    if (!this.match(TokenType.LBRACKET)) {
      this.addError('Expected "[" to start array', {
        code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
        suggestion: 'Arrays must be enclosed in brackets: [1, 2, 3]',
      });
      this.skipToNextLine();
      return null;
    }

    // Parse array elements
    const elements: ArrayElementNode[] = [];
    let autoIndex = 0;
    let expectComma = false;

    while (!this.isAtEnd() && !this.check(TokenType.RBRACKET)) {
      if (expectComma) {
        if (this.match(TokenType.COMMA)) {
          expectComma = false;
          continue;
        } else {
          break;
        }
      }

      const element = this.parseArrayElement(autoIndex);
      if (element) {
        elements.push(element);
        // Update auto-index based on what was used
        if (element.index !== null) {
          autoIndex = element.index + 1;
        } else {
          autoIndex++;
        }
        expectComma = true;
      } else {
        break;
      }
    }

    this.expect(TokenType.RBRACKET, 'Expected "]" to close array');

    return {
      type: 'array_declaration',
      name,
      elements,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse a single array element with optional explicit index
   */
  private parseArrayElement(_autoIndex: number): ArrayElementNode | null {
    // Check for explicit index: NUMBER COLON value
    if (this.check(TokenType.NUMBER)) {
      const indexToken = this.peek();
      const maybeIndex = parseFloat(indexToken.value);

      // Look ahead for colon
      if (this.peekNext().type === TokenType.COLON) {
        this.advance(); // consume number
        this.advance(); // consume colon
        const value = this.parseExpression();
        return { index: maybeIndex, value };
      }
    }

    // Auto-indexed element
    const value = this.parseExpression();
    return { index: null, value };
  }

  /**
   * Parse a MAP declaration: MAP name = { key: value, key2: value2 }
   */
  private parseMapDeclaration(): MapDeclarationNode | null {
    const start = this.advance(); // consume MAP
    this.skipWhitespaceOnLine();

    // Parse map name
    if (!this.check(TokenType.IDENTIFIER)) {
      this.addError('Expected map name after MAP', {
        code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
        suggestion: 'Provide a name for the map: MAP player = { name: "Hero" }',
      });
      this.skipToNextLine();
      return null;
    }

    const name = this.advance().value;

    // Expect =
    if (!this.match(TokenType.ASSIGN)) {
      this.addError('Expected "=" after map name', {
        code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
        suggestion: 'Add "=" after the map name: MAP player = { name: "Hero" }',
      });
      this.skipToNextLine();
      return null;
    }

    // Expect {
    if (!this.match(TokenType.LBRACE)) {
      this.addError('Expected "{" to start map', {
        code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
        suggestion: 'Maps must be enclosed in braces: { key: value }',
      });
      this.skipToNextLine();
      return null;
    }

    // Parse map entries
    const entries: MapEntryNode[] = [];
    let expectComma = false;

    while (!this.isAtEnd() && !this.check(TokenType.RBRACE)) {
      if (expectComma) {
        if (this.match(TokenType.COMMA)) {
          expectComma = false;
          continue;
        } else {
          break;
        }
      }

      const entry = this.parseMapEntry();
      if (entry) {
        entries.push(entry);
        expectComma = true;
      } else {
        break;
      }
    }

    this.expect(TokenType.RBRACE, 'Expected "}" to close map');

    return {
      type: 'map_declaration',
      name,
      entries,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse a single map entry: key: value
   */
  private parseMapEntry(): MapEntryNode | null {
    // Expect key (identifier or string)
    let key: string;

    if (this.check(TokenType.IDENTIFIER)) {
      key = this.advance().value;
    } else if (this.check(TokenType.STRING)) {
      key = this.advance().value;
    } else {
      return null;
    }

    // Expect colon
    if (!this.match(TokenType.COLON)) {
      this.addError('Expected ":" after map key', {
        code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
        suggestion: 'Map entries use colon syntax: key: value',
      });
      return null;
    }

    // Parse value
    const value = this.parseExpression();

    return { key, value };
  }

  // ============================================================================
  // Module Declarations   // ============================================================================

  /**
   * Parse an INCLUDE declaration: INCLUDE "path/to/file.ws" or INCLUDE path/to/file.ws
   */
  private parseIncludeDeclaration(): IncludeDeclarationNode | null {
    const start = this.advance(); // consume INCLUDE
    this.skipWhitespaceOnLine();

    let path: string;

    // Parse path - can be quoted string or unquoted path
    if (this.check(TokenType.STRING)) {
      path = this.advance().value;
    } else {
      // Collect unquoted path (identifier, dots, slashes until newline)
      let pathParts: string[] = [];
      while (!this.isAtEnd() && !this.check(TokenType.NEWLINE) && !this.check(TokenType.EOF)) {
        const token = this.advance();
        pathParts.push(token.value);
      }
      path = pathParts.join('').trim();

      if (!path) {
        this.addError('Expected path after INCLUDE', {
          code: 'WLS-MOD-001' as WLSErrorCode,
          suggestion: 'Provide a path: INCLUDE "path/to/file.ws" or INCLUDE path/to/file.ws',
        });
        return null;
      }
    }

    this.skipToNextLine();

    return {
      type: 'include_declaration',
      path,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse a CONST declaration: CONST name = value
   */
  private parseConstDeclaration(): VariableDeclarationNode | null {
    const start = this.advance(); // consume CONST
    this.skipWhitespaceOnLine();

    // Parse variable name
    if (!this.check(TokenType.IDENTIFIER)) {
      this.addError('Expected identifier after CONST', {
        code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
      });
      this.skipToNextLine();
      return null;
    }

    const name = this.advance().value;
    this.skipWhitespaceOnLine();

    // Expect = for assignment
    if (!this.match(TokenType.ASSIGN)) {
      this.addError('Expected "=" after CONST name', {
        code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
        suggestion: 'CONST declarations require an initial value: CONST NAME = value',
      });
      this.skipToNextLine();
      return null;
    }
    this.skipWhitespaceOnLine();

    // Parse initial value
    const initialValue = this.parseExpression();

    this.skipToNextLine();

    return {
      type: 'variable_declaration',
      name,
      scope: 'story',
      initialValue,
      isConst: true,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse a VAR declaration: VAR name = value
   */
  private parseVarDeclaration(): VariableDeclarationNode | null {
    const start = this.advance(); // consume VAR
    this.skipWhitespaceOnLine();

    // Parse variable name
    if (!this.check(TokenType.IDENTIFIER)) {
      this.addError('Expected identifier after VAR', {
        code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
      });
      this.skipToNextLine();
      return null;
    }

    const name = this.advance().value;
    this.skipWhitespaceOnLine();

    let initialValue: ExpressionNode | null = null;

    // Optional = for assignment
    if (this.match(TokenType.ASSIGN)) {
      this.skipWhitespaceOnLine();
      initialValue = this.parseExpression();
    }

    this.skipToNextLine();

    return {
      type: 'variable_declaration',
      name,
      scope: 'story',
      initialValue,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse a FUNCTION declaration: FUNCTION name(param1, param2) ... END
   */
  private parseFunctionDeclaration(): FunctionDeclarationNode | null {
    const start = this.advance(); // consume FUNCTION
    this.skipWhitespaceOnLine();

    // Parse function name
    if (!this.check(TokenType.IDENTIFIER)) {
      this.addError('Expected function name after FUNCTION', {
        code: 'WLS-MOD-006' as WLSErrorCode,
        suggestion: 'Provide a name: FUNCTION myFunction(param1)',
      });
      this.skipToNextLine();
      return null;
    }

    const name = this.advance().value;

    // Parse optional parameters
    const params: FunctionParameterNode[] = [];
    if (this.match(TokenType.LPAREN)) {
      while (!this.isAtEnd() && !this.check(TokenType.RPAREN)) {
        if (this.check(TokenType.IDENTIFIER)) {
          params.push({ name: this.advance().value });
        }
        if (!this.check(TokenType.RPAREN)) {
          this.match(TokenType.COMMA);
        }
      }
      this.expect(TokenType.RPAREN, 'Expected ")" after parameters');
    }

    this.skipNewlines();

    // Parse function body until END
    const body: ContentNode[] = [];
    let depth = 1;

    while (!this.isAtEnd() && depth > 0) {
      if (this.check(TokenType.FUNCTION) || this.check(TokenType.NAMESPACE)) {
        depth++;
        this.advance();
      } else if (this.check(TokenType.END)) {
        depth--;
        if (depth === 0) {
          this.advance(); // consume END
          break;
        }
        this.advance();
      } else if (this.check(TokenType.NEWLINE)) {
        this.advance();
      } else {
        // For now, skip tokens in function body - full parsing would need expression/statement parsing
        this.advance();
      }
    }

    return {
      type: 'function_declaration',
      name,
      params,
      body,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse a NAMESPACE declaration: NAMESPACE Name
   * Pushes namespace onto stack for subsequent passages
   */
  private parseNamespaceDeclaration(
    _passages: PassageNode[],
    _functions: FunctionDeclarationNode[]
  ): NamespaceDeclarationNode | null {
    const start = this.advance(); // consume NAMESPACE
    this.skipWhitespaceOnLine();

    // Parse namespace name
    if (!this.check(TokenType.IDENTIFIER)) {
      this.addError('Expected namespace name after NAMESPACE', {
        code: 'WLS-MOD-007' as WLSErrorCode,
        suggestion: 'Provide a name: NAMESPACE MyNamespace',
      });
      this.skipToNextLine();
      return null;
    }

    const name = this.advance().value;

    // Push onto namespace stack
    this.namespaceStack.push(name);

    this.skipToNextLine();

    // Note: Actual namespace node is created for tracking purposes
    // Passages within the namespace are added to the main passages array
    // with their qualified names
    return {
      type: 'namespace_declaration',
      name,
      passages: [],
      functions: [],
      nestedNamespaces: [],
      location: this.getLocation(start),
    };
  }

  /**
   * Parse END NAMESPACE - pops namespace from stack
   */
  private parseEndNamespace(): void {
    this.advance(); // consume END
    this.skipWhitespaceOnLine();

    // Check for NAMESPACE keyword
    if (this.check(TokenType.NAMESPACE)) {
      this.advance(); // consume NAMESPACE
    }

    // Pop from namespace stack
    if (this.namespaceStack.length > 0) {
      this.namespaceStack.pop();
    } else {
      this.addError('END NAMESPACE without matching NAMESPACE', {
        code: 'WLS-MOD-008' as WLSErrorCode,
      });
    }

    this.skipToNextLine();
  }

  /**
   * Get the current namespace prefix (for qualifying passage names)
   */
  private getNamespacePrefix(): string {
    if (this.namespaceStack.length === 0) {
      return '';
    }
    return this.namespaceStack.join('::') + '::';
  }

  // ============================================================================
  // Passage Parsing
  // ============================================================================

  private parsePassage(): PassageNode {
    const start = this.expect(TokenType.PASSAGE_MARKER, 'Expected "::"');
    this.skipWhitespaceOnLine();

    // Parse passage name
    let name = '';
    const tags: string[] = [];
    const metadata: PassageMetadataNode[] = [];

    // Check for :: prefix (global namespace reference)
    const isGlobalReference = this.check(TokenType.SCOPE_OP);
    if (isGlobalReference) {
      this.advance(); // consume ::
    }

    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance().value;

      // Check for additional name parts (e.g., "Start Room" or "Namespace::Passage")
      while (this.check(TokenType.IDENTIFIER) || this.check(TokenType.SCOPE_OP)) {
        if (this.check(TokenType.SCOPE_OP)) {
          name += '::';
          this.advance();
        } else {
          name += ' ' + this.advance().value;
        }
      }
    } else {
      this.addError('Expected passage name after ::', {
        code: WLS_ERROR_CODES.EXPECTED_PASSAGE_NAME,
        suggestion: 'Provide a name for the passage after "::"',
      });
      name = 'unnamed';
    }

    // Apply namespace prefix if not a global reference
    const originalName = name;
    let qualifiedName = name;
    let currentNamespace: string | undefined;

    if (isGlobalReference) {
      // Global reference - use name as-is
      qualifiedName = name;
    } else if (this.namespaceStack.length > 0) {
      // Apply namespace prefix
      currentNamespace = this.namespaceStack.join('::');
      qualifiedName = this.getNamespacePrefix() + name;
    }

    // Parse optional tags [tag1, tag2]
    if (this.match(TokenType.LBRACKET)) {
      while (!this.isAtEnd() && !this.check(TokenType.RBRACKET)) {
        if (this.check(TokenType.IDENTIFIER)) {
          tags.push(this.advance().value);
        }
        this.match(TokenType.COMMA);
      }
      this.expect(TokenType.RBRACKET, 'Expected "]" after tags');
    }

    this.skipNewlines();

    // Parse passage-level metadata directives (@fallback, @onEnter, @onExit)
    // But NOT hook operations (@replace, @append, @prepend, @show, @hide)
    // And NOT inline media directives (@image, @video, @embed)
    while (this.check(TokenType.DIRECTIVE) && !this.isHookOperation() && !this.isInlineMediaDirective()) {
      const meta = this.parsePassageMetadata();
      if (meta) {
        metadata.push(meta);
      }
      this.skipNewlines();
    }

    // Parse passage content
    const content = this.parsePassageContent();

    return {
      type: 'passage',
      name: qualifiedName,
      originalName: originalName !== qualifiedName ? originalName : undefined,
      namespace: currentNamespace,
      tags,
      metadata,
      content,
      location: this.getLocation(start),
    };
  }

  // ============================================================================
  // Thread Passage Parsing
  // ============================================================================

  /**
   * Parse a thread passage (== ThreadName)
   * Thread passages run in parallel with the main narrative
   */
  private parseThreadPassage(): ThreadPassageNode {
    const start = this.expect(TokenType.THREAD_MARKER, 'Expected "=="');
    this.skipWhitespaceOnLine();

    // Parse thread passage name
    let name = '';
    const tags: string[] = [];
    const metadata: PassageMetadataNode[] = [];

    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance().value;
      // Check for additional name parts (e.g., "Background Music")
      while (this.check(TokenType.IDENTIFIER)) {
        name += ' ' + this.advance().value;
      }
    } else {
      this.addError('Expected thread passage name after ==', {
        code: WLS_ERROR_CODES.EXPECTED_PASSAGE_NAME,
        suggestion: 'Provide a name for the thread passage after "=="',
      });
      name = 'unnamed_thread';
    }

    // Parse optional tags [tag1, tag2]
    if (this.match(TokenType.LBRACKET)) {
      while (!this.isAtEnd() && !this.check(TokenType.RBRACKET)) {
        if (this.check(TokenType.IDENTIFIER)) {
          tags.push(this.advance().value);
        }
        this.match(TokenType.COMMA);
      }
      this.expect(TokenType.RBRACKET, 'Expected "]" after tags');
    }

    this.skipNewlines();

    // Parse passage-level metadata directives
    while (this.check(TokenType.DIRECTIVE)) {
      const meta = this.parsePassageMetadata();
      if (meta) {
        metadata.push(meta);
      }
      this.skipNewlines();
    }

    // Parse passage content
    const content = this.parsePassageContent();

    return {
      type: 'thread_passage',
      name,
      tags,
      metadata,
      content,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse a passage-level metadata directive (@fallback: PassageName)
   */
  private parsePassageMetadata(): PassageMetadataNode | null {
    const token = this.advance();
    const directiveValue = token.value;

    // Extract key (e.g., "@fallback" -> "fallback")
    const key = directiveValue.startsWith('@') ? directiveValue.slice(1) : directiveValue;

    // Expect colon
    if (!this.match(TokenType.COLON)) {
      this.addError(`Expected ':' after ${directiveValue}`);
      this.skipToNextLine();
      return null;
    }

    // Parse value (identifier or string)
    let value = '';
    if (this.check(TokenType.IDENTIFIER)) {
      value = this.advance().value;
      // Allow multi-word values
      while (this.check(TokenType.IDENTIFIER) && !this.check(TokenType.NEWLINE)) {
        value += ' ' + this.advance().value;
      }
    } else if (this.check(TokenType.STRING)) {
      value = this.advance().value;
    } else {
      this.addError(`Expected value after ${directiveValue}:`);
      this.skipToNextLine();
      return null;
    }

    return {
      type: 'passage_metadata',
      key,
      value,
      location: this.getLocation(token),
    };
  }

  private parsePassageContent(): ContentNode[] {
    const content: ContentNode[] = [];

    while (!this.isAtEnd() && !this.check(TokenType.PASSAGE_MARKER) && !this.check(TokenType.THREAD_MARKER)) {
      const node = this.parseContentNode();
      if (node) {
        content.push(node);
      } else if (this.check(TokenType.NEWLINE)) {
        // Add newline as text for proper formatting
        content.push({
          type: 'text',
          value: '\n',
          location: this.peek().location,
        });
        this.advance();
      } else if (this.check(TokenType.COMMENT)) {
        this.advance(); // Skip comments in content
      } else if (!this.isAtEnd() && !this.check(TokenType.PASSAGE_MARKER) && !this.check(TokenType.THREAD_MARKER)) {
        // Unknown token, add as text and continue
        const token = this.advance();
        content.push({
          type: 'text',
          value: token.value,
          location: token.location,
        });
      }
    }

    return content;
  }

  private parseContentNode(): ContentNode | null {
    // Hook definition (|hookName>[content])
    if (this.isHookDefinition()) {
      return this.parseHookDefinition();
    }

    // Hook operation (@replace: target { content })
    if (this.isHookOperation()) {
      return this.parseHookOperation();
    }

    // Choice markers at start of line
    if (this.check(TokenType.ONCE_CHOICE_MARKER) || this.check(TokenType.STICKY_CHOICE_MARKER)) {
      return this.parseChoice();
    }

    // Gather point (- at line start)
    if (this.check(TokenType.GATHER)) {
      return this.parseGather();
    }

    // Tunnel return (<-)
    if (this.check(TokenType.TUNNEL_RETURN)) {
      return this.parseTunnelReturn();
    }

    // Arrow could be tunnel call (-> Target ->) or navigation
    if (this.check(TokenType.ARROW)) {
      return this.parseTunnelCallOrNavigation();
    }

    // Conditional block
    if (this.check(TokenType.LBRACE)) {
      return this.parseConditionalOrAlternatives();
    }

    // Expression interpolation
    if (this.check(TokenType.EXPR_START)) {
      return this.parseInterpolation();
    }

    // Variable interpolation
    if (this.check(TokenType.DOLLAR)) {
      return this.parseVariableInterpolation();
    }

    // Rich text: Horizontal rule
    if (this.check(TokenType.HORIZONTAL_RULE)) {
      return this.parseHorizontalRule();
    }

    // Rich text: Blockquote
    if (this.check(TokenType.BLOCKQUOTE_MARKER)) {
      return this.parseBlockquote();
    }

    // Rich text: Lists
    if (this.check(TokenType.LIST_MARKER_UNORDERED) || this.check(TokenType.LIST_MARKER_ORDERED)) {
      return this.parseList();
    }

    // Rich text: Bold+Italic (*** or ** followed by *)
    if (this.check(TokenType.BOLD_MARKER) && this.peekNext()?.type === TokenType.ITALIC_MARKER) {
      return this.parseBoldItalic();
    }

    // Rich text: Bold
    if (this.check(TokenType.BOLD_MARKER)) {
      return this.parseBold();
    }

    // Rich text: Italic
    if (this.check(TokenType.ITALIC_MARKER)) {
      return this.parseItalic();
    }

    // Rich text: Strikethrough
    if (this.check(TokenType.STRIKETHROUGH_MARKER)) {
      return this.parseStrikethrough();
    }

    // Rich text: Inline code
    if (this.check(TokenType.INLINE_CODE)) {
      return this.parseInlineCode();
    }

    // Rich text: Code fence
    if (this.check(TokenType.CODE_FENCE)) {
      return this.parseCodeBlock();
    }

    // CSS: Block-level classed content (.class { content })
    if (this.isClassedBlock()) {
      return this.parseClassedBlock();
    }

    // CSS: Inline classed content ([.class text])
    if (this.isClassedInline()) {
      return this.parseClassedInline();
    }

    // Media: Markdown image ![alt](src)
    if (this.check(TokenType.IMAGE_START)) {
      return this.parseMarkdownImage();
    }

    // Media: Directive-based media (@image, @audio, @video, @embed in content)
    if (this.check(TokenType.DIRECTIVE)) {
      const directive = this.peek().value;
      if (directive === '@image' || directive === '@audio' || directive === '@video' || directive === '@embed') {
        return this.parseInlineMediaDirective();
      }
    }

    // Media: Bracket-based media ([audio], [video], [embed] syntax)
    if (this.isBracketMediaElement()) {
      return this.parseBracketMediaElement();
    }

    // Plain text and other tokens
    if (this.check(TokenType.IDENTIFIER) ||
        this.check(TokenType.STRING) ||
        this.check(TokenType.NUMBER) ||
        this.isTextToken()) {
      return this.parseText();
    }

    return null;
  }

  private isTextToken(): boolean {
    const type = this.peek().type;
    return [
      TokenType.COLON,
      TokenType.COMMA,
      TokenType.DOT,
      TokenType.PLUS,
      TokenType.MINUS,
      TokenType.STAR,
      TokenType.SLASH,
      TokenType.LPAREN,
      TokenType.RPAREN,
      TokenType.TEXT, // Escaped characters like \$ \{ \}
    ].includes(type);
  }

  // ============================================================================
  // Choice Parsing
  // ============================================================================

  private parseChoice(): ChoiceNode {
    const start = this.peek();
    const choiceType = this.check(TokenType.ONCE_CHOICE_MARKER) ? 'once' : 'sticky';
    this.advance();

    let condition: ExpressionNode | null = null;
    const text: ContentNode[] = [];
    let target: string | null = null;
    let action: ExpressionNode[] | null = null;
    let label: string | null = null;

    // Optional label (identifier) before condition or text
    if (this.match(TokenType.LPAREN)) {
      if (this.check(TokenType.IDENTIFIER)) {
        label = this.advance().value;
      }
      this.expect(TokenType.RPAREN, 'Expected ")" after choice label');
    }

    // Old-style condition { expr } before text (backward compatible)
    if (this.match(TokenType.LBRACE)) {
      condition = this.parseExpression();
      this.expect(TokenType.RBRACE, 'Expected "}" after condition');
    }

    // Choice text [text]
    if (this.match(TokenType.LBRACKET)) {
      while (!this.isAtEnd() && !this.check(TokenType.RBRACKET)) {
        const node = this.parseContentNode();
        if (node) {
          text.push(node);
        } else {
          const token = this.advance();
          text.push({
            type: 'text',
            value: token.value,
            location: token.location,
          });
        }
      }
      this.expect(TokenType.RBRACKET, 'Expected "]" after choice text');
    }

    // Check for {if condition} or {do action} after text (new syntax)
    if (this.match(TokenType.LBRACE)) {
      if (this.check(TokenType.IF)) {
        // New syntax: {if condition}
        this.advance(); // consume 'if'
        condition = this.parseExpression();
        this.expect(TokenType.RBRACE, 'Expected "}" after condition');
      } else if (this.check(TokenType.DO)) {
        // New syntax: {do action} before target
        this.advance(); // consume 'do'
        action = [];
        while (!this.isAtEnd() && !this.check(TokenType.RBRACE)) {
          action.push(this.parseExpression());
          this.match(TokenType.SEMICOLON);
        }
        this.expect(TokenType.RBRACE, 'Expected "}" after action');
      } else {
        // Old-style action { code } before target (backward compatible)
        action = [];
        while (!this.isAtEnd() && !this.check(TokenType.RBRACE)) {
          action.push(this.parseExpression());
          this.match(TokenType.SEMICOLON);
        }
        this.expect(TokenType.RBRACE, 'Expected "}" after action');
      }
    }

    // Optional target -> passage
    if (this.match(TokenType.ARROW)) {
      // Also accept END keyword as target (special target)
      // and SCOPE_OP for namespace-qualified targets
      if (this.check(TokenType.IDENTIFIER)) {
        target = this.advance().value;
        // Handle namespace-qualified targets (e.g., Namespace::Passage)
        while (this.check(TokenType.SCOPE_OP)) {
          target += '::';
          this.advance();
          if (this.check(TokenType.IDENTIFIER)) {
            target += this.advance().value;
          }
        }
      } else if (this.check(TokenType.END)) {
        // END is a special target ( END is now a keyword)
        target = 'END';
        this.advance();
      } else if (this.check(TokenType.SCOPE_OP)) {
        // Global reference (::Passage)
        target = '';
        this.advance();
        if (this.check(TokenType.IDENTIFIER)) {
          target = this.advance().value;
        }
      } else {
        this.addError('Expected passage name after "->"', {
          code: WLS_ERROR_CODES.EXPECTED_CHOICE_TARGET,
          suggestion: 'Provide a target passage name after "->"',
        });
      }
    }

    // Check for {do action} after target (new syntax)
    if (this.match(TokenType.LBRACE)) {
      if (this.check(TokenType.DO)) {
        // New syntax: {do action}
        this.advance(); // consume 'do'
        action = [];
        while (!this.isAtEnd() && !this.check(TokenType.RBRACE)) {
          action.push(this.parseExpression());
          this.match(TokenType.SEMICOLON);
        }
        this.expect(TokenType.RBRACE, 'Expected "}" after action');
      } else if (this.check(TokenType.IF)) {
        // {if condition} after target - should have been before
        this.addError("'if' block should come before target (->) or after choice text");
        this.advance(); // consume 'if'
        // Parse anyway but put in condition if empty
        if (!condition) {
          condition = this.parseExpression();
        } else {
          this.parseExpression(); // discard
        }
        this.expect(TokenType.RBRACE, 'Expected "}" after condition');
      } else {
        // Could be old-style action after target - less common but support it
        action = [];
        while (!this.isAtEnd() && !this.check(TokenType.RBRACE)) {
          action.push(this.parseExpression());
          this.match(TokenType.SEMICOLON);
        }
        this.expect(TokenType.RBRACE, 'Expected "}" after action');
      }
    }

    return {
      type: 'choice',
      choiceType,
      label,
      condition,
      text,
      target,
      action,
      location: this.getLocation(start),
    };
  }

  // ============================================================================
  // Gather and Tunnel Parsing   // ============================================================================

  /**
   * Parse a gather point (- at line start)
   * Gather points allow flow to reconverge after choices
   */
  private parseGather(): GatherNode {
    const start = this.peek();
    let depth = 0;

    // Count consecutive gather markers for nesting depth
    while (this.check(TokenType.GATHER)) {
      this.advance();
      depth++;
    }

    // Parse content after gather point (rest of line)
    const content: ContentNode[] = [];
    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE) && !this.check(TokenType.PASSAGE_MARKER)) {
      const node = this.parseContentNode();
      if (node) {
        content.push(node);
      } else if (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
        const token = this.advance();
        content.push({
          type: 'text',
          value: token.value,
          location: token.location,
        });
      } else {
        break;
      }
    }

    return {
      type: 'gather',
      depth,
      content,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse a tunnel return (<-)
   * Returns from a tunnel to the calling passage
   */
  private parseTunnelReturn(): TunnelReturnNode {
    const start = this.advance(); // consume <-
    return {
      type: 'tunnel_return',
      location: this.getLocation(start),
    };
  }

  /**
   * Parse tunnel call (->-> Target or -> Target ->) or simple navigation (-> Target)
   * Tunnel calls can use either:
   *   - Prefix syntax: ->-> Target (Ink-style)
   *   - Suffix syntax: -> Target -> (with trailing arrow)
   */
  private parseTunnelCallOrNavigation(): TunnelCallNode | TextNode {
    const start = this.advance(); // consume first ->

    // Check for ->-> prefix syntax (double arrow before target)
    if (this.check(TokenType.ARROW)) {
      this.advance(); // consume second ->

      // Get target passage name
      if (!this.check(TokenType.IDENTIFIER)) {
        return {
          type: 'text',
          value: '->->',
          location: this.getLocation(start),
        };
      }

      const target = this.advance().value;
      return {
        type: 'tunnel_call',
        target,
        location: this.getLocation(start),
      };
    }

    // Get target passage name
    if (!this.check(TokenType.IDENTIFIER)) {
      // Just an arrow without target, treat as text
      return {
        type: 'text',
        value: '->',
        location: this.getLocation(start),
      };
    }

    const target = this.advance().value;

    // Check for trailing -> (suffix syntax makes it a tunnel call)
    if (this.check(TokenType.ARROW)) {
      this.advance(); // consume trailing ->
      return {
        type: 'tunnel_call',
        target,
        location: this.getLocation(start),
      };
    }

    // Not a tunnel call, just navigation arrow with target
    // Return as text since navigation is handled at choice level
    return {
      type: 'text',
      value: '-> ' + target,
      location: this.getLocation(start),
    };
  }

  // ============================================================================
  // Hook Parsing
  // ============================================================================

  /**
   * Check if current position is a hook definition (|hookName>[...)
   * Look ahead: PIPE IDENTIFIER GT LBRACKET
   */
  private isHookDefinition(): boolean {
    if (!this.check(TokenType.PIPE)) return false;

    // Look ahead for pattern: | identifier > [
    const savedPos = this.pos;
    this.advance(); // consume |

    if (!this.check(TokenType.IDENTIFIER)) {
      this.pos = savedPos;
      return false;
    }
    this.advance(); // consume identifier

    if (!this.check(TokenType.GT)) {
      this.pos = savedPos;
      return false;
    }
    this.advance(); // consume >

    const isHook = this.check(TokenType.LBRACKET);
    this.pos = savedPos;
    return isHook;
  }

  /**
   * Check if current position is a hook operation (@replace:, @append:, etc.)
   */
  private isHookOperation(): boolean {
    if (!this.check(TokenType.DIRECTIVE)) return false;

    const directiveValue = this.peek().value;
    const operations = ['@replace', '@append', '@prepend', '@show', '@hide'];
    return operations.includes(directiveValue);
  }

  /**
   * Check if current position is an inline media directive (@image, @audio, @video, @embed)
   */
  private isInlineMediaDirective(): boolean {
    if (!this.check(TokenType.DIRECTIVE)) return false;

    const directiveValue = this.peek().value;
    const mediaDirectives = ['@image', '@audio', '@video', '@embed'];
    return mediaDirectives.includes(directiveValue);
  }

  /**
   * Parse a hook definition: |hookName>[content]
   */
  private parseHookDefinition(): HookDefinitionNode {
    const start = this.peek();

    // Consume |
    this.expect(TokenType.PIPE, 'Expected "|" for hook definition');

    // Parse hook name
    if (!this.check(TokenType.IDENTIFIER)) {
      this.addError('Expected hook name after "|"');
    }
    const name = this.check(TokenType.IDENTIFIER) ? this.advance().value : 'unnamed';

    // Consume >
    this.expect(TokenType.GT, 'Expected ">" after hook name');

    // Consume [
    this.expect(TokenType.LBRACKET, 'Expected "[" after ">"');

    // Parse content until matching ] (handle nesting)
    const content = this.parseHookContentString(TokenType.LBRACKET, TokenType.RBRACKET);

    // Consume ]
    this.expect(TokenType.RBRACKET, 'Expected "]" to close hook definition');

    return {
      type: 'hook_definition',
      name,
      content,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse a hook operation: @operation: target { content }
   */
  private parseHookOperation(): HookOperationNode {
    const start = this.peek();

    // Consume @operation directive
    const directiveToken = this.advance();
    const operationName = directiveToken.value.slice(1); // Remove @

    // Validate operation type
    const validOperations = ['replace', 'append', 'prepend', 'show', 'hide'] as const;
    if (!validOperations.includes(operationName as typeof validOperations[number])) {
      this.addError(`Invalid hook operation: ${operationName}`);
    }
    const operation = operationName as 'replace' | 'append' | 'prepend' | 'show' | 'hide';

    // Consume :
    this.expect(TokenType.COLON, 'Expected ":" after hook operation');

    // Parse target hook name
    if (!this.check(TokenType.IDENTIFIER)) {
      this.addError('Expected target hook name after ":"');
    }
    const target = this.check(TokenType.IDENTIFIER) ? this.advance().value : 'unnamed';

    // For show/hide operations, content is optional (empty string)
    let content = '';

    // Check for { content }
    if (this.match(TokenType.LBRACE)) {
      content = this.parseHookContentString(TokenType.LBRACE, TokenType.RBRACE);
      this.expect(TokenType.RBRACE, 'Expected "}" to close hook operation');
    }

    return {
      type: 'hook_operation',
      operation,
      target,
      content,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse content inside a hook as a string until the closing delimiter
   * Handles nested brackets/braces and preserves whitespace between tokens
   */
  private parseHookContentString(openToken: TokenType, closeToken: TokenType): string {
    let content = '';
    let depth = 1;
    let lastToken: Token | null = null;

    while (!this.isAtEnd() && depth > 0) {
      const currentToken = this.peek();

      // Check for nesting
      if (this.check(openToken)) {
        depth++;
        content += this.advance().value;
        lastToken = currentToken;
      } else if (this.check(closeToken)) {
        depth--;
        if (depth === 0) break;
        content += this.advance().value;
        lastToken = currentToken;
      } else if (this.check(TokenType.NEWLINE)) {
        content += '\n';
        this.advance();
        lastToken = null; // Reset after newline
      } else {
        // Add space between tokens if there was whitespace in original source
        if (lastToken && content.length > 0) {
          const lastEnd = lastToken.location.end.offset;
          const currentStart = currentToken.location.start.offset;
          if (currentStart > lastEnd) {
            // There was whitespace between tokens in original source
            content += ' ';
          }
        }
        content += this.advance().value;
        lastToken = currentToken;
      }
    }

    return content.trim();
  }

  // ============================================================================
  // Conditional Parsing
  // ============================================================================

  private parseConditionalOrAlternatives(): ContentNode {
    const start = this.peek();
    this.advance(); // {

    // Check for alternatives: {| a | b } or {&| cycle } or {~| shuffle } or {!| once }
    if (this.check(TokenType.PIPE)) {
      return this.parseAlternatives(start, 'sequence');
    }
    if (this.check(TokenType.AMPERSAND)) {
      this.advance();
      this.expect(TokenType.PIPE, 'Expected "|" after "&"');
      return this.parseAlternatives(start, 'cycle');
    }
    if (this.check(TokenType.TILDE)) {
      this.advance();
      this.expect(TokenType.PIPE, 'Expected "|" after "~"');
      return this.parseAlternatives(start, 'shuffle');
    }
    if (this.check(TokenType.EXCLAMATION)) {
      this.advance();
      this.expect(TokenType.PIPE, 'Expected "|" after "!"');
      return this.parseAlternatives(start, 'once');
    }

    // Do block (action/script): {do expr; expr2; ...}
    if (this.check(TokenType.DO)) {
      this.advance(); // consume 'do'
      const actions: ExpressionNode[] = [];
      while (!this.isAtEnd() && !this.check(TokenType.RBRACE)) {
        actions.push(this.parseExpression());
        this.match(TokenType.SEMICOLON); // optional semicolon between statements
      }
      this.expect(TokenType.RBRACE, 'Expected "}" after do block');
      return {
        type: 'do_block',
        actions,
        location: { start: start.location.start, end: this.tokens[this.pos - 1].location.end },
      } as DoBlockNode;
    }

    // Await expression ({await ThreadName})
    if (this.check(TokenType.AWAIT)) {
      this.advance(); // consume 'await'
      let threadName = '';
      if (this.check(TokenType.IDENTIFIER)) {
        threadName = this.advance().value;
        // Allow multi-word thread names
        while (this.check(TokenType.IDENTIFIER)) {
          threadName += ' ' + this.advance().value;
        }
      } else {
        this.addError('Expected thread name after await');
        threadName = 'unknown';
      }
      this.expect(TokenType.RBRACE, 'Expected "}" after await');
      return {
        type: 'await_expression',
        threadName,
        location: { start: start.location.start, end: this.tokens[this.pos - 1].location.end },
      } as AwaitExpressionNode;
    }

    // Spawn expression ({spawn -> PassageName} or {spawn PassageName})
    if (this.check(TokenType.SPAWN)) {
      this.advance(); // consume 'spawn'
      this.match(TokenType.ARROW); // optional arrow
      let passageName = '';
      if (this.check(TokenType.IDENTIFIER)) {
        passageName = this.advance().value;
        // Allow multi-word passage names
        while (this.check(TokenType.IDENTIFIER)) {
          passageName += ' ' + this.advance().value;
        }
      } else {
        this.addError('Expected passage name after spawn');
        passageName = 'unknown';
      }
      this.expect(TokenType.RBRACE, 'Expected "}" after spawn');
      return {
        type: 'spawn_expression',
        passageName,
        location: { start: start.location.start, end: this.tokens[this.pos - 1].location.end },
      } as SpawnExpressionNode;
    }

    // Conditional block
    const condition = this.parseExpression();

    // Inline conditional: { cond : trueText | falseText }
    if (this.match(TokenType.COLON)) {
      return this.parseInlineConditional(start, condition);
    }

    this.expect(TokenType.RBRACE, 'Expected "}" after condition');
    this.skipNewlines();

    // Parse consequent content
    const consequent = this.parseConditionalContent();
    const alternatives: ConditionalBranchNode[] = [];
    let alternate: ContentNode[] | null = null;

    // Parse elif branches
    while (this.match(TokenType.LBRACE)) {
      if (this.match(TokenType.ELIF)) {
        const elifStart = this.tokens[this.pos - 1];
        const elifCondition = this.parseExpression();
        this.expect(TokenType.RBRACE, 'Expected "}" after elif condition');
        this.skipNewlines();

        alternatives.push({
          type: 'conditional_branch',
          condition: elifCondition,
          content: this.parseConditionalContent(),
          location: this.getLocation(elifStart),
        });
      } else if (this.match(TokenType.ELSE)) {
        this.expect(TokenType.RBRACE, 'Expected "}" after else');
        this.skipNewlines();
        alternate = this.parseConditionalContent();
        break;
      } else if (this.check(TokenType.SLASH)) {
        // {/} - end of conditional
        this.advance();
        this.expect(TokenType.RBRACE, 'Expected "}" after "/"');
        break;
      } else {
        // Not a conditional continuation, put back the brace
        this.pos--;
        break;
      }
    }

    // Handle standalone {/}
    if (this.match(TokenType.COND_END)) {
      // Already consumed
    }

    return {
      type: 'conditional',
      condition,
      consequent,
      alternatives,
      alternate,
      location: this.getLocation(start),
    };
  }

  private parseInlineConditional(start: Token, condition: ExpressionNode): ConditionalNode {
    const consequent: ContentNode[] = [];

    // Parse true branch until | or }
    while (!this.isAtEnd() && !this.check(TokenType.PIPE) && !this.check(TokenType.RBRACE)) {
      const token = this.advance();
      consequent.push({
        type: 'text',
        value: token.value,
        location: token.location,
      });
    }

    let alternate: ContentNode[] | null = null;
    if (this.match(TokenType.PIPE)) {
      alternate = [];
      while (!this.isAtEnd() && !this.check(TokenType.RBRACE)) {
        const token = this.advance();
        alternate.push({
          type: 'text',
          value: token.value,
          location: token.location,
        });
      }
    }

    this.expect(TokenType.RBRACE, 'Expected "}" after inline conditional');

    return {
      type: 'conditional',
      condition,
      consequent,
      alternatives: [],
      alternate,
      location: this.getLocation(start),
    };
  }

  private parseConditionalContent(): ContentNode[] {
    const content: ContentNode[] = [];

    while (!this.isAtEnd()) {
      // Check for end markers
      if (this.check(TokenType.LBRACE)) {
        const next = this.peekNext();
        if (next.type === TokenType.ELIF ||
            next.type === TokenType.ELSE ||
            next.type === TokenType.SLASH) {
          break;
        }
      }
      if (this.check(TokenType.COND_END)) {
        break;
      }
      if (this.check(TokenType.PASSAGE_MARKER)) {
        break;
      }

      const node = this.parseContentNode();
      if (node) {
        content.push(node);
      } else if (this.check(TokenType.NEWLINE)) {
        content.push({
          type: 'text',
          value: '\n',
          location: this.peek().location,
        });
        this.advance();
      } else if (!this.isAtEnd()) {
        const token = this.advance();
        content.push({
          type: 'text',
          value: token.value,
          location: token.location,
        });
      }
    }

    return content;
  }

  private parseAlternatives(start: Token, mode: 'sequence' | 'cycle' | 'shuffle' | 'once'): AlternativesNode {
    const options: ContentNode[][] = [];
    let currentOption: ContentNode[] = [];

    while (!this.isAtEnd() && !this.check(TokenType.RBRACE)) {
      if (this.match(TokenType.PIPE)) {
        options.push(currentOption);
        currentOption = [];
      } else {
        const token = this.advance();
        currentOption.push({
          type: 'text',
          value: token.value,
          location: token.location,
        });
      }
    }

    if (currentOption.length > 0) {
      options.push(currentOption);
    }

    this.expect(TokenType.RBRACE, 'Expected "}" after alternatives');

    return {
      type: 'alternatives',
      mode,
      options,
      location: this.getLocation(start),
    };
  }

  // ============================================================================
  // Interpolation Parsing
  // ============================================================================

  private parseInterpolation(): InterpolationNode {
    const start = this.advance(); // ${
    const expression = this.parseExpression();
    this.expect(TokenType.RBRACE, 'Expected "}" after expression');

    return {
      type: 'interpolation',
      expression,
      isSimple: false,
      location: this.getLocation(start),
    };
  }

  private parseVariableInterpolation(): InterpolationNode {
    const start = this.advance(); // $

    let name: string;
    let scope: 'story' | 'temp' = 'story';

    if (this.check(TokenType.UNDERSCORE) || (this.check(TokenType.IDENTIFIER) && this.peek().value.startsWith('_'))) {
      // Temp variable $_var
      if (this.check(TokenType.UNDERSCORE)) {
        this.advance();
      }
      name = this.check(TokenType.IDENTIFIER) ? this.advance().value : '';
      scope = 'temp';
    } else if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance().value;
    } else {
      this.addError('Expected variable name after "$"', {
        code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
        suggestion: 'Provide a variable name after "$"',
      });
      name = '';
    }

    const variable: VariableNode = {
      type: 'variable',
      name,
      scope,
      location: this.getLocation(start),
    };

    return {
      type: 'interpolation',
      expression: variable,
      isSimple: true,
      location: this.getLocation(start),
    };
  }

  // ============================================================================
  // Text Parsing
  // ============================================================================

  private parseText(): TextNode {
    const start = this.peek();
    let value = '';

    while (!this.isAtEnd() &&
           !this.check(TokenType.NEWLINE) &&
           !this.check(TokenType.PASSAGE_MARKER) &&
           !this.check(TokenType.ONCE_CHOICE_MARKER) &&
           !this.check(TokenType.STICKY_CHOICE_MARKER) &&
           !this.check(TokenType.LBRACE) &&
           !this.check(TokenType.RBRACE) &&
           !this.check(TokenType.LBRACKET) &&
           !this.check(TokenType.RBRACKET) &&
           !this.check(TokenType.EXPR_START) &&
           !this.check(TokenType.DOLLAR) &&
           !this.check(TokenType.ARROW) &&
           !this.check(TokenType.PIPE) &&         // Stop for hook definitions
           !this.check(TokenType.BOLD_MARKER) &&  // Stop for rich text
           !this.check(TokenType.ITALIC_MARKER) &&
           !this.check(TokenType.STRIKETHROUGH_MARKER) &&
           !this.check(TokenType.INLINE_CODE) &&
           !this.check(TokenType.IMAGE_START) &&  // Stop for media
           !this.isHookOperation()) {              // Stop for hook operations
      value += this.advance().value;
    }

    return {
      type: 'text',
      value,
      location: this.getLocation(start),
    };
  }

  // ============================================================================
  // Rich Text Parsing
  // ============================================================================

  /**
   * Parse bold text (**text**)
   */
  private parseBold(): FormattedTextNode {
    const start = this.advance(); // consume **
    const content: ContentNode[] = [];

    // Parse content until closing **
    while (!this.isAtEnd() && !this.check(TokenType.BOLD_MARKER) && !this.check(TokenType.NEWLINE)) {
      const node = this.parseRichTextContent();
      if (node) {
        content.push(node);
      } else {
        break;
      }
    }

    // Expect closing **
    if (this.check(TokenType.BOLD_MARKER)) {
      this.advance();
    } else {
      this.addError('Unclosed bold text - expected **', {
        code: 'WLS-PRS-006' as WLSErrorCode,
        suggestion: 'Add closing ** to complete bold text',
      });
    }

    return {
      type: 'formatted_text',
      format: 'bold',
      content,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse italic text (*text*)
   */
  private parseItalic(): FormattedTextNode {
    const start = this.advance(); // consume *
    const content: ContentNode[] = [];

    // Parse content until closing *
    while (!this.isAtEnd() && !this.check(TokenType.ITALIC_MARKER) && !this.check(TokenType.NEWLINE)) {
      const node = this.parseRichTextContent();
      if (node) {
        content.push(node);
      } else {
        break;
      }
    }

    // Expect closing *
    if (this.check(TokenType.ITALIC_MARKER)) {
      this.advance();
    } else {
      this.addError('Unclosed italic text - expected *', {
        code: 'WLS-PRS-006' as WLSErrorCode,
        suggestion: 'Add closing * to complete italic text',
      });
    }

    return {
      type: 'formatted_text',
      format: 'italic',
      content,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse bold+italic text (***text***)
   * Handles the combined marker sequence: ** * content ** *
   */
  private parseBoldItalic(): FormattedTextNode {
    const start = this.advance(); // consume **
    this.advance(); // consume *
    const content: ContentNode[] = [];

    // Parse content until closing ** (which will be followed by *)
    while (!this.isAtEnd() &&
           !this.check(TokenType.NEWLINE) &&
           !(this.check(TokenType.BOLD_MARKER) && this.peekNext()?.type === TokenType.ITALIC_MARKER)) {
      // Also stop if we just see ** (might be malformed)
      if (this.check(TokenType.BOLD_MARKER)) break;

      const node = this.parseRichTextContent();
      if (node) {
        content.push(node);
      } else {
        break;
      }
    }

    // Expect closing ** *
    if (this.check(TokenType.BOLD_MARKER)) {
      this.advance(); // consume **
      if (this.check(TokenType.ITALIC_MARKER)) {
        this.advance(); // consume *
      }
    } else {
      this.addError('Unclosed bold+italic text - expected ***', {
        code: 'WLS-PRS-006' as WLSErrorCode,
        suggestion: 'Add closing *** to complete bold+italic text',
      });
    }

    return {
      type: 'formatted_text',
      format: 'bold_italic',
      content,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse strikethrough text (~~text~~)
   */
  private parseStrikethrough(): FormattedTextNode {
    const start = this.advance(); // consume ~~
    const content: ContentNode[] = [];

    // Parse content until closing ~~
    while (!this.isAtEnd() && !this.check(TokenType.STRIKETHROUGH_MARKER) && !this.check(TokenType.NEWLINE)) {
      const node = this.parseRichTextContent();
      if (node) {
        content.push(node);
      } else {
        break;
      }
    }

    // Expect closing ~~
    if (this.check(TokenType.STRIKETHROUGH_MARKER)) {
      this.advance();
    } else {
      this.addError('Unclosed strikethrough text - expected ~~', {
        code: 'WLS-PRS-006' as WLSErrorCode,
        suggestion: 'Add closing ~~ to complete strikethrough text',
      });
    }

    return {
      type: 'formatted_text',
      format: 'strikethrough',
      content,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse inline code (`code`)
   */
  private parseInlineCode(): FormattedTextNode {
    const token = this.advance(); // consume INLINE_CODE token (already contains the code)

    return {
      type: 'formatted_text',
      format: 'code',
      content: [{
        type: 'text',
        value: token.value,
        location: token.location,
      }],
      location: token.location,
    };
  }

  /**
   * Parse code block (```code```)
   */
  private parseCodeBlock(): ContentNode {
    const start = this.advance(); // consume opening ```

    // Skip newline after opening fence
    this.match(TokenType.NEWLINE);

    // Collect code until closing ```
    let code = '';
    while (!this.isAtEnd() && !this.check(TokenType.CODE_FENCE)) {
      if (this.check(TokenType.NEWLINE)) {
        code += '\n';
        this.advance();
      } else {
        code += this.advance().value;
      }
    }

    // Consume closing ```
    if (this.check(TokenType.CODE_FENCE)) {
      this.advance();
    } else {
      this.addError('Unclosed code block - expected closing ```', {
        code: 'WLS-PRS-006' as WLSErrorCode,
        suggestion: 'Add closing ``` to complete code block',
      });
    }

    // Return as formatted_text with code format
    return {
      type: 'formatted_text',
      format: 'code',
      content: [{
        type: 'text',
        value: code.trim(),
        location: this.getLocation(start),
      } as TextNode],
      location: this.getLocation(start),
    } as FormattedTextNode;
  }

  /**
   * Parse blockquote (> text)
   */
  private parseBlockquote(): BlockquoteNode {
    const start = this.peek();
    let depth = 0;

    // Count consecutive > markers for nested blockquotes
    while (this.check(TokenType.BLOCKQUOTE_MARKER)) {
      this.advance();
      depth++;
      // Skip space after >
      this.skipWhitespaceOnLine();
    }

    // Parse content until end of line
    const content: ContentNode[] = [];
    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE) && !this.check(TokenType.PASSAGE_MARKER)) {
      const node = this.parseRichTextContent();
      if (node) {
        content.push(node);
      } else {
        const token = this.advance();
        content.push({
          type: 'text',
          value: token.value,
          location: token.location,
        });
      }
    }

    return {
      type: 'blockquote',
      content,
      depth,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse list (- item or 1. item)
   */
  private parseList(): ListNode {
    const start = this.peek();
    const ordered = this.check(TokenType.LIST_MARKER_ORDERED);
    const items: ListItemNode[] = [];

    // Parse list items
    while ((this.check(TokenType.LIST_MARKER_UNORDERED) || this.check(TokenType.LIST_MARKER_ORDERED)) &&
           (ordered ? this.check(TokenType.LIST_MARKER_ORDERED) : this.check(TokenType.LIST_MARKER_UNORDERED))) {
      const item = this.parseListItem(ordered);
      items.push(item);

      // Skip newlines between items
      this.skipNewlines();
    }

    return {
      type: 'list',
      ordered,
      items,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse a single list item
   */
  private parseListItem(_ordered: boolean): ListItemNode {
    const start = this.advance(); // consume list marker (- or 1.)
    // Skip space after marker
    this.skipWhitespaceOnLine();

    // Parse content until end of line
    const content: ContentNode[] = [];
    while (!this.isAtEnd() && !this.check(TokenType.NEWLINE) && !this.check(TokenType.PASSAGE_MARKER)) {
      const node = this.parseRichTextContent();
      if (node) {
        content.push(node);
      } else {
        const token = this.advance();
        content.push({
          type: 'text',
          value: token.value,
          location: token.location,
        });
      }
    }

    return {
      type: 'list_item',
      content,
      children: null, // TODO: Support nested lists
      location: this.getLocation(start),
    };
  }

  /**
   * Parse horizontal rule (--- or *** or ___)
   */
  private parseHorizontalRule(): HorizontalRuleNode {
    const token = this.advance(); // consume HORIZONTAL_RULE token

    return {
      type: 'horizontal_rule',
      location: token.location,
    };
  }

  /**
   * Parse content that can appear inside rich text formatting
   * (handles nested formatting and variable interpolation)
   */
  private parseRichTextContent(): ContentNode | null {
    // Bold (can be nested in italic)
    if (this.check(TokenType.BOLD_MARKER)) {
      return this.parseBold();
    }

    // Italic (can be nested in bold)
    if (this.check(TokenType.ITALIC_MARKER)) {
      return this.parseItalic();
    }

    // Strikethrough
    if (this.check(TokenType.STRIKETHROUGH_MARKER)) {
      return this.parseStrikethrough();
    }

    // Inline code
    if (this.check(TokenType.INLINE_CODE)) {
      return this.parseInlineCode();
    }

    // Variable interpolation
    if (this.check(TokenType.DOLLAR)) {
      return this.parseVariableInterpolation();
    }

    // Expression interpolation
    if (this.check(TokenType.EXPR_START)) {
      return this.parseInterpolation();
    }

    // Plain text (single token at a time for rich text)
    if (!this.isAtEnd() &&
        !this.check(TokenType.NEWLINE) &&
        !this.check(TokenType.BOLD_MARKER) &&
        !this.check(TokenType.ITALIC_MARKER) &&
        !this.check(TokenType.STRIKETHROUGH_MARKER) &&
        !this.check(TokenType.INLINE_CODE)) {
      const token = this.peek();
      // Don't consume closing markers
      if (token.type !== TokenType.PASSAGE_MARKER) {
        this.advance();
        return {
          type: 'text',
          value: token.value,
          location: token.location,
        };
      }
    }

    return null;
  }

  // ============================================================================
  // Media Parsing
  // ============================================================================

  /**
   * Parse markdown-style image: ![alt](src "title")
   */
  private parseMarkdownImage(): ImageNode {
    const start = this.advance(); // consume ![

    // Parse alt text until ]
    const altParts: string[] = [];
    while (!this.isAtEnd() && !this.check(TokenType.RBRACKET)) {
      altParts.push(this.advance().value);
    }
    const alt = altParts.join(' ').trim();

    // Expect ]
    if (!this.match(TokenType.RBRACKET)) {
      this.addError('Expected ] after image alt text', {
        code: 'WLS-PRS-003' as WLSErrorCode,
        suggestion: 'Add ] to close the alt text',
      });
    }

    // Expect (
    if (!this.match(TokenType.LPAREN)) {
      this.addError('Expected ( after image alt text', {
        code: 'WLS-PRS-003' as WLSErrorCode,
        suggestion: 'Add (src) after the alt text',
      });
      return {
        type: 'image',
        alt,
        src: '',
        attributes: {},
        location: this.getLocation(start),
      };
    }

    // Parse src until ) or "
    let src = '';
    let title: string | undefined;

    while (!this.isAtEnd() && !this.check(TokenType.RPAREN)) {
      if (this.check(TokenType.STRING)) {
        // This is the title
        title = this.advance().value.slice(1, -1); // Remove quotes
      } else {
        src += this.advance().value;
      }
    }

    src = src.trim();

    // Expect )
    if (!this.match(TokenType.RPAREN)) {
      this.addError('Expected ) after image src', {
        code: 'WLS-PRS-003' as WLSErrorCode,
        suggestion: 'Add ) to close the image',
      });
    }

    // Parse optional attributes {width:100 class:foo}
    const attributes = this.parseMediaAttributes();

    return {
      type: 'image',
      alt,
      src,
      attributes: { ...attributes, ...(title ? { title } : {}) } as MediaAttributes,
      location: this.getLocation(start),
    };
  }

  /**
   * Parse inline media directive: @image(src), @audio(src), @video(src), @embed(url)
   */
  private parseInlineMediaDirective(): ImageNode | AudioNode | VideoNode | EmbedNode {
    const start = this.advance(); // consume directive
    const directiveType = start.value.slice(1); // Remove @

    // Expect (
    if (!this.match(TokenType.LPAREN)) {
      this.addError(`Expected ( after ${start.value}`, {
        code: 'WLS-PRS-003' as WLSErrorCode,
        suggestion: `Add (src) after ${start.value}`,
      });
    }

    // Parse src until )
    let src = '';
    while (!this.isAtEnd() && !this.check(TokenType.RPAREN)) {
      if (this.check(TokenType.STRING)) {
        // STRING tokens already have quotes stripped by the lexer
        src = this.advance().value;
      } else {
        src += this.advance().value;
      }
    }

    src = src.trim();

    // Expect )
    if (!this.match(TokenType.RPAREN)) {
      this.addError(`Expected ) after ${start.value} src`, {
        code: 'WLS-PRS-003' as WLSErrorCode,
        suggestion: 'Add ) to close the media element',
      });
    }

    // Parse optional attributes
    const attributes = this.parseMediaAttributes();

    switch (directiveType) {
      case 'image':
        return {
          type: 'image',
          alt: '',
          src,
          attributes,
          location: this.getLocation(start),
        };
      case 'audio':
        return {
          type: 'audio',
          src,
          attributes: attributes as AudioAttributes,
          location: this.getLocation(start),
        };
      case 'video':
        return {
          type: 'video',
          src,
          attributes: attributes as VideoAttributes,
          location: this.getLocation(start),
        };
      case 'embed':
        return {
          type: 'embed',
          src,
          attributes: attributes as EmbedAttributes,
          location: this.getLocation(start),
        };
      default:
        // Should never happen
        return {
          type: 'image',
          alt: '',
          src,
          attributes,
          location: this.getLocation(start),
        };
    }
  }

  /**
   * Check if this is a bracket-based media element: [audio], [video], [embed]
   */
  private isBracketMediaElement(): boolean {
    if (!this.check(TokenType.LBRACKET)) return false;

    // Lookahead to see if next token is audio, video, or embed
    const nextPos = this.pos + 1;
    if (nextPos >= this.tokens.length) return false;

    const nextToken = this.tokens[nextPos];
    if (nextToken.type !== TokenType.IDENTIFIER) return false;

    const keyword = nextToken.value.toLowerCase();
    return keyword === 'audio' || keyword === 'video' || keyword === 'embed';
  }

  /**
   * Parse bracket-based media: [audio](src), [video](src), [embed](src)
   */
  private parseBracketMediaElement(): AudioNode | VideoNode | EmbedNode {
    const start = this.advance(); // consume [

    // Get media type
    const mediaType = this.advance().value.toLowerCase();

    // Expect ]
    if (!this.match(TokenType.RBRACKET)) {
      this.addError(`Expected ] after ${mediaType}`);
    }

    // Expect (
    if (!this.match(TokenType.LPAREN)) {
      this.addError(`Expected (src) after [${mediaType}]`);
    }

    // Parse src until )
    let src = '';
    while (!this.isAtEnd() && !this.check(TokenType.RPAREN)) {
      if (this.check(TokenType.STRING)) {
        src = this.advance().value;
      } else {
        src += this.advance().value;
      }
    }

    src = src.trim();

    // Expect )
    this.match(TokenType.RPAREN);

    // Parse optional attributes
    const attributes = this.parseMediaAttributes();

    switch (mediaType) {
      case 'audio':
        return {
          type: 'audio',
          src,
          attributes: attributes as AudioAttributes,
          location: this.getLocation(start),
        };
      case 'video':
        return {
          type: 'video',
          src,
          attributes: attributes as VideoAttributes,
          location: this.getLocation(start),
        };
      case 'embed':
      default:
        return {
          type: 'embed',
          src,
          attributes: attributes as EmbedAttributes,
          location: this.getLocation(start),
        };
    }
  }

  /**
   * Parse media attributes: {width:100 height:50 class:foo loop autoplay volume:0.5}
   * Supports:
   * - Common: width, height, class, align, id, title
   * - Audio: loop, autoplay, controls, muted, volume, preload
   * - Video: loop, autoplay, controls, muted, poster, preload
   * - Embed: sandbox, allow
   */
  private parseMediaAttributes(): MediaAttributes {
    const attributes: MediaAttributes = {};

    if (!this.check(TokenType.LBRACE)) {
      return attributes;
    }

    this.advance(); // consume {

    while (!this.isAtEnd() && !this.check(TokenType.RBRACE)) {
      // Skip whitespace tokens
      if (this.check(TokenType.TEXT) && this.peek().value.trim() === '') {
        this.advance();
        continue;
      }

      // Parse attribute name
      if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.TEXT)) {
        const name = this.advance().value.trim();

        // Check for : separator
        if (this.check(TokenType.COLON)) {
          this.advance(); // consume :

          // Parse attribute value
          if (this.check(TokenType.NUMBER)) {
            const value = this.advance().value;
            if (name === 'width') attributes.width = value;
            else if (name === 'height') attributes.height = value;
            else if (name === 'volume') (attributes as AudioAttributes).volume = parseFloat(value);
          } else if (this.check(TokenType.STRING)) {
            const value = this.advance().value;
            if (name === 'class') attributes.class = value;
            else if (name === 'id') attributes.id = value;
            else if (name === 'title') attributes.title = value;
            else if (name === 'poster') (attributes as VideoAttributes).poster = value;
            else if (name === 'allow') (attributes as EmbedAttributes).allow = value;
            else if (name === 'preload') (attributes as AudioAttributes).preload = value;
          } else if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.TEXT)) {
            // Collect full value including dots (for file paths like thumb.png)
            let value = this.advance().value.trim();
            while (this.check(TokenType.DOT)) {
              this.advance(); // consume .
              if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.TEXT)) {
                value += '.' + this.advance().value;
              }
            }

            if (name === 'class') attributes.class = value;
            else if (name === 'id') attributes.id = value;
            else if (name === 'title') attributes.title = value;
            else if (name === 'align') {
              if (value === 'left' || value === 'center' || value === 'right') {
                attributes.align = value;
              }
            }
            else if (name === 'poster') (attributes as VideoAttributes).poster = value;
            else if (name === 'allow') (attributes as EmbedAttributes).allow = value;
            else if (name === 'preload') (attributes as AudioAttributes).preload = value;
            // Handle dimension values with units (e.g., 100px, 50%)
            else if (name === 'width') attributes.width = value;
            else if (name === 'height') attributes.height = value;
          }
        } else {
          // Boolean attribute (just the name)
          if (name === 'loop') (attributes as AudioAttributes).loop = true;
          else if (name === 'autoplay') (attributes as AudioAttributes).autoplay = true;
          else if (name === 'controls') (attributes as AudioAttributes).controls = true;
          else if (name === 'muted') (attributes as AudioAttributes).muted = true;
          else if (name === 'sandbox') (attributes as EmbedAttributes).sandbox = true;
        }
      } else {
        // Skip unexpected tokens
        this.advance();
      }
    }

    // Consume }
    this.match(TokenType.RBRACE);

    return attributes;
  }

  // ============================================================================
  // Expression Parsing
  // ============================================================================

  private parseExpression(): ExpressionNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ExpressionNode {
    const expr = this.parseOr();

    if (this.check(TokenType.ASSIGN) ||
        this.check(TokenType.PLUS_ASSIGN) ||
        this.check(TokenType.MINUS_ASSIGN) ||
        this.check(TokenType.STAR_ASSIGN) ||
        this.check(TokenType.SLASH_ASSIGN)) {
      const opToken = this.advance();
      const operator = opToken.value as AssignmentOperator;
      const value = this.parseAssignment();

      // Allow variable, identifier, or member_expression as assignment target
      if (expr.type !== 'variable' && expr.type !== 'identifier' && expr.type !== 'member_expression') {
        this.addError('Invalid assignment target', {
          code: WLS_ERROR_CODES.UNEXPECTED_TOKEN,
          suggestion: 'Assignment target must be a variable or property access',
        });
      }

      return {
        type: 'assignment_expression',
        operator,
        target: expr as VariableNode | MemberExpressionNode,
        value,
        location: this.getLocation(this.tokens[this.pos - 1]),
      };
    }

    return expr;
  }

  private parseOr(): ExpressionNode {
    let left = this.parseAnd();

    while (this.match(TokenType.OR)) {
      const right = this.parseAnd();
      left = {
        type: 'binary_expression',
        operator: 'or',
        left,
        right,
        location: this.getLocation(this.tokens[this.pos - 1]),
      };
    }

    return left;
  }

  private parseAnd(): ExpressionNode {
    let left = this.parseEquality();

    while (this.match(TokenType.AND)) {
      const right = this.parseEquality();
      left = {
        type: 'binary_expression',
        operator: 'and',
        left,
        right,
        location: this.getLocation(this.tokens[this.pos - 1]),
      };
    }

    return left;
  }

  private parseEquality(): ExpressionNode {
    let left = this.parseComparison();

    while (this.match(TokenType.EQ, TokenType.NEQ)) {
      const operator = this.tokens[this.pos - 1].value as BinaryOperator;
      const right = this.parseComparison();
      left = {
        type: 'binary_expression',
        operator,
        left,
        right,
        location: this.getLocation(this.tokens[this.pos - 1]),
      };
    }

    return left;
  }

  private parseComparison(): ExpressionNode {
    let left = this.parseConcatenation();

    while (this.match(TokenType.LT, TokenType.GT, TokenType.LTE, TokenType.GTE)) {
      const operator = this.tokens[this.pos - 1].value as BinaryOperator;
      const right = this.parseConcatenation();
      left = {
        type: 'binary_expression',
        operator,
        left,
        right,
        location: this.getLocation(this.tokens[this.pos - 1]),
      };
    }

    return left;
  }

  private parseConcatenation(): ExpressionNode {
    let left = this.parseAddition();

    while (this.match(TokenType.DOTDOT)) {
      const right = this.parseAddition();
      left = {
        type: 'binary_expression',
        operator: '..',
        left,
        right,
        location: this.getLocation(this.tokens[this.pos - 1]),
      };
    }

    return left;
  }

  private parseAddition(): ExpressionNode {
    let left = this.parseMultiplication();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.tokens[this.pos - 1].value as BinaryOperator;
      const right = this.parseMultiplication();
      left = {
        type: 'binary_expression',
        operator,
        left,
        right,
        location: this.getLocation(this.tokens[this.pos - 1]),
      };
    }

    return left;
  }

  private parseMultiplication(): ExpressionNode {
    let left = this.parsePower();

    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
      const operator = this.tokens[this.pos - 1].value as BinaryOperator;
      const right = this.parsePower();
      left = {
        type: 'binary_expression',
        operator,
        left,
        right,
        location: this.getLocation(this.tokens[this.pos - 1]),
      };
    }

    return left;
  }

  private parsePower(): ExpressionNode {
    const left = this.parseUnary();

    if (this.match(TokenType.CARET)) {
      const right = this.parsePower(); // Right associative
      return {
        type: 'binary_expression',
        operator: '^',
        left,
        right,
        location: this.getLocation(this.tokens[this.pos - 1]),
      };
    }

    return left;
  }

  private parseUnary(): ExpressionNode {
    if (this.match(TokenType.NOT)) {
      const argument = this.parseUnary();
      return {
        type: 'unary_expression',
        operator: 'not',
        argument,
        location: this.getLocation(this.tokens[this.pos - 1]),
      };
    }

    if (this.match(TokenType.MINUS)) {
      const argument = this.parseUnary();
      return {
        type: 'unary_expression',
        operator: '-',
        argument,
        location: this.getLocation(this.tokens[this.pos - 1]),
      };
    }

    if (this.match(TokenType.HASH)) {
      const argument = this.parseUnary();
      return {
        type: 'unary_expression',
        operator: '#',
        argument,
        location: this.getLocation(this.tokens[this.pos - 1]),
      };
    }

    return this.parseCall();
  }

  private parseCall(): ExpressionNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(TokenType.LPAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        if (this.check(TokenType.IDENTIFIER)) {
          const property = this.advance().value;
          expr = {
            type: 'member_expression',
            object: expr,
            property,
            location: this.getLocation(this.tokens[this.pos - 1]),
          };
        } else {
          this.addError('Expected property name after "."', {
            code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
          });
        }
      } else if (this.match(TokenType.PLUS_PLUS)) {
        // Postfix increment: x++ becomes x += 1
        // Accept variables, identifiers (bare variables), and member expressions
        if (expr.type === 'variable' || expr.type === 'identifier' || expr.type === 'member_expression') {
          // Convert identifier to variable for the target
          const target = expr.type === 'identifier'
            ? { type: 'variable' as const, name: (expr as any).name, scope: 'story' as const, location: expr.location }
            : expr as VariableNode | MemberExpressionNode;
          expr = {
            type: 'assignment_expression',
            operator: '+=',
            target,
            value: {
              type: 'literal',
              valueType: 'number',
              value: 1,
              location: this.getLocation(this.tokens[this.pos - 1]),
            },
            location: this.getLocation(this.tokens[this.pos - 1]),
          };
        } else {
          this.addError('Increment operator requires a variable', {
            code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
          });
        }
      } else if (this.match(TokenType.MINUS_MINUS)) {
        // Postfix decrement: x-- becomes x -= 1
        // Accept variables, identifiers (bare variables), and member expressions
        if (expr.type === 'variable' || expr.type === 'identifier' || expr.type === 'member_expression') {
          // Convert identifier to variable for the target
          const target = expr.type === 'identifier'
            ? { type: 'variable' as const, name: (expr as any).name, scope: 'story' as const, location: expr.location }
            : expr as VariableNode | MemberExpressionNode;
          expr = {
            type: 'assignment_expression',
            operator: '-=',
            target,
            value: {
              type: 'literal',
              valueType: 'number',
              value: 1,
              location: this.getLocation(this.tokens[this.pos - 1]),
            },
            location: this.getLocation(this.tokens[this.pos - 1]),
          };
        } else {
          this.addError('Decrement operator requires a variable', {
            code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
          });
        }
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: ExpressionNode): CallExpressionNode {
    const args: ExpressionNode[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }

    this.expect(TokenType.RPAREN, 'Expected ")" after arguments');

    return {
      type: 'call_expression',
      callee,
      arguments: args,
      location: this.getLocation(this.tokens[this.pos - 1]),
    };
  }

  private parsePrimary(): ExpressionNode {
    const start = this.peek();

    // Boolean literals
    if (this.match(TokenType.TRUE)) {
      return {
        type: 'literal',
        valueType: 'boolean',
        value: true,
        location: this.getLocation(start),
      };
    }

    if (this.match(TokenType.FALSE)) {
      return {
        type: 'literal',
        valueType: 'boolean',
        value: false,
        location: this.getLocation(start),
      };
    }

    // Nil literal
    if (this.match(TokenType.NIL)) {
      return {
        type: 'literal',
        valueType: 'nil',
        value: null,
        location: this.getLocation(start),
      };
    }

    // Number literal
    if (this.match(TokenType.NUMBER)) {
      return {
        type: 'literal',
        valueType: 'number',
        value: parseFloat(this.tokens[this.pos - 1].value),
        location: this.getLocation(start),
      };
    }

    // String literal
    if (this.match(TokenType.STRING)) {
      return {
        type: 'literal',
        valueType: 'string',
        value: this.tokens[this.pos - 1].value,
        location: this.getLocation(start),
      };
    }

    // Variable ($name or _name)
    if (this.match(TokenType.DOLLAR)) {
      let name: string;
      let scope: 'story' | 'temp' = 'story';

      if (this.check(TokenType.UNDERSCORE)) {
        this.advance();
        scope = 'temp';
      }

      if (this.check(TokenType.IDENTIFIER)) {
        name = this.advance().value;
        if (scope === 'temp' || name.startsWith('_')) {
          scope = 'temp';
          name = name.replace(/^_/, '');
        }
      } else {
        this.addError('Expected variable name after "$"', {
          code: WLS_ERROR_CODES.EXPECTED_EXPRESSION,
          suggestion: 'Provide a variable name after "$"',
        });
        name = '';
      }

      return {
        type: 'variable',
        name,
        scope,
        location: this.getLocation(start),
      };
    }

    // Temp variable (_name)
    if (this.match(TokenType.UNDERSCORE)) {
      const name = this.check(TokenType.IDENTIFIER) ? this.advance().value : '';
      return {
        type: 'variable',
        name,
        scope: 'temp',
        location: this.getLocation(start),
      };
    }

    // Identifier (could be temp variable starting with _)
    if (this.match(TokenType.IDENTIFIER)) {
      const name = this.tokens[this.pos - 1].value;
      if (name.startsWith('_')) {
        return {
          type: 'variable',
          name: name.slice(1),
          scope: 'temp',
          location: this.getLocation(start),
        };
      }
      return {
        type: 'identifier',
        name,
        location: this.getLocation(start),
      };
    }

    // Grouped expression
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN, 'Expected ")" after expression');
      return expr;
    }

    // Error fallback
    this.addError(`Unexpected token: ${this.peek().value}`, {
      code: WLS_ERROR_CODES.UNEXPECTED_TOKEN,
    });
    this.advance();
    return {
      type: 'literal',
      valueType: 'nil',
      value: null,
      location: this.getLocation(start),
    };
  }
}

/**
 * Convenience function to parse source
 */
export function parse(source: string): ParseResult {
  const parser = new Parser();
  return parser.parse(source);
}

/**
 * Result of parsing a single passage
 */
export interface PassageParseResult {
  content: ContentNode[];
  errors: ParseError[];
}

/**
 * Parse a passage content string (without passage marker)
 * Useful for testing hook parsing
 */
export function parsePassage(content: string): PassageParseResult {
  // Wrap content in a passage to parse it
  const source = `:: TestPassage\n${content}`;
  const parser = new Parser();
  const result = parser.parse(source);

  if (!result.ast || result.ast.passages.length === 0) {
    return {
      content: [],
      errors: result.errors,
    };
  }

  return {
    content: result.ast.passages[0].content,
    errors: result.errors,
  };
}
