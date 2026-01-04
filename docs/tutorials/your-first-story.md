# Your First Story

Learn how to create your first interactive story with Whisker.

## What You'll Build

A simple branching narrative where the player explores a mysterious house with three rooms.

## Step 1: Create the Start Passage

Every story needs a starting point. Create a passage called "Start":

```wls
:: Start
You stand before an old Victorian mansion. The front door creaks open slightly, as if inviting you in.

* [Enter the mansion] -> Foyer
* [Walk away] -> Ending_Leave
```

This creates:
- A passage named "Start"
- Two choices that lead to different passages

## Step 2: Add the Foyer

```wls
:: Foyer
The foyer is dimly lit by a dusty chandelier. You see three doors: one to the left, one to the right, and one straight ahead.

* [Go left] -> Library
* [Go right] -> Kitchen
* [Go straight] -> Parlor
* [Leave the mansion] -> Ending_Leave
```

## Step 3: Create the Rooms

```wls
:: Library
Bookshelves line the walls from floor to ceiling. A leather armchair sits by the fireplace.

You notice a peculiar book with a glowing spine.

* [Read the book] -> Library_ReadBook
* [Return to the foyer] -> Foyer

:: Kitchen
The kitchen hasn't been used in years. Cobwebs cover the counters.

A faint light comes from the pantry.

* [Check the pantry] -> Kitchen_Pantry
* [Return to the foyer] -> Foyer

:: Parlor
Grand portraits hang on the walls, their eyes seeming to follow you.

* [Examine the portraits] -> Parlor_Portraits
* [Return to the foyer] -> Foyer
```

## Step 4: Add Sub-scenes

```wls
:: Library_ReadBook
The book tells of a treasure hidden somewhere in the house!

You now know the secret.

* [Continue exploring] -> Foyer

:: Kitchen_Pantry
Behind old cans, you find a rusty key!

You take the key with you.

* [Return to kitchen] -> Kitchen

:: Parlor_Portraits
One portrait depicts the mansion's original owner. Behind it, you notice a safe!

* [Try to open the safe] -> Parlor_Safe
* [Return to the parlor] -> Parlor

:: Parlor_Safe
The safe requires a key...

* [Return to the parlor] -> Parlor
```

## Step 5: Add Endings

```wls
:: Ending_Leave
You decide this adventure isn't for you. Perhaps another day.

-> END

:: Ending_Treasure
Inside the safe, you find gold coins and jewels! The mansion's secret is yours!

Congratulations, you found the treasure!

-> END
```

## Step 6: Add Variables

Let's track whether the player has the key:

```wls
VAR $hasKey = false
```

Update the Kitchen Pantry:

```wls
:: Kitchen_Pantry
Behind old cans, you find a rusty key!

{$hasKey = true}
You take the key with you.

* [Return to kitchen] -> Kitchen
```

Update the Safe to use the key:

```wls
:: Parlor_Safe
The safe requires a key...

* [Use the rusty key] {$hasKey} -> Ending_Treasure
* [Return to the parlor] -> Parlor
```

## Complete Story

Here's the full story:

```wls
VAR $hasKey = false

:: Start
You stand before an old Victorian mansion. The front door creaks open slightly, as if inviting you in.

* [Enter the mansion] -> Foyer
* [Walk away] -> Ending_Leave

:: Foyer
The foyer is dimly lit by a dusty chandelier. You see three doors: one to the left, one to the right, and one straight ahead.

* [Go left] -> Library
* [Go right] -> Kitchen
* [Go straight] -> Parlor
* [Leave the mansion] -> Ending_Leave

:: Library
Bookshelves line the walls from floor to ceiling. A leather armchair sits by the fireplace.

You notice a peculiar book with a glowing spine.

* [Read the book] -> Library_ReadBook
* [Return to the foyer] -> Foyer

:: Library_ReadBook
The book tells of a treasure hidden somewhere in the house!

You now know the secret.

* [Continue exploring] -> Foyer

:: Kitchen
The kitchen hasn't been used in years. Cobwebs cover the counters.

A faint light comes from the pantry.

* [Check the pantry] -> Kitchen_Pantry
* [Return to the foyer] -> Foyer

:: Kitchen_Pantry
Behind old cans, you find a rusty key!

{$hasKey = true}
You take the key with you.

* [Return to kitchen] -> Kitchen

:: Parlor
Grand portraits hang on the walls, their eyes seeming to follow you.

* [Examine the portraits] -> Parlor_Portraits
* [Return to the foyer] -> Foyer

:: Parlor_Portraits
One portrait depicts the mansion's original owner. Behind it, you notice a safe!

* [Try to open the safe] -> Parlor_Safe
* [Return to the parlor] -> Parlor

:: Parlor_Safe
The safe requires a key...

* [Use the rusty key] {$hasKey} -> Ending_Treasure
* [Return to the parlor] -> Parlor

:: Ending_Leave
You decide this adventure isn't for you. Perhaps another day.

-> END

:: Ending_Treasure
Inside the safe, you find gold coins and jewels! The mansion's secret is yours!

Congratulations, you found the treasure!

-> END
```

## What's Next?

- Learn about [Conditionals and Branching](/tutorials/conditionals)
- Add [Random Events](/tutorials/randomness)
- Create [Complex Choices](/tutorials/advanced-choices)
