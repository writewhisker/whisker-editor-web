/**
 * WLS 1.0 Module Validator
 *
 * Validates INCLUDE, FUNCTION, and NAMESPACE declarations.
 * Error codes: WLS-MOD-001 through WLS-MOD-015
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
 * Check if a path is valid (no directory traversal, valid chars)
 */
function isValidIncludePath(path: string): { valid: boolean; error?: string } {
  // Check for directory traversal
  if (path.includes('..')) {
    return { valid: false, error: 'Directory traversal (..) not allowed' };
  }

  // Check for absolute paths
  if (path.startsWith('/') || /^[a-zA-Z]:/.test(path)) {
    return { valid: false, error: 'Absolute paths not allowed' };
  }

  // Check for valid file extension
  const validExtensions = ['.wls', '.whisker', '.json', '.yaml', '.yml'];
  const ext = path.substring(path.lastIndexOf('.')).toLowerCase();
  if (!validExtensions.includes(ext)) {
    return { valid: false, error: `Invalid extension: ${ext}` };
  }

  // Check for invalid characters
  if (/[<>:"|?*]/.test(path)) {
    return { valid: false, error: 'Path contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Reserved function names that cannot be used
 */
const RESERVED_FUNCTION_NAMES = new Set([
  'if', 'else', 'elseif', 'endif', 'while', 'for', 'return', 'break', 'continue',
  'function', 'end', 'local', 'true', 'false', 'nil', 'and', 'or', 'not',
  'goto', 'do', 'then', 'in', 'repeat', 'until',
  // Built-in whisker functions
  'goto_passage', 'set', 'get', 'print', 'random', 'round', 'floor', 'ceil',
]);

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

    // Validate function signatures
    issues.push(...this.validateFunctionSignatures(story));

    // Validate circular dependencies
    issues.push(...this.validateCircularDependencies(story));

    // Validate export/import consistency
    issues.push(...this.validateExportImportConsistency(story));

    // Validate namespace scoping
    issues.push(...this.validateNamespaceScoping(story));

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

      // Validate path format
      const pathValidation = isValidIncludePath(path);
      if (!pathValidation.valid) {
        issues.push({
          id: `invalid_include_path_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
          code: 'WLS-MOD-001',
          severity: 'error',
          category: 'modules',
          message: `Invalid include path: "${path}"`,
          description: pathValidation.error || 'Invalid path format.',
          context: { path },
          fixable: false,
        });
        continue;
      }

      // Check for duplicate includes
      if (seenPaths.has(path)) {
        issues.push({
          id: `duplicate_include_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
          code: 'WLS-MOD-002',
          severity: 'warning',
          category: 'modules',
          message: `Duplicate include: "${path}"`,
          description: 'The same file is included multiple times.',
          context: { path },
          suggestion: 'Remove duplicate include statements.',
          fixable: true,
        });
      } else {
        seenPaths.add(path);
      }
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

    const seenNames = new Set<string>();

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
        continue;
      }

      // Check for reserved names
      if (RESERVED_FUNCTION_NAMES.has(funcName.toLowerCase())) {
        issues.push({
          id: `reserved_func_name_${funcName}`,
          code: 'WLS-MOD-009',
          severity: 'error',
          category: 'modules',
          message: `Reserved function name: "${funcName}"`,
          description: 'This name is reserved and cannot be used for custom functions.',
          context: { functionName: funcName },
          fixable: false,
        });
      }

      // Check for duplicate function names
      if (seenNames.has(funcName)) {
        issues.push({
          id: `duplicate_func_name_${funcName}`,
          code: 'WLS-MOD-010',
          severity: 'error',
          category: 'modules',
          message: `Duplicate function name: "${funcName}"`,
          description: 'Function names must be unique within the same scope.',
          context: { functionName: funcName },
          fixable: false,
        });
      } else {
        seenNames.add(funcName);
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

  /**
   * Validate function signatures (WLS-MOD-011, WLS-MOD-012)
   */
  private validateFunctionSignatures(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithModules = story as unknown as StoryWithModules;
    const functions = storyWithModules.functions;

    if (!functions || !Array.isArray(functions)) {
      return issues;
    }

    for (const func of functions) {
      const funcName = func.name;
      const params = func.params || [];

      // Validate parameter names
      const seenParams = new Set<string>();
      for (const param of params) {
        const paramName = param.name;

        // Check for valid parameter name
        if (!isValidIdentifier(paramName)) {
          issues.push({
            id: `invalid_param_name_${funcName}_${String(paramName)}`,
            code: 'WLS-MOD-011',
            severity: 'error',
            category: 'modules',
            message: `Invalid parameter name: "${paramName}" in function "${funcName}"`,
            description: 'Parameter names must be valid identifiers.',
            context: { functionName: funcName, parameterName: paramName },
            fixable: false,
          });
          continue;
        }

        // Check for duplicate parameter names
        if (seenParams.has(paramName)) {
          issues.push({
            id: `duplicate_param_${funcName}_${paramName}`,
            code: 'WLS-MOD-012',
            severity: 'error',
            category: 'modules',
            message: `Duplicate parameter: "${paramName}" in function "${funcName}"`,
            description: 'Parameter names must be unique within a function.',
            context: { functionName: funcName, parameterName: paramName },
            fixable: false,
          });
        } else {
          seenParams.add(paramName);
        }
      }

      // Check for too many parameters
      if (params.length > 10) {
        issues.push({
          id: `too_many_params_${funcName}`,
          code: 'WLS-MOD-013',
          severity: 'warning',
          category: 'modules',
          message: `Too many parameters: "${funcName}" has ${params.length} parameters`,
          description: 'Functions with many parameters may be hard to use. Consider using an options object.',
          context: { functionName: funcName, paramCount: params.length },
          fixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Validate circular dependencies (WLS-MOD-003)
   */
  private validateCircularDependencies(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithModules = story as unknown as StoryWithModules;
    const includes = storyWithModules.includes;

    if (!includes || !Array.isArray(includes)) {
      return issues;
    }

    // Build dependency graph
    const dependencies: Map<string, Set<string>> = new Map();

    // For a full implementation, we'd need to parse included files
    // Here we do basic detection based on naming patterns
    for (const include of includes) {
      const path = include.path;
      const baseName = path.replace(/\.[^/.]+$/, '');

      if (!dependencies.has(baseName)) {
        dependencies.set(baseName, new Set());
      }
    }

    // Check for self-includes (simplest circular dependency)
    const storyName = (story as unknown as { name?: string }).name || 'main';
    for (const include of includes) {
      const path = include.path;
      const baseName = path.replace(/\.[^/.]+$/, '');

      if (baseName === storyName || baseName === 'self' || path.includes(storyName)) {
        issues.push({
          id: `self_include_${path.replace(/[^a-zA-Z0-9]/g, '_')}`,
          code: 'WLS-MOD-003',
          severity: 'error',
          category: 'modules',
          message: `Self-referential include: "${path}"`,
          description: 'A story cannot include itself.',
          context: { path },
          fixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Validate export/import consistency (WLS-MOD-014)
   */
  private validateExportImportConsistency(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithModules = story as unknown as StoryWithModules & {
      exports?: string[];
      imports?: Array<{ from: string; names: string[] }>;
    };

    const exports = storyWithModules.exports;
    const imports = storyWithModules.imports;

    // Check for exports that don't exist
    if (exports && Array.isArray(exports)) {
      const definedFunctions = new Set(
        (storyWithModules.functions || []).map(f => f.name)
      );
      const definedPassages = new Set(
        storyWithModules.passages instanceof Map
          ? Array.from(storyWithModules.passages.values()).map(p => p.name)
          : Object.values(storyWithModules.passages || {}).map(p => p.name)
      );

      for (const exportName of exports) {
        if (!definedFunctions.has(exportName) && !definedPassages.has(exportName)) {
          issues.push({
            id: `undefined_export_${exportName}`,
            code: 'WLS-MOD-014',
            severity: 'error',
            category: 'modules',
            message: `Undefined export: "${exportName}"`,
            description: 'Exported name does not match any function or passage.',
            context: { exportName },
            fixable: false,
          });
        }
      }
    }

    // Check for unused imports (would need runtime tracking for full implementation)
    if (imports && Array.isArray(imports)) {
      for (const importDecl of imports) {
        if (!importDecl.from || importDecl.from.trim() === '') {
          issues.push({
            id: `empty_import_source`,
            code: 'WLS-MOD-015',
            severity: 'error',
            category: 'modules',
            message: 'Import has no source',
            description: 'Import declaration must specify a source file.',
            context: { names: importDecl.names },
            fixable: false,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Validate namespace scoping rules
   */
  private validateNamespaceScoping(story: Story): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const storyWithModules = story as unknown as StoryWithModules;
    const namespaces = storyWithModules.namespaces;

    if (!namespaces || !Array.isArray(namespaces)) {
      return issues;
    }

    // Track namespace depths
    const validateNamespaceDepth = (
      ns: NamespaceDeclaration,
      depth: number,
      path: string[]
    ): void => {
      const currentPath = [...path, ns.name];

      // Check for excessive nesting
      if (depth > 3) {
        issues.push({
          id: `deep_namespace_${currentPath.join('_')}`,
          code: 'WLS-MOD-008',
          severity: 'warning',
          category: 'modules',
          message: `Deeply nested namespace: ${currentPath.join('.')}`,
          description: 'Namespaces nested more than 3 levels deep may be hard to maintain.',
          context: { namespacePath: currentPath.join('.'), depth },
          fixable: false,
        });
      }

      // Recursively validate nested namespaces
      if (ns.nestedNamespaces && Array.isArray(ns.nestedNamespaces)) {
        for (const nested of ns.nestedNamespaces) {
          validateNamespaceDepth(nested, depth + 1, currentPath);
        }
      }
    };

    for (const ns of namespaces) {
      validateNamespaceDepth(ns, 1, []);
    }

    return issues;
  }
}
