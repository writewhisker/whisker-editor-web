/**
 * LIST State Machine Utilities
 *
 * Provides parsing and evaluation helpers for LIST operations.
 * The main ListValue and ListRegistry classes are in separate files.
 */

import { ListValue } from './ListValue';

/**
 * Parse a LIST declaration string
 * Format: "state1, (activeState), state2"
 */
export function parseListDeclaration(
  declaration: string
): { state: string; active: boolean }[] {
  const result: { state: string; active: boolean }[] = [];
  const parts = declaration.split(',').map((p) => p.trim()).filter((p) => p);

  for (const part of parts) {
    if (part.startsWith('(') && part.endsWith(')')) {
      // Active state
      result.push({
        state: part.slice(1, -1).trim(),
        active: true,
      });
    } else {
      result.push({
        state: part,
        active: false,
      });
    }
  }

  return result;
}

/**
 * Evaluate a LIST operator expression
 */
export function evaluateListOperator(
  list: ListValue,
  operator: string,
  operand: string | ListValue
): boolean | void {
  switch (operator) {
    case '+=':
      if (typeof operand === 'string') {
        list.add(operand);
      } else {
        for (const state of operand.getActiveValues()) {
          list.add(state);
        }
      }
      return;

    case '-=':
      if (typeof operand === 'string') {
        list.remove(operand);
      } else {
        for (const state of operand.getActiveValues()) {
          list.remove(state);
        }
      }
      return;

    case '?':
      if (typeof operand === 'string') {
        return list.contains(operand);
      }
      // For list operand, check if any state matches
      for (const state of operand.getActiveValues()) {
        if (list.contains(state)) return true;
      }
      return false;

    case '>=':
      if (operand instanceof ListValue) {
        return list.isSubsetOf(operand);
      }
      return list.contains(operand);

    case '<=':
      if (operand instanceof ListValue) {
        return operand.isSubsetOf(list);
      }
      return list.count() <= 1 && list.contains(operand);

    case '==':
      if (operand instanceof ListValue) {
        return list.equals(operand);
      }
      return list.count() === 1 && list.contains(operand);

    default:
      throw new Error(`Unknown LIST operator: ${operator}`);
  }
}
