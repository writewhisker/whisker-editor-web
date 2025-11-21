<script lang="ts">
  import type { PassageData, EditorOptions } from './types';

  interface Props {
    passage?: PassageData;
    options?: EditorOptions;
    onChange?: (passage: PassageData) => void;
  }

  let {
    passage = { id: '', title: '', content: '', tags: [] },
    options = {},
    onChange
  }: Props = $props();

  let localPassage = $state({ ...passage });

  function handleTitleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    localPassage.title = target.value;
    onChange?.(localPassage);
  }

  function handleContentChange(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    localPassage.content = target.value;
    onChange?.(localPassage);
  }
</script>

<div class="passage-editor">
  <div class="header">
    <input
      type="text"
      class="title-input"
      placeholder="Passage Title"
      value={localPassage.title}
      oninput={handleTitleChange}
    />
    <div class="tags">
      {#each localPassage.tags as tag}
        <span class="tag">{tag}</span>
      {/each}
    </div>
  </div>

  <div class="content-editor">
    <textarea
      class="content-input"
      placeholder="Write your passage content here..."
      value={localPassage.content}
      oninput={handleContentChange}
      spellcheck={options.spellcheck ?? true}
    ></textarea>
  </div>

  <div class="footer">
    <span class="word-count">
      {localPassage.content.split(/\s+/).filter(w => w.length > 0).length} words
    </span>
  </div>
</div>

<style>
  .passage-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
  }

  .header {
    padding: 16px;
    border-bottom: 1px solid #ddd;
  }

  .title-input {
    width: 100%;
    padding: 8px;
    font-size: 18px;
    font-weight: 600;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .tags {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .tag {
    padding: 4px 12px;
    background: #e5e7eb;
    border-radius: 12px;
    font-size: 12px;
  }

  .content-editor {
    flex: 1;
    padding: 16px;
  }

  .content-input {
    width: 100%;
    height: 100%;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px;
    line-height: 1.6;
    resize: none;
  }

  .footer {
    padding: 8px 16px;
    border-top: 1px solid #ddd;
    font-size: 12px;
    color: #666;
    text-align: right;
  }
</style>
