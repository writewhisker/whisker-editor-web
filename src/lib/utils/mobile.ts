/**
 * Mobile detection and touch utilities
 */

import { writable, derived } from 'svelte/store';

/**
 * Detect if device is mobile based on screen width
 */
export const isMobile = writable(false);

/**
 * Detect if device supports touch
 */
export const isTouch = writable(false);

/**
 * Current screen orientation
 */
export const orientation = writable<'portrait' | 'landscape'>('portrait');

/**
 * Initialize mobile detection
 */
export function initMobileDetection() {
  if (typeof window === 'undefined') return;

  // Detect touch capability
  isTouch.set('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Detect mobile by screen width
  const updateMobile = () => {
    isMobile.set(window.innerWidth < 768);
  };

  // Detect orientation
  const updateOrientation = () => {
    orientation.set(window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
  };

  // Initial detection
  updateMobile();
  updateOrientation();

  // Listen for changes
  window.addEventListener('resize', () => {
    updateMobile();
    updateOrientation();
  });

  // Listen for orientation change
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      updateMobile();
      updateOrientation();
    }, 100);
  });
}

/**
 * Trigger haptic feedback (vibration)
 */
export function hapticFeedback(pattern: number | number[] = 10) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Detect if user agent is iOS
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Detect if user agent is Android
 */
export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

/**
 * Get safe area insets for iOS notch/home indicator
 */
export function getSafeAreaInsets() {
  if (typeof window === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };

  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
  };
}
