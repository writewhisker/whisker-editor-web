# Hello World

The simplest possible Whisker story.

## Code

```whisker
@title: Hello World

:: Start
Hello, world!

Welcome to Whisker - a modern interactive fiction language.

+ [Continue] -> Goodbye

:: Goodbye
Thanks for reading!
-> END
```

## What This Shows

- `@title:` - Story metadata
- `:: Start` - Defines a passage named "Start" (required starting point)
- `+ [text]` - Creates a clickable choice
- `-> PassageName` - Navigates to another passage
- `-> END` - Ends the story
