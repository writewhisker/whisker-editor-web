# @writewhisker/analytics

Story analytics and playthrough recording for Whisker interactive fiction.

## Features

- **Session Tracking**: Track player sessions with unique IDs and timestamps
- **Playthrough Recording**: Record complete playthroughs with passage visits and choices
- **Event-Based**: Track custom events (session start/end, passage visits, choices, etc.)
- **Player Metrics**: Calculate engagement metrics like completion rate, average session duration
- **Choice Analytics**: Analyze which choices players make most frequently
- **Passage Popularity**: Track which passages are visited most often
- **Framework Agnostic**: Works with any UI framework
- **Type-Safe**: Full TypeScript support
- **Zero Dependencies**: Minimal package with only @writewhisker/core-ts

## Installation

```bash
pnpm add @writewhisker/analytics
```

## Quick Start

```typescript
import { AnalyticsTracker } from '@writewhisker/analytics';
import { Story } from '@writewhisker/core-ts';

// Create tracker
const tracker = new AnalyticsTracker();

// Track session start
tracker.track({
  type: 'session_start',
  sessionId: 'session-123',
  timestamp: Date.now(),
  storyId: story.id,
});

// Track passage visit
tracker.track({
  type: 'passage_visit',
  sessionId: 'session-123',
  timestamp: Date.now(),
  passageId: 'passage-1',
  passageName: 'Introduction',
});

// Track choice made
tracker.track({
  type: 'choice_made',
  sessionId: 'session-123',
  timestamp: Date.now(),
  passageId: 'passage-1',
  choiceIndex: 0,
  choiceText: 'Go north',
  targetPassageId: 'passage-2',
});

// Track session end
tracker.track({
  type: 'session_end',
  sessionId: 'session-123',
  timestamp: Date.now(),
});

// Get analytics
const analytics = tracker.getAnalytics(story.id);
console.log('Total sessions:', analytics.totalSessions);
console.log('Average duration:', analytics.avgDuration);
console.log('Completion rate:', analytics.completionRate);
```

## Core Concepts

### Events

The tracker supports the following event types:

#### `session_start`
```typescript
{
  type: 'session_start',
  sessionId: string,
  timestamp: number,
  storyId: string,
  metadata?: Record<string, any>
}
```

#### `session_end`
```typescript
{
  type: 'session_end',
  sessionId: string,
  timestamp: number,
  metadata?: Record<string, any>
}
```

#### `passage_visit`
```typescript
{
  type: 'passage_visit',
  sessionId: string,
  timestamp: number,
  passageId: string,
  passageName: string,
  metadata?: Record<string, any>
}
```

#### `choice_made`
```typescript
{
  type: 'choice_made',
  sessionId: string,
  timestamp: number,
  passageId: string,
  choiceIndex: number,
  choiceText: string,
  targetPassageId?: string,
  metadata?: Record<string, any>
}
```

#### `variable_changed`
```typescript
{
  type: 'variable_changed',
  sessionId: string,
  timestamp: number,
  variableName: string,
  oldValue: any,
  newValue: any,
  metadata?: Record<string, any>
}
```

#### `custom`
```typescript
{
  type: 'custom',
  sessionId: string,
  timestamp: number,
  eventName: string,
  data?: Record<string, any>
}
```

### Analytics Metrics

The `getAnalytics()` method returns comprehensive metrics:

```typescript
interface StoryAnalytics {
  storyId: string;
  totalSessions: number;
  totalEvents: number;
  completionRate: number;        // % of sessions that reached an ending
  avgDuration: number;            // Average session duration in ms
  avgPassagesVisited: number;     // Average passages per session
  popularPassages: Array<{        // Most visited passages
    passageId: string;
    passageName: string;
    visits: number;
  }>;
  popularChoices: Array<{         // Most selected choices
    passageId: string;
    choiceIndex: number;
    choiceText: string;
    count: number;
  }>;
  sessionTimeline: Array<{        // Session distribution over time
    date: string;
    count: number;
  }>;
}
```

## Advanced Usage

### Playthrough Recording

Record complete playthroughs for review:

```typescript
import { PlaythroughRecorder } from '@writewhisker/analytics';

const recorder = new PlaythroughRecorder();

// Start recording
const playthroughId = recorder.startPlaythrough({
  storyId: story.id,
  storyTitle: story.metadata.title,
  timestamp: Date.now(),
});

// Record passage visits
recorder.recordPassage(playthroughId, {
  passageId: 'intro',
  passageName: 'Introduction',
  timestamp: Date.now(),
});

// Record choices
recorder.recordChoice(playthroughId, {
  passageId: 'intro',
  choiceIndex: 0,
  choiceText: 'Begin adventure',
  targetPassageId: 'chapter-1',
  timestamp: Date.now(),
});

// End playthrough
recorder.endPlaythrough(playthroughId, {
  timestamp: Date.now(),
  completed: true,
});

// Get playthrough
const playthrough = recorder.getPlaythrough(playthroughId);
console.log('Passages visited:', playthrough.passages.length);
console.log('Choices made:', playthrough.choices.length);
console.log('Duration:', playthrough.duration);
```

### Export Analytics

Export analytics data for analysis:

```typescript
// Export as JSON
const data = tracker.exportData(story.id);
console.log(JSON.stringify(data, null, 2));

// Export as CSV
const csv = tracker.exportCSV(story.id);
console.log(csv);

// Export specific event types
const sessionData = tracker.getEvents(story.id, 'session_start');
```

### Filter and Query

Filter events by time range or criteria:

```typescript
// Get events in date range
const last7Days = Date.now() - (7 * 24 * 60 * 60 * 1000);
const recentEvents = tracker.getEvents(story.id, null, {
  startTime: last7Days,
  endTime: Date.now(),
});

// Get events for specific session
const sessionEvents = tracker.getSessionEvents('session-123');

// Get passage visit count
const visits = tracker.getPassageVisits(story.id, 'passage-1');
```

### Integration with Storage

Save analytics to persistent storage:

```typescript
import { AnalyticsTracker } from '@writewhisker/analytics';
import { createIndexedDBStorage } from '@writewhisker/storage';

const tracker = new AnalyticsTracker();
const storage = createIndexedDBStorage();

// Export and save
async function saveAnalytics(storyId: string) {
  const data = tracker.exportData(storyId);
  await storage.saveAnalytics(storyId, data);
}

// Load and restore
async function loadAnalytics(storyId: string) {
  const data = await storage.loadAnalytics(storyId);
  tracker.importData(data);
}
```

## Use Cases

### Authoring Tool Analytics

Track how testers play your story:

```typescript
// In your story player
player.on('passageEntered', (passage) => {
  tracker.track({
    type: 'passage_visit',
    sessionId: currentSession,
    timestamp: Date.now(),
    passageId: passage.id,
    passageName: passage.name,
  });
});

player.on('choiceMade', (choice, passage) => {
  tracker.track({
    type: 'choice_made',
    sessionId: currentSession,
    timestamp: Date.now(),
    passageId: passage.id,
    choiceIndex: choice.index,
    choiceText: choice.text,
    targetPassageId: choice.targetPassageId,
  });
});

// View analytics dashboard
const analytics = tracker.getAnalytics(story.id);
console.log(`Completion rate: ${analytics.completionRate}%`);
console.log(`Average playtime: ${analytics.avgDuration / 1000}s`);
```

### A/B Testing

Test different story variations:

```typescript
// Track which variation players see
tracker.track({
  type: 'custom',
  sessionId: currentSession,
  timestamp: Date.now(),
  eventName: 'variation_assigned',
  data: {
    variation: 'B',
    passageId: 'test-passage',
  },
});

// Compare completion rates
const variationA = tracker.getEvents(story.id, 'custom')
  .filter(e => e.data?.variation === 'A');
const variationB = tracker.getEvents(story.id, 'custom')
  .filter(e => e.data?.variation === 'B');
```

### Player Behavior Heatmaps

Visualize popular paths:

```typescript
const analytics = tracker.getAnalytics(story.id);

// Render passage popularity
analytics.popularPassages.forEach(passage => {
  const opacity = passage.visits / analytics.totalSessions;
  renderPassageNode(passage.passageId, { opacity });
});

// Render choice popularity
analytics.popularChoices.forEach(choice => {
  const thickness = choice.count / analytics.totalSessions;
  renderChoiceEdge(choice.passageId, choice.choiceIndex, { thickness });
});
```

## Architecture

### Data Flow

```
Player Events → Tracker → Storage
                  ↓
              Analytics Engine
                  ↓
            Metrics & Reports
```

### Storage

Analytics data is stored in memory by default. For persistence:

1. Export data periodically
2. Save to IndexedDB via @writewhisker/storage
3. Or send to analytics backend

### Privacy Considerations

- No personally identifiable information (PII) collected by default
- Session IDs are generated client-side
- All data stays local unless explicitly sent to a server
- Use metadata field to add custom data as needed

## API Reference

### `AnalyticsTracker`

```typescript
class AnalyticsTracker {
  track(event: AnalyticsEvent): void;
  getAnalytics(storyId: string): StoryAnalytics;
  getEvents(storyId: string, type?: EventType): AnalyticsEvent[];
  getSessionEvents(sessionId: string): AnalyticsEvent[];
  getPassageVisits(storyId: string, passageId: string): number;
  exportData(storyId: string): AnalyticsData;
  importData(data: AnalyticsData): void;
  exportCSV(storyId: string): string;
  clear(storyId?: string): void;
}
```

### `PlaythroughRecorder`

```typescript
class PlaythroughRecorder {
  startPlaythrough(options: PlaythroughOptions): string;
  recordPassage(playthroughId: string, passage: PassageRecord): void;
  recordChoice(playthroughId: string, choice: ChoiceRecord): void;
  endPlaythrough(playthroughId: string, options: EndOptions): void;
  getPlaythrough(playthroughId: string): Playthrough;
  listPlaythroughs(storyId?: string): Playthrough[];
  exportPlaythrough(playthroughId: string): PlaythroughData;
  clear(): void;
}
```

## Bundle Size

- **Size**: ~5KB (gzipped)
- **Dependencies**: @writewhisker/core-ts only
- **Tree-shakable**: Yes (`sideEffects: false`)

## Testing

```bash
pnpm test          # Run tests
pnpm test:watch    # Watch mode
pnpm test:coverage # Coverage report
```

## License

AGPL-3.0

## Related Packages

- [@writewhisker/core-ts](../core-ts) - Core story engine
- [@writewhisker/storage](../storage) - Persistent storage
- [@writewhisker/export](../export) - Export analytics reports

## Support

- [Documentation](https://github.com/writewhisker/whisker-editor-web)
- [Issues](https://github.com/writewhisker/whisker-editor-web/issues)
- [Discussions](https://github.com/writewhisker/whisker-editor-web/discussions)
