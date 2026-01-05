/**
 * Hook Types
 * Hook event type definitions and constants
 */

import type { HookMode, HookCategory, HookEventInfo } from './types';

/**
 * Hook execution modes
 */
export const MODE = {
  OBSERVER: 'observer' as HookMode,    // Side effects only, returns ignored
  TRANSFORM: 'transform' as HookMode,  // Modify data, returns used
} as const;

/**
 * Story lifecycle hooks
 */
export const STORY = {
  START: 'on_story_start',      // mode: observer, args: (ctx)
  END: 'on_story_end',          // mode: observer, args: (ctx)
  RESET: 'on_story_reset',      // mode: observer, args: (ctx)
} as const;

/**
 * Passage navigation hooks
 */
export const PASSAGE = {
  ENTER: 'on_passage_enter',    // mode: observer, args: (ctx, passage)
  EXIT: 'on_passage_exit',      // mode: observer, args: (ctx, passage)
  RENDER: 'on_passage_render',  // mode: transform, args: (html, ctx, passage)
} as const;

/**
 * Choice handling hooks
 */
export const CHOICE = {
  PRESENT: 'on_choice_present', // mode: transform, args: (choices, ctx)
  SELECT: 'on_choice_select',   // mode: observer, args: (ctx, choice)
  EVALUATE: 'on_choice_evaluate', // mode: transform, args: (result, ctx, choice)
} as const;

/**
 * Variable management hooks
 */
export const VARIABLE = {
  SET: 'on_variable_set',       // mode: transform, args: (value, ctx, name)
  GET: 'on_variable_get',       // mode: transform, args: (value, ctx, name)
  CHANGE: 'on_state_change',    // mode: observer, args: (ctx, changes)
} as const;

/**
 * Persistence hooks
 */
export const PERSISTENCE = {
  SAVE: 'on_save',              // mode: transform, args: (save_data, ctx)
  LOAD: 'on_load_save',         // mode: transform, args: (save_data, ctx)
  SAVE_LIST: 'on_save_list',    // mode: transform, args: (saves, ctx)
} as const;

/**
 * Error handling hooks
 */
export const ERROR = {
  ERROR: 'on_error',            // mode: observer, args: (ctx, error_info)
} as const;

/**
 * All hook events indexed by name
 */
export const ALL_EVENTS: Record<string, HookEventInfo> = {
  // Story lifecycle
  on_story_start: { mode: MODE.OBSERVER, category: 'story' },
  on_story_end: { mode: MODE.OBSERVER, category: 'story' },
  on_story_reset: { mode: MODE.OBSERVER, category: 'story' },
  // Passage navigation
  on_passage_enter: { mode: MODE.OBSERVER, category: 'passage' },
  on_passage_exit: { mode: MODE.OBSERVER, category: 'passage' },
  on_passage_render: { mode: MODE.TRANSFORM, category: 'passage' },
  // Choice handling
  on_choice_present: { mode: MODE.TRANSFORM, category: 'choice' },
  on_choice_select: { mode: MODE.OBSERVER, category: 'choice' },
  on_choice_evaluate: { mode: MODE.TRANSFORM, category: 'choice' },
  // Variable management
  on_variable_set: { mode: MODE.TRANSFORM, category: 'variable' },
  on_variable_get: { mode: MODE.TRANSFORM, category: 'variable' },
  on_state_change: { mode: MODE.OBSERVER, category: 'variable' },
  // Persistence
  on_save: { mode: MODE.TRANSFORM, category: 'persistence' },
  on_load_save: { mode: MODE.TRANSFORM, category: 'persistence' },
  on_save_list: { mode: MODE.TRANSFORM, category: 'persistence' },
  // Error
  on_error: { mode: MODE.OBSERVER, category: 'error' },
};

/**
 * Get all hook event names
 */
export function getAllEvents(): string[] {
  return Object.keys(ALL_EVENTS).sort();
}

/**
 * Get hook mode (observer or transform)
 */
export function getMode(event: string): HookMode | undefined {
  const info = ALL_EVENTS[event];
  return info?.mode;
}

/**
 * Get hook category
 */
export function getCategory(event: string): HookCategory | undefined {
  const info = ALL_EVENTS[event];
  return info?.category;
}

/**
 * Check if event is a transform hook
 */
export function isTransformHook(event: string): boolean {
  return getMode(event) === MODE.TRANSFORM;
}

/**
 * Check if event is an observer hook
 */
export function isObserverHook(event: string): boolean {
  return getMode(event) === MODE.OBSERVER;
}

/**
 * Check if event is a known hook type
 */
export function isKnownEvent(event: string): boolean {
  return ALL_EVENTS[event] !== undefined;
}

/**
 * Get events by category
 */
export function getEventsByCategory(category: HookCategory): string[] {
  const events: string[] = [];
  for (const [event, info] of Object.entries(ALL_EVENTS)) {
    if (info.category === category) {
      events.push(event);
    }
  }
  return events.sort();
}

/**
 * Get all categories
 */
export function getCategories(): HookCategory[] {
  const categories = new Set<HookCategory>();
  for (const info of Object.values(ALL_EVENTS)) {
    categories.add(info.category);
  }
  return Array.from(categories).sort();
}

/**
 * HookTypes namespace export
 */
export const HookTypes = {
  MODE,
  STORY,
  PASSAGE,
  CHOICE,
  VARIABLE,
  PERSISTENCE,
  ERROR,
  ALL_EVENTS,
  getAllEvents,
  getMode,
  getCategory,
  isTransformHook,
  isObserverHook,
  isKnownEvent,
  getEventsByCategory,
  getCategories,
};

export default HookTypes;
