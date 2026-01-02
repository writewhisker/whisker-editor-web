# Simple Quiz

A multiple-choice quiz game.

## Code

```whisker
@title: Trivia Quiz

:: Start
{do $score = 0}
{do $question = 1}

**Welcome to the Trivia Quiz!**

Answer 3 questions to test your knowledge.

+ [Start Quiz] -> Question1

:: Question1
**Question 1 of 3**

What is the capital of France?

+ [London] -> Wrong1
+ [Paris] -> Right1
+ [Berlin] -> Wrong1

:: Right1
{do $score = $score + 1}
**Correct!** Paris is the capital of France.
+ [Next Question] -> Question2

:: Wrong1
**Wrong!** The capital of France is Paris.
+ [Next Question] -> Question2

:: Question2
**Question 2 of 3**

What year did World War II end?

+ [1943] -> Wrong2
+ [1945] -> Right2
+ [1950] -> Wrong2

:: Right2
{do $score = $score + 1}
**Correct!** World War II ended in 1945.
+ [Next Question] -> Question3

:: Wrong2
**Wrong!** World War II ended in 1945.
+ [Next Question] -> Question3

:: Question3
**Question 3 of 3**

What is the largest planet in our solar system?

+ [Earth] -> Wrong3
+ [Saturn] -> Wrong3
+ [Jupiter] -> Right3

:: Right3
{do $score = $score + 1}
**Correct!** Jupiter is the largest planet.
+ [See Results] -> Results

:: Wrong3
**Wrong!** Jupiter is the largest planet.
+ [See Results] -> Results

:: Results
**Quiz Complete!**

Your score: $score out of 3

{$score == 3}
**Perfect score!** You're a trivia master!
{elif $score == 2}
**Great job!** You know your stuff!
{elif $score == 1}
**Not bad!** Keep learning!
{else}
**Better luck next time!**
{/}

+ [Play Again] -> Start
+ [Exit] -> END
```

## What This Shows

- Multi-passage quiz structure
- Score tracking
- Conditional feedback based on score
- Replay functionality
