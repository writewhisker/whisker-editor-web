/**
 * Tests for LuaEngine - Control Flow Implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LuaEngine } from './LuaEngine';

describe('LuaEngine', () => {
  let engine: LuaEngine;

  beforeEach(() => {
    engine = new LuaEngine();
  });

  describe('Variable Operations', () => {
    it('should assign and retrieve variables', () => {
      const result = engine.execute('x = 42');

      expect(result.success).toBe(true);
      expect(engine.getVariable('x')).toBe(42);
    });

    it('should handle arithmetic operations', () => {
      const result = engine.execute('result = 10 + 20 * 2');

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(50);
    });

    it('should handle string assignments', () => {
      const result = engine.execute('name = "Alice"');

      expect(result.success).toBe(true);
      expect(engine.getVariable('name')).toBe('Alice');
    });

    it('should handle boolean values', () => {
      const result = engine.execute('flag = true');

      expect(result.success).toBe(true);
      expect(engine.getVariable('flag')).toBe(true);
    });
  });

  describe('If Statements', () => {
    it('should execute simple if statement when condition is true', () => {
      const code = `
        x = 10
        if x > 5 then
          result = "pass"
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('pass');
    });

    it('should skip if block when condition is false', () => {
      const code = `
        x = 3
        result = "initial"
        if x > 5 then
          result = "pass"
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('initial');
    });

    it('should execute else block when condition is false', () => {
      const code = `
        x = 3
        if x > 5 then
          result = "pass"
        else
          result = "fail"
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('fail');
    });

    it('should handle elseif branches', () => {
      const code = `
        score = 75
        if score >= 90 then
          grade = "A"
        elseif score >= 80 then
          grade = "B"
        elseif score >= 70 then
          grade = "C"
        else
          grade = "F"
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('grade')).toBe('C');
    });

    it('should handle complex conditions with logical operators', () => {
      const code = `
        age = 25
        score = 80
        if age >= 18 and score >= 70 then
          result = "approved"
        else
          result = "denied"
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('approved');
    });
  });

  describe('While Loops', () => {
    it('should execute while loop', () => {
      const code = `
        count = 0
        total = 0
        while count < 5 do
          total = total + count
          count = count + 1
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('total')).toBe(10); // 0+1+2+3+4
      expect(engine.getVariable('count')).toBe(5);
    });

    it('should not execute while loop if condition is initially false', () => {
      const code = `
        count = 10
        total = 0
        while count < 5 do
          total = total + count
          count = count + 1
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('total')).toBe(0);
      expect(engine.getVariable('count')).toBe(10);
    });

    it('should handle while loop with complex condition', () => {
      const code = `
        x = 1
        y = 10
        while x < 5 and y > 5 do
          x = x + 1
          y = y - 1
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('x')).toBe(5);
      expect(engine.getVariable('y')).toBe(6);
    });

    it('should prevent infinite loops with iteration limit', () => {
      const code = `
        x = 1
        while x > 0 do
          x = x + 1
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('exceeded maximum iterations');
    });
  });

  describe('For Loops', () => {
    it('should execute basic for loop', () => {
      const code = `
        total = 0
        for i = 1, 10 do
          total = total + i
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('total')).toBe(55); // 1+2+...+10
    });

    it('should execute for loop with custom step', () => {
      const code = `
        total = 0
        for i = 0, 10, 2 do
          total = total + i
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('total')).toBe(30); // 0+2+4+6+8+10
    });

    it('should execute for loop with negative step', () => {
      const code = `
        total = 0
        for i = 10, 1, -1 do
          total = total + i
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('total')).toBe(55); // 10+9+...+1
    });

    it('should execute for loop with variable bounds', () => {
      const code = `
        start = 5
        finish = 10
        total = 0
        for i = start, finish do
          total = total + i
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('total')).toBe(45); // 5+6+7+8+9+10
    });

    it('should prevent infinite loops with iteration limit', () => {
      const code = `
        total = 0
        for i = 1, 20000 do
          total = total + 1
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('exceeded maximum iterations');
    });
  });

  describe('Nested Control Structures', () => {
    it('should handle nested if statements', () => {
      const code = `
        x = 10
        y = 20
        if x > 5 then
          if y > 15 then
            result = "both"
          else
            result = "x only"
          end
        else
          result = "neither"
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('both');
    });

    it('should handle nested while loops', () => {
      const code = `
        total = 0
        i = 1
        while i <= 3 do
          j = 1
          while j <= 2 do
            total = total + 1
            j = j + 1
          end
          i = i + 1
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('total')).toBe(6); // 3 * 2
    });

    it('should handle nested for loops', () => {
      const code = `
        total = 0
        for i = 1, 3 do
          for j = 1, 2 do
            total = total + i + j
          end
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('total')).toBe(21); // (1+1)+(1+2) + (2+1)+(2+2) + (3+1)+(3+2)
    });

    it('should handle if inside while loop', () => {
      const code = `
        count = 0
        total = 0
        while count < 10 do
          if count % 2 == 0 then
            total = total + count
          end
          count = count + 1
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('total')).toBe(20); // 0+2+4+6+8
    });

    it('should handle while inside if', () => {
      const code = `
        mode = "loop"
        total = 0
        if mode == "loop" then
          i = 1
          while i <= 5 do
            total = total + i
            i = i + 1
          end
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('total')).toBe(15); // 1+2+3+4+5
    });
  });

  describe('Standard Library Functions', () => {
    it('should execute print function', () => {
      const code = 'print("Hello", "World")';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Hello\tWorld');
    });

    it('should execute math.random', () => {
      const code = 'x = math.random(1, 10)';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      const value = engine.getVariable('x');
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(10);
    });

    it('should execute math.floor', () => {
      const code = 'x = math.floor(3.7)';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('x')).toBe(3);
    });

    it('should execute string.upper', () => {
      const code = 'x = string.upper("hello")';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('x')).toBe('HELLO');
    });
  });

  describe('Complex Scripts', () => {
    it('should execute FizzBuzz logic', () => {
      const code = `
        output = ""
        for i = 1, 15 do
          if i % 15 == 0 then
            output = "FizzBuzz"
          elseif i % 3 == 0 then
            output = "Fizz"
          elseif i % 5 == 0 then
            output = "Buzz"
          else
            output = i
          end
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('output')).toBe('FizzBuzz');
    });

    it('should calculate factorial using while loop', () => {
      const code = `
        n = 5
        result = 1
        count = 1
        while count <= n do
          result = result * count
          count = count + 1
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(120); // 5!
    });

    it('should find prime numbers', () => {
      const code = `
        n = 17
        is_prime = true
        if n <= 1 then
          is_prime = false
        else
          i = 2
          while i * i <= n do
            if n % i == 0 then
              is_prime = false
            end
            i = i + 1
          end
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('is_prime')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid while syntax', () => {
      const code = 'while x < 10'; // missing 'do...end'

      const result = engine.execute(code);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid for syntax', () => {
      const code = 'for i = 1, 10'; // missing 'do...end'

      const result = engine.execute(code);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle invalid if syntax', () => {
      const code = 'if x > 5'; // missing 'then...end'

      const result = engine.execute(code);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle division by zero', () => {
      const code = 'x = 10 / 0';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('x')).toBe(0); // Safely returns 0
    });
  });

  describe('Engine State Management', () => {
    it('should persist variables across executions', () => {
      engine.execute('x = 10');
      engine.execute('y = 20');

      const result = engine.execute('z = x + y');

      expect(result.success).toBe(true);
      expect(engine.getVariable('z')).toBe(30);
    });

    it('should reset engine state', () => {
      engine.execute('x = 42');
      engine.reset();

      expect(engine.getVariable('x')).toBeUndefined();
    });

    it('should get all variables', () => {
      engine.execute('a = 1');
      engine.execute('b = 2');
      engine.execute('c = 3');

      const vars = engine.getAllVariables();

      expect(vars.a).toBe(1);
      expect(vars.b).toBe(2);
      expect(vars.c).toBe(3);
    });

    it('should set variables programmatically', () => {
      engine.setVariable('health', 100);

      const result = engine.execute('damage = 25; health = health - damage');

      expect(result.success).toBe(true);
      expect(engine.getVariable('health')).toBe(75);
    });
  });

  describe('Function Definitions', () => {
    it('should define and call a simple function', () => {
      const code = `
        function greet(name)
          return "Hello " .. name
        end
        result = greet("World")
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('Hello World');
    });

    it('should define function with no parameters', () => {
      const code = `
        function getValue()
          return 42
        end
        x = getValue()
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('x')).toBe(42);
    });

    it('should define function with multiple parameters', () => {
      const code = `
        function add(a, b, c)
          return a + b + c
        end
        sum = add(10, 20, 30)
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('sum')).toBe(60);
    });

    it('should handle function with local variables', () => {
      const code = `
        function calculate(x)
          temp = x * 2
          return temp + 10
        end
        result = calculate(5)
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(20);
      expect(engine.getVariable('temp')).toBe(10); // Function variables persist
    });

    it('should handle nested function calls', () => {
      const code = `
        function double(x)
          return x * 2
        end
        function addTen(x)
          return x + 10
        end
        result = addTen(double(5))
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(20);
    });

    it('should handle function without return (returns nil)', () => {
      const code = `
        function noReturn()
          x = 42
        end
        result = noReturn()
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBeNull();
      expect(engine.getVariable('x')).toBe(42);
    });

    it('should handle function with control flow', () => {
      const code = `
        function max(a, b)
          if a > b then
            return a
          else
            return b
          end
        end
        result = max(15, 10)
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(15);
    });

    it('should handle function with loops', () => {
      const code = `
        function factorial(n)
          result = 1
          for i = 1, n do
            result = result * i
          end
          return result
        end
        fact5 = factorial(5)
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('fact5')).toBe(120);
    });
  });

  describe('Tables', () => {
    it('should create empty table', () => {
      const code = 't = {}';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      const table = engine.getVariable('t');
      expect(table).toEqual({});
    });

    it('should create table with key-value pairs', () => {
      const code = 't = {name = "Alice", age = 30}';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      const table = engine.getVariable('t');
      expect(table).toEqual({
        name: 'Alice',
        age: 30,
      });
    });

    it('should create array-style table', () => {
      const code = 't = {10, 20, 30}';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      const table = engine.getVariable('t');
      expect(table).toEqual({
        '1': 10,
        '2': 20,
        '3': 30,
      });
    });

    it('should access table with bracket notation', () => {
      const code = `
        t = {name = "Bob"}
        result = t["name"]
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('Bob');
    });

    it('should access table with dot notation', () => {
      const code = `
        t = {score = 100}
        result = t.score
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(100);
    });

    it('should assign to table with bracket notation', () => {
      const code = `
        t = {}
        t["key"] = "value"
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      const table = engine.getVariable('t');
      expect(table).toEqual({ key: 'value' });
    });

    it('should assign to table with dot notation', () => {
      const code = `
        t = {}
        t.name = "Charlie"
        t.age = 25
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      const table = engine.getVariable('t');
      expect(table).toEqual({
        name: 'Charlie',
        age: 25,
      });
    });

    it('should use variable as table key', () => {
      const code = `
        t = {a = 10, b = 20}
        key = "a"
        result = t[key]
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(10);
    });

    it('should handle numeric table indices', () => {
      const code = `
        t = {100, 200, 300}
        result = t[2]
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(200);
    });

    it('should handle mixed table (keys and indices)', () => {
      const code = `
        t = {10, 20, name = "Test"}
        v1 = t[1]
        v2 = t.name
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('v1')).toBe(10);
      expect(engine.getVariable('v2')).toBe('Test');
    });
  });

  describe('String Concatenation', () => {
    it('should concatenate strings with .. operator', () => {
      const code = 'result = "Hello" .. " " .. "World"';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('Hello World');
    });

    it('should concatenate strings and numbers', () => {
      const code = 'result = "Score: " .. 100';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('Score: 100');
    });

    it('should concatenate with variables', () => {
      const code = `
        name = "Alice"
        age = 30
        result = "Name: " .. name .. ", Age: " .. age
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('Name: Alice, Age: 30');
    });

    it('should use concatenation in function return', () => {
      const code = `
        function greet(name)
          return "Hello, " .. name .. "!"
        end
        message = greet("World")
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('message')).toBe('Hello, World!');
    });
  });

  describe('Advanced Function and Table Integration', () => {
    it('should pass table to function', () => {
      const code = `
        function getTotal(t)
          return t.a + t.b
        end
        data = {a = 10, b = 20}
        result = getTotal(data)
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(30);
    });

    it('should return table from function', () => {
      const code = `
        function createPerson(name, age)
          return {name = name, age = age}
        end
        person = createPerson("Bob", 25)
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      const person = engine.getVariable('person');
      expect(person).toEqual({
        name: 'Bob',
        age: 25,
      });
    });

    it('should modify table in function', () => {
      const code = `
        function addField(t, key, value)
          t[key] = value
        end
        obj = {a = 1}
        addField(obj, "b", 2)
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      const obj = engine.getVariable('obj');
      expect(obj).toEqual({
        a: 1,
        b: 2,
      });
    });
  });

  describe('Enhanced Features (80% Parity)', () => {
    describe('Length Operator (#)', () => {
      it('should get length of string', () => {
        const code = 'len = #"hello"';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('len')).toBe(5);
      });

      it('should get length of table array', () => {
        const code = `
          t = {10, 20, 30, 40}
          len = #t
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('len')).toBe(4);
      });

      it('should get length of string variable', () => {
        const code = `
          s = "hello world"
          len = #s
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('len')).toBe(11);
      });
    });

    describe('Power Operator (^)', () => {
      it('should calculate power', () => {
        const code = 'x = 2 ^ 10';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('x')).toBe(1024);
      });

      it('should handle fractional powers', () => {
        const code = 'x = 9 ^ 0.5';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('x')).toBe(3);
      });
    });

    describe('Type Function', () => {
      it('should return "number" for numbers', () => {
        const code = 't = type(42)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('t')).toBe('number');
      });

      it('should return "string" for strings', () => {
        const code = 't = type("hello")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('t')).toBe('string');
      });

      it('should return "boolean" for booleans', () => {
        const code = 't = type(true)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('t')).toBe('boolean');
      });

      it('should return "table" for tables', () => {
        const code = 't = type({})';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('t')).toBe('table');
      });

      it('should return "nil" for nil', () => {
        const code = 't = type(nil)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('t')).toBe('nil');
      });
    });

    describe('tostring/tonumber Functions', () => {
      it('should convert number to string', () => {
        const code = 's = tostring(42)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('s')).toBe('42');
      });

      it('should convert string to number', () => {
        const code = 'n = tonumber("42")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('n')).toBe(42);
      });

      it('should return nil for invalid string', () => {
        const code = 'n = tonumber("hello")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('n')).toBeNull();
      });

      it('should handle hex with base', () => {
        const code = 'n = tonumber("ff", 16)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('n')).toBe(255);
      });
    });

    describe('Generic For Loops (pairs/ipairs)', () => {
      it('should iterate with pairs over table', () => {
        const code = `
          t = {a = 1, b = 2, c = 3}
          total = 0
          for k, v in pairs(t) do
            total = total + v
          end
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('total')).toBe(6);
      });

      it('should iterate with ipairs over array', () => {
        const code = `
          t = {10, 20, 30}
          total = 0
          for i, v in ipairs(t) do
            total = total + v
          end
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('total')).toBe(60);
      });

      it('should handle pairs with single variable', () => {
        const code = `
          t = {x = 1, y = 2}
          keys = ""
          for k in pairs(t) do
            keys = keys .. k
          end
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('keys').length).toBe(2);
      });

      it('should stop ipairs at first nil', () => {
        const code = `
          t = {}
          t[1] = "a"
          t[2] = "b"
          t[4] = "d"
          count = 0
          for i, v in ipairs(t) do
            count = count + 1
          end
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('count')).toBe(2);
      });
    });

    describe('Local Variables', () => {
      it('should declare local variable', () => {
        const code = `
          local x = 10
          y = x + 5
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('y')).toBe(15);
      });

      it('should shadow global with local', () => {
        engine.setVariable('x', 100);
        const code = `
          local x = 5
          y = x
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('y')).toBe(5);
        expect(engine.getVariable('x')).toBe(100); // Global unchanged
      });

      it('should declare local without value', () => {
        const code = `
          local x
          if x == nil then
            result = "nil"
          end
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('nil');
      });
    });

    describe('Repeat-Until Loops', () => {
      it('should execute repeat-until at least once', () => {
        const code = `
          x = 0
          repeat
            x = x + 1
          until true
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('x')).toBe(1);
      });

      it('should loop until condition is true', () => {
        const code = `
          x = 0
          repeat
            x = x + 1
          until x >= 5
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('x')).toBe(5);
      });

      it('should handle break in repeat-until', () => {
        const code = `
          x = 0
          repeat
            x = x + 1
            if x == 3 then
              break
            end
          until false
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('x')).toBe(3);
      });
    });

    describe('Extended Math Library', () => {
      it('should calculate math.min', () => {
        const code = 'x = math.min(5, 3, 8, 1)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('x')).toBe(1);
      });

      it('should calculate math.max', () => {
        const code = 'x = math.max(5, 3, 8, 1)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('x')).toBe(8);
      });

      it('should calculate math.sqrt', () => {
        const code = 'x = math.sqrt(16)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('x')).toBe(4);
      });

      it('should calculate math.pow', () => {
        const code = 'x = math.pow(2, 8)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('x')).toBe(256);
      });

      it('should access math.pi', () => {
        const code = 'x = math.pi';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('x')).toBeCloseTo(Math.PI, 10);
      });

      it('should calculate trigonometric functions', () => {
        const code = `
          s = math.sin(0)
          c = math.cos(0)
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('s')).toBe(0);
        expect(engine.getVariable('c')).toBe(1);
      });
    });

    describe('Extended String Library', () => {
      it('should get substring with string.sub', () => {
        const code = 's = string.sub("hello world", 1, 5)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('s')).toBe('hello');
      });

      it('should find pattern with string.find', () => {
        const code = 'pos = string.find("hello world", "world", 1, true)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('pos')).toBe(7);
      });

      it('should repeat string with string.rep', () => {
        const code = 's = string.rep("ab", 3)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('s')).toBe('ababab');
      });

      it('should reverse string with string.reverse', () => {
        const code = 's = string.reverse("hello")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('s')).toBe('olleh');
      });

      it('should format string with string.format', () => {
        const code = 's = string.format("Hello %s, you have %d points", "Player", 100)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('s')).toBe('Hello Player, you have 100 points');
      });

      it('should get char code with string.byte', () => {
        const code = 'b = string.byte("A", 1)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('b')).toBe(65);
      });

      it('should get char from code with string.char', () => {
        const code = 'c = string.char(65, 66, 67)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('c')).toBe('ABC');
      });
    });

    describe('Pattern Matching (Lua Patterns)', () => {
      it('should match literal strings', () => {
        const code = 'result = string.match("hello world", "world")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('world');
      });

      it('should match . for any character', () => {
        const code = 'result = string.match("hello", "h.llo")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('hello');
      });

      it('should match %a for letters', () => {
        const code = 'result = string.match("abc123", "%a+")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('abc');
      });

      it('should match %d for digits', () => {
        const code = 'result = string.match("abc123def", "%d+")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('123');
      });

      it('should match %s for whitespace', () => {
        const code = 'result = string.match("hello  world", "%s+")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('  ');
      });

      it('should match %w for alphanumeric', () => {
        const code = 'result = string.match("abc_123!def", "%w+")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('abc');
      });

      it('should match * quantifier (greedy, 0 or more)', () => {
        const code = 'result = string.match("aaa", "a*")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('aaa');
      });

      it('should match + quantifier (1 or more)', () => {
        const code = 'result = string.match("baaa", "a+")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('aaa');
      });

      it('should match ? quantifier (0 or 1)', () => {
        const code = `
          r1 = string.match("color", "colou?r")
          r2 = string.match("colour", "colou?r")
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('r1')).toBe('color');
        expect(engine.getVariable('r2')).toBe('colour');
      });

      it('should match - quantifier (lazy, 0 or more)', () => {
        const code = 'result = string.match("<tag>content</tag>", "<.->")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('<tag>');
      });

      it('should match ^ anchor at start', () => {
        const code = `
          r1 = string.match("hello world", "^hello")
          r2 = string.match("hello world", "^world")
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('r1')).toBe('hello');
        expect(engine.getVariable('r2')).toBeNull();
      });

      it('should match $ anchor at end', () => {
        const code = `
          r1 = string.match("hello world", "world$")
          r2 = string.match("hello world", "hello$")
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('r1')).toBe('world');
        expect(engine.getVariable('r2')).toBeNull();
      });

      it('should handle escape sequences %.', () => {
        const code = 'result = string.match("file.txt", "%.txt")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('.txt');
      });

      it('should return nil for no match', () => {
        const code = 'result = string.match("hello", "xyz")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBeNull();
      });

      it('should respect init position', () => {
        const code = 'result = string.match("hello hello", "hello", 3)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('hello');
      });

      it('should return start and end with string.find', () => {
        const code = `
          s, e = string.find("hello world", "world")
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('s')).toBe(7);
        expect(engine.getVariable('e')).toBe(11);
      });

      it('should gsub with string replacement', () => {
        const code = 'result = string.gsub("hello world", "world", "lua")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('hello lua');
      });

      it('should gsub with pattern', () => {
        const code = 'result = string.gsub("hello 123 world", "%d+", "NUM")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('hello NUM world');
      });

      it('should gsub with limit', () => {
        const code = 'result = string.gsub("aaa", "a", "b", 2)';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('bba');
      });

      it('should match character set [abc]', () => {
        const code = 'result = string.match("hello", "[aeiou]+")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('e');
      });

      it('should match character range [a-z]', () => {
        const code = 'result = string.match("Hello123", "[a-z]+")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('ello');
      });

      it('should match negated set [^abc]', () => {
        const code = 'result = string.match("abcXdef", "[^abc]+")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('Xdef');
      });

      it('should capture with parentheses', () => {
        const code = `
          full, word = string.match("hello world", "((%w+) world)")
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('full')).toBe('hello world');
        expect(engine.getVariable('word')).toBe('hello');
      });

      it('should match balanced patterns %b()', () => {
        const code = 'result = string.match("(a(b)c)d", "%b()")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('result')).toBe('(a(b)c)');
      });
    });

    describe('Extended Table Library', () => {
      it('should insert at end with table.insert', () => {
        const code = `
          t = {1, 2, 3}
          table.insert(t, 4)
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        const t = engine.getVariable('t');
        expect(t['4']).toBe(4);
      });

      it('should insert at position with table.insert', () => {
        const code = `
          t = {1, 2, 3}
          table.insert(t, 2, 10)
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        const t = engine.getVariable('t');
        expect(t['2']).toBe(10);
        expect(t['3']).toBe(2);
      });

      it('should remove from table with table.remove', () => {
        const code = `
          t = {1, 2, 3}
          removed = table.remove(t, 2)
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('removed')).toBe(2);
        const t = engine.getVariable('t');
        expect(t['2']).toBe(3);
      });

      it('should concatenate table with table.concat', () => {
        const code = `
          t = {"a", "b", "c"}
          s = table.concat(t, ", ")
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('s')).toBe('a, b, c');
      });

      it('should sort table with table.sort', () => {
        const code = `
          t = {3, 1, 4, 1, 5, 9}
          table.sort(t)
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        const t = engine.getVariable('t');
        expect(t['1']).toBe(1);
        expect(t['2']).toBe(1);
        expect(t['6']).toBe(9);
      });
    });

    describe('Break Statement', () => {
      it('should break from while loop', () => {
        const code = `
          x = 0
          while true do
            x = x + 1
            if x == 5 then
              break
            end
          end
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('x')).toBe(5);
      });

      it('should break from for loop', () => {
        const code = `
          total = 0
          for i = 1, 100 do
            total = total + i
            if i == 10 then
              break
            end
          end
        `;
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('total')).toBe(55);
      });
    });

    describe('Assert and Error Functions', () => {
      it('should pass assert when condition is true', () => {
        const code = 'assert(true, "Should not fail")';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
      });

      it('should fail assert when condition is false', () => {
        const code = 'assert(false, "Expected failure")';
        const result = engine.execute(code);
        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain('Expected failure');
      });

      it('should throw error with message', () => {
        const code = 'error("Something went wrong")';
        const result = engine.execute(code);
        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain('Something went wrong');
      });
    });

    describe('Hex Number Literals', () => {
      it('should parse hex numbers', () => {
        const code = 'x = 0xFF';
        const result = engine.execute(code);
        expect(result.success).toBe(true);
        expect(engine.getVariable('x')).toBe(255);
      });
    });
  });

  describe('Multiple Return Values (Lua 5.1+)', () => {
    it('should handle multiple return values from function', () => {
      const code = `
        function multiReturn()
          return 1, 2, 3
        end
        a, b, c = multiReturn()
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('a')).toBe(1);
      expect(engine.getVariable('b')).toBe(2);
      expect(engine.getVariable('c')).toBe(3);
    });

    it('should handle local multiple assignment', () => {
      const code = `
        local a, b, c = 1, 2, 3
        result = a + b + c
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(6);
    });

    it('should assign nil to extra variables', () => {
      const code = `
        local a, b, c = 1, 2
        result_a = a
        result_b = b
        result_c = c
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result_a')).toBe(1);
      expect(engine.getVariable('result_b')).toBe(2);
      expect(engine.getVariable('result_c')).toBeNull();
    });

    it('should discard extra values', () => {
      const code = `
        local a, b = 1, 2, 3, 4
        result_a = a
        result_b = b
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result_a')).toBe(1);
      expect(engine.getVariable('result_b')).toBe(2);
    });

    it('should handle unpack with multiple return values', () => {
      const code = `
        t = {10, 20, 30}
        a, b, c = unpack(t)
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('a')).toBe(10);
      expect(engine.getVariable('b')).toBe(20);
      expect(engine.getVariable('c')).toBe(30);
    });

    it('should handle function returning multiple values to local', () => {
      const code = `
        function getCoords()
          return 100, 200
        end
        local x, y = getCoords()
        result_x = x
        result_y = y
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result_x')).toBe(100);
      expect(engine.getVariable('result_y')).toBe(200);
    });

    it('should handle multiple local declarations without assignment', () => {
      const code = `
        local a, b, c
        a = 1
        b = 2
        c = 3
        result = a + b + c
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(6);
    });
  });

  describe('Variadic Functions (Lua 5.1+)', () => {
    it('should define and call a variadic function', () => {
      const code = `
        function sum(...)
          local total = 0
          local args = {...}
          for i = 1, #args do
            total = total + args[i]
          end
          return total
        end
        result = sum(1, 2, 3, 4, 5)
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(15);
    });

    it('should support select("#", ...) to get vararg count', () => {
      const code = `
        function count(...)
          return select("#", ...)
        end
        result = count(10, 20, 30)
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(3);
    });

    it('should support select(n, ...) to get nth vararg', () => {
      const code = `
        function getSecond(...)
          return select(2, ...)
        end
        result = getSecond("a", "b", "c")
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('b');
    });

    it('should support arg table (Lua 5.1 style)', () => {
      const code = `
        function first(...)
          return arg[1]
        end
        result = first("hello", "world")
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('hello');
    });

    it('should handle mixed named params and varargs', () => {
      const code = `
        function greet(name, ...)
          local titles = {...}
          return name
        end
        result = greet("Alice", "Dr.", "PhD")
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('Alice');
    });

    it('should handle varargs in local function', () => {
      const code = `
        local function varfunc(...)
          local a = {...}
          return #a
        end
        result = varfunc(1, 2, 3)
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(3);
    });

    it('should return nil for ... when no varargs', () => {
      const code = `
        function noVarargs()
          return ...
        end
        result = noVarargs()
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBeNull();
    });

    it('should support arg.n for vararg count', () => {
      const code = `
        function getCount(...)
          return arg.n
        end
        result = getCount(1, 2, 3, 4)
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(4);
    });
  });

  describe('Goto and Labels (Lua 5.2+)', () => {
    it('should skip code with forward goto', () => {
      const code = `
        x = 1
        goto skip
        x = 2
        ::skip::
        x = x + 10
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('x')).toBe(11); // 1 + 10, skipping x = 2
    });

    it('should support backward goto for loops', () => {
      const code = `
        count = 0
        ::loop::
        count = count + 1
        if count < 5 then
          goto loop
        end
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('count')).toBe(5);
    });

    it('should handle multiple labels', () => {
      const code = `
        result = ""
        goto first
        ::second::
        result = result .. "2"
        goto done
        ::first::
        result = result .. "1"
        goto second
        ::done::
        result = result .. "3"
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('123');
    });

    it('should handle labels with no jumps', () => {
      const code = `
        x = 1
        ::unused::
        x = x + 1
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('x')).toBe(2);
    });

    it('should support goto in conditionals', () => {
      const code = `
        x = 10
        if x > 5 then
          goto success
        end
        result = "fail"
        goto done
        ::success::
        result = "pass"
        ::done::
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('pass');
    });
  });

  describe('Lua 5.4 Features', () => {
    it('should support _VERSION global', () => {
      const result = engine.execute('v = _VERSION');
      expect(result.success).toBe(true);
      expect(engine.getVariable('v')).toBe('Lua 5.4');
    });

    it('should support rawlen for strings', () => {
      const result = engine.execute('len = rawlen("hello")');
      expect(result.success).toBe(true);
      expect(engine.getVariable('len')).toBe(5);
    });

    it('should support rawlen for tables', () => {
      const code = `
        t = {1, 2, 3, 4, 5}
        len = rawlen(t)
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('len')).toBe(5);
    });

    it('should support warn function', () => {
      const result = engine.execute('warn("test warning")');
      expect(result.success).toBe(true);
      expect(result.output).toContain('[warn] test warning');
    });

    it('should support table.move', () => {
      const code = `
        a = {1, 2, 3}
        table.move(a, 1, 3, 2)
        result = a[4]
      `;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(3);
    });

    it('should support hex literals', () => {
      const result = engine.execute('x = 0xFF');
      expect(result.success).toBe(true);
      expect(engine.getVariable('x')).toBe(255);
    });

    it('should support negative hex literals', () => {
      const result = engine.execute('x = -0x10');
      expect(result.success).toBe(true);
      expect(engine.getVariable('x')).toBe(-16);
    });

    it('should support scientific notation', () => {
      const result = engine.execute('x = 1.5e3');
      expect(result.success).toBe(true);
      expect(engine.getVariable('x')).toBe(1500);
    });

    it('should support long string literals [[...]]', () => {
      const code = 's = [[hello world]]';
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('s')).toBe('hello world');
    });

    it('should support long string with equals [=[...]=]', () => {
      const code = 's = [=[contains [[brackets]]]=]';
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('s')).toBe('contains [[brackets]]');
    });

    it('should support long string multiline', () => {
      const code = `s = [[line1
line2
line3]]`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('s')).toBe('line1\nline2\nline3');
    });

    it('should support anonymous functions', () => {
      const code = `add = function(a, b)
        return a + b
      end
      result = add(3, 4)`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(7);
    });

    it('should support anonymous functions with multiple statements', () => {
      const code = `double = function(x)
        local y = x * 2
        return y
      end
      result = double(5)`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(10);
    });

    it('should support anonymous functions as table values', () => {
      const code = `t = {
        add = function(a, b) return a + b end
      }
      result = t.add(2, 3)`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(5);
    });

    it('should support passing functions as arguments', () => {
      const code = `function apply(fn, x)
        return fn(x)
      end
      sq = function(n) return n * n end
      result = apply(sq, 4)`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(16);
    });

    it('should support anonymous variadic functions', () => {
      const code = `sum = function(...)
        local args = {...}
        local total = 0
        for i = 1, #args do
          total = total + args[i]
        end
        return total
      end
      result = sum(1, 2, 3, 4, 5)`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(15);
    });

    it('should support string.pack with bytes', () => {
      const code = `packed = string.pack("BBB", 65, 66, 67)`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('packed')).toBe('ABC');
    });

    it('should support string.unpack with bytes', () => {
      const code = `a, b, c = string.unpack("BBB", "ABC")`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('a')).toBe(65);
      expect(engine.getVariable('b')).toBe(66);
      expect(engine.getVariable('c')).toBe(67);
    });

    it('should support string.pack with shorts', () => {
      const code = `packed = string.pack("<HH", 0x0102, 0x0304)`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      // Little endian: 02 01 04 03
      const packed = engine.getVariable('packed') as string;
      expect(packed.charCodeAt(0)).toBe(0x02);
      expect(packed.charCodeAt(1)).toBe(0x01);
      expect(packed.charCodeAt(2)).toBe(0x04);
      expect(packed.charCodeAt(3)).toBe(0x03);
    });

    it('should support string.pack with zero-terminated strings', () => {
      const code = `packed = string.pack("zz", "hello", "world")`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('packed')).toBe('hello\0world\0');
    });

    it('should support string.packsize', () => {
      const code = `size = string.packsize("BBhI")`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('size')).toBe(8); // 1 + 1 + 2 + 4
    });

    it('should support setmetatable for tables', () => {
      const code = `t = {a = 1, b = 2}
      mt = {__index = {c = 3}}
      setmetatable(t, mt)
      result = t.c`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(3);
    });

    it('should support load() for dynamic code execution', () => {
      const code = `chunk = "x = 10 + 5"
      f = load(chunk)
      f()`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('x')).toBe(15);
    });

    it('should support load() with return value', () => {
      const code = `f = load("return 42")
      result = f()`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(42);
    });

    it('should support loadstring() for Lua 5.1 compatibility', () => {
      const code = `f = loadstring("y = 20 * 2")
      f()`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('y')).toBe(40);
    });

    it('should support load() with multi-statement code', () => {
      const code = `chunk = [[
        a = 1
        b = 2
        c = a + b
      ]]
      f = load(chunk)
      f()`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('c')).toBe(3);
    });

    it('should support collectgarbage with collect option', () => {
      const code = `result = collectgarbage("collect")`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(0);
    });

    it('should support collectgarbage with isrunning option', () => {
      const code = `result = collectgarbage("isrunning")`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(true);
    });

    it('should support collectgarbage with count option', () => {
      const code = `result = collectgarbage("count")`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(typeof engine.getVariable('result')).toBe('number');
    });

    it('should support string.dump for named functions', () => {
      const code = `function myFunc(a, b)
        return a + b
      end
      dumped = string.dump("myFunc")`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      const dumped = engine.getVariable('dumped') as string;
      expect(dumped.startsWith('\x1bLuaS')).toBe(true);
      expect(dumped).toContain('return a + b');
    });

    it('should support string.dump for anonymous functions', () => {
      const code = `f = function(x) return x * 2 end
      dumped = string.dump(f)`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      const dumped = engine.getVariable('dumped') as string;
      expect(dumped.startsWith('\x1bLuaS')).toBe(true);
      expect(dumped).toContain('return x * 2');
    });

    it('should support math.frexp', () => {
      const code = `m, e = math.frexp(8)`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('m')).toBe(0.5);
      expect(engine.getVariable('e')).toBe(4); // 0.5 * 2^4 = 8
    });

    it('should support math.ldexp', () => {
      const code = `result = math.ldexp(0.5, 4)`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(8); // 0.5 * 2^4 = 8
    });

    it('should support _VERSION global', () => {
      const code = `result = _VERSION`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('Lua 5.4');
    });

    it('should support _G global table', () => {
      const code = `x = 42
      result = type(_G)`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('table');
    });

    it('should support package.preload for require', () => {
      const code = `function mymod_loader()
        return { value = 123 }
      end
      package.preload["mymod"] = mymod_loader
      mod = require("mymod")
      result = mod.value`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(123);
    });

    it('should cache modules in package.loaded', () => {
      const code = `counter = 0
      function counter_loader()
        counter = counter + 1
        return { count = counter }
      end
      package.preload["counter_mod"] = counter_loader
      mod1 = require("counter_mod")
      mod2 = require("counter_mod")
      result = counter`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      // Should only be called once due to caching
      expect(engine.getVariable('result')).toBe(1);
    });

    it('should support <const> attribute preventing reassignment', () => {
      const code = `local x <const> = 10
      x = 20`;
      const result = engine.execute(code);
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('const');
    });

    it('should allow <const> variables to be read', () => {
      const code = `local x <const> = 42
      result = x`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(42);
    });

    it('should call __close metamethod on scope exit', () => {
      const code = `closed = false
      function closer(self, err)
        closed = true
      end
      function test()
        local t <close> = setmetatable({}, { __close = closer })
        return 123
      end
      result = test()`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(123);
      expect(engine.getVariable('closed')).toBe(true);
    });

    it('should allow nil for <close> variables', () => {
      const code = `function test()
        local x <close> = nil
        result = "ok"
      end
      test()`;
      const result = engine.execute(code);
      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('ok');
    });

    it('should error on non-closable value for <close> variable', () => {
      const code = `function test()
        local x <close> = 42
      end
      test()`;
      const result = engine.execute(code);
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('non-closable');
    });
  });
});
