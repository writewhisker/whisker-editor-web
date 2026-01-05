import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScreenReaderAdapter } from '../ScreenReaderAdapter';

describe('ScreenReaderAdapter', () => {
  let adapter: ScreenReaderAdapter;

  beforeEach(() => {
    adapter = new ScreenReaderAdapter();
  });

  describe('constructor', () => {
    it('creates instance without dependencies', () => {
      expect(adapter).toBeInstanceOf(ScreenReaderAdapter);
    });

    it('creates via factory method', () => {
      const created = ScreenReaderAdapter.create();
      expect(created).toBeInstanceOf(ScreenReaderAdapter);
    });
  });

  describe('initLiveRegions', () => {
    it('initializes live regions', () => {
      const polite = { textContent: '' };
      const assertive = { textContent: '' };

      adapter.initLiveRegions(polite, assertive);

      expect(adapter.getLiveRegion('polite')).toBe(polite);
      expect(adapter.getLiveRegion('assertive')).toBe(assertive);
    });
  });

  describe('announce', () => {
    it('sets content on polite region by default', () => {
      const polite = { textContent: '' };
      adapter.initLiveRegions(polite, null);

      adapter.announce('Test message');

      expect(polite.textContent).toBe('Test message');
    });

    it('sets content on assertive region when specified', () => {
      const assertive = { textContent: '' };
      adapter.initLiveRegions(null, assertive);

      adapter.announce('Urgent message', 'assertive');

      expect(assertive.textContent).toBe('Urgent message');
    });

    it('ignores empty messages', () => {
      const polite = { textContent: 'existing' };
      adapter.initLiveRegions(polite, null);

      adapter.announce('');

      expect(polite.textContent).toBe('existing');
    });

    it('emits announcement event', () => {
      const emit = vi.fn();
      const adapterWithEvents = new ScreenReaderAdapter({
        eventBus: { emit, on: vi.fn(() => () => {}) },
      });

      adapterWithEvents.announce('Test');

      expect(emit).toHaveBeenCalledWith('a11y.announcement', {
        message: 'Test',
        priority: 'polite',
      });
    });

    it('queues rapid announcements', async () => {
      const polite = { textContent: '' };
      adapter.initLiveRegions(polite, null);

      adapter.announce('First');
      adapter.announce('Second');
      adapter.announce('Third');

      // First should be sent immediately
      expect(polite.textContent).toBe('First');

      // Queue should have 2 pending
      expect(adapter.getPendingCount()).toBe(2);
    });
  });

  describe('clearAnnouncements', () => {
    it('clears pending announcements', () => {
      adapter.announce('First');
      adapter.announce('Second');

      adapter.clearAnnouncements();

      expect(adapter.getPendingCount()).toBe(0);
    });

    it('clears live region contents', () => {
      const polite = { textContent: 'existing' };
      const assertive = { textContent: 'urgent' };
      adapter.initLiveRegions(polite, assertive);

      adapter.clearAnnouncements();

      expect(polite.textContent).toBe('');
      expect(assertive.textContent).toBe('');
    });
  });

  describe('getLiveRegion', () => {
    it('returns polite region by default', () => {
      const polite = { textContent: '' };
      adapter.initLiveRegions(polite, null);

      expect(adapter.getLiveRegion()).toBe(polite);
    });

    it('returns assertive region when specified', () => {
      const assertive = { textContent: '' };
      adapter.initLiveRegions(null, assertive);

      expect(adapter.getLiveRegion('assertive')).toBe(assertive);
    });
  });

  describe('announcePassageChange', () => {
    it('announces passage with title', () => {
      const polite = { textContent: '' };
      adapter.initLiveRegions(polite, null);

      adapter.announcePassageChange('The Beginning');

      expect(polite.textContent).toBe('New passage: The Beginning.');
    });

    it('includes choice count', () => {
      const polite = { textContent: '' };
      adapter.initLiveRegions(polite, null);

      adapter.announcePassageChange('Crossroads', 3);

      expect(polite.textContent).toBe('New passage: Crossroads. 3 choices available.');
    });

    it('uses singular for one choice', () => {
      const polite = { textContent: '' };
      adapter.initLiveRegions(polite, null);

      adapter.announcePassageChange('Dead End', 1);

      expect(polite.textContent).toBe('New passage: Dead End. 1 choice available.');
    });
  });

  describe('announceChoiceSelection', () => {
    it('announces selected choice', () => {
      const polite = { textContent: '' };
      adapter.initLiveRegions(polite, null);

      adapter.announceChoiceSelection('Go north');

      expect(polite.textContent).toBe('Selected: Go north');
    });
  });

  describe('announceError', () => {
    it('announces error assertively', () => {
      const assertive = { textContent: '' };
      adapter.initLiveRegions(null, assertive);

      adapter.announceError('Something went wrong');

      expect(assertive.textContent).toBe('Error: Something went wrong');
    });
  });

  describe('announceLoading', () => {
    it('announces loading start', () => {
      const polite = { textContent: '' };
      adapter.initLiveRegions(polite, null);

      adapter.announceLoading(true);

      expect(polite.textContent).toBe('Loading...');
    });

    it('announces loading complete', () => {
      const polite = { textContent: '' };
      adapter.initLiveRegions(polite, null);

      adapter.announceLoading(false);

      expect(polite.textContent).toBe('Loading complete.');
    });
  });

  describe('processQueue', () => {
    it('processes last queued announcement', () => {
      const polite = { textContent: '' };
      adapter.initLiveRegions(polite, null);

      adapter.announce('First');
      adapter.announce('Second');
      adapter.announce('Third');

      // Process the queue
      adapter.processQueue();

      expect(polite.textContent).toBe('Third');
      expect(adapter.getPendingCount()).toBe(0);
    });

    it('does nothing for empty queue', () => {
      const polite = { textContent: 'existing' };
      adapter.initLiveRegions(polite, null);

      adapter.processQueue();

      expect(polite.textContent).toBe('existing');
    });
  });

  describe('getLiveRegionHtml', () => {
    it('returns HTML for live regions', () => {
      const html = adapter.getLiveRegionHtml();

      expect(html).toContain('id="a11y-announcements"');
      expect(html).toContain('id="announcements-polite"');
      expect(html).toContain('id="announcements-assertive"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('aria-live="assertive"');
      expect(html).toContain('aria-atomic="true"');
    });
  });

  describe('setDebounceMs', () => {
    it('changes debounce time', () => {
      adapter.setDebounceMs(500);
      // This is more of a smoke test; actual behavior would require timing tests
    });
  });

  describe('getPendingCount', () => {
    it('returns 0 initially', () => {
      expect(adapter.getPendingCount()).toBe(0);
    });

    it('returns pending count after queuing', () => {
      adapter.announce('First');
      adapter.announce('Second');

      expect(adapter.getPendingCount()).toBe(1);
    });
  });
});
