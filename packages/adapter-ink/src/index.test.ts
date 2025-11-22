import { describe, it, expect, beforeEach } from 'vitest';
import {
  InkExporter,
  InkImporter,
  InkAdapter,
  type InkStory,
  type InkKnot,
  type InkVariable,
} from './index';
import type { Story, Passage } from '@writewhisker/story-models';

describe('InkExporter', () => {
  let exporter: InkExporter;
  let mockStory: Story;

  beforeEach(() => {
    exporter = new InkExporter();
    mockStory = {
      id: 'story-1',
      name: 'Test Story',
      startPassage: 'Start',
      passages: [
        {
          id: 'passage-1',
          title: 'Start',
          content: 'Welcome to the story!\n[[Continue|next_passage]]',
          tags: [],
          position: { x: 100, y: 100 },
        },
        {
          id: 'passage-2',
          title: 'Next Passage',
          content: 'This is the next part.',
          tags: [],
          position: { x: 300, y: 100 },
        },
      ],
      metadata: {
        author: 'Test Author',
        variables: {
          playerName: 'Hero',
          score: 0,
        },
      },
      created: Date.now(),
      modified: Date.now(),
    };
  });

  describe('convertToInk', () => {
    it('should convert a Whisker story to Ink structure', () => {
      const result = exporter.convertToInk(mockStory);

      expect(result.title).toBe('Test Story');
      expect(result.author).toBe('Test Author');
      expect(result.knots).toHaveLength(2);
    });

    it('should sanitize knot names', () => {
      const result = exporter.convertToInk(mockStory);

      expect(result.knots[0].name).toBe('Start');
      expect(result.knots[1].name).toBe('Next_Passage');
    });

    it('should extract variables from metadata', () => {
      const result = exporter.convertToInk(mockStory);

      expect(result.globalVariables).toHaveLength(2);
      expect(result.globalVariables[0].name).toBe('playerName');
      expect(result.globalVariables[0].value).toBe('Hero');
      expect(result.globalVariables[0].type).toBe('VAR');
    });

    it('should parse choices from content', () => {
      const result = exporter.convertToInk(mockStory);

      expect(result.knots[0].choices).toHaveLength(1);
      expect(result.knots[0].choices[0].text).toBe('Continue');
      expect(result.knots[0].choices[0].target).toBe('next_passage');
    });

    it('should handle passages without variables', () => {
      const storyNoVars = { ...mockStory, metadata: {} };
      const result = exporter.convertToInk(storyNoVars);

      expect(result.globalVariables).toHaveLength(0);
    });
  });

  describe('exportToInk', () => {
    it('should generate valid Ink script', () => {
      const script = exporter.exportToInk(mockStory);

      expect(script).toContain('// Test Story');
      expect(script).toContain('// by Test Author');
      expect(script).toContain('=== Start ===');
      expect(script).toContain('=== Next_Passage ===');
    });

    it('should include variable definitions', () => {
      const script = exporter.exportToInk(mockStory);

      expect(script).toContain('VAR playerName = "Hero"');
      expect(script).toContain('VAR score = 0');
    });

    it('should include choices with arrows', () => {
      const script = exporter.exportToInk(mockStory);

      expect(script).toContain('* [Continue] -> next_passage');
    });

    it('should handle story without author', () => {
      const storyNoAuthor = { ...mockStory, metadata: {} };
      const script = exporter.exportToInk(storyNoAuthor);

      expect(script).toContain('// Test Story');
      expect(script).not.toContain('// by');
    });

    it('should sanitize knot names with numbers', () => {
      const storyWithNumbers = {
        ...mockStory,
        passages: [
          {
            id: 'p1',
            title: '1st Passage',
            content: 'Test',
            tags: [],
          },
        ],
      };

      const script = exporter.exportToInk(storyWithNumbers);

      expect(script).toContain('=== _1st_Passage ===');
    });

    it('should sanitize knot names with special characters', () => {
      const storyWithSpecialChars = {
        ...mockStory,
        passages: [
          {
            id: 'p1',
            title: 'Test-Passage!@#',
            content: 'Test',
            tags: [],
          },
        ],
      };

      const script = exporter.exportToInk(storyWithSpecialChars);

      expect(script).toContain('=== Test_Passage___ ===');
    });
  });
});

describe('InkImporter', () => {
  let importer: InkImporter;
  let mockInkScript: string;

  beforeEach(() => {
    importer = new InkImporter();
    mockInkScript = `// Test Story
// by Test Author

VAR playerName = "Hero"
VAR score = 0

=== start ===
Welcome to the story!
* [Continue] -> next_passage

=== next_passage ===
This is the next part.
* [Go back] -> start
`;
  });

  describe('parseInkScript', () => {
    it('should parse Ink script to structure', () => {
      const result = importer.parseInkScript(mockInkScript);

      expect(result.title).toBe('Test Story');
      expect(result.author).toBe('Test Author');
      expect(result.knots).toHaveLength(2);
    });

    it('should parse global variables', () => {
      const result = importer.parseInkScript(mockInkScript);

      expect(result.globalVariables).toHaveLength(2);
      expect(result.globalVariables[0].name).toBe('playerName');
      expect(result.globalVariables[0].value).toBe('Hero');
      expect(result.globalVariables[0].type).toBe('VAR');
    });

    it('should parse knots', () => {
      const result = importer.parseInkScript(mockInkScript);

      expect(result.knots[0].name).toBe('start');
      expect(result.knots[0].content).toContain('Welcome to the story!');
    });

    it('should parse choices', () => {
      const result = importer.parseInkScript(mockInkScript);

      expect(result.knots[0].choices).toHaveLength(1);
      expect(result.knots[0].choices[0].text).toBe('Continue');
      expect(result.knots[0].choices[0].target).toBe('next_passage');
      expect(result.knots[0].choices[0].once).toBe(true);
    });

    it('should handle CONST variables', () => {
      const scriptWithConst = `
        CONST MAX_SCORE = 100
        === start ===
        Test
      `;

      const result = importer.parseInkScript(scriptWithConst);

      expect(result.globalVariables[0].type).toBe('CONST');
      expect(result.globalVariables[0].name).toBe('MAX_SCORE');
      expect(result.globalVariables[0].value).toBe(100);
    });

    it('should parse numeric variables', () => {
      const scriptWithNumbers = `
        VAR health = 100
        VAR pi = 3.14
        === start ===
        Test
      `;

      const result = importer.parseInkScript(scriptWithNumbers);

      expect(result.globalVariables[0].value).toBe(100);
      expect(result.globalVariables[1].value).toBe(3.14);
    });

    it('should handle sticky choices (+)', () => {
      const scriptWithSticky = `
        === start ===
        + [Sticky choice] -> next
      `;

      const result = importer.parseInkScript(scriptWithSticky);

      expect(result.knots[0].choices[0].once).toBe(false);
    });

    it('should handle stitches', () => {
      const scriptWithStitches = `
        === main_knot ===
        Main content
        = first_stitch
        Stitch content
      `;

      const result = importer.parseInkScript(scriptWithStitches);

      expect(result.knots[0].stitches).toHaveLength(1);
      expect(result.knots[0].stitches[0].name).toBe('first_stitch');
      expect(result.knots[0].stitches[0].content).toBe('Stitch content');
    });

    it('should skip empty lines', () => {
      const scriptWithEmptyLines = `
        === start ===

        Content with empty lines

        More content
      `;

      const result = importer.parseInkScript(scriptWithEmptyLines);

      expect(result.knots[0].content).toContain('Content with empty lines');
    });
  });

  describe('convertToWhisker', () => {
    it('should convert Ink structure to Whisker story', () => {
      const inkStory: InkStory = {
        title: 'Test Story',
        author: 'Test Author',
        knots: [
          {
            name: 'start',
            content: 'Test content',
            stitches: [],
            choices: [
              { text: 'Continue', target: 'next', once: true },
            ],
          },
        ],
        globalVariables: [
          { name: 'score', value: 0, type: 'VAR' },
        ],
      };

      const result = importer.convertToWhisker(inkStory);

      expect(result.name).toBe('Test Story');
      expect(result.startPassage).toBe('start');
      expect(result.passages).toHaveLength(1);
      expect(result.metadata.author).toBe('Test Author');
    });

    it('should convert choices to Whisker links', () => {
      const inkStory: InkStory = {
        title: 'Test',
        knots: [
          {
            name: 'start',
            content: 'Content',
            stitches: [],
            choices: [
              { text: 'Option 1', target: 'choice1', once: true },
              { text: 'Option 2', target: 'choice2', once: false },
            ],
          },
        ],
        globalVariables: [],
      };

      const result = importer.convertToWhisker(inkStory);
      const passage = result.passages[0];

      expect(passage.content).toContain('[[Option 1|choice1]]');
      expect(passage.content).toContain('[[Option 2|choice2]]');
    });

    it('should handle stitches as inline content', () => {
      const inkStory: InkStory = {
        title: 'Test',
        knots: [
          {
            name: 'start',
            content: 'Main content',
            stitches: [
              {
                name: 'substitch',
                content: 'Stitch content',
                choices: [],
              },
            ],
            choices: [],
          },
        ],
        globalVariables: [],
      };

      const result = importer.convertToWhisker(inkStory);
      const passage = result.passages[0];

      expect(passage.content).toContain('Main content');
      expect(passage.content).toContain('## substitch');
      expect(passage.content).toContain('Stitch content');
    });

    it('should generate positions for passages', () => {
      const inkStory: InkStory = {
        title: 'Test',
        knots: [
          { name: 'knot1', content: '', stitches: [], choices: [] },
          { name: 'knot2', content: '', stitches: [], choices: [] },
          { name: 'knot3', content: '', stitches: [], choices: [] },
        ],
        globalVariables: [],
      };

      const result = importer.convertToWhisker(inkStory);

      expect(result.passages[0].position).toEqual({ x: 0, y: 0 });
      expect(result.passages[1].position).toEqual({ x: 200, y: 0 });
      expect(result.passages[2].position).toEqual({ x: 400, y: 0 });
    });

    it('should preserve variables in metadata', () => {
      const inkStory: InkStory = {
        title: 'Test',
        knots: [],
        globalVariables: [
          { name: 'health', value: 100, type: 'VAR' },
          { name: 'name', value: 'Player', type: 'VAR' },
        ],
      };

      const result = importer.convertToWhisker(inkStory);

      expect(result.metadata.variables).toEqual({
        health: 100,
        name: 'Player',
      });
    });
  });

  describe('importFromInk', () => {
    it('should import complete Ink script to Whisker story', () => {
      const result = importer.importFromInk(mockInkScript);

      expect(result.name).toBe('Test Story');
      expect(result.passages).toHaveLength(2);
      expect(result.metadata.author).toBe('Test Author');
      expect(result.created).toBeDefined();
      expect(result.modified).toBeDefined();
    });
  });
});

describe('InkAdapter', () => {
  let adapter: InkAdapter;
  let mockStory: Story;

  beforeEach(() => {
    adapter = new InkAdapter();
    mockStory = {
      id: 'story-1',
      name: 'Test Story',
      startPassage: 'Start',
      passages: [
        {
          id: 'p1',
          title: 'Start',
          content: 'Test content\n[[Continue|next]]',
          tags: [],
        },
        {
          id: 'p2',
          title: 'Next',
          content: 'Next content',
          tags: [],
        },
      ],
      metadata: {
        author: 'Test Author',
      },
      created: Date.now(),
      modified: Date.now(),
    };
  });

  describe('export', () => {
    it('should export story to Ink format', () => {
      const result = adapter.export(mockStory);

      expect(result).toContain('// Test Story');
      expect(result).toContain('=== Start ===');
      expect(result).toContain('=== Next ===');
    });
  });

  describe('import', () => {
    const mockInkScript = `
      // Test Story
      === start ===
      Content
    `;

    it('should import Ink script to story', () => {
      const result = adapter.import(mockInkScript);

      expect(result.name).toBe('Test Story');
      expect(result.passages).toHaveLength(1);
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve story structure through export and import', () => {
      const exported = adapter.export(mockStory);
      const imported = adapter.import(exported);

      expect(imported.name).toBe(mockStory.name);
      expect(imported.passages).toHaveLength(mockStory.passages.length);
    });

    it('should preserve metadata through round-trip', () => {
      const storyWithMetadata = {
        ...mockStory,
        metadata: {
          author: 'Test Author',
          variables: {
            score: 100,
            name: 'Player',
          },
        },
      };

      const exported = adapter.export(storyWithMetadata);
      const imported = adapter.import(exported);

      expect(imported.metadata.author).toBe('Test Author');
      expect(imported.metadata.variables).toBeDefined();
    });
  });
});
