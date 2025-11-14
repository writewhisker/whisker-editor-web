# Whisker Editor Analytics Guide

**Version:** 2.0
**Last Updated:** 2025-11-12

## Table of Contents

1. [Introduction](#introduction)
2. [Analytics Dashboard Overview](#analytics-dashboard-overview)
3. [Story Metrics](#story-metrics)
4. [Playthrough Recording](#playthrough-recording)
5. [Auto-Testing & Simulation](#auto-testing--simulation)
6. [Visual Analytics](#visual-analytics)
7. [Issue Detection](#issue-detection)
8. [Best Practices](#best-practices)
9. [Export & Reporting](#export--reporting)

---

## Introduction

Whisker Editor's Analytics system helps you understand and improve your interactive fiction stories through:

- **Story Metrics** - Comprehensive statistics about your story structure
- **Playthrough Recording** - Track real player behavior
- **Auto-Testing** - Automated story exploration and testing
- **Visual Analytics** - Heatmaps and graphs showing player paths
- **Issue Detection** - Find dead ends, broken links, and unreachable content

### Why Use Analytics?

Analytics help you:
- ✅ Find and fix structural issues before publishing
- ✅ Understand which paths players take most
- ✅ Optimize story balance and pacing
- ✅ Discover unused content
- ✅ Measure story complexity
- ✅ Improve player experience

---

## Analytics Dashboard Overview

### Accessing Analytics

1. Open your story in Whisker Editor
2. Click the **Analytics** tab
3. Click **🔄 Refresh** to analyze your current story

### Dashboard Tabs

#### 📊 Metrics
Shows story-wide statistics:
- Total passages, choices, variables
- Average choices per passage
- Story depth and breadth
- Complexity score
- Estimated reading time
- Reachability analysis

#### ⚠️ Issues
Lists problems found in your story:
- Dead ends (passages with no choices)
- Unreachable passages
- Broken links
- Missing choices
- Circular references

#### 📈 Playthroughs
Analyzes simulated and real player data:
- Most/least visited passages
- Average path length
- Player agency score
- Branching factor
- Critical path analysis

#### 📝 History
View recorded playthrough sessions:
- Date and duration
- Paths taken
- Choices made
- Variables at each step

---

## Story Metrics

### Basic Counts

**Total Passages**
- Number of passages in your story
- Includes start, middle, and end passages

**Total Choices**
- Sum of all choice options across all passages
- Indicates story interactivity

**Total Variables**
- Number of variables used for state tracking
- Higher count suggests more complex mechanics

### Structure Metrics

**Average Choices Per Passage**
```
Calculation: Total Choices / Total Passages
```
- **1.0-1.5**: Linear story with few branches
- **1.5-2.5**: Moderate branching
- **2.5+**: Highly branching story

**Max Depth**
- Longest possible path from start to any ending
- Measured in passage count
- Indicates story length

**Max Breadth**
- Maximum number of choices from any single passage
- Shows largest decision point

### Complexity Score (0-100)

Calculated from:
- Number of passages
- Branching factor
- Variable usage
- Conditional logic density

**Interpretation:**
- **0-20**: Simple, linear story
- **20-40**: Moderate complexity
- **40-60**: Complex branching
- **60-80**: Very complex
- **80-100**: Extremely complex (may be overwhelming)

### Estimated Reading Time

Based on:
- Total word count across all passages
- Average reading speed (200 words/minute)
- Expected path length

**Note:** Actual time varies based on player choices and reading speed.

### Reachability Analysis

**Reachable Passages**
- Passages accessible from the start
- Should be 100% in most cases

**Unreachable Passages**
- Orphaned content never visited
- Usually indicates broken links or design errors

**Dead Ends**
- Passages with no outgoing choices
- Some are intentional (endings)
- Unexpected dead ends may be errors

---

## Playthrough Recording

### Manual Recording

Test your story while recording player actions:

1. Open **Preview Mode**
2. Enable **Record Playthrough**
3. Play through your story
4. Recording automatically saves passage visits, choices, and timing

### What Gets Recorded

- **Passage Visits**: Which passages were visited and when
- **Choice Selections**: Which choices were made
- **Time Spent**: Duration on each passage
- **Variables**: State at each step
- **Path Taken**: Complete journey from start to end

### Viewing Recorded Playthroughs

1. Go to **Analytics** → **History** tab
2. Click on any playthrough to view details
3. See complete path visualization
4. Review timing and decision points

### Playthrough Data

Each recording includes:
```javascript
{
  id: "unique-id",
  timestamp: "2025-11-12T10:30:00Z",
  storyId: "your-story-id",
  storyTitle: "Your Story",
  steps: [
    {
      passageId: "passage-1",
      passageTitle: "Start",
      timestamp: "2025-11-12T10:30:00Z",
      timeSpent: 5000, // milliseconds
      choiceIndex: 0,
      choiceText: "Go left",
      variables: {score: 0, health: 100}
    },
    // ... more steps
  ]
}
```

---

## Auto-Testing & Simulation

### Running Simulations

Automatically explore your story to find issues:

1. Go to **Analytics** → **Playthroughs** tab
2. Click **▶ Run Simulation**
3. Configure simulation options:
   - **Simulations**: Number of playthroughs (default: 100)
   - **Strategy**: Path selection method
   - **Max Depth**: Maximum passages per run (default: 100)

### Simulation Strategies

**Random** (Default)
- Chooses paths randomly at each decision point
- Good for finding average player behavior
- Unbiased exploration

**Breadth-First**
- Explores unvisited passages first
- Fastest coverage
- Best for finding all content

**Depth-First**
- Goes deep before backtracking
- Finds long paths quickly
- May miss some content

**Least-Visited**
- Prioritizes rarely-visited passages
- Balances exploration
- Best for finding hidden content

### Simulation Results

After running simulations, view:

**Coverage**
- Percentage of passages visited
- Should be close to 100%
- Low coverage indicates unreachable content

**Average Path Length**
- Mean number of passages per playthrough
- Indicates story length
- Compare to expected length

**Player Agency Score** (0-1)
- Measures how much choices matter
- **0.0-0.3**: Linear story, choices don't diverge much
- **0.3-0.7**: Moderate branching
- **0.7-1.0**: Highly branching, many unique paths

**Branching Factor**
- Average number of choices per passage
- Higher = more decision points

### Auto-Testing Benefits

- ✅ Find unreachable content
- ✅ Detect dead ends
- ✅ Measure story balance
- ✅ Validate all paths work
- ✅ Test without manual playthrough

---

## Visual Analytics

### Passage Heatmap

Visualizes passage visit frequency:

1. Go to **Analytics** → **Playthroughs** tab
2. Click **🗺️ View Heatmap**
3. See color-coded passage map

**Color Legend:**
- 🔵 **Blue/Gray**: Rarely or never visited
- 🟡 **Yellow**: Moderately visited
- 🔴 **Red**: Frequently visited (hot spots)

**Interpreting the Heatmap:**
- **Hot spots**: Critical passages all players see
- **Cold spots**: Optional content or dead ends
- **Unvisited**: Likely unreachable or broken

### Usage

- Click passages for details
- Hover for quick stats
- Identify underused content
- Find bottlenecks

---

## Issue Detection

### Issue Types

#### Dead Ends ⚠️
**Severity:** Warning

Passages with no outgoing choices.

**Example:**
```
Passage: "Game Over"
Choices: (none)
```

**When OK:**
- Intentional story endings
- "The End" passages

**When Problem:**
- Unfinished passages
- Missing choices
- Logic errors

**Fix:** Add choices or mark as intentional ending

#### Unreachable Passages 🚫
**Severity:** Error

Passages never visited from start.

**Causes:**
- Broken links
- No incoming choices
- Orphaned content

**Fix:**
- Add link from reachable passage
- Remove if unused
- Check link targets

#### Broken Links 🔗
**Severity:** Error

Choices pointing to non-existent passages.

**Example:**
```
Choice: "Enter cave"
Target: "cave-interior" (doesn't exist)
```

**Fix:**
- Create missing passage
- Update choice target
- Remove broken choice

#### Missing Choices ❓
**Severity:** Warning

Passages that should have choices but don't.

**Fix:** Add at least one choice or mark as ending

#### Circular References 🔄
**Severity:** Info

Passages that link back to themselves or create small loops.

**When OK:**
- Hub passages (return to menu)
- Repeatable events

**When Problem:**
- Infinite loops
- No escape route

**Fix:** Add exit choices or limit repetitions

### Issue List

View all issues in **Analytics** → **Issues** tab:

- Sorted by severity (errors first)
- Click to navigate to passage
- See suggested fixes
- Track resolution status

---

## Best Practices

### Regular Analysis

✅ **Before Publishing**
- Run full simulation (100+ runs)
- Check for 100% coverage
- Fix all errors
- Review warnings

✅ **During Development**
- Analyze after adding new passages
- Test new branches immediately
- Keep issue count low

✅ **After Major Changes**
- Re-run simulations
- Verify old paths still work
- Check for new dead ends

### Interpreting Metrics

**Healthy Story Metrics:**
- Coverage: 95-100%
- Dead Ends: Only intentional endings
- Unreachable: 0
- Player Agency: 0.3-0.7 (depends on goals)
- Complexity: Match your target audience

**Warning Signs:**
- Coverage < 80%: Major content is unreachable
- Many dead ends: Unfinished passages
- Agency < 0.2: Too linear (if branching intended)
- Complexity > 70: May overwhelm players

### Optimization Tips

**Improve Coverage**
1. Run breadth-first simulation
2. Check heatmap for cold spots
3. Add links to unreachable passages
4. Remove truly unused content

**Balance Complexity**
1. Review complexity score
2. If too high: Merge similar paths
3. If too low: Add more choices
4. Test with target audience

**Enhance Player Agency**
1. Add meaningful choices
2. Make choices affect outcomes
3. Create unique branches
4. Avoid false choices

**Fix Dead Ends**
1. Add "Continue" choice
2. Link to related content
3. Mark intentional endings
4. Remove unfinished passages

---

## Export & Reporting

### Export Analytics Report

Generate comprehensive report:

1. Click **📥 Export Report** in Analytics Dashboard
2. Choose format:
   - **JSON**: Machine-readable data
   - **CSV**: Spreadsheet-compatible
   - **PDF**: Printable report (coming soon)

### Report Contents

**Executive Summary**
- Total passages, choices, variables
- Overall health score
- Key recommendations

**Detailed Metrics**
- All calculated metrics
- Issue breakdown
- Passage-level data

**Simulation Results**
- Coverage statistics
- Path analysis
- Visit frequencies

**Visualizations**
- Heatmap data
- Flow diagrams (coming soon)
- Charts and graphs

### Use Cases

**Team Reviews**
- Share with writers/designers
- Track progress over time
- Document story structure

**QA Testing**
- Verify all paths work
- Find edge cases
- Regression testing

**Post-Mortem**
- Analyze player behavior
- Compare intended vs. actual paths
- Learn for next project

---

## Advanced Topics

### Custom Simulation Strategies

For advanced users, simulations can be customized via API:

```javascript
import { StorySimulator } from '@whisker/analytics';

const simulator = new StorySimulator(story, seed);

const result = await simulator.simulate({
  maxSimulations: 200,
  maxDepth: 150,
  strategy: 'custom',
  customStrategy: (choices, visited) => {
    // Custom logic to choose next passage
    return choiceIndex;
  }
});
```

### Programmatic Access

Access analytics data programmatically:

```javascript
import { analyticsStore } from '@whisker/editor-base';

// Get current metrics
const metrics = analyticsStore.currentMetrics;

// Run analysis
await analyticsStore.analyzeStory(story);

// Export data
const report = analyticsStore.exportReport();
```

### Integration with CI/CD

Automate story testing in build pipelines:

```bash
# Run analytics check
whisker analyze story.json --format json > analytics.json

# Fail build if issues found
whisker analyze story.json --strict --max-issues 0
```

---

## FAQ

**Q: Why is my coverage low?**

A: Low coverage usually means:
- Unreachable passages exist
- Simulation didn't run long enough
- Complex conditions prevent access

Try:
- Increase simulation count
- Check for broken links
- Verify conditional logic

**Q: What's a good player agency score?**

A: Depends on your goals:
- Visual novel: 0.1-0.3 (mostly linear)
- Choice-based game: 0.4-0.7 (balanced)
- Open-world: 0.7-1.0 (highly branching)

**Q: Should I fix all warnings?**

A: Errors should always be fixed. Warnings depend on:
- Intentional design choices
- Story structure requirements
- Target audience expectations

**Q: How often should I run simulations?**

A: Recommended:
- After every major addition: Quick check (10-20 runs)
- Daily during active development: Full analysis (50-100 runs)
- Before publishing: Comprehensive test (200+ runs)

**Q: Can I test specific scenarios?**

A: Yes! Use manual playthrough recording to:
- Test specific paths
- Verify edge cases
- Document test cases
- Create regression tests

---

## Resources

### Further Reading

- [Story Structure Best Practices](./STORY_STRUCTURE.md)
- [Scripting Guide](./SCRIPTING_GUIDE.md)
- [Testing Interactive Fiction](./TESTING_GUIDE.md)

### Community

- [Discord Server](https://discord.gg/whisker)
- [Example Analytics Reports](https://github.com/whisker-editor/examples/analytics)
- [Best Practices Wiki](https://wiki.whisker-editor.com/analytics)

### Getting Help

- Check the **Issues** tab for specific problems
- Run simulations to find hidden issues
- Ask in Discord #analytics channel
- Review example projects

---

**Happy Analyzing!** 📊✨
