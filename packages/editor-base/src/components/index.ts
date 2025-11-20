/**
 * Editor components
 */

// Core UI (Phase 2e-2, 2e-5, 2e-6, 2e-8)
export { default as MenuBar } from './MenuBar.svelte';
export { default as Toolbar } from './Toolbar.svelte';
export { default as StatusBar } from './StatusBar.svelte';
export { default as Breadcrumb } from './Breadcrumb.svelte';
export { default as PassageList } from './PassageList.svelte';
export { default as SearchBar } from './SearchBar.svelte';
export { default as GraphView } from './GraphView.svelte';

// Graph subcomponents (Phase 2e-8)
export { default as PassageNode } from './graph/PassageNode.svelte';
export { default as ConnectionEdge } from './graph/ConnectionEdge.svelte';
export { default as GraphViewZoomControl } from './graph/GraphViewZoomControl.svelte';
export { default as MobileToolbar } from './graph/MobileToolbar.svelte';

// Dialogs (Phase 2e-1, 2e-8, 3b)
export { default as FileDialog } from './FileDialog.svelte';
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
export { default as AboutDialog } from './AboutDialog.svelte';
export { default as FindReplaceDialog } from './FindReplaceDialog.svelte';
export { default as SettingsDialog } from './SettingsDialog.svelte';
export { default as PassageTemplateDialog } from './PassageTemplateDialog.svelte';

// Panels (Phase 2e-8, 3b)
export { default as PropertiesPanel } from './PropertiesPanel.svelte';
export { default as PreviewPanel } from './PreviewPanel.svelte';
export { default as StorySettingsPanel } from './StorySettingsPanel.svelte';
export { default as CommandPalette } from './CommandPalette.svelte';
export { default as AccessibilityPanel } from './AccessibilityPanel.svelte';
export { default as AchievementPanel } from './AchievementPanel.svelte';
export { default as AdaptiveDifficultyPanel } from './AdaptiveDifficultyPanel.svelte';
export { default as AIWritingPanel } from './AIWritingPanel.svelte';
export { default as CharacterManager } from './CharacterManager.svelte';
export { default as CollaborationPanel } from './CollaborationPanel.svelte';

// Collaboration components (Phase 4D)
export { default as ChangeHistory } from './collaboration/ChangeHistory.svelte';
export { default as CommentPanel } from './collaboration/CommentPanel.svelte';
export { default as CommentThread } from './collaboration/CommentThread.svelte';
export { default as DiffViewer } from './collaboration/DiffViewer.svelte';
export { default as ConflictResolutionDialog } from './collaboration/ConflictResolutionDialog.svelte';
export { default as MergeTool } from './collaboration/MergeTool.svelte';
export { default as MobileExportPanel } from './MobileExportPanel.svelte';
export { default as PacingAnalyzerPanel } from './PacingAnalyzerPanel.svelte';
export { default as PlaytestPanel } from './PlaytestPanel.svelte';
export { default as PluginManagerPanel } from './PluginManagerPanel.svelte';
export { default as SaveSystemPanel } from './SaveSystemPanel.svelte';
export { default as SnippetsPanel } from './SnippetsPanel.svelte';
export { default as StoryStatisticsPanel } from './StoryStatisticsPanel.svelte';
export { default as StoryStatsWidget } from './StoryStatsWidget.svelte';
export { default as TagManager } from './TagManager.svelte';
export { default as VariableDependencyPanel } from './VariableDependencyPanel.svelte';
export { default as VariableManager } from './VariableManager.svelte';
export { default as VersionDiffPanel } from './VersionDiffPanel.svelte';
export { default as WordGoalsPanel } from './WordGoalsPanel.svelte';

// Data management (Phase 2e-4)
export { default as TagInput } from './TagInput.svelte';
export { default as StoryMetadataEditor } from './StoryMetadataEditor.svelte';
export { default as PassagePreview } from './PassagePreview.svelte';

// Utilities (Phase 2e-1, 3b)
export { default as LoadingSpinner } from './LoadingSpinner.svelte';
export { default as ErrorBoundary } from './ErrorBoundary.svelte';
export { default as NotificationToast } from './NotificationToast.svelte';
export { default as ResizeHandle } from './ResizeHandle.svelte';
export { default as AutoSaveRecovery } from './AutoSaveRecovery.svelte';

// GitHub integration (Phase 2e-5)
export { default as GitHubConnect } from './github/GitHubConnect.svelte';
export { default as GitHubCallback } from './github/GitHubCallback.svelte';
export { default as GitHubCommitHistory } from './github/GitHubCommitHistory.svelte';
export { default as GitHubConflictResolver } from './github/GitHubConflictResolver.svelte';
export { default as GitHubRepositoryPicker } from './github/GitHubRepositoryPicker.svelte';
export { default as GitHubSyncStatus } from './github/GitHubSyncStatus.svelte';

// Export/Import (Phase 3a)
export { default as ExportPanel } from './export/ExportPanel.svelte';
export { default as ImportDialog } from './export/ImportDialog.svelte';

// Help/Documentation
export { default as KeyboardShortcutsHelp } from './help/KeyboardShortcutsHelp.svelte';
export { default as QuickShortcutsOverlay } from './help/QuickShortcutsOverlay.svelte';

// Onboarding
export { default as TemplateGallery } from './onboarding/TemplateGallery.svelte';

// Kids Mode
export { default as KidsModeApp } from './kids/KidsModeApp.svelte';

// Editor Tools
export { default as ValidationPanel } from './editor/ValidationPanel.svelte';
export { default as AssetManager } from './editor/AssetManager.svelte';
export { default as StylesheetEditor } from './editor/StylesheetEditor.svelte';

// Audio
export { default as AudioControls } from './audio/AudioControls.svelte';

// Animation
export { default as AnimationControls } from './animation/AnimationControls.svelte';
