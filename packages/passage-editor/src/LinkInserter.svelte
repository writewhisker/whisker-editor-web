<script lang="ts">
  interface Props {
    passages?: Array<{ id: string; title: string }>;
    onInsert?: (passageId: string) => void;
  }

  let { passages = [], onInsert }: Props = $props();
  let searchQuery = $state('');

  const filtered = $derived(
    passages.filter(p =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  function handleSelect(passageId: string) {
    onInsert?.(passageId);
    searchQuery = '';
  }
</script>

<div class="link-inserter">
  <input
    type="text"
    placeholder="Search passages..."
    bind:value={searchQuery}
  />
  {#if searchQuery}
    <div class="suggestions">
      {#each filtered as passage}
        <button
          class="suggestion"
          onclick={() => handleSelect(passage.id)}
        >
          {passage.title}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .link-inserter {
    position: relative;
  }

  input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-top: 4px;
    max-height: 200px;
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 10;
  }

  .suggestion {
    width: 100%;
    padding: 8px 12px;
    text-align: left;
    border: none;
    background: none;
    cursor: pointer;
  }

  .suggestion:hover {
    background: #f3f4f6;
  }
</style>
