# Advanced Flow Control

Master gathers, tunnels, and sophisticated branching patterns.

## What You'll Learn

- Using gather points to reconverge branches
- Creating tunnels for reusable passages
- Once-only content
- Inline conditionals

## Prerequisites

- Completed [Beginner Tutorials](/tutorials/beginner/)

## Gather Points

Gather points collect divergent paths back together. Use `-` to mark a gather:

```whisker
:: Conversation
"What would you like to discuss?" asks the wizard.

+ [Ask about magic]
  "Magic is the fabric of reality," he explains.
+ [Ask about dragons]
  "Dragons? They're extinct... probably."
+ [Ask about treasure]
  "Seeking riches, are you? Dangerous business."

-
"Anyway, I have work to do."
+ [Leave] -> Exit
```

All three choices lead to the gather point, then continue to "Anyway..."

### Nested Gathers

Use multiple `-` for nested levels:

```whisker
:: DeepConversation
"Let's discuss your quest."

+ [Ask about the quest]
  "You must retrieve the Orb of Power."
  ++ [Where is it?]
     "In the Dark Tower, to the north."
  ++ [Why me?]
     "You are the chosen one."
  --
  "Any other questions?"
  ++ [No, I'm ready]
     Good luck, hero.
+ [Ask about supplies]
  "Visit the shop before you leave."

-
"Safe travels!"
+ [Depart] -> WorldMap
```

### Gather with Labels

Name gathers to target them directly:

```whisker
:: Shop
"Welcome to my shop!"

+ [Buy sword] -> PurchaseSword
+ [Buy armor] -> PurchaseArmor
+ [Just looking] -> JustLooking

- (browsing)
"Anything else?"
+ [Continue shopping] -> browsing
+ [Leave] -> Exit

:: PurchaseSword
{do $gold = $gold - 50}
"A fine blade!"
-> browsing

:: PurchaseArmor
{do $gold = $gold - 75}
"Protection is wise!"
-> browsing

:: JustLooking
"Take your time."
-> browsing
```

## Tunnels

Tunnels let you call a passage and automatically return. Use `->->` to return from a tunnel:

```whisker
:: MainStory
You're walking through the forest.

-> Description ->

The path continues ahead.
+ [Keep walking] -> NextScene

:: Description
The trees tower above you, their leaves filtering
the sunlight into dancing patterns on the ground.
Birds sing in the distance.
->->
```

### Calling Tunnels

Use `-> PassageName ->` to call a tunnel:

```whisker
:: Battle
You face the dragon!

-> BattleIntro ->

{$health > 0}
You survived the battle!
{else}
Game over...
{/}

:: BattleIntro
The dragon roars, flames licking at its jaws.
Your sword feels heavy in your hand.
->->
```

### Chained Tunnels

Tunnels can call other tunnels:

```whisker
:: Scene
The adventure begins.

-> SetupScene ->

"Ready for action!"

:: SetupScene
-> DescribeLocation ->
-> DescribeCharacters ->
->->

:: DescribeLocation
You're in a grand hall.
->->

:: DescribeCharacters
Three figures await you.
->->
```

## Once-Only Content

Show content only once per playthrough:

```whisker
:: EnterRoom
You enter the dusty library.

{once}
The door creaks loudly as it swings open.
You cough from the disturbed dust.
{/}

Books line every wall from floor to ceiling.
```

### Once-Only Choices

Choices that disappear after being selected:

```whisker
:: TreasureRoom
A room full of treasures!

+ {once} [Take the golden crown] {do $hasCrown = true} -> TreasureRoom
+ {once} [Take the silver chalice] {do $hasChalice = true} -> TreasureRoom
+ {once} [Take the ancient tome] {do $hasTome = true} -> TreasureRoom
+ [Leave with your loot] -> Exit
```

## Inline Conditionals

Short-form conditionals for concise writing:

```whisker
:: Status
Your inventory: {$hasSword ? "sword, " : ""}{$hasShield ? "shield, " : ""}nothing special.

You feel {$health > 75 ? "great" : $health > 25 ? "okay" : "terrible"}.
```

### Conditional Text Spans

```whisker
:: Greeting
"Hello{$hasMetBefore ? " again" : ""}, traveler!"

You see {$isDark ? "shadows moving in the darkness" : "a peaceful meadow"}.
```

## Combining Techniques

Here's a complex example using multiple techniques:

```whisker
:: Tavern
{do $visitCount = ($visitCount ?? 0) + 1}

{once}
You push open the heavy oak door and step into the tavern.
The warmth and noise wash over you.
{/}

-> TavernDescription ->

{$visitCount > 1}
The barkeep nods in recognition.
{else}
The barkeep looks you over.
{/}

+ [Order a drink] -> OrderDrink ->
+ [Talk to the stranger] {once} -> MysteriousStranger
+ [Check the notice board] -> NoticeBoard ->
+ [Leave] -> Town

:: TavernDescription
The fire crackles in the hearth.
{$isEvening ? "Patrons crowd every table." : "The tavern is nearly empty."}
->->

:: OrderDrink
{$gold >= 5}
{do $gold = $gold - 5}
The ale is cold and refreshing.
{else}
"You can't afford that," the barkeep says.
{/}
->->

:: MysteriousStranger
A cloaked figure beckons you closer.
"I have a job for you, if you're interested."
{do $hasQuest = true}
-> Tavern

:: NoticeBoard
You scan the posted notices.
{not $hasSeenNotice}
{do $hasSeenNotice = true}
One catches your eye: "HELP WANTED - Dangerous work, good pay."
{/}
->->
```

## Best Practices

1. **Use gathers for natural convergence** - When branches should rejoin
2. **Use tunnels for descriptions** - Keep atmospheric text reusable
3. **Use once-only sparingly** - Too much makes replay boring
4. **Combine techniques naturally** - Don't over-engineer

## Try It Yourself

Create a scene with:

1. **Multiple choice branches** that converge with a gather
2. **A tunnel** for reusable description text
3. **Once-only content** for first-visit flavor
4. **Inline conditionals** for dynamic text

## Next Steps

Learn about data structures:

[Data Structures →](./02-data-structures)
