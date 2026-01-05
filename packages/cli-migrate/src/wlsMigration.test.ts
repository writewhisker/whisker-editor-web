/**
 * Tests for WLS Content Migration
 */

import { describe, it, expect } from 'vitest';
import {
  migrateWLSContent,
  migratePassage,
  migrateStoryContent,
  generateDeclarations,
  formatMigrationReport,
  type WLSMigrationOptions,
  type WLSMigrationResult,
  type WLSMigrationSummary,
} from './wlsMigration.js';

describe('migrateWLSContent', () => {
  describe('LIST detection', () => {
    it('should detect LIST declarations', () => {
      const content = `LIST doorState = open, (closed), locked`;
      const result = migrateWLSContent(content);

      expect(result.suggestions.length).toBeGreaterThan(0);
      const listSuggestion = result.suggestions.find(s => s.type === 'state_machine');
      expect(listSuggestion).toBeDefined();
      expect(listSuggestion?.description).toContain('doorState');
    });

    it('should suggest state machine for exclusive lists', () => {
      const content = `LIST playerMode = walking, running, (idle), jumping`;
      const result = migrateWLSContent(content);

      const suggestion = result.suggestions.find(s => s.type === 'state_machine');
      expect(suggestion).toBeDefined();
      expect(suggestion?.recommendation).toContain('createExclusiveStateMachine');
    });

    it('should handle multiple LIST declarations', () => {
      const content = `
LIST colors = red, green, blue
LIST sizes = small, medium, large
`;
      const result = migrateWLSContent(content);

      const stateMachineSuggestions = result.suggestions.filter(s => s.type === 'state_machine');
      expect(stateMachineSuggestions.length).toBe(2);
    });
  });

  describe('Thread pattern detection', () => {
    it('should detect spawn patterns', () => {
      const content = `spawn backgroundMusic`;
      const result = migrateWLSContent(content);

      const threadSuggestion = result.suggestions.find(s => s.type === 'thread');
      expect(threadSuggestion).toBeDefined();
      expect(threadSuggestion?.description).toContain('spawn');
      expect(threadSuggestion?.description).toContain('backgroundMusic');
    });

    it('should detect await patterns', () => {
      const content = `await playerChoice`;
      const result = migrateWLSContent(content);

      const threadSuggestion = result.suggestions.find(s => s.type === 'thread');
      expect(threadSuggestion).toBeDefined();
      expect(threadSuggestion?.description).toContain('await');
    });

    it('should detect multiple thread patterns', () => {
      const content = `
spawn combat
spawn dialogue
await combat
`;
      const result = migrateWLSContent(content);

      const threadSuggestions = result.suggestions.filter(s => s.type === 'thread');
      expect(threadSuggestions.length).toBe(3);
    });
  });

  describe('External function detection', () => {
    it('should detect EXTERNAL calls', () => {
      const content = `EXTERNAL SaveGame()`;
      const result = migrateWLSContent(content);

      const externalSuggestion = result.suggestions.find(s => s.type === 'external');
      expect(externalSuggestion).toBeDefined();
      expect(externalSuggestion?.description).toContain('SaveGame');
    });

    it('should detect EXT calls', () => {
      const content = `EXT PlayCutscene("intro")`;
      const result = migrateWLSContent(content);

      const externalSuggestion = result.suggestions.find(s => s.type === 'external');
      expect(externalSuggestion).toBeDefined();
      expect(externalSuggestion?.description).toContain('PlayCutscene');
    });

    it('should detect PascalCase function calls', () => {
      const content = `GetPlayerHealth()`;
      const result = migrateWLSContent(content);

      const externalSuggestion = result.suggestions.find(s =>
        s.type === 'external' && s.description.includes('GetPlayerHealth')
      );
      expect(externalSuggestion).toBeDefined();
    });

    it('should not flag common keywords as external functions', () => {
      const content = `LIST items = a, b`;
      const result = migrateWLSContent(content);

      const externalSuggestions = result.suggestions.filter(s =>
        s.type === 'external' && s.description.includes('LIST')
      );
      expect(externalSuggestions.length).toBe(0);
    });
  });

  describe('Audio detection', () => {
    it('should detect playSound calls', () => {
      const content = `playSound "explosion"`;
      const result = migrateWLSContent(content);

      const audioSuggestion = result.suggestions.find(s => s.type === 'audio');
      expect(audioSuggestion).toBeDefined();
      expect(audioSuggestion?.description).toContain('explosion');
    });

    it('should detect playMusic calls', () => {
      const content = `playMusic 'theme.mp3'`;
      const result = migrateWLSContent(content);

      const audioSuggestion = result.suggestions.find(s => s.type === 'audio');
      expect(audioSuggestion).toBeDefined();
      expect(audioSuggestion?.recommendation).toContain('AudioManager.registerTrack');
    });

    it('should detect various audio function names', () => {
      const content = `
play "sound1"
playAudio "sound2"
`;
      const result = migrateWLSContent(content);

      const audioSuggestions = result.suggestions.filter(s => s.type === 'audio');
      expect(audioSuggestions.length).toBe(2);
    });
  });

  describe('Effect detection', () => {
    it('should detect effect tags', () => {
      const content = `<shake>This is scary!</shake>`;
      const result = migrateWLSContent(content);

      const effectSuggestion = result.suggestions.find(s => s.type === 'effect');
      expect(effectSuggestion).toBeDefined();
      expect(effectSuggestion?.description).toContain('shake');
    });

    it('should detect delay patterns', () => {
      const content = `@delay(2s) Wait for it...`;
      const result = migrateWLSContent(content);

      const effectSuggestion = result.suggestions.find(s =>
        s.type === 'effect' && s.description.includes('Delay')
      );
      expect(effectSuggestion).toBeDefined();
      expect(effectSuggestion?.recommendation).toContain('2000');
    });

    it('should detect millisecond delays', () => {
      const content = `@delay 500ms`;
      const result = migrateWLSContent(content);

      const effectSuggestion = result.suggestions.find(s =>
        s.type === 'effect' && s.description.includes('500ms')
      );
      expect(effectSuggestion).toBeDefined();
    });

    it('should detect multiple effect patterns', () => {
      const content = `
<pulse>Important!</pulse>
<typewriter>Loading...</typewriter>
`;
      const result = migrateWLSContent(content);

      const effectSuggestions = result.suggestions.filter(s => s.type === 'effect');
      expect(effectSuggestions.length).toBe(2);
    });
  });

  describe('Migration comments', () => {
    it('should add migration comments when enabled', () => {
      const content = `EXTERNAL DoSomething()`;
      const result = migrateWLSContent(content, { addMigrationComments: true });

      expect(result.migrated).toContain('// TODO [WLS 2.0]:');
      expect(result.changes.some(c => c.type === 'comment')).toBe(true);
    });

    it('should not add comments when disabled', () => {
      const content = `EXTERNAL DoSomething()`;
      const result = migrateWLSContent(content, { addMigrationComments: false });

      expect(result.migrated).not.toContain('// TODO [WLS 2.0]:');
    });

    it('should preserve original content structure', () => {
      const content = `Line 1
EXTERNAL Foo()
Line 3`;
      const result = migrateWLSContent(content, { addMigrationComments: false });

      expect(result.migrated).toBe(content);
    });
  });

  describe('Options', () => {
    it('should respect suggestStateMachines option', () => {
      const content = `LIST states = a, b, c`;

      const withSuggestion = migrateWLSContent(content, { suggestStateMachines: true });
      expect(withSuggestion.suggestions.some(s => s.type === 'state_machine')).toBe(true);

      const withoutSuggestion = migrateWLSContent(content, { suggestStateMachines: false });
      expect(withoutSuggestion.suggestions.some(s => s.type === 'state_machine')).toBe(false);
    });

    it('should respect detectThreadPatterns option', () => {
      const content = `spawn something`;

      const with_ = migrateWLSContent(content, { detectThreadPatterns: true });
      expect(with_.suggestions.some(s => s.type === 'thread')).toBe(true);

      const without = migrateWLSContent(content, { detectThreadPatterns: false });
      expect(without.suggestions.some(s => s.type === 'thread')).toBe(false);
    });

    it('should respect detectAudioReferences option', () => {
      const content = `playSound "test"`;

      const with_ = migrateWLSContent(content, { detectAudioReferences: true });
      expect(with_.suggestions.some(s => s.type === 'audio')).toBe(true);

      const without = migrateWLSContent(content, { detectAudioReferences: false });
      expect(without.suggestions.some(s => s.type === 'audio')).toBe(false);
    });
  });
});

describe('migratePassage', () => {
  it('should migrate passage content', () => {
    const passage = {
      title: 'Test Passage',
      content: `EXTERNAL SaveGame()`,
      tags: ['test'],
    };

    const { passage: migrated, result } = migratePassage(passage);

    expect(migrated.title).toBe('Test Passage');
    expect(migrated.tags).toEqual(['test']);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('should preserve passage metadata', () => {
    const passage = {
      title: 'My Passage',
      content: 'Simple content',
      tags: ['tag1', 'tag2'],
    };

    const { passage: migrated } = migratePassage(passage);

    expect(migrated.title).toBe('My Passage');
    expect(migrated.tags).toEqual(['tag1', 'tag2']);
  });
});

describe('migrateStoryContent', () => {
  it('should migrate multiple passages', () => {
    const passages = [
      { title: 'Start', content: 'LIST state = a, b' },
      { title: 'Middle', content: 'spawn background' },
      { title: 'End', content: 'playSound "win"' },
    ];

    const { passages: migrated, results, summary } = migrateStoryContent(passages);

    expect(migrated.length).toBe(3);
    expect(results.size).toBe(3);
    expect(summary.totalPassages).toBe(3);
  });

  it('should generate accurate summary', () => {
    const passages = [
      { title: 'P1', content: 'LIST x = a, b' },
      { title: 'P2', content: 'Normal content' },
      { title: 'P3', content: 'EXTERNAL Foo()' },
    ];

    const { summary } = migrateStoryContent(passages);

    expect(summary.totalPassages).toBe(3);
    expect(summary.passagesNeedingReview.length).toBe(2); // P1 and P3
    expect(summary.suggestionsByType['state_machine']).toBe(1);
    // EXTERNAL Foo() is detected twice: once for EXTERNAL keyword, once for PascalCase Foo()
    expect(summary.suggestionsByType['external']).toBe(2);
  });

  it('should handle empty passages array', () => {
    const { passages, results, summary } = migrateStoryContent([]);

    expect(passages.length).toBe(0);
    expect(results.size).toBe(0);
    expect(summary.totalPassages).toBe(0);
  });
});

describe('generateDeclarations', () => {
  it('should generate EXTERNAL declarations', () => {
    const results = new Map<string, WLSMigrationResult>();
    results.set('test', {
      original: '',
      migrated: '',
      changes: [],
      suggestions: [{
        type: 'external',
        description: "External function 'SaveGame' detected",
        recommendation: 'Register with registry',
      }],
    });

    const declarations = generateDeclarations(results);

    expect(declarations).toContain('EXTERNAL SaveGame()');
  });

  it('should generate AUDIO declarations', () => {
    const results = new Map<string, WLSMigrationResult>();
    results.set('test', {
      original: '',
      migrated: '',
      changes: [],
      suggestions: [{
        type: 'audio',
        description: "Audio reference 'explosion' detected",
        recommendation: 'Register with AudioManager',
      }],
    });

    const declarations = generateDeclarations(results);

    expect(declarations).toContain('AUDIO explosion');
  });

  it('should deduplicate declarations', () => {
    const results = new Map<string, WLSMigrationResult>();
    results.set('p1', {
      original: '',
      migrated: '',
      changes: [],
      suggestions: [{
        type: 'external',
        description: "External function 'DoThing' detected",
        recommendation: '',
      }],
    });
    results.set('p2', {
      original: '',
      migrated: '',
      changes: [],
      suggestions: [{
        type: 'external',
        description: "External function 'DoThing' detected",
        recommendation: '',
      }],
    });

    const declarations = generateDeclarations(results);
    const matches = declarations.match(/EXTERNAL DoThing/g);

    expect(matches?.length).toBe(1);
  });

  it('should return empty string when no declarations needed', () => {
    const results = new Map<string, WLSMigrationResult>();
    results.set('test', {
      original: '',
      migrated: '',
      changes: [],
      suggestions: [],
    });

    const declarations = generateDeclarations(results);

    expect(declarations).toBe('');
  });
});

describe('formatMigrationReport', () => {
  it('should format summary correctly', () => {
    const summary: WLSMigrationSummary = {
      totalPassages: 10,
      passagesWithChanges: 5,
      totalChanges: 3,
      totalSuggestions: 8,
      suggestionsByType: {
        state_machine: 2,
        external: 3,
        audio: 3,
      },
      passagesNeedingReview: ['Passage A', 'Passage B'],
    };

    const report = formatMigrationReport(summary);

    expect(report).toContain('Total passages analyzed: 10');
    expect(report).toContain('Passages with changes:   5');
    expect(report).toContain('Total suggestions:       8');
    expect(report).toContain('state_machine: 2');
    expect(report).toContain('Passage A');
    expect(report).toContain('Passage B');
  });

  it('should truncate long review lists', () => {
    const passagesNeedingReview = Array.from({ length: 15 }, (_, i) => `Passage ${i + 1}`);
    const summary: WLSMigrationSummary = {
      totalPassages: 15,
      passagesWithChanges: 15,
      totalChanges: 0,
      totalSuggestions: 15,
      suggestionsByType: {},
      passagesNeedingReview,
    };

    const report = formatMigrationReport(summary);

    expect(report).toContain('Passage 1');
    expect(report).toContain('Passage 10');
    expect(report).not.toContain('Passage 11');
    expect(report).toContain('... and 5 more');
  });

  it('should handle empty summary', () => {
    const summary: WLSMigrationSummary = {
      totalPassages: 0,
      passagesWithChanges: 0,
      totalChanges: 0,
      totalSuggestions: 0,
      suggestionsByType: {},
      passagesNeedingReview: [],
    };

    const report = formatMigrationReport(summary);

    expect(report).toContain('Total passages analyzed: 0');
    expect(report).not.toContain('Passages needing manual review:');
  });
});
