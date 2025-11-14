/**
 * Twine Importer
 *
 * Imports stories from Twine HTML format (Harlowe, SugarCube, Chapbook, Snowman).
 * Converts Twine passages and links to Whisker format.
 */

import { Story } from '@whisker/core-ts';
import { Passage } from '@whisker/core-ts';
import { Variable } from '@whisker/core-ts';
import { Choice } from '@whisker/core-ts';
import type {
  ImportContext,
  ImportResult,
  IImporter,
  ConversionIssue,
  ConversionSeverity,
  LossReport,
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
 * Conversion tracker for tracking issues during import
 */
class ConversionTracker {
  private issues: ConversionIssue[] = [];
  private affectedPassages: Set<string> = new Set();

  addIssue(
    severity: ConversionSeverity,
    category: string,
    feature: string,
    message: string,
    options?: {
      passageId?: string;
      passageName?: string;
      original?: string;
      suggestion?: string;
    }
  ): void {
    this.issues.push({
      severity,
      category,
      feature,
      message,
      ...options,
    });

    if (options?.passageId) {
      this.affectedPassages.add(options.passageId);
    }
  }

  buildLossReport(): LossReport {
    const critical = this.issues.filter((i) => i.severity === 'critical');
    const warnings = this.issues.filter((i) => i.severity === 'warning');
    const info = this.issues.filter((i) => i.severity === 'info');

    const categoryCounts: Record<string, number> = {};
    this.issues.forEach((issue) => {
      categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
    });

    // Calculate conversion quality (simple heuristic)
    // 100% - (critical * 10% + warnings * 3%)
    const qualityLoss = critical.length * 0.1 + warnings.length * 0.03;
    const conversionQuality = Math.max(0, Math.min(1, 1 - qualityLoss));

    return {
      totalIssues: this.issues.length,
      critical,
      warnings,
      info,
      categoryCounts,
      affectedPassages: Array.from(this.affectedPassages),
      conversionQuality,
    };
  }

  hasIssues(): boolean {
    return this.issues.length > 0;
  }
}

/**
 * Twine Importer
 *
 * Imports stories from Twine HTML format with format detection and conversion.
 */
export class TwineImporter implements IImporter {
  readonly name = 'Twine Importer';
  readonly format = 'twine' as const;
  readonly extensions = ['.html', '.htm', '.twee', '.tw'];

  /**
   * Import a story from Twine HTML
   */
  async import(context: ImportContext): Promise<ImportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const tracker = new ConversionTracker();

    // Extract conversion options (for future use)
    const conversionOptions = context.options.conversionOptions || {
      convertVariables: true,
      convertMacros: true,
      preserveOriginalSyntax: false,
      strictMode: false,
    };

    try {
      // Parse input
      const text = typeof context.data === 'string'
        ? context.data
        : JSON.stringify(context.data);

      // Determine format and parse
      let twineStory: TwineStory;
      if (this.isTwineHTML(text)) {
        twineStory = this.parseTwineHTML(text);
      } else if (this.isTwee(text)) {
        twineStory = this.parseTwee(text);
      } else {
        throw new Error('Not a valid Twine HTML or Twee file');
      }

      // Log conversion options as info
      if (conversionOptions) {
        tracker.addIssue('info', 'conversion', 'Conversion Options',
          `Using conversion options: variables=${conversionOptions.convertVariables}, macros=${conversionOptions.convertMacros}, preserve=${conversionOptions.preserveOriginalSyntax}, strict=${conversionOptions.strictMode}`);
      }

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
        tracker.addIssue('warning', 'format', 'Unknown Format',
          'Could not detect Twine story format - conversion may be incomplete');
      }

      // Convert to Whisker format
      const story = this.convertToWhisker(twineStory, storyFormat, warnings, tracker);

      // Validate story structure
      if (story.passages.size === 0) {
        throw new Error('Conversion resulted in no passages');
      }

      const duration = Date.now() - startTime;

      // Build loss report if there are any issues
      const lossReport = tracker.hasIssues() ? tracker.buildLossReport() : undefined;

      return {
        success: true,
        story,
        duration,
        passageCount: story.passages.size,
        variableCount: story.variables.size,
        warnings: warnings.length > 0 ? warnings : undefined,
        lossReport,
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
   * Check if data is Twine HTML or Twee
   */
  canImport(data: string | object): boolean {
    try {
      const text = typeof data === 'string' ? data : JSON.stringify(data);
      return this.isTwineHTML(text) || this.isTwee(text);
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
   * Check if string is Twee notation
   */
  private isTwee(text: string): boolean {
    // Twee passages start with :: PassageName
    return text.includes('::') && /^::\s+\w+/m.test(text);
  }

  /**
   * Parse Twee notation format
   */
  private parseTwee(text: string): TwineStory {
    const story: TwineStory = {
      title: 'Untitled Twee Story',
      author: '',
      ifid: nanoid(),
      format: 'twee',
      formatVersion: '3',
      startNode: '',
      passages: [],
    };

    const lines = text.split('\n');
    let currentPassage: TwinePassage | null = null;
    let passageContent: string[] = [];
    let passageId = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for passage header: :: PassageName [tag1 tag2] {"position":"100,200"}
      if (line.startsWith('::')) {
        // Save previous passage if exists
        if (currentPassage) {
          currentPassage.text = passageContent.join('\n').trim();
          story.passages.push(currentPassage);
        }

        // Parse passage header
        // Format: :: PassageName [tag1 tag2] {"position":"100,200"}
        const headerMatch = line.match(/^::\s+([^\[\{]+)(?:\s*\[([^\]]*)\])?(?:\s*\{([^}]*)\})?/);
        if (headerMatch) {
          const name = headerMatch[1].trim();
          const tagsStr = headerMatch[2]?.trim();
          const metadataStr = headerMatch[3];

          // Special passages
          if (name === 'StoryTitle') {
            passageContent = [];
            currentPassage = null;
            // Next line is the story title
            if (i + 1 < lines.length) {
              story.title = lines[i + 1].trim();
              i++; // Skip next line
            }
            continue;
          } else if (name === 'StoryData') {
            passageContent = [];
            currentPassage = null;
            // Skip StoryData JSON
            while (i + 1 < lines.length && !lines[i + 1].startsWith('::')) {
              i++;
            }
            continue;
          }

          // Parse tags
          const tags = tagsStr ? tagsStr.split(/\s+/).filter(t => t.length > 0) : [];

          // Parse position from metadata
          let position = { x: passageId * 200, y: 100 };
          if (metadataStr) {
            const posMatch = metadataStr.match(/"position"\s*:\s*"(\d+),(\d+)"/);
            if (posMatch) {
              position = { x: parseInt(posMatch[1]), y: parseInt(posMatch[2]) };
            }
          }

          const pid = String(passageId++);
          currentPassage = {
            pid,
            name,
            tags,
            position,
            size: { width: 100, height: 100 },
            text: '',
          };

          passageContent = [];

          // Set start node to first non-script/stylesheet passage if not set
          if (!story.startNode && !tags.includes('script') && !tags.includes('stylesheet')) {
            story.startNode = pid;
          }
        }
      } else if (currentPassage) {
        // Add line to current passage content
        passageContent.push(line);
      }
    }

    // Save last passage
    if (currentPassage) {
      currentPassage.text = passageContent.join('\n').trim();
      story.passages.push(currentPassage);
    }

    return story;
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
    warnings: string[],
    tracker: ConversionTracker
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
        warnings,
        tracker,
        id,
        twinePassage.name
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
        const targetPassage = Array.from(story.passages.values() as Iterable<Passage>).find(
          (p) => p.title === link.target
        );

        if (targetPassage) {
          passage.addChoice(new Choice({
            id: nanoid(),
            text: link.text,
            target: targetPassage.id,
          }));
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
    warnings: string[],
    tracker: ConversionTracker,
    passageId?: string,
    passageName?: string
  ): string {
    switch (format) {
      case TwineFormat.HARLOWE:
        return this.convertFromHarlowe(text, warnings, tracker, passageId, passageName);
      case TwineFormat.SUGARCUBE:
        return this.convertFromSugarCube(text, warnings, tracker, passageId, passageName);
      case TwineFormat.CHAPBOOK:
        return this.convertFromChapbook(text, warnings, tracker, passageId, passageName);
      case TwineFormat.SNOWMAN:
        return this.convertFromSnowman(text, warnings, tracker, passageId, passageName);
      default:
        return text;
    }
  }

  /**
   * Convert from Harlowe syntax (with advanced features)
   */
  private convertFromHarlowe(
    text: string,
    warnings: string[],
    tracker: ConversionTracker,
    passageId?: string,
    passageName?: string
  ): string {
    let converted = text;

    // Track unsupported data structures
    const dataStructures = text.match(/\(\s*(datamap:|dataset:|dataarray:)/gi);
    if (dataStructures) {
      tracker.addIssue('warning', 'data-structure', 'Harlowe Data Structures',
        'Harlowe data structures (datamap, dataset, dataarray) are not directly supported', {
          passageId,
          passageName,
          suggestion: 'Consider using simple variables or JSON objects'
        });
    }

    // Track named hooks
    const namedHooks = text.match(/\|(\w+)>/g);
    if (namedHooks) {
      tracker.addIssue('info', 'syntax', 'Named Hooks',
        'Harlowe named hooks will be converted to regular text', {
          passageId,
          passageName,
          suggestion: 'Named hooks functionality is not preserved - structure may need adjustment'
        });
    }

    // Track hook references
    if (text.match(/\?(\w+)/)) {
      tracker.addIssue('warning', 'syntax', 'Hook References',
        'Harlowe hook references (?hookname) cannot be converted', {
          passageId,
          passageName,
          original: text.match(/\?(\w+)/)?.[0],
          suggestion: 'Restructure to avoid dynamic hook references'
        });
    }

    // Track random/either macros
    if (text.match(/\(\s*(either:|random:)/i)) {
      tracker.addIssue('warning', 'macro', 'Random/Either',
        'Harlowe (either:) and (random:) macros are not supported', {
          passageId,
          passageName,
          suggestion: 'Implement randomness using Whisker scripts'
        });
    }

    // Convert (set: $var to value) -> {{var = value}}
    converted = converted.replace(
      /\(\s*set:\s*\$(\w+)\s+to\s+([^)]+)\)/gi,
      (_, varName, value) => {
        return `{{${varName} = ${value.trim()}}}`;
      }
    );

    // Convert (put: value into $var) -> {{var = value}}
    converted = converted.replace(
      /\(\s*put:\s+([^)]+)\s+into\s+\$(\w+)\)/gi,
      (_, value, varName) => {
        return `{{${varName} = ${value.trim()}}}`;
      }
    );

    // Convert (if: condition)[text] -> {{if condition then}}text{{end}}
    converted = converted.replace(
      /\(\s*if:\s*([^)]+)\)\[([^\]]+)\]/gi,
      (_, cond, body) => {
        // Convert $var to {{var}} in condition
        const convertedCond = cond.trim().replace(/\$(\w+)/g, '{{$1}}');
        return `{{if ${convertedCond} then}}${body}{{end}}`;
      }
    );

    // Convert (else-if: condition)[text] chains
    converted = converted.replace(
      /\(\s*else-if:\s*([^)]+)\)\[([^\]]+)\]/gi,
      (_, cond, body) => {
        const convertedCond = cond.trim().replace(/\$(\w+)/g, '{{$1}}');
        return `{{elseif ${convertedCond} then}}${body}`;
      }
    );

    // Convert (else:)[text]
    converted = converted.replace(
      /\(\s*else:\s*\)\[([^\]]+)\]/gi,
      (_, body) => {
        return `{{else}}${body}{{end}}`;
      }
    );

    // Convert (print: $var) -> {{var}}
    converted = converted.replace(
      /\(\s*print:\s*\$(\w+)\)/gi,
      (_, varName) => {
        return `{{${varName}}}`;
      }
    );

    // Convert $var in text (but Harlowe uses $ less commonly than SugarCube)
    converted = converted.replace(
      /\$(\w+)(?![^{]*}})/g,
      (match, varName) => {
        return `{{${varName}}}`;
      }
    );

    // Track (transition:) and (transition-time:) macros
    const transitionMatch = text.match(/\(\s*transition(-time)?:/i);
    if (transitionMatch) {
      tracker.addIssue('info', 'macro', 'Transitions',
        'Harlowe transition effects are not supported', {
          passageId,
          passageName,
          original: transitionMatch[0],
          suggestion: 'Transitions will be removed from converted text'
        });
    }

    // Track (live:) and (event:) macros
    if (text.match(/\(\s*(live|event):/i)) {
      tracker.addIssue('warning', 'macro', 'Live/Event Macros',
        'Harlowe (live:) and (event:) macros are not supported', {
          passageId,
          passageName,
          suggestion: 'Convert to passage-based interactivity'
        });
    }

    // Remove transition macros (can't convert)
    converted = converted.replace(/\(\s*transition(-time)?:[^)]*\)/gi, '');

    // Remove live/event macros (can't convert)
    converted = converted.replace(/\(\s*(live|event):[^)]*\)/gi, '');

    // Remove named hook markers |name> (convert to regular text)
    converted = converted.replace(/\|(\w+)>/g, '');

    return converted;
  }

  /**
   * Convert from SugarCube syntax (with advanced features)
   */
  private convertFromSugarCube(
    text: string,
    warnings: string[],
    tracker: ConversionTracker,
    passageId?: string,
    passageName?: string
  ): string {
    let converted = text;

    // Track unsupported macros
    const unsupportedMacros = text.match(/<<(include|widget|script|createaudiotrack|createplaylist|cacheaudio|waitforaudio|playlist|removeaudiotrack)[\s>]/gi);
    if (unsupportedMacros) {
      unsupportedMacros.forEach((macro) => {
        const macroName = macro.match(/<<(\w+)/)?.[1] || 'unknown';
        tracker.addIssue('critical', 'macro', `<<${macroName}>>`,
          `SugarCube macro <<${macroName}>> is not supported`, {
            passageId,
            passageName,
            original: macro,
            suggestion: macroName === 'include' ? 'Manually merge included passage content' :
                       macroName === 'widget' ? 'Convert widget to regular passage' :
                       'This feature requires manual implementation'
          });
      });
    }

    // Track UI macros (warning level)
    const uiMacros = text.match(/<<(button|checkbox|cycle|link|linkappend|linkreplace|linkrepeat|listbox|numberbox|radiobutton|textarea|textbox)[\s>]/gi);
    if (uiMacros) {
      uiMacros.forEach((macro) => {
        const macroName = macro.match(/<<(\w+)/)?.[1] || 'unknown';
        tracker.addIssue('warning', 'ui', `<<${macroName}>>`,
          `UI macro <<${macroName}>> will be converted to simple text`, {
            passageId,
            passageName,
            original: macro,
            suggestion: 'Consider using Whisker choice system for interactive elements'
          });
      });
    }

    // Convert <<set $var to value>> and <<set $var = value>>
    converted = converted.replace(
      /<<set\s+\$(\w+)\s+(?:to|=)\s+([^>]+)>>/gi,
      (_, varName, value) => {
        return `{{${varName} = ${value.trim()}}}`;
      }
    );

    // Convert <<if>><<elseif>><<else>><<endif>> chains
    converted = converted.replace(
      /<<if\s+(.*?)>>(.*?)(?:<<elseif\s+(.*?)>>(.*?))*(?:<<else>>(.*?))?<<\/?endif>>/gis,
      (match) => {
        // Parse the if/elseif/else chain
        let result = match;

        // Convert <<if condition>>
        result = result.replace(/<<if\s+(.*?)>>/gi, (_, cond) => {
          const convertedCond = cond.trim().replace(/\$(\w+)/g, '{{$1}}');
          return `{{if ${convertedCond} then}}`;
        });

        // Convert <<elseif condition>>
        result = result.replace(/<<elseif\s+(.*?)>>/gi, (_, cond) => {
          const convertedCond = cond.trim().replace(/\$(\w+)/g, '{{$1}}');
          return `{{elseif ${convertedCond} then}}`;
        });

        // Convert <<else>>
        result = result.replace(/<<else>>/gi, '{{else}}');

        // Convert <<endif>>
        result = result.replace(/<<\/?endif>>/gi, '{{end}}');

        return result;
      }
    );

    // Convert <<print $var>> and <<print expression>>
    converted = converted.replace(
      /<<print\s+\$(\w+)>>/gi,
      (_, varName) => {
        return `{{${varName}}}`;
      }
    );

    // Convert <<= $var>> (short form)
    converted = converted.replace(
      /<<= \s*\$(\w+)\s*>>/gi,
      (_, varName) => {
        return `{{${varName}}}`;
      }
    );

    // Convert temp variables (_var) - track as info
    if (text.match(/_\w+/)) {
      tracker.addIssue('info', 'variable', 'Temporary Variables',
        'SugarCube temporary variables (_var) converted to regular variables', {
          passageId,
          passageName,
          suggestion: 'Temporary variables will persist in Whisker - manage state accordingly'
        });
    }

    // Convert standalone $var -> {{var}} (but not inside {{}} already)
    converted = converted.replace(
      /\$(\w+)(?![^{]*}})/g,
      (match, varName) => {
        return `{{${varName}}}`;
      }
    );

    // Convert _var (temp variables) to {{var}}
    converted = converted.replace(
      /_(\w+)(?![^{]*}})/g,
      (match, varName) => {
        return `{{${varName}}}`;
      }
    );

    // Track <<linkreplace>>, <<linkappend>>, etc. (warning - these are interactive)
    const linkMacros = text.match(/<<(linkreplace|linkappend|linkprepend|replace|append|prepend)[\s>]/gi);
    if (linkMacros) {
      linkMacros.forEach((macro) => {
        const macroName = macro.match(/<<(\w+)/)?.[1] || 'unknown';
        tracker.addIssue('warning', 'interactive', `<<${macroName}>>`,
          `Interactive macro <<${macroName}>> will be converted to plain text`, {
            passageId,
            passageName,
            original: macro,
            suggestion: 'Restructure as separate passages or choices'
          });
      });
    }

    // Remove <<replace>>, <<append>>, <<prepend>> blocks (can't preserve interactivity)
    converted = converted.replace(/<<(replace|append|prepend)\s+[^>]+>>/gi, '');
    converted = converted.replace(/<<\/(replace|append|prepend)>>/gi, '');

    return converted;
  }

  /**
   * Convert from Chapbook syntax (with advanced features)
   */
  private convertFromChapbook(
    text: string,
    warnings: string[],
    tracker: ConversionTracker,
    passageId?: string,
    passageName?: string
  ): string {
    let converted = text;

    // Track time-based modifiers
    if (text.match(/\[after\s+\d+/i)) {
      tracker.addIssue('warning', 'modifier', 'Time-based Modifiers',
        'Chapbook time-based modifiers ([after Xs]) are not supported', {
          passageId,
          passageName,
          original: text.match(/\[after\s+[\d.]+\w*\]/i)?.[0],
          suggestion: 'Consider using passage transitions or removing timed effects'
        });
    }

    // Track embed/insert macros
    if (text.match(/\{embed\s+passage:/i)) {
      tracker.addIssue('critical', 'macro', 'Embed Passage',
        'Chapbook {embed passage:} is not supported', {
          passageId,
          passageName,
          original: text.match(/\{embed\s+passage:[^}]+\}/i)?.[0],
          suggestion: 'Manually merge embedded passage content'
        });
    }

    // Info: Chapbook is experimental
    if (text.length > 0) {
      tracker.addIssue('info', 'format', 'Chapbook Format',
        'Chapbook conversion is experimental - please verify output carefully', {
          passageId,
          passageName,
          suggestion: 'Test all interactive elements after import'
        });
    }

    // Convert [if condition] -> {{if condition then}}
    converted = converted.replace(
      /\[if\s+([^\]]+)\]/gi,
      (_, cond) => {
        return `{{if ${cond.trim()} then}}`;
      }
    );

    // Convert [else if condition] -> {{elseif condition then}}
    converted = converted.replace(
      /\[else\s+if\s+([^\]]+)\]/gi,
      (_, cond) => {
        return `{{elseif ${cond.trim()} then}}`;
      }
    );

    // Convert [else] -> {{else}}
    converted = converted.replace(/\[else\]/gi, '{{else}}');

    // Convert [continued] -> {{end}}
    converted = converted.replace(/\[continued\]/gi, '{{end}}');

    // Convert variable references {varname} -> {{varname}}
    converted = converted.replace(/\{(\w+)\}/g, '{{$1}}');

    // Remove time-based modifiers (can't convert meaningfully)
    converted = converted.replace(/\[after\s+[\d.]+\w*\]/gi, '');

    return converted;
  }

  /**
   * Convert from Snowman syntax
   */
  private convertFromSnowman(
    text: string,
    warnings: string[],
    tracker: ConversionTracker,
    passageId?: string,
    passageName?: string
  ): string {
    let converted = text;

    // Snowman uses JavaScript heavily - track usage
    const jsBlocks = text.match(/<script[\s\S]*?<\/script>/gi);
    if (jsBlocks) {
      tracker.addIssue('critical', 'javascript', 'JavaScript Code Blocks',
        `Snowman uses JavaScript which is not supported - ${jsBlocks.length} block(s) found`, {
          passageId,
          passageName,
          original: jsBlocks[0],
          suggestion: 'Rewrite JavaScript logic using Whisker scripting or passage structure'
        });
    }

    // Track inline JavaScript expressions
    const jsExpressions = text.match(/<%[\s\S]*?%>/g);
    if (jsExpressions) {
      tracker.addIssue('critical', 'javascript', 'JavaScript Expressions',
        `Snowman inline JavaScript expressions (<% %>) are not supported - ${jsExpressions.length} found`, {
          passageId,
          passageName,
          original: jsExpressions[0],
          suggestion: 'Replace with Whisker variable syntax or conditional logic'
        });
    }

    // Track print expressions <%= %>
    const printExpressions = text.match(/<%=[\s\S]*?%>/g);
    if (printExpressions) {
      tracker.addIssue('warning', 'javascript', 'Print Expressions',
        `Snowman print expressions (<%= %>) need manual conversion - ${printExpressions.length} found`, {
          passageId,
          passageName,
          original: printExpressions[0],
          suggestion: 'Convert to {{variable}} syntax for simple variables'
        });
    }

    // Info: Snowman is JavaScript-heavy (only add once per passage)
    if (text.length > 0 && passageId) {
      tracker.addIssue('info', 'format', 'Snowman Format',
        'Snowman is JavaScript-based and requires extensive manual conversion', {
          passageId,
          passageName,
          suggestion: 'Review all JavaScript code and rewrite using Whisker syntax'
        });
    }

    // Attempt basic conversions

    // Convert <%= variable %> to {{variable}} (simple cases only)
    converted = converted.replace(/<%=\s*(\w+)\s*%>/g, (_, varName) => {
      return `{{${varName}}}`;
    });

    // Convert <%= s.variable %> to {{variable}}
    converted = converted.replace(/<%=\s*s\.(\w+)\s*%>/g, (_, varName) => {
      return `{{${varName}}}`;
    });

    // Remove <script> blocks (can't convert meaningfully)
    converted = converted.replace(/<script[\s\S]*?<\/script>/gi, '');

    // Remove <% %> blocks (can't convert without JavaScript interpreter)
    converted = converted.replace(/<%[\s\S]*?%>/g, '');

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
   * Extract and create variables from story content with type inference
   */
  private extractVariables(story: Story, warnings: string[]): void {
    const variableInfo = new Map<string, { type: string; initial: string | number | boolean }>();

    // Scan all passages for variable references and assignments
    story.passages.forEach((passage) => {
      const text = passage.content;

      // Match {{varName = value}} assignments to infer types
      const assignRegex = /\{\{(\w+)\s*=\s*([^}]+)\}\}/g;
      let match;

      while ((match = assignRegex.exec(text)) !== null) {
        const varName = match[1];
        const value = match[2].trim();

        // Try to infer type from value
        let type = 'string';
        let initial: string | number | boolean = '';

        // Check for boolean
        if (value === 'true' || value === 'false') {
          type = 'boolean';
          initial = value === 'true';
        }
        // Check for number
        else if (/^-?\d+(\.\d+)?$/.test(value)) {
          type = 'number';
          initial = parseFloat(value);
        }
        // Check for string (quoted)
        else if (/^["'].*["']$/.test(value)) {
          type = 'string';
          initial = value.slice(1, -1); // Remove quotes
        }
        // Default to string with original value
        else {
          type = 'string';
          initial = value;
        }

        // Only update if we don't have info yet, or if this is more specific
        if (!variableInfo.has(varName)) {
          variableInfo.set(varName, { type, initial });
        } else {
          // If we already have this var, prefer number/boolean over string
          const existing = variableInfo.get(varName)!;
          if (existing.type === 'string' && (type === 'number' || type === 'boolean')) {
            variableInfo.set(varName, { type, initial });
          }
        }
      }

      // Match {{varName}} references (without assignment)
      const refRegex = /\{\{(\w+)\}\}/g;
      while ((match = refRegex.exec(text)) !== null) {
        const varName = match[1];
        // Only add if we don't have it yet
        if (!variableInfo.has(varName)) {
          variableInfo.set(varName, { type: 'string', initial: '' });
        }
      }
    });

    // Create variables with inferred types
    variableInfo.forEach((info, name) => {
      const variable = new Variable({
        name,
        type: info.type as 'string' | 'number' | 'boolean',
        initial: info.initial,
      });
      story.addVariable(variable);
    });

    if (variableInfo.size > 0) {
      warnings.push(
        `Extracted ${variableInfo.size} variable(s) with inferred types - please verify initial values`
      );
    }
  }
}
