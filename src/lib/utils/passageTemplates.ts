import type { PassageData } from '@writewhisker/core-ts';
import { nanoid } from 'nanoid';

export interface PassageTemplate {
  id: string;
  name: string;
  description: string;
  category: 'narrative' | 'choice' | 'conditional' | 'scripted' | 'custom';
  icon?: string;
  template: Partial<PassageData>;
}

export const defaultTemplates: PassageTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Passage',
    description: 'Empty passage to start from scratch',
    category: 'narrative',
    icon: '📄',
    template: {
      title: 'New Passage',
      content: '',
      choices: [],
      tags: [],
    },
  },
  {
    id: 'simple-choice',
    name: 'Simple Choice',
    description: 'Passage with two basic choices',
    category: 'choice',
    icon: '🔀',
    template: {
      title: 'Choice Point',
      content: 'You stand at a crossroads. Which path do you take?',
      choices: [
        {
          id: nanoid(),
          text: 'Take the left path',
          target: '',
        },
        {
          id: nanoid(),
          text: 'Take the right path',
          target: '',
        },
      ],
      tags: ['choice'],
    },
  },
  {
    id: 'multiple-choice',
    name: 'Multiple Choice',
    description: 'Passage with three or more choices',
    category: 'choice',
    icon: '🎯',
    template: {
      title: 'Multiple Options',
      content: 'Several paths lie before you. What will you do?',
      choices: [
        { id: nanoid(), text: 'Option A', target: '' },
        { id: nanoid(), text: 'Option B', target: '' },
        { id: nanoid(), text: 'Option C', target: '' },
        { id: nanoid(), text: 'Option D', target: '' },
      ],
      tags: ['choice', 'branching'],
    },
  },
  {
    id: 'conditional-choice',
    name: 'Conditional Choice',
    description: 'Choices that appear based on conditions',
    category: 'conditional',
    icon: '⚡',
    template: {
      title: 'Conditional Passage',
      content: 'The available options depend on your previous decisions.',
      choices: [
        {
          id: nanoid(),
          text: 'Option if condition is true',
          target: '',
          condition: 'hasKey == true',
        },
        {
          id: nanoid(),
          text: 'Option if condition is false',
          target: '',
          condition: 'hasKey == false',
        },
      ],
      tags: ['conditional'],
    },
  },
  {
    id: 'variable-setter',
    name: 'Variable Setter',
    description: 'Passage that sets variables',
    category: 'scripted',
    icon: '🔢',
    template: {
      title: 'Variable Setup',
      content: 'This passage sets up important story variables.',
      onEnterScript: `-- Set initial variables
health = 100
coins = 0
inventory = {}`,
      choices: [
        { id: nanoid(), text: 'Continue', target: '' },
      ],
      tags: ['script', 'variables'],
    },
  },
  {
    id: 'ending',
    name: 'Story Ending',
    description: 'Final passage with no choices',
    category: 'narrative',
    icon: '🎬',
    template: {
      title: 'The End',
      content: 'Your journey has come to an end.\n\nThank you for playing!',
      choices: [],
      tags: ['ending'],
    },
  },
  {
    id: 'timed-choice',
    name: 'Timed Choice',
    description: 'Choice with time limit',
    category: 'scripted',
    icon: '⏱️',
    template: {
      title: 'Quick Decision',
      content: 'You must decide quickly!',
      choices: [
        {
          id: nanoid(),
          text: 'Act immediately',
          target: '',
        },
        {
          id: nanoid(),
          text: 'Wait and see',
          target: '',
        },
      ],
      onEnterScript: `-- Start 10-second timer
startTimer(10)`,
      tags: ['timed', 'choice'],
    },
  },
  {
    id: 'combat',
    name: 'Combat Encounter',
    description: 'Battle or conflict scene',
    category: 'scripted',
    icon: '⚔️',
    template: {
      title: 'Combat',
      content: 'An enemy appears before you!',
      onEnterScript: `-- Initialize combat
enemyHealth = 50
playerHealth = health or 100`,
      choices: [
        {
          id: nanoid(),
          text: 'Attack',
          target: '',
        },
        {
          id: nanoid(),
          text: 'Defend',
          target: '',
        },
        {
          id: nanoid(),
          text: 'Flee',
          target: '',
          condition: 'canFlee == true',
        },
      ],
      tags: ['combat', 'scripted'],
    },
  },
  {
    id: 'inventory-check',
    name: 'Inventory Check',
    description: 'Passage that checks player inventory',
    category: 'conditional',
    icon: '🎒',
    template: {
      title: 'Inventory Gate',
      content: 'You need certain items to proceed.',
      choices: [
        {
          id: nanoid(),
          text: 'Use the key',
          target: '',
          condition: 'hasItem("key")',
        },
        {
          id: nanoid(),
          text: 'Turn back',
          target: '',
        },
      ],
      tags: ['inventory', 'conditional'],
    },
  },
  {
    id: 'dialogue',
    name: 'Dialogue',
    description: 'Conversation with NPC',
    category: 'narrative',
    icon: '💬',
    template: {
      title: 'Conversation',
      content: '"Hello, traveler," the merchant says. "What brings you here?"',
      choices: [
        { id: nanoid(), text: '"I\'m looking for supplies."', target: '' },
        { id: nanoid(), text: '"Just passing through."', target: '' },
        { id: nanoid(), text: '[Say nothing and leave]', target: '' },
      ],
      tags: ['dialogue', 'npc'],
    },
  },
];

/**
 * Passage Template Manager
 */
export class PassageTemplateManager {
  private templates: Map<string, PassageTemplate>;
  private customTemplates: Map<string, PassageTemplate>;
  private storageKey = 'whisker-custom-templates';

  constructor() {
    this.templates = new Map(defaultTemplates.map(t => [t.id, t]));
    this.customTemplates = new Map();
    this.loadCustomTemplates();
  }

  /**
   * Get all templates
   */
  getAllTemplates(): PassageTemplate[] {
    return [
      ...Array.from(this.templates.values()),
      ...Array.from(this.customTemplates.values()),
    ];
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: PassageTemplate['category']): PassageTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): PassageTemplate | undefined {
    return this.templates.get(id) || this.customTemplates.get(id);
  }

  /**
   * Create custom template from passage
   */
  createCustomTemplate(
    name: string,
    description: string,
    category: PassageTemplate['category'],
    passageData: Partial<PassageData>
  ): PassageTemplate {
    const id = `custom-${Date.now()}`;
    const template: PassageTemplate = {
      id,
      name,
      description,
      category,
      icon: '⭐',
      template: passageData,
    };

    this.customTemplates.set(id, template);
    this.saveCustomTemplates();

    return template;
  }

  /**
   * Delete custom template
   */
  deleteCustomTemplate(id: string): boolean {
    if (this.customTemplates.has(id)) {
      this.customTemplates.delete(id);
      this.saveCustomTemplates();
      return true;
    }
    return false;
  }

  /**
   * Save custom templates to localStorage
   */
  private saveCustomTemplates() {
    try {
      const templates = Array.from(this.customTemplates.values());
      localStorage.setItem(this.storageKey, JSON.stringify(templates));
    } catch (error) {
      console.error('Failed to save custom templates:', error);
    }
  }

  /**
   * Load custom templates from localStorage
   */
  private loadCustomTemplates() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const templates: PassageTemplate[] = JSON.parse(saved);
        this.customTemplates = new Map(templates.map(t => [t.id, t]));
      }
    } catch (error) {
      console.error('Failed to load custom templates:', error);
    }
  }

  /**
   * Export templates to JSON
   */
  exportTemplates(): string {
    const templates = Array.from(this.customTemplates.values());
    return JSON.stringify(templates, null, 2);
  }

  /**
   * Import templates from JSON
   */
  importTemplates(json: string): number {
    try {
      const templates: PassageTemplate[] = JSON.parse(json);
      let imported = 0;

      templates.forEach(template => {
        // Generate new ID to avoid conflicts
        const newId = `custom-${Date.now()}-${imported}`;
        this.customTemplates.set(newId, {
          ...template,
          id: newId,
        });
        imported++;
      });

      this.saveCustomTemplates();
      return imported;
    } catch (error) {
      console.error('Failed to import templates:', error);
      return 0;
    }
  }
}

// Singleton instance
export const templateManager = new PassageTemplateManager();
