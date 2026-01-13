import { describe, it, expect, beforeEach } from 'vitest'
import { HookRenderer } from './HookRenderer'
import { HookManager } from './HookManager'
import { JSDOM } from 'jsdom'

// Setup DOM environment for tests
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
global.document = dom.window.document as any
global.HTMLElement = dom.window.HTMLElement as any

describe('HookRenderer', () => {
  let hookManager: HookManager
  let container: HTMLElement
  let renderer: HookRenderer

  beforeEach(() => {
    hookManager = new HookManager()
    container = document.createElement('div')
    renderer = new HookRenderer(hookManager, container)
  })

  // ========================================================================
  // Test Suite 1: Hook Extraction
  // ========================================================================

  describe('extractHooks', () => {
    it('extracts single hook', () => {
      const content = 'You see |flowers>[roses] in the garden.'
      const processed = renderer.extractHooks(content, 'passage_1')

      expect(processed).toContain('data-hook-id="passage_1_flowers"')
      expect(processed).toContain('data-hook-name="flowers"')
      expect(processed).not.toContain('|flowers>')

      const hook = hookManager.getHook('passage_1_flowers')
      expect(hook).toBeDefined()
      expect(hook?.content).toBe('roses')
    })

    it('extracts multiple hooks', () => {
      const content = 'The |weather>[sun] shines on |flowers>[roses].'
      const processed = renderer.extractHooks(content, 'passage_1')

      expect(processed).toContain('passage_1_weather')
      expect(processed).toContain('passage_1_flowers')

      const weather = hookManager.getHook('passage_1_weather')
      const flowers = hookManager.getHook('passage_1_flowers')

      expect(weather?.content).toBe('sun')
      expect(flowers?.content).toBe('roses')
    })

    it('handles nested brackets', () => {
      const content = '|array>[items[0], items[1]]'
      const processed = renderer.extractHooks(content, 'passage_1')

      const hook = hookManager.getHook('passage_1_array')
      expect(hook?.content).toBe('items[0], items[1]')
    })

    it('handles empty hook content', () => {
      const content = 'Placeholder |empty>[] here.'
      const processed = renderer.extractHooks(content, 'passage_1')

      const hook = hookManager.getHook('passage_1_empty')
      expect(hook?.content).toBe('')
    })

    it('preserves text around hooks', () => {
      const content = 'Start |middle>[content] end'
      const processed = renderer.extractHooks(content, 'passage_1')

      expect(processed).toContain('Start')
      expect(processed).toContain('end')
    })
  })

  // ========================================================================
  // Test Suite 2: Hook Rendering
  // ========================================================================

  describe('renderHooks', () => {
    it('renders visible hook', () => {
      const content = 'Test |hook>[content] here.'
      const processed = renderer.extractHooks(content, 'passage_1')
      container.innerHTML = processed

      renderer.renderHooks('passage_1')

      const element = container.querySelector('[data-hook-id="passage_1_hook"]')
      expect(element?.textContent).toBe('content')
    })

    it('hides invisible hook', () => {
      const content = 'Secret |secret>[treasure] here.'
      const processed = renderer.extractHooks(content, 'passage_1')
      container.innerHTML = processed

      hookManager.hideHook('passage_1_secret')
      renderer.renderHooks('passage_1')

      const element = container.querySelector(
        '[data-hook-id="passage_1_secret"]'
      ) as HTMLElement
      expect(element?.style.display).toBe('none')
    })

    it('renders multiple hooks', () => {
      const content = '|a>[first] and |b>[second]'
      const processed = renderer.extractHooks(content, 'passage_1')
      container.innerHTML = processed

      renderer.renderHooks('passage_1')

      const elemA = container.querySelector('[data-hook-id="passage_1_a"]')
      const elemB = container.querySelector('[data-hook-id="passage_1_b"]')

      expect(elemA?.textContent).toBe('first')
      expect(elemB?.textContent).toBe('second')
    })
  })

  // ========================================================================
  // Test Suite 3: Operation Execution
  // ========================================================================

  describe('executeOperation', () => {
    beforeEach(() => {
      const content = 'Value: |value>[initial]'
      const processed = renderer.extractHooks(content, 'test')
      container.innerHTML = processed
      renderer.renderHooks('test')
    })

    it('executes replace operation', () => {
      const success = renderer.executeOperation('test', 'replace', 'value', 'updated')

      expect(success).toBe(true)

      const element = container.querySelector('[data-hook-id="test_value"]')
      expect(element?.textContent).toBe('updated')
    })

    it('executes append operation', () => {
      const success = renderer.executeOperation('test', 'append', 'value', ' more')

      expect(success).toBe(true)

      const element = container.querySelector('[data-hook-id="test_value"]')
      expect(element?.textContent).toBe('initial more')
    })

    it('executes prepend operation', () => {
      const success = renderer.executeOperation('test', 'prepend', 'value', 'before ')

      expect(success).toBe(true)

      const element = container.querySelector('[data-hook-id="test_value"]')
      expect(element?.textContent).toBe('before initial')
    })

    it('executes show operation', () => {
      hookManager.hideHook('test_value')
      renderer.renderHooks('test')

      const success = renderer.executeOperation('test', 'show', 'value')

      expect(success).toBe(true)

      const element = container.querySelector('[data-hook-id="test_value"]') as HTMLElement
      expect(element?.style.display).not.toBe('none')
    })

    it('executes hide operation', () => {
      const success = renderer.executeOperation('test', 'hide', 'value')

      expect(success).toBe(true)

      const element = container.querySelector('[data-hook-id="test_value"]') as HTMLElement
      expect(element?.style.display).toBe('none')
    })

    it('returns false for invalid operation', () => {
      const success = renderer.executeOperation('test', 'invalid' as any, 'value', 'content')
      expect(success).toBe(false)
    })

    it('returns false for non-existent hook', () => {
      const success = renderer.executeOperation('test', 'replace', 'missing', 'content')
      expect(success).toBe(false)
    })
  })

  // ========================================================================
  // Test Suite 4: XSS Prevention
  // ========================================================================

  describe('XSS prevention', () => {
    it('uses textContent to prevent script injection', () => {
      const malicious = '<script>alert("xss")</script>'
      const content = 'Safe |hook>[placeholder]'
      const processed = renderer.extractHooks(content, 'test')
      container.innerHTML = processed
      renderer.renderHooks('test')

      renderer.executeOperation('test', 'replace', 'hook', malicious)

      const element = container.querySelector('[data-hook-id="test_hook"]')
      expect(element?.textContent).toBe(malicious)
      expect(element?.innerHTML).not.toContain('<script>')
    })

    it('escapes HTML in hook content', () => {
      const html = '<b>bold</b>'
      const content = 'Text |hook>[initial]'
      const processed = renderer.extractHooks(content, 'test')
      container.innerHTML = processed
      renderer.renderHooks('test')

      renderer.executeOperation('test', 'replace', 'hook', html)

      const element = container.querySelector('[data-hook-id="test_hook"]')
      expect(element?.textContent).toBe('<b>bold</b>')
    })

    it('prevents event handler injection', () => {
      const malicious = 'text" onclick="alert(1)" data-bad="'
      const content = 'Safe |hook>[initial]'
      const processed = renderer.extractHooks(content, 'test')
      container.innerHTML = processed

      renderer.executeOperation('test', 'replace', 'hook', malicious)

      const element = container.querySelector('[data-hook-id="test_hook"]') as HTMLElement
      expect(element.onclick).toBeNull()
    })
  })

  // ========================================================================
  // Test Suite 5: DOM Efficiency
  // ========================================================================

  describe('DOM efficiency', () => {
    it('updates only modified hook', () => {
      const content = '|a>[first] |b>[second] |c>[third]'
      const processed = renderer.extractHooks(content, 'test')
      container.innerHTML = processed
      renderer.renderHooks('test')

      const elemB = container.querySelector('[data-hook-id="test_b"]')
      const originalElemB = elemB

      renderer.executeOperation('test', 'replace', 'b', 'updated')

      const newElemB = container.querySelector('[data-hook-id="test_b"]')
      expect(newElemB).toBe(originalElemB) // Same element reference
      expect(newElemB?.textContent).toBe('updated')
    })

    it('handles rapid successive updates', () => {
      const content = 'Counter: |count>[0]'
      const processed = renderer.extractHooks(content, 'test')
      container.innerHTML = processed
      renderer.renderHooks('test')

      for (let i = 1; i <= 100; i++) {
        renderer.executeOperation('test', 'replace', 'count', i.toString())
      }

      const element = container.querySelector('[data-hook-id="test_count"]')
      expect(element?.textContent).toBe('100')
    })

    it('cleans up passage hooks efficiently', () => {
      const content = '|hook1>[a] |hook2>[b] |hook3>[c]'
      const processed = renderer.extractHooks(content, 'test')
      container.innerHTML = processed

      renderer.clearPassage('test')

      const hooks = container.querySelectorAll('[data-hook-id^="test_"]')
      expect(hooks.length).toBe(0)

      const passageHooks = hookManager.getPassageHooks('test')
      expect(passageHooks.length).toBe(0)
    })
  })
})
