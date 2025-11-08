/**
 * Motion Utilities
 *
 * Provides utilities for managing animations with:
 * - Hardware acceleration (CSS transforms/opacity)
 * - Motion preferences (prefers-reduced-motion)
 * - Performance-optimized transitions
 */

import { writable } from 'svelte/store';

/**
 * Detect user's motion preference from system settings
 */
function detectMotionPreference(): boolean {
  if (typeof window === 'undefined') return false;

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

/**
 * Store for motion preference
 * - true: User prefers reduced motion (disable animations)
 * - false: User allows motion (enable animations)
 */
export const prefersReducedMotion = writable<boolean>(detectMotionPreference());

// Update preference when system setting changes
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', (e) => {
    prefersReducedMotion.set(e.matches);
  });
}

/**
 * Tailwind CSS classes for hardware-accelerated transitions
 * These use transform/opacity which trigger GPU acceleration
 */
export const motion = {
  /**
   * Fast transitions (100ms) - for immediate feedback
   * Uses transform/opacity for GPU acceleration
   */
  fast: 'transition-transform transition-opacity duration-100 ease-out',

  /**
   * Normal transitions (200ms) - for most UI interactions
   */
  normal: 'transition-transform transition-opacity duration-200 ease-out',

  /**
   * Slow transitions (300ms) - for emphasized state changes
   */
  slow: 'transition-transform transition-opacity duration-300 ease-out',

  /**
   * Color transitions (150ms) - for hover effects
   * Note: Colors don't benefit from GPU acceleration but are less expensive
   */
  colors: 'transition-colors duration-150 ease-out',

  /**
   * All properties transition (200ms) - use sparingly!
   * Less performant but sometimes necessary
   */
  all: 'transition-all duration-200 ease-out',
} as const;

/**
 * Motion-safe versions that respect prefers-reduced-motion
 * These classes will disable transitions when user prefers reduced motion
 */
export const motionSafe = {
  fast: 'motion-safe:transition-transform motion-safe:transition-opacity motion-safe:duration-100 motion-safe:ease-out',
  normal: 'motion-safe:transition-transform motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out',
  slow: 'motion-safe:transition-transform motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-out',
  colors: 'motion-safe:transition-colors motion-safe:duration-150 motion-safe:ease-out',
  all: 'motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out',
} as const;

/**
 * Get transition duration based on motion preference
 * Returns 0ms if user prefers reduced motion, normal duration otherwise
 */
export function getTransitionDuration(defaultMs: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : defaultMs;
}

/**
 * Conditional animation helper
 * Returns animation config only if user allows motion
 */
export function conditionalAnimation<T>(animation: T, reducedMotion: boolean): T | undefined {
  return reducedMotion ? undefined : animation;
}

/**
 * SvelteFlow animation config that respects motion preferences
 */
export function getFlowAnimationConfig(reducedMotion: boolean) {
  return {
    animated: !reducedMotion,
    duration: reducedMotion ? 0 : 400,
  };
}

/**
 * Hardware acceleration hints for CSS
 * Add these to elements that will be animated frequently
 */
export const hwAccel = {
  /**
   * Use for elements that will transform (scale, translate, rotate)
   */
  transform: 'will-change-transform',

  /**
   * Use for elements that will fade (opacity changes)
   */
  opacity: 'will-change-opacity',

  /**
   * Use for elements that will both transform and fade
   */
  auto: 'will-change-auto',
} as const;

/**
 * Animation easing functions (CSS custom properties)
 * These provide smoother, more natural animations
 */
export const easing = {
  // Standard easing
  ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Spring-like easing (more natural)
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Sharp easing (quick start, slow end)
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
} as const;

/**
 * Common animation durations (in ms)
 */
export const duration = {
  instant: 0,
  fast: 100,
  normal: 200,
  slow: 300,
  slower: 400,
  slowest: 500,
} as const;

/**
 * Performance-optimized CSS properties for animations
 * Only these properties should be animated for 60fps:
 * - transform (translate, scale, rotate)
 * - opacity
 * Avoid animating: width, height, top, left, margin, padding
 */
export const animatableProps = {
  safe: ['transform', 'opacity'] as const,
  caution: ['color', 'background-color', 'border-color'] as const,
  avoid: ['width', 'height', 'top', 'left', 'margin', 'padding'] as const,
} as const;
