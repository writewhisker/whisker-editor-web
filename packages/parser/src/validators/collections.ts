/**
 * Collection Validation for WLS Stories
 *
 * Validates all collection-related aspects of a story:
 * - Duplicate LIST value (WLS-COL-001)
 * - Empty LIST (WLS-COL-002)
 * - Invalid LIST value (WLS-COL-003)
 * - Duplicate ARRAY index (WLS-COL-004)
 * - ARRAY index out of bounds (WLS-COL-005)
 * - Invalid ARRAY type (WLS-COL-006)
 * - Duplicate MAP key (WLS-COL-007)
 * - Invalid MAP key (WLS-COL-008)
 * - Undefined collection (WLS-COL-009)
 * - Collection type mismatch (WLS-COL-010)
 */

import type {
  StoryNode,
  ContentNode,
  ExpressionNode,
  ConditionalNode,
  ConditionalBranchNode,
  ChoiceNode,
  ListDeclarationNode,
  ArrayDeclarationNode,
  MapDeclarationNode,
  CallExpressionNode,
  MemberExpressionNode,
} from '../ast';
import { WLS_ERROR_CODES } from '../ast';
import type { SourceSpan } from '../types';
import type { ValidationDiagnostic } from './links';

/**
 * Result of collection validation
 */
export interface CollectionValidationResult {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
  collections: CollectionInfo[];
}

/**
 * Information about a declared collection
 */
export interface CollectionInfo {
  name: string;
  type: 'list' | 'array' | 'map';
  location?: SourceSpan;
  size: number;
}

/**
 * Extract collection usages from content
 */
function extractCollectionUsages(
  content: ContentNode[],
  passageName: string
): Array<{ name: string; operation: string; passageName: string; location?: SourceSpan }> {
  const usages: Array<{ name: string; operation: string; passageName: string; location?: SourceSpan }> = [];

  function processExpression(expr: ExpressionNode, location?: SourceSpan): void {
    if (!expr) return;

    // Check for collection method calls like list.add(), map.get()
    if (expr.type === 'call_expression') {
      const call = expr as CallExpressionNode;
      if (call.callee?.type === 'member_expression') {
        const member = call.callee as MemberExpressionNode;
        if (member.object.type === 'identifier') {
          const objName = (member.object as { name: string }).name;
          const methodName = member.property;
          usages.push({
            name: objName,
            operation: methodName,
            passageName,
            location: location || call.location,
          });
        }
      }
      // Check arguments recursively
      if (call.arguments) {
        for (const arg of call.arguments) {
          processExpression(arg, location);
        }
      }
    } else if (expr.type === 'member_expression') {
      const member = expr as MemberExpressionNode;
      if (member.object.type === 'identifier') {
        const objName = (member.object as { name: string }).name;
        usages.push({
          name: objName,
          operation: 'member_access',
          passageName,
          location: location || member.location,
        });
      }
      processExpression(member.object, location);
    } else if (expr.type === 'binary_expression') {
      const binary = expr as { left?: ExpressionNode; right?: ExpressionNode };
      if (binary.left) processExpression(binary.left, location);
      if (binary.right) processExpression(binary.right, location);
    } else if (expr.type === 'unary_expression') {
      const unary = expr as { argument?: ExpressionNode };
      if (unary.argument) processExpression(unary.argument, location);
    } else if (expr.type === 'assignment_expression') {
      const assign = expr as { target?: ExpressionNode; value?: ExpressionNode };
      if (assign.target) processExpression(assign.target, location);
      if (assign.value) processExpression(assign.value, location);
    }
  }

  function processContent(nodes: ContentNode[]): void {
    for (const node of nodes) {
      if (node.type === 'interpolation') {
        const interp = node as { expression?: ExpressionNode };
        if (interp.expression) processExpression(interp.expression, node.location);
      } else if (node.type === 'expression_statement') {
        const stmt = node as { expression?: ExpressionNode };
        if (stmt.expression) processExpression(stmt.expression, node.location);
      } else if (node.type === 'conditional') {
        const cond = node as ConditionalNode;
        if (cond.condition) processExpression(cond.condition, cond.location);
        if (cond.consequent) processContent(cond.consequent);
        if (cond.alternatives) {
          for (const alt of cond.alternatives) {
            const branch = alt as ConditionalBranchNode;
            if (branch.condition) processExpression(branch.condition, branch.location);
            if (branch.content) processContent(branch.content);
          }
        }
        if (cond.alternate) processContent(cond.alternate);
      } else if (node.type === 'choice') {
        const choice = node as ChoiceNode;
        if (choice.condition) processExpression(choice.condition, choice.location);
        if (choice.action) {
          for (const action of choice.action) {
            processExpression(action, choice.location);
          }
        }
        if (choice.text) processContent(choice.text);
      }
    }
  }

  processContent(content);
  return usages;
}

/**
 * Validate a LIST declaration
 */
function validateListDeclaration(
  list: ListDeclarationNode,
  diagnostics: ValidationDiagnostic[]
): void {
  const name = list.name || 'unnamed';
  const values = list.values || [];

  // Empty LIST (WLS-COL-002)
  if (values.length === 0) {
    diagnostics.push({
      code: WLS_ERROR_CODES.EMPTY_LIST,
      message: `LIST "${name}" has no values`,
      severity: 'warning',
      location: list.location,
      suggestion: 'Add at least one value to the LIST',
    });
    return;
  }

  // Check for duplicate values (WLS-COL-001)
  const seenValues = new Map<string, boolean>();
  for (const item of values) {
    const itemValue = item.value;
    if (itemValue) {
      if (seenValues.has(itemValue)) {
        diagnostics.push({
          code: WLS_ERROR_CODES.DUPLICATE_LIST_VALUE,
          message: `Duplicate value "${itemValue}" in LIST "${name}"`,
          severity: 'error',
          location: list.location,
          suggestion: 'Remove duplicate value or use ARRAY if duplicates are needed',
        });
      }
      seenValues.set(itemValue, true);
    }
  }

  // Check for invalid value types (WLS-COL-003)
  for (const item of values) {
    if (!item.value) {
      diagnostics.push({
        code: WLS_ERROR_CODES.INVALID_LIST_VALUE,
        message: `Invalid value in LIST "${name}": missing value`,
        severity: 'error',
        location: list.location,
        suggestion: 'LIST values must be valid identifiers',
      });
    }
  }
}

/**
 * Validate an ARRAY declaration
 */
function validateArrayDeclaration(
  array: ArrayDeclarationNode,
  diagnostics: ValidationDiagnostic[]
): void {
  const name = array.name || 'unnamed';
  const elements = array.elements || [];

  // Check for invalid types (WLS-COL-006)
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element === undefined || element === null) {
      diagnostics.push({
        code: WLS_ERROR_CODES.INVALID_ARRAY_TYPE,
        message: `Invalid value at index ${i} in ARRAY "${name}": undefined`,
        severity: 'error',
        location: array.location,
        suggestion: 'Provide a valid value for the array element',
      });
    }
  }

  // Check for explicit index with duplicates or negative indices
  const seenIndices = new Map<number, boolean>();
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    if (element && typeof element === 'object' && 'index' in element) {
      const index = (element as { index?: number }).index;
      if (index !== undefined) {
        if (seenIndices.has(index)) {
          diagnostics.push({
            code: WLS_ERROR_CODES.DUPLICATE_ARRAY_INDEX,
            message: `Duplicate index ${index} in ARRAY "${name}"`,
            severity: 'error',
            location: array.location,
            suggestion: 'Use unique indices for ARRAY elements',
          });
        }
        seenIndices.set(index, true);

        // Check for negative indices (WLS-COL-005)
        if (index < 0) {
          diagnostics.push({
            code: WLS_ERROR_CODES.ARRAY_INDEX_OUT_OF_BOUNDS,
            message: `Negative index ${index} in ARRAY "${name}"`,
            severity: 'error',
            location: array.location,
            suggestion: 'ARRAY indices must be non-negative',
          });
        }
      }
    }
  }
}

/**
 * Validate a MAP declaration
 */
function validateMapDeclaration(
  map: MapDeclarationNode,
  diagnostics: ValidationDiagnostic[]
): void {
  const name = map.name || 'unnamed';
  const entries = map.entries || [];

  // Check for duplicate keys (WLS-COL-007)
  const seenKeys = new Map<string, boolean>();
  for (const entry of entries) {
    const key = entry.key;
    if (key) {
      if (seenKeys.has(key)) {
        diagnostics.push({
          code: WLS_ERROR_CODES.DUPLICATE_MAP_KEY,
          message: `Duplicate key "${key}" in MAP "${name}"`,
          severity: 'error',
          location: map.location,
          suggestion: 'Use unique keys for MAP entries',
        });
      }
      seenKeys.set(key, true);

      // Check for invalid key format (WLS-COL-008)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        diagnostics.push({
          code: WLS_ERROR_CODES.INVALID_MAP_KEY,
          message: `Invalid key "${key}" in MAP "${name}"`,
          severity: 'error',
          location: map.location,
          suggestion: 'MAP keys must be valid identifiers',
        });
      }
    }
  }
}

/**
 * Validate all collections in a story
 */
export function validateCollections(story: StoryNode): CollectionValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  const collections: CollectionInfo[] = [];
  const declaredCollections = new Map<string, 'list' | 'array' | 'map'>();

  // Validate LIST declarations
  for (const list of story.lists || []) {
    validateListDeclaration(list, diagnostics);
    if (list.name) {
      declaredCollections.set(list.name, 'list');
      collections.push({
        name: list.name,
        type: 'list',
        location: list.location,
        size: (list.values || []).length,
      });
    }
  }

  // Validate ARRAY declarations
  for (const array of story.arrays || []) {
    validateArrayDeclaration(array, diagnostics);
    if (array.name) {
      declaredCollections.set(array.name, 'array');
      collections.push({
        name: array.name,
        type: 'array',
        location: array.location,
        size: (array.elements || []).length,
      });
    }
  }

  // Validate MAP declarations
  for (const map of story.maps || []) {
    validateMapDeclaration(map, diagnostics);
    if (map.name) {
      declaredCollections.set(map.name, 'map');
      collections.push({
        name: map.name,
        type: 'map',
        location: map.location,
        size: (map.entries || []).length,
      });
    }
  }

  // Check for undefined collections and type mismatches in usage
  for (const passage of story.passages) {
    const usages = extractCollectionUsages(passage.content, passage.name);

    for (const usage of usages) {
      const collType = declaredCollections.get(usage.name);

      // Undefined collection (WLS-COL-009)
      if (!collType && !isBuiltInMethod(usage.operation)) {
        // Only report if it looks like a collection operation
        const collectionOps = ['add', 'remove', 'toggle', 'contains', 'get', 'set', 'push', 'pop', 'keys', 'values', 'length', 'size'];
        if (collectionOps.includes(usage.operation)) {
          diagnostics.push({
            code: WLS_ERROR_CODES.UNDEFINED_COLLECTION,
            message: `Undefined collection "${usage.name}" used in passage "${usage.passageName}"`,
            severity: 'warning',
            location: usage.location,
            passageId: usage.passageName,
            suggestion: `Declare "${usage.name}" as LIST, ARRAY, or MAP before use`,
          });
        }
      }

      // Type mismatch detection (WLS-COL-010)
      if (collType) {
        const mismatch = checkTypeMismatch(collType, usage.operation);
        if (mismatch) {
          diagnostics.push({
            code: WLS_ERROR_CODES.COLLECTION_TYPE_MISMATCH,
            message: `${mismatch} on ${collType.toUpperCase()} "${usage.name}" in passage "${usage.passageName}"`,
            severity: 'warning',
            location: usage.location,
            passageId: usage.passageName,
            suggestion: `Use appropriate operations for ${collType.toUpperCase()} type`,
          });
        }
      }
    }
  }

  return {
    valid: diagnostics.filter(d => d.severity === 'error').length === 0,
    diagnostics,
    collections,
  };
}

/**
 * Check if an operation name is a built-in method (not collection-specific)
 */
function isBuiltInMethod(operation: string): boolean {
  const builtIn = ['toString', 'valueOf', 'hasOwnProperty', 'member_access'];
  return builtIn.includes(operation);
}

/**
 * Check for type mismatch between collection type and operation
 */
function checkTypeMismatch(type: 'list' | 'array' | 'map', operation: string): string | null {
  const listOps = ['add', 'remove', 'toggle', 'contains', 'active'];
  const arrayOps = ['push', 'pop', 'shift', 'unshift', 'indexOf'];
  const mapOps = ['keys', 'values', 'delete'];

  switch (type) {
    case 'list':
      if (arrayOps.includes(operation)) {
        return `ARRAY operation "${operation}" used`;
      }
      if (mapOps.includes(operation) && !['keys', 'values'].includes(operation)) {
        return `MAP operation "${operation}" used`;
      }
      break;
    case 'array':
      if (listOps.includes(operation) && !['contains'].includes(operation)) {
        return `LIST operation "${operation}" used`;
      }
      break;
    case 'map':
      if (listOps.includes(operation) && !['contains'].includes(operation)) {
        return `LIST operation "${operation}" used`;
      }
      if (arrayOps.includes(operation)) {
        return `ARRAY operation "${operation}" used`;
      }
      break;
  }

  return null;
}
