/**
 * WLS 1.0 Lexer
 * Tokenizes Whisker Language Specification source text
 */

import {
  Token,
  TokenType,
  SourceLocation,
  SourceSpan,
  LexerError,
  LexResult,
  KEYWORDS,
} from './types';

/**
 * Lexer for WLS 1.0 format
 */
export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];
  private errors: LexerError[] = [];

  constructor(source: string) {
    this.source = source;
  }

  /**
   * Tokenize the source and return all tokens
   */
  tokenize(): LexResult {
    this.tokens = [];
    this.errors = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;

    while (!this.isAtEnd()) {
      this.scanToken();
    }

    // Add EOF token
    this.addToken(TokenType.EOF, '');

    return {
      tokens: this.tokens,
      errors: this.errors,
    };
  }

  /**
   * Check if we've reached the end of the source
   */
  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  /**
   * Get the current character without advancing
   */
  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.source[this.pos];
  }

  /**
   * Get the next character without advancing
   */
  private peekNext(): string {
    if (this.pos + 1 >= this.source.length) return '\0';
    return this.source[this.pos + 1];
  }

  /**
   * Advance and return the current character
   */
  private advance(): string {
    const char = this.source[this.pos];
    this.pos++;

    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }

    return char;
  }

  /**
   * Check if current character matches expected, and advance if so
   */
  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source[this.pos] !== expected) return false;
    this.advance();
    return true;
  }

  /**
   * Get current source location
   */
  private getLocation(): SourceLocation {
    return {
      line: this.line,
      column: this.column,
      offset: this.pos,
    };
  }

  /**
   * Create a source span from start to current location
   */
  private getSpan(start: SourceLocation): SourceSpan {
    return {
      start,
      end: this.getLocation(),
    };
  }

  /**
   * Get the type of the previous token (for context-sensitive lexing)
   */
  private previousTokenType(): TokenType | null {
    if (this.tokens.length === 0) return null;
    return this.tokens[this.tokens.length - 1].type;
  }

  /**
   * Check if we're in an expression context (inside ${}, {cond}, etc.)
   */
  private isInExpressionContext(): boolean {
    // Walk backwards through tokens to find context
    let braceDepth = 0;
    for (let i = this.tokens.length - 1; i >= 0; i--) {
      const token = this.tokens[i];
      if (token.type === TokenType.RBRACE) {
        braceDepth++;
      } else if (token.type === TokenType.LBRACE || token.type === TokenType.EXPR_START) {
        if (braceDepth > 0) {
          braceDepth--;
        } else {
          // We're inside an unclosed { or ${
          return true;
        }
      } else if (token.type === TokenType.NEWLINE || token.type === TokenType.PASSAGE_MARKER) {
        // These reset context
        break;
      }
    }
    return false;
  }

  /**
   * Add a token to the list
   */
  private addToken(type: TokenType, value: string, start?: SourceLocation): void {
    const startLoc = start || this.getLocation();
    this.tokens.push({
      type,
      value,
      location: this.getSpan(startLoc),
    });
  }

  /**
   * Add an error
   */
  private addError(message: string, suggestion?: string): void {
    this.errors.push({
      message,
      location: this.getLocation(),
      suggestion,
    });
  }

  /**
   * Skip whitespace (but not newlines)
   */
  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else {
        break;
      }
    }
  }

  /**
   * Scan and emit the next token
   */
  private scanToken(): void {
    this.skipWhitespace();

    if (this.isAtEnd()) return;

    const start = this.getLocation();
    const char = this.advance();

    switch (char) {
      // Newlines
      case '\n':
        this.addToken(TokenType.NEWLINE, '\n', start);
        break;

      // Delimiters
      case '(':
        this.addToken(TokenType.LPAREN, '(', start);
        break;
      case ')':
        this.addToken(TokenType.RPAREN, ')', start);
        break;
      case '[':
        this.addToken(TokenType.LBRACKET, '[', start);
        break;
      case ']':
        this.addToken(TokenType.RBRACKET, ']', start);
        break;
      case '{':
        if (this.match('/') && this.match('}')) {
          this.addToken(TokenType.COND_END, '{/}', start);
        } else {
          this.addToken(TokenType.LBRACE, '{', start);
        }
        break;
      case '}':
        this.addToken(TokenType.RBRACE, '}', start);
        break;

      // Operators and punctuation
      case '+':
        if (this.match('=')) {
          this.addToken(TokenType.PLUS_ASSIGN, '+=', start);
        } else if (this.isAtLineStart(start)) {
          this.addToken(TokenType.ONCE_CHOICE_MARKER, '+', start);
        } else {
          this.addToken(TokenType.PLUS, '+', start);
        }
        break;
      case '-':
        if (this.match('=')) {
          this.addToken(TokenType.MINUS_ASSIGN, '-=', start);
        } else if (this.match('>')) {
          this.addToken(TokenType.ARROW, '->', start);
        } else if (this.match('-')) {
          this.scanLineComment(start);
        } else if (this.isGatherContext(start)) {
          // - at line start (similar to choice markers) is a gather point
          this.addToken(TokenType.GATHER, '-', start);
        } else {
          this.addToken(TokenType.MINUS, '-', start);
        }
        break;
      case '*':
        if (this.match('=')) {
          this.addToken(TokenType.STAR_ASSIGN, '*=', start);
        } else if (this.isAtLineStart(start)) {
          this.addToken(TokenType.STICKY_CHOICE_MARKER, '*', start);
        } else {
          this.addToken(TokenType.STAR, '*', start);
        }
        break;
      case '/':
        if (this.match('=')) {
          this.addToken(TokenType.SLASH_ASSIGN, '/=', start);
        } else if (this.match('*')) {
          this.scanBlockComment(start);
        } else {
          this.addToken(TokenType.SLASH, '/', start);
        }
        break;
      case '%':
        this.addToken(TokenType.PERCENT, '%', start);
        break;
      case '^':
        this.addToken(TokenType.CARET, '^', start);
        break;

      // Comparison and assignment
      case '=':
        if (this.match('=')) {
          this.addToken(TokenType.EQ, '==', start);
        } else {
          this.addToken(TokenType.ASSIGN, '=', start);
        }
        break;
      case '~':
        if (this.match('=')) {
          this.addToken(TokenType.NEQ, '~=', start);
        } else {
          this.addToken(TokenType.TILDE, '~', start);
        }
        break;
      case '<':
        if (this.match('=')) {
          this.addToken(TokenType.LTE, '<=', start);
        } else if (this.match('-')) {
          // <- is tunnel return
          this.addToken(TokenType.TUNNEL_RETURN, '<-', start);
        } else {
          this.addToken(TokenType.LT, '<', start);
        }
        break;
      case '>':
        if (this.match('=')) {
          this.addToken(TokenType.GTE, '>=', start);
        } else {
          this.addToken(TokenType.GT, '>', start);
        }
        break;

      // C-style operators that should be Lua-style (emit error tokens)
      case '!':
        if (this.match('=')) {
          this.addError('Use ~= instead of != for not-equal', 'Replace != with ~=');
          this.addToken(TokenType.ERROR, '!=', start);
        } else if (this.previousTokenType() === TokenType.LBRACE && this.peek() === '|') {
          // {!| is once-only alternative syntax
          this.addToken(TokenType.EXCLAMATION, '!', start);
        } else if (this.isInExpressionContext()) {
          this.addError('Use "not" instead of ! for logical not', 'Replace ! with not');
          this.addToken(TokenType.ERROR, '!', start);
        } else {
          // In content text, ! is just a regular character
          this.addToken(TokenType.TEXT, '!', start);
        }
        break;
      case '&':
        if (this.match('&')) {
          this.addError('Use "and" instead of && for logical and', 'Replace && with and');
          this.addToken(TokenType.ERROR, '&&', start);
        } else {
          this.addToken(TokenType.AMPERSAND, '&', start);
        }
        break;
      case '?':
        // Contains operator for lists (WLS 1.0 - Gap 3)
        this.addToken(TokenType.QUESTION, '?', start);
        break;

      // Special characters
      case '$':
        if (this.match('{')) {
          this.addToken(TokenType.EXPR_START, '${', start);
        } else if (this.isAlpha(this.peek()) || this.peek() === '_') {
          // $ followed by identifier start - variable reference
          this.addToken(TokenType.DOLLAR, '$', start);
        } else {
          // $ followed by non-identifier (like $50) - treat as literal text
          this.addToken(TokenType.TEXT, '$', start);
        }
        break;
      case '_':
        // Could be temp variable or start of identifier
        if (this.isAlphaNumeric(this.peek())) {
          this.scanIdentifier(start, '_');
        } else {
          this.addToken(TokenType.UNDERSCORE, '_', start);
        }
        break;
      case '@':
        this.scanDirective(start);
        break;
      case ':':
        if (this.match(':')) {
          this.addToken(TokenType.PASSAGE_MARKER, '::', start);
        } else {
          this.addToken(TokenType.COLON, ':', start);
        }
        break;
      case ';':
        this.addToken(TokenType.SEMICOLON, ';', start);
        break;
      case ',':
        this.addToken(TokenType.COMMA, ',', start);
        break;
      case '.':
        if (this.match('.')) {
          this.addToken(TokenType.DOTDOT, '..', start);
        } else {
          this.addToken(TokenType.DOT, '.', start);
        }
        break;
      case '#':
        this.addToken(TokenType.HASH, '#', start);
        break;
      case '\\':
        // Escape sequences in content
        this.scanEscapeSequence(start);
        break;
      case '|':
        if (this.match('|')) {
          this.addError('Use "or" instead of || for logical or', 'Replace || with or');
          this.addToken(TokenType.ERROR, '||', start);
        } else {
          this.addToken(TokenType.PIPE, '|', start);
        }
        break;

      // Strings
      case '"':
        this.scanString(start, '"');
        break;
      case "'":
        this.scanString(start, "'");
        break;

      default:
        if (this.isDigit(char)) {
          this.scanNumber(start, char);
        } else if (this.isAlpha(char)) {
          this.scanIdentifier(start, char);
        } else if (this.isUnicodeText(char)) {
          // Unicode characters (non-ASCII) are allowed in content text
          this.addToken(TokenType.TEXT, char, start);
        } else {
          this.addError(`Unexpected character: ${char}`);
          this.addToken(TokenType.ERROR, char, start);
        }
        break;
    }
  }

  /**
   * Check if this is the start of a line (for choice markers)
   */
  private isAtLineStart(location: SourceLocation): boolean {
    // Check if we're at column 1, or only whitespace before this
    if (location.column === 1) return true;

    // Check if only whitespace between line start and current position
    const lineStart = location.offset - (location.column - 1);
    for (let i = lineStart; i < location.offset; i++) {
      const c = this.source[i];
      if (c !== ' ' && c !== '\t') return false;
    }
    return true;
  }

  /**
   * Check if we're in a gather context (for gather point markers)
   * Gathers can appear at line start or after another choice/gather marker
   */
  private isGatherContext(location: SourceLocation): boolean {
    // At line start is valid for gather
    if (this.isAtLineStart(location)) return true;

    // After another choice or gather marker is also valid (for nested gathers)
    const prevType = this.previousTokenType();
    return prevType === TokenType.ONCE_CHOICE_MARKER ||
           prevType === TokenType.STICKY_CHOICE_MARKER ||
           prevType === TokenType.GATHER;
  }

  /**
   * Scan an escape sequence in content (not in string literals)
   * Handles: \$ \{ \} \\ \n \t
   */
  private scanEscapeSequence(start: SourceLocation): void {
    if (this.isAtEnd()) {
      // Trailing backslash at end of file
      this.addToken(TokenType.TEXT, '\\', start);
      return;
    }

    const nextChar = this.peek();
    switch (nextChar) {
      case '$':
        this.advance();
        this.addToken(TokenType.TEXT, '$', start);
        break;
      case '{':
        this.advance();
        this.addToken(TokenType.TEXT, '{', start);
        break;
      case '}':
        this.advance();
        this.addToken(TokenType.TEXT, '}', start);
        break;
      case '\\':
        this.advance();
        this.addToken(TokenType.TEXT, '\\', start);
        break;
      case 'n':
        this.advance();
        this.addToken(TokenType.TEXT, '\n', start);
        break;
      case 't':
        this.advance();
        this.addToken(TokenType.TEXT, '\t', start);
        break;
      default:
        // Unknown escape - emit backslash and let next char be processed normally
        this.addToken(TokenType.TEXT, '\\', start);
        break;
    }
  }

  /**
   * Scan a line comment (-- to end of line)
   */
  private scanLineComment(start: SourceLocation): void {
    let value = '--';
    while (!this.isAtEnd() && this.peek() !== '\n') {
      value += this.advance();
    }
    this.addToken(TokenType.COMMENT, value, start);
  }

  /**
   * Scan a block comment (slash-star to star-slash)
   */
  private scanBlockComment(start: SourceLocation): void {
    let value = '/*';
    while (!this.isAtEnd()) {
      if (this.peek() === '*' && this.peekNext() === '/') {
        value += this.advance(); // *
        value += this.advance(); // /
        break;
      }
      value += this.advance();
    }

    if (this.isAtEnd() && !value.endsWith('*/')) {
      this.addError('Unterminated block comment');
    }

    this.addToken(TokenType.COMMENT, value, start);
  }

  /**
   * Scan a directive (@name)
   */
  private scanDirective(start: SourceLocation): void {
    let value = '@';
    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }
    this.addToken(TokenType.DIRECTIVE, value, start);
  }

  /**
   * Scan a string literal
   */
  private scanString(start: SourceLocation, quote: string): void {
    let value = '';
    let escaped = false;

    while (!this.isAtEnd()) {
      const char = this.peek();

      if (escaped) {
        // Handle escape sequences
        const escapeChar = this.advance();
        switch (escapeChar) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          default:
            value += escapeChar;
            break;
        }
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
        this.advance();
      } else if (char === quote) {
        this.advance(); // consume closing quote
        this.addToken(TokenType.STRING, value, start);
        return;
      } else if (char === '\n') {
        this.addError('Unterminated string - newline in string literal');
        this.addToken(TokenType.ERROR, value, start);
        return;
      } else {
        value += this.advance();
      }
    }

    this.addError('Unterminated string - reached end of file');
    this.addToken(TokenType.ERROR, value, start);
  }

  /**
   * Scan a number literal
   */
  private scanNumber(start: SourceLocation, firstChar: string): void {
    let value = firstChar;

    // Integer part
    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      value += this.advance();
    }

    // Decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      value += this.advance(); // .
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    // Exponent part
    if (this.peek() === 'e' || this.peek() === 'E') {
      value += this.advance(); // e or E
      if (this.peek() === '+' || this.peek() === '-') {
        value += this.advance();
      }
      if (!this.isDigit(this.peek())) {
        this.addError('Invalid number: expected digits after exponent');
      }
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        value += this.advance();
      }
    }

    this.addToken(TokenType.NUMBER, value, start);
  }

  /**
   * Scan an identifier or keyword
   */
  private scanIdentifier(start: SourceLocation, firstChar: string): void {
    let value = firstChar;

    while (!this.isAtEnd() && this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }

    // Check if it's a keyword
    const keywordType = KEYWORDS[value];
    if (keywordType) {
      this.addToken(keywordType, value, start);
    } else {
      this.addToken(TokenType.IDENTIFIER, value, start);
    }
  }

  /**
   * Check if character is a digit
   */
  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  /**
   * Check if character is alphabetic or underscore
   */
  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') ||
           (char >= 'A' && char <= 'Z') ||
           char === '_';
  }

  /**
   * Check if character is alphanumeric or underscore
   */
  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  /**
   * Check if character is valid Unicode text content (non-ASCII printable)
   */
  private isUnicodeText(char: string): boolean {
    const code = char.charCodeAt(0);
    // Accept Unicode characters above ASCII range
    return code > 127;
  }
}

/**
 * Convenience function to tokenize source
 */
export function tokenize(source: string): LexResult {
  const lexer = new Lexer(source);
  return lexer.tokenize();
}
