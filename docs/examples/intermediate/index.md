# Intermediate Examples

More complex patterns and techniques.

## Inventory System

Track items the player collects.

```whisker
{do $inventory = []}

:: Start
You have {#$inventory} items.

+ [Pick up key] {do $inventory.push("key")} -> Start
+ [Pick up sword] {do $inventory.push("sword")} -> Start
+ [Check inventory] -> ShowInventory
+ [Use door] -> Door

:: ShowInventory
Your items:
{for $item in $inventory}
- $item
{/for}
+ [Back] -> Start

:: Door
{$inventory.includes("key")}
You unlock the door with the key!
-> END
{else}
The door is locked. You need a key.
+ [Go back] -> Start
{/}
```

## Dialogue Tree

Create branching conversations.

```whisker
:: MeetNPC
"Hello, traveler!" says the merchant.
{do $npcMood = "neutral"}

+ [Greet politely] {do $npcMood = "happy"} -> NPCResponse
+ [Demand goods] {do $npcMood = "angry"} -> NPCResponse
+ [Ignore them] -> Leave

:: NPCResponse
{$npcMood == "happy"}
"What a pleasant visitor! Please, browse my wares."
+ [Browse shop] -> Shop
{elif $npcMood == "angry"}
"How rude! Get out of my shop!"
-> Leave
{/}

:: Shop
The merchant shows you their goods.
+ [Buy sword (10 gold)] -> BuySword
+ [Leave] -> Leave
```

## More Examples

See [Advanced Examples](/examples/advanced/) for complex game systems.
