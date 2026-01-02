# Combat System

A turn-based battle system.

## Code

```whisker
@title: Battle Arena

:: Start
{do $player = {
  name: "Hero",
  hp: 100,
  maxHp: 100,
  atk: 15,
  def: 5,
  potions: 3
}}

{do $enemies = [
  { name: "Goblin", hp: 30, maxHp: 30, atk: 8, def: 2 },
  { name: "Orc", hp: 60, maxHp: 60, atk: 12, def: 5 },
  { name: "Dragon", hp: 150, maxHp: 150, atk: 25, def: 10 }
]}

{do $currentEnemy = 0}

**Welcome to the Battle Arena!**

+ [Begin battle] -> PrepareBattle

:: PrepareBattle
{do $enemy = $enemies[$currentEnemy]}
{do $enemy.hp = $enemy.maxHp}

A **$enemy.name** appears!

-> Battle

:: Battle
**--- Battle ---**

**$player.name**: $player.hp / $player.maxHp HP
**$enemy.name**: $enemy.hp / $enemy.maxHp HP

+ [Attack] -> PlayerAttack
+ [Defend] -> PlayerDefend
+ [Use Potion] {$player.potions > 0} -> UsePotion
+ [Flee] -> Flee

:: PlayerAttack
{do $damage = max(1, $player.atk - $enemy.def + random(-3, 3))}
{do $enemy.hp = $enemy.hp - $damage}

You strike the $enemy.name for **$damage damage**!

{$enemy.hp <= 0}
-> Victory
{else}
-> EnemyTurn
{/}

:: PlayerDefend
{do $player.defending = true}
You raise your guard!
-> EnemyTurn

:: UsePotion
{do $player.potions = $player.potions - 1}
{do $heal = 30}
{do $player.hp = min($player.hp + $heal, $player.maxHp)}

You drink a potion and recover **$heal HP**!
Potions remaining: $player.potions

-> EnemyTurn

:: EnemyTurn
{do $baseDamage = max(1, $enemy.atk - $player.def + random(-2, 2))}

{$player.defending}
{do $damage = floor($baseDamage / 2)}
{do $player.defending = false}
{else}
{do $damage = $baseDamage}
{/}

{do $player.hp = $player.hp - $damage}

The $enemy.name attacks for **$damage damage**!

{$player.hp <= 0}
-> Defeat
{else}
-> Battle
{/}

:: Victory
**Victory!**

You defeated the $enemy.name!

{do $currentEnemy = $currentEnemy + 1}

{$currentEnemy >= #$enemies}
-> FinalVictory
{else}
{do $nextEnemy = $enemies[$currentEnemy]}
A **$nextEnemy.name** approaches!
+ [Continue fighting] -> PrepareBattle
+ [Rest first] -> Rest
{/}

:: Rest
{do $player.hp = min($player.hp + 30, $player.maxHp)}
You rest and recover 30 HP.
+ [Continue] -> PrepareBattle

:: Defeat
**Defeat!**

The $enemy.name was too powerful...

+ [Try again] -> Start

:: FinalVictory
**CHAMPION!**

You've defeated all enemies in the arena!

Your legendary tale will be told for generations.

+ [Play again] -> Start
+ [Exit] -> END

:: Flee
You flee from battle!
*Cowardice has its own rewards...*
-> END
```

## What This Shows

- Complex combat mechanics
- Turn-based battle loop
- Damage calculation with variance
- Defend mechanic reducing damage
- Item usage in combat
- Multiple enemy progression
- Victory and defeat conditions
