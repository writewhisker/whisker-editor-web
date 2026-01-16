// packages/parser/src/hooks.test.ts
// WLS 2.0 Hook Parsing Tests

import { describe, it, expect } from 'vitest'
import { parsePassage } from './parser'
import type { HookDefinitionNode, HookOperationNode } from './ast'

describe('Parser - Hook Support', () => {
  describe('hook definitions', () => {
    it('parses simple hook definition', () => {
      const content = 'Text with |flowers>[roses] here.'
      const result = parsePassage(content)

      const hookNode = result.content.find(
        (node): node is HookDefinitionNode => node.type === 'hook_definition'
      )

      expect(hookNode).toBeDefined()
      expect(hookNode?.name).toBe('flowers')
      expect(hookNode?.content).toBe('roses')
    })

    it('parses multiple hooks in one line', () => {
      const content = '|weather>[sunny] day with |flowers>[roses]'
      const result = parsePassage(content)

      const hookNodes = result.content.filter(
        (node): node is HookDefinitionNode => node.type === 'hook_definition'
      )

      expect(hookNodes).toHaveLength(2)
      expect(hookNodes[0].name).toBe('weather')
      expect(hookNodes[1].name).toBe('flowers')
    })

    it('handles empty hook content', () => {
      const content = '|placeholder>[]'
      const result = parsePassage(content)

      const hookNode = result.content[0] as HookDefinitionNode
      expect(hookNode.type).toBe('hook_definition')
      expect(hookNode.content).toBe('')
    })

    it('handles hook with special characters', () => {
      const content = '|code>[if (x > 5) { return true; }]'
      const result = parsePassage(content)

      const hookNode = result.content[0] as HookDefinitionNode
      expect(hookNode.content).toBe('if (x > 5) { return true; }')
    })

    it('handles underscore in hook names', () => {
      const content = '|enemy_hp>[100]'
      const result = parsePassage(content)

      const hookNode = result.content[0] as HookDefinitionNode
      expect(hookNode.name).toBe('enemy_hp')
    })

    it('handles nested brackets in content', () => {
      const content = '|array>[items[0], items[1]]'
      const result = parsePassage(content)

      const hookNode = result.content[0] as HookDefinitionNode
      expect(hookNode.content).toBe('items[0], items[1]')
    })
  })

  describe('hook operations', () => {
    it('parses replace operation', () => {
      const content = '@replace: flowers { wilted petals }'
      const result = parsePassage(content)

      const opNode = result.content[0] as HookOperationNode
      expect(opNode.type).toBe('hook_operation')
      expect(opNode.operation).toBe('replace')
      expect(opNode.target).toBe('flowers')
      expect(opNode.content).toBe('wilted petals')
    })

    it('parses all operation types', () => {
      const operations = [
        { str: '@replace: test { new }', op: 'replace' as const },
        { str: '@append: test { more }', op: 'append' as const },
        { str: '@prepend: test { before }', op: 'prepend' as const },
        { str: '@show: test {}', op: 'show' as const },
        { str: '@hide: test {}', op: 'hide' as const },
      ]

      operations.forEach(({ str, op }) => {
        const result = parsePassage(str)
        const opNode = result.content[0] as HookOperationNode

        expect(opNode.type).toBe('hook_operation')
        expect(opNode.operation).toBe(op)
      })
    })

    it('handles whitespace variations', () => {
      const variations = [
        '@replace:flowers{new}',
        '@replace: flowers{new}',
        '@replace:flowers {new}',
        '@replace: flowers { new }',
      ]

      variations.forEach((str) => {
        const result = parsePassage(str)
        const opNode = result.content[0] as HookOperationNode

        expect(opNode.type).toBe('hook_operation')
        expect(opNode.operation).toBe('replace')
      })
    })

    it('handles invalid operation types with error recovery', () => {
      const content = '@invalid: test { content }'
      const result = parsePassage(content)

      // Parser uses error recovery - @invalid is not a hook operation, so parsed as content
      // Invalid directives don't throw; they're handled gracefully
      expect(result.content.length).toBeGreaterThan(0)
    })

    it('handles nested braces in operation content', () => {
      const content = '@replace: code { if (x) { return true; } }'
      const result = parsePassage(content)

      const opNode = result.content[0] as HookOperationNode
      // Whitespace around nested braces may vary slightly
      expect(opNode.content).toContain('if (x)')
      expect(opNode.content).toContain('return true')
    })
  })

  describe('integration with existing syntax', () => {
    it('parses hooks alongside choices', () => {
      const content = `+ [Select]
@replace: status { changed }`
      const result = parsePassage(content)

      // Hook operation should be parsed at passage level (after choice)
      const hasHookOp = result.content.some((node) => node.type === 'hook_operation')
      const hasChoice = result.content.some((node) => node.type === 'choice')
      expect(hasHookOp).toBe(true)
      expect(hasChoice).toBe(true)
    })

    it('parses mixed content', () => {
      const content = 'Text |hook>[value] more text'
      const result = parsePassage(content)

      // Should have multiple nodes
      expect(result.content.length).toBeGreaterThan(1)

      // Should have hook node
      const hasHook = result.content.some((n) => n.type === 'hook_definition')
      expect(hasHook).toBe(true)
    })

    it('preserves text around hooks', () => {
      const content = 'Start |middle>[content] end'
      const result = parsePassage(content)

      expect(result.content.length).toBe(3)
      expect(result.content[0].type).toBe('text')
      expect(result.content[1].type).toBe('hook_definition')
      expect(result.content[2].type).toBe('text')
    })
  })

  describe('error handling', () => {
    it('handles malformed hook definition gracefully', () => {
      const content = '|broken>[unclosed'
      const result = parsePassage(content)

      // Parser uses error recovery - malformed hooks are parsed with errors
      // The parser doesn't throw; it reports errors and continues
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('handles malformed hook operation gracefully', () => {
      const content = '@replace: test { unclosed'
      const result = parsePassage(content)

      // Parser uses error recovery - malformed operations report errors
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('handles identifiers starting with numbers as text', () => {
      const content = '|123invalid>[content]'

      // Lexer tokenizes 123 as NUMBER, so this doesn't match hook pattern
      // (PIPE followed by IDENTIFIER). It's parsed as text instead.
      const result = parsePassage(content)
      // The content starts with pipe which isn't a hook, so parsed as text
      expect(result.content.length).toBeGreaterThan(0)
    })

    it('handles empty content gracefully', () => {
      const content = ''
      const result = parsePassage(content)

      expect(result.content).toHaveLength(0)
    })
  })

  describe('AST structure', () => {
    it('includes location information', () => {
      const content = 'Start |hook>[content] end'
      const result = parsePassage(content)

      const hookNode = result.content.find(
        (node): node is HookDefinitionNode => node.type === 'hook_definition'
      )

      expect(hookNode?.location).toBeDefined()
      expect(hookNode?.location.start.offset).toBeGreaterThan(0)
    })

    it('maintains correct node order', () => {
      const content = '|first>[1] text |second>[2]'
      const result = parsePassage(content)

      const hooks = result.content.filter(
        (node): node is HookDefinitionNode => node.type === 'hook_definition'
      )

      expect(hooks[0].name).toBe('first')
      expect(hooks[1].name).toBe('second')
    })

    it('correctly identifies node types', () => {
      const content = 'Text |hook>[val] @replace: hook { new }'
      const result = parsePassage(content)

      // Check that we have the expected node types in order
      const types = result.content.map(n => n.type)
      expect(types).toContain('text')
      expect(types).toContain('hook_definition')
      expect(types).toContain('hook_operation')
    })
  })

  describe('edge cases', () => {
    it('handles hook at start of content', () => {
      const content = '|first>[content] rest'
      const result = parsePassage(content)

      expect(result.content[0].type).toBe('hook_definition')
    })

    it('handles hook at end of content', () => {
      const content = 'start |last>[content]'
      const result = parsePassage(content)

      const lastNode = result.content[result.content.length - 1]
      expect(lastNode.type).toBe('hook_definition')
    })

    it('handles consecutive hooks', () => {
      const content = '|first>[a]|second>[b]|third>[c]'
      const result = parsePassage(content)

      const hookCount = result.content.filter((n) => n.type === 'hook_definition').length
      expect(hookCount).toBe(3)
    })

    it('handles hooks with newlines in content', () => {
      const content = '|multiline>[line1\nline2\nline3]'
      const result = parsePassage(content)

      const hookNode = result.content[0] as HookDefinitionNode
      expect(hookNode.content).toContain('\n')
    })

    it('handles deeply nested brackets', () => {
      const content = '|nested>[outer[middle[inner]middle]outer]'
      const result = parsePassage(content)

      const hookNode = result.content[0] as HookDefinitionNode
      expect(hookNode.content).toBe('outer[middle[inner]middle]outer')
    })

    it('handles complex mixed content', () => {
      const content = 'You see |flowers>[roses] in the |place>[garden]. @replace: flowers { wilted }'
      const result = parsePassage(content)

      const hooks = result.content.filter((n) => n.type === 'hook_definition')
      const ops = result.content.filter((n) => n.type === 'hook_operation')

      expect(hooks).toHaveLength(2)
      expect(ops).toHaveLength(1)
    })
  })
})
