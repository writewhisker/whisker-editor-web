# Time System

Track time passing in your story.

## Code

```whisker
@title: A Day in the Village

:: Start
{do $hour = 6}
{do $day = 1}
{do $energy = 100}
{do $gold = 0}

**Day $day**

-> TimeCheck

:: TimeCheck
{do $timeOfDay = ""}
{$hour < 6}
{do $timeOfDay = "Night"}
{elif $hour < 12}
{do $timeOfDay = "Morning"}
{elif $hour < 18}
{do $timeOfDay = "Afternoon"}
{elif $hour < 22}
{do $timeOfDay = "Evening"}
{else}
{do $timeOfDay = "Night"}
{/}

-> DayLoop

:: DayLoop
**Day $day - $timeOfDay ($hour:00)**
Energy: $energy | Gold: $gold

{$energy <= 0}
You're too tired to continue.
-> Sleep
{/}

{$hour >= 22 or $hour < 6}
It's too late. You should sleep.
+ [Go to bed] -> Sleep
{else}
+ [Work at the farm (3 hours)] {$energy >= 20} -> Farm
+ [Explore the forest (2 hours)] {$energy >= 15} -> Explore
+ [Rest at home (1 hour)] -> Rest
+ [Visit the tavern (2 hours)] {$hour >= 18} -> Tavern
+ [Go to bed early] -> Sleep
{/}

:: Farm
{do $hour = $hour + 3}
{do $energy = $energy - 20}
{do $earned = random(10, 20)}
{do $gold = $gold + $earned}

You work hard at the farm and earn $earned gold.

-> TimeCheck

:: Explore
{do $hour = $hour + 2}
{do $energy = $energy - 15}

{do $event = random(1, 4)}
{$event == 1}
You find some berries! Energy restored.
{do $energy = min($energy + 10, 100)}
{elif $event == 2}
You discover a hidden treasure!
{do $gold = $gold + 25}
{elif $event == 3}
You get lost and waste time.
{do $hour = $hour + 1}
{else}
A peaceful walk. Nothing special happens.
{/}

-> TimeCheck

:: Rest
{do $hour = $hour + 1}
{do $energy = min($energy + 20, 100)}

You rest at home and recover some energy.

-> TimeCheck

:: Tavern
{do $hour = $hour + 2}
{do $energy = $energy - 10}

{$gold >= 5}
{do $gold = $gold - 5}
You buy a drink and enjoy the evening.
{do $energy = min($energy + 5, 100)}
{else}
The barkeep lets you sit by the fire.
{/}

-> TimeCheck

:: Sleep
{do $day = $day + 1}
{do $hour = 6}
{do $energy = 100}

*You sleep through the night...*

**A new day dawns!**

{$day > 7}
-> GameEnd
{else}
+ [Wake up] -> TimeCheck
{/}

:: GameEnd
**Week Complete!**

You earned a total of $gold gold over 7 days.

{$gold >= 100}
You're doing great! Keep it up!
{elif $gold >= 50}
Not bad for a week's work.
{else}
Times are tough, but you'll manage.
{/}

+ [Play again] -> Start
```

## What This Shows

- Time tracking with hours and days
- Time-of-day calculations
- Time-gated activities
- Energy/stamina management
- Daily cycle with sleeping
