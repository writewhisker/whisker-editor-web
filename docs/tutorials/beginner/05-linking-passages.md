# Linking Passages

Create complex story structures with multiple passages.

## What You'll Learn

- Organizing passages effectively
- Creating reusable passages
- Designing story flow

## Prerequisites

- Completed [Conditional Content](./04-conditional-content)

## Story Structure Basics

A well-organized story has:

1. **Clear flow** - readers know where they can go
2. **Meaningful branches** - choices matter
3. **Satisfying endings** - stories reach conclusions

## Passage Organization

### Hub Structure

A central passage that players return to:

```whisker
:: Town
Welcome to Riverdale!

+ [Visit the blacksmith] -> Blacksmith
+ [Go to the tavern] -> Tavern
+ [Explore the forest] -> Forest
+ [Check inventory] -> Inventory

:: Blacksmith
"Need a weapon sharpened?"
+ [Return to town] -> Town

:: Tavern
The tavern is warm and lively.
+ [Return to town] -> Town

:: Forest
The dark forest awaits.
+ [Return to town] -> Town
```

### Linear with Branches

A main path with optional detours:

```whisker
:: Chapter1
The adventure begins...
+ [Continue] -> Chapter1_Optional

:: Chapter1_Optional
You see a side path.
+ [Explore the side path] -> SidePath1
+ [Stay on the main road] -> Chapter2

:: SidePath1
You found a hidden treasure!
{do $gold = $gold + 50}
+ [Return to road] -> Chapter2

:: Chapter2
The story continues...
```

### Web Structure

Multiple interconnected paths:

```whisker
:: Crossroads
Four paths stretch before you.

+ [North - Mountains] -> Mountains
+ [South - Valley] -> Valley
+ [East - Ocean] -> Ocean
+ [West - Desert] -> Desert

:: Mountains
From here you can see the valley and desert.
+ [Descend to valley] -> Valley
+ [Travel to desert] -> Desert
+ [Return to crossroads] -> Crossroads

:: Valley
A peaceful valley with paths to mountains and ocean.
+ [Climb to mountains] -> Mountains
+ [Head to ocean] -> Ocean
+ [Return to crossroads] -> Crossroads
```

## Designing Flow

### Entry Points

Every story starts at `Start`, but you can redirect:

```whisker
:: Start
{$hasPlayedBefore}
Welcome back, $playerName!
+ [Continue adventure] -> SavedGame
{else}
New adventure?
+ [Begin] -> NewGame
{/}
```

### Multiple Endings

Create different endings based on player choices:

```whisker
:: Finale
{$karma >= 10}
+ [Good ending] -> GoodEnding
{/}
{$karma <= -10}
+ [Bad ending] -> BadEnding
{/}
+ [Neutral ending] -> NeutralEnding

:: GoodEnding
You saved the kingdom and became a hero!
-> END

:: BadEnding
Your choices led to ruin...
-> END

:: NeutralEnding
Life goes on, neither better nor worse.
-> END
```

### Returning to Earlier Passages

Use `BACK` for simple returns:

```whisker
:: Shop
Browse our wares!
+ [Look at swords] -> Swords
+ [Look at armor] -> Armor
+ [Leave] -> Town

:: Swords
Fine blades available here.
+ [Go back] -> BACK
```

## Tags for Organization

Use tags to categorize passages:

```whisker
:: MainQuest1 [quest main]
The king needs your help!

:: SideQuest1 [quest side]
Help the farmer find his lost cow.

:: ShopWeapons [location shop]
The weapon shop.

:: ShopArmor [location shop]
The armor shop.
```

Tags help you:
- Find related passages quickly
- Apply styling to categories
- Filter passages in the editor

## Complete Example: Mini RPG

```whisker
:: Start
{do $health = 100}
{do $gold = 50}
{do $questComplete = false}
{do $hasSword = false}

Welcome to the village of Oakhollow!

+ [Enter village] -> Village

:: Village [location main]
The village square bustles with activity.
Health: $health | Gold: $gold

+ [Visit the shop] -> Shop
+ [Talk to the elder] -> Elder
+ [Rest at the inn (10 gold)] {$gold >= 10} {do $gold = $gold - 10} {do $health = 100} -> Village
+ [Leave village] -> WorldMap

:: Shop [location shop]
"Welcome, traveler!"

+ [Buy sword (30 gold)] {$gold >= 30 and not $hasSword} {do $gold = $gold - 30} {do $hasSword = true} -> Shop
+ [Sell loot (if any)] {$hasLoot} {do $gold = $gold + 20} {do $hasLoot = false} -> Shop
+ [Return to village] -> Village

:: Elder [character npc]
The village elder looks worried.

{$questComplete}
"Thank you for saving us!"
{do $gold = $gold + 100}
You receive 100 gold!
+ [You're welcome] -> Village
{else}
"Monsters threaten our village. Will you help?"
+ [Accept quest] {do $onQuest = true} -> Village
+ [Not now] -> Village
{/}

:: WorldMap [location]
You stand outside the village.

+ [Return to village] -> Village
+ [Enter the forest] {$onQuest} -> Forest
+ [Climb the mountain] -> Mountain

:: Forest [location danger]
Dark trees surround you.
A monster appears!

{$hasSword}
+ [Fight with sword] -> Combat_Easy
{else}
+ [Fight with fists] -> Combat_Hard
{/}
+ [Run away!] -> Village

:: Combat_Easy
Your sword strikes true!
{do $hasLoot = true}
{do $questComplete = true}

Victory! The monster is defeated.

+ [Return to village] -> Village

:: Combat_Hard
Without a weapon, you struggle.
{do $health = $health - 50}

{$health <= 0}
You have fallen in battle...
+ [Game Over] -> END
{else}
You barely survive!
{do $hasLoot = true}
{do $questComplete = true}
+ [Limp back to village] -> Village
{/}

:: Mountain [location]
The view from here is breathtaking.
You can see the entire valley below.

{$questComplete}
With the monster defeated, peace has returned.
+ [Enjoy the view] -> END
{else}
Dark smoke rises from the forest.
+ [Descend] -> WorldMap
{/}
```

## Tips for Good Structure

1. **Plan before writing** - Sketch your story flow
2. **Use descriptive names** - `ForestClearing` not `P17`
3. **Test all paths** - Make sure every choice works
4. **Add return options** - Don't strand readers

## What's Next?

Congratulations! You've completed the beginner tutorials!

You now know how to:
- Create passages and write content
- Add interactive choices
- Use variables to track state
- Show conditional content
- Organize complex stories

Ready for more? Continue to the [Intermediate Tutorials](/tutorials/intermediate/) to learn:
- Advanced flow control (gathers and tunnels)
- Data structures (arrays and maps)
- Functions and reusable code
- Styling and media
