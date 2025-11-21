<script lang="ts">
  interface Props {
    value?: string;
    placeholder?: string;
    onChange?: (value: string) => void;
  }

  let { value = '', placeholder = 'Enter text...', onChange }: Props = $props();

  function handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    onChange?.(target.value);
  }
</script>

<textarea
  class="text-editor"
  {placeholder}
  {value}
  oninput={handleInput}
></textarea>

<style>
  .text-editor {
    width: 100%;
    min-height: 200px;
    padding: 12px;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 14px;
    line-height: 1.6;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
  }

  .text-editor:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
</style>
