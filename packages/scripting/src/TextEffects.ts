/**
 * Text Effects
 *
 * Provides text presentation effects including progressive reveal (typewriter),
 * animations (shake, pulse, glitch), and transitions (fade, slide).
 *
 * Reference: whisker-core/lib/whisker/runtime/text_effects.lua
 */

import type {
  EffectType,
  EffectDefinition,
  EffectOptions,
  FrameUpdate,
  EffectControllerState,
} from './runtime-types';

// =============================================================================
// Built-in Effects
// =============================================================================

export const BUILTIN_EFFECTS: Record<string, EffectDefinition> = {
  // Progressive effects
  typewriter: {
    type: 'progressive',
    defaultOptions: { speed: 50 }, // ms per character
  },
  teletype: {
    type: 'progressive',
    defaultOptions: { speed: 30 },
  },

  // Animation effects
  shake: {
    type: 'animation',
    defaultOptions: { duration: 500, intensity: 5 },
    css: `
      @keyframes wls-shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-var(--intensity, 5)px); }
        75% { transform: translateX(var(--intensity, 5)px); }
      }
    `,
  },
  pulse: {
    type: 'animation',
    defaultOptions: { duration: 1000 },
    css: `
      @keyframes wls-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `,
  },
  glitch: {
    type: 'animation',
    defaultOptions: { duration: 500, intensity: 3 },
    css: `
      @keyframes wls-glitch {
        0%, 100% { transform: translate(0); filter: none; }
        20% { transform: translate(-2px, 1px); filter: hue-rotate(90deg); }
        40% { transform: translate(2px, -1px); filter: hue-rotate(180deg); }
        60% { transform: translate(-1px, 2px); filter: hue-rotate(270deg); }
        80% { transform: translate(1px, -2px); filter: hue-rotate(360deg); }
      }
    `,
  },
  bounce: {
    type: 'animation',
    defaultOptions: { duration: 600 },
    css: `
      @keyframes wls-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
    `,
  },

  // Transition effects
  'fade-in': {
    type: 'transition',
    defaultOptions: { duration: 500 },
    css: `
      @keyframes wls-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `,
  },
  'fade-out': {
    type: 'transition',
    defaultOptions: { duration: 500 },
    css: `
      @keyframes wls-fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `,
  },
  'slide-left': {
    type: 'transition',
    defaultOptions: { duration: 500 },
    css: `
      @keyframes wls-slide-left {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `,
  },
  'slide-right': {
    type: 'transition',
    defaultOptions: { duration: 500 },
    css: `
      @keyframes wls-slide-right {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `,
  },
  'slide-up': {
    type: 'transition',
    defaultOptions: { duration: 500 },
    css: `
      @keyframes wls-slide-up {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `,
  },
  'slide-down': {
    type: 'transition',
    defaultOptions: { duration: 500 },
    css: `
      @keyframes wls-slide-down {
        from { transform: translateY(-100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `,
  },
};

// =============================================================================
// Effect Controller
// =============================================================================

export interface EffectCallbacks {
  onFrame?: (update: FrameUpdate) => void;
  onComplete?: () => void;
}

export class EffectController {
  private text: string;
  private effectName: string;
  private options: EffectOptions;
  private callbacks: EffectCallbacks;

  private paused: boolean = false;
  private cancelled: boolean = false;
  private completed: boolean = false;
  private elapsed: number = 0;

  // For progressive effects
  private charIndex: number = 0;
  private speed: number = 50;

  // For duration-based effects
  private duration: number = 500;

  constructor(
    text: string,
    effectName: string,
    options: EffectOptions,
    callbacks: EffectCallbacks
  ) {
    this.text = text;
    this.effectName = effectName;
    this.options = options;
    this.callbacks = callbacks;

    const definition = BUILTIN_EFFECTS[effectName];
    if (definition) {
      if (definition.type === 'progressive') {
        this.speed = options.speed ?? (definition.defaultOptions.speed as number);
      } else {
        this.duration =
          options.duration ?? (definition.defaultOptions.duration as number);
      }
    }
  }

  /**
   * Pause the effect
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume the effect
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * Skip to completion
   */
  skip(): void {
    if (this.completed || this.cancelled) return;

    const definition = BUILTIN_EFFECTS[this.effectName];

    if (definition?.type === 'progressive') {
      this.charIndex = this.text.length;
    }

    this.completed = true;

    if (this.callbacks.onFrame) {
      this.callbacks.onFrame({
        visibleText: this.text,
        progress: 1,
        elapsed: this.elapsed,
      });
    }

    if (this.callbacks.onComplete) {
      this.callbacks.onComplete();
    }
  }

  /**
   * Cancel the effect
   */
  cancel(): void {
    this.cancelled = true;
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Check if completed
   */
  isComplete(): boolean {
    return this.completed || this.cancelled;
  }

  /**
   * Update the effect with delta time
   */
  tick(deltaMs: number): void {
    if (this.paused || this.completed || this.cancelled) {
      return;
    }

    this.elapsed += deltaMs;

    const definition = BUILTIN_EFFECTS[this.effectName];
    if (!definition) {
      this.completed = true;
      return;
    }

    if (definition.type === 'progressive') {
      this.tickProgressive(deltaMs);
    } else {
      this.tickDurationBased();
    }
  }

  private tickProgressive(deltaMs: number): void {
    // Calculate how many characters to show based on elapsed time
    const targetChars = Math.floor(this.elapsed / this.speed);

    if (targetChars > this.charIndex) {
      this.charIndex = Math.min(targetChars, this.text.length);

      if (this.callbacks.onFrame) {
        this.callbacks.onFrame({
          visibleText: this.text.substring(0, this.charIndex),
          progress: this.charIndex / this.text.length,
          elapsed: this.elapsed,
        });
      }

      if (this.charIndex >= this.text.length) {
        this.completed = true;
        if (this.callbacks.onComplete) {
          this.callbacks.onComplete();
        }
      }
    }
  }

  private tickDurationBased(): void {
    const progress = Math.min(this.elapsed / this.duration, 1);

    if (this.callbacks.onFrame) {
      this.callbacks.onFrame({
        visibleText: this.text,
        progress,
        elapsed: this.elapsed,
      });
    }

    if (progress >= 1) {
      this.completed = true;
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete();
      }
    }
  }

  /**
   * Get current progress (0-1)
   */
  getProgress(): number {
    const definition = BUILTIN_EFFECTS[this.effectName];

    if (definition?.type === 'progressive') {
      return this.text.length > 0 ? this.charIndex / this.text.length : 1;
    }

    return Math.min(this.elapsed / this.duration, 1);
  }

  /**
   * Get currently visible text
   */
  getVisibleText(): string {
    const definition = BUILTIN_EFFECTS[this.effectName];

    if (definition?.type === 'progressive') {
      return this.text.substring(0, this.charIndex);
    }

    return this.text;
  }

  /**
   * Get controller state
   */
  getState(): EffectControllerState {
    return {
      paused: this.paused,
      cancelled: this.cancelled,
      completed: this.completed,
      elapsed: this.elapsed,
      charIndex: this.charIndex,
      totalChars: this.text.length,
      text: this.text,
      speed: this.speed,
      duration: this.duration,
    };
  }
}

// =============================================================================
// TextEffects Manager
// =============================================================================

export interface EffectDeclaration {
  name: string;
  options: EffectOptions;
}

/**
 * Parse effect declaration string
 * Format: "typewriter speed:100" or "fade-in 500ms"
 */
export function parseEffectDeclaration(declaration: string): EffectDeclaration {
  const parts = declaration.trim().split(/\s+/);
  const name = parts[0];
  const options: EffectOptions = {};

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    // Key:value format
    if (part.includes(':')) {
      const [key, value] = part.split(':');
      const numValue = parseFloat(value);
      options[key] = isNaN(numValue) ? value : numValue;
    }
    // Duration format (e.g., "500ms", "2s")
    else if (/^\d+(?:ms|s)?$/.test(part)) {
      const match = part.match(/^(\d+)(ms|s)?$/);
      if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2] || 'ms';
        options.duration = unit === 's' ? value * 1000 : value;
      }
    }
  }

  return { name, options };
}

export class TextEffects {
  private customEffects: Map<string, EffectDefinition> = new Map();
  private activeControllers: Map<string, EffectController> = new Map();
  private controllerIdCounter = 0;

  /**
   * Register a custom effect
   */
  registerEffect(name: string, definition: EffectDefinition): void {
    this.customEffects.set(name, definition);
  }

  /**
   * Get effect definition
   */
  getEffect(name: string): EffectDefinition | undefined {
    return this.customEffects.get(name) || BUILTIN_EFFECTS[name];
  }

  /**
   * Check if effect exists
   */
  hasEffect(name: string): boolean {
    return this.customEffects.has(name) || name in BUILTIN_EFFECTS;
  }

  /**
   * Get all available effect names
   */
  getAvailableEffects(): string[] {
    const builtin = Object.keys(BUILTIN_EFFECTS);
    const custom = Array.from(this.customEffects.keys());
    return [...new Set([...builtin, ...custom])];
  }

  /**
   * Apply an effect to text
   */
  applyEffect(
    name: string,
    text: string,
    options: EffectOptions = {},
    onFrame?: (update: FrameUpdate) => void,
    onComplete?: () => void
  ): EffectController | null {
    const definition = this.getEffect(name);

    if (!definition) {
      console.warn(`TextEffects: Unknown effect '${name}'`);
      return null;
    }

    // Merge default options with provided options
    const mergedOptions = { ...definition.defaultOptions, ...options };

    const controller = new EffectController(text, name, mergedOptions, {
      onFrame,
      onComplete: () => {
        this.activeControllers.delete(controllerId);
        onComplete?.();
      },
    });

    const controllerId = `effect_${++this.controllerIdCounter}`;
    this.activeControllers.set(controllerId, controller);

    // Start the effect with initial frame
    if (definition.type === 'progressive') {
      onFrame?.({
        visibleText: '',
        progress: 0,
        elapsed: 0,
      });
    } else {
      onFrame?.({
        visibleText: text,
        progress: 0,
        elapsed: 0,
      });
    }

    return controller;
  }

  /**
   * Apply effect from declaration string
   */
  applyFromDeclaration(
    declaration: string,
    text: string,
    onFrame?: (update: FrameUpdate) => void,
    onComplete?: () => void
  ): EffectController | null {
    const { name, options } = parseEffectDeclaration(declaration);
    return this.applyEffect(name, text, options, onFrame, onComplete);
  }

  /**
   * Update all active effects
   */
  update(deltaMs: number): void {
    for (const controller of this.activeControllers.values()) {
      controller.tick(deltaMs);
    }
  }

  /**
   * Cancel all active effects
   */
  cancelAll(): void {
    for (const controller of this.activeControllers.values()) {
      controller.cancel();
    }
    this.activeControllers.clear();
  }

  /**
   * Skip all active effects to completion
   */
  skipAll(): void {
    for (const controller of this.activeControllers.values()) {
      controller.skip();
    }
  }

  /**
   * Get count of active effects
   */
  getActiveCount(): number {
    return this.activeControllers.size;
  }

  /**
   * Get CSS keyframes for all effects
   */
  getCSSKeyframes(): string {
    const parts: string[] = [];

    for (const [name, definition] of Object.entries(BUILTIN_EFFECTS)) {
      if (definition.css) {
        parts.push(`/* ${name} */`);
        parts.push(definition.css.trim());
      }
    }

    for (const [name, definition] of this.customEffects) {
      if (definition.css) {
        parts.push(`/* ${name} (custom) */`);
        parts.push(definition.css.trim());
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Get CSS class name for an effect
   */
  getEffectClass(name: string, options: EffectOptions = {}): string {
    const definition = this.getEffect(name);
    if (!definition) return '';

    const duration = options.duration ?? definition.defaultOptions.duration ?? 500;
    const intensity = options.intensity ?? definition.defaultOptions.intensity ?? 1;

    return `wls-effect-${name}`;
  }

  /**
   * Get inline CSS for an effect
   */
  getEffectStyle(name: string, options: EffectOptions = {}): string {
    const definition = this.getEffect(name);
    if (!definition) return '';

    const duration = options.duration ?? definition.defaultOptions.duration ?? 500;
    const intensity = options.intensity ?? definition.defaultOptions.intensity ?? 1;

    if (definition.type === 'animation') {
      return `animation: wls-${name} ${duration}ms ease-in-out infinite; --intensity: ${intensity};`;
    } else if (definition.type === 'transition') {
      return `animation: wls-${name} ${duration}ms ease-out forwards;`;
    }

    return '';
  }

  /**
   * Reset the manager
   */
  reset(): void {
    this.cancelAll();
    this.customEffects.clear();
    this.controllerIdCounter = 0;
  }
}

/**
 * Factory function to create a TextEffects manager
 */
export function createTextEffects(): TextEffects {
  return new TextEffects();
}
