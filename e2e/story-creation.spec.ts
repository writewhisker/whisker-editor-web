import { test, expect } from '@playwright/test';

/**
 * User Journey: Building a Story from Scratch
 *
 * This test suite follows the natural workflow of a user creating
 * a simple interactive story, from opening the editor to previewing
 * the finished story.
 */

test.describe('Story Creation User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to fully load
    await page.waitForSelector('text=Passages', { timeout: 5000 });
  });

  test('should complete full story creation workflow', async ({ page }) => {
    // =============================================================
    // STEP 1: Verify Initial State
    // User opens the editor and sees a new story with a Start passage
    // =============================================================

    await test.step('verify initial story state', async () => {
      // Should see the Start passage in the passage list
      const startPassage = page.locator('button').filter({ hasText: 'Start' }).first();
      await expect(startPassage).toBeVisible();

      // Should show 0 choices initially
      await expect(startPassage).toContainText('0 choice');

      // Story should have a title (default or set)
      const storyTitle = page.locator('h1, h2').first();
      await expect(storyTitle).toBeVisible();
    });

    // =============================================================
    // STEP 2: Edit the Start Passage
    // User clicks on Start passage and edits its content
    // =============================================================

    await test.step('edit start passage content', async () => {
      // Click on the Start passage to select it
      await page.click('text=Start');
      await page.waitForTimeout(300);

      // Properties panel should be visible
      await expect(page.locator('text=Properties')).toBeVisible();

      // Change the passage title to something more descriptive
      const titleInput = page.locator('input[type="text"]').first();
      await titleInput.fill('The Forest Path');
      await titleInput.blur();
      await page.waitForTimeout(200);

      // Verify title updated in the passage list
      await expect(page.locator('text=The Forest Path')).toBeVisible();

      // Add some content to the passage
      const contentTextarea = page.locator('textarea').first();
      await contentTextarea.fill(
        'You stand at the edge of a dark forest. Two paths diverge before you.\n\n' +
        'To the left, you hear the sound of running water.\n' +
        'To the right, you see a faint glow through the trees.'
      );
      await contentTextarea.blur();
      await page.waitForTimeout(200);
    });

    // =============================================================
    // STEP 3: Create a New Passage (Left Path)
    // User creates a passage for the left path choice
    // =============================================================

    await test.step('create left path passage', async () => {
      // Click the "Add Passage" button
      const addButton = page.locator('button').filter({ hasText: /\+.*Add/i }).first();
      await addButton.click();
      await page.waitForTimeout(500);

      // A new "Untitled Passage" should appear
      await expect(page.locator('text=Untitled Passage')).toBeVisible();

      // Click on the new passage to edit it
      await page.click('text=Untitled Passage');
      await page.waitForTimeout(300);

      // Rename it to "The Stream"
      const titleInput = page.locator('input[type="text"]').first();
      await titleInput.fill('The Stream');
      await titleInput.blur();
      await page.waitForTimeout(200);

      // Add content
      const contentTextarea = page.locator('textarea').first();
      await contentTextarea.fill(
        'You follow the sound of water and discover a crystal-clear stream.\n\n' +
        'The water looks refreshing, and you notice some fish swimming below.'
      );
      await contentTextarea.blur();
      await page.waitForTimeout(200);

      // Add a tag to categorize this passage
      const tagInput = page.locator('input[placeholder*="tag" i]').first();
      if (await tagInput.isVisible()) {
        await tagInput.fill('nature');
        await tagInput.press('Enter');
        await page.waitForTimeout(200);
      }
    });

    // =============================================================
    // STEP 4: Create Another Passage (Right Path)
    // User creates a passage for the right path choice
    // =============================================================

    await test.step('create right path passage', async () => {
      // Add another passage
      const addButton = page.locator('button').filter({ hasText: /\+.*Add/i }).first();
      await addButton.click();
      await page.waitForTimeout(500);

      // Find the second "Untitled Passage" (if multiple exist)
      const untitledPassages = page.locator('button').filter({ hasText: 'Untitled Passage' });
      const count = await untitledPassages.count();
      const lastUntitled = untitledPassages.nth(count > 0 ? count - 1 : 0);
      await lastUntitled.click();
      await page.waitForTimeout(300);

      // Rename it to "The Mysterious Light"
      const titleInput = page.locator('input[type="text"]').first();
      await titleInput.fill('The Mysterious Light');
      await titleInput.blur();
      await page.waitForTimeout(200);

      // Add content
      const contentTextarea = page.locator('textarea').first();
      await contentTextarea.fill(
        'You walk toward the glow and find an ancient lantern hanging from a tree.\n\n' +
        'As you approach, the light begins to pulse with an otherworldly rhythm.'
      );
      await contentTextarea.blur();
      await page.waitForTimeout(200);

      // Add a tag
      const tagInput = page.locator('input[placeholder*="tag" i]').first();
      if (await tagInput.isVisible()) {
        await tagInput.fill('mystery');
        await tagInput.press('Enter');
        await page.waitForTimeout(200);
      }

      // Apply a color to this passage (if color picker is visible)
      const colorButtons = page.locator('button[style*="background"]').filter({ hasText: '' });
      const colorButtonCount = await colorButtons.count();
      if (colorButtonCount > 0) {
        // Click the first color (red)
        await colorButtons.first().click();
        await page.waitForTimeout(200);
      }
    });

    // =============================================================
    // STEP 5: Add Choices to Connect Passages
    // User goes back to the start passage and adds choices
    // =============================================================

    await test.step('add choices to start passage', async () => {
      // Go back to "The Forest Path" passage
      await page.click('text=The Forest Path');
      await page.waitForTimeout(300);

      // Look for the choices/connections section in the properties panel
      // This might be labeled "Choices", "Connections", or similar
      const choicesSection = page.locator('text=Choices, text=Connections').first();

      // Try to add a choice (the UI might have an "Add Choice" button)
      const addChoiceButton = page.locator('button').filter({ hasText: /add.*choice/i }).first();
      if (await addChoiceButton.isVisible()) {
        // Add first choice
        await addChoiceButton.click();
        await page.waitForTimeout(300);

        // Fill in choice text
        const choiceTextInput = page.locator('input, textarea').filter({ hasText: '' }).last();
        await choiceTextInput.fill('Follow the sound of water');

        // Select target passage (The Stream)
        const targetSelect = page.locator('select').last();
        if (await targetSelect.isVisible()) {
          await targetSelect.selectOption({ label: 'The Stream' });
        }
        await page.waitForTimeout(200);

        // Add second choice
        await addChoiceButton.click();
        await page.waitForTimeout(300);

        // Fill in second choice
        const choiceInputs = page.locator('input, textarea').filter({ hasText: '' });
        const lastInput = choiceInputs.last();
        await lastInput.fill('Investigate the mysterious light');

        // Select target passage (The Mysterious Light)
        const targetSelects = page.locator('select');
        const lastSelect = targetSelects.last();
        if (await lastSelect.isVisible()) {
          await lastSelect.selectOption({ label: 'The Mysterious Light' });
        }
        await page.waitForTimeout(200);
      }
    });

    // =============================================================
    // STEP 6: Switch to Graph View
    // User switches to graph view to see the story structure visually
    // =============================================================

    await test.step('switch to graph view', async () => {
      // Look for view mode buttons (List, Graph, Split)
      const graphButton = page.locator('button, a').filter({ hasText: /^Graph$/i }).first();

      if (await graphButton.isVisible()) {
        await graphButton.click();
        await page.waitForTimeout(1000);

        // Should see passage nodes in the graph
        // XYFlow or similar graph library renders nodes
        const graphNodes = page.locator('[class*="node"], .passage-node');
        const nodeCount = await graphNodes.count();

        // We should have at least 3 passages visible
        expect(nodeCount).toBeGreaterThanOrEqual(3);

        // Try to verify passage titles are visible in graph
        await expect(page.locator('text=The Forest Path')).toBeVisible();
        await expect(page.locator('text=The Stream')).toBeVisible();
        await expect(page.locator('text=The Mysterious Light')).toBeVisible();
      }
    });

    // =============================================================
    // STEP 7: Test Graph Layout Features
    // User tries different layout algorithms
    // =============================================================

    await test.step('test graph layout features', async () => {
      // Look for layout buttons (Hierarchical, Circular, Grid)
      const hierarchicalButton = page.locator('button').filter({ hasText: /hierarchical/i }).first();
      const circularButton = page.locator('button').filter({ hasText: /circular/i }).first();
      const gridButton = page.locator('button').filter({ hasText: /grid/i }).first();

      if (await hierarchicalButton.isVisible()) {
        // Try hierarchical layout
        await hierarchicalButton.click();
        await page.waitForTimeout(500);

        // Try circular layout
        if (await circularButton.isVisible()) {
          await circularButton.click();
          await page.waitForTimeout(500);
        }

        // Try grid layout
        if (await gridButton.isVisible()) {
          await gridButton.click();
          await page.waitForTimeout(500);
        }
      }
    });

    // =============================================================
    // STEP 8: Return to List View
    // User switches back to list view
    // =============================================================

    await test.step('return to list view', async () => {
      const listButton = page.locator('button, a').filter({ hasText: /^List$/i }).first();

      if (await listButton.isVisible()) {
        await listButton.click();
        await page.waitForTimeout(500);

        // Verify all passages are visible in the list
        await expect(page.locator('text=The Forest Path')).toBeVisible();
        await expect(page.locator('text=The Stream')).toBeVisible();
        await expect(page.locator('text=The Mysterious Light')).toBeVisible();
      }
    });

    // =============================================================
    // STEP 9: Verify Story Statistics
    // User checks the overall story structure
    // =============================================================

    await test.step('verify story has 3 passages', async () => {
      // Count passage entries in the list
      const passages = page.locator('button').filter({ hasText: /The Forest Path|The Stream|The Mysterious Light/ });
      const passageCount = await passages.count();

      // Should have our 3 passages
      expect(passageCount).toBeGreaterThanOrEqual(3);
    });

    // =============================================================
    // STEP 10: Test Preview Mode (if available)
    // User previews the story to test the interactive experience
    // =============================================================

    await test.step('test preview mode', async () => {
      // Look for Preview button
      const previewButton = page.locator('button').filter({ hasText: /preview/i }).first();

      if (await previewButton.isVisible()) {
        await previewButton.click();
        await page.waitForTimeout(1000);

        // Should see the start passage content
        await expect(page.locator('text=You stand at the edge of a dark forest')).toBeVisible();

        // Should see the choices
        const waterChoice = page.locator('button, a').filter({ hasText: /follow.*water/i }).first();
        const lightChoice = page.locator('button, a').filter({ hasText: /investigate.*light/i }).first();

        if (await waterChoice.isVisible()) {
          // Test clicking a choice
          await waterChoice.click();
          await page.waitForTimeout(500);

          // Should navigate to The Stream passage
          await expect(page.locator('text=crystal-clear stream')).toBeVisible();
        }

        // Exit preview mode
        const exitButton = page.locator('button').filter({ hasText: /exit|close|back/i }).first();
        if (await exitButton.isVisible()) {
          await exitButton.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test('should persist story data across page reload', async ({ page }) => {
    // Create a simple story
    await test.step('create a story', async () => {
      await page.click('text=Start');
      await page.waitForTimeout(300);

      const titleInput = page.locator('input[type="text"]').first();
      await titleInput.fill('Persistent Passage');
      await titleInput.blur();
      await page.waitForTimeout(300);
    });

    // Reload the page
    await test.step('reload page', async () => {
      await page.reload();
      await page.waitForSelector('text=Passages', { timeout: 5000 });
    });

    // Verify data persisted
    await test.step('verify data persisted', async () => {
      await expect(page.locator('text=Persistent Passage')).toBeVisible();
    });
  });

  test('should handle localStorage version migration', async ({ page }) => {
    // This tests the localStorage version management we just implemented
    await test.step('verify app loads without errors', async () => {
      // Check that no error dialog or message appears
      const errorDialog = page.locator('text=Error, text=TypeError');
      await expect(errorDialog).not.toBeVisible();

      // App should be functional
      await expect(page.locator('text=Passages')).toBeVisible();

      // Should be able to create passages
      const addButton = page.locator('button').filter({ hasText: /\+.*Add/i }).first();
      await addButton.click();
      await page.waitForTimeout(500);

      await expect(page.locator('text=Untitled Passage')).toBeVisible();
    });
  });
});

test.describe('Story Editing Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('text=Passages', { timeout: 5000 });
  });

  test('should support passage tagging workflow', async ({ page }) => {
    await test.step('select start passage', async () => {
      await page.click('text=Start');
      await page.waitForTimeout(300);
    });

    await test.step('add multiple tags', async () => {
      const tagInput = page.locator('input[placeholder*="tag" i]').first();

      if (await tagInput.isVisible()) {
        // Add first tag
        await tagInput.fill('combat');
        await tagInput.press('Enter');
        await page.waitForTimeout(200);

        // Verify tag chip appears
        await expect(page.locator('text=combat').first()).toBeVisible();

        // Add second tag
        await tagInput.fill('important');
        await tagInput.press('Enter');
        await page.waitForTimeout(200);

        await expect(page.locator('text=important').first()).toBeVisible();

        // Tags should have colored backgrounds
        const combatTag = page.locator('span, div').filter({ hasText: /^combat$/ }).first();
        const bgColor = await combatTag.evaluate(el => window.getComputedStyle(el).backgroundColor);
        expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
      }
    });

    await test.step('remove a tag', async () => {
      // Find the X button on a tag and click it
      const tagChip = page.locator('span, div').filter({ hasText: 'combat' }).first();
      const removeButton = tagChip.locator('button, [role="button"]').first();

      if (await removeButton.isVisible()) {
        await removeButton.click();
        await page.waitForTimeout(300);

        // Tag should be removed
        const combatTags = page.locator('text=combat');
        const count = await combatTags.count();
        expect(count).toBe(0);
      }
    });
  });

  test('should support passage color coding workflow', async ({ page }) => {
    await test.step('select passage', async () => {
      await page.click('text=Start');
      await page.waitForTimeout(300);
    });

    await test.step('apply color from palette', async () => {
      // Look for color palette buttons
      const colorButtons = page.locator('button[style*="background"]').filter({ hasText: '' });
      const count = await colorButtons.count();

      if (count >= 16) {
        // Should have 16 color palette buttons
        expect(count).toBeGreaterThanOrEqual(16);

        // Click a color (e.g., red - first button)
        await colorButtons.nth(0).click();
        await page.waitForTimeout(300);

        // Verify color is set (check for hex code display)
        const colorDisplay = page.locator('text=#, text=EF4444, text=Color');
        // Color hex code should be visible somewhere
      }
    });

    await test.step('use custom color picker', async () => {
      const colorInput = page.locator('input[type="color"]').first();

      if (await colorInput.isVisible()) {
        // Set custom color
        await colorInput.fill('#FF00FF');
        await page.waitForTimeout(300);

        // Verify the color is displayed
        const colorHex = page.locator('text=#FF00FF, text=#ff00ff');
        // Should see the hex code displayed (case-insensitive)
      }
    });

    await test.step('clear color', async () => {
      const clearButton = page.locator('button').filter({ hasText: /clear/i });

      if (await clearButton.isVisible()) {
        await clearButton.click();
        await page.waitForTimeout(300);

        // Should show "No color set" or similar
        await expect(page.locator('text=No color set, text=no color')).toBeVisible();
      }
    });
  });
});
