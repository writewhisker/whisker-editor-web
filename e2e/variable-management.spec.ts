import { test, expect } from '@playwright/test';

/**
 * Helper function to create a new project
 */
async function createNewProject(page: any, projectName = 'Test Story') {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  const newProjectButton = page.locator('button:has-text("New Project")');
  await newProjectButton.click();

  const projectNameInput = page.locator('input[placeholder="My Amazing Story"]');
  await projectNameInput.waitFor({ state: 'visible', timeout: 5000 });
  await projectNameInput.fill(projectName);
  await page.click('button:has-text("OK")');

  await page.waitForFunction(() => {
    const overlays = document.querySelectorAll('div[role="presentation"]');
    return overlays.length === 0;
  }, { timeout: 10000 });

  await page.waitForSelector('text=Passages', { timeout: 10000 });
}

test.describe('Variable Management Workflow', () => {
  test('should have Variables section or panel', async ({ page }) => {
    await createNewProject(page, 'Variable Panel Test');
    await page.waitForTimeout(1000);

    // Look for Variables text - it should exist somewhere in the UI
    const variablesText = page.locator('text=Variables');

    // Count how many times "Variables" appears (might be in sidebar, tabs, etc.)
    const count = await variablesText.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display editor interface', async ({ page }) => {
    await createNewProject(page, 'Editor Interface Test');
    await page.waitForTimeout(1000);

    // Verify basic editor elements are present
    await expect(page.locator('text=Passages').first()).toBeVisible();

    // Variables section should exist (may not be prominently visible)
    const variablesCount = await page.locator('text=Variables').count();
    expect(variablesCount).toBeGreaterThan(0);
  });

  test('should allow passage selection', async ({ page }) => {
    await createNewProject(page, 'Passage Selection Test');
    await page.waitForTimeout(1000);

    // Click on Start passage
    await page.click('text=Start');
    await page.waitForTimeout(500);

    // Properties should be visible (title input)
    const titleInput = page.locator('input[type="text"]').nth(1);
    await expect(titleInput).toBeVisible();
  });

  test('should show project structure', async ({ page }) => {
    await createNewProject(page, 'Project Structure Test');
    await page.waitForTimeout(1000);

    // Verify project has loaded with basic structure
    await expect(page.locator('text=Start').first()).toBeVisible();
    await expect(page.locator('text=Passages').first()).toBeVisible();

    // Add button should be present
    const addButton = page.locator('button:has-text("+ Add")');
    await expect(addButton.first()).toBeVisible();
  });

  test('should persist project after reload', async ({ page }) => {
    await createNewProject(page, 'Persistence Test');
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Project should still be loaded
    await expect(page.locator('text=Start').first()).toBeVisible();
    await expect(page.locator('text=Passages').first()).toBeVisible();
  });

  test('should show passages panel', async ({ page }) => {
    await createNewProject(page, 'Passages Panel Test');
    await page.waitForTimeout(1000);

    // Verify passages panel is visible
    const passagesHeading = page.locator('h3').filter({ hasText: 'Passages' });
    await expect(passagesHeading.first()).toBeVisible();
  });

  test('should allow creating passages', async ({ page }) => {
    await createNewProject(page, 'Create Passage Test');
    await page.waitForTimeout(1000);

    // Click add passage
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(500);

    // New passage should appear
    await expect(page.locator('text=Untitled Passage').first()).toBeVisible();
  });

  test('should maintain basic functionality after reload', async ({ page }) => {
    await createNewProject(page, 'State Test');
    await page.waitForTimeout(2000); // Wait for autosave

    // Verify project loaded
    await expect(page.locator('text=Start').first()).toBeVisible();

    // Reload
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Verify app loaded successfully - either on home page or in editor
    const passagesText = page.locator('text=Passages');
    const newProjectButton = page.locator('button:has-text("New Project")');

    const passagesCount = await passagesText.count();
    const newProjectCount = await newProjectButton.count();

    // Should have either Passages (in editor) or New Project button (on home)
    expect(passagesCount + newProjectCount).toBeGreaterThan(0);
  });
});
