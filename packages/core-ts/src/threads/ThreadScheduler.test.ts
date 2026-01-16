import { describe, it, expect, beforeEach } from 'vitest'
import { ThreadScheduler } from './ThreadScheduler'
import { HookRenderer } from '../hooks/HookRenderer'
import { HookManager } from '../hooks/HookManager'
import { JSDOM } from 'jsdom'

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
global.document = dom.window.document as any
global.HTMLElement = dom.window.HTMLElement as any

describe('ThreadScheduler', () => {
  let scheduler: ThreadScheduler
  let hookManager: HookManager
  let hookRenderer: HookRenderer
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    hookManager = new HookManager()
    hookRenderer = new HookRenderer(hookManager, container)
    scheduler = new ThreadScheduler(hookRenderer)
    scheduler.setPassageId('test')
  })

  // ========================================================================
  // Test Suite 1: Hook Operation Parsing
  // ========================================================================

  describe('parseHookOperations', function () {
    it('executes single hook operation in thread', () => {
      // Setup hook
      const processed = hookRenderer.extractHooks('HP: |hp>[100]', 'test')
      container.innerHTML = processed
      hookRenderer.renderHooks('test')

      // Register and execute thread
      scheduler.registerThread('test', 1.0, ['@replace: hp { 95 }'])
      scheduler.update(1.0)

      const hook = hookManager.getHook('test_hp')
      expect(hook?.currentContent).toBe('95')
    })

    it('executes multiple hook operations', () => {
      const processed = hookRenderer.extractHooks('HP: |hp>[100] Status: |status>[OK]', 'test')
      container.innerHTML = processed
      hookRenderer.renderHooks('test')

      scheduler.registerThread('test', 1.0, ['@replace: hp { 85 } @replace: status { Hurt }'])
      scheduler.update(1.0)

      const hp = hookManager.getHook('test_hp')
      const status = hookManager.getHook('test_status')

      expect(hp?.currentContent).toBe('85')
      expect(status?.currentContent).toBe('Hurt')
    })

    it('handles show and hide operations', () => {
      const processed = hookRenderer.extractHooks('Secret: |secret>[treasure]', 'test')
      container.innerHTML = processed
      hookRenderer.renderHooks('test')

      // Hide
      scheduler.registerThread('test', 1.0, ['@hide: secret { }'])
      scheduler.update(1.0)

      let hook = hookManager.getHook('test_secret')
      expect(hook?.visible).toBe(false)

      // Show
      scheduler.clear()
      scheduler.registerThread('test', 1.0, ['@show: secret { }'])
      scheduler.update(1.0)

      hook = hookManager.getHook('test_secret')
      expect(hook?.visible).toBe(true)
    })
  })

  // ========================================================================
  // Test Suite 2: Thread Management
  // ========================================================================

  describe('thread management', () => {
    it('registers threads', () => {
      scheduler.registerThread('test', 1.0, ['step1', 'step2'])

      const thread = scheduler.getThread('test')
      expect(thread).toBeDefined()
      expect(thread?.name).toBe('test')
      expect(thread?.interval).toBe(1.0)
    })

    it('updates threads based on time', () => {
      const processed = hookRenderer.extractHooks('Counter: |count>[0]', 'test')
      container.innerHTML = processed
      hookRenderer.renderHooks('test')

      scheduler.registerThread('counter', 1.0, ['@replace: count { 1 }', '@replace: count { 2 }'])

      // First update
      scheduler.update(1.0)
      let hook = hookManager.getHook('test_count')
      expect(hook?.currentContent).toBe('1')

      // Second update
      scheduler.update(1.0)
      hook = hookManager.getHook('test_count')
      expect(hook?.currentContent).toBe('2')
    })

    it('loops thread steps', () => {
      const processed = hookRenderer.extractHooks('Value: |val>[0]', 'test')
      container.innerHTML = processed
      hookRenderer.renderHooks('test')

      scheduler.registerThread('loop', 1.0, ['@replace: val { 1 }', '@replace: val { 2 }'])

      scheduler.update(1.0) // Step 0 -> 1
      scheduler.update(1.0) // Step 1 -> 2
      scheduler.update(1.0) // Step 2 -> 0 (loop)

      const hook = hookManager.getHook('test_val')
      expect(hook?.currentContent).toBe('1')
    })

    it('clears all threads', () => {
      scheduler.registerThread('test1', 1.0, ['step1'])
      scheduler.registerThread('test2', 1.0, ['step1'])

      expect(scheduler.getThread('test1')).toBeDefined()
      expect(scheduler.getThread('test2')).toBeDefined()

      scheduler.clear()

      expect(scheduler.getThread('test1')).toBeUndefined()
      expect(scheduler.getThread('test2')).toBeUndefined()
    })

    it('accumulates time correctly', () => {
      const processed = hookRenderer.extractHooks('Val: |val>[0]', 'test')
      container.innerHTML = processed
      hookRenderer.renderHooks('test')

      scheduler.registerThread('test', 1.0, ['@replace: val { 1 }'])

      // Multiple small updates
      scheduler.update(0.3)
      scheduler.update(0.3)
      scheduler.update(0.3) // Total: 0.9, not executed yet

      let hook = hookManager.getHook('test_val')
      expect(hook?.currentContent).toBe('0')

      scheduler.update(0.2) // Total: 1.1, should execute

      hook = hookManager.getHook('test_val')
      expect(hook?.currentContent).toBe('1')
    })
  })
})
