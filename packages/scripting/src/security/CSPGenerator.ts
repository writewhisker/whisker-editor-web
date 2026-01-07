/**
 * Content Security Policy (CSP) Generator
 *
 * Generates CSP headers for safe story execution in web environments.
 * Provides story-aware defaults and support for custom policies.
 */

/**
 * CSP directive configuration
 */
export interface CSPConfig {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  fontSrc: string[];
  connectSrc: string[];
  mediaSrc: string[];
  objectSrc: string[];
  frameSrc: string[];
  frameAncestors: string[];
  baseUri: string[];
  formAction: string[];
  sandbox?: string[];
  reportUri?: string;
  reportTo?: string;
  upgradeInsecureRequests?: boolean;
  blockAllMixedContent?: boolean;
}

/**
 * Story interface for CSP generation
 */
interface StoryForCSP {
  scripts?: string[];
  stylesheets?: string[];
  assets?: Map<string, { type: string; url?: string }>;
  metadata?: {
    externalResources?: string[];
  };
}

/**
 * Default restrictive CSP config
 */
export const DEFAULT_CSP_CONFIG: CSPConfig = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'blob:'],
  fontSrc: ["'self'", 'data:'],
  connectSrc: ["'self'"],
  mediaSrc: ["'self'", 'blob:'],
  objectSrc: ["'none'"],
  frameSrc: ["'none'"],
  frameAncestors: ["'self'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
};

/**
 * Permissive CSP config for development
 */
export const PERMISSIVE_CSP_CONFIG: CSPConfig = {
  defaultSrc: ["'self'", 'https:'],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:'],
  styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
  imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
  fontSrc: ["'self'", 'data:', 'https:'],
  connectSrc: ["'self'", 'https:', 'wss:'],
  mediaSrc: ["'self'", 'blob:', 'https:'],
  objectSrc: ["'none'"],
  frameSrc: ["'self'", 'https:'],
  frameAncestors: ["'self'"],
  baseUri: ["'self'"],
  formAction: ["'self'", 'https:'],
};

/**
 * Sandbox options for CSP
 */
export const SANDBOX_OPTIONS = {
  allowForms: 'allow-forms',
  allowModals: 'allow-modals',
  allowOrientationLock: 'allow-orientation-lock',
  allowPointerLock: 'allow-pointer-lock',
  allowPopups: 'allow-popups',
  allowPopupsToEscapeSandbox: 'allow-popups-to-escape-sandbox',
  allowPresentation: 'allow-presentation',
  allowSameOrigin: 'allow-same-origin',
  allowScripts: 'allow-scripts',
  allowTopNavigation: 'allow-top-navigation',
  allowTopNavigationByUserActivation: 'allow-top-navigation-by-user-activation',
} as const;

/**
 * Content Security Policy Generator
 */
export class CSPGenerator {
  private config: CSPConfig;

  constructor(config: Partial<CSPConfig> = {}) {
    this.config = { ...DEFAULT_CSP_CONFIG, ...config };
  }

  /**
   * Generate CSP header string from config
   */
  static generate(config: CSPConfig): string {
    const directives: string[] = [];

    // Map config properties to CSP directive names
    const directiveMap: Record<keyof CSPConfig, string> = {
      defaultSrc: 'default-src',
      scriptSrc: 'script-src',
      styleSrc: 'style-src',
      imgSrc: 'img-src',
      fontSrc: 'font-src',
      connectSrc: 'connect-src',
      mediaSrc: 'media-src',
      objectSrc: 'object-src',
      frameSrc: 'frame-src',
      frameAncestors: 'frame-ancestors',
      baseUri: 'base-uri',
      formAction: 'form-action',
      sandbox: 'sandbox',
      reportUri: 'report-uri',
      reportTo: 'report-to',
      upgradeInsecureRequests: 'upgrade-insecure-requests',
      blockAllMixedContent: 'block-all-mixed-content',
    };

    for (const [key, directive] of Object.entries(directiveMap)) {
      const value = config[key as keyof CSPConfig];

      if (value === undefined || value === null) {
        continue;
      }

      if (typeof value === 'boolean') {
        if (value) {
          directives.push(directive);
        }
      } else if (typeof value === 'string') {
        directives.push(`${directive} ${value}`);
      } else if (Array.isArray(value) && value.length > 0) {
        directives.push(`${directive} ${value.join(' ')}`);
      }
    }

    return directives.join('; ');
  }

  /**
   * Generate CSP header string for a story
   * Analyzes the story to determine required resources
   */
  static generateForStory(story: StoryForCSP): string {
    const config = CSPGenerator.analyzeStory(story);
    return CSPGenerator.generate(config);
  }

  /**
   * Analyze a story to generate appropriate CSP config
   */
  static analyzeStory(story: StoryForCSP): CSPConfig {
    const config: CSPConfig = { ...DEFAULT_CSP_CONFIG };

    // Check for inline scripts
    if (story.scripts && story.scripts.length > 0) {
      const hasInlineScripts = story.scripts.some(
        (s) => !s.startsWith('http://') && !s.startsWith('https://')
      );

      if (hasInlineScripts) {
        config.scriptSrc = [...config.scriptSrc, "'unsafe-inline'"];
      }

      // Add external script sources
      const externalScripts = story.scripts.filter(
        (s) => s.startsWith('http://') || s.startsWith('https://')
      );
      for (const script of externalScripts) {
        try {
          const url = new URL(script);
          config.scriptSrc.push(url.origin);
        } catch {
          // Invalid URL, skip
        }
      }
    }

    // Check for stylesheets
    if (story.stylesheets && story.stylesheets.length > 0) {
      const hasInlineStyles = story.stylesheets.some(
        (s) => !s.startsWith('http://') && !s.startsWith('https://')
      );

      if (hasInlineStyles && !config.styleSrc.includes("'unsafe-inline'")) {
        config.styleSrc = [...config.styleSrc, "'unsafe-inline'"];
      }

      // Add external stylesheet sources
      const externalStyles = story.stylesheets.filter(
        (s) => s.startsWith('http://') || s.startsWith('https://')
      );
      for (const style of externalStyles) {
        try {
          const url = new URL(style);
          config.styleSrc.push(url.origin);
        } catch {
          // Invalid URL, skip
        }
      }
    }

    // Check for assets
    if (story.assets && story.assets.size > 0) {
      for (const [, asset] of story.assets) {
        if (asset.url) {
          try {
            const url = new URL(asset.url);
            const origin = url.origin;

            // Add to appropriate directive based on asset type
            if (asset.type.startsWith('image/')) {
              if (!config.imgSrc.includes(origin)) {
                config.imgSrc.push(origin);
              }
            } else if (asset.type.startsWith('audio/') || asset.type.startsWith('video/')) {
              if (!config.mediaSrc.includes(origin)) {
                config.mediaSrc.push(origin);
              }
            } else if (asset.type.startsWith('font/')) {
              if (!config.fontSrc.includes(origin)) {
                config.fontSrc.push(origin);
              }
            }
          } catch {
            // Invalid URL, skip
          }
        }
      }
    }

    // Check for external resources in metadata
    if (story.metadata?.externalResources) {
      for (const resource of story.metadata.externalResources) {
        try {
          const url = new URL(resource);
          config.connectSrc.push(url.origin);
        } catch {
          // Invalid URL, skip
        }
      }
    }

    // Deduplicate sources
    config.defaultSrc = [...new Set(config.defaultSrc)];
    config.scriptSrc = [...new Set(config.scriptSrc)];
    config.styleSrc = [...new Set(config.styleSrc)];
    config.imgSrc = [...new Set(config.imgSrc)];
    config.fontSrc = [...new Set(config.fontSrc)];
    config.connectSrc = [...new Set(config.connectSrc)];
    config.mediaSrc = [...new Set(config.mediaSrc)];

    return config;
  }

  /**
   * Parse a CSP header string into a config object
   */
  static parse(cspString: string): CSPConfig {
    const config: CSPConfig = {
      defaultSrc: [],
      scriptSrc: [],
      styleSrc: [],
      imgSrc: [],
      fontSrc: [],
      connectSrc: [],
      mediaSrc: [],
      objectSrc: [],
      frameSrc: [],
      frameAncestors: [],
      baseUri: [],
      formAction: [],
    };

    // Map CSP directive names to config properties
    const directiveMap: Record<string, keyof CSPConfig> = {
      'default-src': 'defaultSrc',
      'script-src': 'scriptSrc',
      'style-src': 'styleSrc',
      'img-src': 'imgSrc',
      'font-src': 'fontSrc',
      'connect-src': 'connectSrc',
      'media-src': 'mediaSrc',
      'object-src': 'objectSrc',
      'frame-src': 'frameSrc',
      'frame-ancestors': 'frameAncestors',
      'base-uri': 'baseUri',
      'form-action': 'formAction',
      sandbox: 'sandbox',
      'report-uri': 'reportUri',
      'report-to': 'reportTo',
      'upgrade-insecure-requests': 'upgradeInsecureRequests',
      'block-all-mixed-content': 'blockAllMixedContent',
    };

    const directives = cspString.split(';').map((d) => d.trim());

    for (const directive of directives) {
      if (!directive) continue;

      const parts = directive.split(/\s+/);
      const name = parts[0];
      const values = parts.slice(1);

      const configKey = directiveMap[name];
      if (configKey) {
        const configAny = config as unknown as Record<string, unknown>;
        if (configKey === 'upgradeInsecureRequests' || configKey === 'blockAllMixedContent') {
          configAny[configKey] = true;
        } else if (configKey === 'reportUri' || configKey === 'reportTo') {
          configAny[configKey] = values[0] || '';
        } else {
          configAny[configKey] = values;
        }
      }
    }

    return config;
  }

  /**
   * Merge multiple CSP configs
   * Later configs override earlier ones for single-value directives
   * Arrays are merged and deduplicated
   */
  static merge(...configs: Partial<CSPConfig>[]): CSPConfig {
    const result: CSPConfig = { ...DEFAULT_CSP_CONFIG };
    const resultAny = result as unknown as Record<string, unknown>;

    for (const config of configs) {
      for (const [key, value] of Object.entries(config)) {
        if (value === undefined) continue;

        const configKey = key as keyof CSPConfig;
        const currentValue = result[configKey];

        if (Array.isArray(value) && Array.isArray(currentValue)) {
          // Merge arrays and deduplicate
          resultAny[configKey] = [...new Set([...currentValue, ...value])];
        } else if (value !== undefined) {
          // Override single values
          resultAny[configKey] = value;
        }
      }
    }

    return result;
  }

  /**
   * Generate a nonce for inline scripts
   * Returns a base64-encoded random string
   */
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }

  /**
   * Create a CSP config with script nonce
   */
  static withNonce(config: CSPConfig, nonce: string): CSPConfig {
    return {
      ...config,
      scriptSrc: [...config.scriptSrc, `'nonce-${nonce}'`],
    };
  }

  /**
   * Create a CSP config with script hash
   * Use with crypto.sha256() to compute the hash
   */
  static withScriptHash(config: CSPConfig, hash: string): CSPConfig {
    return {
      ...config,
      scriptSrc: [...config.scriptSrc, `'sha256-${hash}'`],
    };
  }

  /**
   * Create a CSP config with style hash
   */
  static withStyleHash(config: CSPConfig, hash: string): CSPConfig {
    return {
      ...config,
      styleSrc: [...config.styleSrc, `'sha256-${hash}'`],
    };
  }

  /**
   * Add sandbox restrictions
   */
  static withSandbox(config: CSPConfig, options: string[]): CSPConfig {
    return {
      ...config,
      sandbox: options,
    };
  }

  /**
   * Generate a meta tag for HTML embedding
   */
  static toMetaTag(config: CSPConfig): string {
    const cspString = CSPGenerator.generate(config);
    return `<meta http-equiv="Content-Security-Policy" content="${cspString}">`;
  }

  /**
   * Generate HTTP header format
   */
  static toHeader(config: CSPConfig): { name: string; value: string } {
    return {
      name: 'Content-Security-Policy',
      value: CSPGenerator.generate(config),
    };
  }

  /**
   * Generate Report-Only header format
   */
  static toReportOnlyHeader(config: CSPConfig): { name: string; value: string } {
    return {
      name: 'Content-Security-Policy-Report-Only',
      value: CSPGenerator.generate(config),
    };
  }

  /**
   * Instance method to generate CSP string
   */
  generate(): string {
    return CSPGenerator.generate(this.config);
  }

  /**
   * Instance method to get meta tag
   */
  toMetaTag(): string {
    return CSPGenerator.toMetaTag(this.config);
  }

  /**
   * Update config
   */
  setConfig(config: Partial<CSPConfig>): this {
    this.config = CSPGenerator.merge(this.config, config);
    return this;
  }

  /**
   * Get current config
   */
  getConfig(): CSPConfig {
    return { ...this.config };
  }
}

/**
 * Factory function
 */
export function createCSPGenerator(config?: Partial<CSPConfig>): CSPGenerator {
  return new CSPGenerator(config);
}
