/**
 * Obsidian Plugin Helpers
 *
 * Utilities for creating Obsidian plugins for Whisker stories.
 * Provides markdown integration, vault synchronization, and graph view.
 */

import { Story, Passage } from '@writewhisker/story-models';

export interface ObsidianPluginManifest {
  id: string;
  name: string;
  version: string;
  minAppVersion: string;
  description: string;
  author: string;
  authorUrl?: string;
  isDesktopOnly?: boolean;
}

export interface ObsidianFile {
  path: string;
  name: string;
  extension: string;
  stat: {
    ctime: number;
    mtime: number;
    size: number;
  };
}

export interface ObsidianVault {
  getName(): string;
  getAbstractFileByPath(path: string): ObsidianFile | null;
  getMarkdownFiles(): ObsidianFile[];
  getRoot(): ObsidianFile;
  create(path: string, data: string): Promise<ObsidianFile>;
  modify(file: ObsidianFile, data: string): Promise<void>;
  delete(file: ObsidianFile): Promise<void>;
  rename(file: ObsidianFile, newPath: string): Promise<void>;
}

export interface ObsidianMetadataCache {
  getFileCache(file: ObsidianFile): FileCacheEntry | null;
  getLinks(): Record<string, LinkCacheEntry[]>;
  getBacklinks(file: ObsidianFile): Map<string, LinkCacheEntry[]>;
}

export interface FileCacheEntry {
  links?: LinkCacheEntry[];
  embeds?: EmbedCacheEntry[];
  tags?: TagCacheEntry[];
  headings?: HeadingCacheEntry[];
  frontmatter?: Record<string, any>;
}

export interface LinkCacheEntry {
  link: string;
  original: string;
  displayText?: string;
  position: Position;
}

export interface EmbedCacheEntry {
  link: string;
  original: string;
  position: Position;
}

export interface TagCacheEntry {
  tag: string;
  position: Position;
}

export interface HeadingCacheEntry {
  heading: string;
  level: number;
  position: Position;
}

export interface Position {
  start: { line: number; col: number; offset: number };
  end: { line: number; col: number; offset: number };
}

/**
 * Convert Whisker Story to Obsidian Vault Structure
 */
export class ObsidianConverter {
  /**
   * Convert story to multiple markdown files (one per passage)
   */
  public storyToMarkdownFiles(story: Story): Map<string, string> {
    const files = new Map<string, string>();

    for (const passage of story.passages.values()) {
      const fileName = this.sanitizeFileName(passage.title);
      const content = this.passageToMarkdown(passage, story);
      files.set(`${fileName}.md`, content);
    }

    // Create index file
    const indexContent = this.createIndexFile(story);
    files.set('_index.md', indexContent);

    return files;
  }

  /**
   * Convert single passage to markdown
   */
  public passageToMarkdown(passage: Passage, story: Story): string {
    const lines: string[] = [];

    // Frontmatter
    lines.push('---');
    lines.push(`title: ${passage.title}`);
    lines.push(`id: ${passage.id}`);
    if (passage.tags && passage.tags.length > 0) {
      lines.push(`tags: [${passage.tags.join(', ')}]`);
    }
    if (passage.position) {
      lines.push(`position: { x: ${passage.position.x}, y: ${passage.position.y} }`);
    }
    lines.push('---');
    lines.push('');

    // Title
    lines.push(`# ${passage.title}`);
    lines.push('');

    // Convert content
    const content = this.convertWhiskerLinksToObsidian(passage.content);
    lines.push(content);
    lines.push('');

    // Tags
    if (passage.tags && passage.tags.length > 0) {
      lines.push('## Tags');
      for (const tag of passage.tags) {
        lines.push(`- #${tag}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Convert Whisker links [[Target]] to Obsidian links
   */
  private convertWhiskerLinksToObsidian(content: string): string {
    // Whisker: [[Text|Target]] or [[Target]]
    // Obsidian: [[Target|Text]] or [[Target]]
    return content.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (match, text, target) => {
      // Swap text and target for Obsidian
      return `[[${target}|${text}]]`;
    });
  }

  /**
   * Create index file with story overview
   */
  private createIndexFile(story: Story): string {
    const lines: string[] = [];

    lines.push('---');
    lines.push(`title: ${story.metadata.title}`);
    lines.push(`story_id: ${story.metadata.ifid}`);
    lines.push(`start_passage: ${story.startPassage}`);
    lines.push('---');
    lines.push('');
    lines.push(`# ${story.metadata.title}`);
    lines.push('');

    // Story metadata
    if (story.metadata) {
      lines.push('## Metadata');
      for (const [key, value] of Object.entries(story.metadata)) {
        lines.push(`- **${key}**: ${value}`);
      }
      lines.push('');
    }

    // Passage list
    lines.push('## Passages');
    for (const passage of story.passages.values()) {
      const fileName = this.sanitizeFileName(passage.title);
      lines.push(`- [[${fileName}|${passage.title}]]`);
    }
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Convert Obsidian markdown files back to Whisker Story
   */
  public markdownFilesToStory(files: Map<string, string>, storyName: string): Story {
    const passagesMap = new Map<string, Passage>();
    let startPassage = '';
    let storyId = '';
    let metadata: Record<string, any> = {};

    for (const [fileName, content] of files) {
      // Skip index file initially
      if (fileName === '_index.md') {
        const indexData = this.parseIndexFile(content);
        startPassage = indexData.startPassage;
        storyId = indexData.storyId;
        metadata = indexData.metadata;
        continue;
      }

      // Parse passage
      const passage = this.markdownToPassage(content);
      if (passage) {
        passagesMap.set(passage.id, passage);
      }
    }

    const passagesArray = Array.from(passagesMap.values());
    const story = new Story({
      metadata: {
        title: storyName,
        ifid: storyId || this.generateId(),
        author: metadata.author || '',
        version: metadata.version || '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        createdBy: 'obsidian-converter',
      },
      startPassage: startPassage || passagesArray[0]?.id || '',
      passages: Object.fromEntries(passagesMap),
    });

    return story;
  }

  /**
   * Parse index file
   */
  private parseIndexFile(content: string): {
    startPassage: string;
    storyId: string;
    metadata: Record<string, any>;
  } {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return { startPassage: '', storyId: '', metadata: {} };
    }

    const frontmatter = frontmatterMatch[1];
    const lines = frontmatter.split('\n');
    let startPassage = '';
    let storyId = '';

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        if (match[1] === 'start_passage') {
          startPassage = match[2];
        } else if (match[1] === 'story_id') {
          storyId = match[2];
        }
      }
    }

    return { startPassage, storyId, metadata: {} };
  }

  /**
   * Convert markdown back to passage
   */
  private markdownToPassage(content: string): Passage | null {
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return null;

    const frontmatter = this.parseFrontmatter(frontmatterMatch[1]);
    const bodyContent = content.substring(frontmatterMatch[0].length).trim();

    // Remove title heading
    const contentWithoutTitle = bodyContent.replace(/^#\s+.+?\n\n/, '');

    // Convert Obsidian links back to Whisker format
    const whiskerContent = this.convertObsidianLinksToWhisker(contentWithoutTitle);

    return new Passage({
      id: frontmatter.id || this.generateId(),
      title: frontmatter.title || 'Untitled',
      content: whiskerContent,
      tags: frontmatter.tags || [],
      position: frontmatter.position || { x: 0, y: 0 },
    });
  }

  /**
   * Convert Obsidian links back to Whisker format
   */
  private convertObsidianLinksToWhisker(content: string): string {
    // Obsidian: [[Target|Text]] or [[Target]]
    // Whisker: [[Text|Target]] or [[Target]]
    return content.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, (match, target, text) => {
      // Swap back
      return `[[${text}|${target}]]`;
    });
  }

  /**
   * Parse frontmatter
   */
  private parseFrontmatter(frontmatter: string): Record<string, any> {
    const data: Record<string, any> = {};
    const lines = frontmatter.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const key = match[1];
        let value: any = match[2];

        // Try to parse as JSON
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string
        }

        data[key] = value;
      }
    }

    return data;
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

/**
 * Obsidian Graph View Integration
 */
export interface GraphNode {
  id: string;
  label: string;
  group?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
}

export function createGraphData(story: Story): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Create nodes for each passage
  for (const passage of story.passages.values()) {
    nodes.push({
      id: passage.id,
      label: passage.title,
      group: passage.tags?.[0],
    });
  }

  // Create edges from links
  for (const passage of story.passages.values()) {
    const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let match;

    while ((match = linkRegex.exec(passage.content)) !== null) {
      const targetTitle = match[2] || match[1];
      const targetPassage = story.findPassage(p => p.title === targetTitle);

      if (targetPassage) {
        edges.push({
          from: passage.id,
          to: targetPassage.id,
        });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Obsidian Commands
 */
export interface ObsidianCommand {
  id: string;
  name: string;
  callback: () => void | Promise<void>;
  hotkeys?: { modifiers: string[]; key: string }[];
}

export function createObsidianCommands(): ObsidianCommand[] {
  return [
    {
      id: 'whisker-new-passage',
      name: 'Create new Whisker passage',
      callback: async () => {
        console.log('Create new passage');
      },
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'N' }],
    },
    {
      id: 'whisker-link-passage',
      name: 'Link to Whisker passage',
      callback: async () => {
        console.log('Link to passage');
      },
      hotkeys: [{ modifiers: ['Mod'], key: 'L' }],
    },
    {
      id: 'whisker-show-graph',
      name: 'Show Whisker story graph',
      callback: async () => {
        console.log('Show story graph');
      },
    },
    {
      id: 'whisker-export-story',
      name: 'Export Whisker story',
      callback: async () => {
        console.log('Export story');
      },
    },
    {
      id: 'whisker-import-story',
      name: 'Import Whisker story',
      callback: async () => {
        console.log('Import story');
      },
    },
  ];
}
