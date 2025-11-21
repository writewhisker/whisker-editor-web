/**
 * Custom Test Matchers
 *
 * Domain-specific assertion matchers for Whisker stories.
 * Provides expressive testing API for story validation.
 */

import type { Story, Passage } from '@writewhisker/story-models';

/**
 * Matcher result interface
 */
export interface MatcherResult {
  pass: boolean;
  message: () => string;
}

/**
 * Story matchers
 */
export const storyMatchers = {
  /**
   * Check if story has a specific passage
   */
  toHavePassage(story: Story, title: string): MatcherResult {
    const passage = story.passages.find(p => p.title === title);
    return {
      pass: !!passage,
      message: () =>
        passage
          ? `Expected story not to have passage "${title}"`
          : `Expected story to have passage "${title}"`,
    };
  },

  /**
   * Check if story has a start passage
   */
  toHaveStartPassage(story: Story): MatcherResult {
    const hasStart = !!story.startPassage && story.passages.some(p => p.title === story.startPassage);
    return {
      pass: hasStart,
      message: () =>
        hasStart
          ? 'Expected story not to have a valid start passage'
          : `Expected story to have a valid start passage, got "${story.startPassage}"`,
    };
  },

  /**
   * Check if story has broken links
   */
  toHaveBrokenLinks(story: Story): MatcherResult {
    const brokenLinks = findBrokenLinks(story);
    return {
      pass: brokenLinks.length > 0,
      message: () =>
        brokenLinks.length > 0
          ? `Expected story not to have broken links, but found ${brokenLinks.length}`
          : 'Expected story to have broken links',
    };
  },

  /**
   * Check if story has no broken links
   */
  toHaveNoBrokenLinks(story: Story): MatcherResult {
    const brokenLinks = findBrokenLinks(story);
    return {
      pass: brokenLinks.length === 0,
      message: () =>
        brokenLinks.length === 0
          ? 'Expected story to have broken links'
          : `Expected story to have no broken links, but found ${brokenLinks.length}: ${brokenLinks.join(', ')}`,
    };
  },

  /**
   * Check if story has specific number of passages
   */
  toHavePassageCount(story: Story, count: number): MatcherResult {
    return {
      pass: story.passages.length === count,
      message: () =>
        `Expected story to have ${count} passages, but has ${story.passages.length}`,
    };
  },

  /**
   * Check if story is linear (no branches)
   */
  toBeLinear(story: Story): MatcherResult {
    const isLinear = checkIfLinear(story);
    return {
      pass: isLinear,
      message: () =>
        isLinear
          ? 'Expected story not to be linear'
          : 'Expected story to be linear (no branching)',
    };
  },

  /**
   * Check if story has cycles
   */
  toHaveCycles(story: Story): MatcherResult {
    const hasCycles = detectCycles(story);
    return {
      pass: hasCycles,
      message: () =>
        hasCycles
          ? 'Expected story not to have cycles'
          : 'Expected story to have cycles',
    };
  },
};

/**
 * Passage matchers
 */
export const passageMatchers = {
  /**
   * Check if passage has content
   */
  toHaveContent(passage: Passage): MatcherResult {
    return {
      pass: !!passage.content && passage.content.trim().length > 0,
      message: () =>
        passage.content
          ? 'Expected passage not to have content'
          : 'Expected passage to have content',
    };
  },

  /**
   * Check if passage has specific tag
   */
  toHaveTag(passage: Passage, tag: string): MatcherResult {
    const hasTag = passage.tags?.includes(tag) || false;
    return {
      pass: hasTag,
      message: () =>
        hasTag
          ? `Expected passage not to have tag "${tag}"`
          : `Expected passage to have tag "${tag}"`,
    };
  },

  /**
   * Check if passage has links
   */
  toHaveLinks(passage: Passage): MatcherResult {
    const links = extractLinks(passage.content);
    return {
      pass: links.length > 0,
      message: () =>
        links.length > 0
          ? `Expected passage not to have links`
          : 'Expected passage to have links',
    };
  },

  /**
   * Check if passage has specific link
   */
  toHaveLink(passage: Passage, target: string): MatcherResult {
    const links = extractLinks(passage.content);
    const hasLink = links.includes(target);
    return {
      pass: hasLink,
      message: () =>
        hasLink
          ? `Expected passage not to have link to "${target}"`
          : `Expected passage to have link to "${target}"`,
    };
  },

  /**
   * Check if passage has position
   */
  toHavePosition(passage: Passage): MatcherResult {
    return {
      pass: !!passage.position,
      message: () =>
        passage.position
          ? 'Expected passage not to have position'
          : 'Expected passage to have position',
    };
  },

  /**
   * Check if passage is at specific position
   */
  toBeAt(passage: Passage, x: number, y: number): MatcherResult {
    const isAt = passage.position?.x === x && passage.position?.y === y;
    return {
      pass: isAt,
      message: () =>
        isAt
          ? `Expected passage not to be at (${x}, ${y})`
          : `Expected passage to be at (${x}, ${y}), but is at (${passage.position?.x}, ${passage.position?.y})`,
    };
  },
};

/**
 * String matchers for content
 */
export const contentMatchers = {
  /**
   * Check if content contains markdown link
   */
  toContainLink(content: string, target: string): MatcherResult {
    const links = extractLinks(content);
    const hasLink = links.includes(target);
    return {
      pass: hasLink,
      message: () =>
        hasLink
          ? `Expected content not to contain link to "${target}"`
          : `Expected content to contain link to "${target}"`,
    };
  },

  /**
   * Check if content contains specific text
   */
  toContainText(content: string, text: string): MatcherResult {
    const contains = content.includes(text);
    return {
      pass: contains,
      message: () =>
        contains
          ? `Expected content not to contain "${text}"`
          : `Expected content to contain "${text}"`,
    };
  },

  /**
   * Check if content matches regex
   */
  toMatchPattern(content: string, pattern: RegExp): MatcherResult {
    const matches = pattern.test(content);
    return {
      pass: matches,
      message: () =>
        matches
          ? `Expected content not to match pattern ${pattern}`
          : `Expected content to match pattern ${pattern}`,
    };
  },
};

/**
 * Helper functions
 */

function findBrokenLinks(story: Story): string[] {
  const passageTitles = new Set(story.passages.map(p => p.title));
  const brokenLinks: string[] = [];

  for (const passage of story.passages) {
    const links = extractLinks(passage.content);
    for (const link of links) {
      if (!passageTitles.has(link)) {
        brokenLinks.push(`${passage.title} -> ${link}`);
      }
    }
  }

  return brokenLinks;
}

function extractLinks(content: string): string[] {
  const links: string[] = [];
  const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const target = match[2] || match[1];
    links.push(target);
  }

  return links;
}

function checkIfLinear(story: Story): boolean {
  // A story is linear if each passage has at most one link
  for (const passage of story.passages) {
    const links = extractLinks(passage.content);
    if (links.length > 1) {
      return false;
    }
  }
  return true;
}

function detectCycles(story: Story): boolean {
  const graph = buildGraph(story);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycleDFS(passageId: string): boolean {
    visited.add(passageId);
    recursionStack.add(passageId);

    const neighbors = graph.get(passageId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycleDFS(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(passageId);
    return false;
  }

  for (const passage of story.passages) {
    if (!visited.has(passage.id)) {
      if (hasCycleDFS(passage.id)) {
        return true;
      }
    }
  }

  return false;
}

function buildGraph(story: Story): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const titleToId = new Map<string, string>();

  // Build title to ID mapping
  for (const passage of story.passages) {
    titleToId.set(passage.title, passage.id);
  }

  // Build adjacency list
  for (const passage of story.passages) {
    const links = extractLinks(passage.content);
    const neighbors: string[] = [];

    for (const link of links) {
      const targetId = titleToId.get(link);
      if (targetId) {
        neighbors.push(targetId);
      }
    }

    graph.set(passage.id, neighbors);
  }

  return graph;
}

/**
 * Create matcher function
 */
export function createMatcher<T extends (...args: any[]) => MatcherResult>(
  matcherFn: T
): (...args: Parameters<T>) => void {
  return (...args: Parameters<T>) => {
    const result = matcherFn(...args);
    if (!result.pass) {
      throw new Error(result.message());
    }
  };
}

/**
 * Expect-style API
 */
export function expect<T>(actual: T) {
  return {
    // Story matchers
    toHavePassage: (title: string) => {
      const result = storyMatchers.toHavePassage(actual as unknown as Story, title);
      if (!result.pass) throw new Error(result.message());
    },
    toHaveStartPassage: () => {
      const result = storyMatchers.toHaveStartPassage(actual as unknown as Story);
      if (!result.pass) throw new Error(result.message());
    },
    toHaveBrokenLinks: () => {
      const result = storyMatchers.toHaveBrokenLinks(actual as unknown as Story);
      if (!result.pass) throw new Error(result.message());
    },
    toHaveNoBrokenLinks: () => {
      const result = storyMatchers.toHaveNoBrokenLinks(actual as unknown as Story);
      if (!result.pass) throw new Error(result.message());
    },
    toHavePassageCount: (count: number) => {
      const result = storyMatchers.toHavePassageCount(actual as unknown as Story, count);
      if (!result.pass) throw new Error(result.message());
    },
    toBeLinear: () => {
      const result = storyMatchers.toBeLinear(actual as unknown as Story);
      if (!result.pass) throw new Error(result.message());
    },
    toHaveCycles: () => {
      const result = storyMatchers.toHaveCycles(actual as unknown as Story);
      if (!result.pass) throw new Error(result.message());
    },

    // Passage matchers
    toHaveContent: () => {
      const result = passageMatchers.toHaveContent(actual as unknown as Passage);
      if (!result.pass) throw new Error(result.message());
    },
    toHaveTag: (tag: string) => {
      const result = passageMatchers.toHaveTag(actual as unknown as Passage, tag);
      if (!result.pass) throw new Error(result.message());
    },
    toHaveLinks: () => {
      const result = passageMatchers.toHaveLinks(actual as unknown as Passage);
      if (!result.pass) throw new Error(result.message());
    },
    toHaveLink: (target: string) => {
      const result = passageMatchers.toHaveLink(actual as unknown as Passage, target);
      if (!result.pass) throw new Error(result.message());
    },
    toHavePosition: () => {
      const result = passageMatchers.toHavePosition(actual as unknown as Passage);
      if (!result.pass) throw new Error(result.message());
    },
    toBeAt: (x: number, y: number) => {
      const result = passageMatchers.toBeAt(actual as unknown as Passage, x, y);
      if (!result.pass) throw new Error(result.message());
    },

    // Content matchers
    toContainLink: (target: string) => {
      const result = contentMatchers.toContainLink(actual as unknown as string, target);
      if (!result.pass) throw new Error(result.message());
    },
    toContainText: (text: string) => {
      const result = contentMatchers.toContainText(actual as unknown as string, text);
      if (!result.pass) throw new Error(result.message());
    },
    toMatchPattern: (pattern: RegExp) => {
      const result = contentMatchers.toMatchPattern(actual as unknown as string, pattern);
      if (!result.pass) throw new Error(result.message());
    },
  };
}
