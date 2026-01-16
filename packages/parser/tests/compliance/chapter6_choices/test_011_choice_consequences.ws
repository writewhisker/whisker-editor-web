:: Start
Make a choice:
+ [Take gold] {do $gold = $gold + 10} -> Reward
+ [Take sword] -> Armory {do $weapon = "sword"}

:: Reward
You got richer.

:: Armory
You got a sword.
