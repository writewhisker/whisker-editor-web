# Visual Novel

A story-driven game with character relationships.

## Code

```whisker
@title: First Day at Silverpine Academy
@author: Whisker Examples
@theme: light

:: Start
{do $playerName = "Alex"}
{do $day = 1}
{do $relationships = {
  maya: { name: "Maya Chen", affinity: 0, route: false },
  luke: { name: "Luke Rodriguez", affinity: 0, route: false },
  sage: { name: "Sage Williams", affinity: 0, route: false }
}}
{do $stats = {
  academics: 0,
  social: 0,
  creativity: 0
}}

---

**FIRST DAY AT SILVERPINE ACADEMY**

*A Visual Novel*

---

+ [Begin Story] -> Prologue

:: Prologue
*The bus pulls up to the grand gates of Silverpine Academy.*

**$playerName**: (thinking) *This is it. My new school.*

The prestigious academy towers before you, its gothic architecture
both intimidating and beautiful. Students in crisp uniforms walk
the grounds, chatting and laughing.

+ [Take a deep breath and enter] -> MainGate

:: MainGate
You step through the gates, bag slung over your shoulder.

Immediately, someone bumps into you from behind.

**???**: "Oh! I'm so sorry!"

You turn to see a girl with paint-stained fingers and 
a sketchbook clutched to her chest.

**???**: "Are you new here? I'm Maya!"

{do $relationships.maya.affinity = $relationships.maya.affinity + 1}

+ [Smile warmly] "Nice to meet you, Maya!" -> MayaWarm
+ [Nod politely] "Yes, I'm new." -> MayaPolite

:: MayaWarm
{do $relationships.maya.affinity = $relationships.maya.affinity + 2}

Maya's face lights up.

**Maya**: "Oh, you seem nice! Want me to show you around?"

Before you can answer, a boy jogs up.

**???**: "Maya! There you are. Coach is looking for... oh."

He notices you and grins.

**???**: "New kid? I'm Luke. Welcome to Silverpine!"

{do $relationships.luke.affinity = $relationships.luke.affinity + 1}

-> FirstChoice

:: MayaPolite
**Maya**: "Well, welcome to Silverpine!"

A boy approaches.

**Luke**: "Maya, Coach needs you. Oh, hey—new student?"

{do $relationships.luke.affinity = $relationships.luke.affinity + 1}

-> FirstChoice

:: FirstChoice
The morning bell rings.

**Luke**: "Gotta run! See you around!"

**Maya**: "I should go too. But find me at lunch, okay?"

They dash off, leaving you alone.

A figure leans against a nearby tree, reading. They glance up,
meeting your eyes briefly, then return to their book.

+ [Approach the mysterious reader] -> MeetSage
+ [Head to class] -> FirstClass

:: MeetSage
You walk over to the person under the tree.

**$playerName**: "Hi, I'm new here. Mind if I ask for directions?"

They look up. Sharp eyes study you.

**Sage**: "...The main building is that way."

A pause.

**Sage**: "I'm Sage. You looked lost."

{do $relationships.sage.affinity = $relationships.sage.affinity + 2}

+ [Thank them genuinely] -> SageThank
+ [Ask about their book] -> SageBook

:: SageThank
**$playerName**: "Thanks, Sage. I appreciate it."

They nod, a ghost of a smile crossing their face.

**Sage**: "...Good luck on your first day."

{do $relationships.sage.affinity = $relationships.sage.affinity + 1}

-> FirstClass

:: SageBook
**$playerName**: "What are you reading?"

**Sage**: "...Philosophy of Mind. Do you read?"

{do $stats.academics = $stats.academics + 1}

+ [Yes, all the time] -> SageReadYes
+ [Not really] -> SageReadNo

:: SageReadYes
{do $relationships.sage.affinity = $relationships.sage.affinity + 2}

**Sage**: "Hmm. Perhaps we could discuss books sometime."

They almost smile.

-> FirstClass

:: SageReadNo
**Sage**: "I see."

They return to their book, but there's no judgment in their expression.

-> FirstClass

:: FirstClass
*Your first class is English Literature.*

The teacher, Ms. Park, welcomes you warmly.

During class discussion, you have a chance to participate.

+ [Share a thoughtful analysis] -> ClassAcademic
+ [Stay quiet and observe] -> ClassObserve
+ [Make a funny comment] -> ClassSocial

:: ClassAcademic
{do $stats.academics = $stats.academics + 2}

**Ms. Park**: "Excellent observation! Class, this is exactly 
the kind of critical thinking we need."

Some students look impressed. Sage, sitting in the corner,
raises an eyebrow in what might be approval.

{do $relationships.sage.affinity = $relationships.sage.affinity + 1}

-> Lunch

:: ClassObserve
You take careful notes and observe how the class works.
*Better to understand the environment first.*

-> Lunch

:: ClassSocial
{do $stats.social = $stats.social + 2}

**$playerName**: "Maybe the author was just having a bad day?"

The class laughs. Luke, a few seats over, gives you a thumbs up.

{do $relationships.luke.affinity = $relationships.luke.affinity + 1}

-> Lunch

:: Lunch
*The lunch bell rings.*

**Day $day - Lunch Time**

You enter the cafeteria. It's crowded and loud.

You spot:
- Maya waving from the art club table
- Luke with the sports team
- Sage alone in a quiet corner

+ [Join Maya] -> LunchMaya
+ [Join Luke] -> LunchLuke
+ [Join Sage] -> LunchSage
+ [Sit alone] -> LunchAlone

:: LunchMaya
{do $relationships.maya.affinity = $relationships.maya.affinity + 2}
{do $stats.creativity = $stats.creativity + 1}

Maya beams as you sit down.

**Maya**: "You came! Look at my latest sketch!"

She shows you a beautiful watercolor of the academy.

**$playerName**: "This is amazing, Maya."

**Maya**: "Thanks! Art is my whole world. What about you—
what do you love?"

*You spend lunch discussing art and creativity.*

-> AfterLunch

:: LunchLuke
{do $relationships.luke.affinity = $relationships.luke.affinity + 2}
{do $stats.social = $stats.social + 1}

**Luke**: "Hey, new kid! Sit with us!"

The sports team welcomes you warmly. They're loud and fun.

**Luke**: "So, you play any sports?"

+ [I love sports!] -> LukeSportsYes
+ [Not really my thing] -> LukeSportsNo

:: LukeSportsYes
{do $relationships.luke.affinity = $relationships.luke.affinity + 1}

**Luke**: "Awesome! You should try out for the team!"

-> AfterLunch

:: LukeSportsNo
**Luke**: "That's cool. There's room for everyone here."

He grins, completely unbothered.

-> AfterLunch

:: LunchSage
{do $relationships.sage.affinity = $relationships.sage.affinity + 2}
{do $stats.academics = $stats.academics + 1}

Sage looks surprised when you sit across from them.

**Sage**: "...You're sitting here?"

**$playerName**: "If that's okay?"

A long pause.

**Sage**: "...It's fine."

You sit in comfortable silence, occasionally discussing the book.

-> AfterLunch

:: LunchAlone
You find a quiet table and eat alone.

*It's been an overwhelming first day. Maybe tomorrow.*

-> AfterLunch

:: AfterLunch
*The final bell rings.*

**Day $day Complete**

You head toward the dorms as the sun sets.

**Relationship Status:**
- Maya: {$relationships.maya.affinity > 3 ? "★★★" : $relationships.maya.affinity > 1 ? "★★" : "★"}
- Luke: {$relationships.luke.affinity > 3 ? "★★★" : $relationships.luke.affinity > 1 ? "★★" : "★"}
- Sage: {$relationships.sage.affinity > 3 ? "★★★" : $relationships.sage.affinity > 1 ? "★★" : "★"}

**Stats:**
- Academics: $stats.academics
- Social: $stats.social
- Creativity: $stats.creativity

+ [End of Demo] -> DemoEnd

:: DemoEnd
**DEMO END**

Thank you for playing the first day of
*First Day at Silverpine Academy*!

In the full version, continue building relationships,
make choices that matter, and discover multiple endings.

*Who will you become closest to?*

+ [Play again] -> Start
+ [Exit] -> END
```

## What This Shows

- Visual novel narrative structure
- Character relationship tracking
- Stat-building system
- Character introduction scenes
- Dialogue-heavy storytelling
- Affinity-based relationship display
- Multiple paths based on choices
