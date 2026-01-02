# Dialogue Tree

Create branching conversations with NPCs.

## Code

```whisker
@title: The Mysterious Merchant

:: Start
{do $merchantTrust = 0}
{do $knownSecrets = []}
{do $boughtPotion = false}

You enter a dimly lit shop.
A hooded figure stands behind the counter.

-> MeetMerchant

:: MeetMerchant
{$merchantTrust == 0}
The merchant eyes you suspiciously.
"What do you want?"
{elif $merchantTrust < 3}
"Ah, you again. What can I do for you?"
{else}
"My friend! It's good to see you."
{/}

+ [Ask about potions] -> AskPotions
+ [Ask about rumors] -> AskRumors
+ [Compliment the shop] {$merchantTrust < 5} -> Compliment
+ [Ask about the secret room] {$knownSecrets.includes("secret_room")} -> SecretRoom
+ [Leave] -> Leave

:: AskPotions
{$boughtPotion}
"You've already bought my finest potion."
{else}
"I have a special potion. Very rare. 50 gold."

{$merchantTrust >= 2}
"Since you're a friend, 40 gold."
{/}
{/}

+ [Buy the potion] {not $boughtPotion} -> BuyPotion
+ [Too expensive] -> MeetMerchant
+ [Ask what it does] -> PotionDetails

:: PotionDetails
{$merchantTrust < 2}
"Buy it first. Then I'll tell you."
{else}
"It grants visions of the future. One use only."
{/}
+ [Back] -> AskPotions

:: BuyPotion
{do $boughtPotion = true}
{do $merchantTrust = $merchantTrust + 1}
"Excellent choice. Use it wisely."
+ [Continue] -> MeetMerchant

:: AskRumors
{$merchantTrust < 1}
"I don't share rumors with strangers."
{do $merchantTrust = $merchantTrust + 1}
*Perhaps being friendlier would help.*
{elif $merchantTrust < 3}
"I've heard the castle guards are corrupt."
{do $knownSecrets.push("corrupt_guards")}
{else}
"Between us... there's a secret room behind this shop."
{do $knownSecrets.push("secret_room")}
{/}

+ [Back] -> MeetMerchant

:: Compliment
"What a lovely shop you have."

{do $merchantTrust = $merchantTrust + 1}

{$merchantTrust == 1}
The merchant looks surprised. "Thank you."
{elif $merchantTrust == 2}
"You're too kind, traveler."
{else}
"You're one of the good ones."
{/}

+ [Continue] -> MeetMerchant

:: SecretRoom
The merchant leads you through a hidden door.
Inside is a room filled with magical artifacts!

"Only my closest friends see this."

+ [Examine the artifacts] -> Artifacts
+ [Go back] -> MeetMerchant

:: Artifacts
You see ancient scrolls, glowing gems, and strange devices.

"Perhaps someday, you'll be ready for these."

+ [Back] -> SecretRoom

:: Leave
{$merchantTrust >= 3}
"Come back soon, friend."
{else}
"Goodbye."
{/}
-> END
```

## What This Shows

- Trust/reputation system
- Unlocking dialogue options through actions
- Tracking discovered information in arrays
- Multi-level responses based on relationship
- Hidden content revealed at high trust
