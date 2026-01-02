# Basic Variables

Track and display information using variables.

## Code

```whisker
@title: The Gold Counter

:: Start
{do $gold = 0}
{do $name = "Adventurer"}

Welcome, $name!
You have $gold gold coins.

+ [Search the ground] -> Search
+ [Check your purse] -> CheckGold

:: Search
{do $found = random(1, 10)}
{do $gold = $gold + $found}

You found $found gold coins!
You now have $gold gold total.

+ [Search again] -> Search
+ [Done searching] -> CheckGold

:: CheckGold
Current gold: $gold

{$gold >= 50}
You're getting rich!
{elif $gold >= 20}
You have a decent amount.
{else}
You need more gold.
{/}

+ [Search for more] -> Search
+ [Quit] -> END
```

## What This Shows

- `{do $variable = value}` - Sets a variable
- `$variable` - Displays the variable value
- `random(min, max)` - Generates a random number
- Math operations with variables
