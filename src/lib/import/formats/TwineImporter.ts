/**
 * Twine Importer
 *
 * Imports stories from Twine HTML format (Harlowe, SugarCube, Chapbook, Snowman).
 * Converts Twine passages and links to Whisker format.
 */

import { Story } from '../../models/Story';
import { Passage } from '../../models/Passage';
import { Variable } from '../../models/Variable';
import type {
  ImportContext,
  ImportResult,
  IImporter,
} from '../types';
import { nanoid } from 'nanoid';

/**
 * Supported Twine story formats
 */
export enum TwineFormat {
  HARLOWE = 'harlowe',
  SUGARCUBE = 'sugarcube',
  CHAPBOOK = 'chapbook',
  SNOWMAN = 'snowman',
  UNKNOWN = 'unknown',
}

/**
 * Parsed Twine story structure
 */
interface TwineStory {
  title: string;
  author?: string;
  ifid: string;
  format: string;
  formatVersion: string;
  startNode: string;
  passages: TwinePassage[];
}

/**
 * Parsed Twine passage
 */
interface TwinePassage {
  pid: string;
  name: string;
  tags: string[];
  position: { x: number; y: number };
  size: { width: number; height: number };
  text: string;
}

/**
 * Twine Importer
 *
 * Imports stories from Twine HTML format with format detection and conversion.
 */
export class TwineImporter implements IImporter {
  readonly name = 'Twine Importer';
  readonly format = 'twine' as const;
  readonly extensions = ['.html', '.htm'];

  /**
   * Import a story from Twine HTML
   */
  async import(context: ImportContext): Promise<ImportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Parse HTML
      const html = typeof context.data === 'string'
        ? context.data
        : JSON.stringify(context.data);

      // Validate it's Twine HTML
      if (!this.isTwineHTML(html)) {
        throw new Error('Not a valid Twine HTML file');
      }

      // Parse Twine structure
      const twineStory = this.parseTwineHTML(html);

      if (!twineStory.title) {
        warnings.push('Story has no title - using default');
      }

      if (twineStory.passages.length === 0) {
        throw new Error('No passages found in Twine HTML');
      }

      // Detect story format
      const storyFormat = this.detectFormat(twineStory);
      if (storyFormat === TwineFormat.UNKNOWN) {
        warnings.push('Could not detect Twine format - using basic conversion');
      }

      // Convert to Whisker format
      const story = this.convertToWhisker(twineStory, storyFormat, warnings);

      // Validate story structure
      if (story.passages.size === 0) {
        throw new Error('Conversion resulted in no passages');
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        story,
        duration,
        passageCount: story.passages.size,
        variableCount: story.variables.size,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Check if data is Twine HTML
   */
  canImport(data: string | object): boolean {
    try {
      const html = typeof data === 'string' ? data : JSON.stringify(data);
      return this.isTwineHTML(html);
    } catch {
      return false;
    }
  }

  /**
   * Validate Twine import data
   */
  validate(data: string | object): string[] {
    const errors: string[] = [];

    try {
      const html = typeof data === 'string' ? data : JSON.stringify(data);

      if (!this.isTwineHTML(html)) {
        errors.push('Not a valid Twine HTML file');
        return errors;
      }

      const twineStory = this.parseTwineHTML(html);

      if (!twineStory.title) {
        errors.push('Story has no title');
      }

      if (twineStory.passages.length === 0) {
        errors.push('No passages found');
      }
    } catch (error) {
      errors.push('Failed to parse Twine HTML');
    }

    return errors;
  }

  /**
   * Get format version from Twine data
   */
  getFormatVersion(data: string | object): string {
    try {
      const html = typeof data === 'string' ? data : JSON.stringify(data);
      const match = html.match(/<tw-storydata[^>]*format-version="([^"]*)"/i);
      return match ? match[1] : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Check if string is Twine HTML
   */
  private isTwineHTML(html: string): boolean {
    return html.includes('<tw-storydata') || html.includes('<tw-passagedata');
  }

  /**
   * Parse Twine HTML format
   */
  private parseTwineHTML(html: string): TwineStory {
    const story: TwineStory = {
      title: '',
      author: '',
      ifid: '',
      format: '',
      formatVersion: '',
      startNode: '',
      passages: [],
    };

    // Extract story metadata from tw-storydata tag
    const storyDataMatch = html.match(/<tw-storydata([^>]*)>/i);
    if (storyDataMatch) {
      const attrs = storyDataMatch[1];
      story.title = this.extractAttribute(attrs, 'name') || 'Untitled';
      story.ifid = this.extractAttribute(attrs, 'ifid') || '';
      story.format = this.extractAttribute(attrs, 'format') || '';
      story.formatVersion = this.extractAttribute(attrs, 'format-version') || '';
      story.startNode = this.extractAttribute(attrs, 'startnode') || '';
    }

    // Extract passages
    const passageRegex = /<tw-passagedata([^>]*)>(.*?)<\/tw-passagedata>/gis;
    let match;

    while ((match = passageRegex.exec(html)) !== null) {
      const attrs = match[1];
      const text = match[2];

      const passage = this.parsePassageHTML(attrs, text);
      if (passage) {
        story.passages.push(passage);
      }
    }

    return story;
  }

  /**
   * Parse individual passage from HTML
   */
  private parsePassageHTML(attrs: string, text: string): TwinePassage | null {
    const pid = this.extractAttribute(attrs, 'pid') || '';
    const name = this.extractAttribute(attrs, 'name') || '';
    const tagsStr = this.extractAttribute(attrs, 'tags') || '';
    const positionStr = this.extractAttribute(attrs, 'position') || '';
    const sizeStr = this.extractAttribute(attrs, 'size') || '';

    if (!pid || !name) {
      return null;
    }

    // Parse tags
    const tags = tagsStr ? tagsStr.split(/\s+/).filter(t => t.length > 0) : [];

    // Parse position
    let position = { x: 0, y: 0 };
    if (positionStr) {
      const [x, y] = positionStr.split(',').map(Number);
      if (!isNaN(x) && !isNaN(y)) {
        position = { x, y };
      }
    }

    // Parse size
    let size = { width: 100, height: 100 };
    if (sizeStr) {
      const [w, h] = sizeStr.split(',').map(Number);
      if (!isNaN(w) && !isNaN(h)) {
        size = { width: w, height: h };
      }
    }

    // Decode HTML entities
    const decodedText = this.decodeHTMLEntities(text);

    return {
      pid,
      name,
      tags,
      position,
      size,
      text: decodedText,
    };
  }

  /**
   * Extract attribute value from HTML string
   */
  private extractAttribute(html: string, attrName: string): string | null {
    const regex = new RegExp(`${attrName}="([^"]*)"`, 'i');
    const match = html.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Decode HTML entities
   */
  private decodeHTMLEntities(text: string): string {
    const entities: Record<string, string> = {
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&amp;': '&',
      '&#39;': "'",
      '&#x27;': "'",
    };

    let result = text;
    for (const [entity, char] of Object.entries(entities)) {
      result = result.replace(new RegExp(entity, 'g'), char);
    }

    return result;
  }

  /**
   * Detect Twine story format
   */
  private detectFormat(story: TwineStory): TwineFormat {
    const formatLower = story.format.toLowerCase();

    if (formatLower.includes('harlowe')) {
      return TwineFormat.HARLOWE;
    } else if (formatLower.includes('sugarcube')) {
      return TwineFormat.SUGARCUBE;
    } else if (formatLower.includes('chapbook')) {
      return TwineFormat.CHAPBOOK;
    } else if (formatLower.includes('snowman')) {
      return TwineFormat.SNOWMAN;
    }

    // Try to detect from passage content
    for (const passage of story.passages) {
      const text = passage.text;

      // Harlowe detection
      if (text.match(/\(\s*(?:set:|if:|print:\s*\$)/)) {
        return TwineFormat.HARLOWE;
      }

      // SugarCube detection
      if (text.match(/<<(set|if|print)\s+/)) {
        return TwineFormat.SUGARCUBE;
      }

      // Chapbook detection
      if (text.match(/\[\s*if\s+|\[continued\]/)) {
        return TwineFormat.CHAPBOOK;
      }
    }

    return TwineFormat.UNKNOWN;
  }

  /**
   * Convert Twine story to Whisker format
   */
  private convertToWhisker(
    twineStory: TwineStory,
    storyFormat: TwineFormat,
    warnings: string[]
  ): Story {
    // Track passage ID mapping (Twine PID -> Whisker ID)
    const pidToId = new Map<string, string>();
    const passagesRecord: Record<string, any> = {};

    // First pass: Create all passages
    for (const twinePassage of twineStory.passages) {
      const id = nanoid();
      pidToId.set(twinePassage.pid, id);

      // Convert passage text
      const convertedText = this.convertPassageText(
        twinePassage.text,
        storyFormat,
        warnings
      );

      passagesRecord[id] = {
        id,
        title: twinePassage.name,
        content: convertedText,
        position: twinePassage.position,
        size: twinePassage.size,
        choices: [], // Will be populated from links
        tags: twinePassage.tags,
      };
    }

    // Find start passage ID
    let startPassageId = '';
    if (twineStory.startNode) {
      startPassageId = pidToId.get(twineStory.startNode) || '';
    }

    // Fallback to common start passage names (check in priority order)
    if (!startPassageId) {
      const priorityNames = ['start', 'begin', 'intro'];
      for (const priorityName of priorityNames) {
        for (const [id, passageData] of Object.entries(passagesRecord)) {
          const nameLower = passageData.title.toLowerCase();
          if (nameLower === priorityName) {
            startPassageId = id;
            break;
          }
        }
        if (startPassageId) break;
      }
    }

    // If still no start passage, use first passage
    if (!startPassageId && Object.keys(passagesRecord).length > 0) {
      startPassageId = Object.keys(passagesRecord)[0];
      warnings.push('No start passage specified - using first passage');
    }

    // Create Story with pre-built passages
    const story = new Story({
      metadata: {
        title: twineStory.title || 'Untitled Story',
        author: twineStory.author || '',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        ifid: twineStory.ifid || undefined,
      },
      startPassage: startPassageId,
      passages: passagesRecord,
      variables: {},
    });

    // Second pass: Extract links and create choices
    story.passages.forEach((passage) => {
      const links = this.extractLinks(passage.content);

      for (const link of links) {
        // Find target passage by name
        const targetPassage = Array.from(story.passages.values()).find(
          (p) => p.title === link.target
        );

        if (targetPassage) {
          passage.addChoice({
            id: nanoid(),
            text: link.text,
            target: targetPassage.id,
          });
        } else {
          warnings.push(
            `Broken link in passage "${passage.title}": target "${link.target}" not found`
          );
        }
      }
    });

    // Extract variables (basic detection)
    this.extractVariables(story, warnings);

    return story;
  }

  /**
   * Convert passage text from Twine format to Whisker format
   */
  private convertPassageText(
    text: string,
    format: TwineFormat,
    warnings: string[]
  ): string {
    switch (format) {
      case TwineFormat.HARLOWE:
        return this.convertFromHarlowe(text, warnings);
      case TwineFormat.SUGARCUBE:
        return this.convertFromSugarCube(text, warnings);
      case TwineFormat.CHAPBOOK:
        return this.convertFromChapbook(text, warnings);
      default:
        return text;
    }
  }

  /**
   * Convert from Harlowe syntax
   */
  private convertFromHarlowe(text: string, warnings: string[]): string {
    let converted = text;

    // Convert (set: $var to value) -> {{var = value}}
    converted = converted.replace(
      /\(\s*set:\s*\$(\w+)\s+to\s+([^)]+)\)/gi,
      (_, varName, value) => {
        return `{{${varName} = ${value.trim()}}}`;
      }
    );

    // Convert (if: condition)[text] -> {{if condition then}}text{{end}}
    // This is a simplified conversion - Harlowe's if syntax is complex
    converted = converted.replace(
      /\(\s*if:\s*([^)]+)\)\[([^\]]+)\]/gi,
      (_, cond, body) => {
        return `{{if ${cond.trim()} then}}${body}{{end}}`;
      }
    );

    // Convert (print: $var) -> {{var}}
    converted = converted.replace(
      /\(\s*print:\s*\$(\w+)\)/gi,
      (_, varName) => {
        return `{{${varName}}}`;
      }
    );

    // Warn about complex Harlowe features
    if (text.match(/\(\s*(either:|random:|datamap:|dataset:)/i)) {
      warnings.push('Some advanced Harlowe features may not convert correctly');
    }

    return converted;
  }

  /**
   * Convert from SugarCube syntax
   */
  private convertFromSugarCube(text: string, warnings: string[]): string {
    let converted = text;

    // Convert <<set $var to value>> -> {{var = value}}
    converted = converted.replace(
      /<<set\s+\$(\w+)\s+(?:to|=)\s+([^>]+)>>/gi,
      (_, varName, value) => {
        return `{{${varName} = ${value.trim()}}}`;
      }
    );

    // Convert <<if condition>>text<<endif>> -> {{if condition then}}text{{end}}
    // Also convert $var in conditions to {{var}}
    // Use non-greedy match for condition to handle > operators
    converted = converted.replace(
      /<<if\s+(.*?)>>(.+?)<<\/?endif>>/gis,
      (_, cond, body) => {
        // Convert $var in condition
        const convertedCond = cond.trim().replace(/\$(\w+)/g, '{{$1}}');
        return `{{if ${convertedCond} then}}${body.trim()}{{end}}`;
      }
    );

    // Convert <<print $var>> -> {{var}}
    converted = converted.replace(
      /<<print\s+\$(\w+)>>/gi,
      (_, varName) => {
        return `{{${varName}}}`;
      }
    );

    // Convert standalone $var -> {{var}} (but not inside {{}} already)
    converted = converted.replace(
      /\$(\w+)(?![^{]*}})/g,
      (match, varName) => {
        return `{{${varName}}}`;
      }
    );

    // Warn about complex SugarCube features
    if (text.match(/<<(include|widget|script|button|textbox|radio)/i)) {
      warnings.push('Some advanced SugarCube features may not convert correctly');
    }

    return converted;
  }

  /**
   * Convert from Chapbook syntax
   */
  private convertFromChapbook(text: string, warnings: string[]): string {
    let converted = text;

    // Convert [if condition] -> {{if condition then}}
    converted = converted.replace(
      /\[if\s+([^\]]+)\]/gi,
      (_, cond) => {
        return `{{if ${cond.trim()} then}}`;
      }
    );

    // Convert [continued] -> {{end}}
    converted = converted.replace(/\[continued\]/gi, '{{end}}');

    // Convert variable.name = value -> {{variable.name = value}}
    // This is tricky as we need to avoid converting regular text
    // We'll skip this for now to avoid false positives

    warnings.push('Chapbook conversion is experimental - please verify output');

    return converted;
  }

  /**
   * Extract links from passage text
   */
  private extractLinks(text: string): Array<{ text: string; target: string }> {
    const links: Array<{ text: string; target: string }> = [];
    const seen = new Set<string>();

    // Match [[text->target]] pattern
    const arrowRegex = /\[\[([^\]]+?)->([^\]]+?)\]\]/g;
    let match;

    while ((match = arrowRegex.exec(text)) !== null) {
      const display = match[1].trim();
      const target = match[2].trim();
      const key = `${display}:${target}`;

      if (!seen.has(key)) {
        links.push({ text: display, target });
        seen.add(key);
      }
    }

    // Match [[target]] pattern (text and target are same)
    const simpleRegex = /\[\[([^\]]+?)\]\]/g;

    while ((match = simpleRegex.exec(text)) !== null) {
      const content = match[1].trim();

      // Skip if it has an arrow (already handled)
      if (content.includes('->')) {
        continue;
      }

      const key = `${content}:${content}`;
      if (!seen.has(key)) {
        links.push({ text: content, target: content });
        seen.add(key);
      }
    }

    return links;
  }

  /**
   * Extract and create variables from story content
   */
  private extractVariables(story: Story, warnings: string[]): void {
    const variableNames = new Set<string>();

    // Scan all passages for variable references
    story.passages.forEach((passage) => {
      const text = passage.content;

      // Match {{varName}} and {{varName = value}}
      const varRegex = /\{\{(\w+)(?:\s*=\s*[^}]+)?\}\}/g;
      let match;

      while ((match = varRegex.exec(text)) !== null) {
        variableNames.add(match[1]);
      }
    });

    // Create variables with default values
    variableNames.forEach((name) => {
      const variable = new Variable({
        name,
        type: 'string',
        initial: '',
      });
      story.addVariable(variable);
    });

    if (variableNames.size > 0) {
      warnings.push(
        `Extracted ${variableNames.size} variable(s) - please verify types and initial values`
      );
    }
  }
}
