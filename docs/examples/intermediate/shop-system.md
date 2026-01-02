# Shop System

A complete buying and selling shop.

## Code

```whisker
@title: The Trading Post

:: Start
{do $gold = 100}
{do $inventory = []}
{do $shopStock = [
  { name: "Iron Sword", price: 50, type: "weapon" },
  { name: "Steel Shield", price: 40, type: "armor" },
  { name: "Health Potion", price: 20, type: "consumable" },
  { name: "Mana Potion", price: 25, type: "consumable" },
  { name: "Leather Boots", price: 30, type: "armor" }
]}

**Welcome to the Trading Post!**

-> ShopMain

:: ShopMain
**Trading Post**
Your Gold: $gold
Your Items: {#$inventory}

+ [Buy items] -> BuyMenu
+ [Sell items] {#$inventory > 0} -> SellMenu
+ [View inventory] -> ViewInventory
+ [Leave shop] -> Leave

:: BuyMenu
**Items for Sale:**

{for $item in $shopStock}
+ [Buy $item.name ($item.price g)] {$gold >= $item.price} -> BuyItem.$item.name
{/for}

+ [Back] -> ShopMain

:: BuyItem.Iron Sword
{do $gold = $gold - 50}
{do $inventory.push("Iron Sword")}
You purchased an Iron Sword!
-> BuyMenu

:: BuyItem.Steel Shield
{do $gold = $gold - 40}
{do $inventory.push("Steel Shield")}
You purchased a Steel Shield!
-> BuyMenu

:: BuyItem.Health Potion
{do $gold = $gold - 20}
{do $inventory.push("Health Potion")}
You purchased a Health Potion!
-> BuyMenu

:: BuyItem.Mana Potion
{do $gold = $gold - 25}
{do $inventory.push("Mana Potion")}
You purchased a Mana Potion!
-> BuyMenu

:: BuyItem.Leather Boots
{do $gold = $gold - 30}
{do $inventory.push("Leather Boots")}
You purchased Leather Boots!
-> BuyMenu

:: SellMenu
**Your Items (Sell for 50% value):**

{for $item, $idx in $inventory}
+ [Sell $item] {do $inventory.splice($idx, 1)} {do $gold = $gold + 15} -> SellConfirm
{/for}

+ [Back] -> ShopMain

:: SellConfirm
You sold an item for 15 gold!
-> SellMenu

:: ViewInventory
**Your Inventory:**

{#$inventory > 0}
{for $item, $idx in $inventory}
{$idx + 1}. $item
{/for}
{else}
Empty!
{/}

Gold: $gold

+ [Back] -> ShopMain

:: Leave
Thanks for visiting the Trading Post!
-> END
```

## What This Shows

- Structured shop inventory with objects
- Buy/sell mechanics with gold tracking
- Dynamic menu generation from arrays
- Item removal on sale
- Conditional menu options based on gold/inventory
