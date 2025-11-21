<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Passage } from '@writewhisker/story-models';

export interface PassageEditorProps {
  passage: Passage;
}

export interface PassageEditorEmits {
  (e: 'update:passage', passage: Passage): void;
}

const props = defineProps<PassageEditorProps>();
const emit = defineEmits<PassageEditorEmits>();

const title = ref(props.passage.title);
const content = ref(props.passage.content);

watch([title, content], () => {
  emit('update:passage', {
    ...props.passage,
    title: title.value,
    content: content.value,
  });
});
</script>

<template>
  <div class="passage-editor">
    <div class="editor">
      <div class="field">
        <label>Title</label>
        <input
          v-model="title"
          type="text"
          placeholder="Passage title"
        />
      </div>

      <div class="field">
        <label>Content</label>
        <textarea
          v-model="content"
          placeholder="Passage content"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.passage-editor {
  font-family: system-ui, sans-serif;
}

.editor {
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.field {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 600;
  color: #333;
}

input,
textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
}

textarea {
  min-height: 200px;
  resize: vertical;
}
</style>
