# Mystery Game

A detective story with clues and suspects.

## Code

```whisker
@title: The Manor Murder
@author: Whisker Examples

:: Start
{do $clues = []}
{do $suspects = {
  butler: { name: "Mr. Hopkins", interviewed: false, motive: false },
  maid: { name: "Lady Sarah", interviewed: false, motive: false },
  gardener: { name: "Old Thomas", interviewed: false, motive: false }
}}
{do $accusation = ""}

**THE MANOR MURDER**

Lord Ashworth has been found dead in his study.
As the detective, you must find the killer.

*You have one chance to accuse someone. Choose wisely.*

+ [Enter the manor] -> Entrance

:: Entrance
**Manor Entrance**

The grand hall stretches before you.
A constable nods as you enter.

"Three people were in the house last night, Detective."

+ [Go to the study (crime scene)] -> Study
+ [Interview the butler] -> InterviewButler
+ [Interview the maid] -> InterviewMaid  
+ [Interview the gardener] -> InterviewGardener
+ [Review clues] {#$clues > 0} -> ReviewClues
+ [Make an accusation] {#$clues >= 3} -> Accusation

:: Study
**The Study**

Lord Ashworth lies slumped over his desk.
A letter opener protrudes from his back.

{not $clues.includes("murder_weapon")}
You examine the letter opener carefully.
*It's an antique silver piece from the garden shed.*
{do $clues.push("murder_weapon")}
**Clue found: Murder weapon from garden shed**
{/}

{not $clues.includes("torn_note")}
A torn note lies under the body.
*"...can't let you change the will..."*
{do $clues.push("torn_note")}
**Clue found: Note about the will**
{/}

+ [Search the desk] -> SearchDesk
+ [Back to entrance] -> Entrance

:: SearchDesk
{not $clues.includes("will_draft")}
You find a draft of a new will.
*Lord Ashworth was planning to disinherit someone...*
{do $clues.push("will_draft")}
**Clue found: New will draft**
{else}
Nothing else of interest.
{/}

+ [Back] -> Study

:: InterviewButler
**Interview: Mr. Hopkins (Butler)**

{$suspects.butler.interviewed}
"I've told you everything I know, Detective."
{else}
{do $suspects.butler.interviewed = true}
"I served Lord Ashworth for 30 years."
"Last night, I heard arguing from the study around midnight."
"It was a woman's voice, I'm certain."

{not $clues.includes("butler_testimony")}
{do $clues.push("butler_testimony")}
**Clue found: Butler heard a woman arguing**
{/}
{/}

+ [Ask about the will] {$clues.includes("will_draft")} -> ButlerWill
+ [Back] -> Entrance

:: ButlerWill
"The new will? Yes, I knew about it."
"Lady Sarah was... upset when she found out."
"She was to be removed from the inheritance entirely."
{do $suspects.maid.motive = true}
**Insight: Lady Sarah had motive**
+ [Back] -> Entrance

:: InterviewMaid
**Interview: Lady Sarah (Maid)**

{$suspects.maid.interviewed}
"Please, I had nothing to do with this!"
{else}
{do $suspects.maid.interviewed = true}
"I've worked here only two years."
"Lord Ashworth was kind to me... like a father."
"I was in the kitchen all evening, I swear!"
{/}

+ [Ask about the will] {$clues.includes("will_draft")} -> MaidWill
+ [Ask about the argument] {$clues.includes("butler_testimony")} -> MaidArgument
+ [Back] -> Entrance

:: MaidWill
She grows pale.
"The will? I... I don't know anything about that."
*She's clearly lying.*
+ [Back] -> InterviewMaid

:: MaidArgument
"Arguing? No, I wasn't... I mean..."
She bursts into tears.
"Fine! Yes, I argued with him. But I didn't kill him!"
"When I left, he was alive!"
+ [Back] -> Entrance

:: InterviewGardener
**Interview: Old Thomas (Gardener)**

{$suspects.gardener.interviewed}
"Don't know nothing more, Detective."
{else}
{do $suspects.gardener.interviewed = true}
"Been the gardener here for 15 years."
"Heard a commotion round midnight, I did."
"Saw Lady Sarah running from the study, crying."
"Then I heard a door slam."
{/}

+ [Ask about the letter opener] {$clues.includes("murder_weapon")} -> GardenerWeapon
+ [Back] -> Entrance

:: GardenerWeapon
"That letter opener? Aye, it's from my shed."
"Anyone could've taken it. Door's never locked."
"But... I did see Mr. Hopkins near the shed yesterday evening."
{do $suspects.butler.motive = true}
**Insight: Butler was near the murder weapon**
+ [Back] -> Entrance

:: ReviewClues
**Evidence Collected:**

{for $clue in $clues}
- $clue
{/for}

**Suspect Insights:**
{$suspects.butler.motive}
- Mr. Hopkins had access to the weapon
{/}
{$suspects.maid.motive}
- Lady Sarah had motive (the will)
{/}

+ [Back] -> Entrance

:: Accusation
**Time to make your accusation.**

Who murdered Lord Ashworth?

+ [Accuse Mr. Hopkins (Butler)] {do $accusation = "butler"} -> Verdict
+ [Accuse Lady Sarah (Maid)] {do $accusation = "maid"} -> Verdict
+ [Accuse Old Thomas (Gardener)] {do $accusation = "gardener"} -> Verdict
+ [I need more clues] -> Entrance

:: Verdict
{$accusation == "butler"}
-> VerdictButler
{elif $accusation == "maid"}
-> VerdictMaid
{else}
-> VerdictGardener
{/}

:: VerdictButler
**"Mr. Hopkins, you are under arrest!"**

The butler sighs heavily.

"Very clever, Detective. Yes, I did it."
"Thirty years of service, and he was going to leave everything to *her*."
"I took the letter opener, waited for Sarah to leave..."
"I couldn't let him destroy the family legacy."

**CASE SOLVED!**
You correctly identified the murderer.

The butler had access to the weapon and couldn't accept the new will.
Lady Sarah's argument was the perfect cover.

-> END

:: VerdictMaid
**"Lady Sarah, you are under arrest!"**

She protests violently, but is taken away.

Later, the real killer strikes again...

**WRONG ANSWER**

While Lady Sarah had motive and argued with the victim,
the butler was the true killer.

+ [Try again] -> Start

:: VerdictGardener
**"Old Thomas, you are under arrest!"**

The old man looks confused.

"But... I didn't do nothing!"

Later, the real killer is found and Thomas is released.

**WRONG ANSWER**

Old Thomas had no motive and was just a witness.
The butler was the true killer.

+ [Try again] -> Start
```

## What This Shows

- Mystery/detective game structure
- Clue collection system
- Suspect interview mechanics
- Evidence-based deduction
- Multiple endings based on accusation
- Interconnected testimonies
