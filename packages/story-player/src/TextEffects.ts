/**
 * WLS 2.0 Text Effects and Transitions
 *
 * Dynamic text presentation effects for narratives.
 * Platform-agnostic implementation with callbacks for rendering.
 */

/**
 * Effect options
 */
export interface EffectOptions {
  /** Effect duration in milliseconds */
  duration?: number;
  /** Speed for character-based effects (ms per character) */
  speed?: number;
  /** Delay before effect starts in milliseconds */
  delay?: number;
  /** Easing function name */
  easing?: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';
  /** Additional custom options */
  [key: string]: unknown;
}

/**
 * Frame data passed to effect callbacks during animation
 */
export interface EffectFrame {
  /** Normalized progress (0 to 1) */
  progress: number;
  /** Elapsed time in milliseconds */
  elapsed: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Original text content */
  text: string;
  /** Visible text (for typewriter-style effects) */
  visibleText: string;
  /** Effect-specific data */
  data: Record<string, unknown>;
}

/**
 * Callback for rendering an effect frame
 */
export type EffectRenderer = (frame: EffectFrame) => void;

/**
 * Callback when effect completes
 */
export type EffectComplete = () => void;

/**
 * Text effect definition
 */
export interface TextEffect {
  /** Effect name */
  name: string;
  /** Default duration in milliseconds */
  defaultDuration?: number;
  /** Whether effect reveals text progressively */
  isProgressive?: boolean;
  /** Apply the effect */
  apply(
    text: string,
    options: EffectOptions,
    onFrame: EffectRenderer,
    onComplete: EffectComplete
  ): EffectController;
}

/**
 * Controller returned when applying an effect
 */
export interface EffectController {
  /** Cancel the effect */
  cancel(): void;
  /** Pause the effect */
  pause(): void;
  /** Resume the effect */
  resume(): void;
  /** Skip to the end of the effect */
  skip(): void;
  /** Check if effect is complete */
  isComplete(): boolean;
  /** Check if effect is paused */
  isPaused(): boolean;
}

/**
 * CSS keyframe definition
 */
export interface CSSKeyframe {
  /** Keyframe position (0-100) */
  offset: number;
  /** CSS properties */
  properties: Record<string, string>;
}

/**
 * Built-in effect CSS for web platforms
 */
export const EFFECT_CSS = `
/* Text effect animations */
@keyframes wls-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

@keyframes wls-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes wls-glitch {
  0%, 100% { transform: translateX(0); filter: none; }
  20% { transform: translateX(-2px); filter: hue-rotate(90deg); }
  40% { transform: translateX(2px); filter: hue-rotate(180deg); }
  60% { transform: translateX(-2px); filter: hue-rotate(270deg); }
  80% { transform: translateX(2px); filter: hue-rotate(360deg); }
}

@keyframes wls-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes wls-slide-left {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes wls-slide-right {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes wls-slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes wls-slide-down {
  from { transform: translateY(-100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.wls-effect-shake { animation: wls-shake var(--wls-duration, 500ms) ease-in-out; }
.wls-effect-pulse { animation: wls-pulse var(--wls-duration, 1000ms) ease-in-out infinite; }
.wls-effect-glitch { animation: wls-glitch var(--wls-duration, 500ms) linear; }
.wls-effect-fade-in { animation: wls-fade-in var(--wls-duration, 1000ms) ease-out forwards; }
.wls-effect-slide-left { animation: wls-slide-left var(--wls-duration, 500ms) ease-out forwards; }
.wls-effect-slide-right { animation: wls-slide-right var(--wls-duration, 500ms) ease-out forwards; }
.wls-effect-slide-up { animation: wls-slide-up var(--wls-duration, 500ms) ease-out forwards; }
.wls-effect-slide-down { animation: wls-slide-down var(--wls-duration, 500ms) ease-out forwards; }
`;

/**
 * Create a basic effect controller
 */
function createController(
  cancelFn: () => void,
  pauseFn: () => void,
  resumeFn: () => void,
  skipFn: () => void,
  isCompleteFn: () => boolean,
  isPausedFn: () => boolean
): EffectController {
  return {
    cancel: cancelFn,
    pause: pauseFn,
    resume: resumeFn,
    skip: skipFn,
    isComplete: isCompleteFn,
    isPaused: isPausedFn,
  };
}

/**
 * Create a timer-based animation effect
 */
function createTimerEffect(
  text: string,
  options: EffectOptions,
  onFrame: EffectRenderer,
  onComplete: EffectComplete,
  frameGenerator: (progress: number, text: string) => Partial<EffectFrame>
): EffectController {
  const duration = options.duration ?? 1000;
  const startDelay = options.delay ?? 0;

  let startTime: number | null = null;
  let pausedTime: number | null = null;
  let pauseOffset = 0;
  let cancelled = false;
  let completed = false;
  let paused = false;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let animationId: ReturnType<typeof requestAnimationFrame> | null = null;

  const animate = (now: number) => {
    if (cancelled || completed) return;

    if (startTime === null) {
      startTime = now;
    }

    if (paused) return;

    const elapsed = now - startTime - pauseOffset;
    const progress = Math.min(1, Math.max(0, elapsed / duration));

    const frameData = frameGenerator(progress, text);

    onFrame({
      progress,
      elapsed,
      duration,
      text,
      visibleText: frameData.visibleText ?? text,
      data: frameData.data ?? {},
    });

    if (progress < 1) {
      animationId = requestAnimationFrame(animate);
    } else {
      completed = true;
      onComplete();
    }
  };

  // Start after delay
  if (startDelay > 0) {
    timerId = setTimeout(() => {
      animationId = requestAnimationFrame(animate);
    }, startDelay);
  } else {
    animationId = requestAnimationFrame(animate);
  }

  return createController(
    () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
      if (animationId) cancelAnimationFrame(animationId);
    },
    () => {
      paused = true;
      pausedTime = Date.now();
    },
    () => {
      if (paused && pausedTime) {
        pauseOffset += Date.now() - pausedTime;
        paused = false;
        pausedTime = null;
        animationId = requestAnimationFrame(animate);
      }
    },
    () => {
      cancelled = true;
      completed = true;
      if (timerId) clearTimeout(timerId);
      if (animationId) cancelAnimationFrame(animationId);
      onFrame({
        progress: 1,
        elapsed: duration,
        duration,
        text,
        visibleText: text,
        data: {},
      });
      onComplete();
    },
    () => completed,
    () => paused
  );
}

/**
 * Create the typewriter effect
 */
function createTypewriterEffect(): TextEffect {
  return {
    name: 'typewriter',
    defaultDuration: undefined, // Duration is based on text length
    isProgressive: true,
    apply(text, options, onFrame, onComplete) {
      const speed = options.speed ?? 50;
      const totalDuration = text.length * speed;

      return createTimerEffect(
        text,
        { ...options, duration: totalDuration },
        onFrame,
        onComplete,
        (progress, t) => ({
          visibleText: t.slice(0, Math.ceil(t.length * progress)),
          data: { charIndex: Math.ceil(t.length * progress) },
        })
      );
    },
  };
}

/**
 * Create a simple animation effect (shake, pulse, etc.)
 */
function createSimpleEffect(
  name: string,
  defaultDuration: number,
  dataGenerator?: (progress: number) => Record<string, unknown>
): TextEffect {
  return {
    name,
    defaultDuration,
    isProgressive: false,
    apply(text, options, onFrame, onComplete) {
      return createTimerEffect(
        text,
        { ...options, duration: options.duration ?? defaultDuration },
        onFrame,
        onComplete,
        (progress) => ({
          visibleText: text,
          data: dataGenerator ? dataGenerator(progress) : { progress },
        })
      );
    },
  };
}

/**
 * Text effect manager
 *
 * @example
 * ```typescript
 * const manager = new TextEffectManager();
 *
 * // Apply typewriter effect
 * const controller = manager.applyEffect(
 *   'typewriter',
 *   'Hello, world!',
 *   { speed: 100 },
 *   (frame) => {
 *     element.textContent = frame.visibleText;
 *   },
 *   () => console.log('Complete!')
 * );
 *
 * // Skip to end
 * controller.skip();
 * ```
 */
export class TextEffectManager {
  private effects: Map<string, TextEffect> = new Map();
  private activeEffects: Map<string, EffectController> = new Map();
  private nextEffectId = 1;

  constructor() {
    this.registerBuiltins();
  }

  /**
   * Register built-in effects
   */
  private registerBuiltins(): void {
    // Typewriter - text appears character by character
    this.effects.set('typewriter', createTypewriterEffect());

    // Shake - element shakes horizontally
    this.effects.set(
      'shake',
      createSimpleEffect('shake', 500, (progress) => {
        const intensity = Math.sin(progress * Math.PI * 8) * (1 - progress);
        return {
          offsetX: intensity * 5,
          offsetY: 0,
        };
      })
    );

    // Pulse - element fades in and out
    this.effects.set(
      'pulse',
      createSimpleEffect('pulse', 1000, (progress) => ({
        opacity: 0.5 + 0.5 * Math.sin(progress * Math.PI * 2),
      }))
    );

    // Glitch - digital distortion effect
    this.effects.set(
      'glitch',
      createSimpleEffect('glitch', 500, (progress) => {
        const glitchPhase = Math.floor(progress * 5) % 2;
        return {
          offsetX: glitchPhase ? (Math.random() - 0.5) * 4 : 0,
          hueRotate: Math.floor(progress * 4) * 90,
        };
      })
    );

    // Fade in
    this.effects.set(
      'fade-in',
      createSimpleEffect('fade-in', 1000, (progress) => ({
        opacity: progress,
      }))
    );

    // Fade out
    this.effects.set(
      'fade-out',
      createSimpleEffect('fade-out', 1000, (progress) => ({
        opacity: 1 - progress,
      }))
    );

    // Slide transitions
    this.effects.set(
      'slide-left',
      createSimpleEffect('slide-left', 500, (progress) => ({
        offsetX: (1 - progress) * 100,
        opacity: progress,
      }))
    );

    this.effects.set(
      'slide-right',
      createSimpleEffect('slide-right', 500, (progress) => ({
        offsetX: (progress - 1) * 100,
        opacity: progress,
      }))
    );

    this.effects.set(
      'slide-up',
      createSimpleEffect('slide-up', 500, (progress) => ({
        offsetY: (1 - progress) * 100,
        opacity: progress,
      }))
    );

    this.effects.set(
      'slide-down',
      createSimpleEffect('slide-down', 500, (progress) => ({
        offsetY: (progress - 1) * 100,
        opacity: progress,
      }))
    );
  }

  /**
   * Apply an effect to text
   * @param effectName Name of the effect
   * @param text Text to apply effect to
   * @param options Effect options
   * @param onFrame Callback for each animation frame
   * @param onComplete Callback when effect completes
   * @returns Effect controller
   */
  applyEffect(
    effectName: string,
    text: string,
    options: EffectOptions,
    onFrame: EffectRenderer,
    onComplete: EffectComplete = () => {}
  ): EffectController {
    const effect = this.effects.get(effectName);

    if (!effect) {
      throw new Error(`Unknown text effect: ${effectName}`);
    }

    const effectId = `effect_${this.nextEffectId++}`;
    const controller = effect.apply(text, options, onFrame, () => {
      this.activeEffects.delete(effectId);
      onComplete();
    });

    this.activeEffects.set(effectId, controller);
    return controller;
  }

  /**
   * Register a custom effect
   */
  registerEffect(effect: TextEffect): void {
    this.effects.set(effect.name, effect);
  }

  /**
   * Unregister an effect
   */
  unregisterEffect(name: string): boolean {
    return this.effects.delete(name);
  }

  /**
   * Check if an effect exists
   */
  hasEffect(name: string): boolean {
    return this.effects.has(name);
  }

  /**
   * Get all registered effect names
   */
  getEffectNames(): string[] {
    return Array.from(this.effects.keys());
  }

  /**
   * Get effect info
   */
  getEffect(name: string): TextEffect | undefined {
    return this.effects.get(name);
  }

  /**
   * Cancel all active effects
   */
  cancelAll(): void {
    for (const controller of this.activeEffects.values()) {
      controller.cancel();
    }
    this.activeEffects.clear();
  }

  /**
   * Pause all active effects
   */
  pauseAll(): void {
    for (const controller of this.activeEffects.values()) {
      controller.pause();
    }
  }

  /**
   * Resume all paused effects
   */
  resumeAll(): void {
    for (const controller of this.activeEffects.values()) {
      controller.resume();
    }
  }

  /**
   * Skip all active effects to completion
   */
  skipAll(): void {
    for (const controller of this.activeEffects.values()) {
      controller.skip();
    }
    this.activeEffects.clear();
  }

  /**
   * Get count of active effects
   */
  getActiveCount(): number {
    return this.activeEffects.size;
  }

  /**
   * Get CSS class for an effect (for web platforms)
   */
  getCSSClass(effectName: string): string {
    return `wls-effect-${effectName}`;
  }

  /**
   * Get CSS custom property for duration
   */
  getCSSCustomProperty(duration: number): string {
    return `--wls-duration: ${duration}ms`;
  }
}

/**
 * Parse an @effect or @transition declaration
 * Format: "effectName [duration]" or "effectName speed:N"
 */
export function parseEffectDeclaration(
  declaration: string
): { name: string; options: EffectOptions } {
  const parts = declaration.trim().split(/\s+/);

  if (parts.length === 0 || !parts[0]) {
    throw new Error(`Invalid effect declaration: ${declaration}`);
  }

  const name = parts[0];
  const options: EffectOptions = {};

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    // Check for key:value format
    const keyValueMatch = part.match(/^(\w+):(.+)$/);
    if (keyValueMatch) {
      const [, key, value] = keyValueMatch;
      if (key === 'speed') {
        options.speed = parseFloat(value);
      } else if (key === 'delay') {
        options.delay = parseFloat(value);
      } else if (key === 'easing') {
        options.easing = value as EffectOptions['easing'];
      }
      continue;
    }

    // Check for duration format (e.g., "500ms", "1s", "2000")
    const durationMatch = part.match(/^(\d+(?:\.\d+)?)(ms|s)?$/);
    if (durationMatch) {
      const [, value, unit] = durationMatch;
      let duration = parseFloat(value);
      if (unit === 's') {
        duration *= 1000;
      }
      options.duration = duration;
    }
  }

  return { name, options };
}

/**
 * Create a new text effect manager
 */
export function createTextEffectManager(): TextEffectManager {
  return new TextEffectManager();
}
