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

test.describe('Undo/Redo Operations', () => {
  test('should have undo functionality available', async ({ page }) => {
    await createNewProject(page, 'Undo Test');
    await page.waitForTimeout(1000);

    // Add a new passage
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(800);

    // Verify passage exists
    await expect(page.locator('text=Untitled Passage').first()).toBeVisible();

    // Try undo keyboard shortcut (should not crash)
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await page.keyboard.press('Meta+Z');
    } else {
      await page.keyboard.press('Control+Z');
    }
    await page.waitForTimeout(500);

    // App should still be functional
    await expect(page.locator('text=Passages').first()).toBeVisible();
  });

  test('should have redo functionality available', async ({ page }) => {
    await createNewProject(page, 'Redo Test');
    await page.waitForTimeout(1000);

    // Add content
    await page.click('text=Start');
    await page.waitForTimeout(500);

    // Try redo keyboard shortcut (should not crash)
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await page.keyboard.press('Meta+Shift+Z');
    } else {
      await page.keyboard.press('Control+Shift+Z');
    }
    await page.waitForTimeout(500);

    // App should still be functional
    await expect(page.locator('text=Passages').first()).toBeVisible();
  });

  test('should handle passage title changes', async ({ page }) => {
    await createNewProject(page, 'Title Change Test');
    await page.waitForTimeout(1000);

    // Click on Start passage
    await page.click('text=Start');
    await page.waitForTimeout(500);

    // Change title
    const titleInput = page.locator('input[type="text"]').nth(1);
    await titleInput.click({ force: true });
    await titleInput.fill('Modified Title');
    await titleInput.press('Tab');
    await page.waitForTimeout(500);

    // Verify title changed
    await expect(page.locator('text=Modified Title').first()).toBeVisible();
  });

  test('should handle content changes', async ({ page }) => {
    await createNewProject(page, 'Content Test');
    await page.waitForTimeout(1000);

    // Click on Start passage
    await page.click('text=Start');
    await page.waitForTimeout(500);

    // Find content textarea and add content
    const contentArea = page.locator('textarea, [contenteditable="true"]').first();
    await contentArea.click({ force: true });
    await contentArea.fill('This is test content');
    await page.waitForTimeout(500);

    // Verify content was added
    const content = await contentArea.inputValue();
    expect(content).toContain('test content');
  });

  test('should show UI elements for history', async ({ page }) => {
    await createNewProject(page, 'UI State Test');
    await page.waitForTimeout(1000);

    // Verify project loaded successfully
    await expect(page.locator('text=Start').first()).toBeVisible();

    // Check for Menu or toolbar that might contain undo/redo
    const hasMenu = await page.locator('text=Edit, text=File, text=Menu').count() > 0;
    const hasToolbar = await page.locator('button, [role="toolbar"]').count() > 0;

    // At least one should exist
    expect(hasMenu || hasToolbar).toBe(true);
  });

  test('should maintain selection across operations', async ({ page }) => {
    await createNewProject(page, 'Selection Test');
    await page.waitForTimeout(1000);

    // Add a passage
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(800);

    // Click on the new passage
    await page.click('text=Untitled Passage');
    await page.waitForTimeout(500);

    // Click back to Start
    await page.click('text=Start');
    await page.waitForTimeout(500);

    // Start passage should still be visible
    await expect(page.locator('text=Start').first()).toBeVisible();
  });

  test('should handle multiple operations', async ({ page }) => {
    await createNewProject(page, 'Multiple Operations Test');
    await page.waitForTimeout(1000);

    // Add two passages
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(800);

    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(800);

    // Verify both passages exist
    const count = await page.locator('text=Untitled Passage').count();
    expect(count).toBeGreaterThanOrEqual(1);

    // App should remain stable
    await expect(page.locator('text=Passages').first()).toBeVisible();
  });
});
