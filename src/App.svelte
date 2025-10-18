<script lang="ts">
  import { onMount } from 'svelte';
  import MenuBar from './lib/components/MenuBar.svelte';
  import Toolbar from './lib/components/Toolbar.svelte';
  import StatusBar from './lib/components/StatusBar.svelte';
  import FileDialog from './lib/components/FileDialog.svelte';
  import PassageList from './lib/components/PassageList.svelte';
  import PropertiesPanel from './lib/components/PropertiesPanel.svelte';
  import VariableManager from './lib/components/VariableManager.svelte';
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

  // Keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

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
    }
  }

  onMount(() => {
    console.log('Whisker Visual Editor - Phase 2');
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

  <main class="flex-1 overflow-hidden bg-gray-50 flex">
    {#if $currentStory}
      <!-- Three-panel layout -->
      <div class="flex w-full h-full">
        <!-- Left: Passage List -->
        <div class="w-64 flex-shrink-0">
          <PassageList
            onAddPassage={handleAddPassage}
            onDeletePassage={handleDeletePassage}
          />
        </div>

        <!-- Center: Properties Panel -->
        <div class="flex-1 min-w-0">
          <PropertiesPanel />
        </div>

        <!-- Right: Variable Manager -->
        <div class="w-80 flex-shrink-0">
          <VariableManager />
        </div>
      </div>
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
              <strong>Phase 2 Complete!</strong><br />
              List view, passage editing, variables, and undo/redo are ready.
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
