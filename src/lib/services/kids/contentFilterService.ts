/**
 * Content Filter Service
 *
 * Provides content filtering and safety checks for Kids Mode.
 * Educational approach - suggests alternatives rather than blocking.
 */

import type { ContentFilterLevel } from '../../stores/parentalControlsStore';

import type { AgeGroup } from '../../stores/kidsModeStore';

/**
 * Words to filter at different levels
 */
const MILD_FILTER_WORDS = [
  'stupid', 'idiot', 'dumb', 'hate',
  'kill', 'die', 'death', 'dead',
];

const STRICT_FILTER_WORDS = [
  ...MILD_FILTER_WORDS,
  'scary', 'fight', 'battle', 'war',
  'blood', 'hurt', 'pain', 'wound',
];

// Age 8-10: Very strict, extra protective
const YOUNG_FILTER_WORDS = [
  ...STRICT_FILTER_WORDS,
  'monster', 'ghost', 'creepy', 'spooky',
  'evil', 'danger', 'afraid', 'nightmare',
];

/**
 * Suggested alternatives for filtered words
 */
const WORD_ALTERNATIVES: Record<string, string[]> = {
  stupid: ['silly', 'goofy', 'unusual'],
  idiot: ['friend', 'buddy', 'person'],
  dumb: ['quiet', 'silly', 'confused'],
  hate: ['dislike', "don't like", 'prefer not to'],
  kill: ['stop', 'defeat', 'overcome'],
  die: ['faint', 'disappear', 'vanish'],
  death: ['ending', 'disappearance', 'transformation'],
  dead: ['gone', 'disappeared', 'vanished'],
  scary: ['surprising', 'mysterious', 'unusual'],
  fight: ['compete', 'challenge', 'race'],
  battle: ['game', 'contest', 'challenge'],
  war: ['conflict', 'disagreement', 'competition'],
  blood: ['energy', 'health', 'power'],
  hurt: ['bump', 'sting', 'bother'],
  pain: ['discomfort', 'owie', 'ache'],
  wound: ['scratch', 'mark', 'bump'],
};

export interface ContentCheckResult {
  clean: boolean;
  flaggedWords: string[];
  suggestions: Map<string, string[]>;
  message?: string;
}

/**
 * Content Filter Service
 */
export class ContentFilterService {
  /**
   * Check content for inappropriate words
   */
  static checkContent(
    text: string,
    filterLevel: ContentFilterLevel
  ): ContentCheckResult {
    if (filterLevel === 'none') {
      return {
        clean: true,
        flaggedWords: [],
        suggestions: new Map(),
      };
    }

    const filterWords =
      filterLevel === 'strict' ? STRICT_FILTER_WORDS : MILD_FILTER_WORDS;

    const flaggedWords: string[] = [];
    const suggestions = new Map<string, string[]>();

    // Convert to lowercase for checking
    const lowerText = text.toLowerCase();

    // Check for each filtered word
    for (const word of filterWords) {
      // Use word boundaries to avoid partial matches
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(lowerText)) {
        flaggedWords.push(word);
        suggestions.set(word, WORD_ALTERNATIVES[word] || ['something else']);
      }
    }

    return {
      clean: flaggedWords.length === 0,
      flaggedWords,
      suggestions,
      message:
        flaggedWords.length > 0
          ? `Found ${flaggedWords.length} word${flaggedWords.length > 1 ? 's' : ''} that might not be kid-friendly. Try using different words!`
          : undefined,
    };
  }

  /**
   * Suggest replacement for a word
   */
  static getSuggestions(word: string): string[] {
    const lower = word.toLowerCase();
    return WORD_ALTERNATIVES[lower] || [];
  }

  /**
   * Check if content contains personal information (basic checks)
   */
  static checkForPersonalInfo(text: string): {
    hasPersonalInfo: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for email addresses
    if (/@\w+\.\w+/.test(text)) {
      issues.push('Email address found');
    }

    // Check for phone numbers (simple pattern)
    if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text)) {
      issues.push('Phone number found');
    }

    // Check for common address patterns
    if (/\b\d+\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln)\b/i.test(text)) {
      issues.push('Street address found');
    }

    // Check for URLs
    if (/(https?:\/\/|www\.)\S+/i.test(text)) {
      issues.push('Web link found');
    }

    return {
      hasPersonalInfo: issues.length > 0,
      issues,
    };
  }

  /**
   * Sanitize content by removing/replacing inappropriate words
   * Returns the sanitized text
   */
  static sanitizeContent(
    text: string,
    filterLevel: ContentFilterLevel
  ): string {
    if (filterLevel === 'none') {
      return text;
    }

    let sanitized = text;
    const filterWords =
      filterLevel === 'strict' ? STRICT_FILTER_WORDS : MILD_FILTER_WORDS;

    for (const word of filterWords) {
      const alternatives = WORD_ALTERNATIVES[word];
      if (alternatives && alternatives.length > 0) {
        // Replace with first alternative
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        sanitized = sanitized.replace(regex, alternatives[0]);
      } else {
        // Replace with asterisks
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        sanitized = sanitized.replace(regex, '*'.repeat(word.length));
      }
    }

    return sanitized;
  }

  /**
   * Get educational message about why content was flagged
   */
  static getEducationalMessage(word: string): string {
    const messages: Record<string, string> = {
      stupid: "Instead of 'stupid', try describing what makes something silly or unusual!",
      idiot: "Everyone makes mistakes! Try using kinder words to describe people.",
      dumb: "'Dumb' can hurt feelings. Try 'quiet', 'silly', or 'confused' instead!",
      hate: "'Hate' is a strong word. Try 'dislike' or 'prefer not to' instead!",
      kill: "Let's use gentler words! Try 'defeat', 'stop', or 'overcome'.",
      die: "Try using words like 'disappear', 'vanish', or 'fade away' instead!",
      death: "Let's keep it lighter! Try 'ending', 'transformation', or 'disappearance'.",
      dead: "Use gentler words like 'gone', 'disappeared', or 'vanished'!",
      scary: "Instead of scary, try 'mysterious', 'surprising', or 'unusual'!",
      fight: "Let's use words like 'compete', 'challenge', or 'race' instead!",
      battle: "Try 'game', 'contest', or 'challenge' instead of battle!",
      war: "Let's use words like 'conflict', 'competition', or 'disagreement'!",
    };

    return messages[word.toLowerCase()] || "Try using a more kid-friendly word!";
  }

  /**
   * Analyze entire story for content issues
   */
  static analyzeStory(passages: Map<string, { title: string; content: string }>, filterLevel: ContentFilterLevel): {
    overallClean: boolean;
    passageIssues: Map<string, ContentCheckResult>;
    personalInfoIssues: Map<string, string[]>;
    totalIssues: number;
  } {
    const passageIssues = new Map<string, ContentCheckResult>();
    const personalInfoIssues = new Map<string, string[]>();
    let totalIssues = 0;

    passages.forEach((passage, id) => {
      // Check content
      const contentCheck = this.checkContent(
        `${passage.title} ${passage.content}`,
        filterLevel
      );

      if (!contentCheck.clean) {
        passageIssues.set(id, contentCheck);
        totalIssues += contentCheck.flaggedWords.length;
      }

      // Check for personal info
      const personalInfoCheck = this.checkForPersonalInfo(
        `${passage.title} ${passage.content}`
      );

      if (personalInfoCheck.hasPersonalInfo) {
        personalInfoIssues.set(id, personalInfoCheck.issues);
        totalIssues += personalInfoCheck.issues.length;
      }
    });

    return {
      overallClean: totalIssues === 0,
      passageIssues,
      personalInfoIssues,
      totalIssues,
    };
  }
}
