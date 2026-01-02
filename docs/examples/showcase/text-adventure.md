# Text Adventure

A classic adventure game with exploration and puzzles.

## Code

```whisker
@title: The Lost Temple
@author: Whisker Examples

:: Start
{do $inventory = []}
{do $health = 100}
{do $torchLit = false}
{do $bridgeFixed = false}
{do $treasureFound = false}
{do $visited = []}

**THE LOST TEMPLE**

After years of searching, you've finally found it—
the legendary Temple of the Sun God.

Ancient stone steps lead up to a dark entrance.

+ [Enter the temple] -> Entrance

:: Entrance
{do $visited.push("entrance")}

**Temple Entrance**

You stand in a grand foyer lit by cracks in the ceiling.
Three passages branch off: left, right, and straight ahead.

{$torchLit}
Your torch illuminates ancient murals on the walls.
{/}

+ [Go left] -> LeftCorridor
+ [Go right] -> RightCorridor
+ [Go straight] -> MainHall
+ [Examine the murals] {$torchLit} -> ExamineMurals
+ [Check inventory] -> Inventory

:: Inventory
**Your Inventory:**

{#$inventory > 0}
{for $item in $inventory}
- $item
{/for}
{else}
Empty
{/}

Health: $health

+ [Back] -> Return

:: Return
{$visited[-1] == "entrance"}
-> Entrance
{elif $visited[-1] == "left"}
-> LeftCorridor
{elif $visited[-1] == "right"}
-> RightCorridor
{elif $visited[-1] == "main"}
-> MainHall
{elif $visited[-1] == "dark"}
-> DarkRoom
{elif $visited[-1] == "treasure"}
-> TreasureRoom
{else}
-> Entrance
{/}

:: ExamineMurals
The murals depict an ancient ritual.
A priest holds a golden key above an altar.

*The key must be important...*

+ [Back] -> Entrance

:: LeftCorridor
{do $visited.push("left")}

**Left Corridor**

A narrow passage with alcoves carved into the walls.
You see old pottery and bones.

{not $inventory.includes("torch")}
An unlit torch rests in a bracket.
+ [Take the torch] {do $inventory.push("torch")} -> LeftCorridor
{/}

{$inventory.includes("torch") and not $torchLit}
{$inventory.includes("flint")}
+ [Light the torch] {do $torchLit = true} -> TorchLit
{else}
*You need something to light the torch with.*
{/}
{/}

+ [Search the alcoves] -> SearchAlcoves
+ [Go back] -> Entrance
+ [Check inventory] -> Inventory

:: TorchLit
*The torch flickers to life!*
Now you can see in the dark.
-> LeftCorridor

:: SearchAlcoves
{not $inventory.includes("rope")}
You find a coil of rope!
{do $inventory.push("rope")}
{else}
Nothing else of interest.
{/}
+ [Back] -> LeftCorridor

:: RightCorridor
{do $visited.push("right")}

**Right Corridor**

This passage leads to a small chamber.
A stone table holds various objects.

{not $inventory.includes("flint")}
You see flint stones on the table.
+ [Take the flint] {do $inventory.push("flint")} -> RightCorridor
{/}

{not $inventory.includes("golden_key")}
A puzzle box sits on the table.
+ [Examine the puzzle box] -> PuzzleBox
{/}

+ [Go back] -> Entrance
+ [Check inventory] -> Inventory

:: PuzzleBox
The box has three rotating rings with symbols.
*Sun, Moon, Star - which order?*

The murals showed the priest with the sun...

+ [Sun, Moon, Star] -> BoxWrong
+ [Star, Moon, Sun] -> BoxWrong
+ [Sun, Star, Moon] -> BoxCorrect

:: BoxWrong
*Click, click, click...*
Nothing happens. Wrong combination.
+ [Try again] -> PuzzleBox
+ [Leave it] -> RightCorridor

:: BoxCorrect
*Click!* The box springs open!
Inside is a golden key!
{do $inventory.push("golden_key")}
**Obtained: Golden Key**
+ [Continue] -> RightCorridor

:: MainHall
{do $visited.push("main")}

**Main Hall**

A massive chamber with towering pillars.
A broken bridge spans a deep chasm.
Beyond it, you see a door with a golden lock.

{not $bridgeFixed}
The bridge is broken. You can't cross.

{$inventory.includes("rope")}
+ [Use rope to fix the bridge] {do $bridgeFixed = true} -> BridgeFixed
{else}
*You need something to repair the bridge.*
{/}
{else}
The bridge is now crossable.
+ [Cross the bridge] -> AcrossChasm
{/}

A dark passage leads down to the left.

+ [Enter the dark passage] -> DarkPassage
+ [Go back] -> Entrance
+ [Check inventory] -> Inventory

:: BridgeFixed
You secure the rope across the broken section.
It's not pretty, but it'll hold your weight.
**The bridge is now crossable!**
-> MainHall

:: DarkPassage
{$torchLit}
{do $visited.push("dark")}
-> DarkRoom
{else}
It's pitch black. You can't see anything!
You stumble and hurt yourself.
{do $health = $health - 20}
*Lost 20 health!*
+ [Go back] -> MainHall
{/}

:: DarkRoom
**Dark Chamber**

Your torch reveals a room full of treasures!
But wait... it's all fake. Stage props.

However, you find a healing potion!
{not $inventory.includes("potion")}
{do $inventory.push("potion")}
**Obtained: Healing Potion**
{/}

+ [Go back] -> MainHall

:: AcrossChasm
{$inventory.includes("golden_key")}
You cross the makeshift bridge carefully.
The golden door awaits.

+ [Use the golden key] -> TreasureRoom
+ [Go back] -> MainHall
{else}
You cross carefully, but the door is locked.
*It requires a golden key.*
+ [Go back] -> MainHall
{/}

:: TreasureRoom
{do $visited.push("treasure")}

**The Treasure Chamber!**

{not $treasureFound}
Gold, jewels, and ancient artifacts fill the room!
In the center, a golden sun idol glows with inner light.

{do $treasureFound = true}

You've found the legendary Treasure of the Sun God!

**CONGRATULATIONS!**

You've completed THE LOST TEMPLE!

Items collected: {#$inventory}
Final health: $health

+ [Play again] -> Start
+ [The End] -> END
{else}
You gaze upon your treasure once more.
+ [The End] -> END
{/}
```

## What This Shows

- Classic adventure game structure
- Item collection and usage
- Puzzle solving with items
- Light/dark mechanics
- Bridge repair puzzle
- Multiple paths through the game
- Win condition tracking
