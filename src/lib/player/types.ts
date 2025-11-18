import type { Passage } from '@writewhisker/core-ts';
import type { Choice } from '@writewhisker/core-ts';

/**
 * Represents a single step in a playthrough
 */
export interface PlaythroughStep {
  timestamp: number;
  passageId: string;
  passageTitle: string;
  choiceId?: string;
  choiceText?: string;
  variablesBefore: Record<string, any>;
  variablesAfter: Record<string, any>;
}

/**
 * Complete playthrough recording
 */
export interface PlaythroughRecording {
  metadata: {
    storyTitle: string;
    recordedAt: string;
    duration: number;
    completed: boolean;
  };
  steps: PlaythroughStep[];
  finalState: {
    variables: Record<string, any>;
    passagesVisited: string[];
  };
}

/**
 * Variable change event
 */
export interface VariableChange {
  name: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

/**
 * Player error event
 */
export interface PlayerError {
  error: Error;
  passage: Passage | null;
  context: string;
  timestamp: number;
}

/**
 * Player events
 */
export type PlayerEvent =
  | 'passageEntered'
  | 'choiceSelected'
  | 'variableChanged'
  | 'error'
  | 'stateChanged';

/**
 * Player event callback
 */
export type PlayerEventCallback = (data: any) => void;

/**
 * Player state snapshot
 */
export interface PlayerState {
  currentPassageId: string | null;
  variables: Record<string, any>;
  visitedPassages: Record<string, number>;
  history: PlaythroughStep[];
  timestamp: number;
}
