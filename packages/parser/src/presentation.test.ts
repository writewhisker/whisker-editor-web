/**
 * Presentation Layer Tests - CSS Classes and Theming
 * Tests for WLS Chapter 13 presentation features
 */

import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import type {
  ThemeDirectiveNode,
  StyleBlockNode,
  ClassedBlockNode,
  ClassedInlineNode,
} from './ast';

describe('Presentation Layer', () => {
  describe('THEME directive', () => {
    it('should parse THEME directive with theme name', () => {
      const result = parse('THEME "dark"\n:: Start\nHello!');
      expect(result.ast).not.toBeNull();
      expect(result.ast!.theme).not.toBeNull();
      expect(result.ast!.theme!.type).toBe('theme_directive');
      expect(result.ast!.theme!.themeName).toBe('dark');
    });

    it('should parse THEME with various built-in themes', () => {
      const themes = ['default', 'dark', 'classic', 'minimal', 'sepia'];
      for (const themeName of themes) {
        const result = parse(`THEME "${themeName}"\n:: Start\nHello!`);
        expect(result.ast?.theme?.themeName).toBe(themeName);
      }
    });

    it('should report error for missing theme name', () => {
      const result = parse('THEME\n:: Start\nHello!');
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('theme name');
    });
  });

  describe('STYLE block', () => {
    it('should parse STYLE block with CSS custom properties', () => {
      const result = parse(`STYLE {
  --bg-color: #1a1a2e;
  --text-color: #eee;
}
:: Start
Hello!`);
      expect(result.ast).not.toBeNull();
      expect(result.ast!.styles).not.toBeNull();
      expect(result.ast!.styles!.type).toBe('style_block');
      expect(result.ast!.styles!.properties.get('--bg-color')).toBe('#1a1a2e');
      expect(result.ast!.styles!.properties.get('--text-color')).toBe('#eee');
    });

    it('should parse STYLE block with accent color', () => {
      const result = parse(`STYLE {
  --accent-color: #e94560;
}
:: Start
Hello!`);
      expect(result.ast).not.toBeNull();
      expect(result.ast!.styles!.properties.get('--accent-color')).toBe('#e94560');
    });

    it('should report error for missing opening brace', () => {
      const result = parse('STYLE\n--color: red;\n:: Start\nHello!');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Block-level CSS classes', () => {
    it('should parse .class { content } block', () => {
      const result = parse(`:: Start
.warning {
The bridge looks unstable.
}`);
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const classedBlock = content.find(n => n.type === 'classed_block') as ClassedBlockNode;
      expect(classedBlock).not.toBeUndefined();
      expect(classedBlock.classes).toContain('warning');
      expect(classedBlock.content.length).toBeGreaterThan(0);
    });

    it('should parse multiple CSS classes', () => {
      const result = parse(`:: Start
.dialog.merchant {
"Welcome, traveler!"
}`);
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const classedBlock = content.find(n => n.type === 'classed_block') as ClassedBlockNode;
      expect(classedBlock).not.toBeUndefined();
      expect(classedBlock.classes).toContain('dialog');
      expect(classedBlock.classes).toContain('merchant');
    });

    it('should parse nested content in classed blocks', () => {
      const result = parse(`:: Start
.important {
This is **bold** text inside.
}`);
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const classedBlock = content.find(n => n.type === 'classed_block') as ClassedBlockNode;
      expect(classedBlock).not.toBeUndefined();
      // Should have nested bold
      const hasBold = classedBlock.content.some(n =>
        n.type === 'formatted_text' && (n as any).format === 'bold'
      );
      expect(hasBold).toBe(true);
    });
  });

  describe('Inline CSS classes', () => {
    it('should parse [.class content] inline', () => {
      const result = parse(':: Start\nYou deal [.damage 15 damage] to the goblin.');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const classedInline = content.find(n => n.type === 'classed_inline') as ClassedInlineNode;
      expect(classedInline).not.toBeUndefined();
      expect(classedInline.classes).toContain('damage');
    });

    it('should parse multiple inline classes', () => {
      const result = parse(':: Start\nYou take [.damage.critical 30 damage]!');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const classedInline = content.find(n => n.type === 'classed_inline') as ClassedInlineNode;
      expect(classedInline).not.toBeUndefined();
      expect(classedInline.classes).toContain('damage');
      expect(classedInline.classes).toContain('critical');
    });

    it('should parse inline class with variable interpolation', () => {
      const result = parse(':: Start\nDamage: [.value $damage]');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const classedInline = content.find(n => n.type === 'classed_inline') as ClassedInlineNode;
      expect(classedInline).not.toBeUndefined();
      expect(classedInline.classes).toContain('value');
    });
  });

  describe('Choice classes', () => {
    it('should parse choice with class in text', () => {
      const result = parse(':: Start\n+ [[.safe Go around]] -> SafePath');
      expect(result.ast).not.toBeNull();
      // Choice should be parsed, and the text content should include classed inline
      const content = result.ast!.passages[0].content;
      const choice = content.find(n => n.type === 'choice');
      expect(choice).not.toBeUndefined();
    });
  });

  describe('Combined THEME and STYLE', () => {
    it('should parse both THEME and STYLE together', () => {
      const result = parse(`THEME "dark"
STYLE {
  --accent-color: #e94560;
}
:: Start
Hello!`);
      expect(result.ast).not.toBeNull();
      expect(result.ast!.theme).not.toBeNull();
      expect(result.ast!.theme!.themeName).toBe('dark');
      expect(result.ast!.styles).not.toBeNull();
      expect(result.ast!.styles!.properties.get('--accent-color')).toBe('#e94560');
    });
  });

  describe('Edge cases', () => {
    it('should handle classed block with empty content', () => {
      const result = parse(`:: Start
.empty {
}`);
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const classedBlock = content.find(n => n.type === 'classed_block') as ClassedBlockNode;
      expect(classedBlock).not.toBeUndefined();
      expect(classedBlock.classes).toContain('empty');
    });

    it('should handle inline class with empty content', () => {
      const result = parse(':: Start\nStatus: [.status]');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      const classedInline = content.find(n => n.type === 'classed_inline') as ClassedInlineNode;
      expect(classedInline).not.toBeUndefined();
    });

    it('should not confuse . in text with CSS class', () => {
      const result = parse(':: Start\nEnd of sentence. Next sentence.');
      expect(result.ast).not.toBeNull();
      const content = result.ast!.passages[0].content;
      // Should not have any classed blocks since . is followed by space
      const hasClassedBlock = content.some(n => n.type === 'classed_block');
      expect(hasClassedBlock).toBe(false);
    });
  });
});
