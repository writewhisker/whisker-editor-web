/**
 * Type definitions for Vue components
 */

import type { Story, Passage } from '@writewhisker/story-models';
import type { CSSProperties } from 'vue';

/**
 * StoryPlayer component props
 */
export interface StoryPlayerProps {
  story: Story;
  className?: string;
  style?: CSSProperties;
}

/**
 * StoryPlayer component emits
 */
export interface StoryPlayerEmits {
  (e: 'navigate', passageTitle: string): void;
}

/**
 * PassageEditor component props
 */
export interface PassageEditorProps {
  passage: Passage;
  readonly?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * PassageEditor component emits
 */
export interface PassageEditorEmits {
  (e: 'update', passage: Passage): void;
  (e: 'delete'): void;
}
