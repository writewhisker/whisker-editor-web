<script lang="ts">
  /**
   * Kids Mode App
   *
   * Simplified, colorful wrapper around the main app for kids (ages 8-13).
   * This component wraps the core functionality with kid-friendly UI.
   */

  import { onMount } from 'svelte';
  import KidsMenuBar from './KidsMenuBar.svelte';
  import KidsToolbar from './KidsToolbar.svelte';
  import { currentStory, selectedPassageId, projectActions } from '../../stores/projectStore';
  import { viewMode, panelVisibility, viewPreferencesActions } from '../../stores/viewPreferencesStore';
  import { kidsModePreferences, kidsTheme } from '../../stores/kidsModeStore';
  import { notificationStore } from '../../stores/notificationStore';
  import PassageList from '../PassageList.svelte';
  import PropertiesPanel from '../PropertiesPanel.svelte';
  import GraphView from '../GraphView.svelte';
  import PreviewPanel from '../PreviewPanel.svelte';
  import StatusBar from '../StatusBar.svelte';
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import NotificationToast from '../NotificationToast.svelte';

  // Handler functions
  function handleAddPassage() {
    if (!$currentStory) return;
    projectActions.addPassage();
  }

  function handleDeletePassage(passageId: string) {
    if (!$currentStory) return;
    const passage = $currentStory.getPassage(passageId);
    if (!passage) return;

    // Simple confirmation (kids-friendly)
    if (confirm(`Do you want to remove "${passage.title}"?`)) {
      projectActions.deletePassage(passageId);
      notificationStore.success(`"${passage.title}" was removed`);
    }
  }

  // Simplified panel visibility for kids mode
  // Only show the essential panels: passageList, properties, and graph
  $: if ($currentStory) {
    // Auto-hide advanced panels in kids mode
    viewPreferencesActions.setPanelVisibility({
      passageList: $viewMode === 'list',
      properties: true,
      variables: false, // Hide by default
      validation: false, // Hide by default
      statistics: false,
      tagManager: false,
      snippets: false,
      characters: false,
      wordGoals: false,
      collaboration: false,
      pacing: false,
      accessibility: false,
      playtest: false,
      dependencies: false,
      saveSystem: false,
      achievements: false,
      adaptiveDifficulty: false,
      versionDiff: false,
      mobileExport: false,
      aiWriting: false,
    });
  }

  // Apply kids mode theme to document root
  $: {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-kids-mode', 'true');
      document.documentElement.setAttribute('data-kids-theme', $kidsTheme);
    }
  }

  onMount(() => {
    console.log('🎮 Kids Mode Activated!');

    // Cleanup on unmount
    return () => {
      if (typeof document !== 'undefined') {
        document.documentElement.removeAttribute('data-kids-mode');
        document.documentElement.removeAttribute('data-kids-theme');
      }
    };
  });
</script>

<div class="flex flex-col h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100">
  <!-- Kids Mode Header -->
  <KidsMenuBar />

  <!-- Kids Mode Toolbar -->
  {#if $currentStory}
    <KidsToolbar />
  {/if}

  <!-- Main Content Area -->
  <main class="flex-1 overflow-hidden bg-gradient-to-br from-yellow-50 via-pink-50 to-blue-50">
    {#if $currentStory}
      {#if $viewMode === 'list'}
        <!-- Simplified List View: Two panels (Story Pages + Editor) -->
        <div class="flex w-full h-full gap-4 p-4">
          <!-- Left: Story Pages List -->
          {#if $panelVisibility.passageList}
            <div class="w-80 flex-shrink-0">
              <div class="panel h-full rounded-2xl shadow-xl border-4 border-purple-300 bg-white">
                <PassageList
                  onAddPassage={handleAddPassage}
                  onDeletePassage={handleDeletePassage}
                />
              </div>
            </div>
          {/if}

          <!-- Right: Story Editor -->
          {#if $panelVisibility.properties}
            <div class="flex-1 min-w-0">
              <div class="panel h-full rounded-2xl shadow-xl border-4 border-pink-300 bg-white">
                <PropertiesPanel />
              </div>
            </div>
          {/if}
        </div>
      {:else if $viewMode === 'graph'}
        <!-- Story Map (Graph View) -->
        <div class="flex-1 h-full p-4">
          <div class="panel h-full rounded-2xl shadow-xl border-4 border-blue-300 bg-white overflow-hidden">
            <SvelteFlowProvider>
              <GraphView />
            </SvelteFlowProvider>
          </div>
        </div>
      {:else if $viewMode === 'preview'}
        <!-- Play Story (Preview Mode) -->
        <div class="flex-1 h-full p-4">
          <div class="panel h-full rounded-2xl shadow-xl border-4 border-green-300 bg-white overflow-hidden">
            <PreviewPanel />
          </div>
        </div>
      {/if}
    {:else}
      <!-- Welcome Screen for Kids -->
      <div class="flex-1 flex items-center justify-center p-8">
        <div class="max-w-3xl w-full text-center">
          <!-- Fun Hero -->
          <div class="text-9xl mb-6 animate-bounce">📖</div>
          <h1 class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 mb-4">
            Welcome, Story Creator!
          </h1>
          <p class="text-2xl text-gray-700 mb-8 font-semibold">
            Ready to create amazing stories for Minecraft and Roblox?
          </p>

          <!-- Big Action Buttons -->
          <div class="flex gap-6 justify-center mb-8">
            <button
              class="btn-primary px-10 py-6 rounded-3xl text-2xl font-black shadow-2xl transform hover:scale-110 transition-all"
            >
              <span class="text-4xl mr-3">✨</span>
              Start a New Story
            </button>
            <button
              class="btn-secondary px-10 py-6 rounded-3xl text-2xl font-black shadow-xl transform hover:scale-110 transition-all"
            >
              <span class="text-4xl mr-3">📂</span>
              Open a Story
            </button>
          </div>

          <!-- Browse Templates -->
          <button
            class="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white rounded-2xl shadow-lg transform hover:scale-105 transition-all font-bold text-xl"
          >
            <span class="text-3xl mr-2">🎨</span>
            Choose a Story Template
          </button>

          <!-- Fun Facts -->
          <div class="mt-12 grid grid-cols-3 gap-6">
            <div class="bg-white rounded-2xl p-6 shadow-xl border-4 border-purple-300">
              <div class="text-5xl mb-3">🎮</div>
              <h3 class="font-black text-purple-600 text-xl mb-2">For Minecraft</h3>
              <p class="text-gray-600 font-semibold">Create quests and adventures!</p>
            </div>
            <div class="bg-white rounded-2xl p-6 shadow-xl border-4 border-pink-300">
              <div class="text-5xl mb-3">🎭</div>
              <h3 class="font-black text-pink-600 text-xl mb-2">For Roblox</h3>
              <p class="text-gray-600 font-semibold">Build roleplay stories!</p>
            </div>
            <div class="bg-white rounded-2xl p-6 shadow-xl border-4 border-blue-300">
              <div class="text-5xl mb-3">🌟</div>
              <h3 class="font-black text-blue-600 text-xl mb-2">Easy & Fun</h3>
              <p class="text-gray-600 font-semibold">No coding needed!</p>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </main>

  <!-- Status Bar (simplified for kids) -->
  <StatusBar />

  <!-- Notifications -->
  <NotificationToast />
</div>
