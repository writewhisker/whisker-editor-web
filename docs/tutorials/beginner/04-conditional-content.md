# Conditional Content

Show different content based on variables and player choices.

## What You'll Learn

- Using if/else conditions
- Conditional choices
- Complex condition logic

## Prerequisites

- Completed [Using Variables](./03-using-variables)

## Step 1: Basic Conditions

Use `{condition}...{/}` to show content conditionally:

```whisker
:: Start
{do $hasKey = false}

There's a locked door before you.

{$hasKey}
You have a key that might fit!
{/}

+ [Try the door] -> TryDoor
```

If `$hasKey` is `true`, the text appears. If `false`, it's hidden.

## Step 2: If-Else Conditions

Use `{else}` for alternative content:

```whisker
:: TryDoor
{$hasKey}
You unlock the door and step through!
+ [Enter] -> NextRoom
{else}
The door is locked. You need a key.
+ [Search for key] -> SearchRoom
+ [Go back] -> Start
{/}
```

## Step 3: Comparison Operators

Compare values using these operators:

| Operator | Meaning |
|----------|---------|
| `==` | Equal to |
| `!=` | Not equal to |
| `>` | Greater than |
| `<` | Less than |
| `>=` | Greater than or equal |
| `<=` | Less than or equal |

Examples:

```whisker
:: Shop
{$gold >= 50}
You have enough gold to buy the sword!
{else}
You need more gold. You only have $gold.
{/}

:: Status
{$health <= 25}
Warning: Your health is critical!
{/}

{$health == 100}
You're in perfect health.
{/}
```

## Step 4: Elif (Else-If)

Chain multiple conditions with `{elif}`:

```whisker
:: HealthCheck
{$health >= 75}
You feel strong and healthy.
{elif $health >= 50}
You're feeling okay.
{elif $health >= 25}
You're wounded and tired.
{else}
You're barely standing!
{/}
```

## Step 5: Conditional Choices

Hide or show choices based on conditions:

```whisker
:: Door
You see a heavy wooden door.

+ [Open the door] {$hasKey} -> NextRoom
+ [Pick the lock] {$lockpickSkill >= 5} -> NextRoom
+ [Break down the door] {$strength >= 10} -> NextRoom
+ [Go back] -> Hallway
```

Only choices where the condition is true will be shown!

## Step 6: Combining Conditions

Use `and` and `or` for complex logic:

```whisker
:: SecretRoom
{$hasKey and $hasMap}
You unlock the door and follow the map to the treasure!
{/}

{$isWizard or $hasSpellbook}
You sense magical energy in the room.
{/}
```

### Logic Operators

| Operator | Meaning |
|----------|---------|
| `and` | Both conditions must be true |
| `or` | Either condition can be true |
| `not` | Inverts the condition |

```whisker
{not $isDark}
You can see clearly.
{/}

{$hasSword and $hasShield}
You're fully equipped!
{/}

{$isHungry or $isThirsty}
You should find some supplies.
{/}
```

## Complete Example

```whisker
:: Start
{do $gold = 50}
{do $hasKey = false}
{do $hasSword = false}
{do $health = 100}
{do $strength = 5}

Welcome, adventurer!
You have $gold gold and $health health.

+ [Visit the shop] -> Shop
+ [Explore the dungeon] -> DungeonEntrance

:: Shop
"Welcome!" says the merchant.
Gold: $gold

+ [Buy key (20 gold)] {$gold >= 20} {do $gold = $gold - 20} {do $hasKey = true} -> Shop
+ [Buy sword (40 gold)] {$gold >= 40} {do $gold = $gold - 40} {do $hasSword = true} -> Shop
+ [Leave] -> Start

:: DungeonEntrance
A heavy iron door blocks your path.

{$hasKey}
You use your key to unlock the door.
+ [Enter the dungeon] -> Dungeon
{else}
The door is locked tight.
+ [Return to town] -> Start
{/}

:: Dungeon
You enter the dark dungeon.
A goblin appears!

{$hasSword}
Your sword gleams in the torchlight.
+ [Attack with sword] -> EasyFight
{else}
You're unarmed!
+ [Fight with fists] -> HardFight
{/}

+ [Run away] -> DungeonEntrance

:: EasyFight
Your sword makes quick work of the goblin!
{do $gold = $gold + 30}
You found 30 gold!

+ [Continue deeper] -> Treasure

:: HardFight
The fight is brutal without a weapon.
{do $health = $health - 40}

{$health <= 0}
You have been defeated...
+ [Game Over] -> END
{else}
You barely survive! Health: $health
+ [Continue deeper] -> Treasure
{/}

:: Treasure
You found the treasure room!

{$health >= 50}
With your remaining strength, you carry out the treasure!
+ [Victory!] -> END
{else}
You're too weak to carry the treasure.
+ [Rest and try again] {do $health = $health + 25} -> Treasure
{/}
```

## Try It Yourself

Create a story with:

1. **At least 3 different conditions**
2. **Conditional choices** that appear/disappear
3. **An if-elif-else chain**

## Common Mistakes

### Missing Closing Tag

```whisker
# Wrong - missing {/}
{$hasKey}
You have the key!

# Right
{$hasKey}
You have the key!
{/}
```

### Wrong Operator

```whisker
# Wrong - single = is assignment
{$health = 100}

# Right - double == for comparison
{$health == 100}
```

## Next Steps

Learn to create complex story structures:

[Linking Passages →](./05-linking-passages)
