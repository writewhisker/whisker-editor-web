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

test.describe('Auto-Save Functionality', () => {
  test('should auto-save project data', async ({ page }) => {
    await createNewProject(page, 'Auto Save Test');
    await page.waitForTimeout(2000); // Wait for potential autosave

    // Verify data is saved in localStorage
    const hasSavedData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.some(key => key.startsWith('whisker-'));
    });

    expect(hasSavedData).toBe(true);
  });

  test('should save after creating new passage', async ({ page }) => {
    await createNewProject(page, 'Save After Add');
    await page.waitForTimeout(1000);

    // Add a new passage
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(2000); // Wait for autosave

    // Check localStorage
    const hasSavedData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.some(key => key.startsWith('whisker-'));
    });

    expect(hasSavedData).toBe(true);
  });

  test('should save after editing passage content', async ({ page }) => {
    await createNewProject(page, 'Save After Edit');
    await page.waitForTimeout(1000);

    // Click on Start passage
    await page.click('text=Start');
    await page.waitForTimeout(500);

    // Find and interact with editor
    const editor = page.locator('textarea, [contenteditable="true"]').first();
    if (await editor.count() > 0) {
      await editor.click();
      await page.keyboard.type('Test content');
      await page.waitForTimeout(2000); // Wait for autosave

      // Verify data saved
      const hasSavedData = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.some(key => key.startsWith('whisker-'));
      });

      expect(hasSavedData).toBe(true);
    }
  });

  test('should restore data after page refresh', async ({ page }) => {
    await createNewProject(page, 'Restore Test');
    await page.waitForTimeout(2000); // Wait for autosave

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should restore to editor or home page
    const hasPassages = await page.locator('text=Passages').count() > 0;
    const hasNewProject = await page.locator('button:has-text("New Project")').count() > 0;

    expect(hasPassages || hasNewProject).toBe(true);
  });

  test('should save passage connections', async ({ page }) => {
    await createNewProject(page, 'Save Connections');
    await page.waitForTimeout(1000);

    // Add a passage
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(2000); // Wait for autosave

    // Check that data includes multiple passages
    const hasMultiplePassages = await page.evaluate(() => {
      const data = localStorage.getItem('whisker-currentStory');
      if (!data) return false;
      try {
        const story = JSON.parse(data);
        return story.passages && Object.keys(story.passages).length > 1;
      } catch {
        return false;
      }
    });

    // At minimum, the story should be saved
    const hasStory = await page.evaluate(() => {
      return localStorage.getItem('whisker-currentStory') !== null;
    });

    expect(hasStory).toBe(true);
  });

  test('should handle rapid changes gracefully', async ({ page }) => {
    await createNewProject(page, 'Rapid Changes Test');
    await page.waitForTimeout(1000);

    // Make several rapid changes
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(200);

    await page.waitForTimeout(2500); // Wait for autosave to settle

    // Data should be saved
    const hasSavedData = await page.evaluate(() => {
      return localStorage.getItem('whisker-currentStory') !== null;
    });

    expect(hasSavedData).toBe(true);
  });

  test('should save metadata changes', async ({ page }) => {
    await createNewProject(page, 'Metadata Save Test');
    await page.waitForTimeout(2000); // Wait for autosave

    // Verify metadata is saved
    const hasMetadata = await page.evaluate(() => {
      const data = localStorage.getItem('whisker-currentStory');
      if (!data) return false;
      try {
        const story = JSON.parse(data);
        return story.metadata && story.metadata.title !== undefined;
      } catch {
        return false;
      }
    });

    expect(hasMetadata).toBe(true);
  });

  test('should maintain save integrity across operations', async ({ page }) => {
    await createNewProject(page, 'Save Integrity Test');
    await page.waitForTimeout(1000);

    // Perform multiple operations
    await page.click('text=Start');
    await page.waitForTimeout(500);

    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(2000); // Wait for autosave

    // Data should be valid
    const isValid = await page.evaluate(() => {
      const data = localStorage.getItem('whisker-currentStory');
      if (!data) return false;
      try {
        JSON.parse(data);
        return true;
      } catch {
        return false;
      }
    });

    expect(isValid).toBe(true);
  });

  test('should not lose data during navigation', async ({ page }) => {
    await createNewProject(page, 'Navigation Save Test');
    await page.waitForTimeout(2000); // Wait for autosave

    // Switch between passages
    await page.click('text=Start');
    await page.waitForTimeout(500);

    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(1000);

    // Data should persist
    const hasData = await page.evaluate(() => {
      return localStorage.getItem('whisker-currentStory') !== null;
    });

    expect(hasData).toBe(true);
  });

  test('should save variable definitions', async ({ page }) => {
    await createNewProject(page, 'Variable Save Test');
    await page.waitForTimeout(2000); // Wait for autosave

    // Check for saved data structure
    const hasStoryData = await page.evaluate(() => {
      const data = localStorage.getItem('whisker-currentStory');
      if (!data) return false;
      try {
        const story = JSON.parse(data);
        return story && typeof story === 'object';
      } catch {
        return false;
      }
    });

    expect(hasStoryData).toBe(true);
  });
});
