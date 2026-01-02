# Relationship Tracker

Track relationships with multiple characters.

## Code

```whisker
@title: The Social Web

:: Start
{do $characters = {
  alice: { name: "Alice", affinity: 0, met: false, title: "the Scholar" },
  bob: { name: "Bob", affinity: 0, met: false, title: "the Blacksmith" },
  clara: { name: "Clara", affinity: 0, met: false, title: "the Merchant" }
}}

**The Social Web**

Build relationships in this small town.

-> Town

:: Town
**Town Square**

+ [Visit the Library] -> Library
+ [Visit the Smithy] -> Smithy
+ [Visit the Market] -> Market
+ [Check relationships] -> Relationships

:: Library
{$characters.alice.met}
Alice waves at you warmly.
{else}
A woman looks up from her book.
{do $characters.alice.met = true}
"Hello, I'm Alice."
{/}

+ [Discuss philosophy] -> AlicePhilosophy
+ [Ask for book recommendations] {$characters.alice.affinity >= 2} -> AliceBooks
+ [Share a secret] {$characters.alice.affinity >= 5} -> AliceSecret
+ [Leave] -> Town

:: AlicePhilosophy
{do $characters.alice.affinity = $characters.alice.affinity + 1}
"Fascinating perspective!"
Alice seems pleased with the conversation.
-> Library

:: AliceBooks
"Try 'The Art of Wisdom' - it changed my life!"
{do $characters.alice.affinity = $characters.alice.affinity + 1}
-> Library

:: AliceSecret
Alice leans in close.
"Between us... there's a hidden passage in the town well."
**Secret discovered!**
-> Library

:: Smithy
{$characters.bob.met}
"Back again?"
{else}
A muscular man hammers at the forge.
{do $characters.bob.met = true}
"Name's Bob. Need something forged?"
{/}

+ [Admire his craftsmanship] -> BobAdmire
+ [Help at the forge] {$characters.bob.affinity >= 2} -> BobHelp
+ [Ask about weapons] {$characters.bob.affinity >= 4} -> BobWeapons
+ [Leave] -> Town

:: BobAdmire
"Thanks! Most folks don't appreciate the details."
{do $characters.bob.affinity = $characters.bob.affinity + 1}
-> Smithy

:: BobHelp
You help pump the bellows.
"Good help is hard to find! Here, take this."
{do $characters.bob.affinity = $characters.bob.affinity + 2}
-> Smithy

:: BobWeapons
"I've been working on something special..."
He shows you a magnificent blade.
-> Smithy

:: Market
{$characters.clara.met}
"My favorite customer!"
{else}
A cheerful woman arranges her wares.
{do $characters.clara.met = true}
"Welcome! I'm Clara. Best prices in town!"
{/}

+ [Browse her wares] -> ClaraBrowse
+ [Haggle playfully] {$characters.clara.affinity >= 2} -> ClaraHaggle
+ [Ask about trade secrets] {$characters.clara.affinity >= 5} -> ClaraSecrets
+ [Leave] -> Town

:: ClaraBrowse
"Let me show you the best items!"
{do $characters.clara.affinity = $characters.clara.affinity + 1}
-> Market

:: ClaraHaggle
"You drive a hard bargain! I like that."
{do $characters.clara.affinity = $characters.clara.affinity + 1}
-> Market

:: ClaraSecrets
"The real money is in rare herbs from the forest."
**Trade tip acquired!**
-> Market

:: Relationships
**Your Relationships**

{for $char, $id in $characters}
{$char.met}
**{$char.name}** {$char.title}
Affinity: {"★".repeat($char.affinity)}{"☆".repeat(max(0, 5 - $char.affinity))} ($char.affinity/5+)
{/}
{/for}

*Visit characters to build relationships.*

+ [Back] -> Town
```

## What This Shows

- Character objects with multiple properties
- First-meeting detection
- Affinity-gated dialogue options
- Unlocking secrets at high affinity
- Visual relationship display
