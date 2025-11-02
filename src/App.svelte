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
  import SnippetsPanel from './lib/components/SnippetsPanel.svelte';
  import CharacterManager from './lib/components/CharacterManager.svelte';
  import WordGoalsPanel from './lib/components/WordGoalsPanel.svelte';
  import CollaborationPanel from './lib/components/CollaborationPanel.svelte';
  import PacingAnalyzerPanel from './lib/components/PacingAnalyzerPanel.svelte';
  import AccessibilityPanel from './lib/components/AccessibilityPanel.svelte';
  import PlaytestPanel from './lib/components/PlaytestPanel.svelte';
  import VariableDependencyPanel from './lib/components/VariableDependencyPanel.svelte';
  import SaveSystemPanel from './lib/components/SaveSystemPanel.svelte';
  import AchievementPanel from './lib/components/AchievementPanel.svelte';
  import AdaptiveDifficultyPanel from './lib/components/AdaptiveDifficultyPanel.svelte';
  import VersionDiffPanel from './lib/components/VersionDiffPanel.svelte';
  import MobileExportPanel from './lib/components/MobileExportPanel.svelte';
  import AIWritingPanel from './lib/components/AIWritingPanel.svelte';
  import GraphView from './lib/components/GraphView.svelte';
  import { SvelteFlowProvider } from '@xyflow/svelte';
  import Breadcrumb from './lib/components/Breadcrumb.svelte';
  import PreviewPanel from './lib/components/PreviewPanel.svelte';
  import KeyboardShortcutsHelp from './lib/components/help/KeyboardShortcutsHelp.svelte';
  import QuickShortcutsOverlay from './lib/components/help/QuickShortcutsOverlay.svelte';
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
  import AssetManager from './lib/components/editor/AssetManager.svelte';
  import AudioControls from './lib/components/audio/AudioControls.svelte';
  import { AudioManager } from './lib/audio/AudioManager';
  import AnimationControls from './lib/components/animation/AnimationControls.svelte';
  import StylesheetEditor from './lib/components/editor/StylesheetEditor.svelte';
  import { initMobileDetection, isMobile } from './lib/utils/mobile';
  import GitHubCallback from './lib/components/github/GitHubCallback.svelte';
  import GitHubRepositoryPicker from './lib/components/github/GitHubRepositoryPicker.svelte';
  import GitHubSyncStatus from './lib/components/github/GitHubSyncStatus.svelte';
  import GitHubCommitHistory from './lib/components/github/GitHubCommitHistory.svelte';
  import GitHubConflictResolver from './lib/components/github/GitHubConflictResolver.svelte';
  import StoryStatsWidget from './lib/components/StoryStatsWidget.svelte';
  import { isAuthenticated } from './lib/services/github/githubAuth';
  import { saveFile, getFile } from './lib/services/github/githubApi';
  import type { GitHubRepository } from './lib/services/github/types';
  import { backgroundSync } from './lib/services/storage/backgroundSync';
  import { syncQueue } from './lib/services/storage/syncQueue';
  import { IndexedDBAdapter } from './lib/services/storage/IndexedDBAdapter';

  let showNewDialog = false;
  let newProjectTitle = '';
  let showExportPanel = false;
  let showImportDialog = false;
  let showTemplateGallery = false;

  // GitHub OAuth callback handling
  let showGitHubCallback = false;
  let githubCallbackCode = '';
  let githubCallbackState = '';

  // GitHub repository picker
  let showGitHubPicker = false;
  let githubPickerMode: 'save' | 'load' = 'save';

  // GitHub sync status
  let githubSyncStatus: 'idle' | 'syncing' | 'synced' | 'error' = 'idle';
  let githubLastSyncTime: Date | null = null;
  let githubSyncError: string | null = null;
  let githubRepositoryName: string | null = null;

  // IndexedDB adapter for local storage
  const db = new IndexedDBAdapter({ dbName: 'whisker-storage', version: 1 });

  // GitHub commit history
  let showCommitHistory = false;
  let commitHistoryOwner = '';
  let commitHistoryRepo = '';
  let commitHistoryPath = '';

  // GitHub conflict resolver
  let showConflictResolver = false;
  let conflictLocalVersion: any = null;
  let conflictRemoteVersion: any = null;
  let conflictLocalModified: Date | null = null;
  let conflictRemoteModified: Date | null = null;

  let showAssetManager = false;
  let showAudioControls = false;
  let showAnimationControls = false;

  // Audio Manager instance
  const audioManager = new AudioManager();
  let showStylesheetEditor = false;
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

  // Quick shortcuts overlay state
  let showQuickShortcuts = false;

  // About dialog state
  let showAboutDialog = false;

  // Find & Replace dialog state
  let showFindReplaceDialog = false;

  // Story Metadata Editor state
  let showMetadataEditor = false;

  // Settings dialog state
  let showSettings = false;

  // Story stats widget state
  let showStatsWidget = true;

  // Auto-save status
  let autoSaveStatus: 'idle' | 'saving' | 'saved' = 'idle';
  let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

  // First-time user detection
  const FIRST_VISIT_KEY = 'whisker-first-visit';
  let hasSeenTemplates = false;

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

  // Handle Save to GitHub
  function handleSaveToGitHub() {
    if (!$isAuthenticated) {
      notificationStore.error('Please connect to GitHub first');
      return;
    }

    if (!$currentStory) {
      notificationStore.error('No story to save');
      return;
    }

    githubPickerMode = 'save';
    showGitHubPicker = true;
  }

  // Handle Load from GitHub
  function handleLoadFromGitHub() {
    if (!$isAuthenticated) {
      notificationStore.error('Please connect to GitHub first');
      return;
    }

    githubPickerMode = 'load';
    showGitHubPicker = true;
  }

  // Handle repository selection from picker
  async function handleRepositorySelect(event: CustomEvent<{ repository: GitHubRepository; filename: string }>) {
    const { repository, filename } = event.detail;

    if (githubPickerMode === 'save') {
      await handleGitHubSave(repository, filename);
    } else {
      await handleGitHubLoad(repository, filename);
    }
  }

  // Save story to GitHub
  async function handleGitHubSave(repository: GitHubRepository, filename: string) {
    const data = projectActions.saveProject();
    if (!data) {
      notificationStore.error('Failed to prepare story data');
      return;
    }

    try {
      isLoading = true;
      loadingMessage = 'Saving to GitHub...';
      githubSyncStatus = 'syncing';

      const content = JSON.stringify(data, null, 2);
      const [owner] = repository.fullName.split('/');

      // Try to get existing file to get its SHA (for updates)
      let sha: string | undefined;
      try {
        const existingFile = await getFile(owner, repository.name, filename);
        sha = existingFile.sha;
      } catch (err) {
        // File doesn't exist yet, that's okay
      }

      const commitMessage = sha
        ? `Update ${filename}`
        : `Create ${filename}`;

      await saveFile(
        owner,
        repository.name,
        filename,
        content,
        commitMessage,
        sha
      );

      // Update GitHub status
      githubRepositoryName = repository.fullName;
      githubSyncStatus = 'synced';
      githubLastSyncTime = new Date();
      githubSyncError = null;

      notificationStore.success(`Saved to ${repository.fullName}/${filename}`);
    } catch (error: any) {
      console.error('Failed to save to GitHub:', error);
      githubSyncStatus = 'error';
      githubSyncError = error.message || 'Failed to save to GitHub';
      notificationStore.error(error.message || 'Failed to save to GitHub');
    } finally {
      isLoading = false;
      loadingMessage = '';
    }
  }

  // Load story from GitHub
  async function handleGitHubLoad(repository: GitHubRepository, filename: string) {
    try {
      isLoading = true;
      loadingMessage = 'Loading from GitHub...';

      const [owner] = repository.fullName.split('/');
      const file = await getFile(owner, repository.name, filename);

      const remoteData = JSON.parse(file.content);

      // Check for local version in IndexedDB
      let hasConflict = false;
      if (remoteData.metadata?.id) {
        try {
          const localData = await db.loadStory(remoteData.metadata.id);
          if (localData && $currentStory) {
            // Compare versions - check if they differ
            const localUpdated = new Date(localData.updatedAt || 0);
            const remoteUpdated = new Date(remoteData.metadata?.lastModified || 0);

            // If local has changes and is different from remote, show conflict resolver
            if (Math.abs(localUpdated.getTime() - remoteUpdated.getTime()) > 1000) {
              hasConflict = true;
              conflictLocalVersion = $currentStory;
              conflictRemoteVersion = remoteData;
              conflictLocalModified = localUpdated;
              conflictRemoteModified = remoteUpdated;
              showConflictResolver = true;

              // Update GitHub info but don't auto-load
              githubRepositoryName = repository.fullName;

              notificationStore.info('Conflict detected between local and remote versions');
              return;
            }
          }
        } catch (error) {
          console.error('Failed to check for conflicts:', error);
        }
      }

      // No conflict, proceed with load
      projectActions.loadProject(remoteData, filename);
      fileHandle = null;

      // Update GitHub status
      githubRepositoryName = repository.fullName;
      githubSyncStatus = 'synced';
      githubLastSyncTime = new Date();

      notificationStore.success(`Loaded from ${repository.fullName}/${filename}`);
    } catch (error: any) {
      console.error('Failed to load from GitHub:', error);
      notificationStore.error(error.message || 'Failed to load from GitHub');
    } finally {
      isLoading = false;
      loadingMessage = '';
    }
  }

  // Handle viewing commit history
  function handleViewCommitHistory() {
    if (!$isAuthenticated) {
      notificationStore.error('Please connect to GitHub first');
      return;
    }

    if (!githubRepositoryName) {
      notificationStore.error('No GitHub repository linked to this story');
      return;
    }

    // Parse repository name (format: owner/repo)
    const [owner, repo] = githubRepositoryName.split('/');
    if (!owner || !repo) {
      notificationStore.error('Invalid repository name');
      return;
    }

    // For now, assume story.json - in the future, track the actual filename
    const filename = $currentStory?.metadata?.title ? `${$currentStory.metadata.title}.json` : 'story.json';

    commitHistoryOwner = owner;
    commitHistoryRepo = repo;
    commitHistoryPath = filename;
    showCommitHistory = true;
  }

  // Handle commit history revert
  async function handleCommitRevert(event: CustomEvent<{ commit: any; content: string }>) {
    const { commit, content } = event.detail;

    try {
      const data = JSON.parse(content);
      projectActions.loadProject(data, `Reverted to ${commit.sha.substring(0, 7)}`);
      fileHandle = null;

      notificationStore.success(`Reverted to commit: ${commit.message}`);
    } catch (error: any) {
      console.error('Failed to revert to commit:', error);
      notificationStore.error(error.message || 'Failed to revert to commit');
    }
  }

  // Handle conflict resolution
  function handleConflictResolve(event: CustomEvent<{ resolution: 'local' | 'remote' | 'manual'; localVersion: any; remoteVersion: any }>) {
    const { resolution, localVersion, remoteVersion } = event.detail;

    switch (resolution) {
      case 'local':
        // Keep local version - do nothing, just close
        notificationStore.success('Keeping local version');
        break;
      case 'remote':
        // Use remote version - load it
        projectActions.loadProject(remoteVersion, 'Remote version from GitHub');
        fileHandle = null;
        notificationStore.success('Loaded remote version from GitHub');
        break;
      case 'manual':
        // Manual merge - show both versions for user to merge manually
        notificationStore.info('Manual merge selected - please review both versions');
        // In the future, this could open a diff editor
        break;
    }

    showConflictResolver = false;
  }

  // Handle Browse Templates
  function handleBrowseTemplates() {
    showTemplateGallery = true;
    // Mark that user has seen templates
    localStorage.setItem('whisker-has-seen-templates', 'true');
  }

  // Handle Template Selection
  async function handleTemplateSelect(event: CustomEvent<{ templateId: string; templateName: string }>) {
    const { templateId, templateName } = event.detail;

    try {
      isLoading = true;
      loadingMessage = `Loading ${templateName}...`;
      showTemplateGallery = false;

      // Use import.meta.env.BASE_URL to get the correct base path for GitHub Pages
      const basePath = import.meta.env.BASE_URL || '/';
      const templatePath = `${basePath}examples/${templateId}.json`;

      const response = await fetch(templatePath);
      if (!response.ok) {
        throw new Error('Failed to load template');
      }
      const data = await response.json();
      projectActions.loadProject(data, `${templateName} (Template)`);
      fileHandle = null; // Clear file handle since this is a template

      notificationStore.success(
        `Loaded ${templateName} template - now customize it to make it your own!`,
        5000
      );
    } catch (error) {
      console.error('Error loading template:', error);
      notificationStore.error(
        'Failed to load template. Please try again.'
      );
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

  // Handle Manage Assets
  function handleManageAssets() {
    showAssetManager = true;
  }

  // Handle Manage Audio
  function handleManageAudio() {
    showAudioControls = true;
  }

  // Handle Manage Animations
  function handleManageAnimations() {
    showAnimationControls = true;
  }

  // Handle Manage Stylesheets
  function handleManageStylesheets() {
    showStylesheetEditor = true;
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

  // Handle Duplicate Passage
  function handleDuplicatePassage() {
    if (!$currentStory || !$selectedPassageId) return;

    const duplicated = projectActions.duplicatePassage($selectedPassageId);
    if (duplicated) {
      notificationStore.success(`Passage "${duplicated.title}" duplicated successfully`);
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

    // Quick shortcuts overlay (?)
    // Only show if not already showing another dialog
    if (e.key === '?' && !showCommandPalette && !showShortcutsHelp && !showQuickShortcuts) {
      e.preventDefault();
      showQuickShortcuts = true;
      return;
    }

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
    } else if (ctrlKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      handleDuplicatePassage();
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
    autoSaveManager.start(async () => {
      if ($currentStory) {
        // Show saving status
        autoSaveStatus = 'saving';

        // Save to localStorage
        const result = saveToLocalStorage($currentStory);

        if (result.success) {
          // Also save to IndexedDB
          try {
            const data = projectActions.saveProject();
            if (data && data.metadata?.id) {
              await db.saveStory(data);
            }
          } catch (error) {
            console.error('Failed to save to IndexedDB:', error);
          }

          // Queue sync operation if GitHub repository is linked
          if (githubRepositoryName && $isAuthenticated) {
            try {
              const data = projectActions.saveProject();
              if (data) {
                const [owner, repoName] = githubRepositoryName.split('/');
                const filename = $currentStory.metadata?.title
                  ? `${$currentStory.metadata.title}.json`
                  : 'story.json';

                await syncQueue.enqueue({
                  storyId: data.metadata?.id || 'default',
                  operation: 'update',
                  data: {
                    story: data,
                    githubInfo: {
                      repo: githubRepositoryName,
                      filename: filename,
                    }
                  }
                });
              }
            } catch (error) {
              console.error('Failed to queue sync operation:', error);
            }
          }

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

  // Force graph view and hide panels on mobile
  $: if ($isMobile && $viewMode !== 'graph') {
    viewPreferencesActions.setViewMode('graph');
  }

  onMount(() => {
    console.log('Whisker Visual Editor - Phase 10: Performance, Polish & Documentation');

    // Check for GitHub OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      showGitHubCallback = true;
      githubCallbackCode = code;
      githubCallbackState = state;
    }

    // Initialize mobile detection
    initMobileDetection();

    // Initialize IndexedDB
    db.initialize().then(() => {
      console.log('IndexedDB initialized');
    }).catch(error => {
      console.error('Failed to initialize IndexedDB:', error);
    });

    // Initialize background sync service if authenticated
    if ($isAuthenticated) {
      backgroundSync.start(30000); // Sync every 30 seconds
      console.log('Background sync service started');
    }

    // Subscribe to background sync status
    const unsubscribeSync = backgroundSync.status.subscribe(status => {
      githubSyncStatus = status.state;
      githubLastSyncTime = status.lastSyncTime;
      githubSyncError = status.error;
    });

    // Watch for authentication changes to start/stop background sync
    const unsubscribeAuth = isAuthenticated.subscribe(auth => {
      if (auth && !backgroundSync.isSyncInProgress()) {
        backgroundSync.start(30000);
        console.log('Background sync service started (auth changed)');
      } else if (!auth) {
        backgroundSync.stop();
        console.log('Background sync service stopped (auth changed)');
      }
    });

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

    // Check if this is first visit - auto-show template gallery
    const hasVisited = localStorage.getItem(FIRST_VISIT_KEY);
    if (!hasVisited && !$currentStory) {
      hasSeenTemplates = localStorage.getItem('whisker-has-seen-templates') === 'true';
      if (!hasSeenTemplates) {
        // Small delay to let welcome screen render first
        setTimeout(() => {
          showTemplateGallery = true;
          localStorage.setItem('whisker-has-seen-templates', 'true');
        }, 500);
      }
      localStorage.setItem(FIRST_VISIT_KEY, 'true');
    }

    // Cleanup auto-save, background sync, and event listener on unmount
    return () => {
      autoSaveManager.stop();
      backgroundSync.stop();
      unsubscribeSync();
      unsubscribeAuth();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="flex flex-col h-screen bg-white dark:bg-gray-900">
  {#if !$focusMode && !$isMobile}
    <MenuBar
      onNew={handleNewProject}
      onOpen={handleOpenProject}
      onSave={handleSaveProject}
      onSaveAs={handleSaveAs}
      onOpenRecent={handleOpenRecent}
      onStoryInfo={() => showMetadataEditor = true}
      onSettings={() => showSettings = true}
      onManageAssets={handleManageAssets}
      onManageAudio={handleManageAudio}
      onManageAnimations={handleManageAnimations}
      onManageStylesheets={handleManageStylesheets}
      onSaveToGitHub={handleSaveToGitHub}
      onLoadFromGitHub={handleLoadFromGitHub}
      onViewCommitHistory={handleViewCommitHistory}
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

  <!-- View Mode Switcher & Panel Controls (hidden on mobile) -->
  {#if $currentStory && !$isMobile}
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
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.characters ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('characters')}
            aria-label="Toggle character manager panel"
            aria-pressed={$panelVisibility.characters}
            title="Toggle Character Manager Panel"
          >
            👥 Characters
          </button>
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.wordGoals ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('wordGoals')}
            aria-label="Toggle word goals panel"
            aria-pressed={$panelVisibility.wordGoals}
            title="Toggle Word Goals Panel"
          >
            🎯 Goals
          </button>
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.collaboration ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('collaboration')}
            aria-label="Toggle collaboration panel"
            aria-pressed={$panelVisibility.collaboration}
            title="Toggle Collaboration Panel"
          >
            👥 Collab
          </button>
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.pacing ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('pacing')}
            aria-label="Toggle pacing analyzer panel"
            aria-pressed={$panelVisibility.pacing}
            title="Toggle Pacing Analyzer Panel"
          >
            📊 Pacing
          </button>
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.accessibility ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('accessibility')}
            aria-label="Toggle accessibility checker panel"
            aria-pressed={$panelVisibility.accessibility}
            title="Toggle Accessibility Checker Panel"
          >
            ♿ A11y
          </button>
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.playtest ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('playtest')}
            aria-label="Toggle playtest recording panel"
            aria-pressed={$panelVisibility.playtest}
            title="Toggle Playtest Recording Panel"
          >
            🎮 Playtest
          </button>
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.dependencies ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('dependencies')}
            aria-label="Toggle variable dependency panel"
            aria-pressed={$panelVisibility.dependencies}
            title="Toggle Variable Dependency Panel"
          >
            🔗 Dependencies
          </button>
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.saveSystem ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('saveSystem')}
            aria-label="Toggle save system generator panel"
            aria-pressed={$panelVisibility.saveSystem}
            title="Toggle Save System Generator Panel"
          >
            💾 Save System
          </button>
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.achievements ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('achievements')}
            aria-label="Toggle achievements panel"
            aria-pressed={$panelVisibility.achievements}
            title="Toggle Achievements Panel"
          >
            🏆 Achievements
          </button>
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.adaptiveDifficulty ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('adaptiveDifficulty')}
            aria-label="Toggle adaptive difficulty panel"
            aria-pressed={$panelVisibility.adaptiveDifficulty}
            title="Toggle Adaptive Difficulty Panel"
          >
            ⚖️ Difficulty
          </button>
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.versionDiff ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('versionDiff')}
            aria-label="Toggle version comparison panel"
            aria-pressed={$panelVisibility.versionDiff}
            title="Toggle Version Comparison Panel"
          >
            📊 Versions
          </button>

          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.mobileExport ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('mobileExport')}
            aria-label="Toggle mobile export panel"
            aria-pressed={$panelVisibility.mobileExport}
            title="Toggle Mobile Export Panel"
          >
            📱 Mobile
          </button>

          <button
            type="button"
            class="px-2 py-1 text-xs rounded {$panelVisibility.aiWriting ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => viewPreferencesActions.togglePanel('aiWriting')}
            aria-label="Toggle AI writing assistant panel"
            aria-pressed={$panelVisibility.aiWriting}
            title="Toggle AI Writing Assistant Panel"
          >
            ✨ AI
          </button>
        </div>

        <!-- Divider -->
        <div class="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

        <!-- Stats Widget Toggle -->
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-2 py-1 text-xs rounded {showStatsWidget ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}"
            on:click={() => showStatsWidget = !showStatsWidget}
            aria-label="Toggle stats widget"
            aria-pressed={showStatsWidget}
            title="Toggle Stats Widget"
          >
            📊 Widget
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

  <!-- Breadcrumb Navigation (show when not in focus mode or mobile) -->
  {#if $currentStory && !$focusMode && !$isMobile}
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

          <!-- Right: Variable Manager, Validation, Tag Manager, Statistics, Snippets, Characters, Word Goals, Collaboration, Pacing & Accessibility -->
          {#if ($panelVisibility.variables || $panelVisibility.validation || $panelVisibility.tagManager || $panelVisibility.statistics || $panelVisibility.snippets || $panelVisibility.characters || $panelVisibility.wordGoals || $panelVisibility.collaboration || $panelVisibility.pacing || $panelVisibility.accessibility || $panelVisibility.playtest || $panelVisibility.dependencies || $panelVisibility.saveSystem || $panelVisibility.achievements || $panelVisibility.adaptiveDifficulty || $panelVisibility.versionDiff || $panelVisibility.mobileExport || $panelVisibility.aiWriting) && !$focusMode}
            <ResizeHandle on:resize={handleVariablesResize} />
            <div class="flex-shrink-0 flex flex-col" style="width: {$panelSizes.variablesWidth}px;">
              {#if $panelVisibility.variables}
                <div style="height: {$panelSizes.variablesHeight}px;" class="border-b border-gray-300 dark:border-gray-700">
                  <VariableManager />
                </div>
                {#if $panelVisibility.validation || $panelVisibility.tagManager || $panelVisibility.statistics || $panelVisibility.snippets || $panelVisibility.characters || $panelVisibility.wordGoals || $panelVisibility.collaboration || $panelVisibility.pacing || $panelVisibility.accessibility || $panelVisibility.playtest}
                  <ResizeHandle orientation="horizontal" on:resize={handleVariablesHeightResize} />
                {/if}
              {/if}
              {#if $panelVisibility.validation}
                <div class="flex-1 min-h-0 {($panelVisibility.tagManager || $panelVisibility.statistics || $panelVisibility.snippets || $panelVisibility.characters || $panelVisibility.wordGoals || $panelVisibility.collaboration || $panelVisibility.pacing || $panelVisibility.accessibility || $panelVisibility.playtest || $panelVisibility.dependencies || $panelVisibility.saveSystem || $panelVisibility.achievements || $panelVisibility.adaptiveDifficulty || $panelVisibility.versionDiff || $panelVisibility.mobileExport || $panelVisibility.aiWriting) ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <ValidationPanel />
                </div>
              {/if}
              {#if $panelVisibility.tagManager}
                <div class="flex-1 min-h-0 {$panelVisibility.statistics || $panelVisibility.snippets || $panelVisibility.characters || $panelVisibility.wordGoals || $panelVisibility.collaboration || $panelVisibility.pacing || $panelVisibility.accessibility || $panelVisibility.playtest ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <TagManager />
                </div>
              {/if}
              {#if $panelVisibility.statistics}
                <div class="flex-1 min-h-0 {$panelVisibility.snippets || $panelVisibility.characters || $panelVisibility.wordGoals || $panelVisibility.collaboration || $panelVisibility.pacing || $panelVisibility.accessibility || $panelVisibility.playtest ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <StoryStatisticsPanel />
                </div>
              {/if}
              {#if $panelVisibility.snippets}
                <div class="flex-1 min-h-0 {$panelVisibility.characters || $panelVisibility.wordGoals || $panelVisibility.collaboration || $panelVisibility.pacing || $panelVisibility.accessibility || $panelVisibility.playtest ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <SnippetsPanel />
                </div>
              {/if}
              {#if $panelVisibility.characters}
                <div class="flex-1 min-h-0 {$panelVisibility.wordGoals || $panelVisibility.collaboration || $panelVisibility.pacing || $panelVisibility.accessibility || $panelVisibility.playtest ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <CharacterManager />
                </div>
              {/if}
              {#if $panelVisibility.wordGoals}
                <div class="flex-1 min-h-0 {$panelVisibility.collaboration || $panelVisibility.pacing || $panelVisibility.accessibility || $panelVisibility.playtest ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <WordGoalsPanel />
                </div>
              {/if}
              {#if $panelVisibility.collaboration}
                <div class="flex-1 min-h-0 {$panelVisibility.pacing || $panelVisibility.accessibility || $panelVisibility.playtest ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <CollaborationPanel />
                </div>
              {/if}
              {#if $panelVisibility.pacing}
                <div class="flex-1 min-h-0 {$panelVisibility.accessibility || $panelVisibility.playtest ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <PacingAnalyzerPanel />
                </div>
              {/if}
              {#if $panelVisibility.accessibility}
                <div class="flex-1 min-h-0 {$panelVisibility.playtest ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <AccessibilityPanel />
                </div>
              {/if}
              {#if $panelVisibility.playtest}
                <div class="flex-1 min-h-0 {$panelVisibility.dependencies ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <PlaytestPanel />
                </div>
              {/if}
              {#if $panelVisibility.dependencies}
                <div class="flex-1 min-h-0 {$panelVisibility.saveSystem || $panelVisibility.achievements || $panelVisibility.adaptiveDifficulty || $panelVisibility.versionDiff || $panelVisibility.mobileExport || $panelVisibility.aiWriting ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <VariableDependencyPanel />
                </div>
              {/if}
              {#if $panelVisibility.saveSystem}
                <div class="flex-1 min-h-0 {$panelVisibility.achievements || $panelVisibility.adaptiveDifficulty || $panelVisibility.versionDiff || $panelVisibility.mobileExport || $panelVisibility.aiWriting ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <SaveSystemPanel />
                </div>
              {/if}
              {#if $panelVisibility.achievements}
                <div class="flex-1 min-h-0 {$panelVisibility.adaptiveDifficulty || $panelVisibility.versionDiff || $panelVisibility.mobileExport || $panelVisibility.aiWriting ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <AchievementPanel />
                </div>
              {/if}
              {#if $panelVisibility.adaptiveDifficulty}
                <div class="flex-1 min-h-0 {$panelVisibility.versionDiff || $panelVisibility.mobileExport || $panelVisibility.aiWriting ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <AdaptiveDifficultyPanel />
                </div>
              {/if}
              {#if $panelVisibility.versionDiff}
                <div class="flex-1 min-h-0 {$panelVisibility.mobileExport || $panelVisibility.aiWriting ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <VersionDiffPanel />
                </div>
              {/if}
              {#if $panelVisibility.mobileExport}
                <div class="flex-1 min-h-0 {$panelVisibility.aiWriting ? 'border-b border-gray-300 dark:border-gray-700' : ''}">
                  <MobileExportPanel />
                </div>
              {/if}
              {#if $panelVisibility.aiWriting}
                <div class="flex-1 min-h-0">
                  <AIWritingPanel />
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

  <!-- GitHub Sync Status -->
  {#if $isAuthenticated && githubRepositoryName}
    <div class="fixed bottom-4 left-4 z-10">
      <GitHubSyncStatus
        repositoryName={githubRepositoryName}
        syncStatus={githubSyncStatus}
        lastSyncTime={githubLastSyncTime}
        errorMessage={githubSyncError}
      />
    </div>
  {/if}

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

  <!-- Story Stats Widget -->
  {#if $currentStory && !$focusMode && !$isMobile}
    <StoryStatsWidget bind:show={showStatsWidget} />
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

<QuickShortcutsOverlay bind:show={showQuickShortcuts} />

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

{#if showAssetManager}
  <AssetManager on:close={() => showAssetManager = false} />
{/if}

{#if showAudioControls}
  <AudioControls audioManager={audioManager} on:close={() => showAudioControls = false} />
{/if}

{#if showAnimationControls}
  <AnimationControls on:close={() => showAnimationControls = false} />
{/if}

{#if showStylesheetEditor}
  <StylesheetEditor on:close={() => showStylesheetEditor = false} />
{/if}

{#if showGitHubCallback}
  <GitHubCallback
    code={githubCallbackCode}
    state={githubCallbackState}
    onComplete={() => {
      showGitHubCallback = false;
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }}
  />
{/if}

{#if showGitHubPicker}
  <GitHubRepositoryPicker
    bind:show={showGitHubPicker}
    mode={githubPickerMode}
    defaultFilename={$currentStory?.metadata?.title ? `${$currentStory.metadata.title}.json` : 'story.json'}
    on:select={handleRepositorySelect}
  />
{/if}

{#if showCommitHistory}
  <GitHubCommitHistory
    bind:show={showCommitHistory}
    owner={commitHistoryOwner}
    repo={commitHistoryRepo}
    path={commitHistoryPath}
    on:revert={handleCommitRevert}
  />
{/if}

{#if showConflictResolver}
  <GitHubConflictResolver
    bind:show={showConflictResolver}
    localVersion={conflictLocalVersion}
    remoteVersion={conflictRemoteVersion}
    localModified={conflictLocalModified}
    remoteModified={conflictRemoteModified}
    on:resolve={handleConflictResolve}
  />
{/if}

{#if isLoading}
  <div class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-xl p-8">
      <LoadingSpinner message={loadingMessage} size="large" />
    </div>
  </div>
{/if}
