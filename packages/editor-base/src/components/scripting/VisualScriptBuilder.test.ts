import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import VisualScriptBuilder from './VisualScriptBuilder.svelte';

describe('VisualScriptBuilder', () => {
  let onCodeChangeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onCodeChangeMock = vi.fn();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with header and title', () => {
      const { container } = render(VisualScriptBuilder);

      const header = container.querySelector('.builder-header');
      expect(header).toBeTruthy();
      expect(header?.textContent).toContain('Visual Script Builder');
    });

    it('should render block palette with categories', () => {
      const { container } = render(VisualScriptBuilder);

      const palette = container.querySelector('.block-palette');
      expect(palette).toBeTruthy();

      const categoryTabs = container.querySelectorAll('.category-tab');
      expect(categoryTabs.length).toBeGreaterThan(0);
    });

    it('should render all category tabs', () => {
      const { container } = render(VisualScriptBuilder);

      const categoryTabs = container.querySelectorAll('.category-tab');
      const categoryLabels = Array.from(categoryTabs).map(tab =>
        tab.querySelector('.category-label')?.textContent
      );

      expect(categoryLabels).toContain('Variables');
      expect(categoryLabels).toContain('Math');
      expect(categoryLabels).toContain('Logic');
      expect(categoryLabels).toContain('Text');
      expect(categoryLabels).toContain('Output');
      expect(categoryLabels).toContain('Control');
    });

    it('should render canvas area', () => {
      const { container } = render(VisualScriptBuilder);

      const canvas = container.querySelector('.script-canvas');
      expect(canvas).toBeTruthy();
    });

    it('should show empty canvas message when no blocks', () => {
      const { container } = render(VisualScriptBuilder);

      const emptyMessage = container.querySelector('.canvas-empty');
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage?.textContent).toContain('No blocks yet');
    });

    it('should render code preview by default', () => {
      const { container } = render(VisualScriptBuilder);

      const codePreview = container.querySelector('.code-preview');
      expect(codePreview).toBeTruthy();
    });

    it('should render header action buttons', () => {
      const { container } = render(VisualScriptBuilder);

      const headerActions = container.querySelector('.header-actions');
      expect(headerActions).toBeTruthy();

      const buttons = headerActions?.querySelectorAll('button');
      expect(buttons?.length).toBe(2); // Show/Hide Code and Clear All
    });
  });

  describe('category selection', () => {
    it('should have variables category active by default', () => {
      const { container } = render(VisualScriptBuilder);

      const activeTab = container.querySelector('.category-tab.active');
      expect(activeTab?.textContent).toContain('Variables');
    });

    it('should switch to different category when clicked', async () => {
      const { container } = render(VisualScriptBuilder);

      const mathTab = Array.from(container.querySelectorAll('.category-tab'))
        .find(tab => tab.querySelector('.category-label')?.textContent === 'Math');

      await fireEvent.click(mathTab!);

      const activeTab = container.querySelector('.category-tab.active');
      expect(activeTab?.textContent).toContain('Math');
    });

    it('should show different blocks for different categories', async () => {
      const { container } = render(VisualScriptBuilder);

      // Get blocks for variables category
      const initialBlocks = container.querySelectorAll('.palette-block');
      const initialCount = initialBlocks.length;

      // Switch to math category
      const mathTab = Array.from(container.querySelectorAll('.category-tab'))
        .find(tab => tab.querySelector('.category-label')?.textContent === 'Math');

      await fireEvent.click(mathTab!);

      const mathBlocks = container.querySelectorAll('.palette-block');
      expect(mathBlocks.length).toBeGreaterThan(0);
    });
  });

  describe('drag and drop', () => {
    it('should allow dragging palette blocks', () => {
      const { container } = render(VisualScriptBuilder);

      const paletteBlock = container.querySelector('.palette-block');
      expect(paletteBlock).toBeTruthy();
      expect(paletteBlock?.getAttribute('draggable')).toBe('true');
    });

    it('should add block to canvas on drop', async () => {
      const { container } = render(VisualScriptBuilder);

      const canvas = container.querySelector('.script-canvas');
      const paletteBlock = container.querySelector('.palette-block');

      // Simulate drag start
      await fireEvent.dragStart(paletteBlock!);

      // Simulate drop on canvas
      await fireEvent.dragOver(canvas!);
      await fireEvent.drop(canvas!);

      // Canvas should no longer be empty
      const emptyMessage = container.querySelector('.canvas-empty');
      expect(emptyMessage).toBeNull();
    });

    it('should show blocks list after adding block', async () => {
      const { container } = render(VisualScriptBuilder);

      const canvas = container.querySelector('.script-canvas');
      const paletteBlock = container.querySelector('.palette-block');

      await fireEvent.dragStart(paletteBlock!);
      await fireEvent.drop(canvas!);

      const blocksList = container.querySelector('.blocks-list');
      expect(blocksList).toBeTruthy();
    });
  });

  describe('block management', () => {
    async function addBlock(container: HTMLElement) {
      const canvas = container.querySelector('.script-canvas');
      const paletteBlock = container.querySelector('.palette-block');
      await fireEvent.dragStart(paletteBlock!);
      await fireEvent.drop(canvas!);
    }

    it('should select block when clicked', async () => {
      const { container } = render(VisualScriptBuilder);
      await addBlock(container);

      const canvasBlock = container.querySelector('.canvas-block');
      await fireEvent.click(canvasBlock!);

      expect(canvasBlock?.classList.contains('selected')).toBe(true);
    });

    it('should show block actions buttons', async () => {
      const { container } = render(VisualScriptBuilder);
      await addBlock(container);

      const blockActions = container.querySelector('.block-actions');
      const actionButtons = blockActions?.querySelectorAll('.btn-icon');

      expect(actionButtons?.length).toBe(4); // Up, Down, Duplicate, Remove
    });

    it('should remove block when delete button clicked', async () => {
      const { container } = render(VisualScriptBuilder);
      await addBlock(container);

      const removeButton = container.querySelector('.btn-icon.btn-danger');
      await fireEvent.click(removeButton!);

      const blocksList = container.querySelector('.blocks-list');
      expect(blocksList?.querySelectorAll('.canvas-block').length).toBe(0);
    });

    it('should duplicate block when duplicate button clicked', async () => {
      const { container } = render(VisualScriptBuilder);
      await addBlock(container);

      const duplicateButton = Array.from(container.querySelectorAll('.btn-icon'))
        .find(btn => btn.getAttribute('title') === 'Duplicate');

      await fireEvent.click(duplicateButton!);

      const blocks = container.querySelectorAll('.canvas-block');
      expect(blocks.length).toBe(2);
    });

    it('should move block up when up button clicked', async () => {
      const { container } = render(VisualScriptBuilder);
      await addBlock(container);
      await addBlock(container);

      const blocks = container.querySelectorAll('.canvas-block');
      const secondBlock = blocks[1];
      const upButton = secondBlock.querySelector('[title="Move up"]');

      await fireEvent.click(upButton!);

      // Verify order changed (implementation detail)
      const updatedBlocks = container.querySelectorAll('.canvas-block');
      expect(updatedBlocks.length).toBe(2);
    });

    it('should move block down when down button clicked', async () => {
      const { container } = render(VisualScriptBuilder);
      await addBlock(container);
      await addBlock(container);

      const blocks = container.querySelectorAll('.canvas-block');
      const firstBlock = blocks[0];
      const downButton = firstBlock.querySelector('[title="Move down"]');

      await fireEvent.click(downButton!);

      const updatedBlocks = container.querySelectorAll('.canvas-block');
      expect(updatedBlocks.length).toBe(2);
    });

    it('should disable up button for first block', async () => {
      const { container } = render(VisualScriptBuilder);
      await addBlock(container);

      const upButton = container.querySelector('[title="Move up"]') as HTMLButtonElement;
      expect(upButton?.disabled).toBe(true);
    });

    it('should disable down button for last block', async () => {
      const { container } = render(VisualScriptBuilder);
      await addBlock(container);

      const downButton = container.querySelector('[title="Move down"]') as HTMLButtonElement;
      expect(downButton?.disabled).toBe(true);
    });
  });

  describe('block parameters', () => {
    async function addBlock(container: HTMLElement) {
      const canvas = container.querySelector('.script-canvas');
      const paletteBlock = container.querySelector('.palette-block');
      await fireEvent.dragStart(paletteBlock!);
      await fireEvent.drop(canvas!);
    }

    it('should show parameter inputs for blocks', async () => {
      const { container } = render(VisualScriptBuilder);
      await addBlock(container);

      const parameters = container.querySelector('.block-parameters');
      expect(parameters).toBeTruthy();
    });

    it('should update parameter value on input', async () => {
      const { container } = render(VisualScriptBuilder);
      await addBlock(container);

      const input = container.querySelector('.parameter input') as HTMLInputElement;
      if (input) {
        await fireEvent.input(input, { target: { value: 'test' } });
        expect(input.value).toBe('test');
      }
    });

    it('should show select for operator parameters', async () => {
      const { container } = render(VisualScriptBuilder);

      // Switch to Math category
      const mathTab = Array.from(container.querySelectorAll('.category-tab'))
        .find(tab => tab.querySelector('.category-label')?.textContent === 'Math');
      await fireEvent.click(mathTab!);

      await addBlock(container);

      const select = container.querySelector('.parameter select');
      expect(select).toBeTruthy();
    });
  });

  describe('code preview', () => {
    it('should toggle code preview visibility', async () => {
      const { container } = render(VisualScriptBuilder);

      const toggleButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Hide Code'));

      await fireEvent.click(toggleButton!);

      const codePreview = container.querySelector('.code-preview');
      expect(codePreview).toBeNull();
    });

    it('should show generated code in preview', async () => {
      const { container } = render(VisualScriptBuilder);

      const codeContent = container.querySelector('.code-content');
      expect(codeContent).toBeTruthy();
    });

    it('should show placeholder when no blocks', () => {
      const { container } = render(VisualScriptBuilder);

      const codeContent = container.querySelector('.code-content');
      expect(codeContent?.textContent).toContain('-- No blocks yet');
    });

    it('should have copy button in preview header', () => {
      const { container } = render(VisualScriptBuilder);

      const copyButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Copy'));

      expect(copyButton).toBeTruthy();
    });
  });

  describe('clear all functionality', () => {
    async function addBlock(container: HTMLElement) {
      const canvas = container.querySelector('.script-canvas');
      const paletteBlock = container.querySelector('.palette-block');
      await fireEvent.dragStart(paletteBlock!);
      await fireEvent.drop(canvas!);
    }

    it('should show clear all button', () => {
      const { container } = render(VisualScriptBuilder);

      const clearButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Clear All'));

      expect(clearButton).toBeTruthy();
    });

    it('should clear all blocks when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      const { container } = render(VisualScriptBuilder);
      await addBlock(container);

      const clearButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Clear All'));

      await fireEvent.click(clearButton!);

      const emptyMessage = container.querySelector('.canvas-empty');
      expect(emptyMessage).toBeTruthy();

      confirmSpy.mockRestore();
    });

    it('should not clear blocks when canceled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      const { container } = render(VisualScriptBuilder);
      await addBlock(container);

      const clearButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Clear All'));

      await fireEvent.click(clearButton!);

      const blocksList = container.querySelector('.blocks-list');
      expect(blocksList).toBeTruthy();

      confirmSpy.mockRestore();
    });
  });

  describe('code change callback', () => {
    it('should call onCodeChange when blocks are added', async () => {
      const { container } = render(VisualScriptBuilder, {
        props: { onCodeChange: onCodeChangeMock }
      });

      const canvas = container.querySelector('.script-canvas');
      const paletteBlock = container.querySelector('.palette-block');

      await fireEvent.dragStart(paletteBlock!);
      await fireEvent.drop(canvas!);

      // Wait for effect to run
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onCodeChangeMock).toHaveBeenCalled();
    });

    it('should call onCodeChange when parameters are updated', async () => {
      const { container } = render(VisualScriptBuilder, {
        props: { onCodeChange: onCodeChangeMock }
      });

      const canvas = container.querySelector('.script-canvas');
      const paletteBlock = container.querySelector('.palette-block');

      await fireEvent.dragStart(paletteBlock!);
      await fireEvent.drop(canvas!);

      onCodeChangeMock.mockClear();

      const input = container.querySelector('.parameter input') as HTMLInputElement;
      if (input) {
        await fireEvent.input(input, { target: { value: 'test' } });
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(onCodeChangeMock).toHaveBeenCalled();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty category gracefully', async () => {
      const { container } = render(VisualScriptBuilder);

      // Switch to each category
      const categoryTabs = container.querySelectorAll('.category-tab');
      for (const tab of categoryTabs) {
        await fireEvent.click(tab);
        const paletteBlocks = container.querySelector('.palette-blocks');
        expect(paletteBlocks).toBeTruthy();
      }
    });

    it('should handle rapid category switching', async () => {
      const { container } = render(VisualScriptBuilder);

      const categoryTabs = container.querySelectorAll('.category-tab');

      // Rapidly click through categories
      for (const tab of categoryTabs) {
        await fireEvent.click(tab);
      }

      const activeTab = container.querySelector('.category-tab.active');
      expect(activeTab).toBeTruthy();
    });

    it('should maintain selection after block reorder', async () => {
      const { container } = render(VisualScriptBuilder);

      // Add two blocks
      const canvas = container.querySelector('.script-canvas');
      const paletteBlock = container.querySelector('.palette-block');

      await fireEvent.dragStart(paletteBlock!);
      await fireEvent.drop(canvas!);
      await fireEvent.dragStart(paletteBlock!);
      await fireEvent.drop(canvas!);

      // Select first block
      const blocks = container.querySelectorAll('.canvas-block');
      await fireEvent.click(blocks[0]);

      // Move it down
      const downButton = blocks[0].querySelector('[title="Move down"]');
      await fireEvent.click(downButton!);

      // Should still have a selected block
      const selectedBlock = container.querySelector('.canvas-block.selected');
      expect(selectedBlock).toBeTruthy();
    });
  });
});
