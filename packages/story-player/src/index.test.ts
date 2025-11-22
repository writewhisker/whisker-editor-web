import { describe, it, expect } from 'vitest';
import * as StoryPlayerModule from './index';

describe('@writewhisker/story-player', () => {
  describe('module exports', () => {
    it('should export StoryPlayer class', () => {
      expect(StoryPlayerModule.StoryPlayer).toBeDefined();
      expect(typeof StoryPlayerModule.StoryPlayer).toBe('function');
    });

    it('should export TestScenarioRunner class', () => {
      expect(StoryPlayerModule.TestScenarioRunner).toBeDefined();
      expect(typeof StoryPlayerModule.TestScenarioRunner).toBe('function');
    });

    it('should export all expected classes', () => {
      const exports = Object.keys(StoryPlayerModule);
      expect(exports).toContain('StoryPlayer');
      expect(exports).toContain('TestScenarioRunner');
    });
  });

  describe('StoryPlayer instantiation', () => {
    it('should create StoryPlayer instance', () => {
      const { StoryPlayer } = StoryPlayerModule;
      const player = new StoryPlayer();
      expect(player).toBeInstanceOf(StoryPlayer);
    });
  });

  describe('TestScenarioRunner instantiation', () => {
    it('should create TestScenarioRunner instance', () => {
      const { TestScenarioRunner } = StoryPlayerModule;
      const runner = new TestScenarioRunner();
      expect(runner).toBeInstanceOf(TestScenarioRunner);
    });
  });
});
