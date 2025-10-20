<script lang="ts">
  import { onMount } from 'svelte';
  import MenuBar from './lib/components/MenuBar.svelte';
  import Toolbar from './lib/components/Toolbar.svelte';
  import StatusBar from './lib/components/StatusBar.svelte';
  import FileDialog from './lib/components/FileDialog.svelte';
  import PassageList from './lib/components/PassageList.svelte';
  import PropertiesPanel from './lib/components/PropertiesPanel.svelte';
  import VariableManager from './lib/components/VariableManager.svelte';
  import GraphView from './lib/components/GraphView.svelte';
  import Breadcrumb from './lib/components/Breadcrumb.svelte';
  import PreviewPanel from './lib/components/PreviewPanel.svelte';
  import { projectActions, currentStory, currentFilePath, selectedPassageId } from './lib/stores/projectStore';
  import { openProjectFile, saveProjectFile, saveProjectFileAs } from './lib/utils/fileOperations';
  import type { FileHandle } from './lib/utils/fileOperations';
  import { viewMode, panelVisibility, focusMode, viewPreferencesActions } from './lib/stores/viewPreferencesStore';

  let showNewDialog = false;
  let newProjectTitle = ''
;
  let fileHandle: FileHandle | null = null;

  // Handle New Project
  function handleNewProject() {
    if ($currentStory) {
      // TODO: Add unsaved changes warning
    }
    showNewDialog = true;
    newProjectTitle = '';
  }

  function confirmNewProject(event: CustomEvent<{ value: string }>) {
    const title = event.detail.value.trim();
    projectActions.newProject(title || undefined);
    fileHandle = null;
  }

  // Handle Open Project
  async function handleOpenProject() {
    if ($currentStory) {
      // TODO: Add unsaved changes warning
    }

    const result = await openProjectFile();
    if (result) {
      projectActions.loadProject(result.data, result.handle.name);
      fileHandle = result.handle;
    }
  }

  // Handle Save Project
  async function handleSaveProject() {
    const data = projectActions.saveProject();
    if (!data) return;

    const result = await saveProjectFile(data, fileHandle || undefined);
    if (result) {
      fileHandle = result;
      currentFilePath.set(result.name);
    }
  }

  // Handle Save As
  async function handleSaveAs() {
    const data = projectActions.saveProject();
    if (!data) return;

    const result = await saveProjectFileAs(data);
    if (result) {
      fileHandle = result;
      currentFilePath.set(result.name);
    }
  }

  // Handle Add Passage
  function handleAddPassage() {
    if (!$currentStory) return;

    const title = prompt('Enter passage title:');
    if (title !== null) {
      projectActions.addPassage(title.trim() || undefined);
    }
  }

  // Handle Delete Passage
  function handleDeletePassage(passageId: string) {
    if (!$currentStory) return;

    const passage = $currentStory.getPassage(passageId);
    if (!passage) return;

    const isStart = $currentStory.startPassage === passageId;
    const confirmMessage = isStart
      ? `"${passage.title}" is the start passage. Delete anyway?`
      : `Delete passage "${passage.title}"?`;

    if (confirm(confirmMessage)) {
      projectActions.deletePassage(passageId);
    }
  }

  // Navigate to next/previous passage
  function navigatePassage(direction: 'next' | 'prev' | 'up' | 'down') {
    if (!$currentStory) return;

    const passages = Array.from($currentStory.passages.values());
    if (passages.length === 0) return;

    const currentIndex = $selectedPassageId
      ? passages.findIndex(p => p.id === $selectedPassageId)
      : -1;

    let nextIndex: number;

    if (direction === 'next' || direction === 'down') {
      // Move to next passage
      nextIndex = currentIndex < passages.length - 1 ? currentIndex + 1 : 0;
    } else {
      // Move to previous passage
      nextIndex = currentIndex > 0 ? currentIndex - 1 : passages.length - 1;
    }

    selectedPassageId.set(passages[nextIndex].id);
  }

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

    // Don't intercept arrow keys if user is typing in an input/textarea
    const isTyping = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);

    if (ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      handleAddPassage();
    } else if (ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      projectActions.redo();
    } else if (ctrlKey && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      projectActions.undo();
    } else if (ctrlKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      handleNewProject();
    } else if (ctrlKey && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      handleOpenProject();
    } else if (ctrlKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (e.shiftKey) {
        handleSaveAs();
      } else {
        handleSaveProject();
      }
    } else if (ctrlKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      viewPreferencesActions.toggleFocusMode();
    } else if (e.key === '1' && ctrlKey) {
      e.preventDefault();
      viewPreferencesActions.setViewMode('list');
    } else if (e.key === '2' && ctrlKey) {
      e.preventDefault();
      viewPreferencesActions.setViewMode('graph');
    } else if (e.key === '3' && ctrlKey) {
      e.preventDefault();
      viewPreferencesActions.setViewMode('split');
    } else if (e.key === '4' && ctrlKey) {
      e.preventDefault();
      viewPreferencesActions.setViewMode('preview');
    } else if (!isTyping && e.key === 'ArrowDown') {
      e.preventDefault();
      navigatePassage('down');
    } else if (!isTyping && e.key === 'ArrowUp') {
      e.preventDefault();
      navigatePassage('up');
    } else if (!isTyping && e.key === 'ArrowRight' && $currentStory) {
      e.preventDefault();
      navigatePassage('next');
    } else if (!isTyping && e.key === 'ArrowLeft' && $currentStory) {
      e.preventDefault();
      navigatePassage('prev');
    }
  }

  onMount(() => {
    console.log('Whisker Visual Editor - Phase 7: Live Preview & Testing');
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex flex-col h-screen bg-white">
  <MenuBar
    onNew={handleNewProject}
    onOpen={handleOpenProject}
    onSave={handleSaveProject}
    onSaveAs={handleSaveAs}
  />

  <Toolbar
    onNew={handleNewProject}
    onOpen={handleOpenProject}
    onSave={handleSaveProject}
    onAddPassage={handleAddPassage}
  />

  <!-- View Mode Switcher & Panel Controls -->
  {#if $currentStory}
    <div class="bg-gray-100 border-b border-gray-300 px-4 py-2 flex items-center gap-4">
      <!-- View Mode Buttons -->
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-gray-700">View:</span>
        <button
          class="px-3 py-1 text-sm rounded {$viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}"
          on:click={() => viewPreferencesActions.setViewMode('list')}
          title="List View (Ctrl+1)"
        >
          📋 List
        </button>
        <button
          class="px-3 py-1 text-sm rounded {$viewMode === 'graph' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}"
          on:click={() => viewPreferencesActions.setViewMode('graph')}
          title="Graph View (Ctrl+2)"
        >
          🗺️ Graph
        </button>
        <button
          class="px-3 py-1 text-sm rounded {$viewMode === 'split' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}"
          on:click={() => viewPreferencesActions.setViewMode('split')}
          title="Split View (Ctrl+3)"
        >
          ⚡ Split
        </button>
        <button
          class="px-3 py-1 text-sm rounded {$viewMode === 'preview' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}"
          on:click={() => viewPreferencesActions.setViewMode('preview')}
          title="Preview Mode (Ctrl+4)"
        >
          🎮 Preview
        </button>
      </div>

      <!-- Divider -->
      <div class="h-6 w-px bg-gray-300"></div>

      <!-- Panel Toggles (only show in list or split view) -->
      {#if $viewMode === 'list' || $viewMode === 'split'}
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-700">Panels:</span>
          {#if $viewMode === 'list'}
            <button
              class="px-2 py-1 text-xs rounded {$panelVisibility.passageList ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-white text-gray-600 hover:bg-gray-100'}"
              on:click={() => viewPreferencesActions.togglePanel('passageList')}
              title="Toggle Passage List"
            >
              📋 List
            </button>
          {/if}
          <button
            class="px-2 py-1 text-xs rounded {$panelVisibility.properties ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-white text-gray-600 hover:bg-gray-100'}"
            on:click={() => viewPreferencesActions.togglePanel('properties')}
            title="Toggle Properties Panel"
          >
            📝 Properties
          </button>
          <button
            class="px-2 py-1 text-xs rounded {$panelVisibility.variables ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-white text-gray-600 hover:bg-gray-100'}"
            on:click={() => viewPreferencesActions.togglePanel('variables')}
            title="Toggle Variables Panel"
          >
            🔢 Variables
          </button>
        </div>
      {/if}

      <!-- Divider -->
      {#if !$focusMode}
        <div class="h-6 w-px bg-gray-300"></div>
      {/if}

      <!-- Focus Mode Toggle -->
      <button
        class="px-3 py-1 text-xs rounded {$focusMode ? 'bg-purple-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}"
        on:click={() => viewPreferencesActions.toggleFocusMode()}
        title="Focus Mode (Ctrl+F)"
      >
        {$focusMode ? '🎯 Focus On' : '🎯 Focus'}
      </button>
    </div>
  {/if}

  <!-- Breadcrumb Navigation (show when not in focus mode) -->
  {#if $currentStory && !$focusMode}
    <Breadcrumb />
  {/if}

  <main class="flex-1 overflow-hidden bg-gray-50 flex">
    {#if $currentStory}
      {#if $viewMode === 'list'}
        <!-- List View: Three-panel layout -->
        <div class="flex w-full h-full">
          <!-- Left: Passage List -->
          {#if $panelVisibility.passageList && !$focusMode}
            <div class="w-64 flex-shrink-0 border-r border-gray-300">
              <PassageList
                onAddPassage={handleAddPassage}
                onDeletePassage={handleDeletePassage}
              />
            </div>
          {/if}

          <!-- Center: Properties Panel -->
          {#if $panelVisibility.properties}
            <div class="flex-1 min-w-0">
              <PropertiesPanel />
            </div>
          {/if}

          <!-- Right: Variable Manager -->
          {#if $panelVisibility.variables && !$focusMode}
            <div class="w-80 flex-shrink-0 border-l border-gray-300">
              <VariableManager />
            </div>
          {/if}

          <!-- Show message if all panels hidden -->
          {#if !$panelVisibility.passageList && !$panelVisibility.properties && !$panelVisibility.variables}
            <div class="flex-1 flex items-center justify-center text-gray-400">
              <div class="text-center">
                <p class="text-lg mb-2">All panels hidden</p>
                <p class="text-sm">Use the panel toggles above to show panels</p>
              </div>
            </div>
          {/if}
        </div>
      {:else if $viewMode === 'graph'}
        <!-- Graph View: Full screen graph -->
        <div class="flex-1 h-full">
          <GraphView />
        </div>
      {:else if $viewMode === 'split'}
        <!-- Split View: Graph + Properties -->
        <div class="flex w-full h-full">
          <!-- Left: Graph View -->
          <div class="flex-1 min-w-0">
            <GraphView />
          </div>

          <!-- Right: Properties + Variables -->
          {#if ($panelVisibility.properties || $panelVisibility.variables) && !$focusMode}
            <div class="w-96 flex-shrink-0 flex flex-col border-l border-gray-300">
              {#if $panelVisibility.properties}
                <div class="flex-1 overflow-hidden {$panelVisibility.variables ? 'border-b border-gray-300' : ''}">
                  <PropertiesPanel />
                </div>
              {/if}
              {#if $panelVisibility.variables}
                <div class="h-64">
                  <VariableManager />
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {:else if $viewMode === 'preview'}
        <!-- Preview Mode: Full screen preview/test player -->
        <div class="flex-1 h-full">
          <PreviewPanel />
        </div>
      {/if}
    {:else}
      <!-- Welcome screen -->
      <div class="flex-1 flex items-center justify-center">
        <div class="text-center text-gray-400">
          <div class="text-6xl mb-4">📝</div>
          <h2 class="text-2xl font-bold mb-4">Welcome to Whisker Visual Editor</h2>
          <p class="mb-6">Create a new project or open an existing one to get started</p>
          <div class="flex gap-4 justify-center">
            <button
              class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg"
              on:click={handleNewProject}
            >
              📄 New Project
            </button>
            <button
              class="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-lg"
              on:click={handleOpenProject}
            >
              📁 Open Project
            </button>
          </div>
          <div class="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
            <p class="text-sm text-green-800">
              <strong>Phase 4 Complete!</strong><br />
              Advanced search and filtering across passages, tags, and types with unified experience in list and graph views.
            </p>
          </div>
        </div>
      </div>
    {/if}
  </main>

  <StatusBar />
</div>

<FileDialog
  bind:show={showNewDialog}
  title="New Project"
  message="Enter a name for your story:"
  showInput={true}
  inputPlaceholder="My Amazing Story"
  bind:inputValue={newProjectTitle}
  on:confirm={confirmNewProject}
/>
