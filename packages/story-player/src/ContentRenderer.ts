/**
 * WLS 1.0 Content Renderer
 *
 * Renders AST content nodes to text, handling:
 * - Variable interpolation ($var, ${expr})
 * - Block conditionals ({ condition }...{/})
 * - Else/elif branches ({else}, {elif condition})
 * - Nested conditionals
 * - Text alternatives ({| a | b | c})
 */

import type {
  ContentNode,
  TextNode,
  InterpolationNode,
  ExpressionStatementNode,
  ConditionalNode,
  ChoiceNode,
  AlternativesNode,
  ExpressionNode,
  GatherNode,
  TunnelCallNode,
  TunnelReturnNode,
} from '@writewhisker/parser';

import type { WhiskerRuntimeContext, WhiskerValue } from '@writewhisker/scripting';
import { ExpressionEvaluator } from '@writewhisker/scripting';

// ============================================================================
// Types
// ============================================================================

/**
 * Tunnel call result (for handling by player)
 */
export interface TunnelCall {
  /** Target passage for the tunnel */
  target: string;
  /** Position in content where tunnel was called */
  position: number;
}

/**
 * Rendered content result
 */
export interface RenderResult {
  /** The rendered text output */
  text: string;
  /** Any errors encountered during rendering */
  errors: RenderError[];
  /** Choices extracted from content (for passage rendering) */
  choices: RenderedChoice[];
  /** Tunnel call encountered (if any) - execution should pause for player to handle */
  tunnelCall?: TunnelCall;
  /** Tunnel return encountered - player should pop call stack */
  tunnelReturn?: boolean;
  /** Gather points encountered (for flow tracking) */
  gatherPoints: number[];
}

/**
 * A rendered choice ready for display
 */
export interface RenderedChoice {
  /** Original AST node */
  node: ChoiceNode;
  /** Rendered choice text */
  text: string;
  /** Target passage ID */
  target: string | null;
  /** Whether the choice is available (condition met) */
  available: boolean;
  /** Choice type (once or sticky) */
  type: 'once' | 'sticky';
}

/**
 * Rendering error
 */
export interface RenderError {
  message: string;
  node?: ContentNode;
  cause?: Error;
}

/**
 * Options for content rendering
 */
export interface RenderOptions {
  /** Strip leading/trailing whitespace from result */
  trim?: boolean;
  /** Collapse multiple whitespace to single space */
  collapseWhitespace?: boolean;
  /** Include choices in output (for debugging) */
  includeChoiceText?: boolean;
}

/**
 * Alternatives tracking state
 */
export interface AlternativesState {
  /** Map of alternatives node location to current index */
  indices: Map<string, number>;
  /** Map of alternatives node location to shuffle order */
  shuffleOrders: Map<string, number[]>;
}

/**
 * Choice selection state for tracking once-only choices
 */
export interface ChoiceState {
  /** Set of choice keys that have been selected (once-only choices become unavailable) */
  selectedChoices: Set<string>;
}

// ============================================================================
// Content Renderer
// ============================================================================

/**
 * Content renderer for WLS 1.0 AST nodes
 */
export class ContentRenderer {
  private readonly evaluator: ExpressionEvaluator;
  private readonly errors: RenderError[] = [];
  private alternativesState: AlternativesState;
  private choiceState: ChoiceState;
  private tunnelCall: TunnelCall | undefined;
  private tunnelReturn: boolean = false;
  private gatherPoints: number[] = [];
  private currentPosition: number = 0;

  constructor(
    private readonly context: WhiskerRuntimeContext,
    alternativesState?: AlternativesState,
    choiceState?: ChoiceState
  ) {
    this.evaluator = new ExpressionEvaluator(context);
    this.alternativesState = alternativesState || {
      indices: new Map(),
      shuffleOrders: new Map(),
    };
    this.choiceState = choiceState || {
      selectedChoices: new Set(),
    };
  }

  /**
   * Render an array of content nodes
   */
  render(nodes: ContentNode[], options: RenderOptions = {}): RenderResult {
    this.errors.length = 0;
    this.tunnelCall = undefined;
    this.tunnelReturn = false;
    this.gatherPoints = [];
    this.currentPosition = 0;
    const choices: RenderedChoice[] = [];
    let text = '';

    for (const node of nodes) {
      // Stop rendering if we hit a tunnel call or return
      if (this.tunnelCall || this.tunnelReturn) {
        break;
      }
      const result = this.renderNode(node, choices);
      text += result;
      this.currentPosition++;
    }

    // Post-processing
    if (options.trim) {
      text = text.trim();
    }
    if (options.collapseWhitespace) {
      text = text.replace(/\s+/g, ' ');
    }

    return {
      text,
      errors: [...this.errors],
      choices,
      tunnelCall: this.tunnelCall,
      tunnelReturn: this.tunnelReturn,
      gatherPoints: [...this.gatherPoints],
    };
  }

  /**
   * Render a single content node
   */
  private renderNode(node: ContentNode, choices: RenderedChoice[]): string {
    switch (node.type) {
      case 'text':
        return this.renderText(node);
      case 'interpolation':
        return this.renderInterpolation(node);
      case 'expression_statement':
        return this.renderExpressionStatement(node);
      case 'conditional':
        return this.renderConditional(node, choices);
      case 'choice':
        return this.renderChoice(node, choices);
      case 'alternatives':
        return this.renderAlternatives(node, choices);
      case 'gather':
        return this.renderGather(node as GatherNode, choices);
      case 'tunnel_call':
        return this.renderTunnelCall(node as TunnelCallNode);
      case 'tunnel_return':
        return this.renderTunnelReturn(node as TunnelReturnNode);
      default:
        this.addError(`Unknown content node type: ${(node as ContentNode).type}`, node);
        return '';
    }
  }

  /**
   * Render plain text
   */
  private renderText(node: TextNode): string {
    return node.value;
  }

  /**
   * Render variable interpolation ($var or ${expr})
   */
  private renderInterpolation(node: InterpolationNode): string {
    try {
      const value = this.evaluator.evaluate(node.expression);
      return this.valueToString(value);
    } catch (error) {
      this.addError(
        `Failed to evaluate interpolation: ${error instanceof Error ? error.message : String(error)}`,
        node,
        error instanceof Error ? error : undefined
      );
      return '';
    }
  }

  /**
   * Render expression statement (side effects only, no output)
   */
  private renderExpressionStatement(node: ExpressionStatementNode): string {
    try {
      this.evaluator.evaluate(node.expression);
    } catch (error) {
      this.addError(
        `Failed to execute expression: ${error instanceof Error ? error.message : String(error)}`,
        node,
        error instanceof Error ? error : undefined
      );
    }
    return '';
  }

  /**
   * Render conditional block
   */
  private renderConditional(node: ConditionalNode, choices: RenderedChoice[]): string {
    try {
      // Evaluate main condition
      const conditionResult = this.evaluator.evaluate(node.condition);
      if (this.isTruthy(conditionResult)) {
        return this.renderNodes(node.consequent, choices);
      }

      // Check alternative branches (elif)
      for (const branch of node.alternatives) {
        const branchResult = this.evaluator.evaluate(branch.condition);
        if (this.isTruthy(branchResult)) {
          return this.renderNodes(branch.content, choices);
        }
      }

      // Fall through to else branch
      if (node.alternate) {
        return this.renderNodes(node.alternate, choices);
      }

      return '';
    } catch (error) {
      this.addError(
        `Failed to evaluate conditional: ${error instanceof Error ? error.message : String(error)}`,
        node,
        error instanceof Error ? error : undefined
      );
      return '';
    }
  }

  /**
   * Render a choice node
   */
  private renderChoice(node: ChoiceNode, choices: RenderedChoice[]): string {
    // Generate unique key for this choice based on location
    const choiceKey = this.getChoiceKey(node);

    // Check if once-only choice has already been selected
    let available = true;
    if (node.choiceType === 'once' && this.choiceState.selectedChoices.has(choiceKey)) {
      available = false;
    }

    // Evaluate choice condition (only if not already unavailable)
    if (available && node.condition) {
      try {
        const conditionResult = this.evaluator.evaluate(node.condition);
        available = this.isTruthy(conditionResult);
      } catch (error) {
        this.addError(
          `Failed to evaluate choice condition: ${error instanceof Error ? error.message : String(error)}`,
          node,
          error instanceof Error ? error : undefined
        );
        available = false;
      }
    }

    // Render choice text
    const textResult = this.render(node.text, { trim: true });

    // Add to choices array
    choices.push({
      node,
      text: textResult.text,
      target: node.target,
      available,
      type: node.choiceType,
    });

    // Choices don't output text directly
    return '';
  }

  /**
   * Get unique key for a choice node based on its location
   */
  private getChoiceKey(node: ChoiceNode): string {
    return `${node.location.start.line}:${node.location.start.column}`;
  }

  /**
   * Mark a choice as selected (for once-only choice tracking)
   */
  markChoiceSelected(node: ChoiceNode): void {
    if (node.choiceType === 'once') {
      const key = this.getChoiceKey(node);
      this.choiceState.selectedChoices.add(key);
    }
  }

  /**
   * Render alternatives ({| a | b | c})
   */
  private renderAlternatives(node: AlternativesNode, choices: RenderedChoice[]): string {
    if (node.options.length === 0) {
      return '';
    }

    // Create a unique key for this alternatives node based on location
    const key = `${node.location.start.line}:${node.location.start.column}`;

    // Get or initialize the current index for this alternatives
    let index = this.alternativesState.indices.get(key) ?? 0;

    switch (node.mode) {
      case 'sequence':
        // Show options in order, stop at last
        index = Math.min(index, node.options.length - 1);
        break;

      case 'cycle':
        // Show options in order, wrap around
        index = index % node.options.length;
        break;

      case 'shuffle': {
        // Show options in random order
        let order = this.alternativesState.shuffleOrders.get(key);
        if (!order) {
          // Generate shuffle order
          order = this.generateShuffleOrder(node.options.length);
          this.alternativesState.shuffleOrders.set(key, order);
        }
        index = order[index % order.length];
        break;
      }

      case 'once':
        // Show each option once, then empty
        if (index >= node.options.length) {
          return '';
        }
        break;
    }

    // Increment the index for next time
    this.alternativesState.indices.set(key, (this.alternativesState.indices.get(key) ?? 0) + 1);

    // Render the selected option
    const selectedOption = node.options[index];
    if (!selectedOption) {
      return '';
    }

    return this.renderNodes(selectedOption, choices);
  }

  /**
   * Render a gather point
   * Gather points collect divergent choice paths and continue with shared content
   */
  private renderGather(node: GatherNode, choices: RenderedChoice[]): string {
    // Record this gather point
    this.gatherPoints.push(node.depth);

    // Render the content after the gather point
    if (node.content && node.content.length > 0) {
      return this.renderNodes(node.content, choices);
    }
    return '';
  }

  /**
   * Render a tunnel call (-> PassageName ->)
   * Signals to the player to push return location and navigate to target
   */
  private renderTunnelCall(node: TunnelCallNode): string {
    // Set the tunnel call - player will handle navigation
    this.tunnelCall = {
      target: node.target,
      position: this.currentPosition,
    };
    // Tunnel calls don't produce text output
    return '';
  }

  /**
   * Render a tunnel return (<-)
   * Signals to the player to pop the call stack and return
   */
  private renderTunnelReturn(_node: TunnelReturnNode): string {
    // Set the tunnel return flag - player will handle return
    this.tunnelReturn = true;
    // Tunnel returns don't produce text output
    return '';
  }

  /**
   * Render an array of content nodes
   */
  private renderNodes(nodes: ContentNode[], choices: RenderedChoice[]): string {
    let result = '';
    for (const node of nodes) {
      result += this.renderNode(node, choices);
    }
    return result;
  }

  /**
   * Generate a shuffle order for alternatives
   */
  private generateShuffleOrder(length: number): number[] {
    const order = Array.from({ length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }

  /**
   * Check if a value is truthy (Lua semantics)
   */
  private isTruthy(value: WhiskerValue): boolean {
    if (value === null) return false;
    if (value === false) return false;
    return true;
  }

  /**
   * Convert a value to string for interpolation
   */
  private valueToString(value: WhiskerValue): string {
    if (value === null) return '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(v => this.valueToString(v)).join(', ');
    if (typeof value === 'object') return '[table]';
    return String(value);
  }

  /**
   * Add an error
   */
  private addError(message: string, node?: ContentNode, cause?: Error): void {
    this.errors.push({ message, node, cause });
  }

  /**
   * Get the alternatives state (for persistence)
   */
  getAlternativesState(): AlternativesState {
    return this.alternativesState;
  }

  /**
   * Get the choice state (for persistence)
   */
  getChoiceState(): ChoiceState {
    return this.choiceState;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a content renderer
 */
export function createContentRenderer(
  context: WhiskerRuntimeContext,
  alternativesState?: AlternativesState,
  choiceState?: ChoiceState
): ContentRenderer {
  return new ContentRenderer(context, alternativesState, choiceState);
}

/**
 * Render content nodes to text
 */
export function renderContent(
  nodes: ContentNode[],
  context: WhiskerRuntimeContext,
  options?: RenderOptions
): RenderResult {
  const renderer = new ContentRenderer(context);
  return renderer.render(nodes, options);
}

/**
 * Evaluate a condition expression
 */
export function evaluateCondition(
  condition: ExpressionNode,
  context: WhiskerRuntimeContext
): boolean {
  const evaluator = new ExpressionEvaluator(context);
  try {
    const result = evaluator.evaluate(condition);
    if (result === null) return false;
    if (result === false) return false;
    return true;
  } catch {
    return false;
  }
}
