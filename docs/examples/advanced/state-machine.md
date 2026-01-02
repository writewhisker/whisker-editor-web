# State Machine

Implement game states with transitions.

## Code

```whisker
@title: The Adventurer

:: Start
{do $state = "town"}
{do $health = 100}
{do $gold = 50}
{do $items = []}
{do $questComplete = false}

-> StateRouter

:: StateRouter
{$state == "town"}
-> TownState
{elif $state == "shop"}
-> ShopState
{elif $state == "dungeon"}
-> DungeonState
{elif $state == "combat"}
-> CombatState
{elif $state == "rest"}
-> RestState
{elif $state == "victory"}
-> VictoryState
{elif $state == "defeat"}
-> DefeatState
{/}

:: TownState
**Town** | HP: $health | Gold: $gold

{$questComplete}
The townsfolk celebrate your victory!
+ [Celebrate!] {do $state = "victory"} -> StateRouter
{else}
The town is troubled by monsters in the dungeon.
+ [Enter the dungeon] {do $state = "dungeon"} -> StateRouter
+ [Visit the shop] {do $state = "shop"} -> StateRouter
+ [Rest at the inn (10g)] {$gold >= 10} {do $state = "rest"} {do $gold = $gold - 10} -> StateRouter
{/}

:: ShopState
**Shop** | Gold: $gold

+ [Buy Sword (30g)] {$gold >= 30 and not $items.includes("sword")} -> BuySword
+ [Buy Shield (25g)] {$gold >= 25 and not $items.includes("shield")} -> BuyShield
+ [Buy Potion (15g)] {$gold >= 15} -> BuyPotion
+ [Leave] {do $state = "town"} -> StateRouter

:: BuySword
{do $gold = $gold - 30}
{do $items.push("sword")}
You bought a sword! Attack +10
{do $state = "shop"}
-> StateRouter

:: BuyShield
{do $gold = $gold - 25}
{do $items.push("shield")}
You bought a shield! Defense +5
{do $state = "shop"}
-> StateRouter

:: BuyPotion
{do $gold = $gold - 15}
{do $items.push("potion")}
You bought a potion!
{do $state = "shop"}
-> StateRouter

:: RestState
**Inn**
You rest peacefully...
{do $health = 100}
{do $state = "town"}
-> StateRouter

:: DungeonState
**Dungeon** | HP: $health

{do $event = random(1, 4)}

{$event == 1}
You encounter a monster!
{do $state = "combat"}
{elif $event == 2}
You find 20 gold!
{do $gold = $gold + 20}
{elif $event == 3}
You discover the dungeon boss!
{do $state = "combat"}
{do $isBoss = true}
{else}
A safe passage.
{/}

{$state != "combat"}
+ [Go deeper] -> StateRouter
+ [Return to town] {do $state = "town"} -> StateRouter
{else}
-> StateRouter
{/}

:: CombatState
{do $baseAtk = 10}
{do $baseDef = 0}
{$items.includes("sword")}
{do $baseAtk = $baseAtk + 10}
{/}
{$items.includes("shield")}
{do $baseDef = $baseDef + 5}
{/}

{$isBoss ?? false}
**BOSS BATTLE!**
{do $enemyHp = 50}
{do $enemyAtk = 15}
{else}
**Combat!**
{do $enemyHp = random(15, 25)}
{do $enemyAtk = random(8, 12)}
{/}

-> CombatLoop

:: CombatLoop
HP: $health | Enemy HP: $enemyHp

+ [Attack] -> Attack
+ [Use Potion] {$items.includes("potion")} -> UsePotionCombat
+ [Flee] {not ($isBoss ?? false)} {do $state = "town"} {do $isBoss = false} -> StateRouter

:: Attack
{do $damage = $baseAtk + random(-2, 2)}
{do $enemyHp = $enemyHp - $damage}
You deal $damage damage!

{$enemyHp <= 0}
{$isBoss ?? false}
**Boss Defeated!**
{do $questComplete = true}
{do $isBoss = false}
{do $state = "town"}
{else}
Victory! +30 gold
{do $gold = $gold + 30}
{do $state = "dungeon"}
{/}
{else}
{do $taken = max(0, $enemyAtk - $baseDef + random(-2, 2))}
{do $health = $health - $taken}
Enemy deals $taken damage!

{$health <= 0}
{do $state = "defeat"}
{/}
{/}

-> StateRouter

:: UsePotionCombat
{do $idx = $items.indexOf("potion")}
{do $items.splice($idx, 1)}
{do $health = min(100, $health + 30)}
You heal 30 HP!
-> CombatLoop

:: VictoryState
**VICTORY!**

You've saved the town!
Final Gold: $gold

+ [Play again] -> Start

:: DefeatState
**DEFEAT**

You have fallen...

+ [Try again] -> Start
```

## What This Shows

- State machine pattern with router
- State transitions via variable
- Multiple interconnected states
- Combat as a sub-state
- Equipment affecting stats
- Boss encounter flag
