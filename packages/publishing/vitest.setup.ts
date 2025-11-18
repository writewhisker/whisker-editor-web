// Vitest setup file for publishing package
// This file runs before tests to configure the test environment

import { vi } from 'vitest';

// Mock @writewhisker/editor-base to avoid loading Svelte components in Node tests
vi.mock('@writewhisker/editor-base', () => ({
  StaticSiteExporter: vi.fn(() => ({
    export: vi.fn(async (story) => ({
      'index.html': '<html><body>Test</body></html>',
      'styles.css': 'body { margin: 0; }',
    })),
  })),
}));
