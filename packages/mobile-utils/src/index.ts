/**
 * Mobile Utils
 *
 * Framework-agnostic mobile and touch utilities.
 * Gesture detection, swipe, pinch, touch event handling.
 */

export interface TouchPoint {
  x: number;
  y: number;
  identifier: number;
}

export interface SwipeEvent {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface PinchEvent {
  scale: number;
  distance: number;
  centerX: number;
  centerY: number;
}

/**
 * Swipe gesture detector
 */
export class SwipeDetector {
  private element: HTMLElement;
  private startX: number = 0;
  private startY: number = 0;
  private startTime: number = 0;
  private threshold: number;
  private onSwipe?: (event: SwipeEvent) => void;

  constructor(element: HTMLElement, threshold: number = 50) {
    this.element = element;
    this.threshold = threshold;

    this.element.addEventListener('touchstart', this.handleTouchStart);
    this.element.addEventListener('touchend', this.handleTouchEnd);
  }

  on(callback: (event: SwipeEvent) => void): this {
    this.onSwipe = callback;
    return this;
  }

  destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchend', this.handleTouchEnd);
  }

  private handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.startTime = Date.now();
  };

  private handleTouchEnd = (e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();

    const dx = endX - this.startX;
    const dy = endY - this.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = endTime - this.startTime;

    if (distance < this.threshold) return;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    let direction: SwipeEvent['direction'];
    if (absDx > absDy) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }

    this.onSwipe?.({
      direction,
      distance,
      duration,
      startX: this.startX,
      startY: this.startY,
      endX,
      endY,
    });
  };
}

/**
 * Pinch gesture detector
 */
export class PinchDetector {
  private element: HTMLElement;
  private initialDistance: number = 0;
  private onPinch?: (event: PinchEvent) => void;

  constructor(element: HTMLElement) {
    this.element = element;
    this.element.addEventListener('touchstart', this.handleTouchStart);
    this.element.addEventListener('touchmove', this.handleTouchMove);
  }

  on(callback: (event: PinchEvent) => void): this {
    this.onPinch = callback;
    return this;
  }

  destroy(): void {
    this.element.removeEventListener('touchstart', this.handleTouchStart);
    this.element.removeEventListener('touchmove', this.handleTouchMove);
  }

  private getDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      this.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = this.getDistance(touch1, touch2);
      const scale = currentDistance / this.initialDistance;

      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;

      this.onPinch?.({
        scale,
        distance: currentDistance,
        centerX,
        centerY,
      });
    }
  };
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if device is tablet
 */
export function isTablet(): boolean {
  return /(iPad|Android(?!.*Mobile))/i.test(navigator.userAgent);
}

/**
 * Check if touch is supported
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Prevent bounce/overscroll on iOS
 */
export function preventBounce(element: HTMLElement): () => void {
  const prevent = (e: TouchEvent) => {
    const target = e.target as HTMLElement;
    const scrollable = target.closest('[data-scrollable]');

    if (!scrollable) {
      e.preventDefault();
    }
  };

  element.addEventListener('touchmove', prevent, { passive: false });

  return () => {
    element.removeEventListener('touchmove', prevent);
  };
}

/**
 * Get viewport dimensions
 */
export function getViewportSize(): { width: number; height: number } {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}
