/**
 * WLS 1.0/2.0 Parser Package
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
  // WLS 1.0 Flow Control types
  GatherNode,
  TunnelCallNode,
  TunnelReturnNode,
  // WLS 1.0 Rich Text types
  FormattedTextNode,
  BlockquoteNode,
  ListNode,
  ListItemNode,
  HorizontalRuleNode,
  ClassedBlockNode,
  ClassedInlineNode,
  // WLS 1.0 Media types
  MediaAttributes,
  AudioAttributes,
  VideoAttributes,
  EmbedAttributes,
  ImageNode,
  AudioNode,
  VideoNode,
  EmbedNode,
  // WLS 2.0 Thread types
  ThreadPassageNode,
  AwaitExpressionNode,
  SpawnExpressionNode,
  // Expression types
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

// WLS 2.0 Declarations - Types
export type {
  AudioDeclarationNode,
  EffectDeclarationNode,
  ExternalDeclarationNode,
  DelayDirectiveNode,
  EveryDirectiveNode,
} from './ast';

// WLS 2.0 Declarations - Parsing functions
export {
  parseAudioDeclaration,
  parseEffectDeclaration,
  parseExternalDeclaration,
  parseDelayDirective,
  parseEveryDirective,
  parseTimeString,
  isAudioDeclaration,
  isEffectDeclaration,
  isExternalDeclaration,
  isDelayDirective,
  isEveryDirective,
  type AudioChannel,
  type ParameterType,
  type ExternalParameterNode,
} from './wls2-declarations';
