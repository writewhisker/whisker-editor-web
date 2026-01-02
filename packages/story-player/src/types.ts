import type { Passage } from '@writewhisker/story-models';

/**
 * Represents a single step in a runtime playthrough
 */
export interface PlayerPlaythroughStep {
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
  steps: PlayerPlaythroughStep[];
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
 * Tunnel call frame for tracking nested tunnel calls
 */
export interface TunnelFrame {
  /** The passage to return to when tunnel completes */
  returnPassageId: string;
  /** Position within the passage content to resume from */
  returnPosition: number;
  /** Local/temporary variables scoped to this tunnel */
  localVariables: Record<string, any>;
}

/**
 * Gather point state for tracking flow reconvergence
 */
export interface GatherState {
  /** Current choice depth level */
  choiceDepth: number;
  /** Whether we're currently in a choice branch */
  inChoiceBranch: boolean;
  /** Content accumulated after gather point */
  postGatherContent: string[];
}

/**
 * Player state snapshot
 */
export interface PlayerState {
  currentPassageId: string | null;
  variables: Record<string, any>;
  visitedPassages: Record<string, number>;
  history: PlayerPlaythroughStep[];
  timestamp: number;
  /** Tunnel call stack for nested tunnel calls */
  tunnelStack: TunnelFrame[];
}
