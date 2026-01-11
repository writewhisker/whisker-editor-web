/**
 * Story Debugger
 *
 * Debugging tools for Whisker stories.
 */

import type { Story, Passage } from '@writewhisker/story-models';

/**
 * Debug log level
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Debug log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: any;
  stackTrace?: string;
}

/**
 * Breakpoint
 */
export interface Breakpoint {
  id: string;
  passageId: string;
  condition?: string;
  enabled: boolean;
}

/**
 * Debug session state
 */
export interface DebugState {
  currentPassage: string | null;
  visitedPassages: string[];
  variables: Record<string, any>;
  callStack: string[];
  breakpoints: Breakpoint[];
}

/**
 * Story debugger
 */
export class StoryDebugger {
  private story: Story;
  private state: DebugState;
  private logs: LogEntry[] = [];
  private paused: boolean = false;
  private stepMode: boolean = false;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(story: Story) {
    this.story = story;
    // Get start passage title from ID
    const startPassage = story.findPassage(p => p.id === story.startPassage);
    this.state = {
      currentPassage: startPassage?.title || null,
      visitedPassages: [],
      variables: {},
      callStack: [],
      breakpoints: [],
    };
  }

  /**
   * Navigate to passage
   */
  public navigateTo(passageTitle: string): void {
    const passage = this.story.findPassage(p => p.title === passageTitle);

    if (!passage) {
      this.log('error', `Passage not found: ${passageTitle}`);
      return;
    }

    // Check breakpoints
    const breakpoint = this.state.breakpoints.find(
      bp => bp.enabled && bp.passageId === passage.id
    );

    if (breakpoint) {
      if (!breakpoint.condition || this.evaluateCondition(breakpoint.condition)) {
        this.pause();
        this.log('info', `Breakpoint hit: ${passageTitle}`);
      }
    }

    // Update state
    this.state.visitedPassages.push(passageTitle);
    this.state.currentPassage = passageTitle;
    this.state.callStack.push(passageTitle);

    this.log('debug', `Navigated to: ${passageTitle}`);
    this.emit('navigate', { passage: passageTitle });

    // Step mode - pause after each navigation
    if (this.stepMode) {
      this.pause();
    }
  }

  /**
   * Set variable
   */
  public setVariable(name: string, value: any): void {
    this.state.variables[name] = value;
    this.log('debug', `Variable set: ${name} = ${JSON.stringify(value)}`);
    this.emit('variable', { name, value });
  }

  /**
   * Get variable
   */
  public getVariable(name: string): any {
    return this.state.variables[name];
  }

  /**
   * Add breakpoint
   */
  public addBreakpoint(passageId: string, condition?: string): Breakpoint {
    const breakpoint: Breakpoint = {
      id: `bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      passageId,
      condition,
      enabled: true,
    };

    this.state.breakpoints.push(breakpoint);
    this.log('info', `Breakpoint added: ${passageId}`);
    this.emit('breakpoint-add', breakpoint);

    return breakpoint;
  }

  /**
   * Remove breakpoint
   */
  public removeBreakpoint(breakpointId: string): void {
    this.state.breakpoints = this.state.breakpoints.filter(bp => bp.id !== breakpointId);
    this.log('info', `Breakpoint removed: ${breakpointId}`);
    this.emit('breakpoint-remove', { id: breakpointId });
  }

  /**
   * Toggle breakpoint
   */
  public toggleBreakpoint(breakpointId: string): void {
    const breakpoint = this.state.breakpoints.find(bp => bp.id === breakpointId);

    if (breakpoint) {
      breakpoint.enabled = !breakpoint.enabled;
      this.emit('breakpoint-toggle', breakpoint);
    }
  }

  /**
   * Pause execution
   */
  public pause(): void {
    this.paused = true;
    this.log('info', 'Execution paused');
    this.emit('pause', this.state);
  }

  /**
   * Resume execution
   */
  public resume(): void {
    this.paused = false;
    this.stepMode = false;
    this.log('info', 'Execution resumed');
    this.emit('resume', this.state);
  }

  /**
   * Step to next passage
   */
  public step(): void {
    this.stepMode = true;
    this.paused = false;
    this.log('info', 'Execution resumed');
    this.emit('resume', this.state);
  }

  /**
   * Reset debug session
   */
  public reset(): void {
    // Get start passage title from ID
    const startPassage = this.story.findPassage(p => p.id === this.story.startPassage);
    this.state = {
      currentPassage: startPassage?.title || null,
      visitedPassages: [],
      variables: {},
      callStack: [],
      breakpoints: this.state.breakpoints, // Keep breakpoints
    };

    this.paused = false;
    this.stepMode = false;
    this.logs = [];

    this.log('info', 'Debug session reset');
    this.emit('reset', this.state);
  }

  /**
   * Get current state
   */
  public getState(): DebugState {
    return {
      ...this.state,
      visitedPassages: [...this.state.visitedPassages],
      variables: { ...this.state.variables },
      callStack: [...this.state.callStack],
      breakpoints: this.state.breakpoints.map(bp => ({ ...bp })),
    };
  }

  /**
   * Get logs
   */
  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear logs
   */
  public clearLogs(): void {
    this.logs = [];
    this.emit('logs-clear', {});
  }

  /**
   * Is paused
   */
  public isPaused(): boolean {
    return this.paused;
  }

  /**
   * Log message
   */
  public log(level: LogLevel, message: string, data?: any): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      data,
      stackTrace: level === 'error' ? new Error().stack : undefined,
    };

    this.logs.push(entry);
    this.emit('log', entry);

    // Also log to console in development
    if (typeof console !== 'undefined') {
      console[level](message, data);
    }
  }

  /**
   * On event
   */
  public on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Off event
   */
  public off(event: string, callback: (data: any) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        listener(data);
      }
    }
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(condition: string): boolean {
    try {
      // Simple variable equality check
      const match = condition.match(/^(\w+)\s*===?\s*(.+)$/);
      if (match) {
        const [, varName, value] = match;
        const varValue = this.state.variables[varName];
        const expectedValue = JSON.parse(value);
        return varValue === expectedValue;
      }

      return false;
    } catch {
      return false;
    }
  }
}

/**
 * Create story debugger
 */
export function createDebugger(story: Story): StoryDebugger {
  return new StoryDebugger(story);
}

/**
 * Inspect story structure
 */
export function inspectStory(story: Story): {
  passages: number;
  links: number;
  orphans: string[];
  deadEnds: string[];
  unreachable: string[];
  cycles: string[][];
} {
  const passageMap = new Map(story.mapPassages(p => [p.title, p]));
  const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

  // Find all links
  const links: Array<{ from: string; to: string }> = [];
  const linkTargets = new Set<string>();

  for (const passage of story.passages.values()) {
    let match;
    while ((match = linkRegex.exec(passage.content)) !== null) {
      const target = match[2] || match[1];
      links.push({ from: passage.title, to: target });
      linkTargets.add(target);
    }
  }

  // Find orphans (no incoming links, except start passage)
  // startPassage is an ID, so we need to compare by ID
  const orphans = story.filterPassages(p => p.id !== story.startPassage && !linkTargets.has(p.title))
    .map(p => p.title);

  // Find dead ends (no outgoing links)
  const deadEnds = story.filterPassages(p => {
      const hasLinks = links.some(l => l.from === p.title);
      return !hasLinks;
    })
    .map(p => p.title);

  // Find unreachable passages
  const reachable = new Set<string>();
  // Get start passage title from ID
  const startPassage = story.findPassage(p => p.id === story.startPassage);
  const startTitle = startPassage?.title || '';
  const queue = [startTitle];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current) || !passageMap.has(current)) {
      continue;
    }

    reachable.add(current);

    const outgoing = links.filter(l => l.from === current);
    for (const link of outgoing) {
      if (!reachable.has(link.to)) {
        queue.push(link.to);
      }
    }
  }

  const unreachable = story.filterPassages(p => !reachable.has(p.title))
    .map(p => p.title);

  // Find cycles
  const cycles = findCycles(links);

  return {
    passages: story.passages.size,
    links: links.length,
    orphans,
    deadEnds,
    unreachable,
    cycles,
  };
}

/**
 * Find cycles in story graph
 */
function findCycles(links: Array<{ from: string; to: string }>): string[][] {
  const graph = new Map<string, string[]>();

  for (const link of links) {
    if (!graph.has(link.from)) {
      graph.set(link.from, []);
    }
    graph.get(link.from)!.push(link.to);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): void {
    if (stack.has(node)) {
      // Found a cycle
      const cycleStart = path.indexOf(node);
      cycles.push(path.slice(cycleStart));
      return;
    }

    if (visited.has(node)) {
      return;
    }

    visited.add(node);
    stack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      dfs(neighbor);
    }

    stack.delete(node);
    path.pop();
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Trace execution path
 */
export function traceExecution(
  story: Story,
  startPassage: string,
  choices: string[]
): {
  path: string[];
  variables: Record<string, any>;
  errors: string[];
} {
  const path: string[] = [startPassage];
  const variables: Record<string, any> = {};
  const errors: string[] = [];

  let currentPassage = startPassage;

  // Check if start passage exists
  const startPass = story.findPassage(p => p.title === currentPassage);
  if (!startPass) {
    errors.push(`Passage not found: ${currentPassage}`);
    return { path, variables, errors };
  }

  for (const choice of choices) {
    const passage = story.findPassage(p => p.title === currentPassage);

    if (!passage) {
      errors.push(`Passage not found: ${currentPassage}`);
      break;
    }

    // Extract links from passage
    const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(passage.content)) !== null) {
      const target = match[2] || match[1];
      links.push(target);
    }

    if (!links.includes(choice)) {
      errors.push(`Invalid choice "${choice}" from passage "${currentPassage}"`);
      break;
    }

    currentPassage = choice;
    path.push(currentPassage);
  }

  return { path, variables, errors };
}

/**
 * Format debug output
 */
export function formatDebugOutput(state: DebugState): string {
  const lines: string[] = [];

  lines.push('=== Debug State ===');
  lines.push(`Current Passage: ${state.currentPassage || 'None'}`);
  lines.push(`Visited: ${state.visitedPassages.length} passages`);
  lines.push('');

  lines.push('=== Variables ===');
  for (const [name, value] of Object.entries(state.variables)) {
    lines.push(`  ${name}: ${JSON.stringify(value)}`);
  }
  lines.push('');

  lines.push('=== Call Stack ===');
  for (let i = state.callStack.length - 1; i >= 0; i--) {
    lines.push(`  ${i}: ${state.callStack[i]}`);
  }
  lines.push('');

  lines.push('=== Breakpoints ===');
  for (const bp of state.breakpoints) {
    const status = bp.enabled ? '✓' : '✗';
    const condition = bp.condition ? ` (${bp.condition})` : '';
    lines.push(`  ${status} ${bp.passageId}${condition}`);
  }

  return lines.join('\n');
}
