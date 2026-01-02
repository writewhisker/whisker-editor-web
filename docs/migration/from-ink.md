# Migrating from Ink

A comprehensive guide to converting Ink projects to Whisker.

## Overview

Ink is Inkle's narrative scripting language, used in games like 80 Days and Heaven's Vault. Whisker shares many design principles with Ink, making migration relatively straightforward.

## Quick Start

```bash
# Convert Ink source
whisker import story.ink --from=ink -o story.ws
```

## Core Concepts Mapping

| Ink | Whisker | Notes |
|-----|---------|-------|
| Knots (`=== knot ===`) | Passages (`:: Passage`) | Direct equivalent |
| Stitches (`= stitch`) | Passages | Flatten to passages |
| Diverts (`-> target`) | Links (`-> Target`) | Identical syntax |
| Choices (`* [text]`) | Choices (`+ [text]`) | Similar syntax |
| Gathers (`-`) | Gathers (`-`) | Identical |
| Tunnels (`->knot->`) | Tunnels (`-> Passage ->`) | Similar |
| Variables (`VAR x = 1`) | Variables (`{do $x = 1}`) | Different syntax |

## Knots and Stitches

### Ink Knots

```ink
=== london ===
You arrive in London.
-> END

=== paris ===
The city of lights awaits.
-> END
```

### Whisker Passages

```whisker
:: London
You arrive in London.

:: Paris
The city of lights awaits.
```

### Stitches to Passages

Ink stitches become separate passages in Whisker:

**Ink:**
```ink
=== train_station ===

= platform
You stand on the platform.
* [Board the train] -> carriage
* [Wait] -> platform

= carriage
You find a seat.
-> END
```

**Whisker:**
```whisker
:: TrainStation_Platform
You stand on the platform.
+ [Board the train] -> TrainStation_Carriage
+ [Wait] -> TrainStation_Platform

:: TrainStation_Carriage
You find a seat.
```

## Choices

### Basic Choices

**Ink:**
```ink
* [Open the door]
  You open the door and step through.
* [Knock first]
  You knock politely.
```

**Whisker:**
```whisker
+ [Open the door]
  You open the door and step through.
+ [Knock first]
  You knock politely.
```

### Sticky Choices

Ink uses `+` for sticky (repeatable) choices, `*` for one-time:

**Ink:**
```ink
+ [Ask about the weather]
  "Nice day, isn't it?"
* [Ask about the murder]
  "What do you know about last night?"
```

**Whisker:**
```whisker
+ [Ask about the weather]
  "Nice day, isn't it?"
+ {once} [Ask about the murder]
  "What do you know about last night?"
```

### Fallback Choices

**Ink:**
```ink
* [Option A]
* [Option B]
* ->
  You stand there, unable to decide.
```

**Whisker:**
```whisker
+ [Option A] -> ...
+ [Option B] -> ...
{not ($optionAChosen or $optionBChosen)}
You stand there, unable to decide.
{/}
```

## Diverts

### Basic Diverts

**Ink:**
```ink
-> london
=== london ===
```

**Whisker:**
```whisker
-> London
:: London
```

### Divert to END

**Ink:**
```ink
-> END
-> DONE
```

**Whisker:**
```whisker
-> END
```

### Conditional Diverts

**Ink:**
```ink
{met_alice: -> alice_greeting | -> alice_intro}
```

**Whisker:**
```whisker
{$metAlice}
-> AliceGreeting
{else}
-> AliceIntro
{/}
```

## Gathers

Gathers work identically in both languages:

**Ink:**
```ink
* [Option A]
  First option chosen.
* [Option B]
  Second option chosen.
- All paths lead here.
```

**Whisker:**
```whisker
+ [Option A]
  First option chosen.
+ [Option B]
  Second option chosen.
-
All paths lead here.
```

### Nested Gathers

**Ink:**
```ink
* [Outer choice A]
  ** [Inner A1]
  ** [Inner A2]
  -- Inner gather
* [Outer choice B]
- Outer gather
```

**Whisker:**
```whisker
+ [Outer choice A]
  ++ [Inner A1]
  ++ [Inner A2]
  --
  Inner gather
+ [Outer choice B]
-
Outer gather
```

## Tunnels

### Basic Tunnels

**Ink:**
```ink
-> greet_player ->
The conversation continues.

=== greet_player ===
"Hello there!"
->->
```

**Whisker:**
```whisker
-> GreetPlayer ->

The conversation continues.

:: GreetPlayer
"Hello there!"
->->
```

### Tunnels with Parameters

**Ink:**
```ink
-> greet("Alice") ->

=== greet(who) ===
"Hello, {who}!"
->->
```

**Whisker:**
```whisker
{do $greetTarget = "Alice"}
-> Greet ->

:: Greet
"Hello, $greetTarget!"
->->
```

## Variables

### Declaration and Assignment

**Ink:**
```ink
VAR gold = 100
VAR player_name = "Hero"
VAR has_sword = false

~ gold = gold + 50
~ has_sword = true
```

**Whisker:**
```whisker
:: Start
{do $gold = 100}
{do $playerName = "Hero"}
{do $hasSword = false}

{do $gold = $gold + 50}
{do $hasSword = true}
```

### Temporary Variables

**Ink:**
```ink
~ temp damage = 0
~ damage = weapon_power * 2
```

**Whisker:**
```whisker
{do $damage = 0}
{do $damage = $weaponPower * 2}
```

### Variable Display

**Ink:**
```ink
You have {gold} gold.
```

**Whisker:**
```whisker
You have $gold gold.
```

Or with explicit interpolation:
```whisker
You have {$gold} gold.
```

## Conditionals

### If/Else

**Ink:**
```ink
{ health > 50:
  You feel fine.
- health > 20:
  You're injured.
- else:
  You're barely standing.
}
```

**Whisker:**
```whisker
{$health > 50}
You feel fine.
{elif $health > 20}
You're injured.
{else}
You're barely standing.
{/}
```

### Inline Conditionals

**Ink:**
```ink
The door is {door_open:open|closed}.
```

**Whisker:**
```whisker
The door is {$doorOpen ? "open" : "closed"}.
```

### Conditional Choices

**Ink:**
```ink
* {has_key} [Unlock the door]
* {gold >= 50} [Pay the bribe]
```

**Whisker:**
```whisker
+ [Unlock the door] {$hasKey} -> ...
+ [Pay the bribe] {$gold >= 50} -> ...
```

## Lists and State

### Ink Lists

**Ink:**
```ink
LIST inventory = (empty)
LIST status = healthy, injured, critical

~ inventory += sword
{ inventory has sword: You're armed. }
```

**Whisker:**
```whisker
{do $inventory = []}
{do $status = "healthy"}

{do $inventory.push("sword")}
{$inventory.includes("sword")}
You're armed.
{/}
```

### State Tracking

**Ink:**
```ink
VAR met_alice = false
=== alice ===
{ met_alice:
  "Good to see you again!"
- else:
  "Hello, I'm Alice."
  ~ met_alice = true
}
```

**Whisker:**
```whisker
:: Alice
{$metAlice}
"Good to see you again!"
{else}
"Hello, I'm Alice."
{do $metAlice = true}
{/}
```

## Functions

### Ink Functions

**Ink:**
```ink
=== function roll_dice(sides) ===
~ return RANDOM(1, sides)

You rolled {roll_dice(6)}.
```

**Whisker:**
```whisker
{function rollDice(sides)}
  {return random(1, sides)}
{/function}

:: Game
You rolled {rollDice(6)}.
```

### Built-in Functions

| Ink | Whisker |
|-----|---------|
| `RANDOM(min, max)` | `random(min, max)` |
| `FLOOR(n)` | `floor(n)` |
| `INT(n)` | `floor(n)` |
| `FLOAT(n)` | (automatic) |
| `TURNS()` | `$turns` (track manually) |
| `CHOICE_COUNT()` | Custom tracking |
| `TURNS_SINCE(knot)` | Custom tracking |

## Includes and External Files

### Ink Includes

**Ink:**
```ink
INCLUDE characters.ink
INCLUDE locations.ink
```

**Whisker:**

Whisker doesn't have includes. Combine files or use the import tool:

```bash
cat characters.ws locations.ws main.ws > story.ws
```

Or organize with passage naming conventions:

```whisker
:: Characters_Alice
...

:: Locations_Forest
...
```

## Tags

### Ink Tags

**Ink:**
```ink
=== dark_cave ===
# dark
# dangerous
You can barely see...
```

**Whisker:**
```whisker
:: DarkCave [dark dangerous]
You can barely see...
```

### Line Tags

**Ink:**
```ink
"Hello there!" # speaker:alice # emotion:happy
```

**Whisker:**
```whisker
<span data-speaker="alice" data-emotion="happy">"Hello there!"</span>
```

Or handle in styling:
```whisker
@style: |
  .speaker-alice { color: blue; }
  .emotion-happy::before { content: "😊 "; }
```

## Complete Example

### Original Ink

```ink
VAR gold = 100
VAR has_key = false

=== start ===
You wake up in a small room.
The door is {has_key:unlocked|locked}.

+ [Search the room]
  -> search_room ->
  -> start
+ {has_key} [Open the door]
  -> hallway
+ [Go back to sleep]
  -> END

=== search_room ===
You look around carefully.
{ search_room < 2:
  You find a rusty key under the bed!
  ~ has_key = true
- else:
  You don't find anything new.
}
->->

=== hallway ===
You step into a dimly lit hallway.
A merchant sits by the wall.

* [Talk to merchant]
  -> merchant
* [Continue down the hall]
  -> ending

=== merchant ===
"Looking to buy something?"
+ {gold >= 50} [Buy a sword (50 gold)]
  ~ gold -= 50
  You purchase a fine sword.
  -> merchant
+ [Leave]
  -> hallway

=== ending ===
You escape the dungeon!
THE END
-> END
```

### Converted to Whisker

```whisker
@title: Dungeon Escape

:: Start
{once}
{do $gold = 100}
{do $hasKey = false}
{do $searchCount = 0}
{/}

You wake up in a small room.
The door is {$hasKey ? "unlocked" : "locked"}.

+ [Search the room] -> SearchRoom
+ [Open the door] {$hasKey} -> Hallway
+ [Go back to sleep] -> END

:: SearchRoom
You look around carefully.
{do $searchCount = $searchCount + 1}
{$searchCount <= 1}
You find a rusty key under the bed!
{do $hasKey = true}
{else}
You don't find anything new.
{/}
+ [Continue] -> Start

:: Hallway
You step into a dimly lit hallway.
A merchant sits by the wall.

+ [Talk to merchant] -> Merchant
+ [Continue down the hall] -> Ending

:: Merchant
"Looking to buy something?"

+ [Buy a sword (50 gold)] {$gold >= 50}
  {do $gold = $gold - 50}
  You purchase a fine sword.
  -> Merchant
+ [Leave] -> Hallway

:: Ending
You escape the dungeon!
THE END

:: END
```

## Migration Checklist

- [ ] Convert knots to passages
- [ ] Convert stitches to passages (with prefixes)
- [ ] Update divert syntax
- [ ] Convert choice markers (`*` to `+`, `+` to `+ {once}`)
- [ ] Update variable declarations
- [ ] Convert conditionals
- [ ] Replace built-in functions
- [ ] Validate with `whisker validate`
- [ ] Test all story paths

## Common Issues

### Threads

Ink threads require manual conversion:

**Ink:**
```ink
<- background_noise
```

**Whisker:**
```whisker
-> BackgroundNoise ->
```

### Sequences

Ink sequences need explicit state tracking:

**Ink:**
```ink
{shuffle:
  - "Hello!"
  - "Hi there!"
  - "Greetings!"
}
```

**Whisker:**
```whisker
{do $greetings = shuffle(["Hello!", "Hi there!", "Greetings!"])}
{do $greetingIndex = ($greetingIndex ?? -1) + 1}
{$greetings[$greetingIndex % #$greetings]}
```

## Next Steps

- [Whisker Basics](/tutorials/beginner/) - Learn Whisker fundamentals
- [Advanced Features](/tutorials/intermediate/) - Explore advanced functionality
- [Examples](/examples/) - See real Whisker projects
