import { expect, type Page } from '@playwright/test';

/**
 * Helper function to create a new project with improved reliability
 * Uses proper waits instead of arbitrary timeouts where possible
 */
export async function createNewProject(page: Page, projectName = 'Test Story') {
  console.log('[E2E] Starting createNewProject');

  // Clear all storage to ensure clean state
  await page.context().clearCookies();
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Clear localStorage and IndexedDB
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    // Clear IndexedDB
    if (window.indexedDB) {
      window.indexedDB.databases().then((dbs) => {
        dbs.forEach((db) => {
          if (db.name) {
            window.indexedDB.deleteDatabase(db.name);
          }
        });
      });
    }
  });

  // Reload the page to start fresh
  await page.reload();
  await page.waitForLoadState('networkidle');
  console.log('[E2E] Page loaded with clean state');
  await page.screenshot({ path: 'test-results/debug-01-initial-load.png', fullPage: true });

  // Wait a bit for any initialization
  await page.waitForTimeout(1000);

  // Try to find "New Project" button first (might exist after clearing storage)
  const newProjectButton = page.locator('button:has-text("New Project")');
  const hasNewProjectButton = await newProjectButton.count() > 0;
  console.log('[E2E] Has New Project button:', hasNewProjectButton);

  if (hasNewProjectButton) {
    // If there's a "New Project" button, use it directly
    console.log('[E2E] Clicking New Project button directly');
    await newProjectButton.click();
    await page.screenshot({ path: 'test-results/debug-02-after-new-project-click.png', fullPage: true });
  } else {
    // Otherwise, use the landing page flow
    console.log('[E2E] Using landing page flow');

    // Find and click the Get Started Free button
    const getStartedButton = page.locator('button:has-text("Get Started Free")');
    await getStartedButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('[E2E] Found Get Started Free button');
    await page.screenshot({ path: 'test-results/debug-02-before-get-started.png', fullPage: true });

    await getStartedButton.click();
    console.log('[E2E] Clicked Get Started Free');

    // Wait for Template Gallery modal to appear
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/debug-03-after-get-started.png', fullPage: true });

    // Find and click the "Start with Blank Story" button in the Template Gallery
    const blankStoryButton = page.locator('button').filter({ hasText: 'Start with Blank Story' });
    console.log('[E2E] Looking for Start with Blank Story button');
    const blankStoryCount = await blankStoryButton.count();
    console.log('[E2E] Start with Blank Story button count:', blankStoryCount);

    await blankStoryButton.waitFor({ state: 'visible', timeout: 15000 });
    console.log('[E2E] Found Start with Blank Story button');
    await page.screenshot({ path: 'test-results/debug-04-before-blank-story.png', fullPage: true });

    await blankStoryButton.click();
    console.log('[E2E] Clicked Start with Blank Story');
  }

  // Wait for the "New Project" dialog to appear with the project name input
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'test-results/debug-05-before-project-dialog.png', fullPage: true });

  const projectNameInput = page.locator('input[placeholder="My Amazing Story"]');
  console.log('[E2E] Looking for project name input');
  await projectNameInput.waitFor({ state: 'visible', timeout: 10000 });
  console.log('[E2E] Found project name input');

  await projectNameInput.fill(projectName);
  console.log('[E2E] Filled project name:', projectName);

  // Click OK button to submit
  const okButton = page.locator('button:has-text("OK")');
  await okButton.waitFor({ state: 'visible', timeout: 5000 });
  console.log('[E2E] Found OK button');
  await okButton.click();
  console.log('[E2E] Clicked OK button');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/debug-06-after-submit.png', fullPage: true });

  // Wait for dialog overlays to close
  console.log('[E2E] Waiting for overlays to close');
  await page.waitForFunction(() => {
    const overlays = document.querySelectorAll('div[role="presentation"]');
    return overlays.length === 0;
  }, { timeout: 10000 });
  console.log('[E2E] Overlays closed');
  await page.screenshot({ path: 'test-results/debug-07-overlays-closed.png', fullPage: true });

  // Wait for editor to be ready - look for Passages text
  console.log('[E2E] Waiting for Passages text');
  try {
    await page.waitForSelector('text=Passages', { timeout: 15000 });
    console.log('[E2E] Found Passages text - editor loaded successfully');
  } catch (error) {
    console.error('[E2E] Failed to find Passages text');
    await page.screenshot({ path: 'test-results/debug-08-passages-not-found.png', fullPage: true });

    // Log what's actually on the page
    const bodyText = await page.locator('body').textContent();
    console.log('[E2E] Page content:', bodyText?.substring(0, 500));
    throw error;
  }

  // Wait for the Start passage node to be rendered
  console.log('[E2E] Waiting for Start passage to render');
  await page.waitForTimeout(2000);

  try {
    await page.waitForSelector('text=Start', { timeout: 10000 });
    console.log('[E2E] Found Start passage - project fully initialized');
  } catch (error) {
    console.error('[E2E] Failed to find Start passage');
    await page.screenshot({ path: 'test-results/debug-08-start-not-found.png', fullPage: true });

    // Log what passages exist
    const bodyText = await page.locator('body').textContent();
    console.log('[E2E] Page content:', bodyText?.substring(0, 1000));
    throw error;
  }

  await page.screenshot({ path: 'test-results/debug-09-final-state.png', fullPage: true });
  console.log('[E2E] createNewProject completed successfully');
}

/**
 * Wait for an element to be stable (not animating) before interacting
 */
export async function waitForStable(page: Page, selector: string, timeout = 5000) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });

  // Wait for animations to complete
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const styles = window.getComputedStyle(el);
      return (
        styles.animationPlayState === 'running' ? false :
        parseFloat(styles.opacity) === 1
      );
    },
    selector,
    { timeout: 5000 }
  );
}

/**
 * Click an element and wait for it to be stable first
 */
export async function clickWhenReady(page: Page, selector: string) {
  await waitForStable(page, selector);
  await page.click(selector);
}

/**
 * Type text with proper delays to avoid race conditions
 */
export async function typeText(page: Page, selector: string, text: string) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout: 5000 });
  await element.click();
  await element.fill(text);

  // Small delay for reactivity
  await page.waitForTimeout(100);
}

/**
 * Wait for text to appear in the page
 */
export async function waitForText(page: Page, text: string, timeout = 5000) {
  await page.waitForSelector(`text=${text}`, { timeout });
}

/**
 * Retry an operation up to N times if it fails
 */
export async function retry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxAttempts - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Retry failed');
}
