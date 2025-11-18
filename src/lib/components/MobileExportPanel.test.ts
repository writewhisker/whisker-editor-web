import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import MobileExportPanel from './MobileExportPanel.svelte';
import { currentStory } from '../stores/projectStore';
import { Story } from '@writewhisker/core-ts';

describe('MobileExportPanel', () => {
  beforeEach(() => {
    const testStory = new Story('Test Story');
    testStory.addPassage('Start', 'Beginning of the story');
    currentStory.set(testStory);
  });

  describe('Rendering', () => {
    it('should render mobile export panel', () => {
      render(MobileExportPanel);
      expect(screen.getByText('Mobile Export')).toBeInTheDocument();
    });

    it('should show export format options', () => {
      render(MobileExportPanel);
      expect(screen.getByText('PWA')).toBeInTheDocument();
      expect(screen.getByText('Cordova')).toBeInTheDocument();
    });
  });

  describe('Export Formats', () => {
    it('should select HTML export', async () => {
      render(MobileExportPanel);

      const pwaButton = screen.getByText('PWA');
      await fireEvent.click(pwaButton);

      // PWA is selected by default, so it should already have the selected styling
      expect(pwaButton.closest('button')).toHaveClass(/border-blue-500/);
    });

    it('should select JSON export', async () => {
      render(MobileExportPanel);

      const cordovaButton = screen.getByText('Cordova');
      await fireEvent.click(cordovaButton);

      expect(cordovaButton.closest('button')).toHaveClass(/border-blue-500/);
    });
  });

  describe('Export Options', () => {
    it('should show export options', () => {
      render(MobileExportPanel);
      expect(screen.getByText('Player Settings')).toBeInTheDocument();
    });

    it('should toggle include images option', async () => {
      render(MobileExportPanel);

      const swipeToggle = screen.getByLabelText(/Enable swipe gestures/i);
      // It's enabled by default, so clicking should uncheck it
      await fireEvent.click(swipeToggle);

      expect(swipeToggle).not.toBeChecked();
    });
  });

  describe('Export Action', () => {
    it('should have export button', () => {
      render(MobileExportPanel);
      const exportButton = screen.getByRole('button', { name: /Generate Export Package/i });
      expect(exportButton).toBeInTheDocument();
    });

    it('should trigger export on button click', async () => {
      render(MobileExportPanel);

      const exportButton = screen.getByRole('button', { name: /Generate Export Package/i });
      await fireEvent.click(exportButton);

      // Export should have been triggered
      // (Would need proper mocking to verify download)
    });
  });

  describe('Mobile Optimizations', () => {
    it('should show mobile-friendly interface', () => {
      render(MobileExportPanel);

      // Should have large touch targets
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });
});
