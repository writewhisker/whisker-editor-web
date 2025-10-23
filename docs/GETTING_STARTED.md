# Getting Started with Whisker Visual Editor

**Welcome!** This guide will help you create your first interactive story in 10 minutes.

---

## What is Whisker?

Whisker Visual Editor is a tool for creating **interactive stories** (also called "interactive fiction" or "branching narratives"). Think of it like a choose-your-own-adventure book, but for the web.

---

## Your First Story: "The Cave"

Let's create a simple interactive story together.

### Step 1: Open the Editor

1. Open Whisker in your web browser
2. You'll see a default passage called "Start"
3. This is where your story begins!

### Step 2: Write Your Opening

Click in the **content area** (right panel) and type:

```
You stand at the entrance of a dark cave. A faint glow
emanates from deep within.

What do you do?

[[Enter the cave -> Inside]]
[[Walk away -> Leave]]
```

**What just happened?**
- You wrote some story text
- You created two choices for the player
- The text in `[[brackets]]` creates clickable links

### Step 3: Create the "Inside" Passage

1. Click on the `[[Enter the cave -> Inside]]` link
2. A new passage called "Inside" is created
3. Write in the new passage:

```
You step into the cave. It's cold and damp. The glow
is coming from a pile of gold coins!

[[Take the gold -> TakeGold]]
[[Leave it alone -> LeaveGold]]
```

### Step 4: Create the Other Passages

Repeat step 3 for each passage:

**"Leave" passage:**
```
You decide it's not worth the risk. As you walk away,
you wonder what might have been inside...

THE END
```

**"TakeGold" passage:**
```
You fill your pockets with gold coins. Suddenly, you
hear a roar from deeper in the cave...

A dragon appears! What do you do?

[[Fight -> FightDragon]]
[[Run -> RunAway]]
```

**"LeaveGold" passage:**
```
You resist the temptation. As you turn to leave, you
notice a hidden passage behind the gold.

[[Explore the passage -> SecretExit]]
```

Add as many passages as you want!

### Step 5: View Your Story Structure

1. Look at the **center panel** (the graph view)
2. You'll see your story as connected nodes
3. Click and drag to move nodes around
4. Scroll to zoom in/out

### Step 6: Test Your Story

1. Press **`Ctrl+P`** (or click "Play Story")
2. Your story opens in a new panel
3. Click choices to play through
4. Try different paths!

### Step 7: Save Your Story

Press **`Ctrl+S`** to save your work.

---

## Congratulations!

You've created your first interactive story! 🎉

---

## What's Next?

### Add Variables

Make your story remember player choices:

```
{$tookGold = true}

You took the gold from the cave.
```

Later in your story:
```
{@tookGold}
The shopkeeper recognizes the coins. "Where did you get these?"
{/@}
```

### Add Tags

Organize your passages:
1. Select a passage
2. In the **Tags** field (right panel), type: `chapter1 cave`
3. Use tags to filter: type `#cave` in the search bar

### Validate Your Story

Press **`Ctrl+Shift+V`** to check for errors:
- ❌ **Errors**: Must fix (broken links, syntax errors)
- ⚠️ **Warnings**: Should review (orphaned passages, dead ends)
- ℹ️ **Info**: Nice to know (suggestions)

### Export Your Story

When finished:
1. Click **Export** → **HTML**
2. You get a standalone file you can share
3. It works offline and needs no server!

---

## Key Concepts

### Passages
- Individual "pages" or scenes in your story
- Connected by choice links
- Can be as short or long as you want

### Choices
The basic syntax:
```
[[Choice text -> PassageName]]
```

Examples:
```
[[Go north -> NorthRoom]]
[[Talk to the guard -> GuardDialog]]
[[Open the chest -> ChestContents]]
```

### The Graph
- **Nodes**: Each passage
- **Lines**: Choice connections
- **Colors**:
  - 🟢 Green = Start passage
  - 🔵 Blue = Normal passage
  - 🟡 Yellow = Orphaned (unreachable)
  - 🔴 Red = Dead end (no choices)

---

## Tips for Beginners

### 1. Start Small
- Create 5-10 passages first
- Test frequently
- Add more once you're comfortable

### 2. Use Meaningful Names
Good: `ForestEntrance`, `MeetWizard`, `CaveInterior`
Bad: `Passage1`, `asdf`, `x`

### 3. Test Every Branch
- Play through each possible path
- Make sure all choices work
- Check that endings make sense

### 4. Keep Passages Short
- 100-300 words per passage is ideal
- Players prefer frequent choices
- Long text blocks are tiring

### 5. Make Choices Meaningful
Good choices:
- "Fight the dragon" vs "Negotiate"
- "Search the room" vs "Leave immediately"

Avoid meaningless choices:
- "Yes" vs "No" (without context)
- "Door 1" vs "Door 2" (no reason to prefer either)

---

## Common Beginner Questions

### Q: How do I delete a passage?
**A:** Select it and press `Delete` or `Backspace`

### Q: Can I rename a passage?
**A:** Yes! Click in the title field and type a new name. Links automatically update.

### Q: What if I break something?
**A:** Press `Ctrl+Z` to undo. Whisker saves automatically.

### Q: How many passages can I create?
**A:** Thousands! Whisker handles large stories efficiently.

### Q: Can I add images or sounds?
**A:** Not in the current version. Focus on text for now.

### Q: Do I need to know programming?
**A:** No! The basics (passages and choices) require no programming. Variables and conditionals are optional advanced features.

---

## Keyboard Shortcuts (Essential)

| Shortcut | What it does |
|----------|--------------|
| `Ctrl+S` | Save |
| `Ctrl+Z` | Undo |
| `Ctrl+P` | Play/test story |
| `Ctrl+N` | New passage |
| `Ctrl+F` | Search |
| `?` | Show all shortcuts |

*Mac users: Replace `Ctrl` with `Cmd`*

---

## Example Story Templates

### Linear Story (Beginner)
```
Start → Middle → End
```
Just link passages in a sequence.

### Branching Story (Intermediate)
```
      ┌→ Path A → End A
Start →│
      └→ Path B → End B
```
Choices lead to different endings.

### Converging Story (Intermediate)
```
      ┌→ Path A ┐
Start →│        ├→ Climax → End
      └→ Path B ┘
```
Different paths, same ending.

### Open World (Advanced)
```
        ↕
    ←Hub→
        ↕
```
A central passage with many exits, forming a network.

---

## Need More Help?

- **Full Documentation**: See [User Guide](USER_GUIDE.md)
- **Keyboard Shortcuts**: See [Shortcuts Reference](KEYBOARD_SHORTCUTS.md)
- **In-App Help**: Press `?` in the editor

---

## Your Turn!

Now it's time to create your own story:
1. Think of a simple scenario (forest, spaceship, school, etc.)
2. Write an opening passage
3. Add 2-3 choice branches
4. Test it
5. Expand from there!

**Happy storytelling!** 🎭

---

*Remember: Every great story starts with a single passage. Just start writing!*
