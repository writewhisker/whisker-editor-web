# Using Variables

Track information and create dynamic stories with variables.

## What You'll Learn

- Creating and setting variables
- Displaying variable values
- Using variables to track player state

## Prerequisites

- Completed [Adding Choices](./02-adding-choices)

## What Are Variables?

Variables store information that can change during your story:

- Player's name
- Score or health
- Items collected
- Choices made

## Step 1: Creating Variables

Use `{do}` to create and set variables:

```whisker
:: Start
{do $playerName = "Adventurer"}
{do $gold = 0}
{do $hasKey = false}

Welcome, $playerName!
You have $gold gold coins.
```

### Variable Naming

- Variables start with `$`
- Use descriptive names: `$health`, `$inventory`, `$hasVisitedCave`
- Case-sensitive: `$Gold` and `$gold` are different

## Step 2: Displaying Variables

Just write the variable name to show its value:

```whisker
:: Status
Your name: $playerName
Your gold: $gold
Your health: $health
```

## Step 3: Changing Variables

Update variables as the story progresses:

```whisker
:: FindTreasure
You found a treasure chest!

{do $gold = $gold + 50}

You now have $gold gold coins!

+ [Continue] -> NextRoom

:: TakeDamage
A monster attacks you!

{do $health = $health - 10}

Your health is now $health.
```

### Math Operations

| Operation | Example |
|-----------|---------|
| Add | `{do $gold = $gold + 10}` |
| Subtract | `{do $health = $health - 5}` |
| Multiply | `{do $damage = $strength * 2}` |
| Divide | `{do $share = $gold / 2}` |

## Step 4: Variables on Choices

You can modify variables when a choice is selected:

```whisker
:: Shop
Welcome to the shop!
You have $gold gold.

+ [Buy sword (10 gold)] {do $gold = $gold - 10} {do $hasSword = true} -> BoughtSword
+ [Buy shield (15 gold)] {do $gold = $gold - 15} {do $hasShield = true} -> BoughtShield
+ [Leave] -> Exit
```

## Variable Types

Whisker supports several types:

| Type | Example |
|------|---------|
| Number | `{do $health = 100}` |
| String | `{do $name = "Hero"}` |
| Boolean | `{do $hasKey = true}` |

### String Variables

```whisker
:: GetName
{do $playerName = "Brave Knight"}

Hello, $playerName!

:: ChangeTitle
{do $title = "Dragon Slayer"}

You are now known as: $playerName the $title
```

### Boolean Variables

Booleans are `true` or `false`:

```whisker
:: Start
{do $doorUnlocked = false}
{do $hasKey = false}

:: FindKey
You found a key!
{do $hasKey = true}

:: TryDoor
{do $doorUnlocked = $hasKey}
```

## Complete Example

Here's a story using variables effectively:

```whisker
:: Start
{do $gold = 100}
{do $health = 100}
{do $hasSword = false}
{do $hasPotion = false}

You are an adventurer with $gold gold and $health health.

+ [Visit the shop] -> Shop
+ [Enter the dungeon] -> Dungeon

:: Shop
"Welcome, traveler!" says the merchant.
You have $gold gold.

+ [Buy sword (50 gold)] {do $gold = $gold - 50} {do $hasSword = true} -> BoughtItem
+ [Buy potion (25 gold)] {do $gold = $gold - 25} {do $hasPotion = true} -> BoughtItem
+ [Leave] -> Start

:: BoughtItem
"Pleasure doing business with you!"
You now have $gold gold remaining.

+ [Keep shopping] -> Shop
+ [Leave] -> Start

:: Dungeon
You enter the dark dungeon.
A monster appears!

+ [Fight!] -> Fight
+ [Run away] -> Start

:: Fight
{do $damage = 20}
{do $health = $health - $damage}

The monster hits you for $damage damage!
Your health: $health

+ [Drink potion] -> DrinkPotion
+ [Keep fighting] -> Victory

:: DrinkPotion
{do $health = $health + 50}

The potion restores your health to $health!

+ [Continue fighting] -> Victory

:: Victory
You defeat the monster!
{do $gold = $gold + 100}

You found 100 gold! You now have $gold gold.

+ [Return to town] -> Start
+ [Go deeper] -> END
```

## Try It Yourself

Create a story that tracks:

1. **A player stat** (health, mana, energy)
2. **A resource** (gold, gems, points)
3. **An item** (key, weapon, tool)

## Common Mistakes

### Forgetting the Dollar Sign

```whisker
# Wrong
{do gold = 100}

# Right
{do $gold = 100}
```

### Using Uninitialized Variables

```whisker
# Wrong - $score was never set
Your score is $score

# Right - initialize first
{do $score = 0}
Your score is $score
```

## Next Steps

Learn to show different content based on conditions:

[Conditional Content →](./04-conditional-content)
