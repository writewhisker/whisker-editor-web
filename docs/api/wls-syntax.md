# WLS Syntax Quick Reference

Complete syntax reference for the Whisker Language Specification 1.0.

## Passages

```wls
:: PassageName
Content goes here.

:: PassageName [tag1, tag2]
Passage with tags.

:: Namespaced.PassageName
Namespaced passage.
```

## Choices

### Basic Choices

```wls
* [Choice text] -> TargetPassage
* [Another choice] -> AnotherTarget
```

### Conditional Choices

```wls
* [Option A] {$hasKey} -> Unlock
* [Option B] {$gold >= 100} -> Buy
```

### Once-Only Choices

```wls
*! [One time option] -> Secret
```

### Fallback Choices

```wls
*? [Default option] -> Fallback
```

### Nested Choices (Weave)

```wls
* [Outer choice]
    Nested content.
    ** [Inner choice A] -> TargetA
    ** [Inner choice B] -> TargetB
```

## Diverts

```wls
-> TargetPassage           // Simple divert
-> END                     // End story
-> DONE                    // End current passage
```

### Tunnels

```wls
-> SubroutinePassage ->    // Call and return
```

## Variables

### Declaration

```wls
VAR $playerName = "Hero"
VAR $health = 100
VAR $isAlive = true

// Temporary (passage-scoped)
TEMP $$localVar = 42
```

### Scope Prefixes

| Prefix | Scope | Example |
|--------|-------|---------|
| `$` | Global | `$playerName` |
| `$$` | Temporary | `$$counter` |
| `$_` | Temp (alt) | `$_result` |

### Assignment

```wls
{$health = 50}
{$gold = $gold + 10}
{$name = "New Name"}
```

### Operators

| Operator | Description |
|----------|-------------|
| `+`, `-`, `*`, `/` | Arithmetic |
| `%` | Modulo |
| `==`, `!=` | Equality |
| `<`, `>`, `<=`, `>=` | Comparison |
| `and`, `or`, `not` | Logical |

## Interpolation

```wls
Hello, {$playerName}!
You have {$gold} gold.

// Expression interpolation
Damage: {$attack - $defense}

// String concatenation
{"Hello, " .. $name .. "!"}
```

## Conditionals

### Inline Conditions

```wls
{if $health > 50}
You feel strong.
{elseif $health > 25}
You're wounded.
{else}
You're barely alive.
{/if}
```

### Shorthand Conditions

```wls
{$isAlive: You are alive.}
{$hasKey: [Unlock the door]}
```

### Not Conditions

```wls
{not $visited_cave: This is your first time here.}
```

## Alternatives

### Sequences (cycle through once)

```wls
{~First time|Second time|Third time|Always after}
```

### Shuffles (random)

```wls
{~shuffle|Option A|Option B|Option C}
```

### Cycles (loop forever)

```wls
{~cycle|One|Two|Three}
```

### Stopping (stop at last)

```wls
{~stopping|First|Second|Last and stays here}
```

## Tags and Metadata

```wls
:: PassageName [dark, dangerous]
@author: Story Author
@transition: fade
@delay: 2s
Content here.
```

## Comments

```wls
// Single line comment

/* Multi-line
   comment */

TODO: This is a todo comment
```

## Collections

### Lists

```wls
LIST $colors = red, green, blue
LIST $inventory = sword, shield

{$colors ? red}           // Check membership
{$inventory + potion}     // Add item
{$inventory - sword}      // Remove item
```

### Arrays

```wls
ARRAY $scores = [10, 20, 30]
{$scores[0]}              // Access: 10
{#$scores}                // Length: 3
```

### Maps

```wls
MAP $stats = {str: 10, dex: 15, int: 12}
{$stats.str}              // Access: 10
{$stats["dex"]}           // Bracket access: 15
```

## Functions

### Declaration

```wls
FUNCTION roll($sides)
    {return math.random(1, $sides)}
END FUNCTION

FUNCTION greet($name)
    {return "Hello, " .. $name .. "!"}
END FUNCTION
```

### Calling

```wls
You rolled a {roll(6)}!
{greet($playerName)}
```

## Built-in Functions

### Math

| Function | Description |
|----------|-------------|
| `math.random(min, max)` | Random integer |
| `math.floor(n)` | Round down |
| `math.ceil(n)` | Round up |
| `math.abs(n)` | Absolute value |
| `math.min(a, b)` | Minimum |
| `math.max(a, b)` | Maximum |

### String

| Function | Description |
|----------|-------------|
| `string.len(s)` | String length |
| `string.upper(s)` | Uppercase |
| `string.lower(s)` | Lowercase |
| `string.sub(s, i, j)` | Substring |

### Story

| Function | Description |
|----------|-------------|
| `whisker.visited(id)` | Visit count |
| `whisker.turn_count()` | Total turns |
| `whisker.random(n)` | Random 1 to n |
| `whisker.choice_count()` | Available choices |

## Gather Points

```wls
* [Option A]
    Content for A.
* [Option B]
    Content for B.
- (gather_point)
Content after any choice.
```

### Named Gathers

```wls
- (named_gather)
Content here.
-> named_gather    // Jump to gather
```

## Threads

```wls
{spawn background_task}
{join background_task}
```

## Includes

```wls
INCLUDE "other_file.ws"
```

## Complete Example

```wls
// Story metadata
@title: The Adventure
@author: Story Author

// Variables
VAR $health = 100
VAR $gold = 50
VAR $playerName = "Hero"

:: Start [intro]
@transition: fade

Welcome, {$playerName}!

You stand at a crossroads.
Health: {$health} | Gold: {$gold}

* [Go north] -> Forest
* [Go east] {$gold >= 20} -> Town
*! [Check your pockets] -> CheckPockets

:: Forest [outdoor, dangerous]
The forest is dark and foreboding.

{if whisker.visited("Forest") > 1}
You've been here before.
{else}
This is your first time in the forest.
{/if}

* [Enter deeper] -> DeepForest
* [Return] -> Start

:: Town [indoor, safe]
The town is bustling with activity.

{$gold = $gold - 20}
Entry fee paid!

-> END

:: CheckPockets
You find {~10|20|30} gold coins!
{$gold = $gold + 20}
-> Start
```
