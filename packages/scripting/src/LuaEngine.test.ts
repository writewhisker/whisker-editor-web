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

  describe('Generic For Loops (pairs/ipairs)', () => {
    it('should iterate over table with pairs', () => {
      const code = `
        t = {a = 1, b = 2, c = 3}
        sum = 0
        for k, v in pairs(t) do
          sum = sum + v
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('sum')).toBe(6);
    });

    it('should iterate over array with ipairs', () => {
      const code = `
        t = {10, 20, 30, 40}
        sum = 0
        for i, v in ipairs(t) do
          sum = sum + v
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('sum')).toBe(100);
    });

    it('should get keys with pairs', () => {
      const code = `
        t = {name = "Alice", age = 30}
        keys = ""
        for k, v in pairs(t) do
          keys = keys .. k .. ","
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      const keys = engine.getVariable('keys');
      expect(keys).toContain('name');
      expect(keys).toContain('age');
    });

    it('should get indices with ipairs', () => {
      const code = `
        t = {"a", "b", "c"}
        indices = 0
        for i, v in ipairs(t) do
          indices = indices + i
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('indices')).toBe(6); // 1+2+3
    });

    it('should stop ipairs at first nil', () => {
      const code = `
        t = {1, 2, 3}
        t[5] = 5
        count = 0
        for i, v in ipairs(t) do
          count = count + 1
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('count')).toBe(3); // Stops at index 4 (nil)
    });
  });

  describe('Extended Math Library', () => {
    it('should calculate math.min', () => {
      const code = 'result = math.min(5, 3, 8, 1, 9)';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(1);
    });

    it('should calculate math.max', () => {
      const code = 'result = math.max(5, 3, 8, 1, 9)';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(9);
    });

    it('should calculate math.sqrt', () => {
      const code = 'result = math.sqrt(16)';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(4);
    });

    it('should calculate math.pow', () => {
      const code = 'result = math.pow(2, 10)';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(1024);
    });

    it('should calculate math.sin', () => {
      const code = 'result = math.sin(0)';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBeCloseTo(0);
    });

    it('should calculate math.cos', () => {
      const code = 'result = math.cos(0)';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBeCloseTo(1);
    });

    it('should access math.pi constant', () => {
      const code = 'result = math.pi';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBeCloseTo(Math.PI);
    });

    it('should calculate math.log', () => {
      const code = 'result = math.log(math.exp(1))';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBeCloseTo(1);
    });
  });

  describe('Extended String Library', () => {
    it('should use string.sub', () => {
      const code = 'result = string.sub("Hello World", 1, 5)';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('Hello');
    });

    it('should use string.sub with negative indices', () => {
      const code = 'result = string.sub("Hello World", -5)';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('World');
    });

    it('should use string.find', () => {
      const code = 'result = string.find("Hello World", "World")';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(7);
    });

    it('should use string.gsub', () => {
      const code = 'result = string.gsub("hello hello", "hello", "world")';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('world world');
    });

    it('should use string.format', () => {
      const code = 'result = string.format("Name: %s, Age: %d", "Alice", 30)';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('Name: Alice, Age: 30');
    });

    it('should use string.rep', () => {
      const code = 'result = string.rep("ab", 3)';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('ababab');
    });

    it('should use string.reverse', () => {
      const code = 'result = string.reverse("hello")';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('olleh');
    });

    it('should use string.byte', () => {
      const code = 'result = string.byte("A")';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(65);
    });

    it('should use string.char', () => {
      const code = 'result = string.char(65, 66, 67)';

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('ABC');
    });
  });

  describe('Extended Table Library', () => {
    it('should use table.remove', () => {
      const code = `
        t = {1, 2, 3, 4, 5}
        removed = table.remove(t)
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('removed')).toBe(5);
    });

    it('should use table.concat', () => {
      const code = `
        t = {"a", "b", "c"}
        result = table.concat(t, "-")
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('a-b-c');
    });

    it('should use table.sort', () => {
      const code = `
        t = {3, 1, 4, 1, 5, 9, 2, 6}
        table.sort(t)
        first = t[1]
        last = t[8]
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('first')).toBe(1);
      expect(engine.getVariable('last')).toBe(9);
    });
  });

  describe('Utility Functions', () => {
    it('should use type()', () => {
      const code = `
        t1 = type(42)
        t2 = type("hello")
        t3 = type(true)
        t4 = type(nil)
        t5 = type({})
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('t1')).toBe('number');
      expect(engine.getVariable('t2')).toBe('string');
      expect(engine.getVariable('t3')).toBe('boolean');
      expect(engine.getVariable('t4')).toBe('nil');
      expect(engine.getVariable('t5')).toBe('table');
    });

    it('should use tonumber()', () => {
      const code = `
        n1 = tonumber("42")
        n2 = tonumber("3.14")
        n3 = tonumber("ff", 16)
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('n1')).toBe(42);
      expect(engine.getVariable('n2')).toBe(3);
      expect(engine.getVariable('n3')).toBe(255);
    });

    it('should use tostring()', () => {
      const code = `
        s1 = tostring(42)
        s2 = tostring(true)
        s3 = tostring(nil)
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('s1')).toBe('42');
      expect(engine.getVariable('s2')).toBe('true');
      expect(engine.getVariable('s3')).toBe('nil');
    });

    it('should use assert()', () => {
      const code1 = 'assert(true, "should pass")';
      const result1 = engine.execute(code1);
      expect(result1.success).toBe(true);

      const code2 = 'assert(false, "should fail")';
      const result2 = engine.execute(code2);
      expect(result2.success).toBe(false);
      expect(result2.errors[0]).toContain('should fail');
    });

    it('should use error()', () => {
      const code = 'error("test error")';

      const result = engine.execute(code);

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('test error');
    });
  });

  describe('Metatables', () => {
    it('should set and get metatable', () => {
      const code = `
        t = {}
        mt = {__index = {x = 10}}
        setmetatable(t, mt)
        got_mt = getmetatable(t)
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('got_mt')).toBeDefined();
    });

    it('should remove metatable with nil', () => {
      const code = `
        t = {}
        mt = {}
        setmetatable(t, mt)
        setmetatable(t, nil)
        got_mt = getmetatable(t)
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('got_mt')).toBeNull();
    });
  });

  describe('Raw Table Access', () => {
    it('should use rawget', () => {
      const code = `
        t = {a = 10, b = 20}
        result = rawget(t, "a")
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe(10);
    });

    it('should use rawset', () => {
      const code = `
        t = {}
        rawset(t, "key", "value")
        result = t.key
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('value');
    });
  });

  describe('Select and Unpack', () => {
    it('should use select', () => {
      const code = `
        result = select(2, "a", "b", "c")
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('b');
    });
  });

  describe('Complex Integration Tests', () => {
    it('should calculate sum of values using pairs', () => {
      const code = `
        data = {x = 10, y = 20, z = 30}
        total = 0
        for key, value in pairs(data) do
          total = total + value
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('total')).toBe(60);
    });

    it('should filter array elements', () => {
      const code = `
        numbers = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
        evens = {}
        count = 0
        for i, v in ipairs(numbers) do
          if v % 2 == 0 then
            count = count + 1
            evens[count] = v
          end
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('count')).toBe(5);
      const evens = engine.getVariable('evens');
      expect(evens).toEqual({ '1': 2, '2': 4, '3': 6, '4': 8, '5': 10 });
    });

    it('should build a string from table values', () => {
      const code = `
        parts = {"Hello", " ", "World", "!"}
        result = ""
        for i, part in ipairs(parts) do
          result = result .. part
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('result')).toBe('Hello World!');
    });

    it('should count specific values', () => {
      const code = `
        items = {10, 20, 30, 40, 50}
        count = 0
        for i, v in ipairs(items) do
          if v > 20 then
            count = count + 1
          end
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('count')).toBe(3); // 30, 40, 50 are > 20
    });

    it('should transform table values', () => {
      const code = `
        source = {a = 10, b = 20, c = 30}
        total = 0
        for k, v in pairs(source) do
          total = total + v * 2
        end
      `;

      const result = engine.execute(code);

      expect(result.success).toBe(true);
      expect(engine.getVariable('total')).toBe(120); // (10+20+30)*2
    });
  });
});
