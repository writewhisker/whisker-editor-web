/**
 * @deprecated This file is deprecated and should not be used.
 * All story state functionality has been moved to @whisker/editor-base/stores.
 * This file now re-exports from the canonical location to maintain backward compatibility.
 *
 * Import from @whisker/editor-base/stores instead:
 * import { currentStory, storyStateActions, passageList, variableList, passageCount, storyMetadata } from '@whisker/editor-base/stores';
 */

export {
  currentStory,
  storyStateActions,
  passageList,
  variableList,
  passageCount,
  storyMetadata,
} from '@whisker/editor-base/stores';
