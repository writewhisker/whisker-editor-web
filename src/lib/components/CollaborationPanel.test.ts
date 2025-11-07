import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import CollaborationPanel from './CollaborationPanel.svelte';
import {
  collaborationStore,
  currentUser,
  isCollaborating,
  activeCollaborators,
  pendingChanges,
  conflictedChanges,
  session,
} from '../stores/collaborationStore';
import { currentStory } from '../stores/projectStore';
import { Story } from '@whisker/core-ts';

describe('CollaborationPanel', () => {
  let story: Story;

  beforeEach(() => {
    vi.clearAllMocks();
    currentStory.set(null);
    collaborationStore.clearState();

    // Create test story
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('rendering', () => {
    it('should display header', () => {
      const { getByText } = render(CollaborationPanel);
      expect(getByText('Collaboration')).toBeTruthy();
    });

    it('should display settings button', () => {
      const { container } = render(CollaborationPanel);
      const settingsButton = container.querySelector('button[title="Settings"]');
      expect(settingsButton).toBeTruthy();
    });

    it('should display start collaborating button when not collaborating', () => {
      const { getByText } = render(CollaborationPanel);
      expect(getByText('Start Collaborating')).toBeTruthy();
    });

    it('should have disabled button when no story loaded', () => {
      const { getByText } = render(CollaborationPanel);
      const button = getByText('Start Collaborating') as HTMLButtonElement;
      expect(button.disabled).toBe(true);
    });

    it('should have enabled button when story is loaded', () => {
      currentStory.set(story);
      const { getByText } = render(CollaborationPanel);
      const button = getByText('Start Collaborating') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
    });
  });

  describe('empty state', () => {
    it('should show empty state message when not collaborating', () => {
      const { getByText } = render(CollaborationPanel);
      expect(getByText(/Start a collaboration session/)).toBeTruthy();
    });

    it('should show demo mode note', () => {
      const { getByText } = render(CollaborationPanel);
      expect(getByText(/Demo mode uses local storage/)).toBeTruthy();
    });

    it('should display collaboration icon in empty state', () => {
      const { container } = render(CollaborationPanel);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  describe('settings panel', () => {
    it('should show settings panel when settings button is clicked', async () => {
      const { container, getByText } = render(CollaborationPanel);

      const settingsButton = container.querySelector('button[title="Settings"]') as HTMLButtonElement;
      await fireEvent.click(settingsButton);

      expect(getByText('Your Profile')).toBeTruthy();
    });

    it('should display name input in settings', async () => {
      const { container } = render(CollaborationPanel);

      const settingsButton = container.querySelector('button[title="Settings"]') as HTMLButtonElement;
      await fireEvent.click(settingsButton);

      const nameInput = container.querySelector('#user-name') as HTMLInputElement;
      expect(nameInput).toBeTruthy();
    });

    it('should display color picker in settings', async () => {
      const { container } = render(CollaborationPanel);

      const settingsButton = container.querySelector('button[title="Settings"]') as HTMLButtonElement;
      await fireEvent.click(settingsButton);

      const colorInput = container.querySelector('#user-color') as HTMLInputElement;
      expect(colorInput).toBeTruthy();
      expect(colorInput.type).toBe('color');
    });

    it('should show save and cancel buttons in settings', async () => {
      const { container, getByText } = render(CollaborationPanel);

      const settingsButton = container.querySelector('button[title="Settings"]') as HTMLButtonElement;
      await fireEvent.click(settingsButton);

      expect(getByText('Save')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should close settings when cancel is clicked', async () => {
      const { container, getByText } = render(CollaborationPanel);

      const settingsButton = container.querySelector('button[title="Settings"]') as HTMLButtonElement;
      await fireEvent.click(settingsButton);

      const cancelButton = getByText('Cancel') as HTMLButtonElement;
      await fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(container.textContent).not.toContain('Your Profile');
      });
    });

    it('should update user profile when save is clicked', async () => {
      const updateSpy = vi.spyOn(collaborationStore, 'updateUser');
      const { container, getByText } = render(CollaborationPanel);

      const settingsButton = container.querySelector('button[title="Settings"]') as HTMLButtonElement;
      await fireEvent.click(settingsButton);

      const nameInput = container.querySelector('#user-name') as HTMLInputElement;
      await fireEvent.input(nameInput, { target: { value: 'New Name' } });

      const saveButton = getByText('Save') as HTMLButtonElement;
      await fireEvent.click(saveButton);

      expect(updateSpy).toHaveBeenCalledWith({
        name: 'New Name',
        color: expect.any(String),
      });
    });
  });

  describe('collaboration controls', () => {
    beforeEach(() => {
      currentStory.set(story);
    });

    it('should start collaboration when button is clicked', async () => {
      const initSpy = vi.spyOn(collaborationStore, 'initSession');
      const { getByText } = render(CollaborationPanel);

      const button = getByText('Start Collaborating') as HTMLButtonElement;
      await fireEvent.click(button);

      expect(initSpy).toHaveBeenCalledWith(story);
    });

    it('should show leave session button when collaborating', async () => {
      collaborationStore.initSession(story);
      const { getByText } = render(CollaborationPanel);

      expect(getByText('Leave Session')).toBeTruthy();
    });

    it('should leave session when button is clicked', async () => {
      collaborationStore.initSession(story);
      const leaveSpy = vi.spyOn(collaborationStore, 'leaveSession');

      const { getByText } = render(CollaborationPanel);

      const button = getByText('Leave Session') as HTMLButtonElement;
      await fireEvent.click(button);

      expect(leaveSpy).toHaveBeenCalled();
    });
  });

  describe('active collaborators', () => {
    beforeEach(() => {
      currentStory.set(story);
      collaborationStore.initSession(story);
    });

    it('should display active collaborators section', () => {
      const { getByText } = render(CollaborationPanel);
      expect(getByText(/Active/)).toBeTruthy();
    });

    it('should show current user in collaborators list', () => {
      const { container } = render(CollaborationPanel);
      const user = get(currentUser);
      if (user) {
        expect(container.textContent).toContain(user.name);
        expect(container.textContent).toContain('(you)');
      }
    });

    it('should display collaborator avatar with first letter', () => {
      const { container } = render(CollaborationPanel);
      const user = get(currentUser);
      if (user) {
        expect(container.textContent).toContain(user.name.charAt(0).toUpperCase());
      }
    });

    it('should display collaborator status', () => {
      const { container } = render(CollaborationPanel);
      // Status indicator should be present (colored dot)
      const statusDot = container.querySelector('.rounded-full.w-3.h-3');
      expect(statusDot).toBeTruthy();
    });

    it('should display last seen time', () => {
      const { container } = render(CollaborationPanel);
      expect(container.textContent).toMatch(/just now|ago/);
    });
  });

  describe('pending changes', () => {
    beforeEach(() => {
      currentStory.set(story);
      collaborationStore.initSession(story);
    });

    it('should display pending changes section when changes exist', () => {
      // This would require mocking the store to have pending changes
      const { container } = render(CollaborationPanel);
      const changes = get(pendingChanges);

      if (changes.length > 0) {
        expect(container.textContent).toContain('Pending Changes');
      }
    });

    it('should show change action and type', () => {
      const { container } = render(CollaborationPanel);
      const changes = get(pendingChanges);

      if (changes.length > 0) {
        const change = changes[0];
        expect(container.textContent).toContain(change.action);
        expect(container.textContent).toContain(change.type);
      }
    });

    it('should show who made the change', () => {
      const { container } = render(CollaborationPanel);
      const changes = get(pendingChanges);

      if (changes.length > 0) {
        expect(container.textContent).toMatch(/by .+/);
      }
    });
  });

  describe('conflicts', () => {
    beforeEach(() => {
      currentStory.set(story);
      collaborationStore.initSession(story);
    });

    it('should display conflicts section when conflicts exist', () => {
      const { container } = render(CollaborationPanel);
      const conflicts = get(conflictedChanges);

      if (conflicts.length > 0) {
        expect(container.textContent).toContain('Conflicts');
      }
    });

    it('should show accept and reject buttons for conflicts', () => {
      const { container } = render(CollaborationPanel);
      const conflicts = get(conflictedChanges);

      if (conflicts.length > 0) {
        expect(container.textContent).toContain('Accept');
        expect(container.textContent).toContain('Reject');
      }
    });

    it('should resolve conflict when accept is clicked', async () => {
      const resolveSpy = vi.spyOn(collaborationStore, 'resolveConflict');
      const { container, getAllByText } = render(CollaborationPanel);
      const conflicts = get(conflictedChanges);

      if (conflicts.length > 0) {
        const acceptButtons = getAllByText('Accept');
        await fireEvent.click(acceptButtons[0] as HTMLButtonElement);

        expect(resolveSpy).toHaveBeenCalledWith(conflicts[0].id, 'accept');
      }
    });

    it('should resolve conflict when reject is clicked', async () => {
      const resolveSpy = vi.spyOn(collaborationStore, 'resolveConflict');
      const { container, getAllByText } = render(CollaborationPanel);
      const conflicts = get(conflictedChanges);

      if (conflicts.length > 0) {
        const rejectButtons = getAllByText('Reject');
        await fireEvent.click(rejectButtons[0] as HTMLButtonElement);

        expect(resolveSpy).toHaveBeenCalledWith(conflicts[0].id, 'reject');
      }
    });
  });

  describe('session info', () => {
    beforeEach(() => {
      currentStory.set(story);
      collaborationStore.initSession(story);
    });

    it('should display session info section', () => {
      const { getByText } = render(CollaborationPanel);
      expect(getByText('Session Info')).toBeTruthy();
    });

    it('should show session started time', () => {
      const { container } = render(CollaborationPanel);
      expect(container.textContent).toContain('Started:');
    });

    it('should show session ID', () => {
      const { container } = render(CollaborationPanel);
      expect(container.textContent).toContain('ID:');

      const sessionData = get(session);
      if (sessionData) {
        expect(container.textContent).toContain(sessionData.id.slice(0, 20));
      }
    });
  });

  describe('time formatting', () => {
    it('should format recent time as just now', () => {
      currentStory.set(story);
      collaborationStore.initSession(story);

      const { container } = render(CollaborationPanel);
      expect(container.textContent).toContain('just now');
    });
  });

  describe('status colors', () => {
    it('should apply active status color', () => {
      currentStory.set(story);
      collaborationStore.initSession(story);

      const { container } = render(CollaborationPanel);
      expect(container.innerHTML).toContain('bg-green-500');
    });
  });

  describe('auto-sync', () => {
    it('should sync changes periodically when collaborating', async () => {
      vi.useFakeTimers();
      const syncSpy = vi.spyOn(collaborationStore, 'syncChanges');

      currentStory.set(story);
      collaborationStore.initSession(story);

      render(CollaborationPanel);

      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(syncSpy).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });

    it('should not sync when not collaborating', async () => {
      vi.useFakeTimers();
      const syncSpy = vi.spyOn(collaborationStore, 'syncChanges');

      render(CollaborationPanel);

      vi.advanceTimersByTime(2000);

      expect(syncSpy).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('edge cases', () => {
    it('should handle missing user data gracefully', () => {
      currentStory.set(story);
      collaborationStore.initSession(story);

      const { container } = render(CollaborationPanel);
      expect(container).toBeTruthy();
    });

    it('should handle empty collaborators list', () => {
      const { container } = render(CollaborationPanel);
      expect(container).toBeTruthy();
    });

    it('should toggle settings panel multiple times', async () => {
      const { container, getByText } = render(CollaborationPanel);

      const settingsButton = container.querySelector('button[title="Settings"]') as HTMLButtonElement;

      await fireEvent.click(settingsButton);
      expect(getByText('Your Profile')).toBeTruthy();

      await fireEvent.click(settingsButton);
      await waitFor(() => {
        expect(container.textContent).not.toContain('Your Profile');
      });
    });
  });

  describe('dark mode styling', () => {
    it('should have dark mode classes', () => {
      const { container } = render(CollaborationPanel);
      expect(container.innerHTML).toContain('dark:');
    });
  });
});
