/**
 * Dependency Resolver - Resolves plugin dependencies with cycle detection
 */

import type { PluginMetadata, Logger } from './types';

/**
 * Dependency info
 */
export interface DependencyInfo {
  name: string;
  version?: string;
  optional: boolean;
}

/**
 * Resolution result
 */
export interface ResolutionResult {
  success: boolean;
  loadOrder: string[];
  errors: string[];
  warnings: string[];
  missingRequired: string[];
  missingOptional: string[];
  cycles: string[][];
}

/**
 * Parse a dependency string (e.g., "plugin-name" or "plugin-name@^1.0.0")
 */
function parseDependency(dep: string): { name: string; versionRange?: string } {
  const atIndex = dep.lastIndexOf('@');
  if (atIndex > 0) {
    return {
      name: dep.substring(0, atIndex),
      versionRange: dep.substring(atIndex + 1),
    };
  }
  return { name: dep };
}

/**
 * Simple semver range check
 * Supports: exact (1.0.0), caret (^1.0.0), tilde (~1.0.0), wildcard (*)
 */
function satisfiesVersion(version: string, range: string): boolean {
  if (range === '*' || range === '') {
    return true;
  }

  const parseVer = (v: string): [number, number, number] => {
    const parts = v.replace(/^[~^]/, '').split('.').map((p) => parseInt(p, 10) || 0);
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  };

  const [major, minor, patch] = parseVer(version);
  const [rMajor, rMinor, rPatch] = parseVer(range);

  // Caret: compatible with version (same major, >= minor.patch)
  if (range.startsWith('^')) {
    if (rMajor === 0) {
      // ^0.x.y behaves like ~0.x.y
      return major === rMajor && minor === rMinor && patch >= rPatch;
    }
    return major === rMajor && (minor > rMinor || (minor === rMinor && patch >= rPatch));
  }

  // Tilde: approximately equivalent (same major.minor, >= patch)
  if (range.startsWith('~')) {
    return major === rMajor && minor === rMinor && patch >= rPatch;
  }

  // Exact match
  return major === rMajor && minor === rMinor && patch === rPatch;
}

/**
 * DependencyResolver class
 */
export class DependencyResolver {
  private log?: Logger;

  constructor(logger?: Logger) {
    this.log = logger;
  }

  /**
   * Factory method
   */
  static create(logger?: Logger): DependencyResolver {
    return new DependencyResolver(logger);
  }

  /**
   * Resolve dependencies and return load order
   */
  resolve(plugins: Map<string, PluginMetadata>): ResolutionResult {
    const result: ResolutionResult = {
      success: true,
      loadOrder: [],
      errors: [],
      warnings: [],
      missingRequired: [],
      missingOptional: [],
      cycles: [],
    };

    // Build dependency graph
    const graph = this.buildDependencyGraph(plugins);

    // Check for missing dependencies
    this.checkMissingDependencies(plugins, result);

    // Detect cycles
    const cycles = this.detectCycles(graph);
    if (cycles.length > 0) {
      result.cycles = cycles;
      result.success = false;
      for (const cycle of cycles) {
        result.errors.push(`Circular dependency detected: ${cycle.join(' -> ')} -> ${cycle[0]}`);
      }
      return result;
    }

    // Topological sort
    try {
      result.loadOrder = this.topologicalSort(graph, plugins);
    } catch (error) {
      result.success = false;
      result.errors.push(String(error));
      return result;
    }

    // Check version conflicts
    this.checkVersionConflicts(plugins, result);

    // Set success based on required dependencies
    if (result.missingRequired.length > 0) {
      result.success = false;
    }

    return result;
  }

  /**
   * Build dependency graph from plugins
   */
  private buildDependencyGraph(plugins: Map<string, PluginMetadata>): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const [name, metadata] of plugins) {
      const deps = new Set<string>();

      // Add required dependencies
      if (metadata.dependencies) {
        for (const dep of metadata.dependencies) {
          const { name: depName } = parseDependency(dep);
          deps.add(depName);
        }
      }

      // Add optional dependencies (if available)
      if (metadata.optionalDependencies) {
        for (const dep of metadata.optionalDependencies) {
          const { name: depName } = parseDependency(dep);
          if (plugins.has(depName)) {
            deps.add(depName);
          }
        }
      }

      graph.set(name, deps);
    }

    return graph;
  }

  /**
   * Check for missing dependencies
   */
  private checkMissingDependencies(
    plugins: Map<string, PluginMetadata>,
    result: ResolutionResult
  ): void {
    const available = new Set(plugins.keys());

    for (const [name, metadata] of plugins) {
      // Check required dependencies
      if (metadata.dependencies) {
        for (const dep of metadata.dependencies) {
          const { name: depName, versionRange } = parseDependency(dep);
          if (!available.has(depName)) {
            const missing = `${name} requires ${dep}`;
            result.missingRequired.push(missing);
            result.errors.push(`Missing required dependency: ${missing}`);
          } else if (versionRange) {
            // Check version compatibility
            const depMeta = plugins.get(depName)!;
            if (!satisfiesVersion(depMeta.version, versionRange)) {
              result.warnings.push(
                `${name} requires ${depName}@${versionRange} but found ${depMeta.version}`
              );
            }
          }
        }
      }

      // Check optional dependencies
      if (metadata.optionalDependencies) {
        for (const dep of metadata.optionalDependencies) {
          const { name: depName } = parseDependency(dep);
          if (!available.has(depName)) {
            const missing = `${name} optionally depends on ${dep}`;
            result.missingOptional.push(missing);
            result.warnings.push(`Missing optional dependency: ${missing}`);
          }
        }
      }
    }
  }

  /**
   * Detect cycles using DFS with coloring
   * Returns array of cycle paths
   */
  private detectCycles(graph: Map<string, Set<string>>): string[][] {
    const WHITE = 0; // Not visited
    const GRAY = 1;  // In current path
    const BLACK = 2; // Finished

    const color = new Map<string, number>();
    const parent = new Map<string, string | null>();
    const cycles: string[][] = [];

    for (const node of graph.keys()) {
      color.set(node, WHITE);
      parent.set(node, null);
    }

    const dfs = (node: string, path: string[]): boolean => {
      color.set(node, GRAY);
      path.push(node);

      const neighbors = graph.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!graph.has(neighbor)) {
          continue; // Skip missing dependencies
        }

        const neighborColor = color.get(neighbor);

        if (neighborColor === GRAY) {
          // Found cycle - extract it from path
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            const cycle = path.slice(cycleStart);
            cycles.push(cycle);
          }
          return true;
        }

        if (neighborColor === WHITE) {
          parent.set(neighbor, node);
          if (dfs(neighbor, [...path])) {
            // Continue looking for more cycles
          }
        }
      }

      color.set(node, BLACK);
      return false;
    };

    for (const node of graph.keys()) {
      if (color.get(node) === WHITE) {
        dfs(node, []);
      }
    }

    return cycles;
  }

  /**
   * Topological sort using Kahn's algorithm
   */
  private topologicalSort(
    graph: Map<string, Set<string>>,
    plugins: Map<string, PluginMetadata>
  ): string[] {
    // Calculate in-degrees
    const inDegree = new Map<string, number>();
    for (const node of graph.keys()) {
      inDegree.set(node, 0);
    }

    for (const [, deps] of graph) {
      for (const dep of deps) {
        if (graph.has(dep)) {
          inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
        }
      }
    }

    // Wait, in-degree counts how many nodes point TO a node
    // We need to count how many nodes this node depends ON
    // Let me recalculate

    // Actually for topological sort, we need:
    // - in-degree = number of dependencies (nodes that must come before)
    // So we count how many deps each node has

    const reversedInDegree = new Map<string, number>();
    for (const [node, deps] of graph) {
      let count = 0;
      for (const dep of deps) {
        if (graph.has(dep)) {
          count++;
        }
      }
      reversedInDegree.set(node, count);
    }

    // Start with nodes that have no dependencies
    const queue: string[] = [];
    for (const [node, degree] of reversedInDegree) {
      if (degree === 0) {
        queue.push(node);
      }
    }

    // Sort by priority within same level
    queue.sort((a, b) => {
      const priorityA = plugins.get(a)?.priority ?? 0;
      const priorityB = plugins.get(b)?.priority ?? 0;
      return priorityA - priorityB;
    });

    const result: string[] = [];
    const visited = new Set<string>();

    while (queue.length > 0) {
      // Sort queue by priority
      queue.sort((a, b) => {
        const priorityA = plugins.get(a)?.priority ?? 0;
        const priorityB = plugins.get(b)?.priority ?? 0;
        return priorityA - priorityB;
      });

      const node = queue.shift()!;
      if (visited.has(node)) {
        continue;
      }

      visited.add(node);
      result.push(node);

      // For each node that depends on this one, decrement their in-degree
      for (const [other, deps] of graph) {
        if (deps.has(node) && !visited.has(other)) {
          const newDegree = (reversedInDegree.get(other) || 1) - 1;
          reversedInDegree.set(other, newDegree);
          if (newDegree === 0) {
            queue.push(other);
          }
        }
      }
    }

    // Check if all nodes were visited
    if (result.length !== graph.size) {
      throw new Error('Could not resolve all dependencies (possible undetected cycle)');
    }

    return result;
  }

  /**
   * Check for version conflicts
   */
  private checkVersionConflicts(
    plugins: Map<string, PluginMetadata>,
    result: ResolutionResult
  ): void {
    // Check if multiple plugins provide the same thing
    const providers = new Map<string, string[]>();

    for (const [name, metadata] of plugins) {
      if (metadata.provides) {
        for (const provided of metadata.provides) {
          if (!providers.has(provided)) {
            providers.set(provided, []);
          }
          providers.get(provided)!.push(name);
        }
      }
    }

    for (const [provided, pluginNames] of providers) {
      if (pluginNames.length > 1) {
        result.warnings.push(
          `Multiple plugins provide "${provided}": ${pluginNames.join(', ')}`
        );
      }
    }
  }

  /**
   * Check if a set of plugins can be loaded together
   */
  canLoad(plugins: Map<string, PluginMetadata>): { valid: boolean; errors: string[] } {
    const result = this.resolve(plugins);
    return {
      valid: result.success,
      errors: result.errors,
    };
  }

  /**
   * Get dependencies for a single plugin
   */
  getDependencies(
    pluginName: string,
    plugins: Map<string, PluginMetadata>
  ): { required: string[]; optional: string[] } {
    const metadata = plugins.get(pluginName);
    if (!metadata) {
      return { required: [], optional: [] };
    }

    const required = (metadata.dependencies || []).map((d) => parseDependency(d).name);
    const optional = (metadata.optionalDependencies || []).map((d) => parseDependency(d).name);

    return { required, optional };
  }

  /**
   * Get dependents (plugins that depend on this one)
   */
  getDependents(
    pluginName: string,
    plugins: Map<string, PluginMetadata>
  ): { requiredBy: string[]; optionalBy: string[] } {
    const requiredBy: string[] = [];
    const optionalBy: string[] = [];

    for (const [name, metadata] of plugins) {
      if (name === pluginName) continue;

      const requiredDeps = (metadata.dependencies || []).map((d) => parseDependency(d).name);
      const optionalDeps = (metadata.optionalDependencies || []).map((d) => parseDependency(d).name);

      if (requiredDeps.includes(pluginName)) {
        requiredBy.push(name);
      }
      if (optionalDeps.includes(pluginName)) {
        optionalBy.push(name);
      }
    }

    return { requiredBy, optionalBy };
  }

  /**
   * Check if version satisfies range
   */
  static satisfiesVersion(version: string, range: string): boolean {
    return satisfiesVersion(version, range);
  }

  /**
   * Parse dependency string
   */
  static parseDependency(dep: string): { name: string; versionRange?: string } {
    return parseDependency(dep);
  }
}
