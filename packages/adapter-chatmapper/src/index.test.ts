import { describe, it, expect, beforeEach } from 'vitest';
import {
  ChatMapperExporter,
  ChatMapperImporter,
  ChatMapperAdapter,
  type ChatMapperProject,
  type ChatMapperConversation,
  type ChatMapperActor,
} from './index';
import { Story, Passage, Variable } from '@writewhisker/story-models';

function createMockStory(): Story {
  const story = new Story({
    metadata: {
      title: 'Test Story',
    },
    startPassage: 'passage-1',
  });

  // Clear default passage and add our test passages
  story.passages.clear();

  const passage1 = new Passage({
    id: 'passage-1',
    title: 'Start',
    content: 'NPC: "Welcome!"\n[[Continue|Next]]',
    tags: [],
    position: { x: 100, y: 100 },
    size: { width: 200, height: 100 },
  });
  story.passages.set(passage1.id, passage1);

  const passage2 = new Passage({
    id: 'passage-2',
    title: 'Next',
    content: 'This is the next dialogue.',
    tags: [],
  });
  story.passages.set(passage2.id, passage2);

  story.startPassage = 'passage-1';

  // Add variables
  story.variables.set('questComplete', new Variable({ name: 'questComplete', initial: false }));
  story.variables.set('score', new Variable({ name: 'score', initial: 0 }));

  return story;
}

describe('ChatMapperExporter', () => {
  let exporter: ChatMapperExporter;
  let mockStory: Story;

  beforeEach(() => {
    exporter = new ChatMapperExporter();
    mockStory = createMockStory();
  });

  describe('convertToChatMapper', () => {
    it('should convert Whisker story to ChatMapper structure', () => {
      const result = exporter.convertToChatMapper(mockStory);

      expect(result.title).toBe('Test Story');
      expect(result.version).toBe('1.0');
      expect(result.conversations).toHaveLength(1);
    });

    it('should create dialogue entries from passages', () => {
      const result = exporter.convertToChatMapper(mockStory);

      expect(result.conversations[0].dialogueEntries).toHaveLength(2);
      expect(result.conversations[0].dialogueEntries[0].menuText).toBe('Start');
    });

    it('should extract actors from dialogue', () => {
      const result = exporter.convertToChatMapper(mockStory);

      expect(result.actors).toHaveLength(2); // Player + NPC
      const npcActor = result.actors.find(a => a.name === 'NPC');
      expect(npcActor).toBeDefined();
      expect(npcActor?.isPlayer).toBe(false);
    });

    it('should always include Player actor', () => {
      const result = exporter.convertToChatMapper(mockStory);

      const playerActor = result.actors.find(a => a.name === 'Player');
      expect(playerActor).toBeDefined();
      expect(playerActor?.isPlayer).toBe(true);
    });

    it('should extract variables from story', () => {
      const result = exporter.convertToChatMapper(mockStory);

      expect(result.variables).toHaveLength(2);
      const questVar = result.variables.find(v => v.name === 'questComplete');
      expect(questVar?.type).toBe('Boolean');
      const scoreVar = result.variables.find(v => v.name === 'score');
      expect(scoreVar?.type).toBe('Number');
    });

    it('should set first entry as root', () => {
      const result = exporter.convertToChatMapper(mockStory);

      expect(result.conversations[0].dialogueEntries[0].isRoot).toBe(true);
      expect(result.conversations[0].dialogueEntries[1].isRoot).toBe(false);
    });

    it('should preserve passage positions', () => {
      const result = exporter.convertToChatMapper(mockStory);

      const entry = result.conversations[0].dialogueEntries[0];
      expect(entry.canvasRect).toEqual({
        x: 100,
        y: 100,
        width: 200,
        height: 100,
      });
    });

    it('should detect Text type variables', () => {
      const storyWithTextVar = new Story({
        metadata: { title: 'Test Story' },
      });
      storyWithTextVar.variables.set('playerName', new Variable({ name: 'playerName', initial: 'Hero' }));

      const result = exporter.convertToChatMapper(storyWithTextVar);

      expect(result.variables[0].type).toBe('Text');
      expect(result.variables[0].initialValue).toBe('Hero');
    });
  });

  describe('exportToXML', () => {
    it('should generate valid ChatMapper XML', () => {
      const xml = exporter.exportToXML(mockStory);

      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(xml).toContain('<ChatMapperProject>');
      expect(xml).toContain('<Title>Test Story</Title>');
      expect(xml).toContain('</ChatMapperProject>');
    });

    it('should include actors section', () => {
      const xml = exporter.exportToXML(mockStory);

      expect(xml).toContain('<Actors>');
      expect(xml).toContain('<Actor ID="1">');
      expect(xml).toContain('<Name>Player</Name>');
      expect(xml).toContain('<IsPlayer>true</IsPlayer>');
    });

    it('should include variables section', () => {
      const xml = exporter.exportToXML(mockStory);

      expect(xml).toContain('<Variables>');
      expect(xml).toContain('Name="questComplete"');
      expect(xml).toContain('Type="Boolean"');
    });

    it('should include conversations and dialogue entries', () => {
      const xml = exporter.exportToXML(mockStory);

      expect(xml).toContain('<Conversations>');
      expect(xml).toContain('<Conversation ID="1"');
      expect(xml).toContain('<DialogueEntries>');
      expect(xml).toContain('<DialogueEntry');
    });

    it('should escape XML entities', () => {
      const storyWithSpecialChars = new Story({
        metadata: { title: 'Test & <Story>' },
      });
      storyWithSpecialChars.passages.clear();
      const passage = new Passage({
        id: 'p1',
        title: 'Test "Passage"',
        content: 'Content with <tags> & "quotes"',
        tags: [],
      });
      storyWithSpecialChars.passages.set(passage.id, passage);

      const xml = exporter.exportToXML(storyWithSpecialChars);

      expect(xml).toContain('Test &amp; &lt;Story&gt;');
      expect(xml).toContain('Test &quot;Passage&quot;');
    });

    it('should include outgoing links', () => {
      const xml = exporter.exportToXML(mockStory);

      expect(xml).toContain('<OutgoingLinks>');
      expect(xml).toContain('<Link');
    });
  });

  describe('exportToJSON', () => {
    it('should generate valid ChatMapper JSON', () => {
      const json = exporter.exportToJSON(mockStory);
      const parsed = JSON.parse(json);

      expect(parsed.title).toBe('Test Story');
      expect(parsed.conversations).toHaveLength(1);
      expect(parsed.actors).toBeDefined();
      expect(parsed.variables).toBeDefined();
    });
  });
});

describe('ChatMapperImporter', () => {
  let importer: ChatMapperImporter;
  let mockChatMapperXML: string;

  beforeEach(() => {
    importer = new ChatMapperImporter();
    mockChatMapperXML = `<?xml version="1.0" encoding="utf-8"?>
<ChatMapperProject>
  <Title>Test Story</Title>
  <Version>1.0</Version>
  <Actors>
    <Actor ID="1">
      <Name>Player</Name>
      <IsPlayer>true</IsPlayer>
    </Actor>
    <Actor ID="2">
      <Name>NPC</Name>
      <IsPlayer>false</IsPlayer>
    </Actor>
  </Actors>
  <Variables>
    <Variable Name="score" InitialValue="0" Type="Number" />
    <Variable Name="questComplete" InitialValue="false" Type="Boolean" />
  </Variables>
  <Conversations>
    <Conversation ID="1" Title="Test Conversation">
      <DialogueEntries>
        <DialogueEntry ID="1" ConversationID="1" IsRoot="true" IsGroup="false">
          <Actor>NPC</Actor>
          <MenuText>Start</MenuText>
          <DialogueText>Welcome!</DialogueText>
          <OutgoingLinks>
            <Link OriginID="1" DestinationID="2" Priority="0" />
          </OutgoingLinks>
        </DialogueEntry>
        <DialogueEntry ID="2" ConversationID="1" IsRoot="false" IsGroup="false">
          <DialogueText>Next dialogue</DialogueText>
          <OutgoingLinks></OutgoingLinks>
        </DialogueEntry>
      </DialogueEntries>
    </Conversation>
  </Conversations>
</ChatMapperProject>`;
  });

  describe('parseXML', () => {
    it('should parse ChatMapper XML to structure', () => {
      const result = importer.parseXML(mockChatMapperXML);

      expect(result.title).toBe('Test Story');
      expect(result.version).toBe('1.0');
    });

    it('should parse actors', () => {
      const result = importer.parseXML(mockChatMapperXML);

      expect(result.actors).toHaveLength(2);
      expect(result.actors[0].name).toBe('Player');
      expect(result.actors[0].isPlayer).toBe(true);
      expect(result.actors[1].name).toBe('NPC');
      expect(result.actors[1].isPlayer).toBe(false);
    });

    it('should parse variables with correct types', () => {
      const result = importer.parseXML(mockChatMapperXML);

      expect(result.variables).toHaveLength(2);
      const scoreVar = result.variables.find(v => v.name === 'score');
      expect(scoreVar?.initialValue).toBe(0);
      expect(scoreVar?.type).toBe('Number');

      const questVar = result.variables.find(v => v.name === 'questComplete');
      expect(questVar?.initialValue).toBe(false);
      expect(questVar?.type).toBe('Boolean');
    });

    it('should parse conversations', () => {
      const result = importer.parseXML(mockChatMapperXML);

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].title).toBe('Test Conversation');
    });

    it('should parse dialogue entries', () => {
      const result = importer.parseXML(mockChatMapperXML);

      expect(result.conversations[0].dialogueEntries).toHaveLength(2);
      const firstEntry = result.conversations[0].dialogueEntries[0];
      expect(firstEntry.id).toBe(1);
      expect(firstEntry.actor).toBe('NPC');
      expect(firstEntry.dialogueText).toBe('Welcome!');
    });

    it('should handle missing optional fields', () => {
      const minimalXML = `
        <ChatMapperProject>
          <Title>Test</Title>
          <Version>1.0</Version>
          <Actors></Actors>
          <Variables></Variables>
          <Conversations></Conversations>
        </ChatMapperProject>
      `;

      const result = importer.parseXML(minimalXML);

      expect(result.title).toBe('Test');
      expect(result.actors).toHaveLength(0);
      expect(result.variables).toHaveLength(0);
    });
  });

  describe('convertToWhisker', () => {
    it('should convert ChatMapper structure to Whisker story', () => {
      const chatMapperProject: ChatMapperProject = {
        title: 'Test Story',
        version: '1.0',
        conversations: [
          {
            id: 1,
            title: 'Test Conversation',
            dialogueEntries: [
              {
                id: 1,
                conversationId: 1,
                isRoot: true,
                isGroup: false,
                actor: 'NPC',
                menuText: 'Start',
                dialogueText: 'Hello!',
                outgoingLinks: [],
              },
            ],
          },
        ],
        actors: [
          { id: 1, name: 'Player', isPlayer: true },
        ],
        variables: [
          { name: 'score', initialValue: 0, type: 'Number' },
        ],
      };

      const result = importer.convertToWhisker(chatMapperProject);

      expect(result.metadata.title).toBe('Test Story');
      expect(result.passages.size).toBeGreaterThanOrEqual(1);
    });

    it('should convert dialogue entries to passages', () => {
      const chatMapperProject: ChatMapperProject = {
        title: 'Test',
        version: '1.0',
        conversations: [
          {
            id: 1,
            title: 'Conv1',
            dialogueEntries: [
              {
                id: 1,
                conversationId: 1,
                isRoot: true,
                isGroup: false,
                menuText: 'Entry 1',
                dialogueText: 'Test dialogue',
                outgoingLinks: [],
              },
            ],
          },
        ],
        actors: [],
        variables: [],
      };

      const result = importer.convertToWhisker(chatMapperProject);
      const passages = Array.from(result.passages.values());
      const passage = passages.find(p => p.title === 'Entry 1');

      expect(passage).toBeDefined();
      expect(passage!.content).toBe('Test dialogue');
    });

    it('should convert actor dialogue to formatted content', () => {
      const chatMapperProject: ChatMapperProject = {
        title: 'Test',
        version: '1.0',
        conversations: [
          {
            id: 1,
            title: 'Conv1',
            dialogueEntries: [
              {
                id: 1,
                conversationId: 1,
                isRoot: true,
                isGroup: false,
                actor: 'NPC',
                menuText: 'Entry 1',
                dialogueText: 'Hello!',
                outgoingLinks: [],
              },
            ],
          },
        ],
        actors: [],
        variables: [],
      };

      const result = importer.convertToWhisker(chatMapperProject);
      const passages = Array.from(result.passages.values());
      const passage = passages.find(p => p.title === 'Entry 1');

      expect(passage).toBeDefined();
      expect(passage!.content).toBe('NPC: "Hello!"');
    });

    it('should convert outgoing links to Whisker links', () => {
      const chatMapperProject: ChatMapperProject = {
        title: 'Test',
        version: '1.0',
        conversations: [
          {
            id: 1,
            title: 'Conv1',
            dialogueEntries: [
              {
                id: 1,
                conversationId: 1,
                isRoot: true,
                isGroup: false,
                menuText: 'Entry 1',
                dialogueText: 'Choose',
                outgoingLinks: [
                  { originDialogueId: 1, destinationDialogueId: 2, isConnector: false, priority: 0 },
                  { originDialogueId: 1, destinationDialogueId: 3, isConnector: false, priority: 1 },
                ],
              },
            ],
          },
        ],
        actors: [],
        variables: [],
      };

      const result = importer.convertToWhisker(chatMapperProject);
      const passages = Array.from(result.passages.values());
      const passage = passages.find(p => p.title === 'Entry 1');

      expect(passage).toBeDefined();
      expect(passage!.content).toContain('[[Choice 1|Entry_2]]');
      expect(passage!.content).toContain('[[Choice 2|Entry_3]]');
    });

    it('should preserve variables', () => {
      const chatMapperProject: ChatMapperProject = {
        title: 'Test',
        version: '1.0',
        conversations: [],
        actors: [
          { id: 1, name: 'Hero', isPlayer: true },
        ],
        variables: [
          { name: 'health', initialValue: 100, type: 'Number' },
        ],
      };

      const result = importer.convertToWhisker(chatMapperProject);

      expect(result.variables.size).toBe(1);
      expect(result.variables.get('health')?.initial).toBe(100);
      // Actors may or may not be in metadata depending on implementation
    });

    it('should preserve canvas positions', () => {
      const chatMapperProject: ChatMapperProject = {
        title: 'Test',
        version: '1.0',
        conversations: [
          {
            id: 1,
            title: 'Conv1',
            dialogueEntries: [
              {
                id: 1,
                conversationId: 1,
                isRoot: true,
                isGroup: false,
                dialogueText: 'Test',
                outgoingLinks: [],
                canvasRect: { x: 100, y: 200, width: 300, height: 150 },
              },
            ],
          },
        ],
        actors: [],
        variables: [],
      };

      const result = importer.convertToWhisker(chatMapperProject);
      const passages = Array.from(result.passages.values());
      // Find a passage with the expected position (not the default passage)
      const passage = passages.find(p => p.position?.x === 100 && p.position?.y === 200);

      expect(passage).toBeDefined();
      expect(passage!.position).toEqual({ x: 100, y: 200 });
      expect(passage!.size).toEqual({ width: 300, height: 150 });
    });
  });

  describe('importFromXML', () => {
    it('should import complete XML to Whisker story', () => {
      const result = importer.importFromXML(mockChatMapperXML);

      expect(result.metadata.title).toBe('Test Story');
      expect(result.passages.size).toBeGreaterThanOrEqual(2);
      expect(result.metadata.created).toBeDefined();
      expect(result.metadata.modified).toBeDefined();
    });
  });

  describe('importFromJSON', () => {
    it('should import ChatMapper JSON to Whisker story', () => {
      const project: ChatMapperProject = {
        title: 'Test Story',
        version: '1.0',
        conversations: [
          {
            id: 1,
            title: 'Conv1',
            dialogueEntries: [
              {
                id: 1,
                conversationId: 1,
                isRoot: true,
                isGroup: false,
                dialogueText: 'Test',
                outgoingLinks: [],
              },
            ],
          },
        ],
        actors: [],
        variables: [],
      };

      const result = importer.importFromJSON(JSON.stringify(project));

      expect(result.metadata.title).toBe('Test Story');
      expect(result.passages.size).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('ChatMapperAdapter', () => {
  let adapter: ChatMapperAdapter;
  let mockStory: Story;

  beforeEach(() => {
    adapter = new ChatMapperAdapter();
    mockStory = new Story({
      metadata: { title: 'Test Story' },
      startPassage: 'p1',
    });
    mockStory.passages.clear();
    const passage = new Passage({
      id: 'p1',
      title: 'Start',
      content: 'NPC: "Hello!"',
      tags: [],
    });
    mockStory.passages.set(passage.id, passage);
    mockStory.startPassage = 'p1';
  });

  describe('export', () => {
    it('should export to XML by default', () => {
      const result = adapter.export(mockStory);

      expect(result).toContain('<?xml version="1.0"');
      expect(result).toContain('<ChatMapperProject>');
    });

    it('should export to XML format explicitly', () => {
      const result = adapter.export(mockStory, 'xml');

      expect(result).toContain('<?xml version="1.0"');
    });

    it('should export to JSON format', () => {
      const result = adapter.export(mockStory, 'json');
      const parsed = JSON.parse(result);

      expect(parsed.title).toBe('Test Story');
    });
  });

  describe('import', () => {
    const mockXML = `
      <ChatMapperProject>
        <Title>Test</Title>
        <Version>1.0</Version>
        <Actors></Actors>
        <Variables></Variables>
        <Conversations>
          <Conversation ID="1" Title="Conv1">
            <DialogueEntries>
              <DialogueEntry ID="1" ConversationID="1" IsRoot="true" IsGroup="false">
                <DialogueText>Test</DialogueText>
              </DialogueEntry>
            </DialogueEntries>
          </Conversation>
        </Conversations>
      </ChatMapperProject>
    `;

    it('should import from XML by default', () => {
      const result = adapter.import(mockXML);

      expect(result.metadata.title).toBe('Test');
      expect(result.passages.size).toBeGreaterThanOrEqual(1);
    });

    it('should import from XML format explicitly', () => {
      const result = adapter.import(mockXML, 'xml');

      expect(result.metadata.title).toBe('Test');
    });

    it('should import from JSON format', () => {
      const jsonContent = JSON.stringify({
        title: 'Test',
        version: '1.0',
        conversations: [],
        actors: [],
        variables: [],
      });

      const result = adapter.import(jsonContent, 'json');

      expect(result.metadata.title).toBe('Test');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve story data through XML export and import', () => {
      const exported = adapter.export(mockStory, 'xml');
      const imported = adapter.import(exported, 'xml');

      expect(imported.metadata.title).toBe(mockStory.metadata.title);
      expect(imported.passages.size).toBeGreaterThanOrEqual(mockStory.passages.size);
    });

    it('should preserve story data through JSON export and import', () => {
      const exported = adapter.export(mockStory, 'json');
      const imported = adapter.import(exported, 'json');

      expect(imported.metadata.title).toBe(mockStory.metadata.title);
      expect(imported.passages.size).toBeGreaterThanOrEqual(mockStory.passages.size);
    });
  });
});
