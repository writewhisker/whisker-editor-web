import { describe, it, expect, beforeEach } from 'vitest';
import {
  TwineExporter,
  TwineImporter,
  TwineAdapter,
  extractTwineLinks,
  type TwineStory,
  type TwinePassage,
} from './index';
import type { Story, Passage } from '@writewhisker/story-models';

describe('TwineExporter', () => {
  let exporter: TwineExporter;
  let mockStory: Story;

  beforeEach(() => {
    exporter = new TwineExporter();
    mockStory = {
      id: 'story-1',
      name: 'Test Story',
      ifid: 'test-ifid-123',
      startPassage: 'Start',
      passages: [
        {
          id: 'passage-1',
          title: 'Start',
          content: 'Welcome to the story!\n\n[[Continue|Next]]',
          tags: ['start'],
          position: { x: 100, y: 100 },
          size: { width: 200, height: 100 },
        },
        {
          id: 'passage-2',
          title: 'Next',
          content: 'This is the next passage.\n\n[[Back to Start|Start]]',
          tags: [],
          position: { x: 300, y: 100 },
        },
      ],
      metadata: { author: 'Test Author' },
      created: Date.now(),
      modified: Date.now(),
    };
  });

  describe('convertToTwine', () => {
    it('should convert a Whisker story to Twine structure', () => {
      const result = exporter.convertToTwine(mockStory);

      expect(result.name).toBe('Test Story');
      expect(result.ifid).toBe('test-ifid-123');
      expect(result.startPassage).toBe('Start');
      expect(result.passages).toHaveLength(2);
      expect(result.format).toBe('Harlowe');
      expect(result.formatVersion).toBe('3.3.8');
    });

    it('should generate IFID if not provided', () => {
      const storyWithoutIfid = { ...mockStory, ifid: undefined };
      const result = exporter.convertToTwine(storyWithoutIfid);

      expect(result.ifid).toBeDefined();
      expect(result.ifid).toMatch(/^[a-f0-9-]{36}$/i);
    });

    it('should use first passage as start if not specified', () => {
      const storyWithoutStart = { ...mockStory, startPassage: undefined };
      const result = exporter.convertToTwine(storyWithoutStart);

      expect(result.startPassage).toBe('Start');
    });

    it('should convert passages with positions and sizes', () => {
      const result = exporter.convertToTwine(mockStory);

      expect(result.passages[0].position).toEqual({ x: 100, y: 100 });
      expect(result.passages[0].size).toEqual({ width: 200, height: 100 });
    });

    it('should preserve tags', () => {
      const result = exporter.convertToTwine(mockStory);

      expect(result.passages[0].tags).toEqual(['start']);
      expect(result.passages[1].tags).toEqual([]);
    });
  });

  describe('exportToHTML', () => {
    it('should generate valid Twine HTML', () => {
      const html = exporter.exportToHTML(mockStory);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<tw-storydata');
      expect(html).toContain('name="Test Story"');
      expect(html).toContain('ifid="test-ifid-123"');
      expect(html).toContain('creator="Whisker Editor"');
    });

    it('should include all passages', () => {
      const html = exporter.exportToHTML(mockStory);

      expect(html).toContain('<tw-passagedata');
      expect(html).toContain('name="Start"');
      expect(html).toContain('name="Next"');
    });

    it('should escape HTML entities', () => {
      const storyWithSpecialChars = {
        ...mockStory,
        name: 'Test & <Story>',
        passages: [
          {
            id: 'p1',
            title: 'Test "Passage"',
            content: 'Content with <tags> & "quotes"',
            tags: [],
          },
        ],
      };

      const html = exporter.exportToHTML(storyWithSpecialChars);

      expect(html).toContain('Test &amp; &lt;Story&gt;');
      expect(html).toContain('Test &quot;Passage&quot;');
      expect(html).toContain('&lt;tags&gt; &amp; &quot;quotes&quot;');
    });

    it('should include passage positions', () => {
      const html = exporter.exportToHTML(mockStory);

      expect(html).toContain('position="100,100"');
      expect(html).toContain('size="200,100"');
    });
  });

  describe('exportToArchive', () => {
    it('should generate archive format', () => {
      const archive = exporter.exportToArchive(mockStory);

      expect(archive).toBeDefined();
      expect(archive).toContain('<!DOCTYPE html>');
    });
  });
});

describe('TwineImporter', () => {
  let importer: TwineImporter;
  let mockTwineHTML: string;

  beforeEach(() => {
    importer = new TwineImporter();
    mockTwineHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Test Story</title>
</head>
<body>
<tw-storydata name="Test Story"
             startnode="Start"
             creator="Twine"
             creator-version="2.0"
             ifid="test-ifid-123"
             format="Harlowe"
             format-version="3.3.8">
  <tw-passagedata pid="1" name="Start" tags="start" position="100,100" size="200,100">Welcome to the story!

[[Continue|Next]]</tw-passagedata>
  <tw-passagedata pid="2" name="Next" tags="" position="300,100">This is the next passage.</tw-passagedata>
</tw-storydata>
</body>
</html>`;
  });

  describe('parseHTML', () => {
    it('should parse Twine HTML to structure', () => {
      const result = importer.parseHTML(mockTwineHTML);

      expect(result.name).toBe('Test Story');
      expect(result.ifid).toBe('test-ifid-123');
      expect(result.startPassage).toBe('Start');
      expect(result.format).toBe('Harlowe');
      expect(result.formatVersion).toBe('3.3.8');
    });

    it('should extract passages', () => {
      const result = importer.parseHTML(mockTwineHTML);

      expect(result.passages).toHaveLength(2);
      expect(result.passages[0].name).toBe('Start');
      expect(result.passages[0].pid).toBe('1');
      expect(result.passages[0].text).toContain('Welcome to the story!');
    });

    it('should parse passage positions and sizes', () => {
      const result = importer.parseHTML(mockTwineHTML);

      expect(result.passages[0].position).toEqual({ x: 100, y: 100 });
      expect(result.passages[0].size).toEqual({ width: 200, height: 100 });
      expect(result.passages[1].position).toEqual({ x: 300, y: 100 });
    });

    it('should parse tags', () => {
      const result = importer.parseHTML(mockTwineHTML);

      expect(result.passages[0].tags).toEqual(['start']);
      expect(result.passages[1].tags).toEqual([]);
    });

    it('should handle missing metadata', () => {
      const minimalHTML = `
        <tw-storydata>
          <tw-passagedata pid="1" name="Start">Test</tw-passagedata>
        </tw-storydata>
      `;

      const result = importer.parseHTML(minimalHTML);

      expect(result.name).toBe('Untitled');
      expect(result.ifid).toBe('');
      expect(result.format).toBe('Harlowe');
    });

    it('should unescape HTML entities', () => {
      const htmlWithEntities = `
        <tw-storydata name="Test &amp; Story">
          <tw-passagedata pid="1" name="Test &quot;Passage&quot;">&lt;content&gt;</tw-passagedata>
        </tw-storydata>
      `;

      const result = importer.parseHTML(htmlWithEntities);

      expect(result.name).toBe('Test & Story');
      expect(result.passages[0].name).toBe('Test "Passage"');
      expect(result.passages[0].text).toBe('<content>');
    });
  });

  describe('convertToWhisker', () => {
    it('should convert Twine structure to Whisker story', () => {
      const twineStory: TwineStory = {
        name: 'Test Story',
        ifid: 'test-ifid',
        startPassage: 'Start',
        format: 'Harlowe',
        formatVersion: '3.3.8',
        passages: [
          {
            pid: '1',
            name: 'Start',
            text: 'Test content',
            tags: ['start'],
            position: { x: 100, y: 100 },
          },
        ],
      };

      const result = importer.convertToWhisker(twineStory);

      expect(result.name).toBe('Test Story');
      expect(result.ifid).toBe('test-ifid');
      expect(result.startPassage).toBe('Start');
      expect(result.passages).toHaveLength(1);
    });

    it('should generate ID if not provided', () => {
      const twineStory: TwineStory = {
        name: 'Test',
        ifid: '',
        startPassage: 'Start',
        format: 'Harlowe',
        formatVersion: '3.3.8',
        passages: [],
      };

      const result = importer.convertToWhisker(twineStory);

      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe('string');
    });

    it('should preserve metadata', () => {
      const twineStory: TwineStory = {
        name: 'Test',
        ifid: 'test',
        startPassage: 'Start',
        format: 'Harlowe',
        formatVersion: '3.3.8',
        passages: [],
        metadata: { author: 'Test Author' },
      };

      const result = importer.convertToWhisker(twineStory);

      expect(result.metadata).toEqual({ author: 'Test Author' });
    });
  });

  describe('importFromHTML', () => {
    it('should import complete HTML to Whisker story', () => {
      const result = importer.importFromHTML(mockTwineHTML);

      expect(result.name).toBe('Test Story');
      expect(result.passages).toHaveLength(2);
      expect(result.created).toBeDefined();
      expect(result.modified).toBeDefined();
    });
  });

  describe('importFromArchive', () => {
    it('should import archive format', () => {
      const result = importer.importFromArchive(mockTwineHTML);

      expect(result.name).toBe('Test Story');
      expect(result.passages).toHaveLength(2);
    });
  });
});

describe('extractTwineLinks', () => {
  it('should extract simple links', () => {
    const text = 'Go to [[Next Passage]]';
    const links = extractTwineLinks(text);

    expect(links).toHaveLength(1);
    expect(links[0].text).toBe('Next Passage');
    expect(links[0].target).toBe('Next Passage');
  });

  it('should extract links with custom text', () => {
    const text = 'Click [[here|Next Passage]] to continue';
    const links = extractTwineLinks(text);

    expect(links).toHaveLength(1);
    expect(links[0].text).toBe('Next Passage');
    expect(links[0].target).toBe('here');
  });

  it('should extract multiple links', () => {
    const text = '[[Option 1|Choice1]] or [[Option 2|Choice2]]';
    const links = extractTwineLinks(text);

    expect(links).toHaveLength(2);
    expect(links[0].target).toBe('Option 1');
    expect(links[1].target).toBe('Option 2');
  });

  it('should return empty array for text without links', () => {
    const text = 'No links here';
    const links = extractTwineLinks(text);

    expect(links).toHaveLength(0);
  });
});

describe('TwineAdapter', () => {
  let adapter: TwineAdapter;
  let mockStory: Story;

  beforeEach(() => {
    adapter = new TwineAdapter();
    mockStory = {
      id: 'story-1',
      name: 'Test Story',
      startPassage: 'Start',
      passages: [
        {
          id: 'p1',
          title: 'Start',
          content: 'Test content',
          tags: [],
        },
      ],
      metadata: {},
      created: Date.now(),
      modified: Date.now(),
    };
  });

  describe('export', () => {
    it('should export to HTML by default', () => {
      const result = adapter.export(mockStory);

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<tw-storydata');
    });

    it('should export to HTML format explicitly', () => {
      const result = adapter.export(mockStory, 'html');

      expect(result).toContain('<!DOCTYPE html>');
    });

    it('should export to archive format', () => {
      const result = adapter.export(mockStory, 'archive');

      expect(result).toBeDefined();
      expect(result).toContain('<tw-storydata');
    });
  });

  describe('import', () => {
    const mockHTML = `
      <tw-storydata name="Test">
        <tw-passagedata pid="1" name="Start">Content</tw-passagedata>
      </tw-storydata>
    `;

    it('should import from HTML by default', () => {
      const result = adapter.import(mockHTML);

      expect(result.name).toBe('Test');
      expect(result.passages).toHaveLength(1);
    });

    it('should import from HTML format explicitly', () => {
      const result = adapter.import(mockHTML, 'html');

      expect(result.name).toBe('Test');
    });

    it('should import from archive format', () => {
      const result = adapter.import(mockHTML, 'archive');

      expect(result.name).toBe('Test');
    });
  });

  describe('extractLinks', () => {
    it('should extract links from text', () => {
      const links = adapter.extractLinks('Go [[here]] or [[there]]');

      expect(links).toHaveLength(2);
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve story data through export and import', () => {
      const exported = adapter.export(mockStory);
      const imported = adapter.import(exported);

      expect(imported.name).toBe(mockStory.name);
      expect(imported.passages).toHaveLength(mockStory.passages.length);
      expect(imported.passages[0].title).toBe(mockStory.passages[0].title);
    });
  });
});
