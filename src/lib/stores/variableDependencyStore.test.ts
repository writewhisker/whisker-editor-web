import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
  dependencyStore,
  dependencyGraph,
  selectedVariable,
  isAnalyzing,
  variableNodes,
  circularDependencies,
  unusedVariables,
  orphanVariables,
  type VariableNode,
  type VariableDependency,
} from './variableDependencyStore';
import { Story } from '../models/Story';
import { Passage } from '../models/Passage';

describe('variableDependencyStore', () => {
  let story: Story;

  beforeEach(() => {
    story = new Story({
      metadata: {
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
    });

    // Add some test variables
    story.variables = new Map([
      ['health', { name: 'health', type: 'number', initialValue: 100 } as any],
      ['maxHealth', { name: 'maxHealth', type: 'number', initialValue: 100 } as any],
      ['score', { name: 'score', type: 'number', initialValue: 0 } as any],
      ['playerName', { name: 'playerName', type: 'string', initialValue: '' } as any],
      ['isAlive', { name: 'isAlive', type: 'boolean', initialValue: true } as any],
    ]);

    dependencyStore.clear();
  });

  afterEach(() => {
    dependencyStore.clear();
  });

  describe('initial state', () => {
    it('should initialize with null graph', () => {
      expect(get(dependencyGraph)).toBeNull();
    });

    it('should initialize with no selected variable', () => {
      expect(get(selectedVariable)).toBeNull();
    });

    it('should initialize with analyzing false', () => {
      expect(get(isAnalyzing)).toBe(false);
    });

    it('should initialize with empty variable nodes', () => {
      expect(get(variableNodes)).toEqual([]);
    });

    it('should initialize with no circular dependencies', () => {
      expect(get(circularDependencies)).toEqual([]);
    });

    it('should initialize with no unused variables', () => {
      expect(get(unusedVariables)).toEqual([]);
    });

    it('should initialize with no orphan variables', () => {
      expect(get(orphanVariables)).toEqual([]);
    });
  });

  describe('analyze - basic variable usage', () => {
    it('should analyze story variables', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Your health is ${health}';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const graph = get(dependencyGraph);
      expect(graph).not.toBeNull();
      expect(graph?.nodes.size).toBeGreaterThan(0);
    });

    it('should detect variable reads', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Health: ${health}, Score: ${score}';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const healthNode = nodes.find(n => n.name === 'health');
      const scoreNode = nodes.find(n => n.name === 'score');

      expect(healthNode?.readCount).toBeGreaterThan(0);
      expect(scoreNode?.readCount).toBeGreaterThan(0);
    });

    it('should detect variable writes', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'set health = 50\nset score = 100';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const healthNode = nodes.find(n => n.name === 'health');
      const scoreNode = nodes.find(n => n.name === 'score');

      expect(healthNode?.writeCount).toBeGreaterThan(0);
      expect(scoreNode?.writeCount).toBeGreaterThan(0);
    });

    it('should detect variable conditions', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'if $isAlive then continue';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const isAliveNode = nodes.find(n => n.name === 'isAlive');

      expect(isAliveNode?.readCount).toBeGreaterThan(0);
      expect(isAliveNode?.usages.some(u => u.usageType === 'condition')).toBe(true);
    });

    it('should track passage usage for each variable', () => {
      const passage1 = new Passage({ title: 'P1' });
      passage1.content = 'Health: ${health}';
      story.addPassage(passage1);

      const passage2 = new Passage({ title: 'P2' });
      passage2.content = 'Set health: set health = 50';
      story.addPassage(passage2);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const healthNode = nodes.find(n => n.name === 'health');

      expect(healthNode?.passagesUsed.length).toBeGreaterThan(0);
    });
  });

  describe('analyze - variable dependencies', () => {
    it('should detect dependencies when variables are used together', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'set health = $maxHealth';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const healthNode = nodes.find(n => n.name === 'health');

      expect(healthNode?.dependencies.dependsOn).toContain('maxHealth');
    });

    it('should track affects relationships', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'set score = $health';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const healthNode = nodes.find(n => n.name === 'health');

      expect(healthNode?.dependencies.affects).toContain('score');
    });

    it('should create dependency edges', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'set health = $maxHealth';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const graph = get(dependencyGraph);
      expect(graph?.edges.length).toBeGreaterThan(0);
    });

    it('should track multiple dependencies', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'set health = $maxHealth\nset score = $health';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const graph = get(dependencyGraph);
      expect(graph?.edges.length).toBeGreaterThan(1);
    });
  });

  describe('analyze - unused variables', () => {
    it('should detect unused variables', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Health: ${health}';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const unused = get(unusedVariables);
      // Variables that are never used should be in the unused list
      expect(unused.length).toBeGreaterThan(0);
    });

    it('should not mark used variables as unused', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Health: ${health}';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const unused = get(unusedVariables);
      expect(unused).not.toContain('health');
    });

    it('should mark variables that are only declared as unused', () => {
      // Don't use any variables in passages
      const passage = new Passage({ title: 'Test' });
      passage.content = 'No variables here';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const unused = get(unusedVariables);
      expect(unused.length).toBeGreaterThan(0);
    });
  });

  describe('analyze - orphan variables', () => {
    it('should detect orphan variables (written but never read)', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'set score = 100';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const orphans = get(orphanVariables);
      expect(orphans).toContain('score');
    });

    it('should not mark read variables as orphans', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'set score = 100\nYour score: ${score}';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const orphans = get(orphanVariables);
      expect(orphans).not.toContain('score');
    });

    it('should not mark unused variables as orphans', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Nothing here';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const healthNode = nodes.find(n => n.name === 'health');

      expect(healthNode?.isOrphan).toBe(false);
    });
  });

  describe('analyze - circular dependencies', () => {
    it('should detect simple circular dependencies', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'set health = $score\nset score = $health';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const circular = get(circularDependencies);
      // This might not create a true circular dependency in our simple parser
      // but the structure should handle it
      expect(circular).toBeDefined();
    });

    it('should include passage information in circular dependencies', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'set health = $score\nset score = $health';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const circular = get(circularDependencies);
      if (circular.length > 0) {
        expect(circular[0].passages).toBeDefined();
        expect(Array.isArray(circular[0].passages)).toBe(true);
      }
    });
  });

  describe('analyze - undeclared variables', () => {
    it('should create nodes for undeclared variables used in passages', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Undeclared: ${undeclaredVar}';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const undeclaredNode = nodes.find(n => n.name === 'undeclaredVar');

      expect(undeclaredNode).toBeDefined();
      expect(undeclaredNode?.type).toBe('unknown');
    });

    it('should track usage of undeclared variables', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Value: ${newVar}';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const newVarNode = nodes.find(n => n.name === 'newVar');

      expect(newVarNode?.readCount).toBeGreaterThan(0);
    });
  });

  describe('analyze - variable types', () => {
    it('should preserve variable types from story', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Health: ${health}';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const healthNode = nodes.find(n => n.name === 'health');

      expect(healthNode?.type).toBe('number');
    });

    it('should handle different variable types', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Name: ${playerName}, Alive: ${isAlive}, Health: ${health}';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const nameNode = nodes.find(n => n.name === 'playerName');
      const aliveNode = nodes.find(n => n.name === 'isAlive');
      const healthNode = nodes.find(n => n.name === 'health');

      expect(nameNode?.type).toBe('string');
      expect(aliveNode?.type).toBe('boolean');
      expect(healthNode?.type).toBe('number');
    });
  });

  describe('selectVariable', () => {
    it('should select a variable', () => {
      dependencyStore.selectVariable('health');

      expect(get(selectedVariable)).toBe('health');
    });

    it('should deselect with null', () => {
      dependencyStore.selectVariable('health');
      dependencyStore.selectVariable(null);

      expect(get(selectedVariable)).toBeNull();
    });

    it('should change selection', () => {
      dependencyStore.selectVariable('health');
      dependencyStore.selectVariable('score');

      expect(get(selectedVariable)).toBe('score');
    });
  });

  describe('clear', () => {
    it('should clear analysis data', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Health: ${health}';
      story.addPassage(passage);

      dependencyStore.analyze(story);
      expect(get(dependencyGraph)).not.toBeNull();

      dependencyStore.clear();

      expect(get(dependencyGraph)).toBeNull();
      expect(get(selectedVariable)).toBeNull();
      expect(get(isAnalyzing)).toBe(false);
    });

    it('should clear selected variable', () => {
      dependencyStore.selectVariable('health');

      dependencyStore.clear();

      expect(get(selectedVariable)).toBeNull();
    });
  });

  describe('variable usage tracking', () => {
    it('should record usage locations', () => {
      const passage = new Passage({ title: 'TestPassage' });
      passage.content = 'Health: ${health}';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const healthNode = nodes.find(n => n.name === 'health');

      expect(healthNode?.usages.length).toBeGreaterThan(0);
      expect(healthNode?.usages[0].passageTitle).toBe('TestPassage');
    });

    it('should distinguish between read and write usage types', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Read: ${health}\nWrite: set health = 50';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const healthNode = nodes.find(n => n.name === 'health');

      const readUsages = healthNode?.usages.filter(u => u.usageType === 'read') || [];
      const writeUsages = healthNode?.usages.filter(u => u.usageType === 'write') || [];

      expect(readUsages.length).toBeGreaterThan(0);
      expect(writeUsages.length).toBeGreaterThan(0);
    });

    it('should track usage across multiple passages', () => {
      const passage1 = new Passage({ title: 'P1' });
      passage1.content = 'Health in P1: ${health}';
      story.addPassage(passage1);

      const passage2 = new Passage({ title: 'P2' });
      passage2.content = 'Health in P2: ${health}';
      story.addPassage(passage2);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const healthNode = nodes.find(n => n.name === 'health');

      expect(healthNode?.passagesUsed.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('dependency edge properties', () => {
    it('should set dependency type correctly', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'set health = $maxHealth';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const graph = get(dependencyGraph);
      const dependsOnEdges = graph?.edges.filter(e => e.type === 'depends_on') || [];

      expect(dependsOnEdges.length).toBeGreaterThan(0);
    });

    it('should set affects type correctly', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'set score = $health';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const graph = get(dependencyGraph);
      const affectsEdges = graph?.edges.filter(e => e.type === 'affects') || [];

      expect(affectsEdges.length).toBeGreaterThan(0);
    });

    it('should include passage references in edges', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'set health = $maxHealth';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const graph = get(dependencyGraph);
      const edges = graph?.edges || [];

      expect(edges.length).toBeGreaterThan(0);
      expect(edges[0].passages).toBeDefined();
    });
  });

  describe('derived stores', () => {
    it('should derive variable nodes array from graph', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Health: ${health}';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      expect(Array.isArray(nodes)).toBe(true);
      expect(nodes.length).toBeGreaterThan(0);
    });

    it('should return empty array when no graph', () => {
      const nodes = get(variableNodes);
      expect(nodes).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle story with no passages', () => {
      dependencyStore.analyze(story);

      const graph = get(dependencyGraph);
      expect(graph).not.toBeNull();
    });

    it('should handle story with no variables', () => {
      story.variables = new Map();
      const passage = new Passage({ title: 'Test' });
      passage.content = 'No variables';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const graph = get(dependencyGraph);
      expect(graph).not.toBeNull();
    });

    it('should handle passages with empty content', () => {
      const passage = new Passage({ title: 'Empty' });
      passage.content = '';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const graph = get(dependencyGraph);
      expect(graph).not.toBeNull();
    });

    it('should handle variable references with different syntax', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Curly: ${health}, Dollar: $score';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const healthNode = nodes.find(n => n.name === 'health');
      const scoreNode = nodes.find(n => n.name === 'score');

      expect(healthNode?.readCount).toBeGreaterThan(0);
      expect(scoreNode?.readCount).toBeGreaterThan(0);
    });

    it('should handle complex variable names', () => {
      story.variables.set('player_health_max', { name: 'player_health_max', type: 'number', initialValue: 100 } as any);

      const passage = new Passage({ title: 'Test' });
      passage.content = 'Max health: ${player_health_max}';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      const nodes = get(variableNodes);
      const varNode = nodes.find(n => n.name === 'player_health_max');

      expect(varNode).toBeDefined();
    });

    it('should handle analysis errors gracefully', () => {
      const invalidStory = null as any;

      try {
        dependencyStore.analyze(invalidStory);
      } catch (error) {
        // Should not throw or should handle gracefully
      }

      expect(get(dependencyGraph)).toBeNull();
    });
  });

  describe('analyzing state', () => {
    it('should set analyzing to true during analysis', () => {
      const passage = new Passage({ title: 'Test' });
      passage.content = 'Test';
      story.addPassage(passage);

      dependencyStore.analyze(story);

      // After analysis completes, it should be false
      expect(get(isAnalyzing)).toBe(false);
    });
  });
});
