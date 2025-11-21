/**
 * Notion Integration
 *
 * Utilities for syncing Whisker stories with Notion databases and pages.
 * Provides two-way sync, collaboration, and documentation features.
 */

import type { Story, Passage } from '@writewhisker/story-models';

export interface NotionClientConfig {
  auth: string; // Integration token
  apiVersion?: string;
}

export interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  archived: boolean;
  properties: Record<string, NotionProperty>;
  parent: NotionParent;
  url: string;
}

export interface NotionDatabase {
  id: string;
  created_time: string;
  last_edited_time: string;
  title: NotionRichText[];
  properties: Record<string, NotionDatabaseProperty>;
}

export interface NotionProperty {
  id: string;
  type: string;
  [key: string]: any;
}

export interface NotionDatabaseProperty {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

export interface NotionParent {
  type: 'database_id' | 'page_id' | 'workspace';
  database_id?: string;
  page_id?: string;
}

export interface NotionRichText {
  type: 'text' | 'mention' | 'equation';
  text?: {
    content: string;
    link?: { url: string } | null;
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
  plain_text: string;
  href?: string | null;
}

export interface NotionBlock {
  object: 'block';
  id: string;
  type: string;
  created_time: string;
  last_edited_time: string;
  has_children: boolean;
  archived: boolean;
  [blockType: string]: any;
}

/**
 * Notion API Client Helper
 */
export class NotionClient {
  private baseUrl = 'https://api.notion.com/v1';
  private config: NotionClientConfig;

  constructor(config: NotionClientConfig) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || '2022-06-28',
    };
  }

  /**
   * Make API request to Notion
   */
  public async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.auth}`,
      'Notion-Version': this.config.apiVersion!,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get database
   */
  public async getDatabase(databaseId: string): Promise<NotionDatabase> {
    return this.request(`/databases/${databaseId}`);
  }

  /**
   * Query database
   */
  public async queryDatabase(databaseId: string, filter?: any): Promise<{ results: NotionPage[] }> {
    return this.request(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify({ filter }),
    });
  }

  /**
   * Create page
   */
  public async createPage(parent: NotionParent, properties: Record<string, any>, children?: NotionBlock[]): Promise<NotionPage> {
    return this.request('/pages', {
      method: 'POST',
      body: JSON.stringify({ parent, properties, children }),
    });
  }

  /**
   * Update page
   */
  public async updatePage(pageId: string, properties: Record<string, any>): Promise<NotionPage> {
    return this.request(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties }),
    });
  }

  /**
   * Get page
   */
  public async getPage(pageId: string): Promise<NotionPage> {
    return this.request(`/pages/${pageId}`);
  }

  /**
   * Get block children
   */
  public async getBlockChildren(blockId: string): Promise<{ results: NotionBlock[] }> {
    return this.request(`/blocks/${blockId}/children`);
  }

  /**
   * Append block children
   */
  public async appendBlockChildren(blockId: string, children: NotionBlock[]): Promise<{ results: NotionBlock[] }> {
    return this.request(`/blocks/${blockId}/children`, {
      method: 'PATCH',
      body: JSON.stringify({ children }),
    });
  }
}

/**
 * Convert Whisker Story to Notion Database
 */
export class NotionStorySync {
  private client: NotionClient;

  constructor(client: NotionClient) {
    this.client = client;
  }

  /**
   * Create Notion database for story
   */
  public async createStoryDatabase(story: Story, parentPageId: string): Promise<string> {
    // Create database structure
    const database = await this.client.request('/databases', {
      method: 'POST',
      body: JSON.stringify({
        parent: {
          type: 'page_id',
          page_id: parentPageId,
        },
        title: [
          {
            type: 'text',
            text: {
              content: story.name,
            },
          },
        ],
        properties: {
          'Passage': {
            title: {},
          },
          'ID': {
            rich_text: {},
          },
          'Tags': {
            multi_select: {},
          },
          'Content': {
            rich_text: {},
          },
          'Links': {
            multi_select: {},
          },
          'Position X': {
            number: {},
          },
          'Position Y': {
            number: {},
          },
        },
      }),
    });

    return database.id;
  }

  /**
   * Sync story to Notion database
   */
  public async syncStoryToNotion(story: Story, databaseId: string): Promise<void> {
    for (const passage of story.passages) {
      await this.createPassagePage(passage, databaseId);
    }
  }

  /**
   * Create Notion page for passage
   */
  private async createPassagePage(passage: Passage, databaseId: string): Promise<string> {
    const links = this.extractLinks(passage.content);

    const page = await this.client.createPage(
      {
        type: 'database_id',
        database_id: databaseId,
      },
      {
        'Passage': {
          title: [{ text: { content: passage.title } }],
        },
        'ID': {
          rich_text: [{ text: { content: passage.id } }],
        },
        'Tags': {
          multi_select: passage.tags?.map(tag => ({ name: tag })) || [],
        },
        'Content': {
          rich_text: [{ text: { content: passage.content.substring(0, 2000) } }], // Notion limit
        },
        'Links': {
          multi_select: links.map(link => ({ name: link })),
        },
        'Position X': {
          number: passage.position?.x || 0,
        },
        'Position Y': {
          number: passage.position?.y || 0,
        },
      },
      this.contentToBlocks(passage.content)
    );

    return page.id;
  }

  /**
   * Sync Notion database back to story
   */
  public async syncNotionToStory(databaseId: string, storyName: string): Promise<Story> {
    const { results } = await this.client.queryDatabase(databaseId);

    const passages: Passage[] = [];
    for (const page of results) {
      const passage = await this.notionPageToPassage(page);
      passages.push(passage);
    }

    return {
      id: databaseId,
      name: storyName,
      startPassage: passages[0]?.title || 'Start',
      passages,
      metadata: {},
      created: Date.now(),
      modified: Date.now(),
    };
  }

  /**
   * Convert Notion page to passage
   */
  private async notionPageToPassage(page: NotionPage): Promise<Passage> {
    const properties = page.properties;

    // Get full content from blocks
    const { results: blocks } = await this.client.getBlockChildren(page.id);
    const content = this.blocksToContent(blocks);

    return {
      id: this.getPropertyValue(properties['ID']) || page.id,
      title: this.getPropertyValue(properties['Passage']) || 'Untitled',
      content,
      tags: this.getMultiSelectValues(properties['Tags']) || [],
      position: {
        x: this.getPropertyValue(properties['Position X']) || 0,
        y: this.getPropertyValue(properties['Position Y']) || 0,
      },
    };
  }

  /**
   * Convert passage content to Notion blocks
   */
  private contentToBlocks(content: string): NotionBlock[] {
    const blocks: NotionBlock[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      // Check for headings
      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        blocks.push({
          object: 'block',
          type: `heading_${level}`,
          [`heading_${level}`]: {
            rich_text: [{ text: { content: headingMatch[2] } }],
          },
        } as any);
        continue;
      }

      // Regular paragraph
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ text: { content: line } }],
        },
      } as any);
    }

    return blocks;
  }

  /**
   * Convert Notion blocks back to content
   */
  private blocksToContent(blocks: NotionBlock[]): string {
    const lines: string[] = [];

    for (const block of blocks) {
      const type = block.type;
      const blockData = block[type];

      if (!blockData || !blockData.rich_text) continue;

      const text = blockData.rich_text.map((rt: NotionRichText) => rt.plain_text).join('');

      if (type.startsWith('heading_')) {
        const level = type.split('_')[1];
        lines.push(`${'#'.repeat(parseInt(level))} ${text}`);
      } else {
        lines.push(text);
      }
    }

    return lines.join('\n');
  }

  /**
   * Extract links from passage content
   */
  private extractLinks(content: string): string[] {
    const links: string[] = [];
    const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const target = match[2] || match[1];
      links.push(target);
    }

    return links;
  }

  /**
   * Get property value from Notion property
   */
  private getPropertyValue(property: NotionProperty): any {
    if (!property) return null;

    switch (property.type) {
      case 'title':
        return property.title?.[0]?.plain_text || '';
      case 'rich_text':
        return property.rich_text?.[0]?.plain_text || '';
      case 'number':
        return property.number;
      case 'select':
        return property.select?.name;
      case 'multi_select':
        return property.multi_select?.map((s: any) => s.name);
      default:
        return null;
    }
  }

  /**
   * Get multi-select values
   */
  private getMultiSelectValues(property: NotionProperty): string[] {
    if (!property || property.type !== 'multi_select') return [];
    return property.multi_select?.map((s: any) => s.name) || [];
  }
}

/**
 * Notion Webhook Handler
 */
export interface NotionWebhookPayload {
  object: 'page' | 'database';
  id: string;
  event: 'page.created' | 'page.updated' | 'page.deleted' | 'database.created' | 'database.updated';
  data: any;
}

export type NotionWebhookHandler = (payload: NotionWebhookPayload) => void | Promise<void>;

export class NotionWebhookServer {
  private handlers: Map<string, NotionWebhookHandler[]> = new Map();

  /**
   * Register webhook handler
   */
  public on(event: string, handler: NotionWebhookHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  /**
   * Handle webhook payload
   */
  public async handle(payload: NotionWebhookPayload): Promise<void> {
    const handlers = this.handlers.get(payload.event) || [];
    for (const handler of handlers) {
      await handler(payload);
    }

    // Also trigger wildcard handlers
    const wildcardHandlers = this.handlers.get('*') || [];
    for (const handler of wildcardHandlers) {
      await handler(payload);
    }
  }
}
