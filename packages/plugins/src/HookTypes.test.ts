/**
 * Tests for HookTypes
 */

import { describe, it, expect } from 'vitest';
import {
  HookTypes,
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
} from './HookTypes';

describe('HookTypes', () => {
  describe('MODE', () => {
    it('has observer and transform modes', () => {
      expect(MODE.OBSERVER).toBe('observer');
      expect(MODE.TRANSFORM).toBe('transform');
    });
  });

  describe('STORY hooks', () => {
    it('has story lifecycle hooks', () => {
      expect(STORY.START).toBe('on_story_start');
      expect(STORY.END).toBe('on_story_end');
      expect(STORY.RESET).toBe('on_story_reset');
    });
  });

  describe('PASSAGE hooks', () => {
    it('has passage navigation hooks', () => {
      expect(PASSAGE.ENTER).toBe('on_passage_enter');
      expect(PASSAGE.EXIT).toBe('on_passage_exit');
      expect(PASSAGE.RENDER).toBe('on_passage_render');
    });
  });

  describe('CHOICE hooks', () => {
    it('has choice handling hooks', () => {
      expect(CHOICE.PRESENT).toBe('on_choice_present');
      expect(CHOICE.SELECT).toBe('on_choice_select');
      expect(CHOICE.EVALUATE).toBe('on_choice_evaluate');
    });
  });

  describe('VARIABLE hooks', () => {
    it('has variable management hooks', () => {
      expect(VARIABLE.SET).toBe('on_variable_set');
      expect(VARIABLE.GET).toBe('on_variable_get');
      expect(VARIABLE.CHANGE).toBe('on_state_change');
    });
  });

  describe('PERSISTENCE hooks', () => {
    it('has persistence hooks', () => {
      expect(PERSISTENCE.SAVE).toBe('on_save');
      expect(PERSISTENCE.LOAD).toBe('on_load_save');
      expect(PERSISTENCE.SAVE_LIST).toBe('on_save_list');
    });
  });

  describe('ERROR hooks', () => {
    it('has error hooks', () => {
      expect(ERROR.ERROR).toBe('on_error');
    });
  });

  describe('ALL_EVENTS', () => {
    it('has all events with mode and category', () => {
      expect(ALL_EVENTS['on_story_start']).toEqual({
        mode: 'observer',
        category: 'story',
      });
      expect(ALL_EVENTS['on_passage_render']).toEqual({
        mode: 'transform',
        category: 'passage',
      });
    });
  });

  describe('getAllEvents', () => {
    it('returns sorted array of event names', () => {
      const events = getAllEvents();
      expect(events).toContain('on_story_start');
      expect(events).toContain('on_passage_render');
      expect(events).toContain('on_choice_select');
      // Should be sorted
      expect(events).toEqual([...events].sort());
    });
  });

  describe('getMode', () => {
    it('returns mode for known events', () => {
      expect(getMode('on_story_start')).toBe('observer');
      expect(getMode('on_passage_render')).toBe('transform');
      expect(getMode('on_choice_present')).toBe('transform');
    });

    it('returns undefined for unknown events', () => {
      expect(getMode('unknown_event')).toBeUndefined();
    });
  });

  describe('getCategory', () => {
    it('returns category for known events', () => {
      expect(getCategory('on_story_start')).toBe('story');
      expect(getCategory('on_passage_render')).toBe('passage');
      expect(getCategory('on_choice_select')).toBe('choice');
    });

    it('returns undefined for unknown events', () => {
      expect(getCategory('unknown_event')).toBeUndefined();
    });
  });

  describe('isTransformHook', () => {
    it('returns true for transform hooks', () => {
      expect(isTransformHook('on_passage_render')).toBe(true);
      expect(isTransformHook('on_choice_present')).toBe(true);
      expect(isTransformHook('on_variable_set')).toBe(true);
    });

    it('returns false for observer hooks', () => {
      expect(isTransformHook('on_story_start')).toBe(false);
      expect(isTransformHook('on_choice_select')).toBe(false);
    });
  });

  describe('isObserverHook', () => {
    it('returns true for observer hooks', () => {
      expect(isObserverHook('on_story_start')).toBe(true);
      expect(isObserverHook('on_choice_select')).toBe(true);
      expect(isObserverHook('on_error')).toBe(true);
    });

    it('returns false for transform hooks', () => {
      expect(isObserverHook('on_passage_render')).toBe(false);
    });
  });

  describe('isKnownEvent', () => {
    it('returns true for known events', () => {
      expect(isKnownEvent('on_story_start')).toBe(true);
      expect(isKnownEvent('on_passage_render')).toBe(true);
    });

    it('returns false for unknown events', () => {
      expect(isKnownEvent('unknown_event')).toBe(false);
    });
  });

  describe('getEventsByCategory', () => {
    it('returns events in category', () => {
      const storyEvents = getEventsByCategory('story');
      expect(storyEvents).toContain('on_story_start');
      expect(storyEvents).toContain('on_story_end');
      expect(storyEvents).toContain('on_story_reset');
      expect(storyEvents).not.toContain('on_passage_enter');
    });

    it('returns sorted events', () => {
      const events = getEventsByCategory('choice');
      expect(events).toEqual([...events].sort());
    });
  });

  describe('getCategories', () => {
    it('returns all categories', () => {
      const categories = getCategories();
      expect(categories).toContain('story');
      expect(categories).toContain('passage');
      expect(categories).toContain('choice');
      expect(categories).toContain('variable');
      expect(categories).toContain('persistence');
      expect(categories).toContain('error');
    });

    it('returns sorted categories', () => {
      const categories = getCategories();
      expect(categories).toEqual([...categories].sort());
    });
  });

  describe('HookTypes namespace', () => {
    it('exports all constants', () => {
      expect(HookTypes.MODE).toBe(MODE);
      expect(HookTypes.STORY).toBe(STORY);
      expect(HookTypes.PASSAGE).toBe(PASSAGE);
      expect(HookTypes.CHOICE).toBe(CHOICE);
      expect(HookTypes.VARIABLE).toBe(VARIABLE);
      expect(HookTypes.PERSISTENCE).toBe(PERSISTENCE);
      expect(HookTypes.ERROR).toBe(ERROR);
      expect(HookTypes.ALL_EVENTS).toBe(ALL_EVENTS);
    });

    it('exports all functions', () => {
      expect(HookTypes.getAllEvents).toBe(getAllEvents);
      expect(HookTypes.getMode).toBe(getMode);
      expect(HookTypes.getCategory).toBe(getCategory);
      expect(HookTypes.isTransformHook).toBe(isTransformHook);
      expect(HookTypes.isObserverHook).toBe(isObserverHook);
      expect(HookTypes.isKnownEvent).toBe(isKnownEvent);
      expect(HookTypes.getEventsByCategory).toBe(getEventsByCategory);
      expect(HookTypes.getCategories).toBe(getCategories);
    });
  });
});
