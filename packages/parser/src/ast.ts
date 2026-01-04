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
  lists: ListDeclarationNode[];             // WLS 1.0 Gap 3: LIST declarations
  arrays: ArrayDeclarationNode[];           // WLS 1.0 Gap 3: ARRAY declarations
  maps: MapDeclarationNode[];               // WLS 1.0 Gap 3: MAP declarations
  includes: IncludeDeclarationNode[];       // WLS 1.0 Gap 4: INCLUDE declarations
  functions: FunctionDeclarationNode[];     // WLS 1.0 Gap 4: FUNCTION definitions
  namespaces: NamespaceDeclarationNode[];   // WLS 1.0 Gap 4: NAMESPACE blocks
  theme: ThemeDirectiveNode | null;         // WLS 1.0 Gap 5: Theme directive
  styles: StyleBlockNode | null;            // WLS 1.0 Gap 5: Style block
  passages: PassageNode[];
  threads: ThreadPassageNode[];             // WLS 2.0: Thread passages
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
// Collection Declarations (WLS 1.0 - Gap 3)
// ============================================================================

/**
 * List value item - can be active (selected) or inactive
 */
export interface ListValueNode {
  value: string;
  active: boolean;
}

/**
 * LIST declaration: enumerated set with optional active values
 * Example: LIST moods = happy, (sad), angry
 */
export interface ListDeclarationNode extends BaseNode {
  type: 'list_declaration';
  name: string;
  values: ListValueNode[];
}

/**
 * Array element - value with optional explicit index
 */
export interface ArrayElementNode {
  index: number | null;  // null = auto-indexed
  value: ExpressionNode;
}

/**
 * ARRAY declaration: indexed collection
 * Example: ARRAY items = [1, 2, 3] or ARRAY items = [0: "first", 2: "third"]
 */
export interface ArrayDeclarationNode extends BaseNode {
  type: 'array_declaration';
  name: string;
  elements: ArrayElementNode[];
}

/**
 * Map entry - key-value pair
 */
export interface MapEntryNode {
  key: string;
  value: ExpressionNode;
}

/**
 * MAP declaration: key-value object
 * Example: MAP player = { name: "Hero", health: 100 }
 */
export interface MapDeclarationNode extends BaseNode {
  type: 'map_declaration';
  name: string;
  entries: MapEntryNode[];
}

// ============================================================================
// Module Declarations (WLS 1.0 - Gap 4)
// ============================================================================

/**
 * INCLUDE declaration: import external file
 * Example: INCLUDE "path/to/file.ws"
 */
export interface IncludeDeclarationNode extends BaseNode {
  type: 'include_declaration';
  path: string;
}

/**
 * FUNCTION parameter
 */
export interface FunctionParameterNode {
  name: string;
}

/**
 * FUNCTION declaration: reusable logic block
 * Example: FUNCTION greet(name) ... RETURN ... END
 */
export interface FunctionDeclarationNode extends BaseNode {
  type: 'function_declaration';
  name: string;
  params: FunctionParameterNode[];
  body: ContentNode[];
}

/**
 * NAMESPACE declaration: passage grouping
 * Example: NAMESPACE Combat ... END NAMESPACE
 */
export interface NamespaceDeclarationNode extends BaseNode {
  type: 'namespace_declaration';
  name: string;
  passages: PassageNode[];
  functions: FunctionDeclarationNode[];
  nestedNamespaces: NamespaceDeclarationNode[];
}

// ============================================================================
// Passage Structure
// ============================================================================

/**
 * A single passage in the story
 */
export interface PassageNode extends BaseNode {
  type: 'passage';
  name: string;              // Fully qualified name (with namespace prefix)
  originalName?: string;     // WLS 1.0 Gap 4: Name as written in source
  namespace?: string;        // WLS 1.0 Gap 4: Namespace the passage belongs to
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
  | TunnelReturnNode
  | AwaitExpressionNode    // WLS 2.0: Thread await
  | SpawnExpressionNode    // WLS 2.0: Thread spawn
  | FormattedTextNode      // WLS 1.0 Gap 5: Rich text
  | BlockquoteNode         // WLS 1.0 Gap 5: Blockquotes
  | ListNode               // WLS 1.0 Gap 5: Lists
  | HorizontalRuleNode     // WLS 1.0 Gap 5: Horizontal rules
  | ClassedBlockNode       // WLS 1.0 Gap 5: CSS classes
  | ClassedInlineNode      // WLS 1.0 Gap 5: Inline CSS classes
  | ImageNode              // WLS 1.0 Gap 5: Images
  | AudioNode              // WLS 1.0 Gap 5: Audio
  | VideoNode              // WLS 1.0 Gap 5: Video
  | EmbedNode;             // WLS 1.0 Gap 5: Embedded content

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
// Thread Nodes (WLS 2.0)
// ============================================================================

/**
 * Thread passage declaration (== PassageName)
 * WLS 2.0: Thread passages run in parallel with the main narrative
 */
export interface ThreadPassageNode extends BaseNode {
  type: 'thread_passage';
  name: string;
  tags: string[];
  metadata: PassageMetadataNode[];
  content: ContentNode[];
}

/**
 * Await expression ({await ThreadName})
 * WLS 2.0: Wait for a thread to complete before continuing
 */
export interface AwaitExpressionNode extends BaseNode {
  type: 'await_expression';
  threadName: string;
}

/**
 * Spawn expression ({spawn -> PassageName})
 * WLS 2.0: Explicitly spawn a thread (alternative to implicit -> ThreadPassage)
 */
export interface SpawnExpressionNode extends BaseNode {
  type: 'spawn_expression';
  passageName: string;
  priority?: number;
}

// ============================================================================
// Presentation Nodes (WLS 1.0 - Gap 5)
// ============================================================================

/**
 * Formatted text (bold, italic, code, strikethrough)
 */
export interface FormattedTextNode extends BaseNode {
  type: 'formatted_text';
  format: 'bold' | 'italic' | 'bold_italic' | 'code' | 'strikethrough';
  content: ContentNode[];
}

/**
 * Blockquote (> text)
 */
export interface BlockquoteNode extends BaseNode {
  type: 'blockquote';
  content: ContentNode[];
  depth: number;
}

/**
 * List (ordered or unordered)
 */
export interface ListNode extends BaseNode {
  type: 'list';
  ordered: boolean;
  items: ListItemNode[];
}

/**
 * List item
 */
export interface ListItemNode extends BaseNode {
  type: 'list_item';
  content: ContentNode[];
  children: ListNode | null;  // For nested lists
}

/**
 * Horizontal rule (---)
 */
export interface HorizontalRuleNode extends BaseNode {
  type: 'horizontal_rule';
}

/**
 * Block with CSS classes (.class { content })
 */
export interface ClassedBlockNode extends BaseNode {
  type: 'classed_block';
  classes: string[];
  content: ContentNode[];
}

/**
 * Inline content with CSS classes ([.class text])
 */
export interface ClassedInlineNode extends BaseNode {
  type: 'classed_inline';
  classes: string[];
  content: ContentNode[];
}

/**
 * Media attributes
 */
export interface MediaAttributes {
  width?: string;
  height?: string;
  align?: 'left' | 'center' | 'right';
  class?: string;
  classes?: string[];
  id?: string;
  title?: string;
}

/**
 * Audio-specific attributes
 */
export interface AudioAttributes extends MediaAttributes {
  loop?: boolean;
  autoplay?: boolean;
  controls?: boolean;
  volume?: number;
  muted?: boolean;
  preload?: string;
}

/**
 * Video-specific attributes
 */
export interface VideoAttributes extends MediaAttributes {
  loop?: boolean;
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  poster?: string;
  preload?: string;
}

/**
 * Embed-specific attributes
 */
export interface EmbedAttributes extends MediaAttributes {
  sandbox?: boolean;
  allow?: string;
}

/**
 * Image node (![alt](src){attributes})
 */
export interface ImageNode extends BaseNode {
  type: 'image';
  alt: string;
  src: string;
  attributes: MediaAttributes;
}

/**
 * Audio node ([audio](src){attributes})
 */
export interface AudioNode extends BaseNode {
  type: 'audio';
  src: string;
  attributes: AudioAttributes;
}

/**
 * Video node ([video](src){attributes})
 */
export interface VideoNode extends BaseNode {
  type: 'video';
  src: string;
  attributes: VideoAttributes;
}

/**
 * Embed node ([embed](src){attributes})
 */
export interface EmbedNode extends BaseNode {
  type: 'embed';
  src: string;
  attributes: EmbedAttributes;
}

/**
 * Theme directive (THEME "name")
 */
export interface ThemeDirectiveNode extends BaseNode {
  type: 'theme_directive';
  themeName: string;
}

/**
 * Style block (STYLE { properties })
 */
export interface StyleBlockNode extends BaseNode {
  type: 'style_block';
  properties: Map<string, string>;
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
    // WLS 2.0: Thread nodes
    'await_expression',
    'spawn_expression',
    // WLS 1.0 Gap 5: Presentation nodes
    'formatted_text',
    'blockquote',
    'list',
    'horizontal_rule',
    'classed_block',
    'classed_inline',
    'image',
    'audio',
    'video',
    'embed',
  ].includes(node.type);
}
