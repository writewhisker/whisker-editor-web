import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, fireEvent, screen, within } from '@testing-library/svelte';
import type { Comment } from '$lib/models/Comment';
import { writable } from 'svelte/store';

// Create mock store outside of vi.mock to avoid hoisting issues
const mockCurrentUser = writable('Test User');

// Mock currentUser store
vi.mock('$lib/stores/commentStore', async () => ({
  currentUser: mockCurrentUser,
}));

// Import after mock
const { default: CommentThread } = await import('./CommentThread.svelte');

describe('CommentThread', () => {
  let mockComment: Comment;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01 12:00:00'));

    mockComment = {
      id: 'comment-1',
      passageId: 'passage-1',
      user: 'Test User',
      content: 'This is a test comment',
      timestamp: Date.now() - 3600000, // 1 hour ago
      resolved: false,
      replies: [],
    } as Comment;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render comment content', () => {
      render(CommentThread, { comment: mockComment });

      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    });

    it('should render user information', () => {
      render(CommentThread, { comment: mockComment });

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('T')).toBeInTheDocument(); // Avatar initial
    });

    it('should render timestamp', () => {
      render(CommentThread, { comment: mockComment });

      // Should show "1h ago" since comment is 1 hour old
      expect(screen.getByText(/ago/i)).toBeInTheDocument();
    });

    it('should show resolved badge when resolved', () => {
      const resolvedComment = { ...mockComment, resolved: true };
      render(CommentThread, { comment: resolvedComment });

      expect(screen.getByText('Resolved')).toBeInTheDocument();
    });

    it('should not show resolved badge when not resolved', () => {
      render(CommentThread, { comment: mockComment });

      expect(screen.queryByText('Resolved')).not.toBeInTheDocument();
    });

    it('should apply resolved class when resolved', () => {
      const resolvedComment = { ...mockComment, resolved: true };
      const { container } = render(CommentThread, { comment: resolvedComment });

      const comment = container.querySelector('.comment');
      expect(comment).toHaveClass('resolved');
    });

    it('should render with correct depth indentation', () => {
      const { container } = render(CommentThread, { comment: mockComment, depth: 2 });

      const thread = container.querySelector('.comment-thread');
      expect(thread).toHaveStyle({ marginLeft: '48px' }); // 2 * 24px
    });
  });

  describe('timestamp formatting', () => {
    it('should show "just now" for recent comments', () => {
      const recentComment = {
        ...mockComment,
        timestamp: Date.now() - 30000, // 30 seconds ago
      };
      render(CommentThread, { comment: recentComment });

      expect(screen.getByText('just now')).toBeInTheDocument();
    });

    it('should show minutes for recent comments', () => {
      const recentComment = {
        ...mockComment,
        timestamp: Date.now() - 300000, // 5 minutes ago
      };
      render(CommentThread, { comment: recentComment });

      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('should show hours for older comments', () => {
      const olderComment = {
        ...mockComment,
        timestamp: Date.now() - 7200000, // 2 hours ago
      };
      render(CommentThread, { comment: olderComment });

      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });

    it('should show days for multi-day old comments', () => {
      const oldComment = {
        ...mockComment,
        timestamp: Date.now() - 172800000, // 2 days ago
      };
      render(CommentThread, { comment: oldComment });

      expect(screen.getByText('2d ago')).toBeInTheDocument();
    });

    it('should show date for very old comments', () => {
      const veryOldComment = {
        ...mockComment,
        timestamp: new Date('2023-12-01').getTime(),
      };
      render(CommentThread, { comment: veryOldComment });

      // Should show formatted date (toLocaleDateString format varies by locale)
      const timestampEl = screen.getByText(/11\/30\/2023|12\/1\/2023/i);
      expect(timestampEl).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('should show edit and delete buttons for own comments', () => {
      render(CommentThread, { comment: mockComment });

      expect(screen.getByTitle('Edit')).toBeInTheDocument();
      expect(screen.getByTitle('Delete')).toBeInTheDocument();
    });

    it('should not show edit and delete buttons for others comments', () => {
      const otherComment = { ...mockComment, user: 'Other User' };
      render(CommentThread, { comment: otherComment });

      expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
    });

    it('should show resolve button when not resolved', () => {
      render(CommentThread, { comment: mockComment });

      expect(screen.getByTitle('Resolve')).toBeInTheDocument();
    });

    it('should show unresolve button when resolved', () => {
      const resolvedComment = { ...mockComment, resolved: true };
      render(CommentThread, { comment: resolvedComment });

      expect(screen.getByTitle('Unresolve')).toBeInTheDocument();
    });

    it('should show reply button', () => {
      render(CommentThread, { comment: mockComment });

      expect(screen.getByText('Reply')).toBeInTheDocument();
    });
  });

  describe('reply functionality', () => {
    it('should show reply form when reply button clicked', async () => {
      render(CommentThread, { comment: mockComment });

      const replyButton = screen.getByText('Reply');
      await fireEvent.click(replyButton);

      expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
    });

    it('should hide reply form when cancel clicked', async () => {
      render(CommentThread, { comment: mockComment });

      const replyButton = screen.getByText('Reply');
      await fireEvent.click(replyButton);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await fireEvent.click(cancelButton);

      expect(screen.queryByPlaceholderText('Write a reply...')).not.toBeInTheDocument();
    });

    it('should call onreply with content', async () => {
      const replyHandler = vi.fn();
      const { container } = render(CommentThread, { comment: mockComment, onreply: replyHandler });

      const replyButton = screen.getByText('Reply');
      await fireEvent.click(replyButton);

      const textarea = screen.getByPlaceholderText('Write a reply...');
      await fireEvent.input(textarea, { target: { value: 'Test reply' } });

      // Get submit button from reply form
      const replyForm = container.querySelector('.reply-form');
      const submitButton = within(replyForm as HTMLElement).getByText('Reply');
      await fireEvent.click(submitButton);

      expect(replyHandler).toHaveBeenCalledWith({
        parentId: 'comment-1',
        content: 'Test reply',
      });
    });

    it('should not call onreply with empty content', async () => {
      const replyHandler = vi.fn();
      const { container } = render(CommentThread, { comment: mockComment, onreply: replyHandler });

      const replyButton = screen.getByText('Reply');
      await fireEvent.click(replyButton);

      // Get submit button from reply form
      const replyForm = container.querySelector('.reply-form');
      const submitButton = within(replyForm as HTMLElement).getByText('Reply');
      await fireEvent.click(submitButton);

      expect(replyHandler).not.toHaveBeenCalled();
    });

    it('should clear reply form after submission', async () => {
      const { container } = render(CommentThread, { comment: mockComment });

      const replyButton = screen.getByText('Reply');
      await fireEvent.click(replyButton);

      const textarea = screen.getByPlaceholderText('Write a reply...');
      await fireEvent.input(textarea, { target: { value: 'Test reply' } });

      // Get submit button from reply form
      const replyForm = container.querySelector('.reply-form');
      const submitButton = within(replyForm as HTMLElement).getByText('Reply');
      await fireEvent.click(submitButton);

      // Reply form should be hidden after submission
      expect(screen.queryByPlaceholderText('Write a reply...')).not.toBeInTheDocument();
    });
  });

  describe('edit functionality', () => {
    it('should show edit form when edit button clicked', async () => {
      render(CommentThread, { comment: mockComment });

      const editButton = screen.getByTitle('Edit');
      await fireEvent.click(editButton);

      expect(screen.getByPlaceholderText('Edit comment...')).toBeInTheDocument();
      expect(screen.getByDisplayValue('This is a test comment')).toBeInTheDocument();
    });

    it('should hide edit form when cancel clicked', async () => {
      render(CommentThread, { comment: mockComment });

      const editButton = screen.getByTitle('Edit');
      await fireEvent.click(editButton);

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await fireEvent.click(cancelButton);

      expect(screen.queryByPlaceholderText('Edit comment...')).not.toBeInTheDocument();
    });

    it('should call onedit with updated content', async () => {
      const editHandler = vi.fn();
      render(CommentThread, { comment: mockComment, onedit: editHandler });

      const editButton = screen.getByTitle('Edit');
      await fireEvent.click(editButton);

      const textarea = screen.getByPlaceholderText('Edit comment...');
      await fireEvent.input(textarea, { target: { value: 'Updated comment' } });

      const saveButton = screen.getByRole('button', { name: 'Save' });
      await fireEvent.click(saveButton);

      expect(editHandler).toHaveBeenCalledWith({
        commentId: 'comment-1',
        content: 'Updated comment',
      });
    });

    it('should not call onedit with empty content', async () => {
      const editHandler = vi.fn();
      render(CommentThread, { comment: mockComment, onedit: editHandler });

      const editButton = screen.getByTitle('Edit');
      await fireEvent.click(editButton);

      const textarea = screen.getByPlaceholderText('Edit comment...');
      await fireEvent.input(textarea, { target: { value: '   ' } });

      const saveButton = screen.getByRole('button', { name: 'Save' });
      await fireEvent.click(saveButton);

      expect(editHandler).not.toHaveBeenCalled();
    });

    it('should hide reply button when editing', async () => {
      render(CommentThread, { comment: mockComment });

      const editButton = screen.getByTitle('Edit');
      await fireEvent.click(editButton);

      expect(screen.queryByText('Reply')).not.toBeInTheDocument();
    });
  });

  describe('delete functionality', () => {
    it('should show confirmation dialog on delete', async () => {
      render(CommentThread, { comment: mockComment });

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      const deleteButton = screen.getByTitle('Delete');
      await fireEvent.click(deleteButton);

      expect(confirmSpy).toHaveBeenCalledWith('Delete this comment?');

      confirmSpy.mockRestore();
    });

    it('should call ondelete when confirmed', async () => {
      const deleteHandler = vi.fn();
      render(CommentThread, { comment: mockComment, ondelete: deleteHandler });

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      const deleteButton = screen.getByTitle('Delete');
      await fireEvent.click(deleteButton);

      expect(deleteHandler).toHaveBeenCalledWith({ commentId: 'comment-1' });

      confirmSpy.mockRestore();
    });

    it('should not call ondelete when cancelled', async () => {
      const deleteHandler = vi.fn();
      render(CommentThread, { comment: mockComment, ondelete: deleteHandler });

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      const deleteButton = screen.getByTitle('Delete');
      await fireEvent.click(deleteButton);

      expect(deleteHandler).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('resolve/unresolve functionality', () => {
    it('should call onresolve', async () => {
      const resolveHandler = vi.fn();
      render(CommentThread, { comment: mockComment, onresolve: resolveHandler });

      const resolveButton = screen.getByTitle('Resolve');
      await fireEvent.click(resolveButton);

      expect(resolveHandler).toHaveBeenCalledWith({ commentId: 'comment-1' });
    });

    it('should call onunresolve', async () => {
      const resolvedComment = { ...mockComment, resolved: true };
      const unresolveHandler = vi.fn();
      render(CommentThread, { comment: resolvedComment, onunresolve: unresolveHandler });

      const unresolveButton = screen.getByTitle('Unresolve');
      await fireEvent.click(unresolveButton);

      expect(unresolveHandler).toHaveBeenCalledWith({ commentId: 'comment-1' });
    });
  });

  describe('nested replies', () => {
    it('should render nested replies recursively', () => {
      const commentWithReplies: Comment = {
        ...mockComment,
        replies: [
          {
            id: 'reply-1',
            passageId: 'passage-1',
            user: 'Reply User',
            content: 'This is a reply',
            timestamp: Date.now(),
            resolved: false,
            replies: [],
          } as Comment,
        ],
      };

      render(CommentThread, { comment: commentWithReplies });

      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
      expect(screen.getByText('This is a reply')).toBeInTheDocument();
    });

    it('should render deeply nested replies', () => {
      const deeplyNested: Comment = {
        ...mockComment,
        replies: [
          {
            id: 'reply-1',
            passageId: 'passage-1',
            user: 'User 2',
            content: 'Level 2',
            timestamp: Date.now(),
            resolved: false,
            replies: [
              {
                id: 'reply-2',
                passageId: 'passage-1',
                user: 'User 3',
                content: 'Level 3',
                timestamp: Date.now(),
                resolved: false,
                replies: [],
              } as Comment,
            ],
          } as Comment,
        ],
      };

      render(CommentThread, { comment: deeplyNested });

      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
      expect(screen.getByText('Level 2')).toBeInTheDocument();
      expect(screen.getByText('Level 3')).toBeInTheDocument();
    });

    it('should propagate events from nested replies', async () => {
      const commentWithReplies: Comment = {
        ...mockComment,
        replies: [
          {
            id: 'reply-1',
            passageId: 'passage-1',
            user: 'Test User',
            content: 'This is a reply',
            timestamp: Date.now(),
            resolved: false,
            replies: [],
          } as Comment,
        ],
      };

      const deleteHandler = vi.fn();
      render(CommentThread, { comment: commentWithReplies, ondelete: deleteHandler });

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      // Find delete button for the reply (second delete button)
      const deleteButtons = screen.getAllByTitle('Delete');
      await fireEvent.click(deleteButtons[1]);

      expect(deleteHandler).toHaveBeenCalledWith({ commentId: 'reply-1' });

      confirmSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('should handle comment with no user', () => {
      const noUserComment = { ...mockComment, user: '' };
      render(CommentThread, { comment: noUserComment });

      // Should still render, avatar should be empty or default
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    });

    it('should handle very long comment content', () => {
      const longComment = {
        ...mockComment,
        content: 'A'.repeat(1000),
      };
      render(CommentThread, { comment: longComment });

      expect(screen.getByText('A'.repeat(1000))).toBeInTheDocument();
    });

    it('should handle comment with depth of 0', () => {
      const { container } = render(CommentThread, { comment: mockComment, depth: 0 });

      const thread = container.querySelector('.comment-thread');
      expect(thread).toHaveStyle({ marginLeft: '0px' });
    });

    it('should handle multiple replies', () => {
      const multiReply: Comment = {
        ...mockComment,
        replies: [
          {
            id: 'reply-1',
            passageId: 'passage-1',
            user: 'User 1',
            content: 'Reply 1',
            timestamp: Date.now(),
            resolved: false,
            replies: [],
          } as Comment,
          {
            id: 'reply-2',
            passageId: 'passage-1',
            user: 'User 2',
            content: 'Reply 2',
            timestamp: Date.now(),
            resolved: false,
            replies: [],
          } as Comment,
        ],
      };

      render(CommentThread, { comment: multiReply });

      expect(screen.getByText('Reply 1')).toBeInTheDocument();
      expect(screen.getByText('Reply 2')).toBeInTheDocument();
    });
  });
});
