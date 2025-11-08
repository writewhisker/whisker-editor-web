/**
 * Editor components
 */

// Core UI (Phase 2e-2, 2e-5)
export { default as MenuBar } from './MenuBar.svelte';
export { default as Toolbar } from './Toolbar.svelte';
export { default as StatusBar } from './StatusBar.svelte';
export { default as Breadcrumb } from './Breadcrumb.svelte';

// Dialogs (Phase 2e-1)
export { default as FileDialog } from './FileDialog.svelte';
export { default as ConfirmDialog } from './ConfirmDialog.svelte';
export { default as AboutDialog } from './AboutDialog.svelte';
export { default as FindReplaceDialog } from './FindReplaceDialog.svelte';

// Data management (Phase 2e-4)
export { default as TagInput } from './TagInput.svelte';
export { default as StoryMetadataEditor } from './StoryMetadataEditor.svelte';
export { default as PassagePreview } from './PassagePreview.svelte';

// Utilities (Phase 2e-1)
export { default as LoadingSpinner } from './LoadingSpinner.svelte';
export { default as ErrorBoundary } from './ErrorBoundary.svelte';
export { default as NotificationToast } from './NotificationToast.svelte';
export { default as ResizeHandle } from './ResizeHandle.svelte';

// GitHub integration (Phase 2e-5)
export { default as GitHubConnect } from './github/GitHubConnect.svelte';
