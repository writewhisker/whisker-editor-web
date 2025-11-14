import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 3 : undefined,
  reporter: 'html',
  timeout: 30000, // 30 seconds per test
  use: {
    baseURL: 'http://localhost:5173/whisker-editor-web/',
    trace: 'on-first-retry',
    actionTimeout: 10000, // 10 seconds for actions
    navigationTimeout: 15000, // 15 seconds for navigation
  },

  projects: process.env.CI
    ? [
        // In CI, only test on Chromium for speed
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    : [
        // Locally, test all browsers
        {
          name: 'chromium',
          use: { ...devices['Desktop Chrome'] },
        },
        {
          name: 'firefox',
          use: { ...devices['Desktop Firefox'] },
        },
        {
          name: 'webkit',
          use: { ...devices['Desktop Safari'] },
        },
        // Edge testing disabled on macOS - not supported
        // Enable on Windows/Linux by uncommenting:
        // {
        //   name: 'edge',
        //   use: {
        //     ...devices['Desktop Edge'],
        //     channel: 'msedge',
        //   },
        // },
      ],

  webServer: {
    command: 'pnpm exec vite',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
