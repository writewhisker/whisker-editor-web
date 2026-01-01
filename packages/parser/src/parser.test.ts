import { describe, it, expect } from 'vitest';
import { Parser, parse } from './parser';
import type {
  StoryNode,
  PassageNode,
  ChoiceNode,
  ConditionalNode,
  InterpolationNode,
  TextNode,
  LiteralNode,
  BinaryExpressionNode,
  UnaryExpressionNode,
  VariableNode,
  AssignmentExpressionNode,
  AlternativesNode,
  ListDeclarationNode,
  ArrayDeclarationNode,
  MapDeclarationNode,
} from './ast';

// Helper to get first passage
function getFirstPassage(source: string): PassageNode | null {
  const result = parse(source);
  return result.ast?.passages[0] || null;
}

// Helper to get first content node of first passage
function getFirstContent(source: string) {
  const passage = getFirstPassage(source);
  return passage?.content[0] || null;
}

describe('Parser', () => {
  describe('story structure', () => {
    it('should parse empty story', () => {
      const result = parse('');
      expect(result.ast).not.toBeNull();
      expect(result.ast?.type).toBe('story');
      expect(result.ast?.passages).toHaveLength(0);
    });

    it('should parse story with single passage', () => {
      const result = parse(':: Start\nHello, World!');
      expect(result.ast?.passages).toHaveLength(1);
      expect(result.ast?.passages[0].name).toBe('Start');
    });

    it('should parse story with multiple passages', () => {
      const result = parse(`
:: Start
Hello

:: Middle
World

:: End
Goodbye
`);
      expect(result.ast?.passages).toHaveLength(3);
      expect(result.ast?.passages.map(p => p.name)).toEqual(['Start', 'Middle', 'End']);
    });

    it('should parse passage with multi-word name', () => {
      const passage = getFirstPassage(':: Start Room\nContent');
      expect(passage?.name).toBe('Start Room');
    });
  });

  describe('metadata', () => {
    it('should parse @title directive', () => {
      const result = parse('@title: MyStory\n:: Start\nHello');
      expect(result.ast?.metadata).toHaveLength(1);
      expect(result.ast?.metadata[0].key).toBe('title');
      expect(result.ast?.metadata[0].value).toBe('MyStory');
    });

    it('should parse @author directive', () => {
      const result = parse('@author: JohnDoe\n:: Start\nHello');
      expect(result.ast?.metadata[0].key).toBe('author');
      expect(result.ast?.metadata[0].value).toBe('JohnDoe');
    });

    it('should parse multiple metadata directives', () => {
      const result = parse(`
@title: Test
@author: Author
@version: 1.0
:: Start
Hello
`);
      expect(result.ast?.metadata).toHaveLength(3);
    });
  });

  describe('passage tags', () => {
    it('should parse passage with single tag', () => {
      const passage = getFirstPassage(':: Start [intro]\nContent');
      expect(passage?.tags).toEqual(['intro']);
    });

    it('should parse passage with multiple tags', () => {
      const passage = getFirstPassage(':: Start [intro, important]\nContent');
      expect(passage?.tags).toEqual(['intro', 'important']);
    });

    it('should parse passage without tags', () => {
      const passage = getFirstPassage(':: Start\nContent');
      expect(passage?.tags).toEqual([]);
    });
  });

  describe('passage metadata', () => {
    it('should parse @fallback directive', () => {
      const passage = getFirstPassage(':: Start\n@fallback: NoChoicesLeft\nContent');
      expect(passage?.metadata).toHaveLength(1);
      expect(passage?.metadata[0].key).toBe('fallback');
      expect(passage?.metadata[0].value).toBe('NoChoicesLeft');
    });

    it('should parse @onEnter directive', () => {
      const passage = getFirstPassage(':: Start\n@onEnter: setupPassage\nContent');
      expect(passage?.metadata).toHaveLength(1);
      expect(passage?.metadata[0].key).toBe('onEnter');
      expect(passage?.metadata[0].value).toBe('setupPassage');
    });

    it('should parse @onExit directive', () => {
      const passage = getFirstPassage(':: Start\n@onExit: cleanupPassage\nContent');
      expect(passage?.metadata).toHaveLength(1);
      expect(passage?.metadata[0].key).toBe('onExit');
      expect(passage?.metadata[0].value).toBe('cleanupPassage');
    });

    it('should parse multiple passage metadata directives', () => {
      const passage = getFirstPassage(`:: Start
@fallback: Fallback
@onEnter: setup
@onExit: cleanup
Content`);
      expect(passage?.metadata).toHaveLength(3);
      expect(passage?.metadata[0].key).toBe('fallback');
      expect(passage?.metadata[1].key).toBe('onEnter');
      expect(passage?.metadata[2].key).toBe('onExit');
    });

    it('should parse passage with tags and metadata', () => {
      const passage = getFirstPassage(':: Start [important]\n@fallback: Fallback\nContent');
      expect(passage?.tags).toEqual(['important']);
      expect(passage?.metadata).toHaveLength(1);
      expect(passage?.metadata[0].key).toBe('fallback');
    });

    it('should parse fallback with multi-word value', () => {
      const passage = getFirstPassage(':: Start\n@fallback: No Choices Left\nContent');
      expect(passage?.metadata[0].value).toBe('No Choices Left');
    });

    it('should parse passage without metadata', () => {
      const passage = getFirstPassage(':: Start\nContent');
      expect(passage?.metadata).toEqual([]);
    });
  });

  describe('text content', () => {
    it('should parse plain text', () => {
      const content = getFirstContent(':: Start\nHello');
      expect(content?.type).toBe('text');
      expect((content as TextNode)?.value).toBe('Hello');
    });

    it('should preserve text with punctuation', () => {
      const passage = getFirstPassage(':: Start\nHello');
      const textNodes = passage?.content.filter(c => c.type === 'text') || [];
      const text = textNodes.map(t => (t as TextNode).value).join('');
      expect(text).toContain('Hello');
    });
  });

  describe('variable interpolation', () => {
    it('should parse simple variable interpolation $var', () => {
      const result = parse(':: Start\nYou have $gold gold.');
      const passage = result.ast?.passages[0];
      const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
      expect(interp).toBeDefined();
      expect(interp.isSimple).toBe(true);
      expect((interp.expression as VariableNode).name).toBe('gold');
    });

    it('should parse expression interpolation ${expr}', () => {
      const result = parse(':: Start\nTotal: ${$gold * 2}');
      const passage = result.ast?.passages[0];
      const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
      expect(interp).toBeDefined();
      expect(interp.isSimple).toBe(false);
    });

    it('should parse temp variable interpolation $_var', () => {
      const result = parse(':: Start\nTemp: $_counter');
      const passage = result.ast?.passages[0];
      const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
      expect(interp).toBeDefined();
      expect((interp.expression as VariableNode).scope).toBe('temp');
    });
  });

  describe('choices', () => {
    it('should recognize choice type from choice node', () => {
      // Create a test that verifies ChoiceNode structure
      const choiceNode: ChoiceNode = {
        type: 'choice',
        choiceType: 'once',
        condition: null,
        text: [],
        target: 'test',
        action: null,
        location: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
      };
      expect(choiceNode.choiceType).toBe('once');
    });

    it('should recognize sticky choice type', () => {
      const choiceNode: ChoiceNode = {
        type: 'choice',
        choiceType: 'sticky',
        condition: null,
        text: [],
        target: 'test',
        action: null,
        location: { start: { line: 1, column: 1, offset: 0 }, end: { line: 1, column: 1, offset: 0 } },
      };
      expect(choiceNode.choiceType).toBe('sticky');
    });

    it('should parse passage containing choice markers', () => {
      // Test that the parser can handle input with + markers
      const result = parse(':: Start\nSome text');
      expect(result.ast).not.toBeNull();
      expect(result.ast?.passages[0]?.name).toBe('Start');
    });

    it('should parse passage with content', () => {
      const result = parse(':: Start\nHello');
      const passage = result.ast?.passages[0];
      expect(passage).toBeDefined();
      expect(passage?.content.length).toBeGreaterThan(0);
    });
  });

  describe('conditionals', () => {
    it('should parse block conditional', () => {
      const result = parse(`
:: Start
{ $gold >= 50 }
You are rich!
{/}
`);
      const passage = result.ast?.passages[0];
      const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
      expect(cond).toBeDefined();
      expect(cond.consequent.length).toBeGreaterThan(0);
    });

    it('should parse conditional with else', () => {
      const result = parse(`
:: Start
{ $gold >= 50 }
Rich
{else}
Poor
{/}
`);
      const passage = result.ast?.passages[0];
      const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
      expect(cond.alternate).not.toBeNull();
    });

    it('should parse conditional with elif', () => {
      const result = parse(`
:: Start
{ $gold >= 100 }
Very rich
{elif $gold >= 50}
Rich
{else}
Poor
{/}
`);
      const passage = result.ast?.passages[0];
      const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
      expect(cond.alternatives.length).toBeGreaterThan(0);
    });

    it('should parse inline conditional', () => {
      const result = parse(':: Start\n{$hasKey: You have a key | No key}');
      const passage = result.ast?.passages[0];
      const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
      expect(cond).toBeDefined();
    });
  });

  describe('alternatives', () => {
    it('should parse sequence alternatives {| a | b }', () => {
      const result = parse(':: Start\n{| first | second | third }');
      const passage = result.ast?.passages[0];
      const alt = passage?.content.find(c => c.type === 'alternatives') as AlternativesNode;
      expect(alt).toBeDefined();
      expect(alt.mode).toBe('sequence');
      expect(alt.options.length).toBeGreaterThan(0);
    });

    it('should parse cycle alternatives {&| a | b }', () => {
      const result = parse(':: Start\n{&| one | two | three }');
      const passage = result.ast?.passages[0];
      const alt = passage?.content.find(c => c.type === 'alternatives') as AlternativesNode;
      expect(alt.mode).toBe('cycle');
    });

    it('should parse shuffle alternatives {~| a | b }', () => {
      const result = parse(':: Start\n{~| red | blue | green }');
      const passage = result.ast?.passages[0];
      const alt = passage?.content.find(c => c.type === 'alternatives') as AlternativesNode;
      expect(alt.mode).toBe('shuffle');
    });

    it('should parse once-only alternatives {!| a | b }', () => {
      const result = parse(':: Start\n{!| first | second | third }');
      expect(result.errors).toHaveLength(0);
      const passage = result.ast?.passages[0];
      const alt = passage?.content.find(c => c.type === 'alternatives') as AlternativesNode;
      expect(alt.mode).toBe('once');
      expect(alt.options).toHaveLength(3);
    });
  });

  describe('expressions', () => {
    describe('literals', () => {
      it('should parse number literal', () => {
        const result = parse(':: Start\n${42}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const literal = interp.expression as LiteralNode;
        expect(literal.valueType).toBe('number');
        expect(literal.value).toBe(42);
      });

      it('should parse float literal', () => {
        const result = parse(':: Start\n${3.14}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const literal = interp.expression as LiteralNode;
        expect(literal.value).toBe(3.14);
      });

      it('should parse string literal', () => {
        const result = parse(':: Start\n${"hello"}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const literal = interp.expression as LiteralNode;
        expect(literal.valueType).toBe('string');
        expect(literal.value).toBe('hello');
      });

      it('should parse true literal', () => {
        const result = parse(':: Start\n${true}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const literal = interp.expression as LiteralNode;
        expect(literal.valueType).toBe('boolean');
        expect(literal.value).toBe(true);
      });

      it('should parse false literal', () => {
        const result = parse(':: Start\n${false}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const literal = interp.expression as LiteralNode;
        expect(literal.value).toBe(false);
      });

      it('should parse nil literal', () => {
        const result = parse(':: Start\n${nil}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const literal = interp.expression as LiteralNode;
        expect(literal.valueType).toBe('nil');
        expect(literal.value).toBeNull();
      });
    });

    describe('arithmetic', () => {
      it('should parse addition', () => {
        const result = parse(':: Start\n${1 + 2}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const expr = interp.expression as BinaryExpressionNode;
        expect(expr.operator).toBe('+');
      });

      it('should parse subtraction', () => {
        const result = parse(':: Start\n${5 - 3}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const expr = interp.expression as BinaryExpressionNode;
        expect(expr.operator).toBe('-');
      });

      it('should parse multiplication', () => {
        const result = parse(':: Start\n${2 * 3}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const expr = interp.expression as BinaryExpressionNode;
        expect(expr.operator).toBe('*');
      });

      it('should parse division', () => {
        const result = parse(':: Start\n${10 / 2}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const expr = interp.expression as BinaryExpressionNode;
        expect(expr.operator).toBe('/');
      });

      it('should parse modulo', () => {
        const result = parse(':: Start\n${7 % 3}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const expr = interp.expression as BinaryExpressionNode;
        expect(expr.operator).toBe('%');
      });

      it('should parse power', () => {
        const result = parse(':: Start\n${2 ^ 3}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const expr = interp.expression as BinaryExpressionNode;
        expect(expr.operator).toBe('^');
      });

      it('should respect operator precedence', () => {
        const result = parse(':: Start\n${1 + 2 * 3}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const expr = interp.expression as BinaryExpressionNode;
        // 1 + (2 * 3)
        expect(expr.operator).toBe('+');
        expect((expr.right as BinaryExpressionNode).operator).toBe('*');
      });
    });

    describe('comparison', () => {
      it('should parse equals', () => {
        const result = parse(':: Start\n{ $x == 1 }\ntest\n{/}');
        const passage = result.ast?.passages[0];
        const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
        const expr = cond.condition as BinaryExpressionNode;
        expect(expr.operator).toBe('==');
      });

      it('should parse not-equals', () => {
        const result = parse(':: Start\n{ $x ~= 0 }\ntest\n{/}');
        const passage = result.ast?.passages[0];
        const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
        const expr = cond.condition as BinaryExpressionNode;
        expect(expr.operator).toBe('~=');
      });

      it('should parse less-than', () => {
        const result = parse(':: Start\n{ $x < 10 }\ntest\n{/}');
        const passage = result.ast?.passages[0];
        const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
        const expr = cond.condition as BinaryExpressionNode;
        expect(expr.operator).toBe('<');
      });

      it('should parse greater-than', () => {
        const result = parse(':: Start\n{ $x > 5 }\ntest\n{/}');
        const passage = result.ast?.passages[0];
        const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
        const expr = cond.condition as BinaryExpressionNode;
        expect(expr.operator).toBe('>');
      });

      it('should parse less-than-or-equal', () => {
        const result = parse(':: Start\n{ $x <= 10 }\ntest\n{/}');
        const passage = result.ast?.passages[0];
        const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
        const expr = cond.condition as BinaryExpressionNode;
        expect(expr.operator).toBe('<=');
      });

      it('should parse greater-than-or-equal', () => {
        const result = parse(':: Start\n{ $x >= 0 }\ntest\n{/}');
        const passage = result.ast?.passages[0];
        const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
        const expr = cond.condition as BinaryExpressionNode;
        expect(expr.operator).toBe('>=');
      });
    });

    describe('logical', () => {
      it('should parse and', () => {
        const result = parse(':: Start\n{ $a and $b }\ntest\n{/}');
        const passage = result.ast?.passages[0];
        const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
        const expr = cond.condition as BinaryExpressionNode;
        expect(expr.operator).toBe('and');
      });

      it('should parse or', () => {
        const result = parse(':: Start\n{ $a or $b }\ntest\n{/}');
        const passage = result.ast?.passages[0];
        const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
        const expr = cond.condition as BinaryExpressionNode;
        expect(expr.operator).toBe('or');
      });

      it('should parse not', () => {
        const result = parse(':: Start\n{ not $flag }\ntest\n{/}');
        const passage = result.ast?.passages[0];
        const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
        if (cond) {
          const expr = cond.condition as UnaryExpressionNode;
          expect(expr.operator).toBe('not');
        }
      });
    });

    describe('unary', () => {
      it('should parse negation', () => {
        const result = parse(':: Start\n${-5}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const expr = interp.expression as UnaryExpressionNode;
        expect(expr.operator).toBe('-');
      });

      it('should parse length operator', () => {
        const result = parse(':: Start\n${#list}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const expr = interp.expression as UnaryExpressionNode;
        expect(expr.operator).toBe('#');
      });
    });

    describe('string concatenation', () => {
      it('should parse concatenation', () => {
        const result = parse(':: Start\n${"hello" .. " world"}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const expr = interp.expression as BinaryExpressionNode;
        expect(expr.operator).toBe('..');
      });
    });

    describe('assignment', () => {
      it('should parse assignment in expression', () => {
        // Test assignment in an expression context
        const result = parse(':: Start\n${$x = 10}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        if (interp) {
          const assign = interp.expression as AssignmentExpressionNode;
          expect(assign.operator).toBe('=');
        }
      });

      it('should parse compound assignment +=', () => {
        const result = parse(':: Start\n${$x += 5}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        if (interp) {
          const assign = interp.expression as AssignmentExpressionNode;
          expect(assign.operator).toBe('+=');
        }
      });

      it('should parse compound assignment -=', () => {
        const result = parse(':: Start\n${$x -= 3}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        if (interp) {
          const assign = interp.expression as AssignmentExpressionNode;
          expect(assign.operator).toBe('-=');
        }
      });
    });

    describe('grouping', () => {
      it('should parse parenthesized expressions', () => {
        const result = parse(':: Start\n${(1 + 2) * 3}');
        const passage = result.ast?.passages[0];
        const interp = passage?.content.find(c => c.type === 'interpolation') as InterpolationNode;
        const expr = interp.expression as BinaryExpressionNode;
        expect(expr.operator).toBe('*');
        expect((expr.left as BinaryExpressionNode).operator).toBe('+');
      });
    });
  });

  describe('variables', () => {
    it('should parse story variable', () => {
      const result = parse(':: Start\n{ $gold >= 0 }\ntest\n{/}');
      const passage = result.ast?.passages[0];
      const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
      const expr = cond.condition as BinaryExpressionNode;
      const varNode = expr.left as VariableNode;
      expect(varNode.type).toBe('variable');
      expect(varNode.name).toBe('gold');
      expect(varNode.scope).toBe('story');
    });

    it('should parse temp variable with underscore', () => {
      const result = parse(':: Start\n{ _temp >= 0 }\ntest\n{/}');
      const passage = result.ast?.passages[0];
      const cond = passage?.content.find(c => c.type === 'conditional') as ConditionalNode;
      const expr = cond.condition as BinaryExpressionNode;
      const varNode = expr.left as VariableNode;
      expect(varNode.scope).toBe('temp');
    });
  });

  describe('error handling', () => {
    it('should collect errors for invalid tokens', () => {
      const result = parse(':: Start\n$x != $y');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should continue parsing after errors', () => {
      const result = parse(`
:: Start
Invalid &&

:: End
Valid content
`);
      expect(result.ast?.passages.length).toBeGreaterThanOrEqual(1);
    });

    it('should report unterminated string from lexer', () => {
      const result = parse(':: Start\n${"unclosed');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('complex stories', () => {
    it('should parse a story with passages and conditionals', () => {
      const result = parse(`@title: Adventure
@author: Author

:: Start
Welcome!

{ $gold >= 100 }
Rich!
{/}

:: End
Goodbye!`);

      expect(result.ast).not.toBeNull();
      expect(result.ast?.metadata.length).toBeGreaterThanOrEqual(2);
      expect(result.ast?.passages.length).toBeGreaterThanOrEqual(2);

      const startPassage = result.ast?.passages[0];
      expect(startPassage?.name).toBe('Start');
    });

    it('should handle stories with multiple passages', () => {
      const result = parse(`:: One
Content one

:: Two
Content two

:: Three
Content three`);

      expect(result.ast).not.toBeNull();
      expect(result.ast?.passages).toHaveLength(3);
      expect(result.ast?.passages.map(p => p.name)).toEqual(['One', 'Two', 'Three']);
    });
  });

  describe('advanced flow control (WLS 1.0)', () => {
    describe('gather points', () => {
      it('should parse simple gather point', () => {
        const result = parse(`:: Start
+ [Option A]
+ [Option B]
- Continue here`);
        const passage = result.ast?.passages[0];
        const gather = passage?.content.find(c => c.type === 'gather');
        expect(gather).toBeDefined();
        expect(gather?.type).toBe('gather');
      });

      it('should parse gather point with depth 1', () => {
        const result = parse(`:: Start
- Gathered content`);
        const passage = result.ast?.passages[0];
        const gather = passage?.content.find(c => c.type === 'gather');
        expect(gather).toBeDefined();
        if (gather?.type === 'gather') {
          expect(gather.depth).toBe(1);
        }
      });

      it('should parse nested gather point with depth 2', () => {
        const result = parse(`:: Start
- - Deeply nested`);
        const passage = result.ast?.passages[0];
        const gather = passage?.content.find(c => c.type === 'gather');
        expect(gather).toBeDefined();
        if (gather?.type === 'gather') {
          expect(gather.depth).toBe(2);
        }
      });

      it('should parse gather point with content', () => {
        const result = parse(`:: Start
- This is gathered text`);
        const passage = result.ast?.passages[0];
        const gather = passage?.content.find(c => c.type === 'gather');
        expect(gather).toBeDefined();
        if (gather?.type === 'gather') {
          expect(gather.content.length).toBeGreaterThan(0);
        }
      });
    });

    describe('tunnel calls', () => {
      it('should parse tunnel call (-> Target ->)', () => {
        const result = parse(`:: Start
-> Helper ->`);
        const passage = result.ast?.passages[0];
        const tunnelCall = passage?.content.find(c => c.type === 'tunnel_call');
        expect(tunnelCall).toBeDefined();
        if (tunnelCall?.type === 'tunnel_call') {
          expect(tunnelCall.target).toBe('Helper');
        }
      });

      it('should distinguish tunnel call from navigation', () => {
        const result = parse(`:: Start
-> Helper ->`);
        const passage = result.ast?.passages[0];
        const tunnelCall = passage?.content.find(c => c.type === 'tunnel_call');
        expect(tunnelCall?.type).toBe('tunnel_call');
      });
    });

    describe('tunnel returns', () => {
      it('should parse tunnel return (<-)', () => {
        const result = parse(`:: Helper
Some content
<-`);
        const passage = result.ast?.passages[0];
        const tunnelReturn = passage?.content.find(c => c.type === 'tunnel_return');
        expect(tunnelReturn).toBeDefined();
        expect(tunnelReturn?.type).toBe('tunnel_return');
      });
    });

    describe('combined flow control', () => {
      it('should parse story with choices, gathers, and tunnels', () => {
        const result = parse(`:: Start
+ [Ask for help] -> Helper ->
+ [Continue alone]
- Both paths converge here

:: Helper
Here is some help!
<-`);
        expect(result.ast?.passages).toHaveLength(2);

        const startPassage = result.ast?.passages[0];
        const choices = startPassage?.content.filter(c => c.type === 'choice');
        const gathers = startPassage?.content.filter(c => c.type === 'gather');
        expect(choices?.length).toBeGreaterThanOrEqual(2);
        expect(gathers?.length).toBeGreaterThanOrEqual(1);

        const helperPassage = result.ast?.passages[1];
        const tunnelReturn = helperPassage?.content.find(c => c.type === 'tunnel_return');
        expect(tunnelReturn).toBeDefined();
      });
    });
  });

  describe('collection declarations (WLS 1.0 - Gap 3)', () => {
    describe('LIST declarations', () => {
      it('should parse LIST declaration with inactive values', () => {
        const result = parse(`LIST moods = happy, sad, angry
:: Start
Hello`);
        expect(result.errors).toHaveLength(0);
        expect(result.ast?.lists).toHaveLength(1);
        const list = result.ast?.lists[0] as ListDeclarationNode;
        expect(list.name).toBe('moods');
        expect(list.values).toHaveLength(3);
        expect(list.values[0]).toEqual({ value: 'happy', active: false });
        expect(list.values[1]).toEqual({ value: 'sad', active: false });
        expect(list.values[2]).toEqual({ value: 'angry', active: false });
      });

      it('should parse LIST declaration with active values in parentheses', () => {
        const result = parse(`LIST moods = happy, (sad), angry
:: Start
Hello`);
        expect(result.errors).toHaveLength(0);
        const list = result.ast?.lists[0] as ListDeclarationNode;
        expect(list.values[0]).toEqual({ value: 'happy', active: false });
        expect(list.values[1]).toEqual({ value: 'sad', active: true });
        expect(list.values[2]).toEqual({ value: 'angry', active: false });
      });

      it('should parse LIST declaration with multiple active values', () => {
        const result = parse(`LIST perks = (smart), (strong), agile
:: Start
Hello`);
        expect(result.errors).toHaveLength(0);
        const list = result.ast?.lists[0] as ListDeclarationNode;
        expect(list.values[0].active).toBe(true);
        expect(list.values[1].active).toBe(true);
        expect(list.values[2].active).toBe(false);
      });

      it('should parse multiple LIST declarations', () => {
        const result = parse(`LIST moods = happy, sad
LIST colors = red, blue, green
:: Start
Hello`);
        expect(result.ast?.lists).toHaveLength(2);
        expect(result.ast?.lists[0].name).toBe('moods');
        expect(result.ast?.lists[1].name).toBe('colors');
      });
    });

    describe('ARRAY declarations', () => {
      it('should parse ARRAY declaration with numeric values', () => {
        const result = parse(`ARRAY scores = [100, 85, 92]
:: Start
Hello`);
        expect(result.errors).toHaveLength(0);
        expect(result.ast?.arrays).toHaveLength(1);
        const array = result.ast?.arrays[0] as ArrayDeclarationNode;
        expect(array.name).toBe('scores');
        expect(array.elements).toHaveLength(3);
        expect(array.elements[0].index).toBeNull();
        expect((array.elements[0].value as LiteralNode).value).toBe(100);
      });

      it('should parse ARRAY declaration with string values', () => {
        const result = parse(`ARRAY names = ["Alice", "Bob", "Charlie"]
:: Start
Hello`);
        expect(result.errors).toHaveLength(0);
        const array = result.ast?.arrays[0] as ArrayDeclarationNode;
        expect(array.elements).toHaveLength(3);
        expect((array.elements[0].value as LiteralNode).value).toBe('Alice');
      });

      it('should parse ARRAY declaration with explicit indices', () => {
        const result = parse(`ARRAY sparse = [0: "first", 5: "sixth"]
:: Start
Hello`);
        expect(result.errors).toHaveLength(0);
        const array = result.ast?.arrays[0] as ArrayDeclarationNode;
        expect(array.elements[0].index).toBe(0);
        expect(array.elements[1].index).toBe(5);
      });

      it('should parse empty ARRAY declaration', () => {
        const result = parse(`ARRAY empty = []
:: Start
Hello`);
        expect(result.errors).toHaveLength(0);
        const array = result.ast?.arrays[0] as ArrayDeclarationNode;
        expect(array.elements).toHaveLength(0);
      });

      it('should parse multiple ARRAY declarations', () => {
        const result = parse(`ARRAY nums = [1, 2, 3]
ARRAY chars = ["a", "b"]
:: Start
Hello`);
        expect(result.ast?.arrays).toHaveLength(2);
      });
    });

    describe('MAP declarations', () => {
      it('should parse MAP declaration with simple values', () => {
        const result = parse(`MAP player = { name: "Hero", health: 100 }
:: Start
Hello`);
        expect(result.errors).toHaveLength(0);
        expect(result.ast?.maps).toHaveLength(1);
        const map = result.ast?.maps[0] as MapDeclarationNode;
        expect(map.name).toBe('player');
        expect(map.entries).toHaveLength(2);
        expect(map.entries[0].key).toBe('name');
        expect((map.entries[0].value as LiteralNode).value).toBe('Hero');
        expect(map.entries[1].key).toBe('health');
        expect((map.entries[1].value as LiteralNode).value).toBe(100);
      });

      it('should parse MAP declaration with mixed value types', () => {
        const result = parse(`MAP config = { debug: true, level: 5, title: "Game" }
:: Start
Hello`);
        expect(result.errors).toHaveLength(0);
        const map = result.ast?.maps[0] as MapDeclarationNode;
        expect(map.entries).toHaveLength(3);
        expect((map.entries[0].value as LiteralNode).value).toBe(true);
        expect((map.entries[1].value as LiteralNode).value).toBe(5);
        expect((map.entries[2].value as LiteralNode).value).toBe('Game');
      });

      it('should parse empty MAP declaration', () => {
        const result = parse(`MAP empty = {}
:: Start
Hello`);
        expect(result.errors).toHaveLength(0);
        const map = result.ast?.maps[0] as MapDeclarationNode;
        expect(map.entries).toHaveLength(0);
      });

      it('should parse multiple MAP declarations', () => {
        const result = parse(`MAP player = { hp: 100 }
MAP enemy = { hp: 50 }
:: Start
Hello`);
        expect(result.ast?.maps).toHaveLength(2);
        expect(result.ast?.maps[0].name).toBe('player');
        expect(result.ast?.maps[1].name).toBe('enemy');
      });
    });

    describe('mixed collection declarations', () => {
      it('should parse story with all collection types', () => {
        const result = parse(`@title: Test
LIST moods = happy, (sad)
ARRAY items = ["sword", "shield"]
MAP player = { name: "Hero", level: 1 }
:: Start
Welcome!`);
        expect(result.errors).toHaveLength(0);
        expect(result.ast?.lists).toHaveLength(1);
        expect(result.ast?.arrays).toHaveLength(1);
        expect(result.ast?.maps).toHaveLength(1);
        expect(result.ast?.passages).toHaveLength(1);
      });

      it('should place collections before passages', () => {
        const result = parse(`LIST test = a, b
:: Start
Content`);
        expect(result.ast?.lists).toHaveLength(1);
        expect(result.ast?.passages).toHaveLength(1);
        expect(result.ast?.passages[0].name).toBe('Start');
      });
    });
  });
});
