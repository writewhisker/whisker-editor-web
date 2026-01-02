# Functions

Create reusable logic with functions and namespaces.

## What You'll Learn

- Defining and calling functions
- Parameters and return values
- Organizing code with namespaces
- Built-in functions

## Prerequisites

- Completed [Data Structures](./02-data-structures)

## Defining Functions

Create reusable logic with the `function` block:

```whisker
{function rollDice(sides)}
  {do $result = random(1, sides)}
  {return $result}
{/function}

:: Start
{do $roll = rollDice(6)}
You rolled a $roll!
```

### Multiple Parameters

```whisker
{function calculateDamage(baseDamage, strength, weaponBonus)}
  {do $total = baseDamage + (strength * 2) + weaponBonus}
  {return $total}
{/function}

:: Combat
{do $damage = calculateDamage(10, $playerStrength, $weaponDamage)}
You deal $damage damage!
```

### Default Parameters

```whisker
{function greet(name, title = "adventurer")}
  {return "Hello, " + title + " " + name + "!"}
{/function}

:: Tavern
{greet("Marcus")}
{greet("Elena", "Countess")}
```

## Return Values

Functions can return any type:

```whisker
{function getMaxHealth(level, constitution)}
  {return 100 + (level * 10) + (constitution * 5)}
{/function}

{function formatGold(amount)}
  {if amount >= 1000}
    {return (amount / 1000) + "k gold"}
  {else}
    {return amount + " gold"}
  {/if}
{/function}

:: Status
Max Health: {getMaxHealth($level, $constitution)}
Wealth: {formatGold($gold)}
```

## Namespaces

Organize related functions with namespaces:

```whisker
{namespace Combat}
  {function attack(attacker, defender)}
    {do $damage = attacker.strength - defender.defense}
    {if $damage < 0}
      {do $damage = 1}
    {/if}
    {return $damage}
  {/function}

  {function defend(defender)}
    {do $bonus = random(1, defender.defense)}
    {return $bonus}
  {/function}

  {function heal(target, amount)}
    {do $newHealth = target.health + amount}
    {if $newHealth > target.maxHealth}
      {do $newHealth = target.maxHealth}
    {/if}
    {return $newHealth}
  {/function}
{/namespace}

:: Battle
{do $damage = Combat.attack($player, $enemy)}
You strike for $damage damage!

{do $player.health = Combat.heal($player, 20)}
You drink a potion and recover health.
```

### Nested Namespaces

```whisker
{namespace Game}
  {namespace Player}
    {function levelUp(player)}
      {do player.level = player.level + 1}
      {do player.maxHealth = player.maxHealth + 10}
      {return player}
    {/function}
  {/namespace}

  {namespace Items}
    {function use(item, target)}
      {if item.type == "potion"}
        {do target.health = target.health + item.power}
      {/if}
    {/function}
  {/namespace}
{/namespace}

:: Victory
{do $player = Game.Player.levelUp($player)}
You leveled up to level $player.level!
```

## Built-in Functions

Whisker provides many built-in functions:

### Math Functions

| Function | Description | Example |
|----------|-------------|---------|
| `random(min, max)` | Random integer | `random(1, 6)` |
| `min(a, b)` | Smaller value | `min($hp, 100)` |
| `max(a, b)` | Larger value | `max($hp, 0)` |
| `abs(n)` | Absolute value | `abs(-5)` → 5 |
| `floor(n)` | Round down | `floor(3.7)` → 3 |
| `ceil(n)` | Round up | `ceil(3.2)` → 4 |
| `round(n)` | Nearest integer | `round(3.5)` → 4 |

### String Functions

| Function | Description | Example |
|----------|-------------|---------|
| `upper(s)` | Uppercase | `upper("hi")` → "HI" |
| `lower(s)` | Lowercase | `lower("HI")` → "hi" |
| `capitalize(s)` | Capitalize first | `capitalize("hello")` → "Hello" |
| `trim(s)` | Remove whitespace | `trim(" hi ")` → "hi" |
| `length(s)` | String length | `length("hello")` → 5 |
| `substring(s, start, end)` | Extract part | `substring("hello", 0, 2)` → "he" |

### Array Functions

| Function | Description | Example |
|----------|-------------|---------|
| `length(arr)` | Array length | `length($items)` |
| `includes(arr, val)` | Check contains | `includes($items, "key")` |
| `join(arr, sep)` | Join to string | `join($items, ", ")` |
| `shuffle(arr)` | Randomize order | `shuffle($deck)` |
| `sort(arr)` | Sort array | `sort($scores)` |

## Practical Examples

### Dice Rolling System

```whisker
{namespace Dice}
  {function d4()}
    {return random(1, 4)}
  {/function}

  {function d6()}
    {return random(1, 6)}
  {/function}

  {function d20()}
    {return random(1, 20)}
  {/function}

  {function roll(count, sides)}
    {do $total = 0}
    {for $i in range(count)}
      {do $total = $total + random(1, sides)}
    {/for}
    {return $total}
  {/function}

  {function rollWithAdvantage(sides)}
    {do $roll1 = random(1, sides)}
    {do $roll2 = random(1, sides)}
    {return max($roll1, $roll2)}
  {/function}
{/namespace}

:: SkillCheck
{do $roll = Dice.d20()}
{do $total = $roll + $skillModifier}

You rolled a {$roll} + {$skillModifier} = {$total}

{$roll == 20}
Critical success!
{elif $total >= $difficulty}
Success!
{elif $roll == 1}
Critical failure!
{else}
Failed.
{/}
```

### Item System

```whisker
{namespace Items}
  {function create(name, type, value)}
    {return {
      name: name,
      type: type,
      value: value,
      id: random(1000, 9999)
    }}
  {/function}

  {function use(item, target)}
    {if item.type == "healing"}
      {do target.health = min(target.health + item.value, target.maxHealth)}
      {return true}
    {elif item.type == "damage"}
      {do target.health = target.health - item.value}
      {return true}
    {/if}
    {return false}
  {/function}

  {function describe(item)}
    {if item.type == "healing"}
      {return item.name + " (heals " + item.value + " HP)"}
    {elif item.type == "weapon"}
      {return item.name + " (" + item.value + " damage)"}
    {else}
      {return item.name}
    {/if}
  {/function}
{/namespace}

:: CreateItems
{do $healthPotion = Items.create("Health Potion", "healing", 50)}
{do $sword = Items.create("Iron Sword", "weapon", 15)}

You have: {Items.describe($healthPotion)}
         {Items.describe($sword)}
```

## Try It Yourself

Create:

1. **A namespace** for character management (create, levelUp, heal, damage)
2. **Custom dice functions** with advantage/disadvantage
3. **An item factory** that creates different item types

## Next Steps

Learn about styling your stories:

[Styling →](./04-styling)
