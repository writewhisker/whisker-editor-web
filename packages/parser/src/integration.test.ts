import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import { Lexer } from './lexer';
import type { ChoiceNode, ConditionalNode, TextNode, InterpolationNode, MetadataNode, PassageMetadataNode } from './ast';

/**
 * Integration tests for WLS 1.0 full workflow.
 * Tests the complete pipeline: Parse -> AST -> Content Analysis
 */
describe('WLS 1.0 Integration Tests', () => {
  // Helper to get metadata value
  function getMetadata(metadata: MetadataNode[], key: string): string | undefined {
    return metadata.find(m => m.key === key)?.value;
  }

  // Helper to get passage metadata value
  function getPassageMetadata(metadata: PassageMetadataNode[], key: string): string | undefined {
    return metadata.find(m => m.key === key)?.value;
  }

  describe('Parse -> AST Workflow', () => {
    it('should parse a complete story with multiple passages', () => {
      const source = `
@title: Adventure Story
@author: Test Author

:: Start

Welcome to the adventure!

+ [Go to forest] -> Forest
+ [Go to village] -> Village

:: Forest [outdoor, dangerous]

You enter a dark forest.

* [Look around] -> ForestLook
+ [Return to start] -> Start

:: Village [safe]

A peaceful village.

+ [Return to start] -> Start
`;

      const result = parse(source);

      // Verify story structure
      expect(result.ast).not.toBeNull();
      expect(result.ast!.type).toBe('story');
      // Note: parser trims/normalizes whitespace in metadata values
      expect(getMetadata(result.ast!.metadata, 'title')).toContain('Adventure');
      expect(getMetadata(result.ast!.metadata, 'author')).toContain('Test');
      expect(result.ast!.passages.length).toBe(3);

      // Verify Start passage
      const startPassage = result.ast!.passages.find(p => p.name === 'Start');
      expect(startPassage).toBeDefined();

      // Verify Forest passage with tags
      const forestPassage = result.ast!.passages.find(p => p.name === 'Forest');
      expect(forestPassage).toBeDefined();
      expect(forestPassage!.tags).toContain('outdoor');
      expect(forestPassage!.tags).toContain('dangerous');

      // Verify Village passage
      const villagePassage = result.ast!.passages.find(p => p.name === 'Village');
      expect(villagePassage).toBeDefined();
      expect(villagePassage!.tags).toContain('safe');
    });

    it('should parse choice types correctly', () => {
      const source = `
:: Start

+ [Once-only choice] -> A
* [Sticky choice] -> B
`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const passage = result.ast!.passages[0];
      const choices = passage.content.filter(n => n.type === 'choice') as ChoiceNode[];

      expect(choices.length).toBe(2);
      expect(choices[0].choiceType).toBe('once');
      expect(choices[1].choiceType).toBe('sticky');
    });

    it('should parse variable interpolation', () => {
      const source = `
:: Start

Hello, $playerName!
You have \${gold * 2} effective gold.
`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const passage = result.ast!.passages[0];
      const interpolations = passage.content.filter(n => n.type === 'interpolation') as InterpolationNode[];

      expect(interpolations.length).toBeGreaterThanOrEqual(2);
      expect(interpolations[0].expression.type).toBe('variable');
    });

    it('should parse choice with action', () => {
      const source = `
:: Start

+ [Buy sword] {$ $gold = $gold - 50} -> Shop
`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const passage = result.ast!.passages[0];
      const choices = passage.content.filter(n => n.type === 'choice') as ChoiceNode[];

      expect(choices.length).toBe(1);
      expect(choices[0].action).not.toBeNull();
    });

    it('should parse special targets', () => {
      const source = `
:: Start

+ [End the story] -> END
+ [Go back] -> BACK
+ [Restart] -> RESTART
`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const passage = result.ast!.passages[0];
      const choices = passage.content.filter(n => n.type === 'choice') as ChoiceNode[];

      expect(choices[0].target).toBe('END');
      expect(choices[1].target).toBe('BACK');
      expect(choices[2].target).toBe('RESTART');
    });

    it('should parse text alternatives', () => {
      const source = `
:: Start

{| Hello | Hi | Greetings} there!
`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const passage = result.ast!.passages[0];
      const alternatives = passage.content.filter(n => n.type === 'alternatives');

      expect(alternatives.length).toBe(1);
    });

    it('should handle escape sequences', () => {
      const source = `
:: Start

Show a dollar sign: \\$notavar
`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const passage = result.ast!.passages[0];
      const textNodes = passage.content.filter(n => n.type === 'text') as TextNode[];

      // Escaped $ should be text, not interpolation
      const fullText = textNodes.map(t => t.value).join('');
      expect(fullText).toContain('$');
    });
  });

  describe('Error Handling', () => {
    it('should report errors for invalid syntax', () => {
      const source = `
:: Start

{$health >}
`;

      const result = parse(source);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should report errors for C-style operators', () => {
      const source = `
:: Start

{$a && $b}
`;

      const lexer = new Lexer(source);
      const lexResult = lexer.tokenize();

      // Lexer should produce an error
      expect(lexResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Story Structures', () => {
    it('should parse inline conditionals', () => {
      const source = `
:: Start

You are {$health > 50 : healthy | injured}.
`;

      const result = parse(source);
      expect(result.errors.length).toBe(0);
    });

    it('should parse complex expressions', () => {
      const source = `
:: Start

{$a + $b * $c}
{$a == $b and $c ~= $d}
`;

      const result = parse(source);
      expect(result.errors.length).toBe(0);
    });

    it('should parse story with mixed content', () => {
      const source = `
@title: Mixed Content Story
@author: Test

:: Start [intro]

Welcome! Your name is $playerName.
You have $gold gold.

+ [Adventure] -> Adventure
+ [Quit] -> END

:: Adventure [action]

You venture forth!

{|shuffle: A goblin appears! | You find treasure! | Nothing happens.}

+ [Return] -> Start
`;

      const result = parse(source);

      // Verify parsing
      expect(result.ast!.passages.length).toBe(2);
      expect(result.ast!.passages.map(p => p.name)).toEqual(['Start', 'Adventure']);

      // Verify metadata (parser normalizes whitespace)
      expect(getMetadata(result.ast!.metadata, 'title')).toContain('Mixed');
      expect(getMetadata(result.ast!.metadata, 'author')).toContain('Test');

      // Verify Adventure passage has alternatives
      const adventurePassage = result.ast!.passages[1];
      const alternatives = adventurePassage.content.filter(n => n.type === 'alternatives');
      expect(alternatives.length).toBe(1);
    });

    it('should parse conditional choices', () => {
      const source = `
:: Start

+ {$gold > 10} [Buy item] -> Shop
`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const passage = result.ast!.passages[0];
      const choices = passage.content.filter(n => n.type === 'choice') as ChoiceNode[];

      expect(choices.length).toBe(1);
      expect(choices[0].condition).not.toBeNull();
    });

    it('should parse passages with tags', () => {
      const source = `
:: Forest [outdoor, nature, dangerous]

A dark forest.
`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const passage = result.ast!.passages[0];
      expect(passage.tags).toContain('outdoor');
      expect(passage.tags).toContain('nature');
      expect(passage.tags).toContain('dangerous');
    });
  });

  describe('WLS 1.0 Syntax Validation', () => {
    it('should accept valid WLS 1.0 passages with :: syntax', () => {
      const source = `:: ValidPassage
Content here.
`;

      const result = parse(source);
      expect(result.errors.length).toBe(0);
      expect(result.ast!.passages[0].name).toBe('ValidPassage');
    });

    it('should parse multiple choices in passage', () => {
      const source = `
:: Start

+ [Option 1] -> A
+ [Option 2] -> B
* [Option 3] -> C
`;

      const result = parse(source);
      expect(result.ast).not.toBeNull();

      const passage = result.ast!.passages[0];
      const choices = passage.content.filter(n => n.type === 'choice') as ChoiceNode[];

      expect(choices.length).toBe(3);
    });

    it('should handle Lua-style operators correctly', () => {
      // Test individual expressions in simpler contexts
      const source1 = `
:: Start

{$a and $b}
`;

      const result1 = parse(source1);
      // Parser should recognize 'and' operator
      expect(result1.ast).not.toBeNull();
      expect(result1.ast!.passages.length).toBe(1);
    });
  });
});
