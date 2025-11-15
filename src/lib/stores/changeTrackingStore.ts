/**
 * Change Tracking Store
 *
 * Tracks all modifications to the story for collaboration and history.
 */

import { writable, derived, get } from 'svelte/store';
import { ChangeLog, type ChangeLogData, type ChangeType, type EntityType } from '@writewhisker/core-ts';
import { currentStory } from './projectStore';
import { currentUser } from './commentStore';

// State
export const changeLogs = writable<ChangeLog[]>([]);
export const isTrackingEnabled = writable<boolean>(true);

// Derived stores
export const recentChanges = derived(changeLogs, ($logs) => {
  return $logs.slice(0, 50); // Last 50 changes
});

export const changesByUser = derived(changeLogs, ($logs) => {
  const byUser = new Map<string, ChangeLog[]>();
  $logs.forEach((log) => {
    const userLogs = byUser.get(log.user) || [];
    userLogs.push(log);
    byUser.set(log.user, userLogs);
  });
  return byUser;
});

export const changesByEntity = derived(changeLogs, ($logs) => {
  const byEntity = new Map<string, ChangeLog[]>();
  $logs.forEach((log) => {
    const entityLogs = byEntity.get(log.entityId) || [];
    entityLogs.push(log);
    byEntity.set(log.entityId, entityLogs);
  });
  return byEntity;
});

/**
 * Change tracking actions
 */
export const changeTrackingActions = {
  /**
   * Log a change
   */
  logChange(data: Omit<ChangeLogData, 'timestamp' | 'user'>): void {
    if (!get(isTrackingEnabled)) return;

    const log = new ChangeLog({
      ...data,
      user: get(currentUser),
      timestamp: Date.now(),
    });

    changeLogs.update((logs) => [log, ...logs]);
    saveChangeLogs();
  },

  /**
   * Log passage creation
   */
  logPassageCreated(passageId: string, passageName: string): void {
    this.logChange({
      changeType: 'create',
      entityType: 'passage',
      entityId: passageId,
      entityName: passageName,
      description: `Created passage "${passageName}"`,
    });
  },

  /**
   * Log passage update
   */
  logPassageUpdated(
    passageId: string,
    passageName: string,
    oldValue: any,
    newValue: any
  ): void {
    this.logChange({
      changeType: 'update',
      entityType: 'passage',
      entityId: passageId,
      entityName: passageName,
      description: `Updated passage "${passageName}"`,
      oldValue,
      newValue,
    });
  },

  /**
   * Log passage deletion
   */
  logPassageDeleted(passageId: string, passageName: string): void {
    this.logChange({
      changeType: 'delete',
      entityType: 'passage',
      entityId: passageId,
      entityName: passageName,
      description: `Deleted passage "${passageName}"`,
    });
  },

  /**
   * Log choice creation
   */
  logChoiceCreated(passageId: string, choiceText: string): void {
    this.logChange({
      changeType: 'create',
      entityType: 'choice',
      entityId: passageId,
      description: `Added choice "${choiceText}"`,
    });
  },

  /**
   * Log choice update
   */
  logChoiceUpdated(
    passageId: string,
    choiceText: string,
    oldValue: any,
    newValue: any
  ): void {
    this.logChange({
      changeType: 'update',
      entityType: 'choice',
      entityId: passageId,
      description: `Updated choice "${choiceText}"`,
      oldValue,
      newValue,
    });
  },

  /**
   * Log choice deletion
   */
  logChoiceDeleted(passageId: string, choiceText: string): void {
    this.logChange({
      changeType: 'delete',
      entityType: 'choice',
      entityId: passageId,
      description: `Deleted choice "${choiceText}"`,
    });
  },

  /**
   * Log variable change
   */
  logVariableChanged(
    variableName: string,
    changeType: ChangeType,
    oldValue?: any,
    newValue?: any
  ): void {
    const actions = {
      create: 'Created',
      update: 'Updated',
      delete: 'Deleted',
    };

    this.logChange({
      changeType,
      entityType: 'variable',
      entityId: variableName,
      entityName: variableName,
      description: `${actions[changeType]} variable "${variableName}"`,
      oldValue,
      newValue,
    });
  },

  /**
   * Log metadata change
   */
  logMetadataChanged(field: string, oldValue: any, newValue: any): void {
    this.logChange({
      changeType: 'update',
      entityType: 'metadata',
      entityId: 'story-metadata',
      entityName: field,
      description: `Updated ${field}`,
      oldValue,
      newValue,
    });
  },

  /**
   * Get changes for an entity
   */
  getEntityChanges(entityId: string): ChangeLog[] {
    return get(changesByEntity).get(entityId) || [];
  },

  /**
   * Get changes by user
   */
  getUserChanges(user: string): ChangeLog[] {
    return get(changesByUser).get(user) || [];
  },

  /**
   * Get changes within time range
   */
  getChangesInRange(startTime: number, endTime: number): ChangeLog[] {
    return get(changeLogs).filter(
      (log) => log.timestamp >= startTime && log.timestamp <= endTime
    );
  },

  /**
   * Clear all change logs
   */
  clearAll(): void {
    changeLogs.set([]);
    saveChangeLogs();
  },

  /**
   * Enable/disable tracking
   */
  setTracking(enabled: boolean): void {
    isTrackingEnabled.set(enabled);
    localStorage.setItem('whisker_tracking_enabled', String(enabled));
  },

  /**
   * Load changes from storage
   */
  loadChanges(): void {
    const story = get(currentStory);
    if (!story) return;

    try {
      const key = `whisker_changes_${story.metadata.id}`;
      const data = localStorage.getItem(key);
      if (data) {
        const changeData: ChangeLogData[] = JSON.parse(data);
        const logs = changeData.map((d) => ChangeLog.deserialize(d));
        changeLogs.set(logs);
      }
    } catch (error) {
      console.error('Failed to load change logs:', error);
    }
  },
};

/**
 * Save change logs to storage
 */
function saveChangeLogs(): void {
  const story = get(currentStory);
  if (!story) return;

  try {
    const key = `whisker_changes_${story.metadata.id}`;
    const logs = get(changeLogs);
    // Keep only last 1000 changes
    const trimmed = logs.slice(0, 1000);
    const data = trimmed.map((log) => log.serialize());
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save change logs:', error);
  }
}

// Load tracking preference
const trackingPref = localStorage.getItem('whisker_tracking_enabled');
if (trackingPref !== null) {
  isTrackingEnabled.set(trackingPref === 'true');
}

// Load changes when story changes
currentStory.subscribe(() => {
  changeTrackingActions.loadChanges();
});
