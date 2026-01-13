import { describe, it, expect, beforeEach } from 'vitest'
import { HookManager } from './HookManager'
import { Hook } from './Hook'

describe('HookManager', () => {
  let manager: HookManager

  beforeEach(() => {
    manager = new HookManager()
  })

  describe('registerHook', () => {
    it('registers a new hook with correct properties', () => {
      const hookId = manager.registerHook('passage_1', 'flowers', 'roses')

      expect(hookId).toBe('passage_1_flowers')

      const hook = manager.getHook(hookId)
      expect(hook).toBeDefined()
      expect(hook?.name).toBe('flowers')
      expect(hook?.content).toBe('roses')
      expect(hook?.currentContent).toBe('roses')
      expect(hook?.visible).toBe(true)
      expect(hook?.passageId).toBe('passage_1')
      expect(hook?.modifiedCount).toBe(0)
      expect(hook?.createdAt).toBeGreaterThan(0)
    })

    it('tracks passage hooks correctly', () => {
      manager.registerHook('passage_1', 'flowers', 'roses')
      manager.registerHook('passage_1', 'weather', 'sunny')

      const hooks = manager.getPassageHooks('passage_1')
      expect(hooks).toHaveLength(2)
    })

    it('creates unique IDs for hooks in different passages', () => {
      const id1 = manager.registerHook('passage_1', 'door', 'locked')
      const id2 = manager.registerHook('passage_2', 'door', 'open')

      expect(id1).not.toBe(id2)
      expect(id1).toBe('passage_1_door')
      expect(id2).toBe('passage_2_door')
    })
  })

  describe('getHook and getHookByName', () => {
    it('retrieves hook by ID', () => {
      manager.registerHook('passage_1', 'test', 'value')

      const hook = manager.getHook('passage_1_test')
      expect(hook?.name).toBe('test')
    })

    it('retrieves hook by name and passage', () => {
      manager.registerHook('passage_1', 'test', 'value')

      const hook = manager.getHookByName('passage_1', 'test')
      expect(hook?.content).toBe('value')
    })

    it('returns undefined for non-existent hook', () => {
      const hook = manager.getHook('nonexistent')
      expect(hook).toBeUndefined()
    })
  })

  describe('replaceHook', () => {
    it('replaces hook content', () => {
      const hookId = manager.registerHook('passage_1', 'flowers', 'roses')
      const success = manager.replaceHook(hookId, 'wilted petals')

      expect(success).toBe(true)

      const hook = manager.getHook(hookId)
      expect(hook?.currentContent).toBe('wilted petals')
      expect(hook?.content).toBe('roses') // Original preserved
      expect(hook?.modifiedCount).toBe(1)
    })

    it('returns false for non-existent hook', () => {
      const success = manager.replaceHook('nonexistent', 'content')
      expect(success).toBe(false)
    })

    it('increments modification count', () => {
      const hookId = manager.registerHook('passage_1', 'counter', '0')
      
      manager.replaceHook(hookId, '1')
      manager.replaceHook(hookId, '2')

      const hook = manager.getHook(hookId)
      expect(hook?.modifiedCount).toBe(2)
    })
  })

  describe('appendHook', () => {
    it('appends content to hook', () => {
      const hookId = manager.registerHook('passage_1', 'story', 'Once upon a time')
      manager.appendHook(hookId, ', there was a hero')

      const hook = manager.getHook(hookId)
      expect(hook?.currentContent).toBe('Once upon a time, there was a hero')
      expect(hook?.modifiedCount).toBe(1)
    })

    it('can be called multiple times', () => {
      const hookId = manager.registerHook('passage_1', 'list', 'apple')
      manager.appendHook(hookId, ', banana')
      manager.appendHook(hookId, ', orange')

      const hook = manager.getHook(hookId)
      expect(hook?.currentContent).toBe('apple, banana, orange')
      expect(hook?.modifiedCount).toBe(2)
    })

    it('returns false for non-existent hook', () => {
      const success = manager.appendHook('nonexistent', 'content')
      expect(success).toBe(false)
    })
  })

  describe('prependHook', () => {
    it('prepends content to hook', () => {
      const hookId = manager.registerHook('passage_1', 'weather', 'shining')
      manager.prependHook(hookId, 'The sun is ')

      const hook = manager.getHook(hookId)
      expect(hook?.currentContent).toBe('The sun is shining')
    })

    it('can be called multiple times', () => {
      const hookId = manager.registerHook('passage_1', 'text', 'end')
      manager.prependHook(hookId, 'middle ')
      manager.prependHook(hookId, 'start ')

      const hook = manager.getHook(hookId)
      expect(hook?.currentContent).toBe('start middle end')
    })
  })

  describe('showHook and hideHook', () => {
    it('hides visible hook', () => {
      const hookId = manager.registerHook('passage_1', 'secret', 'treasure')

      manager.hideHook(hookId)
      const hook = manager.getHook(hookId)
      expect(hook?.visible).toBe(false)
    })

    it('shows hidden hook', () => {
      const hookId = manager.registerHook('passage_1', 'secret', 'treasure')
      manager.hideHook(hookId)
      manager.showHook(hookId)

      const hook = manager.getHook(hookId)
      expect(hook?.visible).toBe(true)
    })

    it('does not affect content', () => {
      const hookId = manager.registerHook('passage_1', 'text', 'content')
      manager.hideHook(hookId)

      const hook = manager.getHook(hookId)
      expect(hook?.currentContent).toBe('content')
    })

    it('returns false for non-existent hook', () => {
      expect(manager.showHook('nonexistent')).toBe(false)
      expect(manager.hideHook('nonexistent')).toBe(false)
    })
  })

  describe('clearPassageHooks', () => {
    it('clears all hooks for a passage', () => {
      manager.registerHook('passage_1', 'flowers', 'roses')
      manager.registerHook('passage_1', 'weather', 'sunny')
      manager.registerHook('passage_2', 'door', 'locked')

      manager.clearPassageHooks('passage_1')

      expect(manager.getPassageHooks('passage_1')).toHaveLength(0)
      expect(manager.getPassageHooks('passage_2')).toHaveLength(1)
    })

    it('removes hooks from registry', () => {
      const hookId = manager.registerHook('passage_1', 'test', 'value')
      manager.clearPassageHooks('passage_1')

      expect(manager.getHook(hookId)).toBeUndefined()
    })

    it('handles non-existent passage gracefully', () => {
      expect(() => {
        manager.clearPassageHooks('nonexistent')
      }).not.toThrow()
    })
  })

  describe('getPassageHooks', () => {
    it('returns all hooks for passage', () => {
      manager.registerHook('passage_1', 'hook1', 'value1')
      manager.registerHook('passage_1', 'hook2', 'value2')
      manager.registerHook('passage_2', 'hook3', 'value3')

      const hooks = manager.getPassageHooks('passage_1')
      expect(hooks).toHaveLength(2)
      expect(hooks.map(h => h.name)).toContain('hook1')
      expect(hooks.map(h => h.name)).toContain('hook2')
    })

    it('returns empty array for passage with no hooks', () => {
      const hooks = manager.getPassageHooks('empty_passage')
      expect(hooks).toHaveLength(0)
    })
  })

  describe('serialization', () => {
    it('serializes and deserializes state', () => {
      manager.registerHook('passage_1', 'flowers', 'roses')
      manager.replaceHook('passage_1_flowers', 'wilted')

      const data = manager.serialize()

      const newManager = new HookManager()
      newManager.deserialize(data)

      const hook = newManager.getHook('passage_1_flowers')
      expect(hook).toBeDefined()
      expect(hook?.currentContent).toBe('wilted')
      expect(hook?.content).toBe('roses')
    })

    it('preserves visibility state', () => {
      const hookId = manager.registerHook('passage_1', 'secret', 'value')
      manager.hideHook(hookId)

      const data = manager.serialize()
      const newManager = new HookManager()
      newManager.deserialize(data)

      const hook = newManager.getHook(hookId)
      expect(hook?.visible).toBe(false)
    })

    it('preserves passage associations', () => {
      manager.registerHook('passage_1', 'hook1', 'value1')
      manager.registerHook('passage_1', 'hook2', 'value2')

      const data = manager.serialize()
      const newManager = new HookManager()
      newManager.deserialize(data)

      const hooks = newManager.getPassageHooks('passage_1')
      expect(hooks).toHaveLength(2)
    })
  })

  describe('edge cases', () => {
    it('handles empty hook content', () => {
      const hookId = manager.registerHook('passage_1', 'empty', '')
      const hook = manager.getHook(hookId)
      
      expect(hook?.content).toBe('')
      expect(hook?.currentContent).toBe('')
    })

    it('handles special characters in content', () => {
      const content = 'Special: <>&"\' chars'
      const hookId = manager.registerHook('passage_1', 'special', content)
      const hook = manager.getHook(hookId)
      
      expect(hook?.content).toBe(content)
    })

    it('handles hook names with underscores', () => {
      const hookId = manager.registerHook('passage_1', 'enemy_hp', '100')
      expect(hookId).toBe('passage_1_enemy_hp')
      expect(manager.getHook(hookId)).toBeDefined()
    })

    it('maintains separate state between passages', () => {
      manager.registerHook('passage_1', 'shared', 'value1')
      manager.registerHook('passage_2', 'shared', 'value2')

      const hook1 = manager.getHookByName('passage_1', 'shared')
      const hook2 = manager.getHookByName('passage_2', 'shared')

      expect(hook1?.currentContent).toBe('value1')
      expect(hook2?.currentContent).toBe('value2')
    })
  })
})
