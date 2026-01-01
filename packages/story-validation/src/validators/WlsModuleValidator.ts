/**
 * WLS 1.0 Module Validator
 *
 * Validates INCLUDE, FUNCTION, and NAMESPACE declarations.
 * Error codes: WLS-MOD-001 through WLS-MOD-008
 */

import type { Story } from '@writewhisker/story-models';
import type { Validator } from '../StoryValidator';
import type { ValidationIssue } from '../types';

/**
 * Check if a string is a valid identifier
 */
function isValidIdentifier(str: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(str);
}

/**
 * Interface for include declarations from parsed AST
 */
interface IncludeDeclaration {
  path: string;
}

/**
 * Interface for function declarations from parsed AST
 */
interface FunctionDeclaration {
  name: string;
  params?: Array<{ name: string }>;
  body?: unknown[];
}

/**
 * Interface for namespace declarations from parsed AST
 */
interface NamespaceDeclaration {
  name: string;
  passages?: unknown[];
  functions?: FunctionDeclaration[];
  nestedNamespaces?: NamespaceDeclaration[];
}

/**
 * Extended story interface with module declarations
 */
interface StoryWithModules {
  includes?: IncludeDeclaration[];
  functions?: FunctionDeclaration[];
  namespaces?: NamespaceDeclaration[];
  passages?: Map<string, { name: string; content?: string }> | Record<string, { name: string; content?: string }>;
}

export class WlsModuleValidator implements Validator {
  name = 'wls_modules';
  category = 'modules' as const;

  validate(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Validate INCLUDE declarations
    issues.push(...this.validateIncludes(story));

    // Validate FUNCTION declarations
    issues.push(...this.validateFunctions(story));

    // Validate NAMESPACE declarations
    issues.push(...this.validateNamespaces(story));

    // Validate namespace conflicts in passage names
    issues.push(...this.validateNamespaceConflicts(story));

    return issues;
  }

  private validateIncludes(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithModules = story as unknown as StoryWithModules;
    const includes = storyWithModules.includes;

    if (!includes || !Array.isArray(includes)) {
      return issues;
    }

    // Track seen paths for duplicate detection
    const seenPaths = new Set<string>();

    for (const include of includes) {
      const path = include.path;

      // Check for circular/duplicate includes
      if (seenPaths.has(path)) {
        issues.push({
          id: `circular_include_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
          code: 'WLS-MOD-002',
          severity: 'error',
          category: 'modules',
          message: `Circular include detected: "${path}"`,
          description: 'The included file creates a circular dependency.',
          context: { path },
          fixable: false,
        });
      } else {
        seenPaths.add(path);
      }

      // Note: Actual file existence check (WLS-MOD-001) would require file system access
      // and is typically done at load time, not validation time
    }

    return issues;
  }

  private validateFunctions(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithModules = story as unknown as StoryWithModules;
    const functions = storyWithModules.functions;

    if (!functions || !Array.isArray(functions)) {
      return issues;
    }

    for (const func of functions) {
      const funcName = func.name;

      // Check for valid function name
      if (!isValidIdentifier(funcName)) {
        issues.push({
          id: `invalid_func_name_${String(funcName)}`,
          code: 'WLS-MOD-006',
          severity: 'error',
          category: 'modules',
          message: `Invalid function name: "${funcName}"`,
          description: 'Function names must be valid identifiers.',
          context: { functionName: funcName },
          fixable: false,
        });
      }
    }

    return issues;
  }

  private validateNamespaces(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithModules = story as unknown as StoryWithModules;
    const namespaces = storyWithModules.namespaces;

    if (!namespaces || !Array.isArray(namespaces)) {
      return issues;
    }

    // Recursively validate namespaces
    const validateNamespace = (ns: NamespaceDeclaration): void => {
      const nsName = ns.name;

      // Check for valid namespace name
      if (!isValidIdentifier(nsName)) {
        issues.push({
          id: `invalid_ns_name_${String(nsName)}`,
          code: 'WLS-MOD-007',
          severity: 'error',
          category: 'modules',
          message: `Invalid namespace name: "${nsName}"`,
          description: 'Namespace names must be valid identifiers.',
          context: { namespaceName: nsName },
          fixable: false,
        });
      }

      // Validate functions within namespace
      if (ns.functions && Array.isArray(ns.functions)) {
        for (const func of ns.functions) {
          if (!isValidIdentifier(func.name)) {
            issues.push({
              id: `invalid_ns_func_name_${nsName}_${String(func.name)}`,
              code: 'WLS-MOD-006',
              severity: 'error',
              category: 'modules',
              message: `Invalid function name: "${func.name}"`,
              description: 'Function names must be valid identifiers.',
              context: { functionName: func.name },
              fixable: false,
            });
          }
        }
      }

      // Recursively validate nested namespaces
      if (ns.nestedNamespaces && Array.isArray(ns.nestedNamespaces)) {
        for (const nested of ns.nestedNamespaces) {
          validateNamespace(nested);
        }
      }
    };

    for (const ns of namespaces) {
      validateNamespace(ns);
    }

    return issues;
  }

  private validateNamespaceConflicts(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithModules = story as unknown as StoryWithModules;
    const passages = storyWithModules.passages;

    if (!passages) {
      return issues;
    }

    // Track seen qualified names
    const seenNames = new Set<string>();

    // Handle both Map and Object passage storage
    const passageEntries = passages instanceof Map
      ? Array.from(passages.entries())
      : Object.entries(passages);

    for (const [passageId, passage] of passageEntries) {
      const qualifiedName = passage.name;

      if (seenNames.has(qualifiedName)) {
        issues.push({
          id: `ns_conflict_${qualifiedName.replace(/[^a-zA-Z0-9]/g, '_')}`,
          code: 'WLS-MOD-004',
          severity: 'error',
          category: 'modules',
          message: `Namespace conflict: "${qualifiedName}"`,
          description: 'Multiple passages have the same fully-qualified name.',
          passageId,
          context: { passageName: qualifiedName },
          fixable: false,
        });
      } else {
        seenNames.add(qualifiedName);
      }
    }

    return issues;
  }
}
