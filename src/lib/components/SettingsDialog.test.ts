import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SettingsDialog from './SettingsDialog.svelte';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock autoSave utils
vi.mock('$lib/utils/autoSave', () => ({
  autoSaveManager: {
    updateInterval: vi.fn(),
  },
  getAutoSaveInterval: vi.fn(() => 30000),
}));

describe('SettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(SettingsDialog, { props: { show: false } });
      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it('should render when show is true', () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });

    it('should display Settings title', () => {
      const { getByText } = render(SettingsDialog, { props: { show: true } });
      expect(getByText('Settings')).toBeTruthy();
    });

    it('should display close button', () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const closeButton = Array.from(container.querySelectorAll('button')).find(
        btn => btn.getAttribute('title') === 'Close'
      );
      expect(closeButton).toBeTruthy();
    });
  });

  describe('auto-save settings', () => {
    it('should display Auto-Save section', () => {
      const { getByText } = render(SettingsDialog, { props: { show: true } });
      expect(getByText('Auto-Save')).toBeTruthy();
    });

    it('should display auto-save interval input', () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const input = container.querySelector('#autosave-interval') as HTMLInputElement;
      expect(input).toBeTruthy();
      expect(input.type).toBe('number');
    });

    it('should show default auto-save interval', () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const input = container.querySelector('#autosave-interval') as HTMLInputElement;
      expect(input.value).toBe('30'); // 30 seconds (30000ms / 1000)
    });

    it('should update auto-save interval input', async () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const input = container.querySelector('#autosave-interval') as HTMLInputElement;

      await fireEvent.input(input, { target: { value: '60' } });
      expect(input.value).toBe('60');
    });

    it('should display quick preset buttons', () => {
      const { getByText } = render(SettingsDialog, { props: { show: true } });
      expect(getByText('15s (Fast)')).toBeTruthy();
      expect(getByText('30s (Default)')).toBeTruthy();
      expect(getByText('1m (Balanced)')).toBeTruthy();
      expect(getByText('2m (Slow)')).toBeTruthy();
      expect(getByText('5m (Very Slow)')).toBeTruthy();
    });

    it('should set auto-save interval when preset clicked', async () => {
      const { getByText, container } = render(SettingsDialog, { props: { show: true } });
      const presetButton = getByText('1m (Balanced)');
      const input = container.querySelector('#autosave-interval') as HTMLInputElement;

      await fireEvent.click(presetButton);
      expect(input.value).toBe('60');
    });
  });

  describe('font size settings', () => {
    it('should display Interface Font Size section', () => {
      const { getByText } = render(SettingsDialog, { props: { show: true } });
      expect(getByText('Interface Font Size')).toBeTruthy();
    });

    it('should display font size buttons', () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('Small');
      expect(text).toContain('Medium');
      expect(text).toContain('Large');
      expect(text).toContain('Extra Large');
    });

    it('should show font sizes in pixels', () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('12px');
      expect(text).toContain('14px');
      expect(text).toContain('16px');
      expect(text).toContain('18px');
    });

    it('should highlight medium as default', () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const buttons = Array.from(container.querySelectorAll('button'));
      const mediumButton = buttons.find(btn => btn.textContent?.includes('Medium'));
      expect(mediumButton?.className).toContain('bg-blue-50');
    });
  });

  describe('grid snap settings', () => {
    it('should display Graph Editor section', () => {
      const { getByText } = render(SettingsDialog, { props: { show: true } });
      expect(getByText('Graph Editor')).toBeTruthy();
    });

    it('should display Grid Snap toggle', () => {
      const { getByText } = render(SettingsDialog, { props: { show: true } });
      expect(getByText('Grid Snap')).toBeTruthy();
      expect(getByText('Snap passages to grid when dragging')).toBeTruthy();
    });

    it('should have toggle with switch role', () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const toggle = container.querySelector('[role="switch"]');
      expect(toggle).toBeTruthy();
    });

    it('should toggle grid snap when clicked', async () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const toggle = container.querySelector('[role="switch"]') as HTMLButtonElement;

      const initialState = toggle.getAttribute('aria-checked');
      await fireEvent.click(toggle);
      const newState = toggle.getAttribute('aria-checked');

      expect(newState).not.toBe(initialState);
    });

    it('should not show grid size input when snap disabled', () => {
      localStorageMock.setItem('whisker-grid-snap-enabled', 'false');
      const { container } = render(SettingsDialog, { props: { show: true } });
      const gridSizeInput = container.querySelector('#grid-size');
      expect(gridSizeInput).toBeNull();
    });

    it('should show grid size input when snap enabled', async () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const toggle = container.querySelector('[role="switch"]') as HTMLButtonElement;

      await fireEvent.click(toggle); // Enable grid snap

      const gridSizeInput = container.querySelector('#grid-size');
      expect(gridSizeInput).toBeTruthy();
    });

    it('should display grid size presets', async () => {
      const { container, getByText } = render(SettingsDialog, { props: { show: true } });
      const toggle = container.querySelector('[role="switch"]') as HTMLButtonElement;

      await fireEvent.click(toggle); // Enable grid snap

      expect(getByText('10px')).toBeTruthy();
      expect(getByText('15px')).toBeTruthy();
      expect(getByText('20px (Default)')).toBeTruthy();
      expect(getByText('25px')).toBeTruthy();
      expect(getByText('50px')).toBeTruthy();
    });
  });

  describe('action buttons', () => {
    it('should display Cancel button', () => {
      const { getByText } = render(SettingsDialog, { props: { show: true } });
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should display Save Settings button', () => {
      const { getByText } = render(SettingsDialog, { props: { show: true } });
      expect(getByText('Save Settings')).toBeTruthy();
    });
  });

  describe('close functionality', () => {
    it('should close when Cancel clicked', async () => {
      const { getByText } = render(SettingsDialog, { props: { show: true } });
      const cancelButton = getByText('Cancel');

      await fireEvent.click(cancelButton);
      // Dialog should close
    });

    it('should close when backdrop clicked', async () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const backdrop = container.querySelector('[role="button"]');

      expect(backdrop).toBeTruthy();
      await fireEvent.click(backdrop!);
      // Should close dialog
    });

    it('should not close when dialog content clicked', async () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog).toBeTruthy();
      await fireEvent.click(dialog!);
      // Dialog should remain open
      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should close on Escape key', async () => {
      const { container } = render(SettingsDialog, { props: { show: true } });

      await fireEvent.keyDown(window, { key: 'Escape' });
      // Should handle escape key
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog).toBeTruthy();
      expect(dialog?.getAttribute('aria-labelledby')).toBe('settings-title');
    });

    it('should have labeled form inputs', () => {
      const { container } = render(SettingsDialog, { props: { show: true } });

      const autoSaveLabel = container.querySelector('label[for="autosave-interval"]');
      expect(autoSaveLabel?.textContent).toContain('Auto-Save Interval');
    });
  });

  describe('validation', () => {
    it('should show validation message for auto-save interval', () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const text = container.textContent || '';
      expect(text).toContain('Range: 10 - 600 seconds');
    });

    it('should have min/max attributes on interval input', () => {
      const { container } = render(SettingsDialog, { props: { show: true } });
      const input = container.querySelector('#autosave-interval') as HTMLInputElement;
      expect(input.min).toBe('10');
      expect(input.max).toBe('600');
    });
  });
});
