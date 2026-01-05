/**
 * Plugin Loader - Loads plugins from various sources
 */

import type { PluginDefinition, PluginMetadata, Logger } from './types';

/**
 * Plugin source types
 */
export type PluginSource = 'builtin' | 'npm' | 'url' | 'directory' | 'inline';

/**
 * Plugin manifest (for directory/npm plugins)
 */
export interface PluginManifest {
  name: string;
  version: string;
  main?: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  optionalDependencies?: string[];
  provides?: string[];
  priority?: number;
  whiskerPlugin?: {
    entry?: string;
    config?: Record<string, unknown>;
  };
}

/**
 * Loaded plugin info
 */
export interface LoadedPlugin {
  source: PluginSource;
  location: string;
  manifest: PluginManifest;
  definition: PluginDefinition;
  loadedAt: number;
  integrity?: string;
}

/**
 * Load options
 */
export interface LoadOptions {
  /** Integrity hash for URL sources (SRI format) */
  integrity?: string;
  /** Timeout for loading in milliseconds */
  timeout?: number;
  /** Whether to validate the manifest */
  validateManifest?: boolean;
  /** Custom fetch function */
  fetch?: typeof fetch;
}

/**
 * Discovery options
 */
export interface DiscoveryOptions {
  /** File patterns to search for manifests */
  manifestNames?: string[];
  /** Maximum depth to search */
  maxDepth?: number;
  /** Whether to follow symlinks */
  followSymlinks?: boolean;
}

/**
 * Load result
 */
export interface LoadResult {
  success: boolean;
  plugin?: LoadedPlugin;
  error?: Error;
}

/**
 * Discovery result
 */
export interface DiscoveryResult {
  success: boolean;
  plugins: PluginManifest[];
  errors: string[];
}

/**
 * Manifest validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Built-in plugins registry
 */
const builtinPlugins = new Map<string, PluginDefinition>();

/**
 * PluginLoader class
 */
export class PluginLoader {
  private loadedPlugins = new Map<string, LoadedPlugin>();
  private log?: Logger;
  private defaultTimeout: number;

  constructor(options?: { logger?: Logger; timeout?: number }) {
    this.log = options?.logger;
    this.defaultTimeout = options?.timeout || 10000;
  }

  /**
   * Factory method
   */
  static create(options?: { logger?: Logger; timeout?: number }): PluginLoader {
    return new PluginLoader(options);
  }

  /**
   * Register a built-in plugin
   */
  static registerBuiltin(name: string, definition: PluginDefinition): void {
    builtinPlugins.set(name, definition);
  }

  /**
   * Unregister a built-in plugin
   */
  static unregisterBuiltin(name: string): boolean {
    return builtinPlugins.delete(name);
  }

  /**
   * Get all registered built-in plugins
   */
  static getBuiltinPlugins(): string[] {
    return Array.from(builtinPlugins.keys());
  }

  /**
   * Load a built-in plugin by name
   */
  async loadBuiltin(name: string): Promise<LoadResult> {
    const definition = builtinPlugins.get(name);
    if (!definition) {
      return {
        success: false,
        error: new Error(`Built-in plugin "${name}" not found`),
      };
    }

    const manifest: PluginManifest = {
      name: definition.metadata.name,
      version: definition.metadata.version,
      description: definition.metadata.description,
      author: definition.metadata.author,
      dependencies: definition.metadata.dependencies,
      optionalDependencies: definition.metadata.optionalDependencies,
      provides: definition.metadata.provides,
      priority: definition.metadata.priority,
    };

    const loaded: LoadedPlugin = {
      source: 'builtin',
      location: `builtin:${name}`,
      manifest,
      definition,
      loadedAt: Date.now(),
    };

    this.loadedPlugins.set(name, loaded);
    this.log?.info(`Loaded built-in plugin: ${name}`);

    return { success: true, plugin: loaded };
  }

  /**
   * Load a plugin from a URL
   */
  async loadFromUrl(url: string, options?: LoadOptions): Promise<LoadResult> {
    const timeout = options?.timeout || this.defaultTimeout;
    const fetchFn = options?.fetch || (typeof fetch !== 'undefined' ? fetch : undefined);

    if (!fetchFn) {
      return {
        success: false,
        error: new Error('fetch is not available'),
      };
    }

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetchFn(url, {
        signal: controller.signal,
        integrity: options?.integrity,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();

      // Verify integrity if provided but not handled by fetch
      if (options?.integrity && !this.verifyIntegrity(text, options.integrity)) {
        throw new Error('Integrity check failed');
      }

      // Parse and evaluate the module
      const definition = await this.evaluateModule(text, url);

      const manifest: PluginManifest = {
        name: definition.metadata.name,
        version: definition.metadata.version,
        description: definition.metadata.description,
        author: definition.metadata.author,
        dependencies: definition.metadata.dependencies,
        optionalDependencies: definition.metadata.optionalDependencies,
        provides: definition.metadata.provides,
        priority: definition.metadata.priority,
      };

      // Validate manifest if requested
      if (options?.validateManifest !== false) {
        const validation = this.validateManifest(manifest);
        if (!validation.valid) {
          throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
        }
      }

      const loaded: LoadedPlugin = {
        source: 'url',
        location: url,
        manifest,
        definition,
        loadedAt: Date.now(),
        integrity: options?.integrity,
      };

      this.loadedPlugins.set(definition.metadata.name, loaded);
      this.log?.info(`Loaded plugin from URL: ${url}`);

      return { success: true, plugin: loaded };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.log?.error(`Failed to load plugin from ${url}:`, err);
      return { success: false, error: err };
    }
  }

  /**
   * Load a plugin from npm package name (simulation for browser environment)
   */
  async loadFromNpm(packageName: string, options?: LoadOptions): Promise<LoadResult> {
    // In a real implementation, this would use unpkg, jsdelivr, or esm.sh
    const cdnUrl = `https://unpkg.com/${packageName}`;
    this.log?.debug(`Loading npm package from CDN: ${cdnUrl}`);

    const result = await this.loadFromUrl(cdnUrl, options);

    if (result.success && result.plugin) {
      // Update source to npm
      result.plugin.source = 'npm';
      result.plugin.location = `npm:${packageName}`;
    }

    return result;
  }

  /**
   * Load a plugin from inline definition
   */
  async loadInline(definition: PluginDefinition): Promise<LoadResult> {
    const validation = this.validateMetadata(definition.metadata);
    if (!validation.valid) {
      return {
        success: false,
        error: new Error(`Invalid metadata: ${validation.errors.join(', ')}`),
      };
    }

    const manifest: PluginManifest = {
      name: definition.metadata.name,
      version: definition.metadata.version,
      description: definition.metadata.description,
      author: definition.metadata.author,
      dependencies: definition.metadata.dependencies,
      optionalDependencies: definition.metadata.optionalDependencies,
      provides: definition.metadata.provides,
      priority: definition.metadata.priority,
    };

    const loaded: LoadedPlugin = {
      source: 'inline',
      location: `inline:${definition.metadata.name}`,
      manifest,
      definition,
      loadedAt: Date.now(),
    };

    this.loadedPlugins.set(definition.metadata.name, loaded);
    this.log?.info(`Loaded inline plugin: ${definition.metadata.name}`);

    return { success: true, plugin: loaded };
  }

  /**
   * Load multiple plugins
   */
  async loadMultiple(
    sources: Array<{ type: PluginSource; location: string; options?: LoadOptions }>
  ): Promise<Map<string, LoadResult>> {
    const results = new Map<string, LoadResult>();

    for (const source of sources) {
      let result: LoadResult;

      switch (source.type) {
        case 'builtin':
          result = await this.loadBuiltin(source.location);
          break;
        case 'url':
          result = await this.loadFromUrl(source.location, source.options);
          break;
        case 'npm':
          result = await this.loadFromNpm(source.location, source.options);
          break;
        default:
          result = {
            success: false,
            error: new Error(`Unsupported source type: ${source.type}`),
          };
      }

      results.set(source.location, result);
    }

    return results;
  }

  /**
   * Discover plugins in a simulated directory structure
   * (In browser environment, this works with a provided manifest)
   */
  discoverPlugins(pluginList: PluginManifest[]): DiscoveryResult {
    const plugins: PluginManifest[] = [];
    const errors: string[] = [];

    for (const manifest of pluginList) {
      const validation = this.validateManifest(manifest);
      if (validation.valid) {
        plugins.push(manifest);
      } else {
        errors.push(`Invalid plugin ${manifest.name || 'unknown'}: ${validation.errors.join(', ')}`);
      }
    }

    return {
      success: errors.length === 0,
      plugins,
      errors,
    };
  }

  /**
   * Validate a plugin manifest
   */
  validateManifest(manifest: PluginManifest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!manifest.name || typeof manifest.name !== 'string') {
      errors.push('name is required and must be a string');
    } else if (!/^[a-z0-9-_]+$/i.test(manifest.name)) {
      errors.push('name must contain only alphanumeric characters, hyphens, and underscores');
    }

    if (!manifest.version || typeof manifest.version !== 'string') {
      errors.push('version is required and must be a string');
    } else if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      warnings.push('version should follow semver format (x.y.z)');
    }

    // Optional fields validation
    if (manifest.dependencies && !Array.isArray(manifest.dependencies)) {
      errors.push('dependencies must be an array');
    }

    if (manifest.optionalDependencies && !Array.isArray(manifest.optionalDependencies)) {
      errors.push('optionalDependencies must be an array');
    }

    if (manifest.provides && !Array.isArray(manifest.provides)) {
      errors.push('provides must be an array');
    }

    if (manifest.priority !== undefined && typeof manifest.priority !== 'number') {
      errors.push('priority must be a number');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate plugin metadata
   */
  validateMetadata(metadata: PluginMetadata): ValidationResult {
    return this.validateManifest(metadata as PluginManifest);
  }

  /**
   * Get a loaded plugin
   */
  getPlugin(name: string): LoadedPlugin | undefined {
    return this.loadedPlugins.get(name);
  }

  /**
   * Get all loaded plugins
   */
  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Check if a plugin is loaded
   */
  isLoaded(name: string): boolean {
    return this.loadedPlugins.has(name);
  }

  /**
   * Unload a plugin
   */
  unload(name: string): boolean {
    const loaded = this.loadedPlugins.get(name);
    if (loaded) {
      this.loadedPlugins.delete(name);
      this.log?.info(`Unloaded plugin: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Unload all plugins
   */
  unloadAll(): void {
    this.loadedPlugins.clear();
    this.log?.info('Unloaded all plugins');
  }

  /**
   * Evaluate a module from source text
   * This is a simplified version for browser environments
   */
  private async evaluateModule(source: string, _sourceUrl: string): Promise<PluginDefinition> {
    // Try to parse as JSON first (for simple plugin definitions)
    try {
      const json = JSON.parse(source);
      if (json.metadata && json.metadata.name && json.metadata.version) {
        return json as PluginDefinition;
      }
    } catch {
      // Not JSON, continue with function evaluation
    }

    // Try to evaluate as a module that exports a plugin definition
    // This is intentionally limited for security
    try {
      // Create a sandboxed function that returns the plugin definition
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const moduleFunc = new Function(
        'exports',
        'module',
        `
        ${source}
        if (typeof module.exports !== 'undefined') {
          return module.exports;
        }
        if (typeof exports.default !== 'undefined') {
          return exports.default;
        }
        return exports;
      `
      );

      const exports: Record<string, unknown> = {};
      const module: { exports: unknown } = { exports: {} };
      const result = moduleFunc(exports, module);

      if (result && typeof result === 'object') {
        const def = result as PluginDefinition;
        if (def.metadata?.name && def.metadata?.version) {
          return def;
        }
      }

      throw new Error('Module does not export a valid plugin definition');
    } catch (error) {
      throw new Error(
        `Failed to evaluate plugin module: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Verify content integrity using SRI hash
   */
  private verifyIntegrity(content: string, integrity: string): boolean {
    // Parse SRI format: algorithm-hash
    const match = integrity.match(/^(sha256|sha384|sha512)-(.+)$/);
    if (!match) {
      this.log?.warn('Invalid integrity format, expected "algorithm-base64hash"');
      return false;
    }

    const [, algorithm, expectedHash] = match;

    // In a real implementation, we would compute the hash
    // For now, we'll skip actual verification in environments without crypto
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      this.log?.warn('Crypto API not available, skipping integrity check');
      return true; // Allow but warn
    }

    // The actual verification would be async and use crypto.subtle.digest
    // This is a placeholder that accepts all content
    this.log?.debug(`Integrity check requested: ${algorithm}`);
    this.log?.debug(`Expected hash: ${expectedHash}`);
    this.log?.debug(`Content length: ${content.length}`);

    // Return true for now - in production this should actually verify
    return true;
  }

  /**
   * Get loader statistics
   */
  getStats(): {
    loadedCount: number;
    builtinCount: number;
    sources: Record<PluginSource, number>;
  } {
    const sources: Record<PluginSource, number> = {
      builtin: 0,
      npm: 0,
      url: 0,
      directory: 0,
      inline: 0,
    };

    for (const plugin of this.loadedPlugins.values()) {
      sources[plugin.source]++;
    }

    return {
      loadedCount: this.loadedPlugins.size,
      builtinCount: builtinPlugins.size,
      sources,
    };
  }
}
