/**
 * Tests for TwineImporter
 */

import { describe, it, expect } from 'vitest';
import { TwineImporter, TwineFormat } from './TwineImporter';

describe('TwineImporter', () => {
  const importer = new TwineImporter();

  describe('Basic Properties', () => {
    it('should have correct name and format', () => {
      expect(importer.name).toBe('Twine Importer');
      expect(importer.format).toBe('twine');
      expect(importer.extensions).toEqual(['.html', '.htm']);
    });
  });

  describe('Format Detection', () => {
    it('should detect Twine HTML with tw-storydata tag', () => {
      const html = `
        <tw-storydata name="Test Story" ifid="12345">
          <tw-passagedata pid="1" name="Start">Hello</tw-passagedata>
        </tw-storydata>
      `;
      expect(importer.canImport(html)).toBe(true);
    });

    it('should detect Twine HTML with tw-passagedata tag', () => {
      const html = `
        <html>
          <tw-passagedata pid="1" name="Start">Hello</tw-passagedata>
        </html>
      `;
      expect(importer.canImport(html)).toBe(true);
    });

    it('should reject non-Twine HTML', () => {
      const html = '<html><body>Not a Twine story</body></html>';
      expect(importer.canImport(html)).toBe(false);
    });

    it('should reject JSON data', () => {
      const json = '{"metadata": {"title": "Test"}}';
      expect(importer.canImport(json)).toBe(false);
    });
  });

  describe('Harlowe Format', () => {
    it('should import basic Harlowe story', async () => {
      const html = `
        <tw-storydata name="Harlowe Story" ifid="ABC123" format="Harlowe" format-version="3.2.0" startnode="1">
          <tw-passagedata pid="1" name="Start" position="100,200">
            Welcome to the story!
            [[Next Scene]]
          </tw-passagedata>
          <tw-passagedata pid="2" name="Next Scene" position="300,200">
            You are in the next scene.
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story?.metadata.title).toBe('Harlowe Story');
      expect(result.story?.metadata.ifid).toBe('ABC123');
      expect(result.passageCount).toBe(2);
    });

    it('should convert Harlowe set syntax', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            (set: $score to 10)
            Your score is (print: $score)
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0];
      expect(passage.content).toContain('{{score = 10}}');
      expect(passage.content).toContain('{{score}}');
    });

    it('should convert Harlowe if syntax', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            (if: $score > 10)[You win!]
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0];
      expect(passage.content).toContain('{{if');
      expect(passage.content).toContain('then}}');
      expect(passage.content).toContain('{{end}}');
    });
  });

  describe('SugarCube Format', () => {
    it('should import basic SugarCube story', async () => {
      const html = `
        <tw-storydata name="SugarCube Story" ifid="DEF456" format="SugarCube" format-version="2.36.0" startnode="1">
          <tw-passagedata pid="1" name="Start" tags="intro" position="150,150">
            <<set $health = 100>>
            Your health: $health
            [[Continue]]
          </tw-passagedata>
          <tw-passagedata pid="2" name="Continue" position="350,150">
            The story continues...
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.story?.metadata.title).toBe('SugarCube Story');
      expect(result.passageCount).toBe(2);

      const startPassage = Array.from(result.story!.passages.values())[0];
      expect(startPassage.tags).toContain('intro');
    });

    it('should convert SugarCube set syntax', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            <<set $gold to 50>>
            <<set $items = ["sword", "shield"]>>
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0];
      expect(passage.content).toContain('{{gold = 50}}');
      expect(passage.content).toContain('{{items = ["sword", "shield"]}}');
    });

    it('should convert SugarCube if/endif syntax', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="SugarCube" startnode="1">
          <tw-passagedata pid="1" name="Start">
            <<if $gold > 20>>You are rich!<<endif>>
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0];
      expect(passage.content).toContain('{{if {{gold}} > 20 then}}');
      expect(passage.content).toContain('{{end}}');
    });

    it('should convert SugarCube variable references', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="SugarCube" startnode="1">
          <tw-passagedata pid="1" name="Start">
            Your name is $name and you have $gold gold.
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0];
      expect(passage.content).toContain('{{name}}');
      expect(passage.content).toContain('{{gold}}');
    });
  });

  describe('Chapbook Format', () => {
    it('should import basic Chapbook story', async () => {
      const html = `
        <tw-storydata name="Chapbook Story" ifid="GHI789" format="Chapbook" format-version="1.2.0" startnode="1">
          <tw-passagedata pid="1" name="Start" position="200,100">
            Welcome!
            [[Next->Scene2]]
          </tw-passagedata>
          <tw-passagedata pid="2" name="Scene2" position="400,100">
            Scene 2 content
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.story?.metadata.title).toBe('Chapbook Story');
      expect(result.passageCount).toBe(2);
    });

    it('should convert Chapbook if/continued syntax', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            [if score > 10]
            You won!
            [continued]
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0];
      expect(passage.content).toContain('{{if');
      expect(passage.content).toContain('{{end}}');
    });
  });

  describe('Link Conversion', () => {
    it('should convert simple links [[Target]]', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            Go to [[Next Page]]
          </tw-passagedata>
          <tw-passagedata pid="2" name="Next Page">
            End
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const startPassage = Array.from(result.story!.passages.values()).find(
        (p) => p.title === 'Start'
      );
      expect(startPassage?.choices.length).toBe(1);
      expect(startPassage?.choices[0].text).toBe('Next Page');
    });

    it('should convert arrow links [[Text->Target]]', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            [[Click here->Destination]]
          </tw-passagedata>
          <tw-passagedata pid="2" name="Destination">
            You arrived!
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const startPassage = Array.from(result.story!.passages.values()).find(
        (p) => p.title === 'Start'
      );
      expect(startPassage?.choices.length).toBe(1);
      expect(startPassage?.choices[0].text).toBe('Click here');

      const targetPassage = result.story!.getPassage(startPassage!.choices[0].target);
      expect(targetPassage?.title).toBe('Destination');
    });

    it('should handle multiple links in same passage', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            Choose: [[Option A]] or [[Option B]]
          </tw-passagedata>
          <tw-passagedata pid="2" name="Option A">A</tw-passagedata>
          <tw-passagedata pid="3" name="Option B">B</tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const startPassage = Array.from(result.story!.passages.values()).find(
        (p) => p.title === 'Start'
      );
      expect(startPassage?.choices.length).toBe(2);
    });

    it('should warn about broken links', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            [[Nonexistent Page]]
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('Broken link'))).toBe(true);
    });
  });

  describe('Variable Extraction', () => {
    it('should extract variables from converted content', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            <<set $name = "Hero">>
            <<set $health = 100>>
            Hello, $name! Your health: $health
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.variableCount).toBeGreaterThan(0);
      expect(result.story?.variables.has('name')).toBe(true);
      expect(result.story?.variables.has('health')).toBe(true);
    });

    it('should warn about extracted variables needing verification', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            <<set $score = 0>>
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('variable'))).toBe(true);
    });
  });

  describe('Passage Attributes', () => {
    it('should preserve passage tags', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start" tags="intro scene1">
            Content
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0];
      expect(passage.tags).toContain('intro');
      expect(passage.tags).toContain('scene1');
    });

    it('should preserve passage position', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start" position="250,350">
            Content
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0];
      expect(passage.position.x).toBe(250);
      expect(passage.position.y).toBe(350);
    });

    it('should preserve passage size', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start" size="150,200">
            Content
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0];
      expect(passage.size?.width).toBe(150);
      expect(passage.size?.height).toBe(200);
    });
  });

  describe('Start Passage Detection', () => {
    it('should use startnode attribute', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="2">
          <tw-passagedata pid="1" name="First">A</tw-passagedata>
          <tw-passagedata pid="2" name="Second">B</tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const startPassage = result.story!.getPassage(result.story!.startPassage);
      expect(startPassage?.title).toBe('Second');
    });

    it('should fallback to "Start" passage name', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123">
          <tw-passagedata pid="1" name="Intro">A</tw-passagedata>
          <tw-passagedata pid="2" name="Start">B</tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const startPassage = result.story!.getPassage(result.story!.startPassage);
      expect(startPassage?.title).toBe('Start');
    });

    it('should fallback to first passage if no start found', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123">
          <tw-passagedata pid="1" name="FirstPassage">A</tw-passagedata>
          <tw-passagedata pid="2" name="SecondPassage">B</tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.story!.startPassage).toBeDefined();
      expect(result.warnings?.some(w => w.includes('No start passage'))).toBe(true);
    });
  });

  describe('HTML Entity Decoding', () => {
    it('should decode common HTML entities', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            &lt;b&gt;Bold&lt;/b&gt; &amp; &quot;Quoted&quot;
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0];
      expect(passage.content).toContain('<b>');
      expect(passage.content).toContain('</b>');
      expect(passage.content).toContain('&');
      expect(passage.content).toContain('"');
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid HTML', async () => {
      const html = '<html><body>Not Twine</body></html>';

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not a valid Twine HTML file');
    });

    it('should reject empty passage list', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123">
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No passages found');
    });
  });

  describe('Validation', () => {
    it('should validate correct Twine HTML', () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">Content</tw-passagedata>
        </tw-storydata>
      `;

      const errors = importer.validate(html);
      expect(errors).toHaveLength(0);
    });

    it('should report missing passages', () => {
      const html = `
        <tw-storydata name="Test" ifid="123">
        </tw-storydata>
      `;

      const errors = importer.validate(html);
      expect(errors.some(e => e.includes('No passages'))).toBe(true);
    });

    it('should report non-Twine HTML', () => {
      const html = '<html><body>Not Twine</body></html>';

      const errors = importer.validate(html);
      expect(errors.some(e => e.includes('Not a valid'))).toBe(true);
    });
  });

  describe('Format Version', () => {
    it('should extract format version', () => {
      const html = `
        <tw-storydata name="Test" format-version="3.2.1">
          <tw-passagedata pid="1" name="Start">Test</tw-passagedata>
        </tw-storydata>
      `;

      const version = importer.getFormatVersion(html);
      expect(version).toBe('3.2.1');
    });

    it('should return unknown for missing version', () => {
      const html = `
        <tw-storydata name="Test">
          <tw-passagedata pid="1" name="Start">Test</tw-passagedata>
        </tw-storydata>
      `;

      const version = importer.getFormatVersion(html);
      expect(version).toBe('unknown');
    });
  });
});
