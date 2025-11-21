export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
}

export class StoryValidator {
  public validate(story: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!story.title || typeof story.title !== 'string') {
      errors.push({
        code: 'MISSING_TITLE',
        message: 'Story must have a title',
        path: 'title',
      });
    }

    if (!Array.isArray(story.passages)) {
      errors.push({
        code: 'MISSING_PASSAGES',
        message: 'Story must have passages array',
        path: 'passages',
      });
    } else {
      if (story.passages.length === 0) {
        warnings.push({
          code: 'EMPTY_PASSAGES',
          message: 'Story has no passages',
          path: 'passages',
        });
      }

      story.passages.forEach((passage: any, index: number) => {
        if (!passage.title) {
          errors.push({
            code: 'MISSING_PASSAGE_TITLE',
            message: `Passage at index ${index} is missing a title`,
            path: `passages[${index}].title`,
          });
        }

        if (!passage.content && passage.content !== '') {
          warnings.push({
            code: 'EMPTY_PASSAGE',
            message: `Passage "${passage.title || index}" has no content`,
            path: `passages[${index}].content`,
          });
        }

        if (passage.links && !Array.isArray(passage.links)) {
          errors.push({
            code: 'INVALID_LINKS',
            message: `Passage "${passage.title || index}" has invalid links`,
            path: `passages[${index}].links`,
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public validateLinks(story: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!Array.isArray(story.passages)) {
      return { valid: true, errors, warnings };
    }

    const passageTitles = new Set(story.passages.map((p: any) => p.title));

    story.passages.forEach((passage: any) => {
      if (passage.links && Array.isArray(passage.links)) {
        passage.links.forEach((link: string) => {
          if (!passageTitles.has(link)) {
            warnings.push({
              code: 'BROKEN_LINK',
              message: `Passage "${passage.title}" links to non-existent passage "${link}"`,
              path: `passages[${passage.title}].links`,
            });
          }
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
