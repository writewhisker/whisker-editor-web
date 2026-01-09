/**
 * Syntax Validator
 *
 * Validates passage content using the WLS parser to detect syntax errors.
 */

import type { Story } from '@writewhisker/story-models';
import { parse, type ParseError } from '@writewhisker/parser';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class WlsSyntaxValidator implements Validator {
  name = 'wls_syntax';
  category = 'syntax' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const allPassages = Array.from(story.passages.values());

    for (const passage of allPassages) {
      // Parse the passage content as WLS
      const wlsContent = this.buildWlsContent(passage);
      const result = parse(wlsContent);

      // Add any parse errors as validation issues
      for (const error of result.errors) {
        issues.push(this.parseErrorToIssue(error, passage.id, passage.title));
      }

      // WLS-SYN-003: Check for unmatched Lua keywords
      issues.push(...this.validateKeywordBalance(passage.content, passage.id, passage.title));
    }

    return issues;
  }

  /**
   * Build WLS content from a passage for parsing
   */
  private buildWlsContent(passage: { id: string; title: string; content: string; choices: Array<{ text: string; target?: string }> }): string {
    // Build a minimal WLS passage for parsing
    let wlsContent = `:: ${passage.title}\n`;
    wlsContent += passage.content;

    // Add choices
    for (const choice of passage.choices) {
      wlsContent += `\n+ [${choice.text}]`;
      if (choice.target) {
        wlsContent += ` -> ${choice.target}`;
      }
    }

    return wlsContent;
  }

  /**
   * Convert a parse error to a validation issue
   */
  private parseErrorToIssue(error: ParseError, passageId: string, passageTitle: string): ValidationIssue {
    return {
      id: `wls_syntax_${passageId}_${error.location.start.line}_${error.location.start.column}`,
      code: 'WLS-SYN-001',
      severity: 'error',
      category: 'syntax',
      message: `Syntax error in "${passageTitle}"`,
      description: `${error.message} at line ${error.location.start.line}, column ${error.location.start.column}${error.suggestion ? `. ${error.suggestion}` : ''}`,
      passageId,
      passageTitle,
      context: { passageName: passageTitle, line: error.location.start.line, column: error.location.start.column },
      fixable: false,
    };
  }

  /**
   * Validate balanced Lua keywords (WLS-SYN-003)
   * Checks for unmatched function/end, if/then/end, etc.
   */
  private validateKeywordBalance(content: string, passageId: string, passageTitle: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const openKeywords = ['function', 'if', 'for', 'while', 'do'];
    let openCount = 0;
    let repeatCount = 0;

    // Simple keyword counting - look for word boundaries
    const wordPattern = /\b(function|if|for|while|do|repeat|until|end)\b/gi;
    let match;

    while ((match = wordPattern.exec(content)) !== null) {
      const keyword = match[1].toLowerCase();
      if (openKeywords.includes(keyword)) {
        openCount++;
      } else if (keyword === 'repeat') {
        repeatCount++;
      } else if (keyword === 'end') {
        openCount--;
      } else if (keyword === 'until') {
        repeatCount--;
      }
    }

    if (openCount > 0) {
      issues.push({
        id: `unmatched_keywords_${passageId}`,
        code: 'WLS-SYN-003',
        severity: 'error',
        category: 'syntax',
        message: `Unmatched Lua keywords in "${passageTitle}"`,
        description: `Found ${openCount} unmatched block opener(s). Check that all function/if/for/while blocks have matching "end" keywords.`,
        passageId,
        passageTitle,
        context: { unmatchedCount: openCount },
        fixable: false,
      });
    } else if (openCount < 0) {
      issues.push({
        id: `extra_end_${passageId}`,
        code: 'WLS-SYN-003',
        severity: 'error',
        category: 'syntax',
        message: `Extra "end" keywords in "${passageTitle}"`,
        description: `Found ${Math.abs(openCount)} extra "end" keyword(s) without matching openers.`,
        passageId,
        passageTitle,
        context: { extraCount: Math.abs(openCount) },
        fixable: false,
      });
    }

    if (repeatCount !== 0) {
      issues.push({
        id: `unmatched_repeat_${passageId}`,
        code: 'WLS-SYN-003',
        severity: 'error',
        category: 'syntax',
        message: `Unmatched repeat/until in "${passageTitle}"`,
        description: `repeat/until blocks are not balanced.`,
        passageId,
        passageTitle,
        context: { unmatchedCount: repeatCount },
        fixable: false,
      });
    }

    return issues;
  }
}
