<script lang="ts">
  import { Story } from '@writewhisker/editor-base';

  let story = $state<Story>(createDemoStory());

  function createDemoStory(): Story {
    const newStory = new Story({
      metadata: {
        title: 'Full Editor Demo',
        author: 'Whisker Team',
        description: 'Demonstrates the full editor capabilities',
      },
    });

    newStory.createPassage({
      name: 'Start',
      content: 'This example demonstrates the full Whisker editor with all features enabled.',
      tags: ['start'],
    });

    return newStory;
  }
</script>

<div class="editor">
  <h1>Full Editor Example</h1>
  <p>Story: {story.metadata.title}</p>
  <p>This example demonstrates using @writewhisker/editor-base with all features.</p>
</div>

<style>
  .editor {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
</style>
