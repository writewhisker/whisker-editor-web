# Basic Examples

Simple examples for learning Whisker fundamentals.

## Hello World

The simplest possible Whisker story.

```whisker
:: Start
Hello, world!
```

## Simple Choices

A story with basic choices.

```whisker
:: Start
What do you want to do?
+ [Go left] -> Left
+ [Go right] -> Right

:: Left
You went left and found a treasure!
-> END

:: Right
You went right and found a monster!
-> END
```

## Variables

Using variables to track state.

```whisker
:: Start
{do $name = "Player"}
{do $score = 0}

Hello, $name! Your score is $score.

+ [Find treasure] {do $score = $score + 10} -> Start
+ [Quit] -> END
```

## Conditionals

Showing content based on conditions.

```whisker
:: Start
{do $hasKey = false}

You're in a room with a locked door.

{$hasKey}
The door is unlocked! You can leave.
+ [Leave] -> END
{else}
You need a key to open this door.
+ [Search for key] {do $hasKey = true} -> Start
{/}
```

## More Examples

See the [Intermediate Examples](/examples/intermediate/) for more complex patterns.
