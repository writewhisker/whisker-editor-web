<script lang="ts">
  interface Comment {
    id: string;
    author: string;
    text: string;
    timestamp: Date;
  }

  interface Props {
    comments?: Comment[];
    onAddComment?: (text: string) => void;
  }

  let { comments = [], onAddComment }: Props = $props();
  let newComment = $state('');

  function handleSubmit() {
    if (newComment.trim() && onAddComment) {
      onAddComment(newComment);
      newComment = '';
    }
  }
</script>

<div class="comment-thread">
  <div class="comments">
    {#each comments as comment (comment.id)}
      <div class="comment">
        <div class="comment-header">
          <span class="author">{comment.author}</span>
          <span class="timestamp">{comment.timestamp.toLocaleString()}</span>
        </div>
        <div class="comment-text">{comment.text}</div>
      </div>
    {/each}
  </div>

  <div class="comment-input">
    <textarea bind:value={newComment} placeholder="Add a comment..." rows="3"></textarea>
    <button onclick={handleSubmit}>Comment</button>
  </div>
</div>

<style>
  .comment-thread {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 12px;
    background: white;
  }

  .comment {
    margin-bottom: 12px;
    padding: 8px;
    background: #f5f5f5;
    border-radius: 4px;
  }

  .comment-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
    font-size: 12px;
  }

  .author {
    font-weight: 600;
  }

  .timestamp {
    color: #666;
  }

  .comment-input {
    display: flex;
    gap: 8px;
  }

  textarea {
    flex: 1;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
  }

  button {
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
