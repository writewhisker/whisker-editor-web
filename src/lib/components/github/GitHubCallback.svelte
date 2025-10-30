<script lang="ts">
  import { onMount } from 'svelte';
  import { handleGitHubCallback } from '../../services/github/githubAuth';

  export let onComplete: () => void;
  export let code: string;
  export let state: string;

  let status = 'Processing authentication...';
  let error = '';
  let success = false;

  onMount(async () => {
    try {
      if (!code || !state) {
        throw new Error('Missing code or state parameter');
      }

      // Handle the callback
      await handleGitHubCallback(code, state);

      success = true;
      status = 'Success! Authenticated with GitHub.';

      // Call the complete callback after a short delay
      setTimeout(() => {
        onComplete();
      }, 1500);

    } catch (err: any) {
      console.error('GitHub OAuth callback error:', err);
      error = err.message || 'Failed to authenticate with GitHub';
      status = 'Authentication failed';
    }
  });
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
  <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
    <h2 class="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
      GitHub Authentication
    </h2>

    {#if error}
      <!-- Error state -->
      <div class="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
        <p class="text-red-700 dark:text-red-400 font-semibold mb-2">Error</p>
        <p class="text-red-600 dark:text-red-300 text-sm">{error}</p>
      </div>
      <button
        on:click={onComplete}
        class="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Close
      </button>
    {:else if success}
      <!-- Success state -->
      <div class="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
        <p class="text-green-700 dark:text-green-400 font-semibold mb-2">✓ Success</p>
        <p class="text-green-600 dark:text-green-300 text-sm">{status}</p>
      </div>
    {:else}
      <!-- Loading state -->
      <div class="mb-4 flex items-center justify-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
      <p class="text-center text-gray-600 dark:text-gray-400">{status}</p>
    {/if}
  </div>
</div>
