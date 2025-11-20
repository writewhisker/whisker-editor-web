<script lang="ts">
  import { Story } from '@writewhisker/editor-base';
  import { StoryEditor } from '@writewhisker/editor-base';

  // Create or load story
  let story = $state<Story>(createNewStory());

  function createNewStory(): Story {
    const newStory = new Story({
      metadata: {
        title: 'Untitled Story',
        author: '',
        description: '',
      },
    });

    // Create initial start passage
    newStory.createPassage({
      name: 'Start',
      content: 'Your story begins here...',
      tags: ['start'],
    });

    return newStory;
  }

  // Auto-save every 30 seconds
  $effect(() => {
    const interval = setInterval(() => {
      if (story) {
        saveToLocalStorage(story);
      }
    }, 30000);

    return () => clearInterval(interval);
  });

  function saveToLocalStorage(story: Story) {
    try {
      localStorage.setItem('whisker-story-draft', JSON.stringify(story.serialize()));
      console.log('Story auto-saved');
    } catch (err) {
      console.error('Failed to auto-save:', err);
    }
  }

  // Load from localStorage on mount
  $effect(() => {
    const saved = localStorage.getItem('whisker-story-draft');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        story = Story.deserialize(data);
        console.log('Loaded saved story');
      } catch (err) {
        console.error('Failed to load saved story:', err);
      }
    }
  });
</script>

<div class="app">
  {#if story}
    <StoryEditor {story} />
  {:else}
    <div class="loading">
      <p>Initializing editor...</p>
    </div>
  {/if}
</div>

<style>
  .app {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-primary, #ffffff);
    color: var(--text-primary, #333333);
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 1.125rem;
    color: var(--text-secondary, #666666);
  }
</style>
