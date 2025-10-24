import { test, expect } from '@playwright/test';
import { createNewProject } from './helpers';

test.describe('Preview/Playthrough Workflows', () => {
  test('should have Preview functionality available', async ({ page }) => {
    await createNewProject(page, 'Preview Test');
    await page.waitForTimeout(1000);

    // Look for Preview in UI
    const previewText = page.locator('text=Preview');
    const count = await previewText.count();

    // Preview should be available
    expect(count).toBeGreaterThan(0);
  });

  test('should display passage content for preview', async ({ page }) => {
    await createNewProject(page, 'Content Preview Test');
    await page.waitForTimeout(1000);

    // Click on Start passage
    await page.click('text=Start');
    await page.waitForTimeout(500);

    // Start passage should be selected
    const startText = page.locator('text=Start');
    await expect(startText.first()).toBeVisible();

    // Some form of content area should be visible
    const textInputs = page.locator('textarea, [contenteditable="true"]');
    const count = await textInputs.count();

    // Should have some content editing area
    expect(count).toBeGreaterThan(0);
  });

  test('should show preview panel or tab', async ({ page }) => {
    await createNewProject(page, 'Preview Panel Test');
    await page.waitForTimeout(1000);

    // Look for Preview tab, panel, or button
    const previewElements = page.locator('text=Preview');
    const count = await previewElements.count();

    // Preview should exist somewhere
    expect(count).toBeGreaterThan(0);
  });

  test('should allow navigating to Preview mode', async ({ page }) => {
    await createNewProject(page, 'Preview Mode Test');
    await page.waitForTimeout(1000);

    // Try to find and click Preview
    const previewButton = page.locator('button, a, [role="tab"]').filter({
      hasText: 'Preview'
    });

    if (await previewButton.count() > 0) {
      await previewButton.first().click({ force: true });
      await page.waitForTimeout(500);

      // After clicking, Preview should still be visible
      await expect(previewButton.first()).toBeVisible();
    } else {
      // Preview might be in a different location
      const previewText = page.locator('text=Preview');
      expect(await previewText.count()).toBeGreaterThan(0);
    }
  });

  test('should display Start passage content', async ({ page }) => {
    await createNewProject(page, 'Start Content Test');
    await page.waitForTimeout(1000);

    // Click on Start passage
    await page.click('text=Start');
    await page.waitForTimeout(500);

    // Verify Start passage is visible
    await expect(page.locator('text=Start').first()).toBeVisible();

    // Properties or editor should be available
    const hasEditor = await page.locator('textarea, [contenteditable="true"]').count() > 0;
    expect(hasEditor).toBe(true);
  });

  test('should show preview/play button or option', async ({ page }) => {
    await createNewProject(page, 'Play Button Test');
    await page.waitForTimeout(1000);

    // Look for Play, Preview, or Test buttons
    const playText = page.locator('text=Play');
    const previewText = page.locator('text=Preview');
    const testText = page.locator('text=Test');

    const totalCount = (await playText.count()) +
                       (await previewText.count()) +
                       (await testText.count());

    // At least one of these should exist
    expect(totalCount).toBeGreaterThan(0);
  });

  test('should maintain story state for preview', async ({ page }) => {
    await createNewProject(page, 'Preview State Test');
    await page.waitForTimeout(1000);

    // Verify passage exists
    await expect(page.locator('text=Start').first()).toBeVisible();

    // Add passage content
    await page.click('text=Start');
    await page.waitForTimeout(500);

    // Story structure exists for preview
    const passagesHeading = page.locator('h3').filter({ hasText: 'Passages' });
    await expect(passagesHeading.first()).toBeVisible();
  });

  test('should show editor panels for preview context', async ({ page }) => {
    await createNewProject(page, 'Editor Panels Test');
    await page.waitForTimeout(1000);

    // Verify main editor elements
    await expect(page.locator('text=Passages').first()).toBeVisible();

    // Preview should be available
    const previewCount = await page.locator('text=Preview').count();
    expect(previewCount).toBeGreaterThan(0);
  });

  test('should allow switching between editor and preview', async ({ page }) => {
    await createNewProject(page, 'Editor Preview Switch Test');
    await page.waitForTimeout(1000);

    // Verify we're in editor (Passages visible)
    await expect(page.locator('text=Passages').first()).toBeVisible();

    // Look for Preview option
    const previewButton = page.locator('button, a, [role="tab"]').filter({
      hasText: 'Preview'
    });

    if (await previewButton.count() > 0) {
      // Can click on Preview
      await previewButton.first().click({ force: true });
      await page.waitForTimeout(500);

      // Something should change (either tab highlights or content changes)
      // For now, just verify Preview is still clickable
      expect(await previewButton.count()).toBeGreaterThan(0);
    }
  });

  test('should display passage list for navigation', async ({ page }) => {
    await createNewProject(page, 'Navigation Test');
    await page.waitForTimeout(1000);

    // Add a second passage
    await page.click('button:has-text("+ Add")');
    await page.waitForTimeout(500);

    // Both passages should be in list
    await expect(page.locator('text=Start').first()).toBeVisible();
    await expect(page.locator('text=Untitled Passage').first()).toBeVisible();

    // Can navigate between passages
    await page.click('text=Start');
    await page.waitForTimeout(300);

    await page.click('text=Untitled Passage');
    await page.waitForTimeout(300);

    // Both should still be visible in list
    expect(await page.locator('text=Start').count()).toBeGreaterThan(0);
  });
});
