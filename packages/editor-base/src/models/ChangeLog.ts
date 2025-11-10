/**
 * ChangeLog - Track changes to story entities
 */

import { nanoid } from 'nanoid';

export type ChangeType = 'create' | 'update' | 'delete' | 'reorder';
export type EntityType = 'passage' | 'choice' | 'variable' | 'metadata' | 'asset' | 'function' | 'story';

export interface ChangeLogData {
  id?: string;
  timestamp: number;
  userId?: string;
  userName?: string;
  type: ChangeType;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  description: string;
  before?: any;
  after?: any;
  metadata?: Record<string, any>;
}

export class ChangeLog {
  id: string;
  timestamp: number;
  userId?: string;
  userName?: string;
  type: ChangeType;
  entityType: EntityType;
  entityId: string;
  entityName?: string;
  description: string;
  before?: any;
  after?: any;
  metadata: Record<string, any>;

  constructor(data: Omit<ChangeLogData, 'id' | 'timestamp'> & Partial<Pick<ChangeLogData, 'id' | 'timestamp'>>) {
    this.id = data.id || nanoid();
    this.timestamp = data.timestamp || Date.now();
    this.userId = data.userId;
    this.userName = data.userName;
    this.type = data.type;
    this.entityType = data.entityType;
    this.entityId = data.entityId;
    this.entityName = data.entityName;
    this.description = data.description;
    this.before = data.before;
    this.after = data.after;
    this.metadata = data.metadata || {};
  }

  serialize(): ChangeLogData {
    return {
      id: this.id,
      timestamp: this.timestamp,
      userId: this.userId,
      userName: this.userName,
      type: this.type,
      entityType: this.entityType,
      entityId: this.entityId,
      entityName: this.entityName,
      description: this.description,
      before: this.before,
      after: this.after,
      metadata: this.metadata,
    };
  }

  static deserialize(data: ChangeLogData): ChangeLog {
    return new ChangeLog(data);
  }

  getFormattedDate(): string {
    return new Date(this.timestamp).toLocaleString();
  }

  getRelativeTime(): string {
    const now = Date.now();
    const diff = now - this.timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'just now';
  }
}
