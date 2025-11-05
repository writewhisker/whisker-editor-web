# Error Tracking with Sentry

## Overview

Whisker Editor uses [Sentry](https://sentry.io) for error tracking and performance monitoring in production.

## Setup

### 1. Create a Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Create a free account
3. Create a new project
   - Platform: **Browser JavaScript**
   - Name: **Whisker Editor**

### 2. Get Your DSN

After creating the project, you'll see your DSN (Data Source Name). It looks like:
```
https://xxxxxxxxxxxxx@o123456.ingest.sentry.io/123456
```

### 3. Configure Environment Variables

Create or update `.env.local`:

```env
# Sentry DSN for error tracking
VITE_SENTRY_DSN=https://your-dsn-here@sentry.io/project-id

# Environment (development, staging, production)
VITE_ENV=development

# App version (for release tracking)
VITE_APP_VERSION=1.0.0
```

### 4. Build and Deploy

```bash
# Development (error tracking disabled by default)
npm run dev

# Production (error tracking enabled automatically)
npm run build
```

## Features

### Error Capture

Errors are automatically captured and sent to Sentry:

```typescript
try {
  // Some code that might throw
} catch (error) {
  errorTracking.captureException(error, {
    context: 'custom context data'
  });
}
```

### Message Logging

Log important events:

```typescript
errorTracking.captureMessage('User completed onboarding', 'info', {
  userId: '123',
  timestamp: Date.now()
});
```

### User Context

Track which users experience errors:

```typescript
errorTracking.setUser({
  id: user.id,
  email: user.email,
  username: user.username
});
```

### Breadcrumbs

Leave breadcrumbs for debugging:

```typescript
errorTracking.addBreadcrumb('User opened story', {
  storyId: story.id,
  title: story.title
});
```

### Performance Monitoring

Track performance of critical operations:

```typescript
const transaction = errorTracking.startTransaction('save-story', 'operation');
try {
  await saveStory();
} finally {
  transaction.finish();
}
```

## Privacy & Security

### Data Collection

We collect minimal data to debug issues:
- Error stack traces
- Browser and OS information
- User actions leading to errors (breadcrumbs)
- Performance metrics

### What We DON'T Collect

- Story content (masked)
- Personal information
- Passwords or credentials
- Media files

### Session Replay

Session replay is enabled with privacy protections:
- All text is masked
- All media is blocked
- Only 10% of normal sessions are recorded
- 100% of sessions with errors are recorded

### Opt-Out

Error tracking only works in production with a valid DSN. Users can disable it by blocking Sentry domains.

## Monitoring

### Sentry Dashboard

Access your Sentry dashboard at: https://sentry.io

Key metrics:
- **Error rate**: How many errors per minute/hour
- **Affected users**: How many users experienced errors
- **Error trends**: Are errors increasing or decreasing?
- **Performance**: Transaction durations and bottlenecks

### Alerts

Set up alerts in Sentry to get notified when:
- Error rate spikes
- New errors appear
- Performance degrades

### Releases

Track deployments and see which release introduced issues:

```bash
# Set version in package.json
npm version patch

# Build will automatically tag release in Sentry
npm run build
```

## Development

### Local Testing

Error tracking is **disabled** in development by default. To test:

1. Set `VITE_SENTRY_DSN` in `.env.local`
2. Force production mode:
   ```bash
   NODE_ENV=production npm run build
   npm run preview
   ```

### Testing Sentry Integration

Manually trigger an error to test:

```typescript
// In browser console
throw new Error('Test error for Sentry');
```

Or use the built-in test:

```typescript
errorTracking.captureMessage('Test message from Whisker Editor', 'info');
```

## Best Practices

### 1. Add Context to Errors

Always provide context:

```typescript
try {
  await saveStory(story);
} catch (error) {
  errorTracking.captureException(error, {
    storyId: story.id,
    passageCount: story.passages.size,
    operation: 'save'
  });
}
```

### 2. Use Breadcrumbs

Add breadcrumbs before important operations:

```typescript
errorTracking.addBreadcrumb('Starting story export');
errorTracking.addBreadcrumb('Generating HTML');
errorTracking.addBreadcrumb('Exporting to file');
```

### 3. Filter Noise

Some errors are expected. Filter them:

```typescript
// Already filtered in errorTracking.ts:
// - Browser extension errors
// - Network errors
// - ResizeObserver errors
```

### 4. Monitor Performance

Track slow operations:

```typescript
const transaction = errorTracking.startTransaction('story-validation', 'task');
validateStory();
transaction.finish();
```

## Troubleshooting

### Errors Not Appearing in Sentry

1. Check DSN is correct in `.env.local`
2. Verify you're in production mode
3. Check browser console for Sentry errors
4. Ensure Sentry isn't blocked by ad blockers

### Too Many Errors

Adjust sample rates in `errorTracking.ts`:

```typescript
tracesSampleRate: 0.1, // 10% of transactions
replaysSessionSampleRate: 0.05, // 5% of sessions
```

### Privacy Concerns

Review and adjust:
- `maskAllText`: Masks all user-entered text
- `blockAllMedia`: Blocks all images/videos
- `beforeSend`: Filter sensitive data

## Cost Management

Sentry offers generous free tiers:

- **Free**: 5K errors/month
- **Team**: 50K errors/month ($26/month)
- **Business**: 100K+ errors/month

To stay in free tier:
- Set appropriate sample rates
- Filter noisy errors
- Use error grouping effectively

## Support

- Sentry Docs: https://docs.sentry.io
- Whisker Editor Issues: https://github.com/writewhisker/whisker-editor-web/issues
