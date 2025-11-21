/**
 * Animation Engine
 *
 * Framework-agnostic animation utilities.
 * Easing functions, springs, tweens - zero dependencies.
 */

export type EasingFunction = (t: number) => number;

/**
 * Standard easing functions
 */
export const Easing = {
  linear: (t: number) => t,

  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

  easeInElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
  },
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  },

  easeInBack: (t: number) => {
    const c = 1.70158;
    return t * t * ((c + 1) * t - c);
  },
  easeOutBack: (t: number) => {
    const c = 1.70158;
    return --t * t * ((c + 1) * t + c) + 1;
  },

  easeInBounce: (t: number) => 1 - Easing.easeOutBounce(1 - t),
  easeOutBounce: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
};

/**
 * Tween class for value interpolation
 */
export class Tween {
  private startValue: number;
  private endValue: number;
  private duration: number;
  private easing: EasingFunction;
  private startTime: number = 0;
  private onUpdate?: (value: number) => void;
  private onComplete?: () => void;
  private running: boolean = false;

  constructor(
    from: number,
    to: number,
    duration: number,
    easing: EasingFunction = Easing.easeInOutQuad
  ) {
    this.startValue = from;
    this.endValue = to;
    this.duration = duration;
    this.easing = easing;
  }

  start(): this {
    this.startTime = performance.now();
    this.running = true;
    this.tick();
    return this;
  }

  stop(): this {
    this.running = false;
    return this;
  }

  update(callback: (value: number) => void): this {
    this.onUpdate = callback;
    return this;
  }

  complete(callback: () => void): this {
    this.onComplete = callback;
    return this;
  }

  private tick = () => {
    if (!this.running) return;

    const elapsed = performance.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    const easedProgress = this.easing(progress);
    const value = this.startValue + (this.endValue - this.startValue) * easedProgress;

    this.onUpdate?.(value);

    if (progress < 1) {
      requestAnimationFrame(this.tick);
    } else {
      this.running = false;
      this.onComplete?.();
    }
  };
}

/**
 * Spring physics simulation
 */
export class Spring {
  private position: number;
  private velocity: number = 0;
  private target: number;
  private stiffness: number;
  private damping: number;
  private mass: number;
  private onUpdate?: (value: number, velocity: number) => void;
  private running: boolean = false;
  private lastTime: number = 0;

  constructor(
    initial: number,
    stiffness: number = 170,
    damping: number = 26,
    mass: number = 1
  ) {
    this.position = initial;
    this.target = initial;
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
  }

  setTarget(target: number): this {
    this.target = target;
    if (!this.running) {
      this.start();
    }
    return this;
  }

  setValue(value: number): this {
    this.position = value;
    this.velocity = 0;
    return this;
  }

  update(callback: (value: number, velocity: number) => void): this {
    this.onUpdate = callback;
    return this;
  }

  start(): this {
    this.running = true;
    this.lastTime = performance.now();
    this.tick();
    return this;
  }

  stop(): this {
    this.running = false;
    return this;
  }

  private tick = () => {
    if (!this.running) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.064); // Max 64ms
    this.lastTime = currentTime;

    // Spring physics
    const springForce = -this.stiffness * (this.position - this.target);
    const dampingForce = -this.damping * this.velocity;
    const acceleration = (springForce + dampingForce) / this.mass;

    this.velocity += acceleration * deltaTime;
    this.position += this.velocity * deltaTime;

    this.onUpdate?.(this.position, this.velocity);

    // Stop if settled
    const isSettled =
      Math.abs(this.velocity) < 0.01 &&
      Math.abs(this.position - this.target) < 0.01;

    if (!isSettled) {
      requestAnimationFrame(this.tick);
    } else {
      this.position = this.target;
      this.velocity = 0;
      this.running = false;
      this.onUpdate?.(this.position, this.velocity);
    }
  };
}

/**
 * Lerp (linear interpolation)
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Map value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Smooth step interpolation
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
