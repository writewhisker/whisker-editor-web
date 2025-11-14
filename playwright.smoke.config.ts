import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke test configuration for CI
 * Runs only critical path tests to verify basic functionality
 */
export default defineConfig({
  testDir: './e2e/smoke',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: 'html',
  timeout: 60000, // 60 seconds per test (more generous for CI)
  use: {
    baseURL: 'http://localhost:5173/whisker-editor-web/',
    trace: 'on-first-retry',
    actionTimeout: 15000, // 15 seconds for actions
    navigationTimeout: 20000, // 20 seconds for navigation
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm exec vite',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
