/**
 * Comment Store
 *
 * State management for comments and annotations.
 */

import { writable, derived, get } from 'svelte/store';
import { Comment, type CommentData } from '../models/Comment';
import { currentStory } from './projectStore';

// State
export const comments = writable<Map<string, Comment>>(new Map());
export const currentUser = writable<string>('Anonymous');

// Derived stores
export const commentsByPassage = derived(
  comments,
  ($comments) => {
    const byPassage = new Map<string, Comment[]>();
    $comments.forEach((comment) => {
      if (!comment.parentId) { // Only top-level comments
        const passageComments = byPassage.get(comment.passageId) || [];
        passageComments.push(comment);
        byPassage.set(comment.passageId, passageComments);
      }
    });
    return byPassage;
  }
);

export const unresolvedComments = derived(
  comments,
  ($comments) => {
    return Array.from($comments.values()).filter(c => !c.resolved && !c.parentId);
  }
);

/**
 * Comment actions
 */
export const commentActions = {
  /**
   * Add a comment
   */
  addComment(data: CommentData): Comment {
    const comment = new Comment({
      ...data,
      user: data.user || get(currentUser),
    });

    // If it's a reply, add to parent
    if (comment.parentId) {
      const parent = get(comments).get(comment.parentId);
      if (parent) {
        parent.addReply(comment);
      }
    }

    comments.update(c => {
      c.set(comment.id, comment);
      return c;
    });

    saveComments();
    return comment;
  },

  /**
   * Update comment content
   */
  updateComment(commentId: string, content: string): void {
    comments.update(c => {
      const comment = c.get(commentId);
      if (comment) {
        comment.updateContent(content);
      }
      return c;
    });
    saveComments();
  },

  /**
   * Delete comment
   */
  deleteComment(commentId: string): void {
    comments.update(c => {
      c.delete(commentId);
      return c;
    });
    saveComments();
  },

  /**
   * Resolve comment
   */
  resolveComment(commentId: string): void {
    comments.update(c => {
      const comment = c.get(commentId);
      if (comment) {
        comment.resolve();
      }
      return c;
    });
    saveComments();
  },

  /**
   * Unresolve comment
   */
  unresolveComment(commentId: string): void {
    comments.update(c => {
      const comment = c.get(commentId);
      if (comment) {
        comment.unresolve();
      }
      return c;
    });
    saveComments();
  },

  /**
   * Get comments for a passage
   */
  getPassageComments(passageId: string): Comment[] {
    return get(commentsByPassage).get(passageId) || [];
  },

  /**
   * Clear all comments
   */
  clearAll(): void {
    comments.set(new Map());
    saveComments();
  },

  /**
   * Load comments from storage
   */
  loadComments(): void {
    const story = get(currentStory);
    if (!story) return;

    try {
      const key = `whisker_comments_${story.metadata.id}`;
      const data = localStorage.getItem(key);
      if (data) {
        const commentData: CommentData[] = JSON.parse(data);
        const commentMap = new Map<string, Comment>();

        commentData.forEach(cd => {
          const comment = Comment.deserialize(cd);
          commentMap.set(comment.id, comment);
        });

        comments.set(commentMap);
      }
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  },

  /**
   * Set current user
   */
  setCurrentUser(name: string): void {
    currentUser.set(name);
    localStorage.setItem('whisker_current_user', name);
  },
};

/**
 * Save comments to storage
 */
function saveComments(): void {
  const story = get(currentStory);
  if (!story) return;

  try {
    const key = `whisker_comments_${story.metadata.id}`;
    const commentData = Array.from(get(comments).values()).map(c => c.serialize());
    localStorage.setItem(key, JSON.stringify(commentData));
  } catch (error) {
    console.error('Failed to save comments:', error);
  }
}

// Load current user from storage
const savedUser = localStorage.getItem('whisker_current_user');
if (savedUser) {
  currentUser.set(savedUser);
}

// Load comments when story changes
currentStory.subscribe(() => {
  commentActions.loadComments();
});
