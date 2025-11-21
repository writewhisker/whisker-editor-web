/**
 * Playthrough - Records a single playthrough session of a story
 *
 * Tracks player progression, choices, and outcomes for analytics and testing.
 */

import { nanoid } from 'nanoid';

export interface PlaythroughStepData {
  passageId: string;
  passageTitle: string;
  timestamp: string;
  choiceIndex?: number;
  choiceText?: string;
  variables?: Record<string, any>;
  timeSpent?: number; // milliseconds spent on this passage
}

export interface PlaythroughData {
  id: string;
  storyId: string;
  storyTitle: string;
  startTime: string;
  endTime?: string;
  completed: boolean;
  steps: PlaythroughStepData[];
  finalVariables?: Record<string, any>;
  metadata?: Record<string, any>; // Custom metadata (e.g., tester name, test scenario)
}

export class PlaythroughStep {
  passageId: string;
  passageTitle: string;
  timestamp: string;
  choiceIndex?: number;
  choiceText?: string;
  variables: Record<string, any>;
  timeSpent: number;

  constructor(data: PlaythroughStepData) {
    this.passageId = data.passageId;
    this.passageTitle = data.passageTitle;
    this.timestamp = data.timestamp;
    this.choiceIndex = data.choiceIndex;
    this.choiceText = data.choiceText;
    this.variables = data.variables || {};
    this.timeSpent = data.timeSpent || 0;
  }

  serialize(): PlaythroughStepData {
    const data: PlaythroughStepData = {
      passageId: this.passageId,
      passageTitle: this.passageTitle,
      timestamp: this.timestamp,
      variables: { ...this.variables },
      timeSpent: this.timeSpent,
    };

    if (this.choiceIndex !== undefined) {
      data.choiceIndex = this.choiceIndex;
    }
    if (this.choiceText) {
      data.choiceText = this.choiceText;
    }

    return data;
  }

  static deserialize(data: PlaythroughStepData): PlaythroughStep {
    return new PlaythroughStep(data);
  }
}

export class Playthrough {
  id: string;
  storyId: string;
  storyTitle: string;
  startTime: string;
  endTime?: string;
  completed: boolean;
  steps: PlaythroughStep[];
  finalVariables: Record<string, any>;
  metadata: Record<string, any>;

  constructor(data?: Partial<PlaythroughData>) {
    const now = new Date().toISOString();

    this.id = data?.id || nanoid();
    this.storyId = data?.storyId || '';
    this.storyTitle = data?.storyTitle || 'Untitled Story';
    this.startTime = data?.startTime || now;
    this.endTime = data?.endTime;
    this.completed = data?.completed || false;
    this.steps = [];
    this.finalVariables = data?.finalVariables || {};
    this.metadata = data?.metadata || {};

    // Deserialize steps if provided
    if (data?.steps) {
      this.steps = data.steps.map(step => PlaythroughStep.deserialize(step));
    }
  }

  /**
   * Add a step to the playthrough
   */
  addStep(step: PlaythroughStep | PlaythroughStepData): void {
    if (step instanceof PlaythroughStep) {
      this.steps.push(step);
    } else {
      this.steps.push(new PlaythroughStep(step));
    }
  }

  /**
   * Mark the playthrough as completed
   */
  complete(finalVariables?: Record<string, any>): void {
    this.completed = true;
    this.endTime = new Date().toISOString();
    if (finalVariables) {
      this.finalVariables = { ...finalVariables };
    }
  }

  /**
   * Get the total duration of the playthrough in milliseconds
   */
  getDuration(): number {
    if (!this.endTime) {
      return Date.now() - new Date(this.startTime).getTime();
    }
    return new Date(this.endTime).getTime() - new Date(this.startTime).getTime();
  }

  /**
   * Get the path taken (sequence of passage titles)
   */
  getPath(): string[] {
    return this.steps.map(step => step.passageTitle);
  }

  /**
   * Get all unique passages visited
   */
  getUniquePassages(): string[] {
    const unique = new Set(this.steps.map(step => step.passageId));
    return Array.from(unique);
  }

  /**
   * Get all choices made during the playthrough
   */
  getChoices(): Array<{ passageTitle: string; choiceText: string; choiceIndex: number }> {
    return this.steps
      .filter(step => step.choiceText !== undefined)
      .map(step => ({
        passageTitle: step.passageTitle,
        choiceText: step.choiceText!,
        choiceIndex: step.choiceIndex!,
      }));
  }

  /**
   * Serialize to plain object
   */
  serialize(): PlaythroughData {
    const data: PlaythroughData = {
      id: this.id,
      storyId: this.storyId,
      storyTitle: this.storyTitle,
      startTime: this.startTime,
      completed: this.completed,
      steps: this.steps.map(step => step.serialize()),
    };

    if (this.endTime) {
      data.endTime = this.endTime;
    }
    if (Object.keys(this.finalVariables).length > 0) {
      data.finalVariables = { ...this.finalVariables };
    }
    if (Object.keys(this.metadata).length > 0) {
      data.metadata = { ...this.metadata };
    }

    return data;
  }

  /**
   * Deserialize from plain object
   */
  static deserialize(data: PlaythroughData): Playthrough {
    return new Playthrough(data);
  }
}
