import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { comments, commentActions } from './commentStore';
import type { Comment } from '$lib/models/Comment';

describe('commentStore', () => {
  beforeEach(() => {
    // Clear comments before each test
    commentActions.clear();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start with empty comments', () => {
      expect(get(comments)).toEqual([]);
    });

    it('should load comments from localStorage if available', () => {
      const mockComments: Comment[] = [
        {
          id: 'comment-1',
          passageId: 'passage-1',
          content: 'Test comment',
          author: 'Test User',
          timestamp: Date.now(),
          resolved: false,
          replies: [],
        },
      ];

      localStorage.setItem('passage-1-comments', JSON.stringify(mockComments));
      commentActions.loadComments('passage-1');

      expect(get(comments)).toHaveLength(1);
      expect(get(comments)[0].content).toBe('Test comment');
    });
  });

  describe('commentActions.addComment', () => {
    it('should add a new comment', () => {
      commentActions.addComment('passage-1', 'Test comment', 'Test User');

      const allComments = get(comments);
      expect(allComments).toHaveLength(1);
      expect(allComments[0].content).toBe('Test comment');
      expect(allComments[0].author).toBe('Test User');
      expect(allComments[0].passageId).toBe('passage-1');
      expect(allComments[0].resolved).toBe(false);
    });

    it('should generate a unique ID for each comment', () => {
      commentActions.addComment('passage-1', 'Comment 1', 'User 1');
      commentActions.addComment('passage-1', 'Comment 2', 'User 2');

      const allComments = get(comments);
      expect(allComments[0].id).not.toBe(allComments[1].id);
    });

    it('should save to localStorage', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem');
      commentActions.addComment('passage-1', 'Test', 'User');

      expect(spy).toHaveBeenCalledWith('passage-1-comments', expect.any(String));
    });
  });

  describe('commentActions.addReply', () => {
    it('should add a reply to a comment', () => {
      commentActions.addComment('passage-1', 'Parent comment', 'User 1');
      const allComments = get(comments);
      const parentId = allComments[0].id;

      commentActions.addReply(parentId, 'Reply comment', 'User 2');

      const updated = get(comments);
      expect(updated[0].replies).toHaveLength(1);
      expect(updated[0].replies[0].content).toBe('Reply comment');
      expect(updated[0].replies[0].author).toBe('User 2');
    });

    it('should add nested replies', () => {
      commentActions.addComment('passage-1', 'Parent', 'User 1');
      const parent = get(comments)[0];

      commentActions.addReply(parent.id, 'Reply 1', 'User 2');
      const reply1 = get(comments)[0].replies[0];

      commentActions.addReply(reply1.id, 'Reply 2', 'User 3');

      const final = get(comments);
      expect(final[0].replies[0].replies).toHaveLength(1);
      expect(final[0].replies[0].replies[0].content).toBe('Reply 2');
    });

    it('should handle non-existent parent ID gracefully', () => {
      commentActions.addReply('non-existent', 'Reply', 'User');
      expect(get(comments)).toHaveLength(0);
    });
  });

  describe('commentActions.editComment', () => {
    it('should edit a comment', () => {
      commentActions.addComment('passage-1', 'Original', 'User');
      const commentId = get(comments)[0].id;

      commentActions.editComment(commentId, 'Updated');

      expect(get(comments)[0].content).toBe('Updated');
    });

    it('should edit a reply', () => {
      commentActions.addComment('passage-1', 'Parent', 'User 1');
      const parentId = get(comments)[0].id;
      commentActions.addReply(parentId, 'Original reply', 'User 2');
      const replyId = get(comments)[0].replies[0].id;

      commentActions.editComment(replyId, 'Updated reply');

      expect(get(comments)[0].replies[0].content).toBe('Updated reply');
    });

    it('should handle non-existent comment ID', () => {
      commentActions.addComment('passage-1', 'Test', 'User');
      commentActions.editComment('non-existent', 'Updated');

      expect(get(comments)[0].content).toBe('Test');
    });
  });

  describe('commentActions.deleteComment', () => {
    it('should delete a comment', () => {
      commentActions.addComment('passage-1', 'Test', 'User');
      const commentId = get(comments)[0].id;

      commentActions.deleteComment(commentId);

      expect(get(comments)).toHaveLength(0);
    });

    it('should delete a reply', () => {
      commentActions.addComment('passage-1', 'Parent', 'User 1');
      const parentId = get(comments)[0].id;
      commentActions.addReply(parentId, 'Reply', 'User 2');
      const replyId = get(comments)[0].replies[0].id;

      commentActions.deleteComment(replyId);

      expect(get(comments)[0].replies).toHaveLength(0);
    });

    it('should handle non-existent comment ID', () => {
      commentActions.addComment('passage-1', 'Test', 'User');
      commentActions.deleteComment('non-existent');

      expect(get(comments)).toHaveLength(1);
    });
  });

  describe('commentActions.resolveComment', () => {
    it('should mark a comment as resolved', () => {
      commentActions.addComment('passage-1', 'Test', 'User');
      const commentId = get(comments)[0].id;

      commentActions.resolveComment(commentId);

      expect(get(comments)[0].resolved).toBe(true);
    });

    it('should mark a comment as unresolved', () => {
      commentActions.addComment('passage-1', 'Test', 'User');
      const commentId = get(comments)[0].id;
      commentActions.resolveComment(commentId);
      commentActions.resolveComment(commentId);

      expect(get(comments)[0].resolved).toBe(false);
    });
  });

  describe('commentActions.loadComments', () => {
    it('should load comments for a passage', () => {
      const mockComments: Comment[] = [
        {
          id: 'comment-1',
          passageId: 'passage-1',
          content: 'Test 1',
          author: 'User 1',
          timestamp: Date.now(),
          resolved: false,
          replies: [],
        },
        {
          id: 'comment-2',
          passageId: 'passage-1',
          content: 'Test 2',
          author: 'User 2',
          timestamp: Date.now(),
          resolved: false,
          replies: [],
        },
      ];

      localStorage.setItem('passage-1-comments', JSON.stringify(mockComments));
      commentActions.loadComments('passage-1');

      expect(get(comments)).toHaveLength(2);
    });

    it('should handle missing localStorage data', () => {
      localStorage.removeItem('passage-1-comments');
      commentActions.loadComments('passage-1');

      expect(get(comments)).toHaveLength(0);
    });

    it('should handle corrupt localStorage data', () => {
      localStorage.setItem('passage-1-comments', 'invalid json');
      commentActions.loadComments('passage-1');

      expect(get(comments)).toHaveLength(0);
    });
  });

  describe('commentActions.clear', () => {
    it('should clear all comments', () => {
      commentActions.addComment('passage-1', 'Test 1', 'User 1');
      commentActions.addComment('passage-1', 'Test 2', 'User 2');

      commentActions.clear();

      expect(get(comments)).toHaveLength(0);
    });
  });

  describe('commentActions.getCommentCount', () => {
    it('should return total number of comments and replies', () => {
      commentActions.addComment('passage-1', 'Parent 1', 'User 1');
      commentActions.addComment('passage-1', 'Parent 2', 'User 2');
      const parent1Id = get(comments)[0].id;
      commentActions.addReply(parent1Id, 'Reply 1', 'User 3');

      const count = commentActions.getCommentCount('passage-1');

      expect(count).toBe(3); // 2 parents + 1 reply
    });

    it('should return 0 for passage with no comments', () => {
      const count = commentActions.getCommentCount('non-existent');

      expect(count).toBe(0);
    });
  });

  describe('commentActions.getUnresolvedCount', () => {
    it('should return count of unresolved comments', () => {
      commentActions.addComment('passage-1', 'Test 1', 'User 1');
      commentActions.addComment('passage-1', 'Test 2', 'User 2');
      commentActions.addComment('passage-1', 'Test 3', 'User 3');

      const comment1Id = get(comments)[0].id;
      commentActions.resolveComment(comment1Id);

      const count = commentActions.getUnresolvedCount('passage-1');

      expect(count).toBe(2);
    });
  });
});
