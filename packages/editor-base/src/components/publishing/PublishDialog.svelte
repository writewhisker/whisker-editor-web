<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Story } from '@writewhisker/core-ts';
  import type { PublishOptions, PublishPlatform } from '../../publishing/types';
  import { StaticPublisher } from '../../publishing/StaticPublisher';
  import { ItchPublisher } from '../../publishing/ItchPublisher';
  import { GitHubPublisher } from '../../publishing/GitHubPublisher';
  import { getVersionManager } from '../../publishing/versionManager';
  import type { StoryVersion } from '../../publishing/versionManager';

  // Props
  let {
    story,
    open = $bindable(false),
  }: {
    story: Story | null;
    open?: boolean;
  } = $props();

  const dispatch = createEventDispatcher();

  // State
  let platform = $state<PublishPlatform>('static');
  let filename = $state('');
  let description = $state('');
  let includeThemeToggle = $state(true);
  let includeSaveLoad = $state(true);
  let defaultTheme = $state<'light' | 'dark'>('light');
  let isPublishing = $state(false);
  let publishError = $state<string | null>(null);

  // Platform-specific state
  let itchApiKey = $state('');
  let itchVisibility = $state<'public' | 'private' | 'draft'>('draft');
  let githubToken = $state('');
  let githubRepo = $state('');
  let githubBranch = $state('gh-pages');

  // Version management
  const versionManager = getVersionManager();
  let version = $state('');
  let versionNotes = $state('');
  let versionHistory = $state<StoryVersion[]>([]);
  let showVersionHistory = $state(false);

  // Load version history when story changes
  $effect(() => {
    if (story && story.metadata.ifid) {
      versionHistory = versionManager.getVersions(story.metadata.ifid);
      // Suggest next version
      if (!version) {
        version = versionManager.suggestNextVersion(story.metadata.ifid, 'patch');
      }
    }
  });

  // Initialize filename from story title
  $effect(() => {
    if (story && !filename) {
      filename = sanitizeFilename(story.metadata.title || 'story');
    }
  });

  function sanitizeFilename(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      || 'story';
  }

  async function handlePublish() {
    if (!story) return;

    isPublishing = true;
    publishError = null;

    try {
      const options: PublishOptions = {
        platform,
        filename,
        includeThemeToggle,
        includeSaveLoad,
        defaultTheme,
        description: description || story.metadata.description,
        visibility: itchVisibility,
        githubRepo: githubRepo || undefined,
        githubBranch: githubBranch || undefined,
      };

      let result;

      switch (platform) {
        case 'static':
          const staticPublisher = new StaticPublisher();
          result = await staticPublisher.publish(story, options);
          break;

        case 'itch-io':
          const itchPublisher = new ItchPublisher();
          itchPublisher.authenticate({ apiKey: itchApiKey });
          result = await itchPublisher.publish(story, options);
          break;

        case 'github-pages':
          const githubPublisher = new GitHubPublisher();
          githubPublisher.authenticate({ token: githubToken });
          result = await githubPublisher.publish(story, options);
          break;

        default:
          throw new Error(`Platform ${platform} not yet implemented`);
      }

      if (result.success) {
        // Save version to history
        if (story.metadata.ifid) {
          versionManager.addVersion(
            story.metadata.ifid,
            story.metadata.title,
            version,
            platform,
            result,
            versionNotes || undefined
          );

          // Refresh version history
          versionHistory = versionManager.getVersions(story.metadata.ifid);
        }

        dispatch('published', result);
        open = false;
      } else {
        publishError = result.error || 'Publishing failed';
      }
    } catch (error) {
      publishError = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      isPublishing = false;
    }
  }

  function handleClose() {
    if (!isPublishing) {
      open = false;
      publishError = null;
    }
  }
</script>

{#if open}
  <div class="dialog-overlay" onclick={handleClose} role="presentation">
    <div
      class="dialog"
      onclick={(e) => e.stopPropagation()}
      role="dialog" tabindex="-1"
      aria-labelledby="dialog-title"
      aria-modal="true"
    >
      <div class="dialog-header">
        <h2 id="dialog-title">Publish Story</h2>
        <button
          class="close-btn"
          onclick={handleClose}
          disabled={isPublishing}
          aria-label="Close dialog"
        >
          ×
        </button>
      </div>

      <div class="dialog-content">
        {#if publishError}
          <div class="error-message">
            <strong>Error: </strong>{publishError}
          </div>
        {/if}

        <div class="form-group">
          <label for="platform">Platform</label>
          <select id="platform" bind:value={platform} disabled={isPublishing}>
            <option value="static">Download HTML File</option>
            <option value="github-pages">GitHub Pages</option>
            <option value="itch-io">itch.io</option>
          </select>
          <p class="help-text">
            {#if platform === 'static'}
              Download a standalone HTML file that can be hosted anywhere.
            {:else if platform === 'github-pages'}
              Publish directly to GitHub Pages (requires personal access token).
            {:else if platform === 'itch-io'}
              Publish to itch.io gaming platform (requires API key).
            {/if}
          </p>
        </div>

        {#if platform === 'itch-io'}
          <div class="form-group">
            <label for="itch-api-key">itch.io API Key</label>
            <input
              type="password"
              id="itch-api-key"
              bind:value={itchApiKey}
              disabled={isPublishing}
              placeholder="Enter your itch.io API key"
            />
            <p class="help-text">
              Get your API key from <a href="https://itch.io/user/settings/api-keys" target="_blank" rel="noopener">itch.io user settings</a>
            </p>
          </div>

          <div class="form-group">
            <label for="itch-visibility">Visibility</label>
            <select id="itch-visibility" bind:value={itchVisibility} disabled={isPublishing}>
              <option value="draft">Draft (hidden)</option>
              <option value="private">Private (only you)</option>
              <option value="public">Public</option>
            </select>
            <p class="help-text">Choose who can see your game on itch.io</p>
          </div>
        {/if}

        {#if platform === 'github-pages'}
          <div class="form-group">
            <label for="github-token">GitHub Personal Access Token</label>
            <input
              type="password"
              id="github-token"
              bind:value={githubToken}
              disabled={isPublishing}
              placeholder="ghp_xxxxxxxxxxxxxxxx"
            />
            <p class="help-text">
              Create a token with 'repo' permissions at <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener">GitHub Settings</a>
            </p>
          </div>

          <div class="form-group">
            <label for="github-repo">Repository Name (Optional)</label>
            <input
              type="text"
              id="github-repo"
              bind:value={githubRepo}
              disabled={isPublishing}
              placeholder="my-story (auto-generated from filename if empty)"
            />
            <p class="help-text">Leave empty to use sanitized story title</p>
          </div>

          <div class="form-group">
            <label for="github-branch">Branch</label>
            <input
              type="text"
              id="github-branch"
              bind:value={githubBranch}
              disabled={isPublishing}
              placeholder="gh-pages"
            />
            <p class="help-text">Branch to deploy to (usually 'gh-pages')</p>
          </div>
        {/if}

        <div class="form-group">
          <label for="filename">Filename</label>
          <input
            type="text"
            id="filename"
            bind:value={filename}
            disabled={isPublishing}
            placeholder="my-story"
          />
          <p class="help-text">Filename without extension (will be sanitized)</p>
        </div>

        <div class="form-group">
          <label for="description">Description (Optional)</label>
          <textarea
            id="description"
            bind:value={description}
            disabled={isPublishing}
            placeholder="A brief description of your story..."
            rows="3"
          ></textarea>
        </div>

        <div class="form-group">
          <label for="version">Version</label>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <input
              type="text"
              id="version"
              bind:value={version}
              disabled={isPublishing}
              placeholder="1.0.0"
              style="flex: 1;"
            />
            {#if versionHistory.length > 0}
              <button
                type="button"
                class="btn btn-secondary"
                onclick={() => showVersionHistory = !showVersionHistory}
                disabled={isPublishing}
              >
                History ({versionHistory.length})
              </button>
            {/if}
          </div>
          <p class="help-text">
            Semantic version (e.g., 1.0.0). Suggested: {versionManager.suggestNextVersion(story?.metadata.ifid || '', 'patch')}
          </p>
        </div>

        {#if showVersionHistory}
          <div class="form-group">
            <label>Version History</label>
            <div class="version-history">
              {#each versionHistory as v}
                <div class="version-entry">
                  <div class="version-info">
                    <strong>v{v.version}</strong>
                    <span class="version-platform">{v.platform}</span>
                    <span class="version-date">{new Date(v.publishedAt).toLocaleDateString()}</span>
                  </div>
                  {#if v.notes}
                    <p class="version-notes">{v.notes}</p>
                  {/if}
                  {#if v.url}
                    <a href={v.url} target="_blank" rel="noopener" class="version-url">View</a>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <div class="form-group">
          <label for="version-notes">Version Notes (Optional)</label>
          <textarea
            id="version-notes"
            bind:value={versionNotes}
            disabled={isPublishing}
            placeholder="What's new in this version..."
            rows="2"
          ></textarea>
        </div>

        <div class="form-group">
          <label>Player Options</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={includeThemeToggle}
                disabled={isPublishing}
              />
              Include theme toggle (light/dark mode)
            </label>
            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={includeSaveLoad}
                disabled={isPublishing}
              />
              Include save/load functionality
            </label>
          </div>
        </div>

        <div class="form-group">
          <label for="theme">Default Theme</label>
          <select id="theme" bind:value={defaultTheme} disabled={isPublishing}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      <div class="dialog-footer">
        <button class="btn btn-secondary" onclick={handleClose} disabled={isPublishing}>
          Cancel
        </button>
        <button
          class="btn btn-primary"
          onclick={handlePublish}
          disabled={isPublishing || !story}
        >
          {isPublishing ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .dialog {
    background: var(--bg-primary, white);
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      transform: translateY(-20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .dialog-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text-primary, #333);
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 2rem;
    line-height: 1;
    cursor: pointer;
    color: var(--text-secondary, #666);
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: var(--bg-hover, #f0f0f0);
  }

  .close-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .dialog-content {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
  }

  .error-message {
    background: #fee;
    color: #c00;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 16px;
    border: 1px solid #fcc;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: var(--text-primary, #333);
  }

  .form-group input[type='text'],
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;
    background: var(--bg-primary, white);
    color: var(--text-primary, #333);
  }

  .form-group input[type='text']:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: none;
    border-color: var(--accent-color, #3498db);
  }

  .form-group textarea {
    resize: vertical;
    min-height: 60px;
  }

  .help-text {
    font-size: 12px;
    color: var(--text-secondary, #666);
    margin-top: 4px;
    margin-bottom: 0;
  }

  .checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: normal;
    cursor: pointer;
  }

  .checkbox-label input[type='checkbox'] {
    cursor: pointer;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 20px;
    border-top: 1px solid var(--border-color, #e0e0e0);
  }

  .btn {
    padding: 10px 20px;
    border-radius: 4px;
    border: none;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--bg-hover, #e0e0e0);
  }

  .btn-primary {
    background: var(--accent-color, #3498db);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover, #2980b9);
  }

  .version-history {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    padding: 12px;
    background: var(--bg-secondary, #f9f9f9);
  }

  .version-entry {
    padding: 12px;
    margin-bottom: 8px;
    background: white;
    border-radius: 4px;
    border-left: 3px solid var(--accent-color, #3498db);
  }

  .version-entry:last-child {
    margin-bottom: 0;
  }

  .version-info {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 4px;
  }

  .version-platform {
    padding: 2px 8px;
    background: var(--accent-color, #3498db);
    color: white;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 500;
  }

  .version-date {
    color: var(--text-secondary, #666);
    font-size: 13px;
  }

  .version-notes {
    margin: 8px 0 0 0;
    color: var(--text-secondary, #666);
    font-size: 14px;
    font-style: italic;
  }

  .version-url {
    display: inline-block;
    margin-top: 4px;
    color: var(--accent-color, #3498db);
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
  }

  .version-url:hover {
    text-decoration: underline;
  }
</style>
