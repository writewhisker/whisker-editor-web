# Data Structures

Work with lists, arrays, and maps for complex game state.

## What You'll Learn

- Creating and using lists
- Array operations
- Map (dictionary) structures
- Iterating over collections

## Prerequisites

- Completed [Advanced Flow Control](./01-advanced-flow)

## Lists

Lists store ordered collections of items:

```whisker
:: Start
{do $inventory = []}
{do $skills = ["sword fighting", "archery"]}

You have {#$inventory} items and {#$skills} skills.
```

### Adding Items

```whisker
:: PickUpItem
{do $inventory.push("key")}
{do $inventory.push("torch")}

You now have: $inventory
```

### Checking for Items

```whisker
:: Door
{$inventory.includes("key")}
You unlock the door with your key.
+ [Enter] -> NextRoom
{else}
The door is locked. You need a key.
+ [Search for key] -> SearchArea
{/}
```

### Removing Items

```whisker
:: UseKey
{do $usedKey = $inventory.splice($inventory.indexOf("key"), 1)}
You use the key. It breaks in the lock.
```

### List Properties

| Operation | Syntax | Result |
|-----------|--------|--------|
| Length | `#$list` | Number of items |
| First | `$list[0]` | First item |
| Last | `$list[-1]` | Last item |
| Contains | `$list.includes(x)` | true/false |
| Add | `$list.push(x)` | Adds to end |
| Remove | `$list.pop()` | Removes from end |

## Arrays

Arrays work like lists but with numeric indices:

```whisker
:: Dungeon
{do $rooms = [
  "entrance hall",
  "treasure room",
  "boss chamber"
]}

{do $currentRoom = 0}

You are in the $rooms[$currentRoom].

+ [Go to next room] {do $currentRoom = $currentRoom + 1} -> Dungeon
+ [Go back] {$currentRoom > 0} {do $currentRoom = $currentRoom - 1} -> Dungeon
```

### Multi-dimensional Arrays

```whisker
:: Map
{do $map = [
  ["forest", "mountain", "desert"],
  ["village", "castle", "ruins"],
  ["swamp", "cave", "beach"]
]}

{do $playerX = 1}
{do $playerY = 1}

You are at the $map[$playerY][$playerX].

+ [Go north] {$playerY > 0} {do $playerY = $playerY - 1} -> Map
+ [Go south] {$playerY < 2} {do $playerY = $playerY + 1} -> Map
+ [Go west] {$playerX > 0} {do $playerX = $playerX - 1} -> Map
+ [Go east] {$playerX < 2} {do $playerX = $playerX + 1} -> Map
```

## Maps (Dictionaries)

Maps store key-value pairs:

```whisker
:: Character
{do $stats = {
  health: 100,
  mana: 50,
  strength: 10,
  defense: 5
}}

Health: $stats.health
Mana: $stats.mana
Strength: $stats.strength
Defense: $stats.defense
```

### Modifying Maps

```whisker
:: LevelUp
{do $stats.strength = $stats.strength + 2}
{do $stats.defense = $stats.defense + 1}
{do $stats.health = $stats.health + 10}

You leveled up!
Strength: $stats.strength (+2)
Defense: $stats.defense (+1)
Max Health: $stats.health (+10)
```

### Nested Maps

```whisker
:: Inventory
{do $equipment = {
  weapon: {
    name: "Iron Sword",
    damage: 10,
    durability: 100
  },
  armor: {
    name: "Leather Vest",
    defense: 5,
    durability: 80
  }
}}

Equipped weapon: $equipment.weapon.name (damage: $equipment.weapon.damage)
Equipped armor: $equipment.armor.name (defense: $equipment.armor.defense)
```

## Iterating Over Collections

### For Loops

```whisker
:: ShowInventory
Your inventory:
{for $item in $inventory}
- $item
{/for}

+ [Back] -> Menu
```

### With Index

```whisker
:: NumberedList
{for $item, $index in $inventory}
{$index + 1}. $item
{/for}
```

### Iterating Maps

```whisker
:: ShowStats
Your stats:
{for $value, $key in $stats}
$key: $value
{/for}
```

## Practical Examples

### Inventory System

```whisker
:: Start
{do $inventory = []}
{do $gold = 100}

:: Town
Town Square
Gold: $gold | Items: {#$inventory}

+ [Go to shop] -> Shop
+ [View inventory] -> ViewInventory
+ [Leave town] -> Exit

:: Shop
{do $shopItems = [
  { name: "Sword", price: 50 },
  { name: "Shield", price: 40 },
  { name: "Potion", price: 20 }
]}

"Welcome! What would you like?"

{for $item in $shopItems}
+ [Buy $item.name ($item.price gold)] {$gold >= $item.price} {do $gold = $gold - $item.price} {do $inventory.push($item.name)} -> Shop
{/for}

+ [Leave] -> Town

:: ViewInventory
{#$inventory > 0}
Your items:
{for $item in $inventory}
- $item
{/for}
{else}
Your inventory is empty.
{/}

+ [Back] -> Town
```

### Quest Tracking

```whisker
:: QuestLog
{do $quests = {
  main: {
    name: "Save the Kingdom",
    complete: false,
    objectives: [
      { desc: "Find the sword", done: false },
      { desc: "Defeat the dragon", done: false },
      { desc: "Return to the king", done: false }
    ]
  },
  side1: {
    name: "Collect Herbs",
    complete: false,
    objectives: [
      { desc: "Gather 5 healing herbs", done: false }
    ]
  }
}}

:: ShowQuests
Active Quests:

{for $quest, $id in $quests}
{not $quest.complete}
**$quest.name**
{for $obj in $quest.objectives}
{$obj.done ? "[x]" : "[ ]"} $obj.desc
{/for}

{/}
{/for}

+ [Back] -> Menu
```

### Character Relationships

```whisker
:: Relationships
{do $relationships = {
  alice: { affinity: 0, met: false },
  bob: { affinity: 0, met: false },
  clara: { affinity: 0, met: false }
}}

:: TalkToAlice
{not $relationships.alice.met}
{do $relationships.alice.met = true}
"Hello! I don't think we've met. I'm Alice."
{else}
"Welcome back, friend!"
{/}

+ [Compliment her] {do $relationships.alice.affinity = $relationships.alice.affinity + 10} -> AliceHappy
+ [Ask for help] {$relationships.alice.affinity >= 20} -> AliceHelps
+ [Leave] -> Town

:: AliceHappy
Alice smiles warmly.
{$relationships.alice.affinity >= 50}
"You're so kind! We should be friends."
{/}
+ [Continue] -> Town
```

## Try It Yourself

Create a system with:

1. **An inventory** with at least 5 different items
2. **Character stats** in a map structure
3. **A shop** that uses loops to display items
4. **Quest tracking** with multiple objectives

## Next Steps

Learn about functions and reusable code:

[Functions →](./03-functions)
