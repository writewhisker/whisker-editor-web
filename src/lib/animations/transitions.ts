/**
 * Transition Animations
 *
 * Animation utilities for story passages and elements.
 */

export type TransitionType = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'typewriter' | 'zoom-in' | 'zoom-out' | 'none';
export type EasingFunction = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface TransitionOptions {
  type: TransitionType;
  duration?: number; // milliseconds
  delay?: number;
  easing?: EasingFunction;
}

/**
 * Apply transition to element
 */
export function applyTransition(
  element: HTMLElement,
  options: TransitionOptions
): Promise<void> {
  const duration = options.duration || 300;
  const delay = options.delay || 0;
  const easing = options.easing || 'ease';

  return new Promise((resolve) => {
    // Apply initial state
    switch (options.type) {
      case 'fade':
        element.style.opacity = '0';
        break;
      case 'slide-left':
        element.style.transform = 'translateX(100%)';
        break;
      case 'slide-right':
        element.style.transform = 'translateX(-100%)';
        break;
      case 'slide-up':
        element.style.transform = 'translateY(100%)';
        break;
      case 'slide-down':
        element.style.transform = 'translateY(-100%)';
        break;
    }

    // Apply transition
    element.style.transition = `all ${duration}ms ${easing} ${delay}ms`;

    // Trigger reflow
    element.offsetHeight;

    // Apply final state
    setTimeout(() => {
      switch (options.type) {
        case 'fade':
          element.style.opacity = '1';
          break;
        case 'slide-left':
        case 'slide-right':
        case 'slide-up':
        case 'slide-down':
          element.style.transform = 'translateX(0) translateY(0)';
          break;
      }

      // Clean up after transition
      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, duration + delay);
    }, 10);
  });
}

/**
 * Typewriter effect for text
 */
export function typewriterEffect(
  element: HTMLElement,
  text: string,
  speed: number = 50
): Promise<void> {
  return new Promise((resolve) => {
    element.textContent = '';
    let index = 0;

    const interval = setInterval(() => {
      if (index < text.length) {
        element.textContent += text[index];
        index++;
      } else {
        clearInterval(interval);
        resolve();
      }
    }, speed);
  });
}

/**
 * Svelte transition function for fade
 */
export function fade(node: HTMLElement, { duration = 300, delay = 0 } = {}) {
  return {
    duration,
    delay,
    css: (t: number) => `opacity: ${t}`,
  };
}

/**
 * Svelte transition function for slide
 */
export function slide(
  node: HTMLElement,
  { duration = 300, delay = 0, direction = 'left' } = {}
) {
  const style = getComputedStyle(node);
  const transform = style.transform === 'none' ? '' : style.transform;

  let x = 0, y = 0;
  switch (direction) {
    case 'left':
      x = node.offsetWidth;
      break;
    case 'right':
      x = -node.offsetWidth;
      break;
    case 'up':
      y = node.offsetHeight;
      break;
    case 'down':
      y = -node.offsetHeight;
      break;
  }

  return {
    duration,
    delay,
    css: (t: number) => {
      const eased = 1 - Math.pow(1 - t, 3);
      return `transform: ${transform} translate(${x * (1 - eased)}px, ${y * (1 - eased)}px)`;
    },
  };
}
