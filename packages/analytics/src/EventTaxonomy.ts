/**
 * Event Taxonomy - Defines trackable events and validation
 */

import type {
  EventCategory,
  EventCategories,
  MetadataSchema,
  MetadataFieldType,
  EventDefinition,
  AnalyticsEvent,
} from './types';

/**
 * Core event categories and their allowed actions
 */
const CATEGORIES: EventCategories = {
  story: ['start', 'resume', 'complete', 'abandon', 'restart'],
  passage: ['view', 'exit', 'reread'],
  choice: ['presented', 'selected', 'hover'],
  save: ['create', 'load', 'delete', 'autosave'],
  error: ['script', 'resource', 'state'],
  user: ['consent_change', 'setting_change', 'feedback'],
  test: ['exposure', 'conversion'],
};

/**
 * Metadata schemas for each event type
 */
const METADATA_SCHEMAS: Record<string, MetadataSchema> = {
  'story.start': {
    isFirstLaunch: 'boolean',
    restoreFromSave: 'boolean',
    initialPassage: 'string',
  },
  'story.resume': {
    lastSessionTime: 'number?',
    resumePassage: 'string',
    totalSessions: 'number?',
  },
  'story.complete': {
    completionPassage: 'string',
    totalPlaytime: 'number?',
    totalSessions: 'number?',
    choicesMade: 'number?',
    endingReached: 'string?',
  },
  'story.abandon': {
    lastPassage: 'string',
    totalPlaytime: 'number?',
    estimatedProgress: 'number?',
    sessionsSinceLastProgress: 'number?',
  },
  'story.restart': {
    previousProgress: 'number?',
    previousPlaytime: 'number?',
    restartReason: 'string?',
  },
  'passage.view': {
    passageId: 'string',
    passageName: 'string?',
    wordCount: 'number?',
    previousPassage: 'string?',
    transitionType: 'string?',
    estimatedReadTime: 'number?',
  },
  'passage.exit': {
    passageId: 'string',
    timeOnPassage: 'number?',
    wordsPerMinute: 'number?',
    exitVia: 'string?',
    choiceSelected: 'string?',
  },
  'passage.reread': {
    passageId: 'string',
    previousVisits: 'number?',
    timeSinceLastVisit: 'number?',
    visitPath: 'table?',
  },
  'choice.presented': {
    passageId: 'string',
    choiceIds: 'table?',
    choiceCount: 'number',
    choiceTexts: 'table?',
    conditionalChoices: 'table?',
    displayStyle: 'string?',
  },
  'choice.selected': {
    passageId: 'string',
    choiceId: 'string',
    choiceText: 'string?',
    choiceIndex: 'number?',
    timeToDecide: 'number?',
    totalChoicesPresented: 'number?',
    destinationPassage: 'string?',
  },
  'choice.hover': {
    passageId: 'string',
    choiceId: 'string',
    hoverDuration: 'number?',
    hoverSequence: 'number?',
  },
  'save.create': {
    saveId: 'string',
    saveName: 'string?',
    currentPassage: 'string',
    playtime: 'number?',
    saveSlot: 'number?',
    autoSave: 'boolean?',
  },
  'save.load': {
    saveId: 'string',
    saveName: 'string?',
    saveTimestamp: 'number?',
    loadedPassage: 'string',
    timeSinceSave: 'number?',
  },
  'save.delete': {
    saveId: 'string',
    saveName: 'string?',
    saveAge: 'number?',
  },
  'save.autosave': {
    currentPassage: 'string',
    trigger: 'string?',
    previousAutosaveAge: 'number?',
  },
  'error.script': {
    errorType: 'string',
    errorMessage: 'string',
    stackTrace: 'string?',
    passageId: 'string?',
    scriptLine: 'number?',
    severity: 'string',
  },
  'error.resource': {
    resourceType: 'string',
    resourceUrl: 'string?',
    errorCode: 'number?',
    retryCount: 'number?',
  },
  'error.state': {
    errorType: 'string',
    attemptedPassage: 'string?',
    currentPassage: 'string?',
    recoveryAction: 'string?',
  },
  'user.consent_change': {
    previousLevel: 'number',
    newLevel: 'number',
    consentVersion: 'string?',
    changedVia: 'string?',
  },
  'user.setting_change': {
    settingName: 'string',
    previousValue: 'any?',
    newValue: 'any',
    settingCategory: 'string?',
  },
  'user.feedback': {
    feedbackType: 'string',
    feedbackText: 'string?',
    currentPassage: 'string?',
    rating: 'number?',
  },
  'test.exposure': {
    testId: 'string',
    variantId: 'string',
    assignmentMethod: 'string?',
    testDescription: 'string?',
  },
  'test.conversion': {
    testId: 'string',
    variantId: 'string',
    conversionType: 'string',
    timeToConversion: 'number?',
    value: 'number?',
  },
};

/**
 * Custom event registry
 */
const customEvents: Map<string, EventDefinition> = new Map();

/**
 * Get type name from type string (handle optional suffix)
 */
function getTypeName(typeStr: MetadataFieldType): { type: string; optional: boolean } {
  const optional = typeStr.endsWith('?');
  const type = optional ? typeStr.slice(0, -1) : typeStr;
  return { type, optional };
}

/**
 * Validate a value against expected type
 */
function validateType(value: unknown, expectedType: string): boolean {
  if (expectedType === 'any') {
    return true;
  }
  if (expectedType === 'table') {
    return typeof value === 'object' && value !== null;
  }
  return typeof value === expectedType;
}

/**
 * EventTaxonomy class
 */
export class EventTaxonomy {
  private categories: EventCategories;
  private metadataSchemas: Record<string, MetadataSchema>;

  constructor() {
    // Deep copy categories
    this.categories = {};
    for (const [cat, actions] of Object.entries(CATEGORIES)) {
      this.categories[cat] = [...actions];
    }

    // Deep copy schemas
    this.metadataSchemas = {};
    for (const [key, schema] of Object.entries(METADATA_SCHEMAS)) {
      this.metadataSchemas[key] = { ...schema };
    }
  }

  /**
   * Factory method
   */
  static create(): EventTaxonomy {
    return new EventTaxonomy();
  }

  /**
   * Define a custom event type
   */
  defineCustomEvent(definition: EventDefinition): { success: boolean; error?: string } {
    if (!definition || typeof definition !== 'object') {
      return { success: false, error: 'Event definition must be an object' };
    }

    if (typeof definition.category !== 'string') {
      return { success: false, error: 'Event category must be a string' };
    }

    if (!Array.isArray(definition.actions) || definition.actions.length === 0) {
      return { success: false, error: 'Event actions must be a non-empty array' };
    }

    const category = definition.category;

    // Create category if doesn't exist
    if (!this.categories[category]) {
      this.categories[category] = [];
    }

    // Add actions
    for (const action of definition.actions) {
      if (!this.categories[category].includes(action)) {
        this.categories[category].push(action);
      }

      // Register metadata schema if provided
      if (definition.metadataSchema) {
        const eventType = `${category}.${action}`;
        this.metadataSchemas[eventType] = { ...definition.metadataSchema };
      }
    }

    customEvents.set(category, definition);
    return { success: true };
  }

  /**
   * Register a custom event type (alias for defineCustomEvent)
   */
  registerCustomEvent(definition: EventDefinition): void {
    this.defineCustomEvent(definition);
  }

  /**
   * Validate an event structure
   */
  validateEvent(event: AnalyticsEvent): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (typeof event.category !== 'string') {
      errors.push("Missing or invalid 'category' field");
    }

    if (typeof event.action !== 'string') {
      errors.push("Missing or invalid 'action' field");
    }

    if (typeof event.timestamp !== 'number') {
      errors.push("Missing or invalid 'timestamp' field");
    }

    if (typeof event.sessionId !== 'string') {
      errors.push("Missing or invalid 'sessionId' field");
    }

    if (typeof event.storyId !== 'string') {
      errors.push("Missing or invalid 'storyId' field");
    }

    // Validate category exists (warning, not error - for flexibility)
    if (event.category && !this.categories[event.category]) {
      warnings.push(`Unknown event type: ${event.category}.${event.action}`);
    } else if (event.category && event.action) {
      // Validate action exists in category (warning, not error)
      const actions = this.categories[event.category];
      if (actions && !actions.includes(event.action)) {
        warnings.push(`Unknown event type: ${event.category}.${event.action}`);
      }
    }

    // Validate metadata schema if defined
    if (event.category && event.action) {
      const eventType = `${event.category}.${event.action}`;
      const schema = this.metadataSchemas[eventType];

      if (schema) {
        const metadataErrors = this.validateMetadata(event.metadata || {}, schema, eventType);
        errors.push(...metadataErrors);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate metadata against schema
   */
  validateMetadata(
    metadata: Record<string, unknown>,
    schema: MetadataSchema,
    eventType: string
  ): string[] {
    const errors: string[] = [];

    for (const [field, typeStr] of Object.entries(schema)) {
      const { type: expectedType, optional } = getTypeName(typeStr);
      const value = metadata[field];

      if (value === undefined || value === null) {
        if (!optional) {
          errors.push(`Missing required metadata field '${field}' for event '${eventType}'`);
        }
      } else {
        if (!validateType(value, expectedType)) {
          errors.push(
            `Invalid type for metadata field '${field}' in event '${eventType}': ` +
              `expected ${expectedType}, got ${typeof value}`
          );
        }
      }
    }

    return errors;
  }

  /**
   * Get all registered event types
   */
  getEventTypes(): string[] {
    const types: string[] = [];

    for (const [category, actions] of Object.entries(this.categories)) {
      for (const action of actions) {
        types.push(`${category}.${action}`);
      }
    }

    return types.sort();
  }

  /**
   * Get metadata schema for event type
   */
  getMetadataSchema(eventType: string): MetadataSchema | undefined {
    return this.metadataSchemas[eventType];
  }

  /**
   * Check if event type exists
   */
  eventTypeExists(category: EventCategory, action: string): boolean {
    const actions = this.categories[category];
    return actions ? actions.includes(action) : false;
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Object.keys(this.categories).sort();
  }

  /**
   * Get actions for a category
   */
  getActions(category: EventCategory): string[] {
    return this.categories[category] ? [...this.categories[category]] : [];
  }

  /**
   * Reset custom events (for testing)
   */
  resetCustomEvents(): void {
    const coreCategories = ['story', 'passage', 'choice', 'save', 'error', 'user', 'test'];

    for (const category of Array.from(customEvents.keys())) {
      if (!coreCategories.includes(category)) {
        delete this.categories[category];
      }
    }

    customEvents.clear();
  }
}

/**
 * Module-level functions
 */
export function getEventTypes(): string[] {
  const taxonomy = new EventTaxonomy();
  return taxonomy.getEventTypes();
}

export function getCategories(): string[] {
  const taxonomy = new EventTaxonomy();
  return taxonomy.getCategories();
}

export function eventTypeExists(category: EventCategory, action: string): boolean {
  const taxonomy = new EventTaxonomy();
  return taxonomy.eventTypeExists(category, action);
}
