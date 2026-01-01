/**
 * WLS 1.0 Syntax Validator
 *
 * Validates passage content using the WLS 1.0 parser to detect syntax errors.
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
}
