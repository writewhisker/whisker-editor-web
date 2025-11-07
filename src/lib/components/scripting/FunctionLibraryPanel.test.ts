import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import FunctionLibraryPanel from './FunctionLibraryPanel.svelte';
import { currentStory } from '../../stores/projectStore';
import { Story } from '@whisker/core-ts';
import { LuaFunction } from '@whisker/core-ts';

// Mock the stores
vi.mock('../../stores/projectStore', () => ({
  currentStory: {
    subscribe: vi.fn(),
    set: vi.fn(),
  },
}));

describe('FunctionLibraryPanel', () => {
  let mockStory: Story;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock story
    mockStory = new Story();

    // Mock the store subscription
    vi.mocked(currentStory.subscribe).mockImplementation((callback) => {
      callback(mockStory);
      return () => {};
    });
  });

  describe('rendering', () => {
    it('should render the function library header', () => {
      render(FunctionLibraryPanel);

      expect(screen.getByText('Function Library')).toBeTruthy();
    });

    it('should render action buttons', () => {
      render(FunctionLibraryPanel);

      expect(screen.getByText('+ New Function')).toBeTruthy();
      expect(screen.getByText('Load Templates')).toBeTruthy();
    });

    it('should render search input', () => {
      const { container } = render(FunctionLibraryPanel);

      const searchInput = container.querySelector('input[type="text"][placeholder="Search functions..."]');
      expect(searchInput).toBeTruthy();
    });

    it('should render category filter', () => {
      const { container } = render(FunctionLibraryPanel);

      const categoryFilter = container.querySelector('.category-filter');
      expect(categoryFilter).toBeTruthy();
    });

    it('should show empty state when no functions exist', () => {
      render(FunctionLibraryPanel);

      expect(screen.getByText('No functions found')).toBeTruthy();
    });

    it('should show placeholder when no function is selected', () => {
      render(FunctionLibraryPanel);

      expect(screen.getByText('Select a function to view details')).toBeTruthy();
    });
  });

  describe('function list', () => {
    beforeEach(() => {
      // Add some test functions
      const func1 = new LuaFunction();
      func1.name = 'testFunction1';
      func1.description = 'Test function 1';
      func1.category = 'Combat';
      func1.tags = ['test', 'combat'];

      const func2 = new LuaFunction();
      func2.name = 'testFunction2';
      func2.description = 'Test function 2';
      func2.category = 'Utility';
      func2.tags = ['test', 'helper'];

      mockStory.addLuaFunction(func1);
      mockStory.addLuaFunction(func2);
    });

    it('should render function items', () => {
      render(FunctionLibraryPanel);

      expect(screen.getByText('testFunction1')).toBeTruthy();
      expect(screen.getByText('testFunction2')).toBeTruthy();
    });

    it('should display function metadata', () => {
      render(FunctionLibraryPanel);

      expect(screen.getByText('Test function 1')).toBeTruthy();
      expect(screen.getByText('Combat')).toBeTruthy();
      expect(screen.getByText('Utility')).toBeTruthy();
    });

    it('should display function tags', () => {
      render(FunctionLibraryPanel);

      expect(screen.getByText('test')).toBeTruthy();
      expect(screen.getByText('combat')).toBeTruthy();
      expect(screen.getByText('helper')).toBeTruthy();
    });
  });

  describe('search functionality', () => {
    beforeEach(() => {
      const func1 = new LuaFunction();
      func1.name = 'calculateDamage';
      func1.description = 'Calculate combat damage';
      func1.category = 'Combat';

      const func2 = new LuaFunction();
      func2.name = 'healPlayer';
      func2.description = 'Restore player health';
      func2.category = 'Utility';

      mockStory.addLuaFunction(func1);
      mockStory.addLuaFunction(func2);
    });

    it('should filter functions by name', async () => {
      const { container } = render(FunctionLibraryPanel);

      const searchInput = container.querySelector('.search-input') as HTMLInputElement;
      await fireEvent.input(searchInput, { target: { value: 'damage' } });

      expect(screen.getByText('calculateDamage')).toBeTruthy();
      expect(screen.queryByText('healPlayer')).toBeFalsy();
    });

    it('should filter functions by description', async () => {
      const { container } = render(FunctionLibraryPanel);

      const searchInput = container.querySelector('.search-input') as HTMLInputElement;
      await fireEvent.input(searchInput, { target: { value: 'health' } });

      expect(screen.getByText('healPlayer')).toBeTruthy();
      expect(screen.queryByText('calculateDamage')).toBeFalsy();
    });

    it('should show no results when search has no matches', async () => {
      const { container } = render(FunctionLibraryPanel);

      const searchInput = container.querySelector('.search-input') as HTMLInputElement;
      await fireEvent.input(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No functions found')).toBeTruthy();
    });
  });

  describe('category filtering', () => {
    beforeEach(() => {
      const func1 = new LuaFunction();
      func1.name = 'combatFunction';
      func1.category = 'Combat';

      const func2 = new LuaFunction();
      func2.name = 'utilityFunction';
      func2.category = 'Utility';

      mockStory.addLuaFunction(func1);
      mockStory.addLuaFunction(func2);
    });

    it('should filter by category', async () => {
      const { container } = render(FunctionLibraryPanel);

      const categoryFilter = container.querySelector('.category-filter') as HTMLSelectElement;
      await fireEvent.change(categoryFilter, { target: { value: 'Combat' } });

      expect(screen.getByText('combatFunction')).toBeTruthy();
      expect(screen.queryByText('utilityFunction')).toBeFalsy();
    });

    it('should show all functions when "All" is selected', async () => {
      const { container } = render(FunctionLibraryPanel);

      const categoryFilter = container.querySelector('.category-filter') as HTMLSelectElement;
      await fireEvent.change(categoryFilter, { target: { value: 'All' } });

      expect(screen.getByText('combatFunction')).toBeTruthy();
      expect(screen.getByText('utilityFunction')).toBeTruthy();
    });
  });

  describe('function selection', () => {
    beforeEach(() => {
      const func1 = new LuaFunction();
      func1.name = 'testFunction';
      func1.description = 'Test description';
      func1.parameters = 'param1: string';
      func1.returnType = 'boolean';
      func1.code = 'function testFunction()\n  return true\nend';

      mockStory.addLuaFunction(func1);
    });

    it('should show function details when selected', async () => {
      render(FunctionLibraryPanel);

      const functionItem = screen.getByText('testFunction').closest('.function-item') as HTMLElement;
      await fireEvent.click(functionItem);

      expect(screen.getByText('Test description')).toBeTruthy();
      expect(screen.getByText('param1: string')).toBeTruthy();
      expect(screen.getByText('boolean')).toBeTruthy();
    });

    it('should highlight selected function', async () => {
      const { container } = render(FunctionLibraryPanel);

      const functionItem = screen.getByText('testFunction').closest('.function-item') as HTMLElement;
      await fireEvent.click(functionItem);

      expect(functionItem.classList.contains('active')).toBe(true);
    });
  });

  describe('function creation', () => {
    it('should open editor modal when creating new function', async () => {
      render(FunctionLibraryPanel);

      const newButton = screen.getByText('+ New Function');
      await fireEvent.click(newButton);

      expect(screen.getByText('New Function')).toBeTruthy();
    });

    it('should show form fields in editor modal', async () => {
      const { container } = render(FunctionLibraryPanel);

      const newButton = screen.getByText('+ New Function');
      await fireEvent.click(newButton);

      expect(container.querySelector('#func-name')).toBeTruthy();
      expect(container.querySelector('#func-desc')).toBeTruthy();
      expect(container.querySelector('#func-category')).toBeTruthy();
      expect(container.querySelector('#func-code')).toBeTruthy();
    });
  });

  describe('function editing', () => {
    beforeEach(() => {
      const func1 = new LuaFunction();
      func1.name = 'editableFunction';
      func1.description = 'Editable';

      mockStory.addLuaFunction(func1);
    });

    it('should open editor modal when edit button is clicked', async () => {
      const { container } = render(FunctionLibraryPanel);

      const functionItem = screen.getByText('editableFunction').closest('.function-item') as HTMLElement;
      await fireEvent.click(functionItem);

      const editButton = container.querySelector('[title="Edit"]') as HTMLElement;
      await fireEvent.click(editButton);

      expect(screen.getByText('Edit Function')).toBeTruthy();
    });

    it('should populate form with function data', async () => {
      const { container } = render(FunctionLibraryPanel);

      const functionItem = screen.getByText('editableFunction').closest('.function-item') as HTMLElement;
      await fireEvent.click(functionItem);

      const editButton = container.querySelector('[title="Edit"]') as HTMLElement;
      await fireEvent.click(editButton);

      const nameInput = container.querySelector('#func-name') as HTMLInputElement;
      expect(nameInput.value).toBe('editableFunction');
    });
  });

  describe('function deletion', () => {
    beforeEach(() => {
      const func1 = new LuaFunction();
      func1.name = 'deletableFunction';

      mockStory.addLuaFunction(func1);

      // Mock window.confirm
      vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('should show confirmation dialog', async () => {
      const { container } = render(FunctionLibraryPanel);

      const functionItem = screen.getByText('deletableFunction').closest('.function-item') as HTMLElement;
      await fireEvent.click(functionItem);

      const deleteButton = container.querySelector('[title="Delete"]') as HTMLElement;
      await fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
    });

    it('should remove function from story when confirmed', async () => {
      const { container } = render(FunctionLibraryPanel);

      const functionItem = screen.getByText('deletableFunction').closest('.function-item') as HTMLElement;
      await fireEvent.click(functionItem);

      const deleteButton = container.querySelector('[title="Delete"]') as HTMLElement;
      await fireEvent.click(deleteButton);

      expect(mockStory.getLuaFunction).toBeDefined();
    });
  });

  describe('function cloning', () => {
    beforeEach(() => {
      const func1 = new LuaFunction();
      func1.name = 'clonableFunction';
      func1.description = 'Original';

      mockStory.addLuaFunction(func1);
    });

    it('should create a copy when clone button is clicked', async () => {
      const { container } = render(FunctionLibraryPanel);

      const functionItem = screen.getByText('clonableFunction').closest('.function-item') as HTMLElement;
      await fireEvent.click(functionItem);

      const cloneButton = container.querySelector('[title="Clone"]') as HTMLElement;
      await fireEvent.click(cloneButton);

      expect(mockStory.addLuaFunction).toBeDefined();
    });
  });

  describe('template loading', () => {
    it('should load default templates when button is clicked', async () => {
      const loadSpy = vi.spyOn(mockStory, 'loadDefaultFunctionTemplates');

      render(FunctionLibraryPanel);

      const loadButton = screen.getByText('Load Templates');
      await fireEvent.click(loadButton);

      expect(loadSpy).toHaveBeenCalled();
    });
  });

  describe('code insertion', () => {
    beforeEach(() => {
      const func1 = new LuaFunction();
      func1.name = 'insertFunction';
      func1.code = 'function test() end';

      mockStory.addLuaFunction(func1);
    });

    it('should dispatch event when insert button is clicked', async () => {
      const { container } = render(FunctionLibraryPanel);

      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      const functionItem = screen.getByText('insertFunction').closest('.function-item') as HTMLElement;
      await fireEvent.click(functionItem);

      const insertButton = container.querySelector('[title="Insert into script"]') as HTMLElement;
      await fireEvent.click(insertButton);

      expect(dispatchSpy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle null story gracefully', () => {
      vi.mocked(currentStory.subscribe).mockImplementation((callback) => {
        callback(null);
        return () => {};
      });

      render(FunctionLibraryPanel);

      expect(screen.getByText('No functions found')).toBeTruthy();
    });

    it('should handle functions without tags', () => {
      const func1 = new LuaFunction();
      func1.name = 'noTagsFunction';
      func1.tags = [];

      mockStory.addLuaFunction(func1);

      render(FunctionLibraryPanel);

      expect(screen.getByText('noTagsFunction')).toBeTruthy();
    });

    it('should handle functions without optional fields', () => {
      const func1 = new LuaFunction();
      func1.name = 'minimalFunction';
      func1.parameters = '';
      func1.returnType = '';

      mockStory.addLuaFunction(func1);

      render(FunctionLibraryPanel);

      expect(screen.getByText('minimalFunction')).toBeTruthy();
    });
  });

  describe('modal interactions', () => {
    it('should close modal when cancel is clicked', async () => {
      render(FunctionLibraryPanel);

      const newButton = screen.getByText('+ New Function');
      await fireEvent.click(newButton);

      const cancelButton = screen.getByText('Cancel');
      await fireEvent.click(cancelButton);

      expect(screen.queryByText('New Function')).toBeFalsy();
    });

    it('should close modal when X button is clicked', async () => {
      const { container } = render(FunctionLibraryPanel);

      const newButton = screen.getByText('+ New Function');
      await fireEvent.click(newButton);

      const closeButton = container.querySelector('.btn-close') as HTMLElement;
      await fireEvent.click(closeButton);

      expect(screen.queryByText('New Function')).toBeFalsy();
    });
  });
});
