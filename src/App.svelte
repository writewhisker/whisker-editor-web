<script lang="ts">
  import { onMount } from 'svelte';
  import MenuBar from './lib/components/MenuBar.svelte';
  import Toolbar from './lib/components/Toolbar.svelte';
  import StatusBar from './lib/components/StatusBar.svelte';
  import FileDialog from './lib/components/FileDialog.svelte';
  import { projectActions, currentStory, currentFilePath } from './lib/stores/projectStore';
  import { openProjectFile, saveProjectFile, saveProjectFileAs } from './lib/utils/fileOperations';
  import type { FileHandle } from './lib/utils/fileOperations';

  let showNewDialog = false;
  let newProjectTitle = '';
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

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

    if (ctrlKey && e.key === 'n') {
      e.preventDefault();
      handleNewProject();
    } else if (ctrlKey && e.key === 'o') {
      e.preventDefault();
      handleOpenProject();
    } else if (ctrlKey && e.key === 's') {
      e.preventDefault();
      if (e.shiftKey) {
        handleSaveAs();
      } else {
        handleSaveProject();
      }
    }
  }

  onMount(() => {
    // Welcome message
    console.log('Whisker Visual Editor - Phase 1');
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
  />

  <main class="flex-1 overflow-hidden bg-gray-50 flex items-center justify-center">
    {#if $currentStory}
      <div class="text-center text-gray-500">
        <h2 class="text-3xl font-bold mb-4">{$currentStory.metadata.title}</h2>
        <p class="text-lg mb-2">Project loaded successfully!</p>
        <p class="text-sm">
          {$currentStory.passages.size} passage{$currentStory.passages.size !== 1 ? 's' : ''}
          • {$currentStory.variables.size} variable{$currentStory.variables.size !== 1 ? 's' : ''}
        </p>
        <div class="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto">
          <p class="text-sm text-blue-800">
            <strong>Phase 1 Complete!</strong><br />
            Basic file operations and data models are working.<br />
            List View and editing will be added in Phase 2.
          </p>
        </div>
      </div>
    {:else}
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
