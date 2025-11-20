/**
 * @writewhisker/editor-base
 *
 * Editor platform for Whisker.
 * Includes stores, components, services, export/import, and plugin system.
 *
 * This package acts as a central hub, re-exporting functionality from
 * specialized packages for convenient use in full editor applications.
 */

// ============================================================================
// CORE PACKAGES - Pure Re-exports
// ============================================================================

// Core story models and utilities
export * from '@writewhisker/core-ts';

// Storage adapters and persistence
export * from '@writewhisker/storage';

// Import formats
export * from '@writewhisker/import';

// Export formats
export * from '@writewhisker/export';

// Analytics and metrics
export * from '@writewhisker/analytics';

// Audio system
export * from '@writewhisker/audio';

// Scripting (Lua integration)
export * from '@writewhisker/scripting';

// GitHub integration
export * from '@writewhisker/github';

// ============================================================================
// EDITOR-SPECIFIC EXPORTS
// ============================================================================

// Editor stores (Svelte reactive state)
export * from './stores';

// Editor components (Svelte UI components)
export * from './components';

// Editor services (collaboration, etc.)
export * from './services';

// Editor utilities
export * from './utils';

// Plugin system
export * from './plugins';

// Editor-specific types
export * from './types';
