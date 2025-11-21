<script lang="ts">
  interface Props {
    tags?: string[];
    onChange?: (tags: string[]) => void;
  }

  let { tags = [], onChange }: Props = $props();
  let newTag = $state('');

  function addTag() {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onChange?.([...tags, newTag.trim()]);
      newTag = '';
    }
  }

  function removeTag(tag: string) {
    onChange?.(tags.filter(t => t !== tag));
  }
</script>

<div class="tag-editor">
  <div class="tags">
    {#each tags as tag}
      <span class="tag">
        {tag}
        <button onclick={() => removeTag(tag)}>×</button>
      </span>
    {/each}
  </div>
  <div class="input-row">
    <input
      type="text"
      placeholder="Add tag..."
      bind:value={newTag}
      onkeydown={(e) => e.key === 'Enter' && addTag()}
    />
    <button onclick={addTag}>Add</button>
  </div>
</div>

<style>
  .tag-editor {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: #e5e7eb;
    border-radius: 12px;
    font-size: 12px;
  }

  .tag button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0 2px;
  }

  .input-row {
    display: flex;
    gap: 8px;
  }

  input {
    flex: 1;
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  button {
    padding: 6px 12px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
