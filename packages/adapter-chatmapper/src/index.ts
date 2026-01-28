/**
 * ChatMapper Format Adapter
 *
 * Provides bi-directional conversion between Whisker stories and ChatMapper format.
 * ChatMapper is a professional dialogue tree editor for games.
 */

import { Story, Passage, Variable } from '@writewhisker/story-models';

export interface ChatMapperProject {
  title: string;
  version: string;
  conversations: ChatMapperConversation[];
  actors: ChatMapperActor[];
  variables: ChatMapperVariable[];
  metadata?: Record<string, any>;
}

export interface ChatMapperConversation {
  id: number;
  title: string;
  dialogueEntries: ChatMapperDialogueEntry[];
  canvasRect?: { x: number; y: number; width: number; height: number };
}

export interface ChatMapperDialogueEntry {
  id: number;
  conversationId: number;
  isRoot: boolean;
  isGroup: boolean;
  actor?: string;
  menuText?: string;
  dialogueText: string;
  conditionsString?: string;
  userScript?: string;
  outgoingLinks: ChatMapperLink[];
  canvasRect?: { x: number; y: number; width: number; height: number };
  fields?: ChatMapperField[];
}

export interface ChatMapperLink {
  originDialogueId: number;
  destinationDialogueId: number;
  isConnector: boolean;
  priority: number;
  conditionsString?: string;
}

export interface ChatMapperActor {
  id: number;
  name: string;
  isPlayer: boolean;
  fields?: ChatMapperField[];
}

export interface ChatMapperVariable {
  name: string;
  initialValue: any;
  type: 'Boolean' | 'Number' | 'Text';
}

export interface ChatMapperField {
  title: string;
  value: any;
  type: string;
}

/**
 * Converts a Whisker Story to ChatMapper format
 */
export class ChatMapperExporter {
  /**
   * Export story to ChatMapper XML format
   */
  public exportToXML(story: Story): string {
    const project = this.convertToChatMapper(story);
    return this.generateXML(project);
  }

  /**
   * Export story to ChatMapper JSON format
   */
  public exportToJSON(story: Story): string {
    const project = this.convertToChatMapper(story);
    return JSON.stringify(project, null, 2);
  }

  /**
   * Convert Whisker Story to ChatMapper structure
   */
  public convertToChatMapper(story: Story): ChatMapperProject {
    const actors = this.extractActors(story);
    const variables = this.extractVariables(story);

    // Create a single conversation containing all passages
    const passages = story.getPassagesArray();
    const conversation: ChatMapperConversation = {
      id: 1,
      title: story.metadata.title,
      dialogueEntries: passages.map((passage, index) =>
        this.convertPassageToDialogueEntry(passage, index + 1, 1)
      ),
    };

    return {
      title: story.metadata.title,
      version: '1.0',
      conversations: [conversation],
      actors,
      variables,
      metadata: story.metadata,
    };
  }

  private convertPassageToDialogueEntry(
    passage: Passage,
    id: number,
    conversationId: number
  ): ChatMapperDialogueEntry {
    const { dialogueText, actor, links } = this.parsePassageContent(passage.content);

    return {
      id,
      conversationId,
      isRoot: id === 1,
      isGroup: false,
      actor,
      dialogueText,
      menuText: passage.title,
      outgoingLinks: links.map((link, index) => ({
        originDialogueId: id,
        destinationDialogueId: link.targetId,
        isConnector: false,
        priority: index,
      })),
      canvasRect: passage.position
        ? {
            x: passage.position.x,
            y: passage.position.y,
            width: passage.size?.width || 200,
            height: passage.size?.height || 100,
          }
        : undefined,
    };
  }

  private parsePassageContent(content: string): {
    dialogueText: string;
    actor?: string;
    links: { text: string; targetId: number }[];
  } {
    const links: { text: string; targetId: number }[] = [];
    const lines = content.split('\n');
    const dialogueLines: string[] = [];
    let actor: string | undefined;

    for (const line of lines) {
      // Check for actor dialogue (Actor: "Text")
      const actorMatch = line.match(/^(\w+):\s*"?([^"]+)"?$/);
      if (actorMatch) {
        actor = actorMatch[1];
        dialogueLines.push(actorMatch[2]);
        continue;
      }

      // Check for Whisker link syntax [[Target]] or [[Text|Target]]
      const linkMatch = line.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
      if (linkMatch) {
        const text = linkMatch[2] || linkMatch[1];
        // For now, we can't determine target ID without passage lookup
        // In a real implementation, this would require a pass-through
        links.push({ text, targetId: 0 });
        continue;
      }

      // Regular dialogue
      if (line.trim()) {
        dialogueLines.push(line.trim());
      }
    }

    return {
      dialogueText: dialogueLines.join('\n'),
      actor,
      links,
    };
  }

  private extractActors(story: Story): ChatMapperActor[] {
    const actors: ChatMapperActor[] = [];
    const actorSet = new Set<string>();

    // Default player actor
    actors.push({
      id: 1,
      name: 'Player',
      isPlayer: true,
    });
    actorSet.add('Player');

    // Extract actors from passage content
    for (const passage of story.passages.values()) {
      const lines = passage.content.split('\n');
      for (const line of lines) {
        const match = line.match(/^(\w+):\s*"/);
        if (match && !actorSet.has(match[1])) {
          actors.push({
            id: actors.length + 1,
            name: match[1],
            isPlayer: false,
          });
          actorSet.add(match[1]);
        }
      }
    }

    return actors;
  }

  private extractVariables(story: Story): ChatMapperVariable[] {
    const variables: ChatMapperVariable[] = [];

    for (const [name, variable] of story.variables) {
      const value = variable.initial;
      const type = typeof value === 'boolean' ? 'Boolean' : typeof value === 'number' ? 'Number' : 'Text';
      variables.push({
        name,
        initialValue: value,
        type,
      });
    }

    return variables;
  }

  private generateXML(project: ChatMapperProject): string {
    const parts: string[] = [];

    parts.push('<?xml version="1.0" encoding="utf-8"?>');
    parts.push('<ChatMapperProject>');
    parts.push(`  <Title>${this.escapeXML(project.title)}</Title>`);
    parts.push(`  <Version>${project.version}</Version>`);

    // Actors
    parts.push('  <Actors>');
    for (const actor of project.actors) {
      parts.push(`    <Actor ID="${actor.id}">`);
      parts.push(`      <Name>${this.escapeXML(actor.name)}</Name>`);
      parts.push(`      <IsPlayer>${actor.isPlayer}</IsPlayer>`);
      parts.push('    </Actor>');
    }
    parts.push('  </Actors>');

    // Variables
    parts.push('  <Variables>');
    for (const variable of project.variables) {
      parts.push(`    <Variable Name="${this.escapeXML(variable.name)}" InitialValue="${this.escapeXML(String(variable.initialValue))}" Type="${variable.type}" />`);
    }
    parts.push('  </Variables>');

    // Conversations
    parts.push('  <Conversations>');
    for (const conversation of project.conversations) {
      parts.push(`    <Conversation ID="${conversation.id}" Title="${this.escapeXML(conversation.title)}">`);
      parts.push('      <DialogueEntries>');
      for (const entry of conversation.dialogueEntries) {
        parts.push(this.generateDialogueEntryXML(entry, '        '));
      }
      parts.push('      </DialogueEntries>');
      parts.push('    </Conversation>');
    }
    parts.push('  </Conversations>');

    parts.push('</ChatMapperProject>');

    return parts.join('\n');
  }

  private generateDialogueEntryXML(entry: ChatMapperDialogueEntry, indent: string): string {
    const parts: string[] = [];

    parts.push(`${indent}<DialogueEntry ID="${entry.id}" ConversationID="${entry.conversationId}" IsRoot="${entry.isRoot}" IsGroup="${entry.isGroup}">`);
    if (entry.actor) {
      parts.push(`${indent}  <Actor>${this.escapeXML(entry.actor)}</Actor>`);
    }
    if (entry.menuText) {
      parts.push(`${indent}  <MenuText>${this.escapeXML(entry.menuText)}</MenuText>`);
    }
    parts.push(`${indent}  <DialogueText>${this.escapeXML(entry.dialogueText)}</DialogueText>`);

    if (entry.outgoingLinks.length > 0) {
      parts.push(`${indent}  <OutgoingLinks>`);
      for (const link of entry.outgoingLinks) {
        parts.push(`${indent}    <Link OriginID="${link.originDialogueId}" DestinationID="${link.destinationDialogueId}" Priority="${link.priority}" />`);
      }
      parts.push(`${indent}  </OutgoingLinks>`);
    }

    parts.push(`${indent}</DialogueEntry>`);

    return parts.join('\n');
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * Converts ChatMapper format to Whisker Story
 */
export class ChatMapperImporter {
  /**
   * Import from ChatMapper XML format
   */
  public importFromXML(xml: string): Story {
    const project = this.parseXML(xml);
    return this.convertToWhisker(project);
  }

  /**
   * Import from ChatMapper JSON format
   */
  public importFromJSON(json: string): Story {
    const project = JSON.parse(json) as ChatMapperProject;
    return this.convertToWhisker(project);
  }

  /**
   * Parse ChatMapper XML to structure (simplified)
   */
  public parseXML(xml: string): ChatMapperProject {
    // Simplified XML parsing with regex (in production, use DOMParser)
    const titleMatch = xml.match(/<Title>([^<]+)<\/Title>/);
    const versionMatch = xml.match(/<Version>([^<]+)<\/Version>/);

    const actors = this.extractActorsFromXML(xml);
    const variables = this.extractVariablesFromXML(xml);
    const conversations = this.extractConversationsFromXML(xml);

    return {
      title: titleMatch?.[1] || 'Untitled',
      version: versionMatch?.[1] || '1.0',
      conversations,
      actors,
      variables,
    };
  }

  private extractActorsFromXML(xml: string): ChatMapperActor[] {
    const actors: ChatMapperActor[] = [];
    const actorRegex = /<Actor ID="(\d+)">[\s\S]*?<Name>([^<]+)<\/Name>[\s\S]*?<IsPlayer>(true|false)<\/IsPlayer>[\s\S]*?<\/Actor>/g;
    let match;

    while ((match = actorRegex.exec(xml)) !== null) {
      actors.push({
        id: parseInt(match[1]),
        name: match[2],
        isPlayer: match[3] === 'true',
      });
    }

    return actors;
  }

  private extractVariablesFromXML(xml: string): ChatMapperVariable[] {
    const variables: ChatMapperVariable[] = [];
    const variableRegex = /<Variable Name="([^"]+)" InitialValue="([^"]*)" Type="([^"]+)"/g;
    let match;

    while ((match = variableRegex.exec(xml)) !== null) {
      let value: any = match[2];
      if (match[3] === 'Boolean') {
        value = value === 'true';
      } else if (match[3] === 'Number') {
        value = parseFloat(value);
      }

      variables.push({
        name: match[1],
        initialValue: value,
        type: match[3] as any,
      });
    }

    return variables;
  }

  private extractConversationsFromXML(xml: string): ChatMapperConversation[] {
    const conversations: ChatMapperConversation[] = [];
    const conversationRegex = /<Conversation ID="(\d+)" Title="([^"]+)">([\s\S]*?)<\/Conversation>/g;
    let match;

    while ((match = conversationRegex.exec(xml)) !== null) {
      conversations.push({
        id: parseInt(match[1]),
        title: match[2],
        dialogueEntries: this.extractDialogueEntriesFromXML(match[3]),
      });
    }

    return conversations;
  }

  private extractDialogueEntriesFromXML(xml: string): ChatMapperDialogueEntry[] {
    const entries: ChatMapperDialogueEntry[] = [];
    const entryRegex = /<DialogueEntry ID="(\d+)"[\s\S]*?<\/DialogueEntry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entryXML = match[0];
      const idMatch = entryXML.match(/ID="(\d+)"/);
      const actorMatch = entryXML.match(/<Actor>([^<]+)<\/Actor>/);
      const menuTextMatch = entryXML.match(/<MenuText>([^<]+)<\/MenuText>/);
      const dialogueTextMatch = entryXML.match(/<DialogueText>([^<]+)<\/DialogueText>/);

      entries.push({
        id: parseInt(idMatch?.[1] || '0'),
        conversationId: 1,
        isRoot: false,
        isGroup: false,
        actor: actorMatch?.[1],
        menuText: menuTextMatch?.[1],
        dialogueText: dialogueTextMatch?.[1] || '',
        outgoingLinks: [],
      });
    }

    return entries;
  }

  /**
   * Convert ChatMapper structure to Whisker Story
   */
  public convertToWhisker(project: ChatMapperProject): Story {
    const passages: Passage[] = [];

    // Convert all dialogue entries to passages
    for (const conversation of project.conversations) {
      for (const entry of conversation.dialogueEntries) {
        passages.push(this.convertDialogueEntryToPassage(entry));
      }
    }

    const story = new Story({
      metadata: {
        title: project.title,
        author: '',
        version: '1.0.0',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      startPassage: passages[0]?.id || 'start',
    });

    // Clear the default passage created by Story constructor
    story.passages.clear();

    // Store extra metadata that doesn't fit the schema in settings
    if (project.actors && project.actors.length > 0) {
      story.settings.actors = project.actors;
    }

    // Add passages to story
    for (const passage of passages) {
      story.passages.set(passage.id, passage);
    }

    // Update startPassage to the first actual passage
    if (passages.length > 0) {
      story.startPassage = passages[0].id;
    }

    // Add variables
    for (const variable of project.variables) {
      const storyVar = new Variable({
        name: variable.name,
        initial: variable.initialValue,
      });
      story.variables.set(variable.name, storyVar);
    }

    return story;
  }

  private convertDialogueEntryToPassage(entry: ChatMapperDialogueEntry): Passage {
    let content = '';

    // Add actor dialogue if present
    if (entry.actor) {
      content = `${entry.actor}: "${entry.dialogueText}"`;
    } else {
      content = entry.dialogueText;
    }

    // Add links based on outgoing links
    for (const link of entry.outgoingLinks) {
      content += `\n\n[[Choice ${link.priority + 1}|Entry_${link.destinationDialogueId}]]`;
    }

    return new Passage({
      id: this.generateId(),
      title: entry.menuText || `Entry_${entry.id}`,
      content: content.trim(),
      tags: [],
      position: entry.canvasRect
        ? { x: entry.canvasRect.x, y: entry.canvasRect.y }
        : undefined,
      size: entry.canvasRect
        ? { width: entry.canvasRect.width, height: entry.canvasRect.height }
        : undefined,
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

/**
 * Main adapter class
 */
export class ChatMapperAdapter {
  private exporter = new ChatMapperExporter();
  private importer = new ChatMapperImporter();

  public export(story: Story, format: 'xml' | 'json' = 'xml'): string {
    return format === 'xml'
      ? this.exporter.exportToXML(story)
      : this.exporter.exportToJSON(story);
  }

  public import(content: string, format: 'xml' | 'json' = 'xml'): Story {
    return format === 'xml'
      ? this.importer.importFromXML(content)
      : this.importer.importFromJSON(content);
  }
}
