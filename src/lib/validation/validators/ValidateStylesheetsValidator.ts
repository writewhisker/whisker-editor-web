/**
 * Stylesheets Validator
 *
 * Validates CSS code blocks for basic syntax errors.
 */

import type { Story } from '../../models/Story';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class ValidateStylesheetsValidator implements Validator {
  name = 'validate_stylesheets';
  category = 'content' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!story.stylesheets || story.stylesheets.length === 0) {
      return issues; // No stylesheets to validate
    }

    story.stylesheets.forEach((css, index) => {
      // Basic validation: check for matching braces
      const openBraces = (css.match(/{/g) || []).length;
      const closeBraces = (css.match(/}/g) || []).length;

      if (openBraces !== closeBraces) {
        issues.push({
          id: `stylesheet_${index}_unmatched_braces`,
          severity: 'error',
          category: 'content',
          message: `Stylesheet ${index + 1}: Unmatched braces`,
          description: `Stylesheet has ${openBraces} opening braces but ${closeBraces} closing braces.`,
          fixable: false,
        });
      }

      // Check for empty stylesheet
      if (css.trim().length === 0) {
        issues.push({
          id: `stylesheet_${index}_empty`,
          severity: 'info',
          category: 'content',
          message: `Stylesheet ${index + 1}: Empty`,
          description: 'This stylesheet is empty and can be removed.',
          fixable: true,
          fix: {
            description: 'Remove empty stylesheet',
            apply: () => {
              story.removeStylesheet(index);
            }
          }
        });
      }

      // Warn about very long stylesheets (potential performance issue)
      if (css.length > 50000) {
        issues.push({
          id: `stylesheet_${index}_too_large`,
          severity: 'warning',
          category: 'content',
          message: `Stylesheet ${index + 1}: Very large`,
          description: `Stylesheet is ${(css.length / 1024).toFixed(1)}KB. Consider splitting into smaller files or optimizing.`,
          fixable: false,
        });
      }
    });

    return issues;
  }
}
