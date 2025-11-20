<script lang="ts">
  import { Story } from '@writewhisker/core-ts';
  import { HTMLExporter, JSONExporter } from '@writewhisker/export';
  import { PublishingManager, type PublishTarget, type PublishOptions } from '@writewhisker/publishing';

  // State
  let story = $state<Story | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let publishing = $state(false);
  let publishStatus = $state<string>('');

  // Publishing options
  let selectedTarget = $state<PublishTarget>('web');
  let publishOptions = $state<PublishOptions>({
    target: 'web',
    minify: true,
    includeAnalytics: true,
    standalone: true,
  });

  // Available targets
  const targets: { value: PublishTarget; label: string; description: string }[] = [
    {
      value: 'web',
      label: 'Web Player',
      description: 'Standalone HTML file for web hosting',
    },
    {
      value: 'itch',
      label: 'itch.io',
      description: 'Upload to itch.io marketplace',
    },
    {
      value: 'github',
      label: 'GitHub Pages',
      description: 'Deploy to GitHub Pages',
    },
    {
      value: 'epub',
      label: 'EPUB',
      description: 'E-book format for e-readers',
    },
  ];

  async function loadStory() {
    const params = new URLSearchParams(window.location.search);
    const storyUrl = params.get('story');

    try {
      if (storyUrl) {
        const response = await fetch(storyUrl);
        const storyData = await response.json();
        story = Story.deserialize(storyData);
      } else {
        // Load demo story
        story = createDemoStory();
      }
    } catch (err) {
      error = `Failed to load story: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      loading = false;
    }
  }

  function createDemoStory(): Story {
    const demoStory = new Story({
      metadata: {
        title: 'My Story',
        author: 'Author Name',
        description: 'An amazing interactive fiction adventure',
      },
    });

    demoStory.createPassage({
      name: 'Start',
      content: 'Your adventure begins here!\\n\\n[[Continue->Next]]',
      tags: ['start'],
    });

    demoStory.createPassage({
      name: 'Next',
      content: 'The story continues...\\n\\n[[The End->End]]',
    });

    demoStory.createPassage({
      name: 'End',
      content: 'Thanks for playing!',
    });

    return demoStory;
  }

  async function handlePublish() {
    if (!story) return;

    publishing = true;
    publishStatus = 'Preparing story...';

    try {
      const manager = new PublishingManager();

      publishStatus = `Publishing to ${selectedTarget}...`;
      publishOptions.target = selectedTarget;

      const result = await manager.publish(story, publishOptions);

      publishStatus = 'Publishing complete!';

      // Download the result
      if (result.data) {
        downloadFile(result.data, result.filename || 'story.html', result.mimeType || 'text/html');
      }

      setTimeout(() => {
        publishStatus = '';
        publishing = false;
      }, 2000);
    } catch (err) {
      error = `Publishing failed: ${err instanceof Error ? err.message : String(err)}`;
      publishing = false;
      publishStatus = '';
    }
  }

  function downloadFile(content: string | Blob, filename: string, mimeType: string) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportJSON() {
    if (!story) return;

    const exporter = new JSONExporter();
    const json = await exporter.export(story);
    downloadFile(json, `${story.metadata.title || 'story'}.json`, 'application/json');
  }

  async function handleExportHTML() {
    if (!story) return;

    const exporter = new HTMLExporter();
    const html = await exporter.export(story);
    downloadFile(html, `${story.metadata.title || 'story'}.html`, 'text/html');
  }

  // Load story on mount
  $effect(() => {
    loadStory();
  });

  // Update publish options when target changes
  $effect(() => {
    publishOptions.target = selectedTarget;
  });
</script>

<div class="app">
  <header>
    <div class="header-content">
      <h1>Publishing Tool</h1>
      {#if story}
        <p class="story-title">{story.metadata.title}</p>
      {/if}
    </div>
  </header>

  <main>
    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading story...</p>
      </div>
    {:else if error}
      <div class="error">
        <h2>Error</h2>
        <p>{error}</p>
        <button class="button" onclick={() => window.location.reload()}>Reload</button>
      </div>
    {:else if story}
      <div class="publisher">
        <!-- Story Info -->
        <section class="story-info">
          <div class="card">
            <h2 class="card-title">Story Information</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Title:</span>
                <span class="value">{story.metadata.title || 'Untitled'}</span>
              </div>
              <div class="info-item">
                <span class="label">Author:</span>
                <span class="value">{story.metadata.author || 'Unknown'}</span>
              </div>
              <div class="info-item">
                <span class="label">Passages:</span>
                <span class="value">{story.getPassages().length}</span>
              </div>
              <div class="info-item">
                <span class="label">Description:</span>
                <span class="value">{story.metadata.description || 'No description'}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Publishing Options -->
        <section class="publishing-options">
          <div class="card">
            <h2 class="card-title">Publish To</h2>
            <div class="targets">
              {#each targets as target}
                <button
                  class="target-card"
                  class:selected={selectedTarget === target.value}
                  onclick={() => (selectedTarget = target.value)}
                  disabled={publishing}
                >
                  <div class="target-label">{target.label}</div>
                  <div class="target-description">{target.description}</div>
                </button>
              {/each}
            </div>

            <div class="options-form">
              <h3>Options</h3>

              <label class="checkbox-label">
                <input
                  type="checkbox"
                  bind:checked={publishOptions.minify}
                  disabled={publishing}
                />
                Minify output
              </label>

              <label class="checkbox-label">
                <input
                  type="checkbox"
                  bind:checked={publishOptions.includeAnalytics}
                  disabled={publishing}
                />
                Include analytics
              </label>

              <label class="checkbox-label">
                <input
                  type="checkbox"
                  bind:checked={publishOptions.standalone}
                  disabled={publishing}
                />
                Standalone file
              </label>
            </div>

            <div class="publish-actions">
              <button
                class="button"
                onclick={handlePublish}
                disabled={publishing}
              >
                {publishing ? 'Publishing...' : `Publish to ${targets.find((t) => t.value === selectedTarget)?.label}`}
              </button>

              {#if publishStatus}
                <p class="publish-status">{publishStatus}</p>
              {/if}
            </div>
          </div>
        </section>

        <!-- Quick Export -->
        <section class="quick-export">
          <div class="card">
            <h2 class="card-title">Quick Export</h2>
            <div class="export-buttons">
              <button class="button secondary" onclick={handleExportJSON}>
                Export JSON
              </button>
              <button class="button secondary" onclick={handleExportHTML}>
                Export HTML
              </button>
            </div>
          </div>
        </section>
      </div>
    {:else}
      <div class="error">
        <p>No story loaded</p>
      </div>
    {/if}
  </main>
</div>

<style>
  .app {
    min-height: 100vh;
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  header {
    background: var(--bg-card);
    border-bottom: 1px solid var(--border-color);
    padding: 2rem;
    box-shadow: var(--shadow-sm);
  }

  .header-content {
    max-width: 1200px;
    margin: 0 auto;
  }

  header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
    color: var(--primary-color);
  }

  .story-title {
    margin: 0;
    font-size: 1rem;
    color: var(--text-secondary);
  }

  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .loading,
  .error {
    text-align: center;
    padding: 3rem 1rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 1rem;
    border: 4px solid var(--border-color);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .publisher {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .info-item .label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .info-item .value {
    color: var(--text-primary);
  }

  .targets {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .target-card {
    padding: 1.5rem;
    background: var(--bg-secondary);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .target-card:hover:not(:disabled) {
    border-color: var(--primary-color);
    box-shadow: var(--shadow-md);
  }

  .target-card.selected {
    border-color: var(--primary-color);
    background: var(--primary-color);
    color: white;
  }

  .target-card.selected .target-label,
  .target-card.selected .target-description {
    color: white;
  }

  .target-card:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .target-label {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: var(--text-primary);
  }

  .target-description {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .options-form {
    margin-bottom: 2rem;
  }

  .options-form h3 {
    margin: 0 0 1rem 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    cursor: pointer;
    color: var(--text-primary);
  }

  .checkbox-label input[type='checkbox'] {
    cursor: pointer;
  }

  .publish-actions {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .publish-status {
    margin: 0;
    padding: 0.75rem;
    background: var(--success-color);
    color: white;
    border-radius: 4px;
    text-align: center;
    font-weight: 500;
  }

  .export-buttons {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .error h2 {
    color: var(--error-color);
    margin-bottom: 1rem;
  }
</style>
