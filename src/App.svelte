<script lang="ts">
  import { onMount } from 'svelte';
  import MenuBar from './lib/components/MenuBar.svelte';
  import Toolbar from './lib/components/Toolbar.svelte';
  import StatusBar from './lib/components/StatusBar.svelte';
  import FileDialog from './lib/components/FileDialog.svelte';
  import ExportPanel from './lib/components/export/ExportPanel.svelte';
  import ImportDialog from './lib/components/export/ImportDialog.svelte';
  import PassageList from './lib/components/PassageList.svelte';
  import PropertiesPanel from './lib/components/PropertiesPanel.svelte';
  import VariableManager from './lib/components/VariableManager.svelte';
  import ValidationPanel from './lib/components/editor/ValidationPanel.svelte';
  import StoryStatisticsPanel from './lib/components/StoryStatisticsPanel.svelte';
  import TagManager from './lib/components/TagManager.svelte';
  import GraphView from './lib/components/GraphView.svelte';
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import Breadcrumb from './lib/components/Breadcrumb.svelte';
  import PreviewPanel from './lib/components/PreviewPanel.svelte';
  import KeyboardShortcutsHelp from './lib/components/help/KeyboardShortcutsHelp.svelte';
  import AutoSaveRecovery from './lib/components/AutoSaveRecovery.svelte';
  import LoadingSpinner from './lib/components/LoadingSpinner.svelte';
  import ConfirmDialog from './lib/components/ConfirmDialog.svelte';
  import CommandPalette from './lib/components/CommandPalette.svelte';
  import AboutDialog from './lib/components/AboutDialog.svelte';
  import FindReplaceDialog from './lib/components/FindReplaceDialog.svelte';
  import StoryMetadataEditor from './lib/components/StoryMetadataEditor.svelte';
  import SettingsDialog from './lib/components/SettingsDialog.svelte';
  import ResizeHandle from './lib/components/ResizeHandle.svelte';
  import NotificationToast from './lib/components/NotificationToast.svelte';
  import { projectActions, currentStory, currentFilePath, selectedPassageId, passageList } from './lib/stores/projectStore';
  import { openProjectFile, saveProjectFile, saveProjectFileAs } from './lib/utils/fileOperations';
  import type { FileHandle } from './lib/utils/fileOperations';
  import { viewMode, panelVisibility, panelSizes, focusMode, viewPreferencesActions } from './lib/stores/viewPreferencesStore';
  import { autoSaveManager, saveToLocalStorage, clearLocalStorage, type AutoSaveData } from './lib/utils/autoSave';
  import { theme, applyTheme } from './lib/stores/themeStore';
  import { validationActions } from './lib/stores/validationStore';
  import { addRecentFile, type RecentFile } from './lib/utils/recentFiles';
  import { notificationStore } from './lib/stores/notificationStore';
  import TemplateGallery from './lib/components/onboarding/TemplateGallery.svelte';

  let showNewDialog = false;
  let newProjectTitle = '';
  let showExportPanel = false;
  let showImportDialog = false;
  let showTemplateGallery = false;
  let fileHandle: FileHandle | null = null;
  let isLoading = false;
  let loadingMessage = '';

  // Confirm dialog state
  let showConfirmDialog = false;
  let confirmDialogTitle = '';
  let confirmDialogMessage = '';
  let confirmDialogVariant: 'danger' | 'warning' | 'info' = 'info';
  let confirmDialogAction: (() => void) | null = null;

  // Command palette state
  let showCommandPalette = false;

  // Shortcuts help state
  let showShortcutsHelp = false;

  // About dialog state
  let showAboutDialog = false;

  // Find & Replace dialog state
  let showFindReplaceDialog = false;

  // Story Metadata Editor state
  let showMetadataEditor = false;

  // Settings dialog state
  let showSettings = false;

  // Auto-save status
  let autoSaveStatus: 'idle' | 'saving' | 'saved' = 'idle';
  let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

  // Helper to show confirm dialog
  function showConfirm(
    title: string,
    message: string,
    action: () => void,
    variant: 'danger' | 'warning' | 'info' = 'info'
  ) {
    confirmDialogTitle = title;
    confirmDialogMessage = message;
    confirmDialogAction = action;
    confirmDialogVariant = variant;
    showConfirmDialog = true;
  }

  function handleConfirmDialogConfirm() {
    if (confirmDialogAction) {
      confirmDialogAction();
      confirmDialogAction = null;
    }
  }

  // Handle New Project
  function handleNewProject() {
    if ($currentStory) {
      showConfirm(
        'Unsaved Changes',
        'You have a project open. Any unsaved changes will be lost. Continue?',
        () => {
          showNewDialog = true;
          newProjectTitle = '';
        },
        'warning'
      );
    } else {
      showNewDialog = true;
      newProjectTitle = '';
    }
  }

  function confirmNewProject(event: CustomEvent<{ value: string }>) {
    const title = event.detail.value.trim();
    showNewDialog = false; // Explicitly close dialog
    projectActions.newProject(title || undefined);
    fileHandle = null;
  }

  // Handle Open Project
  async function handleOpenProject() {
    const openProject = async () => {
      try {
        isLoading = true;
        loadingMessage = 'Opening project...';

        const result = await openProjectFile();
        if (result) {
          projectActions.loadProject(result.data, result.handle.name);
          fileHandle = result.handle;

          // Add to recent files
          addRecentFile({
            name: result.handle.name,
            storyTitle: result.data.metadata?.title || result.handle.name,
          });
        }
      } finally {
        isLoading = false;
        loadingMessage = '';
      }
    };

    if ($currentStory) {
      showConfirm(
        'Unsaved Changes',
        'Opening a new project will close the current one. Any unsaved changes will be lost. Continue?',
        openProject,
        'warning'
      );
    } else {
      await openProject();
    }
  }

  // Handle Open Recent File
  async function handleOpenRecent(file: RecentFile) {
    // For now, we can't directly open from file system path
    // So we'll just show the regular open dialog
    // This is a limitation of the File System Access API
    alert(`Please use File > Open to open "${file.name}"\n\nRecent files shows what you've opened before, but can't automatically reopen them due to browser security restrictions.`);
    handleOpenProject();
  }

  // Handle Save Project
  async function handleSaveProject() {
    const data = projectActions.saveProject();
    if (!data) return;

    try {
      isLoading = true;
      loadingMessage = 'Saving project...';

      const result = await saveProjectFile(data, fileHandle || undefined);
      if (result) {
        fileHandle = result;
        currentFilePath.set(result.name);
        // Clear auto-save after successful manual save
        clearLocalStorage();
      }
    } finally {
      isLoading = false;
      loadingMessage = '';
    }
  }

  // Handle Save As
  async function handleSaveAs() {
    const data = projectActions.saveProject();
    if (!data) return;

    try {
      isLoading = true;
      loadingMessage = 'Saving project as...';

      const result = await saveProjectFileAs(data);
      if (result) {
        fileHandle = result;
        currentFilePath.set(result.name);
        // Clear auto-save after successful manual save
        clearLocalStorage();
      }
    } finally {
      isLoading = false;
      loadingMessage = '';
    }
  }

  // Handle Export
  function handleExport() {
    showExportPanel = true;
  }

  // Handle Import
  function handleImport() {
    showImportDialog = true;
  }

  // Handle import complete
  function handleImportComplete(event: CustomEvent<{ story: any }>) {
    const story = event.detail.story;
    projectActions.loadProject(story, 'Imported Story');
    fileHandle = null; // Clear file handle since this is an imported story
  }

  // Handle Browse Templates
  function handleBrowseTemplates() {
    showTemplateGallery = true;
  }

  // Handle Template Selection
  async function handleTemplateSelect(event: CustomEvent<{ templateId: string; templateName: string }>) {
    const { templateId, templateName } = event.detail;

    try {
      isLoading = true;
      loadingMessage = `Loading ${templateName}...`;
      showTemplateGallery = false;

      const response = await fetch(`/examples/${templateId}.json`);
      if (!response.ok) {
        throw new Error('Failed to load template');
      }
      const data = await response.json();
      projectActions.loadProject(data, `${templateName} (Template)`);
      fileHandle = null; // Clear file handle since this is a template

      notificationStore.add({
        message: `Loaded ${templateName} template - now customize it to make it your own!`,
        type: 'success',
        duration: 5000
      });
    } catch (error) {
      console.error('Error loading template:', error);
      notificationStore.add({
        message: 'Failed to load template. Please try again.',
        type: 'error'
      });
    } finally {
      isLoading = false;
      loadingMessage = '';
    }
  }

  // Handle Start Blank from Template Gallery
  function handleStartBlankFromGallery() {
    showTemplateGallery = false;
    handleNewProject();
  }

  // Handle Find & Replace
  function handleFind(event: CustomEvent) {
    const { searchTerm, caseSensitive, matchWholeWord, searchIn } = event.detail;
    const passages = $passageList;
    const flags = caseSensitive ? '' : 'i';
    const pattern = matchWholeWord ? `\\b${searchTerm}\\b` : searchTerm;
    const regex = new RegExp(pattern, flags);

    for (const passage of passages) {
      let found = false;
      if (searchIn === 'content' || searchIn === 'both') {
        if (regex.test(passage.content)) {
          found = true;
        }
      }
      if (searchIn === 'titles' || searchIn === 'both') {
        if (regex.test(passage.title)) {
          found = true;
        }
      }
      if (found) {
        selectedPassageId.set(passage.id);
        showFindReplaceDialog = false;
        return;
      }
    }
    alert('No matches found');
  }

  function handleReplace(event: CustomEvent) {
    const { searchTerm, replaceTerm, caseSensitive, matchWholeWord, searchIn } = event.detail;
    const currentPassage = $passageList.find(p => p.id === $selectedPassageId);
    if (!currentPassage) {
      alert('No passage selected');
      return;
    }

    const flags = caseSensitive ? '' : 'i';
    const pattern = matchWholeWord ? `\\b${searchTerm}\\b` : searchTerm;
    const regex = new RegExp(pattern, flags);

    let replaced = false;
    if (searchIn === 'content' || searchIn === 'both') {
      if (regex.test(currentPassage.content)) {
        projectActions.updatePassage(currentPassage.id, {
          content: currentPassage.content.replace(regex, replaceTerm)
        });
        replaced = true;
      }
    }
    if (searchIn === 'titles' || searchIn === 'both') {
      if (regex.test(currentPassage.title)) {
        projectActions.updatePassage(currentPassage.id, {
          title: currentPassage.title.replace(regex, replaceTerm)
        });
        replaced = true;
      }
    }

    if (replaced) {
      showFindReplaceDialog = false;
    } else {
      alert('No match found in selected passage');
    }
  }

  function handleReplaceAll(event: CustomEvent) {
    const { searchTerm, replaceTerm, caseSensitive, matchWholeWord, searchIn } = event.detail;
    const passages = $passageList;
    const flags = caseSensitive ? 'g' : 'gi';
    const pattern = matchWholeWord ? `\\b${searchTerm}\\b` : searchTerm;
    const regex = new RegExp(pattern, flags);

    let count = 0;
    for (const passage of passages) {
      let updated = false;
      const updates: any = {};

      if (searchIn === 'content' || searchIn === 'both') {
        if (regex.test(passage.content)) {
          updates.content = passage.content.replace(regex, replaceTerm);
          updated = true;
        }
      }
      if (searchIn === 'titles' || searchIn === 'both') {
        if (regex.test(passage.title)) {
          updates.title = passage.title.replace(regex, replaceTerm);
          updated = true;
        }
      }

      if (updated) {
        projectActions.updatePassage(passage.id, updates);
        count++;
      }
    }

    showFindReplaceDialog = false;
    alert(`Replaced in ${count} passage${count !== 1 ? 's' : ''}`);
  }

  // Handle Validation
  function handleValidation() {
    if ($currentStory) {
      validationActions.validate($currentStory);
      // Open validation panel if not already visible
      if (!$panelVisibility.validation) {
        viewPreferencesActions.togglePanel('validation');
      }
    }
  }

  function handleCheckLinks() {
    if ($currentStory) {
      validationActions.validate($currentStory);
      // Open validation panel to see results
      if (!$panelVisibility.validation) {
        viewPreferencesActions.togglePanel('validation');
      }
    }
  }

  // Passage templates
  const passageTemplates = {
    blank: { title: 'New Passage', content: '' },
    choice: {
      title: 'Choice Passage',
      content: 'What do you do?\n\n[[Option 1]]\n[[Option 2]]\n[[Option 3]]'
    },
    conversation: {
      title: 'Conversation',
      content: '"Hello there," says the stranger.\n\n[[Ask who they are]]\n[[Say hello back]]\n[[Walk away]]'
    },
    description: {
      title: 'Description',
      content: 'You find yourself in a new location. [Describe the setting here]\n\n[[Continue]]'
    },
    checkpoint: {
      title: 'Checkpoint',
      content: '<<set $chapter = 2>>\n\nChapter 2: [Title]\n\n[Story continues...]\n\n[[Next]]'
    },
    ending: {
      title: 'Ending',
      content: 'THE END\n\n[Describe how the story concludes]\n\n[[Start Over->Start]]'
    }
  };

  // Handle Add Passage
  function handleAddPassage() {
    if (!$currentStory) return;

    // Create a new passage with default title
    // TODO: Add a proper modal UI for template selection instead of prompt()
    projectActions.addPassage();
  }

  // Handle Delete Passage
  function handleDeletePassage(passageId: string) {
    if (!$currentStory) return;

    const passage = $currentStory.getPassage(passageId);
    if (!passage) return;

    const isStart = $currentStory.startPassage === passageId;
    const title = isStart ? 'Delete Start Passage?' : 'Delete Passage?';
    const message = isStart
      ? `"${passage.title}" is the start passage. Deleting it will break story playback unless you set a new start passage. Delete anyway?`
      : `Are you sure you want to delete "${passage.title}"? This action cannot be undone.`;

    showConfirm(
      title,
      message,
      () => projectActions.deletePassage(passageId),
      'danger'
    );
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

    // Command palette (Ctrl+K)
    if (ctrlKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      showCommandPalette = true;
    } else if (ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      handleAddPassage();
    } else if (ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
      // Redo: Ctrl+Shift+Z (must be checked before Ctrl+Z)
      e.preventDefault();
      if ($currentStory) {
        void projectActions.redo(); // async call, don't await in event handler
      }
    } else if (ctrlKey && e.key.toLowerCase() === 'y') {
      // Redo: Ctrl+Y (Windows standard)
      e.preventDefault();
      if ($currentStory) {
        void projectActions.redo(); // async call, don't await in event handler
      }
    } else if (ctrlKey && e.key.toLowerCase() === 'z') {
      // Undo: Ctrl+Z
      e.preventDefault();
      if ($currentStory) {
        void projectActions.undo(); // async call, don't await in event handler
      }
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
    } else if (ctrlKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      handleExport();
    } else if (ctrlKey && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      handleImport();
    } else if (ctrlKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      if ($currentStory) {
        showFindReplaceDialog = true;
      }
    } else if (ctrlKey && e.shiftKey && e.key.toLowerCase() === 'm') {
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

  // Command palette event handlers
  function handleCommandPaletteEvent(event: CustomEvent) {
    const { type, detail } = event;
    switch (type) {
      case 'new': handleNewProject(); break;
      case 'open': handleOpenProject(); break;
      case 'save': handleSaveProject(); break;
      case 'saveas': handleSaveAs(); break;
      case 'export': handleExport(); break;
      case 'import': handleImport(); break;
      case 'undo': projectActions.undo(); break;
      case 'redo': projectActions.redo(); break;
      case 'addpassage': handleAddPassage(); break;
      case 'view': viewPreferencesActions.setViewMode(detail.mode); break;
      case 'focus': viewPreferencesActions.toggleFocusMode(); break;
      case 'shortcuts': showShortcutsHelp = true; break;
      case 'example': handleBrowseTemplates(); break;
    }
  }

  // Panel resize handlers
  function handlePassageListResize(event: CustomEvent<{ delta: number }>) {
    const newWidth = Math.max(200, Math.min(600, $panelSizes.passageListWidth + event.detail.delta));
    viewPreferencesActions.setPanelSize('passageListWidth', newWidth);
  }

  function handlePropertiesResize(event: CustomEvent<{ delta: number }>) {
    const newWidth = Math.max(300, Math.min(800, $panelSizes.propertiesWidth + event.detail.delta));
    viewPreferencesActions.setPanelSize('propertiesWidth', newWidth);
  }

  function handleVariablesResize(event: CustomEvent<{ delta: number }>) {
    const newWidth = Math.max(250, Math.min(600, $panelSizes.variablesWidth + event.detail.delta));
    viewPreferencesActions.setPanelSize('variablesWidth', newWidth);
  }

  function handleVariablesHeightResize(event: CustomEvent<{ delta: number }>) {
    const newHeight = Math.max(150, Math.min(500, $panelSizes.variablesHeight + event.detail.delta));
    viewPreferencesActions.setPanelSize('variablesHeight', newHeight);
  }

  // Auto-save: Start/stop based on story existence
  $: if ($currentStory) {
    autoSaveManager.start(() => {
      if ($currentStory) {
        // Show saving status
        autoSaveStatus = 'saving';

        // Save to localStorage
        const result = saveToLocalStorage($currentStory);

        if (result.success) {
          // Show saved status
          autoSaveStatus = 'saved';

          // Clear any existing timeout
          if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
          }

          // Reset to idle after 3 seconds
          autoSaveTimeout = setTimeout(() => {
            autoSaveStatus = 'idle';
          }, 3000);
        } else {
          // Save failed - show error notification
          autoSaveStatus = 'idle';

          if (result.error) {
            if (result.error.type === 'quota_exceeded') {
              // Show persistent error for quota exceeded
              notificationStore.error(
                result.error.message || 'Storage quota exceeded. Please save your project manually.',
                10000 // Show for 10 seconds
              );
            } else {
              // Show error for other types
              notificationStore.error(
                result.error.message || 'Auto-save failed. Please save your project manually.',
                5000
              );
            }
          }
        }
      }
    });
  } else {
    autoSaveManager.stop();
    autoSaveStatus = 'idle';
  }

  // Handle auto-save recovery
  function handleAutoSaveRecover(data: AutoSaveData) {
    projectActions.loadProject(data.story, data.storyTitle);
    fileHandle = null; // Clear file handle since this is recovered data
    clearLocalStorage(); // Clear auto-save after successful recovery
  }

  function handleAutoSaveDismiss() {
    // Just close the modal, localStorage already cleared by component
  }

  onMount(() => {
    console.log('Whisker Visual Editor - Phase 10: Performance, Polish & Documentation');

    // Initialize theme
    theme.subscribe(t => {
      applyTheme(t);
    });

    // Initialize font size
    const FONT_SIZE_KEY = 'whisker-font-size';
    const FONT_SIZES = { small: 12, medium: 14, large: 16, 'extra-large': 18 };
    try {
      const savedSize = localStorage.getItem(FONT_SIZE_KEY) as keyof typeof FONT_SIZES;
      if (savedSize && FONT_SIZES[savedSize]) {
        document.documentElement.style.fontSize = `${FONT_SIZES[savedSize]}px`;
      } else {
        document.documentElement.style.fontSize = `${FONT_SIZES.medium}px`;
      }
    } catch (error) {
      console.error('Failed to load font size:', error);
      document.documentElement.style.fontSize = `${FONT_SIZES.medium}px`;
    }

    // Browser close warning for unsaved changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ($currentStory) {
        e.preventDefault();
        e.returnValue = ''; // Modern browsers require this
        return ''; // For older browsers
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup auto-save and event listener on unmount
    return () => {
      autoSaveManager.stop();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex flex-col h-screen bg-white dark:bg-gray-900">
  {#if !$focusMode}
    <MenuBar
      onNew={handleNewProject}
      onOpen={handleOpenProject}
      onSave={handleSaveProject}
      onSaveAs={handleSaveAs}
      onOpenRecent={handleOpenRecent}
      onStoryInfo={() => showMetadataEditor = true}
      onSettings={() => showSettings = true}
      onFind={() => showFindReplaceDialog = true}
      onValidate={handleValidation}
      onCheckLinks={handleCheckLinks}
      onAbout={() => showAboutDialog = true}
    />

    <Toolbar
      onNew={handleNewProject}
      onOpen={handleOpenProject}
      onSave={handleSaveProject}
      onExport={handleExport}
      onImport={handleImport}
      onAddPassage={handleAddPassage}
    />
  {/if}

  <!-- View Mode Switcher & Panel Controls -->
  {#if $currentStory}
    <div class="bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 px-4 py-2 flex items-center gap-4">
      <!-- View Mode Buttons -->
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
        <button
          type="button"
          class="px-3 py-1 text-sm rounded {$viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}"
          on:click={() => viewPreferencesActions.setViewMode('list')}
          aria-label="Switch to list view (Ctrl+1)"
          title="List View (Ctrl+1)"
        >
          📋 List
        </button>
        <button
          type="button"
          class="px-3 py-1 text-sm rounded {$viewMode === 'graph' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}"
          on:click={() => viewPreferencesActions.setViewMode('graph')}
          aria-label="Switch to graph view (Ctrl+2)"
          title="Graph View (Ctrl+2)"
        >
          🗺️ Graph
        </button>
        <button
          type="button"
          class="px-3 py-1 text-sm rounded {$viewMode === 'split' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}"
          on:click={() => viewPreferencesActions.setViewMode('split')}
          aria-label="Switch to split view (Ctrl+3)"
          title="Split View (Ctrl+3)"
        >
          ⚡ Split
        </button>
        <button
          type="button"
          class="px-3 py-1 text-sm rounded {$viewMode === 'preview' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}"
          on:click={() => viewPreferencesActions.setViewMode('preview')}
          aria-label="Switch to preview mode (Ctrl+4)"
          title="Preview Mode (Ctrl+4)"
        >
          🎮 Preview
        </button>
      </div>

      <!-- Divider -->
      <div class="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

      <!-- Panel Toggles (only show in list or split view) -->
      {#if $viewMode === 'list' || $viewMode === 'split'}
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Panels:</span>
          {#if $viewMode === 'list'}
            <button
              type="button"
              class="px-2 py-1 text-xs rounded {$panelVisibility.passageList ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
              on:click={() => viewPreferencesActions.togglePanel('passageList')}
              aria-label="Toggle passage list panel"
              aria-pressed={$panelVisibility.passageList}
              title="Toggle Passage List"
            >
              📋 List
            </button>
          {/if}
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.properties ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('properties')}
            aria-label="Toggle properties panel"
            aria-pressed={$panelVisibility.properties}
            title="Toggle Properties Panel"
          >
            📝 Properties
          </button>
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.variables ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('variables')}
            aria-label="Toggle variables panel"
            aria-pressed={$panelVisibility.variables}
            title="Toggle Variables Panel"
          >
            🔢 Variables
          </button>
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.validation ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('validation')}
            aria-label="Toggle validation panel"
            aria-pressed={$panelVisibility.validation}
            title="Toggle Validation Panel"
          >
            🔍 Validation
          </button>
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.tagManager ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('tagManager')}
            aria-label="Toggle tag manager panel"
            aria-pressed={$panelVisibility.tagManager}
            title="Toggle Tag Manager Panel"
          >
            🏷️ Tags
          </button>
        </div>
      {/if}

      <!-- Divider -->
      {#if !$focusMode}
        <div class="h-6 w-px bg-gray-300"></div>
      {/if}

      <!-- Focus Mode Toggle -->
      <button
        type="button"
        class="px-3 py-1 text-xs rounded {$focusMode ? 'bg-purple-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}"
        on:click={() => viewPreferencesActions.toggleFocusMode()}
        aria-label="Toggle focus mode (Ctrl+F)"
        aria-pressed={$focusMode}
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
            <div class="flex-shrink-0" style="width: {$panelSizes.passageListWidth}px;">
              <PassageList
                onAddPassage={handleAddPassage}
                onDeletePassage={handleDeletePassage}
              />
            </div>
            <ResizeHandle on:resize={handlePassageListResize} />
          {/if}

          <!-- Center: Properties Panel -->
          {#if $panelVisibility.properties}
            <div class="flex-1 min-w-0">
              <PropertiesPanel />
            </div>
          {/if}

          <!-- Right: Variable Manager, Validation, Tag Manager & Statistics -->
          {#if ($panelVisibility.variables || $panelVisibility.validation || $panelVisibility.tagManager || $panelVisibility.statistics) && !$focusMode}
            <ResizeHandle on:resize={handleVariablesResize} />
            <div class="flex-shrink-0 flex flex-col" style="width: {$panelSizes.variablesWidth}px;">
              {#if $panelVisibility.variables}
                <div style="height: {$panelSizes.variablesHeight}px;" class="border-b border-gray-300 dark:border-gray-700">
                  <VariableManager />
                </div>
                {#if $panelVisibility.validation || $panelVisibility.tagManager || $panelVisibility.statistics}
                  <ResizeHandle orientation="horizontal" on:resize={handleVariablesHeightResize} />
                {/if}
              {/if}
              {#if $panelVisibility.validation}
                <div class="flex-1 min-h-0 {($panelVisibility.tagManager || $panelVisibility.statistics) ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <ValidationPanel />
                </div>
              {/if}
              {#if $panelVisibility.tagManager}
                <div class="flex-1 min-h-0 {$panelVisibility.statistics ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <TagManager />
                </div>
              {/if}
              {#if $panelVisibility.statistics}
                <div class="flex-1 min-h-0">
                  <StoryStatisticsPanel />
                </div>
              {/if}
            </div>
          {/if}

          <!-- Show message if all panels hidden -->
          {#if !$panelVisibility.passageList && !$panelVisibility.properties && !$panelVisibility.variables && !$panelVisibility.validation && !$panelVisibility.tagManager && !$panelVisibility.statistics}
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
          <SvelteFlowProvider>
            <GraphView />
          </SvelteFlowProvider>
        </div>
      {:else if $viewMode === 'split'}
        <!-- Split View: Graph + Properties -->
        <div class="flex w-full h-full">
          <!-- Left: Graph View -->
          <div class="flex-1 min-w-0">
            <SvelteFlowProvider>
              <GraphView />
            </SvelteFlowProvider>
          </div>

          <!-- Right: Properties + Variables + Validation + Tag Manager + Statistics -->
          {#if ($panelVisibility.properties || $panelVisibility.variables || $panelVisibility.validation || $panelVisibility.tagManager || $panelVisibility.statistics) && !$focusMode}
            <ResizeHandle on:resize={handlePropertiesResize} />
            <div class="flex-shrink-0 flex flex-col" style="width: {$panelSizes.propertiesWidth}px;">
              {#if $panelVisibility.properties}
                <div class="flex-1 overflow-hidden {($panelVisibility.variables || $panelVisibility.validation || $panelVisibility.tagManager || $panelVisibility.statistics) ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <PropertiesPanel />
                </div>
              {/if}
              {#if $panelVisibility.variables}
                <div style="height: {$panelSizes.variablesHeight}px;" class="{($panelVisibility.validation || $panelVisibility.tagManager || $panelVisibility.statistics) ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <VariableManager />
                </div>
                {#if $panelVisibility.validation || $panelVisibility.tagManager || $panelVisibility.statistics}
                  <ResizeHandle orientation="horizontal" on:resize={handleVariablesHeightResize} />
                {/if}
              {/if}
              {#if $panelVisibility.validation}
                <div class="flex-1 min-h-0 {($panelVisibility.tagManager || $panelVisibility.statistics) ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <ValidationPanel />
                </div>
              {/if}
              {#if $panelVisibility.tagManager}
                <div class="flex-1 min-h-0 {$panelVisibility.statistics ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <TagManager />
                </div>
              {/if}
              {#if $panelVisibility.statistics}
                <div class="flex-1 min-h-0">
                  <StoryStatisticsPanel />
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
      <div class="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950 p-8">
        <div class="max-w-4xl w-full">
          <!-- Hero Section -->
          <div class="text-center mb-12">
            <div class="text-7xl mb-6 animate-bounce-slow">✍️</div>
            <h1 class="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Welcome to Whisker Visual Editor
            </h1>
            <p class="text-lg text-gray-600 dark:text-gray-300 mb-8">
              Create interactive narrative games with an intuitive visual workflow
            </p>

            <!-- Primary Actions -->
            <div class="flex gap-4 justify-center mb-6">
              <button
                class="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg"
                on:click={handleNewProject}
              >
                <span class="text-2xl mr-2">✨</span>
                New Project
              </button>
              <button
                class="px-8 py-4 bg-gray-700 dark:bg-gray-600 text-white rounded-xl hover:bg-gray-800 dark:hover:bg-gray-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg"
                on:click={handleOpenProject}
              >
                <span class="text-2xl mr-2">📂</span>
                Open Project
              </button>
            </div>

            <!-- Browse Templates Button -->
            <button
              class="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-700 dark:to-blue-700 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 dark:hover:from-purple-800 dark:hover:to-blue-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 font-semibold inline-flex items-center gap-2"
              on:click={handleBrowseTemplates}
            >
              <span class="text-xl">🎨</span>
              <span>Browse Templates & Examples</span>
            </button>
          </div>

          <!-- Features Grid -->
          <div class="grid grid-cols-3 gap-6 mb-8">
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div class="text-3xl mb-3">🎨</div>
              <h3 class="font-bold text-gray-900 dark:text-gray-100 mb-2">Visual Editor</h3>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                Build your story with graph and list views. See connections at a glance.
              </p>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div class="text-3xl mb-3">⚡</div>
              <h3 class="font-bold text-gray-900 dark:text-gray-100 mb-2">Fast & Accessible</h3>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                23 keyboard shortcuts. WCAG 2.1 compliant. Optimized for 1000+ passages.
              </p>
            </div>
            <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
              <div class="text-3xl mb-3">🔍</div>
              <h3 class="font-bold text-gray-900 dark:text-gray-100 mb-2">Built-in Testing</h3>
              <p class="text-sm text-gray-600 dark:text-gray-300">
                Real-time validation, quality metrics, and test scenarios.
              </p>
            </div>
          </div>

          <!-- Quick Tips -->
          <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-blue-200 dark:border-blue-800 mb-6">
            <h3 class="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <span>💡</span>
              <span>Quick Tips</span>
            </h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="flex items-start gap-2">
                <span class="text-blue-500 dark:text-blue-400">•</span>
                <span class="text-gray-700 dark:text-gray-300">
                  Press <kbd class="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">Ctrl+K</kbd> for command palette
                </span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-blue-500 dark:text-blue-400">•</span>
                <span class="text-gray-700 dark:text-gray-300">
                  Your work auto-saves every 30 seconds
                </span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-blue-500 dark:text-blue-400">•</span>
                <span class="text-gray-700 dark:text-gray-300">
                  Press <kbd class="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded">?</kbd> to see all keyboard shortcuts
                </span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-blue-500 dark:text-blue-400">•</span>
                <span class="text-gray-700 dark:text-gray-300">
                  Export to HTML, JSON, or Markdown
                </span>
              </div>
            </div>
          </div>

          <!-- Documentation Links -->
          <div class="text-center text-sm text-gray-600 dark:text-gray-400">
            <span>Need help? Check out the </span>
            <a href="docs/GETTING_STARTED.md" target="_blank" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">Getting Started Guide</a>
            <span> or </span>
            <a href="docs/USER_GUIDE.md" target="_blank" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">User Guide</a>
          </div>
        </div>
      </div>
    {/if}
  </main>

  <StatusBar />

  <!-- Auto-save indicator -->
  {#if autoSaveStatus !== 'idle' && $currentStory}
    <div
      class="fixed bottom-4 right-4 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-lg text-sm flex items-center gap-2 transition-opacity duration-300 opacity-100"
      role="status"
      aria-live="polite"
    >
      {#if autoSaveStatus === 'saving'}
        <svg class="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-gray-700">Saving...</span>
      {:else if autoSaveStatus === 'saved'}
        <svg class="h-4 w-4 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
        </svg>
        <span class="text-gray-700">Saved</span>
      {/if}
    </div>
  {/if}
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

<ExportPanel
  bind:show={showExportPanel}
/>

<ImportDialog
  bind:show={showImportDialog}
  on:import={handleImportComplete}
/>

<KeyboardShortcutsHelp />

<AutoSaveRecovery
  onRecover={handleAutoSaveRecover}
  onDismiss={handleAutoSaveDismiss}
/>

<ConfirmDialog
  bind:show={showConfirmDialog}
  title={confirmDialogTitle}
  message={confirmDialogMessage}
  variant={confirmDialogVariant}
  on:confirm={handleConfirmDialogConfirm}
/>

<CommandPalette
  bind:show={showCommandPalette}
  on:new={() => handleCommandPaletteEvent(new CustomEvent('new'))}
  on:open={() => handleCommandPaletteEvent(new CustomEvent('open'))}
  on:save={() => handleCommandPaletteEvent(new CustomEvent('save'))}
  on:saveas={() => handleCommandPaletteEvent(new CustomEvent('saveas'))}
  on:export={() => handleCommandPaletteEvent(new CustomEvent('export'))}
  on:import={() => handleCommandPaletteEvent(new CustomEvent('import'))}
  on:undo={() => handleCommandPaletteEvent(new CustomEvent('undo'))}
  on:redo={() => handleCommandPaletteEvent(new CustomEvent('redo'))}
  on:addpassage={() => handleCommandPaletteEvent(new CustomEvent('addpassage'))}
  on:view={(e) => handleCommandPaletteEvent(new CustomEvent('view', { detail: e.detail }))}
  on:focus={() => handleCommandPaletteEvent(new CustomEvent('focus'))}
  on:shortcuts={() => { showShortcutsHelp = true; }}
  on:example={() => handleCommandPaletteEvent(new CustomEvent('example'))}
/>

<AboutDialog bind:show={showAboutDialog} />

<FindReplaceDialog
  bind:show={showFindReplaceDialog}
  on:find={handleFind}
  on:replace={handleReplace}
  on:replaceAll={handleReplaceAll}
/>

<StoryMetadataEditor bind:show={showMetadataEditor} />

<SettingsDialog bind:show={showSettings} />

<NotificationToast />

{#if showTemplateGallery}
  <TemplateGallery
    on:selectTemplate={handleTemplateSelect}
    on:startBlank={handleStartBlankFromGallery}
    on:close={() => showTemplateGallery = false}
  />
{/if}

{#if isLoading}
  <div class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl p-8">
      <LoadingSpinner message={loadingMessage} size="large" />
    </div>
  </div>
{/if}
