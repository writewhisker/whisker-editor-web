import { describe, it, expect, beforeEach } from 'vitest';
import {
  ListValue,
  ListRegistry,
  parseListDeclaration,
  evaluateListOperator,
} from './list-operations';

describe('ListValue', () => {
  describe('constructor', () => {
    it('should create empty list', () => {
      const list = new ListValue('test');
      expect(list.isEmpty()).toBe(true);
      expect(list.count()).toBe(0);
    });

    it('should create list with valid states', () => {
      const list = new ListValue('doorState', ['closed', 'locked', 'unlocked', 'open']);
      expect(list.getValidStates()).toEqual(['closed', 'locked', 'unlocked', 'open']);
    });

    it('should initialize with active states', () => {
      const list = new ListValue('doorState', ['closed', 'open'], ['closed']);
      expect(list.contains('closed')).toBe(true);
      expect(list.contains('open')).toBe(false);
    });
  });

  describe('add (+=)', () => {
    it('should add a state', () => {
      const list = new ListValue('test');
      list.add('active');
      expect(list.contains('active')).toBe(true);
    });

    it('should throw for invalid state when valid states defined', () => {
      const list = new ListValue('doorState', ['closed', 'open']);
      expect(() => list.add('invalid')).toThrow(/Invalid state/);
    });

    it('should allow any state when no valid states defined', () => {
      const list = new ListValue('flexible');
      list.add('anything');
      expect(list.contains('anything')).toBe(true);
    });
  });

  describe('remove (-=)', () => {
    it('should remove a state', () => {
      const list = new ListValue('test', [], ['active']);
      list.remove('active');
      expect(list.contains('active')).toBe(false);
    });

    it('should handle removing non-existent state', () => {
      const list = new ListValue('test');
      expect(() => list.remove('nonexistent')).not.toThrow();
    });
  });

  describe('contains (?)', () => {
    it('should return true for active state', () => {
      const list = new ListValue('test', [], ['active']);
      expect(list.contains('active')).toBe(true);
    });

    it('should return false for inactive state', () => {
      const list = new ListValue('test', ['inactive'], []);
      expect(list.contains('inactive')).toBe(false);
    });
  });

  describe('includes (>=)', () => {
    it('should return true when superset', () => {
      const list1 = new ListValue('a', [], ['x', 'y', 'z']);
      const list2 = new ListValue('b', [], ['x', 'y']);
      expect(list1.includes(list2)).toBe(true);
    });

    it('should return false when not superset', () => {
      const list1 = new ListValue('a', [], ['x']);
      const list2 = new ListValue('b', [], ['x', 'y']);
      expect(list1.includes(list2)).toBe(false);
    });

    it('should return true for equal sets', () => {
      const list1 = new ListValue('a', [], ['x', 'y']);
      const list2 = new ListValue('b', [], ['x', 'y']);
      expect(list1.includes(list2)).toBe(true);
    });
  });

  describe('isSubsetOf (<=)', () => {
    it('should return true when subset', () => {
      const list1 = new ListValue('a', [], ['x']);
      const list2 = new ListValue('b', [], ['x', 'y', 'z']);
      expect(list1.isSubsetOf(list2)).toBe(true);
    });

    it('should return false when not subset', () => {
      const list1 = new ListValue('a', [], ['x', 'w']);
      const list2 = new ListValue('b', [], ['x', 'y']);
      expect(list1.isSubsetOf(list2)).toBe(false);
    });
  });

  describe('equals (==)', () => {
    it('should return true for equal sets', () => {
      const list1 = new ListValue('a', [], ['x', 'y']);
      const list2 = new ListValue('b', [], ['y', 'x']);
      expect(list1.equals(list2)).toBe(true);
    });

    it('should return false for different sets', () => {
      const list1 = new ListValue('a', [], ['x']);
      const list2 = new ListValue('b', [], ['x', 'y']);
      expect(list1.equals(list2)).toBe(false);
    });
  });

  describe('toggle', () => {
    it('should add state if not present', () => {
      const list = new ListValue('test');
      const result = list.toggle('state');
      expect(result).toBe(true);
      expect(list.contains('state')).toBe(true);
    });

    it('should remove state if present', () => {
      const list = new ListValue('test', [], ['state']);
      const result = list.toggle('state');
      expect(result).toBe(false);
      expect(list.contains('state')).toBe(false);
    });
  });

  describe('setExclusive', () => {
    it('should set only one state', () => {
      const list = new ListValue('test', ['a', 'b', 'c'], ['a', 'b']);
      list.setExclusive('c');
      expect(list.getActiveStates()).toEqual(['c']);
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const list1 = new ListValue('test', ['a', 'b'], ['a']);
      const list2 = list1.clone();
      list2.add('b');
      expect(list1.contains('b')).toBe(false);
      expect(list2.contains('b')).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      const list = new ListValue('doorState', ['closed', 'open'], ['closed']);
      const json = list.toJSON();
      expect(json.name).toBe('doorState');
      expect(json.validStates).toContain('closed');
      expect(json.activeStates).toEqual(['closed']);
    });

    it('should deserialize from JSON', () => {
      const json = {
        name: 'test',
        validStates: ['a', 'b'],
        activeStates: ['a'],
      };
      const list = ListValue.fromJSON(json);
      expect(list.getName()).toBe('test');
      expect(list.contains('a')).toBe(true);
    });
  });

  describe('toString', () => {
    it('should show active states', () => {
      const list = new ListValue('test', [], ['x', 'y']);
      expect(list.toString()).toMatch(/x/);
      expect(list.toString()).toMatch(/y/);
    });

    it('should show (empty) for no states', () => {
      const list = new ListValue('test');
      expect(list.toString()).toBe('(empty)');
    });
  });
});

describe('ListRegistry', () => {
  let registry: ListRegistry;

  beforeEach(() => {
    registry = new ListRegistry();
  });

  describe('declare', () => {
    it('should create and register a list', () => {
      registry.declare('doorState', [
        { state: 'closed', active: true },
        { state: 'open', active: false },
      ]);
      expect(registry.has('doorState')).toBe(true);
    });

    it('should initialize with active states', () => {
      const list = registry.declare('test', [
        { state: 'a', active: true },
        { state: 'b', active: false },
      ]);
      expect(list.contains('a')).toBe(true);
      expect(list.contains('b')).toBe(false);
    });
  });

  describe('get', () => {
    it('should return list by name', () => {
      registry.declare('test', [{ state: 'a', active: true }]);
      const list = registry.get('test');
      expect(list).toBeDefined();
      expect(list?.getName()).toBe('test');
    });

    it('should return undefined for unknown list', () => {
      expect(registry.get('unknown')).toBeUndefined();
    });
  });

  describe('serialization', () => {
    it('should serialize all lists', () => {
      registry.declare('list1', [{ state: 'a', active: true }]);
      registry.declare('list2', [{ state: 'b', active: false }]);
      const json = registry.toJSON();
      expect(Object.keys(json)).toHaveLength(2);
    });

    it('should deserialize all lists', () => {
      const json = {
        list1: { name: 'list1', validStates: ['a'], activeStates: ['a'] },
        list2: { name: 'list2', validStates: ['b'], activeStates: [] },
      };
      const restored = ListRegistry.fromJSON(json);
      expect(restored.has('list1')).toBe(true);
      expect(restored.has('list2')).toBe(true);
    });
  });
});

describe('parseListDeclaration', () => {
  it('should parse simple states', () => {
    const result = parseListDeclaration('a, b, c');
    expect(result).toEqual([
      { state: 'a', active: false },
      { state: 'b', active: false },
      { state: 'c', active: false },
    ]);
  });

  it('should parse active states with parentheses', () => {
    const result = parseListDeclaration('(active), inactive');
    expect(result).toEqual([
      { state: 'active', active: true },
      { state: 'inactive', active: false },
    ]);
  });

  it('should parse multiple active states', () => {
    const result = parseListDeclaration('(a), (b), c');
    expect(result).toEqual([
      { state: 'a', active: true },
      { state: 'b', active: true },
      { state: 'c', active: false },
    ]);
  });

  it('should handle whitespace', () => {
    const result = parseListDeclaration('  a  ,  (b)  ,  c  ');
    expect(result).toHaveLength(3);
    expect(result[1].state).toBe('b');
    expect(result[1].active).toBe(true);
  });
});

describe('evaluateListOperator', () => {
  let list: ListValue;

  beforeEach(() => {
    list = new ListValue('test', ['a', 'b', 'c'], ['a']);
  });

  describe('+= operator', () => {
    it('should add string state', () => {
      evaluateListOperator(list, '+=', 'b');
      expect(list.contains('b')).toBe(true);
    });

    it('should add states from another list', () => {
      const other = new ListValue('other', [], ['b', 'c']);
      evaluateListOperator(list, '+=', other);
      expect(list.contains('b')).toBe(true);
      expect(list.contains('c')).toBe(true);
    });
  });

  describe('-= operator', () => {
    it('should remove string state', () => {
      evaluateListOperator(list, '-=', 'a');
      expect(list.contains('a')).toBe(false);
    });

    it('should remove states from another list', () => {
      list.add('b');
      const other = new ListValue('other', [], ['a', 'b']);
      evaluateListOperator(list, '-=', other);
      expect(list.contains('a')).toBe(false);
      expect(list.contains('b')).toBe(false);
    });
  });

  describe('? operator', () => {
    it('should check string state', () => {
      expect(evaluateListOperator(list, '?', 'a')).toBe(true);
      expect(evaluateListOperator(list, '?', 'b')).toBe(false);
    });

    it('should check any matching state from list', () => {
      const other = new ListValue('other', [], ['a', 'x']);
      expect(evaluateListOperator(list, '?', other)).toBe(true);
    });
  });

  describe('>= operator', () => {
    it('should check superset', () => {
      list.add('b');
      list.add('c');
      const other = new ListValue('other', [], ['a', 'b']);
      expect(evaluateListOperator(list, '>=', other)).toBe(true);
    });
  });

  describe('<= operator', () => {
    it('should check subset', () => {
      const other = new ListValue('other', [], ['a', 'b', 'c']);
      expect(evaluateListOperator(list, '<=', other)).toBe(true);
    });
  });

  describe('== operator', () => {
    it('should check equality', () => {
      const other = new ListValue('other', [], ['a']);
      expect(evaluateListOperator(list, '==', other)).toBe(true);
    });
  });
});

describe('door state machine example', () => {
  it('should work as a door state machine', () => {
    const doorState = new ListValue(
      'doorState',
      ['closed', 'locked', 'unlocked', 'open'],
      ['closed']
    );

    // Initially closed
    expect(doorState.contains('closed')).toBe(true);
    expect(doorState.contains('open')).toBe(false);

    // Unlock the door
    doorState.remove('closed');
    doorState.add('unlocked');
    expect(doorState.contains('closed')).toBe(false);
    expect(doorState.contains('unlocked')).toBe(true);

    // Open the door
    doorState.remove('unlocked');
    doorState.add('open');
    expect(doorState.contains('open')).toBe(true);
    expect(doorState.count()).toBe(1);
  });
});
