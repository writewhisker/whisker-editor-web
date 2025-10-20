import { test, expect } from '@playwright/test';

test.describe('Tag Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for app to load
    await page.waitForSelector('text=Passages', { timeout: 5000 });
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
    // Add a tag first
    await page.click('text=Start');
    const tagInput = page.locator('input[placeholder="Add tag..."]');
    await tagInput.fill('action');
    await tagInput.press('Enter');

    // Create another passage
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(300);

    // Start typing to see autocomplete
    await tagInput.fill('act');

    // Verify autocomplete dropdown appears with the existing tag
    await expect(page.locator('text=action').nth(1)).toBeVisible();
  });

  test('should display colored tags in passage list', async ({ page }) => {
    // Add tag to start passage
    await page.click('text=Start');
    const tagInput = page.locator('input[placeholder="Add tag..."]');
    await tagInput.fill('combat');
    await tagInput.press('Enter');

    // Verify colored tag appears in passage list
    const passageList = page.locator('.passage-node, button').filter({ hasText: 'Start' }).first();
    const tagInList = passageList.locator('text=combat');
    await expect(tagInList).toBeVisible();

    // Verify tag has colored background (inline style)
    const tagStyle = await tagInList.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(tagStyle).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
  });

  test('should remove tag when clicking X button', async ({ page }) => {
    // Add a tag
    await page.click('text=Start');
    const tagInput = page.locator('input[placeholder="Add tag..."]');
    await tagInput.fill('removeme');
    await tagInput.press('Enter');

    // Verify tag exists
    await expect(page.locator('text=removeme').first()).toBeVisible();

    // Click the X button on the tag chip
    const removeButton = page.locator('span:has-text("removeme")').locator('button').first();
    await removeButton.click();

    // Verify tag is removed
    await expect(page.locator('text=removeme')).toHaveCount(0);
  });
});

test.describe('Tag Manager (if accessible)', () => {
  test.skip('should show tag statistics', async ({ page }) => {
    // This test would require accessing TagManager component
    // Skip for now as TagManager may need to be added to main UI
    await page.goto('/');
  });
});
