# Inventory System

A complete item management system.

## Code

```whisker
@title: Inventory Adventure

:: Start
{do $inventory = []}
{do $gold = 50}

**Adventure Inventory**

Gold: $gold
Items: {#$inventory}

+ [Explore the dungeon] -> Dungeon
+ [Visit the shop] -> Shop
+ [Check inventory] -> ViewInventory

:: Dungeon
You venture into the dark dungeon.

{do $find = random(1, 4)}

{$find == 1}
You found a **rusty sword**!
{do $inventory.push("rusty sword")}
{elif $find == 2}
You found a **health potion**!
{do $inventory.push("health potion")}
{elif $find == 3}
You found **10 gold**!
{do $gold = $gold + 10}
{else}
You found nothing but cobwebs.
{/}

+ [Search again] -> Dungeon
+ [Go back] -> Start

:: Shop
**Welcome to the Shop!**

Gold: $gold

+ [Buy sword (30g)] {$gold >= 30} -> BuySword
+ [Buy shield (25g)] {$gold >= 25} -> BuyShield
+ [Buy potion (15g)] {$gold >= 15} -> BuyPotion
+ [Sell an item] {#$inventory > 0} -> SellMenu
+ [Leave] -> Start

:: BuySword
{do $gold = $gold - 30}
{do $inventory.push("steel sword")}
You bought a steel sword!
-> Shop

:: BuyShield
{do $gold = $gold - 25}
{do $inventory.push("wooden shield")}
You bought a wooden shield!
-> Shop

:: BuyPotion
{do $gold = $gold - 15}
{do $inventory.push("health potion")}
You bought a health potion!
-> Shop

:: SellMenu
**Select item to sell:**

{for $item, $idx in $inventory}
+ [Sell $item (10g)] {do $sold = $inventory.splice($idx, 1)} {do $gold = $gold + 10} -> SoldItem
{/for}

+ [Cancel] -> Shop

:: SoldItem
You sold an item for 10 gold!
-> Shop

:: ViewInventory
**Your Inventory**

Gold: $gold

{#$inventory > 0}
Items:
{for $item in $inventory}
- $item
{/for}
{else}
Your inventory is empty.
{/}

+ [Back] -> Start
```

## What This Shows

- Array-based inventory using `push()` and `splice()`
- Item counting with `#$array`
- Iterating with `{for ... in ...}`
- Conditional shop based on gold
- Dynamic menu generation from inventory
