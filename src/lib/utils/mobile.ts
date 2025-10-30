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

/**
 * Long-press detection utility for touch devices
 * Returns a cleanup function to remove event listeners
 */
export interface LongPressOptions {
  /** Duration in ms to trigger long press (default: 500) */
  duration?: number;
  /** Movement threshold in px before canceling (default: 10) */
  moveThreshold?: number;
  /** Callback when long press is triggered */
  onLongPress: (event: TouchEvent) => void;
  /** Optional callback when touch starts */
  onTouchStart?: (event: TouchEvent) => void;
  /** Optional callback when touch ends normally */
  onTouchEnd?: (event: TouchEvent) => void;
}

export function setupLongPress(element: HTMLElement, options: LongPressOptions): () => void {
  const {
    duration = 500,
    moveThreshold = 10,
    onLongPress,
    onTouchStart,
    onTouchEnd,
  } = options;

  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let longPressTriggered = false;

  const handleTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    longPressTriggered = false;

    // Start long press timer
    longPressTimer = setTimeout(() => {
      longPressTriggered = true;
      hapticFeedback(20); // Medium vibration for long press
      onLongPress(event);
    }, duration);

    onTouchStart?.(event);
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (!longPressTimer) return;

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);

    // Cancel long press if touch moved too far
    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }

    if (!longPressTriggered) {
      onTouchEnd?.(event);
    }
  };

  const handleTouchCancel = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  // Add event listeners
  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });
  element.addEventListener('touchend', handleTouchEnd);
  element.addEventListener('touchcancel', handleTouchCancel);

  // Return cleanup function
  return () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
    }
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('touchcancel', handleTouchCancel);
  };
}

/**
 * Pinch-to-zoom gesture detection for touch devices
 * Returns a cleanup function to remove event listeners
 */
export interface PinchZoomOptions {
  /** Callback when pinch zoom occurs */
  onPinchZoom: (scale: number, centerX: number, centerY: number) => void;
  /** Callback when pinch starts */
  onPinchStart?: () => void;
  /** Callback when pinch ends */
  onPinchEnd?: () => void;
  /** Minimum scale threshold to trigger zoom (default: 0.1) */
  scaleThreshold?: number;
}

export function setupPinchZoom(element: HTMLElement, options: PinchZoomOptions): () => void {
  const { onPinchZoom, onPinchStart, onPinchEnd, scaleThreshold = 0.1 } = options;

  let initialDistance = 0;
  let currentDistance = 0;
  let isPinching = false;

  function getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getTouchCenter(touch1: Touch, touch2: Touch): { x: number; y: number } {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }

  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 2) {
      isPinching = true;
      initialDistance = getTouchDistance(event.touches[0], event.touches[1]);
      currentDistance = initialDistance;
      onPinchStart?.();
      event.preventDefault();
    }
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (!isPinching || event.touches.length !== 2) return;

    const newDistance = getTouchDistance(event.touches[0], event.touches[1]);
    const scale = newDistance / initialDistance;

    // Only trigger if scale changed significantly
    if (Math.abs(newDistance - currentDistance) > scaleThreshold) {
      const center = getTouchCenter(event.touches[0], event.touches[1]);
      onPinchZoom(scale, center.x, center.y);
      currentDistance = newDistance;
    }

    event.preventDefault();
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (isPinching && event.touches.length < 2) {
      isPinching = false;
      onPinchEnd?.();
    }
  };

  // Add event listeners with { passive: false } to allow preventDefault
  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });
  element.addEventListener('touchend', handleTouchEnd);
  element.addEventListener('touchcancel', handleTouchEnd);

  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('touchcancel', handleTouchEnd);
  };
}
