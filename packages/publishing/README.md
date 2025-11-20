# @writewhisker/publishing

Publishing and distribution tools for Whisker interactive fiction, supporting multiple platforms including itch.io, GitHub Pages, and static exports.

## Features

- **Multiple Publishing Platforms**: itch.io, GitHub Pages, static HTML export
- **Butler CLI Integration**: Professional itch.io uploads with versioning
- **Version Management**: Track and manage story versions
- **API Support**: Direct itch.io API integration for browser-based publishing
- **Automatic Fallback**: Falls back to API when butler CLI unavailable
- **Type-Safe**: Full TypeScript support with strict mode

## Installation

```bash
npm install @writewhisker/publishing
```

## Quick Start

### itch.io Publishing

The itch.io publisher supports two upload methods:
1. **Butler CLI** (recommended) - Professional game uploader with versioning
2. **API** - Browser-based upload fallback

#### Using Butler CLI (Recommended)

```typescript
import { ItchPublisher } from '@writewhisker/publishing';

const publisher = new ItchPublisher();

// Authenticate with API key
publisher.authenticate({
  apiKey: 'your-itch-io-api-key',
  butlerPath: 'butler', // Optional: custom butler path
});

// Publish story
const result = await publisher.publish(story, {
  platform: 'itch-io',
  filename: 'my-game',
  itchProject: 'username/game-name',
  visibility: 'draft', // 'public', 'private', or 'draft'
  description: 'An interactive fiction adventure',
});

if (result.success) {
  console.log(`Published to: ${result.url}`);
  console.log(`Build ID: ${result.metadata.buildId}`);
} else {
  console.error(`Failed: ${result.error}`);
}
```

#### Installing Butler CLI

Butler is itch.io's command-line tool for uploading games. Install it before using the butler upload method:

**macOS/Linux:**
```bash
# Download and install butler
curl -L -o butler.zip https://broth.itch.ovh/butler/darwin-amd64/LATEST/archive/default
unzip butler.zip
chmod +x butler
sudo mv butler /usr/local/bin/

# Login to itch.io
butler login
```

**Windows:**
```powershell
# Download butler from https://itch.io/docs/butler/installing.html
# Add to PATH and run:
butler login
```

**Programmatic Butler Management:**
```typescript
import { Butler } from '@writewhisker/publishing';

const butler = new Butler();

// Check installation
const status = await butler.getStatus();
console.log(`Installed: ${status.installed}`);
console.log(`Logged in: ${status.loggedIn}`);
console.log(`Version: ${status.version}`);

// Login programmatically
if (!status.loggedIn) {
  await butler.login('your-api-key');
}

// Get download URL for current platform
const downloadUrl = Butler.getDownloadUrl();
console.log(`Download butler from: ${downloadUrl}`);
```

#### Using API Upload (Browser Fallback)

When butler is not available, the publisher automatically falls back to API upload:

```typescript
// Same code - automatic fallback
const result = await publisher.publish(story, {
  platform: 'itch-io',
  // ... options
});

// Check which method was used
console.log(`Upload method: ${result.metadata.uploadMethod}`); // 'butler' or 'api'
```

### GitHub Pages Publishing

```typescript
import { GitHubPublisher } from '@writewhisker/publishing';

const publisher = new GitHubPublisher();

// Authenticate with GitHub token
publisher.authenticate({
  token: 'github_pat_...',
});

// Publish to GitHub Pages
const result = await publisher.publish(story, {
  platform: 'github-pages',
  githubRepo: 'username/repo',
  githubBranch: 'gh-pages',
  filename: 'index',
});

if (result.success) {
  console.log(`Published to: ${result.url}`);
}
```

### Static HTML Export

```typescript
import { StaticPublisher } from '@writewhisker/publishing';

const publisher = new StaticPublisher();

// Export as downloadable HTML file
const result = await publisher.publish(story, {
  platform: 'static',
  filename: 'my-story',
  includeThemeToggle: true,
  includeSaveLoad: true,
  defaultTheme: 'dark',
});

if (result.success) {
  // Download the file
  const blob = result.fileData as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename!;
  a.click();
}
```

## API Reference

### ItchPublisher

```typescript
class ItchPublisher implements IPublisher {
  readonly platform = 'itch-io';
  readonly name = 'itch.io';
  readonly description = 'Publish to itch.io gaming platform';
  readonly requiresAuth = true;

  // Authentication
  authenticate(config: ItchAuthConfig): void;
  isAuthenticated(): boolean;

  // User info
  getCurrentUser(): Promise<{ id: number; username: string; url: string } | null>;
  getUserGames(): Promise<ItchGame[]>;
  findGameByTitle(title: string): Promise<ItchGame | null>;

  // Game management
  createGame(metadata: ItchGameMetadata): Promise<{ id: number; url: string } | null>;
  updateGame(gameId: number, metadata: Partial<ItchGameMetadata>): Promise<boolean>;

  // Upload
  getPreferredUploadMethod(): Promise<'butler' | 'api'>;
  publish(story: Story, options: PublishOptions): Promise<PublishResult>;
}
```

### Butler

```typescript
class Butler {
  constructor(butlerPath?: string);

  // Status
  getStatus(): Promise<ButlerStatus>;

  // Authentication
  login(apiKey: string): Promise<{ success: boolean; error?: string }>;
  logout(): Promise<{ success: boolean; error?: string }>;

  // Upload
  push(filePath: string, options: ButlerOptions): Promise<ButlerUploadResult>;

  // Utilities
  prepareHtmlBuild(htmlContent: string, projectName: string): Promise<{
    path: string;
    cleanup: () => Promise<void>;
  }>;

  static validateTarget(target: string): boolean;
  static getDownloadUrl(): string;
}
```

### Types

```typescript
interface ItchAuthConfig {
  apiKey: string;
  butlerPath?: string;
}

interface ItchGameMetadata {
  title: string;
  short_text?: string;
  type: 'html' | 'flash' | 'unity' | 'java' | 'downloadable';
  classification: 'game' | 'tool' | 'comic' | 'book' | 'physical_game' | 'soundtrack' | 'game_mod' | 'other';
  kind?: 'default' | 'pwyw';
  cover_url?: string;
  tags?: string[];
}

interface ButlerOptions {
  target: string; // Format: "user/game"
  channel: string; // e.g., "html", "windows", "mac", "linux"
  version?: string;
  fixPermissions?: boolean;
  butlerPath?: string;
  userDataDir?: string;
}

interface ButlerUploadResult {
  success: boolean;
  buildId?: number;
  buildUrl?: string;
  error?: string;
  output?: string;
}

interface ButlerStatus {
  installed: boolean;
  version?: string;
  loggedIn: boolean;
  username?: string;
  error?: string;
}

interface PublishOptions {
  platform: PublishPlatform;
  filename?: string;
  includeThemeToggle?: boolean;
  includeSaveLoad?: boolean;
  defaultTheme?: 'light' | 'dark';
  customCSS?: string;
  description?: string;
  author?: string;
  githubRepo?: string;
  githubBranch?: string;
  itchProject?: string; // Format: "username/game-name"
  visibility?: 'public' | 'private' | 'draft';
}

interface PublishResult {
  success: boolean;
  platform: PublishPlatform;
  url?: string;
  error?: string;
  fileData?: Blob | string;
  filename?: string;
  metadata?: Record<string, any>;
}
```

## Version Management

Track and manage story versions:

```typescript
import { VersionManager } from '@writewhisker/publishing';

const versionManager = new VersionManager();

// Create version
const version = versionManager.createVersion({
  storyId: story.metadata.ifid,
  version: '1.0.0',
  changelog: 'Initial release',
  story,
});

// List versions
const versions = versionManager.getVersions(story.metadata.ifid);

// Get specific version
const v1 = versionManager.getVersion(story.metadata.ifid, '1.0.0');

// Compare versions
const diff = versionManager.compareVersions(version1, version2);

// Tag version
versionManager.tagVersion(version.id, 'stable');
```

## Advanced Usage

### Custom Butler Configuration

```typescript
const publisher = new ItchPublisher();

publisher.authenticate({
  apiKey: 'your-api-key',
  butlerPath: '/custom/path/to/butler',
});

// Manual butler operations
const butler = new Butler('/custom/path/to/butler');

// Check status
const status = await butler.getStatus();

// Upload with custom options
const result = await butler.push('/path/to/build', {
  target: 'username/game-name',
  channel: 'html',
  version: '2.0.0',
  fixPermissions: true,
  userDataDir: '/custom/butler/data',
});
```

### Multiple Channel Uploads

```typescript
// Upload to different channels (platforms)
const channels = ['html', 'windows', 'mac', 'linux'];

for (const channel of channels) {
  const result = await butler.push(`/builds/${channel}`, {
    target: 'username/game-name',
    channel,
    version: '1.0.0',
  });

  console.log(`${channel}: ${result.success ? 'Success' : 'Failed'}`);
}
```

### Publishing Workflow

```typescript
// Complete publishing workflow
async function publishStory(story: Story) {
  const publisher = new ItchPublisher();

  publisher.authenticate({
    apiKey: process.env.ITCH_API_KEY!,
  });

  // 1. Check authentication
  const user = await publisher.getCurrentUser();
  console.log(`Publishing as: ${user?.username}`);

  // 2. Check for existing game
  const existing = await publisher.findGameByTitle(story.metadata.title);

  if (existing) {
    console.log(`Updating existing game: ${existing.url}`);
  } else {
    console.log('Creating new game...');
  }

  // 3. Publish
  const result = await publisher.publish(story, {
    platform: 'itch-io',
    itchProject: `${user?.username}/${slugify(story.metadata.title)}`,
    visibility: 'draft', // Start as draft
    description: story.metadata.description,
  });

  if (result.success) {
    console.log('✅ Published successfully!');
    console.log(`URL: ${result.url}`);
    console.log(`Build: ${result.metadata.buildUrl}`);
    console.log(`Method: ${result.metadata.uploadMethod}`);

    return result;
  } else {
    console.error('❌ Publishing failed:', result.error);
    throw new Error(result.error);
  }
}
```

## Error Handling

```typescript
try {
  const result = await publisher.publish(story, options);

  if (!result.success) {
    // Handle specific errors
    if (result.error?.includes('Not authenticated')) {
      console.error('Please provide a valid itch.io API key');
    } else if (result.error?.includes('Butler CLI not installed')) {
      console.error('Install butler: https://itch.io/docs/butler/installing.html');
    } else {
      console.error('Publishing error:', result.error);
    }
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Getting itch.io API Key

1. Go to https://itch.io/user/settings/api-keys
2. Generate a new API key
3. Copy the key and keep it secure
4. Use it to authenticate:

```typescript
publisher.authenticate({ apiKey: 'your-api-key-here' });
```

## Butler CLI Commands

The package wraps these butler commands:

```bash
# Check version
butler -V

# Login
butler login

# Check status
butler status

# Upload/push
butler push /path/to/build user/game:channel --userversion 1.0.0

# Logout
butler logout
```

## Platform Support

| Platform | Butler CLI | API Upload | Browser Support |
|----------|------------|------------|-----------------|
| itch.io  | ✅ Yes     | ✅ Yes     | ✅ Yes          |
| GitHub   | ❌ No      | ✅ Yes     | ✅ Yes          |
| Static   | ❌ No      | N/A        | ✅ Yes          |

## Best Practices

1. **Use Butler for Production**: Butler provides better upload reliability and versioning
2. **API for Browser Apps**: Use API upload when butler is unavailable (web apps)
3. **Version Your Builds**: Always include a version number
4. **Start as Draft**: Publish as draft first, then make public after testing
5. **Secure API Keys**: Never commit API keys to source control
6. **Handle Errors**: Always check `result.success` and handle errors

## Troubleshooting

### Butler Not Found

```
Error: Butler CLI not installed
```

**Solution**: Install butler CLI:
```bash
curl -L -o butler.zip https://broth.itch.ovh/butler/darwin-amd64/LATEST/archive/default
unzip butler.zip
chmod +x butler
sudo mv butler /usr/local/bin/
```

### Authentication Failed

```
Error: Failed to authenticate with itch.io
```

**Solution**: Check your API key at https://itch.io/user/settings/api-keys

### Invalid Target Format

```
Error: Invalid itch.io project name
```

**Solution**: Use format `username/game-name` (no spaces or special characters)

### Upload Failed

```
Error: Failed to upload file
```

**Solution**:
1. Check internet connection
2. Verify game exists on itch.io
3. Check butler is logged in: `butler status`
4. Try API upload method as fallback

## License

AGPL-3.0
