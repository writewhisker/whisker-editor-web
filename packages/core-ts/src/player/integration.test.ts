import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { WhiskerPlayerUI } from './index'
import { JSDOM } from 'jsdom'

// Setup DOM environment for tests
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
global.document = dom.window.document as any
global.HTMLElement = dom.window.HTMLElement as any

describe('PlayerUI Hook Integration', () => {
  let container: HTMLElement
  let player: WhiskerPlayerUI

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    player = new WhiskerPlayerUI(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  // ========================================================================
  // Test Suite 1: Passage Rendering
  // ========================================================================

  describe('renderPassage', () => {
    it('renders passage with hooks', () => {
      const content = 'You see |flowers>[roses] in the garden.'
      player.renderPassage('passage_1', content)

      const hookElement = container.querySelector('[data-hook-id="passage_1_flowers"]')
      expect(hookElement).toBeDefined()
      expect(hookElement?.textContent).toBe('roses')
    })

    it('clears previous passage hooks on navigation', () => {
      player.renderPassage('passage_1', 'Room 1: |item>[key]')
      player.renderPassage('passage_2', 'Room 2: |item>[sword]')

      const oldHook = container.querySelector('[data-hook-id="passage_1_item"]')
      const newHook = container.querySelector('[data-hook-id="passage_2_item"]')

      expect(oldHook).toBeNull()
      expect(newHook?.textContent).toBe('sword')
    })

    it('handles multiple hooks', () => {
      const content = '|weather>[sunny] day with |flowers>[roses]'
      player.renderPassage('test', content)

      const weather = container.querySelector('[data-hook-id="test_weather"]')
      const flowers = container.querySelector('[data-hook-id="test_flowers"]')

      expect(weather?.textContent).toBe('sunny')
      expect(flowers?.textContent).toBe('roses')
    })
  })

  // ========================================================================
  // Test Suite 2: Operation Execution
  // ========================================================================

  describe('executeHookOperation', () => {
    beforeEach(() => {
      player.renderPassage('test', 'HP: |hp>[100]')
    })

    it('executes replace operation', () => {
      const success = player.executeHookOperation('replace', 'hp', '85')

      expect(success).toBe(true)

      const hook = container.querySelector('[data-hook-id="test_hp"]')
      expect(hook?.textContent).toBe('85')
    })

    it('executes append operation', () => {
      player.renderPassage('test', 'Items: |items>[sword]')
      player.executeHookOperation('append', 'items', ', shield')

      const hook = container.querySelector('[data-hook-id="test_items"]')
      expect(hook?.textContent).toBe('sword, shield')
    })

    it('executes hide operation', () => {
      player.executeHookOperation('hide', 'hp')

      const hook = container.querySelector('[data-hook-id="test_hp"]') as HTMLElement
      expect(hook?.style.display).toBe('none')
    })

    it('returns false without current passage', () => {
      const player2 = new WhiskerPlayerUI(document.createElement('div'))
      const success = player2.executeHookOperation('replace', 'test', 'value')

      expect(success).toBe(false)
    })
  })

  // ========================================================================
  // Test Suite 3: Public API
  // ========================================================================

  describe('public API', () => {
    beforeEach(() => {
      player.renderPassage('test', 'Content: |content>[initial]')
    })

    it('returns hook manager', () => {
      const manager = player.getHookManager()
      expect(manager).toBeDefined()
    })

    it('returns current hooks', () => {
      const hooks = player.getCurrentHooks()
      expect(hooks.length).toBe(1)
      expect(hooks[0].name).toBe('content')
    })

    it('checks hook existence', () => {
      expect(player.hasHook('content')).toBe(true)
      expect(player.hasHook('missing')).toBe(false)
    })

    it('gets hook content', () => {
      const content = player.getHookContent('content')
      expect(content).toBe('initial')
    })
  })
})
