import { describe, it, expect } from 'vitest';
import * as utils from '../utils';

describe('utils', () => {
  describe('generateId', () => {
    it('generates unique IDs', () => {
      const id1 = utils.generateId();
      const id2 = utils.generateId();

      expect(id1).not.toBe(id2);
    });

    it('uses prefix', () => {
      const id = utils.generateId('test');

      expect(id).toMatch(/^test-\d+-\d+$/);
    });

    it('uses default prefix', () => {
      const id = utils.generateId();

      expect(id).toMatch(/^a11y-\d+-\d+$/);
    });
  });

  describe('escapeHtml', () => {
    it('escapes HTML entities', () => {
      expect(utils.escapeHtml('<script>')).toBe('&lt;script&gt;');
      expect(utils.escapeHtml('foo & bar')).toBe('foo &amp; bar');
      expect(utils.escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
      expect(utils.escapeHtml("it's")).toBe('it&#39;s');
    });

    it('handles null/undefined', () => {
      expect(utils.escapeHtml(null)).toBe('');
      expect(utils.escapeHtml(undefined)).toBe('');
    });

    it('returns empty string for empty input', () => {
      expect(utils.escapeHtml('')).toBe('');
    });
  });

  describe('stripHtml', () => {
    it('removes HTML tags', () => {
      expect(utils.stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
    });

    it('decodes common entities', () => {
      expect(utils.stripHtml('foo &amp; bar')).toBe('foo & bar');
      expect(utils.stripHtml('&lt;tag&gt;')).toBe('<tag>');
      expect(utils.stripHtml('&quot;quoted&quot;')).toBe('"quoted"');
      expect(utils.stripHtml('non&nbsp;breaking')).toBe('non breaking');
    });

    it('handles null/undefined', () => {
      expect(utils.stripHtml(null)).toBe('');
      expect(utils.stripHtml(undefined)).toBe('');
    });
  });

  describe('getSrOnlyCss', () => {
    it('returns CSS for screen reader only class', () => {
      const css = utils.getSrOnlyCss();

      expect(css).toContain('.sr-only');
      expect(css).toContain('position: absolute');
      expect(css).toContain('width: 1px');
      expect(css).toContain('height: 1px');
      expect(css).toContain('clip: rect(0, 0, 0, 0)');
    });
  });

  describe('getFocusVisibleCss', () => {
    it('returns CSS for focus styles', () => {
      const css = utils.getFocusVisibleCss();

      expect(css).toContain(':focus');
      expect(css).toContain(':focus-visible');
      expect(css).toContain('outline');
    });
  });

  describe('getSkipLinkCss', () => {
    it('returns CSS for skip links', () => {
      const css = utils.getSkipLinkCss();

      expect(css).toContain('.skip-link');
      expect(css).toContain('position: absolute');
      expect(css).toContain('.skip-link:focus');
    });
  });

  describe('isDecorativeText', () => {
    it('returns true for empty/null', () => {
      expect(utils.isDecorativeText('')).toBe(true);
      expect(utils.isDecorativeText(null)).toBe(true);
      expect(utils.isDecorativeText(undefined)).toBe(true);
    });

    it('returns true for decorative patterns', () => {
      expect(utils.isDecorativeText('---')).toBe(true);
      expect(utils.isDecorativeText('=====')).toBe(true);
      expect(utils.isDecorativeText('****')).toBe(true);
      expect(utils.isDecorativeText('   ')).toBe(true);
    });

    it('returns false for meaningful text', () => {
      expect(utils.isDecorativeText('Hello')).toBe(false);
      expect(utils.isDecorativeText('Chapter 1')).toBe(false);
    });
  });

  describe('normalizeWhitespace', () => {
    it('collapses multiple spaces', () => {
      expect(utils.normalizeWhitespace('foo    bar')).toBe('foo bar');
    });

    it('collapses newlines', () => {
      expect(utils.normalizeWhitespace('foo\n\nbar')).toBe('foo bar');
    });

    it('trims leading/trailing whitespace', () => {
      expect(utils.normalizeWhitespace('  hello  ')).toBe('hello');
    });

    it('handles null/undefined', () => {
      expect(utils.normalizeWhitespace(null)).toBe('');
      expect(utils.normalizeWhitespace(undefined)).toBe('');
    });
  });

  describe('truncateForAnnouncement', () => {
    it('returns short text unchanged', () => {
      expect(utils.truncateForAnnouncement('Hello')).toBe('Hello');
    });

    it('truncates long text', () => {
      const longText = 'a'.repeat(300);
      const result = utils.truncateForAnnouncement(longText, 200);

      expect(result.length).toBeLessThanOrEqual(203); // 200 + '...'
      expect(result.endsWith('...')).toBe(true);
    });

    it('truncates at word boundary', () => {
      const text = 'This is a fairly long sentence that should be truncated at a word boundary for readability';
      const result = utils.truncateForAnnouncement(text, 50);

      expect(result.endsWith('...')).toBe(true);
      expect(result.length).toBeLessThanOrEqual(53);
    });

    it('handles null/undefined', () => {
      expect(utils.truncateForAnnouncement(null)).toBe('');
      expect(utils.truncateForAnnouncement(undefined)).toBe('');
    });
  });

  describe('createDescription', () => {
    it('creates description reference', () => {
      const desc = utils.createDescription('modal', 'This is a modal dialog');

      expect(desc.id).toMatch(/^modal-desc-\d+-\d+$/);
      expect(desc.html).toContain(`id="${desc.id}"`);
      expect(desc.html).toContain('class="sr-only"');
      expect(desc.html).toContain('This is a modal dialog');
    });

    it('escapes HTML in message', () => {
      const desc = utils.createDescription('test', '<script>alert("xss")</script>');

      expect(desc.html).not.toContain('<script>');
      expect(desc.html).toContain('&lt;script&gt;');
    });
  });

  describe('getAccessibilityMetadata', () => {
    it('returns metadata object', () => {
      const metadata = utils.getAccessibilityMetadata();

      expect(metadata.wcagLevel).toBe('AA');
      expect(metadata.wcagVersion).toBe('2.1');
      expect(metadata.testedWith).toContain('NVDA');
      expect(metadata.testedWith).toContain('JAWS');
      expect(metadata.testedWith).toContain('VoiceOver');
      expect(metadata.features).toContain('keyboard_navigation');
      expect(metadata.features).toContain('screen_reader_support');
    });
  });

  describe('isDescriptiveLinkText', () => {
    it('returns false for short text', () => {
      expect(utils.isDescriptiveLinkText('Hi')).toBe(false);
      expect(utils.isDescriptiveLinkText(null)).toBe(false);
    });

    it('returns false for non-descriptive phrases', () => {
      expect(utils.isDescriptiveLinkText('click here')).toBe(false);
      expect(utils.isDescriptiveLinkText('Click Here')).toBe(false);
      expect(utils.isDescriptiveLinkText('here')).toBe(false);
      expect(utils.isDescriptiveLinkText('read more')).toBe(false);
      expect(utils.isDescriptiveLinkText('more')).toBe(false);
    });

    it('returns true for descriptive text', () => {
      expect(utils.isDescriptiveLinkText('Download the PDF')).toBe(true);
      expect(utils.isDescriptiveLinkText('View our privacy policy')).toBe(true);
    });
  });

  describe('createLiveRegionHtml', () => {
    it('creates polite region by default', () => {
      const html = utils.createLiveRegionHtml('my-region');

      expect(html).toContain('id="my-region"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain('aria-atomic="true"');
    });

    it('creates assertive region when specified', () => {
      const html = utils.createLiveRegionHtml('urgent', 'assertive');

      expect(html).toContain('aria-live="assertive"');
    });
  });

  describe('getAllA11yCss', () => {
    it('combines all CSS', () => {
      const css = utils.getAllA11yCss();

      expect(css).toContain('.sr-only');
      expect(css).toContain(':focus-visible');
      expect(css).toContain('.skip-link');
    });
  });

  describe('isVisibleToScreenReader', () => {
    it('returns false for aria-hidden elements', () => {
      const element = document.createElement('div');
      element.setAttribute('aria-hidden', 'true');

      expect(utils.isVisibleToScreenReader(element)).toBe(false);
    });

    it('returns true for visible elements', () => {
      const element = document.createElement('div');
      document.body.appendChild(element);

      expect(utils.isVisibleToScreenReader(element)).toBe(true);

      document.body.removeChild(element);
    });
  });

  describe('getAccessibleName', () => {
    it('returns aria-label if present', () => {
      const element = document.createElement('button');
      element.setAttribute('aria-label', 'Submit form');

      expect(utils.getAccessibleName(element)).toBe('Submit form');
    });

    it('returns aria-labelledby content if present', () => {
      const label = document.createElement('span');
      label.id = 'my-label';
      label.textContent = 'Label text';
      document.body.appendChild(label);

      const element = document.createElement('button');
      element.setAttribute('aria-labelledby', 'my-label');
      document.body.appendChild(element);

      expect(utils.getAccessibleName(element)).toBe('Label text');

      document.body.removeChild(label);
      document.body.removeChild(element);
    });

    it('returns text content as fallback', () => {
      const element = document.createElement('button');
      element.textContent = 'Click me';

      expect(utils.getAccessibleName(element)).toBe('Click me');
    });
  });

  describe('createHiddenDescription', () => {
    it('creates span element', () => {
      const span = utils.createHiddenDescription('desc-1', 'Description text');

      expect(span.tagName).toBe('SPAN');
      expect(span.id).toBe('desc-1');
      expect(span.className).toBe('sr-only');
      expect(span.textContent).toBe('Description text');
    });
  });
});
