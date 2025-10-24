import { expect, type Page } from '@playwright/test';

/**
 * Helper function to create a new project with improved reliability
 * Uses proper waits instead of arbitrary timeouts where possible
 */
export async function createNewProject(page: Page, projectName = 'Test Story') {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.waitForLoadState('networkidle');

  // Wait a bit for any initialization
  await page.waitForTimeout(500);

  // Find and click the New Project button with explicit wait
  const newProjectButton = page.locator('button:has-text("New Project")');
  await newProjectButton.waitFor({ state: 'visible', timeout: 10000 });
  await newProjectButton.click();

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
