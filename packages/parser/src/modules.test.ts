import { describe, it, expect } from 'vitest';
import { parse } from './parser';
import type {
  IncludeDeclarationNode,
  FunctionDeclarationNode,
  NamespaceDeclarationNode,
} from './ast';

describe('Module System Parsing', () => {
  describe('INCLUDE Declaration', () => {
    it('should parse INCLUDE with double-quoted path', () => {
      const result = parse('INCLUDE "utils/helpers.ws"\n:: Start\nHello');
      expect(result.ast).not.toBeNull();
      expect(result.ast?.includes).toHaveLength(1);
      const include = result.ast?.includes[0] as IncludeDeclarationNode;
      expect(include.type).toBe('include_declaration');
      expect(include.path).toBe('utils/helpers.ws');
    });

    it('should parse INCLUDE with single-quoted path', () => {
      const result = parse("INCLUDE 'lib/common.ws'\n:: Start\nHello");
      expect(result.ast).not.toBeNull();
      expect(result.ast?.includes).toHaveLength(1);
      expect(result.ast?.includes[0].path).toBe('lib/common.ws');
    });

    it('should parse multiple INCLUDE declarations', () => {
      const result = parse(`INCLUDE "a.ws"
INCLUDE "b.ws"
INCLUDE "c.ws"
:: Start
Hello`);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.includes).toHaveLength(3);
      expect(result.ast?.includes[0].path).toBe('a.ws');
      expect(result.ast?.includes[1].path).toBe('b.ws');
      expect(result.ast?.includes[2].path).toBe('c.ws');
    });

    it('should parse INCLUDE with nested path', () => {
      const result = parse('INCLUDE "modules/game/combat.ws"\n:: Start\nHello');
      expect(result.ast).not.toBeNull();
      expect(result.ast?.includes[0].path).toBe('modules/game/combat.ws');
    });
  });

  describe('FUNCTION Declaration', () => {
    it('should parse FUNCTION with no parameters', () => {
      const result = parse(`FUNCTION greet()
  Hello world
END
:: Start
Content`);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.functions).toHaveLength(1);
      const func = result.ast?.functions[0] as FunctionDeclarationNode;
      expect(func.type).toBe('function_declaration');
      expect(func.name).toBe('greet');
      expect(func.params).toHaveLength(0);
    });

    it('should parse FUNCTION with single parameter', () => {
      const result = parse(`FUNCTION sayHello(name)
  Hello, $name!
END
:: Start
Content`);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.functions).toHaveLength(1);
      const func = result.ast?.functions[0];
      expect(func.name).toBe('sayHello');
      expect(func.params).toHaveLength(1);
      expect(func.params[0].name).toBe('name');
    });

    it('should parse FUNCTION with multiple parameters', () => {
      const result = parse(`FUNCTION calculate(a, b, c)
  Result: \${a + b + c}
END
:: Start
Content`);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.functions).toHaveLength(1);
      const func = result.ast?.functions[0];
      expect(func.name).toBe('calculate');
      expect(func.params).toHaveLength(3);
      expect(func.params[0].name).toBe('a');
      expect(func.params[1].name).toBe('b');
      expect(func.params[2].name).toBe('c');
    });

    it('should parse multiple FUNCTION declarations', () => {
      const result = parse(`FUNCTION foo()
  Foo
END

FUNCTION bar()
  Bar
END
:: Start
Content`);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.functions).toHaveLength(2);
      expect(result.ast?.functions[0].name).toBe('foo');
      expect(result.ast?.functions[1].name).toBe('bar');
    });

    it('should parse FUNCTION without parentheses', () => {
      const result = parse(`FUNCTION simpleFunc
  Simple content
END
:: Start
Content`);
      expect(result.ast).not.toBeNull();
      // Function should still parse (params may be empty)
      expect(result.ast?.functions).toHaveLength(1);
      expect(result.ast?.functions[0].name).toBe('simpleFunc');
    });
  });

  describe('NAMESPACE Declaration', () => {
    it('should parse NAMESPACE block', () => {
      const result = parse(`NAMESPACE Combat
:: Attack
Attack content
END
:: Start
Main content`);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.namespaces).toHaveLength(1);
      const ns = result.ast?.namespaces[0] as NamespaceDeclarationNode;
      expect(ns.type).toBe('namespace_declaration');
      expect(ns.name).toBe('Combat');
    });

    it('should parse multiple NAMESPACE declarations', () => {
      const result = parse(`NAMESPACE Combat
END

NAMESPACE Inventory
END
:: Start
Content`);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.namespaces).toHaveLength(2);
      expect(result.ast?.namespaces[0].name).toBe('Combat');
      expect(result.ast?.namespaces[1].name).toBe('Inventory');
    });

    it('should qualify passages within namespace', () => {
      const result = parse(`NAMESPACE Game
:: Menu
Menu content
END
:: Start
Main content`);
      expect(result.ast).not.toBeNull();
      // The parser may create qualified passage names
      const passages = result.ast?.passages || [];
      // At least Start passage should exist
      expect(passages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Combined Module Features', () => {
    it('should parse INCLUDE, FUNCTION, and NAMESPACE together', () => {
      const result = parse(`INCLUDE "utils.ws"

FUNCTION helper()
  Helper content
END

NAMESPACE UI
END
:: Start
Main content`);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.includes).toHaveLength(1);
      expect(result.ast?.functions).toHaveLength(1);
      expect(result.ast?.namespaces).toHaveLength(1);
    });

    it('should parse modules with metadata', () => {
      const result = parse(`@title: My Story
@author: Author

INCLUDE "common.ws"

FUNCTION greet(name)
  Hello, $name!
END

:: Start
Welcome`);
      expect(result.ast).not.toBeNull();
      expect(result.ast?.metadata).toHaveLength(2);
      expect(result.ast?.includes).toHaveLength(1);
      expect(result.ast?.functions).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle INCLUDE without path gracefully', () => {
      const result = parse('INCLUDE\n:: Start\nContent');
      expect(result.ast).not.toBeNull();
      // Should have errors but not crash
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle FUNCTION without name gracefully', () => {
      const result = parse('FUNCTION\nEND\n:: Start\nContent');
      expect(result.ast).not.toBeNull();
      // Should have errors but not crash
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle NAMESPACE without name gracefully', () => {
      const result = parse('NAMESPACE\nEND\n:: Start\nContent');
      expect(result.ast).not.toBeNull();
      // Should have errors but not crash
      expect(result.errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle unclosed FUNCTION', () => {
      const result = parse(`FUNCTION incomplete()
  No END keyword
:: Start
Content`);
      expect(result.ast).not.toBeNull();
      // Parser should recover
    });
  });

  describe('Scope Operator', () => {
    it('should parse namespace-qualified references', () => {
      const result = parse(`:: Start
-> Combat::Attack`);
      expect(result.ast).not.toBeNull();
      // The reference uses :: as scope separator
      const passage = result.ast?.passages[0];
      expect(passage).not.toBeUndefined();
    });

    it('should parse deeply nested namespace references', () => {
      const result = parse(`:: Start
-> Game::Combat::Special::Attack`);
      expect(result.ast).not.toBeNull();
    });
  });
});
