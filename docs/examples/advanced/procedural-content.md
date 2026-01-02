# Procedural Content

Generate random content dynamically.

## Code

```whisker
@title: The Endless Dungeon

:: Start
{do $floor = 0}
{do $gold = 0}
{do $kills = 0}
{do $hp = 100}

{do $adjectives = ["Dark", "Haunted", "Ancient", "Frozen", "Burning", "Cursed"]}
{do $roomTypes = ["Chamber", "Corridor", "Hall", "Cavern", "Crypt", "Vault"]}
{do $enemies = ["Skeleton", "Ghost", "Spider", "Goblin", "Zombie", "Rat Swarm"]}
{do $treasures = ["gold coins", "a gem", "an ancient artifact", "silver bars"]}

**Welcome to the Endless Dungeon!**

See how deep you can go.

+ [Enter the dungeon] -> GenerateFloor

:: GenerateFloor
{do $floor = $floor + 1}
{do $adj = $adjectives[random(0, #$adjectives - 1)]}
{do $room = $roomTypes[random(0, #$roomTypes - 1)]}
{do $roomName = $adj + " " + $room}

-> EnterRoom

:: EnterRoom
**Floor $floor: The $roomName**

HP: $hp | Gold: $gold | Kills: $kills

{do $event = random(1, 10)}

{$event <= 4}
-> EnemyEncounter
{elif $event <= 7}
-> TreasureRoom
{elif $event == 8}
-> TrapRoom
{elif $event == 9}
-> HealingFountain
{else}
-> EmptyRoom
{/}

:: EnemyEncounter
{do $enemyType = $enemies[random(0, #$enemies - 1)]}
{do $enemyHp = 10 + ($floor * 5)}
{do $enemyDmg = 5 + floor($floor * 1.5)}

A **$enemyType** blocks your path!

+ [Fight!] -> FightEnemy
+ [Try to flee] -> FleeAttempt

:: FightEnemy
{do $damage = random(15, 25)}
{do $enemyHp = $enemyHp - $damage}

You strike for $damage damage!

{$enemyHp <= 0}
You defeated the $enemyType!
{do $kills = $kills + 1}
{do $goldFound = random(5, 15) * $floor}
{do $gold = $gold + $goldFound}
Found $goldFound gold!
+ [Continue] -> RoomOptions
{else}
{do $taken = $enemyDmg + random(-2, 2)}
{do $hp = $hp - $taken}
The enemy hits back for $taken damage!

{$hp <= 0}
-> Death
{else}
+ [Attack again] -> FightEnemy
+ [Try to flee] -> FleeAttempt
{/}
{/}

:: FleeAttempt
{do $escape = random(1, 10)}
{$escape > 4}
You escape!
+ [Continue] -> RoomOptions
{else}
You can't escape!
{do $taken = 10 + ($floor * 2)}
{do $hp = $hp - $taken}
Took $taken damage fleeing!
{$hp <= 0}
-> Death
{else}
+ [Fight!] -> FightEnemy
{/}
{/}

:: TreasureRoom
{do $treasureType = $treasures[random(0, #$treasures - 1)]}
{do $amount = random(10, 30) * $floor}

You found $treasureType worth **$amount gold**!
{do $gold = $gold + $amount}

+ [Continue] -> RoomOptions

:: TrapRoom
{do $trapDmg = 5 + ($floor * 3)}

**TRAP!**
You trigger a trap and take $trapDmg damage!
{do $hp = $hp - $trapDmg}

{$hp <= 0}
-> Death
{else}
+ [Continue] -> RoomOptions
{/}

:: HealingFountain
**A healing fountain!**
{do $heal = min(30, 100 - $hp)}
{do $hp = $hp + $heal}
You recover $heal HP.
HP is now: $hp

+ [Continue] -> RoomOptions

:: EmptyRoom
The room is empty. You rest briefly.
{do $hp = min($hp + 5, 100)}
Recovered 5 HP.

+ [Continue] -> RoomOptions

:: RoomOptions
+ [Go deeper] -> GenerateFloor
+ [Leave dungeon] -> Escape

:: Death
**YOU DIED**

Floor reached: $floor
Gold collected: $gold
Enemies slain: $kills

+ [Try again] -> Start

:: Escape
**Escaped with your life!**

Final Stats:
- Deepest floor: $floor
- Gold collected: $gold
- Enemies slain: $kills

+ [Play again] -> Start
+ [Quit] -> END
```

## What This Shows

- Random room name generation
- Procedural event system
- Scaling difficulty by floor
- Random enemy selection
- Multiple outcome types
- Roguelike-style gameplay
