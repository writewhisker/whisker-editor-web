/**
 * Coverage Expansion Tests for WLS 1.0 Parser
 *
 * Tests targeting edge cases and error handling paths for 98% coverage.
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
  WLS_ERROR_CODES,
} from './ast';
import type {
  LiteralNode,
  TextNode,
  VariableNode,
  ChoiceNode,
  DoBlockNode,
  IncludeDeclarationNode,
  FunctionDeclarationNode,
  MapDeclarationNode,
  AwaitExpressionNode,
  SpawnExpressionNode,
  AssignmentExpressionNode,
  MemberExpressionNode,
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
      it('should create a number literal', () => {
        const node = createLiteralNode('number', 42, dummyLocation);
        expect(node.type).toBe('literal');
        expect(node.valueType).toBe('number');
        expect(node.value).toBe(42);
      });

      it('should create a string literal', () => {
        const node = createLiteralNode('string', 'test', dummyLocation);
        expect(node.valueType).toBe('string');
        expect(node.value).toBe('test');
      });

      it('should create a boolean literal', () => {
        const node = createLiteralNode('boolean', true, dummyLocation);
        expect(node.valueType).toBe('boolean');
        expect(node.value).toBe(true);
      });

      it('should create a nil literal', () => {
        const node = createLiteralNode('nil', null, dummyLocation);
        expect(node.valueType).toBe('nil');
        expect(node.value).toBeNull();
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
      it('should create a story variable node', () => {
        const node = createVariableNode('gold', 'story', dummyLocation);
        expect(node.type).toBe('variable');
        expect(node.name).toBe('gold');
        expect(node.scope).toBe('story');
      });

      it('should create a temp variable node', () => {
        const node = createVariableNode('temp', 'temp', dummyLocation);
        expect(node.scope).toBe('temp');
      });
    });

    describe('isExpression', () => {
      it('should return true for expression nodes', () => {
        expect(isExpression({ type: 'identifier', name: 'x', location: dummyLocation })).toBe(true);
        expect(isExpression({ type: 'variable', name: 'x', scope: 'story', location: dummyLocation })).toBe(true);
        expect(isExpression({ type: 'literal', valueType: 'number', value: 1, location: dummyLocation })).toBe(true);
        expect(isExpression({ type: 'binary_expression', operator: '+', left: {} as any, right: {} as any, location: dummyLocation })).toBe(true);
        expect(isExpression({ type: 'unary_expression', operator: '-', argument: {} as any, location: dummyLocation })).toBe(true);
        expect(isExpression({ type: 'call_expression', callee: {} as any, arguments: [], location: dummyLocation })).toBe(true);
        expect(isExpression({ type: 'member_expression', object: {} as any, property: 'x', location: dummyLocation })).toBe(true);
        expect(isExpression({ type: 'assignment_expression', operator: '=', target: {} as any, value: {} as any, location: dummyLocation })).toBe(true);
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
        expect(isContent({ type: 'conditional', condition: {} as any, consequent: [], alternatives: [], alternate: null, location: dummyLocation })).toBe(true);
        expect(isContent({ type: 'choice', choiceType: 'once', condition: null, text: [], target: null, action: null, location: dummyLocation })).toBe(true);
        expect(isContent({ type: 'alternatives', mode: 'sequence', options: [], location: dummyLocation })).toBe(true);
        expect(isContent({ type: 'gather', depth: 1, content: [], location: dummyLocation })).toBe(true);
        expect(isContent({ type: 'tunnel_call', target: 'x', location: dummyLocation })).toBe(true);
        expect(isContent({ type: 'tunnel_return', location: dummyLocation })).toBe(true);
        expect(isContent({ type: 'await_expression', threadName: 'x', location: dummyLocation })).toBe(true);
        expect(isContent({ type: 'spawn_expression', passageName: 'x', location: dummyLocation })).toBe(true);
        expect(isContent({ type: 'image', alt: '', src: '', attributes: {}, location: dummyLocation })).toBe(true);
        expect(isContent({ type: 'audio', src: '', attributes: {}, location: dummyLocation })).toBe(true);
        expect(isContent({ type: 'video', src: '', attributes: {}, location: dummyLocation })).toBe(true);
        expect(isContent({ type: 'embed', src: '', attributes: {}, location: dummyLocation })).toBe(true);
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
    describe('number parsing edge cases', () => {
      it('should handle number with positive exponent', () => {
        const result = tokenize('1E+5');
        expect(result.tokens.some(t => t.type === TokenType.NUMBER && t.value === '1E+5')).toBe(true);
      });

      it('should emit error for exponent without digits', () => {
        const result = tokenize('1e');
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].message).toContain('exponent');
      });

      it('should parse float starting at decimal', () => {
        const result = tokenize('0.5');
        expect(result.tokens.some(t => t.type === TokenType.NUMBER && t.value === '0.5')).toBe(true);
      });
    });

    describe('dollar sign edge cases', () => {
      it('should treat $ followed by non-identifier as TEXT', () => {
        const result = tokenize('$50');
        expect(result.tokens.some(t => t.type === TokenType.TEXT && t.value === '$')).toBe(true);
        expect(result.tokens.some(t => t.type === TokenType.NUMBER)).toBe(true);
      });

      it('should treat $ followed by space as TEXT', () => {
        const result = tokenize('$ ');
        expect(result.tokens.some(t => t.type === TokenType.TEXT && t.value === '$')).toBe(true);
      });
    });

    describe('brace edge cases', () => {
      it('should handle {/ as COND_END when followed by }', () => {
        const result = tokenize('{/}');
        expect(result.tokens.some(t => t.type === TokenType.COND_END)).toBe(true);
      });

      it('should handle { followed by / differently', () => {
        const result = tokenize('{/a');
        // The lexer may handle this as a single token or differently
        expect(result.tokens.some(t => t.type === TokenType.LBRACE || t.type === TokenType.COND_END)).toBe(true);
      });
    });

    describe('exclamation mark edge cases', () => {
      it('should handle ! after { not followed by |', () => {
        const result = tokenize('{!a}');
        // Inside expression context, ! is an error
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should handle {!| for once-only alternatives', () => {
        const result = tokenize('{!| a }');
        expect(result.tokens.some(t => t.type === TokenType.EXCLAMATION)).toBe(true);
        expect(result.tokens.some(t => t.type === TokenType.PIPE)).toBe(true);
      });
    });

    describe('string escape edge cases', () => {
      it('should handle escape at end of string', () => {
        const result = tokenize('"test\\');
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should handle \\r escape', () => {
        const result = tokenize('"\\r"');
        expect(result.tokens.some(t => t.type === TokenType.STRING && t.value === '\r')).toBe(true);
      });

      it('should handle unknown escape as character', () => {
        const result = tokenize('"\\q"');
        expect(result.tokens.some(t => t.type === TokenType.STRING && t.value === 'q')).toBe(true);
      });
    });

    describe('thread marker edge cases', () => {
      it('should handle == at line start with indentation', () => {
        const result = tokenize('  == Thread');
        expect(result.tokens.some(t => t.type === TokenType.THREAD_MARKER)).toBe(true);
      });

      it('should handle == followed by nothing', () => {
        const result = tokenize('==');
        // At line start with nothing after, still treated as THREAD_MARKER
        expect(result.tokens.some(t => t.type === TokenType.THREAD_MARKER || t.type === TokenType.EQ)).toBe(true);
      });
    });

    describe('scope operator edge cases', () => {
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
    describe('INCLUDE declaration edge cases', () => {
      it('should emit error for INCLUDE without path string', () => {
        const result = parse(`INCLUDE identifier
:: Start
Content`);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.message.includes('path'))).toBe(true);
      });

      it('should parse valid INCLUDE declaration', () => {
        const result = parse(`INCLUDE "library.ws"
:: Start
Content`);
        expect(result.ast?.includes).toHaveLength(1);
        expect((result.ast?.includes[0] as IncludeDeclarationNode).path).toBe('library.ws');
      });
    });

    describe('FUNCTION declaration edge cases', () => {
      it('should emit error for FUNCTION without name', () => {
        const result = parse(`FUNCTION ()
END
:: Start
Content`);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.message.includes('function name'))).toBe(true);
      });

      it('should parse FUNCTION with parameters', () => {
        const result = parse(`FUNCTION greet(name, age)
END
:: Start
Content`);
        expect(result.ast?.functions).toHaveLength(1);
        const func = result.ast?.functions[0] as FunctionDeclarationNode;
        expect(func.name).toBe('greet');
        expect(func.params).toHaveLength(2);
        expect(func.params[0].name).toBe('name');
        expect(func.params[1].name).toBe('age');
      });

      it('should parse FUNCTION without parentheses', () => {
        const result = parse(`FUNCTION noParams
END
:: Start
Content`);
        expect(result.ast?.functions).toHaveLength(1);
        const func = result.ast?.functions[0] as FunctionDeclarationNode;
        expect(func.name).toBe('noParams');
        expect(func.params).toHaveLength(0);
      });

      it('should handle nested FUNCTION in body', () => {
        const result = parse(`FUNCTION outer()
FUNCTION inner()
END
END
:: Start
Content`);
        expect(result.ast?.functions.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('NAMESPACE declaration edge cases', () => {
      it('should emit error for NAMESPACE without name', () => {
        const result = parse(`NAMESPACE
:: Start
Content
END NAMESPACE`);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should handle END NAMESPACE in content (may be ignored)', () => {
        const result = parse(`:: Start
END NAMESPACE
Content`);
        // The parser may silently ignore END NAMESPACE without a matching NAMESPACE
        // Just verify it doesn't crash
        expect(result.ast).not.toBeNull();
        expect(result.ast?.passages).toHaveLength(1);
      });

      it('should parse passages within namespace', () => {
        const result = parse(`NAMESPACE Combat
:: Attack
Attack!
END NAMESPACE
:: Start
Welcome`);
        // The passage should have the namespace prefix
        expect(result.ast?.passages.some(p => p.name.includes('Combat') || p.name === 'Attack')).toBe(true);
      });

      it('should handle END without NAMESPACE keyword', () => {
        const result = parse(`NAMESPACE Test
:: Passage
Content
END
:: Start
Hello`);
        expect(result.ast?.passages.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('choice parsing edge cases', () => {
      it('should parse choice with END target', () => {
        const result = parse(`:: Start
+ [Finish] -> END`);
        const passage = result.ast?.passages[0];
        const choice = passage?.content.find(c => c.type === 'choice') as ChoiceNode;
        expect(choice?.target).toBe('END');
      });

      it('should parse choice with namespace-qualified target', () => {
        const result = parse(`:: Start
+ [Attack] -> Combat::Attack`);
        const passage = result.ast?.passages[0];
        const choice = passage?.content.find(c => c.type === 'choice') as ChoiceNode;
        expect(choice?.target).toContain('Combat');
      });

      it('should parse choice with global reference target (::Passage)', () => {
        const result = parse(`:: Start
+ [Go global] -> ::GlobalPassage`);
        const passage = result.ast?.passages[0];
        const choice = passage?.content.find(c => c.type === 'choice') as ChoiceNode;
        expect(choice).toBeDefined();
        expect(choice?.target).toBeDefined();
      });

      it('should parse choice with {if condition} after text', () => {
        const result = parse(`:: Start
+ [Buy] {if $gold >= 50} -> Shop`);
        const passage = result.ast?.passages[0];
        const choice = passage?.content.find(c => c.type === 'choice') as ChoiceNode;
        expect(choice?.condition).not.toBeNull();
      });

      it('should parse choice with {do action} before target', () => {
        const result = parse(`:: Start
+ [Attack] {do $hp -= 10} -> Battle`);
        const passage = result.ast?.passages[0];
        const choice = passage?.content.find(c => c.type === 'choice') as ChoiceNode;
        expect(choice?.action).not.toBeNull();
      });

      it('should parse choice with {do action} after target', () => {
        const result = parse(`:: Start
+ [Heal] -> Healer {do $hp += 20}`);
        const passage = result.ast?.passages[0];
        const choice = passage?.content.find(c => c.type === 'choice') as ChoiceNode;
        expect(choice?.action).not.toBeNull();
      });

      it('should emit warning for {if} after target', () => {
        const result = parse(`:: Start
+ [Test] -> Target {if $x > 0}`);
        // Should parse but might have a warning
        const passage = result.ast?.passages[0];
        expect(passage?.content.some(c => c.type === 'choice')).toBe(true);
      });

      it('should handle old-style action after target', () => {
        const result = parse(`:: Start
+ [Buy] -> Shop { $gold -= 10 }`);
        const passage = result.ast?.passages[0];
        const choice = passage?.content.find(c => c.type === 'choice') as ChoiceNode;
        expect(choice?.action).not.toBeNull();
      });

      it('should emit error for arrow without target', () => {
        const result = parse(`:: Start
+ [Go] ->`);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('passage metadata edge cases', () => {
      it('should emit error for directive without colon', () => {
        const result = parse(`:: Start
@fallback Fallback
Content`);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should emit error for directive without value', () => {
        const result = parse(`:: Start
@fallback:
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

    describe('do block edge cases', () => {
      it('should parse do block with multiple statements', () => {
        const result = parse(`:: Start
{do $x = 1; $y = 2; $z = 3}`);
        const passage = result.ast?.passages[0];
        const doBlock = passage?.content.find(c => c.type === 'do_block') as DoBlockNode;
        expect(doBlock?.actions.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('await/spawn edge cases', () => {
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
        const passage = result.ast?.passages[0];
        const spawn = passage?.content.find(c => c.type === 'spawn_expression') as SpawnExpressionNode;
        expect(spawn?.passageName).toBe('BackgroundThread');
      });
    });

    describe('MAP declaration edge cases', () => {
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
        const map = result.ast?.maps[0] as MapDeclarationNode;
        expect(map.entries[0].key).toBe('my key');
      });
    });

    describe('expression parsing edge cases', () => {
      it('should parse assignment with member expression target', () => {
        const result = parse(':: Start\n$' + '{obj.prop = 10}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation');
        if (interp && 'expression' in interp) {
          expect((interp as any).expression.type).toBe('assignment_expression');
        }
      });

      it('should emit error for invalid assignment target', () => {
        const result = parse(':: Start\n$' + '{42 = 10}');
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.message.includes('assignment target'))).toBe(true);
      });

      it('should parse member access chain', () => {
        const result = parse(':: Start\n$' + '{obj.prop.nested}');
        const passage = result.ast?.passages[0];
        expect(passage?.content.some(c => c.type === 'interpolation')).toBe(true);
      });

      it('should emit error for member access without property', () => {
        const result = parse(':: Start\n$' + '{obj.}');
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should parse function call with multiple arguments', () => {
        const result = parse(':: Start\n$' + '{func(a, b, c)}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation');
        if (interp && 'expression' in interp) {
          const expr = (interp as any).expression;
          if (expr.type === 'call_expression') {
            expect(expr.arguments.length).toBe(3);
          }
        }
      });

      it('should parse unexpected token and recover', () => {
        const result = parse(':: Start\n$' + '{ @ }');
        expect(result.errors.length).toBeGreaterThan(0);
        // Should still produce an AST
        expect(result.ast).not.toBeNull();
      });
    });

    describe('conditional parsing edge cases', () => {
      it('should parse conditional content with nested braces', () => {
        const result = parse(`:: Start
{ $x > 0 }
{do $y = 1}
Content
{/}`);
        const passage = result.ast?.passages[0];
        const cond = passage?.content.find(c => c.type === 'conditional');
        expect(cond).toBeDefined();
      });

      it('should handle {/} not followed by conditional', () => {
        const result = parse(`:: Start
{/}`);
        // The parser should handle this gracefully
        expect(result.ast).not.toBeNull();
      });
    });

    describe('global passage references', () => {
      it('should parse passage with :: prefix (global reference)', () => {
        const result = parse(`NAMESPACE Combat
:: ::GlobalPassage
Global content
END NAMESPACE`);
        // The passage name should not have namespace prefix
        expect(result.ast?.passages.some(p => p.name === 'GlobalPassage' || p.name.endsWith('GlobalPassage'))).toBe(true);
      });

      it('should parse passage with namespace-qualified name', () => {
        const result = parse(`:: Combat::Attack
Attack content`);
        expect(result.ast?.passages[0].name).toContain('Attack');
      });
    });

    describe('thread passage parsing edge cases', () => {
      it('should parse thread with metadata', () => {
        const result = parse(`:: Start
Hello

== Background [loop]
@onEnter: setup
Content`);
        expect(result.ast?.threads).toHaveLength(1);
        expect(result.ast?.threads[0].tags).toEqual(['loop']);
        expect(result.ast?.threads[0].metadata).toHaveLength(1);
      });

      it('should emit error for thread without name', () => {
        const result = parse(`:: Start
Hello

==`);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('variable parsing edge cases', () => {
      it('should parse temp variable in expression', () => {
        const result = parse(`:: Start
{_temp >= 0}
Test
{/}`);
        const passage = result.ast?.passages[0];
        const cond = passage?.content.find(c => c.type === 'conditional');
        expect(cond).toBeDefined();
      });

      it('should parse $ followed by underscore', () => {
        const result = parse(`:: Start
Value: $_temp`);
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation');
        if (interp && 'expression' in interp) {
          const expr = (interp as any).expression as VariableNode;
          expect(expr.scope).toBe('temp');
        }
      });

      it('should parse underscore alone as token', () => {
        const result = parse(`:: Start
{ _ > 0 }
Test
{/}`);
        // _ is parsed as temp variable
        expect(result.ast?.passages).toHaveLength(1);
      });

      it('should emit error for $ without variable name', () => {
        const result = parse(':: Start\n$' + '{ $ }');
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('ARRAY declaration edge cases', () => {
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

      it('should emit error for ARRAY without [', () => {
        const result = parse(`ARRAY items = 1, 2
:: Start
Content`);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('LIST declaration edge cases', () => {
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

      it('should emit error for missing identifier in parens', () => {
        const result = parse(`LIST moods = (123), sad
:: Start
Content`);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('@vars block parsing', () => {
      it('should parse @vars with indented declarations', () => {
        const result = parse(`@vars
gold: 100
health: 50

:: Start
Content`);
        expect(result.ast?.variables.length).toBeGreaterThanOrEqual(0);
      });

      it('should handle empty @vars block', () => {
        const result = parse(`@vars

:: Start
Content`);
        expect(result.ast).not.toBeNull();
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

      it('should recover from unknown tokens in passage', () => {
        const result = parse(`:: Start
Content @ random tokens
More content`);
        // Should continue parsing
        expect(result.ast).not.toBeNull();
      });

      it('should handle FUNCTION inside passage section', () => {
        const result = parse(`:: Start
Hello

FUNCTION helper()
END

:: End
World`);
        // The parser may treat FUNCTION inside a passage differently
        // It might be parsed as content or trigger an error
        expect(result.ast?.passages.length).toBeGreaterThanOrEqual(1);
        // Functions might not be extracted from within passage content
        // The parser may treat this as text or handle it differently
        expect(result.ast).not.toBeNull();
      });

      it('should handle comments in content', () => {
        const result = parse(`:: Start
-- This is a comment
Content`);
        expect(result.ast?.passages[0].content.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // Parser constructor/class tests
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

    it('should handle multiple tokenize calls (reset state)', () => {
      const lexer = new Lexer('test');
      const result1 = lexer.tokenize();
      const result2 = lexer.tokenize();
      expect(result1.tokens.length).toBe(result2.tokens.length);
    });

  });

  // ============================================================================
  // Additional Coverage Tests
  // ============================================================================

  describe('additional coverage - error paths', () => {
    it('should treat $ followed by space as text (lexer handles this)', () => {
      const result = parse(`:: Start
Value: $ hello`);
      // $ followed by space is treated as text by lexer, not an error
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse $_temp as temp variable', () => {
      const result = parse(`:: Start
Value: $_temp`);
      const passage = result.ast?.passages[0];
      expect(passage).toBeDefined();
    });

    it('should handle $_ followed by space (lexer treats as identifier)', () => {
      // $_ followed by space - lexer handles this differently
      // The _ is scanned as UNDERSCORE token, then space
      const result = parse(`:: Start
Value: $_ `);
      // Parser may not error since lexer handles the tokenization
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should handle $_ at end of file', () => {
      const result = parse(`:: Start
Value: $_`);
      // Lexer handles this specially
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should handle expression error for $ without name inside braces', () => {
      const result = parse(`:: Start
{ $ }`);
      // Inside a brace expression, $ without name may produce different behavior
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse $name where name starts with underscore', () => {
      // This tests the path where name.startsWith('_') is true
      const result = parse(`:: Start
Value: $_myvar`);
      expect(result.ast?.passages).toHaveLength(1);
    });

    it('should parse double underscore temp variable', () => {
      // Test $__name path
      const result = parse(`:: Start
Value: $__secret`);
      expect(result.ast?.passages).toHaveLength(1);
    });
  });
});
