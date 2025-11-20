# Whisker Analytics Dashboard

Track player behavior, measure story performance, and gain insights into how readers engage with your interactive fiction.

## Features

- ✅ **Session Metrics**: Total sessions, completion rate, average playtime
- ✅ **Passage Analytics**: Views, time spent, exit rates per passage
- ✅ **Real-time Tracking**: Live event tracking and aggregation
- ✅ **Visual Reports**: Charts and graphs for easy interpretation
- ✅ **Custom Events**: Track custom game events and variables
- ✅ **Export Data**: Download analytics as CSV or JSON
- ✅ **Date Filtering**: Analyze specific time periods
- ✅ **Responsive Design**: Works on desktop and mobile
- ✅ **Dark Mode**: Automatic theme switching

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Usage

### Load Analytics from URL

```
http://localhost:5173/?story=https://example.com/story.json&analytics=https://example.com/analytics.json
```

### Embed in Website

```html
<iframe
  src="https://yoursite.com/analytics/?story=story.json&analytics=analytics.json"
  width="100%"
  height="800"
  frameborder="0"
></iframe>
```

### Integrate with Story Player

```typescript
import { AnalyticsTracker } from '@writewhisker/analytics';

const tracker = new AnalyticsTracker({
  storyId: story.id,
  endpoint: 'https://api.example.com/analytics',
});

// Track events automatically
tracker.trackPassageView(passage.id);
tracker.trackChoice(choiceId, passageId);
tracker.trackSessionStart();
tracker.trackSessionEnd();
```

## Metrics

### Session Metrics

- **Total Sessions**: Number of gameplay sessions
- **Completed Sessions**: Sessions that reached an ending
- **Completion Rate**: Percentage of sessions completed
- **Average Duration**: Mean time spent per session
- **Bounce Rate**: Percentage of single-passage sessions

### Passage Metrics

- **Views**: Number of times passage was viewed
- **Unique Views**: Number of unique sessions viewing passage
- **Average Time**: Mean time spent on passage
- **Exit Rate**: Percentage of sessions ending at passage
- **Entry Rate**: Percentage of sessions starting at passage

### Choice Metrics

- **Click Rate**: Percentage of players choosing each option
- **Decision Time**: Time taken to make choice
- **Popular Paths**: Most common story paths
- **Dead Ends**: Passages with no exits chosen

## Custom Events

Track custom game events:

```typescript
tracker.trackCustomEvent({
  type: 'inventory_add',
  data: {
    item: 'sword',
    quantity: 1,
  },
});

tracker.trackCustomEvent({
  type: 'achievement_unlocked',
  data: {
    achievement: 'first_victory',
  },
});
```

## Data Export

Export analytics data for external analysis:

```typescript
import { AnalyticsExporter } from '@writewhisker/analytics';

const exporter = new AnalyticsExporter();

// Export as CSV
const csv = exporter.exportToCSV(events);

// Export as JSON
const json = exporter.exportToJSON(events);

// Download file
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
// Trigger download
```

## Date Filtering

Filter analytics by date range:

```typescript
const startDate = new Date('2024-01-01');
const endDate = new Date('2024-12-31');

const filteredEvents = events.filter(
  (e) => e.timestamp >= startDate.getTime() && e.timestamp <= endDate.getTime()
);

const metrics = aggregator.aggregateSessionMetrics(filteredEvents);
```

## Privacy

The analytics dashboard respects user privacy:

- **No Personal Data**: Only anonymous session IDs
- **Local Storage**: Data stored client-side by default
- **GDPR Compliant**: Easy data deletion
- **Opt-out Support**: Players can disable tracking

### Configure Privacy

```typescript
const tracker = new AnalyticsTracker({
  storyId: story.id,
  enableTracking: localStorage.getItem('analytics-consent') === 'true',
  anonymize: true,
  respectDoNotTrack: true,
});
```

## Backend Integration

Send analytics to your backend:

```typescript
const tracker = new AnalyticsTracker({
  storyId: story.id,
  endpoint: 'https://api.example.com/analytics',
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
});

// Events are automatically batched and sent
```

### Backend API Format

```json
POST /analytics

{
  "storyId": "story-123",
  "events": [
    {
      "type": "passage_view",
      "sessionId": "session-456",
      "timestamp": 1234567890,
      "passageId": "passage-1",
      "passageName": "Start"
    }
  ]
}
```

## Customization

### Theme

Edit `src/style.css` to customize dashboard colors:

```css
:root {
  --bg-primary: #ffffff;
  --bg-card: #ffffff;
  --text-primary: #333333;
  --primary-color: #2196f3;
  --chart-color-1: #2196f3;
  --chart-color-2: #4caf50;
}
```

### Dashboard Layout

Modify `src/App.svelte` to customize dashboard sections:

```svelte
<div class="dashboard">
  <!-- Add custom sections -->
  <section class="custom-section">
    <CustomChart {data} />
  </section>
</div>
```

## Advanced Analytics

### Funnel Analysis

Track conversion through story sections:

```typescript
const funnel = aggregator.analyzeFunnel([
  'Start',
  'Tutorial',
  'Chapter1',
  'Chapter2',
  'Ending',
]);

console.log(funnel.conversionRate); // 45%
console.log(funnel.dropoffPoints); // ['Tutorial', 'Chapter2']
```

### Cohort Analysis

Compare player groups:

```typescript
const cohorts = aggregator.analyzeCohorts(events, {
  groupBy: 'week',
  metric: 'completion_rate',
});

console.log(cohorts['2024-W01'].completionRate); // 52%
console.log(cohorts['2024-W02'].completionRate); // 58%
```

### A/B Testing

Compare story variants:

```typescript
const variantA = events.filter((e) => e.variant === 'A');
const variantB = events.filter((e) => e.variant === 'B');

const metricsA = aggregator.aggregateSessionMetrics(variantA);
const metricsB = aggregator.aggregateSessionMetrics(variantB);

console.log('Variant A completion:', metricsA.completionRate);
console.log('Variant B completion:', metricsB.completionRate);
```

## Performance

- **First Load**: < 1s on 3G
- **Bundle Size**: ~250KB gzipped
- **Large Datasets**: 100k+ events supported
- **Real-time Updates**: < 100ms update latency

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Troubleshooting

### No data showing

Check that analytics events are being tracked:

```javascript
console.log(tracker.getEvents());
```

### Slow performance with large datasets

Enable data aggregation:

```typescript
const aggregator = new AnalyticsAggregator({
  enableCaching: true,
  cacheSize: 1000,
});
```

### Backend not receiving events

Check network tab for failed requests:

```javascript
tracker.on('error', (error) => {
  console.error('Analytics error:', error);
});
```

## License

AGPL-3.0
