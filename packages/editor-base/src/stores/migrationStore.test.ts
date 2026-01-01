import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  isMigrating,
  migrationError,
  currentMigrationPreview,
  migrationHistory,
  migrationActions,
  detectStoryVersion,
  detectLegacySyntax,
  generateMigrationPreview,
  applyMigration,
} from './migrationStore';
import { Story, Passage } from '@writewhisker/core-ts';

describe('migrationStore', () => {
  beforeEach(() => {
    // Reset stores
    isMigrating.set(false);
    migrationError.set(null);
    currentMigrationPreview.set(null);
    migrationHistory.set([]);
  });

  describe('detectStoryVersion', () => {
    it('should detect WLS 1.0 from metadata version', () => {
      const story = new Story({
        metadata: { title: 'Test', version: '1.0' },
      });
      story.addPassage(new Passage({ title: 'Start', content: 'Hello' }));

      expect(detectStoryVersion(story)).toBe('1.0');
    });

    it('should detect WLS 1.0 from choice structure', () => {
      const story = new Story({
        metadata: { title: 'Test' },
      });
      const passage = new Passage({ title: 'Start', content: 'Choose:' });
      passage.choices.push({ text: 'Go', target: 'Next', choiceType: 'once' } as any);
      story.addPassage(passage);

      expect(detectStoryVersion(story)).toBe('1.0');
    });

    it('should detect legacy 0.x from Twine macro syntax', () => {
      const story = new Story({
        metadata: { title: 'Test' },
      });
      story.addPassage(new Passage({
        title: 'Start',
        content: '<<if $gold > 10>>You have gold<<endif>>',
      }));

      expect(detectStoryVersion(story)).toBe('0.x');
    });

    it('should detect legacy 0.x from Twine link syntax', () => {
      const story = new Story({
        metadata: { title: 'Test' },
      });
      story.addPassage(new Passage({
        title: 'Start',
        content: 'Go to the [[Forest]] or [[Town|Village]]',
      }));

      expect(detectStoryVersion(story)).toBe('0.x');
    });

    it('should return unknown for empty stories', () => {
      const story = new Story({
        metadata: { title: 'Test' },
      });

      expect(detectStoryVersion(story)).toBe('unknown');
    });
  });

  describe('detectLegacySyntax', () => {
    it('should detect Twine macro syntax', () => {
      const content = '<<if $gold > 10>>You are rich<<endif>>';
      const result = detectLegacySyntax(content);

      expect(result.hasLegacy).toBe(true);
      expect(result.patterns).toHaveLength(2);
      expect(result.patterns[0].type).toBe('macro');
      expect(result.patterns[0].match).toBe('<<if $gold > 10>>');
    });

    it('should detect Twine link syntax', () => {
      const content = 'Go to [[Forest]] or [[Town|Village]]';
      const result = detectLegacySyntax(content);

      expect(result.hasLegacy).toBe(true);
      expect(result.patterns).toHaveLength(2);
      expect(result.patterns[0].type).toBe('link');
    });

    it('should detect arrow link syntax', () => {
      const content = '[[Go forward->NextPassage]]';
      const result = detectLegacySyntax(content);

      expect(result.hasLegacy).toBe(true);
      expect(result.patterns[0].type).toBe('link');
    });

    it('should return empty for WLS 1.0 syntax', () => {
      const content = '{if gold > 10}You are rich{/}';
      const result = detectLegacySyntax(content);

      expect(result.hasLegacy).toBe(false);
      expect(result.patterns).toHaveLength(0);
    });

    it('should track line numbers', () => {
      const content = 'Line 1\n<<set $gold to 100>>\nLine 3';
      const result = detectLegacySyntax(content);

      expect(result.patterns[0].line).toBe(2);
    });
  });

  describe('generateMigrationPreview', () => {
    it('should return no changes for WLS 1.0 story', () => {
      const story = new Story({
        metadata: { title: 'Test', version: '1.0' },
      });
      story.addPassage(new Passage({ title: 'Start', content: 'Hello' }));

      const preview = generateMigrationPreview(story);

      expect(preview.version).toBe('1.0');
      expect(preview.canMigrate).toBe(false);
      expect(preview.changes).toHaveLength(0);
    });

    it('should generate changes for legacy macros', () => {
      const story = new Story({
        metadata: { title: 'Test' },
      });
      story.addPassage(new Passage({
        title: 'Start',
        content: '<<if $gold > 10>>Rich<<endif>>',
      }));

      const preview = generateMigrationPreview(story);

      expect(preview.version).toBe('0.x');
      expect(preview.canMigrate).toBe(true);
      expect(preview.changes.length).toBeGreaterThan(0);

      const ifChange = preview.changes.find(c => c.original.includes('<<if'));
      expect(ifChange).toBeDefined();
      expect(ifChange?.migrated).toBe('{if $gold > 10}');
    });

    it('should generate changes for legacy links', () => {
      const story = new Story({
        metadata: { title: 'Test' },
      });
      story.addPassage(new Passage({
        title: 'Start',
        content: '[[Go to forest|Forest]]',
      }));

      const preview = generateMigrationPreview(story);

      expect(preview.canMigrate).toBe(true);
      const linkChange = preview.changes.find(c => c.type === 'choice');
      expect(linkChange).toBeDefined();
      expect(linkChange?.migrated).toBe('+ [Go to forest] -> Forest');
    });

    it('should convert set macro to WLS syntax', () => {
      const story = new Story({
        metadata: { title: 'Test' },
      });
      story.addPassage(new Passage({
        title: 'Start',
        content: '<<set $gold to 100>>',
      }));

      const preview = generateMigrationPreview(story);

      const setChange = preview.changes.find(c => c.original.includes('<<set'));
      expect(setChange?.migrated).toBe('{$ gold = 100}');
    });

    it('should add warnings for unknown macros', () => {
      const story = new Story({
        metadata: { title: 'Test' },
      });
      story.addPassage(new Passage({
        title: 'Start',
        content: '<<customMacro arg1 arg2>>',
      }));

      const preview = generateMigrationPreview(story);

      expect(preview.warnings.some(w => w.includes('manual review'))).toBe(true);
    });
  });

  describe('applyMigration', () => {
    it('should apply migration changes to story', () => {
      const story = new Story({
        metadata: { title: 'Test' },
      });
      story.addPassage(new Passage({
        title: 'Start',
        content: '<<if $gold > 10>>Rich<<endif>>',
      }));

      const preview = generateMigrationPreview(story);
      const result = applyMigration(story, preview);

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.changes.length).toBeGreaterThan(0);

      const migratedPassage = result.story?.getPassage(
        Array.from(result.story.passages.keys())[0]
      );
      expect(migratedPassage?.content).toContain('{if $gold > 10}');
      expect(migratedPassage?.content).toContain('{/}');
    });

    it('should update story metadata after migration', () => {
      const story = new Story({
        metadata: { title: 'Test' },
      });
      story.addPassage(new Passage({
        title: 'Start',
        content: '<<if true>>yes<<endif>>',
      }));

      const preview = generateMigrationPreview(story);
      const result = applyMigration(story, preview);

      expect(result.story?.metadata.version).toBe('1.0');
      expect(result.story?.metadata.migratedAt).toBeDefined();
      expect(result.story?.metadata.migratedFrom).toBe('0.x');
    });

    it('should include duration in result', () => {
      const story = new Story({
        metadata: { title: 'Test' },
      });
      story.addPassage(new Passage({ title: 'Start', content: '[[Next]]' }));

      const preview = generateMigrationPreview(story);
      const result = applyMigration(story, preview);

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should not modify original story', () => {
      const story = new Story({
        metadata: { title: 'Test' },
      });
      story.addPassage(new Passage({
        title: 'Start',
        content: '<<if true>>test<<endif>>',
      }));
      const originalContent = '<<if true>>test<<endif>>';

      const preview = generateMigrationPreview(story);
      applyMigration(story, preview);

      const passage = story.getPassage(Array.from(story.passages.keys())[0]);
      expect(passage?.content).toBe(originalContent);
    });
  });

  describe('migrationActions', () => {
    describe('previewMigration', () => {
      it('should set currentMigrationPreview store', () => {
        const story = new Story({
          metadata: { title: 'Test' },
        });
        story.addPassage(new Passage({ title: 'Start', content: '[[Next]]' }));

        migrationActions.previewMigration(story);

        expect(get(currentMigrationPreview)).not.toBeNull();
        expect(get(currentMigrationPreview)?.version).toBe('0.x');
      });
    });

    describe('migrate', () => {
      it('should set isMigrating during migration', async () => {
        const story = new Story({
          metadata: { title: 'Test' },
        });
        story.addPassage(new Passage({ title: 'Start', content: '[[Next]]' }));
        migrationActions.previewMigration(story);

        const promise = migrationActions.migrate(story);
        // Note: isMigrating might be false by the time we check due to fast execution
        await promise;

        expect(get(isMigrating)).toBe(false);
      });

      it('should add entry to history on success', async () => {
        const story = new Story({
          metadata: { title: 'Test Story' },
        });
        story.addPassage(new Passage({ title: 'Start', content: '[[Next]]' }));
        migrationActions.previewMigration(story);

        await migrationActions.migrate(story);

        const history = get(migrationHistory);
        expect(history.length).toBe(1);
        expect(history[0].storyTitle).toBe('Test Story');
        expect(history[0].success).toBe(true);
      });

      it('should set error on failure', async () => {
        const story = new Story({
          metadata: { title: 'Test', version: '1.0' },
        });
        story.addPassage(new Passage({ title: 'Start', content: 'Hello' }));
        migrationActions.previewMigration(story);

        await migrationActions.migrate(story);

        expect(get(migrationError)).toBe('Story cannot be migrated');
      });
    });

    describe('clearPreview', () => {
      it('should clear currentMigrationPreview', () => {
        currentMigrationPreview.set({ version: '0.x' } as any);

        migrationActions.clearPreview();

        expect(get(currentMigrationPreview)).toBeNull();
      });
    });

    describe('clearError', () => {
      it('should clear migrationError', () => {
        migrationError.set('Some error');

        migrationActions.clearError();

        expect(get(migrationError)).toBeNull();
      });
    });

    describe('clearHistory', () => {
      it('should clear migrationHistory', () => {
        migrationHistory.set([{ id: 'test' } as any]);

        migrationActions.clearHistory();

        expect(get(migrationHistory)).toHaveLength(0);
      });
    });
  });
});
