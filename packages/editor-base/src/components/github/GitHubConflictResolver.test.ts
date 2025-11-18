import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import GitHubConflictResolver from './GitHubConflictResolver.svelte';
import { Story, Passage, Variable } from '@writewhisker/core-ts';

// Mock StoryComparisonView component - return a simple Svelte component mock
vi.mock('../comparison/StoryComparisonView.svelte', () => ({
  default: vi.fn(),
}));

describe('GitHubConflictResolver', () => {
  let localStory: Story;
  let remoteStory: Story;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create local story
    localStory = new Story();
    localStory.metadata.title = 'My Story';
    // Clear default passage and add our test passages
    localStory.passages.clear();
    localStory.passages.set('1', new Passage({ id: '1', title: 'Start', content: 'Local content' }));
    localStory.passages.set('2', new Passage({ id: '2', title: 'Middle', content: 'More local content' }));

    // Create remote story with differences
    remoteStory = new Story();
    remoteStory.metadata.title = 'My Story';
    // Clear default passage and add our test passages
    remoteStory.passages.clear();
    remoteStory.passages.set('1', new Passage({ id: '1', title: 'Start', content: 'Remote content' }));
    remoteStory.passages.set('2', new Passage({ id: '2', title: 'Middle', content: 'More remote content' }));
    remoteStory.passages.set('3', new Passage({ id: '3', title: 'End', content: 'Remote ending' }));
  });

  describe('rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(GitHubConflictResolver, {
        props: {
          show: false,
          localVersion: null,
          remoteVersion: null,
          localModified: null,
          remoteModified: null,
        },
      });

      expect(container.querySelector('.fixed.inset-0')).toBeNull();
    });

    it('should render modal when show is true', () => {
      const { container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      expect(container.querySelector('.fixed.inset-0')).toBeTruthy();
    });

    it('should display warning icon and title', () => {
      const { getByText } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      expect(getByText('Sync Conflict Detected')).toBeTruthy();
      expect(getByText(/modified both locally and on GitHub/)).toBeTruthy();
    });

    it('should display version comparison panels', () => {
      const { getByText } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      expect(getByText('Your Local Version')).toBeTruthy();
      expect(getByText('GitHub Version')).toBeTruthy();
    });
  });

  describe('version information', () => {
    it('should display local version metadata', () => {
      const localDate = new Date('2024-01-01T12:00:00Z');
      const { container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: localDate,
          remoteModified: new Date(),
        },
      });

      // Find elements containing "Passages:" text
      const passagesElements = Array.from(container.querySelectorAll('span')).filter(
        (el) => el.textContent?.includes('Passages:')
      );
      expect(passagesElements.length).toBeGreaterThan(0);

      // Verify passage count of 2 for local version
      const text = container.textContent || '';
      expect(text).toContain('Passages: 2');
    });

    it('should display remote version metadata', () => {
      const { container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      // Verify passage count of 3 for remote version
      const text = container.textContent || '';
      expect(text).toContain('Passages: 3');
    });

    it('should format modification dates', () => {
      const localDate = new Date('2024-01-01T12:00:00Z');
      const remoteDate = new Date('2024-01-02T12:00:00Z');

      const { container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: localDate,
          remoteModified: remoteDate,
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('Modified:');
    });

    it('should handle null dates', () => {
      const { container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: null,
          remoteModified: null,
        },
      });

      // Check that "Unknown" appears in the text content
      const text = container.textContent || '';
      expect(text).toContain('Unknown');
    });
  });

  describe('change summary', () => {
    it('should show passage count differences', () => {
      const { container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      // Check for passage count comparison in the summary
      const text = container.textContent || '';
      expect(text).toContain('Passages: 2 local vs 3 remote');
    });

    it('should show variables count differences', () => {
      localStory.variables.set('var1', new Variable({ name: 'var1', initial: 1, type: 'number' }));
      remoteStory.variables.set('var1', new Variable({ name: 'var1', initial: 1, type: 'number' }));
      remoteStory.variables.set('var2', new Variable({ name: 'var2', initial: 2, type: 'number' }));

      const { getByText } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      expect(getByText(/Variables: 1 local vs 2 remote/)).toBeTruthy();
    });

    it('should handle null versions', () => {
      const { getByText } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: null,
          remoteVersion: null,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      expect(getByText(/Unable to compare versions/)).toBeTruthy();
    });
  });

  describe('resolution options', () => {
    it('should display all three resolution options', () => {
      const { getByText } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      expect(getByText('Keep My Local Changes')).toBeTruthy();
      expect(getByText('Use GitHub Version')).toBeTruthy();
      expect(getByText('Manual Merge (Advanced)')).toBeTruthy();
    });

    it('should select local resolution when clicked', async () => {
      const { getByText, container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      const localButton = getByText('Keep My Local Changes').closest('button');
      await fireEvent.click(localButton!);

      await waitFor(() => {
        expect(localButton?.className).toContain('border-blue-500');
      });
    });

    it('should select remote resolution when clicked', async () => {
      const { getByText } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      const remoteButton = getByText('Use GitHub Version').closest('button');
      await fireEvent.click(remoteButton!);

      await waitFor(() => {
        expect(remoteButton?.className).toContain('border-green-500');
      });
    });

    it('should select manual resolution when clicked', async () => {
      const { getByText } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      const manualButton = getByText('Manual Merge (Advanced)').closest('button');
      await fireEvent.click(manualButton!);

      await waitFor(() => {
        expect(manualButton?.className).toContain('border-purple-500');
      });
    });

    it('should show radio button indicator on selection', async () => {
      const { getByText, container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      const localButton = getByText('Keep My Local Changes').closest('button');
      await fireEvent.click(localButton!);

      await waitFor(() => {
        const radio = localButton?.querySelector('.w-5.h-5.rounded-full');
        expect(radio).toBeTruthy();
        expect(radio?.className).toContain('border-blue-500');
      });
    });
  });

  describe('comparison view', () => {
    it('should toggle comparison view', async () => {
      const { getByText, queryByText } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      const toggleButton = getByText(/Show detailed comparison/);
      await fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(getByText(/Hide detailed comparison/)).toBeTruthy();
      });
    });

    it('should not show comparison initially', () => {
      const { queryByText } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      expect(queryByText(/Hide detailed comparison/)).toBeNull();
    });
  });

  describe('apply resolution', () => {
    it('should apply resolution with local choice', async () => {
      const { getByText, container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      // Select local
      const localButton = getByText('Keep My Local Changes').closest('button');
      await fireEvent.click(localButton!);

      // Verify selection is shown
      await waitFor(() => {
        expect(localButton?.className).toContain('border-blue-500');
      });

      // Apply button should be enabled
      const applyButton = getByText('Apply Resolution');
      expect(applyButton.hasAttribute('disabled')).toBe(false);

      // Click apply - this should close the modal
      await fireEvent.click(applyButton);

      await waitFor(() => {
        expect(container.querySelector('.fixed.inset-0')).toBeNull();
      });
    });

    it('should apply resolution with remote choice', async () => {
      const { getByText, container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      // Select remote
      const remoteButton = getByText('Use GitHub Version').closest('button');
      await fireEvent.click(remoteButton!);

      // Verify selection is shown
      await waitFor(() => {
        expect(remoteButton?.className).toContain('border-green-500');
      });

      // Apply button should be enabled
      const applyButton = getByText('Apply Resolution');
      expect(applyButton.hasAttribute('disabled')).toBe(false);

      // Click apply - this should close the modal
      await fireEvent.click(applyButton);

      await waitFor(() => {
        expect(container.querySelector('.fixed.inset-0')).toBeNull();
      });
    });

    it('should apply resolution with manual choice', async () => {
      const { getByText, container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      // Select manual
      const manualButton = getByText('Manual Merge (Advanced)').closest('button');
      await fireEvent.click(manualButton!);

      // Verify selection is shown
      await waitFor(() => {
        expect(manualButton?.className).toContain('border-purple-500');
      });

      // Apply button should be enabled
      const applyButton = getByText('Apply Resolution');
      expect(applyButton.hasAttribute('disabled')).toBe(false);

      // Click apply - this should close the modal
      await fireEvent.click(applyButton);

      await waitFor(() => {
        expect(container.querySelector('.fixed.inset-0')).toBeNull();
      });
    });

    it('should disable apply button when no resolution selected', () => {
      const { getByText } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      const applyButton = getByText('Apply Resolution');
      expect(applyButton.hasAttribute('disabled')).toBe(true);
    });

    it('should enable apply button when resolution selected', async () => {
      const { getByText } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      const localButton = getByText('Keep My Local Changes').closest('button');
      await fireEvent.click(localButton!);

      await waitFor(() => {
        const applyButton = getByText('Apply Resolution');
        expect(applyButton.hasAttribute('disabled')).toBe(false);
      });
    });

    it('should close modal after applying resolution', async () => {
      const { getByText, container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      // Select and apply
      const localButton = getByText('Keep My Local Changes').closest('button');
      await fireEvent.click(localButton!);

      const applyButton = getByText('Apply Resolution');
      await fireEvent.click(applyButton);

      await waitFor(() => {
        expect(container.querySelector('.fixed.inset-0')).toBeNull();
      });
    });
  });

  describe('cancel functionality', () => {
    it('should close modal when cancel clicked', async () => {
      const { getByText, container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      const cancelButton = getByText('Cancel');
      await fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(container.querySelector('.fixed.inset-0')).toBeNull();
      });
    });

    it('should reset selection when cancelled', async () => {
      const { getByText, rerender } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      // Select local
      const localButton = getByText('Keep My Local Changes').closest('button');
      await fireEvent.click(localButton!);

      // Cancel
      await fireEvent.click(getByText('Cancel'));

      // Reopen
      await rerender({
        show: true,
        localVersion: localStory,
        remoteVersion: remoteStory,
        localModified: new Date(),
        remoteModified: new Date(),
      });

      await waitFor(() => {
        const applyButton = getByText('Apply Resolution');
        expect(applyButton.hasAttribute('disabled')).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle stories with same passage count', () => {
      remoteStory.passages.delete('3');

      const { container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      const text = container.textContent || '';
      expect(text).toContain('Content differences detected');
    });

    it('should handle missing metadata', () => {
      localStory.metadata = {} as any;
      remoteStory.metadata = {} as any;

      const { container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      expect(container.querySelector('.fixed.inset-0')).toBeTruthy();
    });

    it('should display warning styling', () => {
      const { container } = render(GitHubConflictResolver, {
        props: {
          show: true,
          localVersion: localStory,
          remoteVersion: remoteStory,
          localModified: new Date(),
          remoteModified: new Date(),
        },
      });

      const warningDiv = container.querySelector('.bg-yellow-50');
      expect(warningDiv).toBeTruthy();
    });
  });
});
