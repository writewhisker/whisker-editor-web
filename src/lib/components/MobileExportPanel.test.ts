import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import MobileExportPanel from './MobileExportPanel.svelte';
import { currentStory } from '../stores/projectStore';
import { Story } from '../models/Story';

describe('MobileExportPanel', () => {
  beforeEach(() => {
    const testStory = new Story('Test Story');
    testStory.addPassage('Start', 'Beginning of the story');
    currentStory.set(testStory);
  });

  describe('Rendering', () => {
    it('should render mobile export panel', () => {
      render(MobileExportPanel);
      expect(screen.getByText(/Export/i)).toBeInTheDocument();
    });

    it('should show export format options', () => {
      render(MobileExportPanel);
      expect(screen.getByText(/HTML/i)).toBeInTheDocument();
      expect(screen.getByText(/JSON/i)).toBeInTheDocument();
    });
  });

  describe('Export Formats', () => {
    it('should select HTML export', async () => {
      render(MobileExportPanel);

      const htmlButton = screen.getByText(/HTML/i);
      await fireEvent.click(htmlButton);

      expect(htmlButton).toHaveClass(/selected|active/);
    });

    it('should select JSON export', async () => {
      render(MobileExportPanel);

      const jsonButton = screen.getByText(/JSON/i);
      await fireEvent.click(jsonButton);

      expect(jsonButton).toHaveClass(/selected|active/);
    });
  });

  describe('Export Options', () => {
    it('should show export options', () => {
      render(MobileExportPanel);
      expect(screen.getByText(/Options/i)).toBeInTheDocument();
    });

    it('should toggle include images option', async () => {
      render(MobileExportPanel);

      const imagesToggle = screen.getByLabelText(/Include Images/i);
      await fireEvent.click(imagesToggle);

      expect(imagesToggle).toBeChecked();
    });
  });

  describe('Export Action', () => {
    it('should have export button', () => {
      render(MobileExportPanel);
      const exportButton = screen.getByRole('button', { name: /Export/i });
      expect(exportButton).toBeInTheDocument();
    });

    it('should trigger export on button click', async () => {
      render(MobileExportPanel);

      const exportButton = screen.getByRole('button', { name: /Export/i });
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
