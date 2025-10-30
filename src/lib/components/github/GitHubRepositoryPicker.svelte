<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { listRepositories, createRepository } from '../../services/github/githubApi';
  import type { GitHubRepository } from '../../services/github/types';
  import { isAuthenticated } from '../../services/github/githubAuth';

  const dispatch = createEventDispatcher();

  export let show = false;
  export let mode: 'save' | 'load' = 'save';
  export let defaultFilename = 'story.json';

  let repositories: GitHubRepository[] = [];
  let selectedRepo: GitHubRepository | null = null;
  let filename = defaultFilename;
  let isLoading = false;
  let error = '';
  let showCreateRepo = false;

  // Create new repository fields
  let newRepoName = '';
  let newRepoDescription = '';
  let newRepoPrivate = true;

  // Search/filter
  let searchQuery = '';

  $: filteredRepos = repositories.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function loadRepositories() {
    if (!$isAuthenticated) {
      error = 'Not authenticated with GitHub';
      return;
    }

    isLoading = true;
    error = '';

    try {
      repositories = await listRepositories();
    } catch (err: any) {
      console.error('Failed to load repositories:', err);
      error = err.message || 'Failed to load repositories';
    } finally {
      isLoading = false;
    }
  }

  async function handleCreateRepository() {
    if (!newRepoName.trim()) {
      error = 'Repository name is required';
      return;
    }

    isLoading = true;
    error = '';

    try {
      const repo = await createRepository(
        newRepoName.trim(),
        newRepoDescription.trim() || undefined,
        newRepoPrivate
      );

      repositories = [repo, ...repositories];
      selectedRepo = repo;
      showCreateRepo = false;
      newRepoName = '';
      newRepoDescription = '';
    } catch (err: any) {
      console.error('Failed to create repository:', err);
      error = err.message || 'Failed to create repository';
    } finally {
      isLoading = false;
    }
  }

  function handleConfirm() {
    if (!selectedRepo) {
      error = 'Please select a repository';
      return;
    }

    if (!filename.trim()) {
      error = 'Please enter a filename';
      return;
    }

    // Ensure filename ends with .json
    let finalFilename = filename.trim();
    if (!finalFilename.endsWith('.json')) {
      finalFilename += '.json';
    }

    show = false;

    // Dispatch event with selected repository and filename
    dispatch('select', {
      repository: selectedRepo,
      filename: finalFilename,
    });
  }

  function handleCancel() {
    show = false;
    selectedRepo = null;
    filename = defaultFilename;
    error = '';
  }

  onMount(() => {
    if (show) {
      loadRepositories();
    }
  });

  $: if (show) {
    loadRepositories();
  }
</script>

{#if show}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {mode === 'save' ? 'Save to GitHub' : 'Load from GitHub'}
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {mode === 'save'
            ? 'Select a repository to save your story'
            : 'Select a repository to load your story from'}
        </p>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        {#if error}
          <div class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <p class="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        {/if}

        {#if !showCreateRepo}
          <!-- Search -->
          <div class="mb-4">
            <input
              type="text"
              placeholder="Search repositories..."
              bind:value={searchQuery}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <!-- Repository List -->
          {#if isLoading}
            <div class="flex items-center justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span class="ml-3 text-gray-600 dark:text-gray-400">Loading repositories...</span>
            </div>
          {:else if filteredRepos.length === 0}
            <div class="text-center py-8">
              <p class="text-gray-600 dark:text-gray-400 mb-4">
                {searchQuery ? 'No repositories match your search' : 'No repositories found'}
              </p>
              <button
                on:click={() => showCreateRepo = true}
                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Create New Repository
              </button>
            </div>
          {:else}
            <div class="space-y-2 mb-4">
              {#each filteredRepos as repo}
                <button
                  on:click={() => selectedRepo = repo}
                  class="w-full text-left p-3 rounded border {selectedRepo?.id === repo.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="font-medium text-gray-900 dark:text-gray-100">
                        {repo.name}
                        {#if repo.private}
                          <span class="ml-2 text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">Private</span>
                        {/if}
                      </div>
                      {#if repo.description}
                        <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {repo.description}
                        </div>
                      {/if}
                      <div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {repo.fullName} • Updated {new Date(repo.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    {#if selectedRepo?.id === repo.id}
                      <svg class="w-5 h-5 text-blue-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                    {/if}
                  </div>
                </button>
              {/each}
            </div>

            <button
              on:click={() => showCreateRepo = true}
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              + Create New Repository
            </button>
          {/if}

          <!-- Filename Input (Save mode only) -->
          {#if mode === 'save' && selectedRepo}
            <div class="mt-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filename
              </label>
              <input
                type="text"
                bind:value={filename}
                placeholder="story.json"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Will be saved as: {filename.endsWith('.json') ? filename : filename + '.json'}
              </p>
            </div>
          {/if}
        {:else}
          <!-- Create Repository Form -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repository Name *
              </label>
              <input
                type="text"
                bind:value={newRepoName}
                placeholder="my-story"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (optional)
              </label>
              <textarea
                bind:value={newRepoDescription}
                placeholder="My interactive fiction story"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              ></textarea>
            </div>

            <div class="flex items-center">
              <input
                type="checkbox"
                id="private-repo"
                bind:checked={newRepoPrivate}
                class="h-4 w-4 text-blue-500 border-gray-300 rounded"
              />
              <label for="private-repo" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Make this repository private
              </label>
            </div>

            <div class="flex gap-2">
              <button
                on:click={handleCreateRepository}
                disabled={isLoading || !newRepoName.trim()}
                class="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Repository'}
              </button>
              <button
                on:click={() => showCreateRepo = false}
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      {#if !showCreateRepo}
        <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            on:click={handleCancel}
            class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            on:click={handleConfirm}
            disabled={!selectedRepo || (mode === 'save' && !filename.trim())}
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === 'save' ? 'Save to GitHub' : 'Load from GitHub'}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}
