# Passage Links

Different ways to navigate between passages.

## Code

```whisker
@title: Navigation Demo

:: Start
**Navigation Methods in Whisker**

There are several ways to move between passages.

+ [Choice-based navigation] -> ChoiceNav
+ [Automatic redirects] -> AutoRedirect
+ [Conditional navigation] -> ConditionalNav

:: ChoiceNav
**Choice-Based Navigation**

The most common way to navigate is with choices:

```
+ [Text shown to player] -> TargetPassage
```

+ [Back to start] -> Start

:: AutoRedirect
**Automatic Redirects**

Sometimes you want to go directly to another passage:

```
-> TargetPassage
```

This passage will immediately go to the next one.
-> AutoRedirect2

:: AutoRedirect2
See? You were automatically redirected here!

+ [Back to start] -> Start

:: ConditionalNav
**Conditional Navigation**

{do $hasTicket = true}

Navigate based on conditions:

{$hasTicket}
You have a ticket, so you can enter!
-> VIPArea
{else}
No ticket? You can't enter.
-> Rejected
{/}

:: VIPArea
**Welcome to the VIP Area!**

You made it because you had a ticket.

+ [Back to start] -> Start

:: Rejected
**Sorry, no entry without a ticket.**

+ [Try again] -> ConditionalNav
+ [Back to start] -> Start
```

## What This Shows

- `+ [text] -> Passage` - Player choice navigation
- `-> Passage` - Automatic redirect (divert)
- Conditional navigation using if/else
