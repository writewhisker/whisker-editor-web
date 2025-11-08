<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let hasError = false;
  let error: Error | null = null;
  let errorInfo: string = '';

  function handleError(event: ErrorEvent) {
    hasError = true;
    error = event.error;
    errorInfo = event.message || 'Unknown error';
    console.error('Error caught by boundary:', event.error);

    // Prevent default error handling
    event.preventDefault();
    return false;
  }

  function handleUnhandledRejection(event: PromiseRejectionEvent) {
    hasError = true;
    error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    errorInfo = 'Unhandled promise rejection: ' + (event.reason?.message || String(event.reason));
    console.error('Unhandled rejection caught by boundary:', event.reason);

    // Prevent default error handling
    event.preventDefault();
  }

  function reload() {
    window.location.reload();
  }

  function clearError() {
    hasError = false;
    error = null;
    errorInfo = '';
  }

  onMount(() => {
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
  });

  onDestroy(() => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  });
</script>

{#if hasError}
  <div class="fixed inset-0 bg-gray-900 flex items-center justify-center z-[100]">
    <div class="bg-white rounded-lg shadow-2xl p-8 max-w-2xl w-full mx-4">
      <!-- Error Icon -->
      <div class="flex items-center gap-4 mb-6">
        <div class="text-6xl">💥</div>
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Oops! Something went wrong</h1>
          <p class="text-gray-600 mt-1">The application encountered an unexpected error</p>
        </div>
      </div>

      <!-- Error Details -->
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <h2 class="font-semibold text-red-900 mb-2">Error Details:</h2>
        <p class="text-sm text-red-800 font-mono break-all">
          {errorInfo}
        </p>
        {#if error?.stack}
          <details class="mt-3">
            <summary class="cursor-pointer text-sm text-red-700 hover:text-red-900">
              Show stack trace
            </summary>
            <pre class="mt-2 text-xs text-red-800 overflow-auto max-h-40 bg-red-100 p-2 rounded">{error.stack}</pre>
          </details>
        {/if}
      </div>

      <!-- Recovery Options -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 class="font-semibold text-blue-900 mb-2">💡 Your work is safe!</h2>
        <ul class="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Auto-save has preserved your recent changes</li>
          <li>You can reload the page to recover</li>
          <li>Check the browser console for more details</li>
        </ul>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-3">
        <button
          class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-lg"
          on:click={reload}
        >
          🔄 Reload Application
        </button>
        <button
          class="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          on:click={clearError}
        >
          Try to Continue
        </button>
      </div>

      <!-- Help Text -->
      <div class="mt-6 text-center text-sm text-gray-600">
        <p>
          If this problem persists, please
          <a
            href="https://github.com/writewhisker/whisker-editor-web/issues"
            target="_blank"
            class="text-blue-600 hover:text-blue-800 underline"
          >
            report an issue on GitHub
          </a>
        </p>
      </div>
    </div>
  </div>
{:else}
  <slot />
{/if}

<style>
  /* Ensure error boundary is on top of everything */
  :global(body.error-occurred) {
    overflow: hidden;
  }
</style>
