/**
 * Collaborator Model
 *
 * Represents a person working on a story project.
 */

export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

export interface CollaboratorData {
  name: string;
  role: CollaboratorRole;
  email?: string;
  addedAt?: number;
}

export class Collaborator {
  name: string;
  role: CollaboratorRole;
  email?: string;
  addedAt: number;

  constructor(data: CollaboratorData) {
    this.name = data.name;
    this.role = data.role;
    this.email = data.email;
    this.addedAt = data.addedAt || Date.now();
  }

  /**
   * Check if collaborator can edit
   */
  canEdit(): boolean {
    return this.role === 'owner' || this.role === 'editor';
  }

  /**
   * Check if collaborator is owner
   */
  isOwner(): boolean {
    return this.role === 'owner';
  }

  /**
   * Serialize to JSON
   */
  serialize(): CollaboratorData {
    return {
      name: this.name,
      role: this.role,
      email: this.email,
      addedAt: this.addedAt,
    };
  }
}
