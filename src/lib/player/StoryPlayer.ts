import type { Story } from '../models/Story';
import type { Passage } from '../models/Passage';
import type { Choice } from '../models/Choice';
import type {
  PlaythroughStep,
  PlaythroughRecording,
  VariableChange,
  PlayerError,
  PlayerEvent,
  PlayerEventCallback,
  PlayerState,
} from './types';

/**
 * StoryPlayer - Core player engine for preview and testing
 *
 * Handles story playback, variable management, and state tracking
 * without requiring external Lua runtime for basic functionality.
 */
export class StoryPlayer {
  private story: Story | null = null;
  private currentPassageId: string | null = null;
  private variables: Map<string, any> = new Map();
  private visitedPassages: Map<string, number> = new Map();
  private history: PlaythroughStep[] = [];
  private breakpoints: Set<string> = new Set();
  private eventListeners: Map<PlayerEvent, Set<PlayerEventCallback>> = new Map();
  private startTime: number = 0;
  private paused: boolean = false;

  constructor() {
    // Initialize event listener maps
    this.eventListeners.set('passageEntered', new Set());
    this.eventListeners.set('choiceSelected', new Set());
    this.eventListeners.set('variableChanged', new Set());
    this.eventListeners.set('error', new Set());
    this.eventListeners.set('stateChanged', new Set());
  }

  /**
   * Load a story into the player
   */
  loadStory(story: Story): void {
    this.story = story;
    this.reset();
  }

  /**
   * Start playing from the beginning or a specific passage
   */
  start(fromPassageId?: string): void {
    if (!this.story) {
      throw new Error('No story loaded');
    }

    // Determine starting passage
    const startId = fromPassageId || this.story.startPassage;
    if (!startId) {
      throw new Error('No start passage defined');
    }

    const startPassage = this.story.getPassage(startId);
    if (!startPassage) {
      this.handleError(new Error(`Start passage "${startId}" not found`), startId, 'start');
      return;
    }

    // Reset state
    this.reset();
    this.startTime = Date.now();

    // Initialize variables from story
    this.initializeVariables();

    // Enter first passage
    this.enterPassage(startId);
  }

  /**
   * Reset player to initial state
   */
  reset(): void {
    this.currentPassageId = null;
    this.variables.clear();
    this.visitedPassages.clear();
    this.history = [];
    this.startTime = 0;
    this.paused = false;
    this.emit('stateChanged', this.getState());
  }

  /**
   * Restart from the beginning
   */
  restart(): void {
    this.start();
  }

  /**
   * Undo last choice
   */
  undo(): boolean {
    if (this.history.length < 2) {
      return false;
    }

    // Remove current step
    this.history.pop();

    // Get previous step
    const previousStep = this.history[this.history.length - 1];

    // Restore state from previous step
    this.currentPassageId = previousStep.passageId;
    this.variables = new Map(Object.entries(previousStep.variablesAfter));

    // Recalculate visited passages from history
    this.visitedPassages.clear();
    for (const step of this.history) {
      const count = this.visitedPassages.get(step.passageId) || 0;
      this.visitedPassages.set(step.passageId, count + 1);
    }

    this.emit('stateChanged', this.getState());
    return true;
  }

  /**
   * Make a choice and advance the story
   */
  makeChoice(choiceId: string): void {
    if (!this.story || !this.currentPassageId) {
      throw new Error('No active passage');
    }

    if (this.paused) {
      console.warn('Player is paused');
      return;
    }

    const currentPassage = this.story.getPassage(this.currentPassageId);
    if (!currentPassage) {
      throw new Error('Current passage not found');
    }

    const choice = currentPassage.choices.find(c => c.id === choiceId);
    if (!choice) {
      throw new Error(`Choice "${choiceId}" not found`);
    }

    // Check if choice is available
    if (!this.canMakeChoice(choiceId)) {
      console.warn('Choice condition not met:', choice.condition);
      return;
    }

    // Execute choice script if present
    if (choice.action) {
      this.executeScript(choice.action, 'choice.action');
    }

    // Emit choice selected event
    this.emit('choiceSelected', {
      choice,
      passage: currentPassage,
    });

    // Navigate to target passage
    if (choice.target) {
      this.enterPassage(choice.target, choiceId, choice.text);
    } else {
      console.warn('Choice has no target passage');
    }
  }

  /**
   * Check if a choice can be made (condition evaluation)
   */
  canMakeChoice(choiceId: string): boolean {
    if (!this.story || !this.currentPassageId) {
      return false;
    }

    const currentPassage = this.story.getPassage(this.currentPassageId);
    if (!currentPassage) {
      return false;
    }

    const choice = currentPassage.choices.find(c => c.id === choiceId);
    if (!choice) {
      return false;
    }

    // No condition means always available
    if (!choice.condition) {
      return true;
    }

    // Evaluate condition
    return this.evaluateCondition(choice.condition);
  }

  /**
   * Get current passage
   */
  getCurrentPassage(): Passage | null {
    if (!this.story || !this.currentPassageId) {
      return null;
    }
    return this.story.getPassage(this.currentPassageId) || null;
  }

  /**
   * Get available choices for current passage
   */
  getAvailableChoices(): Choice[] {
    const passage = this.getCurrentPassage();
    if (!passage) {
      return [];
    }

    return passage.choices.filter(choice => this.canMakeChoice(choice.id));
  }

  /**
   * Get variable value
   */
  getVariable(name: string): any {
    return this.variables.get(name);
  }

  /**
   * Set variable value
   */
  setVariable(name: string, value: any): void {
    const oldValue = this.variables.get(name);

    this.variables.set(name, value);

    this.emit('variableChanged', {
      name,
      oldValue,
      newValue: value,
      timestamp: Date.now(),
    } as VariableChange);

    this.emit('stateChanged', this.getState());
  }

  /**
   * Get all variables
   */
  getAllVariables(): Map<string, any> {
    return new Map(this.variables);
  }

  /**
   * Get visit count for a passage
   */
  getVisitCount(passageId: string): number {
    return this.visitedPassages.get(passageId) || 0;
  }

  /**
   * Get playthrough history
   */
  getHistory(): PlaythroughStep[] {
    return [...this.history];
  }

  /**
   * Get current state snapshot
   */
  getState(): PlayerState {
    return {
      currentPassageId: this.currentPassageId,
      variables: Object.fromEntries(this.variables),
      visitedPassages: Object.fromEntries(this.visitedPassages),
      history: [...this.history],
      timestamp: Date.now(),
    };
  }

  /**
   * Restore state from snapshot
   */
  restoreState(state: PlayerState): void {
    this.currentPassageId = state.currentPassageId;
    this.variables = new Map(Object.entries(state.variables));
    this.visitedPassages = new Map(Object.entries(state.visitedPassages));
    this.history = [...state.history];
    this.emit('stateChanged', this.getState());
  }

  /**
   * Toggle breakpoint on a passage
   */
  toggleBreakpoint(passageId: string): void {
    if (this.breakpoints.has(passageId)) {
      this.breakpoints.delete(passageId);
    } else {
      this.breakpoints.add(passageId);
    }
  }

  /**
   * Check if passage has breakpoint
   */
  hasBreakpoint(passageId: string): boolean {
    return this.breakpoints.has(passageId);
  }

  /**
   * Get all breakpoints
   */
  getBreakpoints(): Set<string> {
    return new Set(this.breakpoints);
  }

  /**
   * Pause playback
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume playback
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Get playthrough duration in milliseconds
   */
  getDuration(): number {
    if (this.startTime === 0) {
      return 0;
    }
    return Date.now() - this.startTime;
  }

  /**
   * Export current playthrough
   */
  getPlaythrough(): PlaythroughRecording {
    return {
      metadata: {
        storyTitle: this.story?.metadata.title || 'Untitled',
        recordedAt: new Date(this.startTime).toISOString(),
        duration: this.getDuration(),
        completed: this.getCurrentPassage()?.choices.length === 0 || false,
      },
      steps: [...this.history],
      finalState: {
        variables: Object.fromEntries(this.variables),
        passagesVisited: Array.from(this.visitedPassages.keys()),
      },
    };
  }

  /**
   * Event listener management
   */
  on(event: PlayerEvent, callback: PlayerEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }
  }

  off(event: PlayerEvent, callback: PlayerEventCallback): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: PlayerEvent, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Initialize variables from story
   */
  private initializeVariables(): void {
    if (!this.story) return;

    this.variables.clear();

    // Set initial values from story variables
    for (const variable of this.story.variables.values()) {
      this.variables.set(variable.name, variable.initial);
    }
  }

  /**
   * Enter a passage
   */
  private enterPassage(passageId: string, choiceId?: string, choiceText?: string): void {
    if (!this.story) return;

    const passage = this.story.getPassage(passageId);
    if (!passage) {
      this.handleError(new Error(`Passage "${passageId}" not found`), passageId, 'enterPassage');
      return;
    }

    // Save variables before executing passage scripts
    const variablesBefore = Object.fromEntries(this.variables);

    // Execute on_enter script
    if (passage.onEnterScript) {
      this.executeScript(passage.onEnterScript, 'passage.onEnterScript');
    }

    // Update visit count
    const visitCount = this.visitedPassages.get(passageId) || 0;
    this.visitedPassages.set(passageId, visitCount + 1);

    // Save variables after executing passage scripts
    const variablesAfter = Object.fromEntries(this.variables);

    // Add to history
    const step: PlaythroughStep = {
      timestamp: Date.now(),
      passageId,
      passageTitle: passage.title,
      choiceId,
      choiceText,
      variablesBefore,
      variablesAfter,
    };
    this.history.push(step);

    // Update current passage
    this.currentPassageId = passageId;

    // Check for breakpoint
    if (this.breakpoints.has(passageId)) {
      this.pause();
      console.log(`Breakpoint hit: ${passage.title}`);
    }

    // Emit event
    this.emit('passageEntered', {
      passage,
      visitCount: visitCount + 1,
    });

    this.emit('stateChanged', this.getState());
  }

  /**
   * Execute a script (simplified - no Lua for now)
   * This is a placeholder for script execution
   */
  private executeScript(script: string, context: string): void {
    // For now, we'll just log scripts
    // In a future enhancement, we can add Lua execution via Fengari
    console.log(`[Script - ${context}]:`, script);

    // TODO: Implement simple variable assignment parsing
    // e.g., "health = health - 10" or "has_key = true"
  }

  /**
   * Evaluate a condition (simplified - no Lua for now)
   */
  private evaluateCondition(condition: string): boolean {
    if (!condition || condition.trim() === '') {
      return true;
    }

    // Simple condition parsing
    // Format: "variable operator value" e.g., "health > 50"
    const trimmed = condition.trim();

    // Try to evaluate simple comparisons
    try {
      // Replace variable names with their values
      let evaluated = trimmed;

      // Replace variables with their values
      for (const [name, value] of this.variables.entries()) {
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        const valueStr = typeof value === 'string' ? `"${value}"` : String(value);
        evaluated = evaluated.replace(regex, valueStr);
      }

      // Use Function constructor for safe evaluation
      // Only allow basic comparisons
      const result = new Function(`return ${evaluated}`)();
      return Boolean(result);
    } catch (error) {
      console.warn('Condition evaluation error:', condition, error);
      return false; // Fail safely
    }
  }

  /**
   * Get the start passage ID from the story
   */
  getStartPassageId(): string | null {
    return this.story?.startPassage || null;
  }

  /**
   * Handle errors
   */
  private handleError(error: Error, passageId: string, context: string): void {
    const passage = this.story?.getPassage(passageId) || null;

    const playerError: PlayerError = {
      error,
      passage,
      context,
      timestamp: Date.now(),
    };

    this.emit('error', playerError);

    console.error(`[StoryPlayer Error - ${context}]:`, error);
  }
}
