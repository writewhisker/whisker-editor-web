<script lang="ts">
  import CommentThread from './CommentThread.svelte';
  import { commentActions, commentsByPassage, unresolvedComments, currentUser } from '$lib/stores/commentStore';
  import { currentStory } from '$lib/stores/storyStateStore';

  // Props
  let {
    passageId = null,
    showResolved: initialShowResolved = false,
  }: {
    passageId?: string | null;
    showResolved?: boolean;
  } = $props();

  // State
  let showResolved = $state(initialShowResolved);
  let newCommentText = $state('');
  let usernameInput = $state($currentUser);
  let showUserSettings = $state(false);

  // Get comments for current passage or all unresolved
  const displayComments = $derived(() => {
    if (passageId) {
      const passageComments = $commentsByPassage.get(passageId) || [];
      if (showResolved) {
        return passageComments;
      }
      return passageComments.filter(c => !c.resolved);
    }
    return showResolved ? [] : $unresolvedComments;
  });

  function handleAddComment() {
    if (!newCommentText.trim() || !passageId) return;

    commentActions.addComment({
      passageId,
      content: newCommentText,
      user: $currentUser,
    });

    newCommentText = '';
  }

  function handleReply(detail: { parentId: string; content: string }) {
    const { parentId, content } = detail;
    if (!passageId) return;

    commentActions.addComment({
      passageId,
      content,
      parentId,
      user: $currentUser,
    });
  }

  function handleEdit(detail: { commentId: string; content: string }) {
    const { commentId, content } = detail;
    commentActions.updateComment(commentId, content);
  }

  function handleDelete(detail: { commentId: string }) {
    const { commentId } = detail;
    commentActions.deleteComment(commentId);
  }

  function handleResolve(detail: { commentId: string }) {
    const { commentId } = detail;
    commentActions.resolveComment(commentId);
  }

  function handleUnresolve(detail: { commentId: string }) {
    const { commentId } = detail;
    commentActions.unresolveComment(commentId);
  }

  function saveUsername() {
    commentActions.setCurrentUser(usernameInput);
    showUserSettings = false;
  }

  function getPassageName(): string {
    if (!passageId || !$currentStory) return '';
    const passage = $currentStory.passages.get(passageId);
    return passage?.title || 'Unknown Passage';
  }
</script>

<div class="comment-panel">
  <div class="panel-header">
    <h3>
      {#if passageId}
        Comments: {getPassageName()}
      {:else}
        All Unresolved Comments
      {/if}
    </h3>
    <div class="header-actions">
      <button
        class="action-btn"
        onclick={() => (showUserSettings = !showUserSettings)}
        title="User Settings"
      >
        👤
      </button>
      <label class="checkbox-label">
        <input type="checkbox" bind:checked={showResolved} />
        Show resolved
      </label>
    </div>
  </div>

  {#if showUserSettings}
    <div class="user-settings">
      <label for="username">Your Name:</label>
      <div class="input-group">
        <input
          type="text"
          id="username"
          bind:value={usernameInput}
          placeholder="Enter your name"
        />
        <button class="btn btn-primary" onclick={saveUsername}>Save</button>
      </div>
    </div>
  {/if}

  {#if passageId}
    <div class="new-comment">
      <textarea
        bind:value={newCommentText}
        placeholder="Add a comment..."
        rows="3"
      ></textarea>
      <button
        class="btn btn-primary"
        onclick={handleAddComment}
        disabled={!newCommentText.trim()}
      >
        Add Comment
      </button>
    </div>
  {/if}

  <div class="comments-list">
    {#each displayComments() as comment (comment.id)}
      <CommentThread
        {comment}
        onreply={handleReply}
        onedit={handleEdit}
        ondelete={handleDelete}
        onresolve={handleResolve}
        onunresolve={handleUnresolve}
      />
    {:else}
      <div class="empty-state">
        <p>
          {#if passageId}
            No comments yet. Add one above!
          {:else}
            No unresolved comments.
          {/if}
        </p>
      </div>
    {/each}
  </div>
</div>

<style>
  .comment-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-secondary, #f5f5f5);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: var(--bg-primary, white);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .panel-header h3 {
    margin: 0;
    font-size: 16px;
    color: var(--text-primary, #333);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .action-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    font-size: 16px;
    transition: background 0.2s;
  }

  .action-btn:hover {
    background: var(--bg-hover, #f0f0f0);
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary, #666);
    cursor: pointer;
  }

  .user-settings {
    padding: 12px 16px;
    background: #fff9e6;
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .user-settings label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 6px;
    color: var(--text-primary, #333);
  }

  .input-group {
    display: flex;
    gap: 8px;
  }

  .input-group input {
    flex: 1;
    padding: 6px 12px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    font-size: 14px;
    background: white;
  }

  .new-comment {
    padding: 16px;
    background: var(--bg-primary, white);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .new-comment textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
    margin-bottom: 8px;
  }

  .new-comment textarea:focus {
    outline: none;
    border-color: var(--accent-color, #3498db);
  }

  .comments-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary, #666);
  }

  .empty-state p {
    margin: 0;
  }

  .btn {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: var(--accent-color, #3498db);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--accent-hover, #2980b9);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
