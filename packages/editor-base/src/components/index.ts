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

// AI components (Phase 3c)
export { default as AIContentGenerator } from './ai/AIContentGenerator.svelte';
export { default as AIPromptTemplates } from './ai/AIPromptTemplates.svelte';
export { default as AISettingsPanel } from './ai/AISettingsPanel.svelte';
export { default as AIStoryAnalyzer } from './ai/AIStoryAnalyzer.svelte';
export { default as AIWritingAssistant } from './ai/AIWritingAssistant.svelte';

// Analytics components (Phase 3c)
export { default as AnalyticsDashboard } from './analytics/AnalyticsDashboard.svelte';
export { default as IssueList } from './analytics/IssueList.svelte';
export { default as PlaythroughAnalyticsPanel } from './analytics/PlaythroughAnalyticsPanel.svelte';
export { default as PlaythroughList } from './analytics/PlaythroughList.svelte';
export { default as StoryFlowAnalyticsPanel } from './analytics/StoryFlowAnalyticsPanel.svelte';
export { default as StoryMetrics } from './analytics/StoryMetrics.svelte';

// Animation components (Phase 3c)
export { default as AnimationControls } from './animation/AnimationControls.svelte';

// Audio components (Phase 3c)
export { default as AudioControls } from './audio/AudioControls.svelte';

// Auth components (Phase 3c)
export { default as AuthDialog } from './auth/AuthDialog.svelte';

// Comparison components (Phase 3c)
export { default as StoryComparisonView } from './comparison/StoryComparisonView.svelte';

// Editor components (Phase 3c)
export { default as AssetManager } from './editor/AssetManager.svelte';
export { default as MetadataEditor } from './editor/MetadataEditor.svelte';
export { default as MonacoEditor } from './editor/MonacoEditor.svelte';
export { default as ScriptEditor } from './editor/ScriptEditor.svelte';
export { default as StylesheetEditor } from './editor/StylesheetEditor.svelte';
export { default as ValidationPanel } from './editor/ValidationPanel.svelte';

// Export/Import components (Phase 3c)
export { default as ExportPanel } from './export/ExportPanel.svelte';
export { default as ImportDialog } from './export/ImportDialog.svelte';
export { default as ImportPreviewPanel } from './export/ImportPreviewPanel.svelte';

// Help components (Phase 3c)
export { default as KeyboardShortcutsHelp } from './help/KeyboardShortcutsHelp.svelte';
export { default as QuickShortcutsOverlay } from './help/QuickShortcutsOverlay.svelte';

// Interactive components (Phase 3c)
export { default as ImageHotspot } from './interactive/ImageHotspot.svelte';
export { default as NumberInput } from './interactive/NumberInput.svelte';
export { default as Quiz } from './interactive/Quiz.svelte';
export { default as TextInput } from './interactive/TextInput.svelte';

// Kids mode components (Phase 3c)
export { default as AgeGroupSelector } from './kids/AgeGroupSelector.svelte';
export { default as KidsExportDialog } from './kids/KidsExportDialog.svelte';
export { default as KidsMenuBar } from './kids/KidsMenuBar.svelte';
export { default as KidsModeApp } from './kids/KidsModeApp.svelte';
export { default as KidsParentalControlsPanel } from './kids/KidsParentalControlsPanel.svelte';
export { default as KidsSharePanel } from './kids/KidsSharePanel.svelte';
export { default as KidsTemplateGallery } from './kids/KidsTemplateGallery.svelte';
export { default as KidsToolbar } from './kids/KidsToolbar.svelte';
export { default as MinecraftAssetPicker } from './kids/MinecraftAssetPicker.svelte';
export { default as RobloxAssetPicker } from './kids/RobloxAssetPicker.svelte';
export { default as VisualScriptEditor } from './kids/VisualScriptEditor.svelte';

// Metrics components (Phase 3c)
export { default as StoryMetricsDashboard } from './metrics/StoryMetricsDashboard.svelte';

// Onboarding components (Phase 3c)
export { default as OnboardingWizard } from './onboarding/OnboardingWizard.svelte';
export { default as TemplateGallery } from './onboarding/TemplateGallery.svelte';

// Player components (Phase 3c)
export { default as TimedChoice } from './player/TimedChoice.svelte';

// Publishing components (Phase 3c)
export { default as PublishDialog } from './publishing/PublishDialog.svelte';
export { default as SharingTools } from './publishing/SharingTools.svelte';

// Scripting components (Phase 3c)
export { default as FunctionLibraryPanel } from './scripting/FunctionLibraryPanel.svelte';
export { default as LuaConsole } from './scripting/LuaConsole.svelte';
export { default as VisualScriptBuilder } from './scripting/VisualScriptBuilder.svelte';

// Settings components (Phase 3c)
export { default as StorageSettings } from './settings/StorageSettings.svelte';
export { default as SyncSettings } from './settings/SyncSettings.svelte';
export { default as TelemetryPanel } from './settings/TelemetryPanel.svelte';
