/**
 * Motion Preference Manager
 * Handles reduced motion preferences for accessibility
 */

import type {
  A11yDependencies,
  MotionPreferenceSource,
  MotionPreferenceData,
} from './types';

/**
 * MotionPreference class
 * Manages reduced motion preferences for accessible animations
 */
export class MotionPreference {
  private events?: A11yDependencies['eventBus'];
  private log?: A11yDependencies['logger'];

  private reducedMotion: boolean = false;
  private userOverride: boolean | null = null;

  constructor(deps?: A11yDependencies) {
    this.events = deps?.eventBus;
    this.log = deps?.logger;
  }

  /**
   * Factory method for DI container
   */
  static create(deps?: A11yDependencies): MotionPreference {
    return new MotionPreference(deps);
  }

  /**
   * Check if reduced motion is enabled
   */
  isReducedMotion(): boolean {
    if (this.userOverride !== null) {
      return this.userOverride;
    }
    return this.reducedMotion;
  }

  /**
   * Set the system preference (from prefers-reduced-motion media query)
   */
  setSystemPreference(reduced: boolean): void {
    this.reducedMotion = reduced;

    if (this.userOverride === null) {
      this.events?.emit('a11y.motion_preference_changed', {
        reducedMotion: reduced,
        source: 'system',
      });
    }
  }

  /**
   * Enable reduced motion (user override)
   */
  enableReducedMotion(): void {
    this.userOverride = true;

    this.events?.emit('a11y.motion_preference_changed', {
      reducedMotion: true,
      source: 'user',
    });

    this.log?.debug('Reduced motion enabled by user');
  }

  /**
   * Disable reduced motion (user override)
   */
  disableReducedMotion(): void {
    this.userOverride = false;

    this.events?.emit('a11y.motion_preference_changed', {
      reducedMotion: false,
      source: 'user',
    });

    this.log?.debug('Reduced motion disabled by user');
  }

  /**
   * Reset to system preference
   */
  resetToSystem(): void {
    this.userOverride = null;

    this.events?.emit('a11y.motion_preference_changed', {
      reducedMotion: this.reducedMotion,
      source: 'system',
    });
  }

  /**
   * Toggle reduced motion preference
   */
  toggle(): void {
    if (this.isReducedMotion()) {
      this.disableReducedMotion();
    } else {
      this.enableReducedMotion();
    }
  }

  /**
   * Get animation duration based on preference
   */
  getAnimationDuration(normalDuration: number, reducedDuration: number = 1): number {
    if (this.isReducedMotion()) {
      return reducedDuration;
    }
    return normalDuration;
  }

  /**
   * Check if an animation should play
   */
  shouldAnimate(isEssential: boolean = false): boolean {
    if (isEssential) {
      return true; // Essential animations always play
    }
    return !this.isReducedMotion();
  }

  /**
   * Get CSS for reduced motion support
   */
  getCss(): string {
    return `@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

body[data-reduced-motion="true"] *,
body[data-reduced-motion="true"] *::before,
body[data-reduced-motion="true"] *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}

/* Safe transitions that don't cause motion sickness */
.safe-transition {
  transition: opacity 0.2s ease;
}

@media (prefers-reduced-motion: reduce) {
  .safe-transition {
    transition: opacity 0.05s ease;
  }
}`;
  }

  /**
   * Get JavaScript for detecting system preference
   */
  getDetectionJs(): string {
    return `(function() {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function updatePreference(e) {
    if (e.matches) {
      document.body.setAttribute('data-system-reduced-motion', 'true');
    } else {
      document.body.removeAttribute('data-system-reduced-motion');
    }

    // Dispatch event for framework integration
    window.dispatchEvent(new CustomEvent('whisker:motion-preference', {
      detail: { reducedMotion: e.matches }
    }));
  }

  // Initial check
  updatePreference(mediaQuery);

  // Listen for changes
  mediaQuery.addEventListener('change', updatePreference);
})();`;
  }

  /**
   * Get the current preference source
   */
  getSource(): MotionPreferenceSource {
    if (this.userOverride !== null) {
      return 'user';
    }
    return 'system';
  }

  /**
   * Serialize preference for storage
   */
  serialize(): MotionPreferenceData {
    return {
      userOverride: this.userOverride,
      systemPreference: this.reducedMotion,
    };
  }

  /**
   * Restore preference from storage
   */
  deserialize(data: MotionPreferenceData): void {
    if (data) {
      this.userOverride = data.userOverride;
      if (data.systemPreference !== undefined) {
        this.reducedMotion = data.systemPreference;
      }
    }
  }

  /**
   * Initialize from browser media query (for browser environments)
   */
  initFromMediaQuery(): void {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.setSystemPreference(mediaQuery.matches);

      // Listen for changes
      mediaQuery.addEventListener('change', (e) => {
        this.setSystemPreference(e.matches);
      });
    }
  }
}
