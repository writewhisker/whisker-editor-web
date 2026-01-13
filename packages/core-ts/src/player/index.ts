import { HookManager } from '../hooks/HookManager'
import { HookRenderer } from '../hooks/HookRenderer'
import { Hook } from '../hooks/Hook'

export interface PlayerOptions {
  theme?: string
  transitions?: boolean
}

/**
 * Main player UI class with integrated hook support
 */
export class WhiskerPlayerUI {
  private hookManager: HookManager
  private hookRenderer: HookRenderer
  private currentPassageId: string | null = null
  private passageElement: HTMLElement
  private containerElement: HTMLElement

  constructor(containerElement: HTMLElement, options?: PlayerOptions) {
    this.containerElement = containerElement
    this.passageElement = this.createPassageElement()

    // Initialize hook system
    this.hookManager = new HookManager()
    this.hookRenderer = new HookRenderer(this.hookManager, this.passageElement)
  }

  private createPassageElement(): HTMLElement {
    const passageEl = document.createElement('div')
    passageEl.className = 'whisker-passage'
    this.containerElement.appendChild(passageEl)
    return passageEl
  }

  /**
   * Render a passage with hook support
   * @param passageId - Passage identifier
   * @param content - Raw passage content
   */
  public renderPassage(passageId: string, content: string): void {
    // Clear previous passage hooks
    if (this.currentPassageId) {
      this.hookRenderer.clearPassage(this.currentPassageId)
    }

    this.currentPassageId = passageId

    // Extract hooks and get processed HTML
    const processedContent = this.hookRenderer.extractHooks(content, passageId)

    // Render to DOM
    this.passageElement.innerHTML = processedContent

    // Fill in hook content
    this.hookRenderer.renderHooks(passageId)

    // Setup choice handlers
    this.setupChoiceHandlers()
  }

  /**
   * Execute a hook operation
   * @param operation - Operation type
   * @param target - Hook name
   * @param content - Content for operation
   */
  public executeHookOperation(
    operation: 'replace' | 'append' | 'prepend' | 'show' | 'hide',
    target: string,
    content?: string
  ): boolean {
    if (!this.currentPassageId) {
      console.error('No current passage')
      return false
    }

    return this.hookRenderer.executeOperation(
      this.currentPassageId,
      operation,
      target,
      content
    )
  }

  /**
   * Navigate to a new passage
   * @param passageId - Target passage identifier
   */
  public navigateToPassage(passageId: string): void {
    // Implementation would fetch passage content from story
    // For now, this is a stub
    const content = this.getPassageContent(passageId)
    this.renderPassage(passageId, content)
  }

  /**
   * Get the HookManager instance (for advanced usage)
   */
  public getHookManager(): HookManager {
    return this.hookManager
  }

  /**
   * Get all hooks in the current passage
   */
  public getCurrentHooks(): Hook[] {
    if (!this.currentPassageId) {
      return []
    }
    return this.hookManager.getPassageHooks(this.currentPassageId)
  }

  /**
   * Check if a hook exists in the current passage
   */
  public hasHook(hookName: string): boolean {
    if (!this.currentPassageId) {
      return false
    }
    const hookId = `${this.currentPassageId}_${hookName}`
    return this.hookManager.getHook(hookId) !== undefined
  }

  /**
   * Get hook content
   */
  public getHookContent(hookName: string): string | undefined {
    if (!this.currentPassageId) {
      return undefined
    }
    const hookId = `${this.currentPassageId}_${hookName}`
    const hook = this.hookManager.getHook(hookId)
    return hook?.currentContent
  }

  private setupChoiceHandlers(): void {
    const choices = this.passageElement.querySelectorAll('.whisker-choice')

    choices.forEach((choice, index) => {
      choice.addEventListener('click', () => {
        this.handleChoice(index)
      })
    })
  }

  private handleChoice(index: number): void {
    // Parse hook operations from choice
    // Execute operations
    // Navigate if needed
    // Implementation depends on story format
  }

  private getPassageContent(passageId: string): string {
    // Stub - would fetch from story data
    return ''
  }
}
