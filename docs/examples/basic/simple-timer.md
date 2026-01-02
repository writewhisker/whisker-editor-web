# Simple Timer

Track turns and time limits.

## Code

```whisker
@title: Escape Room Timer

:: Start
{do $turnsLeft = 10}
{do $escaped = false}
{do $foundKey = false}
{do $foundCode = false}

**Escape Room**

You have **$turnsLeft turns** to escape!

-> Room

:: Room
**Turns remaining: $turnsLeft**

{$turnsLeft <= 0}
-> TimeUp
{/}

{$turnsLeft <= 3}
*Hurry! Time is running out!*
{/}

+ [Search the desk] -> SearchDesk
+ [Check the safe] -> CheckSafe
+ [Try the door] -> TryDoor

:: SearchDesk
{do $turnsLeft = $turnsLeft - 1}

{not $foundKey}
You find a **key** in the drawer!
{do $foundKey = true}
{else}
Nothing else here.
{/}

-> Room

:: CheckSafe
{do $turnsLeft = $turnsLeft - 1}

{not $foundCode}
A note on the safe reads: *"Code: 4-7-2"*
{do $foundCode = true}
{/}

{$foundCode}
+ [Enter 4-7-2] -> OpenSafe
+ [Back] -> Room
{else}
The safe is locked. You need the code.
-> Room
{/}

:: OpenSafe
{do $turnsLeft = $turnsLeft - 1}
You open the safe and find a **master key**!
{do $hasMasterKey = true}
-> Room

:: TryDoor
{do $turnsLeft = $turnsLeft - 1}

{$hasMasterKey}
The door opens! You escaped!
{do $escaped = true}
-> Win
{elif $foundKey}
The key doesn't fit this lock.
*You need something else.*
{else}
The door is locked tight.
{/}

-> Room

:: Win
**YOU ESCAPED!**

Turns remaining: $turnsLeft

{$turnsLeft >= 5}
With time to spare! Excellent work!
{else}
Just in the nick of time!
{/}

+ [Play again] -> Start

:: TimeUp
**TIME'S UP!**

You ran out of turns.

+ [Try again] -> Start
```

## What This Shows

- Turn-based timer system
- Countdown mechanics
- Urgency messaging
- Win/lose conditions based on time
- Resource management
