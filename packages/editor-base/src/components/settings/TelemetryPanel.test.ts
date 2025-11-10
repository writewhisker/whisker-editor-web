import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';
import TelemetryPanel from './TelemetryPanel.svelte';
import { TelemetryService } from '../../services/TelemetryService';

// Mock the telemetry service
vi.mock('../../services/TelemetryService', () => {
  const mockService = {
    getMetrics: vi.fn(() => ({
      reads: 10,
      writes: 5,
      deletes: 2,
      errors: 1,
      totalReadTime: 100,
      totalWriteTime: 50,
      totalDeleteTime: 20,
      avgReadTime: 10,
      avgWriteTime: 10,
      avgDeleteTime: 10,
      lastOperation: 'read',
      lastOperationTime: Date.now() - 5000,
    })),
    getPerformanceHistory: vi.fn(() => []),
    getErrorHistory: vi.fn(() => []),
    getQuotaHistory: vi.fn(() => []),
    getPerformanceStats: vi.fn(() => ({
      totalOperations: 17,
      successRate: 94.1,
      avgDuration: 10,
      minDuration: 1,
      maxDuration: 50,
      operationCounts: {
        read: 10,
        write: 5,
        delete: 2,
      },
    })),
    getOperationsPerMinute: vi.fn(() => 3.4),
    getSnapshot: vi.fn(() => ({
      sessionDuration: 120000,
      timestamp: Date.now(),
    })),
    getCurrentQuota: vi.fn(() => Promise.resolve({
      used: 5000000,
      total: 50000000,
      available: 45000000,
      usagePercentage: 10,
    })),
    setEnabled: vi.fn(),
    reset: vi.fn(),
    exportData: vi.fn(() => JSON.stringify({ test: 'data' })),
    importData: vi.fn(() => true),
  };

  return {
    getTelemetryService: vi.fn(() => mockService),
  };
});

describe('TelemetryPanel', () => {
  let telemetryService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    telemetryService = new TelemetryService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render the panel with title', () => {
      const { container } = render(TelemetryPanel);

      expect(container.textContent).toContain('Telemetry & Monitoring');
    });

    it('should render all control buttons', () => {
      const { container } = render(TelemetryPanel);

      expect(container.textContent).toContain('Enabled');
      expect(container.textContent).toContain('Reset');
      expect(container.textContent).toContain('Export');
      expect(container.textContent).toContain('Import');
    });

    it('should display session information', () => {
      const { container } = render(TelemetryPanel);

      expect(container.textContent).toContain('Session Info');
      expect(container.textContent).toContain('Session Duration');
      expect(container.textContent).toContain('Operations/Min');
      expect(container.textContent).toContain('Last Operation');
    });

    it('should display storage metrics', () => {
      const { container } = render(TelemetryPanel);

      expect(container.textContent).toContain('Storage Operations');
      expect(container.textContent).toContain('Reads');
      expect(container.textContent).toContain('Writes');
      expect(container.textContent).toContain('Deletes');
      expect(container.textContent).toContain('Errors');
    });

    it('should display performance statistics', () => {
      const { container } = render(TelemetryPanel);

      expect(container.textContent).toContain('Performance Statistics');
      expect(container.textContent).toContain('Total Operations');
      expect(container.textContent).toContain('Success Rate');
      expect(container.textContent).toContain('Avg Duration');
    });

    it('should render storage quota section when quota available', async () => {
      const { container } = render(TelemetryPanel);

      await waitFor(() => {
        expect(container.textContent).toContain('Storage Quota');
      });
    });
  });

  describe('telemetry toggle', () => {
    it('should show enabled state by default', () => {
      const { container } = render(TelemetryPanel);

      const toggleButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Enabled'));

      expect(toggleButton).toBeTruthy();
      expect(toggleButton?.className).toContain('bg-green-500');
    });

    it('should toggle telemetry state when clicked', async () => {
      const { container } = render(TelemetryPanel);

      const toggleButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Enabled')) as HTMLButtonElement;

      await fireEvent.click(toggleButton);

      expect(telemetryService.setEnabled).toHaveBeenCalledWith(false);
      expect(container.textContent).toContain('Disabled');
    });

    it('should change button styling when disabled', async () => {
      const { container } = render(TelemetryPanel);

      const toggleButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Enabled')) as HTMLButtonElement;

      await fireEvent.click(toggleButton);

      const disabledButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent?.includes('Disabled'));

      expect(disabledButton?.className).toContain('bg-gray-500');
    });
  });

  describe('reset functionality', () => {
    it('should show confirmation dialog when reset clicked', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { container } = render(TelemetryPanel);

      const resetButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Reset') as HTMLButtonElement;

      await fireEvent.click(resetButton);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to reset all telemetry data?'
      );

      confirmSpy.mockRestore();
    });

    it('should reset telemetry when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const { container } = render(TelemetryPanel);

      const resetButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Reset') as HTMLButtonElement;

      await fireEvent.click(resetButton);

      expect(telemetryService.reset).toHaveBeenCalled();
      expect(telemetryService.getMetrics).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should not reset telemetry when cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      const { container } = render(TelemetryPanel);

      const resetButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Reset') as HTMLButtonElement;

      await fireEvent.click(resetButton);

      expect(telemetryService.reset).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('export functionality', () => {
    it('should export data when export button clicked', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      const { container } = render(TelemetryPanel);

      const exportButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Export') as HTMLButtonElement;

      await fireEvent.click(exportButton);

      expect(telemetryService.exportData).toHaveBeenCalled();
      expect(createElementSpy).toHaveBeenCalledWith('a');

      createElementSpy.mockRestore();
    });

    it('should create download link with correct filename', async () => {
      const { container } = render(TelemetryPanel);

      const exportButton = Array.from(container.querySelectorAll('button'))
        .find(btn => btn.textContent === 'Export') as HTMLButtonElement;

      await fireEvent.click(exportButton);

      expect(telemetryService.exportData).toHaveBeenCalled();
    });
  });

  describe('import functionality', () => {
    it('should have file input for import', () => {
      const { container } = render(TelemetryPanel);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      expect(fileInput).toBeTruthy();
      expect(fileInput.accept).toBe('.json');
    });

    it('should import data successfully', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const { container } = render(TelemetryPanel);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['{"test":"data"}'], 'telemetry.json', { type: 'application/json' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      await fireEvent.change(fileInput);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Telemetry data imported successfully!');
      });

      alertSpy.mockRestore();
    });

    it('should show error on invalid import data', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      telemetryService.importData = vi.fn(() => false);

      const { container } = render(TelemetryPanel);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['invalid'], 'telemetry.json', { type: 'application/json' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      await fireEvent.change(fileInput);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to import telemetry data. Invalid format.');
      });

      alertSpy.mockRestore();
    });

    it('should reset input after import', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const { container } = render(TelemetryPanel);

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

      const file = new File(['{"test":"data"}'], 'telemetry.json', { type: 'application/json' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      await fireEvent.change(fileInput);

      await waitFor(() => {
        expect(fileInput.value).toBe('');
      });

      alertSpy.mockRestore();
    });
  });

  describe('data updates', () => {
    it('should update metrics periodically', async () => {
      render(TelemetryPanel, { refreshInterval: 1000 });

      const initialCalls = telemetryService.getMetrics.mock.calls.length;

      vi.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(telemetryService.getMetrics.mock.calls.length).toBeGreaterThan(initialCalls);
      });
    });

    it('should stop updates when component unmounts', async () => {
      const { unmount } = render(TelemetryPanel, { refreshInterval: 1000 });

      unmount();

      const callsBeforeAdvance = telemetryService.getMetrics.mock.calls.length;
      vi.advanceTimersByTime(5000);

      expect(telemetryService.getMetrics.mock.calls.length).toBe(callsBeforeAdvance);
    });

    it('should use custom refresh interval', async () => {
      render(TelemetryPanel, { refreshInterval: 500 });

      const initialCalls = telemetryService.getMetrics.mock.calls.length;

      vi.advanceTimersByTime(500);

      await waitFor(() => {
        expect(telemetryService.getMetrics.mock.calls.length).toBeGreaterThan(initialCalls);
      });
    });
  });

  describe('metrics display', () => {
    it('should display metric values correctly', () => {
      const { container } = render(TelemetryPanel);

      expect(container.textContent).toContain('10'); // reads
      expect(container.textContent).toContain('5'); // writes
      expect(container.textContent).toContain('2'); // deletes
      expect(container.textContent).toContain('1'); // errors
    });

    it('should display operations per minute', () => {
      const { container } = render(TelemetryPanel);

      expect(container.textContent).toContain('3.40');
    });

    it('should display success rate', () => {
      const { container } = render(TelemetryPanel);

      expect(container.textContent).toContain('94.1%');
    });

    it('should display operation breakdown', () => {
      const { container } = render(TelemetryPanel);

      expect(container.textContent).toContain('Operation Breakdown');
    });
  });

  describe('performance history', () => {
    it('should show empty state when no operations recorded', () => {
      const { container } = render(TelemetryPanel);

      expect(container.textContent).toContain('No operations recorded yet');
    });

    it('should display recent operations', () => {
      telemetryService.getPerformanceHistory = vi.fn(() => [
        {
          operation: 'read',
          key: 'test-key',
          duration: 10,
          success: true,
          timestamp: Date.now(),
        },
      ] as any[]);

      const { container } = render(TelemetryPanel);

      expect(container.textContent).toContain('read');
      expect(container.textContent).toContain('test-key');
    });

    it('should limit history to last 10 operations', () => {
      const history: any[] = Array.from({ length: 15 }, (_, i) => ({
        operation: 'read',
        key: `key-${i}`,
        duration: 10,
        success: true,
        timestamp: Date.now() + i,
      }));

      telemetryService.getPerformanceHistory = vi.fn(() => history);

      const { container } = render(TelemetryPanel);

      const operations = container.querySelectorAll('.operation-item');
      expect(operations.length).toBe(10);
    });
  });

  describe('error history', () => {
    it('should not display error section when no errors', () => {
      const { container } = render(TelemetryPanel);

      const errorSection = container.textContent?.includes('Recent Errors');
      expect(errorSection).toBe(false);
    });

    it('should display recent errors', () => {
      telemetryService.getErrorHistory = vi.fn(() => [
        {
          operation: 'write',
          error: 'Failed to write data',
          key: 'test-key',
          timestamp: Date.now(),
        },
      ] as any);

      const { container } = render(TelemetryPanel);

      expect(container.textContent).toContain('Recent Errors');
      expect(container.textContent).toContain('Failed to write data');
      expect(container.textContent).toContain('write');
    });

    it('should limit error display to last 5 errors', () => {
      const errors: any[] = Array.from({ length: 10 }, (_, i) => ({
        operation: 'read',
        error: `Error ${i}`,
        timestamp: Date.now() + i,
      }));

      telemetryService.getErrorHistory = vi.fn(() => errors);

      const { container } = render(TelemetryPanel);

      const errorItems = container.querySelectorAll('.error-item');
      expect(errorItems.length).toBe(5);
    });
  });

  describe('storage quota', () => {
    it('should display quota information', async () => {
      const { container } = render(TelemetryPanel);

      await waitFor(() => {
        expect(container.textContent).toContain('Used:');
        expect(container.textContent).toContain('Total:');
        expect(container.textContent).toContain('Available:');
      });
    });

    it('should display quota percentage', async () => {
      const { container } = render(TelemetryPanel);

      await waitFor(() => {
        expect(container.textContent).toContain('10.0% used');
      });
    });

    it('should show green progress bar for low usage', async () => {
      const { container } = render(TelemetryPanel);

      await waitFor(() => {
        const progressBar = container.querySelector('.quota-bar div');
        expect(progressBar?.className).toContain('bg-green-500');
      });
    });

    it('should show yellow progress bar for medium usage', async () => {
      telemetryService.getCurrentQuota = vi.fn(() => Promise.resolve({
        used: 35000000,
        total: 50000000,
        available: 15000000,
        usagePercentage: 70,
      }));

      const { container } = render(TelemetryPanel);

      await waitFor(() => {
        const progressBar = container.querySelector('.quota-bar div');
        expect(progressBar?.className).toContain('bg-yellow-500');
      });
    });

    it('should show red progress bar for high usage', async () => {
      telemetryService.getCurrentQuota = vi.fn(() => Promise.resolve({
        used: 45000000,
        total: 50000000,
        available: 5000000,
        usagePercentage: 90,
      }));

      const { container } = render(TelemetryPanel);

      await waitFor(() => {
        const progressBar = container.querySelector('.quota-bar div');
        expect(progressBar?.className).toContain('bg-red-500');
      });
    });
  });

  describe('formatting helpers', () => {
    it('should format duration correctly', () => {
      const { container } = render(TelemetryPanel);

      // The formatted durations should appear in the average times
      expect(container.textContent).toContain('Avg:');
    });

    it('should format bytes correctly', async () => {
      const { container } = render(TelemetryPanel);

      await waitFor(() => {
        // Should show formatted byte values in quota section
        const quotaSection = container.querySelector('.quota-info');
        expect(quotaSection?.textContent).toBeTruthy();
      });
    });

    it('should format session duration correctly', () => {
      const { container } = render(TelemetryPanel);

      // Should show formatted session duration (2m 0s)
      expect(container.textContent).toContain('2m');
    });
  });

  describe('edge cases', () => {
    it('should handle zero metrics gracefully', () => {
      telemetryService.getMetrics = vi.fn(() => ({
        reads: 0,
        writes: 0,
        deletes: 0,
        errors: 0,
        totalReadTime: 0,
        totalWriteTime: 0,
        totalDeleteTime: 0,
        avgReadTime: 0,
        avgWriteTime: 0,
        avgDeleteTime: 0,
        lastOperation: null,
        lastOperationTime: null,
      }));

      const { container } = render(TelemetryPanel);

      expect(container.textContent).toContain('None'); // Last operation
    });

    it('should handle null quota', async () => {
      telemetryService.getCurrentQuota = vi.fn(() => Promise.resolve(null as any));

      const { container } = render(TelemetryPanel);

      await waitFor(() => {
        const quotaSection = container.textContent?.includes('Storage Quota');
        expect(quotaSection).toBe(false);
      });
    });

    it('should handle empty operation counts', () => {
      telemetryService.getPerformanceStats = vi.fn(() => ({
        totalOperations: 0,
        successRate: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        operationCounts: {},
      }));

      const { container } = render(TelemetryPanel);

      expect(container.textContent).toContain('0'); // Total operations
    });
  });
});
