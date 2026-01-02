# Advanced Examples

Complex examples showcasing Whisker's full capabilities.

## State Machine

Implement a state machine pattern.

```whisker
{do $state = "idle"}
{do $health = 100}
{do $energy = 50}

:: GameLoop
Health: $health | Energy: $energy | State: $state

{$state == "idle"}
You're resting peacefully.
+ [Start exploring] {do $state = "exploring"} -> GameLoop
+ [Meditate] {do $energy = $energy + 20} -> GameLoop
{/}

{$state == "exploring"}
You're exploring the wilderness.
+ [Search area] {do $energy = $energy - 10} -> Search
+ [Rest] {do $state = "idle"} -> GameLoop
{/}

{$state == "combat"}
You're in combat!
+ [Attack] {do $energy = $energy - 15} -> Attack
+ [Flee] {do $state = "exploring"} {do $health = $health - 10} -> GameLoop
{/}

:: Search
{$energy > 0}
{do $roll = random(1, 100)}
{$roll > 70}
You found a monster!
{do $state = "combat"}
{else}
You found some treasure!
{/}
{else}
You're too tired to search.
{/}
-> GameLoop
```

## More Examples

See [Showcase](/examples/showcase/) for complete playable stories.
