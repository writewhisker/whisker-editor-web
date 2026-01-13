import { HookManager } from './HookManager'
import { Hook } from './Hook'

export interface HookRendererOptions {
  enableTransitions?: boolean
  transitionDuration?: number
}

/**
 * Handles DOM-based hook rendering and updates with transitions
 */
export class HookRenderer {
  private hookManager: HookManager
  private containerElement: HTMLElement
  private options: HookRendererOptions

  constructor(
    hookManager: HookManager,
    containerElement: HTMLElement,
    options: HookRendererOptions = {}
  ) {
    this.hookManager = hookManager
    this.containerElement = containerElement
    this.options = {
      enableTransitions: options.enableTransitions ?? true,
      transitionDuration: options.transitionDuration ?? 400
    }
  }

  /**
   * Extract hooks with support for nested brackets
   * @param content - Raw passage content
   * @param passageId - Current passage identifier
   * @returns Processed HTML
   */
  public extractHooks(content: string, passageId: string): string {
    let result = ''
    let pos = 0

    while (pos < content.length) {
      // Find next hook start
      const hookStart = content.indexOf('|', pos)

      if (hookStart === -1) {
        // No more hooks
        result += content.substring(pos)
        break
      }

      // Add content before hook
      result += content.substring(pos, hookStart)

      // Find hook name
      const nameEnd = content.indexOf('>[', hookStart)
      if (nameEnd === -1) {
        // Malformed hook, skip
        result += content.substring(hookStart, hookStart + 1)
        pos = hookStart + 1
        continue
      }

      const hookName = content.substring(hookStart + 1, nameEnd)

      // Extract content with bracket counting
      let bracketDepth = 1
      let contentPos = nameEnd + 2
      let hookContent = ''

      while (contentPos < content.length && bracketDepth > 0) {
        const char = content[contentPos]

        if (char === '[') {
          bracketDepth++
          hookContent += char
        } else if (char === ']') {
          bracketDepth--
          if (bracketDepth > 0) {
            hookContent += char
          }
        } else {
          hookContent += char
        }

        contentPos++
      }

      if (bracketDepth === 0) {
        // Successfully extracted hook
        const hookId = this.hookManager.registerHook(
          passageId,
          hookName,
          hookContent
        )
        result += `<span class="whisker-hook" data-hook-id="${hookId}" data-hook-name="${hookName}"></span>`
        pos = contentPos
      } else {
        // Malformed hook
        result += content.substring(hookStart, contentPos)
        pos = contentPos
      }
    }

    return result
  }

  /**
   * Render all hooks in the current passage
   * @param passageId - Current passage identifier
   */
  public renderHooks(passageId: string): void {
    const hooks = this.hookManager.getPassageHooks(passageId)

    for (const hook of hooks) {
      this.updateHookElement(hook)
    }
  }

  /**
   * Execute a hook operation and update the DOM
   * @param passageId - Current passage identifier
   * @param operation - Operation type (replace, append, prepend, show, hide)
   * @param target - Hook name
   * @param content - Content for operation (optional for show/hide)
   * @returns Success status
   */
  public executeOperation(
    passageId: string,
    operation: 'replace' | 'append' | 'prepend' | 'show' | 'hide',
    target: string,
    content?: string
  ): boolean {
    const hookId = `${passageId}_${target}`
    let success = false

    switch (operation) {
      case 'replace':
        success = this.hookManager.replaceHook(hookId, content || '')
        break
      case 'append':
        success = this.hookManager.appendHook(hookId, content || '')
        break
      case 'prepend':
        success = this.hookManager.prependHook(hookId, content || '')
        break
      case 'show':
        success = this.hookManager.showHook(hookId)
        break
      case 'hide':
        success = this.hookManager.hideHook(hookId)
        break
      default:
        return false
    }

    if (success) {
      const hook = this.hookManager.getHook(hookId)
      if (hook) {
        this.updateHookElement(hook, operation)
      }
    }

    return success
  }

  /**
   * Update a single hook element in the DOM with optional transition
   * @param hook - Hook object to render
   * @param transition - Transition type or undefined for no transition
   */
  private updateHookElement(
    hook: Hook,
    transition?: 'replace' | 'append' | 'prepend' | 'show' | 'hide'
  ): void {
    const element = this.containerElement.querySelector(
      `[data-hook-id="${hook.id}"]`
    ) as HTMLElement

    if (!element) {
      console.warn(`Hook element not found: ${hook.id}`)
      return
    }

    // Handle visibility changes with animation
    if (transition === 'hide') {
      this.animateHide(element, hook)
      return
    }

    if (transition === 'show') {
      this.animateShow(element, hook)
      return
    }

    // Update visibility without animation
    if (!hook.visible) {
      element.style.display = 'none'
      return
    } else {
      element.style.display = ''
    }

    // Update content with appropriate animation
    if (this.options.enableTransitions && transition) {
      this.animateContentChange(element, hook, transition)
    } else {
      element.textContent = hook.currentContent
    }
  }

  private animateContentChange(
    element: HTMLElement,
    hook: Hook,
    type: 'replace' | 'append' | 'prepend'
  ): void {
    const className = `whisker-hook--${type === 'replace' ? 'replacing' : 'appending'}`

    element.classList.add(className)
    element.textContent = hook.currentContent

    setTimeout(() => {
      element.classList.remove(className)
    }, this.options.transitionDuration)
  }

  private animateShow(element: HTMLElement, hook: Hook): void {
    element.style.display = ''
    element.textContent = hook.currentContent

    if (this.options.enableTransitions) {
      element.classList.add('whisker-hook--showing')

      setTimeout(() => {
        element.classList.remove('whisker-hook--showing')
      }, 300)
    }
  }

  private animateHide(element: HTMLElement, hook: Hook): void {
    if (this.options.enableTransitions) {
      element.classList.add('whisker-hook--hiding')

      setTimeout(() => {
        element.style.display = 'none'
        element.classList.remove('whisker-hook--hiding')
      }, 300)
    } else {
      element.style.display = 'none'
    }
  }

  /**
   * Clear all hooks for a passage
   * @param passageId - Passage identifier
   */
  public clearPassage(passageId: string): void {
    this.hookManager.clearPassageHooks(passageId)

    // Remove DOM elements
    const hookElements = this.containerElement.querySelectorAll(
      `[data-hook-id^="${passageId}_"]`
    )

    hookElements.forEach(el => el.remove())
  }
}
