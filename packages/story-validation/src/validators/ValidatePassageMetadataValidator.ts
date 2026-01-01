/**
 * Passage Metadata Validator
 *
 * Validates passage metadata structure and values.
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

export class ValidatePassageMetadataValidator implements Validator {
  name = 'validate_passage_metadata';
  category = 'structure' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    story.passages.forEach((passage, passageId) => {
      // Validate passage size (if present)
      if (passage.size) {
        if (passage.size.width <= 0) {
          issues.push({
            id: `passage_${passageId}_invalid_width`,
            code: 'WLS-META-003',
            severity: 'error',
            category: 'structure',
            message: `Passage "${passage.title}": Invalid width`,
            description: `Width must be greater than 0, got ${passage.size.width}.`,
            context: { passageName: passage.title, width: passage.size.width },
            fixable: true,
            passageId,
            fixDescription: 'Reset to default width (200)',
            fixAction: () => {
              passage.size.width = 200;
            }
          });
        }

        if (passage.size.height <= 0) {
          issues.push({
            id: `passage_${passageId}_invalid_height`,
            code: 'WLS-META-003',
            severity: 'error',
            category: 'structure',
            message: `Passage "${passage.title}": Invalid height`,
            description: `Height must be greater than 0, got ${passage.size.height}.`,
            context: { passageName: passage.title, height: passage.size.height },
            fixable: true,
            passageId,
            fixDescription: 'Reset to default height (150)',
            fixAction: () => {
              passage.size.height = 150;
            }
          });
        }

        // Warn about very large passages
        if (passage.size.width > 1000 || passage.size.height > 1000) {
          issues.push({
            id: `passage_${passageId}_very_large`,
            code: 'WLS-META-005',
            severity: 'info',
            category: 'structure',
            message: `Passage "${passage.title}": Very large dimensions`,
            description: `Passage size is ${passage.size.width}x${passage.size.height}. This may affect layout.`,
            context: { passageName: passage.title, size: `${passage.size.width}x${passage.size.height}` },
            fixable: false,
            passageId,
          });
        }
      }

      // Validate choice metadata
      passage.choices.forEach((choice, choiceIndex) => {
        if (choice.metadata && Object.keys(choice.metadata).length > 0) {
          // Check for reserved keys
          const reservedKeys = ['id', 'text', 'target', 'condition', 'action'];
          Object.keys(choice.metadata).forEach(key => {
            if (reservedKeys.includes(key)) {
              issues.push({
                id: `passage_${passageId}_choice_${choiceIndex}_reserved_metadata_${key}`,
                code: 'WLS-META-004',
                severity: 'warning',
                category: 'structure',
                message: `Passage "${passage.title}", choice ${choiceIndex + 1}: Reserved metadata key "${key}"`,
                description: `Metadata key "${key}" conflicts with a built-in property. Consider using a different key.`,
                context: { passageName: passage.title, key },
                fixable: false,
                passageId,
              });
            }
          });

          // Warn about very large metadata
          const metadataSize = JSON.stringify(choice.metadata).length;
          if (metadataSize > 10000) {
            issues.push({
              id: `passage_${passageId}_choice_${choiceIndex}_large_metadata`,
              code: 'WLS-META-005',
              severity: 'info',
              category: 'structure',
              message: `Passage "${passage.title}", choice ${choiceIndex + 1}: Large metadata`,
              description: `Choice metadata is ${(metadataSize / 1024).toFixed(1)}KB. Consider reducing size.`,
              context: { passageName: passage.title, size: `${(metadataSize / 1024).toFixed(1)}KB` },
              fixable: false,
              passageId,
            });
          }
        }
      });

      // Validate passage metadata
      if (passage.metadata && Object.keys(passage.metadata).length > 0) {
        // Check for reserved keys
        const reservedKeys = ['id', 'title', 'content', 'position', 'size', 'choices', 'tags', 'onEnterScript', 'onExitScript'];
        Object.keys(passage.metadata).forEach(key => {
          if (reservedKeys.includes(key)) {
            issues.push({
              id: `passage_${passageId}_reserved_metadata_${key}`,
              code: 'WLS-META-004',
              severity: 'warning',
              category: 'structure',
              message: `Passage "${passage.title}": Reserved metadata key "${key}"`,
              description: `Metadata key "${key}" conflicts with a built-in property. Consider using a different key.`,
              context: { passageName: passage.title, key },
              fixable: false,
              passageId,
            });
          }
        });

        // Warn about very large metadata
        const metadataSize = JSON.stringify(passage.metadata).length;
        if (metadataSize > 50000) {
          issues.push({
            id: `passage_${passageId}_large_metadata`,
            code: 'WLS-META-005',
            severity: 'warning',
            category: 'structure',
            message: `Passage "${passage.title}": Large metadata`,
            description: `Passage metadata is ${(metadataSize / 1024).toFixed(1)}KB. Consider reducing size.`,
            context: { passageName: passage.title, size: `${(metadataSize / 1024).toFixed(1)}KB` },
            fixable: false,
            passageId,
          });
        }
      }
    });

    return issues;
  }
}
