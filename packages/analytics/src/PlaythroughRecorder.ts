/**
 * PlaythroughRecorder - Records player actions during story playthrough
 *
 * Used for analytics and automated testing.
 */

import { Playthrough, PlaythroughStep, type PlaythroughData } from '@writewhisker/core-ts';
import type { Story } from '@writewhisker/core-ts';

export class PlaythroughRecorder {
  private playthrough: Playthrough | null = null;
  private currentPassageId: string | null = null;
  private passageStartTime: number | null = null;
  private allPlaythroughs: Playthrough[] = [];

  constructor() {
    this.loadPlaythroughs();
  }

  /**
   * Start a new playthrough recording
   */
  startPlaythrough(story: Story, metadata?: Record<string, any>): Playthrough {
    this.playthrough = new Playthrough({
      storyId: story.metadata.id || 'unknown',
      storyTitle: story.metadata.title,
      metadata,
    });

    this.currentPassageId = null;
    this.passageStartTime = null;

    return this.playthrough;
  }

  /**
   * Record visiting a passage
   */
  recordPassageVisit(passageId: string, passageTitle: string, variables?: Record<string, any>): void {
    if (!this.playthrough) {
      throw new Error('No playthrough in progress. Call startPlaythrough first.');
    }

    // If there was a previous passage, calculate time spent
    const now = Date.now();
    let timeSpent = 0;
    if (this.passageStartTime !== null) {
      timeSpent = now - this.passageStartTime;
    }

    // Record the step (only if not the first passage)
    if (this.currentPassageId !== null && this.passageStartTime !== null) {
      const step = new PlaythroughStep({
        passageId: this.currentPassageId,
        passageTitle: this.getPreviousPassageTitle(),
        timestamp: new Date(this.passageStartTime).toISOString(),
        variables: variables ? { ...variables } : {},
        timeSpent,
      });
      this.playthrough.addStep(step);
    }

    // Update current passage tracking
    this.currentPassageId = passageId;
    this.passageStartTime = now;
  }

  /**
   * Record a choice being made
   */
  recordChoice(choiceIndex: number, choiceText: string): void {
    if (!this.playthrough || !this.currentPassageId) {
      throw new Error('No passage visit in progress.');
    }

    // Find the last step and update it with choice info
    const steps = this.playthrough.steps;
    if (steps.length > 0) {
      const lastStep = steps[steps.length - 1];
      lastStep.choiceIndex = choiceIndex;
      lastStep.choiceText = choiceText;
    }
  }

  /**
   * Complete the current playthrough
   */
  completePlaythrough(finalVariables?: Record<string, any>): Playthrough {
    if (!this.playthrough) {
      throw new Error('No playthrough in progress.');
    }

    // Record the final passage visit
    if (this.currentPassageId !== null && this.passageStartTime !== null) {
      const now = Date.now();
      const timeSpent = now - this.passageStartTime;

      const step = new PlaythroughStep({
        passageId: this.currentPassageId,
        passageTitle: this.getCurrentPassageTitle(),
        timestamp: new Date(this.passageStartTime).toISOString(),
        variables: finalVariables ? { ...finalVariables } : {},
        timeSpent,
      });
      this.playthrough.addStep(step);
    }

    this.playthrough.complete(finalVariables);
    this.allPlaythroughs.push(this.playthrough);
    this.savePlaythroughs();

    const completed = this.playthrough;
    this.playthrough = null;
    this.currentPassageId = null;
    this.passageStartTime = null;

    return completed;
  }

  /**
   * Cancel the current playthrough without saving
   */
  cancelPlaythrough(): void {
    this.playthrough = null;
    this.currentPassageId = null;
    this.passageStartTime = null;
  }

  /**
   * Get the current playthrough (if any)
   */
  getCurrentPlaythrough(): Playthrough | null {
    return this.playthrough;
  }

  /**
   * Get all recorded playthroughs
   */
  getAllPlaythroughs(): Playthrough[] {
    return [...this.allPlaythroughs];
  }

  /**
   * Get playthroughs for a specific story
   */
  getPlaythroughsByStory(storyId: string): Playthrough[] {
    return this.allPlaythroughs.filter(p => p.storyId === storyId);
  }

  /**
   * Delete a playthrough
   */
  deletePlaythrough(playthroughId: string): boolean {
    const index = this.allPlaythroughs.findIndex(p => p.id === playthroughId);
    if (index >= 0) {
      this.allPlaythroughs.splice(index, 1);
      this.savePlaythroughs();
      return true;
    }
    return false;
  }

  /**
   * Clear all playthroughs
   */
  clearAllPlaythroughs(): void {
    this.allPlaythroughs = [];
    this.savePlaythroughs();
  }

  /**
   * Clear playthroughs for a specific story
   */
  clearPlaythroughsByStory(storyId: string): void {
    this.allPlaythroughs = this.allPlaythroughs.filter(p => p.storyId !== storyId);
    this.savePlaythroughs();
  }

  /**
   * Export playthroughs as JSON
   */
  exportPlaythroughs(storyId?: string): string {
    const playthroughs = storyId
      ? this.getPlaythroughsByStory(storyId)
      : this.allPlaythroughs;

    const data = playthroughs.map(p => p.serialize());
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import playthroughs from JSON
   */
  importPlaythroughs(json: string): number {
    try {
      const data = JSON.parse(json) as PlaythroughData[];
      const imported = data.map(d => Playthrough.deserialize(d));
      this.allPlaythroughs.push(...imported);
      this.savePlaythroughs();
      return imported.length;
    } catch (error) {
      throw new Error(`Failed to import playthroughs: ${error}`);
    }
  }

  /**
   * Save playthroughs to localStorage
   */
  private savePlaythroughs(): void {
    try {
      const data = this.allPlaythroughs.map(p => p.serialize());
      localStorage.setItem('whisker-playthroughs', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save playthroughs:', error);
    }
  }

  /**
   * Load playthroughs from localStorage
   */
  private loadPlaythroughs(): void {
    try {
      const stored = localStorage.getItem('whisker-playthroughs');
      if (stored) {
        const data = JSON.parse(stored) as PlaythroughData[];
        this.allPlaythroughs = data.map(d => Playthrough.deserialize(d));
      }
    } catch (error) {
      console.error('Failed to load playthroughs:', error);
      this.allPlaythroughs = [];
    }
  }

  /**
   * Helper to get previous passage title
   */
  private getPreviousPassageTitle(): string {
    const steps = this.playthrough?.steps;
    if (steps && steps.length > 0) {
      return steps[steps.length - 1].passageTitle;
    }
    return 'Unknown';
  }

  /**
   * Helper to get current passage title
   */
  private getCurrentPassageTitle(): string {
    // This would ideally be passed in, but for now return a placeholder
    return 'Current Passage';
  }
}

// Singleton instance
let recorderInstance: PlaythroughRecorder | null = null;

export function getPlaythroughRecorder(): PlaythroughRecorder {
  if (!recorderInstance) {
    recorderInstance = new PlaythroughRecorder();
  }
  return recorderInstance;
}
