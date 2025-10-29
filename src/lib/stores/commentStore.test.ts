import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { comments, commentActions, currentUser } from './commentStore';
import { currentStory } from './projectStore';
import { Story } from '$lib/models/Story';

describe('commentStore', () => {
  let mockStory: Story;

  beforeEach(() => {
    // Clear comments before each test
    commentActions.clearAll();
    vi.clearAllMocks();
    localStorage.clear();

    // Create a mock story
    mockStory = new Story({
      metadata: {
        id: 'test-story',
        title: 'Test Story',
        author: 'Tester',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });
    currentStory.set(mockStory);
  });

  describe('initialization', () => {
    it('should start with empty comments', () => {
      const commentMap = get(comments);
      expect(commentMap.size).toBe(0);
      expect(commentMap instanceof Map).toBe(true);
    });

    it('should load comments from localStorage if available', () => {
      const mockCommentData = [
        {
          id: 'comment-1',
          passageId: 'passage-1',
          content: 'Test comment',
          user: 'Test User',
          timestamp: Date.now(),
          resolved: false,
        },
      ];

      localStorage.setItem(`whisker_comments_${mockStory.metadata.id}`, JSON.stringify(mockCommentData));
      commentActions.loadComments();

      const commentMap = get(comments);
      expect(commentMap.size).toBe(1);
      const comment = commentMap.get('comment-1');
      expect(comment?.content).toBe('Test comment');
    });
  });

  describe('commentActions.addComment', () => {
    it('should add a new comment', () => {
      const comment = commentActions.addComment({
        passageId: 'passage-1',
        content: 'Test comment',
        user: 'Test User',
      });

      const commentMap = get(comments);
      expect(commentMap.size).toBe(1);
      expect(comment.content).toBe('Test comment');
      expect(comment.user).toBe('Test User');
      expect(comment.passageId).toBe('passage-1');
      expect(comment.resolved).toBe(false);
    });

    it('should generate a unique ID for each comment', () => {
      const comment1 = commentActions.addComment({
        passageId: 'passage-1',
        content: 'Comment 1',
        user: 'User 1',
      });
      const comment2 = commentActions.addComment({
        passageId: 'passage-1',
        content: 'Comment 2',
        user: 'User 2',
      });

      expect(comment1.id).not.toBe(comment2.id);
    });

    it('should save to localStorage', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem');
      commentActions.addComment({
        passageId: 'passage-1',
        content: 'Test',
        user: 'User',
      });

      expect(spy).toHaveBeenCalledWith(
        `whisker_comments_${mockStory.metadata.id}`,
        expect.any(String)
      );
    });

    it('should use currentUser if no user provided', () => {
      currentUser.set('Default User');
      const comment = commentActions.addComment({
        passageId: 'passage-1',
        content: 'Test',
        user: '',
      });

      expect(comment.user).toBe('Default User');
    });
  });

  describe('commentActions.addComment with replies', () => {
    it('should add a reply to a comment', () => {
      const parent = commentActions.addComment({
        passageId: 'passage-1',
        content: 'Parent comment',
        user: 'User 1',
      });

      const reply = commentActions.addComment({
        passageId: 'passage-1',
        content: 'Reply comment',
        user: 'User 2',
        parentId: parent.id,
      });

      const commentMap = get(comments);
      expect(commentMap.size).toBe(2);
      const parentComment = commentMap.get(parent.id);
      expect(parentComment?.replies).toHaveLength(1);
      expect(parentComment?.replies[0].content).toBe('Reply comment');
    });

    it('should handle non-existent parent ID gracefully', () => {
      commentActions.addComment({
        passageId: 'passage-1',
        content: 'Reply',
        user: 'User',
        parentId: 'non-existent',
      });

      const commentMap = get(comments);
      expect(commentMap.size).toBe(1);
    });
  });

  describe('commentActions.updateComment', () => {
    it('should update a comment', () => {
      const comment = commentActions.addComment({
        passageId: 'passage-1',
        content: 'Original',
        user: 'User',
      });

      commentActions.updateComment(comment.id, 'Updated');

      const commentMap = get(comments);
      const updated = commentMap.get(comment.id);
      expect(updated?.content).toBe('Updated');
    });

    it('should handle non-existent comment ID', () => {
      const comment = commentActions.addComment({
        passageId: 'passage-1',
        content: 'Test',
        user: 'User',
      });

      commentActions.updateComment('non-existent', 'Updated');

      const commentMap = get(comments);
      const original = commentMap.get(comment.id);
      expect(original?.content).toBe('Test');
    });
  });

  describe('commentActions.deleteComment', () => {
    it('should delete a comment', () => {
      const comment = commentActions.addComment({
        passageId: 'passage-1',
        content: 'Test',
        user: 'User',
      });

      commentActions.deleteComment(comment.id);

      const commentMap = get(comments);
      expect(commentMap.size).toBe(0);
    });

    it('should handle non-existent comment ID', () => {
      const comment = commentActions.addComment({
        passageId: 'passage-1',
        content: 'Test',
        user: 'User',
      });

      commentActions.deleteComment('non-existent');

      const commentMap = get(comments);
      expect(commentMap.size).toBe(1);
    });
  });

  describe('commentActions.resolveComment', () => {
    it('should mark a comment as resolved', () => {
      const comment = commentActions.addComment({
        passageId: 'passage-1',
        content: 'Test',
        user: 'User',
      });

      commentActions.resolveComment(comment.id);

      const commentMap = get(comments);
      const resolved = commentMap.get(comment.id);
      expect(resolved?.resolved).toBe(true);
    });

    it('should mark a comment as unresolved', () => {
      const comment = commentActions.addComment({
        passageId: 'passage-1',
        content: 'Test',
        user: 'User',
      });

      commentActions.resolveComment(comment.id);
      commentActions.unresolveComment(comment.id);

      const commentMap = get(comments);
      const unresolved = commentMap.get(comment.id);
      expect(unresolved?.resolved).toBe(false);
    });
  });

  describe('commentActions.loadComments', () => {
    it('should load comments for current story', () => {
      const mockCommentData = [
        {
          id: 'comment-1',
          passageId: 'passage-1',
          content: 'Test 1',
          user: 'User 1',
          timestamp: Date.now(),
          resolved: false,
        },
        {
          id: 'comment-2',
          passageId: 'passage-1',
          content: 'Test 2',
          user: 'User 2',
          timestamp: Date.now(),
          resolved: false,
        },
      ];

      localStorage.setItem(
        `whisker_comments_${mockStory.metadata.id}`,
        JSON.stringify(mockCommentData)
      );
      commentActions.loadComments();

      const commentMap = get(comments);
      expect(commentMap.size).toBe(2);
    });

    it('should handle missing localStorage data', () => {
      localStorage.removeItem(`whisker_comments_${mockStory.metadata.id}`);
      commentActions.loadComments();

      const commentMap = get(comments);
      expect(commentMap.size).toBe(0);
    });

    it('should handle corrupt localStorage data', () => {
      localStorage.setItem(`whisker_comments_${mockStory.metadata.id}`, 'invalid json');
      commentActions.loadComments();

      const commentMap = get(comments);
      expect(commentMap.size).toBe(0);
    });
  });

  describe('commentActions.clearAll', () => {
    it('should clear all comments', () => {
      commentActions.addComment({
        passageId: 'passage-1',
        content: 'Test 1',
        user: 'User 1',
      });
      commentActions.addComment({
        passageId: 'passage-1',
        content: 'Test 2',
        user: 'User 2',
      });

      commentActions.clearAll();

      const commentMap = get(comments);
      expect(commentMap.size).toBe(0);
    });
  });

  describe('commentActions.getPassageComments', () => {
    it('should return comments for a specific passage', () => {
      commentActions.addComment({
        passageId: 'passage-1',
        content: 'Comment 1',
        user: 'User 1',
      });
      commentActions.addComment({
        passageId: 'passage-2',
        content: 'Comment 2',
        user: 'User 2',
      });

      const passageComments = commentActions.getPassageComments('passage-1');

      expect(passageComments).toHaveLength(1);
      expect(passageComments[0].content).toBe('Comment 1');
    });

    it('should return empty array for passage with no comments', () => {
      const passageComments = commentActions.getPassageComments('non-existent');

      expect(passageComments).toEqual([]);
    });

    it('should not include replies as top-level comments', () => {
      const parent = commentActions.addComment({
        passageId: 'passage-1',
        content: 'Parent',
        user: 'User 1',
      });
      commentActions.addComment({
        passageId: 'passage-1',
        content: 'Reply',
        user: 'User 2',
        parentId: parent.id,
      });

      const passageComments = commentActions.getPassageComments('passage-1');

      expect(passageComments).toHaveLength(1);
      expect(passageComments[0].content).toBe('Parent');
    });
  });

  describe('commentActions.setCurrentUser', () => {
    it('should set current user', () => {
      commentActions.setCurrentUser('New User');

      expect(get(currentUser)).toBe('New User');
    });

    it('should save to localStorage', () => {
      const spy = vi.spyOn(Storage.prototype, 'setItem');
      commentActions.setCurrentUser('New User');

      expect(spy).toHaveBeenCalledWith('whisker_current_user', 'New User');
    });
  });
});
