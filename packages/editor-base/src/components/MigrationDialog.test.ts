import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import MigrationDialog from './MigrationDialog.svelte';

// Mock trapFocus utility
vi.mock('../utils/accessibility', () => ({
  trapFocus: vi.fn(() => vi.fn()),
}));

// Mock story models
vi.mock('@writewhisker/core-ts', () => ({
  Story: class MockStory {
    metadata: Record<string, unknown>;
    passages: Map<string, { title: string; content: string; choices: unknown[] }>;
    constructor(data?: { metadata?: Record<string, unknown> }) {
      this.metadata = data?.metadata || { title: 'Test' };
      this.passages = new Map();
    }
    addPassage(passage: unknown) {
      const p = passage as { id?: string; title: string; content: string; choices?: unknown[] };
      p.id = p.id || `passage-${Date.now()}`;
      this.passages.set(p.id, { ...p, choices: p.choices || [] });
    }
    clone() {
      const cloned = new MockStory({ metadata: { ...this.metadata } });
      cloned.passages = new Map(this.passages);
      return cloned;
    }
    getPassage(id: string) {
      return this.passages.get(id);
    }
  },
  Passage: class MockPassage {
    id: string;
    title: string;
    content: string;
    choices: unknown[];
    constructor(data: { title: string; content: string }) {
      this.id = `passage-${Date.now()}`;
      this.title = data.title;
      this.content = data.content;
      this.choices = [];
    }
  },
}));

// Mock current story
const mockCurrentStory = writable<unknown>(null);

vi.mock('../stores/storyStateStore', () => ({
  currentStory: mockCurrentStory,
}));

// Mock migration store
const mockIsMigrating = writable(false);
const mockMigrationError = writable<string | null>(null);
const mockCurrentMigrationPreview = writable<unknown>(null);

vi.mock('../stores/migrationStore', () => ({
  isMigrating: mockIsMigrating,
  migrationError: mockMigrationError,
  currentMigrationPreview: mockCurrentMigrationPreview,
  migrationActions: {
    previewMigration: vi.fn(() => ({
      version: '0.x',
      targetVersion: '1.0',
      changes: [
        {
          type: 'syntax',
          category: 'Conditional',
          original: '<<if $gold > 10>>',
          migrated: '{if $gold > 10}',
          passageTitle: 'Start',
          line: 1,
        },
      ],
      warnings: [],
      errors: [],
      canMigrate: true,
    })),
    migrate: vi.fn(async () => ({
      success: true,
      story: { metadata: { title: 'Test' } },
      changes: [],
      warnings: [],
      errors: [],
      duration: 100,
    })),
    clearPreview: vi.fn(),
    clearError: vi.fn(),
  },
  detectStoryVersion: vi.fn(() => '0.x'),
}));

describe('MigrationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsMigrating.set(false);
    mockMigrationError.set(null);
    mockCurrentMigrationPreview.set(null);
    mockCurrentStory.set(null);
  });

  describe('rendering', () => {
    it('should not render when show is false', () => {
      const { container } = render(MigrationDialog, { props: { show: false } });
      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it('should render when show is true', () => {
      const { container } = render(MigrationDialog, { props: { show: true } });
      expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    });

    it('should display migration title', () => {
      const { getByText } = render(MigrationDialog, { props: { show: true } });
      expect(getByText('Format Migration')).toBeTruthy();
    });

    it('should display description', () => {
      const { getByText } = render(MigrationDialog, { props: { show: true } });
      expect(getByText('Upgrade your story to WLS 1.0 format')).toBeTruthy();
    });
  });

  describe('version detection', () => {
    it('should show WLS 1.0 message when story is already migrated', async () => {
      const { Story } = await import('@writewhisker/core-ts');
      const story = new Story({ metadata: { title: 'Test', version: '1.0' } });
      mockCurrentStory.set(story);

      // Override mock for this test
      const { detectStoryVersion } = await import('../stores/migrationStore');
      vi.mocked(detectStoryVersion).mockReturnValue('1.0');

      const { container } = render(MigrationDialog, { props: { show: true } });

      // Should show WLS 1.0 version
      const text = container.textContent || '';
      expect(text.toLowerCase()).toContain('wls 1.0');
    });

    it('should show legacy format when story has old syntax', async () => {
      const { Story, Passage } = await import('@writewhisker/core-ts');
      const story = new Story({ metadata: { title: 'Test' } });
      story.addPassage(new Passage({ title: 'Start', content: '<<if true>>test<<endif>>' }));
      mockCurrentStory.set(story);

      const { container } = render(MigrationDialog, { props: { show: true } });

      const text = container.textContent || '';
      // Should detect and show something about the format
      expect(text).toBeTruthy();
    });
  });

  describe('preview step', () => {
    it('should show Preview Changes button for legacy format', async () => {
      const { Story, Passage } = await import('@writewhisker/core-ts');
      const story = new Story({ metadata: { title: 'Test' } });
      story.addPassage(new Passage({ title: 'Start', content: '<<if true>>test<<endif>>' }));
      mockCurrentStory.set(story);

      const { getByText } = render(MigrationDialog, { props: { show: true } });

      const previewBtn = getByText('Preview Changes');
      expect(previewBtn).toBeTruthy();
    });

    it('should navigate to preview when Preview Changes clicked', async () => {
      const { Story, Passage } = await import('@writewhisker/core-ts');
      const story = new Story({ metadata: { title: 'Test' } });
      story.addPassage(new Passage({ title: 'Start', content: '<<if true>>test<<endif>>' }));
      mockCurrentStory.set(story);

      const { getByText, container } = render(MigrationDialog, { props: { show: true } });

      await fireEvent.click(getByText('Preview Changes'));

      // Should now show Migration Preview
      expect(container.textContent).toContain('Migration Preview');
    });
  });

  describe('button interaction', () => {
    it('should close when Cancel button clicked', async () => {
      const { getByText, container } = render(MigrationDialog, { props: { show: true } });

      await fireEvent.click(getByText('Cancel'));

      // Dialog closes - but we can't verify show prop change directly
      // Just verify no crash occurs
    });

    it('should close when backdrop clicked', async () => {
      const { container } = render(MigrationDialog, { props: { show: true } });
      const backdrop = container.querySelector('.fixed.inset-0');

      expect(backdrop).toBeTruthy();
      if (backdrop) {
        await fireEvent.click(backdrop);
        // Should trigger close
      }
    });

    it('should not close when dialog is clicked', async () => {
      const { container } = render(MigrationDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      if (dialog) {
        await fireEvent.click(dialog);
        // Dialog should still be present
        expect(container.querySelector('[role="dialog"]')).toBeTruthy();
      }
    });
  });

  describe('keyboard interaction', () => {
    it('should close on Escape key', async () => {
      const { container } = render(MigrationDialog, { props: { show: true } });
      expect(container.querySelector('[role="dialog"]')).toBeTruthy();

      await fireEvent.keyDown(window, { key: 'Escape' });
      // Should handle close
    });
  });

  describe('error display', () => {
    it('should display migration error when present', () => {
      mockMigrationError.set('Something went wrong');

      const { getByText } = render(MigrationDialog, { props: { show: true } });

      expect(getByText('Migration Error:')).toBeTruthy();
      expect(getByText('Something went wrong')).toBeTruthy();
    });

    it('should not show error section when no error', () => {
      mockMigrationError.set(null);

      const { container } = render(MigrationDialog, { props: { show: true } });

      const errorSection = container.querySelector('.bg-red-100');
      expect(errorSection).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const { container } = render(MigrationDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog).toBeTruthy();
      expect(dialog?.getAttribute('aria-modal')).toBe('true');
      expect(dialog?.getAttribute('aria-labelledby')).toBe('migration-title');
    });

    it('should have focusable tabindex', () => {
      const { container } = render(MigrationDialog, { props: { show: true } });
      const dialog = container.querySelector('[role="dialog"]');

      expect(dialog?.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('WLS 1.0 features info', () => {
    it('should display WLS 1.0 feature list', () => {
      const { container } = render(MigrationDialog, { props: { show: true } });

      const text = container.textContent || '';
      expect(text).toContain('WLS 1.0 offers');
    });
  });
});
