# Whisker Editor Scripting Guide

**Version:** 3.0 (WLS 1.0)
**Last Updated:** 2025-12-30

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Script Editor Overview](#script-editor-overview)
4. [Lua Basics](#lua-basics)
5. [WLS 1.0 API](#wls-10-api) *(New in WLS 1.0)*
6. [Legacy Whisker Story API](#legacy-whisker-story-api)
7. [Function Library](#function-library)
8. [Visual Script Builder](#visual-script-builder)
9. [Visual Condition Builder](#visual-condition-builder)
10. [Best Practices](#best-practices)
11. [Advanced Topics](#advanced-topics)
12. [Debugging](#debugging)
13. [Examples](#examples)

---

## Introduction

Whisker Editor provides a powerful scripting system that allows you to add custom logic and interactivity to your interactive fiction stories. The scripting system supports:

- **Lua Scripting** - Full Lua 5.4 support via wasmoon sandbox
- **Visual Script Builder** - Block-based programming for beginners
- **Visual Condition Builder** - Build complex conditional logic visually
- **Function Library** - Reusable functions across your story
- **Monaco Editor** - Professional code editor with syntax highlighting

### Why Use Scripting?

Scripts enable:
- Complex game mechanics (combat, inventory, stats)
- Dynamic story branching based on player choices
- Custom variables and calculations
- Randomization and procedural content
- Integration with external data

---

## Getting Started

### Accessing the Script Editor

1. Open your story in Whisker Editor
2. Click the **Scripts** tab in the main menu
3. Click **+ New Script** to create your first script

### Your First Script

```lua
-- Initialize game variables
function init()
  game_state:set_variable("playerName", "Hero")
  game_state:set_variable("health", 100)
  game_state:set_variable("gold", 50)

  print("Game initialized!")
end

-- Call the init function
init()
```

### Running Scripts

Scripts can run at different times:
- **Story Start** - When the story loads
- **Passage Entry** - When entering a specific passage
- **User Action** - In response to player choices
- **Timed Events** - After delays or intervals

---

## Script Editor Overview

### Interface Components

#### 1. **Script List** (Left Sidebar)
- View all scripts in your story
- Click to switch between scripts
- Add/delete scripts

#### 2. **Editor Tabs**
- **Scripts** - Code editor with Lua syntax highlighting
- **Function Library** - Manage reusable functions
- **Visual Builder** - Block-based programming
- **Lua Console** - Interactive testing environment

#### 3. **Code Editor** (Monaco Editor)
- Syntax highlighting for Lua
- Auto-completion
- Error detection
- Line numbers
- Code folding

#### 4. **Snippets Panel**
- Pre-built code templates
- Variable declarations
- Functions
- Conditionals
- Loops
- API calls

#### 5. **Action Buttons**
- **▶ Run Script** - Execute the current script
- **Save Changes** - Save modifications
- **Revert** - Discard unsaved changes

---

## Lua Basics

### Variables

```lua
-- Local variables (preferred)
local score = 0
local playerName = "Alice"
local isAlive = true

-- Global variables (use sparingly)
globalCounter = 100

-- Nil (undefined)
local nothing = nil
```

### Data Types

```lua
-- Numbers
local integer = 42
local decimal = 3.14
local negative = -10

-- Strings
local text = "Hello, world!"
local multiline = [[
  This is a
  multi-line string
]]

-- Booleans
local yes = true
local no = false

-- Tables (arrays and dictionaries)
local array = {1, 2, 3, 4, 5}
local dict = {
  name = "Alice",
  age = 25,
  class = "Warrior"
}
```

### Operators

```lua
-- Arithmetic
local sum = 10 + 5        -- 15
local diff = 10 - 5       -- 5
local product = 10 * 5    -- 50
local quotient = 10 / 5   -- 2
local remainder = 10 % 3  -- 1
local power = 2 ^ 3       -- 8

-- Comparison
10 == 10  -- true (equal)
10 ~= 5   -- true (not equal)
10 > 5    -- true
10 < 5    -- false
10 >= 10  -- true
10 <= 5   -- false

-- Logical
true and false  -- false
true or false   -- true
not true        -- false
```

### Control Flow

```lua
-- If statements
if score > 100 then
  print("High score!")
elseif score > 50 then
  print("Good score")
else
  print("Keep trying")
end

-- For loops
for i = 1, 10 do
  print(i)
end

-- While loops
local count = 0
while count < 5 do
  count = count + 1
  print(count)
end

-- For-each loops
local items = {"sword", "shield", "potion"}
for index, item in ipairs(items) do
  print(index, item)
end
```

### Functions

```lua
-- Function definition
function greet(name)
  return "Hello, " .. name .. "!"
end

-- Function call
local message = greet("Alice")
print(message)  -- "Hello, Alice!"

-- Multiple return values
function getStats()
  return 100, 50, 25  -- health, mana, stamina
end

local health, mana, stamina = getStats()

-- Anonymous functions
local add = function(a, b)
  return a + b
end
```

---

## WLS 1.0 API

WLS 1.0 (Whisker Language Specification 1.0) introduces a new, cleaner API for scripting. This is the recommended approach for new stories.

### Variable Syntax

WLS 1.0 uses `$` prefix for story-scoped variables and `_` prefix for temporary variables:

```lua
-- Story-scoped variables (persist across passages)
$gold = 100
$playerName = "Hero"
$hasKey = true

-- Temporary variables (reset each passage)
_localCounter = 0
_tempResult = "processing"
```

In passage content, reference variables directly:
```
You have $gold gold pieces.
Hello, $playerName!
```

For complex expressions, use `${}`:
```
You have ${$gold * 2} gold after doubling!
Result: ${math.random(1, 6) + $modifier}
```

### whisker.state Namespace

Manage story state programmatically:

```lua
-- Get variable value
local gold = whisker.state.get("gold")
local name = whisker.state.get("playerName")

-- Set variable value
whisker.state.set("gold", 100)
whisker.state.set("playerName", "Hero")

-- Check if variable exists
if whisker.state.has("secretFound") then
  print("Secret was found!")
end

-- Delete variable
whisker.state.delete("tempVar")

-- Get all variables
local allVars = whisker.state.all()
for name, value in pairs(allVars) do
  print(name, value)
end

-- Reset all variables to initial values
whisker.state.reset()
```

### whisker.passage Namespace

Navigate and access passages:

```lua
-- Get current passage info
local current = whisker.passage.current()
print("Title:", current.title)
print("Tags:", table.concat(current.tags, ", "))

-- Get passage by title
local passage = whisker.passage.get("ForestPath")

-- Navigate to passage
whisker.passage.go("NextPassage")

-- Check if passage exists
if whisker.passage.exists("SecretRoom") then
  print("Secret room is available")
end

-- Get all passages
local passages = whisker.passage.all()
print("Total passages:", #passages)

-- Get passages with specific tag
local combatPassages = whisker.passage.tags("combat")
```

### whisker.history Namespace

Manage navigation history:

```lua
-- Go back to previous passage
whisker.history.back()

-- Check if can go back
if whisker.history.canBack() then
  print("Back button available")
end

-- Get history list
local history = whisker.history.list()
for i, passageTitle in ipairs(history) do
  print(i, passageTitle)
end

-- Get history count
local count = whisker.history.count()

-- Check if passage was visited
if whisker.history.contains("TreasureRoom") then
  print("Player found the treasure!")
end

-- Clear history
whisker.history.clear()
```

### whisker.choice Namespace

Access available choices:

```lua
-- Get available choices
local choices = whisker.choice.available()
for i, choice in ipairs(choices) do
  print(i, choice.text, "->", choice.target)
end

-- Select a choice programmatically
whisker.choice.select(1)

-- Get choice count
local count = whisker.choice.count()
```

### Top-Level Functions

Commonly used functions available at global scope:

```lua
-- Check how many times a passage was visited
local visits = visited("ForestPath")
if visited("DarkCave") > 0 then
  print("You've been here before...")
end

-- Random number between min and max (inclusive)
local roll = random(1, 20)

-- Pick a random item from a list
local item = pick("sword", "shield", "potion")
local enemy = pick({"goblin", "orc", "troll"})

-- Print to console (debugging)
print("Debug:", $gold, $health)
```

### WLS 1.0 Operators

WLS 1.0 uses Lua operators:

```lua
-- Comparison
$gold == 100    -- equals
$gold ~= 50     -- not equals (Lua style, NOT !=)
$gold > 10      -- greater than
$gold < 100     -- less than
$gold >= 50     -- greater or equal
$gold <= 75     -- less or equal

-- Logical
$hasKey and $gold > 10    -- both must be true
$hasKey or $hasPick       -- either can be true
not $isLocked             -- negation

-- Arithmetic
$gold + 10      -- addition
$gold - 5       -- subtraction
$gold * 2       -- multiplication
$gold / 4       -- division
$gold % 3       -- modulo (remainder)
$level ^ 2      -- power (exponent)

-- String concatenation
$playerName .. " the Brave"    -- joins strings
```

### WLS 1.0 Conditionals

Block conditionals in passage content:

```
{$gold > 100}
  You're rich! You can afford the expensive option.
{else}
  You need more gold.
{/}
```

With `elif` for multiple conditions:

```
{$gold >= 100}
  Wealthy adventurer!
{elif $gold >= 50}
  Modest funds.
{elif $gold >= 10}
  Running low on gold.
{else}
  Nearly broke!
{/}
```

Inline conditionals:

```
You are {$health > 50 : "healthy" | "injured"}.
The door is {$hasKey : "unlocked" | "locked"}.
```

### WLS 1.0 Choices

Choices use `+` for once-only and `*` for sticky:

```
:: Tavern

The bartender looks at you expectantly.

+ [Order ale] {$ $gold = $gold - 2} -> DrinkAle
+ {$gold >= 10} [Order the special] {$ $gold = $gold - 10} -> OrderSpecial
* [Ask about rumors] -> Rumors
+ [Leave] -> Outside
```

Choice syntax breakdown:
- `+` once-only choice (disappears after selection)
- `*` sticky choice (always available)
- `{condition}` optional condition for availability
- `[text]` the choice text shown to player
- `{$ action}` optional action executed on selection
- `-> Target` the target passage

Special targets:
- `-> END` ends the story
- `-> BACK` returns to previous passage
- `-> RESTART` restarts from beginning

---

## Legacy Whisker Story API

> **Note:** The following API is maintained for backwards compatibility. For new stories, use the [WLS 1.0 API](#wls-10-api) above.

### Game State

Access and modify story variables:

```lua
-- Get variable value
local score = game_state:get_variable("score")
local playerName = game_state:get_variable("playerName")

-- Set variable value
game_state:set_variable("score", 100)
game_state:set_variable("playerName", "Hero")
game_state:set_variable("hasKey", true)

-- Check if variable exists
if game_state:has_variable("secretFound") then
  print("Secret was found!")
end
```

### Passage Navigation

```lua
-- Get current passage
local current = game_state:get_current_passage()
print("Current passage:", current.title)

-- Get passage by ID
local passage = story:get_passage("passage_id_123")

-- Navigate to passage
game_state:goto_passage("next_passage_id")

-- Check if passage exists
if story:has_passage("secret_room") then
  print("Secret room exists")
end
```

### Story Access

```lua
-- Get story metadata
local title = story.metadata.title
local author = story.metadata.author

-- Get all passages
local passages = story:get_all_passages()
print("Total passages:", #passages)

-- Get all variables
local variables = story:get_all_variables()
for name, var in pairs(variables) do
  print(name, var.value)
end
```

### Random Numbers

```lua
-- Random number between 1 and 100
local roll = math.random(1, 100)

-- Random decimal between 0 and 1
local chance = math.random()

-- Seed for reproducible randomness
math.randomseed(os.time())
```

### Output

```lua
-- Print to console (for debugging)
print("Debug message")

-- Show message to player
game_state:show_message("You found a treasure!")

-- Add to game log
game_state:add_log_entry("Player entered the dungeon")
```

---

## Function Library

### Creating Custom Functions

1. Click the **Function Library** tab
2. Click **+ New Function**
3. Fill in function details:
   - **Name**: Function identifier
   - **Description**: What it does
   - **Category**: Organization (Combat, Inventory, etc.)
   - **Parameters**: Input types
   - **Return Type**: Output type
   - **Code**: Implementation

### Example: Combat Function

```lua
-- Name: calculateDamage
-- Parameters: attack: number, defense: number
-- Returns: number

function calculateDamage(attack, defense)
  local baseDamage = attack - (defense / 2)
  local critChance = math.random()

  if critChance > 0.9 then
    -- Critical hit!
    return baseDamage * 2
  else
    return math.max(1, baseDamage)
  end
end
```

### Using Library Functions

Once defined, library functions are available in all scripts:

```lua
-- Use the calculateDamage function
local playerAttack = game_state:get_variable("attack")
local enemyDefense = game_state:get_variable("enemyDefense")

local damage = calculateDamage(playerAttack, enemyDefense)
game_state:set_variable("enemyHealth", enemyHealth - damage)

print("Dealt " .. damage .. " damage!")
```

### Default Templates

Load default function templates for common tasks:
1. Click **Load Templates** in Function Library
2. Templates include:
   - Inventory management
   - Combat calculations
   - Stat tracking
   - Quest systems
   - Random events

---

## Visual Script Builder

### Block-Based Programming

For those new to programming, the Visual Script Builder provides a drag-and-drop interface:

#### Available Block Categories

1. **Variables** 📦
   - Get variable
   - Set variable
   - Increment/decrement

2. **Math** 🔢
   - Add, subtract, multiply, divide
   - Random numbers
   - Comparisons

3. **Logic** 🔀
   - If/else
   - AND/OR conditions
   - NOT

4. **Text** 📝
   - Concatenate strings
   - String length
   - Contains substring

5. **Output** 💬
   - Print message
   - Show to player
   - Add to log

6. **Control** ⚙️
   - Goto passage
   - Wait/delay
   - Loop

### Building Visual Scripts

1. Select a block category
2. Drag blocks into the workspace
3. Connect blocks together
4. Set block parameters
5. View generated Lua code
6. Test with **Run Script**

### Converting Visual to Code

Visual scripts automatically generate Lua code. You can:
- Copy generated code to Script Editor
- Mix visual and text-based coding
- Learn Lua by seeing the output

---

## Visual Condition Builder

### Creating Complex Conditions

The Visual Condition Builder helps create conditional logic without writing code:

#### Basic Condition

```
$score == 100
```

**Visual Builder:**
1. Select variable: `score`
2. Select operator: `equals (==)`
3. Enter value: `100`

#### Multiple Rules (AND)

```
$score > 50 and $hasKey == true
```

**Visual Builder:**
1. Rule 1: `score > 50`
2. Click **+ Add Rule**
3. Rule 2: `hasKey == true`
4. Combinator: `AND`

#### Multiple Groups (OR)

```
($score > 100 and $hasKey == true) or ($health > 50 and $hasSword == true)
```

**Visual Builder:**
1. Group 1: `score > 100 and hasKey == true`
2. Click **+ Add Group**
3. Group 2: `health > 50 and hasSword == true`
4. Group combinator: `OR`

### Output Formats

- **WLS 1.0** (default): `$score > 100` - Modern syntax with `$` prefix
- **Legacy Whisker**: `{{score}} > 100` - Backwards compatible
- **Lua**: `score > 100` - For direct Lua scripts

### WLS 1.0 Operators

The Visual Condition Builder uses Lua-style operators:

| Operator | Meaning |
|----------|---------|
| `==` | equals |
| `~=` | not equals |
| `>` | greater than |
| `<` | less than |
| `>=` | greater or equal |
| `<=` | less or equal |

> **Note:** WLS 1.0 uses `~=` for "not equals" (Lua style), not `!=` (C style).

### Using Generated Conditions

Copy the generated condition and use in:
- Choice conditions: `+ {$gold > 10} [Buy item] -> Shop`
- Block conditionals: `{$gold > 10}...{/}`
- Inline conditionals: `{$gold > 10 : "rich" | "poor"}`
- Lua if statements
- Visual Script Builder

---

## Best Practices

### Code Organization

```lua
-- ✅ Good: Organized with comments
-- === INITIALIZATION ===
function initPlayer()
  game_state:set_variable("health", 100)
  game_state:set_variable("mana", 50)
end

-- === COMBAT FUNCTIONS ===
function attack(damage)
  -- Implementation
end

-- === INVENTORY ===
function addItem(item)
  -- Implementation
end

-- ❌ Bad: No organization or comments
function a()
  game_state:set_variable("h", 100)
end
function b()
  game_state:set_variable("m", 50)
end
```

### Variable Naming

```lua
-- ✅ Good: Descriptive names
local playerHealth = 100
local maxInventorySize = 20
local hasMagicSword = false

-- ❌ Bad: Unclear names
local ph = 100
local mis = 20
local hms = false
```

### Error Handling

```lua
-- ✅ Good: Check for errors
function getHealth()
  if not game_state:has_variable("health") then
    print("Warning: health variable not found!")
    return 100  -- Default value
  end
  return game_state:get_variable("health")
end

-- ❌ Bad: No error checking
function getHealth()
  return game_state:get_variable("health")  -- Might fail
end
```

### Performance

```lua
-- ✅ Good: Cache frequently used values
local playerHealth = game_state:get_variable("health")
for i = 1, 100 do
  if playerHealth > 0 then
    -- Use cached value
  end
end

-- ❌ Bad: Repeated calls
for i = 1, 100 do
  if game_state:get_variable("health") > 0 then
    -- Calls API 100 times
  end
end
```

---

## Advanced Topics

### Tables and Data Structures

```lua
-- Inventory system
local inventory = {
  items = {},
  maxSize = 20,
  gold = 0
}

function addToInventory(item)
  if #inventory.items < inventory.maxSize then
    table.insert(inventory.items, item)
    return true
  else
    print("Inventory full!")
    return false
  end
end

function hasItem(itemName)
  for _, item in ipairs(inventory.items) do
    if item == itemName then
      return true
    end
  end
  return false
end
```

### Metatables and OOP

```lua
-- Create a "class"
Player = {}
Player.__index = Player

function Player:new(name)
  local obj = {
    name = name,
    health = 100,
    level = 1
  }
  setmetable(obj, Player)
  return obj
end

function Player:takeDamage(amount)
  self.health = self.health - amount
  if self.health <= 0 then
    self:die()
  end
end

function Player:die()
  print(self.name .. " has died!")
end

-- Usage
local player = Player:new("Alice")
player:takeDamage(50)
```

### Coroutines (Advanced Async)

```lua
-- Create a timed sequence
function timedSequence()
  print("Starting...")
  coroutine.yield(2000)  -- Wait 2 seconds

  print("Middle...")
  coroutine.yield(1000)  -- Wait 1 second

  print("Done!")
end
```

---

## Debugging

### Using print()

```lua
-- Debug variable values
local score = game_state:get_variable("score")
print("Score:", score)

-- Debug function calls
function calculateDamage(attack, defense)
  print("calculateDamage called with:", attack, defense)
  local damage = attack - defense
  print("Calculated damage:", damage)
  return damage
end
```

### Lua Console

The interactive Lua Console allows you to:
1. Test code snippets
2. Inspect variables
3. Call functions directly
4. Debug in real-time

### Common Errors

**Error: attempt to index a nil value**
```lua
-- Problem
local value = game_state:get_variable("nonExistent")
print(value.property)  -- ERROR: value is nil

-- Solution
local value = game_state:get_variable("nonExistent")
if value then
  print(value.property)
else
  print("Variable not found")
end
```

**Error: attempt to call a nil value**
```lua
-- Problem
unknownFunction()  -- ERROR: function doesn't exist

-- Solution
if type(someFunction) == "function" then
  someFunction()
else
  print("Function not available")
end
```

---

## Examples

### Example 1: Simple Combat System

```lua
function initCombat(enemyHealth, enemyAttack)
  game_state:set_variable("enemyHealth", enemyHealth)
  game_state:set_variable("enemyAttack", enemyAttack)
  game_state:set_variable("inCombat", true)
end

function playerAttack()
  local playerAttack = game_state:get_variable("attack")
  local enemyDefense = game_state:get_variable("enemyDefense") or 0

  local damage = math.max(1, playerAttack - enemyDefense)
  local critRoll = math.random()

  if critRoll > 0.9 then
    damage = damage * 2
    print("CRITICAL HIT!")
  end

  local enemyHealth = game_state:get_variable("enemyHealth")
  enemyHealth = enemyHealth - damage
  game_state:set_variable("enemyHealth", enemyHealth)

  print("Dealt " .. damage .. " damage!")

  if enemyHealth <= 0 then
    print("Enemy defeated!")
    game_state:set_variable("inCombat", false)
    return "victory"
  end

  return "continue"
end

function enemyAttack()
  local enemyAttack = game_state:get_variable("enemyAttack")
  local playerDefense = game_state:get_variable("defense") or 0

  local damage = math.max(1, enemyAttack - playerDefense)

  local playerHealth = game_state:get_variable("health")
  playerHealth = playerHealth - damage
  game_state:set_variable("health", playerHealth)

  print("Enemy dealt " .. damage .. " damage!")

  if playerHealth <= 0 then
    print("You have been defeated!")
    return "defeat"
  end

  return "continue"
end
```

### Example 2: Inventory Management

```lua
-- Initialize inventory
function initInventory()
  game_state:set_variable("inventory", {})
  game_state:set_variable("maxInventorySize", 10)
  game_state:set_variable("gold", 0)
end

-- Add item to inventory
function addItem(itemName, quantity)
  quantity = quantity or 1

  local inventory = game_state:get_variable("inventory")

  if inventory[itemName] then
    inventory[itemName] = inventory[itemName] + quantity
  else
    inventory[itemName] = quantity
  end

  game_state:set_variable("inventory", inventory)
  print("Added " .. quantity .. "x " .. itemName)
end

-- Remove item from inventory
function removeItem(itemName, quantity)
  quantity = quantity or 1

  local inventory = game_state:get_variable("inventory")

  if not inventory[itemName] then
    print("Item not in inventory!")
    return false
  end

  if inventory[itemName] < quantity then
    print("Not enough items!")
    return false
  end

  inventory[itemName] = inventory[itemName] - quantity

  if inventory[itemName] == 0 then
    inventory[itemName] = nil
  end

  game_state:set_variable("inventory", inventory)
  print("Removed " .. quantity .. "x " .. itemName)
  return true
end

-- Check if player has item
function hasItem(itemName, quantity)
  quantity = quantity or 1

  local inventory = game_state:get_variable("inventory")

  return inventory[itemName] and inventory[itemName] >= quantity
end

-- List all items
function listInventory()
  local inventory = game_state:get_variable("inventory")

  print("=== INVENTORY ===")
  for item, quantity in pairs(inventory) do
    print(item .. ": " .. quantity)
  end
end
```

### Example 3: Quest System

```lua
-- Quest data structure
local quests = {
  ["find_sword"] = {
    title = "Find the Legendary Sword",
    description = "Search the ancient ruins for the legendary sword",
    status = "available",  -- available, active, completed, failed
    objectives = {
      { text = "Enter the ruins", completed = false },
      { text = "Defeat the guardian", completed = false },
      { text = "Retrieve the sword", completed = false }
    },
    reward = { gold = 100, xp = 50 }
  }
}

function startQuest(questId)
  if quests[questId] and quests[questId].status == "available" then
    quests[questId].status = "active"
    print("Quest started: " .. quests[questId].title)
    game_state:set_variable("quests", quests)
    return true
  end
  return false
end

function completeObjective(questId, objectiveIndex)
  local quest = quests[questId]

  if quest and quest.status == "active" then
    quest.objectives[objectiveIndex].completed = true

    -- Check if all objectives are complete
    local allComplete = true
    for _, obj in ipairs(quest.objectives) do
      if not obj.completed then
        allComplete = false
        break
      end
    end

    if allComplete then
      completeQuest(questId)
    end

    game_state:set_variable("quests", quests)
  end
end

function completeQuest(questId)
  local quest = quests[questId]

  if quest then
    quest.status = "completed"

    -- Award rewards
    local gold = game_state:get_variable("gold")
    gold = gold + quest.reward.gold
    game_state:set_variable("gold", gold)

    local xp = game_state:get_variable("xp") or 0
    xp = xp + quest.reward.xp
    game_state:set_variable("xp", xp)

    print("Quest completed: " .. quest.title)
    print("Reward: " .. quest.reward.gold .. " gold, " .. quest.reward.xp .. " XP")

    game_state:set_variable("quests", quests)
  end
end
```

---

## Resources

### Further Learning

- [Lua 5.4 Reference Manual](https://www.lua.org/manual/5.4/)
- [Learn Lua in 15 Minutes](https://tylerneylon.com/a/learn-lua/)
- [Whisker Editor Documentation](https://docs.whisker-editor.com)

### Community

- [Discord Server](https://discord.gg/whisker)
- [GitHub Discussions](https://github.com/whisker-editor/discussions)
- [Example Projects](https://github.com/whisker-editor/examples)

### Getting Help

- Check the **Lua Console** for error messages
- Use `print()` statements to debug
- Ask in the Discord community
- Review example projects
- Read the API documentation

---

**Happy Scripting!** 🎮✨
