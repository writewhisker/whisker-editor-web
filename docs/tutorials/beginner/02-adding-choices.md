# Adding Choices

Make your story interactive by giving readers meaningful choices.

## What You'll Learn

- Creating choices for readers
- Linking passages together
- Building branching narratives

## Prerequisites

- Completed [Your First Story](./01-first-story)

## Step 1: Basic Choice Syntax

Choices in Whisker use a simple format:

```whisker
+ [Choice text] -> TargetPassage
```

Let's break this down:

| Element | Meaning |
|---------|---------|
| `+` | Marks this as a choice |
| `[...]` | Text shown to the reader |
| `->` | Points to where the choice leads |
| `TargetPassage` | Name of the destination passage |

## Step 2: Add Choices to Your Story

Let's expand our forest story with choices:

```whisker
:: Start
You stand at the edge of the Whispering Woods.
A signpost reads: "Enter at your own risk."

+ [Enter the forest] -> Forest
+ [Turn back to town] -> Town

:: Forest
You step into the shadows of the ancient trees.
The path ahead splits in two directions.

+ [Take the left path] -> LeftPath
+ [Take the right path] -> RightPath

:: Town
You decide the forest can wait for another day.
Perhaps wisdom is the better part of valor.

+ [Try again] -> Start

:: LeftPath
The left path winds through flowering bushes.
You find a clearing with a peaceful stream.

:: RightPath
The right path leads deeper into darkness.
Strange sounds echo around you.
```

## Step 3: Ending Your Story

To end a story, use the special `END` target:

```whisker
:: LeftPath
The left path winds through flowering bushes.
You find a clearing with a peaceful stream.

Here, you discover a hidden treasure chest!
Congratulations, you found the treasure!

+ [The End] -> END
```

## Special Targets

Whisker has three special targets:

| Target | Effect |
|--------|--------|
| `END` | Ends the story |
| `BACK` | Returns to the previous passage |
| `RESTART` | Returns to the Start passage |

Example:

```whisker
:: DeadEnd
You've reached a dead end.

+ [Go back] -> BACK
+ [Start over] -> RESTART
```

## Multiple Choices

You can have as many choices as you want:

```whisker
:: Crossroads
You arrive at a crossroads with four paths.

+ [Go north] -> NorthPath
+ [Go south] -> SouthPath
+ [Go east] -> EastPath
+ [Go west] -> WestPath
+ [Rest here] -> Rest
```

## Try It Yourself

Create a short story with at least:

1. **Three passages** connected by choices
2. **Multiple paths** the reader can take
3. **An ending** using `-> END`

## Common Mistakes

### Missing Target Passage

```whisker
:: Start
+ [Go somewhere] -> Nowhere

# Error! Passage "Nowhere" doesn't exist
```

Always make sure your target passages exist!

### Orphaned Passages

```whisker
:: Start
+ [Go to Forest] -> Forest

:: Forest
You're in the forest.

:: SecretRoom
# This passage is never linked to!
# Reader can never reach it.
```

The editor will warn you about unreachable passages.

## Complete Example

Here's a complete mini-adventure:

```whisker
:: Start
You wake up in a mysterious room.
There's a door to the north and a window to the east.

+ [Open the door] -> Door
+ [Look out the window] -> Window
+ [Search the room] -> Search

:: Door
The door leads to a long, dark hallway.

+ [Walk down the hallway] -> Hallway
+ [Go back] -> BACK

:: Window
Through the window, you see a beautiful garden.
The window is locked.

+ [Break the window] -> Garden
+ [Go back] -> BACK

:: Search
You search the room and find a key under the bed!

+ [Try the door] -> Door
+ [Try the window] -> Window

:: Hallway
At the end of the hallway, you find a treasure chest!

+ [Open it] -> Treasure

:: Garden
You climb through the broken window into the garden.
Freedom! The sun warms your face.

+ [Celebrate your escape] -> END

:: Treasure
Inside the chest is gold and jewels!
You're rich!

+ [Celebrate your wealth] -> END
```

## Next Steps

Now that you can create choices, let's learn how to track information:

[Using Variables →](./03-using-variables)
