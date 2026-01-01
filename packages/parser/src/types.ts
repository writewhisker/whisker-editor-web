/**
 * WLS 1.0 Lexer Types
 * Token types and interfaces for the Whisker Language Specification
 */

/**
 * Source location for error reporting and source mapping
 */
export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

/**
 * Source span covering start and end locations
 */
export interface SourceSpan {
  start: SourceLocation;
  end: SourceLocation;
}

/**
 * Token types for WLS 1.0 lexer
 */
export enum TokenType {
  // Structure markers
  PASSAGE_MARKER = 'PASSAGE_MARKER',           // ::
  ONCE_CHOICE_MARKER = 'ONCE_CHOICE_MARKER',   // + (once-only choice)
  STICKY_CHOICE_MARKER = 'STICKY_CHOICE_MARKER', // * (sticky choice)
  GATHER = 'GATHER',                           // - (gather point at line start)
  ARROW = 'ARROW',                             // ->
  TUNNEL_RETURN = 'TUNNEL_RETURN',             // <- (return from tunnel)

  // Directives
  DIRECTIVE = 'DIRECTIVE',                     // @title, @author, @vars, etc.

  // Delimiters
  LBRACE = 'LBRACE',                           // {
  RBRACE = 'RBRACE',                           // }
  COND_END = 'COND_END',                       // {/}
  EXPR_START = 'EXPR_START',                   // ${
  LBRACKET = 'LBRACKET',                       // [
  RBRACKET = 'RBRACKET',                       // ]
  LPAREN = 'LPAREN',                           // (
  RPAREN = 'RPAREN',                           // )

  // Variable prefixes
  DOLLAR = 'DOLLAR',                           // $ (story variable prefix)
  UNDERSCORE = 'UNDERSCORE',                   // _ (temp variable prefix)

  // Assignment operators
  ASSIGN = 'ASSIGN',                           // =
  PLUS_ASSIGN = 'PLUS_ASSIGN',                 // +=
  MINUS_ASSIGN = 'MINUS_ASSIGN',               // -=
  STAR_ASSIGN = 'STAR_ASSIGN',                 // *=
  SLASH_ASSIGN = 'SLASH_ASSIGN',               // /=

  // Comparison operators
  EQ = 'EQ',                                   // ==
  NEQ = 'NEQ',                                 // ~= (Lua-style)
  LT = 'LT',                                   // <
  GT = 'GT',                                   // >
  LTE = 'LTE',                                 // <=
  GTE = 'GTE',                                 // >=

  // Arithmetic operators
  PLUS = 'PLUS',                               // +
  MINUS = 'MINUS',                             // -
  STAR = 'STAR',                               // *
  SLASH = 'SLASH',                             // /
  PERCENT = 'PERCENT',                         // %
  CARET = 'CARET',                             // ^ (power)

  // Logical operators (Lua-style keywords)
  AND = 'AND',                                 // and
  OR = 'OR',                                   // or
  NOT = 'NOT',                                 // not

  // Literals
  IDENTIFIER = 'IDENTIFIER',                   // variable names, passage names
  NUMBER = 'NUMBER',                           // 42, 3.14
  STRING = 'STRING',                           // "hello", 'world'

  // Boolean literals
  TRUE = 'TRUE',                               // true
  FALSE = 'FALSE',                             // false
  NIL = 'NIL',                                 // nil

  // Conditional keywords
  IF = 'IF',                                   // if (in block conditionals)
  ELSE = 'ELSE',                               // else
  ELIF = 'ELIF',                               // elif
  DO = 'DO',                                   // do (in choice actions)

  // Collection keywords (WLS 1.0 - Gap 3)
  LIST = 'LIST',                               // LIST name = ...
  ARRAY = 'ARRAY',                             // ARRAY name = ...
  MAP = 'MAP',                                 // MAP name = ...

  // Text content
  TEXT = 'TEXT',                               // Plain text content

  // Alternatives
  PIPE = 'PIPE',                               // | (alternative separator)
  AMPERSAND = 'AMPERSAND',                     // & (cycle marker)
  TILDE = 'TILDE',                             // ~ (shuffle marker)
  EXCLAMATION = 'EXCLAMATION',                 // ! (once-only marker)

  // Special
  COLON = 'COLON',                             // : (inline conditional separator)
  SEMICOLON = 'SEMICOLON',                     // ; (statement separator)
  COMMA = 'COMMA',                             // , (list separator)
  DOT = 'DOT',                                 // . (member access)
  HASH = 'HASH',                               // # (length operator)
  DOTDOT = 'DOTDOT',                           // .. (string concatenation)
  QUESTION = 'QUESTION',                       // ? (contains operator for lists)

  // Comments
  COMMENT = 'COMMENT',                         // -- comment or /* block */

  // Whitespace and structure
  NEWLINE = 'NEWLINE',                         // Line break
  INDENT = 'INDENT',                           // Indentation increase
  DEDENT = 'DEDENT',                           // Indentation decrease

  // End of file
  EOF = 'EOF',

  // Error token for recovery
  ERROR = 'ERROR',
}

/**
 * Token produced by the lexer
 */
export interface Token {
  type: TokenType;
  value: string;
  location: SourceSpan;
}

/**
 * Lexer error with location information
 */
export interface LexerError {
  message: string;
  location: SourceLocation;
  suggestion?: string;
}

/**
 * Result of lexing a source string
 */
export interface LexResult {
  tokens: Token[];
  errors: LexerError[];
}

/**
 * Keywords recognized by the lexer
 */
export const KEYWORDS: Record<string, TokenType> = {
  'and': TokenType.AND,
  'or': TokenType.OR,
  'not': TokenType.NOT,
  'true': TokenType.TRUE,
  'false': TokenType.FALSE,
  'nil': TokenType.NIL,
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'elif': TokenType.ELIF,
  'do': TokenType.DO,
  // Collection keywords (WLS 1.0 - Gap 3)
  'LIST': TokenType.LIST,
  'ARRAY': TokenType.ARRAY,
  'MAP': TokenType.MAP,
};

/**
 * Check if a string is a keyword
 */
export function isKeyword(value: string): boolean {
  return value in KEYWORDS;
}

/**
 * Get the token type for a keyword
 */
export function getKeywordType(value: string): TokenType | undefined {
  return KEYWORDS[value];
}

/**
 * Special targets for navigation (WLS 1.0)
 */
export const SPECIAL_TARGETS = ['END', 'BACK', 'RESTART'] as const;
export type SpecialTarget = typeof SPECIAL_TARGETS[number];

/**
 * Check if a target is a special navigation target
 */
export function isSpecialTarget(target: string): target is SpecialTarget {
  return SPECIAL_TARGETS.includes(target as SpecialTarget);
}
