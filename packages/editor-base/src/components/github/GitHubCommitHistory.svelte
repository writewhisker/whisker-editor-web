<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { getCommitHistory, getFileAtCommit } from '@writewhisker/github';
  import type { GitHubCommit } from '@writewhisker/github';

  export let show = false;
  export let owner: string;
  export let repo: string;
  export let path: string;

  const dispatch = createEventDispatcher();

  let commits: Array<GitHubCommit & { author: { name: string; email: string } }> = [];
  let selectedCommit: (GitHubCommit & { author: { name: string; email: string } }) | null = null;
  let fileContent: string | null = null;
  let isLoading = false;
  let isLoadingContent = false;
  let error = '';

  async function loadCommits() {
    if (!owner || !repo || !path) {
      error = 'Missing repository information';
      return;
    }

    isLoading = true;
    error = '';

    try {
      commits = await getCommitHistory(owner, repo, path);
    } catch (err: any) {
      console.error('Failed to load commits:', err);
      error = err.message || 'Failed to load commit history';
    } finally {
      isLoading = false;
    }
  }

  async function viewCommit(commit: GitHubCommit & { author: { name: string; email: string } }) {
    selectedCommit = commit;
    isLoadingContent = true;
    fileContent = null;
    error = '';

    try {
      const file = await getFileAtCommit(owner, repo, path, commit.sha);
      fileContent = file.content;
    } catch (err: any) {
      console.error('Failed to load file version:', err);
      error = err.message || 'Failed to load file version';
    } finally {
      isLoadingContent = false;
    }
  }

  function revertToCommit(commit: GitHubCommit & { author: { name: string; email: string } }) {
    dispatch('revert', {
      commit,
      content: fileContent,
    });
    show = false;
  }

  function close() {
    show = false;
    selectedCommit = null;
    fileContent = null;
    error = '';
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  function getCommitMessageTitle(message: string): string {
    return message.split('\n')[0];
  }

  $: if (show && owner && repo && path) {
    loadCommits();
  }
</script>

{#if show}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Commit History
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {path} in {repo}
        </p>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-hidden flex">
        <!-- Commits List -->
        <div class="w-1/3 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
          {#if isLoading}
            <div class="flex items-center justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          {:else if error && commits.length === 0}
            <div class="p-4">
              <p class="text-red-600 dark:text-red-400">{error}</p>
            </div>
          {:else if commits.length === 0}
            <div class="p-4 text-center text-gray-500">
              No commits found for this file
            </div>
          {:else}
            {#each commits as commit}
              <button
                on:click={() => viewCommit(commit)}
                class="w-full text-left p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 {selectedCommit?.sha === commit.sha ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
              >
                <div class="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {getCommitMessageTitle(commit.message)}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  {commit.author.name}
                </div>
                <div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {formatRelativeTime(commit.date)}
                </div>
              </button>
            {/each}
          {/if}
        </div>

        <!-- Commit Details -->
        <div class="flex-1 overflow-y-auto p-6">
          {#if selectedCommit}
            <div class="mb-4">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {selectedCommit.message}
              </h3>
              <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>
                  <span class="font-medium">Author:</span> {selectedCommit.author.name}
                  {#if selectedCommit.author.email}
                    <span class="text-gray-500">({selectedCommit.author.email})</span>
                  {/if}
                </div>
                <div>
                  <span class="font-medium">Date:</span> {formatDate(selectedCommit.date)}
                </div>
                <div>
                  <span class="font-medium">SHA:</span>
                  <code class="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    {selectedCommit.sha.substring(0, 7)}
                  </code>
                </div>
              </div>
            </div>

            {#if isLoadingContent}
              <div class="flex items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span class="ml-3 text-gray-600 dark:text-gray-400">Loading file content...</span>
              </div>
            {:else if fileContent !== null}
              <div class="mt-4">
                <div class="flex items-center justify-between mb-2">
                  <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">File Content</h4>
                  <button
                    on:click={() => selectedCommit && revertToCommit(selectedCommit)}
                    class="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Restore this version
                  </button>
                </div>
                <pre class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-4 text-sm overflow-auto max-h-96">{fileContent}</pre>
              </div>
            {/if}
          {:else}
            <div class="text-center text-gray-500 dark:text-gray-400 py-12">
              Select a commit to view details
            </div>
          {/if}
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
        <button
          on:click={close}
          class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
