# Character Stats

Manage character attributes and levels.

## Code

```whisker
@title: Hero Stats

:: Start
{do $player = {
  name: "Hero",
  level: 1,
  exp: 0,
  expNeeded: 100,
  health: 100,
  maxHealth: 100,
  strength: 10,
  defense: 5,
  gold: 50
}}

Welcome, $player.name!

-> MainMenu

:: MainMenu
**Level $player.level** | EXP: $player.exp/$player.expNeeded
Health: $player.health/$player.maxHealth
Strength: $player.strength | Defense: $player.defense
Gold: $player.gold

+ [Go adventuring] -> Adventure
+ [Rest at inn (10g)] {$player.gold >= 10} -> Rest
+ [Train (20g)] {$player.gold >= 20} -> Train
+ [View detailed stats] -> DetailedStats

:: Adventure
{do $encounter = random(1, 3)}

{$encounter == 1}
You found a treasure chest!
{do $player.gold = $player.gold + random(10, 30)}
{do $player.exp = $player.exp + 20}
{elif $encounter == 2}
You fought a goblin!
{do $damage = max(1, random(5, 15) - $player.defense)}
{do $player.health = $player.health - $damage}
{do $player.exp = $player.exp + 30}
You took $damage damage.
{else}
A peaceful journey. You found herbs worth 5 gold.
{do $player.gold = $player.gold + 5}
{do $player.exp = $player.exp + 10}
{/}

-> CheckLevelUp

:: CheckLevelUp
{$player.exp >= $player.expNeeded}
**LEVEL UP!**
{do $player.level = $player.level + 1}
{do $player.exp = $player.exp - $player.expNeeded}
{do $player.expNeeded = floor($player.expNeeded * 1.5)}
{do $player.maxHealth = $player.maxHealth + 10}
{do $player.health = $player.maxHealth}
{do $player.strength = $player.strength + 2}
{do $player.defense = $player.defense + 1}

You are now level $player.level!
{/}

{$player.health <= 0}
-> GameOver
{else}
-> MainMenu
{/}

:: Rest
{do $player.gold = $player.gold - 10}
{do $player.health = $player.maxHealth}
You rest at the inn and fully recover!
-> MainMenu

:: Train
{do $player.gold = $player.gold - 20}
{do $choice = random(1, 2)}

{$choice == 1}
Your strength training pays off!
{do $player.strength = $player.strength + 1}
{else}
Your defense training improves!
{do $player.defense = $player.defense + 1}
{/}

-> MainMenu

:: DetailedStats
**$player.name - Detailed Statistics**

| Stat | Value |
|------|-------|
| Level | $player.level |
| Experience | $player.exp / $player.expNeeded |
| Health | $player.health / $player.maxHealth |
| Strength | $player.strength |
| Defense | $player.defense |
| Gold | $player.gold |

+ [Back] -> MainMenu

:: GameOver
**Game Over**

$player.name has fallen in battle!

Final Level: $player.level

+ [Try again] -> Start
```

## What This Shows

- Character object with nested properties
- Level-up system with scaling experience
- Stat modification and calculations
- Health management and game over
- Table display for stats
