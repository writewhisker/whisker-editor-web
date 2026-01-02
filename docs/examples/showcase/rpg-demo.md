# RPG Demo

A complete mini-RPG with classes and progression.

## Code

```whisker
@title: Heroes of Whisker
@author: Whisker Examples

:: Start
{do $player = {}}

**HEROES OF WHISKER**

*A Mini RPG Demo*

+ [New Game] -> CharacterCreation

:: CharacterCreation
**Create Your Hero**

Choose your class:

+ [Warrior - High HP, Strong Attack] -> ClassWarrior
+ [Mage - Magic Power, Low HP] -> ClassMage
+ [Rogue - Fast, Critical Hits] -> ClassRogue

:: ClassWarrior
{do $player = {
  name: "Warrior",
  class: "Warrior",
  level: 1,
  exp: 0,
  expNeeded: 100,
  hp: 120,
  maxHp: 120,
  mp: 20,
  maxMp: 20,
  attack: 15,
  defense: 10,
  magic: 5,
  gold: 50,
  potions: 3,
  weapon: "Iron Sword",
  kills: 0
}}

You are a **Warrior**!
Strong in combat, tough to defeat.

+ [Begin Adventure] -> Town

:: ClassMage
{do $player = {
  name: "Mage",
  class: "Mage",
  level: 1,
  exp: 0,
  expNeeded: 100,
  hp: 60,
  maxHp: 60,
  mp: 100,
  maxMp: 100,
  attack: 5,
  defense: 3,
  magic: 20,
  gold: 50,
  potions: 3,
  weapon: "Wooden Staff",
  kills: 0
}}

You are a **Mage**!
Master of arcane arts.

+ [Begin Adventure] -> Town

:: ClassRogue
{do $player = {
  name: "Rogue",
  class: "Rogue",
  level: 1,
  exp: 0,
  expNeeded: 100,
  hp: 80,
  maxHp: 80,
  mp: 40,
  maxMp: 40,
  attack: 12,
  defense: 5,
  magic: 8,
  gold: 75,
  potions: 3,
  weapon: "Dual Daggers",
  kills: 0
}}

You are a **Rogue**!
Swift and deadly.

+ [Begin Adventure] -> Town

:: Town
**Town of Whiskerdale**

Level $player.level $player.class
HP: $player.hp/$player.maxHp | MP: $player.mp/$player.maxMp
Gold: $player.gold | Potions: $player.potions

+ [Enter the Dungeon] -> DungeonEntrance
+ [Visit the Shop] -> Shop
+ [Rest at the Inn (20g)] {$player.gold >= 20} -> Inn
+ [View Stats] -> Stats

:: Stats
**$player.name the $player.class**

| Stat | Value |
|------|-------|
| Level | $player.level |
| EXP | $player.exp / $player.expNeeded |
| HP | $player.hp / $player.maxHp |
| MP | $player.mp / $player.maxMp |
| Attack | $player.attack |
| Defense | $player.defense |
| Magic | $player.magic |
| Weapon | $player.weapon |
| Monsters Slain | $player.kills |

+ [Back] -> Town

:: Shop
**Whiskerdale Shop**

Gold: $player.gold

+ [Buy Potion (25g)] {$player.gold >= 25} -> BuyPotion
+ [Upgrade Weapon (100g)] {$player.gold >= 100} -> UpgradeWeapon
+ [Leave] -> Town

:: BuyPotion
{do $player.gold = $player.gold - 25}
{do $player.potions = $player.potions + 1}
You bought a potion!
-> Shop

:: UpgradeWeapon
{do $player.gold = $player.gold - 100}
{do $player.attack = $player.attack + 5}
{$player.class == "Warrior"}
{do $player.weapon = "Steel Sword"}
{elif $player.class == "Mage"}
{do $player.weapon = "Crystal Staff"}
{else}
{do $player.weapon = "Shadow Blades"}
{/}
Your weapon has been upgraded!
-> Shop

:: Inn
{do $player.gold = $player.gold - 20}
{do $player.hp = $player.maxHp}
{do $player.mp = $player.maxMp}
You rest and fully recover!
-> Town

:: DungeonEntrance
**The Dark Dungeon**

{do $dungeonLevel = 1}

Monsters lurk in the darkness ahead.

+ [Enter] -> DungeonExplore
+ [Return to town] -> Town

:: DungeonExplore
{do $encounter = random(1, 10)}

{$encounter <= 6}
-> EnemyAppears
{elif $encounter <= 8}
-> TreasureFound
{else}
-> EmptyRoom
{/}

:: EnemyAppears
{do $enemies = ["Goblin", "Skeleton", "Slime", "Bat", "Orc"]}
{do $enemy = {
  name: $enemies[random(0, #$enemies - 1)],
  hp: 20 + ($dungeonLevel * 10),
  attack: 8 + ($dungeonLevel * 3),
  exp: 20 + ($dungeonLevel * 10),
  gold: random(10, 20) * $dungeonLevel
}}
{do $enemy.maxHp = $enemy.hp}

A **$enemy.name** appears!

-> Battle

:: Battle
**BATTLE**

$player.class HP: $player.hp/$player.maxHp | MP: $player.mp
$enemy.name HP: $enemy.hp/$enemy.maxHp

+ [Attack] -> PlayerAttack
+ [Magic] {$player.mp >= 20} -> PlayerMagic
+ [Use Potion] {$player.potions > 0} -> UsePotion
+ [Flee] -> FleeAttempt

:: PlayerAttack
{do $crit = random(1, 10)}
{do $damage = $player.attack + random(-2, 5)}

{$player.class == "Rogue" and $crit >= 8}
{do $damage = $damage * 2}
**CRITICAL HIT!**
{/}

{do $enemy.hp = $enemy.hp - $damage}
You deal **$damage** damage!

{$enemy.hp <= 0}
-> Victory
{else}
-> EnemyTurn
{/}

:: PlayerMagic
{do $player.mp = $player.mp - 20}

{$player.class == "Mage"}
{do $damage = $player.magic * 3}
{else}
{do $damage = $player.magic * 2}
{/}

{do $enemy.hp = $enemy.hp - $damage}
You cast a spell for **$damage** damage!

{$enemy.hp <= 0}
-> Victory
{else}
-> EnemyTurn
{/}

:: UsePotion
{do $player.potions = $player.potions - 1}
{do $heal = 40}
{do $player.hp = min($player.hp + $heal, $player.maxHp)}
You heal for $heal HP!
-> EnemyTurn

:: EnemyTurn
{do $damage = max(1, $enemy.attack - $player.defense + random(-2, 2))}
{do $player.hp = $player.hp - $damage}

The $enemy.name attacks for **$damage** damage!

{$player.hp <= 0}
-> Defeat
{else}
-> Battle
{/}

:: FleeAttempt
{do $escape = random(1, 10)}
{$player.class == "Rogue"}
{do $escape = $escape + 3}
{/}

{$escape >= 5}
You escaped!
-> DungeonOptions
{else}
You couldn't escape!
-> EnemyTurn
{/}

:: Victory
**Victory!**

{do $player.kills = $player.kills + 1}
{do $player.exp = $player.exp + $enemy.exp}
{do $player.gold = $player.gold + $enemy.gold}

Gained $enemy.exp EXP and $enemy.gold gold!

{$player.exp >= $player.expNeeded}
-> LevelUp
{else}
-> DungeonOptions
{/}

:: LevelUp
**LEVEL UP!**

{do $player.level = $player.level + 1}
{do $player.exp = $player.exp - $player.expNeeded}
{do $player.expNeeded = floor($player.expNeeded * 1.5)}

{$player.class == "Warrior"}
{do $player.maxHp = $player.maxHp + 15}
{do $player.attack = $player.attack + 3}
{do $player.defense = $player.defense + 2}
{elif $player.class == "Mage"}
{do $player.maxHp = $player.maxHp + 5}
{do $player.maxMp = $player.maxMp + 20}
{do $player.magic = $player.magic + 5}
{else}
{do $player.maxHp = $player.maxHp + 10}
{do $player.attack = $player.attack + 2}
{do $player.maxMp = $player.maxMp + 10}
{/}

{do $player.hp = $player.maxHp}
{do $player.mp = $player.maxMp}

You are now level **$player.level**!

-> DungeonOptions

:: TreasureFound
{do $goldFound = random(20, 50) * $dungeonLevel}
{do $player.gold = $player.gold + $goldFound}

You found a treasure chest with **$goldFound gold**!

-> DungeonOptions

:: EmptyRoom
An empty room. You catch your breath.
{do $player.hp = min($player.hp + 5, $player.maxHp)}
Recovered 5 HP.

-> DungeonOptions

:: DungeonOptions
+ [Go deeper] {do $dungeonLevel = $dungeonLevel + 1} -> DungeonExplore
+ [Return to town] -> Town

:: Defeat
**DEFEAT**

You have fallen in battle...

Final Stats:
- Level: $player.level
- Monsters Slain: $player.kills
- Gold Earned: $player.gold

+ [Try Again] -> Start
```

## What This Shows

- Character class selection
- RPG stat system
- Combat with multiple options
- Level-up with class-specific growth
- Shop and inventory
- Random encounters
- Dungeon exploration
