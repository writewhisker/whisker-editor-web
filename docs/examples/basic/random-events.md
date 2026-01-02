# Random Events

Add unpredictability with random numbers.

## Code

```whisker
@title: Dice Game

:: Start
{do $wins = 0}
{do $losses = 0}

**Dice Rolling Game**

Wins: $wins | Losses: $losses

+ [Roll the dice!] -> Roll
+ [Quit] -> GameOver

:: Roll
{do $playerRoll = random(1, 6)}
{do $houseRoll = random(1, 6)}

You rolled: **$playerRoll**
The house rolled: **$houseRoll**

{$playerRoll > $houseRoll}
**You win this round!**
{do $wins = $wins + 1}
{elif $playerRoll < $houseRoll}
**The house wins!**
{do $losses = $losses + 1}
{else}
**It's a tie!**
{/}

+ [Roll again] -> Roll
+ [Check score] -> Start
+ [Cash out] -> GameOver

:: GameOver
**Final Score**
Wins: $wins
Losses: $losses

{$wins > $losses}
You came out ahead! Great job!
{elif $wins < $losses}
Better luck next time!
{else}
You broke even.
{/}

-> END
```

## What This Shows

- `random(min, max)` - Generate random integers
- Comparing random values
- Tracking statistics across rounds
- Simple game loop pattern
