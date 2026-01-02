import { describe, it, expect } from 'vitest';
import { migrate, formatReport, MigrationResult } from './migrate-1x-to-2x';

describe('WLS 1.x to 2.0 Migration Tool', () => {
  describe('migrate', () => {
    it('should add version directive if not present', () => {
      const source = `:: Start
Hello world!`;
      const result = migrate(source);

      expect(result.content).toContain('@version: 2.0');
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].type).toBe('directive');
    });

    it('should not add version directive if already present', () => {
      const source = `@version: 2.0
:: Start
Hello world!`;
      const result = migrate(source);

      // Should not have directive change
      const directiveChanges = result.changes.filter(
        (c) => c.type === 'directive'
      );
      expect(directiveChanges).toHaveLength(0);
    });

    it('should rename reserved word variables', () => {
      const source = `:: Start
{do $thread = 1}
{do $await = true}
{do $spawn = "test"}`;
      const result = migrate(source);

      expect(result.content).toContain('$_migrated_thread');
      expect(result.content).toContain('$_migrated_await');
      expect(result.content).toContain('$_migrated_spawn');
      expect(result.content).not.toContain('{do $thread =');
      expect(result.content).not.toContain('{do $await =');

      // Should have changes for reserved words
      const reservedWordChanges = result.changes.filter(
        (c) => c.type === 'reserved_word'
      );
      expect(reservedWordChanges.length).toBeGreaterThanOrEqual(3);
    });

    it('should warn about tunnel usage', () => {
      const source = `:: Start
-> SubPassage ->
Continue here.

:: SubPassage
This is a tunnel.
->->`;
      const result = migrate(source);

      expect(result.warnings.some((w) => w.message.includes('tunnels'))).toBe(
        true
      );
    });

    it('should warn about LIST usage', () => {
      const source = `LIST doorState = (closed), locked, unlocked, open

:: Start
The door is closed.`;
      const result = migrate(source);

      expect(result.warnings.some((w) => w.message.includes('LIST'))).toBe(
        true
      );
    });

    it('should preserve non-conflicting content', () => {
      const source = `@title: My Story
@author: Test

:: Start
{do $gold = 100}
{do $health = 100}

Welcome to the game!

+ [Go left] -> Left
+ [Go right] -> Right

:: Left
You went left.

:: Right
You went right.`;
      const result = migrate(source);

      // Content should be preserved (with version directive added)
      expect(result.content).toContain('@title: My Story');
      expect(result.content).toContain('@author: Test');
      expect(result.content).toContain('{do $gold = 100}');
      expect(result.content).toContain('{do $health = 100}');
      expect(result.content).toContain('+ [Go left] -> Left');
    });

    it('should handle case-insensitive reserved word detection', () => {
      const source = `:: Start
{do $Thread = 1}
{do $THREAD = 2}`;
      const result = migrate(source);

      expect(result.content).not.toMatch(/\$Thread\b/i);
      expect(result.content).toContain('$_migrated_');
    });

    it('should return version 2.0 in result', () => {
      const source = ':: Start\nHello';
      const result = migrate(source);

      expect(result.version).toBe('2.0');
    });
  });

  describe('formatReport', () => {
    it('should format report with changes and warnings', () => {
      const result: MigrationResult = {
        content: 'migrated content',
        version: '2.0',
        changes: [
          {
            type: 'reserved_word',
            line: 5,
            column: 10,
            original: '$thread',
            replacement: '$_migrated_thread',
            reason: 'Reserved keyword',
          },
        ],
        warnings: [
          {
            type: 'manual_review',
            line: 10,
            message: 'Story uses tunnels',
          },
        ],
      };

      const report = formatReport(result);

      expect(report).toContain('Changes: 1');
      expect(report).toContain('Warnings: 1');
      expect(report).toContain('$thread');
      expect(report).toContain('$_migrated_thread');
      expect(report).toContain('Story uses tunnels');
    });

    it('should format report with no changes', () => {
      const result: MigrationResult = {
        content: 'content',
        version: '2.0',
        changes: [],
        warnings: [],
      };

      const report = formatReport(result);

      expect(report).toContain('Changes: 0');
      expect(report).toContain('Warnings: 0');
    });
  });

  describe('complex migration scenarios', () => {
    it('should handle multiple reserved words in same expression', () => {
      const source = `:: Start
{do $result = $thread + $await}`;
      const result = migrate(source);

      expect(result.content).toContain('$_migrated_thread');
      expect(result.content).toContain('$_migrated_await');
      expect(result.changes.filter((c) => c.type === 'reserved_word').length).toBe(2);
    });

    it('should not modify non-variable uses of reserved words', () => {
      const source = `:: Start
This is about a thread of conversation.
We await your response.`;
      const result = migrate(source);

      // Text should remain unchanged (these are prose, not variables)
      expect(result.content).toContain('thread of conversation');
      expect(result.content).toContain('await your response');
    });

    it('should handle story with all WLS 2.0 reserved words', () => {
      const source = `:: Start
{do $thread = 1}
{do $await = 2}
{do $spawn = 3}
{do $sync = 4}
{do $channel = 5}`;
      const result = migrate(source);

      expect(result.content).toContain('$_migrated_thread');
      expect(result.content).toContain('$_migrated_await');
      expect(result.content).toContain('$_migrated_spawn');
      expect(result.content).toContain('$_migrated_sync');
      expect(result.content).toContain('$_migrated_channel');
    });
  });
});
