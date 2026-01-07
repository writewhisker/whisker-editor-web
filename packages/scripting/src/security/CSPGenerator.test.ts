/**
 * CSPGenerator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  CSPGenerator,
  createCSPGenerator,
  DEFAULT_CSP_CONFIG,
  PERMISSIVE_CSP_CONFIG,
  SANDBOX_OPTIONS,
  type CSPConfig,
} from './CSPGenerator';

describe('CSPGenerator', () => {
  describe('generate', () => {
    it('generates CSP string from default config', () => {
      const csp = CSPGenerator.generate(DEFAULT_CSP_CONFIG);

      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("object-src 'none'");
    });

    it('generates CSP string with multiple sources', () => {
      const config: CSPConfig = {
        ...DEFAULT_CSP_CONFIG,
        scriptSrc: ["'self'", 'https://cdn.example.com', "'unsafe-inline'"],
      };

      const csp = CSPGenerator.generate(config);

      expect(csp).toContain("script-src 'self' https://cdn.example.com 'unsafe-inline'");
    });

    it('handles boolean directives', () => {
      const config: CSPConfig = {
        ...DEFAULT_CSP_CONFIG,
        upgradeInsecureRequests: true,
        blockAllMixedContent: true,
      };

      const csp = CSPGenerator.generate(config);

      expect(csp).toContain('upgrade-insecure-requests');
      expect(csp).toContain('block-all-mixed-content');
    });

    it('handles report-uri directive', () => {
      const config: CSPConfig = {
        ...DEFAULT_CSP_CONFIG,
        reportUri: 'https://example.com/csp-report',
      };

      const csp = CSPGenerator.generate(config);

      expect(csp).toContain('report-uri https://example.com/csp-report');
    });

    it('handles sandbox directive', () => {
      const config: CSPConfig = {
        ...DEFAULT_CSP_CONFIG,
        sandbox: [SANDBOX_OPTIONS.allowScripts, SANDBOX_OPTIONS.allowSameOrigin],
      };

      const csp = CSPGenerator.generate(config);

      expect(csp).toContain('sandbox allow-scripts allow-same-origin');
    });

    it('skips empty arrays', () => {
      const config: CSPConfig = {
        ...DEFAULT_CSP_CONFIG,
        frameSrc: [],
      };

      const csp = CSPGenerator.generate(config);

      expect(csp).not.toContain('frame-src');
    });
  });

  describe('generateForStory', () => {
    it('generates CSP for story with inline scripts', () => {
      const story = {
        scripts: ['console.log("inline");'],
        stylesheets: [],
      };

      const csp = CSPGenerator.generateForStory(story);

      expect(csp).toContain("'unsafe-inline'");
    });

    it('adds external script origins', () => {
      const story = {
        scripts: ['https://cdn.example.com/script.js'],
        stylesheets: [],
      };

      const csp = CSPGenerator.generateForStory(story);

      expect(csp).toContain('https://cdn.example.com');
    });

    it('adds external stylesheet origins', () => {
      const story = {
        scripts: [],
        stylesheets: ['https://fonts.googleapis.com/css'],
      };

      const csp = CSPGenerator.generateForStory(story);

      expect(csp).toContain('https://fonts.googleapis.com');
    });

    it('adds asset origins based on type', () => {
      const story = {
        assets: new Map([
          ['img1', { type: 'image/png', url: 'https://images.example.com/pic.png' }],
          ['audio1', { type: 'audio/mp3', url: 'https://audio.example.com/sound.mp3' }],
        ]),
      };

      const csp = CSPGenerator.generateForStory(story);

      expect(csp).toContain('https://images.example.com');
      expect(csp).toContain('https://audio.example.com');
    });

    it('handles external resources in metadata', () => {
      const story = {
        metadata: {
          externalResources: ['https://api.example.com/data'],
        },
      };

      const csp = CSPGenerator.generateForStory(story);

      expect(csp).toContain('https://api.example.com');
    });

    it('deduplicates sources', () => {
      const story = {
        scripts: [
          'https://cdn.example.com/a.js',
          'https://cdn.example.com/b.js',
        ],
      };

      const csp = CSPGenerator.generateForStory(story);

      // Should only appear once
      const matches = csp.match(/https:\/\/cdn\.example\.com/g);
      expect(matches?.length).toBe(1);
    });
  });

  describe('parse', () => {
    it('parses CSP string to config', () => {
      const cspString = "default-src 'self'; script-src 'self' 'unsafe-inline'; img-src 'self' data:";

      const config = CSPGenerator.parse(cspString);

      expect(config.defaultSrc).toEqual(["'self'"]);
      expect(config.scriptSrc).toEqual(["'self'", "'unsafe-inline'"]);
      expect(config.imgSrc).toEqual(["'self'", 'data:']);
    });

    it('parses boolean directives', () => {
      const cspString = "default-src 'self'; upgrade-insecure-requests";

      const config = CSPGenerator.parse(cspString);

      expect(config.upgradeInsecureRequests).toBe(true);
    });

    it('parses report-uri', () => {
      const cspString = "default-src 'self'; report-uri https://example.com/report";

      const config = CSPGenerator.parse(cspString);

      expect(config.reportUri).toBe('https://example.com/report');
    });

    it('handles empty CSP string', () => {
      const config = CSPGenerator.parse('');

      expect(config.defaultSrc).toEqual([]);
    });
  });

  describe('merge', () => {
    it('merges multiple configs', () => {
      const config1: Partial<CSPConfig> = {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
      };
      const config2: Partial<CSPConfig> = {
        scriptSrc: ['https://cdn.example.com'],
        imgSrc: ['https://images.example.com'],
      };

      const merged = CSPGenerator.merge(config1, config2);

      expect(merged.defaultSrc).toContain("'self'");
      expect(merged.scriptSrc).toContain("'self'");
      expect(merged.scriptSrc).toContain('https://cdn.example.com');
      expect(merged.imgSrc).toContain('https://images.example.com');
    });

    it('deduplicates merged arrays', () => {
      const config1: Partial<CSPConfig> = {
        scriptSrc: ["'self'", 'https://cdn.example.com'],
      };
      const config2: Partial<CSPConfig> = {
        scriptSrc: ["'self'", 'https://other.com'],
      };

      const merged = CSPGenerator.merge(config1, config2);

      const selfCount = merged.scriptSrc.filter(s => s === "'self'").length;
      expect(selfCount).toBe(1);
    });

    it('overrides single values', () => {
      const config1: Partial<CSPConfig> = {
        reportUri: 'https://old.com/report',
      };
      const config2: Partial<CSPConfig> = {
        reportUri: 'https://new.com/report',
      };

      const merged = CSPGenerator.merge(config1, config2);

      expect(merged.reportUri).toBe('https://new.com/report');
    });
  });

  describe('generateNonce', () => {
    it('generates base64 nonce', () => {
      const nonce = CSPGenerator.generateNonce();

      expect(nonce).toBeTruthy();
      expect(nonce.length).toBeGreaterThan(0);
      // Should be valid base64
      expect(() => atob(nonce)).not.toThrow();
    });

    it('generates unique nonces', () => {
      const nonce1 = CSPGenerator.generateNonce();
      const nonce2 = CSPGenerator.generateNonce();

      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe('withNonce', () => {
    it('adds nonce to script-src', () => {
      const nonce = 'abc123';
      const config = CSPGenerator.withNonce(DEFAULT_CSP_CONFIG, nonce);

      expect(config.scriptSrc).toContain("'nonce-abc123'");
    });

    it('preserves existing sources', () => {
      const nonce = 'abc123';
      const config = CSPGenerator.withNonce(DEFAULT_CSP_CONFIG, nonce);

      expect(config.scriptSrc).toContain("'self'");
    });
  });

  describe('withScriptHash', () => {
    it('adds hash to script-src', () => {
      const hash = 'abcdef1234567890';
      const config = CSPGenerator.withScriptHash(DEFAULT_CSP_CONFIG, hash);

      expect(config.scriptSrc).toContain(`'sha256-${hash}'`);
    });
  });

  describe('withStyleHash', () => {
    it('adds hash to style-src', () => {
      const hash = 'abcdef1234567890';
      const config = CSPGenerator.withStyleHash(DEFAULT_CSP_CONFIG, hash);

      expect(config.styleSrc).toContain(`'sha256-${hash}'`);
    });
  });

  describe('withSandbox', () => {
    it('adds sandbox options', () => {
      const config = CSPGenerator.withSandbox(DEFAULT_CSP_CONFIG, [
        SANDBOX_OPTIONS.allowScripts,
        SANDBOX_OPTIONS.allowForms,
      ]);

      expect(config.sandbox).toContain('allow-scripts');
      expect(config.sandbox).toContain('allow-forms');
    });
  });

  describe('toMetaTag', () => {
    it('generates meta tag', () => {
      const meta = CSPGenerator.toMetaTag(DEFAULT_CSP_CONFIG);

      expect(meta).toContain('<meta');
      expect(meta).toContain('http-equiv="Content-Security-Policy"');
      expect(meta).toContain('content="');
      expect(meta).toContain("default-src 'self'");
    });
  });

  describe('toHeader', () => {
    it('generates header object', () => {
      const header = CSPGenerator.toHeader(DEFAULT_CSP_CONFIG);

      expect(header.name).toBe('Content-Security-Policy');
      expect(header.value).toContain("default-src 'self'");
    });
  });

  describe('toReportOnlyHeader', () => {
    it('generates report-only header', () => {
      const header = CSPGenerator.toReportOnlyHeader(DEFAULT_CSP_CONFIG);

      expect(header.name).toBe('Content-Security-Policy-Report-Only');
    });
  });

  describe('createCSPGenerator', () => {
    it('creates instance with default config', () => {
      const generator = createCSPGenerator();
      const csp = generator.generate();

      expect(csp).toContain("default-src 'self'");
    });

    it('creates instance with custom config', () => {
      const generator = createCSPGenerator({
        scriptSrc: ["'self'", 'https://cdn.example.com'],
      });
      const csp = generator.generate();

      expect(csp).toContain('https://cdn.example.com');
    });

    it('setConfig updates config', () => {
      const generator = createCSPGenerator();
      generator.setConfig({ imgSrc: ['https://images.example.com'] });
      const csp = generator.generate();

      expect(csp).toContain('https://images.example.com');
    });

    it('getConfig returns current config', () => {
      const generator = createCSPGenerator();
      const config = generator.getConfig();

      expect(config.defaultSrc).toEqual(["'self'"]);
    });

    it('toMetaTag works on instance', () => {
      const generator = createCSPGenerator();
      const meta = generator.toMetaTag();

      expect(meta).toContain('<meta');
    });
  });

  describe('PERMISSIVE_CSP_CONFIG', () => {
    it('allows unsafe-inline and unsafe-eval', () => {
      const csp = CSPGenerator.generate(PERMISSIVE_CSP_CONFIG);

      expect(csp).toContain("'unsafe-inline'");
      expect(csp).toContain("'unsafe-eval'");
    });

    it('allows https sources', () => {
      const csp = CSPGenerator.generate(PERMISSIVE_CSP_CONFIG);

      expect(csp).toContain('https:');
    });
  });

  describe('SANDBOX_OPTIONS', () => {
    it('has expected options', () => {
      expect(SANDBOX_OPTIONS.allowScripts).toBe('allow-scripts');
      expect(SANDBOX_OPTIONS.allowForms).toBe('allow-forms');
      expect(SANDBOX_OPTIONS.allowSameOrigin).toBe('allow-same-origin');
      expect(SANDBOX_OPTIONS.allowPopups).toBe('allow-popups');
    });
  });
});
