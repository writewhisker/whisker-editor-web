<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Comment } from '$lib/models/Comment';
  import { currentUser } from '$lib/stores/commentStore';

  // Props
  let {
    comment,
    depth = 0,
  }: {
    comment: Comment;
    depth?: number;
  } = $props();

  const dispatch = createEventDispatcher();

  // State
  let isReplying = $state(false);
  let isEditing = $state(false);
  let replyText = $state('');
  let editText = $state('');

  // Format timestamp
  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  }

  function handleReply() {
    if (!replyText.trim()) return;
    dispatch('reply', {
      parentId: comment.id,
      content: replyText,
    });
    replyText = '';
    isReplying = false;
  }

  function handleEdit() {
    if (!editText.trim()) return;
    dispatch('edit', {
      commentId: comment.id,
      content: editText,
    });
    isEditing = false;
  }

  function handleDelete() {
    if (confirm('Delete this comment?')) {
      dispatch('delete', { commentId: comment.id });
    }
  }

  function handleResolve() {
    dispatch('resolve', { commentId: comment.id });
  }

  function handleUnresolve() {
    dispatch('unresolve', { commentId: comment.id });
  }

  function startEditing() {
    editText = comment.content;
    isEditing = true;
  }

  function cancelEditing() {
    isEditing = false;
    editText = '';
  }

  function cancelReply() {
    isReplying = false;
    replyText = '';
  }
</script>

<div class="comment-thread" style="margin-left: {depth * 24}px">
  <div class="comment" class:resolved={comment.resolved}>
    <div class="comment-header">
      <div class="user-info">
        <span class="user-avatar">{comment.user.charAt(0).toUpperCase()}</span>
        <span class="user-name">{comment.user}</span>
        <span class="timestamp">{formatTime(comment.timestamp)}</span>
        {#if comment.resolved}
          <span class="resolved-badge">Resolved</span>
        {/if}
      </div>

      <div class="comment-actions">
        {#if comment.user === $currentUser}
          <button class="action-btn" onclick={startEditing} title="Edit">
            ✏️
          </button>
          <button class="action-btn" onclick={handleDelete} title="Delete">
            🗑️
          </button>
        {/if}
        {#if !comment.resolved}
          <button class="action-btn" onclick={handleResolve} title="Resolve">
            ✓
          </button>
        {:else}
          <button class="action-btn" onclick={handleUnresolve} title="Unresolve">
            ↺
          </button>
        {/if}
      </div>
    </div>

    <div class="comment-body">
      {#if isEditing}
        <div class="edit-form">
          <textarea
            bind:value={editText}
            placeholder="Edit comment..."
            rows="3"
            autofocus
          ></textarea>
          <div class="form-actions">
            <button class="btn btn-secondary" onclick={cancelEditing}>Cancel</button>
            <button class="btn btn-primary" onclick={handleEdit}>Save</button>
          </div>
        </div>
      {:else}
        <p class="comment-text">{comment.content}</p>
      {/if}
    </div>

    {#if !isEditing}
      <div class="comment-footer">
        <button class="reply-btn" onclick={() => (isReplying = !isReplying)}>
          Reply
        </button>
      </div>
    {/if}

    {#if isReplying}
      <div class="reply-form">
        <textarea
          bind:value={replyText}
          placeholder="Write a reply..."
          rows="2"
          autofocus
        ></textarea>
        <div class="form-actions">
          <button class="btn btn-secondary" onclick={cancelReply}>Cancel</button>
          <button class="btn btn-primary" onclick={handleReply}>Reply</button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Render replies recursively -->
  {#if comment.replies.length > 0}
    <div class="replies">
      {#each comment.replies as reply}
        <svelte:self
          comment={reply}
          depth={depth + 1}
          on:reply
          on:edit
          on:delete
          on:resolve
          on:unresolve
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .comment-thread {
    margin-bottom: 16px;
  }

  .comment {
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    padding: 12px;
    transition: all 0.2s;
  }

  .comment.resolved {
    opacity: 0.7;
    background: var(--bg-secondary, #f5f5f5);
  }

  .comment-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--accent-color, #3498db);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 12px;
  }

  .user-name {
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .timestamp {
    font-size: 12px;
    color: var(--text-secondary, #666);
  }

  .resolved-badge {
    font-size: 11px;
    padding: 2px 8px;
    background: #4caf50;
    color: white;
    border-radius: 12px;
    font-weight: 500;
  }

  .comment-actions {
    display: flex;
    gap: 4px;
  }

  .action-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 14px;
    transition: background 0.2s;
  }

  .action-btn:hover {
    background: var(--bg-hover, #f0f0f0);
  }

  .comment-body {
    margin-bottom: 8px;
  }

  .comment-text {
    color: var(--text-primary, #333);
    line-height: 1.5;
    margin: 0;
    white-space: pre-wrap;
  }

  .comment-footer {
    display: flex;
    gap: 12px;
  }

  .reply-btn {
    background: none;
    border: none;
    color: var(--accent-color, #3498db);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    padding: 4px 0;
  }

  .reply-btn:hover {
    text-decoration: underline;
  }

  .edit-form,
  .reply-form {
    margin-top: 8px;
  }

  textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
    background: var(--bg-primary, white);
    color: var(--text-primary, #333);
    resize: vertical;
  }

  textarea:focus {
    outline: none;
    border-color: var(--accent-color, #3498db);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  .btn {
    padding: 6px 16px;
    border-radius: 4px;
    border: none;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary {
    background: var(--bg-secondary, #f5f5f5);
    color: var(--text-primary, #333);
  }

  .btn-secondary:hover {
    background: var(--bg-hover, #e0e0e0);
  }

  .btn-primary {
    background: var(--accent-color, #3498db);
    color: white;
  }

  .btn-primary:hover {
    background: var(--accent-hover, #2980b9);
  }

  .replies {
    margin-top: 12px;
  }
</style>
