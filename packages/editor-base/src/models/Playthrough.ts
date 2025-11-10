/**
 * Playthrough - Track a single playthrough of a story
 */

import { nanoid } from 'nanoid';

export interface PlaythroughStep {
  passageId: string;
  timestamp: number;
  choiceIndex?: number;
  timeSpent?: number;
}

export interface PlaythroughData {
  id?: string;
  storyId: string;
  startedAt: number;
  startTime?: number;
  endedAt?: number;
  endTime?: number;
  completed: boolean;
  steps: PlaythroughStep[];
  choices?: Array<{ passageId: string; choiceIndex: number }>;
  finalVariables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class Playthrough {
  id: string;
  storyId: string;
  startedAt: number;
  startTime?: number;
  endedAt?: number;
  endTime?: number;
  completed: boolean;
  steps: PlaythroughStep[];
  choices: Array<{ passageId: string; choiceIndex: number }>;
  finalVariables: Record<string, any>;
  metadata: Record<string, any>;

  constructor(data: Partial<PlaythroughData> & { storyId: string }) {
    this.id = data.id || nanoid();
    this.storyId = data.storyId;
    this.startedAt = data.startedAt || Date.now();
    this.startTime = data.startTime || this.startedAt;
    this.endedAt = data.endedAt;
    this.endTime = data.endTime || data.endedAt;
    this.completed = data.completed || false;
    this.steps = data.steps || [];
    this.choices = data.choices || [];
    this.finalVariables = data.finalVariables || {};
    this.metadata = data.metadata || {};
  }

  addStep(passageId: string, choiceIndex?: number): void {
    this.steps.push({
      passageId,
      timestamp: Date.now(),
      choiceIndex,
    });
  }

  complete(): void {
    this.completed = true;
    this.endedAt = Date.now();
  }

  getDuration(): number {
    const end = this.endedAt || Date.now();
    return end - this.startedAt;
  }

  getChoices(): Array<{ passageId: string; choiceIndex: number }> {
    return this.choices;
  }

  serialize(): PlaythroughData {
    return {
      id: this.id,
      storyId: this.storyId,
      startedAt: this.startedAt,
      startTime: this.startTime,
      endedAt: this.endedAt,
      endTime: this.endTime,
      completed: this.completed,
      steps: this.steps,
      choices: this.choices,
      finalVariables: this.finalVariables,
      metadata: this.metadata,
    };
  }

  static deserialize(data: PlaythroughData): Playthrough {
    return new Playthrough(data);
  }
}
