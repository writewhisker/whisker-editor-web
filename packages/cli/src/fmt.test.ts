/**
 * whisker-fmt Tests
 * Tests for the WLS story formatter
 */

import { describe, it, expect } from 'vitest';
import { formatSource, FormatOptions } from './fmt';

describe('whisker-fmt', () => {
  const defaultOptions: FormatOptions = { indent: 2, lineLength: 80 };

  describe('formatSource', () => {
    it('should normalize passage markers', () => {
      const input = '::Start\nHello!';
      const output = formatSource(input, defaultOptions);
      expect(output).toContain(':: Start');
    });

    it('should add blank line between passages', () => {
      const input = ':: Start\nHello!\n:: End\nGoodbye!';
      const output = formatSource(input, defaultOptions);
      expect(output).toContain('\n\n:: End');
    });

    it('should normalize choice markers', () => {
      const input = ':: Start\n+   Go left';
      const output = formatSource(input, defaultOptions);
      expect(output).toContain('+ Go left');
    });

    it('should normalize gather markers', () => {
      const input = ':: Start\n-   Continue';
      const output = formatSource(input, defaultOptions);
      expect(output).toContain('- Continue');
    });

    it('should remove trailing whitespace', () => {
      const input = ':: Start   \nHello!   ';
      const output = formatSource(input, defaultOptions);
      expect(output).not.toMatch(/\s+\n/);
    });

    it('should collapse multiple blank lines', () => {
      const input = ':: Start\nHello!\n\n\n\n:: End\nGoodbye!';
      const output = formatSource(input, defaultOptions);
      // Should have at most two consecutive newlines (one blank line)
      expect(output).not.toContain('\n\n\n');
    });

    it('should ensure single trailing newline', () => {
      const input = ':: Start\nHello!';
      const output = formatSource(input, defaultOptions);
      expect(output).toMatch(/\n$/);
      expect(output).not.toMatch(/\n\n$/);
    });

    it('should preserve passage tags', () => {
      const input = ':: Start [tag1, tag2]\nHello!';
      const output = formatSource(input, defaultOptions);
      expect(output).toContain(':: Start [tag1, tag2]');
    });

    it('should handle empty input', () => {
      const input = '';
      const output = formatSource(input, defaultOptions);
      expect(output).toBe('\n');
    });

    it('should handle whitespace-only input', () => {
      const input = '   \n\n   ';
      const output = formatSource(input, defaultOptions);
      expect(output).toBe('\n');
    });
  });

  describe('complex stories', () => {
    it('should format a complete story', () => {
      const input = `::Start
Welcome to the story!
+Go to shop->Shop
+Go home->Home
::Shop
You browse the wares.
::Home
You rest at home.`;

      const output = formatSource(input, defaultOptions);

      // Check passage formatting
      expect(output).toContain(':: Start');
      expect(output).toContain(':: Shop');
      expect(output).toContain(':: Home');

      // Check blank lines between passages
      expect(output).toContain('\n\n:: Shop');
      expect(output).toContain('\n\n:: Home');

      // Check choice formatting
      expect(output).toContain('+ Go to shop->Shop');
      expect(output).toContain('+ Go home->Home');
    });
  });
});
