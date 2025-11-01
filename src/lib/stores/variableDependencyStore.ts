/**
 * Variable Dependency Graph Store
 *
 * Analyzes variable dependencies and relationships including:
 * - Variable usage tracking (read/write locations)
 * - Dependency chains (variable A affects variable B)
 * - Circular dependency detection
 * - Unused variable detection
 * - Variable flow visualization data
 * - Impact analysis (what changes if variable X changes)
 */

import { writable, derived } from 'svelte/store';
import type { Story } from '../models/Story';
import type { Passage } from '../models/Passage';

export type DependencyType = 'reads' | 'writes' | 'depends_on' | 'affects';

export interface VariableUsage {
  variableName: string;
  passageId: string;
  passageTitle: string;
  usageType: 'read' | 'write' | 'condition' | 'display';
  lineNumber?: number;
  context?: string; // Code snippet
}

export interface VariableDependency {
  from: string; // Variable name
  to: string;   // Variable name
  type: DependencyType;
  passages: string[]; // Where this dependency occurs
  strength: number; // 0-1, how often this dependency occurs
}

export interface VariableNode {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'unknown';
  readCount: number;
  writeCount: number;
  usages: VariableUsage[];
  dependencies: {
    reads: string[];      // Variables this variable reads from
    writes: string[];     // Variables this variable writes to
    dependsOn: string[];  // Variables this depends on
    affects: string[];    // Variables this affects
  };
  isUnused: boolean;
  isOrphan: boolean; // Written but never read
  passagesUsed: string[]; // Unique passage IDs
}

export interface CircularDependency {
  chain: string[]; // Variable names in the cycle
  passages: string[]; // Where the cycle occurs
}

export interface DependencyGraph {
  nodes: Map<string, VariableNode>;
  edges: VariableDependency[];
  circularDependencies: CircularDependency[];
  unusedVariables: string[];
  orphanVariables: string[];
  lastAnalyzed: string;
}

export interface DependencyStoreState {
  graph: DependencyGraph | null;
  selectedVariable: string | null;
  analyzing: boolean;
}

// Parse variable references from text (simplified parser)
function parseVariableReferences(text: string): {
  reads: string[];
  writes: string[];
  conditions: string[];
} {
  const reads: string[] = [];
  const writes: string[] = [];
  const conditions: string[] = [];

  // Match variable reads: ${varName}, $varName
  const readPattern = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}|\$([a-zA-Z_][a-zA-Z0-9_]*)/g;
  let match;
  while ((match = readPattern.exec(text)) !== null) {
    const varName = match[1] || match[2];
    if (varName && !reads.includes(varName)) {
      reads.push(varName);
    }
  }

  // Match variable writes: set varName = ..., varName := ...
  const writePattern = /(?:set|let)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=|:=)|([a-zA-Z_][a-zA-Z0-9_]*)\s*:=/g;
  while ((match = writePattern.exec(text)) !== null) {
    const varName = match[1] || match[2];
    if (varName && !writes.includes(varName)) {
      writes.push(varName);
    }
  }

  // Match conditions: if $varName, <<if $varName>>
  const condPattern = /(?:if|unless|when)\s+\$([a-zA-Z_][a-zA-Z0-9_]*)|<<if\s+\$([a-zA-Z_][a-zA-Z0-9_]*)>>/g;
  while ((match = condPattern.exec(text)) !== null) {
    const varName = match[1] || match[2];
    if (varName && !conditions.includes(varName)) {
      conditions.push(varName);
    }
  }

  return { reads, writes, conditions };
}

// Analyze story for variable dependencies
function analyzeStory(story: Story): DependencyGraph {
  const nodes = new Map<string, VariableNode>();
  const usageMap = new Map<string, VariableUsage[]>();
  const dependencyMap = new Map<string, Set<string>>();

  // Initialize nodes from story variables
  for (const variable of story.variables) {
    nodes.set(variable.name, {
      name: variable.name,
      type: variable.type as any,
      readCount: 0,
      writeCount: 0,
      usages: [],
      dependencies: {
        reads: [],
        writes: [],
        dependsOn: [],
        affects: [],
      },
      isUnused: true,
      isOrphan: false,
      passagesUsed: [],
    });
  }

  // Analyze passages for variable usage
  for (const passage of story.passages.values()) {
    const { reads, writes, conditions } = parseVariableReferences(passage.content);

    // Process reads
    for (const varName of reads) {
      if (!nodes.has(varName)) {
        // Create node for undeclared variable
        nodes.set(varName, {
          name: varName,
          type: 'unknown',
          readCount: 0,
          writeCount: 0,
          usages: [],
          dependencies: { reads: [], writes: [], dependsOn: [], affects: [] },
          isUnused: false,
          isOrphan: false,
          passagesUsed: [],
        });
      }

      const node = nodes.get(varName)!;
      node.readCount++;
      node.isUnused = false;
      if (!node.passagesUsed.includes(passage.id)) {
        node.passagesUsed.push(passage.id);
      }

      const usage: VariableUsage = {
        variableName: varName,
        passageId: passage.id,
        passageTitle: passage.title,
        usageType: 'read',
      };
      node.usages.push(usage);
    }

    // Process writes
    for (const varName of writes) {
      if (!nodes.has(varName)) {
        nodes.set(varName, {
          name: varName,
          type: 'unknown',
          readCount: 0,
          writeCount: 0,
          usages: [],
          dependencies: { reads: [], writes: [], dependsOn: [], affects: [] },
          isUnused: false,
          isOrphan: false,
          passagesUsed: [],
        });
      }

      const node = nodes.get(varName)!;
      node.writeCount++;
      if (!node.passagesUsed.includes(passage.id)) {
        node.passagesUsed.push(passage.id);
      }

      const usage: VariableUsage = {
        variableName: varName,
        passageId: passage.id,
        passageTitle: passage.title,
        usageType: 'write',
      };
      node.usages.push(usage);
    }

    // Process conditions
    for (const varName of conditions) {
      if (!nodes.has(varName)) continue;

      const node = nodes.get(varName)!;
      node.readCount++;
      if (!node.passagesUsed.includes(passage.id)) {
        node.passagesUsed.push(passage.id);
      }

      const usage: VariableUsage = {
        variableName: varName,
        passageId: passage.id,
        passageTitle: passage.title,
        usageType: 'condition',
      };
      node.usages.push(usage);
    }

    // Track dependencies (when variables are used together in writes)
    for (const writeVar of writes) {
      for (const readVar of reads) {
        if (writeVar !== readVar) {
          if (!dependencyMap.has(writeVar)) {
            dependencyMap.set(writeVar, new Set());
          }
          dependencyMap.get(writeVar)!.add(readVar);
        }
      }
    }
  }

  // Build dependency relationships
  for (const [varName, deps] of dependencyMap.entries()) {
    const node = nodes.get(varName);
    if (!node) continue;

    node.dependencies.dependsOn = Array.from(deps);

    // Update reverse dependencies
    for (const depVar of deps) {
      const depNode = nodes.get(depVar);
      if (depNode) {
        if (!depNode.dependencies.affects.includes(varName)) {
          depNode.dependencies.affects.push(varName);
        }
      }
    }
  }

  // Identify orphan variables (written but never read)
  for (const node of nodes.values()) {
    if (node.writeCount > 0 && node.readCount === 0) {
      node.isOrphan = true;
    }
  }

  // Build edges
  const edges: VariableDependency[] = [];
  for (const [varName, node] of nodes.entries()) {
    // Dependencies
    for (const depVar of node.dependencies.dependsOn) {
      edges.push({
        from: varName,
        to: depVar,
        type: 'depends_on',
        passages: node.passagesUsed,
        strength: 0.8,
      });
    }

    // Affects
    for (const affVar of node.dependencies.affects) {
      edges.push({
        from: varName,
        to: affVar,
        type: 'affects',
        passages: node.passagesUsed,
        strength: 0.6,
      });
    }
  }

  // Detect circular dependencies
  const circularDependencies = detectCircularDependencies(nodes);

  // Get unused and orphan lists
  const unusedVariables = Array.from(nodes.values())
    .filter(n => n.isUnused)
    .map(n => n.name);

  const orphanVariables = Array.from(nodes.values())
    .filter(n => n.isOrphan)
    .map(n => n.name);

  return {
    nodes,
    edges,
    circularDependencies,
    unusedVariables,
    orphanVariables,
    lastAnalyzed: new Date().toISOString(),
  };
}

// Detect circular dependencies using DFS
function detectCircularDependencies(nodes: Map<string, VariableNode>): CircularDependency[] {
  const cycles: CircularDependency[] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const path: string[] = [];

  function dfs(varName: string): boolean {
    visited.add(varName);
    recStack.add(varName);
    path.push(varName);

    const node = nodes.get(varName);
    if (!node) return false;

    for (const dep of node.dependencies.dependsOn) {
      if (!visited.has(dep)) {
        if (dfs(dep)) return true;
      } else if (recStack.has(dep)) {
        // Found cycle
        const cycleStart = path.indexOf(dep);
        const chain = path.slice(cycleStart);
        const passages = new Set<string>();

        for (const v of chain) {
          const n = nodes.get(v);
          if (n) {
            n.passagesUsed.forEach(p => passages.add(p));
          }
        }

        cycles.push({
          chain,
          passages: Array.from(passages),
        });
        return true;
      }
    }

    recStack.delete(varName);
    path.pop();
    return false;
  }

  for (const varName of nodes.keys()) {
    if (!visited.has(varName)) {
      dfs(varName);
    }
  }

  return cycles;
}

// Create dependency store
const createDependencyStore = () => {
  const { subscribe, set, update } = writable<DependencyStoreState>({
    graph: null,
    selectedVariable: null,
    analyzing: false,
  });

  return {
    subscribe,

    /**
     * Analyze story for variable dependencies
     */
    analyze: (story: Story) => {
      update(state => ({ ...state, analyzing: true }));

      try {
        const graph = analyzeStory(story);
        set({
          graph,
          selectedVariable: null,
          analyzing: false,
        });
      } catch (error) {
        console.error('Dependency analysis failed:', error);
        set({
          graph: null,
          selectedVariable: null,
          analyzing: false,
        });
      }
    },

    /**
     * Select a variable to highlight
     */
    selectVariable: (variableName: string | null) => {
      update(state => ({ ...state, selectedVariable: variableName }));
    },

    /**
     * Clear analysis
     */
    clear: () => {
      set({
        graph: null,
        selectedVariable: null,
        analyzing: false,
      });
    },
  };
};

export const dependencyStore = createDependencyStore();

// Derived stores
export const dependencyGraph = derived(dependencyStore, $store => $store.graph);
export const selectedVariable = derived(dependencyStore, $store => $store.selectedVariable);
export const isAnalyzing = derived(dependencyStore, $store => $store.analyzing);
export const variableNodes = derived(dependencyGraph, $graph =>
  $graph ? Array.from($graph.nodes.values()) : []
);
export const circularDependencies = derived(dependencyGraph, $graph =>
  $graph?.circularDependencies || []
);
export const unusedVariables = derived(dependencyGraph, $graph =>
  $graph?.unusedVariables || []
);
export const orphanVariables = derived(dependencyGraph, $graph =>
  $graph?.orphanVariables || []
);
