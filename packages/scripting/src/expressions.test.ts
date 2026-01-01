/**
 * WLS 1.0 Expression Evaluator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type {
  ExpressionNode,
  LiteralNode,
  VariableNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  CallExpressionNode,
  MemberExpressionNode,
  AssignmentExpressionNode,
  SourceSpan,
} from '@writewhisker/parser';
import { ExpressionEvaluator, EvaluationError, createEvaluator } from './expressions';
import { InMemoryRuntimeContext } from './whiskerApi';

// Helper to create a dummy source span
const span: SourceSpan = {
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 },
};

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

// Helper to create binary expressions
function binary(op: BinaryExpressionNode['operator'], left: ExpressionNode, right: ExpressionNode): BinaryExpressionNode {
  return { type: 'binary_expression', operator: op, left, right, location: span };
}

// Helper to create unary expressions
function unary(op: UnaryExpressionNode['operator'], argument: ExpressionNode): UnaryExpressionNode {
  return { type: 'unary_expression', operator: op, argument, location: span };
}

// Helper to create call expressions
function call(callee: ExpressionNode, args: ExpressionNode[]): CallExpressionNode {
  return { type: 'call_expression', callee, arguments: args, location: span };
}

// Helper to create member expressions
function member(object: ExpressionNode, property: string): MemberExpressionNode {
  return { type: 'member_expression', object, property, location: span };
}

// Helper to create identifier nodes
function identifier(name: string): ExpressionNode {
  return { type: 'identifier', name, location: span };
}

// Helper to create assignment expressions
function assign(
  target: VariableNode | MemberExpressionNode,
  value: ExpressionNode,
  op: AssignmentExpressionNode['operator'] = '='
): AssignmentExpressionNode {
  return { type: 'assignment_expression', operator: op, target, value, location: span };
}

describe('ExpressionEvaluator', () => {
  let context: InMemoryRuntimeContext;
  let evaluator: ExpressionEvaluator;

  beforeEach(() => {
    context = new InMemoryRuntimeContext();
    evaluator = createEvaluator(context);
  });

  // ==========================================================================
  // Literals
  // ==========================================================================

  describe('Literals', () => {
    it('evaluates number literal', () => {
      expect(evaluator.evaluate(literal(42))).toBe(42);
    });

    it('evaluates float literal', () => {
      expect(evaluator.evaluate(literal(3.14))).toBe(3.14);
    });

    it('evaluates negative number literal', () => {
      expect(evaluator.evaluate(literal(-10))).toBe(-10);
    });

    it('evaluates string literal', () => {
      expect(evaluator.evaluate(literal('hello'))).toBe('hello');
    });

    it('evaluates empty string literal', () => {
      expect(evaluator.evaluate(literal(''))).toBe('');
    });

    it('evaluates true boolean', () => {
      expect(evaluator.evaluate(literal(true))).toBe(true);
    });

    it('evaluates false boolean', () => {
      expect(evaluator.evaluate(literal(false))).toBe(false);
    });

    it('evaluates nil', () => {
      expect(evaluator.evaluate(literal(null))).toBe(null);
    });
  });

  // ==========================================================================
  // Variables
  // ==========================================================================

  describe('Variables', () => {
    it('returns null for undefined variable', () => {
      expect(evaluator.evaluate(variable('undefined'))).toBe(null);
    });

    it('returns variable value', () => {
      context.setVariable('gold', 100);
      expect(evaluator.evaluate(variable('gold'))).toBe(100);
    });

    it('returns string variable', () => {
      context.setVariable('name', 'Hero');
      expect(evaluator.evaluate(variable('name'))).toBe('Hero');
    });
  });

  // ==========================================================================
  // Arithmetic Operators
  // ==========================================================================

  describe('Arithmetic Operators', () => {
    it('evaluates addition', () => {
      expect(evaluator.evaluate(binary('+', literal(2), literal(3)))).toBe(5);
    });

    it('evaluates subtraction', () => {
      expect(evaluator.evaluate(binary('-', literal(10), literal(3)))).toBe(7);
    });

    it('evaluates multiplication', () => {
      expect(evaluator.evaluate(binary('*', literal(4), literal(5)))).toBe(20);
    });

    it('evaluates division', () => {
      expect(evaluator.evaluate(binary('/', literal(20), literal(4)))).toBe(5);
    });

    it('evaluates modulo', () => {
      expect(evaluator.evaluate(binary('%', literal(17), literal(5)))).toBe(2);
    });

    it('evaluates power', () => {
      expect(evaluator.evaluate(binary('^', literal(2), literal(3)))).toBe(8);
    });

    it('throws on division by zero', () => {
      expect(() => evaluator.evaluate(binary('/', literal(10), literal(0)))).toThrow('Division by zero');
    });

    it('throws on modulo by zero', () => {
      expect(() => evaluator.evaluate(binary('%', literal(10), literal(0)))).toThrow('Modulo by zero');
    });

    it('evaluates complex arithmetic', () => {
      // (2 + 3) * 4 = 20
      const expr = binary('*', binary('+', literal(2), literal(3)), literal(4));
      expect(evaluator.evaluate(expr)).toBe(20);
    });
  });

  // ==========================================================================
  // Comparison Operators
  // ==========================================================================

  describe('Comparison Operators', () => {
    it('evaluates equality (true)', () => {
      expect(evaluator.evaluate(binary('==', literal(5), literal(5)))).toBe(true);
    });

    it('evaluates equality (false)', () => {
      expect(evaluator.evaluate(binary('==', literal(5), literal(3)))).toBe(false);
    });

    it('evaluates inequality (true)', () => {
      expect(evaluator.evaluate(binary('~=', literal(5), literal(3)))).toBe(true);
    });

    it('evaluates inequality (false)', () => {
      expect(evaluator.evaluate(binary('~=', literal(5), literal(5)))).toBe(false);
    });

    it('evaluates less than', () => {
      expect(evaluator.evaluate(binary('<', literal(3), literal(5)))).toBe(true);
      expect(evaluator.evaluate(binary('<', literal(5), literal(3)))).toBe(false);
    });

    it('evaluates greater than', () => {
      expect(evaluator.evaluate(binary('>', literal(5), literal(3)))).toBe(true);
      expect(evaluator.evaluate(binary('>', literal(3), literal(5)))).toBe(false);
    });

    it('evaluates less than or equal', () => {
      expect(evaluator.evaluate(binary('<=', literal(3), literal(5)))).toBe(true);
      expect(evaluator.evaluate(binary('<=', literal(5), literal(5)))).toBe(true);
      expect(evaluator.evaluate(binary('<=', literal(6), literal(5)))).toBe(false);
    });

    it('evaluates greater than or equal', () => {
      expect(evaluator.evaluate(binary('>=', literal(5), literal(3)))).toBe(true);
      expect(evaluator.evaluate(binary('>=', literal(5), literal(5)))).toBe(true);
      expect(evaluator.evaluate(binary('>=', literal(4), literal(5)))).toBe(false);
    });

    it('compares strings', () => {
      expect(evaluator.evaluate(binary('<', literal('a'), literal('b')))).toBe(true);
      expect(evaluator.evaluate(binary('>', literal('b'), literal('a')))).toBe(true);
    });
  });

  // ==========================================================================
  // Logical Operators
  // ==========================================================================

  describe('Logical Operators', () => {
    it('evaluates and (both true)', () => {
      expect(evaluator.evaluate(binary('and', literal(true), literal(true)))).toBe(true);
    });

    it('evaluates and (one false)', () => {
      expect(evaluator.evaluate(binary('and', literal(true), literal(false)))).toBe(false);
    });

    it('evaluates and with short-circuit', () => {
      // false and x should return false without evaluating x
      context.setVariable('x', 10);
      const expr = binary('and', literal(false), variable('undefined'));
      expect(evaluator.evaluate(expr)).toBe(false);
    });

    it('evaluates or (one true)', () => {
      expect(evaluator.evaluate(binary('or', literal(false), literal(true)))).toBe(true);
    });

    it('evaluates or (both false)', () => {
      expect(evaluator.evaluate(binary('or', literal(false), literal(false)))).toBe(false);
    });

    it('evaluates or with short-circuit', () => {
      // true or x should return true without evaluating x
      const expr = binary('or', literal(true), variable('undefined'));
      expect(evaluator.evaluate(expr)).toBe(true);
    });

    it('evaluates not (true)', () => {
      expect(evaluator.evaluate(unary('not', literal(true)))).toBe(false);
    });

    it('evaluates not (false)', () => {
      expect(evaluator.evaluate(unary('not', literal(false)))).toBe(true);
    });

    it('evaluates not (nil is falsy)', () => {
      expect(evaluator.evaluate(unary('not', literal(null)))).toBe(true);
    });

    it('evaluates not (0 is truthy in Lua)', () => {
      expect(evaluator.evaluate(unary('not', literal(0)))).toBe(false);
    });
  });

  // ==========================================================================
  // Unary Operators
  // ==========================================================================

  describe('Unary Operators', () => {
    it('evaluates negation', () => {
      expect(evaluator.evaluate(unary('-', literal(5)))).toBe(-5);
    });

    it('evaluates double negation', () => {
      expect(evaluator.evaluate(unary('-', unary('-', literal(5))))).toBe(5);
    });

    it('evaluates length of string', () => {
      expect(evaluator.evaluate(unary('#', literal('hello')))).toBe(5);
    });

    it('evaluates length of empty string', () => {
      expect(evaluator.evaluate(unary('#', literal('')))).toBe(0);
    });
  });

  // ==========================================================================
  // String Concatenation
  // ==========================================================================

  describe('String Concatenation', () => {
    it('concatenates strings', () => {
      expect(evaluator.evaluate(binary('..', literal('hello'), literal(' world')))).toBe('hello world');
    });

    it('concatenates string with number', () => {
      expect(evaluator.evaluate(binary('..', literal('value: '), literal(42)))).toBe('value: 42');
    });

    it('concatenates multiple strings', () => {
      const expr = binary('..', binary('..', literal('a'), literal('b')), literal('c'));
      expect(evaluator.evaluate(expr)).toBe('abc');
    });
  });

  // ==========================================================================
  // Function Calls - whisker.state
  // ==========================================================================

  describe('Function Calls - whisker.state', () => {
    it('calls whisker.state.get', () => {
      context.setVariable('gold', 100);
      const expr = call(member(member(identifier('whisker'), 'state'), 'get'), [literal('gold')]);
      expect(evaluator.evaluate(expr)).toBe(100);
    });

    it('calls whisker.state.set', () => {
      const expr = call(member(member(identifier('whisker'), 'state'), 'set'), [literal('gold'), literal(200)]);
      evaluator.evaluate(expr);
      expect(context.getVariable('gold')).toBe(200);
    });

    it('calls whisker.state.has', () => {
      context.setVariable('gold', 100);
      const expr = call(member(member(identifier('whisker'), 'state'), 'has'), [literal('gold')]);
      expect(evaluator.evaluate(expr)).toBe(true);
    });

    it('calls whisker.state.delete', () => {
      context.setVariable('gold', 100);
      const expr = call(member(member(identifier('whisker'), 'state'), 'delete'), [literal('gold')]);
      evaluator.evaluate(expr);
      expect(context.hasVariable('gold')).toBe(false);
    });
  });

  // ==========================================================================
  // Function Calls - math
  // ==========================================================================

  describe('Function Calls - math', () => {
    it('calls math.abs', () => {
      const expr = call(member(identifier('math'), 'abs'), [literal(-5)]);
      expect(evaluator.evaluate(expr)).toBe(5);
    });

    it('calls math.floor', () => {
      const expr = call(member(identifier('math'), 'floor'), [literal(3.7)]);
      expect(evaluator.evaluate(expr)).toBe(3);
    });

    it('calls math.ceil', () => {
      const expr = call(member(identifier('math'), 'ceil'), [literal(3.2)]);
      expect(evaluator.evaluate(expr)).toBe(4);
    });

    it('calls math.max', () => {
      const expr = call(member(identifier('math'), 'max'), [literal(3), literal(7)]);
      expect(evaluator.evaluate(expr)).toBe(7);
    });

    it('calls math.min', () => {
      const expr = call(member(identifier('math'), 'min'), [literal(3), literal(7)]);
      expect(evaluator.evaluate(expr)).toBe(3);
    });

    it('calls math.sqrt', () => {
      const expr = call(member(identifier('math'), 'sqrt'), [literal(16)]);
      expect(evaluator.evaluate(expr)).toBe(4);
    });

    it('calls math.pow', () => {
      const expr = call(member(identifier('math'), 'pow'), [literal(2), literal(3)]);
      expect(evaluator.evaluate(expr)).toBe(8);
    });
  });

  // ==========================================================================
  // Function Calls - string
  // ==========================================================================

  describe('Function Calls - string', () => {
    it('calls string.len', () => {
      const expr = call(member(identifier('string'), 'len'), [literal('hello')]);
      expect(evaluator.evaluate(expr)).toBe(5);
    });

    it('calls string.upper', () => {
      const expr = call(member(identifier('string'), 'upper'), [literal('hello')]);
      expect(evaluator.evaluate(expr)).toBe('HELLO');
    });

    it('calls string.lower', () => {
      const expr = call(member(identifier('string'), 'lower'), [literal('HELLO')]);
      expect(evaluator.evaluate(expr)).toBe('hello');
    });

    it('calls string.reverse', () => {
      const expr = call(member(identifier('string'), 'reverse'), [literal('hello')]);
      expect(evaluator.evaluate(expr)).toBe('olleh');
    });

    it('calls string.rep', () => {
      const expr = call(member(identifier('string'), 'rep'), [literal('ab'), literal(3)]);
      expect(evaluator.evaluate(expr)).toBe('ababab');
    });
  });

  // ==========================================================================
  // Function Calls - whisker top-level
  // ==========================================================================

  describe('Function Calls - whisker top-level', () => {
    it('calls whisker.random', () => {
      const expr = call(member(identifier('whisker'), 'random'), [literal(1), literal(6)]);
      for (let i = 0; i < 100; i++) {
        const result = evaluator.evaluate(expr);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
      }
    });

    it('calls whisker.pick', () => {
      const options = ['a', 'b', 'c'];
      const expr = call(member(identifier('whisker'), 'pick'), options.map(o => literal(o)));
      for (let i = 0; i < 100; i++) {
        const result = evaluator.evaluate(expr);
        expect(options).toContain(result);
      }
    });

    it('calls whisker.print', () => {
      const expr = call(member(identifier('whisker'), 'print'), [literal('hello'), literal(42)]);
      evaluator.evaluate(expr);
      expect(context.getOutput()).toEqual(['hello\t42']);
    });
  });

  // ==========================================================================
  // Assignments
  // ==========================================================================

  describe('Assignments', () => {
    it('assigns value', () => {
      const expr = assign(variable('gold'), literal(100));
      expect(evaluator.evaluate(expr)).toBe(100);
      expect(context.getVariable('gold')).toBe(100);
    });

    it('adds and assigns', () => {
      context.setVariable('gold', 100);
      const expr = assign(variable('gold'), literal(50), '+=');
      expect(evaluator.evaluate(expr)).toBe(150);
      expect(context.getVariable('gold')).toBe(150);
    });

    it('subtracts and assigns', () => {
      context.setVariable('gold', 100);
      const expr = assign(variable('gold'), literal(30), '-=');
      expect(evaluator.evaluate(expr)).toBe(70);
      expect(context.getVariable('gold')).toBe(70);
    });

    it('multiplies and assigns', () => {
      context.setVariable('gold', 10);
      const expr = assign(variable('gold'), literal(5), '*=');
      expect(evaluator.evaluate(expr)).toBe(50);
      expect(context.getVariable('gold')).toBe(50);
    });

    it('divides and assigns', () => {
      context.setVariable('gold', 100);
      const expr = assign(variable('gold'), literal(4), '/=');
      expect(evaluator.evaluate(expr)).toBe(25);
      expect(context.getVariable('gold')).toBe(25);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('throws EvaluationError for unknown function', () => {
      const expr = call(identifier('unknownFunc'), []);
      expect(() => evaluator.evaluate(expr)).toThrow(EvaluationError);
    });

    it('throws for division by zero', () => {
      const expr = binary('/', literal(10), literal(0));
      expect(() => evaluator.evaluate(expr)).toThrow('Division by zero');
    });

    it('throws for comparing incompatible types', () => {
      const expr = binary('<', literal('hello'), literal(5));
      expect(() => evaluator.evaluate(expr)).toThrow();
    });
  });

  // ==========================================================================
  // Type Coercion
  // ==========================================================================

  describe('Type Coercion', () => {
    it('coerces string to number for arithmetic', () => {
      context.setVariable('x', '10');
      const expr = binary('+', variable('x'), literal(5));
      expect(evaluator.evaluate(expr)).toBe(15);
    });

    it('coerces nil to 0 for arithmetic', () => {
      const expr = binary('+', literal(null), literal(5));
      expect(evaluator.evaluate(expr)).toBe(5);
    });

    it('coerces boolean to number', () => {
      const expr = binary('+', literal(true), literal(1));
      expect(evaluator.evaluate(expr)).toBe(2);
    });
  });
});
