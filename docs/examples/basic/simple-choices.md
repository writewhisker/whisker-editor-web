# Simple Choices

Learn how to present choices to the player.

## Code

```whisker
@title: The Two Doors

:: Start
You stand in a hallway with two doors.
A red door to your left, and a blue door to your right.

+ [Open the red door] -> RedRoom
+ [Open the blue door] -> BlueRoom
+ [Stay in the hallway] -> Hallway

:: RedRoom
You enter a warm room filled with red tapestries.
A fire crackles in the fireplace.

+ [Sit by the fire] -> FireEnding
+ [Go back] -> Start

:: BlueRoom
You enter a cool room with blue walls.
A gentle breeze flows through an open window.

+ [Look out the window] -> WindowEnding
+ [Go back] -> Start

:: Hallway
You decide to stay in the hallway.
Perhaps the best choice is to choose nothing at all.
-> END

:: FireEnding
You warm yourself by the fire and drift off to sleep...
**THE END - Fire Ending**
-> END

:: WindowEnding
Through the window, you see a beautiful garden.
You climb out and begin a new adventure!
**THE END - Garden Ending**
-> END
```

## What This Shows

- Multiple choices leading to different passages
- Choices can loop back to previous passages
- Multiple endings based on player decisions
- Text formatting with `**bold**`
