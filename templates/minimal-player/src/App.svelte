<script lang="ts">
  import { Story } from '@writewhisker/core-ts';
  import { StoryPlayer } from '@writewhisker/player-ui';

  // Load story from URL parameter or use demo story
  let story = $state<Story | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  async function loadStory() {
    const params = new URLSearchParams(window.location.search);
    const storyUrl = params.get('story');

    if (storyUrl) {
      try {
        const response = await fetch(storyUrl);
        const storyData = await response.json();
        story = Story.deserialize(storyData);
      } catch (err) {
        error = `Failed to load story: ${err instanceof Error ? err.message : String(err)}`;
      }
    } else {
      // Load demo story
      story = createDemoStory();
    }

    loading = false;
  }

  function createDemoStory(): Story {
    const demoStory = new Story({
      metadata: {
        title: 'Welcome to Whisker',
        author: 'Whisker Team',
        description: 'A minimal story player demonstration',
      },
    });

    // Add demo passages
    const start = demoStory.createPassage({
      name: 'Start',
      content: 'Welcome to the Whisker Minimal Player!\n\nThis is a lightweight player for interactive fiction stories.\n\n[[Continue->Next]]',
      tags: ['start'],
    });

    const next = demoStory.createPassage({
      name: 'Next',
      content: 'The minimal player includes:\n\n• Story rendering\n• Choice navigation\n• Lua scripting support\n• Save/load functionality\n\n[[Go back->Start]]',
    });

    return demoStory;
  }

  // Load story on mount
  $effect(() => {
    loadStory();
  });
</script>

<div class="app">
  <header>
    <h1>Whisker Player</h1>
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
        <button onclick={() => window.location.reload()}>Reload</button>
      </div>
    {:else if story}
      <StoryPlayer {story} />
    {:else}
      <div class="error">
        <p>No story loaded</p>
      </div>
    {/if}
  </main>

  <footer>
    <p>
      Powered by <a href="https://github.com/writewhisker/whisker-editor-web">Whisker</a>
    </p>
  </footer>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: var(--bg-primary, #ffffff);
    color: var(--text-primary, #333333);
  }

  header {
    padding: 1rem 2rem;
    background: var(--bg-secondary, #f5f5f5);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  header h1 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--primary-color, #2196f3);
  }

  main {
    flex: 1;
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
    width: 100%;
  }

  footer {
    padding: 1rem 2rem;
    text-align: center;
    background: var(--bg-secondary, #f5f5f5);
    border-top: 1px solid var(--border-color, #e0e0e0);
    font-size: 0.875rem;
    color: var(--text-secondary, #666666);
  }

  footer a {
    color: var(--primary-color, #2196f3);
    text-decoration: none;
  }

  footer a:hover {
    text-decoration: underline;
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
    border: 4px solid var(--border-color, #e0e0e0);
    border-top-color: var(--primary-color, #2196f3);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error h2 {
    color: var(--error-color, #f44336);
    margin-bottom: 1rem;
  }

  .error button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: var(--primary-color, #2196f3);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }

  .error button:hover {
    background: var(--primary-hover, #1976d2);
  }
</style>
