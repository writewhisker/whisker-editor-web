# Map Exploration

A grid-based exploration system.

## Code

```whisker
@title: The Explorer

:: Start
{do $mapSize = 3}
{do $playerX = 1}
{do $playerY = 1}
{do $visited = []}
{do $treasures = 0}

{do $map = [
  ["Mountains", "Forest", "Lake"],
  ["Village", "Crossroads", "Cave"],
  ["Swamp", "Plains", "Castle"]
]}

{do $descriptions = {
  Mountains: "Snow-capped peaks tower above you.",
  Forest: "Ancient trees block out the sun.",
  Lake: "Crystal clear water stretches before you.",
  Village: "A peaceful village with friendly folk.",
  Crossroads: "Roads lead in all directions.",
  Cave: "A dark cave entrance beckons.",
  Swamp: "Murky water and twisted trees.",
  Plains: "Golden grass sways in the wind.",
  Castle: "A majestic castle stands proud."
}}

-> Explore

:: Explore
{do $location = $map[$playerY][$playerX]}
{do $locationKey = $playerX + "," + $playerY}

{not $visited.includes($locationKey)}
{do $visited.push($locationKey)}
*A new location discovered!*
{/}

**$location**

{$descriptions[$location]}

Position: ($playerX, $playerY)
Locations visited: {#$visited}/9

+ [Go North] {$playerY > 0} {do $playerY = $playerY - 1} -> Explore
+ [Go South] {$playerY < $mapSize - 1} {do $playerY = $playerY + 1} -> Explore
+ [Go West] {$playerX > 0} {do $playerX = $playerX - 1} -> Explore
+ [Go East] {$playerX < $mapSize - 1} {do $playerX = $playerX + 1} -> Explore
+ [Search area] -> Search
+ [View map] -> ViewMap

:: Search
{do $roll = random(1, 10)}
{$roll > 7}
You found a treasure!
{do $treasures = $treasures + 1}
Total treasures: $treasures
{else}
Nothing here.
{/}
+ [Continue] -> Explore

:: ViewMap
**World Map** (You are marked with @)

{for $row, $y in $map}
{for $cell, $x in $row}
{$x == $playerX and $y == $playerY}[@]{else}[{$cell[0]}]{/}
{/for}

{/for}

Legend: M=Mountains, F=Forest, L=Lake
        V=Village, C=Crossroads, c=Cave
        S=Swamp, P=Plains, C=Castle

+ [Back] -> Explore
```

## What This Shows

- Grid-based map system
- Position tracking with coordinates
- Cardinal direction movement
- Visited location tracking
- Dynamic map display
- Boundary checking for movement
