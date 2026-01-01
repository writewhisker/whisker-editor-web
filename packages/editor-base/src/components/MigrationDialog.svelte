<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { trapFocus } from '../utils/accessibility';
  import {
    isMigrating,
    migrationError,
    currentMigrationPreview,
    migrationActions,
    detectStoryVersion,
    type MigrationPreview,
    type MigrationResult,
    type StoryVersion,
  } from '../stores/migrationStore';
  import { currentStory } from '../stores/storyStateStore';
  import type { Story } from '@writewhisker/core-ts';

  export let show = false;

  const dispatch = createEventDispatcher();

  type DialogStep = 'detection' | 'preview' | 'migrating' | 'complete';

  let dialogElement: HTMLElement;
  let cleanupFocusTrap: (() => void) | null = null;
  let currentStep: DialogStep = 'detection';
  let preview: MigrationPreview | null = null;
  let migrationResult: MigrationResult | null = null;
  let detectedVersion: StoryVersion = 'unknown';

  function close() {
    show = false;
    currentStep = 'detection';
    preview = null;
    migrationResult = null;
    migrationActions.clearPreview();
    migrationActions.clearError();
    if (cleanupFocusTrap) {
      cleanupFocusTrap();
      cleanupFocusTrap = null;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  $: if (show && dialogElement) {
    cleanupFocusTrap = trapFocus(dialogElement);
  }

  $: if (!show && cleanupFocusTrap) {
    cleanupFocusTrap();
    cleanupFocusTrap = null;
  }

  // Detect version when dialog opens
  $: if (show && $currentStory) {
    detectedVersion = detectStoryVersion($currentStory);
    if (detectedVersion === '0.x') {
      generatePreview();
    }
  }

  function generatePreview() {
    if (!$currentStory) return;
    preview = migrationActions.previewMigration($currentStory);
    if (preview.changes.length > 0 || preview.warnings.length > 0) {
      currentStep = 'preview';
    }
  }

  async function startMigration() {
    if (!$currentStory) return;

    currentStep = 'migrating';
    migrationResult = await migrationActions.migrate($currentStory);

    if (migrationResult.success && migrationResult.story) {
      currentStep = 'complete';
    } else {
      // Stay on migrating step to show error
    }
  }

  function applyMigration() {
    if (migrationResult?.success && migrationResult.story) {
      dispatch('migrate', { story: migrationResult.story });
      close();
    }
  }

  function getVersionLabel(version: StoryVersion): string {
    switch (version) {
      case '0.x':
        return 'Legacy (Twine/Twee)';
      case '1.0':
        return 'WLS 1.0';
      default:
        return 'Unknown';
    }
  }

  function getCategoryIcon(type: string): string {
    switch (type) {
      case 'syntax':
        return '{ }';
      case 'choice':
        return '+';
      case 'variable':
        return '$';
      case 'structure':
        return '#';
      case 'metadata':
        return '@';
      default:
        return '*';
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    on:click={close}
    on:keydown={handleKeydown}
    role="presentation"
  >
    <div
      bind:this={dialogElement}
      class="bg-white rounded-lg shadow-xl p-6 w-[700px] max-w-[95vw] max-h-[85vh] overflow-hidden flex flex-col"
      on:click|stopPropagation
      on:keydown|stopPropagation
      role="dialog"
      aria-modal="true"
      aria-labelledby="migration-title"
      tabindex="-1"
    >
      <!-- Header -->
      <div class="mb-6">
        <h2 id="migration-title" class="text-2xl font-bold text-gray-900">
          {#if currentStep === 'detection'}
            Format Migration
          {:else if currentStep === 'preview'}
            Migration Preview
          {:else if currentStep === 'migrating'}
            Migrating Story...
          {:else}
            Migration Complete
          {/if}
        </h2>
        <p class="text-sm text-gray-600 mt-1">
          Upgrade your story to WLS 1.0 format
        </p>
      </div>

      <!-- Error Display -->
      {#if $migrationError}
        <div class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p class="font-semibold">Migration Error:</p>
          <p>{$migrationError}</p>
        </div>
      {/if}

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        {#if currentStep === 'detection'}
          <!-- Version Detection -->
          <div class="space-y-6">
            <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-semibold text-gray-800">Current Format</p>
                  <p class="text-2xl font-bold mt-1"
                     class:text-amber-600={detectedVersion === '0.x'}
                     class:text-green-600={detectedVersion === '1.0'}
                     class:text-gray-400={detectedVersion === 'unknown'}>
                    {getVersionLabel(detectedVersion)}
                  </p>
                </div>
                <div class="text-4xl">
                  {#if detectedVersion === '0.x'}
                    <span class="text-amber-500">!</span>
                  {:else if detectedVersion === '1.0'}
                    <span class="text-green-500">OK</span>
                  {:else}
                    <span class="text-gray-400">?</span>
                  {/if}
                </div>
              </div>
            </div>

            {#if detectedVersion === '1.0'}
              <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                <p class="text-green-800 font-medium">
                  Your story is already in WLS 1.0 format.
                </p>
                <p class="text-green-700 text-sm mt-1">
                  No migration is needed. Your story uses the latest format.
                </p>
              </div>
            {:else if detectedVersion === '0.x'}
              <div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p class="text-amber-800 font-medium">
                  Legacy format detected
                </p>
                <p class="text-amber-700 text-sm mt-1">
                  Your story contains Twine/Twee syntax that can be upgraded to WLS 1.0.
                  Click "Preview Changes" to see what will be migrated.
                </p>
              </div>
            {:else}
              <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p class="text-gray-700">
                  Unable to determine story format. The story may be empty or in an unrecognized format.
                </p>
              </div>
            {/if}

            <div class="space-y-2">
              <p class="font-semibold text-gray-800">What WLS 1.0 offers:</p>
              <ul class="list-disc list-inside text-gray-600 text-sm space-y-1">
                <li>Cleaner conditional syntax: <code class="bg-gray-100 px-1 rounded">{'{if condition}'}</code></li>
                <li>Explicit choices: <code class="bg-gray-100 px-1 rounded">+ [text] -&gt; target</code></li>
                <li>Better variable handling: <code class="bg-gray-100 px-1 rounded">${'$var'}</code> and <code class="bg-gray-100 px-1 rounded">{'{$ var = value}'}</code></li>
                <li>Rich text alternatives: <code class="bg-gray-100 px-1 rounded">{'{| one | two | three}'}</code></li>
              </ul>
            </div>
          </div>

        {:else if currentStep === 'preview'}
          <!-- Migration Preview -->
          {#if preview}
            <div class="space-y-4">
              <!-- Stats -->
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                  <p class="text-2xl font-bold text-blue-700">{preview.changes.length}</p>
                  <p class="text-sm text-blue-600">Changes</p>
                </div>
                <div class="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
                  <p class="text-2xl font-bold text-amber-700">{preview.warnings.length}</p>
                  <p class="text-sm text-amber-600">Warnings</p>
                </div>
                <div class="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                  <p class="text-2xl font-bold text-red-700">{preview.errors.length}</p>
                  <p class="text-sm text-red-600">Errors</p>
                </div>
              </div>

              <!-- Warnings -->
              {#if preview.warnings.length > 0}
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p class="font-semibold text-amber-800 mb-2">Warnings:</p>
                  <ul class="list-disc list-inside text-amber-700 text-sm space-y-1">
                    {#each preview.warnings as warning}
                      <li>{warning}</li>
                    {/each}
                  </ul>
                </div>
              {/if}

              <!-- Changes List -->
              {#if preview.changes.length > 0}
                <div class="border border-gray-200 rounded-lg overflow-hidden">
                  <div class="bg-gray-100 px-4 py-2 font-semibold text-sm text-gray-700 border-b border-gray-200">
                    Changes to be Applied
                  </div>
                  <div class="max-h-[300px] overflow-y-auto">
                    {#each preview.changes as change, i}
                      <div class="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                        <div class="flex items-start gap-3">
                          <div class="flex-shrink-0 w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-xs font-mono font-bold text-gray-600">
                            {getCategoryIcon(change.type)}
                          </div>
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                              <span class="text-xs font-medium px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                                {change.category}
                              </span>
                              {#if change.passageTitle}
                                <span class="text-xs text-gray-500">
                                  in "{change.passageTitle}"
                                  {#if change.line}
                                    line {change.line}
                                  {/if}
                                </span>
                              {/if}
                            </div>
                            <div class="grid grid-cols-2 gap-2 text-sm">
                              <div class="bg-red-50 rounded p-2 font-mono text-red-700 break-all">
                                <span class="text-xs text-red-500 block mb-1">Before:</span>
                                {change.original}
                              </div>
                              <div class="bg-green-50 rounded p-2 font-mono text-green-700 break-all">
                                <span class="text-xs text-green-500 block mb-1">After:</span>
                                {change.migrated}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                </div>
              {:else}
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-600">
                  No automatic changes available for this story.
                </div>
              {/if}
            </div>
          {/if}

        {:else if currentStep === 'migrating'}
          <!-- Migrating -->
          <div class="flex flex-col items-center justify-center py-12">
            <svg class="animate-spin h-12 w-12 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-gray-600">Applying migration changes...</p>
          </div>

        {:else if currentStep === 'complete'}
          <!-- Complete -->
          {#if migrationResult?.success}
            <div class="space-y-6">
              <div class="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <div class="text-5xl mb-3">OK</div>
                <p class="text-green-800 font-semibold text-lg">Migration Successful!</p>
                <p class="text-green-700 text-sm mt-1">
                  {migrationResult.changes.length} changes applied in {migrationResult.duration}ms
                </p>
              </div>

              {#if migrationResult.warnings.length > 0}
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p class="font-semibold text-amber-800 mb-2">Notes:</p>
                  <ul class="list-disc list-inside text-amber-700 text-sm space-y-1">
                    {#each migrationResult.warnings as warning}
                      <li>{warning}</li>
                    {/each}
                  </ul>
                </div>
              {/if}

              <p class="text-gray-600 text-sm">
                Click "Apply Changes" to update your story with the migrated version.
                You can undo this action using Ctrl+Z / Cmd+Z.
              </p>
            </div>
          {:else}
            <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <div class="text-5xl mb-3">X</div>
              <p class="text-red-800 font-semibold text-lg">Migration Failed</p>
              {#if migrationResult?.errors}
                <ul class="text-red-700 text-sm mt-2">
                  {#each migrationResult.errors as error}
                    <li>{error}</li>
                  {/each}
                </ul>
              {/if}
            </div>
          {/if}
        {/if}
      </div>

      <!-- Footer Actions -->
      <div class="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
        <div>
          {#if currentStep === 'preview'}
            <button
              class="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              on:click={() => currentStep = 'detection'}
              type="button"
            >
              Back
            </button>
          {/if}
        </div>
        <div class="flex gap-3">
          <button
            class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            on:click={close}
            disabled={$isMigrating}
            type="button"
          >
            {currentStep === 'complete' && migrationResult?.success ? 'Close' : 'Cancel'}
          </button>

          {#if currentStep === 'detection' && detectedVersion === '0.x'}
            <button
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              on:click={generatePreview}
              type="button"
            >
              Preview Changes
            </button>
          {:else if currentStep === 'preview' && preview?.canMigrate}
            <button
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              on:click={startMigration}
              disabled={$isMigrating}
              type="button"
            >
              {#if $isMigrating}
                Migrating...
              {:else}
                Migrate to WLS 1.0
              {/if}
            </button>
          {:else if currentStep === 'complete' && migrationResult?.success}
            <button
              class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              on:click={applyMigration}
              type="button"
            >
              Apply Changes
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  [role="dialog"] {
    animation: fadeIn 0.15s ease-out;
  }
</style>
