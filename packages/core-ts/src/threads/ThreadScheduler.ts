import { HookRenderer } from '../hooks/HookRenderer'

export interface Thread {
  name: string
  interval: number
  content: string[]
  currentStep: number
  elapsed: number
}

export interface HookOperation {
  operation: 'replace' | 'append' | 'prepend' | 'show' | 'hide'
  target: string
  content: string
}

/**
 * Thread scheduler with hook operation support
 */
export class ThreadScheduler {
  private hookRenderer?: HookRenderer
  private threads: Map<string, Thread> = new Map()
  private currentPassageId: string = ''

  constructor(hookRenderer?: HookRenderer) {
    this.hookRenderer = hookRenderer
  }

  /**
   * Set current passage ID for hook operations
   */
  public setPassageId(passageId: string): void {
    this.currentPassageId = passageId
  }

  /**
   * Parse hook operations from thread content
   */
  private parseHookOperations(content: string): HookOperation[] {
    const operations: HookOperation[] = []
    const pattern = /@(\w+):\s*(\w+)\s*\{([^}]*)\}/g

    let match
    while ((match = pattern.exec(content)) !== null) {
      const [, operation, target, opContent] = match

      if (['replace', 'append', 'prepend', 'show', 'hide'].includes(operation)) {
        operations.push({
          operation: operation as any,
          target,
          content: opContent.trim()
        })
      }
    }

    return operations
  }

  /**
   * Execute a thread step with hook operations
   */
  private executeThreadStep(thread: Thread): void {
    const stepContent = thread.content[thread.currentStep]

    if (!stepContent) {
      return
    }

    // Parse and execute hook operations
    const hookOps = this.parseHookOperations(stepContent)

    for (const op of hookOps) {
      if (this.hookRenderer && this.currentPassageId) {
        this.hookRenderer.executeOperation(
          this.currentPassageId,
          op.operation,
          op.target,
          op.content
        )
      }
    }
  }

  /**
   * Register a new thread
   */
  public registerThread(name: string, interval: number, content: string[]): void {
    this.threads.set(name, {
      name,
      interval,
      content,
      currentStep: 0,
      elapsed: 0
    })
  }

  /**
   * Update all active threads
   */
  public update(deltaTime: number): void {
    for (const thread of this.threads.values()) {
      thread.elapsed += deltaTime

      if (thread.elapsed >= thread.interval) {
        thread.elapsed = 0
        this.executeThreadStep(thread)

        // Move to next step (loop if at end)
        thread.currentStep++
        if (thread.currentStep >= thread.content.length) {
          thread.currentStep = 0
        }
      }
    }
  }

  /**
   * Clear all threads
   */
  public clear(): void {
    this.threads.clear()
  }

  /**
   * Get thread by name
   */
  public getThread(name: string): Thread | undefined {
    return this.threads.get(name)
  }
}
