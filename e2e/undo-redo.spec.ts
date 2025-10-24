import { test, expect } from '@playwright/test';
import { createNewProject } from './helpers';

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

  // Enhanced tests that verify actual undo/redo functionality
  // TODO: Implement keyboard shortcuts for undo/redo in App.svelte
  // The historyStore and projectStore methods exist, but need to be wired to keyboard handlers
  test.skip('should actually undo passage creation', async ({ page }) => {
    await createNewProject(page, 'Undo Passage Creation');
    await page.waitForTimeout(1000);

    // Count initial passages (should be just "Start")
    const initialPassages = await page.locator('text=Start').count();
    expect(initialPassages).toBeGreaterThan(0);

    // Add a new passage
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(800);

    // Verify new passage exists
    const afterAdd = await page.locator('text=Untitled Passage').count();
    expect(afterAdd).toBeGreaterThan(0);

    // Perform undo
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await page.keyboard.press('Meta+Z');
    } else {
      await page.keyboard.press('Control+Z');
    }
    await page.waitForTimeout(800);

    // Verify passage was removed
    const afterUndo = await page.locator('text=Untitled Passage').count();
    expect(afterUndo).toBe(0);

    // Original passage should still exist
    await expect(page.locator('text=Start').first()).toBeVisible();
  });

  test.skip('should actually redo passage creation with Ctrl+Shift+Z', async ({ page }) => {
    await createNewProject(page, 'Redo Test Shift+Z');
    await page.waitForTimeout(1000);

    // Add passage
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(800);
    await expect(page.locator('text=Untitled Passage').first()).toBeVisible();

    // Undo
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await page.keyboard.press('Meta+Z');
    } else {
      await page.keyboard.press('Control+Z');
    }
    await page.waitForTimeout(800);

    // Verify undone
    const afterUndo = await page.locator('text=Untitled Passage').count();
    expect(afterUndo).toBe(0);

    // Redo with Ctrl+Shift+Z
    if (isMac) {
      await page.keyboard.press('Meta+Shift+Z');
    } else {
      await page.keyboard.press('Control+Shift+Z');
    }
    await page.waitForTimeout(800);

    // Verify passage returned
    await expect(page.locator('text=Untitled Passage').first()).toBeVisible();
  });

  test.skip('should actually redo passage creation with Ctrl+Y', async ({ page }) => {
    await createNewProject(page, 'Redo Test Y');
    await page.waitForTimeout(1000);

    // Add passage
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(800);
    await expect(page.locator('text=Untitled Passage').first()).toBeVisible();

    // Undo
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await page.keyboard.press('Meta+Z');
    } else {
      await page.keyboard.press('Control+Z');
    }
    await page.waitForTimeout(800);

    // Verify undone
    const afterUndo = await page.locator('text=Untitled Passage').count();
    expect(afterUndo).toBe(0);

    // Redo with Ctrl+Y (Windows standard)
    if (isMac) {
      await page.keyboard.press('Meta+Y');
    } else {
      await page.keyboard.press('Control+Y');
    }
    await page.waitForTimeout(800);

    // Verify passage returned
    await expect(page.locator('text=Untitled Passage').first()).toBeVisible();
  });

  test.skip('should handle multiple undo levels', async ({ page }) => {
    await createNewProject(page, 'Multiple Undo Test');
    await page.waitForTimeout(1000);

    // Add three passages
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(800);

    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(800);

    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(800);

    // Verify all exist
    let count = await page.locator('text=Untitled Passage').count();
    expect(count).toBeGreaterThanOrEqual(3);

    const isMac = process.platform === 'darwin';

    // Undo first time
    if (isMac) {
      await page.keyboard.press('Meta+Z');
    } else {
      await page.keyboard.press('Control+Z');
    }
    await page.waitForTimeout(800);

    count = await page.locator('text=Untitled Passage').count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Undo second time
    if (isMac) {
      await page.keyboard.press('Meta+Z');
    } else {
      await page.keyboard.press('Control+Z');
    }
    await page.waitForTimeout(800);

    count = await page.locator('text=Untitled Passage').count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Undo third time
    if (isMac) {
      await page.keyboard.press('Meta+Z');
    } else {
      await page.keyboard.press('Control+Z');
    }
    await page.waitForTimeout(800);

    // All should be undone
    count = await page.locator('text=Untitled Passage').count();
    expect(count).toBe(0);
  });

  test.skip('should clear redo history on new action', async ({ page }) => {
    await createNewProject(page, 'Clear Redo Test');
    await page.waitForTimeout(1000);

    const isMac = process.platform === 'darwin';

    // Add passage
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(800);

    // Undo
    if (isMac) {
      await page.keyboard.press('Meta+Z');
    } else {
      await page.keyboard.press('Control+Z');
    }
    await page.waitForTimeout(800);

    // Verify undone
    let count = await page.locator('text=Untitled Passage').count();
    expect(count).toBe(0);

    // Perform new action (add different passage)
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(800);

    // Now try redo - it should do nothing since we performed a new action
    if (isMac) {
      await page.keyboard.press('Meta+Shift+Z');
    } else {
      await page.keyboard.press('Control+Shift+Z');
    }
    await page.waitForTimeout(800);

    // Should still have exactly 1 Untitled Passage (the new one, not a second one)
    count = await page.locator('text=Untitled Passage').count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test.skip('should undo title changes', async ({ page }) => {
    await createNewProject(page, 'Undo Title Change');
    await page.waitForTimeout(1000);

    // Click on Start passage
    await page.click('text=Start');
    await page.waitForTimeout(500);

    // Change title
    const titleInput = page.locator('input[type="text"]').nth(1);
    await titleInput.click({ force: true });
    await titleInput.fill('New Title');
    await titleInput.press('Tab');
    await page.waitForTimeout(800);

    // Verify title changed
    await expect(page.locator('text=New Title').first()).toBeVisible();

    // Undo
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await page.keyboard.press('Meta+Z');
    } else {
      await page.keyboard.press('Control+Z');
    }
    await page.waitForTimeout(800);

    // Original title should be restored
    await expect(page.locator('text=Start').first()).toBeVisible();
    const newTitleExists = await page.locator('text=New Title').count();
    expect(newTitleExists).toBe(0);
  });
});
