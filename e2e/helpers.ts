import { expect, type Page } from '@playwright/test';

/**
 * Helper function to create a new project with improved reliability
 * Uses proper waits instead of arbitrary timeouts where possible
 */
export async function createNewProject(page: Page, projectName = 'Test Story') {
  // Clear storage using Playwright's context API to avoid security errors
  await page.context().clearCookies();
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Wait a bit for any initialization
  await page.waitForTimeout(500);

  // Find and click the Get Started Free button on the landing page with explicit wait
  const getStartedButton = page.locator('button:has-text("Get Started Free")');
  await getStartedButton.waitFor({ state: 'visible', timeout: 10000 });
  await getStartedButton.click();

  // Wait for navigation from landing page to editor
  await page.waitForLoadState('networkidle');

  // After clicking "Get Started Free", wait for any template selection UI
  // Give a moment for the page transition/modal to appear
  await page.waitForTimeout(2000);

  // Look for "Start with Blank Story" text - this might be in a modal or on the page
  // Use a flexible selector that works regardless of the container
  const blankStoryLocator = page.getByText('Start with Blank Story');

  // Wait for it to be visible
  const isVisible = await blankStoryLocator.isVisible().catch(() => false);

  if (isVisible) {
    // If we can see the text, try to click it
    // First try to find a parent button/clickable element
    const clickableParent = page.locator('button, [role="button"], [class*="card"]').filter({
      hasText: 'Start with Blank Story'
    }).first();

    const hasClickable = await clickableParent.count() > 0;

    if (hasClickable) {
      await clickableParent.click({ timeout: 5000 });
    } else {
      // Fall back to clicking the text directly with force
      await blankStoryLocator.click({ force: true, timeout: 5000 });
    }
  } else {
    // If "Start with Blank Story" is not visible, maybe we're already in the editor
    // or the flow is different. Just continue.
    console.log('Template selection not found, continuing...');
  }

  // Wait for the project name input to be visible and interactable
  const projectNameInput = page.locator('input[placeholder="My Amazing Story"]');
  await projectNameInput.waitFor({ state: 'visible', timeout: 10000 });
  await projectNameInput.fill(projectName);

  // Click OK button
  const okButton = page.locator('button:has-text("OK")');
  await okButton.waitFor({ state: 'visible', timeout: 5000 });
  await okButton.click();

  // Wait for modal to close
  await page.waitForFunction(() => {
    const overlays = document.querySelectorAll('div[role="presentation"]');
    return overlays.length === 0;
  }, { timeout: 10000 });

  // Wait for editor to be ready - look for Passages text
  await page.waitForSelector('text=Passages', { timeout: 10000 });

  // Give the app a moment to fully initialize
  await page.waitForTimeout(500);
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
