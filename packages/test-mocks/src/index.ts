/**
 * Mock Data Generators
 *
 * Utilities for generating realistic mock data for testing.
 * Provides factories for stories, passages, and other entities.
 */

import { Story, Passage } from '@writewhisker/story-models';

/**
 * Random data generator
 */
export class MockDataGenerator {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  /**
   * Seeded random number generator
   */
  private random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Random integer between min and max (inclusive)
   */
  public randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Random element from array
   */
  public randomElement<T>(array: T[]): T {
    return array[this.randomInt(0, array.length - 1)];
  }

  /**
   * Random boolean
   */
  public randomBoolean(): boolean {
    return this.random() > 0.5;
  }

  /**
   * Random string
   */
  public randomString(length: number = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[this.randomInt(0, chars.length - 1)];
    }
    return result;
  }

  /**
   * Random ID
   */
  public randomId(): string {
    return `id-${this.randomString(12)}`;
  }
}

/**
 * Story name generator
 */
const STORY_PREFIXES = [
  'The',
  'A',
  'An',
  'My',
  'Our',
  'Your',
  'Their',
];

const STORY_ADJECTIVES = [
  'Great',
  'Mysterious',
  'Ancient',
  'Lost',
  'Forgotten',
  'Secret',
  'Hidden',
  'Magical',
  'Dark',
  'Bright',
];

const STORY_NOUNS = [
  'Adventure',
  'Journey',
  'Quest',
  'Tale',
  'Story',
  'Legend',
  'Chronicle',
  'Saga',
  'Mystery',
  'Discovery',
];

export function generateStoryName(generator: MockDataGenerator = new MockDataGenerator()): string {
  const prefix = generator.randomElement(STORY_PREFIXES);
  const adjective = generator.randomElement(STORY_ADJECTIVES);
  const noun = generator.randomElement(STORY_NOUNS);
  return `${prefix} ${adjective} ${noun}`;
}

/**
 * Passage content generator
 */
const CONTENT_TEMPLATES = [
  'You find yourself in {location}. {observation}',
  '{character} appears before you. {dialogue}',
  'The path splits into {number} directions.',
  'You discover {item}. It seems {adjective}.',
  'A {creature} blocks your way. {action}',
];

const LOCATIONS = [
  'a dark forest',
  'an ancient temple',
  'a bustling marketplace',
  'a mysterious cave',
  'a grand castle',
];

const OBSERVATIONS = [
  'Something feels strange.',
  'You sense danger nearby.',
  'The air is thick with magic.',
  'All is quiet.',
  'You hear distant sounds.',
];

const CHARACTERS = [
  'a wise old wizard',
  'a mysterious stranger',
  'a friendly merchant',
  'a brave knight',
  'a cunning thief',
];

const DIALOGUES = [
  '"Greetings, traveler," they say.',
  '"I have something for you," they whisper.',
  '"Be careful," they warn.',
  '"What brings you here?" they ask.',
  '"Follow me," they beckon.',
];

export function generatePassageContent(generator: MockDataGenerator = new MockDataGenerator()): string {
  const template = generator.randomElement(CONTENT_TEMPLATES);

  return template
    .replace('{location}', generator.randomElement(LOCATIONS))
    .replace('{observation}', generator.randomElement(OBSERVATIONS))
    .replace('{character}', generator.randomElement(CHARACTERS))
    .replace('{dialogue}', generator.randomElement(DIALOGUES))
    .replace('{number}', generator.randomInt(2, 4).toString())
    .replace('{item}', 'a strange artifact')
    .replace('{adjective}', generator.randomElement(['ancient', 'powerful', 'cursed', 'blessed']))
    .replace('{creature}', generator.randomElement(['dragon', 'troll', 'wolf', 'bear']))
    .replace('{action}', generator.randomElement(['What do you do?', 'Fight or flee?', 'Proceed with caution.']));
}

/**
 * Mock passage factory
 */
export function mockPassage(overrides?: Partial<Passage>): Passage {
  const generator = new MockDataGenerator();

  return new Passage({
    id: generator.randomId(),
    title: `Passage ${generator.randomInt(1, 1000)}`,
    content: generatePassageContent(generator),
    tags: generator.randomBoolean()
      ? [generator.randomElement(['start', 'end', 'combat', 'dialog', 'puzzle'])]
      : [],
    position: {
      x: generator.randomInt(0, 1000),
      y: generator.randomInt(0, 1000),
    },
    ...overrides,
  });
}

/**
 * Mock story factory
 */
export function mockStory(overrides?: Partial<Story>): Story {
  const generator = new MockDataGenerator();
  const passageCount = generator.randomInt(3, 10);
  const passages: Record<string, any> = {};

  for (let i = 0; i < passageCount; i++) {
    const passageId = `passage-${i}`;
    const passage = mockPassage({
      id: passageId,
      title: i === 0 ? 'Start' : `Passage ${i}`,
      position: {
        x: (i % 3) * 300,
        y: Math.floor(i / 3) * 300,
      },
    });
    passages[passageId] = passage.serialize();
  }

  const now = new Date().toISOString();
  const createdTime = new Date(Date.now() - generator.randomInt(0, 86400000)).toISOString();

  // Create story with proper data structure
  const story = new Story({
    metadata: overrides?.metadata || {
      title: generateStoryName(generator),
      author: '',
      version: '1.0.0',
      created: createdTime,
      modified: now,
    },
    startPassage: overrides?.startPassage || 'passage-0',
    passages,
    variables: {},
  });

  // Apply overrides that are Map-based properties
  if (overrides?.passages) {
    story.passages = overrides.passages;
  }
  if (overrides?.variables) {
    story.variables = overrides.variables;
  }
  if (overrides?.settings) {
    story.settings = overrides.settings;
  }
  if (overrides?.stylesheets) {
    story.stylesheets = overrides.stylesheets;
  }
  if (overrides?.scripts) {
    story.scripts = overrides.scripts;
  }
  if (overrides?.assets) {
    story.assets = overrides.assets;
  }
  if (overrides?.luaFunctions) {
    story.luaFunctions = overrides.luaFunctions;
  }

  return story;
}

/**
 * Batch generators
 */
export function mockPassages(count: number, overrides?: Partial<Passage>): Passage[] {
  const passages: Passage[] = [];
  for (let i = 0; i < count; i++) {
    passages.push(mockPassage(overrides));
  }
  return passages;
}

export function mockStories(count: number, overrides?: Partial<Story>): Story[] {
  const stories: Story[] = [];
  for (let i = 0; i < count; i++) {
    stories.push(mockStory(overrides));
  }
  return stories;
}

/**
 * Mock API responses
 */
export interface MockAPIResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export function mockAPISuccess<T>(data: T): MockAPIResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {
      'content-type': 'application/json',
    },
  };
}

export function mockAPIError(status: number = 500, message: string = 'Internal Server Error'): MockAPIResponse<null> {
  return {
    data: null,
    status,
    statusText: message,
    headers: {
      'content-type': 'application/json',
    },
  };
}

/**
 * Mock storage
 */
export class MockStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  public getItem(key: string): string | null {
    return this.data.get(key) || null;
  }

  public setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  public removeItem(key: string): void {
    this.data.delete(key);
  }

  public clear(): void {
    this.data.clear();
  }

  public key(index: number): string | null {
    const keys = Array.from(this.data.keys());
    return keys[index] || null;
  }
}

/**
 * Mock fetch
 */
export interface MockFetchOptions {
  delay?: number;
  status?: number;
  statusText?: string;
  json?: any;
  text?: string;
  error?: Error;
}

export function mockFetch(options: MockFetchOptions = {}): typeof fetch {
  return async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Simulate network delay
    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }

    // Simulate error
    if (options.error) {
      throw options.error;
    }

    const status = options.status || 200;
    const statusText = options.statusText || 'OK';

    return {
      ok: status >= 200 && status < 300,
      status,
      statusText,
      headers: new Headers({
        'content-type': 'application/json',
      }),
      json: async () => options.json || {},
      text: async () => options.text || JSON.stringify(options.json || {}),
      blob: async () => new Blob(),
      arrayBuffer: async () => new ArrayBuffer(0),
      formData: async () => new FormData(),
      clone: function () {
        return this;
      },
      body: null,
      bodyUsed: false,
      url: typeof input === 'string' ? input : input.toString(),
      redirected: false,
      type: 'basic',
    } as Response;
  };
}

/**
 * Mock timer
 */
export class MockTimer {
  private currentTime = 0;
  private timers: Array<{ time: number; callback: () => void }> = [];

  public setTimeout(callback: () => void, delay: number): number {
    const id = this.timers.length;
    this.timers.push({
      time: this.currentTime + delay,
      callback,
    });
    return id;
  }

  public advance(ms: number): void {
    this.currentTime += ms;

    // Execute timers that have expired
    const expired = this.timers.filter(t => t.time <= this.currentTime);
    for (const timer of expired) {
      timer.callback();
      this.timers = this.timers.filter(t => t !== timer);
    }
  }

  public reset(): void {
    this.currentTime = 0;
    this.timers = [];
  }
}

/**
 * Mock event emitter
 */
export class MockEventEmitter {
  private listeners = new Map<string, Array<(...args: any[]) => void>>();

  public on(event: string, listener: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  public emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      for (const listener of eventListeners) {
        listener(...args);
      }
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}
