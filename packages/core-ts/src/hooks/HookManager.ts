import { Hook } from './Hook'

/**
 * Manages hook registry and operations for WLS 2.0 Hooks System
 */
export class HookManager {
  private hooks: Map<string, Hook> = new Map()
  private passageHooks: Map<string, string[]> = new Map()

  /**
   * Register a new hook
   * @param passageId Parent passage identifier
   * @param hookName Hook name from definition
   * @param content Initial hook content
   * @returns Hook ID
   */
  registerHook(passageId: string, hookName: string, content: string): string {
    const hookId = `${passageId}_${hookName}`

    this.hooks.set(hookId, {
      id: hookId,
      name: hookName,
      content,
      currentContent: content,
      visible: true,
      passageId,
      createdAt: Date.now(),
      modifiedCount: 0
    })

    // Track passage association
    if (!this.passageHooks.has(passageId)) {
      this.passageHooks.set(passageId, [])
    }
    this.passageHooks.get(passageId)!.push(hookId)

    return hookId
  }

  /**
   * Get hook by ID
   * @param hookId Hook identifier
   * @returns Hook or undefined if not found
   */
  getHook(hookId: string): Hook | undefined {
    return this.hooks.get(hookId)
  }

  /**
   * Get hook by name in passage context
   * @param passageId Passage identifier
   * @param hookName Hook name
   * @returns Hook or undefined if not found
   */
  getHookByName(passageId: string, hookName: string): Hook | undefined {
    const hookId = `${passageId}_${hookName}`
    return this.hooks.get(hookId)
  }

  /**
   * Replace hook content entirely
   * @param hookId Hook identifier
   * @param newContent New content
   * @returns Success status
   */
  replaceHook(hookId: string, newContent: string): boolean {
    const hook = this.hooks.get(hookId)
    if (!hook) return false

    hook.currentContent = newContent
    hook.modifiedCount++
    return true
  }

  /**
   * Append content to hook
   * @param hookId Hook identifier
   * @param additionalContent Content to append
   * @returns Success status
   */
  appendHook(hookId: string, additionalContent: string): boolean {
    const hook = this.hooks.get(hookId)
    if (!hook) return false

    hook.currentContent += additionalContent
    hook.modifiedCount++
    return true
  }

  /**
   * Prepend content to hook
   * @param hookId Hook identifier
   * @param contentBefore Content to prepend
   * @returns Success status
   */
  prependHook(hookId: string, contentBefore: string): boolean {
    const hook = this.hooks.get(hookId)
    if (!hook) return false

    hook.currentContent = contentBefore + hook.currentContent
    hook.modifiedCount++
    return true
  }

  /**
   * Show hidden hook
   * @param hookId Hook identifier
   * @returns Success status
   */
  showHook(hookId: string): boolean {
    const hook = this.hooks.get(hookId)
    if (!hook) return false

    hook.visible = true
    return true
  }

  /**
   * Hide visible hook
   * @param hookId Hook identifier
   * @returns Success status
   */
  hideHook(hookId: string): boolean {
    const hook = this.hooks.get(hookId)
    if (!hook) return false

    hook.visible = false
    return true
  }

  /**
   * Clear all hooks for a passage
   * @param passageId Passage identifier
   */
  clearPassageHooks(passageId: string): void {
    const hookIds = this.passageHooks.get(passageId) || []

    for (const hookId of hookIds) {
      this.hooks.delete(hookId)
    }

    this.passageHooks.delete(passageId)
  }

  /**
   * Get all hooks in a passage
   * @param passageId Passage identifier
   * @returns Array of hooks
   */
  getPassageHooks(passageId: string): Hook[] {
    const hookIds = this.passageHooks.get(passageId) || []
    return hookIds.map(id => this.hooks.get(id)!).filter(Boolean)
  }

  /**
   * Serialize state for save/load
   * @returns Serialized state
   */
  serialize(): object {
    return {
      hooks: Array.from(this.hooks.entries()),
      passageHooks: Array.from(this.passageHooks.entries())
    }
  }

  /**
   * Deserialize state
   * @param data Serialized state
   */
  deserialize(data: any): void {
    this.hooks = new Map(data.hooks)
    this.passageHooks = new Map(data.passageHooks)
  }
}
