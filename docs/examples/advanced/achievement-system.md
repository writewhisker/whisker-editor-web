# Achievement System

Track and display player accomplishments.

## Code

```whisker
@title: Achievement Hunter

:: Start
{do $achievements = {
  first_steps: { name: "First Steps", desc: "Start the game", unlocked: true },
  explorer: { name: "Explorer", desc: "Visit 5 locations", unlocked: false },
  rich: { name: "Getting Rich", desc: "Collect 100 gold", unlocked: false },
  warrior: { name: "Warrior", desc: "Win 3 battles", unlocked: false },
  collector: { name: "Collector", desc: "Collect 10 items", unlocked: false },
  legend: { name: "Legend", desc: "Unlock all achievements", unlocked: false }
}}

{do $stats = {
  locationsVisited: 1,
  gold: 0,
  battlesWon: 0,
  itemsCollected: 0
}}

**Achievement Hunter**

A demo of achievement tracking.

*🏆 Achievement Unlocked: First Steps!*

-> Hub

:: Hub
**Town Hub**

+ [Explore a location] -> Explore
+ [Fight an enemy] -> Battle
+ [Find treasure] -> Treasure
+ [View achievements] -> ViewAchievements
+ [Check stats] -> CheckStats

:: Explore
{do $stats.locationsVisited = $stats.locationsVisited + 1}

You explored a new area!
Locations visited: $stats.locationsVisited

-> CheckExplorerAchievement

:: CheckExplorerAchievement
{$stats.locationsVisited >= 5 and not $achievements.explorer.unlocked}
{do $achievements.explorer.unlocked = true}
*🏆 Achievement Unlocked: Explorer!*
{/}

-> CheckLegend

:: Battle
{do $win = random(1, 2)}
{$win == 1}
You won the battle!
{do $stats.battlesWon = $stats.battlesWon + 1}
Battles won: $stats.battlesWon
{else}
You fled from battle.
{/}

-> CheckWarriorAchievement

:: CheckWarriorAchievement
{$stats.battlesWon >= 3 and not $achievements.warrior.unlocked}
{do $achievements.warrior.unlocked = true}
*🏆 Achievement Unlocked: Warrior!*
{/}

-> CheckLegend

:: Treasure
{do $goldFound = random(10, 30)}
{do $stats.gold = $stats.gold + $goldFound}
{do $stats.itemsCollected = $stats.itemsCollected + 1}

You found $goldFound gold!
Total gold: $stats.gold
Items collected: $stats.itemsCollected

-> CheckTreasureAchievements

:: CheckTreasureAchievements
{$stats.gold >= 100 and not $achievements.rich.unlocked}
{do $achievements.rich.unlocked = true}
*🏆 Achievement Unlocked: Getting Rich!*
{/}

{$stats.itemsCollected >= 10 and not $achievements.collector.unlocked}
{do $achievements.collector.unlocked = true}
*🏆 Achievement Unlocked: Collector!*
{/}

-> CheckLegend

:: CheckLegend
{do $unlockedCount = 0}
{for $ach, $id in $achievements}
{$ach.unlocked and $id != "legend"}
{do $unlockedCount = $unlockedCount + 1}
{/}
{/for}

{$unlockedCount >= 5 and not $achievements.legend.unlocked}
{do $achievements.legend.unlocked = true}
*🏆 Achievement Unlocked: LEGEND!*
You've unlocked all achievements!
{/}

-> Hub

:: ViewAchievements
**🏆 Achievements**

{for $ach, $id in $achievements}
{$ach.unlocked}
✅ **$ach.name**: $ach.desc
{else}
🔒 **$ach.name**: ???
{/}
{/for}

+ [Back] -> Hub

:: CheckStats
**Your Stats**

- Locations Visited: $stats.locationsVisited
- Gold Collected: $stats.gold
- Battles Won: $stats.battlesWon
- Items Collected: $stats.itemsCollected

+ [Back] -> Hub
```

## What This Shows

- Achievement tracking with objects
- Multiple achievement conditions
- Progress-based unlocks
- Meta-achievement (unlock all)
- Hidden achievement descriptions
- Stats tracking for achievement conditions
