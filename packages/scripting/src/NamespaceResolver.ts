/**
 * NamespaceResolver - Namespace-Qualified Reference Resolution
 *
 * Handles resolution of namespace-qualified passage and function references.
 * Supports nested namespaces and global references with :: prefix.
 *
 * Reference: WLS Chapter 12 - Module System
 *
 * Resolution Rules:
 * | Reference | From Global | From Combat NS |
 * |-----------|-------------|----------------|
 * | `Start` | ::Start | Combat::Start |
 * | `Combat::Start` | Combat::Start | Combat::Start |
 * | `::Start` | ::Start | ::Start |
 */

export interface NamespaceContext {
  /** Current namespace stack (for nested namespaces) */
  stack: string[];
}

export interface ResolvedReference {
  /** Original reference string */
  original: string;
  /** Fully qualified name */
  qualified: string;
  /** Whether this is a global reference (started with ::) */
  isGlobal: boolean;
}

export interface NamespaceResolverOptions {
  /** Separator between namespace parts (default: '::') */
  separator?: string;
}

export interface NamespaceResolverState {
  currentNamespace: string[];
  registeredNames: string[];
}

const DEFAULT_OPTIONS: Required<NamespaceResolverOptions> = {
  separator: '::',
};

/**
 * NamespaceResolver - Resolves namespace-qualified references
 */
export class NamespaceResolver {
  private stack: string[] = [];
  private registeredNames: Set<string> = new Set();
  private options: Required<NamespaceResolverOptions>;

  constructor(options: NamespaceResolverOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ==========================================================================
  // Namespace Stack Management
  // ==========================================================================

  /**
   * Enter a namespace (push onto stack)
   */
  enter(name: string): void {
    this.stack.push(name);
  }

  /**
   * Exit current namespace (pop from stack)
   */
  exit(): string | undefined {
    return this.stack.pop();
  }

  /**
   * Get current namespace as qualified string
   */
  getCurrentNamespace(): string {
    return this.stack.join(this.options.separator);
  }

  /**
   * Get current namespace depth
   */
  getDepth(): number {
    return this.stack.length;
  }

  /**
   * Check if currently in a namespace
   */
  isInNamespace(): boolean {
    return this.stack.length > 0;
  }

  /**
   * Get the namespace stack
   */
  getStack(): string[] {
    return [...this.stack];
  }

  /**
   * Reset namespace stack
   */
  reset(): void {
    this.stack = [];
  }

  // ==========================================================================
  // Name Registration
  // ==========================================================================

  /**
   * Register a name (passage, function, etc.) in the current namespace
   */
  registerName(name: string): string {
    const qualified = this.qualify(name);
    this.registeredNames.add(qualified);
    return qualified;
  }

  /**
   * Register a fully-qualified name directly
   */
  registerQualifiedName(qualifiedName: string): void {
    this.registeredNames.add(qualifiedName);
  }

  /**
   * Check if a name is registered
   */
  isRegistered(qualifiedName: string): boolean {
    return this.registeredNames.has(qualifiedName);
  }

  /**
   * Get all registered names
   */
  getRegisteredNames(): string[] {
    return Array.from(this.registeredNames);
  }

  /**
   * Clear all registered names
   */
  clearRegisteredNames(): void {
    this.registeredNames.clear();
  }

  // ==========================================================================
  // Name Resolution
  // ==========================================================================

  /**
   * Qualify a name with the current namespace
   * If already qualified or starts with ::, returns appropriate form
   */
  qualify(name: string): string {
    const sep = this.options.separator;

    // Global reference - strip the leading ::
    if (name.startsWith(sep)) {
      return name.slice(sep.length);
    }

    // Already qualified - return as is
    if (name.includes(sep)) {
      return name;
    }

    // Not in namespace - return unqualified
    if (this.stack.length === 0) {
      return name;
    }

    // Qualify with current namespace
    return [...this.stack, name].join(sep);
  }

  /**
   * Resolve a reference to its fully qualified name
   * WLS 1.0 Resolution Order (GAP-046):
   * 1. Global reference (starts with ::) - strip prefix and lookup directly
   * 2. Already qualified reference (contains ::) - lookup directly
   * 3. Current namespace - most specific first
   * 4. Parent namespaces - walk up the hierarchy
   * 5. Global scope - unqualified name at root
   * 6. Relative reference inside qualified names - e.g., Combat::Start from Combat::Sub
   */
  resolve(reference: string): ResolvedReference | null {
    const sep = this.options.separator;

    // Global reference (starts with ::)
    if (reference.startsWith(sep)) {
      const qualified = reference.slice(sep.length);
      if (this.registeredNames.has(qualified)) {
        return {
          original: reference,
          qualified,
          isGlobal: true,
        };
      }
      return null;
    }

    // Already fully qualified - try exact match first
    if (reference.includes(sep)) {
      if (this.registeredNames.has(reference)) {
        return {
          original: reference,
          qualified: reference,
          isGlobal: false,
        };
      }

      // Try resolving relative to current namespace
      // e.g., "Sub::Start" from "Combat" should resolve to "Combat::Sub::Start"
      if (this.stack.length > 0) {
        const relativeQualified = [...this.stack, reference].join(sep);
        if (this.registeredNames.has(relativeQualified)) {
          return {
            original: reference,
            qualified: relativeQualified,
            isGlobal: false,
          };
        }

        // Try from parent namespaces too
        for (let i = this.stack.length - 1; i >= 0; i--) {
          const partial = [...this.stack.slice(0, i), reference].join(sep);
          if (this.registeredNames.has(partial)) {
            return {
              original: reference,
              qualified: partial,
              isGlobal: false,
            };
          }
        }
      }

      return null;
    }

    // Try current namespace first (most specific)
    const qualified = this.qualify(reference);
    if (this.registeredNames.has(qualified)) {
      return {
        original: reference,
        qualified,
        isGlobal: false,
      };
    }

    // Try parent namespaces (walk up the hierarchy, but not to global scope)
    // Stop at i > 0 to leave global scope for separate handling with isGlobal: true
    for (let i = this.stack.length - 1; i > 0; i--) {
      const partial = [...this.stack.slice(0, i), reference].join(sep);
      if (this.registeredNames.has(partial)) {
        return {
          original: reference,
          qualified: partial,
          isGlobal: false,
        };
      }
    }

    // Try global scope (fallback, isGlobal: true for discoverability)
    if (this.registeredNames.has(reference)) {
      return {
        original: reference,
        qualified: reference,
        isGlobal: true,
      };
    }

    return null;
  }

  /**
   * Resolve with fallback - returns the qualified name or null
   * Convenience method for simple lookups
   */
  resolveToQualified(reference: string): string | null {
    const result = this.resolve(reference);
    return result?.qualified ?? null;
  }

  /**
   * Check if a reference can be resolved
   */
  canResolve(reference: string): boolean {
    return this.resolve(reference) !== null;
  }

  /**
   * Find all names that match a pattern in current or parent namespaces
   */
  findMatches(pattern: string): string[] {
    const matches: string[] = [];
    const sep = this.options.separator;

    for (const name of this.registeredNames) {
      // Check if name ends with the pattern
      if (name === pattern || name.endsWith(sep + pattern)) {
        matches.push(name);
      }
    }

    return matches;
  }

  // ==========================================================================
  // Namespace Utilities
  // ==========================================================================

  /**
   * Parse a qualified name into parts
   */
  parseQualifiedName(qualifiedName: string): {
    namespace: string[];
    name: string;
  } {
    const parts = qualifiedName.split(this.options.separator);
    const name = parts.pop() ?? '';
    return {
      namespace: parts,
      name,
    };
  }

  /**
   * Get the parent namespace of a qualified name
   */
  getParentNamespace(qualifiedName: string): string | null {
    const { namespace } = this.parseQualifiedName(qualifiedName);
    if (namespace.length === 0) {
      return null;
    }
    return namespace.join(this.options.separator);
  }

  /**
   * Check if a name is in a specific namespace
   */
  isInNamespaceScope(qualifiedName: string, namespace: string): boolean {
    const sep = this.options.separator;
    return qualifiedName.startsWith(namespace + sep);
  }

  // ==========================================================================
  // Serialization
  // ==========================================================================

  /**
   * Get state for serialization
   */
  getState(): NamespaceResolverState {
    return {
      currentNamespace: [...this.stack],
      registeredNames: Array.from(this.registeredNames),
    };
  }

  /**
   * Restore state from serialization
   */
  restoreState(state: NamespaceResolverState): void {
    this.stack = [...state.currentNamespace];
    this.registeredNames = new Set(state.registeredNames);
  }

  /**
   * Clone this resolver
   */
  clone(): NamespaceResolver {
    const cloned = new NamespaceResolver(this.options);
    cloned.stack = [...this.stack];
    cloned.registeredNames = new Set(this.registeredNames);
    return cloned;
  }
}

/**
 * Factory function to create a NamespaceResolver
 */
export function createNamespaceResolver(
  options?: NamespaceResolverOptions
): NamespaceResolver {
  return new NamespaceResolver(options);
}
