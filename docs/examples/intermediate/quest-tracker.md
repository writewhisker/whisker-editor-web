# Quest Tracker

Track multiple quests and objectives.

## Code

```whisker
@title: Quest Journal

:: Start
{do $quests = {
  main: {
    name: "Save the Village",
    active: true,
    complete: false,
    objectives: [
      { text: "Talk to the elder", done: false },
      { text: "Find the stolen artifact", done: false },
      { text: "Defeat the bandits", done: false }
    ]
  },
  side1: {
    name: "Collect Herbs",
    active: false,
    complete: false,
    objectives: [
      { text: "Gather 5 healing herbs", done: false }
    ]
  }
}}
{do $herbs = 0}

-> Village

:: Village
**The Village**

+ [Talk to the village elder] -> TalkElder
+ [Visit the forest] -> Forest
+ [Check quest journal] -> Journal
+ [Bandit camp] {$quests.main.objectives[1].done} -> BanditCamp

:: TalkElder
{not $quests.main.objectives[0].done}
"Please, you must help us! Bandits stole our sacred artifact!"
"Find it and defeat them!"
{do $quests.main.objectives[0].done = true}
**Quest Updated: Talk to the elder ✓**
{else}
"Have you found the artifact yet?"

{$quests.main.complete}
"Thank you, hero! You've saved us all!"
{/}
{/}

+ [Ask about herb collecting] {not $quests.side1.active} -> StartHerbQuest
+ [Back] -> Village

:: StartHerbQuest
"If you could gather 5 healing herbs from the forest, I'd be grateful."
{do $quests.side1.active = true}
**New Quest: Collect Herbs**
+ [Back] -> Village

:: Forest
**The Forest**

+ [Search for herbs] {$quests.side1.active and not $quests.side1.complete} -> SearchHerbs
+ [Search for clues] {not $quests.main.objectives[1].done} -> SearchClues
+ [Back to village] -> Village

:: SearchHerbs
{do $found = random(1, 3)}
{do $herbs = $herbs + $found}
You found $found herb(s)! Total: $herbs/5

{$herbs >= 5}
**Quest Complete: Collect Herbs ✓**
{do $quests.side1.complete = true}
{do $quests.side1.objectives[0].done = true}
{/}

+ [Continue] -> Forest

:: SearchClues
You find tracks leading to the bandit camp!
{do $quests.main.objectives[1].done = true}
**Quest Updated: Find the stolen artifact ✓**
+ [Continue] -> Forest

:: BanditCamp
**Bandit Camp**

You see the bandits guarding the artifact.

+ [Attack!] -> Fight
+ [Retreat] -> Village

:: Fight
You defeat the bandits and recover the artifact!
{do $quests.main.objectives[2].done = true}
{do $quests.main.complete = true}
**Quest Complete: Save the Village ✓**

+ [Return to village] -> Village

:: Journal
**Quest Journal**

{for $quest, $id in $quests}
{$quest.active}
---
**{$quest.name}** {$quest.complete ? "✓ COMPLETE" : ""}

{for $obj in $quest.objectives}
{$obj.done ? "[x]" : "[ ]"} $obj.text
{/for}
{/}
{/for}

+ [Back] -> Village
```

## What This Shows

- Nested quest structure with objectives
- Quest state tracking (active, complete)
- Objective checkbox display
- Quest progression unlocking new options
- Journal view with dynamic content
