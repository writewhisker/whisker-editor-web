# Whisker Visual Editor - User Guide

**Version:** 2.0.0 (WLS 1.0)
**Last Updated:** 2025-12-30

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Interface Overview](#interface-overview)
4. [Creating Your Story](#creating-your-story)
5. [Working with Passages](#working-with-passages)
6. [Graph View](#graph-view)
7. [Variables & Logic](#variables--logic)
8. [Tags & Organization](#tags--organization)
9. [Testing Your Story](#testing-your-story)
10. [Validation & Debugging](#validation--debugging)
11. [Export & Publishing](#export--publishing)
12. [Keyboard Shortcuts](#keyboard-shortcuts)
13. [Accessibility Features](#accessibility-features)
14. [Tips & Best Practices](#tips--best-practices)
15. [Troubleshooting](#troubleshooting)

---

## Introduction

Whisker Visual Editor is a powerful, browser-based tool for creating interactive fiction and branching narratives. Whether you're writing a choose-your-own-adventure story, a narrative game, or an interactive tutorial, Whisker provides an intuitive visual interface with advanced features for complex storytelling.

### Key Features

- **Visual Graph Editor**: See your entire story structure at a glance
- **Rich Text Editing**: Format your text with markdown support
- **Variables & Logic**: Add dynamic content with conditional logic
- **Tags & Organization**: Organize passages with tags and search
- **Real-time Validation**: Catch errors before publishing
- **Story Testing**: Play through your story instantly
- **Export Options**: Export to JSON, HTML, or Markdown
- **Keyboard Shortcuts**: Efficient workflow with 23+ shortcuts
- **Accessibility**: Full keyboard navigation and screen reader support

---

## Getting Started

### Creating Your First Story

1. **Open Whisker Editor** in your web browser
2. **Create a new story** or open an existing one
3. **Start with the default passage** (automatically created as your story's beginning)
4. **Write your opening text** in the passage content area
5. **Add choices** using WLS 1.0 syntax: `+ [Choice Text] -> TargetPassage`
6. **Create connected passages** by clicking on choice links
7. **Test your story** by clicking the Play button or pressing `Ctrl+P`

### Example: Your First Interactive Story

```wls
== Welcome ==

You wake up in a mysterious forest. Two paths stretch before you.

Do you:
+ [Take the left path] -> LeftPath
+ [Take the right path] -> RightPath
```

This creates:
- A starting passage called "Welcome"
- Two once-only choices (`+`) that create new passages
- A branching narrative structure

**Choice Types:**
- `+` = Once-only choice (disappears after being selected)
- `*` = Sticky choice (always available)

---

## Interface Overview

### Main Areas

The Whisker Editor interface has four main areas:

#### 1. Passage List (Left Panel)
- **Search bar**: Find passages by name or content
- **Passage entries**: Click to select and edit
- **Status indicators**:
  - 🏠 **Start passage** (green) - Your story's beginning
  - 🔗 **Normal passage** (blue) - Connected passages
  - ⚠️ **Orphaned passage** (yellow) - Not connected to main story
  - 🚫 **Dead end** (red) - No choices lead away

#### 2. Properties Panel (Right Panel)
- **Title**: Passage name (shown in the graph)
- **Tags**: Organize and categorize passages
- **Content**: The text players will read
- **Metadata**: Word count, connections, variables

#### 3. Graph View (Center Panel)
- **Visual representation** of your story structure
- **Nodes**: Each passage is a node
- **Edges**: Lines show choice connections
- **Pan**: Click and drag to move around
- **Zoom**: Mouse wheel or `Ctrl +/-`
- **Select**: Click nodes to edit them

#### 4. Toolbar (Top)
- **Story operations**: Save, Export, Import
- **Testing tools**: Play, Validate
- **View controls**: Layout, Zoom, Filter
- **Help**: Documentation and shortcuts

---

## Creating Your Story

### Story Structure

A Whisker story is made up of:

1. **Passages**: Individual scenes or pages
2. **Choices**: Links between passages
3. **Variables**: Dynamic values that change
4. **Tags**: Labels for organization

### Best Practices for Story Structure

#### Start Simple
Begin with a linear story and add branches gradually:
```
Start -> Middle -> End
```

Then add choices:
```
Start -> Choice A -> End A
      -> Choice B -> End B
```

#### Use Meaningful Names
Good passage names:
- `ChapterOneIntro`
- `MeetTheVillain`
- `ForestEncounter`

Avoid:
- `Passage1`, `Passage2` (not descriptive)
- `asdfjkl` (meaningless)

#### Plan Your Branches
- **Parallel branches**: Different paths that don't reconnect
- **Converging branches**: Paths that join back together
- **Loops**: Passages that can be revisited

---

## Working with Passages

### Creating Passages

#### Method 1: From a Choice Link
```wls
+ [Take the left path] -> LeftPath
```
- Type this in any passage
- Click the "LeftPath" link
- A new passage is created automatically

#### Method 2: Manual Creation
- Press `Ctrl+N` or click "New Passage"
- Give it a unique name
- Connect it with choice links

### Editing Passages

#### Passage Title
- Click in the title field
- Type a unique name (no duplicates)
- Press `Ctrl+T` to focus title field

#### Passage Content
- Click in the content area
- Write your story text
- Press `Ctrl+E` to focus content field

#### Formatting Options
Whisker supports Markdown formatting:

```markdown
**bold text**
*italic text*
# Heading
## Subheading
- Bulleted list
1. Numbered list
> Blockquote
```

### Choice Links (WLS 1.0 Syntax)

WLS 1.0 uses `+` for once-only choices and `*` for sticky choices.

#### Once-Only Choice (`+`)
```wls
+ [Go to the castle] -> Castle
```
- Disappears after being selected
- Use for single-use options or to prevent repeated visits

#### Sticky Choice (`*`)
```wls
* [Look around] -> LookAround
```
- Stays available after being selected
- Use for repeatable actions

#### Conditional Choices
```wls
+ {$health > 50} [Fight the dragon] -> DragonFight
+ {$health <= 50} [Run away] -> Escape
```
- Only shows if the condition is true
- See [Variables & Logic](#variables--logic) for details

#### Choices with Actions
```wls
+ [Buy sword] {$ $gold = $gold - 50} -> Shop
```
- Action block `{$ ... }` executes when the choice is selected
- Use to modify variables when making a choice

#### Special Targets
```wls
+ [The End] -> END          -- End the story
+ [Go back] -> BACK         -- Return to previous passage
+ [Start over] -> RESTART   -- Restart story from beginning
```

### Deleting Passages

1. **Select the passage** in the list or graph
2. **Press Delete or Backspace** (or click Delete button)
3. **Confirm deletion** (this cannot be undone)

**Warning**: Deleting a passage will leave broken links in passages that reference it.

### Duplicating Passages

1. **Select the passage** you want to duplicate
2. **Press `Ctrl+D`** or click "Duplicate"
3. **A copy is created** with "(Copy)" appended to the name
4. **Edit the copy** as needed

---

## Graph View

The graph view provides a visual overview of your story's structure.

### Navigation

#### Pan
- **Click and drag** the background
- **Arrow keys** for precise movement

#### Zoom
- **Mouse wheel** to zoom in/out
- **`Ctrl +`** to zoom in
- **`Ctrl -`** to zoom out
- **`Ctrl 0`** to fit all passages in view

#### Focus on Passage
- **Click a node** to select it
- **Press `Z`** to zoom to the selected passage
- **Double-click** to select and edit

### Layout Options

#### Manual Layout
- **Drag nodes** to position them
- **Positions are saved** automatically

#### Auto-layout
- **Press `Ctrl+L`** or click "Auto-layout"
- **Hierarchical layout** arranges passages top-to-bottom
- **Useful for**: Resetting tangled graphs

### Node Colors

Nodes are colored by status:
- **Green**: Start passage
- **Blue**: Normal connected passage
- **Yellow**: Orphaned (not reachable)
- **Red**: Dead end (no choices)
- **Gray**: Selected passage

### Edge Types

Lines between nodes show connections:
- **Solid line**: Standard choice
- **Dashed line**: Conditional choice (may not appear)
- **Thicker line**: Multiple choices to same passage

---

## Variables & Logic

Variables let you create dynamic, personalized stories that remember player choices.

### Variable Scopes (WLS 1.0)

WLS 1.0 has two variable scopes:
- **Story scope (`$`)**: Persists across the entire story
- **Temp scope (`_`)**: Resets when leaving a passage

### Creating Variables

Variables are created with action blocks `{$ ... }`:
```wls
{$ $health = 100}
{$ $playerName = "Hero"}
{$ $hasKey = false}
{$ _tempCounter = 0}   -- Temporary variable (resets per passage)
```

### Variable Types

#### Numbers
```wls
{$ $health = 100}
{$ $gold = 50}
{$ $score = 0}
```

#### Text (Strings)
```wls
{$ $name = "Alice"}
{$ $title = "Knight"}
```

#### True/False (Booleans)
```wls
{$ $hasKey = true}
{$ $isAlive = false}
```

### Displaying Variables

Show variable values in your text using `$var` or `${expression}`:
```wls
Your health is $health.
Welcome back, $playerName!
You have ${gold * 2} gold coins after doubling.
```

### Modifying Variables

#### Set a Value
```wls
{$ $health = 100}
{$ $name = "Bob"}
```

#### Add/Subtract
```wls
{$ $health = $health + 10}
{$ $gold = $gold - 25}
```

### Conditional Display

Show text only if a condition is met:

#### If Statement
```wls
{$health > 50}
You feel strong and healthy.
{/}
```

#### If-Else
```wls
{$health > 50}
You feel great!
{else}
You're badly wounded.
{/}
```

#### If-Elif-Else
```wls
{$health > 75}
You're in excellent shape!
{elif $health > 50}
You're doing okay.
{elif $health > 25}
You're hurt.
{else}
You're near death!
{/}
```

### Conditional Choices

Only show choices when conditions are met:

```wls
+ {$hasKey} [Unlock the door] -> TreasureRoom
+ {$gold >= 100} [Buy the sword] -> BuySword
+ {$health > 0} [Continue fighting] -> Fight
```

### Comparison Operators

- `==` - Equal to
- `~=` - Not equal to (Lua style)
- `>` - Greater than
- `<` - Less than
- `>=` - Greater than or equal to
- `<=` - Less than or equal to

### Logical Operators

Combine conditions:

#### AND (`and`)
```wls
{$health > 50 and $hasKey}
You're healthy and you have the key!
{/}
```

#### OR (`or`)
```wls
{$isWarrior or $isRogue}
You know how to fight.
{/}
```

#### NOT (`not`)
```wls
{not $hasKey}
You need to find a key.
{/}
```

---

## Tags & Organization

Tags help organize and categorize passages in large stories.

### Adding Tags

1. **Select a passage**
2. **Click in the Tags field** (Properties panel)
3. **Type tag names** separated by spaces
4. **Press Enter** to save

Example:
```
combat action chapter1
```

### Using Tags

#### Filter by Tags
- Type `#tagname` in the search bar
- Only passages with that tag are shown
- Example: `#combat` shows all combat passages

#### Tag Conventions

Common tag uses:
- **Chapters**: `chapter1`, `chapter2`, `chapter3`
- **Locations**: `forest`, `castle`, `village`
- **Characters**: `alice`, `bob`, `villain`
- **Scene types**: `combat`, `dialogue`, `puzzle`
- **Status**: `draft`, `final`, `needsreview`

#### Multiple Tags
Combine tags for powerful organization:
```
chapter1 forest combat alice
```

### Search & Filter

The search bar supports:

#### Text Search
```
dragon
```
Finds passages containing "dragon" in title or content

#### Tag Search
```
#combat
```
Finds passages tagged with "combat"

#### Combined Search
```
#chapter1 forest
```
Finds passages tagged "chapter1" containing "forest"

---

## Testing Your Story

Test your story frequently to catch issues early.

### Play Mode

#### Starting a Test
- **Press `Ctrl+P`** or click "Play Story"
- **Story opens** in a new panel or window
- **Start passage** is shown first

#### Playing Through
- **Click choices** to navigate
- **Use browser back** to return to previous passages
- **Variables persist** during the session
- **Close** to return to editing

#### Testing Tips
1. **Test early and often**
2. **Follow each branch** to ensure all paths work
3. **Try edge cases** (what if gold = 0?)
4. **Check conditional logic** (do variables update correctly?)
5. **Verify all endings** are reachable

### Preview Panel

**Press `Ctrl+Shift+P`** to toggle preview panel:
- Shows how the current passage will look
- Updates as you type
- Useful for checking formatting
- Variables show placeholder values

---

## Validation & Debugging

Whisker automatically validates your story to catch common errors.

### Validation Panel

**Press `Ctrl+Shift+V`** to validate:
- **Errors** (red): Must be fixed before publishing
- **Warnings** (yellow): Should be reviewed
- **Info** (blue): Suggestions for improvement

### Common Validation Issues

#### Broken Links
```
❌ Error: Choice "[[Go to castle]]" targets non-existent passage "Go to castle"
```
**Fix**: Create the missing passage or fix the link name

#### Orphaned Passages
```
⚠️ Warning: Passage "OldScene" is orphaned (unreachable from start)
```
**Fix**: Add a link from another passage or delete if unused

#### Dead Ends
```
⚠️ Warning: Passage "Ending1" has no choices (dead end)
```
**Fix**: Add choices or mark as intentional ending with tag `ending`

#### Undefined Variables
```
⚠️ Warning: Variable "playerName" used before being set
```
**Fix**: Initialize the variable in an earlier passage: `{$playerName = ""}`

#### Syntax Errors
```
❌ Error: Unclosed conditional statement in passage "Combat"
```
**Fix**: Ensure every `{@condition}` has a matching `{/@}`

### Variable Inspector

View all variables in your story:
- **Name**: Variable identifier
- **Type**: Number, string, or boolean
- **First set**: Which passage creates it
- **Used in**: Which passages reference it

**Use this to**:
- Track variable names (avoid typos)
- Find unused variables
- Understand variable dependencies

---

## Export & Publishing

Export your completed story for sharing or publishing.

### Export Formats

#### JSON Export
- **Raw story data** in JSON format
- **Use for**: Backups, version control, custom players
- **File size**: Smallest option
- **Press**: Export → JSON

#### HTML Export
- **Standalone HTML file** with embedded player
- **Use for**: Web hosting, sharing, offline play
- **File size**: ~200 KB + story content
- **Press**: Export → HTML
- **Features**:
  - No server required
  - Works offline
  - Mobile-friendly
  - Saves progress automatically

#### Markdown Export
- **Human-readable text format**
- **Use for**: Documentation, review, printing
- **File size**: Medium
- **Press**: Export → Markdown
- **Features**:
  - Easy to read and edit
  - Good for collaboration
  - Can convert to other formats

### Import

#### JSON Import
- **Press**: Import → Choose File
- **Select** a previously exported JSON file
- **Story loads** (replaces current story)

**Warning**: Importing replaces your current story. Save first!

### Publishing Workflow

1. **Validate** your story (`Ctrl+Shift+V`)
2. **Fix all errors** (warnings optional)
3. **Test thoroughly** (`Ctrl+P`)
4. **Export to HTML** (for web publishing)
5. **Host online** (optional: GitHub Pages, Itch.io, Netlify)
6. **Share the link** or file

---

## Keyboard Shortcuts

Whisker provides comprehensive keyboard shortcuts for efficient editing.

### General Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save story |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+F` | Search passages |
| `?` | Show keyboard shortcuts help |

### Navigation Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+1` | Focus passage list |
| `Alt+2` | Focus properties panel |
| `Alt+3` | Focus graph view |
| `J` or `↓` | Select next passage |
| `K` or `↑` | Select previous passage |

### Editing Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | Create new passage |
| `Delete` or `Backspace` | Delete selected passage |
| `Ctrl+D` | Duplicate selected passage |
| `Ctrl+T` | Focus passage title |
| `Ctrl+E` | Focus passage content |

### Graph Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl++` | Zoom in graph |
| `Ctrl+-` | Zoom out graph |
| `Ctrl+0` | Fit graph to view |
| `Z` | Zoom to selected passage |
| `Ctrl+L` | Auto-layout graph |

### Testing Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+P` | Play story from start |
| `Ctrl+Shift+V` | Validate story |
| `Ctrl+Shift+P` | Toggle preview panel |

### Customizing Shortcuts

Currently, shortcuts are fixed. Future versions will support customization.

---

## Accessibility Features

Whisker is designed to be accessible to all users.

### Keyboard Navigation

**Every feature is accessible via keyboard**:
- Tab through interactive elements
- Arrow keys navigate lists
- Enter/Space activate buttons
- Escape closes modals

### Screen Reader Support

**Full screen reader compatibility**:
- ARIA labels on all interactive elements
- Status announcements for actions
- Meaningful heading structure
- Alternative text for icons

#### Recommended Screen Readers
- **Windows**: NVDA (free), JAWS
- **macOS**: VoiceOver (built-in)
- **Linux**: Orca

### Visual Accessibility

**High contrast mode**:
- Detected automatically from system preferences
- High-visibility focus indicators
- Color contrast meets WCAG AA standards

**Motion preferences**:
- Animations disabled if system prefers reduced motion
- No auto-playing animations
- All motion can be disabled

### Cognitive Accessibility

**Clear, consistent interface**:
- Predictable behavior
- Simple, focused workflows
- Error messages provide solutions
- Keyboard shortcuts help modal

---

## Tips & Best Practices

### Writing Tips

#### Keep Passages Short
- **Aim for**: 100-300 words per passage
- **Players prefer**: Frequent choices over long text blocks
- **Break up**: Long scenes into multiple passages

#### Meaningful Choices
Good choices:
- ✅ "Fight the dragon" vs "Negotiate with the dragon"
- ✅ "Search the room" vs "Leave immediately"

Avoid:
- ❌ "Choice A" vs "Choice B" (meaningless)
- ❌ "Yes" vs "No" (context unclear)

#### Variable Names
Good names:
- ✅ `playerHealth`, `goldCoins`, `hasKey`

Avoid:
- ❌ `x`, `temp`, `var1` (unclear purpose)
- ❌ `PlAyErHeLtH` (hard to read)

### Organization Tips

#### Use a Naming Convention
Examples:
- `Ch1_Scene1_ForestEntrance`
- `forest_entrance`
- `01-01-ForestEntrance`

#### Tag Consistently
- Decide on tag names early
- Use lowercase for consistency
- Document your tagging system

#### Group Related Passages
- Keep related passages close in the graph
- Use manual layout for clarity
- Consider creating "hub" passages

### Performance Tips

#### For Large Stories (500+ passages)

1. **Use tags extensively** for filtering
2. **Hide unused passages** with search
3. **Break into chapters** (separate story files)
4. **Minimize variables** (use only what's needed)
5. **Regular validation** to catch issues early

### Testing Tips

#### Create Test Passages
```wls
== Test Passage ==
Test variables:
{$ $health = 50}
{$ $gold = 100}
{$ $hasKey = true}

+ [Go to scene] -> ActualScene
```

#### Use Variable Inspector
- Review all variables regularly
- Check for typos in variable names
- Remove unused variables

#### Beta Testing
- Have others play your story
- Watch for confusion points
- Test on different devices

---

## Troubleshooting

### Common Issues

#### "I can't find a passage I just created"
**Solution**: Check if a search filter is active. Clear the search bar.

#### "My choices don't show up when testing"
**Solution**: Check if they're wrapped in a false conditional:
```wls
+ {$hasKey} [Open door] -> Room  -- Only shows if $hasKey is true
```

#### "Variables aren't updating"
**Solution**:
1. Check syntax: `{$ $health = 100}` not `$health = 100`
2. Verify the passage is actually visited
3. Use Variable Inspector to debug

#### "Graph is too cluttered"
**Solution**:
1. Press `Ctrl+L` for auto-layout
2. Use tags to filter passages
3. Manually arrange nodes
4. Consider splitting into multiple story files

#### "Story won't export"
**Solution**:
1. Run validation (`Ctrl+Shift+V`)
2. Fix all errors (red items)
3. Try again

#### "Link syntax isn't working"
**Solution**: Check WLS 1.0 syntax carefully:
- ✅ `+ [Choice text] -> PassageName`
- ✅ `* [Choice text] -> PassageName`
- ❌ `[[Choice text -> PassageName]]` (old syntax)
- ❌ `+ Choice text -> PassageName` (missing brackets around text)

### Getting Help

#### Documentation
- **User Guide**: This document
- **Keyboard Shortcuts**: Press `?` in the editor
- **Code Reference**: See developer documentation

#### Reporting Bugs
If you encounter a bug:
1. Note what you were doing
2. Check if it's reproducible
3. Report with steps to reproduce
4. Include browser version

#### Feature Requests
Have an idea for improvement? Let us know!

---

## Appendix: Quick Reference (WLS 1.0)

### Passage Syntax
```wls
== PassageName ==                   -- Passage header
== PassageName == [tag1, tag2]      -- With tags
```

### Choice Link Syntax
```wls
+ [Choice text] -> PassageName      -- Once-only choice
* [Choice text] -> PassageName      -- Sticky choice
+ {cond} [Choice] -> Target         -- Conditional choice
+ [Choice] {$ action} -> Target     -- Choice with action
+ [The End] -> END                  -- End story
+ [Go back] -> BACK                 -- Go to previous passage
+ [Restart] -> RESTART              -- Restart story
```

### Variable Syntax
```wls
$var                                -- Story-scoped variable
_var                                -- Temp-scoped variable
${expression}                       -- Expression interpolation
{$ $var = value}                    -- Set variable (action block)
```

### Conditional Syntax
```wls
{condition}                         -- If block
  Content
{/}

{condition}                         -- If-else block
  True content
{else}
  False content
{/}

{condition1}                        -- If-elif-else block
  Content 1
{elif condition2}
  Content 2
{else}
  Default
{/}
```

### Operators
- Comparison: `==`, `~=`, `>`, `<`, `>=`, `<=`
- Logical: `and`, `or`, `not`
- Arithmetic: `+`, `-`, `*`, `/`, `%`

---

**Need more help?** Press `?` in the editor for keyboard shortcuts, or consult the developer documentation for advanced features.

**Happy storytelling!** 🎭
