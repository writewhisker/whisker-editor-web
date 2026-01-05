# LuaEngine Limitations & Compatibility Guide

**Status**: Production Documentation
**Last Updated**: 2025-01-05 (Updated after Phase 1 & 2 parity implementation)
**Priority**: CRITICAL

---

## ⚠️ CRITICAL: Preview vs Production Runtime Differences

whisker-editor-web uses a **browser-based Lua engine** for preview/testing. This engine has been significantly enhanced but still has some differences from the production whisker-core runtime.

**Production Runtime**: whisker-core uses native Lua 5.1+ with full language support
**Preview Runtime**: whisker-editor-web uses custom TypeScript Lua interpreter (~80% Lua 5.1 compatibility)

---

## Supported Features ✅

### Variables
- ✅ Variable assignment: `x = 10`
- ✅ Number type: integers and floats
- ✅ String type: `"text"` and `'text'`
- ✅ Boolean type: `true`, `false`
- ✅ Nil type: `nil`
- ✅ Table type: `{key = value}`
- ✅ Local variables: `local x = 10`
- ✅ Variable references

### Operators

**Arithmetic** (Fully Supported):
- ✅ Addition: `a + b`
- ✅ Subtraction: `a - b`
- ✅ Multiplication: `a * b`
- ✅ Division: `a / b`
- ✅ Modulo: `a % b`
- ✅ Power: `a ^ b`
- ✅ Negation: `-a`
- ✅ String concatenation: `a .. b`
- ✅ Length: `#t`

**Comparison** (Fully Supported):
- ✅ Equal: `a == b`
- ✅ Not equal: `a ~= b`
- ✅ Less than: `a < b`
- ✅ Greater than: `a > b`
- ✅ Less than or equal: `a <= b`
- ✅ Greater than or equal: `a >= b`

**Logical** (Fully Supported):
- ✅ AND: `a and b`
- ✅ OR: `a or b`
- ✅ NOT: `not a`

### Control Flow ✅

**If Statements** (Fully Supported):
- ✅ Simple if: `if condition then ... end`
- ✅ If-else: `if condition then ... else ... end`
- ✅ If-elseif-else: `if cond1 then ... elseif cond2 then ... else ... end`
- ✅ Nested if statements

**While Loops** (Fully Supported):
- ✅ Basic while: `while condition do ... end`
- ✅ Iteration limit protection (max 10,000 iterations)
- ✅ Break statement support

**For Loops** (Fully Supported):
- ✅ Numeric for: `for i = 1, 10 do ... end`
- ✅ With step: `for i = 0, 10, 2 do ... end`
- ✅ Backward: `for i = 10, 1, -1 do ... end`
- ✅ Generic for with pairs: `for k, v in pairs(t) do ... end`
- ✅ Generic for with ipairs: `for i, v in ipairs(t) do ... end`
- ✅ Iteration limit protection (max 10,000 iterations)

**Repeat-Until** (Fully Supported):
- ✅ `repeat ... until condition`

### Standard Library ✅

**Math Functions** (15 functions):
- ✅ `math.abs(x)` - Absolute value
- ✅ `math.floor(x)` - Floor function
- ✅ `math.ceil(x)` - Ceiling function
- ✅ `math.min(...)` - Minimum value
- ✅ `math.max(...)` - Maximum value
- ✅ `math.sqrt(x)` - Square root
- ✅ `math.sin(x)` - Sine
- ✅ `math.cos(x)` - Cosine
- ✅ `math.tan(x)` - Tangent
- ✅ `math.exp(x)` - Exponential
- ✅ `math.log(x)` - Natural logarithm
- ✅ `math.pow(x, y)` - Power
- ✅ `math.random(min, max)` - Random number
- ✅ `math.randomseed(seed)` - Set random seed
- ✅ `math.pi` - Pi constant
- ✅ `math.huge` - Infinity constant

**String Functions** (12 functions):
- ✅ `string.upper(s)` - Convert to uppercase
- ✅ `string.lower(s)` - Convert to lowercase
- ✅ `string.len(s)` - String length
- ✅ `string.sub(s, i, j)` - Substring
- ✅ `string.rep(s, n)` - Repeat string
- ✅ `string.reverse(s)` - Reverse string
- ✅ `string.byte(s, i)` - Get byte value
- ✅ `string.char(...)` - Create string from bytes
- ✅ `string.find(s, pattern)` - Find pattern (basic)
- ✅ `string.gsub(s, pattern, repl)` - Replace pattern (basic)
- ✅ `string.match(s, pattern)` - Match pattern (basic)
- ✅ `string.format(fmt, ...)` - Format string

**Table Functions** (6 functions):
- ✅ `table.insert(t, value)` - Insert at end
- ✅ `table.insert(t, pos, value)` - Insert at position
- ✅ `table.remove(t, pos)` - Remove at position
- ✅ `table.concat(t, sep)` - Concatenate elements
- ✅ `table.sort(t, comp)` - Sort table
- ✅ `table.maxn(t)` - Maximum numeric index

**Utility Functions**:
- ✅ `print(...)` - Print to console
- ✅ `type(v)` - Get type name
- ✅ `tonumber(v)` - Convert to number
- ✅ `tostring(v)` - Convert to string
- ✅ `pairs(t)` - Iterator for all keys
- ✅ `ipairs(t)` - Iterator for array keys
- ✅ `next(t, k)` - Get next key-value
- ✅ `select(index, ...)` - Select from varargs
- ✅ `unpack(t)` - Unpack table to values
- ✅ `rawget(t, k)` - Get without metamethods
- ✅ `rawset(t, k, v)` - Set without metamethods
- ✅ `rawequal(a, b)` - Compare without metamethods
- ✅ `setmetatable(t, mt)` - Set metatable
- ✅ `getmetatable(t)` - Get metatable

### Tables ✅

- ✅ Table constructors: `{x=1, y=2}`
- ✅ Array-like tables: `{1, 2, 3}`
- ✅ Mixed tables: `{x=1, [2]="two"}`
- ✅ Table access: `t.key` and `t[key]`
- ✅ Table traversal: `pairs()`, `ipairs()`
- ✅ Nested tables: `t.a.b.c`

---

## NOT Supported ❌

### Functions - Partial Support

**Limited**:
- ⚠️ Function definitions work for simple cases
- ⚠️ Anonymous functions work for simple cases
- ❌ Complex closures may not work correctly
- ❌ Variadic functions (`...`) - limited support
- ❌ Multiple return values - limited support
- ❌ Tail call optimization

### Advanced Features - NOT Supported

- ❌ **Coroutines** (`coroutine.create`, etc.)
- ❌ **Modules** (`require()`, `module()`)
- ❌ **File I/O** (`io.*`)
- ❌ **OS library** (`os.*`)
- ❌ **Debug library** (`debug.*`)
- ❌ **Package library** (`package.*`)
- ❌ **Full pattern matching** (only basic patterns)
- ❌ **pcall/xpcall** error handling

### Lua 5.2+ Features - NOT Supported

- ❌ `goto` statement
- ❌ `_ENV` variable
- ❌ Bitwise operators (Lua 5.3+)
- ❌ Integer division `//` (Lua 5.3+)

---

## Compatibility Matrix

| Feature | whisker-editor-web | whisker-core | Compatible? |
|---------|-------------------|--------------|-------------|
| Variables | ✅ Full | ✅ Full | ✅ Yes |
| Local variables | ✅ Full | ✅ Full | ✅ Yes |
| Arithmetic | ✅ Full | ✅ Full | ✅ Yes |
| Comparison | ✅ Full | ✅ Full | ✅ Yes |
| Logical ops | ✅ Full | ✅ Full | ✅ Yes |
| If statements | ✅ Full | ✅ Full | ✅ Yes |
| While loops | ✅ Full | ✅ Full | ✅ Yes |
| For loops (numeric) | ✅ Full | ✅ Full | ✅ Yes |
| For loops (generic) | ✅ Full | ✅ Full | ✅ Yes |
| Repeat-until | ✅ Full | ✅ Full | ✅ Yes |
| Tables | ✅ Full | ✅ Full | ✅ Yes |
| Math library | ✅ 15 funcs | ✅ Full | ✅ ~90% |
| String library | ✅ 12 funcs | ✅ Full | ✅ ~80% |
| Table library | ✅ 6 funcs | ✅ Full | ✅ ~90% |
| Functions | ⚠️ Basic | ✅ Full | ⚠️ Partial |
| Metatables | ⚠️ Basic | ✅ Full | ⚠️ Partial |
| Print | ✅ Full | ✅ Full | ✅ Yes |

**Overall Compatibility**: ~80% Lua 5.1 - **Suitable for most interactive fiction scripts**

---

## What This Means for Authors

### ✅ Works in Preview

These scripts work in both preview and production:

```lua
-- ✅ Variables and arithmetic
health = 100
damage = math.random(10, 20)
health = health - damage

-- ✅ Control flow
if health < 50 then
  print("Warning! Low health!")
elseif health < 25 then
  print("CRITICAL!")
end

-- ✅ Loops
total_damage = 0
for i = 1, 5 do
  total_damage = total_damage + math.random(5, 15)
end

-- ✅ Tables
inventory = {sword = 1, shield = 1, potions = 3}
for item, count in pairs(inventory) do
  print(item .. ": " .. count)
end

-- ✅ String manipulation
name = "Hero"
print(string.format("Welcome, %s!", string.upper(name)))

-- ✅ Math functions
angle = math.pi / 4
x = math.cos(angle) * 100
y = math.sin(angle) * 100
```

### ⚠️ May Have Issues

```lua
-- ⚠️ Complex closures - test carefully
function makeCounter()
  local count = 0
  return function()
    count = count + 1
    return count
  end
end

-- ⚠️ Multiple return values - limited support
function getCoords()
  return 10, 20
end
local x, y = getCoords()  -- May not work correctly
```

### ❌ Won't Work in Preview

```lua
-- ❌ Coroutines
co = coroutine.create(function() end)

-- ❌ File I/O
file = io.open("data.txt", "r")

-- ❌ Require/modules
local myModule = require("mymodule")
```

---

## Test Results

**LuaEngine Tests**: 111 tests passing
**Scripting Package Tests**: 339 tests passing

The test suite covers:
- Basic operations and variables
- All control flow structures
- Math library (15 functions)
- String library (12 functions)
- Table library (6 functions)
- Iterator functions (pairs, ipairs)
- Metatable operations
- Complex expressions

---

## Summary

### Current State (After Phase 1 & 2)
- ✅ ~80% Lua 5.1 compatibility
- ✅ Full control flow support (if/while/for/repeat)
- ✅ Full table support with iterators
- ✅ Comprehensive math library (15 functions)
- ✅ Comprehensive string library (12 functions)
- ✅ Table library functions
- ✅ Metatable basic support
- ⚠️ Function definitions (basic support)
- ❌ Coroutines, modules, file I/O

### Impact
- **Preview now suitable for most interactive fiction scripts**
- **Production testing recommended for advanced features**
- **111 LuaEngine tests passing**

---

**For Questions**: See spec/STATE.md for project status
**Status**: Living Document - Update as features are implemented
