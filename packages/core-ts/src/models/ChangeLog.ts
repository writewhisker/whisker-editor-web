/**
 * ChangeLog Model
 *
 * Tracks changes made to story elements for collaboration and history.
 */

import { generateId } from '../utils/idGenerator';

export type ChangeType = 'create' | 'update' | 'delete';
export type EntityType = 'story' | 'passage' | 'choice' | 'variable' | 'metadata';

export interface ChangeLogData {
  id?: string;
  timestamp?: number;
  user: string;
  changeType: ChangeType;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  description: string;
  oldValue?: any;
  newValue?: any;
}

export class ChangeLog {
  id: string;
  timestamp: number;
  user: string;
  changeType: ChangeType;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  description: string;
  oldValue?: any;
  newValue?: any;

  constructor(data: ChangeLogData) {
    this.id = data.id || generateId();
    this.timestamp = data.timestamp || Date.now();
    this.user = data.user;
    this.changeType = data.changeType;
    this.entityType = data.entityType;
    this.entityId = data.entityId;
    this.entityName = data.entityName;
    this.description = data.description;
    this.oldValue = data.oldValue;
    this.newValue = data.newValue;
  }

  /**
   * Get a human-readable summary
   */
  getSummary(): string {
    const action = this.changeType === 'create' ? 'created' :
                   this.changeType === 'delete' ? 'deleted' : 'updated';
    const entity = this.entityName || this.entityType;
    return `${this.user} ${action} ${entity}`;
  }

  /**
   * Get formatted timestamp
   */
  getFormattedTime(): string {
    return new Date(this.timestamp).toLocaleString();
  }

  /**
   * Serialize to JSON
   */
  serialize(): ChangeLogData {
    return {
      id: this.id,
      timestamp: this.timestamp,
      user: this.user,
      changeType: this.changeType,
      entityType: this.entityType,
      entityId: this.entityId,
      entityName: this.entityName,
      description: this.description,
      oldValue: this.oldValue,
      newValue: this.newValue,
    };
  }

  /**
   * Create from serialized data
   */
  static deserialize(data: ChangeLogData): ChangeLog {
    return new ChangeLog(data);
  }
}
