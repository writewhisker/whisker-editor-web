/**
 * Tests for Performance Profiler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Story, Passage } from '@writewhisker/story-models';
import {
  Profiler,
  createProfiler,
  measure,
  StoryProfiler,
  createStoryProfiler,
  PerformanceMonitor,
  createPerformanceMonitor,
  type PerformanceMetric,
  type PerformanceProfile,
  type MemorySnapshot,
} from './index';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
};

// @ts-ignore
global.performance = mockPerformance;

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
}) as any;

const mockStory: Story = {
  id: 'test-story',
  name: 'Test Story',
  ifid: 'test-ifid',
  startPassage: 'Start',
  tagColors: {},
  zoom: 1,
  passages: [
    {
      id: 'passage-1',
      title: 'Start',
      tags: [],
      content: 'Start passage',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
    },
  ],
};

describe('Profiler', () => {
  let profiler: Profiler;
  let currentTime: number;

  beforeEach(() => {
    profiler = new Profiler();
    currentTime = 1000;
    mockPerformance.now.mockImplementation(() => currentTime);
    vi.clearAllMocks();
  });

  describe('start', () => {
    it('should start profiling', () => {
      const id = profiler.start('test-operation');

      expect(id).toBeDefined();
      expect(id).toContain('test-operation');
    });

    it('should return unique IDs', () => {
      const id1 = profiler.start('operation');
      const id2 = profiler.start('operation');

      expect(id1).not.toBe(id2);
    });

    it('should record start time', () => {
      const id = profiler.start('test');
      const profile = profiler.getProfile(id);

      expect(profile?.startTime).toBe(1000);
    });

    it('should create profile with name', () => {
      const id = profiler.start('my-operation');
      const profile = profiler.getProfile(id);

      expect(profile?.name).toBe('my-operation');
    });

    it('should nest profiles', () => {
      const parentId = profiler.start('parent');
      const childId = profiler.start('child');

      const parent = profiler.getProfile(parentId);
      const child = profiler.getProfile(childId);

      expect(parent?.children).toContain(child);
    });

    it('should set active profile', () => {
      const id = profiler.start('test');

      expect((profiler as any).activeProfile?.id).toBe(id);
    });
  });

  describe('end', () => {
    it('should end profiling', () => {
      const id = profiler.start('test');
      currentTime += 100;

      const profile = profiler.end(id);

      expect(profile).toBeDefined();
      expect(profile?.endTime).toBe(1100);
      expect(profile?.duration).toBe(100);
    });

    it('should return null for non-existent profile', () => {
      const profile = profiler.end('non-existent');

      expect(profile).toBeNull();
    });

    it('should calculate duration', () => {
      const id = profiler.start('test');
      currentTime += 250;

      const profile = profiler.end(id);

      expect(profile?.duration).toBe(250);
    });

    it('should restore parent as active profile', () => {
      const parentId = profiler.start('parent');
      const childId = profiler.start('child');

      profiler.end(childId);

      expect((profiler as any).activeProfile?.id).toBe(parentId);
    });

    it('should clear active profile for root', () => {
      const id = profiler.start('root');

      profiler.end(id);

      expect((profiler as any).activeProfile).toBeNull();
    });
  });

  describe('recordMetric', () => {
    it('should record metric', () => {
      profiler.recordMetric('load-time', 100, 'ms');

      const metrics = profiler.getMetrics();
      expect(metrics).toContainEqual(
        expect.objectContaining({
          name: 'load-time',
          value: 100,
          unit: 'ms',
        })
      );
    });

    it('should support different units', () => {
      profiler.recordMetric('memory', 1024, 'bytes');
      profiler.recordMetric('count', 5, 'count');
      profiler.recordMetric('ratio', 75, 'percent');

      const metrics = profiler.getMetrics();
      expect(metrics.length).toBe(3);
    });

    it('should add metric to active profile', () => {
      const id = profiler.start('test');
      profiler.recordMetric('test-metric', 42, 'count');

      const profile = profiler.getProfile(id);
      expect(profile?.metrics).toContainEqual(
        expect.objectContaining({
          name: 'test-metric',
          value: 42,
        })
      );
    });

    it('should record timestamp', () => {
      profiler.recordMetric('test', 100, 'ms');

      const metrics = profiler.getMetrics();
      expect(metrics[0].timestamp).toBeDefined();
    });
  });

  describe('takeMemorySnapshot', () => {
    it('should take memory snapshot in Node.js environment', () => {
      const mockMemoryUsage = {
        heapUsed: 1000000,
        heapTotal: 2000000,
        external: 50000,
        arrayBuffers: 10000,
        rss: 3000000,
      };

      process.memoryUsage = vi.fn(() => mockMemoryUsage);

      const snapshot = profiler.takeMemorySnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot?.heapUsed).toBe(1000000);
      expect(snapshot?.heapTotal).toBe(2000000);
      expect(snapshot?.external).toBe(50000);
      expect(snapshot?.arrayBuffers).toBe(10000);
    });

    it('should return null in browser environment', () => {
      const originalMemoryUsage = process.memoryUsage;
      // @ts-ignore
      delete process.memoryUsage;

      const snapshot = profiler.takeMemorySnapshot();

      expect(snapshot).toBeNull();

      process.memoryUsage = originalMemoryUsage;
    });

    it('should store snapshots', () => {
      process.memoryUsage = vi.fn(() => ({
        heapUsed: 1000000,
        heapTotal: 2000000,
        external: 50000,
        arrayBuffers: 10000,
        rss: 3000000,
      }));

      profiler.takeMemorySnapshot();
      profiler.takeMemorySnapshot();

      const snapshots = profiler.getMemorySnapshots();
      expect(snapshots.length).toBe(2);
    });

    it('should handle missing arrayBuffers', () => {
      process.memoryUsage = vi.fn(() => ({
        heapUsed: 1000000,
        heapTotal: 2000000,
        external: 50000,
        rss: 3000000,
      })) as any;

      const snapshot = profiler.takeMemorySnapshot();

      expect(snapshot?.arrayBuffers).toBe(0);
    });
  });

  describe('getProfile', () => {
    it('should return profile by ID', () => {
      const id = profiler.start('test');
      const profile = profiler.getProfile(id);

      expect(profile?.id).toBe(id);
      expect(profile?.name).toBe('test');
    });

    it('should return undefined for non-existent profile', () => {
      const profile = profiler.getProfile('non-existent');

      expect(profile).toBeUndefined();
    });
  });

  describe('getProfiles', () => {
    it('should return all profiles', () => {
      profiler.start('test-1');
      profiler.start('test-2');

      const profiles = profiler.getProfiles();

      expect(profiles.length).toBe(2);
    });

    it('should return empty array when no profiles', () => {
      const profiles = profiler.getProfiles();

      expect(profiles).toEqual([]);
    });
  });

  describe('getMetrics', () => {
    it('should return all metrics', () => {
      profiler.recordMetric('metric-1', 100, 'ms');
      profiler.recordMetric('metric-2', 200, 'ms');

      const metrics = profiler.getMetrics();

      expect(metrics.length).toBe(2);
    });

    it('should return copy of metrics array', () => {
      profiler.recordMetric('test', 100, 'ms');

      const metrics1 = profiler.getMetrics();
      metrics1.push({
        name: 'fake',
        value: 1,
        unit: 'ms',
        timestamp: Date.now(),
      });

      const metrics2 = profiler.getMetrics();

      expect(metrics2.length).toBe(1);
    });
  });

  describe('getMemorySnapshots', () => {
    it('should return all memory snapshots', () => {
      process.memoryUsage = vi.fn(() => ({
        heapUsed: 1000000,
        heapTotal: 2000000,
        external: 50000,
        arrayBuffers: 10000,
        rss: 3000000,
      }));

      profiler.takeMemorySnapshot();
      profiler.takeMemorySnapshot();

      const snapshots = profiler.getMemorySnapshots();

      expect(snapshots.length).toBe(2);
    });

    it('should return copy of snapshots array', () => {
      process.memoryUsage = vi.fn(() => ({
        heapUsed: 1000000,
        heapTotal: 2000000,
        external: 50000,
        arrayBuffers: 10000,
        rss: 3000000,
      }));

      profiler.takeMemorySnapshot();

      const snapshots1 = profiler.getMemorySnapshots();
      snapshots1.push({
        timestamp: Date.now(),
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        arrayBuffers: 0,
      });

      const snapshots2 = profiler.getMemorySnapshots();

      expect(snapshots2.length).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      profiler.start('test');
      profiler.recordMetric('metric', 100, 'ms');

      profiler.clear();

      expect(profiler.getProfiles()).toEqual([]);
      expect(profiler.getMetrics()).toEqual([]);
      expect(profiler.getMemorySnapshots()).toEqual([]);
    });

    it('should clear active profile', () => {
      profiler.start('test');
      profiler.clear();

      expect((profiler as any).activeProfile).toBeNull();
    });
  });

  describe('analyze', () => {
    it('should analyze performance data', () => {
      const id1 = profiler.start('slow-op');
      currentTime += 500;
      profiler.end(id1);

      const id2 = profiler.start('fast-op');
      currentTime += 50;
      profiler.end(id2);

      const analysis = profiler.analyze();

      expect(analysis.slowestOperations[0].name).toBe('slow-op');
      expect(analysis.slowestOperations[0].duration).toBe(500);
    });

    it('should calculate total duration', () => {
      const id1 = profiler.start('op-1');
      currentTime += 100;
      profiler.end(id1);

      const id2 = profiler.start('op-2');
      currentTime += 200;
      profiler.end(id2);

      const analysis = profiler.analyze();

      expect(analysis.totalDuration).toBe(300);
    });

    it('should calculate average duration', () => {
      const id1 = profiler.start('op-1');
      currentTime += 100;
      profiler.end(id1);

      const id2 = profiler.start('op-2');
      currentTime += 200;
      profiler.end(id2);

      const analysis = profiler.analyze();

      expect(analysis.averageDuration).toBe(150);
    });

    it('should calculate memory growth', () => {
      process.memoryUsage = vi.fn()
        .mockReturnValueOnce({
          heapUsed: 1000000,
          heapTotal: 2000000,
          external: 50000,
          arrayBuffers: 10000,
          rss: 3000000,
        })
        .mockReturnValueOnce({
          heapUsed: 1500000,
          heapTotal: 2000000,
          external: 50000,
          arrayBuffers: 10000,
          rss: 3000000,
        });

      profiler.takeMemorySnapshot();
      profiler.takeMemorySnapshot();

      const analysis = profiler.analyze();

      expect(analysis.memoryGrowth).toBe(500000);
    });

    it('should limit slowest operations to 10', () => {
      for (let i = 0; i < 20; i++) {
        const id = profiler.start(`op-${i}`);
        currentTime += 10;
        profiler.end(id);
      }

      const analysis = profiler.analyze();

      expect(analysis.slowestOperations.length).toBe(10);
    });

    it('should handle no profiles', () => {
      const analysis = profiler.analyze();

      expect(analysis.totalDuration).toBe(0);
      expect(analysis.averageDuration).toBe(0);
      expect(analysis.slowestOperations).toEqual([]);
    });

    it('should exclude child profiles from root analysis', () => {
      const parentId = profiler.start('parent');
      currentTime += 50;

      const childId = profiler.start('child');
      currentTime += 25;
      profiler.end(childId);

      currentTime += 50;
      profiler.end(parentId);

      const analysis = profiler.analyze();

      // Should only count parent duration
      expect(analysis.totalDuration).toBe(125);
    });
  });

  describe('createProfiler', () => {
    it('should create profiler instance', () => {
      const instance = createProfiler();

      expect(instance).toBeInstanceOf(Profiler);
    });
  });
});

describe('measure', () => {
  let currentTime: number;

  beforeEach(() => {
    currentTime = 1000;
    mockPerformance.now.mockImplementation(() => currentTime);
  });

  it('should measure function execution time', async () => {
    const fn = vi.fn(() => 'result');

    currentTime = 1000;
    const promise = measure('test', fn);
    currentTime = 1100;

    const { result, duration } = await promise;

    expect(result).toBe('result');
    expect(duration).toBe(100);
  });

  it('should measure async function', async () => {
    const asyncFn = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'async result';
    };

    const { result, duration } = await measure('async-test', asyncFn);

    expect(result).toBe('async result');
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('should record metric with profiler', async () => {
    const profiler = createProfiler();
    const fn = () => 'result';

    currentTime = 1000;
    const promise = measure('test', fn, profiler);
    currentTime = 1050;

    await promise;

    const metrics = profiler.getMetrics();
    expect(metrics).toContainEqual(
      expect.objectContaining({
        name: 'test',
        value: 50,
        unit: 'ms',
      })
    );
  });

  it('should work without profiler', async () => {
    const fn = () => 'result';

    const { result, duration } = await measure('test', fn);

    expect(result).toBe('result');
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});

describe('StoryProfiler', () => {
  let storyProfiler: StoryProfiler;
  let currentTime: number;

  beforeEach(() => {
    storyProfiler = new StoryProfiler();
    currentTime = 1000;
    mockPerformance.now.mockImplementation(() => currentTime);
  });

  describe('profileLoading', () => {
    it('should profile story loading', async () => {
      const loadFn = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return mockStory;
      };

      currentTime = 1000;
      const promise = storyProfiler.profileLoading(loadFn);
      currentTime = 1100;

      const result = await promise;

      expect(result.story).toBe(mockStory);
      expect(result.loadTime).toBe(100);
      expect(result.parseTime).toBe(100);
    });

    it('should handle load errors', async () => {
      const loadFn = async () => {
        throw new Error('Load failed');
      };

      await expect(storyProfiler.profileLoading(loadFn)).rejects.toThrow('Load failed');
    });
  });

  describe('profileRendering', () => {
    it('should profile passage rendering', () => {
      const passage = mockStory.passages[0];
      const renderFn = vi.fn();

      currentTime = 1000;
      const result = storyProfiler.profileRendering(passage, renderFn);
      currentTime = 1025;

      expect(result.renderTime).toBeGreaterThanOrEqual(0);
      expect(result.contentLength).toBe(passage.content.length);
      expect(renderFn).toHaveBeenCalled();
    });

    it('should record content length metric', () => {
      const passage = mockStory.passages[0];
      const renderFn = () => {};

      storyProfiler.profileRendering(passage, renderFn);

      const metrics = storyProfiler.getProfiler().getMetrics();
      expect(metrics).toContainEqual(
        expect.objectContaining({
          name: 'content-length',
          unit: 'bytes',
        })
      );
    });
  });

  describe('profileLinkProcessing', () => {
    it('should profile link processing', () => {
      const content = '[[Link 1]] text [[Link 2|Target]]';

      currentTime = 1000;
      const result = storyProfiler.profileLinkProcessing(content);
      currentTime = 1010;

      expect(result.linkCount).toBe(2);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should count links correctly', () => {
      const content = '[[A]] [[B|C]] [[D]] [[E|F]]';

      const result = storyProfiler.profileLinkProcessing(content);

      expect(result.linkCount).toBe(4);
    });

    it('should handle content with no links', () => {
      const content = 'Just plain text with no links';

      const result = storyProfiler.profileLinkProcessing(content);

      expect(result.linkCount).toBe(0);
    });

    it('should record link count metric', () => {
      const content = '[[Link]]';

      storyProfiler.profileLinkProcessing(content);

      const metrics = storyProfiler.getProfiler().getMetrics();
      expect(metrics).toContainEqual(
        expect.objectContaining({
          name: 'link-count',
          unit: 'count',
        })
      );
    });
  });

  describe('getProfiler', () => {
    it('should return profiler instance', () => {
      const profiler = storyProfiler.getProfiler();

      expect(profiler).toBeInstanceOf(Profiler);
    });
  });

  describe('generateReport', () => {
    it('should generate performance report', () => {
      const id = storyProfiler.getProfiler().start('test-operation');
      currentTime += 100;
      storyProfiler.getProfiler().end(id);

      const report = storyProfiler.generateReport();

      expect(report).toContain('Performance Report');
      expect(report).toContain('Slowest Operations');
      expect(report).toContain('test-operation');
    });

    it('should include memory growth in report', () => {
      process.memoryUsage = vi.fn()
        .mockReturnValueOnce({
          heapUsed: 1000000,
          heapTotal: 2000000,
          external: 50000,
          arrayBuffers: 10000,
          rss: 3000000,
        })
        .mockReturnValueOnce({
          heapUsed: 1500000,
          heapTotal: 2000000,
          external: 50000,
          arrayBuffers: 10000,
          rss: 3000000,
        });

      const profiler = storyProfiler.getProfiler();
      profiler.takeMemorySnapshot();
      profiler.takeMemorySnapshot();

      const report = storyProfiler.generateReport();

      expect(report).toContain('Memory Growth');
    });

    it('should format bytes in report', () => {
      process.memoryUsage = vi.fn()
        .mockReturnValueOnce({
          heapUsed: 1024,
          heapTotal: 2000000,
          external: 50000,
          arrayBuffers: 10000,
          rss: 3000000,
        })
        .mockReturnValueOnce({
          heapUsed: 1024 * 1024 + 1024,
          heapTotal: 2000000,
          external: 50000,
          arrayBuffers: 10000,
          rss: 3000000,
        });

      const profiler = storyProfiler.getProfiler();
      profiler.takeMemorySnapshot();
      profiler.takeMemorySnapshot();

      const report = storyProfiler.generateReport();

      expect(report).toContain('KB');
    });

    it('should include metric statistics', () => {
      const profiler = storyProfiler.getProfiler();

      profiler.recordMetric('test-metric', 100, 'ms');
      profiler.recordMetric('test-metric', 200, 'ms');
      profiler.recordMetric('test-metric', 150, 'ms');

      const report = storyProfiler.generateReport();

      expect(report).toContain('Metrics');
      expect(report).toContain('test-metric');
      expect(report).toContain('Average');
      expect(report).toContain('Max');
      expect(report).toContain('Min');
    });
  });

  describe('createStoryProfiler', () => {
    it('should create story profiler instance', () => {
      const instance = createStoryProfiler();

      expect(instance).toBeInstanceOf(StoryProfiler);
    });
  });
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let currentTime: number;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    currentTime = 1000;
    mockPerformance.now.mockImplementation(() => currentTime);
    vi.clearAllMocks();
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('start', () => {
    it('should start monitoring', () => {
      monitor.start();

      expect((monitor as any).running).toBe(true);
    });

    it('should initialize last frame time', () => {
      currentTime = 1234;
      monitor.start();

      expect((monitor as any).lastFrameTime).toBe(1234);
    });

    it('should start measuring frames', () => {
      monitor.start();

      expect(requestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop monitoring', () => {
      monitor.start();
      monitor.stop();

      expect((monitor as any).running).toBe(false);
    });

    it('should not call requestAnimationFrame after stop', () => {
      vi.clearAllMocks();

      monitor.start();
      monitor.stop();

      // Clear any pending calls
      const callCount = vi.mocked(requestAnimationFrame).mock.calls.length;

      // Should not increase after stop
      currentTime += 100;

      expect(vi.mocked(requestAnimationFrame).mock.calls.length).toBe(callCount);
    });
  });

  describe('getFPS', () => {
    it('should return 0 when no frames measured', () => {
      expect(monitor.getFPS()).toBe(0);
    });

    it('should calculate average FPS', async () => {
      monitor.start();

      // Simulate frames
      for (let i = 0; i < 5; i++) {
        currentTime += 16.67; // ~60 FPS
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      const fps = monitor.getFPS();

      expect(fps).toBeGreaterThan(0);
    });

    it('should keep last 60 FPS measurements', async () => {
      monitor.start();

      for (let i = 0; i < 100; i++) {
        currentTime += 16.67;
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const fpsArray = (monitor as any).fps;

      expect(fpsArray.length).toBeLessThanOrEqual(60);
    });
  });

  describe('getFrameCount', () => {
    it('should return 0 initially', () => {
      expect(monitor.getFrameCount()).toBe(0);
    });

    it('should count frames', async () => {
      monitor.start();

      for (let i = 0; i < 10; i++) {
        currentTime += 16.67;
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      expect(monitor.getFrameCount()).toBeGreaterThan(0);
    });
  });

  describe('createPerformanceMonitor', () => {
    it('should create performance monitor instance', () => {
      const instance = createPerformanceMonitor();

      expect(instance).toBeInstanceOf(PerformanceMonitor);
    });
  });
});

describe('Edge Cases and Integration', () => {
  let currentTime: number;

  beforeEach(() => {
    currentTime = 1000;
    mockPerformance.now.mockImplementation(() => currentTime);
  });

  it('should handle deeply nested profiles', () => {
    const profiler = createProfiler();

    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      ids.push(profiler.start(`level-${i}`));
      currentTime += 10;
    }

    for (let i = ids.length - 1; i >= 0; i--) {
      profiler.end(ids[i]);
      currentTime += 10;
    }

    const profiles = profiler.getProfiles();
    expect(profiles.length).toBe(10);
  });

  it('should handle concurrent profiles', () => {
    const profiler = createProfiler();

    const id1 = profiler.start('task-1');
    currentTime += 50;

    const id2 = profiler.start('task-2');
    currentTime += 30;
    profiler.end(id2);

    currentTime += 20;
    profiler.end(id1);

    const profile1 = profiler.getProfile(id1);
    const profile2 = profiler.getProfile(id2);

    expect(profile1?.duration).toBe(100);
    expect(profile2?.duration).toBe(30);
  });

  it('should handle many metrics', () => {
    const profiler = createProfiler();

    for (let i = 0; i < 1000; i++) {
      profiler.recordMetric(`metric-${i}`, i, 'count');
    }

    const metrics = profiler.getMetrics();
    expect(metrics.length).toBe(1000);
  });

  it('should handle empty content in link processing', () => {
    const storyProfiler = createStoryProfiler();

    const result = storyProfiler.profileLinkProcessing('');

    expect(result.linkCount).toBe(0);
    expect(result.processingTime).toBeGreaterThanOrEqual(0);
  });

  it('should handle very long content', () => {
    const storyProfiler = createStoryProfiler();
    const longContent = 'a'.repeat(100000) + '[[Link]]' + 'b'.repeat(100000);

    const result = storyProfiler.profileLinkProcessing(longContent);

    expect(result.linkCount).toBe(1);
  });

  it('should format negative bytes', () => {
    const profiler = createProfiler();

    process.memoryUsage = vi.fn()
      .mockReturnValueOnce({
        heapUsed: 2000000,
        heapTotal: 3000000,
        external: 50000,
        arrayBuffers: 10000,
        rss: 3000000,
      })
      .mockReturnValueOnce({
        heapUsed: 1000000,
        heapTotal: 3000000,
        external: 50000,
        arrayBuffers: 10000,
        rss: 3000000,
      });

    profiler.takeMemorySnapshot();
    profiler.takeMemorySnapshot();

    const analysis = profiler.analyze();

    expect(analysis.memoryGrowth).toBe(-1000000);
  });

  it('should handle zero bytes formatting', () => {
    const storyProfiler = createStoryProfiler();

    process.memoryUsage = vi.fn()
      .mockReturnValue({
        heapUsed: 1000000,
        heapTotal: 2000000,
        external: 50000,
        arrayBuffers: 10000,
        rss: 3000000,
      });

    storyProfiler.getProfiler().takeMemorySnapshot();
    storyProfiler.getProfiler().takeMemorySnapshot();

    const report = storyProfiler.generateReport();

    expect(report).toContain('0 Bytes');
  });

  it('should handle profiles without duration', () => {
    const profiler = createProfiler();

    const id = profiler.start('test');
    // Don't end the profile

    const analysis = profiler.analyze();

    // Should not crash
    expect(analysis.slowestOperations).toBeDefined();
  });

  it('should handle complex story profiling workflow', async () => {
    const storyProfiler = createStoryProfiler();

    // Profile loading
    const { story } = await storyProfiler.profileLoading(async () => mockStory);

    // Profile rendering
    for (const passage of story.passages) {
      storyProfiler.profileRendering(passage, () => {
        // Simulate rendering
      });

      storyProfiler.profileLinkProcessing(passage.content);
    }

    // Generate report
    const report = storyProfiler.generateReport();

    expect(report).toContain('Performance Report');
    expect(report.length).toBeGreaterThan(0);
  });
});
