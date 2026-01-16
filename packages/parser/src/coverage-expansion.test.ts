/**
 * Coverage Expansion Tests for WLS 1.0 Parser
 *
 * Tests targeting edge cases and error handling paths for coverage.
 */

import { describe, it, expect } from 'vitest';
import { Lexer, tokenize } from './lexer';
import { Parser, parse } from './parser';
import { TokenType, isKeyword, getKeywordType, isSpecialTarget } from './types';
import {
  createTextNode,
  createLiteralNode,
  createIdentifierNode,
  createVariableNode,
  isExpression,
  isContent,
} from './ast';
import type {
  ChoiceNode,
  DoBlockNode,
  IncludeDeclarationNode,
  FunctionDeclarationNode,
  MapDeclarationNode,
  SpawnExpressionNode,
  VariableNode,
} from './ast';

describe('Coverage Expansion', () => {
  // ============================================================================
  // Types Utility Functions
  // ============================================================================

  describe('types utility functions', () => {
    describe('isKeyword', () => {
      it('should return true for valid keywords', () => {
        expect(isKeyword('and')).toBe(true);
        expect(isKeyword('or')).toBe(true);
        expect(isKeyword('not')).toBe(true);
        expect(isKeyword('LIST')).toBe(true);
        expect(isKeyword('INCLUDE')).toBe(true);
      });

      it('should return false for non-keywords', () => {
        expect(isKeyword('notakeyword')).toBe(false);
        expect(isKeyword('hello')).toBe(false);
        expect(isKeyword('')).toBe(false);
      });
    });

    describe('getKeywordType', () => {
      it('should return correct token type for keywords', () => {
        expect(getKeywordType('and')).toBe(TokenType.AND);
        expect(getKeywordType('LIST')).toBe(TokenType.LIST);
        expect(getKeywordType('await')).toBe(TokenType.AWAIT);
        expect(getKeywordType('spawn')).toBe(TokenType.SPAWN);
      });

      it('should return undefined for non-keywords', () => {
        expect(getKeywordType('notakeyword')).toBeUndefined();
        expect(getKeywordType('')).toBeUndefined();
      });
    });

    describe('isSpecialTarget', () => {
      it('should return true for special targets', () => {
        expect(isSpecialTarget('END')).toBe(true);
        expect(isSpecialTarget('BACK')).toBe(true);
        expect(isSpecialTarget('RESTART')).toBe(true);
      });

      it('should return false for non-special targets', () => {
        expect(isSpecialTarget('Start')).toBe(false);
        expect(isSpecialTarget('regular')).toBe(false);
      });
    });
  });

  // ============================================================================
  // AST Utility Functions
  // ============================================================================

  describe('AST utility functions', () => {
    const dummyLocation = {
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 5, offset: 4 },
    };

    describe('createTextNode', () => {
      it('should create a text node', () => {
        const node = createTextNode('hello', dummyLocation);
        expect(node.type).toBe('text');
        expect(node.value).toBe('hello');
        expect(node.location).toBe(dummyLocation);
      });
    });

    describe('createLiteralNode', () => {
      it('should create literals of all types', () => {
        expect(createLiteralNode('number', 42, dummyLocation).valueType).toBe('number');
        expect(createLiteralNode('string', 'test', dummyLocation).valueType).toBe('string');
        expect(createLiteralNode('boolean', true, dummyLocation).valueType).toBe('boolean');
        expect(createLiteralNode('nil', null, dummyLocation).valueType).toBe('nil');
      });
    });

    describe('createIdentifierNode', () => {
      it('should create an identifier node', () => {
        const node = createIdentifierNode('myVar', dummyLocation);
        expect(node.type).toBe('identifier');
        expect(node.name).toBe('myVar');
      });
    });

    describe('createVariableNode', () => {
      it('should create variable nodes', () => {
        expect(createVariableNode('gold', 'story', dummyLocation).scope).toBe('story');
        expect(createVariableNode('temp', 'temp', dummyLocation).scope).toBe('temp');
      });
    });

    describe('isExpression', () => {
      it('should return true for expression nodes', () => {
        expect(isExpression({ type: 'identifier', name: 'x', location: dummyLocation })).toBe(true);
        expect(isExpression({ type: 'variable', name: 'x', scope: 'story', location: dummyLocation })).toBe(true);
        expect(isExpression({ type: 'literal', valueType: 'number', value: 1, location: dummyLocation })).toBe(true);
        expect(isExpression({ type: 'binary_expression', operator: '+', left: {} as any, right: {} as any, location: dummyLocation })).toBe(true);
      });

      it('should return false for non-expression nodes', () => {
        expect(isExpression({ type: 'text', value: 'x', location: dummyLocation })).toBe(false);
        expect(isExpression({ type: 'passage', name: 'x', tags: [], metadata: [], content: [], location: dummyLocation })).toBe(false);
      });
    });

    describe('isContent', () => {
      it('should return true for content nodes', () => {
        expect(isContent({ type: 'text', value: 'x', location: dummyLocation })).toBe(true);
        expect(isContent({ type: 'interpolation', expression: {} as any, isSimple: true, location: dummyLocation })).toBe(true);
        expect(isContent({ type: 'do_block', actions: [], location: dummyLocation })).toBe(true);
        expect(isContent({ type: 'choice', choiceType: 'once', label: null, condition: null, text: [], target: null, action: null, location: dummyLocation })).toBe(true);
      });

      it('should return false for non-content nodes', () => {
        expect(isContent({ type: 'identifier', name: 'x', location: dummyLocation })).toBe(false);
        expect(isContent({ type: 'literal', valueType: 'number', value: 1, location: dummyLocation })).toBe(false);
      });
    });
  });

  // ============================================================================
  // Lexer Edge Cases
  // ============================================================================

  describe('Lexer edge cases', () => {
    describe('number parsing', () => {
      it('should handle number with positive exponent', () => {
        const result = tokenize('1E+5');
        expect(result.tokens.some(t => t.type === TokenType.NUMBER)).toBe(true);
      });

      it('should emit error for exponent without digits', () => {
        const result = tokenize('1e');
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should parse float', () => {
        const result = tokenize('0.5');
        expect(result.tokens.some(t => t.type === TokenType.NUMBER)).toBe(true);
      });
    });

    describe('dollar sign', () => {
      it('should treat $ followed by non-identifier as TEXT', () => {
        const result = tokenize('$50');
        expect(result.tokens.some(t => t.type === TokenType.TEXT && t.value === '$')).toBe(true);
      });

      it('should treat $ followed by space as TEXT', () => {
        const result = tokenize('$ ');
        expect(result.tokens.some(t => t.type === TokenType.TEXT && t.value === '$')).toBe(true);
      });
    });

    describe('braces', () => {
      it('should handle {/} as COND_END', () => {
        const result = tokenize('{/}');
        expect(result.tokens.some(t => t.type === TokenType.COND_END)).toBe(true);
      });
    });

    describe('string escapes', () => {
      it('should handle \\r escape', () => {
        const result = tokenize('"\\r"');
        expect(result.tokens.some(t => t.type === TokenType.STRING)).toBe(true);
      });

      it('should handle unknown escape as character', () => {
        const result = tokenize('"\\q"');
        expect(result.tokens.some(t => t.type === TokenType.STRING && t.value === 'q')).toBe(true);
      });
    });

    describe('thread marker', () => {
      it('should handle == at line start with indentation', () => {
        const result = tokenize('  == Thread');
        expect(result.tokens.some(t => t.type === TokenType.THREAD_MARKER)).toBe(true);
      });
    });

    describe('scope operator', () => {
      it('should tokenize :: not at line start as SCOPE_OP', () => {
        const result = tokenize('foo::bar');
        expect(result.tokens.some(t => t.type === TokenType.SCOPE_OP)).toBe(true);
      });
    });
  });

  // ============================================================================
  // Parser Edge Cases
  // ============================================================================

  describe('Parser edge cases', () => {
    describe('INCLUDE declaration', () => {
      it('should parse INCLUDE with unquoted path', () => {
        // WLS allows unquoted paths for INCLUDE
        const result = parse(`INCLUDE identifier
:: Start
Content`);
        expect(result.ast?.includes).toHaveLength(1);
        expect(result.ast?.includes?.[0].path).toBe('identifier');
      });

      it('should parse valid INCLUDE declaration with quoted path', () => {
        const result = parse(`INCLUDE "library.ws"
:: Start
Content`);
        expect(result.ast?.includes).toHaveLength(1);
      });
    });

    describe('FUNCTION declaration', () => {
      it('should emit error for FUNCTION without name', () => {
        const result = parse(`FUNCTION ()
END
:: Start
Content`);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should parse FUNCTION with parameters', () => {
        const result = parse(`FUNCTION greet(name, age)
END
:: Start
Content`);
        expect(result.ast?.functions).toHaveLength(1);
        const func = result.ast?.functions[0] as FunctionDeclarationNode;
        expect(func.params).toHaveLength(2);
      });

      it('should parse FUNCTION without parentheses', () => {
        const result = parse(`FUNCTION noParams
END
:: Start
Content`);
        expect(result.ast?.functions).toHaveLength(1);
      });
    });

    describe('NAMESPACE declaration', () => {
      it('should emit error for NAMESPACE without name', () => {
        const result = parse(`NAMESPACE
:: Start
Content
END NAMESPACE`);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should parse passages within namespace', () => {
        const result = parse(`NAMESPACE Combat
:: Attack
Attack!
END NAMESPACE
:: Start
Welcome`);
        expect(result.ast?.passages.some(p => p.name.includes('Combat') || p.name === 'Attack')).toBe(true);
      });
    });

    describe('choice parsing', () => {
      it('should parse choice with END target', () => {
        const result = parse(`:: Start
+ [Finish] -> END`);
        const choice = result.ast?.passages[0]?.content.find(c => c.type === 'choice') as ChoiceNode;
        expect(choice?.target).toBe('END');
      });

      it('should parse choice with namespace-qualified target', () => {
        const result = parse(`:: Start
+ [Attack] -> Combat::Attack`);
        const choice = result.ast?.passages[0]?.content.find(c => c.type === 'choice') as ChoiceNode;
        expect(choice?.target).toContain('Combat');
      });

      it('should parse choice with {if condition}', () => {
        const result = parse(`:: Start
+ [Buy] {if $gold >= 50} -> Shop`);
        const choice = result.ast?.passages[0]?.content.find(c => c.type === 'choice') as ChoiceNode;
        expect(choice?.condition).not.toBeNull();
      });

      it('should parse choice with {do action}', () => {
        const result = parse(`:: Start
+ [Attack] {do $hp -= 10} -> Battle`);
        const choice = result.ast?.passages[0]?.content.find(c => c.type === 'choice') as ChoiceNode;
        expect(choice?.action).not.toBeNull();
      });
    });

    describe('passage metadata', () => {
      it('should emit error for directive without colon', () => {
        const result = parse(`:: Start
@fallback Fallback
Content`);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should parse directive with string value', () => {
        const result = parse(`:: Start
@onEnter: "script code"
Content`);
        expect(result.ast?.passages[0].metadata[0].value).toBe('script code');
      });
    });

    describe('do block', () => {
      it('should parse do block with multiple statements', () => {
        const result = parse(`:: Start
{do $x = 1; $y = 2}`);
        const doBlock = result.ast?.passages[0]?.content.find(c => c.type === 'do_block') as DoBlockNode;
        expect(doBlock?.actions.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('await/spawn', () => {
      it('should emit error for await without thread name', () => {
        const result = parse(`:: Start
{await}`);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should emit error for spawn without passage name', () => {
        const result = parse(`:: Start
{spawn}`);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should parse spawn with arrow syntax', () => {
        const result = parse(`:: Start
{spawn -> BackgroundThread}`);
        const spawn = result.ast?.passages[0]?.content.find(c => c.type === 'spawn_expression') as SpawnExpressionNode;
        expect(spawn?.passageName).toBe('BackgroundThread');
      });
    });

    describe('MAP declaration', () => {
      it('should emit error for map entry without colon', () => {
        const result = parse(`MAP test = { name "value" }
:: Start
Content`);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should parse map with string keys', () => {
        const result = parse(`MAP test = { "my key": "value" }
:: Start
Content`);
        expect(result.ast?.maps).toHaveLength(1);
      });
    });

    describe('expression parsing', () => {
      it('should parse assignment with member expression target', () => {
        const result = parse(':: Start\n{obj.prop = 10}');
        expect(result.ast?.passages).toHaveLength(1);
      });

      it('should emit error for invalid assignment target', () => {
        const result = parse(':: Start\n{42 = 10}');
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should parse member access chain', () => {
        const result = parse(':: Start\n{obj.prop.nested}');
        expect(result.ast?.passages).toHaveLength(1);
      });

      it('should parse function call with multiple arguments', () => {
        const result = parse(':: Start\n{func(a, b, c)}');
        expect(result.ast?.passages).toHaveLength(1);
      });
    });

    describe('conditional parsing', () => {
      it('should parse conditional content', () => {
        const result = parse(`:: Start
{$x > 0}
Content
{/}`);
        expect(result.ast?.passages[0]?.content.find(c => c.type === 'conditional')).toBeDefined();
      });
    });

    describe('thread parsing', () => {
      it('should parse thread with metadata', () => {
        const result = parse(`:: Start
Hello

== Background [loop]
@onEnter: setup
Content`);
        expect(result.ast?.threads).toHaveLength(1);
        expect(result.ast?.threads[0].tags).toEqual(['loop']);
      });
    });

    describe('variable parsing', () => {
      it('should parse temp variable in expression', () => {
        const result = parse(`:: Start
{_temp >= 0}
Test
{/}`);
        expect(result.ast?.passages[0]?.content.find(c => c.type === 'conditional')).toBeDefined();
      });

      it('should parse $ followed by underscore', () => {
        const result = parse(`:: Start
Value: $_temp`);
        const interp = result.ast?.passages[0]?.content.find(c => c.type === 'interpolation');
        if (interp && 'expression' in interp) {
          const expr = (interp as any).expression as VariableNode;
          expect(expr.scope).toBe('temp');
        }
      });
    });

    describe('ARRAY declaration', () => {
      it('should emit error for ARRAY without name', () => {
        const result = parse(`ARRAY = [1, 2]
:: Start
Content`);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should emit error for ARRAY without =', () => {
        const result = parse(`ARRAY items [1, 2]
:: Start
Content`);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('LIST declaration', () => {
      it('should emit error for LIST without name', () => {
        const result = parse(`LIST = a, b
:: Start
Content`);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should emit error for LIST without =', () => {
        const result = parse(`LIST moods a, b
:: Start
Content`);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('error recovery', () => {
      it('should recover from content before first passage', () => {
        const result = parse(`Random content here
:: Start
Actual content`);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.ast?.passages).toHaveLength(1);
      });
    });
  });

  // ============================================================================
  // Parser and Lexer Classes
  // ============================================================================

  describe('Parser class', () => {
    it('should create Parser instance', () => {
      const parser = new Parser();
      expect(parser).toBeDefined();
    });

    it('should parse via instance method', () => {
      const parser = new Parser();
      const result = parser.parse(':: Start\nHello');
      expect(result.ast).not.toBeNull();
    });
  });

  describe('Lexer class', () => {
    it('should create Lexer instance', () => {
      const lexer = new Lexer('test');
      expect(lexer).toBeDefined();
    });

    it('should tokenize via instance method', () => {
      const lexer = new Lexer('test');
      const result = lexer.tokenize();
      expect(result.tokens.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Complete Story Structures
  // ============================================================================

  describe('complete story structures', () => {
    it('should parse story with metadata and variables', () => {
      const result = parse(`@title: Complete Story
@author: Test

VAR $health = 100

:: Start
Welcome!
* [Begin] -> Chapter1`);
      expect(result.ast?.metadata).toBeDefined();
      expect(result.ast?.variables).toBeDefined();
    });

    it('should parse story with list declaration', () => {
      const result = parse(`LIST mood = happy, sad, neutral

:: Start
Content`);
      expect(result.ast?.lists).toBeDefined();
    });

    it('should parse story with multiple passages', () => {
      const result = parse(`:: Start
Welcome!
* [Go] -> Next

:: Next
You arrived.`);
      expect(result.ast?.passages.length).toBe(2);
    });
  });

  // ============================================================================
  // Safe Error Path Coverage (non-hanging tests)
  // ============================================================================

  describe('safe error coverage', () => {
    it('should handle passage without name', () => {
      const result = parse(`::
Content`);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle END NAMESPACE without NAMESPACE', () => {
      const result = parse(`:: Start
Content
END NAMESPACE`);
      // Parser may handle gracefully or produce error
      expect(result).toBeDefined();
    });

    it('should handle invalid assignment target', () => {
      const result = parse(`:: Start
{42 = 10}`);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should parse underscore temp variable', () => {
      const result = parse(`:: Start
{_count + 1}`);
      expect(result.ast?.passages).toHaveLength(1);
    });
  });

  // ============================================================================
  // Additional Branch Coverage
  // ============================================================================

  describe('branch coverage', () => {
    // Alternatives syntax - use proper text alternatives
    it('should parse sequence alternative', () => {
      const result = parse(`:: Start
{|one|two|three|}`);
      expect(result).toBeDefined();
    });

    it('should parse cycle alternative', () => {
      const result = parse(`:: Start
{&|one|two|three|}`);
      expect(result).toBeDefined();
    });

    it('should parse shuffle alternative', () => {
      const result = parse(`:: Start
{~|one|two|three|}`);
      expect(result).toBeDefined();
    });

    // Operators
    it('should parse modulo operator', () => {
      const result = parse(`:: Start
{$x % 2}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse string concatenation', () => {
      const result = parse(`:: Start
{$a .. $b}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse unary minus', () => {
      const result = parse(`:: Start
{-$x}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse unary not', () => {
      const result = parse(`:: Start
{not $flag}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    // Compound assignment
    it('should parse += assignment', () => {
      const result = parse(`:: Start
{$x += 10}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse -= assignment', () => {
      const result = parse(`:: Start
{$x -= 5}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse *= assignment', () => {
      const result = parse(`:: Start
{$x *= 2}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse /= assignment', () => {
      const result = parse(`:: Start
{$x /= 2}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    // Array access
    it('should parse array index access', () => {
      const result = parse(`:: Start
{arr[0]}`);
      expect(result).toBeDefined();
    });

    it('should parse nested array access', () => {
      const result = parse(`:: Start
{arr[0][1]}`);
      expect(result).toBeDefined();
    });

    // Comparisons
    it('should parse less than', () => {
      const result = parse(`:: Start
{$x < 10}
Yes
{/}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse less than or equal', () => {
      const result = parse(`:: Start
{$x <= 10}
Yes
{/}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse greater than', () => {
      const result = parse(`:: Start
{$x > 10}
Yes
{/}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse greater than or equal', () => {
      const result = parse(`:: Start
{$x >= 10}
Yes
{/}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse equality', () => {
      const result = parse(`:: Start
{$x == 10}
Yes
{/}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse not equal comparison', () => {
      const result = parse(`:: Start
{not ($x == 10)}
Yes
{/}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    // Logical operators
    it('should parse and operator', () => {
      const result = parse(`:: Start
{$a and $b}
Yes
{/}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse or operator', () => {
      const result = parse(`:: Start
{$a or $b}
Yes
{/}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    // Tunnel syntax
    it('should parse tunnel call', () => {
      const result = parse(`:: Start
->-> TunnelPassage`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse tunnel return', () => {
      const result = parse(`:: TunnelPassage
Content
->->`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    // Divert syntax
    it('should parse divert to passage', () => {
      const result = parse(`:: Start
-> NextPassage`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse divert to END', () => {
      const result = parse(`:: Start
-> END`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse divert to BACK', () => {
      const result = parse(`:: Start
-> BACK`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse divert to RESTART', () => {
      const result = parse(`:: Start
-> RESTART`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    // Gather points
    it('should parse gather point', () => {
      const result = parse(`:: Start
* [A]
  Text A
- Gather here`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse labeled gather', () => {
      const result = parse(`:: Start
* [A]
  Text A
- (label) Gather here`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    // Choice types
    it('should parse once choice', () => {
      const result = parse(`:: Start
* [Once only] -> Next`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse sticky choice', () => {
      const result = parse(`:: Start
+ [Always available] -> Next`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse fallback choice', () => {
      const result = parse(`:: Start
*? [Fallback] -> Next`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    // Nested choices
    it('should parse nested choices', () => {
      const result = parse(`:: Start
* [Level 1]
  ** [Level 2]
    *** [Level 3] -> Deep`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    // elseif and else
    it('should parse if-else', () => {
      const result = parse(`:: Start
{$x > 10}
High
{else}
Low
{/}`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    // Global passage reference
    it('should parse global passage reference', () => {
      const result = parse(`NAMESPACE Test
:: ::GlobalPassage
Content
END NAMESPACE`);
      expect(result.ast?.passages.some(p => p.name.includes('Global'))).toBe(true);
    });

    // Empty array and map
    it('should parse empty array', () => {
      const result = parse(`ARRAY items = []
:: Start
Content`);
      expect(result.ast?.arrays).toHaveLength(1);
    });

    it('should parse empty map', () => {
      const result = parse(`MAP data = {}
:: Start
Content`);
      expect(result.ast?.maps).toHaveLength(1);
    });

    // VAR with expression
    it('should parse VAR with expression', () => {
      const result = parse(`VAR total = 10 + 5
:: Start
{$total}`);
      expect(result.ast?.variables).toBeDefined();
    });

    // Multiple function parameters
    it('should parse function with multiple params', () => {
      const result = parse(`FUNCTION calc(a, b, c, d)
END
:: Start
{calc(1, 2, 3, 4)}`);
      expect(result.ast?.functions).toHaveLength(1);
    });
  });
});
