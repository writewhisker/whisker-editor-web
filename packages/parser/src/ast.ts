/**
 * WLS Abstract Syntax Tree Types
 * Defines the structure of parsed WLS documents
 */

import type { SourceSpan } from './types';
import type {
  AudioDeclarationNode,
  EffectDeclarationNode,
  ExternalDeclarationNode,
  DelayDirectiveNode,
  EveryDirectiveNode,
} from './declarations';

// Re-export declaration types
export type {
  AudioDeclarationNode,
  EffectDeclarationNode,
  ExternalDeclarationNode,
  DelayDirectiveNode,
  EveryDirectiveNode,
} from './declarations';

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
  lists: ListDeclarationNode[];             // LIST declarations
  arrays: ArrayDeclarationNode[];           // ARRAY declarations
  maps: MapDeclarationNode[];               // MAP declarations
  includes: IncludeDeclarationNode[];       // INCLUDE declarations
  functions: FunctionDeclarationNode[];     // FUNCTION definitions
  namespaces: NamespaceDeclarationNode[];   // NAMESPACE blocks
  theme: ThemeDirectiveNode | null;         // Theme directive
  styles: StyleBlockNode | null;            // Style block
  passages: PassageNode[];
  threads: ThreadPassageNode[];             // Thread passages
  audioDeclarations: AudioDeclarationNode[];      // Audio track declarations
  effectDeclarations: EffectDeclarationNode[];    // Text effect declarations
  externalDeclarations: ExternalDeclarationNode[]; // External function declarations
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
 * Variable declaration in @vars block, inline, or top-level VAR/CONST
 */
export interface VariableDeclarationNode extends BaseNode {
  type: 'variable_declaration';
  name: string;
  scope: 'story' | 'temp';
  initialValue: ExpressionNode | null;
  isConst?: boolean;  // true for CONST declarations
}

// ============================================================================
// Collection Declarations
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
// Module Declarations
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
  originalName?: string;     // Name as written in source
  namespace?: string;        // Namespace the passage belongs to
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
  | HookDefinitionNode     // Hook definition
  | HookOperationNode      // Hook operation
  | AwaitExpressionNode    // Thread await
  | SpawnExpressionNode    // Thread spawn
  | DelayDirectiveNode     // Delayed content
  | EveryDirectiveNode     // Repeating content
  | FormattedTextNode      // Rich text
  | BlockquoteNode         // Blockquotes
  | ListNode               // Lists
  | HorizontalRuleNode     // Horizontal rules
  | ClassedBlockNode       // CSS classes
  | ClassedInlineNode      // Inline CSS classes
  | ImageNode              // Images
  | AudioNode              // Audio
  | VideoNode              // Video
  | EmbedNode;             // Embedded content

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
  label: string | null;
  condition: ExpressionNode | null;
  text: ContentNode[];
  target: string | null;
  action: ExpressionNode[] | null;
}

/**
 * Text alternatives ({| a | b | c}) or named (@name:sequence[...])
 */
export interface AlternativesNode extends BaseNode {
  type: 'alternatives';
  mode: 'sequence' | 'cycle' | 'shuffle' | 'once';
  options: ContentNode[][];
  /** Optional name for named alternatives (e.g., @greeting:sequence) */
  name?: string;
}

/**
 * Gather point for flow reconvergence (-)
 * Allows nested choices/gathers to converge
 */
export interface GatherNode extends BaseNode {
  type: 'gather';
  depth: number;  // Nesting depth (number of - markers)
  content: ContentNode[];  // Content after the gather point
}

/**
 * Tunnel call (-> Target ->)
 * Call a passage as a reusable tunnel, returns to caller
 */
export interface TunnelCallNode extends BaseNode {
  type: 'tunnel_call';
  target: string;  // Target passage name
}

/**
 * Tunnel return (<-)
 * Return from a tunnel to the calling passage
 */
export interface TunnelReturnNode extends BaseNode {
  type: 'tunnel_return';
}

// ============================================================================
// Hook Nodes
// ============================================================================

/**
 * Hook definition (|hookName>[content])
 * Defines a named content region that can be modified
 */
export interface HookDefinitionNode extends BaseNode {
  type: 'hook_definition';
  name: string;
  content: string;
}

/**
 * Hook operation (@operation: target { content })
 * Modifies a previously defined hook
 */
export interface HookOperationNode extends BaseNode {
  type: 'hook_operation';
  operation: 'replace' | 'append' | 'prepend' | 'show' | 'hide';
  target: string;
  content: string;
}

// ============================================================================
// Thread Nodes
// ============================================================================

/**
 * Thread passage declaration (== PassageName)
 * Thread passages run in parallel with the main narrative
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
 * Wait for a thread to complete before continuing
 */
export interface AwaitExpressionNode extends BaseNode {
  type: 'await_expression';
  threadName: string;
}

/**
 * Spawn expression ({spawn -> PassageName})
 * Explicitly spawn a thread (alternative to implicit -> ThreadPassage)
 */
export interface SpawnExpressionNode extends BaseNode {
  type: 'spawn_expression';
  passageName: string;
  priority?: number;
}

// ============================================================================
// Presentation Nodes
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
  MISSING_START_PASSAGE: 'WLS-STR-001',
  UNREACHABLE_PASSAGE: 'WLS-STR-002',
  DUPLICATE_PASSAGE: 'WLS-STR-003',
  EMPTY_PASSAGE: 'WLS-STR-004',
  ORPHAN_PASSAGE: 'WLS-STR-005',
  NO_TERMINAL: 'WLS-STR-006',
  // Link errors (LNK)
  DEAD_LINK: 'WLS-LNK-001',               // Link to non-existent passage
  SELF_LINK_NO_CHANGE: 'WLS-LNK-002',     // Self-link without state change
  SPECIAL_TARGET_CASE: 'WLS-LNK-003',     // Wrong case for END/BACK/RESTART
  BACK_ON_START: 'WLS-LNK-004',           // BACK used on start passage
  EMPTY_CHOICE_TARGET: 'WLS-LNK-005',     // Choice with empty target
  // Variable errors (VAR)
  UNDEFINED_VARIABLE: 'WLS-VAR-001',      // Variable used but never defined
  UNUSED_VARIABLE: 'WLS-VAR-002',         // Variable defined but never used
  INVALID_VARIABLE_NAME: 'WLS-VAR-003',   // Invalid variable name format
  RESERVED_PREFIX: 'WLS-VAR-004',         // Variable uses reserved prefix
  VARIABLE_SHADOWING: 'WLS-VAR-005',      // Variable shadows outer scope
  LONE_DOLLAR: 'WLS-VAR-006',             // Lone $ without variable name
  UNCLOSED_INTERPOLATION: 'WLS-VAR-007',  // Unclosed variable interpolation
  TEMP_CROSS_PASSAGE: 'WLS-VAR-008',      // Temp variable used across passages
  // Flow control errors (FLW)
  DEAD_END: 'WLS-FLW-001',                // Passage with no outgoing links
  BOTTLENECK: 'WLS-FLW-002',              // Single entry point for many passages
  CYCLE_DETECTED: 'WLS-FLW-003',          // Cycle in story graph
  INFINITE_LOOP: 'WLS-FLW-004',           // Potential infinite loop
  UNREACHABLE_CHOICE: 'WLS-FLW-005',      // Choice that can never be selected
  ALWAYS_TRUE_CONDITION: 'WLS-FLW-006',   // Condition that's always true
  ORPHAN_GATHER: 'WLS-FLW-007',           // Gather without preceding choice
  TUNNEL_DEPTH_EXCEEDED: 'WLS-FLW-008',   // Too many nested tunnel calls
  ORPHAN_TUNNEL_RETURN: 'WLS-FLW-009',    // <- outside tunnel context
  MISSING_TUNNEL_RETURN: 'WLS-FLW-010',   // Tunnel passage without <-
  INVALID_TUNNEL_SYNTAX: 'WLS-FLW-011',   // Malformed tunnel call

  // Expression errors (EXP)
  EMPTY_EXPRESSION: 'WLS-EXP-001',        // Empty ${} or {} block
  UNCLOSED_BLOCK: 'WLS-EXP-002',          // Conditional block { not closed with {/}
  ASSIGNMENT_IN_CONDITION: 'WLS-EXP-003', // = used where == likely intended
  MISSING_OPERAND: 'WLS-EXP-004',         // Binary operator missing operand
  INVALID_OPERATOR: 'WLS-EXP-005',        // Unknown or invalid operator
  UNMATCHED_PARENTHESIS: 'WLS-EXP-006',   // Parentheses not balanced
  INCOMPLETE_EXPRESSION: 'WLS-EXP-007',   // Expression syntactically incomplete

  // Quality warnings (QUA)
  LOW_BRANCHING: 'WLS-QUA-001',           // Low branching factor
  HIGH_COMPLEXITY: 'WLS-QUA-002',         // Story complexity exceeds threshold
  LONG_PASSAGE: 'WLS-QUA-003',            // Passage exceeds word count
  DEEP_NESTING: 'WLS-QUA-004',            // Conditional nesting too deep
  MANY_VARIABLES: 'WLS-QUA-005',          // Too many variables

  // Asset errors (AST)
  MISSING_ASSET_ID: 'WLS-AST-001',        // Asset reference missing ID
  INVALID_ASSET_PATH: 'WLS-AST-002',      // Invalid asset file path
  ASSET_NOT_FOUND: 'WLS-AST-003',         // Referenced asset does not exist
  UNSUPPORTED_ASSET_TYPE: 'WLS-AST-004',  // Asset type not supported
  ASSET_TOO_LARGE: 'WLS-AST-005',         // Asset exceeds size limit
  DUPLICATE_ASSET_ID: 'WLS-AST-006',      // Duplicate asset identifier
  UNUSED_ASSET: 'WLS-AST-007',            // Asset declared but never used

  // Metadata errors (META)
  MISSING_IFID: 'WLS-META-001',           // Story missing IFID
  INVALID_IFID: 'WLS-META-002',           // IFID format invalid
  INVALID_DIMENSIONS: 'WLS-META-003',     // Invalid width/height values
  RESERVED_META_KEY: 'WLS-META-004',      // Using reserved metadata key
  DUPLICATE_META_KEY: 'WLS-META-005',     // Duplicate metadata declaration

  // Script errors (SCR)
  EMPTY_SCRIPT: 'WLS-SCR-001',            // Empty script block
  SCRIPT_SYNTAX_ERROR: 'WLS-SCR-002',     // Lua syntax error in script
  UNSAFE_FUNCTION: 'WLS-SCR-003',         // Using unsafe Lua function
  SCRIPT_TOO_LARGE: 'WLS-SCR-004',        // Script exceeds size limit

  // Collection errors (COL)
  DUPLICATE_LIST_VALUE: 'WLS-COL-001',    // Duplicate value in LIST
  EMPTY_LIST: 'WLS-COL-002',              // LIST with no values
  INVALID_LIST_VALUE: 'WLS-COL-003',      // Invalid value type in LIST
  DUPLICATE_ARRAY_INDEX: 'WLS-COL-004',   // Duplicate index in ARRAY
  ARRAY_INDEX_OUT_OF_BOUNDS: 'WLS-COL-005', // ARRAY index out of range
  INVALID_ARRAY_TYPE: 'WLS-COL-006',      // Invalid type in ARRAY
  DUPLICATE_MAP_KEY: 'WLS-COL-007',       // Duplicate key in MAP
  INVALID_MAP_KEY: 'WLS-COL-008',         // Invalid MAP key type
  UNDEFINED_COLLECTION: 'WLS-COL-009',    // Collection referenced but not defined
  COLLECTION_TYPE_MISMATCH: 'WLS-COL-010', // Wrong operation for collection type

  // Module errors (MOD)
  INCLUDE_NOT_FOUND: 'WLS-MOD-001',       // Include file not found
  CIRCULAR_INCLUDE: 'WLS-MOD-002',        // Circular include dependency
  UNDEFINED_FUNCTION: 'WLS-MOD-003',      // Function called but not defined
  DUPLICATE_FUNCTION: 'WLS-MOD-004',      // Function name already defined
  NAMESPACE_CONFLICT: 'WLS-MOD-005',      // Namespace name conflicts
  UNDEFINED_NAMESPACE: 'WLS-MOD-006',     // Namespace used but not defined
  UNMATCHED_END_NAMESPACE: 'WLS-MOD-007', // END NAMESPACE without NAMESPACE
  INVALID_EXPORT: 'WLS-MOD-008',          // Invalid export declaration

  // Presentation errors (PRS)
  INVALID_MARKDOWN: 'WLS-PRS-001',        // Malformed markdown syntax
  INVALID_CSS_CLASS: 'WLS-PRS-002',       // Invalid CSS class name
  UNDEFINED_CSS_CLASS: 'WLS-PRS-003',     // CSS class used but not defined
  MISSING_MEDIA_SOURCE: 'WLS-PRS-004',    // Media element missing source
  INVALID_MEDIA_FORMAT: 'WLS-PRS-005',    // Unsupported media format
  THEME_NOT_FOUND: 'WLS-PRS-006',         // Theme reference not found
  INVALID_STYLE_PROPERTY: 'WLS-PRS-007',  // Invalid CSS property
  UNCLOSED_STYLE_BLOCK: 'WLS-PRS-008',    // Style block not closed

  // Developer experience errors (DEV)
  LSP_CONNECTION_FAILED: 'WLS-DEV-001',   // Language server connection failed
  DEBUG_ADAPTER_ERROR: 'WLS-DEV-002',     // Debug adapter protocol error
  FORMAT_PARSE_ERROR: 'WLS-DEV-003',      // Cannot format due to parse errors
  PREVIEW_RUNTIME_ERROR: 'WLS-DEV-004',   // Runtime error during preview
  BREAKPOINT_INVALID: 'WLS-DEV-005',      // Breakpoint at invalid location
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
    // Hook nodes
    'hook_definition',
    'hook_operation',
    // Thread nodes
    'await_expression',
    'spawn_expression',
    // Timed content nodes
    'delay_directive',
    'every_directive',
    // Presentation nodes
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
