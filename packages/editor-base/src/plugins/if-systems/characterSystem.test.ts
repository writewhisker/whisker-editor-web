import { describe, it, expect, beforeEach } from 'vitest';
import { pluginManager } from '../PluginManager';
import { pluginStoreActions } from '../index';
import { characterSystem, type Character } from './characterSystem';

describe('Character System Plugin', () => {
  beforeEach(() => {
    pluginManager.reset();
  });

  const mockCharacters: Character[] = [
    {
      id: 'alice',
      name: 'Alice',
      description: 'A friendly merchant',
      pronouns: 'she/her',
      role: 'merchant',
      traits: ['friendly', 'honest'],
      location: 'market',
    },
    {
      id: 'bob',
      name: 'Bob',
      description: 'A mysterious stranger',
      pronouns: 'he/him',
      role: 'stranger',
      traits: ['mysterious', 'quiet'],
    },
  ];

  const createContext = () => ({
    storyState: {
      characters: null,
    } as any,
    variables: new Map(),
    currentPassage: null,
  });

  describe('registration', () => {
    it('should register successfully', async () => {
      await pluginStoreActions.register(characterSystem);
      expect(pluginManager.hasPlugin('character-system')).toBe(true);
    });

    it('should provide character passage type', async () => {
      await pluginStoreActions.register(characterSystem);
      const types = pluginManager.getPassageTypes();
      expect(types.find(t => t.type === 'character')).toBeDefined();
    });

    it('should provide character actions', async () => {
      await pluginStoreActions.register(characterSystem);
      const actions = pluginManager.getActions();

      const actionTypes = actions.map(a => a.type);
      expect(actionTypes).toContain('character.define');
      expect(actionTypes).toContain('character.meet');
      expect(actionTypes).toContain('character.interact');
      expect(actionTypes).toContain('character.modifyRelationship');
      expect(actionTypes).toContain('character.setFlag');
      expect(actionTypes).toContain('character.setLocation');
    });

    it('should provide character conditions', async () => {
      await pluginStoreActions.register(characterSystem);
      const conditions = pluginManager.getConditions();

      const conditionTypes = conditions.map(c => c.type);
      expect(conditionTypes).toContain('character.met');
      expect(conditionTypes).toContain('character.relationship');
      expect(conditionTypes).toContain('character.hasFlag');
      expect(conditionTypes).toContain('character.atLocation');
      expect(conditionTypes).toContain('character.conversations');
      expect(conditionTypes).toContain('character.relationshipLevel');
    });
  });

  describe('define action', () => {
    it('should define a new character', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const action = characterSystem.actions!.find(a => a.type === 'character.define')!;

      await action.execute(context, mockCharacters[0]);

      expect(context.storyState.characters.characters['alice']).toBeDefined();
      expect(context.storyState.characters.characters['alice'].name).toBe('Alice');
    });

    it('should initialize relationship data', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const action = characterSystem.actions!.find(a => a.type === 'character.define')!;

      await action.execute(context, mockCharacters[0]);

      const relationship = context.storyState.characters.relationships['alice'];
      expect(relationship).toBeDefined();
      expect(relationship.met).toBe(false);
      expect(relationship.friendship).toBe(0);
      expect(relationship.romance).toBe(0);
      expect(relationship.trust).toBe(50);
    });
  });

  describe('meet action', () => {
    it('should mark character as met', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const meetAction = characterSystem.actions!.find(a => a.type === 'character.meet')!;

      await defineAction.execute(context, mockCharacters[0]);
      await meetAction.execute(context, { id: 'alice' });

      expect(context.storyState.characters.relationships['alice'].met).toBe(true);
      expect(context.variables.get('met_alice')).toBe(true);
    });

    it('should not duplicate meet', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const meetAction = characterSystem.actions!.find(a => a.type === 'character.meet')!;

      await defineAction.execute(context, mockCharacters[0]);
      await meetAction.execute(context, { id: 'alice' });
      const firstTime = context.storyState.characters.relationships['alice'].lastInteraction;

      await meetAction.execute(context, { id: 'alice' });
      const secondTime = context.storyState.characters.relationships['alice'].lastInteraction;

      expect(firstTime).toBe(secondTime); // Should not update
    });
  });

  describe('interact action', () => {
    it('should start interaction with character', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const interactAction = characterSystem.actions!.find(a => a.type === 'character.interact')!;

      await defineAction.execute(context, mockCharacters[0]);
      await interactAction.execute(context, { id: 'alice' });

      expect(context.storyState.characters.activeCharacter).toBe('alice');
      expect(context.variables.get('active_character')).toBe('alice');
      expect(context.storyState.characters.relationships['alice'].conversations).toBe(1);
    });

    it('should auto-meet on first interaction', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const interactAction = characterSystem.actions!.find(a => a.type === 'character.interact')!;

      await defineAction.execute(context, mockCharacters[0]);
      expect(context.storyState.characters.relationships['alice'].met).toBe(false);

      await interactAction.execute(context, { id: 'alice' });

      expect(context.storyState.characters.relationships['alice'].met).toBe(true);
    });

    it('should increment conversation count', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const interactAction = characterSystem.actions!.find(a => a.type === 'character.interact')!;

      await defineAction.execute(context, mockCharacters[0]);
      await interactAction.execute(context, { id: 'alice' });
      await interactAction.execute(context, { id: 'alice' });
      await interactAction.execute(context, { id: 'alice' });

      expect(context.storyState.characters.relationships['alice'].conversations).toBe(3);
    });
  });

  describe('modifyRelationship action', () => {
    it('should modify friendship', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const modifyAction = characterSystem.actions!.find(
        a => a.type === 'character.modifyRelationship'
      )!;

      await defineAction.execute(context, mockCharacters[0]);
      await modifyAction.execute(context, { id: 'alice', type: 'friendship', amount: 25 });

      expect(context.storyState.characters.relationships['alice'].friendship).toBe(25);
      expect(context.variables.get('alice_friendship')).toBe(25);
    });

    it('should respect friendship bounds (-100 to 100)', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const modifyAction = characterSystem.actions!.find(
        a => a.type === 'character.modifyRelationship'
      )!;

      await defineAction.execute(context, mockCharacters[0]);
      await modifyAction.execute(context, { id: 'alice', type: 'friendship', amount: 150 });

      expect(context.storyState.characters.relationships['alice'].friendship).toBe(100);

      await modifyAction.execute(context, { id: 'alice', type: 'friendship', amount: -300 });

      expect(context.storyState.characters.relationships['alice'].friendship).toBe(-100);
    });

    it('should respect romance/rivalry/trust bounds (0 to 100)', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const modifyAction = characterSystem.actions!.find(
        a => a.type === 'character.modifyRelationship'
      )!;

      await defineAction.execute(context, mockCharacters[0]);
      await modifyAction.execute(context, { id: 'alice', type: 'romance', amount: 150 });

      expect(context.storyState.characters.relationships['alice'].romance).toBe(100);

      await modifyAction.execute(context, { id: 'alice', type: 'romance', amount: -200 });

      expect(context.storyState.characters.relationships['alice'].romance).toBe(0);
    });
  });

  describe('setFlag action', () => {
    it('should set relationship flag', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const flagAction = characterSystem.actions!.find(a => a.type === 'character.setFlag')!;

      await defineAction.execute(context, mockCharacters[0]);
      await flagAction.execute(context, { id: 'alice', flag: 'helped_with_quest', value: true });

      expect(context.storyState.characters.relationships['alice'].flags?.has('helped_with_quest')).toBe(
        true
      );
      expect(context.variables.get('alice_helped_with_quest')).toBe(true);
    });

    it('should unset relationship flag', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const flagAction = characterSystem.actions!.find(a => a.type === 'character.setFlag')!;

      await defineAction.execute(context, mockCharacters[0]);
      await flagAction.execute(context, { id: 'alice', flag: 'test_flag', value: true });
      await flagAction.execute(context, { id: 'alice', flag: 'test_flag', value: false });

      expect(context.storyState.characters.relationships['alice'].flags?.has('test_flag')).toBe(false);
      expect(context.variables.get('alice_test_flag')).toBe(false);
    });
  });

  describe('setLocation action', () => {
    it('should update character location', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const locationAction = characterSystem.actions!.find(a => a.type === 'character.setLocation')!;

      await defineAction.execute(context, mockCharacters[0]);
      await locationAction.execute(context, { id: 'alice', location: 'tavern' });

      expect(context.storyState.characters.characters['alice'].location).toBe('tavern');
      expect(context.variables.get('alice_location')).toBe('tavern');
    });
  });

  describe('met condition', () => {
    it('should check if character is met', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const meetAction = characterSystem.actions!.find(a => a.type === 'character.meet')!;
      const condition = characterSystem.conditions!.find(c => c.type === 'character.met')!;

      await defineAction.execute(context, mockCharacters[0]);

      expect(condition.evaluate(context, { id: 'alice' })).toBe(false);

      await meetAction.execute(context, { id: 'alice' });

      expect(condition.evaluate(context, { id: 'alice' })).toBe(true);
    });
  });

  describe('relationship condition', () => {
    it('should check relationship values', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const modifyAction = characterSystem.actions!.find(
        a => a.type === 'character.modifyRelationship'
      )!;
      const condition = characterSystem.conditions!.find(c => c.type === 'character.relationship')!;

      await defineAction.execute(context, mockCharacters[0]);
      await modifyAction.execute(context, { id: 'alice', type: 'friendship', amount: 50 });

      expect(
        condition.evaluate(context, { id: 'alice', type: 'friendship', operator: 'gte', value: 50 })
      ).toBe(true);
      expect(
        condition.evaluate(context, { id: 'alice', type: 'friendship', operator: 'lt', value: 100 })
      ).toBe(true);
      expect(
        condition.evaluate(context, { id: 'alice', type: 'friendship', operator: 'gt', value: 50 })
      ).toBe(false);
    });
  });

  describe('hasFlag condition', () => {
    it('should check relationship flags', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const flagAction = characterSystem.actions!.find(a => a.type === 'character.setFlag')!;
      const condition = characterSystem.conditions!.find(c => c.type === 'character.hasFlag')!;

      await defineAction.execute(context, mockCharacters[0]);

      expect(condition.evaluate(context, { id: 'alice', flag: 'quest_complete' })).toBe(false);

      await flagAction.execute(context, { id: 'alice', flag: 'quest_complete', value: true });

      expect(condition.evaluate(context, { id: 'alice', flag: 'quest_complete' })).toBe(true);
    });
  });

  describe('atLocation condition', () => {
    it('should check character location', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const locationAction = characterSystem.actions!.find(a => a.type === 'character.setLocation')!;
      const condition = characterSystem.conditions!.find(c => c.type === 'character.atLocation')!;

      await defineAction.execute(context, mockCharacters[0]);

      expect(condition.evaluate(context, { id: 'alice', location: 'market' })).toBe(true);

      await locationAction.execute(context, { id: 'alice', location: 'tavern' });

      expect(condition.evaluate(context, { id: 'alice', location: 'tavern' })).toBe(true);
      expect(condition.evaluate(context, { id: 'alice', location: 'market' })).toBe(false);
    });
  });

  describe('conversations condition', () => {
    it('should check conversation count', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const interactAction = characterSystem.actions!.find(a => a.type === 'character.interact')!;
      const condition = characterSystem.conditions!.find(c => c.type === 'character.conversations')!;

      await defineAction.execute(context, mockCharacters[0]);
      await interactAction.execute(context, { id: 'alice' });
      await interactAction.execute(context, { id: 'alice' });
      await interactAction.execute(context, { id: 'alice' });

      expect(condition.evaluate(context, { id: 'alice', operator: 'gte', count: 3 })).toBe(true);
      expect(condition.evaluate(context, { id: 'alice', operator: 'lt', count: 5 })).toBe(true);
    });
  });

  describe('relationshipLevel condition', () => {
    it('should check friendship levels', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const modifyAction = characterSystem.actions!.find(
        a => a.type === 'character.modifyRelationship'
      )!;
      const condition = characterSystem.conditions!.find(c => c.type === 'character.relationshipLevel')!;

      await defineAction.execute(context, mockCharacters[0]);

      expect(condition.evaluate(context, { id: 'alice', type: 'friendship', level: 'neutral' })).toBe(
        true
      );

      await modifyAction.execute(context, { id: 'alice', type: 'friendship', amount: 30 });

      expect(condition.evaluate(context, { id: 'alice', type: 'friendship', level: 'friendly' })).toBe(
        true
      );

      await modifyAction.execute(context, { id: 'alice', type: 'friendship', amount: 40 });

      expect(condition.evaluate(context, { id: 'alice', type: 'friendship', level: 'close' })).toBe(
        true
      );
    });

    it('should check romance levels', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      const defineAction = characterSystem.actions!.find(a => a.type === 'character.define')!;
      const modifyAction = characterSystem.actions!.find(
        a => a.type === 'character.modifyRelationship'
      )!;
      const condition = characterSystem.conditions!.find(c => c.type === 'character.relationshipLevel')!;

      await defineAction.execute(context, mockCharacters[0]);
      await modifyAction.execute(context, { id: 'alice', type: 'romance', amount: 50 });

      expect(condition.evaluate(context, { id: 'alice', type: 'romance', level: 'close' })).toBe(true);

      await modifyAction.execute(context, { id: 'alice', type: 'romance', amount: 30 });

      expect(condition.evaluate(context, { id: 'alice', type: 'romance', level: 'intimate' })).toBe(
        true
      );
    });
  });

  describe('runtime hooks', () => {
    it('should initialize character state', async () => {
      await pluginStoreActions.register(characterSystem);

      const context = createContext();
      await pluginManager.executeHook('onInit', context);

      expect(context.storyState.characters).toBeDefined();
      expect(context.storyState.characters.characters).toEqual({});
      expect(context.storyState.characters.relationships).toEqual({});
    });
  });
});
