# Story Branching

Create diverging story paths.

## Code

```whisker
@title: The Forest Path

:: Start
You come to a fork in the forest path.
A wooden sign points to three destinations.

+ [Take the path to the Village] -> Village
+ [Take the path to the Castle] -> Castle
+ [Take the path to the Mountains] -> Mountains

:: Village
The village is peaceful and welcoming.
Smoke rises from cottage chimneys.

+ [Visit the tavern] -> Tavern
+ [Visit the market] -> Market
+ [Go back to the fork] -> Start

:: Tavern
The tavern is warm and lively.
A bard sings in the corner.

+ [Listen to the bard] -> BardEnding
+ [Have a drink] -> DrinkEnding
+ [Leave] -> Village

:: Market
Colorful stalls line the square.
Merchants call out their wares.

+ [Buy supplies] -> SuppliesEnding
+ [Leave] -> Village

:: Castle
The castle looms imposingly ahead.
Guards stand at the gate.

+ [Request an audience] -> Audience
+ [Sneak around back] -> SneakEnding
+ [Go back to the fork] -> Start

:: Audience
The king grants you an audience.
"What brings you to my court?"

+ [Ask for a quest] -> QuestEnding
+ [Request riches] -> RichesEnding

:: Mountains
The mountain path is steep and cold.
Eagles circle overhead.

+ [Climb higher] -> Summit
+ [Search for caves] -> CaveEnding
+ [Go back to the fork] -> Start

:: Summit
You reach the summit!
The view is breathtaking.
-> SummitEnding

:: BardEnding
The bard's songs fill you with joy.
You spend the evening in good company.
**THE END - The Entertained**

:: DrinkEnding
After a few drinks, you make new friends.
The village becomes your home.
**THE END - The Settler**

:: SuppliesEnding
Well-provisioned, you continue your journey.
Adventure awaits!
**THE END - The Prepared**

:: SneakEnding
You find a secret passage into the castle!
Your stealth serves you well.
**THE END - The Shadow**

:: QuestEnding
The king sends you on a heroic quest!
Your legend begins.
**THE END - The Hero**

:: RichesEnding
The king rewards your boldness with gold!
You leave as a wealthy person.
**THE END - The Fortunate**

:: CaveEnding
In the cave, you find ancient treasures!
The mountain reveals its secrets.
**THE END - The Explorer**

:: SummitEnding
From the summit, you see the entire world.
Anywhere is possible from here.
**THE END - The Climber**
```

## What This Shows

- Multiple branching paths
- Various endings based on choices
- Hierarchical location structure
- Return options to earlier points
