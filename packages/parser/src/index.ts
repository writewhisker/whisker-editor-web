/**
 * WLS 1.0 Parser Package
 * Lexer and Parser for Whisker Language Specification
 */

// Types (values)
export {
  TokenType,
  KEYWORDS,
  isKeyword,
  getKeywordType,
  SPECIAL_TARGETS,
  isSpecialTarget,
} from './types';

// Types (type-only exports for isolatedModules)
export type {
  Token,
  SourceLocation,
  SourceSpan,
  LexerError,
  LexResult,
  SpecialTarget,
} from './types';

// Lexer
export { Lexer, tokenize } from './lexer';

// AST Types
export type {
  BaseNode,
  StoryNode,
  MetadataNode,
  PassageMetadataNode,
  VariableDeclarationNode,
  PassageNode,
  ContentNode,
  TextNode,
  InterpolationNode,
  ExpressionStatementNode,
  ConditionalNode,
  ConditionalBranchNode,
  ChoiceNode,
  AlternativesNode,
  ExpressionNode,
  IdentifierNode,
  VariableNode,
  LiteralNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  CallExpressionNode,
  MemberExpressionNode,
  AssignmentExpressionNode,
  BinaryOperator,
  UnaryOperator,
  AssignmentOperator,
  ParseError,
  ParseResult,
} from './ast';

export {
  createTextNode,
  createLiteralNode,
  createIdentifierNode,
  createVariableNode,
  isExpression,
  isContent,
} from './ast';

// Parser
export { Parser, parse } from './parser';
