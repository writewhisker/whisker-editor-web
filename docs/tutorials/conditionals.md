# Conditionals and Branching

Learn how to create dynamic content that changes based on player choices and game state.

## Basic Conditionals

Use `{if}` blocks to show or hide content:

```wls
:: Shop
Welcome to the shop!

{if $gold >= 100}
"You look like a wealthy customer," says the shopkeeper.
{else}
"Hmm, you don't seem to have much gold," the shopkeeper notes.
{/if}
```

## Conditional Choices

Make choices appear only when conditions are met:

```wls
:: Crossroads
You arrive at a crossroads.

* [Take the main road] -> Town
* [Take the forest path] {$hasMap} -> SecretGrove
* [Take the mountain trail] {$strength >= 10} -> MountainPass
```

The second choice only appears if `$hasMap` is true.
The third choice requires strength of 10 or more.

## Comparison Operators

| Operator | Meaning |
|----------|---------|
| `==` | Equal to |
| `!=` | Not equal to |
| `>` | Greater than |
| `<` | Less than |
| `>=` | Greater than or equal |
| `<=` | Less than or equal |

```wls
{if $health == 100}
You're at full health!
{/if}

{if $reputation >= 50}
The guards recognize you as a hero.
{/if}

{if $trust != "betrayer"}
The merchant is willing to trade.
{/if}
```

## Logical Operators

Combine conditions with `and`, `or`, and `not`:

```wls
{if $hasKey and $knowsSecret}
You can now access the hidden chamber.
{/if}

{if $gold >= 50 or $reputation >= 75}
You can afford the item (with gold or as a gift).
{/if}

{if not $visitedDungeon}
You've never been here before.
{/if}
```

## Nested Conditionals

```wls
:: Quest_Reward
The king prepares your reward.

{if $questComplete}
    {if $savedPrincess}
    "You've gone above and beyond!" He offers you the royal sword.
    {elseif $foundTreasure}
    "Excellent work!" He offers you gold.
    {else}
    "Well done." He offers a modest reward.
    {/if}
{else}
"Return when you've completed the quest."
{/if}
```

## Shorthand Conditions

For simple checks, use the shorthand syntax:

```wls
{$isKing: Your Majesty, welcome.}
{$hasWeapon: You ready your weapon.}
{not $isAlone: Your companions follow you.}
```

This is equivalent to:

```wls
{if $isKing}Your Majesty, welcome.{/if}
{if $hasWeapon}You ready your weapon.{/if}
{if not $isAlone}Your companions follow you.{/if}
```

## Elseif Chains

```wls
:: Character_Greeting
{if $class == "warrior"}
"Hail, mighty warrior!"
{elseif $class == "mage"}
"Greetings, wise one."
{elseif $class == "rogue"}
"Ah, a shadow walks among us."
{else}
"Welcome, traveler."
{/if}
```

## Visit Counting

Track how many times a passage has been visited:

```wls
:: TownSquare
{if whisker.visited("TownSquare") == 1}
The town square is busy with merchants.
{elseif whisker.visited("TownSquare") == 2}
The square looks familiar now.
{else}
You know this place well.
{/if}
```

## Conditional Text Variations

Combine with alternatives for dynamic descriptions:

```wls
:: Forest
The forest is {~quiet|peaceful|serene}.

{if $timeOfDay == "night"}
The trees cast {~eerie|dark|mysterious} shadows.
{else}
Sunlight {~filters|streams|pours} through the canopy.
{/if}
```

## State Machines

Create complex states with variables:

```wls
VAR $questState = "not_started"

:: QuestGiver
{if $questState == "not_started"}
"Will you help me find the lost artifact?"
* [Accept the quest]
    {$questState = "in_progress"}
    -> Quest_Start
* [Decline] -> Town

{elseif $questState == "in_progress"}
"Have you found the artifact yet?"
* [Show the artifact] {$hasArtifact}
    {$questState = "complete"}
    -> Quest_Complete
* [Not yet] -> Town

{elseif $questState == "complete"}
"Thank you again for your help!"
{/if}
```

## Best Practices

1. **Initialize variables**: Always set initial values for variables you'll check.

```wls
VAR $hasKey = false
VAR $gold = 0
VAR $reputation = 50
```

2. **Use meaningful names**: `$playerHasMetKing` is clearer than `$k`.

3. **Group related conditions**: Check related things together.

```wls
{if $hasWeapon and $hasArmor and $hasSupplies}
You're ready for adventure!
{/if}
```

4. **Provide fallbacks**: Always have an `else` case for unexpected states.

```wls
{if $mood == "happy"}
You smile.
{elseif $mood == "sad"}
You frown.
{else}
Your expression is neutral.
{/if}
```

## Next Steps

- Learn about [Random Events](/tutorials/randomness)
- Create [Advanced Choices](/tutorials/advanced-choices)
- Master [Variables and State](/tutorials/variables)
