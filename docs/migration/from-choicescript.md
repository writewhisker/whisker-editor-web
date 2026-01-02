# Migrating from ChoiceScript

A comprehensive guide to converting ChoiceScript projects to Whisker.

## Overview

ChoiceScript is Choice of Games' scripting language for text-based games. This guide covers converting ChoiceScript projects to Whisker.

## Quick Start

```bash
# Convert ChoiceScript project
whisker import startup.txt --from=choicescript -o story.ws
```

## Core Concepts Mapping

| ChoiceScript | Whisker | Notes |
|--------------|---------|-------|
| Scene files | Passages | Split by `*label` |
| `*label` | Passages (`::`) | Direct mapping |
| `*choice` | Choices (`+`) | Similar syntax |
| `*goto` | Link (`->`) | Similar |
| `*set var val` | `{do $var = val}` | Prefix with `$` |
| `*if condition` | `{condition}` | Similar logic |
| `${var}` | `$var` or `{$var}` | Simpler syntax |

## Scenes and Labels

### ChoiceScript Scenes

**startup.txt:**
```choicescript
*title My Story
*author Jane Doe

You wake up in a strange place.

*choice
  #Look around
    *goto look_around
  #Go back to sleep
    *goto sleep

*label look_around
You see a door and a window.
*goto_scene chapter1

*label sleep
You fall back asleep...
*ending
```

### Whisker Equivalent

```whisker
@title: My Story
@author: Jane Doe

:: Start
You wake up in a strange place.

+ [Look around] -> LookAround
+ [Go back to sleep] -> Sleep

:: LookAround
You see a door and a window.
-> Chapter1

:: Sleep
You fall back asleep...
-> END
```

## Choices

### Basic Choices

**ChoiceScript:**
```choicescript
*choice
  #Open the door
    You open the door carefully.
    *goto next_scene
  #Break down the door
    You kick the door down!
    *goto next_scene
```

**Whisker:**
```whisker
+ [Open the door]
  You open the door carefully.
  -> NextScene
+ [Break down the door]
  You kick the door down!
  -> NextScene
```

### Choices with Conditions

**ChoiceScript:**
```choicescript
*choice
  *if (strength > 15) #Force the door open
    Your muscles bulge as you push.
    *goto success
  #Try the handle
    *goto try_handle
  *selectable_if (has_key) #Use the key
    You unlock the door.
    *goto success
```

**Whisker:**
```whisker
+ [Force the door open] {$strength > 15}
  Your muscles bulge as you push.
  -> Success
+ [Try the handle]
  -> TryHandle
+ [Use the key] {$hasKey}
  You unlock the door.
  -> Success
```

### Fake Choices

**ChoiceScript:**
```choicescript
*fake_choice
  #I understand
  #Tell me more
"Good," she says, continuing her explanation.
```

**Whisker:**
```whisker
+ [I understand]
+ [Tell me more]
-
"Good," she says, continuing her explanation.
```

## Variables

### Creating Variables

**ChoiceScript (startup.txt):**
```choicescript
*create strength 50
*create health 100
*create name "Hero"
*create has_sword false
```

**Whisker:**
```whisker
:: Start
{do $strength = 50}
{do $health = 100}
{do $name = "Hero"}
{do $hasSword = false}
```

### Setting Variables

**ChoiceScript:**
```choicescript
*set health 80
*set strength +10
*set strength -5
*set strength %+20
*set has_sword true
```

**Whisker:**
```whisker
{do $health = 80}
{do $strength = $strength + 10}
{do $strength = $strength - 5}
{do $strength = $strength * 1.2}
{do $hasSword = true}
```

### Displaying Variables

**ChoiceScript:**
```choicescript
Your strength is ${strength}.
Hello, ${name}!
```

**Whisker:**
```whisker
Your strength is $strength.
Hello, $name!
```

## Stats and Opposed Pairs

### Single Stats

**ChoiceScript:**
```choicescript
*create strength 50

*stat_chart
  percent strength Strength
```

**Whisker:**
```whisker
@style: |
  .stat-bar {
    width: 200px;
    height: 20px;
    background: #ddd;
  }
  .stat-fill {
    height: 100%;
    background: #4CAF50;
  }

:: ShowStats
**Strength**: $strength%
<div class="stat-bar">
  <div class="stat-fill" style="width: {$strength}%"></div>
</div>
```

### Opposed Pairs

**ChoiceScript:**
```choicescript
*create honest 50

*stat_chart
  opposed_pair honest
    Honest
    Deceptive
```

**Whisker:**
```whisker
:: ShowStats
{$honest >= 50}
**Honest**: {$honest}%
{else}
**Deceptive**: {100 - $honest}%
{/}
```

## Conditionals

### If/Else

**ChoiceScript:**
```choicescript
*if health > 80
  You feel great!
*elseif health > 40
  You're doing okay.
*else
  You need medical attention.
```

**Whisker:**
```whisker
{$health > 80}
You feel great!
{elif $health > 40}
You're doing okay.
{else}
You need medical attention.
{/}
```

### Complex Conditions

**ChoiceScript:**
```choicescript
*if ((strength > 10) and (has_sword))
  You're ready for battle!
*if (intelligence > 15) or (wisdom > 15)
  You understand the puzzle.
*if not(has_visited_castle)
  This is your first time here.
```

**Whisker:**
```whisker
{($strength > 10) and $hasSword}
You're ready for battle!
{/}
{($intelligence > 15) or ($wisdom > 15)}
You understand the puzzle.
{/}
{not $hasVisitedCastle}
This is your first time here.
{/}
```

## Text Effects

### Emphasis and Formatting

**ChoiceScript:**
```choicescript
This is *important* text.
This is [i]italicized[/i] and [b]bold[/b].
```

**Whisker:**
```whisker
This is *important* text.
This is *italicized* and **bold**.
```

### Page Breaks

**ChoiceScript:**
```choicescript
*page_break
*page_break Continue reading
```

**Whisker:**
```whisker
+ [Continue] -> NextPage

:: NextPage
...

+ [Continue reading] -> AfterBreak
```

### Line Breaks

**ChoiceScript:**
```choicescript
Line one.
*line_break
Line two.
```

**Whisker:**
```whisker
Line one.

Line two.
```

## Navigation

### Goto

**ChoiceScript:**
```choicescript
*goto next_label
*goto_scene chapter2
*gosub_scene helper return_here
```

**Whisker:**
```whisker
-> NextLabel

-> Chapter2

-> HelperScene ->
```

### Finish and Ending

**ChoiceScript:**
```choicescript
*finish
*ending
*ending This is how it ends.
```

**Whisker:**
```whisker
-> NextScene

:: Ending
This is how it ends.
-> END
```

## Random and Randomtest

### Random Numbers

**ChoiceScript:**
```choicescript
*rand damage 1 10
*rand roll 1 20
```

**Whisker:**
```whisker
{do $damage = random(1, 10)}
{do $roll = random(1, 20)}
```

### Random Text

**ChoiceScript:**
```choicescript
*rand result 1 3
*if result = 1
  "Hello!"
*if result = 2
  "Hi there!"
*if result = 3
  "Greetings!"
```

**Whisker:**
```whisker
{do $result = random(1, 3)}
{$result == 1}
"Hello!"
{elif $result == 2}
"Hi there!"
{else}
"Greetings!"
{/}
```

## Input

### Input Text

**ChoiceScript:**
```choicescript
*input_text name
Hello, ${name}!
```

**Whisker:**
```whisker
@script: |
  function getInput(prompt) {
    return window.prompt(prompt, "");
  }

:: AskName
{do $name = getInput("What is your name?")}
Hello, $name!
```

### Input Number

**ChoiceScript:**
```choicescript
*input_number gold 0 1000
You have ${gold} gold.
```

**Whisker:**
```whisker
{do $gold = parseInt(getInput("How much gold? (0-1000)"), 10)}
{do $gold = max(0, min(1000, $gold))}
You have $gold gold.
```

## Achievements

**ChoiceScript (choicescript_stats.txt):**
```choicescript
*achievement hero visible 50 Hero
  You saved the kingdom!
```

**Whisker:**
```whisker
{do $achievements = []}

{function unlockAchievement(id, name, desc)}
  {if not $achievements.includes(id)}
    {do $achievements.push(id)}
    **Achievement Unlocked: {name}**
    {desc}
  {/if}
{/function}

:: Victory
{unlockAchievement("hero", "Hero", "You saved the kingdom!")}
```

## Complete Example

### Original ChoiceScript

**startup.txt:**
```choicescript
*title The Dark Castle
*author Example Author

*create gold 100
*create health 100
*create strength 50
*create has_sword false

*label start
You stand before the gates of the Dark Castle.

*choice
  #Enter the castle
    *set health -10
    The heavy doors creak as you push them open.
    *goto castle_entrance
  #Search the courtyard
    *goto courtyard
  #Leave this place
    Perhaps discretion is the better part of valor.
    *ending

*label courtyard
You find an old sword half-buried in the dirt.

*choice
  #Take the sword
    *set has_sword true
    You now have a trusty blade!
    *goto start
  #Leave it
    *goto start

*label castle_entrance
A guard blocks your path.

*if has_sword
  *choice
    #Fight the guard
      *if strength > 40
        You defeat the guard!
        *goto throne_room
      *else
        The guard overpowers you.
        *set health -50
        *goto castle_entrance
    #Try to sneak past
      *goto sneak_attempt
*else
  *choice
    #Try to sneak past
      *goto sneak_attempt
    #Run away
      *goto start

*label sneak_attempt
*rand roll 1 20
*if roll > 10
  You slip past unseen.
  *goto throne_room
*else
  The guard spots you!
  *set health -25
  *goto castle_entrance

*label throne_room
You've reached the throne room!

*if health < 25
  But you're too weak to continue...
  *ending
*else
  Victory is yours!
  *set gold +500
  You found ${gold} gold pieces!
  *ending
```

### Converted to Whisker

```whisker
@title: The Dark Castle
@author: Example Author

:: Start
{once}
{do $gold = 100}
{do $health = 100}
{do $strength = 50}
{do $hasSword = false}
{/}

You stand before the gates of the Dark Castle.

+ [Enter the castle]
  {do $health = $health - 10}
  The heavy doors creak as you push them open.
  -> CastleEntrance
+ [Search the courtyard] -> Courtyard
+ [Leave this place]
  Perhaps discretion is the better part of valor.
  -> END

:: Courtyard
You find an old sword half-buried in the dirt.

+ [Take the sword]
  {do $hasSword = true}
  You now have a trusty blade!
  -> Start
+ [Leave it] -> Start

:: CastleEntrance
A guard blocks your path.

{$hasSword}
+ [Fight the guard] -> FightGuard
+ [Try to sneak past] -> SneakAttempt
{else}
+ [Try to sneak past] -> SneakAttempt
+ [Run away] -> Start
{/}

:: FightGuard
{$strength > 40}
You defeat the guard!
-> ThroneRoom
{else}
The guard overpowers you.
{do $health = $health - 50}
-> CastleEntrance
{/}

:: SneakAttempt
{do $roll = random(1, 20)}
{$roll > 10}
You slip past unseen.
-> ThroneRoom
{else}
The guard spots you!
{do $health = $health - 25}
-> CastleEntrance
{/}

:: ThroneRoom
You've reached the throne room!

{$health < 25}
But you're too weak to continue...
{else}
Victory is yours!
{do $gold = $gold + 500}
You found $gold gold pieces!
{/}
-> END
```

## Migration Checklist

- [ ] Convert scene files to passage structure
- [ ] Transform `*label` to `::` passages
- [ ] Convert `*choice` blocks to `+` choices
- [ ] Update variable syntax (add `$` prefix)
- [ ] Convert `*set` to `{do $var = val}`
- [ ] Transform conditionals
- [ ] Replace `*rand` with `random()`
- [ ] Handle `*goto`/`*goto_scene` as links
- [ ] Convert `*ending`/`*finish` to `-> END`
- [ ] Implement custom stat display if needed
- [ ] Validate with `whisker validate`
- [ ] Test all story paths

## Common Issues

### Multireplace

**ChoiceScript:**
```choicescript
@{gender You look handsome|You look beautiful}.
```

**Whisker:**
```whisker
{$gender == "male" ? "You look handsome" : "You look beautiful"}.
```

### Gosub Return Values

ChoiceScript's `*gosub` with `*return` requires manual state:

**ChoiceScript:**
```choicescript
*gosub_scene helper
*if helper_result = "success"
  It worked!

*label helper
*set helper_result "success"
*return
```

**Whisker:**
```whisker
-> Helper ->
{$helperResult == "success"}
It worked!
{/}

:: Helper
{do $helperResult = "success"}
->->
```

### Print and Comment

**ChoiceScript:**
```choicescript
*print var
*comment This is a comment
```

**Whisker:**
```whisker
{$var}
<!-- This is a comment -->
```

## Next Steps

- [Whisker Basics](/tutorials/beginner/) - Learn Whisker fundamentals
- [Advanced Features](/tutorials/intermediate/) - Explore advanced functionality
- [Examples](/examples/) - See real Whisker projects
