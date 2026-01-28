/**
 * Lexer Types
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
 * Token types for WLS lexer
 */
export enum TokenType {
  // Structure markers
  PASSAGE_MARKER = 'PASSAGE_MARKER',           // ::
  THREAD_MARKER = 'THREAD_MARKER',             // == (thread passage)
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
  PLUS_PLUS = 'PLUS_PLUS',                     // ++ (increment)
  MINUS_MINUS = 'MINUS_MINUS',                 // -- (decrement)
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
  TEMP = 'TEMP',                               // temp (temporary variable declaration)

  // Thread keywords
  AWAIT = 'AWAIT',                             // await (wait for thread)
  SPAWN = 'SPAWN',                             // spawn (explicit spawn, optional)

  // Collection keywords
  LIST = 'LIST',                               // LIST name = ...
  ARRAY = 'ARRAY',                             // ARRAY name = ...
  MAP = 'MAP',                                 // MAP name = ...

  // Module keywords
  INCLUDE = 'INCLUDE',                         // INCLUDE "path"
  CONST = 'CONST',                             // CONST name = value
  VAR = 'VAR',                                 // VAR name = value (top-level)
  FUNCTION = 'FUNCTION',                       // FUNCTION name(params)
  RETURN = 'RETURN',                           // RETURN value
  END = 'END',                                 // END (function/namespace)
  NAMESPACE = 'NAMESPACE',                     // NAMESPACE Name
  SCOPE_OP = 'SCOPE_OP',                       // :: (namespace separator)

  // Presentation keywords
  THEME = 'THEME',                             // THEME "name"
  STYLE = 'STYLE',                             // STYLE { ... }

  // Rich text tokens
  BOLD_MARKER = 'BOLD_MARKER',                 // ** (bold)
  ITALIC_MARKER = 'ITALIC_MARKER',             // * (when not at line start)
  STRIKETHROUGH_MARKER = 'STRIKETHROUGH_MARKER', // ~~
  BLOCKQUOTE_MARKER = 'BLOCKQUOTE_MARKER',     // > (at line start)
  LIST_MARKER_UNORDERED = 'LIST_MARKER_UNORDERED', // - * + (at line start for lists)
  LIST_MARKER_ORDERED = 'LIST_MARKER_ORDERED', // 1. 2. etc (at line start)
  INLINE_CODE = 'INLINE_CODE',                 // `code`
  CODE_FENCE = 'CODE_FENCE',                   // ```
  HORIZONTAL_RULE = 'HORIZONTAL_RULE',         // --- *** ___ (3+ chars at line start)

  // Media tokens
  IMAGE_START = 'IMAGE_START',                 // ![ (markdown image start)

  // Text content
  TEXT = 'TEXT',                               // Plain text content

  // Alternatives
  PIPE = 'PIPE',                               // | (alternative separator)
  AMPERSAND = 'AMPERSAND',                     // & (cycle marker)
  TILDE = 'TILDE',                             // ~ (shuffle marker)
  EXCLAMATION = 'EXCLAMATION',                 // ! (once-only marker)
  NAMED_ALTERNATIVE = 'NAMED_ALTERNATIVE',     // @name:mode[ (named alternative)

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
  'temp': TokenType.TEMP,
  // Thread keywords
  'await': TokenType.AWAIT,
  'spawn': TokenType.SPAWN,
  // Collection keywords
  'LIST': TokenType.LIST,
  'ARRAY': TokenType.ARRAY,
  'MAP': TokenType.MAP,
  // Module keywords
  'INCLUDE': TokenType.INCLUDE,
  'CONST': TokenType.CONST,
  'VAR': TokenType.VAR,
  'FUNCTION': TokenType.FUNCTION,
  'RETURN': TokenType.RETURN,
  'END': TokenType.END,
  'NAMESPACE': TokenType.NAMESPACE,
  // Presentation keywords
  'THEME': TokenType.THEME,
  'STYLE': TokenType.STYLE,
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
 * Special targets for navigation
 */
export const SPECIAL_TARGETS = ['END', 'BACK', 'RESTART'] as const;
export type SpecialTarget = typeof SPECIAL_TARGETS[number];

/**
 * Check if a target is a special navigation target
 */
export function isSpecialTarget(target: string): target is SpecialTarget {
  return SPECIAL_TARGETS.includes(target as SpecialTarget);
}
