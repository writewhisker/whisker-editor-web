/**
 * Performance Profiler
 *
 * Performance profiling and optimization tools for Whisker Editor.
 */

import type { Story, Passage } from '@writewhisker/story-models';

/**
 * Performance metric
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent';
  timestamp: number;
}

/**
 * Performance profile
 */
export interface PerformanceProfile {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metrics: PerformanceMetric[];
  children: PerformanceProfile[];
}

/**
 * Memory snapshot
 */
export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
}

/**
 * Performance profiler
 */
export class Profiler {
  private profiles: Map<string, PerformanceProfile> = new Map();
  private activeProfile: PerformanceProfile | null = null;
  private metrics: PerformanceMetric[] = [];
  private memorySnapshots: MemorySnapshot[] = [];

  /**
   * Start profiling
   */
  public start(name: string): string {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const profile: PerformanceProfile = {
      id,
      name,
      startTime: performance.now(),
      metrics: [],
      children: [],
    };

    if (this.activeProfile) {
      this.activeProfile.children.push(profile);
    }

    this.profiles.set(id, profile);
    this.activeProfile = profile;

    return id;
  }

  /**
   * End profiling
   */
  public end(id: string): PerformanceProfile | null {
    const profile = this.profiles.get(id);

    if (!profile) {
      return null;
    }

    profile.endTime = performance.now();
    profile.duration = profile.endTime - profile.startTime;

    // Find parent and set it as active
    let parent: PerformanceProfile | null = null;
    for (const p of this.profiles.values()) {
      if (p.children.includes(profile)) {
        parent = p;
        break;
      }
    }

    this.activeProfile = parent;

    return profile;
  }

  /**
   * Record metric
   */
  public recordMetric(name: string, value: number, unit: PerformanceMetric['unit']): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    if (this.activeProfile) {
      this.activeProfile.metrics.push(metric);
    }
  }

  /**
   * Take memory snapshot
   */
  public takeMemorySnapshot(): MemorySnapshot | null {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers || 0,
      };

      this.memorySnapshots.push(snapshot);
      return snapshot;
    }

    return null;
  }

  /**
   * Get profile
   */
  public getProfile(id: string): PerformanceProfile | undefined {
    return this.profiles.get(id);
  }

  /**
   * Get all profiles
   */
  public getProfiles(): PerformanceProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get metrics
   */
  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get memory snapshots
   */
  public getMemorySnapshots(): MemorySnapshot[] {
    return [...this.memorySnapshots];
  }

  /**
   * Clear all data
   */
  public clear(): void {
    this.profiles.clear();
    this.activeProfile = null;
    this.metrics = [];
    this.memorySnapshots = [];
  }

  /**
   * Analyze performance
   */
  public analyze(): {
    slowestOperations: Array<{ name: string; duration: number }>;
    totalDuration: number;
    averageDuration: number;
    memoryGrowth: number;
  } {
    const rootProfiles = Array.from(this.profiles.values()).filter(p => {
      // Find profiles that are not children of any other profile
      for (const other of this.profiles.values()) {
        if (other.children.includes(p)) {
          return false;
        }
      }
      return true;
    });

    const slowest = rootProfiles
      .filter(p => p.duration !== undefined)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10)
      .map(p => ({ name: p.name, duration: p.duration || 0 }));

    const totalDuration = rootProfiles.reduce((sum, p) => sum + (p.duration || 0), 0);
    const averageDuration = rootProfiles.length > 0 ? totalDuration / rootProfiles.length : 0;

    let memoryGrowth = 0;
    if (this.memorySnapshots.length >= 2) {
      const first = this.memorySnapshots[0];
      const last = this.memorySnapshots[this.memorySnapshots.length - 1];
      memoryGrowth = last.heapUsed - first.heapUsed;
    }

    return {
      slowestOperations: slowest,
      totalDuration,
      averageDuration,
      memoryGrowth,
    };
  }
}

/**
 * Create profiler
 */
export function createProfiler(): Profiler {
  return new Profiler();
}

/**
 * Measure function execution time
 */
export async function measure<T>(
  name: string,
  fn: () => T | Promise<T>,
  profiler?: Profiler
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (profiler) {
    profiler.recordMetric(name, duration, 'ms');
  }

  return { result, duration };
}

/**
 * Profile story operations
 */
export class StoryProfiler {
  private profiler: Profiler;

  constructor() {
    this.profiler = new Profiler();
  }

  /**
   * Profile story loading
   */
  public async profileLoading(loadFn: () => Promise<Story>): Promise<{
    story: Story;
    loadTime: number;
    parseTime: number;
  }> {
    const loadId = this.profiler.start('story-load');
    const story = await loadFn();
    this.profiler.end(loadId);

    const profile = this.profiler.getProfile(loadId);
    const loadTime = profile?.duration || 0;

    return {
      story,
      loadTime,
      parseTime: loadTime, // Simplified - could be broken down further
    };
  }

  /**
   * Profile passage rendering
   */
  public profileRendering(passage: Passage, renderFn: () => void): {
    renderTime: number;
    contentLength: number;
  } {
    const renderId = this.profiler.start(`render-${passage.title}`);
    renderFn();
    this.profiler.end(renderId);

    const profile = this.profiler.getProfile(renderId);
    const renderTime = profile?.duration || 0;

    this.profiler.recordMetric('content-length', passage.content.length, 'bytes');

    return {
      renderTime,
      contentLength: passage.content.length,
    };
  }

  /**
   * Profile link processing
   */
  public profileLinkProcessing(content: string): {
    linkCount: number;
    processingTime: number;
  } {
    const linkId = this.profiler.start('link-processing');

    const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[2] || match[1]);
    }

    this.profiler.end(linkId);

    const profile = this.profiler.getProfile(linkId);
    const processingTime = profile?.duration || 0;

    this.profiler.recordMetric('link-count', links.length, 'count');

    return {
      linkCount: links.length,
      processingTime,
    };
  }

  /**
   * Get profiler
   */
  public getProfiler(): Profiler {
    return this.profiler;
  }

  /**
   * Generate report
   */
  public generateReport(): string {
    const analysis = this.profiler.analyze();
    const lines: string[] = [];

    lines.push('=== Performance Report ===');
    lines.push('');

    lines.push('Slowest Operations:');
    for (const op of analysis.slowestOperations) {
      lines.push(`  ${op.name}: ${op.duration.toFixed(2)}ms`);
    }
    lines.push('');

    lines.push('Overall Statistics:');
    lines.push(`  Total Duration: ${analysis.totalDuration.toFixed(2)}ms`);
    lines.push(`  Average Duration: ${analysis.averageDuration.toFixed(2)}ms`);
    lines.push(`  Memory Growth: ${formatBytes(analysis.memoryGrowth)}`);
    lines.push('');

    const metrics = this.profiler.getMetrics();
    const metricsByName = new Map<string, number[]>();

    for (const metric of metrics) {
      if (!metricsByName.has(metric.name)) {
        metricsByName.set(metric.name, []);
      }
      metricsByName.get(metric.name)!.push(metric.value);
    }

    lines.push('Metrics:');
    for (const [name, values] of metricsByName) {
      const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      lines.push(`  ${name}:`);
      lines.push(`    Average: ${avg.toFixed(2)}`);
      lines.push(`    Max: ${max.toFixed(2)}`);
      lines.push(`    Min: ${min.toFixed(2)}`);
    }

    return lines.join('\n');
  }
}

/**
 * Create story profiler
 */
export function createStoryProfiler(): StoryProfiler {
  return new StoryProfiler();
}

/**
 * Format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Performance monitor
 */
export class PerformanceMonitor {
  private fps: number[] = [];
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private running: boolean = false;

  /**
   * Start monitoring
   */
  public start(): void {
    this.running = true;
    this.lastFrameTime = performance.now();
    this.measure();
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    this.running = false;
  }

  /**
   * Get FPS
   */
  public getFPS(): number {
    if (this.fps.length === 0) {
      return 0;
    }

    return this.fps.reduce((sum, fps) => sum + fps, 0) / this.fps.length;
  }

  /**
   * Get frame count
   */
  public getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * Measure frame
   */
  private measure(): void {
    if (!this.running) {
      return;
    }

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    const fps = 1000 / delta;

    this.fps.push(fps);
    if (this.fps.length > 60) {
      this.fps.shift();
    }

    this.frameCount++;
    this.lastFrameTime = now;

    requestAnimationFrame(() => this.measure());
  }
}

/**
 * Create performance monitor
 */
export function createPerformanceMonitor(): PerformanceMonitor {
  return new PerformanceMonitor();
}
