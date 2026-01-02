# Migrating from Twine

A comprehensive guide to converting Twine projects to Whisker.

## Overview

Twine is one of the most popular interactive fiction tools. This guide covers migration from:

- **Twine 2** (HTML-based editor)
- **Twee** (plain text format)
- **Harlowe** (default Twine 2 format)
- **SugarCube** (popular alternative format)

## Quick Start

```bash
# Convert Twine HTML export
whisker import story.html --from=twine -o story.ws

# Convert Twee source
whisker import story.twee --from=twee -o story.ws
```

## Passage Syntax

### Twine/Twee

```twee
:: Start
Welcome to my story!

[[Go to the forest->Forest]]
[[Enter the castle->Castle]]

:: Forest
You enter a dark forest.
```

### Whisker Equivalent

```whisker
:: Start
Welcome to my story!

+ [Go to the forest] -> Forest
+ [Enter the castle] -> Castle

:: Forest
You enter a dark forest.
```

## Passage Tags

### Twine

```twee
:: SecretRoom [hidden special]
This is a secret room.
```

### Whisker

```whisker
:: SecretRoom [hidden special]
This is a secret room.
```

Tags work identically in both formats.

## Links and Choices

### Basic Links

| Twine/Twee | Whisker |
|------------|---------|
| `[[Next]]` | `+ [Next] -> Next` |
| `[[Go->Target]]` | `+ [Go] -> Target` |
| `[[Target<-Go]]` | `+ [Go] -> Target` |

### Conditional Links (Harlowe)

```harlowe
(if: $hasKey)[[[Unlock door->OpenDoor]]]
```

```whisker
+ [Unlock door] {$hasKey} -> OpenDoor
```

### Conditional Links (SugarCube)

```sugarcube
<<if $hasKey>>
[[Unlock door->OpenDoor]]
<</if>>
```

```whisker
+ [Unlock door] {$hasKey} -> OpenDoor
```

## Variables

### Setting Variables

| Feature | Harlowe | SugarCube | Whisker |
|---------|---------|-----------|---------|
| Set | `(set: $gold to 100)` | `<<set $gold to 100>>` | `{do $gold = 100}` |
| Increment | `(set: $gold to it + 10)` | `<<set $gold += 10>>` | `{do $gold = $gold + 10}` |
| Boolean | `(set: $hasKey to true)` | `<<set $hasKey to true>>` | `{do $hasKey = true}` |

### Displaying Variables

| Harlowe | SugarCube | Whisker |
|---------|-----------|---------|
| `$gold` | `$gold` | `$gold` |
| `(print: $gold)` | `<<print $gold>>` | `{$gold}` |

## Conditionals

### If/Else (Harlowe)

```harlowe
(if: $health > 50)[You feel fine.]
(else-if: $health > 20)[You're injured.]
(else:)[You're barely standing.]
```

### If/Else (SugarCube)

```sugarcube
<<if $health > 50>>
You feel fine.
<<elseif $health > 20>>
You're injured.
<<else>>
You're barely standing.
<</if>>
```

### Whisker Equivalent

```whisker
{$health > 50}
You feel fine.
{elif $health > 20}
You're injured.
{else}
You're barely standing.
{/}
```

## Macros to Functions

### Common Harlowe Macros

| Harlowe | Whisker |
|---------|---------|
| `(random: 1, 6)` | `random(1, 6)` |
| `(upperfirst: $name)` | `capitalize($name)` |
| `(uppercase: $text)` | `upper($text)` |
| `(lowercase: $text)` | `lower($text)` |
| `(count: $arr)` | `#$arr` |

### Common SugarCube Macros

| SugarCube | Whisker |
|-----------|---------|
| `<<random 1 6>>` | `random(1, 6)` |
| `<<if condition>>` | `{condition}` |
| `<<set $var to value>>` | `{do $var = value}` |
| `<<goto "Passage">>` | `-> Passage` |
| `<<include "Passage">>` | `-> Passage ->` (tunnel) |

## Arrays and Data Structures

### Harlowe Arrays

```harlowe
(set: $inventory to (a: "sword", "shield"))
(set: $inventory to it + (a: "potion"))
(if: $inventory contains "key")[(goto: "OpenDoor")]
```

### SugarCube Arrays

```sugarcube
<<set $inventory to ["sword", "shield"]>>
<<run $inventory.push("potion")>>
<<if $inventory.includes("key")>><<goto "OpenDoor">><</if>>
```

### Whisker Equivalent

```whisker
{do $inventory = ["sword", "shield"]}
{do $inventory.push("potion")}
{$inventory.includes("key")}
-> OpenDoor
{/}
```

## Hooks and Styling

### Harlowe Hooks

```harlowe
|secret>[This text is hidden.]
(show: ?secret)
```

### Whisker Alternative

```whisker
{not $showSecret}
<span style="display:none" id="secret">This text is hidden.</span>
{/}

{$showSecret}
This text is hidden.
{/}
```

### SugarCube Styling

```sugarcube
@@.warning;This is a warning!@@
```

### Whisker

```whisker
<span class="warning">This is a warning!</span>
```

Or use the `@style` directive:

```whisker
@style: |
  .warning {
    color: red;
    font-weight: bold;
  }

:: Alert
<span class="warning">This is a warning!</span>
```

## Special Passages

### Twine Special Passages

| Twine | Purpose | Whisker Equivalent |
|-------|---------|-------------------|
| `StoryTitle` | Story title | `@title:` directive |
| `StoryAuthor` | Author name | `@author:` directive |
| `StoryInit` | Initialization | `:: Start` with `{do ...}` |
| `StoryCSS` | Custom CSS | `@style:` directive |
| `StoryJavaScript` | Custom JS | `@script:` directive |

### Example Conversion

**Twine:**
```twee
:: StoryTitle
My Adventure

:: StoryAuthor
Jane Doe

:: StoryInit
(set: $gold to 100)
(set: $health to 100)

:: Start
Welcome to the adventure!
```

**Whisker:**
```whisker
@title: My Adventure
@author: Jane Doe

:: Start
{do $gold = 100}
{do $health = 100}

Welcome to the adventure!
```

## Complete Example

### Original Twine (Harlowe)

```harlowe
:: Start
Welcome, traveler! What is your name?

(set: $name to (prompt: "Enter your name", "Hero"))
(set: $gold to 50)
(set: $hasWeapon to false)

Hello, $name! You have $gold gold.

[[Visit the shop->Shop]]
[[Go adventuring->Forest]]

:: Shop
The merchant greets you.

(if: $gold >= 20)[
[[Buy a sword (20 gold)->BuySword]]
]
[[Leave->Start]]

:: BuySword
(set: $gold to it - 20)
(set: $hasWeapon to true)
You purchased a sword!
[[Continue->Shop]]

:: Forest
(if: $hasWeapon)[
You venture into the forest, sword ready.
[[Fight the monster->Battle]]
](else:)[
The forest looks dangerous without a weapon.
[[Return->Start]]
]

:: Battle
(set: $damage to (random: 1, 10))
(if: $damage > 5)[
You won! You found (random: 10, 30) gold!
](else:)[
You barely escaped!
]
[[Return to town->Start]]
```

### Converted to Whisker

```whisker
@title: Adventure Game

:: Start
{once}
{do $name = "Hero"}
{do $gold = 50}
{do $hasWeapon = false}
{/}

Welcome, traveler!

Hello, $name! You have $gold gold.

+ [Visit the shop] -> Shop
+ [Go adventuring] -> Forest

:: Shop
The merchant greets you.

+ [Buy a sword (20 gold)] {$gold >= 20} -> BuySword
+ [Leave] -> Start

:: BuySword
{do $gold = $gold - 20}
{do $hasWeapon = true}
You purchased a sword!
+ [Continue] -> Shop

:: Forest
{$hasWeapon}
You venture into the forest, sword ready.
+ [Fight the monster] -> Battle
{else}
The forest looks dangerous without a weapon.
+ [Return] -> Start
{/}

:: Battle
{do $damage = random(1, 10)}
{$damage > 5}
You won! You found {random(10, 30)} gold!
{else}
You barely escaped!
{/}
+ [Return to town] -> Start
```

## Migration Checklist

- [ ] Export or copy Twine project
- [ ] Run automated conversion tool
- [ ] Convert any remaining macros manually
- [ ] Update variable syntax
- [ ] Convert conditionals
- [ ] Move CSS to `@style` directive
- [ ] Validate with `whisker validate`
- [ ] Test all story paths

## Common Issues

### Prompt Macros

Twine's `(prompt:)` and `(confirm:)` macros require JavaScript in Whisker:

```whisker
@script: |
  function askName() {
    return prompt("Enter your name", "Hero");
  }

:: Start
{do $name = askName()}
Hello, $name!
```

### Cycling Links

Harlowe cycling links need custom implementation:

```harlowe
(cycling-link: bind $choice, "Option A", "Option B", "Option C")
```

```whisker
@style: |
  .cycle-option { cursor: pointer; text-decoration: underline; }

:: ChoiceScreen
{$choice ?? "Option A"}

<span class="cycle-option" onclick="cycleChoice()">
[Cycle options]
</span>

+ [Confirm $choice] -> ProcessChoice
```

## Next Steps

- [Whisker Basics](/tutorials/beginner/) - Learn Whisker fundamentals
- [Advanced Features](/tutorials/intermediate/) - Explore advanced functionality
- [Examples](/examples/) - See real Whisker projects
