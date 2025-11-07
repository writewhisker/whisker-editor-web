/**
 * Comment Model
 *
 * Represents a comment or annotation on a story element.
 */

import { generateId } from '../utils/idGenerator';

export interface CommentData {
  id?: string;
  passageId: string;
  user: string;
  content: string;
  timestamp?: number;
  resolved?: boolean;
  parentId?: string; // For threaded replies
}

export class Comment {
  id: string;
  passageId: string;
  user: string;
  content: string;
  timestamp: number;
  resolved: boolean;
  parentId?: string;
  replies: Comment[];

  constructor(data: CommentData) {
    this.id = data.id || generateId();
    this.passageId = data.passageId;
    this.user = data.user;
    this.content = data.content;
    this.timestamp = data.timestamp || Date.now();
    this.resolved = data.resolved || false;
    this.parentId = data.parentId;
    this.replies = [];
  }

  /**
   * Add a reply to this comment
   */
  addReply(reply: Comment): void {
    this.replies.push(reply);
  }

  /**
   * Mark comment as resolved
   */
  resolve(): void {
    this.resolved = true;
  }

  /**
   * Mark comment as unresolved
   */
  unresolve(): void {
    this.resolved = false;
  }

  /**
   * Update comment content
   */
  updateContent(content: string): void {
    this.content = content;
    this.timestamp = Date.now();
  }

  /**
   * Serialize to JSON
   */
  serialize(): CommentData {
    return {
      id: this.id,
      passageId: this.passageId,
      user: this.user,
      content: this.content,
      timestamp: this.timestamp,
      resolved: this.resolved,
      parentId: this.parentId,
    };
  }

  /**
   * Create from serialized data
   */
  static deserialize(data: CommentData): Comment {
    return new Comment(data);
  }
}
