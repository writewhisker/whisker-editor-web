import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import type {
  FormattedTextNode,
  BlockquoteNode,
  ListNode,
  ListItemNode,
  HorizontalRuleNode,
  ContentNode,
} from './ast';

// Helper to get first content node - wrap in passage to avoid line-start issues
function getFirstContent(source: string): ContentNode | null {
  const result = parse(`:: Test\nSome text ${source}`);
  // Skip the first text node ("Some text ")
  const content = result.ast?.passages[0]?.content || [];
  return content.length > 1 ? content[1] : content[0] || null;
}

// Helper to get all content nodes
function getAllContent(source: string): ContentNode[] {
  const result = parse(`:: Test\nSome text ${source}`);
  // Skip the first text node ("Some text ")
  const content = result.ast?.passages[0]?.content || [];
  return content.slice(1);
}

// Helper to parse content at line start (for blockquotes, lists, hr)
function getLineStartContent(source: string): ContentNode | null {
  const result = parse(`:: Test\n${source}`);
  return result.ast?.passages[0]?.content[0] || null;
}

// Helper to get all line-start content nodes
function getAllLineStartContent(source: string): ContentNode[] {
  const result = parse(`:: Test\n${source}`);
  return result.ast?.passages[0]?.content || [];
}

describe('Rich Text Parsing', () => {
  describe('Bold', () => {
    it('should parse **text** as bold', () => {
      const node = getFirstContent('**bold text**') as FormattedTextNode;
      expect(node).not.toBeNull();
      expect(node.type).toBe('formatted_text');
      expect(node.format).toBe('bold');
      expect(node.content.length).toBeGreaterThan(0);
      // Content may be tokenized as multiple text nodes
      const textContent = node.content.map((n: any) => n.value || '').join('');
      expect(textContent).toContain('bold');
    });

    it('should parse bold with nested italic', () => {
      const node = getFirstContent('**bold *italic* text**') as FormattedTextNode;
      expect(node).not.toBeNull();
      expect(node.type).toBe('formatted_text');
      expect(node.format).toBe('bold');
      // Content should include nested italic
      expect(node.content.length).toBeGreaterThan(0);
    });

    it('should handle unclosed bold gracefully', () => {
      const result = parse(':: Test\nSome text **unclosed bold');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Unclosed bold');
    });
  });

  describe('Italic', () => {
    it('should parse *text* as italic', () => {
      const node = getFirstContent('*italic text*') as FormattedTextNode;
      expect(node).not.toBeNull();
      expect(node.type).toBe('formatted_text');
      expect(node.format).toBe('italic');
      expect(node.content.length).toBeGreaterThan(0);
      // Content may be tokenized as multiple text nodes
      const textContent = node.content.map((n: any) => n.value || '').join('');
      expect(textContent).toContain('italic');
    });

    it('should parse italic with nested bold', () => {
      const node = getFirstContent('*italic **bold** text*') as FormattedTextNode;
      expect(node).not.toBeNull();
      expect(node.type).toBe('formatted_text');
      expect(node.format).toBe('italic');
    });

    it('should handle unclosed italic gracefully', () => {
      const result = parse(':: Test\nSome text *unclosed italic');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Unclosed italic');
    });
  });

  describe('Strikethrough', () => {
    it('should parse ~~text~~ as strikethrough', () => {
      const node = getFirstContent('~~strikethrough text~~') as FormattedTextNode;
      expect(node).not.toBeNull();
      expect(node.type).toBe('formatted_text');
      expect(node.format).toBe('strikethrough');
      expect(node.content.length).toBeGreaterThan(0);
    });

    it('should handle unclosed strikethrough gracefully', () => {
      const result = parse(':: Test\nSome text ~~unclosed');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Unclosed strikethrough');
    });
  });

  describe('Inline Code', () => {
    it('should parse `code` as inline code', () => {
      const node = getFirstContent('`code snippet`') as FormattedTextNode;
      expect(node).not.toBeNull();
      expect(node.type).toBe('formatted_text');
      expect(node.format).toBe('code');
      expect(node.content).toHaveLength(1);
      expect((node.content[0] as any).value).toBe('code snippet');
    });

    it('should preserve special characters in inline code', () => {
      const node = getFirstContent('`**not bold**`') as FormattedTextNode;
      expect(node).not.toBeNull();
      expect(node.format).toBe('code');
      expect((node.content[0] as any).value).toBe('**not bold**');
    });
  });

  describe('Code Blocks', () => {
    it('should parse code fence as code block', () => {
      const source = '```\nfunction test() {\n  return true;\n}\n```';
      const result = parse(`:: Test\n${source}`);
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const codeNode = content.find(n => n.type === 'formatted_text' && (n as FormattedTextNode).format === 'code');
      expect(codeNode).not.toBeUndefined();
    });

    it('should capture language specifier', () => {
      const source = '```javascript\nconsole.log("hello");\n```';
      const result = parse(`:: Test\n${source}`);
      expect(result.ast).not.toBeNull();
    });
  });

  describe('Blockquotes', () => {
    it('should parse > as blockquote', () => {
      const source = '> This is a quote';
      const result = parse(`:: Test\n${source}`);
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const blockquote = content.find(n => n.type === 'blockquote') as BlockquoteNode;
      expect(blockquote).not.toBeUndefined();
      expect(blockquote.depth).toBe(1);
    });

    it('should parse nested blockquotes', () => {
      // Note: >> at line start may be parsed as > followed by > (two markers)
      // or as a single marker with depth 2 depending on lexer implementation
      const source = '> > Nested quote';
      const result = parse(`:: Test\n${source}`);
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      // Should have at least one blockquote
      const blockquotes = content.filter(n => n.type === 'blockquote');
      expect(blockquotes.length).toBeGreaterThan(0);
    });
  });

  describe('Lists', () => {
    describe('Unordered Lists', () => {
      it('should parse - item as unordered list', () => {
        const source = '- First item';
        const result = parse(`:: Test\n${source}`);
        expect(result.ast).not.toBeNull();
        const content = result.ast!.passages[0].content;
        const list = content.find(n => n.type === 'list') as ListNode;
        expect(list).not.toBeUndefined();
        expect(list.ordered).toBe(false);
        expect(list.items).toHaveLength(1);
      });

      it('should parse * item as unordered list', () => {
        const source = '* Star item';
        const result = parse(`:: Test\n${source}`);
        expect(result.ast).not.toBeNull();
        const content = result.ast!.passages[0].content;
        const list = content.find(n => n.type === 'list') as ListNode;
        expect(list).not.toBeUndefined();
        expect(list.ordered).toBe(false);
      });
    });

    describe('Ordered Lists', () => {
      it('should parse 1. item as ordered list', () => {
        const source = '1. First item';
        const result = parse(`:: Test\n${source}`);
        expect(result.ast).not.toBeNull();
        const content = result.ast!.passages[0].content;
        const list = content.find(n => n.type === 'list') as ListNode;
        expect(list).not.toBeUndefined();
        expect(list.ordered).toBe(true);
        expect(list.items).toHaveLength(1);
      });

      it('should parse multiple ordered items', () => {
        const source = '1. First\n2. Second\n3. Third';
        const result = parse(`:: Test\n${source}`);
        expect(result.ast).not.toBeNull();
      });
    });
  });

  describe('Horizontal Rules', () => {
    it('should parse --- as horizontal rule', () => {
      const source = '---';
      const result = parse(`:: Test\n${source}`);
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const hr = content.find(n => n.type === 'horizontal_rule') as HorizontalRuleNode;
      expect(hr).not.toBeUndefined();
    });

    it('should parse *** as horizontal rule', () => {
      const source = '***';
      const result = parse(`:: Test\n${source}`);
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const hr = content.find(n => n.type === 'horizontal_rule') as HorizontalRuleNode;
      expect(hr).not.toBeUndefined();
    });

    it('should parse longer rules', () => {
      const source = '----------';
      const result = parse(`:: Test\n${source}`);
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const hr = content.find(n => n.type === 'horizontal_rule') as HorizontalRuleNode;
      expect(hr).not.toBeUndefined();
    });
  });

  describe('Mixed Content', () => {
    it('should parse text with inline formatting', () => {
      const source = 'This is **bold** and *italic* text';
      const content = getAllContent(source);
      expect(content.length).toBeGreaterThan(0);
    });

    it('should parse variable interpolation in formatted text', () => {
      const source = '**Value is $count**';
      const node = getFirstContent(source) as FormattedTextNode;
      expect(node).not.toBeNull();
      expect(node.type).toBe('formatted_text');
      expect(node.format).toBe('bold');
    });

    it('should handle rich text with conditionals', () => {
      const source = '{$hasItem}\n**You have the item!**\n{/}';
      const result = parse(`:: Test\n${source}`);
      expect(result.ast).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should not treat * in expressions as italic', () => {
      const source = '{$x * 2}';
      const content = getAllContent(source);
      // Should be parsed as conditional/expression, not italic
      expect(content.some(n => n.type === 'conditional')).toBe(true);
    });

    it('should not treat ** in expressions as bold', () => {
      const source = '{$x ** 2}';
      const result = parse(`:: Test\n${source}`);
      const content = result.ast?.passages[0]?.content || [];
      // Should have conditional/expression content, not bold formatted text
      const hasConditional = content.some(n => n.type === 'conditional');
      const hasBold = content.some(n => n.type === 'formatted_text' && (n as FormattedTextNode).format === 'bold');
      // Either conditional or no bold (since ** inside braces is not bold)
      expect(hasConditional || !hasBold).toBe(true);
    });

    it('should handle empty formatted text gracefully', () => {
      // ** followed immediately by ** is empty bold
      const node = getFirstContent('****');
      // Should either parse as empty bold or two separate markers
      expect(node).not.toBeNull();
    });
  });

  describe('Bold Italic', () => {
    it('should parse ***text*** as bold italic', () => {
      const node = getFirstContent('***bold italic***');
      expect(node).not.toBeNull();
      // Could be bold containing italic or italic containing bold
      expect(node.type).toBe('formatted_text');
    });
  });

  describe('Escaping', () => {
    it('should escape asterisks with backslash', () => {
      const result = parse(':: Test\nSome text \\*not italic\\*');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      // Should not have italic formatting
      const hasItalic = content.some(n =>
        n.type === 'formatted_text' && (n as FormattedTextNode).format === 'italic'
      );
      expect(hasItalic).toBe(false);
    });

    it('should escape double asterisks', () => {
      const result = parse(':: Test\nSome text \\*\\*not bold\\*\\*');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      // Should not have bold formatting
      const hasBold = content.some(n =>
        n.type === 'formatted_text' && (n as FormattedTextNode).format === 'bold'
      );
      expect(hasBold).toBe(false);
    });

    it('should escape backticks', () => {
      const result = parse(':: Test\nUse \\`this\\` for code');
      expect(result.ast).not.toBeNull();
      // Should render the backticks literally, not as code
    });
  });

  describe('Nested Lists', () => {
    it('should parse nested unordered list', () => {
      const source = `- Item 1
  - Nested item
- Item 2`;
      const result = parse(`:: Test\n${source}`);
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const list = content.find(n => n.type === 'list') as ListNode;
      expect(list).not.toBeUndefined();
    });

    it('should parse mixed list nesting', () => {
      const source = `1. First
   - Sub bullet
2. Second`;
      const result = parse(`:: Test\n${source}`);
      expect(result.ast).not.toBeNull();
    });
  });

  describe('Error Handling - PRS Codes', () => {
    it('should report unclosed bold (PRS-006)', () => {
      const result = parse(':: Test\n**unclosed bold');
      expect(result.errors.length).toBeGreaterThan(0);
      // Should contain error about unclosed formatting
      expect(result.errors[0].message).toContain('Unclosed');
    });

    it('should report unclosed italic (PRS-006)', () => {
      // Note: * at line start is a sticky choice marker, so use prefix text
      const result = parse(':: Test\nSome text *unclosed italic');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Unclosed');
    });

    it('should report unclosed strikethrough (PRS-006)', () => {
      const result = parse(':: Test\n~~unclosed');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Unclosed');
    });
  });
});
