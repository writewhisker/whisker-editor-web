/**
 * WLS 1.0 Content Renderer Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  ContentNode,
  TextNode,
  InterpolationNode,
  ConditionalNode,
  ConditionalBranchNode,
  ChoiceNode,
  AlternativesNode,
  ExpressionStatementNode,
  LiteralNode,
  VariableNode,
  BinaryExpressionNode,
  AssignmentExpressionNode,
  SourceSpan,
  ExpressionNode,
} from '@writewhisker/parser';
import { InMemoryRuntimeContext } from '@writewhisker/scripting';
import { ContentRenderer, createContentRenderer, renderContent } from './ContentRenderer';

// Helper to create a dummy source span
const span: SourceSpan = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
};

// Helper to create text nodes
function text(value: string): TextNode {
  return { type: 'text', value, location: span };
}

// Helper to create literal nodes
function literal(value: number | string | boolean | null): LiteralNode {
  let valueType: 'number' | 'string' | 'boolean' | 'nil';
  if (value === null) valueType = 'nil';
  else if (typeof value === 'number') valueType = 'number';
  else if (typeof value === 'string') valueType = 'string';
  else valueType = 'boolean';
  return { type: 'literal', valueType, value, location: span };
}

// Helper to create variable nodes
function variable(name: string, scope: 'story' | 'temp' = 'story'): VariableNode {
  return { type: 'variable', name, scope, location: span };
}

// Helper to create interpolation nodes
function interpolation(expr: any, isSimple = true): InterpolationNode {
  return { type: 'interpolation', expression: expr, isSimple, location: span };
}

// Helper to create conditional nodes
function conditional(
  condition: any,
  consequent: ContentNode[],
  alternatives: ConditionalBranchNode[] = [],
  alternate: ContentNode[] | null = null
): ConditionalNode {
  return { type: 'conditional', condition, consequent, alternatives, alternate, location: span };
}

// Helper to create conditional branch nodes
function branch(condition: any, content: ContentNode[]): ConditionalBranchNode {
  return { type: 'conditional_branch', condition, content, location: span };
}

// Helper to create binary expressions
function binary(op: BinaryExpressionNode['operator'], left: any, right: any): BinaryExpressionNode {
  return { type: 'binary_expression', operator: op, left, right, location: span };
}

// Helper to create choice nodes
function choice(
  choiceText: ContentNode[],
  target: string | null = null,
  condition: any = null,
  choiceType: 'once' | 'sticky' = 'once'
): ChoiceNode {
  return {
    type: 'choice',
    choiceType,
    condition,
    text: choiceText,
    target,
    action: null,
    location: span,
  };
}

// Helper to create alternatives nodes
function alternatives(
  options: ContentNode[][],
  mode: 'sequence' | 'cycle' | 'shuffle' | 'once' = 'sequence'
): AlternativesNode {
  return { type: 'alternatives', mode, options, location: span };
}

// Helper to create expression statement nodes
function exprStmt(expr: any): ExpressionStatementNode {
  return { type: 'expression_statement', expression: expr, location: span };
}

// Helper to create assignment expressions
function assign(target: VariableNode, value: any): AssignmentExpressionNode {
  return { type: 'assignment_expression', operator: '=', target, value, location: span };
}

describe('ContentRenderer', () => {
  let context: InMemoryRuntimeContext;
  let renderer: ContentRenderer;

  beforeEach(() => {
    context = new InMemoryRuntimeContext();
    renderer = createContentRenderer(context);
  });

  // ==========================================================================
  // Text Rendering
  // ==========================================================================

  describe('Text Rendering', () => {
    it('renders plain text', () => {
      const result = renderer.render([text('Hello, world!')]);
      expect(result.text).toBe('Hello, world!');
      expect(result.errors).toHaveLength(0);
    });

    it('renders multiple text nodes', () => {
      const result = renderer.render([text('Hello, '), text('world!')]);
      expect(result.text).toBe('Hello, world!');
    });

    it('preserves whitespace', () => {
      const result = renderer.render([text('  Hello  \n  world  ')]);
      expect(result.text).toBe('  Hello  \n  world  ');
    });

    it('trims result when option set', () => {
      const result = renderer.render([text('  Hello  ')], { trim: true });
      expect(result.text).toBe('Hello');
    });

    it('collapses whitespace when option set', () => {
      const result = renderer.render([text('Hello    world')], { collapseWhitespace: true });
      expect(result.text).toBe('Hello world');
    });

    it('renders empty text', () => {
      const result = renderer.render([text('')]);
      expect(result.text).toBe('');
    });
  });

  // ==========================================================================
  // Variable Interpolation
  // ==========================================================================

  describe('Variable Interpolation', () => {
    it('interpolates number variable', () => {
      context.setVariable('gold', 100);
      const result = renderer.render([interpolation(variable('gold'))]);
      expect(result.text).toBe('100');
    });

    it('interpolates string variable', () => {
      context.setVariable('name', 'Hero');
      const result = renderer.render([interpolation(variable('name'))]);
      expect(result.text).toBe('Hero');
    });

    it('interpolates boolean variable', () => {
      context.setVariable('flag', true);
      const result = renderer.render([interpolation(variable('flag'))]);
      expect(result.text).toBe('true');
    });

    it('interpolates undefined variable as empty', () => {
      const result = renderer.render([interpolation(variable('undefined'))]);
      expect(result.text).toBe('');
    });

    it('interpolates literal expression', () => {
      const result = renderer.render([interpolation(literal(42))]);
      expect(result.text).toBe('42');
    });

    it('interpolates arithmetic expression', () => {
      context.setVariable('a', 10);
      const result = renderer.render([interpolation(binary('+', variable('a'), literal(5)))]);
      expect(result.text).toBe('15');
    });

    it('combines text and interpolation', () => {
      context.setVariable('name', 'Hero');
      const result = renderer.render([
        text('Hello, '),
        interpolation(variable('name')),
        text('!'),
      ]);
      expect(result.text).toBe('Hello, Hero!');
    });
  });

  // ==========================================================================
  // Block Conditionals
  // ==========================================================================

  describe('Block Conditionals', () => {
    it('renders consequent when condition is true', () => {
      context.setVariable('hasKey', true);
      const result = renderer.render([
        conditional(variable('hasKey'), [text('You have the key.')]),
      ]);
      expect(result.text).toBe('You have the key.');
    });

    it('renders nothing when condition is false and no else', () => {
      context.setVariable('hasKey', false);
      const result = renderer.render([
        conditional(variable('hasKey'), [text('You have the key.')]),
      ]);
      expect(result.text).toBe('');
    });

    it('renders else branch when condition is false', () => {
      context.setVariable('hasKey', false);
      const result = renderer.render([
        conditional(
          variable('hasKey'),
          [text('You have the key.')],
          [],
          [text('You need a key.')]
        ),
      ]);
      expect(result.text).toBe('You need a key.');
    });

    it('evaluates numeric condition (0 is truthy in Lua)', () => {
      context.setVariable('count', 0);
      const result = renderer.render([
        conditional(variable('count'), [text('truthy')], [], [text('falsy')]),
      ]);
      // In Lua, 0 is truthy
      expect(result.text).toBe('truthy');
    });

    it('evaluates nil as falsy', () => {
      // Variable not set = nil
      const result = renderer.render([
        conditional(variable('undefined'), [text('truthy')], [], [text('falsy')]),
      ]);
      expect(result.text).toBe('falsy');
    });

    it('evaluates false as falsy', () => {
      context.setVariable('flag', false);
      const result = renderer.render([
        conditional(variable('flag'), [text('truthy')], [], [text('falsy')]),
      ]);
      expect(result.text).toBe('falsy');
    });
  });

  // ==========================================================================
  // Elif Branches
  // ==========================================================================

  describe('Elif Branches', () => {
    it('renders first elif when condition is true', () => {
      context.setVariable('level', 2);
      const result = renderer.render([
        conditional(
          binary('==', variable('level'), literal(1)),
          [text('Level 1')],
          [
            branch(binary('==', variable('level'), literal(2)), [text('Level 2')]),
            branch(binary('==', variable('level'), literal(3)), [text('Level 3')]),
          ],
          [text('Other level')]
        ),
      ]);
      expect(result.text).toBe('Level 2');
    });

    it('renders second elif when first is false', () => {
      context.setVariable('level', 3);
      const result = renderer.render([
        conditional(
          binary('==', variable('level'), literal(1)),
          [text('Level 1')],
          [
            branch(binary('==', variable('level'), literal(2)), [text('Level 2')]),
            branch(binary('==', variable('level'), literal(3)), [text('Level 3')]),
          ],
          [text('Other level')]
        ),
      ]);
      expect(result.text).toBe('Level 3');
    });

    it('renders else when all conditions are false', () => {
      context.setVariable('level', 5);
      const result = renderer.render([
        conditional(
          binary('==', variable('level'), literal(1)),
          [text('Level 1')],
          [
            branch(binary('==', variable('level'), literal(2)), [text('Level 2')]),
            branch(binary('==', variable('level'), literal(3)), [text('Level 3')]),
          ],
          [text('Other level')]
        ),
      ]);
      expect(result.text).toBe('Other level');
    });
  });

  // ==========================================================================
  // Nested Conditionals
  // ==========================================================================

  describe('Nested Conditionals', () => {
    it('handles nested conditionals', () => {
      context.setVariable('hasKey', true);
      context.setVariable('doorOpen', false);
      const result = renderer.render([
        conditional(
          variable('hasKey'),
          [
            text('You have the key. '),
            conditional(
              variable('doorOpen'),
              [text('The door is open.')],
              [],
              [text('The door is closed.')]
            ),
          ],
          [],
          [text('You need a key.')]
        ),
      ]);
      expect(result.text).toBe('You have the key. The door is closed.');
    });

    it('handles deeply nested conditionals', () => {
      context.setVariable('a', true);
      context.setVariable('b', true);
      context.setVariable('c', true);
      const result = renderer.render([
        conditional(
          variable('a'),
          [
            text('A'),
            conditional(
              variable('b'),
              [
                text('B'),
                conditional(variable('c'), [text('C')]),
              ]
            ),
          ]
        ),
      ]);
      expect(result.text).toBe('ABC');
    });
  });

  // ==========================================================================
  // Choices
  // ==========================================================================

  describe('Choices', () => {
    it('extracts choice from content', () => {
      const result = renderer.render([
        text('What do you do?\n'),
        choice([text('Go north')], 'north'),
        choice([text('Go south')], 'south'),
      ]);
      expect(result.text).toBe('What do you do?\n');
      expect(result.choices).toHaveLength(2);
      expect(result.choices[0].text).toBe('Go north');
      expect(result.choices[0].target).toBe('north');
      expect(result.choices[1].text).toBe('Go south');
      expect(result.choices[1].target).toBe('south');
    });

    it('evaluates choice condition', () => {
      context.setVariable('hasKey', true);
      const result = renderer.render([
        choice([text('Open door')], 'room', variable('hasKey')),
      ]);
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].available).toBe(true);
    });

    it('marks unavailable choice when condition is false', () => {
      context.setVariable('hasKey', false);
      const result = renderer.render([
        choice([text('Open door')], 'room', variable('hasKey')),
      ]);
      expect(result.choices).toHaveLength(1);
      expect(result.choices[0].available).toBe(false);
    });

    it('interpolates variables in choice text', () => {
      context.setVariable('direction', 'north');
      const result = renderer.render([
        choice([text('Go '), interpolation(variable('direction'))], 'north'),
      ]);
      expect(result.choices[0].text).toBe('Go north');
    });

    it('preserves choice type', () => {
      const result = renderer.render([
        choice([text('Once choice')], 'target', null, 'once'),
        choice([text('Sticky choice')], 'target', null, 'sticky'),
      ]);
      expect(result.choices[0].type).toBe('once');
      expect(result.choices[1].type).toBe('sticky');
    });
  });

  // ==========================================================================
  // Alternatives
  // ==========================================================================

  describe('Alternatives - Sequence', () => {
    it('shows first option on first render', () => {
      const alt = alternatives([[text('first')], [text('second')], [text('third')]], 'sequence');
      const result1 = renderer.render([alt]);
      expect(result1.text).toBe('first');
    });

    it('shows options in sequence', () => {
      const alt = alternatives([[text('first')], [text('second')], [text('third')]], 'sequence');
      renderer.render([alt]); // first
      const result2 = renderer.render([alt]);
      expect(result2.text).toBe('second');
    });

    it('stays on last option', () => {
      const alt = alternatives([[text('first')], [text('last')]], 'sequence');
      renderer.render([alt]); // first
      renderer.render([alt]); // last
      const result3 = renderer.render([alt]);
      expect(result3.text).toBe('last');
    });
  });

  describe('Alternatives - Cycle', () => {
    it('cycles through options', () => {
      const alt = alternatives([[text('A')], [text('B')]], 'cycle');
      expect(renderer.render([alt]).text).toBe('A');
      expect(renderer.render([alt]).text).toBe('B');
      expect(renderer.render([alt]).text).toBe('A');
      expect(renderer.render([alt]).text).toBe('B');
    });
  });

  describe('Alternatives - Once', () => {
    it('shows each option once then empty', () => {
      const alt = alternatives([[text('A')], [text('B')]], 'once');
      expect(renderer.render([alt]).text).toBe('A');
      expect(renderer.render([alt]).text).toBe('B');
      expect(renderer.render([alt]).text).toBe('');
      expect(renderer.render([alt]).text).toBe('');
    });
  });

  describe('Alternatives - Shuffle', () => {
    it('shows all options in random order', () => {
      const options = ['A', 'B', 'C'];
      const alt = alternatives(options.map(o => [text(o)]), 'shuffle');

      const results: string[] = [];
      for (let i = 0; i < 3; i++) {
        results.push(renderer.render([alt]).text);
      }

      // All options should appear
      expect(results.sort()).toEqual(['A', 'B', 'C']);
    });
  });

  // ==========================================================================
  // Expression Statements
  // ==========================================================================

  describe('Expression Statements', () => {
    it('executes assignment without output', () => {
      const result = renderer.render([
        exprStmt(assign(variable('gold'), literal(100))),
        text('You have '),
        interpolation(variable('gold')),
        text(' gold.'),
      ]);
      expect(result.text).toBe('You have 100 gold.');
      expect(context.getVariable('gold')).toBe(100);
    });

    it('modifies variables during render', () => {
      context.setVariable('count', 0);
      const result = renderer.render([
        text('Count: '),
        interpolation(variable('count')),
        exprStmt(assign(variable('count'), literal(1))),
        text(' -> '),
        interpolation(variable('count')),
      ]);
      expect(result.text).toBe('Count: 0 -> 1');
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('continues rendering after interpolation error', () => {
      const badExpr: any = { type: 'unknown_type', location: span };
      const result = renderer.render([
        text('Before '),
        interpolation(badExpr),
        text(' After'),
      ]);
      expect(result.text).toBe('Before  After');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('records errors without crashing', () => {
      const badCond: any = { type: 'unknown_type', location: span };
      const result = renderer.render([
        conditional(badCond, [text('never')]),
      ]);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Convenience Functions
  // ==========================================================================

  describe('Convenience Functions', () => {
    it('renderContent works correctly', () => {
      context.setVariable('name', 'World');
      const result = renderContent(
        [text('Hello, '), interpolation(variable('name')), text('!')],
        context
      );
      expect(result.text).toBe('Hello, World!');
    });
  });

  // ==========================================================================
  // Complex Scenarios
  // ==========================================================================

  describe('Complex Scenarios', () => {
    it('renders passage-like content', () => {
      context.setVariable('playerName', 'Hero');
      context.setVariable('gold', 50);
      context.setVariable('hasKey', true);

      const result = renderer.render([
        text('Welcome, '),
        interpolation(variable('playerName')),
        text('!\n\n'),
        text('You have '),
        interpolation(variable('gold')),
        text(' gold.\n\n'),
        conditional(
          variable('hasKey'),
          [text('A brass key glints in your pocket.')],
          [],
          [text('Your pockets are empty.')]
        ),
        text('\n\n'),
        choice([text('Go to the market')], 'market'),
        choice([text('Enter the dungeon')], 'dungeon', binary('>=', variable('gold'), literal(10))),
      ]);

      expect(result.text).toContain('Welcome, Hero!');
      expect(result.text).toContain('You have 50 gold.');
      expect(result.text).toContain('A brass key glints');
      expect(result.choices).toHaveLength(2);
      expect(result.choices[0].available).toBe(true);
      expect(result.choices[1].available).toBe(true);
    });

    it('handles conditional choices', () => {
      context.setVariable('gold', 5);

      const result = renderer.render([
        text('The merchant offers a sword.\n'),
        choice([text('Buy sword (10 gold)')], 'buy', binary('>=', variable('gold'), literal(10))),
        choice([text('Leave')], 'exit'),
      ]);

      expect(result.choices[0].available).toBe(false);
      expect(result.choices[1].available).toBe(true);
    });
  });

  // ==========================================================================
  // Variable Interpolation Edge Cases
  // ==========================================================================

  describe('Variable Interpolation', () => {
    it('handles undefined variables gracefully', () => {
      const result = renderer.render([
        text('Hello, '),
        interpolation(variable('unknownVar')),
        text('!'),
      ]);
      // Undefined variables render as empty string (Lua nil behavior)
      expect(result.text).toBe('Hello, !');
      // No error recorded - this is expected Lua-like behavior
      expect(result.errors).toHaveLength(0);
    });

    it('handles temp variables (_prefixed)', () => {
      context.setVariable('_tempName', 'TempValue');
      const result = renderer.render([
        text('Value: '),
        interpolation(variable('_tempName', 'temp')),
      ]);
      expect(result.text).toBe('Value: TempValue');
    });

    it('handles null variable values', () => {
      context.setVariable('nullVar', null);
      const result = renderer.render([
        text('Value: '),
        interpolation(variable('nullVar')),
        text(' end'),
      ]);
      expect(result.text).toBe('Value:  end');
    });

    it('converts boolean true to string', () => {
      context.setVariable('flag', true);
      const result = renderer.render([interpolation(variable('flag'))]);
      expect(result.text).toBe('true');
    });

    it('converts boolean false to string', () => {
      context.setVariable('flag', false);
      const result = renderer.render([interpolation(variable('flag'))]);
      expect(result.text).toBe('false');
    });

    it('converts arrays to comma-separated string', () => {
      context.setVariable('items', ['apple', 'banana', 'cherry']);
      const result = renderer.render([interpolation(variable('items'))]);
      expect(result.text).toBe('apple, banana, cherry');
    });

    it('renders nested object as [table]', () => {
      context.setVariable('obj', { nested: true });
      const result = renderer.render([interpolation(variable('obj'))]);
      expect(result.text).toBe('[table]');
    });
  });

  // ==========================================================================
  // Escape Sequence Handling
  // ==========================================================================

  describe('Escape Sequences', () => {
    it('renders escaped dollar sign as literal $', () => {
      // TEXT tokens from escaped \$ should render as literal $
      const result = renderer.render([
        text('Price: '),
        text('$'), // This represents escaped \$ from lexer
        text('50'),
      ]);
      expect(result.text).toBe('Price: $50');
    });

    it('renders escaped braces as literal braces', () => {
      const result = renderer.render([
        text('Use '),
        text('{'), // Escaped \{
        text('and'),
        text('}'), // Escaped \}
        text(' for conditionals'),
      ]);
      expect(result.text).toBe('Use {and} for conditionals');
    });

    it('handles backslash in text', () => {
      const result = renderer.render([
        text('Path: '),
        text('C:'),
        text('\\'), // Escaped \\
        text('Users'),
      ]);
      expect(result.text).toBe('Path: C:\\Users');
    });

    it('handles newline escape', () => {
      const result = renderer.render([
        text('Line1'),
        text('\n'), // Escaped \n
        text('Line2'),
      ]);
      expect(result.text).toBe('Line1\nLine2');
    });

    it('handles tab escape', () => {
      const result = renderer.render([
        text('Col1'),
        text('\t'), // Escaped \t
        text('Col2'),
      ]);
      expect(result.text).toBe('Col1\tCol2');
    });
  });

  // ==========================================================================
  // Expression Interpolation
  // ==========================================================================

  describe('Expression Interpolation', () => {
    it('interpolates arithmetic expressions', () => {
      context.setVariable('x', 10);
      context.setVariable('y', 5);
      const result = renderer.render([
        text('Sum: '),
        interpolation(binary('+', variable('x'), variable('y'))),
      ]);
      expect(result.text).toBe('Sum: 15');
    });

    it('interpolates string concatenation', () => {
      context.setVariable('first', 'Hello');
      context.setVariable('second', 'World');
      const result = renderer.render([
        interpolation(binary('..', variable('first'), literal(' '))),
        interpolation(variable('second')),
      ]);
      expect(result.text).toBe('Hello World');
    });

    it('interpolates comparison expression result', () => {
      context.setVariable('age', 25);
      const result = renderer.render([
        text('Adult: '),
        interpolation(binary('>=', variable('age'), literal(18))),
      ]);
      expect(result.text).toBe('Adult: true');
    });
  });

  // ==========================================================================
  // Once-Only Choice Tracking
  // ==========================================================================

  describe('Once-Only Choice Tracking', () => {
    it('once-only choices are available initially', () => {
      const result = renderer.render([
        choice([text('First choice')], 'target1', null, 'once'),
        choice([text('Second choice')], 'target2', null, 'once'),
      ]);
      expect(result.choices[0].available).toBe(true);
      expect(result.choices[1].available).toBe(true);
    });

    it('marking once-only choice as selected makes it unavailable', () => {
      const choiceNode = choice([text('Once only')], 'target', null, 'once');
      const result1 = renderer.render([choiceNode]);
      expect(result1.choices[0].available).toBe(true);

      // Mark as selected
      renderer.markChoiceSelected(result1.choices[0].node);

      // Re-render - should now be unavailable
      const result2 = renderer.render([choiceNode]);
      expect(result2.choices[0].available).toBe(false);
    });

    it('sticky choices remain available after selection', () => {
      const choiceNode = choice([text('Sticky')], 'target', null, 'sticky');
      const result1 = renderer.render([choiceNode]);
      expect(result1.choices[0].available).toBe(true);

      // Mark as selected (should have no effect on sticky choices)
      renderer.markChoiceSelected(result1.choices[0].node);

      // Re-render - should still be available
      const result2 = renderer.render([choiceNode]);
      expect(result2.choices[0].available).toBe(true);
    });

    it('choice state persists across renders', () => {
      // Create choices with different locations
      const span1: SourceSpan = { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 10, offset: 9 } };
      const span2: SourceSpan = { start: { line: 2, column: 1, offset: 10 }, end: { line: 2, column: 10, offset: 19 } };

      const choiceNode1: ChoiceNode = {
        type: 'choice', choiceType: 'once', condition: null,
        text: [text('Once A')], target: 'a', action: null, location: span1
      };
      const choiceNode2: ChoiceNode = {
        type: 'choice', choiceType: 'once', condition: null,
        text: [text('Once B')], target: 'b', action: null, location: span2
      };

      // First render - both available
      const result1 = renderer.render([choiceNode1, choiceNode2]);
      expect(result1.choices[0].available).toBe(true);
      expect(result1.choices[1].available).toBe(true);

      // Select first choice
      renderer.markChoiceSelected(result1.choices[0].node);

      // Second render - first unavailable, second still available
      const result2 = renderer.render([choiceNode1, choiceNode2]);
      expect(result2.choices[0].available).toBe(false);
      expect(result2.choices[1].available).toBe(true);
    });

    it('choice state can be retrieved for persistence', () => {
      const choiceNode = choice([text('Once')], 'target', null, 'once');
      renderer.render([choiceNode]);

      const state = renderer.getChoiceState();
      expect(state.selectedChoices).toBeDefined();
      expect(state.selectedChoices.size).toBe(0);

      renderer.markChoiceSelected(choiceNode);
      expect(state.selectedChoices.size).toBe(1);
    });

    it('once-only with failed condition is unavailable', () => {
      context.setVariable('canChoose', false);
      const result = renderer.render([
        choice([text('Conditional once')], 'target', variable('canChoose'), 'once'),
      ]);
      expect(result.choices[0].available).toBe(false);
    });

    it('selected once-only stays unavailable even if condition passes', () => {
      context.setVariable('canChoose', true);
      const choiceNode = choice([text('Conditional once')], 'target', variable('canChoose'), 'once');

      const result1 = renderer.render([choiceNode]);
      expect(result1.choices[0].available).toBe(true);

      renderer.markChoiceSelected(result1.choices[0].node);

      // Even though condition is true, once-only is unavailable after selection
      const result2 = renderer.render([choiceNode]);
      expect(result2.choices[0].available).toBe(false);
    });
  });

  // ==========================================================================
  // Choice Actions
  // ==========================================================================

  describe('Choice Actions', () => {
    it('choice includes action in node', () => {
      // Create a choice with an action
      const actionExpr: AssignmentExpressionNode = {
        type: 'assignment_expression',
        operator: '=',
        target: variable('gold'),
        value: literal(100),
        location: span,
      };

      const choiceNode: ChoiceNode = {
        type: 'choice',
        choiceType: 'once',
        condition: null,
        text: [text('Get gold')],
        action: [actionExpr],
        target: 'next',
        location: span,
      };

      const result = renderer.render([choiceNode]);
      expect(result.choices[0].node.action).toHaveLength(1);
      expect(result.choices[0].node.action![0].type).toBe('assignment_expression');
    });

    it('choice action is not executed during render', () => {
      const actionExpr: AssignmentExpressionNode = {
        type: 'assignment_expression',
        operator: '=',
        target: variable('gold'),
        value: literal(100),
        location: span,
      };

      const choiceNode: ChoiceNode = {
        type: 'choice',
        choiceType: 'once',
        condition: null,
        text: [text('Get gold')],
        action: [actionExpr],
        target: 'next',
        location: span,
      };

      // Gold should not be set during render
      renderer.render([choiceNode]);
      expect(context.getVariable('gold')).toBeUndefined();
    });
  });
});
