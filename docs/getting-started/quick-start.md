# Quick Start

Write your first Whisker story in 5 minutes!

## Step 1: Create a File

Create a new file called `adventure.ws`:

```whisker
:: Start
You wake up in a mysterious room.
There's a door to the north and a window to the east.

+ [Go through the door] -> Door
+ [Look out the window] -> Window

:: Door
The door leads to a long hallway.
+ [Continue down the hallway] -> Hallway
+ [Go back] -> Start

:: Window
You see a beautiful garden outside.
+ [Open the window] -> Garden
+ [Go back] -> Start

:: Hallway
At the end of the hallway, you find a treasure chest!
+ [Open the chest] -> Treasure
+ [Leave it alone] -> END

:: Garden
You climb out and find yourself in paradise.
-> END

:: Treasure
Inside the chest is a golden key!
Congratulations, you won!
-> END
```

## Step 2: Play Your Story

### In the Web Editor

1. Go to [whisker.dev](https://whisker.dev)
2. Paste your story
3. Click "Play"

### With the CLI

```bash
whisker play adventure.ws
```

## Understanding the Syntax

### Passages

Passages are the building blocks of your story:

```whisker
:: PassageName
This is the content of the passage.
```

- Start with `::` followed by the passage name
- Content goes on the following lines
- Every story needs a `Start` passage

### Choices

Choices let readers interact:

```whisker
+ [Choice text] -> TargetPassage
```

- `+` marks a choice
- `[...]` contains the text shown to readers
- `->` points to the target passage

### Special Targets

- `-> END` ends the story
- `-> BACK` goes to the previous passage
- `-> RESTART` returns to Start

## Step 3: Add Variables

Make your story dynamic with variables:

```whisker
:: Start
{do $name = "Adventurer"}
{do $gold = 0}

Hello, $name!
You have $gold gold coins.

+ [Find treasure] {do $gold = $gold + 10} -> Start
+ [Buy something] {$gold >= 10} {do $gold = $gold - 10} -> Shop
+ [End adventure] -> END

:: Shop
You bought something nice!
+ [Continue] -> Start
```

### Variable Syntax

- `{do $var = value}` - Set a variable
- `$var` - Display a variable
- `{condition}...{/}` - Conditional content
- `{$gold >= 10}` on a choice - Conditional choice availability

## Next Steps

- [Adding Choices](/tutorials/beginner/02-adding-choices) - Learn more about choices
- [Using Variables](/tutorials/beginner/03-using-variables) - Master variables
- [Examples](/examples/) - Browse complete examples
