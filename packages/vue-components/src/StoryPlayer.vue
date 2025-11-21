<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Story } from '@writewhisker/story-models';

export interface StoryPlayerProps {
  story: Story;
}

export interface StoryPlayerEmits {
  (e: 'navigate', passage: string): void;
}

const props = defineProps<StoryPlayerProps>();
const emit = defineEmits<StoryPlayerEmits>();

const currentPassage = ref(props.story.startPassage || '');

const passage = computed(() => {
  return props.story.passages.find(p => p.title === currentPassage.value);
});

function navigateTo(passageTitle: string) {
  currentPassage.value = passageTitle;
  emit('navigate', passageTitle);
}

function processContent(content: string) {
  const parts: Array<{ type: 'text' | 'link'; content: string; target?: string }> = [];
  const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }

    const text = match[2] ? match[1] : match[1];
    const target = match[2] || match[1];
    parts.push({ type: 'link', content: text, target });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }

  return parts;
}
</script>

<template>
  <div class="story-player">
    <div v-if="!passage">Passage not found: {{ currentPassage }}</div>
    <div v-else class="passage">
      <h2 class="passage-title">{{ passage.title }}</h2>
      <div class="passage-content">
        <template v-for="(part, index) in processContent(passage.content)" :key="index">
          <span v-if="part.type === 'text'">{{ part.content }}</span>
          <button v-else class="link" @click="navigateTo(part.target!)">
            {{ part.content }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.story-player {
  font-family: system-ui, sans-serif;
  line-height: 1.6;
}

.passage {
  padding: 2rem;
}

.passage-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #2c3e50;
}

.passage-content {
  white-space: pre-wrap;
  margin-bottom: 1rem;
}

.link {
  display: inline-block;
  margin: 0.5rem 0.5rem 0.5rem 0;
  padding: 0.5rem 1rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.link:hover {
  background: #2980b9;
}
</style>
