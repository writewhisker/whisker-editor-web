/**
 * WLS 1.0 Content Renderer - Rich Text Tests
 *
 * Tests for rendering rich text and media AST nodes:
 * - FormattedTextNode (bold, italic, code, strikethrough)
 * - BlockquoteNode
 * - ListNode
 * - HorizontalRuleNode
 * - ClassedBlockNode
 * - ClassedInlineNode
 * - ImageNode
 * - AudioNode
 * - VideoNode
 * - EmbedNode
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContentRenderer } from './ContentRenderer';
import type { WhiskerRuntimeContext } from '@writewhisker/scripting';
import type {
  ContentNode,
  FormattedTextNode,
  BlockquoteNode,
  ListNode,
  ListItemNode,
  HorizontalRuleNode,
  ClassedBlockNode,
  ClassedInlineNode,
  ImageNode,
  AudioNode,
  VideoNode,
  EmbedNode,
  TextNode,
  SourceSpan,
} from '@writewhisker/parser';

// Helper to create a basic location
function createLocation(): SourceSpan {
  return {
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 10, offset: 9 },
  };
}

// Helper to create a text node
function createTextNode(value: string): TextNode {
  return {
    type: 'text',
    value,
    location: createLocation(),
  };
}

// Create a mock runtime context
function createMockContext(): WhiskerRuntimeContext {
  return {
    variables: new Map(),
    functions: new Map(),
    story: null as unknown as WhiskerRuntimeContext['story'],
    currentPassage: null,
  };
}

describe('ContentRenderer - Rich Text', () => {
  let context: WhiskerRuntimeContext;
  let renderer: ContentRenderer;

  beforeEach(() => {
    context = createMockContext();
    renderer = new ContentRenderer(context);
  });

  describe('FormattedTextNode rendering', () => {
    it('renders bold text', () => {
      const node: FormattedTextNode = {
        type: 'formatted_text',
        format: 'bold',
        content: [createTextNode('Bold text')],
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<strong>Bold text</strong>');
      expect(result.errors).toHaveLength(0);
    });

    it('renders italic text', () => {
      const node: FormattedTextNode = {
        type: 'formatted_text',
        format: 'italic',
        content: [createTextNode('Italic text')],
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<em>Italic text</em>');
    });

    it('renders bold italic text', () => {
      const node: FormattedTextNode = {
        type: 'formatted_text',
        format: 'bold_italic',
        content: [createTextNode('Bold and italic')],
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<strong><em>Bold and italic</em></strong>');
    });

    it('renders code text', () => {
      const node: FormattedTextNode = {
        type: 'formatted_text',
        format: 'code',
        content: [createTextNode('const x = 42')],
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<code>const x = 42</code>');
    });

    it('renders strikethrough text', () => {
      const node: FormattedTextNode = {
        type: 'formatted_text',
        format: 'strikethrough',
        content: [createTextNode('Deleted text')],
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<del>Deleted text</del>');
    });

    it('renders nested formatted text', () => {
      const innerNode: FormattedTextNode = {
        type: 'formatted_text',
        format: 'italic',
        content: [createTextNode('italic inside')],
        location: createLocation(),
      };

      const outerNode: FormattedTextNode = {
        type: 'formatted_text',
        format: 'bold',
        content: [createTextNode('Bold with '), innerNode, createTextNode(' more')],
        location: createLocation(),
      };

      const result = renderer.render([outerNode]);
      expect(result.text).toBe('<strong>Bold with <em>italic inside</em> more</strong>');
    });
  });

  describe('BlockquoteNode rendering', () => {
    it('renders simple blockquote', () => {
      const node: BlockquoteNode = {
        type: 'blockquote',
        content: [createTextNode('A wise quote')],
        depth: 1,
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<blockquote>A wise quote</blockquote>');
    });

    it('renders nested blockquote with depth', () => {
      const node: BlockquoteNode = {
        type: 'blockquote',
        content: [createTextNode('Nested quote')],
        depth: 2,
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('  <blockquote>Nested quote</blockquote>');
    });
  });

  describe('ListNode rendering', () => {
    it('renders unordered list', () => {
      const listItem1: ListItemNode = {
        type: 'list_item',
        content: [createTextNode('First item')],
        location: createLocation(),
      };
      const listItem2: ListItemNode = {
        type: 'list_item',
        content: [createTextNode('Second item')],
        location: createLocation(),
      };

      const node: ListNode = {
        type: 'list',
        ordered: false,
        items: [listItem1, listItem2],
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<ul>\n<li>First item</li>\n<li>Second item</li>\n</ul>');
    });

    it('renders ordered list', () => {
      const listItem1: ListItemNode = {
        type: 'list_item',
        content: [createTextNode('Step one')],
        location: createLocation(),
      };
      const listItem2: ListItemNode = {
        type: 'list_item',
        content: [createTextNode('Step two')],
        location: createLocation(),
      };

      const node: ListNode = {
        type: 'list',
        ordered: true,
        items: [listItem1, listItem2],
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<ol>\n<li>Step one</li>\n<li>Step two</li>\n</ol>');
    });
  });

  describe('HorizontalRuleNode rendering', () => {
    it('renders horizontal rule', () => {
      const node: HorizontalRuleNode = {
        type: 'horizontal_rule',
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<hr />');
    });
  });

  describe('ClassedBlockNode rendering', () => {
    it('renders block with single class', () => {
      const node: ClassedBlockNode = {
        type: 'classed_block',
        classes: ['warning'],
        content: [createTextNode('Warning message')],
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<div class="warning">Warning message</div>');
    });

    it('renders block with multiple classes', () => {
      const node: ClassedBlockNode = {
        type: 'classed_block',
        classes: ['alert', 'danger', 'centered'],
        content: [createTextNode('Alert content')],
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<div class="alert danger centered">Alert content</div>');
    });
  });

  describe('ClassedInlineNode rendering', () => {
    it('renders inline with single class', () => {
      const node: ClassedInlineNode = {
        type: 'classed_inline',
        classes: ['highlight'],
        content: [createTextNode('highlighted')],
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<span class="highlight">highlighted</span>');
    });

    it('renders inline with multiple classes', () => {
      const node: ClassedInlineNode = {
        type: 'classed_inline',
        classes: ['text-red', 'bold'],
        content: [createTextNode('styled text')],
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<span class="text-red bold">styled text</span>');
    });
  });
});

describe('ContentRenderer - Media', () => {
  let context: WhiskerRuntimeContext;
  let renderer: ContentRenderer;

  beforeEach(() => {
    context = createMockContext();
    renderer = new ContentRenderer(context);
  });

  describe('ImageNode rendering', () => {
    it('renders basic image', () => {
      const node: ImageNode = {
        type: 'image',
        alt: 'A cat',
        src: 'cat.jpg',
        attributes: {},
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<img src="cat.jpg" alt="A cat" />');
    });

    it('renders image with all attributes', () => {
      const node: ImageNode = {
        type: 'image',
        alt: 'Photo',
        src: 'photo.png',
        attributes: {
          width: '300',
          height: '200',
          title: 'My photo',
          id: 'main-photo',
          classes: ['responsive', 'rounded'],
        },
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toContain('src="photo.png"');
      expect(result.text).toContain('alt="Photo"');
      expect(result.text).toContain('width="300"');
      expect(result.text).toContain('height="200"');
      expect(result.text).toContain('title="My photo"');
      expect(result.text).toContain('id="main-photo"');
      expect(result.text).toContain('class="responsive rounded"');
    });

    it('escapes HTML in attributes', () => {
      const node: ImageNode = {
        type: 'image',
        alt: 'Image with "quotes" & <symbols>',
        src: 'test.jpg',
        attributes: {},
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toContain('alt="Image with &quot;quotes&quot; &amp; &lt;symbols&gt;"');
    });
  });

  describe('AudioNode rendering', () => {
    it('renders basic audio with controls', () => {
      const node: AudioNode = {
        type: 'audio',
        src: 'sound.mp3',
        attributes: {},
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<audio src="sound.mp3" controls></audio>');
    });

    it('renders audio with all attributes', () => {
      const node: AudioNode = {
        type: 'audio',
        src: 'music.mp3',
        attributes: {
          loop: true,
          autoplay: true,
          controls: true,
          muted: true,
          preload: 'auto',
          id: 'bg-music',
          classes: ['ambient'],
        },
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toContain('src="music.mp3"');
      expect(result.text).toContain('loop');
      expect(result.text).toContain('autoplay');
      expect(result.text).toContain('controls');
      expect(result.text).toContain('muted');
      expect(result.text).toContain('preload="auto"');
      expect(result.text).toContain('id="bg-music"');
      expect(result.text).toContain('class="ambient"');
    });

    it('renders audio without controls when explicitly false', () => {
      const node: AudioNode = {
        type: 'audio',
        src: 'hidden.mp3',
        attributes: {
          controls: false,
        },
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).not.toContain('controls');
    });
  });

  describe('VideoNode rendering', () => {
    it('renders basic video with controls', () => {
      const node: VideoNode = {
        type: 'video',
        src: 'movie.mp4',
        attributes: {},
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toBe('<video src="movie.mp4" controls></video>');
    });

    it('renders video with all attributes', () => {
      const node: VideoNode = {
        type: 'video',
        src: 'clip.mp4',
        attributes: {
          width: '640',
          height: '480',
          loop: true,
          autoplay: true,
          controls: true,
          muted: true,
          poster: 'thumbnail.jpg',
          preload: 'metadata',
          id: 'main-video',
          classes: ['video-player'],
        },
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toContain('src="clip.mp4"');
      expect(result.text).toContain('width="640"');
      expect(result.text).toContain('height="480"');
      expect(result.text).toContain('loop');
      expect(result.text).toContain('autoplay');
      expect(result.text).toContain('controls');
      expect(result.text).toContain('muted');
      expect(result.text).toContain('poster="thumbnail.jpg"');
      expect(result.text).toContain('preload="metadata"');
      expect(result.text).toContain('id="main-video"');
      expect(result.text).toContain('class="video-player"');
    });
  });

  describe('EmbedNode rendering', () => {
    it('renders basic embed', () => {
      const node: EmbedNode = {
        type: 'embed',
        src: 'https://example.com/widget',
        attributes: {},
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toContain('src="https://example.com/widget"');
      expect(result.text).toContain('frameborder="0"');
      expect(result.text).toContain('allowfullscreen');
    });

    it('renders embed with all attributes', () => {
      const node: EmbedNode = {
        type: 'embed',
        src: 'https://youtube.com/embed/xyz',
        attributes: {
          width: '560',
          height: '315',
          id: 'video-embed',
          classes: ['embed-responsive'],
          sandbox: true,
          allow: 'accelerometer; autoplay; clipboard-write',
        },
        location: createLocation(),
      };

      const result = renderer.render([node]);
      expect(result.text).toContain('src="https://youtube.com/embed/xyz"');
      expect(result.text).toContain('width="560"');
      expect(result.text).toContain('height="315"');
      expect(result.text).toContain('id="video-embed"');
      expect(result.text).toContain('class="embed-responsive"');
      expect(result.text).toContain('sandbox');
      expect(result.text).toContain('allow="accelerometer; autoplay; clipboard-write"');
    });
  });
});

describe('ContentRenderer - Mixed Content', () => {
  let context: WhiskerRuntimeContext;
  let renderer: ContentRenderer;

  beforeEach(() => {
    context = createMockContext();
    renderer = new ContentRenderer(context);
  });

  it('renders mixed text and rich content', () => {
    const nodes: ContentNode[] = [
      createTextNode('Regular text, '),
      {
        type: 'formatted_text',
        format: 'bold',
        content: [createTextNode('bold text')],
        location: createLocation(),
      } as FormattedTextNode,
      createTextNode(', and more.'),
    ];

    const result = renderer.render(nodes);
    expect(result.text).toBe('Regular text, <strong>bold text</strong>, and more.');
  });

  it('renders complex nested content', () => {
    const listItem: ListItemNode = {
      type: 'list_item',
      content: [
        createTextNode('Item with '),
        {
          type: 'formatted_text',
          format: 'code',
          content: [createTextNode('inline code')],
          location: createLocation(),
        } as FormattedTextNode,
      ],
      location: createLocation(),
    };

    const blockquote: BlockquoteNode = {
      type: 'blockquote',
      content: [
        {
          type: 'list',
          ordered: false,
          items: [listItem],
          location: createLocation(),
        } as ListNode,
      ],
      depth: 1,
      location: createLocation(),
    };

    const result = renderer.render([blockquote]);
    expect(result.text).toContain('<blockquote>');
    expect(result.text).toContain('<ul>');
    expect(result.text).toContain('<code>inline code</code>');
    expect(result.text).toContain('</blockquote>');
  });
});
