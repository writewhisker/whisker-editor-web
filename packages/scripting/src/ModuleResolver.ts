/**
 * ModuleResolver - INCLUDE Directive Handler
 *
 * Resolves and loads included files, merging them into the main story.
 * Detects circular includes and handles path resolution.
 *
 * Reference: WLS Chapter 12 - Module System
 */

export interface IncludeDeclaration {
  path: string;
  location?: { line: number; column: number };
}

export interface ResolvedInclude {
  path: string;
  resolvedPath: string;
  content: string;
}

export interface ModuleResolverOptions {
  /**
   * Base directory for resolving relative paths
   */
  baseDir?: string;

  /**
   * Maximum include depth to prevent deeply nested includes
   */
  maxIncludeDepth?: number;

  /**
   * File loader function - allows custom loading strategies
   * @param path Resolved file path
   * @returns File content as string
   */
  fileLoader?: (path: string) => Promise<string> | string;
}

export interface ModuleResolverState {
  loadedModules: string[];
  includeStack: string[];
}

const DEFAULT_OPTIONS: Required<Omit<ModuleResolverOptions, 'fileLoader'>> = {
  baseDir: '',
  maxIncludeDepth: 50,
};

/**
 * WLS Error Codes for Module System (WLS Chapter 12)
 */
export const MODULE_ERROR_CODES = {
  MOD_001: 'Missing include file',
  MOD_002: 'Circular include detected',
  MOD_003: 'Undefined function',
  MOD_004: 'Function already defined',
  MOD_005: 'Stack overflow (recursion depth exceeded)',
  MOD_006: 'Invalid function name',
  MOD_007: 'Invalid namespace name',
  MOD_008: 'Unmatched END NAMESPACE',
} as const;

export class ModuleError extends Error {
  constructor(
    public code: keyof typeof MODULE_ERROR_CODES,
    message: string,
    public path?: string
  ) {
    super(`[${code}] ${message}`);
    this.name = 'ModuleError';
  }
}

/**
 * ModuleResolver - Handles INCLUDE directive resolution
 */
export class ModuleResolver {
  private options: Required<Omit<ModuleResolverOptions, 'fileLoader'>> & {
    fileLoader?: ModuleResolverOptions['fileLoader'];
  };
  private loadedModules: Set<string> = new Set();
  private includeStack: string[] = [];

  constructor(options: ModuleResolverOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  /**
   * Resolve a relative include path to an absolute path
   */
  resolvePath(includingFile: string, includePath: string): string {
    // Handle absolute paths
    if (includePath.startsWith('/')) {
      return includePath;
    }

    // Get base directory from including file
    const baseDir = includingFile
      ? this.dirname(includingFile)
      : this.options.baseDir;

    // Handle parent directory references
    if (includePath.startsWith('../')) {
      return this.normalizePath(this.joinPath(baseDir, includePath));
    }

    // Handle current directory references
    if (includePath.startsWith('./')) {
      return this.normalizePath(this.joinPath(baseDir, includePath.slice(2)));
    }

    // Relative path from base
    return this.normalizePath(this.joinPath(baseDir, includePath));
  }

  /**
   * Check if including a file would create a circular dependency
   */
  wouldCreateCircularInclude(resolvedPath: string): boolean {
    return this.includeStack.includes(resolvedPath);
  }

  /**
   * Get the current include chain (for error messages)
   */
  getIncludeChain(): string[] {
    return [...this.includeStack];
  }

  /**
   * Load an included file
   * @throws ModuleError if file not found or circular include detected
   */
  async loadInclude(
    includingFile: string,
    includePath: string
  ): Promise<ResolvedInclude> {
    const resolvedPath = this.resolvePath(includingFile, includePath);

    // Check for circular include
    if (this.wouldCreateCircularInclude(resolvedPath)) {
      const chain = [...this.includeStack, resolvedPath].join(' -> ');
      throw new ModuleError(
        'MOD_002',
        `Circular include detected: ${chain}`,
        resolvedPath
      );
    }

    // Check include depth
    if (this.includeStack.length >= this.options.maxIncludeDepth) {
      throw new ModuleError(
        'MOD_005',
        `Maximum include depth (${this.options.maxIncludeDepth}) exceeded`,
        resolvedPath
      );
    }

    // Push onto stack
    this.includeStack.push(resolvedPath);

    try {
      // Load file content
      let content: string;
      if (this.options.fileLoader) {
        content = await this.options.fileLoader(resolvedPath);
      } else {
        throw new ModuleError(
          'MOD_001',
          `No file loader configured for: ${resolvedPath}`,
          resolvedPath
        );
      }

      // Track loaded module
      this.loadedModules.add(resolvedPath);

      return {
        path: includePath,
        resolvedPath,
        content,
      };
    } finally {
      // Pop from stack
      this.includeStack.pop();
    }
  }

  /**
   * Check if a module has already been loaded
   */
  isLoaded(resolvedPath: string): boolean {
    return this.loadedModules.has(resolvedPath);
  }

  /**
   * Get all loaded module paths
   */
  getLoadedModules(): string[] {
    return Array.from(this.loadedModules);
  }

  /**
   * Clear loaded modules cache
   */
  clearCache(): void {
    this.loadedModules.clear();
    this.includeStack = [];
  }

  /**
   * Get state for serialization
   */
  getState(): ModuleResolverState {
    return {
      loadedModules: Array.from(this.loadedModules),
      includeStack: [...this.includeStack],
    };
  }

  /**
   * Restore state from serialization
   */
  restoreState(state: ModuleResolverState): void {
    this.loadedModules = new Set(state.loadedModules);
    this.includeStack = [...state.includeStack];
  }

  // ==========================================================================
  // Path Utilities (platform-agnostic)
  // ==========================================================================

  private dirname(path: string): string {
    const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
    return lastSlash === -1 ? '' : path.slice(0, lastSlash);
  }

  private joinPath(...parts: string[]): string {
    return parts.filter(Boolean).join('/');
  }

  private normalizePath(path: string): string {
    const parts = path.split(/[/\\]/);
    const result: string[] = [];

    for (const part of parts) {
      if (part === '..') {
        result.pop();
      } else if (part !== '.' && part !== '') {
        result.push(part);
      }
    }

    return result.join('/');
  }
}

/**
 * Factory function to create a ModuleResolver
 */
export function createModuleResolver(
  options?: ModuleResolverOptions
): ModuleResolver {
  return new ModuleResolver(options);
}
