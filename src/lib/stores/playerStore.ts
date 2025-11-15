import { writable, derived } from 'svelte/store';
import { StoryPlayer } from '../player/StoryPlayer';
import type { Passage } from '@writewhisker/core-ts';
import type { Choice } from '@writewhisker/core-ts';
import type { PlayerState, PlayerPlaythroughStep, VariableChange } from '../player/types';

// Create singleton player instance
const player = new StoryPlayer();

// Player state stores
export const isPlayerActive = writable<boolean>(false);
export const isPlayerPaused = writable<boolean>(false);
export const currentPreviewPassage = writable<Passage | null>(null);
export const availableChoices = writable<Choice[]>([]);
export const playerVariables = writable<Map<string, any>>(new Map());
export const playthroughHistory = writable<PlayerPlaythroughStep[]>([]);
export const visitedPassages = writable<Map<string, number>>(new Map());
export const breakpoints = writable<Set<string>>(new Set());
export const debugMode = writable<boolean>(false);
export const playerErrors = writable<Array<any>>([]);
export const playthroughDuration = writable<number>(0);

// Derived stores
export const hasHistory = derived(playthroughHistory, $history => $history.length > 1);
export const canUndo = derived(playthroughHistory, $history => $history.length > 1);
export const uniquePassagesVisited = derived(
  visitedPassages,
  $visited => $visited.size
);

// Duration update interval
let durationInterval: number | null = null;

function startDurationTimer() {
  if (durationInterval !== null) {
    clearInterval(durationInterval);
  }
  durationInterval = window.setInterval(() => {
    playthroughDuration.set(player.getDuration());
  }, 100);
}

function stopDurationTimer() {
  if (durationInterval !== null) {
    clearInterval(durationInterval);
    durationInterval = null;
  }
}

// Setup player event listeners
player.on('passageEntered', (data: { passage: Passage; visitCount: number }) => {
  currentPreviewPassage.set(data.passage);
  availableChoices.set(player.getAvailableChoices());
  updatePlayerState();
});

player.on('choiceSelected', () => {
  updatePlayerState();
});

player.on('variableChanged', (change: VariableChange) => {
  playerVariables.set(player.getAllVariables());
  updatePlayerState();
});

player.on('stateChanged', () => {
  updatePlayerState();
});

player.on('error', (error: any) => {
  playerErrors.update(errors => [...errors, error]);
});

function updatePlayerState() {
  playthroughHistory.set(player.getHistory());
  const state = player.getState();
  visitedPassages.set(new Map(Object.entries(state.visitedPassages).map(([k, v]) => [k, Number(v)])));
  playerVariables.set(player.getAllVariables());
  isPlayerPaused.set(player.isPaused());
}

// Player actions
export const playerActions = {
  /**
   * Start playing from the beginning or a specific passage
   */
  start(fromPassageId?: string) {
    try {
      player.start(fromPassageId);
      isPlayerActive.set(true);
      isPlayerPaused.set(false);
      playerErrors.set([]);
      startDurationTimer();
      updatePlayerState();
    } catch (error) {
      console.error('Failed to start player:', error);
      playerErrors.update(errors => [...errors, {
        error,
        context: 'start',
        timestamp: Date.now()
      }]);
    }
  },

  /**
   * Restart from the beginning
   */
  restart() {
    try {
      player.restart();
      isPlayerActive.set(true);
      isPlayerPaused.set(false);
      playerErrors.set([]);
      startDurationTimer();
      updatePlayerState();
    } catch (error) {
      console.error('Failed to restart player:', error);
    }
  },

  /**
   * Stop playback
   */
  stop() {
    player.reset();
    isPlayerActive.set(false);
    isPlayerPaused.set(false);
    currentPreviewPassage.set(null);
    availableChoices.set([]);
    stopDurationTimer();
    playthroughDuration.set(0);
    updatePlayerState();
  },

  /**
   * Pause playback
   */
  pause() {
    player.pause();
    isPlayerPaused.set(true);
    stopDurationTimer();
  },

  /**
   * Resume playback
   */
  resume() {
    player.resume();
    isPlayerPaused.set(false);
    startDurationTimer();
  },

  /**
   * Toggle pause/resume
   */
  togglePause() {
    if (player.isPaused()) {
      this.resume();
    } else {
      this.pause();
    }
  },

  /**
   * Make a choice
   */
  makeChoice(choiceId: string) {
    try {
      player.makeChoice(choiceId);
    } catch (error) {
      console.error('Failed to make choice:', error);
      playerErrors.update(errors => [...errors, {
        error,
        context: 'makeChoice',
        timestamp: Date.now()
      }]);
    }
  },

  /**
   * Undo last choice
   */
  undo() {
    const success = player.undo();
    if (success) {
      updatePlayerState();
      currentPreviewPassage.set(player.getCurrentPassage());
      availableChoices.set(player.getAvailableChoices());
    }
    return success;
  },

  /**
   * Load story into player
   */
  loadStory(story: any) {
    player.loadStory(story);
    updatePlayerState();
  },

  /**
   * Set variable value
   */
  setVariable(name: string, value: any) {
    player.setVariable(name, value);
  },

  /**
   * Get variable value
   */
  getVariable(name: string) {
    return player.getVariable(name);
  },

  /**
   * Toggle breakpoint on passage
   */
  toggleBreakpoint(passageId: string) {
    player.toggleBreakpoint(passageId);
    breakpoints.set(player.getBreakpoints());
  },

  /**
   * Check if passage has breakpoint
   */
  hasBreakpoint(passageId: string): boolean {
    return player.hasBreakpoint(passageId);
  },

  /**
   * Jump to a specific step in history
   */
  jumpToStep(stepIndex: number) {
    const history = player.getHistory();
    if (stepIndex < 0 || stepIndex >= history.length) {
      return false;
    }

    const targetStep = history[stepIndex];

    // Restore state at that step
    const state: PlayerState = {
      currentPassageId: targetStep.passageId,
      variables: targetStep.variablesAfter,
      visitedPassages: {},
      history: history.slice(0, stepIndex + 1),
      timestamp: targetStep.timestamp,
    };

    // Recalculate visited passages up to this point
    const visited: Record<string, number> = {};
    for (let i = 0; i <= stepIndex; i++) {
      const step = history[i];
      visited[step.passageId] = (visited[step.passageId] || 0) + 1;
    }
    state.visitedPassages = visited;

    player.restoreState(state);
    currentPreviewPassage.set(player.getCurrentPassage());
    availableChoices.set(player.getAvailableChoices());
    updatePlayerState();

    return true;
  },

  /**
   * Get playthrough recording
   */
  getPlaythrough() {
    return player.getPlaythrough();
  },

  /**
   * Export playthrough as JSON
   */
  exportPlaythrough() {
    const recording = player.getPlaythrough();
    return JSON.stringify(recording, null, 2);
  },

  /**
   * Clear all errors
   */
  clearErrors() {
    playerErrors.set([]);
  },

  /**
   * Toggle debug mode
   */
  toggleDebugMode() {
    debugMode.update(mode => !mode);
  },
};

// Export player instance for advanced usage
export { player };
