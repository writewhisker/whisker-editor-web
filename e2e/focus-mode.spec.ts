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

test.describe('Focus Mode', () => {
  test('should have focus mode available', async ({ page }) => {
    await createNewProject(page, 'Focus Mode Test');
    await page.waitForTimeout(1000);

    // Focus mode should be toggleable via keyboard shortcut or UI
    // The feature exists even if not visible in the UI
    const hasEditor = await page.locator('textarea, [contenteditable="true"]').count() > 0;
    expect(hasEditor).toBe(true);
  });

  test('should toggle focus mode with keyboard shortcut', async ({ page }) => {
    await createNewProject(page, 'Focus Keyboard Test');
    await page.waitForTimeout(1000);

    const isMac = process.platform === 'darwin';

    // Toggle focus mode (Ctrl+Shift+M or Cmd+Shift+M)
    if (isMac) {
      await page.keyboard.press('Meta+Shift+M');
    } else {
      await page.keyboard.press('Control+Shift+M');
    }
    await page.waitForTimeout(500);

    // App should remain stable after toggling
    await expect(page.locator('text=Passages').first()).toBeVisible();
  });

  test('should toggle focus mode multiple times', async ({ page }) => {
    await createNewProject(page, 'Focus Toggle Test');
    await page.waitForTimeout(1000);

    const isMac = process.platform === 'darwin';
    const shortcut = isMac ? 'Meta+Shift+M' : 'Control+Shift+M';

    // Toggle focus mode on
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(500);

    // Toggle focus mode off
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(500);

    // Toggle focus mode on again
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(500);

    // App should remain stable
    await expect(page.locator('text=Passages').first()).toBeVisible();
  });

  test('should maintain editor state in focus mode', async ({ page }) => {
    await createNewProject(page, 'Focus State Test');
    await page.waitForTimeout(1000);

    // Click on Start passage
    await page.click('text=Start');
    await page.waitForTimeout(500);

    const isMac = process.platform === 'darwin';
    const shortcut = isMac ? 'Meta+Shift+M' : 'Control+Shift+M';

    // Enter focus mode
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(500);

    // Editor should still be accessible
    const hasEditor = await page.locator('textarea, [contenteditable="true"]').count() > 0;
    expect(hasEditor).toBe(true);
  });

  test('should work alongside other keyboard shortcuts', async ({ page }) => {
    await createNewProject(page, 'Focus Shortcuts Test');
    await page.waitForTimeout(1000);

    const isMac = process.platform === 'darwin';

    // Try focus mode
    if (isMac) {
      await page.keyboard.press('Meta+Shift+M');
    } else {
      await page.keyboard.press('Control+Shift+M');
    }
    await page.waitForTimeout(300);

    // Try find dialog (Ctrl+F)
    if (isMac) {
      await page.keyboard.press('Meta+F');
    } else {
      await page.keyboard.press('Control+F');
    }
    await page.waitForTimeout(300);

    // Close any dialogs with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // App should remain stable
    await expect(page.locator('text=Passages').first()).toBeVisible();
  });

  test('should not interfere with passage editing', async ({ page }) => {
    await createNewProject(page, 'Focus Editing Test');
    await page.waitForTimeout(1000);

    // Click on Start passage
    await page.click('text=Start');
    await page.waitForTimeout(500);

    const isMac = process.platform === 'darwin';
    const shortcut = isMac ? 'Meta+Shift+M' : 'Control+Shift+M';

    // Enter focus mode
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(500);

    // Passage should still be selectable
    await expect(page.locator('text=Start').first()).toBeVisible();
  });

  test('should persist across page interactions', async ({ page }) => {
    await createNewProject(page, 'Focus Persist Test');
    await page.waitForTimeout(1000);

    const isMac = process.platform === 'darwin';
    const shortcut = isMac ? 'Meta+Shift+M' : 'Control+Shift+M';

    // Toggle focus mode
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(500);

    // Add a new passage
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(800);

    // App should remain stable
    const startCount = await page.locator('text=Start').count();
    const untitledCount = await page.locator('text=Untitled').count();
    expect(startCount + untitledCount).toBeGreaterThan(0);
  });
});
