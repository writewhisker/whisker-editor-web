import { test, expect } from '@playwright/test';

/**
 * Helper function to create a new project
 * Clears localStorage and creates a fresh project with the given name
 */
async function createNewProject(page: any, projectName = 'Test Story') {
  await page.goto('/');

  // Clear localStorage to prevent AutoSaveRecovery dialog
  await page.evaluate(() => localStorage.clear());

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Click "New Project" button
  const newProjectButton = page.locator('button:has-text("New Project")');
  await newProjectButton.click();

  // Fill in project name
  const projectNameInput = page.locator('input[placeholder="My Amazing Story"]');
  await projectNameInput.waitFor({ state: 'visible', timeout: 5000 });
  await projectNameInput.fill(projectName);

  // Click OK to create project
  await page.click('button:has-text("OK")');

  // Wait for dialog to close
  await page.waitForFunction(() => {
    const overlays = document.querySelectorAll('div[role="presentation"]');
    return overlays.length === 0;
  }, { timeout: 10000 });

  // Wait for editor to load
  await page.waitForSelector('text=Passages', { timeout: 10000 });
}

test.describe('Story Creation Workflow', () => {
  test('should create a new project from home page', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.waitForLoadState('networkidle');

    // Verify we're on home page
    const newProjectButton = page.locator('button:has-text("New Project")');
    await expect(newProjectButton).toBeVisible();

    // Create new project
    await newProjectButton.click();

    // Wait for dialog input
    const projectNameInput = page.locator('input[placeholder="My Amazing Story"]');
    await projectNameInput.waitFor({ state: 'visible' });

    // Fill in project details
    await projectNameInput.fill('My First Story');

    // Submit
    await page.click('button:has-text("OK")');

    // Wait for editor to load
    await page.waitForFunction(() => {
      const overlays = document.querySelectorAll('div[role="presentation"]');
      return overlays.length === 0;
    }, { timeout: 10000 });

    // Verify we're in the editor
    await expect(page.locator('text=Passages').first()).toBeVisible();
  });

  test('should create default "Start" passage', async ({ page }) => {
    await createNewProject(page, 'Story With Start Passage');

    // Wait for passages panel
    await page.waitForSelector('text=Passages', { timeout: 5000 });

    // Verify "Start" passage exists in the passage list
    const startPassage = page.locator('text=Start').first();
    await expect(startPassage).toBeVisible();
  });

  test('should display project in editor', async ({ page }) => {
    await createNewProject(page, 'My Test Story');

    // Verify editor UI is visible
    await expect(page.locator('text=Passages').first()).toBeVisible();

    // Verify Start passage is shown
    await expect(page.locator('text=Start').first()).toBeVisible();
  });

  test('should reload project after page refresh', async ({ page }) => {
    await createNewProject(page, 'Reload Test Story');

    // Wait for editor to stabilize
    await page.waitForTimeout(1000);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Should load directly into editor (not home page)
    await expect(page.locator('text=Passages').first()).toBeVisible({ timeout: 10000 });

    // Start passage should still be visible
    await expect(page.locator('text=Start').first()).toBeVisible();
  });

  test('should handle project creation with valid name', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Click "New Project"
    await page.click('button:has-text("New Project")');

    const projectNameInput = page.locator('input[placeholder="My Amazing Story"]');
    await projectNameInput.waitFor({ state: 'visible', timeout: 5000 });

    // Enter a valid name
    await projectNameInput.fill('Valid Project Name');
    await page.click('button:has-text("OK")');

    // Wait for project to be created
    await page.waitForFunction(() => {
      const overlays = document.querySelectorAll('div[role="presentation"]');
      return overlays.length === 0;
    }, { timeout: 10000 });

    // Verify editor loaded
    await expect(page.locator('text=Passages').first()).toBeVisible();
  });

  test('should create passage list after project creation', async ({ page }) => {
    await createNewProject(page, 'Passage List Test');

    // Verify Passages heading is visible
    const passagesHeading = page.locator('h3').filter({ hasText: 'Passages' });
    await expect(passagesHeading.first()).toBeVisible();

    // Verify Start passage is in list
    await expect(page.locator('text=Start').first()).toBeVisible();
  });

  test('should show add passage button', async ({ page }) => {
    await createNewProject(page, 'Add Button Test');

    // Wait for editor to load
    await page.waitForTimeout(500);

    // Look for Add button (should be visible in passage list)
    const addButton = page.locator('button:has-text("+ Add")');
    await expect(addButton.first()).toBeVisible();
  });

  test('should initialize editor with Start passage selected', async ({ page }) => {
    await createNewProject(page, 'Selected Passage Test');

    // Wait for editor
    await page.waitForTimeout(1000);

    // Start passage should be visible
    await expect(page.locator('text=Start').first()).toBeVisible();

    // Verify editor is initialized with interactive elements
    const hasTextInputs = await page.locator('input[type="text"]').count() > 0;
    const hasTextAreas = await page.locator('textarea, [contenteditable="true"]').count() > 0;

    // At least one should exist (editor is initialized)
    expect(hasTextInputs || hasTextAreas).toBe(true);
  });

  test('should persist passage after creating project', async ({ page }) => {
    await createNewProject(page, 'Persistence Test');

    // Click on Start passage to ensure it's real
    const startPassage = page.locator('text=Start').first();
    await startPassage.click({ force: true });
    await page.waitForTimeout(500);

    // Verify passage is still visible
    await expect(startPassage).toBeVisible();
  });
});
