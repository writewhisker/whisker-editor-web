/**
 * Twine Format Adapter
 *
 * Provides bi-directional conversion between Whisker stories and Twine format.
 * Supports Twine 2.x story formats including Harlowe, Sugarcube, and Snowman.
 */

import { Story, Passage, Variable } from '@writewhisker/story-models';

export interface TwineStory {
  name: string;
  ifid: string;
  startPassage: string;
  format: string;
  formatVersion: string;
  passages: TwinePassage[];
  metadata?: Record<string, any>;
}

export interface TwinePassage {
  pid: string;
  name: string;
  tags?: string[];
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  text: string;
}

export interface TwineLink {
  text: string;
  target: string;
  passage: string;
}

/**
 * Converts a Whisker Story to Twine format
 */
export class TwineExporter {
  /**
   * Export story to Twine 2 HTML format
   */
  public exportToHTML(story: Story): string {
    const twineStory = this.convertToTwine(story);
    return this.generateHTML(twineStory);
  }

  /**
   * Export story to Twine 2 Archive format
   */
  public exportToArchive(story: Story): string {
    const twineStory = this.convertToTwine(story);
    return this.generateArchive(twineStory);
  }

  /**
   * Convert Whisker Story to Twine structure
   */
  public convertToTwine(story: Story): TwineStory {
    let pid = 1;
    const passages = story.mapPassages((passage) => {
      return this.convertPassageToTwine(passage, pid++);
    });

    // Get the start passage title from the story (Twine uses passage names, not IDs)
    const startPassageTitle = story.passages.get(story.startPassage)?.title
      || passages[0]?.name
      || 'Start';

    return {
      name: story.metadata.title,
      ifid: story.metadata.ifid || this.generateIFID(),
      startPassage: startPassageTitle,
      format: 'Harlowe',
      formatVersion: '3.3.8',
      passages,
      metadata: story.metadata,
    };
  }

  private convertPassageToTwine(passage: Passage, pid: number): TwinePassage {
    return {
      pid: pid.toString(),
      name: passage.title,
      tags: passage.tags,
      position: passage.position,
      size: passage.size,
      text: this.convertContentToTwine(passage.content),
    };
  }

  private convertContentToTwine(content: string): string {
    // Convert Whisker markup to Twine markup
    // For now, keep content as-is (both use similar [[link]] syntax)
    return content;
  }

  private generateHTML(twineStory: TwineStory): string {
    const passagesHTML = twineStory.passages
      .map(p => this.generatePassageHTML(p))
      .join('\n');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${this.escapeHTML(twineStory.name)}</title>
</head>
<body>
<tw-storydata name="${this.escapeHTML(twineStory.name)}"
             startnode="${this.escapeHTML(twineStory.startPassage)}"
             creator="Whisker Editor"
             creator-version="1.0.0"
             ifid="${twineStory.ifid}"
             format="${twineStory.format}"
             format-version="${twineStory.formatVersion}">
${passagesHTML}
</tw-storydata>
</body>
</html>`;
  }

  private generatePassageHTML(passage: TwinePassage): string {
    const tags = passage.tags?.join(' ') || '';
    const pos = passage.position ? `position="${passage.position.x},${passage.position.y}"` : '';
    const size = passage.size ? `size="${passage.size.width},${passage.size.height}"` : '';

    return `  <tw-passagedata pid="${passage.pid}" name="${this.escapeHTML(passage.name)}" tags="${tags}" ${pos} ${size}>${this.escapeHTML(passage.text)}</tw-passagedata>`;
  }

  private generateArchive(twineStory: TwineStory): string {
    // Twine Archive format is similar to HTML but with different structure
    return this.generateHTML(twineStory);
  }

  private generateIFID(): string {
    // Generate UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/**
 * Converts Twine format to Whisker Story
 */
export class TwineImporter {
  /**
   * Import from Twine 2 HTML format
   */
  public importFromHTML(html: string): Story {
    const twineStory = this.parseHTML(html);
    return this.convertToWhisker(twineStory);
  }

  /**
   * Import from Twine Archive format
   */
  public importFromArchive(archive: string): Story {
    return this.importFromHTML(archive);
  }

  /**
   * Parse Twine HTML to structure
   */
  public parseHTML(html: string): TwineStory {
    // Simple regex-based parsing (in production, use DOMParser)
    // Extract attributes from tw-storydata tag specifically
    const storydataMatch = html.match(/<tw-storydata([^>]*)>/);
    const storydataAttrs = storydataMatch?.[1] || '';

    const nameMatch = storydataAttrs.match(/name="([^"]+)"/);
    const ifidMatch = storydataAttrs.match(/ifid="([^"]+)"/);
    const startMatch = storydataAttrs.match(/startnode="([^"]+)"/);
    const formatMatch = storydataAttrs.match(/format="([^"]+)"/);
    const formatVersionMatch = storydataAttrs.match(/format-version="([^"]+)"/);

    const passages = this.extractPassages(html);

    return {
      name: this.unescapeHTML(nameMatch?.[1] || 'Untitled'),
      ifid: ifidMatch?.[1] || '',
      startPassage: startMatch?.[1] || passages[0]?.name || 'Start',
      format: formatMatch?.[1] || 'Harlowe',
      formatVersion: formatVersionMatch?.[1] || '3.3.8',
      passages,
    };
  }

  private extractPassages(html: string): TwinePassage[] {
    const passages: TwinePassage[] = [];
    const passageRegex = /<tw-passagedata[^>]*>(.*?)<\/tw-passagedata>/gs;
    let match;

    while ((match = passageRegex.exec(html)) !== null) {
      const passageHTML = match[0];
      const pidMatch = passageHTML.match(/pid="([^"]+)"/);
      const nameMatch = passageHTML.match(/name="([^"]+)"/);
      const tagsMatch = passageHTML.match(/tags="([^"]*)"/); // Allow empty tags
      const posMatch = passageHTML.match(/position="([^"]+)"/);
      const sizeMatch = passageHTML.match(/size="([^"]+)"/);

      const text = match[1];

      const passage: TwinePassage = {
        pid: pidMatch?.[1] || '',
        name: this.unescapeHTML(nameMatch?.[1] || ''),
        text: this.unescapeHTML(text),
        tags: tagsMatch ? tagsMatch[1].split(' ').filter(t => t) : undefined,
      };

      if (posMatch?.[1]) {
        const [x, y] = posMatch[1].split(',').map(Number);
        passage.position = { x, y };
      }

      if (sizeMatch?.[1]) {
        const [width, height] = sizeMatch[1].split(',').map(Number);
        passage.size = { width, height };
      }

      passages.push(passage);
    }

    return passages;
  }

  /**
   * Convert Twine structure to Whisker Story
   */
  public convertToWhisker(twineStory: TwineStory): Story {
    const passages = twineStory.passages.map(p => this.convertPassageToWhisker(p));

    const story = new Story({
      metadata: {
        title: twineStory.name,
        author: '',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        ifid: twineStory.ifid || this.generateId(),
        ...twineStory.metadata,
      },
      startPassage: twineStory.startPassage,
    });

    // Clear the default passage created by the Story constructor
    story.passages.clear();

    // Add passages to story
    for (const passage of passages) {
      story.passages.set(passage.id, passage);
    }

    // Restore the correct startPassage (constructor may have overwritten it with a random ID)
    story.startPassage = twineStory.startPassage || (passages.length > 0 ? passages[0].id : '');

    return story;
  }

  private convertPassageToWhisker(passage: TwinePassage): Passage {
    return new Passage({
      id: passage.name, // Use passage name as ID (consistent with Twine's startPassage reference)
      title: passage.name,
      content: this.convertContentToWhisker(passage.text),
      tags: passage.tags || [],
      position: passage.position,
      size: passage.size,
    });
  }

  private convertContentToWhisker(content: string): string {
    // Convert Twine markup to Whisker markup
    // Both use similar [[link]] syntax, so minimal conversion needed
    return content;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private unescapeHTML(text: string): string {
    return text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, '&');
  }
}

/**
 * Extract links from Twine passage text
 */
export function extractTwineLinks(text: string): TwineLink[] {
  const links: TwineLink[] = [];
  const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const firstPart = match[1];
    const secondPart = match[2];

    // [[Target]] or [[Link Text|Target]]
    const text = secondPart || firstPart;
    const target = secondPart ? firstPart : firstPart;

    links.push({
      text,
      target,
      passage: fullMatch,
    });
  }

  return links;
}

/**
 * Main adapter class
 */
export class TwineAdapter {
  private exporter = new TwineExporter();
  private importer = new TwineImporter();

  public export(story: Story, format: 'html' | 'archive' = 'html'): string {
    return format === 'html'
      ? this.exporter.exportToHTML(story)
      : this.exporter.exportToArchive(story);
  }

  public import(content: string, format: 'html' | 'archive' = 'html'): Story {
    return format === 'html'
      ? this.importer.importFromHTML(content)
      : this.importer.importFromArchive(content);
  }

  public extractLinks(text: string): TwineLink[] {
    return extractTwineLinks(text);
  }
}
