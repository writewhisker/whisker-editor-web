# Analytics Integration

A complete example of integrating analytics with privacy-aware consent management.

## Setup

```typescript
import {
  createAnalyticsSystem,
  ConsentLevel,
  HttpBackend,
} from '@writewhisker/analytics';

// Create analytics system
const {
  consentManager,
  collector,
  eventTaxonomy,
  privacyFilter,
  backendRegistry,
} = createAnalyticsSystem({
  consent: {
    defaultLevel: ConsentLevel.NONE,
    storageKey: 'story_consent',
  },
  enableConsoleBackend: true,
});

// Add production backend
const httpBackend = new HttpBackend({
  endpoint: '/api/analytics',
  batchEvents: true,
  timeout: 5000,
});
backendRegistry.register(httpBackend, 'http');
collector.registerBackend(httpBackend);
```

## Consent Banner

```typescript
function showConsentBanner() {
  const banner = document.createElement('div');
  banner.className = 'consent-banner';
  banner.innerHTML = `
    <h2>Privacy Settings</h2>
    <p>We use analytics to improve your experience. Choose what you're comfortable with:</p>

    <div class="consent-options">
      <button data-level="${ConsentLevel.NONE}">Decline All</button>
      <button data-level="${ConsentLevel.ESSENTIAL}">Essential Only</button>
      <button data-level="${ConsentLevel.ANALYTICS}">Anonymous Analytics</button>
      <button data-level="${ConsentLevel.FULL}">Full Analytics</button>
    </div>

    <p class="consent-details">
      <strong>Essential:</strong> Basic functionality tracking<br>
      <strong>Anonymous:</strong> Session and usage patterns (no personal data)<br>
      <strong>Full:</strong> Personalized experience with account linking
    </p>
  `;

  banner.querySelectorAll('button').forEach(btn => {
    btn.onclick = () => {
      const level = parseInt(btn.dataset.level!);
      acceptConsent(level);
      banner.remove();
    };
  });

  document.body.appendChild(banner);
}

function acceptConsent(level: ConsentLevel) {
  consentManager.setConsent(level);

  // If full consent, optionally identify user
  if (level === ConsentLevel.FULL && userId) {
    consentManager.identifyUser(userId);
  }

  // Start tracking
  if (consentManager.hasConsent(ConsentLevel.ANALYTICS)) {
    startTracking();
  }
}

// Show banner on first visit
if (!consentManager.hasConsent(ConsentLevel.ESSENTIAL)) {
  showConsentBanner();
}
```

## Story Event Tracking

```typescript
import { StoryPlayer } from '@writewhisker/story-player';

const player = new StoryPlayer(story);

// Track story lifecycle
player.on('storyStart', () => {
  collector.track('story.start', {
    storyId: story.id,
    storyTitle: story.metadata.title,
    timestamp: Date.now(),
  });
});

player.on('storyEnd', (ending) => {
  collector.track('story.complete', {
    storyId: story.id,
    ending: ending.id,
    timestamp: Date.now(),
  });
});

// Track passage navigation
player.on('passageEnter', (passage) => {
  collector.track('passage.enter', {
    passageId: passage.id,
    passageTitle: passage.title,
    timestamp: Date.now(),
  });
});

// Track choices
player.on('choiceSelect', (choice, passage) => {
  collector.track('choice.select', {
    passageId: passage.id,
    choiceId: choice.id,
    choiceText: choice.text,
    timestamp: Date.now(),
  });
});

// Track saves/loads
player.on('save', (saveData) => {
  collector.track('save.create', {
    saveId: saveData.id,
    passageId: saveData.currentPassage,
    timestamp: Date.now(),
  });
});

player.on('load', (saveData) => {
  collector.track('save.load', {
    saveId: saveData.id,
    timestamp: Date.now(),
  });
});
```

## Custom Event Definitions

```typescript
// Define custom events for your story
eventTaxonomy.defineCustomEvent({
  type: 'item.collect',
  category: 'gameplay',
  requiredConsentLevel: ConsentLevel.ANALYTICS,
  metadata: {
    itemId: { type: 'string', required: true },
    itemName: { type: 'string', required: true },
    location: { type: 'string', required: false },
  },
});

eventTaxonomy.defineCustomEvent({
  type: 'achievement.unlock',
  category: 'gameplay',
  requiredConsentLevel: ConsentLevel.ANALYTICS,
  metadata: {
    achievementId: { type: 'string', required: true },
    achievementName: { type: 'string', required: true },
    progress: { type: 'number', required: false },
  },
});

// Use custom events
function collectItem(item: { id: string; name: string }, passage: string) {
  collector.track('item.collect', {
    itemId: item.id,
    itemName: item.name,
    location: passage,
  });
}

function unlockAchievement(achievement: { id: string; name: string }) {
  collector.track('achievement.unlock', {
    achievementId: achievement.id,
    achievementName: achievement.name,
    progress: 100,
  });
}
```

## Privacy Filter Configuration

```typescript
// Mark sensitive fields for redaction
privacyFilter.registerPiiField('userName');
privacyFilter.registerPiiField('email');
privacyFilter.registerPiiField('ipAddress');

// Test filtering behavior
const testEvent = {
  type: 'story.start',
  timestamp: Date.now(),
  metadata: {
    storyId: 'adventure-1',
    userName: 'John Doe', // PII - will be redacted
  },
};

// With ConsentLevel.ANALYTICS (PII redacted)
consentManager.setConsent(ConsentLevel.ANALYTICS);
const filtered = privacyFilter.filterEvent(testEvent);
console.log(filtered?.metadata.userName); // "[REDACTED]"

// With ConsentLevel.FULL (PII included)
consentManager.setConsent(ConsentLevel.FULL);
const unfiltered = privacyFilter.filterEvent(testEvent);
console.log(unfiltered?.metadata.userName); // "John Doe"
```

## Analytics Dashboard

```typescript
function showAnalyticsDashboard() {
  const stats = collector.getStats();

  const dashboard = `
    <div class="analytics-dashboard">
      <h2>Session Analytics</h2>
      <div class="stat">
        <span class="label">Events Tracked</span>
        <span class="value">${stats.eventCount}</span>
      </div>
      <div class="stat">
        <span class="label">Queue Size</span>
        <span class="value">${stats.queueSize}</span>
      </div>
      <div class="stat">
        <span class="label">Last Flush</span>
        <span class="value">${new Date(stats.lastFlush).toLocaleTimeString()}</span>
      </div>
    </div>
  `;

  document.getElementById('dashboard')!.innerHTML = dashboard;
}
```

## Cleanup on Exit

```typescript
// Flush analytics before page unload
window.addEventListener('beforeunload', async () => {
  await collector.flush();
});

// Handle visibility changes (mobile)
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'hidden') {
    await collector.flush();
  }
});

// Revoke consent
function revokeConsent() {
  consentManager.revokeConsent();
  collector.clear();
  showConsentBanner();
}
```

## Complete Example

```typescript
import {
  createAnalyticsSystem,
  ConsentLevel,
} from '@writewhisker/analytics';
import { StoryPlayer } from '@writewhisker/story-player';

// Initialize
const { consentManager, collector } = createAnalyticsSystem({
  consent: { defaultLevel: ConsentLevel.NONE },
  enableConsoleBackend: process.env.NODE_ENV === 'development',
});

// Get consent
if (!consentManager.hasConsent(ConsentLevel.ESSENTIAL)) {
  await showConsentBanner();
}

// Create player
const player = new StoryPlayer(story);

// Connect analytics
if (consentManager.hasConsent(ConsentLevel.ANALYTICS)) {
  player.on('storyStart', () => {
    collector.track('story.start', { storyId: story.id });
  });

  player.on('passageEnter', (p) => {
    collector.track('passage.enter', { passageId: p.id });
  });

  player.on('choiceSelect', (c) => {
    collector.track('choice.select', { choiceId: c.id });
  });
}

// Start
player.start();
```

## Complete Example

See the [full analytics API documentation](../../api/typescript/analytics.md) for more details.
