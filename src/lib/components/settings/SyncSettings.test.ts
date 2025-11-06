import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import SyncSettings from './SyncSettings.svelte';
import { CloudStorageAdapter } from '../../services/storage/CloudStorageAdapter';

// Mock CloudStorageAdapter
vi.mock('../../services/storage/CloudStorageAdapter', () => ({
  CloudStorageAdapter: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('SyncSettings', () => {
  let mockAdapter: any;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();

    // Create mock adapter
    mockAdapter = {
      initialize: vi.fn().mockResolvedValue(undefined),
      sync: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      setSyncEnabled: vi.fn(),
      setConflictResolution: vi.fn(),
      getSyncStatus: vi.fn().mockReturnValue({
        lastSync: null,
        pendingOperations: 0,
        syncing: false,
        online: true,
        error: null,
      }),
    };

    vi.mocked(CloudStorageAdapter).mockImplementation(() => mockAdapter);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('rendering', () => {
    it('should render sync settings header', () => {
      const { getByText } = render(SyncSettings);
      expect(getByText('Cloud Sync Settings')).toBeTruthy();
    });

    it('should render configuration section', () => {
      const { getByText } = render(SyncSettings);
      expect(getByText('Configuration')).toBeTruthy();
    });

    it('should render all input fields', () => {
      const { getByText } = render(SyncSettings);
      expect(getByText('User ID')).toBeTruthy();
      expect(getByText('API Endpoint')).toBeTruthy();
      expect(getByText('API Key (optional)')).toBeTruthy();
      expect(getByText('Conflict Resolution')).toBeTruthy();
      expect(getByText('Sync Interval (seconds)')).toBeTruthy();
    });

    it('should render sync control buttons', () => {
      const { getByText } = render(SyncSettings);
      expect(getByText('Enable Sync')).toBeTruthy();
    });
  });

  describe('configuration inputs', () => {
    it('should allow typing in user ID field', async () => {
      const { container } = render(SyncSettings);
      const input = container.querySelector('input[type="text"]') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'user@example.com' } });

      expect(input.value).toBe('user@example.com');
    });

    it('should save settings when input changes', async () => {
      const { container } = render(SyncSettings);
      const input = container.querySelector('input[type="text"]') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: 'user@example.com' } });
      await fireEvent.change(input);

      const saved = JSON.parse(localStorageMock.getItem('whisker-cloud-sync-config') || '{}');
      expect(saved.userId).toBe('user@example.com');
    });

    it('should load saved settings on mount', async () => {
      localStorageMock.setItem(
        'whisker-cloud-sync-config',
        JSON.stringify({
          userId: 'saved@example.com',
          apiEndpoint: 'https://api.example.com',
          syncEnabled: true,
          conflictStrategy: 'newest',
          syncInterval: 60,
        })
      );

      const { container } = render(SyncSettings);

      await waitFor(() => {
        const inputs = container.querySelectorAll('input[type="text"]');
        expect((inputs[0] as HTMLInputElement).value).toBe('saved@example.com');
      });
    });

    it('should handle conflict resolution selection', async () => {
      const { container } = render(SyncSettings);
      const select = container.querySelector('select') as HTMLSelectElement;

      await fireEvent.change(select, { target: { value: 'local' } });

      expect(select.value).toBe('local');
    });

    it('should handle sync interval input', async () => {
      const { container } = render(SyncSettings);
      const intervalInput = container.querySelector(
        'input[type="number"]'
      ) as HTMLInputElement;

      await fireEvent.input(intervalInput, { target: { value: '60' } });

      expect(intervalInput.value).toBe('60');
    });
  });

  describe('sync enable/disable', () => {
    it('should enable sync when button clicked with valid config', async () => {
      const { container, getByText } = render(SyncSettings);

      // Set required fields
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(mockAdapter.initialize).toHaveBeenCalled();
      });
    });

    it('should show error when enabling without required config', async () => {
      const { getByText } = render(SyncSettings);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText(/Please configure User ID and API Endpoint/)).toBeTruthy();
      });
    });

    it('should change button to disable when sync is enabled', async () => {
      const { container, getByText } = render(SyncSettings);

      // Set required fields
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText('Disable Sync')).toBeTruthy();
      });
    });

    it('should disable sync when disable button clicked', async () => {
      const { container, getByText } = render(SyncSettings);

      // Enable sync first
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText('Disable Sync')).toBeTruthy();
      });

      const disableButton = getByText('Disable Sync');
      await fireEvent.click(disableButton);

      await waitFor(() => {
        expect(mockAdapter.close).toHaveBeenCalled();
      });
    });
  });

  describe('manual sync', () => {
    it('should show sync now button when sync is enabled', async () => {
      const { container, getByText } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText('Sync Now')).toBeTruthy();
      });
    });

    it('should trigger manual sync when sync now clicked', async () => {
      const { container, getByText } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText('Sync Now')).toBeTruthy();
      });

      const syncButton = getByText('Sync Now');
      await fireEvent.click(syncButton);

      await waitFor(() => {
        expect(mockAdapter.sync).toHaveBeenCalled();
      });
    });

    it('should disable sync button while syncing', async () => {
      mockAdapter.getSyncStatus.mockReturnValue({
        lastSync: null,
        pendingOperations: 0,
        syncing: true,
        online: true,
        error: null,
      });

      const { container, getByText } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        const syncButton = getByText('Syncing...') as HTMLButtonElement;
        expect(syncButton.disabled).toBe(true);
      });
    });
  });

  describe('sync status display', () => {
    it('should show sync status section when enabled', async () => {
      const { container, getByText } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText('Sync Status')).toBeTruthy();
      });
    });

    it('should display online status', async () => {
      const { container, getByText } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText(/Online/)).toBeTruthy();
      });
    });

    it('should display offline status when offline', async () => {
      mockAdapter.getSyncStatus.mockReturnValue({
        lastSync: null,
        pendingOperations: 0,
        syncing: false,
        online: false,
        error: null,
      });

      const { container, getByText } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText(/Offline/)).toBeTruthy();
      });
    });

    it('should display last sync time', async () => {
      mockAdapter.getSyncStatus.mockReturnValue({
        lastSync: Date.now() - 30000, // 30 seconds ago
        pendingOperations: 0,
        syncing: false,
        online: true,
        error: null,
      });

      const { container, getByText } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText(/ago/)).toBeTruthy();
      });
    });

    it('should display pending operations count', async () => {
      mockAdapter.getSyncStatus.mockReturnValue({
        lastSync: null,
        pendingOperations: 5,
        syncing: false,
        online: true,
        error: null,
      });

      const { container, getByText } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText('5')).toBeTruthy();
      });
    });

    it('should display error when present', async () => {
      mockAdapter.getSyncStatus.mockReturnValue({
        lastSync: null,
        pendingOperations: 0,
        syncing: false,
        online: true,
        error: 'Network connection failed',
      });

      const { container, getByText } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText(/Network connection failed/)).toBeTruthy();
      });
    });
  });

  describe('conflict resolution', () => {
    it('should update conflict resolution when changed', async () => {
      const { container, getByText } = render(SyncSettings);

      // Enable sync first
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(mockAdapter.initialize).toHaveBeenCalled();
      });

      const select = container.querySelector('select') as HTMLSelectElement;
      await fireEvent.change(select, { target: { value: 'local' } });

      expect(mockAdapter.setConflictResolution).toHaveBeenCalledWith('local');
    });

    it('should show all conflict resolution options', () => {
      const { getByText } = render(SyncSettings);

      expect(getByText('Use Newest (automatic)')).toBeTruthy();
      expect(getByText('Always Use Local')).toBeTruthy();
      expect(getByText('Always Use Remote')).toBeTruthy();
      expect(getByText('Ask Me (manual)')).toBeTruthy();
    });
  });

  describe('conflict dialog', () => {
    it('should not show conflict dialog by default', () => {
      const { queryByText } = render(SyncSettings);
      expect(queryByText('Resolve Sync Conflicts')).toBeNull();
    });

    // Note: Testing conflict dialog interaction requires more complex setup
    // as it involves the handleConflicts callback and window global state
  });

  describe('time formatting', () => {
    it('should format "Never" when lastSync is null', async () => {
      const { container, getByText } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText('Never')).toBeTruthy();
      });
    });

    it('should format seconds ago', async () => {
      mockAdapter.getSyncStatus.mockReturnValue({
        lastSync: Date.now() - 30000, // 30 seconds ago
        pendingOperations: 0,
        syncing: false,
        online: true,
        error: null,
      });

      const { container, getByText } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText(/s ago/)).toBeTruthy();
      });
    });
  });

  describe('status messages', () => {
    it('should show success message when sync enabled', async () => {
      const { container, getByText } = render(SyncSettings);

      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText(/Cloud sync enabled/)).toBeTruthy();
      });
    });

    it('should show success message when sync disabled', async () => {
      const { container, getByText } = render(SyncSettings);

      // Enable first
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText('Disable Sync')).toBeTruthy();
      });

      const disableButton = getByText('Disable Sync');
      await fireEvent.click(disableButton);

      await waitFor(() => {
        expect(getByText(/Cloud sync disabled/)).toBeTruthy();
      });
    });

    it('should show success message after manual sync', async () => {
      const { container, getByText } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText('Sync Now')).toBeTruthy();
      });

      const syncButton = getByText('Sync Now');
      await fireEvent.click(syncButton);

      await waitFor(() => {
        expect(getByText(/Sync completed successfully/)).toBeTruthy();
      });
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors', async () => {
      mockAdapter.initialize.mockRejectedValue(new Error('Init failed'));

      const { container, getByText } = render(SyncSettings);

      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText(/Failed to initialize sync/)).toBeTruthy();
      });
    });

    it('should handle sync errors', async () => {
      mockAdapter.sync.mockRejectedValue(new Error('Sync failed'));

      const { container, getByText } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(getByText('Sync Now')).toBeTruthy();
      });

      const syncButton = getByText('Sync Now');
      await fireEvent.click(syncButton);

      await waitFor(() => {
        expect(getByText(/Sync failed/)).toBeTruthy();
      });
    });
  });

  describe('edge cases', () => {
    it('should handle missing localStorage gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      const getItemSpy = vi.spyOn(localStorageMock, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { getByText } = render(SyncSettings);

      expect(getByText('Cloud Sync Settings')).toBeTruthy();
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
      getItemSpy.mockRestore();
    });

    it('should handle invalid stored JSON', () => {
      localStorageMock.setItem('whisker-cloud-sync-config', 'invalid json {{{');

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { getByText } = render(SyncSettings);

      expect(getByText('Cloud Sync Settings')).toBeTruthy();
      expect(consoleError).toHaveBeenCalled();

      consoleError.mockRestore();
    });

    it('should handle sync interval change', async () => {
      const { container, getByText } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(mockAdapter.initialize).toHaveBeenCalled();
      });

      // Change interval
      const intervalInput = container.querySelector(
        'input[type="number"]'
      ) as HTMLInputElement;
      await fireEvent.input(intervalInput, { target: { value: '60' } });
      await fireEvent.change(intervalInput);

      // Should close and reinitialize
      expect(mockAdapter.close).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should close adapter on component destroy', async () => {
      const { container, getByText, unmount } = render(SyncSettings);

      // Enable sync
      const inputs = container.querySelectorAll('input[type="text"]');
      await fireEvent.input(inputs[0], { target: { value: 'user@example.com' } });
      await fireEvent.change(inputs[0]);
      await fireEvent.input(inputs[1], { target: { value: 'https://api.example.com' } });
      await fireEvent.change(inputs[1]);

      const enableButton = getByText('Enable Sync');
      await fireEvent.click(enableButton);

      await waitFor(() => {
        expect(mockAdapter.initialize).toHaveBeenCalled();
      });

      unmount();

      expect(mockAdapter.close).toHaveBeenCalled();
    });
  });
});
