import { test, expect } from '@playwright/test';

// Helper to create a new project
async function createNewProject(page: any) {
  await page.goto('/');

  // Wait for app to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Click New Project button
  const newProjectButton = page.locator('button:has-text("New Project")');
  await newProjectButton.click();

  // Wait for dialog to appear and fill in project name
  const projectNameInput = page.locator('input[placeholder="My Amazing Story"]');
  await projectNameInput.waitFor({ state: 'visible', timeout: 5000 });
  await projectNameInput.fill('Test Story');

  // Click OK button
  await page.click('button:has-text("OK")');

  // Wait for the entire dialog and its overlay to be removed from the DOM
  // The FileDialog wraps everything in {#if show}, so when show=false, it's removed
  await page.waitForFunction(() => {
    const overlays = document.querySelectorAll('div[role="presentation"]');
    return overlays.length === 0;
  }, { timeout: 10000 });

  // Wait for Passages panel to appear
  await page.waitForSelector('text=Passages', { timeout: 10000 });
  await page.waitForTimeout(500);
}

test.describe('Tag Management', () => {
  test.beforeEach(async ({ page }) => {
    await createNewProject(page);
  });

  test('should add tag to passage using TagInput', async ({ page }) => {
    // Click on the start passage to select it
    await page.click('text=Start');

    // Wait for properties panel to show
    await page.waitForSelector('text=Tags');

    // Find the tag input and type a tag name
    const tagInput = page.locator('input[placeholder="Add tag..."]');
    await tagInput.fill('test-tag');
    await tagInput.press('Enter');

    // Verify tag chip appears with colored background
    const tagChip = page.locator('text=test-tag').first();
    await expect(tagChip).toBeVisible();
  });

  test('should show autocomplete suggestions for existing tags', async ({ page }) => {
    // Start passage is already selected after project creation
    // Add a tag using TagInput in properties panel
    const tagInput = page.locator('input[placeholder="Add tag..."]');
    await tagInput.fill('action');
    await tagInput.press('Enter');
    await page.waitForTimeout(500);

    // Create another passage using any + Add button
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(800);

    // The new passage should be automatically selected
    // Start typing to see autocomplete
    await tagInput.fill('act');
    await page.waitForTimeout(500);

    // Verify autocomplete dropdown appears with the existing tag
    // Look for the tag suggestion (might appear as a second instance of "action")
    const suggestions = page.locator('text=action');
    await expect(suggestions.nth(1)).toBeVisible({ timeout: 3000 });
  });

  test('should display colored tags in passage list', async ({ page }) => {
    // Start passage is already selected
    // Add tag using TagInput in properties panel
    const tagInput = page.locator('input[placeholder="Add tag..."]');
    await tagInput.fill('combat');
    await tagInput.press('Enter');
    await page.waitForTimeout(500);

    // Verify colored tag appears in passage list button (which contains "→" for choices)
    const startPassageButton = page.locator('button').filter({ hasText: /Start.*→/ });
    const tagInList = startPassageButton.locator('text=combat');
    await expect(tagInList).toBeVisible();

    // Verify tag has colored background (inline style)
    const tagStyle = await tagInList.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(tagStyle).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
  });

  test('should remove tag when clicking X button', async ({ page }) => {
    // Start passage is already selected
    // Add a tag using TagInput in properties panel
    const tagInput = page.locator('input[placeholder="Add tag..."]');
    await tagInput.fill('removeme');
    await tagInput.press('Enter');
    await page.waitForTimeout(500);

    // Verify tag exists in properties panel
    await expect(page.locator('span:has-text("removeme")').first()).toBeVisible();

    // Click the X button on the tag chip in properties panel
    const removeButton = page.locator('span:has-text("removeme")').locator('button[title="Remove tag"]').first();
    await removeButton.click();
    await page.waitForTimeout(500);

    // Verify tag is removed from properties panel
    await expect(page.locator('span:has-text("removeme")')).toHaveCount(0);
  });
});

test.describe('Tag Manager (if accessible)', () => {
  test.skip('should show tag statistics', async ({ page }) => {
    // This test would require accessing TagManager component
    // Skip for now as TagManager may need to be added to main UI
    await page.goto('/');
  });
});
