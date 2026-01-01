/**
 * WLS 1.0 Abstract Syntax Tree Types
 * Defines the structure of parsed WLS documents
 */

import type { SourceSpan } from './types';

// ============================================================================
// Base Types
// ============================================================================

/**
 * Base interface for all AST nodes
 */
export interface BaseNode {
  type: string;
  location: SourceSpan;
}

// ============================================================================
// Story Structure
// ============================================================================

/**
 * Root node representing an entire story
 */
export interface StoryNode extends BaseNode {
  type: 'story';
  metadata: MetadataNode[];
  variables: VariableDeclarationNode[];
  passages: PassageNode[];
}

/**
 * Metadata directive (@title, @author, etc.)
 */
export interface MetadataNode extends BaseNode {
  type: 'metadata';
  key: string;
  value: string;
}

/**
 * Variable declaration in @vars block or inline
 */
export interface VariableDeclarationNode extends BaseNode {
  type: 'variable_declaration';
  name: string;
  scope: 'story' | 'temp';
  initialValue: ExpressionNode | null;
}

// ============================================================================
// Passage Structure
// ============================================================================

/**
 * A single passage in the story
 */
export interface PassageNode extends BaseNode {
  type: 'passage';
  name: string;
  tags: string[];
  metadata: PassageMetadataNode[];
  content: ContentNode[];
}

/**
 * Passage-level metadata directive (@fallback, @onEnter, @onExit)
 */
export interface PassageMetadataNode extends BaseNode {
  type: 'passage_metadata';
  key: string;
  value: string;
}

// ============================================================================
// Content Nodes
// ============================================================================

/**
 * Union type for all content that can appear in a passage
 */
export type ContentNode =
  | TextNode
  | InterpolationNode
  | ExpressionStatementNode
  | DoBlockNode
  | ConditionalNode
  | ChoiceNode
  | AlternativesNode
  | GatherNode
  | TunnelCallNode
  | TunnelReturnNode;

/**
 * Plain text content
 */
export interface TextNode extends BaseNode {
  type: 'text';
  value: string;
}

/**
 * Variable interpolation ($var or ${expr})
 */
export interface InterpolationNode extends BaseNode {
  type: 'interpolation';
  expression: ExpressionNode;
  isSimple: boolean;  // $var vs ${expr}
}

/**
 * Expression statement (assignment, etc.)
 */
export interface ExpressionStatementNode extends BaseNode {
  type: 'expression_statement';
  expression: ExpressionNode;
}

/**
 * Do block for actions/scripts ({do expr})
 */
export interface DoBlockNode extends BaseNode {
  type: 'do_block';
  actions: ExpressionNode[];
}

/**
 * Block conditional ({ condition }...{/})
 */
export interface ConditionalNode extends BaseNode {
  type: 'conditional';
  condition: ExpressionNode;
  consequent: ContentNode[];
  alternatives: ConditionalBranchNode[];
  alternate: ContentNode[] | null;  // else branch
}

/**
 * Alternative branch (elif)
 */
export interface ConditionalBranchNode extends BaseNode {
  type: 'conditional_branch';
  condition: ExpressionNode;
  content: ContentNode[];
}

/**
 * Choice option
 */
export interface ChoiceNode extends BaseNode {
  type: 'choice';
  choiceType: 'once' | 'sticky';
  condition: ExpressionNode | null;
  text: ContentNode[];
  target: string | null;
  action: ExpressionNode[] | null;
}

/**
 * Text alternatives ({| a | b | c})
 */
export interface AlternativesNode extends BaseNode {
  type: 'alternatives';
  mode: 'sequence' | 'cycle' | 'shuffle' | 'once';
  options: ContentNode[][];
}

/**
 * Gather point for flow reconvergence (-)
 * WLS 1.0: Allows nested choices/gathers to converge
 */
export interface GatherNode extends BaseNode {
  type: 'gather';
  depth: number;  // Nesting depth (number of - markers)
  content: ContentNode[];  // Content after the gather point
}

/**
 * Tunnel call (-> Target ->)
 * WLS 1.0: Call a passage as a reusable tunnel, returns to caller
 */
export interface TunnelCallNode extends BaseNode {
  type: 'tunnel_call';
  target: string;  // Target passage name
}

/**
 * Tunnel return (<-)
 * WLS 1.0: Return from a tunnel to the calling passage
 */
export interface TunnelReturnNode extends BaseNode {
  type: 'tunnel_return';
}

// ============================================================================
// Expression Nodes
// ============================================================================

/**
 * Union type for all expression nodes
 */
export type ExpressionNode =
  | IdentifierNode
  | VariableNode
  | LiteralNode
  | BinaryExpressionNode
  | UnaryExpressionNode
  | CallExpressionNode
  | MemberExpressionNode
  | AssignmentExpressionNode;

/**
 * Identifier (passage names, function names)
 */
export interface IdentifierNode extends BaseNode {
  type: 'identifier';
  name: string;
}

/**
 * Variable reference ($var or _var)
 */
export interface VariableNode extends BaseNode {
  type: 'variable';
  name: string;
  scope: 'story' | 'temp';
}

/**
 * Literal value (number, string, boolean, nil)
 */
export interface LiteralNode extends BaseNode {
  type: 'literal';
  valueType: 'number' | 'string' | 'boolean' | 'nil';
  value: number | string | boolean | null;
}

/**
 * Binary expression (a + b, x and y, etc.)
 */
export interface BinaryExpressionNode extends BaseNode {
  type: 'binary_expression';
  operator: BinaryOperator;
  left: ExpressionNode;
  right: ExpressionNode;
}

export type BinaryOperator =
  | '+' | '-' | '*' | '/' | '%' | '^'  // Arithmetic
  | '..'                                // String concatenation
  | '==' | '~=' | '<' | '>' | '<=' | '>='  // Comparison
  | 'and' | 'or';                       // Logical

/**
 * Unary expression (not x, -y, #list)
 */
export interface UnaryExpressionNode extends BaseNode {
  type: 'unary_expression';
  operator: UnaryOperator;
  argument: ExpressionNode;
}

export type UnaryOperator = 'not' | '-' | '#';

/**
 * Function call (whisker.state.get("gold"))
 */
export interface CallExpressionNode extends BaseNode {
  type: 'call_expression';
  callee: ExpressionNode;
  arguments: ExpressionNode[];
}

/**
 * Member access (whisker.state)
 */
export interface MemberExpressionNode extends BaseNode {
  type: 'member_expression';
  object: ExpressionNode;
  property: string;
}

/**
 * Assignment (x = 1, $gold += 10)
 */
export interface AssignmentExpressionNode extends BaseNode {
  type: 'assignment_expression';
  operator: AssignmentOperator;
  target: VariableNode | MemberExpressionNode;
  value: ExpressionNode;
}

export type AssignmentOperator = '=' | '+=' | '-=' | '*=' | '/=';

// ============================================================================
// Parser Error
// ============================================================================

/**
 * WLS Error codes for cross-platform parity
 */
export const WLS_ERROR_CODES = {
  // Syntax errors (SYN)
  EXPECTED_PASSAGE_NAME: 'WLS-SYN-001',
  EXPECTED_PASSAGE_MARKER: 'WLS-SYN-002',
  EXPECTED_CHOICE_TARGET: 'WLS-SYN-003',
  EXPECTED_EXPRESSION: 'WLS-SYN-004',
  EXPECTED_CLOSING_BRACE: 'WLS-SYN-005',
  UNEXPECTED_TOKEN: 'WLS-SYN-006',
  // Reference errors (REF)
  UNDEFINED_PASSAGE: 'WLS-REF-001',
  // Structure errors (STR)
  DUPLICATE_PASSAGE: 'WLS-STR-001',
  // Flow control errors (FLW) - WLS 1.0
  ORPHAN_GATHER: 'WLS-FLW-007',           // Gather without preceding choice
  TUNNEL_DEPTH_EXCEEDED: 'WLS-FLW-008',   // Too many nested tunnel calls
  ORPHAN_TUNNEL_RETURN: 'WLS-FLW-009',    // <- outside tunnel context
  MISSING_TUNNEL_RETURN: 'WLS-FLW-010',   // Tunnel passage without <-
  INVALID_TUNNEL_SYNTAX: 'WLS-FLW-011',   // Malformed tunnel call
} as const;

export type WLSErrorCode = typeof WLS_ERROR_CODES[keyof typeof WLS_ERROR_CODES];

/**
 * Parser error with location and recovery info
 */
export interface ParseError {
  message: string;
  location: SourceSpan;
  code?: WLSErrorCode;
  suggestion?: string;
  severity?: 'error' | 'warning';
}

/**
 * Result of parsing a WLS source
 */
export interface ParseResult {
  ast: StoryNode | null;
  errors: ParseError[];
}

// ============================================================================
// AST Utilities
// ============================================================================

/**
 * Create a text node
 */
export function createTextNode(value: string, location: SourceSpan): TextNode {
  return { type: 'text', value, location };
}

/**
 * Create a literal node
 */
export function createLiteralNode(
  valueType: 'number' | 'string' | 'boolean' | 'nil',
  value: number | string | boolean | null,
  location: SourceSpan
): LiteralNode {
  return { type: 'literal', valueType, value, location };
}

/**
 * Create an identifier node
 */
export function createIdentifierNode(name: string, location: SourceSpan): IdentifierNode {
  return { type: 'identifier', name, location };
}

/**
 * Create a variable node
 */
export function createVariableNode(
  name: string,
  scope: 'story' | 'temp',
  location: SourceSpan
): VariableNode {
  return { type: 'variable', name, scope, location };
}

/**
 * Check if a node is an expression
 */
export function isExpression(node: BaseNode): node is ExpressionNode {
  return [
    'identifier',
    'variable',
    'literal',
    'binary_expression',
    'unary_expression',
    'call_expression',
    'member_expression',
    'assignment_expression',
  ].includes(node.type);
}

/**
 * Check if a node is content
 */
export function isContent(node: BaseNode): node is ContentNode {
  return [
    'text',
    'interpolation',
    'expression_statement',
    'do_block',
    'conditional',
    'choice',
    'alternatives',
    'gather',
    'tunnel_call',
    'tunnel_return',
  ].includes(node.type);
}
