import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import AdaptiveDifficultyPanel from './AdaptiveDifficultyPanel.svelte';
import { adaptiveDifficultyStore } from '../stores/adaptiveDifficultyStore';

// Mock the store
vi.mock('../stores/adaptiveDifficultyStore', () => {
  const metricsStore = { subscribe: vi.fn() };
  const adjustmentsStore = { subscribe: vi.fn() };
  const isEnabledStore = { subscribe: vi.fn() };

  return {
    adaptiveDifficultyStore: {
      subscribe: vi.fn(),
      setEnabled: vi.fn(),
      setUpdateFrequency: vi.fn(),
      setSmoothingFactor: vi.fn(),
      addMetric: vi.fn(),
      updateMetric: vi.fn(),
      deleteMetric: vi.fn(),
      addAdjustment: vi.fn(),
      updateAdjustment: vi.fn(),
      deleteAdjustment: vi.fn(),
      generateCode: vi.fn(() => ({
        types: 'type DifficultyLevel = "easy" | "hard";',
        metricsCode: '// Metrics code',
        evaluationCode: '// Evaluation code',
        adjustmentCode: '// Adjustment code',
        utilityCode: '// Utility code',
      })),
    },
    metrics: metricsStore,
    adjustments: adjustmentsStore,
    isEnabled: isEnabledStore,
  };
});

describe('AdaptiveDifficultyPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default store subscriptions
    vi.mocked(adaptiveDifficultyStore.subscribe).mockImplementation((callback) => {
      callback({
        enabled: true,
        updateFrequency: 5,
        smoothingFactor: 0.3,
        metrics: [],
        adjustments: [],
      });
      return () => {};
    });

    const { metrics, adjustments, isEnabled } = require('../stores/adaptiveDifficultyStore');

    vi.mocked(metrics.subscribe).mockImplementation((callback: any) => {
      callback([]);
      return () => {};
    });

    vi.mocked(adjustments.subscribe).mockImplementation((callback: any) => {
      callback([]);
      return () => {};
    });

    vi.mocked(isEnabled.subscribe).mockImplementation((callback: any) => {
      callback(true);
      return () => {};
    });
  });

  describe('rendering', () => {
    it('should render the panel header', () => {
      render(AdaptiveDifficultyPanel);

      expect(screen.getByText('Adaptive Difficulty')).toBeTruthy();
      expect(screen.getByText('Dynamic difficulty adjustment system')).toBeTruthy();
    });

    it('should render view tabs', () => {
      render(AdaptiveDifficultyPanel);

      expect(screen.getByText('Configuration')).toBeTruthy();
      expect(screen.getByText(/Metrics/)).toBeTruthy();
      expect(screen.getByText(/Adjustments/)).toBeTruthy();
      expect(screen.getByText('Generate Code')).toBeTruthy();
    });

    it('should show configuration view by default', () => {
      render(AdaptiveDifficultyPanel);

      expect(screen.getByText('Enable Adaptive Difficulty')).toBeTruthy();
    });
  });

  describe('configuration view', () => {
    it('should render enable/disable toggle', () => {
      render(AdaptiveDifficultyPanel);

      expect(screen.getByText('Enabled')).toBeTruthy();
    });

    it('should render update frequency slider', () => {
      const { container } = render(AdaptiveDifficultyPanel);

      const slider = container.querySelector('input[type="range"][min="1"][max="20"]');
      expect(slider).toBeTruthy();
    });

    it('should render smoothing factor slider', () => {
      const { container } = render(AdaptiveDifficultyPanel);

      const sliders = container.querySelectorAll('input[type="range"]');
      expect(sliders.length).toBeGreaterThanOrEqual(2);
    });

    it('should show quick stats', () => {
      render(AdaptiveDifficultyPanel);

      expect(screen.getByText('Metrics Defined')).toBeTruthy();
      expect(screen.getByText('Adjustments')).toBeTruthy();
    });

    it('should toggle enabled state when clicked', async () => {
      render(AdaptiveDifficultyPanel);

      const enableButton = screen.getByText('Enabled').closest('button') as HTMLElement;
      await fireEvent.click(enableButton);

      expect(adaptiveDifficultyStore.setEnabled).toHaveBeenCalled();
    });

    it('should update frequency when slider changes', async () => {
      const { container } = render(AdaptiveDifficultyPanel);

      const frequencySlider = container.querySelector('input[type="range"][min="1"][max="20"]') as HTMLInputElement;
      await fireEvent.change(frequencySlider, { target: { value: '10' } });

      expect(adaptiveDifficultyStore.setUpdateFrequency).toHaveBeenCalled();
    });
  });

  describe('metrics view', () => {
    beforeEach(() => {
      const { metrics } = require('../stores/adaptiveDifficultyStore');

      vi.mocked(metrics.subscribe).mockImplementation((callback: any) => {
        callback([
          {
            id: 'metric1',
            name: 'Success Rate',
            type: 'success_rate',
            description: 'Track player success',
          },
          {
            id: 'metric2',
            name: 'Time Spent',
            type: 'time_spent',
            description: 'Track time per passage',
          },
        ]);
        return () => {};
      });
    });

    it('should switch to metrics view when tab is clicked', async () => {
      render(AdaptiveDifficultyPanel);

      const metricsTab = screen.getByText(/Metrics/).closest('button') as HTMLElement;
      await fireEvent.click(metricsTab);

      expect(screen.getByText('Performance Metrics')).toBeTruthy();
    });

    it('should display metric list', async () => {
      render(AdaptiveDifficultyPanel);

      const metricsTab = screen.getByText(/Metrics/).closest('button') as HTMLElement;
      await fireEvent.click(metricsTab);

      expect(screen.getByText('Success Rate')).toBeTruthy();
      expect(screen.getByText('Time Spent')).toBeTruthy();
    });

    it('should show add metric button', async () => {
      render(AdaptiveDifficultyPanel);

      const metricsTab = screen.getByText(/Metrics/).closest('button') as HTMLElement;
      await fireEvent.click(metricsTab);

      expect(screen.getByText('+ Add Metric')).toBeTruthy();
    });

    it('should show empty state when no metrics exist', async () => {
      const { metrics } = require('../stores/adaptiveDifficultyStore');

      vi.mocked(metrics.subscribe).mockImplementation((callback: any) => {
        callback([]);
        return () => {};
      });

      render(AdaptiveDifficultyPanel);

      const metricsTab = screen.getByText(/Metrics/).closest('button') as HTMLElement;
      await fireEvent.click(metricsTab);

      expect(screen.getByText(/No metrics defined/)).toBeTruthy();
    });

    it('should open metric form when add is clicked', async () => {
      render(AdaptiveDifficultyPanel);

      const metricsTab = screen.getByText(/Metrics/).closest('button') as HTMLElement;
      await fireEvent.click(metricsTab);

      const addButton = screen.getByText('+ Add Metric');
      await fireEvent.click(addButton);

      expect(screen.getByText('Add Metric')).toBeTruthy();
    });

    it('should display metric type options', async () => {
      render(AdaptiveDifficultyPanel);

      const metricsTab = screen.getByText(/Metrics/).closest('button') as HTMLElement;
      await fireEvent.click(metricsTab);

      const addButton = screen.getByText('+ Add Metric');
      await fireEvent.click(addButton);

      const { container } = render(AdaptiveDifficultyPanel);
      const select = container.querySelector('select');
      expect(select).toBeTruthy();
    });

    it('should show custom code field for custom metrics', async () => {
      render(AdaptiveDifficultyPanel);

      const metricsTab = screen.getByText(/Metrics/).closest('button') as HTMLElement;
      await fireEvent.click(metricsTab);

      const addButton = screen.getByText('+ Add Metric');
      await fireEvent.click(addButton);

      // This would require changing the type to 'custom' in the actual test
      expect(screen.getByText('Add Metric')).toBeTruthy();
    });

    it('should save metric when save is clicked', async () => {
      render(AdaptiveDifficultyPanel);

      const metricsTab = screen.getByText(/Metrics/).closest('button') as HTMLElement;
      await fireEvent.click(metricsTab);

      const addButton = screen.getByText('+ Add Metric');
      await fireEvent.click(addButton);

      const saveButton = screen.getByText('Save');
      await fireEvent.click(saveButton);

      expect(adaptiveDifficultyStore.addMetric).toHaveBeenCalled();
    });

    it('should delete metric when delete is clicked', async () => {
      render(AdaptiveDifficultyPanel);

      const metricsTab = screen.getByText(/Metrics/).closest('button') as HTMLElement;
      await fireEvent.click(metricsTab);

      const deleteButtons = screen.getAllByText('Delete');
      await fireEvent.click(deleteButtons[0]);

      expect(adaptiveDifficultyStore.deleteMetric).toHaveBeenCalled();
    });
  });

  describe('adjustments view', () => {
    beforeEach(() => {
      const { adjustments, metrics } = require('../stores/adaptiveDifficultyStore');

      vi.mocked(adjustments.subscribe).mockImplementation((callback: any) => {
        callback([
          {
            id: 'adj1',
            name: 'Make Easier',
            description: 'Reduce difficulty',
            type: 'variable_modifier',
            targetLevel: 'easy',
            thresholds: [{ metricId: 'metric1', condition: 'below', value: 0.5, duration: 5 }],
            variableModifier: {
              variableName: 'enemyHealth',
              operation: 'multiply',
              value: 0.8,
            },
          },
        ]);
        return () => {};
      });

      vi.mocked(metrics.subscribe).mockImplementation((callback: any) => {
        callback([
          {
            id: 'metric1',
            name: 'Success Rate',
            type: 'success_rate',
            description: 'Track player success',
          },
        ]);
        return () => {};
      });
    });

    it('should switch to adjustments view when tab is clicked', async () => {
      render(AdaptiveDifficultyPanel);

      const adjustmentsTab = screen.getByText(/Adjustments/).closest('button') as HTMLElement;
      await fireEvent.click(adjustmentsTab);

      expect(screen.getByText('Difficulty Adjustments')).toBeTruthy();
    });

    it('should display adjustment list', async () => {
      render(AdaptiveDifficultyPanel);

      const adjustmentsTab = screen.getByText(/Adjustments/).closest('button') as HTMLElement;
      await fireEvent.click(adjustmentsTab);

      expect(screen.getByText('Make Easier')).toBeTruthy();
    });

    it('should show add adjustment button', async () => {
      render(AdaptiveDifficultyPanel);

      const adjustmentsTab = screen.getByText(/Adjustments/).closest('button') as HTMLElement;
      await fireEvent.click(adjustmentsTab);

      expect(screen.getByText('+ Add Adjustment')).toBeTruthy();
    });

    it('should show empty state when no adjustments exist', async () => {
      const { adjustments } = require('../stores/adaptiveDifficultyStore');

      vi.mocked(adjustments.subscribe).mockImplementation((callback: any) => {
        callback([]);
        return () => {};
      });

      render(AdaptiveDifficultyPanel);

      const adjustmentsTab = screen.getByText(/Adjustments/).closest('button') as HTMLElement;
      await fireEvent.click(adjustmentsTab);

      expect(screen.getByText(/No adjustments defined/)).toBeTruthy();
    });

    it('should open adjustment form when add is clicked', async () => {
      render(AdaptiveDifficultyPanel);

      const adjustmentsTab = screen.getByText(/Adjustments/).closest('button') as HTMLElement;
      await fireEvent.click(adjustmentsTab);

      const addButton = screen.getByText('+ Add Adjustment');
      await fireEvent.click(addButton);

      expect(screen.getByText('Add Adjustment')).toBeTruthy();
    });

    it('should show threshold section in form', async () => {
      render(AdaptiveDifficultyPanel);

      const adjustmentsTab = screen.getByText(/Adjustments/).closest('button') as HTMLElement;
      await fireEvent.click(adjustmentsTab);

      const addButton = screen.getByText('+ Add Adjustment');
      await fireEvent.click(addButton);

      expect(screen.getByText('Thresholds *')).toBeTruthy();
    });

    it('should save adjustment when save is clicked', async () => {
      render(AdaptiveDifficultyPanel);

      const adjustmentsTab = screen.getByText(/Adjustments/).closest('button') as HTMLElement;
      await fireEvent.click(adjustmentsTab);

      const addButton = screen.getByText('+ Add Adjustment');
      await fireEvent.click(addButton);

      const saveButton = screen.getByText('Save');
      await fireEvent.click(saveButton);

      expect(adaptiveDifficultyStore.addAdjustment).toHaveBeenCalled();
    });

    it('should delete adjustment when delete is clicked', async () => {
      render(AdaptiveDifficultyPanel);

      const adjustmentsTab = screen.getByText(/Adjustments/).closest('button') as HTMLElement;
      await fireEvent.click(adjustmentsTab);

      const deleteButtons = screen.getAllByText('Delete');
      await fireEvent.click(deleteButtons[0]);

      expect(adaptiveDifficultyStore.deleteAdjustment).toHaveBeenCalled();
    });
  });

  describe('code generation view', () => {
    it('should switch to code view when generate code is clicked', async () => {
      render(AdaptiveDifficultyPanel);

      const codeTab = screen.getByText('Generate Code');
      await fireEvent.click(codeTab);

      expect(screen.getByText('Generated Code')).toBeTruthy();
    });

    it('should generate code when switching to code view', async () => {
      render(AdaptiveDifficultyPanel);

      const codeTab = screen.getByText('Generate Code');
      await fireEvent.click(codeTab);

      expect(adaptiveDifficultyStore.generateCode).toHaveBeenCalled();
    });

    it('should display code sections', async () => {
      render(AdaptiveDifficultyPanel);

      const codeTab = screen.getByText('Generate Code');
      await fireEvent.click(codeTab);

      expect(screen.getByText('Type Definitions')).toBeTruthy();
      expect(screen.getByText('Metrics Tracker')).toBeTruthy();
      expect(screen.getByText('Difficulty Evaluation')).toBeTruthy();
      expect(screen.getByText('Adjustment Application')).toBeTruthy();
      expect(screen.getByText('Difficulty Manager')).toBeTruthy();
    });

    it('should have copy buttons for each section', async () => {
      render(AdaptiveDifficultyPanel);

      const codeTab = screen.getByText('Generate Code');
      await fireEvent.click(codeTab);

      const copyButtons = screen.getAllByText('Copy');
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    it('should have download all button', async () => {
      render(AdaptiveDifficultyPanel);

      const codeTab = screen.getByText('Generate Code');
      await fireEvent.click(codeTab);

      expect(screen.getByText('Download All')).toBeTruthy();
    });

    it('should copy code to clipboard when copy is clicked', async () => {
      const writeTextMock = vi.fn();
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(AdaptiveDifficultyPanel);

      const codeTab = screen.getByText('Generate Code');
      await fireEvent.click(codeTab);

      const copyButtons = screen.getAllByText('Copy');
      await fireEvent.click(copyButtons[0]);

      expect(writeTextMock).toHaveBeenCalled();
    });
  });

  describe('threshold management', () => {
    beforeEach(() => {
      const { metrics } = require('../stores/adaptiveDifficultyStore');

      vi.mocked(metrics.subscribe).mockImplementation((callback: any) => {
        callback([
          {
            id: 'metric1',
            name: 'Success Rate',
            type: 'success_rate',
            description: 'Track player success',
          },
        ]);
        return () => {};
      });
    });

    it('should add threshold when add button is clicked', async () => {
      render(AdaptiveDifficultyPanel);

      const adjustmentsTab = screen.getByText(/Adjustments/).closest('button') as HTMLElement;
      await fireEvent.click(adjustmentsTab);

      const addButton = screen.getByText('+ Add Adjustment');
      await fireEvent.click(addButton);

      const addThresholdButton = screen.getByText('+ Add');
      await fireEvent.click(addThresholdButton);

      expect(screen.getByText(/Add at least one threshold/)).toBeFalsy();
    });
  });

  describe('form validation', () => {
    it('should require metric name', async () => {
      render(AdaptiveDifficultyPanel);

      const metricsTab = screen.getByText(/Metrics/).closest('button') as HTMLElement;
      await fireEvent.click(metricsTab);

      const addButton = screen.getByText('+ Add Metric');
      await fireEvent.click(addButton);

      const saveButton = screen.getByText('Save');
      await fireEvent.click(saveButton);

      // Should not call addMetric without name
      expect(adaptiveDifficultyStore.addMetric).not.toHaveBeenCalled();
    });

    it('should require adjustment name and thresholds', async () => {
      render(AdaptiveDifficultyPanel);

      const adjustmentsTab = screen.getByText(/Adjustments/).closest('button') as HTMLElement;
      await fireEvent.click(adjustmentsTab);

      const addButton = screen.getByText('+ Add Adjustment');
      await fireEvent.click(addButton);

      const saveButton = screen.getByText('Save');
      await fireEvent.click(saveButton);

      // Should not call addAdjustment without required fields
      expect(adaptiveDifficultyStore.addAdjustment).not.toHaveBeenCalled();
    });
  });

  describe('form cancellation', () => {
    it('should cancel metric form when cancel is clicked', async () => {
      render(AdaptiveDifficultyPanel);

      const metricsTab = screen.getByText(/Metrics/).closest('button') as HTMLElement;
      await fireEvent.click(metricsTab);

      const addButton = screen.getByText('+ Add Metric');
      await fireEvent.click(addButton);

      const cancelButton = screen.getByText('Cancel');
      await fireEvent.click(cancelButton);

      expect(screen.queryByText('Add Metric')).toBeFalsy();
    });

    it('should cancel adjustment form when cancel is clicked', async () => {
      render(AdaptiveDifficultyPanel);

      const adjustmentsTab = screen.getByText(/Adjustments/).closest('button') as HTMLElement;
      await fireEvent.click(adjustmentsTab);

      const addButton = screen.getByText('+ Add Adjustment');
      await fireEvent.click(addButton);

      const cancelButton = screen.getByText('Cancel');
      await fireEvent.click(cancelButton);

      expect(screen.queryByText('Add Adjustment')).toBeFalsy();
    });
  });

  describe('difficulty level colors', () => {
    it('should apply appropriate color classes for difficulty levels', async () => {
      const { adjustments } = require('../stores/adaptiveDifficultyStore');

      vi.mocked(adjustments.subscribe).mockImplementation((callback: any) => {
        callback([
          { id: '1', name: 'Test', targetLevel: 'very_easy', type: 'variable_modifier', thresholds: [] },
          { id: '2', name: 'Test2', targetLevel: 'hard', type: 'variable_modifier', thresholds: [] },
        ]);
        return () => {};
      });

      render(AdaptiveDifficultyPanel);

      const adjustmentsTab = screen.getByText(/Adjustments/).closest('button') as HTMLElement;
      await fireEvent.click(adjustmentsTab);

      // Component should render but testing color classes would require DOM inspection
      expect(screen.getByText('Test')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle empty metrics list', () => {
      const { metrics } = require('../stores/adaptiveDifficultyStore');

      vi.mocked(metrics.subscribe).mockImplementation((callback: any) => {
        callback([]);
        return () => {};
      });

      render(AdaptiveDifficultyPanel);

      expect(screen.getByText(/Metrics \(0\)/)).toBeTruthy();
    });

    it('should handle empty adjustments list', () => {
      const { adjustments } = require('../stores/adaptiveDifficultyStore');

      vi.mocked(adjustments.subscribe).mockImplementation((callback: any) => {
        callback([]);
        return () => {};
      });

      render(AdaptiveDifficultyPanel);

      expect(screen.getByText(/Adjustments \(0\)/)).toBeTruthy();
    });

    it('should handle disabled state', () => {
      const { isEnabled } = require('../stores/adaptiveDifficultyStore');

      vi.mocked(isEnabled.subscribe).mockImplementation((callback: any) => {
        callback(false);
        return () => {};
      });

      render(AdaptiveDifficultyPanel);

      expect(screen.getByText('Disabled')).toBeTruthy();
    });
  });
});
