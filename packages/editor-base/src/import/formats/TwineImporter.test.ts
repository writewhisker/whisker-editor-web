/**
 * Tests for TwineImporter
 */

import { describe, it, expect } from 'vitest';
import { TwineImporter, TwineFormat } from './TwineImporter';
import type { Passage } from '@whisker/core-ts';

describe('TwineImporter', () => {
  const importer = new TwineImporter();

  describe('Basic Properties', () => {
    it('should have correct name and format', () => {
      expect(importer.name).toBe('Twine Importer');
      expect(importer.format).toBe('twine');
      expect(importer.extensions).toEqual(['.html', '.htm', '.twee', '.tw']);
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
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
      expect(passage.content).toContain('{{score = 10}}');
      expect(passage.content).toContain('{{score}}');
    });

    it('should track Harlowe data structures', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            (set: $inventory to (datamap: "sword", 1, "shield", 1))
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.lossReport).toBeDefined();
      expect(result.lossReport?.warnings.some(w => w.category === 'data-structure')).toBe(true);
    });

    it('should track Harlowe transitions', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Harlowe" startnode="1">
          <tw-passagedata pid="1" name="Start">
            (transition: "dissolve")[Fading text]
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.lossReport).toBeDefined();
      expect(result.lossReport?.info.some(i => i.category === 'macro' && i.feature === 'Transitions')).toBe(true);
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
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
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

      const startPassage = Array.from(result.story!.passages.values())[0] as Passage;
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
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
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
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
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
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
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
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
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
      const startPassage: Passage | undefined = Array.from(result.story!.passages.values()).find(
        (p: Passage) => p.title === 'Start'
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
      const startPassage: Passage | undefined = Array.from(result.story!.passages.values()).find(
        (p: Passage) => p.title === 'Start'
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
      const startPassage: Passage | undefined = Array.from(result.story!.passages.values()).find(
        (p: Passage) => p.title === 'Start'
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
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
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
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
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
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
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
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
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
      expect(result.error).toContain('Not a valid Twine HTML or Twee file');
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

  describe('Loss Reporting (Stage 1.2)', () => {
    it('should report unsupported SugarCube macros', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="SugarCube" startnode="1">
          <tw-passagedata pid="1" name="Start">
            <<include "OtherPassage">>
            <<widget "CustomWidget">>Content<</widget>>
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.lossReport).toBeDefined();
      expect(result.lossReport!.critical.length).toBeGreaterThan(0);
      expect(result.lossReport!.critical.some(i => i.feature === '<<include>>')).toBe(true);
      expect(result.lossReport!.critical.some(i => i.feature === '<<widget>>')).toBe(true);
    });

    it('should report UI macros as warnings', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="SugarCube" startnode="1">
          <tw-passagedata pid="1" name="Start">
            <<textbox "$name" "Enter name">>
            <<button "Click">>Action<</button>>
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.lossReport).toBeDefined();
      expect(result.lossReport!.warnings.length).toBeGreaterThan(0);
      expect(result.lossReport!.warnings.some(i => i.category === 'ui')).toBe(true);
    });

    it('should report Harlowe data structures as warnings', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Harlowe" startnode="1">
          <tw-passagedata pid="1" name="Start">
            (set: $inventory to (datamap: "gold", 100, "items", (a: "sword")))
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.lossReport).toBeDefined();
      expect(result.lossReport!.warnings.some(i => i.feature === 'Harlowe Data Structures')).toBe(true);
    });

    it('should calculate conversion quality', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="SugarCube" startnode="1">
          <tw-passagedata pid="1" name="Start">
            <<set $x = 10>>
            Simple passage with basic syntax.
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      if (result.lossReport) {
        expect(result.lossReport.conversionQuality).toBeDefined();
        expect(result.lossReport.conversionQuality).toBeGreaterThan(0);
        expect(result.lossReport.conversionQuality).toBeLessThanOrEqual(1);
      }
    });

    it('should track affected passages', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="SugarCube" startnode="1">
          <tw-passagedata pid="1" name="First">
            <<include "Other">>
          </tw-passagedata>
          <tw-passagedata pid="2" name="Second">
            <<widget "test">><</widget>>
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.lossReport).toBeDefined();
      expect(result.lossReport!.affectedPassages.length).toBe(2);
    });
  });

  describe('Advanced SugarCube Syntax (Stage 1.3)', () => {
    it('should convert if/elseif/else chains', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="SugarCube" startnode="1">
          <tw-passagedata pid="1" name="Start">
            <<if $score > 90>>
              Excellent!
            <<elseif $score > 70>>
              Good!
            <<else>>
              Try harder!
            <<endif>>
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
      expect(passage.content).toContain('{{if');
      expect(passage.content).toContain('{{elseif');
      expect(passage.content).toContain('{{else}}');
      expect(passage.content).toContain('{{end}}');
    });

    it('should convert temp variables (_var)', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="SugarCube" startnode="1">
          <tw-passagedata pid="1" name="Start">
            <<set _temp = 5>>
            Value: _temp
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
      expect(passage.content).toContain('{{temp');
      expect(result.lossReport?.info.some(i => i.feature === 'Temporary Variables')).toBe(true);
    });

    it('should convert <<= shorthand', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="SugarCube" startnode="1">
          <tw-passagedata pid="1" name="Start">
            Your score: <<= $score>>
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
      expect(passage.content).toContain('{{score}}');
    });
  });

  describe('Advanced Harlowe Syntax (Stage 1.3)', () => {
    it('should convert (put:) macro', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Harlowe" startnode="1">
          <tw-passagedata pid="1" name="Start">
            (put: 10 into $score)
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
      expect(passage.content).toContain('{{score = 10}}');
    });

    it('should convert (else-if:) chains', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Harlowe" startnode="1">
          <tw-passagedata pid="1" name="Start">
            (if: $x > 5)[High](else-if: $x > 2)[Medium](else:)[Low]
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
      expect(passage.content).toContain('{{if');
      expect(passage.content).toContain('{{elseif');
      expect(passage.content).toContain('{{else}}');
    });

    it('should remove named hook markers', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Harlowe" startnode="1">
          <tw-passagedata pid="1" name="Start">
            |hookname>[This is hooked content]
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
      expect(passage.content).not.toContain('|hookname>');
      expect(passage.content).toContain('[This is hooked content]');
    });

    it('should warn about random/either macros', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Harlowe" startnode="1">
          <tw-passagedata pid="1" name="Start">
            (either: "A", "B", "C")
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.lossReport?.warnings.some(i => i.feature === 'Random/Either')).toBe(true);
    });
  });

  describe('Advanced Chapbook Syntax (Stage 1.3)', () => {
    it('should convert else if chains', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Chapbook" startnode="1">
          <tw-passagedata pid="1" name="Start">
            [if x > 5]
            High
            [else if x > 2]
            Medium
            [else]
            Low
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
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
      expect(passage.content).toContain('{{if');
      expect(passage.content).toContain('{{elseif');
      expect(passage.content).toContain('{{else}}');
      expect(passage.content).toContain('{{end}}');
    });

    it('should convert variable references {var}', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Chapbook" startnode="1">
          <tw-passagedata pid="1" name="Start">
            Your name is {playerName}
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
      expect(passage.content).toContain('{{playerName}}');
    });

    it('should warn about time-based modifiers', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Chapbook" startnode="1">
          <tw-passagedata pid="1" name="Start">
            [after 5s]
            Delayed text appears
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
      expect(result.lossReport?.warnings.some(i => i.feature === 'Time-based Modifiers')).toBe(true);
    });

    it('should report embed passage as critical', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Chapbook" startnode="1">
          <tw-passagedata pid="1" name="Start">
            {embed passage: "EmbeddedPassage"}
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.lossReport?.critical.some(i => i.feature === 'Embed Passage')).toBe(true);
    });
  });

  describe('Twee Notation (Stage 3.1)', () => {
    it('should detect Twee format', () => {
      const twee = `:: Start
Hello, this is a Twee passage.

:: Another Passage
This is another passage.`;
      expect(importer.canImport(twee)).toBe(true);
    });

    it('should import basic Twee story', async () => {
      const twee = `:: StoryTitle
Test Twee Story

:: Start
This is the start passage.
[[Go to next->Next]]

:: Next
This is the next passage.`;

      const result = await importer.import({
        data: twee,
        options: {},
        filename: 'test.twee',
      });

      expect(result.success).toBe(true);
      expect(result.story).toBeDefined();
      expect(result.story!.metadata.title).toBe('Test Twee Story');
      expect(result.passageCount).toBe(2); // Start and Next (StoryTitle is special)
    });

    it('should parse Twee passages with tags', async () => {
      const twee = `:: Start [intro beginning]
This is the start with tags.

:: Next [middle]
This is the next passage.`;

      const result = await importer.import({
        data: twee,
        options: {},
        filename: 'test.twee',
      });

      expect(result.success).toBe(true);
      const passages = Array.from(result.story!.passages.values()) as Passage[];
      const startPassage = passages.find(p => p.title === 'Start');
      expect(startPassage).toBeDefined();
      expect(startPassage!.tags).toContain('intro');
      expect(startPassage!.tags).toContain('beginning');
    });

    it('should parse Twee passages with position metadata', async () => {
      const twee = `:: Start {"position":"100,200"}
This passage has position metadata.`;

      const result = await importer.import({
        data: twee,
        options: {},
        filename: 'test.twee',
      });

      expect(result.success).toBe(true);
      const passages = Array.from(result.story!.passages.values()) as Passage[];
      const startPassage = passages[0];
      expect(startPassage.position.x).toBe(100);
      expect(startPassage.position.y).toBe(200);
    });

    it('should handle Twee with tags and metadata', async () => {
      const twee = `:: Start [tag1 tag2] {"position":"50,100"}
Content here.`;

      const result = await importer.import({
        data: twee,
        options: {},
        filename: 'test.twee',
      });

      expect(result.success).toBe(true);
      const passages = Array.from(result.story!.passages.values()) as Passage[];
      const startPassage = passages[0];
      expect(startPassage.tags).toEqual(['tag1', 'tag2']);
      expect(startPassage.position.x).toBe(50);
      expect(startPassage.position.y).toBe(100);
    });

    it('should handle StoryData passage in Twee', async () => {
      const twee = `:: StoryTitle
My Story

:: StoryData
{
  "ifid": "12345",
  "format": "Harlowe"
}

:: Start
The actual content.`;

      const result = await importer.import({
        data: twee,
        options: {},
        filename: 'test.twee',
      });

      expect(result.success).toBe(true);
      expect(result.story!.metadata.title).toBe('My Story');
      expect(result.passageCount).toBe(1); // Only "Start" is a real passage
    });

    it('should convert Twee passages with SugarCube syntax', async () => {
      const twee = `:: Start
<<set $score = 100>>
You have $score points.
[[Next passage->Next]]`;

      const result = await importer.import({
        data: twee,
        options: {},
        filename: 'test.twee',
      });

      expect(result.success).toBe(true);
      const passages = Array.from(result.story!.passages.values()) as Passage[];
      const startPassage = passages[0];
      // Should convert $score to {{score}}
      expect(startPassage.content).toContain('{{score}}');
    });

    it('should convert Twee passages with Harlowe syntax', async () => {
      const twee = `:: Start
(set: $name to "Alice")
Hello, $name!
[[Continue]]`;

      const result = await importer.import({
        data: twee,
        options: {},
        filename: 'test.twee',
      });

      expect(result.success).toBe(true);
      const passages = Array.from(result.story!.passages.values()) as Passage[];
      const startPassage = passages[0];
      // Should convert to Whisker format
      expect(startPassage.content).toContain('{{name}}');
    });

    it('should handle multi-line Twee passages', async () => {
      const twee = `:: Start
Line 1
Line 2
Line 3

Line 5 (with blank line above)

:: Next
Another passage`;

      const result = await importer.import({
        data: twee,
        options: {},
        filename: 'test.twee',
      });

      expect(result.success).toBe(true);
      const passages = Array.from(result.story!.passages.values()) as Passage[];
      const startPassage = passages.find(p => p.title === 'Start');
      expect(startPassage!.content).toContain('Line 1');
      expect(startPassage!.content).toContain('Line 5');
    });

    it('should set first passage as start node', async () => {
      const twee = `:: FirstPassage
This is first.

:: SecondPassage
This is second.`;

      const result = await importer.import({
        data: twee,
        options: {},
        filename: 'test.twee',
      });

      expect(result.success).toBe(true);
      const passages = Array.from(result.story!.passages.values()) as Passage[];
      const firstPassage = passages.find(p => p.title === 'FirstPassage');
      expect(result.story!.startPassage).toBe(firstPassage!.id);
    });

    it('should skip script and stylesheet passages as start node', async () => {
      const twee = `:: StoryScript [script]
/* JavaScript code */

:: Start
Actual content.`;

      const result = await importer.import({
        data: twee,
        options: {},
        filename: 'test.twee',
      });

      expect(result.success).toBe(true);
      const passages = Array.from(result.story!.passages.values()) as Passage[];
      const startPassage = passages.find(p => p.title === 'Start');
      expect(result.story!.startPassage).toBe(startPassage!.id);
    });

    it('should handle Twee without StoryTitle', async () => {
      const twee = `:: Start
Content without story title.`;

      const result = await importer.import({
        data: twee,
        options: {},
        filename: 'test.twee',
      });

      expect(result.success).toBe(true);
      expect(result.story!.metadata.title).toBe('Untitled Twee Story');
    });

    it('should reject non-Twee text', () => {
      const text = 'This is just plain text with no :: markers';
      expect(importer.canImport(text)).toBe(false);
    });

    it('should handle empty Twee file', async () => {
      const twee = '';

      const result = await importer.import({
        data: twee,
        options: {},
        filename: 'test.twee',
      });

      expect(result.success).toBe(false);
      // Empty file fails format detection
      expect(result.error).toBeTruthy();
    });

    it('should generate unique IDs for Twee passages', async () => {
      const twee = `:: First
Content 1

:: Second
Content 2

:: Third
Content 3`;

      const result = await importer.import({
        data: twee,
        options: {},
        filename: 'test.twee',
      });

      expect(result.success).toBe(true);
      const passages = Array.from(result.story!.passages.values()) as Passage[];
      const ids = passages.map(p => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(passages.length);
    });
  });

  describe('Snowman Format', () => {
    it('should detect Snowman format', async () => {
      const html = `
        <tw-storydata name="Snowman Story" ifid="ABC123" format="Snowman" format-version="2.0.0" startnode="1">
          <tw-passagedata pid="1" name="Start">
            Basic passage content.
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.story?.metadata.title).toBe('Snowman Story');
    });

    it('should track JavaScript code blocks in Snowman', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Snowman" startnode="1">
          <tw-passagedata pid="1" name="Start">
            <script>
              s.score = 100;
              window.story.show("Next");
            </script>
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.lossReport).toBeDefined();
      expect(result.lossReport?.critical.some(c => c.category === 'javascript' && c.feature === 'JavaScript Code Blocks')).toBe(true);
    });

    it('should track Snowman inline expressions', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Snowman" startnode="1">
          <tw-passagedata pid="1" name="Start">
            <% if (s.score > 10) { %>
              You win!
            <% } %>
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.lossReport).toBeDefined();
      expect(result.lossReport?.critical.some(c => c.category === 'javascript')).toBe(true);
    });

    it('should convert simple Snowman print expressions', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Snowman" startnode="1">
          <tw-passagedata pid="1" name="Start">
            Your score: <%= score %>
            Your name: <%= s.name %>
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const passage = Array.from(result.story!.passages.values())[0] as Passage;
      expect(passage.content).toContain('{{score}}');
      expect(passage.content).toContain('{{name}}');
    });

    it('should provide info message about Snowman conversion', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Snowman" startnode="1">
          <tw-passagedata pid="1" name="Start">
            Basic content
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.lossReport).toBeDefined();
      expect(result.lossReport?.info.some(i => i.feature === 'Snowman Format')).toBe(true);
    });
  });

  describe('Variable Type Inference', () => {
    it('should infer boolean variable types', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            {{gameStarted = true}}
            {{isDead = false}}
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const gameStarted = result.story?.variables.get('gameStarted');
      const isDead = result.story?.variables.get('isDead');
      expect(gameStarted?.type).toBe('boolean');
      expect(gameStarted?.initial).toBe(true);
      expect(isDead?.type).toBe('boolean');
      expect(isDead?.initial).toBe(false);
    });

    it('should infer number variable types', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            {{score = 100}}
            {{health = 75.5}}
            {{level = -3}}
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const score = result.story?.variables.get('score');
      const health = result.story?.variables.get('health');
      const level = result.story?.variables.get('level');
      expect(score?.type).toBe('number');
      expect(score?.initial).toBe(100);
      expect(health?.type).toBe('number');
      expect(health?.initial).toBe(75.5);
      expect(level?.type).toBe('number');
      expect(level?.initial).toBe(-3);
    });

    it('should infer string variable types from quoted values', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            {{name = "Alice"}}
            {{location = 'Forest'}}
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const name = result.story?.variables.get('name');
      const location = result.story?.variables.get('location');
      expect(name?.type).toBe('string');
      expect(name?.initial).toBe('Alice');
      expect(location?.type).toBe('string');
      expect(location?.initial).toBe('Forest');
    });

    it('should default to string for unquoted expressions', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            {{someVar = complexExpression}}
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const someVar = result.story?.variables.get('someVar');
      expect(someVar?.type).toBe('string');
    });

    it('should track variable references without assignments', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" startnode="1">
          <tw-passagedata pid="1" name="Start">
            You have {{coins}} coins.
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      const coins = result.story?.variables.get('coins');
      expect(coins).toBeDefined();
      expect(coins?.type).toBe('string');
    });
  });

  describe('Enhanced Conversion Tracking', () => {
    it('should track SugarCube interactive macros', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="SugarCube" startnode="1">
          <tw-passagedata pid="1" name="Start">
            <<linkreplace "Click me">>Replaced text<</linkreplace>>
            <<linkappend "Append">>More text<</linkappend>>
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.lossReport).toBeDefined();
      expect(result.lossReport?.warnings.some(w => w.category === 'interactive')).toBe(true);
    });

    it('should provide passage-specific issue tracking', async () => {
      const html = `
        <tw-storydata name="Test" ifid="123" format="Harlowe" startnode="1">
          <tw-passagedata pid="1" name="FirstPassage">
            (datamap: "key", "value")
          </tw-passagedata>
          <tw-passagedata pid="2" name="SecondPassage">
            (random: 1, 10)
          </tw-passagedata>
        </tw-storydata>
      `;

      const result = await importer.import({
        data: html,
        options: {},
        filename: 'test.html',
      });

      expect(result.success).toBe(true);
      expect(result.lossReport).toBeDefined();
      const firstPassageIssues = result.lossReport?.warnings.filter(w => w.passageName === 'FirstPassage');
      const secondPassageIssues = result.lossReport?.warnings.filter(w => w.passageName === 'SecondPassage');
      expect(firstPassageIssues?.length).toBeGreaterThan(0);
      expect(secondPassageIssues?.length).toBeGreaterThan(0);
    });
  });
});
