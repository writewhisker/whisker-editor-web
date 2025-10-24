import { test, expect } from '@playwright/test';
import { createNewProject } from './helpers';

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
    await tagInput.click({ force: true }); // Force click through overlays
    await tagInput.fill('action');
    await tagInput.press('Enter');
    await page.waitForTimeout(500);

    // Create another passage using any + Add button
    await page.click('button:has-text("+ Add")', { force: true });
    await page.waitForTimeout(800);

    // The new passage should be automatically selected
    // Start typing to see autocomplete
    await tagInput.click({ force: true });
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
    await tagInput.click({ force: true }); // Force click through overlays
    await tagInput.fill('removeme');
    await tagInput.press('Enter');
    await page.waitForTimeout(500);

    // Verify tag exists - count should be 2 (properties panel + passage list)
    const initialCount = await page.locator('text=removeme').count();
    expect(initialCount).toBe(2);

    // Click the × button in the Properties panel
    const removeButton = page.locator('button[title="Remove tag"]');
    await expect(removeButton).toBeVisible();
    await expect(removeButton).toBeEnabled();

    // Try clicking with JavaScript to bypass any potential overlay issues
    await removeButton.evaluate(node => (node as HTMLElement).click());

    // Wait for tag to be removed from DOM
    await page.waitForTimeout(1500);

    // Verify tag is completely removed from both properties panel and passage list
    const finalCount = await page.locator('text=removeme').count();
    expect(finalCount).toBe(0); // Should be completely gone from both panels
  });
});

test.describe('Tag Manager', () => {
  test('should show tag statistics', async ({ page }) => {
    // Create a new project
    await createNewProject(page);

    // Add a tag to the Start passage
    const tagInput = page.locator('input[placeholder="Add tag..."]');
    await tagInput.fill('adventure');
    await tagInput.press('Enter');
    await page.waitForTimeout(500);

    // Press Escape to close any dropdowns
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Open the Tag Manager panel by clicking the Tags toggle button using JavaScript
    await page.evaluate(() => {
      const button = document.querySelector('button[title="Toggle Tag Manager Panel"]') as HTMLButtonElement;
      if (button) button.click();
    });
    await page.waitForTimeout(1000);

    // Verify Tag Manager heading is visible
    await expect(page.locator('h2:has-text("Tag Manager")').first()).toBeVisible({ timeout: 10000 });

    // Verify statistics are shown
    await expect(page.locator('text=Total Tags').first()).toBeVisible();
    await expect(page.locator('text=Total Usages').first()).toBeVisible();

    // Verify the tag appears in the tag list
    await expect(page.locator('text=adventure').first()).toBeVisible();
  });

  test('should allow searching tags', async ({ page }) => {
    await createNewProject(page);

    // Add multiple tags
    const tagInput = page.locator('input[placeholder="Add tag..."]');
    await tagInput.fill('combat');
    await tagInput.press('Enter');
    await page.waitForTimeout(300);

    await tagInput.fill('dialogue');
    await tagInput.press('Enter');
    await page.waitForTimeout(300);

    // Press Escape to close any dropdowns
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Open Tag Manager using JavaScript
    await page.evaluate(() => {
      const button = document.querySelector('button[title="Toggle Tag Manager Panel"]') as HTMLButtonElement;
      if (button) button.click();
    });
    await page.waitForTimeout(1000);

    // Find the search input in Tag Manager
    const searchInput = page.locator('input[placeholder="Search tags..."]');
    await searchInput.fill('combat');
    await page.waitForTimeout(300);

    // Verify combat tag is still visible
    await expect(page.locator('text=combat').first()).toBeVisible();
  });

  test('should show tag usage count', async ({ page }) => {
    await createNewProject(page);

    // Add a tag to the Start passage
    const tagInput = page.locator('input[placeholder="Add tag..."]');
    await tagInput.fill('story-tag');
    await tagInput.press('Enter');
    await page.waitForTimeout(500);

    // Press Escape to close any dropdowns
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Open Tag Manager using JavaScript
    await page.evaluate(() => {
      const button = document.querySelector('button[title="Toggle Tag Manager Panel"]') as HTMLButtonElement;
      if (button) button.click();
    });
    await page.waitForTimeout(1000);

    // Verify usage count is shown (should be "1 use" or "(1)")
    const tagRow = page.locator('text=story-tag').first();
    await expect(tagRow).toBeVisible();

    // Look for usage count pattern like "(1 use)" or "(1)"
    const usageText = page.locator('text=/\\(1 use\\)|\\(1\\)/');
    await expect(usageText.first()).toBeVisible();
  });
});
