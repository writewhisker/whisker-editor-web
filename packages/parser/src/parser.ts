/**
 * WLS 1.0 Parser
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
  ContentNode,
  TextNode,
  InterpolationNode,
  DoBlockNode,
  ConditionalNode,
  ConditionalBranchNode,
  ChoiceNode,
  AlternativesNode,
  ExpressionNode,
  VariableNode,
  CallExpressionNode,
  MemberExpressionNode,
  ParseError,
  ParseResult,
  BinaryOperator,
  AssignmentOperator,
} from './ast';

/**
 * Parser for WLS 1.0 format
 */
export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private errors: ParseError[] = [];

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

  private addError(message: string, suggestion?: string): void {
    this.errors.push({
      message,
      location: this.peek().location,
      suggestion,
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
    const passages: PassageNode[] = [];

    this.skipNewlines();

    // Handle empty input
    if (this.isAtEnd()) {
      return {
        type: 'story',
        metadata,
        variables,
        passages,
        location: this.getLocation(start),
      };
    }

    // Parse metadata and variables before first passage
    while (!this.isAtEnd() && !this.check(TokenType.PASSAGE_MARKER)) {
      if (this.check(TokenType.DIRECTIVE)) {
        const directive = this.parseDirective();
        if (directive.type === 'metadata') {
          metadata.push(directive);
        } else if (directive.type === 'variable_declaration') {
          variables.push(directive);
        }
      } else if (this.check(TokenType.NEWLINE)) {
        this.advance();
      } else if (this.check(TokenType.COMMENT)) {
        this.advance(); // Skip comments
      } else {
        // Unknown content before first passage
        this.addError('Expected passage marker (::) or directive (@)');
        this.skipToNextLine();
      }
    }

    // Parse passages
    while (!this.isAtEnd()) {
      if (this.check(TokenType.PASSAGE_MARKER)) {
        passages.push(this.parsePassage());
      } else if (this.check(TokenType.NEWLINE) || this.check(TokenType.COMMENT)) {
        this.advance();
      } else {
        this.addError('Expected passage marker (::)');
        this.skipToNextLine();
      }
    }

    return {
      type: 'story',
      metadata,
      variables,
      passages,
      location: this.getLocation(start),
    };
  }

  // ============================================================================
  // Directive Parsing
  // ============================================================================

  private parseDirective(): MetadataNode | VariableDeclarationNode {
    const start = this.advance(); // @directive
    const directiveName = start.value.slice(1); // Remove @

    if (directiveName === 'vars') {
      return this.parseVarsBlock(start);
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
  // Passage Parsing
  // ============================================================================

  private parsePassage(): PassageNode {
    const start = this.expect(TokenType.PASSAGE_MARKER, 'Expected "::"');
    this.skipWhitespaceOnLine();

    // Parse passage name
    let name = '';
    const tags: string[] = [];
    const metadata: PassageMetadataNode[] = [];

    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance().value;

      // Check for additional name parts (e.g., "Start Room")
      while (this.check(TokenType.IDENTIFIER)) {
        name += ' ' + this.advance().value;
      }
    } else {
      this.addError('Expected passage name after ::');
      name = 'unnamed';
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
      type: 'passage',
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

    while (!this.isAtEnd() && !this.check(TokenType.PASSAGE_MARKER)) {
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
      } else if (!this.isAtEnd() && !this.check(TokenType.PASSAGE_MARKER)) {
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
    // Choice markers at start of line
    if (this.check(TokenType.ONCE_CHOICE_MARKER) || this.check(TokenType.STICKY_CHOICE_MARKER)) {
      return this.parseChoice();
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
      if (this.check(TokenType.IDENTIFIER)) {
        target = this.advance().value;
      } else {
        this.addError('Expected passage name after "->"');
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
      condition,
      text,
      target,
      action,
      location: this.getLocation(start),
    };
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
      this.addError('Expected variable name after "$"');
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
           !this.check(TokenType.ARROW)) {
      value += this.advance().value;
    }

    return {
      type: 'text',
      value,
      location: this.getLocation(start),
    };
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
        this.addError('Invalid assignment target');
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
          this.addError('Expected property name after "."');
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
        this.addError('Expected variable name after "$"');
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
    this.addError(`Unexpected token: ${this.peek().value}`);
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
