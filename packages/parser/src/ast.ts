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
  | AlternativesNode;

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
 * Parser error with location and recovery info
 */
export interface ParseError {
  message: string;
  location: SourceSpan;
  suggestion?: string;
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
  ].includes(node.type);
}
