# Puzzle Mechanics

Logic puzzles in interactive fiction.

## Code

```whisker
@title: The Puzzle Room

:: Start
{do $puzzlesSolved = 0}
{do $totalPuzzles = 3}
{do $code = []}
{do $leverOrder = []}
{do $riddleAnswer = ""}

**The Puzzle Room**

You're trapped in a room with three puzzles.
Solve them all to escape!

Puzzles solved: $puzzlesSolved / $totalPuzzles

+ [Number Lock Puzzle] {not $code.length > 0} -> NumberPuzzle
+ [Lever Puzzle] {not $leverOrder.length > 0} -> LeverPuzzle
+ [Riddle] {not $riddleAnswer} -> RiddlePuzzle
+ [Try the exit] -> TryExit

:: NumberPuzzle
**Number Lock**

A lock with 4 digits. A note reads:
"The first digit is double the last.
The second digit is the sum of the first and third.
The third digit is always 2.
The sum of all digits is 13."

{do $correctCode = [4, 6, 2, 1]}

Enter the code:

+ [4-6-2-1] -> CheckNumber.correct
+ [2-5-2-1] -> CheckNumber.wrong
+ [6-8-2-3] -> CheckNumber.wrong
+ [8-10-2-4] -> CheckNumber.wrong
+ [Back] -> Start

:: CheckNumber.correct
*Click!* The lock opens!
{do $code = $correctCode}
{do $puzzlesSolved = $puzzlesSolved + 1}
**Puzzle Solved!**
+ [Continue] -> Start

:: CheckNumber.wrong
*Bzzt!* Wrong combination.
+ [Try again] -> NumberPuzzle

:: LeverPuzzle
**Lever Sequence**

Five levers labeled A through E.
A plaque reads:
"Pull in the order of the rainbow's first letters.
Skip every other one, starting with the second."

Rainbow: **R**ed, **O**range, **Y**ellow, **G**reen, **B**lue
Skip O, G = R, Y, B → positions 1, 3, 5 → A, C, E

+ [A, C, E] -> CheckLever.correct
+ [A, B, C] -> CheckLever.wrong
+ [E, C, A] -> CheckLever.wrong
+ [B, D, E] -> CheckLever.wrong
+ [Back] -> Start

:: CheckLever.correct
*Clunk!* The mechanism activates!
{do $leverOrder = ["A", "C", "E"]}
{do $puzzlesSolved = $puzzlesSolved + 1}
**Puzzle Solved!**
+ [Continue] -> Start

:: CheckLever.wrong
The levers reset with a grinding noise.
+ [Try again] -> LeverPuzzle

:: RiddlePuzzle
**The Riddle**

A voice echoes through the room:

*"I have cities, but no houses.*
*I have mountains, but no trees.*
*I have water, but no fish.*
*I have roads, but no cars.*
*What am I?"*

+ [A map] -> CheckRiddle.correct
+ [A painting] -> CheckRiddle.wrong
+ [A dream] -> CheckRiddle.wrong
+ [A book] -> CheckRiddle.wrong
+ [Back] -> Start

:: CheckRiddle.correct
"Correct!" the voice booms approvingly.
{do $riddleAnswer = "map"}
{do $puzzlesSolved = $puzzlesSolved + 1}
**Puzzle Solved!**
+ [Continue] -> Start

:: CheckRiddle.wrong
"Incorrect..." the voice sighs.
+ [Try again] -> RiddlePuzzle

:: TryExit
{$puzzlesSolved >= $totalPuzzles}
The door swings open!
**Congratulations!** You've escaped the puzzle room!
-> END
{else}
The door won't budge.
You need to solve all $totalPuzzles puzzles first.
(Solved: $puzzlesSolved)
+ [Back] -> Start
{/}
```

## What This Shows

- Logic puzzle structure
- Multiple puzzle types
- Solution verification
- Progress tracking
- Hints embedded in puzzle text
- Win condition checking
