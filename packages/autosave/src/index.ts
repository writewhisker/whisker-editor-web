/**
 * Autosave
 *
 * Framework-agnostic debounced autosave utilities.
 * Configurable intervals, conflict resolution, versioning.
 */

export interface AutosaveOptions {
  delay: number;
  maxRetries?: number;
  onSave: (data: any) => Promise<void>;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  versionTracking?: boolean;
}

export interface SaveState {
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  version: number;
}

/**
 * Autosave manager with debouncing
 */
export class Autosave {
  private options: Required<AutosaveOptions>;
  private state: SaveState;
  private data: any = null;
  private timer: number | null = null;
  private savePromise: Promise<void> | null = null;
  private retryCount: number = 0;
  private listeners: Set<(state: SaveState) => void> = new Set();

  constructor(options: AutosaveOptions) {
    this.options = {
      maxRetries: 3,
      onError: () => {},
      onSuccess: () => {},
      versionTracking: false,
      ...options,
    };

    this.state = {
      isDirty: false,
      isSaving: false,
      lastSaved: null,
      error: null,
      version: 0,
    };
  }

  /**
   * Mark data as changed (will trigger autosave after delay)
   */
  markDirty(data: any): void {
    this.data = data;
    this.setState({ isDirty: true, error: null });

    if (this.timer !== null) {
      clearTimeout(this.timer);
    }

    this.timer = window.setTimeout(() => {
      this.save();
    }, this.options.delay);
  }

  /**
   * Force immediate save
   */
  async save(): Promise<void> {
    if (this.state.isSaving) {
      return this.savePromise!;
    }

    if (!this.state.isDirty) {
      return Promise.resolve();
    }

    this.setState({ isSaving: true, error: null });

    this.savePromise = this.performSave();
    return this.savePromise;
  }

  private async performSave(): Promise<void> {
    try {
      await this.options.onSave(this.data);

      this.retryCount = 0;
      this.setState({
        isDirty: false,
        isSaving: false,
        lastSaved: new Date(),
        error: null,
        version: this.state.version + 1,
      });

      this.options.onSuccess();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.retryCount++;

      if (this.retryCount <= this.options.maxRetries) {
        // Retry with exponential backoff
        const delay = Math.pow(2, this.retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.performSave();
      }

      this.setState({
        isSaving: false,
        error: err,
      });

      this.options.onError(err);
    } finally {
      this.savePromise = null;
    }
  }

  /**
   * Cancel pending autosave
   */
  cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: SaveState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current state
   */
  getState(): SaveState {
    return { ...this.state };
  }

  /**
   * Destroy autosave instance
   */
  destroy(): void {
    this.cancel();
    this.listeners.clear();
  }

  private setState(updates: Partial<SaveState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }
}

/**
 * Create a debounced save function
 */
export function createDebouncedSave<T>(
  saveFn: (data: T) => Promise<void>,
  delay: number
): (data: T) => void {
  let timer: number | null = null;
  let lastData: T;

  return (data: T) => {
    lastData = data;

    if (timer !== null) {
      clearTimeout(timer);
    }

    timer = window.setTimeout(async () => {
      try {
        await saveFn(lastData);
      } catch (error) {
        console.error('Save failed:', error);
      }
      timer = null;
    }, delay);
  };
}

/**
 * Versioned save queue
 */
export class SaveQueue<T> {
  private queue: Array<{ version: number; data: T }> = [];
  private processing: boolean = false;
  private saveFn: (data: T, version: number) => Promise<void>;

  constructor(saveFn: (data: T, version: number) => Promise<void>) {
    this.saveFn = saveFn;
  }

  enqueue(data: T, version: number): void {
    this.queue.push({ version, data });

    if (!this.processing) {
      this.process();
    }
  }

  private async process(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;

      try {
        await this.saveFn(item.data, item.version);
      } catch (error) {
        console.error('Save failed for version', item.version, error);
        // Could implement retry logic here
      }
    }

    this.processing = false;
  }

  clear(): void {
    this.queue = [];
  }

  size(): number {
    return this.queue.length;
  }
}
