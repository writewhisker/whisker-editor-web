/**
 * Macro Lexer
 *
 * Tokenizes template strings containing macros.
 * Handles {{macro}} syntax and distinguishes between text and macro tokens.
 */

import type { MacroToken } from './types';

/**
 * Lexer for macro templates
 */
export class MacroLexer {
  private delimiterStart: string;
  private delimiterEnd: string;

  constructor(delimiterStart: string = '{{', delimiterEnd: string = '}}') {
    this.delimiterStart = delimiterStart;
    this.delimiterEnd = delimiterEnd;
  }

  /**
   * Tokenize a template string
   */
  tokenize(template: string): MacroToken[] {
    const tokens: MacroToken[] = [];
    let position = 0;
    let line = 1;

    while (position < template.length) {
      // Find next macro start
      const macroStart = template.indexOf(this.delimiterStart, position);

      if (macroStart === -1) {
        // No more macros, rest is text
        if (position < template.length) {
          tokens.push({
            type: 'text',
            text: template.substring(position),
            start: position,
            end: template.length,
            line,
          });
        }
        break;
      }

      // Add text before macro if any
      if (macroStart > position) {
        const text = template.substring(position, macroStart);
        tokens.push({
          type: 'text',
          text,
          start: position,
          end: macroStart,
          line,
        });

        // Update line count
        line += (text.match(/\n/g) || []).length;
      }

      // Find macro end
      const macroEnd = template.indexOf(this.delimiterEnd, macroStart + this.delimiterStart.length);

      if (macroEnd === -1) {
        throw new Error(`Unclosed macro at position ${macroStart}, line ${line}`);
      }

      // Extract macro content
      const macroContent = template.substring(
        macroStart + this.delimiterStart.length,
        macroEnd
      ).trim();

      // Parse macro
      const macroToken = this.parseMacro(macroContent, macroStart, macroEnd + this.delimiterEnd.length, line);
      tokens.push(macroToken);

      position = macroEnd + this.delimiterEnd.length;
    }

    return tokens;
  }

  /**
   * Parse a single macro token
   */
  private parseMacro(content: string, start: number, end: number, line: number): MacroToken {
    // Check for end tag
    if (content.startsWith('end') || content.startsWith('/')) {
      const endName = content.replace(/^(end|\/)\s*/, '').trim();
      return {
        type: 'end',
        name: endName || undefined,
        start,
        end,
        line,
      };
    }

    // Split into name and args
    const spaceIndex = content.indexOf(' ');
    let name: string;
    let args: string;

    if (spaceIndex === -1) {
      name = content;
      args = '';
    } else {
      name = content.substring(0, spaceIndex);
      args = content.substring(spaceIndex + 1).trim();
    }

    return {
      type: 'macro',
      name,
      args,
      start,
      end,
      line,
    };
  }

  /**
   * Find matching end token for a block macro
   */
  static findMatchingEnd(tokens: MacroToken[], startIndex: number): number {
    const startToken = tokens[startIndex];
    if (startToken.type !== 'macro') {
      throw new Error('Start token must be a macro');
    }

    const macroName = startToken.name;
    let depth = 1;

    for (let i = startIndex + 1; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'macro' && token.name === macroName) {
        // Nested macro of same type
        depth++;
      } else if (token.type === 'end' && (token.name === macroName || !token.name)) {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }

    throw new Error(`No matching {{end}} for {{${macroName}}} at line ${startToken.line}`);
  }

  /**
   * Extract content between start and end tokens
   */
  static extractContent(tokens: MacroToken[], startIndex: number, endIndex: number): string {
    const contentTokens = tokens.slice(startIndex + 1, endIndex);
    return contentTokens.map(t => {
      if (t.type === 'text') {
        return t.text;
      } else if (t.type === 'macro') {
        return `{{${t.name}${t.args ? ' ' + t.args : ''}}}`;
      } else {
        return `{{end${t.name ? ' ' + t.name : ''}}}`;
      }
    }).join('');
  }
}
