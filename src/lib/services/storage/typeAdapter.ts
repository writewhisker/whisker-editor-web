/**
 * Type Adapter
 * Placeholder for model/storage type conversions
 */

import type { Story } from '@writewhisker/core-ts';

export function modelToStorage(story: Story): Story {
  // For now, no conversion needed - pass through
  return story;
}

export function storageToModel(story: Story): Story {
  // For now, no conversion needed - pass through
  return story;
}
