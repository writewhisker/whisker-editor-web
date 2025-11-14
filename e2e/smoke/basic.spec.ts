import { test, expect } from '@playwright/test';
import { createNewProject } from '../helpers';

test.describe('Smoke Tests - Basic Functionality', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');

    // Wait for app to be ready
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Verify the app loaded
    await expect(page).toHaveTitle(/Whisker/i);
  });

  test('should create a new story', async ({ page }) => {
    // Listen to console messages
    page.on('console', msg => {
      console.log(`[BROWSER ${msg.type()}]:`, msg.text());
    });

    await createNewProject(page);

    // Verify we have a story with a start passage
    await expect(page.locator('text=Start')).toBeVisible({ timeout: 5000 });
  });

  test('should add a new passage', async ({ page }) => {
    await createNewProject(page);

    // Click add passage button
    const addButton = page.locator('button:has-text("+ Add")');
    await addButton.click();

    // Wait for new passage to appear
    await page.waitForTimeout(1000);

    // Verify passage was created
    await expect(page.locator('text=Untitled Passage')).toBeVisible();
  });

  test('should edit passage content', async ({ page }) => {
    await createNewProject(page);

    // Click on the Start passage
    await page.click('text=Start');
    await page.waitForTimeout(500);

    // Try to find and interact with content editor
    // This is a basic check that editing UI is present
    const editorPresent = await page.locator('[class*="editor"]').count() > 0 ||
                          await page.locator('textarea').count() > 0 ||
                          await page.locator('[contenteditable]').count() > 0;

    expect(editorPresent).toBeTruthy();
  });
});
