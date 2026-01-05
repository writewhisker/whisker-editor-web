/**
 * Screen Reader Adapter
 * Provides screen reader integration via ARIA live regions
 */

import type { A11yDependencies, LiveRegionPriority } from './types';

/**
 * Announcement entry
 */
interface Announcement {
  message: string;
  priority: LiveRegionPriority;
}

/**
 * Live region element interface
 */
interface LiveRegionElement {
  textContent: string | null;
}

/**
 * ScreenReaderAdapter class
 * Manages screen reader announcements via ARIA live regions
 */
export class ScreenReaderAdapter {
  private events?: A11yDependencies['eventBus'];
  private log?: A11yDependencies['logger'];

  private announcementQueue: Announcement[] = [];
  private lastAnnouncementTime: number = 0;
  private debounceMs: number = 100;

  private liveRegions: {
    polite: LiveRegionElement | null;
    assertive: LiveRegionElement | null;
  } = {
    polite: null,
    assertive: null,
  };

  constructor(deps?: A11yDependencies) {
    this.events = deps?.eventBus;
    this.log = deps?.logger;
  }

  /**
   * Factory method for DI container
   */
  static create(deps?: A11yDependencies): ScreenReaderAdapter {
    return new ScreenReaderAdapter(deps);
  }

  /**
   * Initialize live regions
   * Should be called when the UI is ready
   */
  initLiveRegions(
    politeElement: LiveRegionElement | null,
    assertiveElement: LiveRegionElement | null
  ): void {
    this.liveRegions.polite = politeElement;
    this.liveRegions.assertive = assertiveElement;
  }

  /**
   * Announce a message to screen readers
   */
  announce(message: string, priority: LiveRegionPriority = 'polite'): void {
    if (!message || message === '') {
      return;
    }

    // Debounce rapid announcements
    const currentTime = Date.now();
    if (currentTime - this.lastAnnouncementTime < this.debounceMs) {
      // Queue the announcement
      this.announcementQueue.push({
        message,
        priority,
      });
      return;
    }

    this.lastAnnouncementTime = currentTime;
    this.sendAnnouncement(message, priority);
  }

  /**
   * Internal method to send announcement to live region
   */
  private sendAnnouncement(message: string, priority: LiveRegionPriority): void {
    const region = this.liveRegions[priority];
    if (region) {
      region.textContent = message;
    }

    // Emit event for logging/testing
    this.events?.emit('a11y.announcement', {
      message,
      priority,
    });

    this.log?.debug(`Screen reader announcement: [${priority}] ${message}`);
  }

  /**
   * Clear all pending announcements
   */
  clearAnnouncements(): void {
    this.announcementQueue = [];

    // Clear live region contents
    if (this.liveRegions.polite) {
      this.liveRegions.polite.textContent = '';
    }
    if (this.liveRegions.assertive) {
      this.liveRegions.assertive.textContent = '';
    }
  }

  /**
   * Get the live region element for a priority
   */
  getLiveRegion(priority: LiveRegionPriority = 'polite'): LiveRegionElement | null {
    return this.liveRegions[priority];
  }

  /**
   * Announce passage change
   */
  announcePassageChange(passageTitle: string, choiceCount?: number): void {
    let message: string;

    if (choiceCount !== undefined && choiceCount > 0) {
      if (choiceCount === 1) {
        message = `New passage: ${passageTitle}. 1 choice available.`;
      } else {
        message = `New passage: ${passageTitle}. ${choiceCount} choices available.`;
      }
    } else {
      message = `New passage: ${passageTitle}.`;
    }

    this.announce(message, 'polite');
  }

  /**
   * Announce choice selection
   */
  announceChoiceSelection(choiceText: string): void {
    this.announce(`Selected: ${choiceText}`, 'polite');
  }

  /**
   * Announce an error
   */
  announceError(errorMessage: string): void {
    this.announce(`Error: ${errorMessage}`, 'assertive');
  }

  /**
   * Announce loading state
   */
  announceLoading(isLoading: boolean): void {
    if (isLoading) {
      this.announce('Loading...', 'polite');
    } else {
      this.announce('Loading complete.', 'polite');
    }
  }

  /**
   * Process queued announcements
   * Should be called periodically or after debounce timeout
   */
  processQueue(): void {
    if (this.announcementQueue.length === 0) {
      return;
    }

    // Get the most recent announcement (skip duplicates)
    const announcement = this.announcementQueue[this.announcementQueue.length - 1];
    this.announcementQueue = [];

    if (announcement) {
      this.sendAnnouncement(announcement.message, announcement.priority);
    }
  }

  /**
   * Get HTML for live regions
   * Returns HTML to be inserted into the page
   */
  getLiveRegionHtml(): string {
    return `<div id="a11y-announcements" class="sr-only">
  <div id="announcements-polite" aria-live="polite" aria-atomic="true"></div>
  <div id="announcements-assertive" aria-live="assertive" aria-atomic="true"></div>
</div>`;
  }

  /**
   * Set debounce time for announcements
   */
  setDebounceMs(ms: number): void {
    this.debounceMs = ms;
  }

  /**
   * Get pending announcement count
   */
  getPendingCount(): number {
    return this.announcementQueue.length;
  }

  /**
   * Initialize live regions from DOM (for browser environments)
   */
  initFromDom(): void {
    if (typeof document !== 'undefined') {
      const polite = document.getElementById('announcements-polite');
      const assertive = document.getElementById('announcements-assertive');
      this.initLiveRegions(polite, assertive);
    }
  }

  /**
   * Create live regions in DOM (for browser environments)
   */
  createLiveRegionsInDom(): void {
    if (typeof document !== 'undefined') {
      // Check if already exists
      if (document.getElementById('a11y-announcements')) {
        this.initFromDom();
        return;
      }

      // Create container
      const container = document.createElement('div');
      container.id = 'a11y-announcements';
      container.className = 'sr-only';
      container.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';

      // Create polite region
      const polite = document.createElement('div');
      polite.id = 'announcements-polite';
      polite.setAttribute('aria-live', 'polite');
      polite.setAttribute('aria-atomic', 'true');

      // Create assertive region
      const assertive = document.createElement('div');
      assertive.id = 'announcements-assertive';
      assertive.setAttribute('aria-live', 'assertive');
      assertive.setAttribute('aria-atomic', 'true');

      container.appendChild(polite);
      container.appendChild(assertive);
      document.body.appendChild(container);

      this.initLiveRegions(polite, assertive);
    }
  }
}
