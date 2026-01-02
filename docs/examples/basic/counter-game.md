# Counter Game

A simple increment/decrement game.

## Code

```whisker
@title: The Counter

:: Start
{do $count = 10}
{do $goal = 0}

**Reach Zero!**

Decrease the counter to exactly 0 to win.
Be careful - going below 0 loses!

Current count: **$count**

+ [Subtract 1] {do $count = $count - 1} -> Check
+ [Subtract 2] {do $count = $count - 2} -> Check
+ [Subtract 3] {do $count = $count - 3} -> Check

:: Check
Current count: **$count**

{$count == 0}
**You win!** Perfect timing!
-> Victory
{elif $count < 0}
**Game over!** You went too far!
-> Defeat
{else}
Keep going...
+ [Subtract 1] {do $count = $count - 1} -> Check
+ [Subtract 2] {do $count = $count - 2} -> Check
+ [Subtract 3] {do $count = $count - 3} -> Check
{/}

:: Victory
🎉 **Congratulations!**

You reached exactly zero!

+ [Play again] -> Start
+ [Exit] -> END

:: Defeat
💥 **Too far!**

You went below zero. Try again!

+ [Play again] -> Start
+ [Exit] -> END
```

## What This Shows

- Inline variable modification in choices
- Win/lose condition checking
- Game loop with reset
- Emoji in text content
