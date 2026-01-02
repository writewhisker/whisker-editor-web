# Conditionals

Show different content based on conditions.

## Code

```whisker
@title: The Locked Door

:: Start
{do $hasKey = false}
{do $triedDoor = false}

You're in a room with a locked door.

+ [Try the door] -> TryDoor
+ [Search the room] -> SearchRoom

:: TryDoor
{do $triedDoor = true}

{$hasKey}
You unlock the door with your key and step through!
-> Victory
{else}
The door is locked. You need a key.
+ [Search the room] -> SearchRoom
+ [Try again] -> TryDoor
{/}

:: SearchRoom
{$hasKey}
You've already found the key.
{else}
You search the room carefully...

{$triedDoor}
Knowing what you need, you focus your search.
You find a key hidden under a loose floorboard!
{do $hasKey = true}
{else}
You look around but aren't sure what you're looking for.
Maybe try the door first?
{/}
{/}

+ [Go to the door] -> TryDoor
+ [Search again] -> SearchRoom

:: Victory
**Congratulations!**
You've escaped the room!
-> END
```

## What This Shows

- `{$condition}` - If block starts
- `{else}` - Else block
- `{elif $condition}` - Else-if block
- `{/}` - End of conditional block
- Nesting conditionals for complex logic
