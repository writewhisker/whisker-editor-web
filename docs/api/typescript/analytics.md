# @writewhisker/analytics API Reference

Comprehensive analytics infrastructure for Whisker stories including event collection, consent management, privacy filtering, and multiple backend support.

## Installation

```bash
pnpm add @writewhisker/analytics
```

## Quick Start

```typescript
import {
  createAnalyticsSystem,
  ConsentLevel,
} from '@writewhisker/analytics';

// Create complete analytics system
const {
  consentManager,
  collector,
  eventTaxonomy,
  privacyFilter,
} = createAnalyticsSystem({
  consent: {
    defaultLevel: ConsentLevel.ANALYTICS,
  },
  enableConsoleBackend: true,
});

// Set user consent
consentManager.setConsent(ConsentLevel.FULL);

// Track events
collector.track('story.start', {
  storyId: 'adventure-1',
  storyTitle: 'The Great Adventure',
});

collector.track('passage.enter', {
  passageId: 'chapter-1',
  passageTitle: 'Chapter 1',
});

// Get statistics
const stats = collector.getStats();
console.log(`Tracked ${stats.eventCount} events`);
```

---

## Consent Management

GDPR-compliant consent management with multiple consent levels.

### Consent Levels

```typescript
import { ConsentLevel } from '@writewhisker/analytics';

ConsentLevel.NONE       // 0 - No data collection
ConsentLevel.ESSENTIAL  // 1 - Essential functionality only
ConsentLevel.ANALYTICS  // 2 - Anonymous analytics
ConsentLevel.FULL       // 3 - Full data including PII
```

### Creating a Consent Manager

```typescript
import { ConsentManager, createConsentManager } from '@writewhisker/analytics';

const consentManager = createConsentManager({
  defaultLevel: ConsentLevel.ESSENTIAL,
  storageKey: 'app_consent',
  userIdStorageKey: 'app_user_id',
});
```

### Managing Consent

```typescript
// Set consent level
consentManager.setConsent(ConsentLevel.ANALYTICS);

// Get current consent
const level = consentManager.getConsentLevel();

// Check if specific level is met
const canTrack = consentManager.hasConsent(ConsentLevel.ANALYTICS);

// Revoke all consent
consentManager.revokeConsent();
```

### User Identification

```typescript
// Identify user (requires FULL consent)
consentManager.identifyUser('user-123');

// Get current user ID
const userId = consentManager.getUserId();

// Check if user identified
const identified = consentManager.isIdentified();
```

### Consent State

```typescript
// Get full consent state
const state = consentManager.getState();
console.log(state);
// {
//   consentLevel: 2,
//   userId: null,
//   hasConsent: true,
//   consentTimestamp: 1704326400000,
// }
```

### Consent Utilities

```typescript
import {
  getConsentLevelName,
  getConsentLevelDescription,
  getAllConsentLevels,
  meetsConsentLevel,
} from '@writewhisker/analytics';

// Get human-readable name
const name = getConsentLevelName(ConsentLevel.ANALYTICS);
// "Analytics"

// Get description
const desc = getConsentLevelDescription(ConsentLevel.ANALYTICS);
// "Anonymous analytics collection..."

// Check if level meets requirement
const meets = meetsConsentLevel(ConsentLevel.FULL, ConsentLevel.ANALYTICS);
// true (FULL >= ANALYTICS)
```

---

## Event Taxonomy

Standardized event definitions with validation.

### Built-in Event Categories

| Category | Events |
|----------|--------|
| `story` | `start`, `end`, `complete`, `reset` |
| `passage` | `enter`, `exit`, `read` |
| `choice` | `present`, `select`, `skip` |
| `variable` | `set`, `change` |
| `save` | `create`, `load`, `delete` |
| `error` | `runtime`, `validation` |

### Using Event Taxonomy

```typescript
import { EventTaxonomy, createEventTaxonomy } from '@writewhisker/analytics';

const taxonomy = createEventTaxonomy();

// Validate event
const validation = taxonomy.validateEvent({
  type: 'story.start',
  timestamp: Date.now(),
  metadata: {
    storyId: 'adventure-1',
    storyTitle: 'The Great Adventure',
  },
});

if (!validation.valid) {
  console.error('Invalid event:', validation.errors);
}
```

### Custom Event Types

```typescript
// Define custom event
taxonomy.defineCustomEvent({
  type: 'custom.achievement',
  category: 'custom',
  requiredConsentLevel: ConsentLevel.ANALYTICS,
  metadata: {
    achievementId: { type: 'string', required: true },
    achievementName: { type: 'string', required: true },
    earnedAt: { type: 'number', required: true },
  },
});

// Use custom event
collector.track('custom.achievement', {
  achievementId: 'first-blood',
  achievementName: 'First Blood',
  earnedAt: Date.now(),
});
```

### Querying Events

```typescript
// Get all event types
const types = taxonomy.getEventTypes();

// Get categories
const categories = taxonomy.getCategories();

// Check if event exists
const exists = taxonomy.eventTypeExists('story.start');

// Get event definition
const def = taxonomy.getEventDefinition('story.start');

// Get metadata schema
const schema = taxonomy.getMetadataSchema('story.start');
```

---

## Privacy Filter

Filter and redact data based on consent level.

### Creating a Privacy Filter

```typescript
import { PrivacyFilter, createPrivacyFilter } from '@writewhisker/analytics';

const filter = createPrivacyFilter(consentManager);
```

### Filtering Events

```typescript
// Filter event based on consent
const filtered = filter.filterEvent({
  type: 'story.start',
  timestamp: Date.now(),
  metadata: {
    storyId: 'adventure-1',
    userName: 'John Doe', // PII - may be redacted
  },
});

// Event may be null if consent insufficient
if (filtered) {
  console.log('Filtered event:', filtered);
}
```

### Field Redaction

```typescript
// Register PII field
filter.registerPiiField('userName');
filter.registerPiiField('email');
filter.registerPiiField('ipAddress');

// Fields are automatically redacted based on consent
// ConsentLevel.ANALYTICS: PII redacted to "[REDACTED]"
// ConsentLevel.FULL: PII included
```

### Manual Filtering

```typescript
// Check if event should be collected
const shouldCollect = filter.shouldCollect('story.start', ConsentLevel.ANALYTICS);

// Redact specific value
const redacted = filter.redactValue('john@example.com', 'email');
```

---

## Event Collector

Collect, batch, and send events to backends.

### Creating a Collector

```typescript
import { Collector, createCollector } from '@writewhisker/analytics';

const collector = createCollector({
  batchSize: 10,           // Batch size before flush
  flushInterval: 5000,     // Flush every 5 seconds
  maxQueueSize: 1000,      // Max queued events
  retryAttempts: 3,        // Retry failed sends
  retryDelay: 1000,        // Delay between retries
});
```

### Tracking Events

```typescript
// Track simple event
collector.track('story.start', {
  storyId: 'adventure-1',
});

// Track with all options
collector.track('passage.enter', {
  passageId: 'chapter-1',
  passageTitle: 'Chapter 1',
  timestamp: Date.now(),
  sessionId: 'session-123',
});

// Track error
collector.track('error.runtime', {
  errorCode: 'E001',
  errorMessage: 'Variable not found',
  passageId: 'chapter-3',
});
```

### Managing Collection

```typescript
// Pause collection
collector.pause();

// Resume collection
collector.resume();

// Force flush queued events
await collector.flush();

// Clear queue
collector.clear();

// Get statistics
const stats = collector.getStats();
console.log(stats);
// {
//   eventCount: 150,
//   queueSize: 5,
//   lastFlush: 1704326400000,
//   backendCount: 2,
// }
```

### Connecting to Privacy

```typescript
// Wire up privacy filtering
collector.setDependencies({
  eventTaxonomy,
  privacyFilter,
});

// Events are now automatically validated and filtered
```

---

## Analytics Backends

Send events to different destinations.

### Console Backend (Development)

```typescript
import { ConsoleBackend } from '@writewhisker/analytics';

const consoleBackend = new ConsoleBackend();
collector.registerBackend(consoleBackend);
```

### Memory Backend (Testing)

```typescript
import { MemoryBackend } from '@writewhisker/analytics';

const memoryBackend = new MemoryBackend();
collector.registerBackend(memoryBackend);

// Get stored events
const events = memoryBackend.getEvents();
console.log(`Stored ${events.length} events`);

// Clear events
memoryBackend.clear();
```

### HTTP Backend (Production)

```typescript
import { HttpBackend } from '@writewhisker/analytics';

const httpBackend = new HttpBackend({
  endpoint: 'https://analytics.example.com/events',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token123',
    'Content-Type': 'application/json',
  },
  batchEvents: true,
  timeout: 5000,
});

collector.registerBackend(httpBackend);
```

### Callback Backend (Custom Processing)

```typescript
import { CallbackBackend } from '@writewhisker/analytics';

const callbackBackend = new CallbackBackend((events) => {
  // Send to your analytics service
  myAnalytics.trackBatch(events);
});

collector.registerBackend(callbackBackend);
```

### Backend Registry

```typescript
import { BackendRegistry } from '@writewhisker/analytics';

const registry = BackendRegistry.create();

// Register backends
registry.register(consoleBackend, 'console');
registry.register(httpBackend, 'http');

// Get backend by name
const backend = registry.get('http');

// List all backends
const names = registry.list();

// Unregister
registry.unregister('console');
```

---

## Story Analytics

Built-in story-specific analytics.

### Story Analytics

```typescript
import { StoryAnalytics } from '@writewhisker/analytics';

const storyAnalytics = new StoryAnalytics();

// Track story metrics
storyAnalytics.trackStoryStart('adventure-1');
storyAnalytics.trackPassageVisit('chapter-1');
storyAnalytics.trackChoiceMade('chapter-1', 'choice-explore');
storyAnalytics.trackStoryEnd('adventure-1', 'victory');

// Get metrics
const metrics = storyAnalytics.getMetrics('adventure-1');
console.log(metrics);
// {
//   totalPlays: 150,
//   completions: 89,
//   averagePlaytime: 1200000, // ms
//   passageVisits: { 'chapter-1': 150, ... },
//   choiceDistribution: { ... },
// }
```

### Playthrough Recording

```typescript
import { PlaythroughRecorder } from '@writewhisker/analytics';

const recorder = new PlaythroughRecorder();

// Start recording
recorder.start('session-123');

// Record events
recorder.recordPassageEnter('chapter-1');
recorder.recordChoice('choice-explore');
recorder.recordVariableChange('score', 100);

// Stop and get recording
const playthrough = recorder.stop();
console.log(playthrough.events);
```

### Playthrough Analytics

```typescript
import { PlaythroughAnalytics } from '@writewhisker/analytics';

const analytics = new PlaythroughAnalytics();

// Analyze playthrough
const analysis = analytics.analyze(playthrough);
console.log(analysis);
// {
//   duration: 300000,
//   passagesVisited: 12,
//   choicesMade: 8,
//   pathTaken: ['start', 'chapter-1', 'chapter-2', ...],
//   endingReached: 'victory',
// }
```

---

## Complete Example

```typescript
import {
  createAnalyticsSystem,
  ConsentLevel,
  HttpBackend,
} from '@writewhisker/analytics';

// Create system
const {
  consentManager,
  collector,
  eventTaxonomy,
  privacyFilter,
  backendRegistry,
} = createAnalyticsSystem({
  consent: {
    defaultLevel: ConsentLevel.ESSENTIAL,
  },
});

// Add production backend
const httpBackend = new HttpBackend({
  endpoint: process.env.ANALYTICS_ENDPOINT!,
  headers: {
    'Authorization': `Bearer ${process.env.ANALYTICS_TOKEN}`,
  },
});
collector.registerBackend(httpBackend);

// Define custom events
eventTaxonomy.defineCustomEvent({
  type: 'game.levelUp',
  category: 'game',
  requiredConsentLevel: ConsentLevel.ANALYTICS,
  metadata: {
    level: { type: 'number', required: true },
    characterClass: { type: 'string', required: true },
  },
});

// Show consent dialog and get user consent
async function requestConsent(): Promise<void> {
  const userChoice = await showConsentDialog();
  consentManager.setConsent(userChoice);

  if (userChoice >= ConsentLevel.FULL) {
    // User allows full tracking
    const userId = await getUserId();
    consentManager.identifyUser(userId);
  }
}

// Track game events
function trackLevelUp(level: number, characterClass: string): void {
  collector.track('game.levelUp', {
    level,
    characterClass,
  });
}

// Initialize
await requestConsent();

// Track story
collector.track('story.start', { storyId: 'rpg-adventure' });

// ... game plays ...

trackLevelUp(5, 'warrior');

// On exit
await collector.flush();
```

---

## TypeScript Types

```typescript
import type {
  ConsentConfig,
  ConsentState,
  ConsentLevelInfo,
  EventCategory,
  EventMetadata,
  AnalyticsEvent,
  EventDefinition,
  MetadataSchema,
  CollectorConfig,
  CollectorStats,
  AnalyticsBackend,
  BackendConfig,
  StorageAdapter,
  Logger,
} from '@writewhisker/analytics';
```

---

## Best Practices

### 1. Request Consent Early

```typescript
// Show consent banner on first visit
if (!consentManager.hasConsent(ConsentLevel.ESSENTIAL)) {
  showConsentBanner();
}
```

### 2. Respect User Choices

```typescript
// Always check before tracking
if (consentManager.hasConsent(ConsentLevel.ANALYTICS)) {
  collector.track('story.start', data);
}
```

### 3. Minimize Data Collection

```typescript
// Only collect what you need
collector.track('passage.enter', {
  passageId: passage.id,
  // Don't include unnecessary data
});
```

### 4. Handle Failures Gracefully

```typescript
collector.on('error', (error) => {
  console.error('Analytics error:', error);
  // Don't crash the app
});
```

### 5. Flush on Exit

```typescript
window.addEventListener('beforeunload', () => {
  collector.flush();
});
```
