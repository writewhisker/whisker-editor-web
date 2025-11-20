# @writewhisker/github

GitHub integration for Whisker - OAuth authentication, repository management, and file synchronization.

## Features

- **OAuth Authentication**: Secure GitHub login flow with token management
- **Repository Management**: Create, list, and manage repositories
- **File Synchronization**: Push/pull story files to/from GitHub
- **Commit History**: Track changes and view commit history
- **Collaboration**: Share stories via GitHub repositories
- **Token Storage**: Secure token storage using @writewhisker/storage
- **Type-Safe**: Full TypeScript support with Octokit
- **Svelte Components**: Ready-to-use UI components for auth and repo selection

## Installation

```bash
pnpm add @writewhisker/github

# Peer dependencies
pnpm add svelte @writewhisker/storage
```

## Quick Start

### Authentication

```typescript
import { GitHubAuth } from '@writewhisker/github';
import { createIndexedDBStorage } from '@writewhisker/storage';

const storage = createIndexedDBStorage();
await storage.initialize();

const auth = new GitHubAuth(storage);

// Check if logged in
const isLoggedIn = await auth.isAuthenticated();

if (!isLoggedIn) {
  // Start OAuth flow
  const clientId = 'your-github-oauth-app-client-id';
  await auth.login(clientId);

  // User will be redirected to GitHub for authorization
  // After authorization, GitHub redirects back with a code

  // Exchange code for token (in redirect handler)
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (code) {
    await auth.handleCallback(code, clientId);
  }
}

// Get access token
const token = await auth.getAccessToken();

// Logout
await auth.logout();
```

### Repository Operations

```typescript
import { GitHubAPI } from '@writewhisker/github';

const api = new GitHubAPI(token);

// List user repositories
const repos = await api.listRepositories();
console.log(repos);

// Create new repository
const newRepo = await api.createRepository({
  name: 'my-story',
  description: 'My interactive fiction story',
  private: false,
});

// Get repository details
const repo = await api.getRepository('username', 'repo-name');

// List repository contents
const contents = await api.getRepositoryContents('username', 'repo-name', 'path/to/dir');
```

### File Operations

```typescript
import { Story } from '@writewhisker/core-ts';
import { GitHubAPI } from '@writewhisker/github';

const api = new GitHubAPI(token);

// Push story to GitHub
const story = new Story({ metadata: { title: 'My Story' } });
const storyJSON = JSON.stringify(story.serialize(), null, 2);

await api.createOrUpdateFile({
  owner: 'username',
  repo: 'my-story',
  path: 'story.json',
  content: storyJSON,
  message: 'Update story',
  branch: 'main',
});

// Get file from GitHub
const file = await api.getFileContent('username', 'my-story', 'story.json');
const storyData = JSON.parse(file.content);
const loadedStory = Story.deserialize(storyData);

// Delete file
await api.deleteFile({
  owner: 'username',
  repo: 'my-story',
  path: 'old-file.json',
  message: 'Remove old file',
  sha: file.sha, // File SHA from getFileContent
});
```

## Core Concepts

### OAuth Flow

The package implements GitHub's OAuth web application flow:

1. **Redirect to GitHub**: User clicks "Login with GitHub"
2. **User Authorizes**: GitHub shows authorization page
3. **GitHub Redirects Back**: With authorization code
4. **Exchange Code for Token**: Backend exchanges code for access token
5. **Store Token**: Token stored securely in IndexedDB

```typescript
// 1. Start OAuth flow
await auth.login(clientId, {
  scopes: ['repo', 'user'],
  redirectUri: 'https://your-app.com/auth/callback',
});

// 2-3. GitHub handles authorization and redirects

// 4-5. Handle callback
const code = new URLSearchParams(window.location.search).get('code');
if (code) {
  await auth.handleCallback(code, clientId);
  // User is now authenticated
}
```

### Token Management

Tokens are stored securely and automatically refreshed:

```typescript
// Get token (automatically retrieved from storage)
const token = await auth.getAccessToken();

// Check token validity
const isValid = await auth.validateToken(token);

// Refresh token (if using refresh tokens)
if (!isValid) {
  await auth.refreshToken();
}

// Clear token
await auth.logout();
```

### Repository Sync

Synchronize stories with GitHub repositories:

```typescript
import { GitHubSync } from '@writewhisker/github';

const sync = new GitHubSync(api, storage);

// Initialize sync for a story
await sync.initializeRepo({
  storyId: story.id,
  owner: 'username',
  repo: 'my-story',
  branch: 'main',
});

// Push changes
await sync.push(story.id, {
  message: 'Update passages',
});

// Pull changes
const hasUpdates = await sync.pull(story.id);
if (hasUpdates) {
  console.log('Story updated from GitHub');
}

// Get sync status
const status = await sync.getStatus(story.id);
console.log('Last synced:', status.lastSync);
console.log('Pending changes:', status.pendingChanges);
```

## Svelte Components

The package includes ready-to-use Svelte components:

### GitHubAuthButton

Login/logout button with status:

```svelte
<script lang="ts">
  import { GitHubAuthButton } from '@writewhisker/github';
  import { createIndexedDBStorage } from '@writewhisker/storage';

  const storage = createIndexedDBStorage();
  const clientId = 'your-client-id';
</script>

<GitHubAuthButton
  {storage}
  {clientId}
  on:login={() => console.log('Logged in')}
  on:logout={() => console.log('Logged out')}
/>
```

### RepositorySelector

Select or create repository:

```svelte
<script lang="ts">
  import { RepositorySelector } from '@writewhisker/github';
  import { GitHubAPI } from '@writewhisker/github';

  const api = new GitHubAPI(token);
  let selectedRepo = null;
</script>

<RepositorySelector
  {api}
  bind:selected={selectedRepo}
  on:create={(e) => console.log('Created:', e.detail)}
/>

{#if selectedRepo}
  <p>Selected: {selectedRepo.full_name}</p>
{/if}
```

### CommitHistory

Display commit history:

```svelte
<script lang="ts">
  import { CommitHistory } from '@writewhisker/github';

  const owner = 'username';
  const repo = 'my-story';
</script>

<CommitHistory
  {api}
  {owner}
  {repo}
  limit={10}
  on:commitClick={(e) => console.log('Clicked:', e.detail)}
/>
```

## Advanced Usage

### Custom OAuth Server

Use a custom OAuth proxy server:

```typescript
const auth = new GitHubAuth(storage, {
  oauthProxyUrl: 'https://your-proxy.com/oauth',
  redirectUri: 'https://your-app.com/callback',
});

// OAuth proxy should exchange code for token
await auth.handleCallback(code, clientId);
```

### Webhook Integration

Listen for GitHub webhooks:

```typescript
// Server-side webhook handler
import { verifyWebhookSignature } from '@writewhisker/github';

app.post('/webhook/github', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const payload = req.body;

  if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
    return res.status(401).send('Invalid signature');
  }

  // Handle webhook event
  if (payload.action === 'push') {
    // Story was updated on GitHub
    await handleRemoteUpdate(payload);
  }

  res.status(200).send('OK');
});
```

### Conflict Resolution

Handle merge conflicts when syncing:

```typescript
// Pull with conflict detection
try {
  await sync.pull(story.id);
} catch (error) {
  if (error.code === 'CONFLICT') {
    // Get conflicted files
    const conflicts = error.conflicts;

    // Resolve manually
    const resolution = await showConflictDialog(conflicts);

    // Apply resolution
    await sync.resolveConflicts(story.id, resolution);
  }
}
```

### Branch Management

Work with multiple branches:

```typescript
// List branches
const branches = await api.listBranches('username', 'repo');

// Create branch
await api.createBranch({
  owner: 'username',
  repo: 'my-story',
  branch: 'feature/new-chapter',
  from: 'main',
});

// Switch branch
await sync.switchBranch(story.id, 'feature/new-chapter');

// Merge branch
await api.mergeBranch({
  owner: 'username',
  repo: 'my-story',
  base: 'main',
  head: 'feature/new-chapter',
  commitMessage: 'Merge new chapter',
});
```

### Rate Limiting

Handle GitHub API rate limits:

```typescript
// Check rate limit
const rateLimit = await api.getRateLimit();
console.log('Remaining:', rateLimit.remaining);
console.log('Reset at:', new Date(rateLimit.reset * 1000));

// Implement retry with backoff
async function apiCallWithRetry(fn: Function, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 403 && error.message.includes('rate limit')) {
        const resetTime = error.response.headers['x-ratelimit-reset'];
        const waitTime = (resetTime * 1000) - Date.now();
        console.log(`Rate limited. Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
}
```

## Security Best Practices

### Token Storage

Never expose tokens in client-side code:

```typescript
// ❌ BAD: Token in source code
const token = 'ghp_xxxxxxxxxxxx';

// ✅ GOOD: Token from secure storage
const token = await auth.getAccessToken();

// ✅ GOOD: Token from environment variable (server-side)
const token = process.env.GITHUB_TOKEN;
```

### OAuth Client Secret

Keep client secret secure:

```typescript
// ❌ BAD: Client secret in frontend
const clientSecret = 'abc123';
await auth.login(clientId, clientSecret);

// ✅ GOOD: Use OAuth proxy server
// Frontend only sends code, server exchanges with secret
await auth.handleCallback(code, clientId);
```

### Scope Permissions

Request minimal scopes:

```typescript
// ❌ BAD: Requesting all permissions
await auth.login(clientId, { scopes: ['repo', 'user', 'admin:org'] });

// ✅ GOOD: Request only what you need
await auth.login(clientId, { scopes: ['repo'] });
```

## Common Patterns

### Auto-Save to GitHub

Automatically save story changes:

```typescript
import { debounce } from 'lodash';

const autoSave = debounce(async (story: Story) => {
  try {
    await sync.push(story.id, {
      message: `Auto-save: ${new Date().toLocaleString()}`,
    });
    console.log('Auto-saved to GitHub');
  } catch (error) {
    console.error('Auto-save failed:', error);
  }
}, 30000); // Save every 30 seconds

// Call on story change
story.on('changed', () => {
  autoSave(story);
});
```

### Backup to GitHub

Create periodic backups:

```typescript
async function backupStory(story: Story, owner: string, repo: string) {
  const timestamp = new Date().toISOString();
  const filename = `backups/story-${timestamp}.json`;

  await api.createOrUpdateFile({
    owner,
    repo,
    path: filename,
    content: JSON.stringify(story.serialize(), null, 2),
    message: `Backup: ${timestamp}`,
  });
}

// Backup daily
setInterval(() => {
  backupStory(story, 'username', 'my-story');
}, 24 * 60 * 60 * 1000);
```

### Collaborative Editing

Poll for remote changes:

```typescript
async function syncLoop(storyId: string) {
  while (true) {
    try {
      const hasUpdates = await sync.pull(storyId);
      if (hasUpdates) {
        console.log('Story updated from GitHub');
        // Notify user of changes
      }
    } catch (error) {
      console.error('Sync failed:', error);
    }

    // Wait 5 minutes before next sync
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
  }
}

// Start sync loop
syncLoop(story.id);
```

## API Reference

### `GitHubAuth`

```typescript
class GitHubAuth {
  constructor(storage: IStorageService, options?: AuthOptions);

  login(clientId: string, options?: LoginOptions): Promise<void>;
  handleCallback(code: string, clientId: string): Promise<void>;
  logout(): Promise<void>;

  isAuthenticated(): Promise<boolean>;
  getAccessToken(): Promise<string | null>;
  validateToken(token: string): Promise<boolean>;

  getUser(): Promise<GitHubUser>;
}
```

### `GitHubAPI`

```typescript
class GitHubAPI {
  constructor(token: string);

  // Repositories
  listRepositories(options?: ListOptions): Promise<Repository[]>;
  getRepository(owner: string, repo: string): Promise<Repository>;
  createRepository(options: CreateRepoOptions): Promise<Repository>;

  // Files
  getFileContent(owner: string, repo: string, path: string): Promise<FileContent>;
  createOrUpdateFile(options: FileOptions): Promise<FileResponse>;
  deleteFile(options: DeleteOptions): Promise<void>;

  // Commits
  listCommits(owner: string, repo: string, options?: CommitOptions): Promise<Commit[]>;
  getCommit(owner: string, repo: string, sha: string): Promise<Commit>;

  // Branches
  listBranches(owner: string, repo: string): Promise<Branch[]>;
  createBranch(options: BranchOptions): Promise<Branch>;

  // User
  getUser(): Promise<GitHubUser>;
  getRateLimit(): Promise<RateLimit>;
}
```

### `GitHubSync`

```typescript
class GitHubSync {
  constructor(api: GitHubAPI, storage: IStorageService);

  initializeRepo(options: InitOptions): Promise<void>;
  push(storyId: string, options: PushOptions): Promise<void>;
  pull(storyId: string): Promise<boolean>;

  getStatus(storyId: string): Promise<SyncStatus>;
  resolveConflicts(storyId: string, resolution: Resolution): Promise<void>;
}
```

## Troubleshooting

### OAuth Redirect Issues

```typescript
// Ensure redirect URI matches GitHub app settings
const redirectUri = window.location.origin + '/auth/callback';
await auth.login(clientId, { redirectUri });
```

### CORS Errors

Use OAuth proxy server to avoid CORS:

```typescript
// Server-side proxy endpoint
app.post('/api/github/oauth', async (req, res) => {
  const { code, clientId } = req.body;

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const token = await response.json();
  res.json(token);
});
```

## Bundle Size

- **Size**: ~80KB (gzipped)
- **Dependencies**: @octokit/rest (~70KB), @writewhisker/storage
- **Peer Dependencies**: svelte
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

- [@writewhisker/storage](../storage) - Token storage
- [@writewhisker/core-ts](../core-ts) - Story serialization
- [@writewhisker/editor-base](../editor-base) - GitHub integration UI

## Support

- [Documentation](https://github.com/writewhisker/whisker-editor-web)
- [GitHub OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Issues](https://github.com/writewhisker/whisker-editor-web/issues)
- [Discussions](https://github.com/writewhisker/whisker-editor-web/discussions)
