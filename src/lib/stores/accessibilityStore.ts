/**
 * Accessibility Checker Store
 *
 * Analyzes interactive fiction content for accessibility issues including:
 * - Reading level assessment (Flesch-Kincaid)
 * - Screen reader compatibility
 * - Color contrast issues
 * - Choice text clarity
 * - Alt text for media references
 * - Sensory content warnings
 */

import { writable, derived } from 'svelte/store';
import type { Story } from '../models/Story';
import type { Passage } from '../models/Passage';

export type AccessibilityIssueType =
  | 'reading_level'
  | 'choice_clarity'
  | 'screen_reader'
  | 'color_only'
  | 'missing_alt_text'
  | 'sensory_only'
  | 'flashing_content'
  | 'complex_navigation';

export type AccessibilitySeverity = 'critical' | 'warning' | 'info';

export interface AccessibilityIssue {
  id: string;
  type: AccessibilityIssueType;
  severity: AccessibilitySeverity;
  passageId?: string;
  passageTitle?: string;
  choiceId?: string;
  message: string;
  suggestion: string;
  wcagLevel?: '1.1' | '1.3' | '1.4' | '2.4' | '3.1';
}

export interface ReadingLevelMetrics {
  fleschReadingEase: number;      // 0-100 (higher = easier)
  fleschKincaidGrade: number;     // US grade level
  avgSentenceLength: number;
  avgSyllablesPerWord: number;
  complexWords: number;           // 3+ syllables
  totalWords: number;
  totalSentences: number;
}

export interface AccessibilityReport {
  score: number;                   // 0-100 (higher = more accessible)
  level: 'excellent' | 'good' | 'fair' | 'poor';
  issues: AccessibilityIssue[];
  readingLevel: ReadingLevelMetrics;
  passageCount: number;
  analyzedAt: string;
}

export interface AccessibilityStoreState {
  report: AccessibilityReport | null;
  analyzing: boolean;
}

// Count syllables in a word (simplified algorithm)
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length === 0) return 0;
  if (word.length <= 3) return 1;

  // Count vowel groups
  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }

  // Adjust for silent 'e' at end
  if (word.endsWith('e') && count > 1) {
    count--;
  }

  return Math.max(1, count);
}

// Calculate reading level metrics
function calculateReadingLevel(text: string): ReadingLevelMetrics {
  // Split into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const totalSentences = Math.max(1, sentences.length);

  // Split into words
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const totalWords = Math.max(1, words.length);

  // Calculate syllables
  let totalSyllables = 0;
  let complexWords = 0;

  for (const word of words) {
    const syllables = countSyllables(word);
    totalSyllables += syllables;
    if (syllables >= 3) {
      complexWords++;
    }
  }

  const avgSentenceLength = totalWords / totalSentences;
  const avgSyllablesPerWord = totalSyllables / totalWords;

  // Flesch Reading Ease: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  const fleschReadingEase = Math.max(
    0,
    Math.min(
      100,
      206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord
    )
  );

  // Flesch-Kincaid Grade Level: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
  const fleschKincaidGrade = Math.max(
    0,
    0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59
  );

  return {
    fleschReadingEase,
    fleschKincaidGrade,
    avgSentenceLength,
    avgSyllablesPerWord,
    complexWords,
    totalWords,
    totalSentences,
  };
}

// Check for color-only descriptions
function checkColorOnly(text: string): boolean {
  const colorOnlyPatterns = [
    /\b(red|blue|green|yellow|purple|orange|pink|brown|black|white|gray|grey)\s+(button|choice|option|door|path)\b/i,
    /\b(choose|select|pick)\s+the\s+(red|blue|green|yellow|purple|orange|pink|brown|black|white|gray|grey)\b/i,
  ];

  return colorOnlyPatterns.some(pattern => pattern.test(text));
}

// Check for screen reader issues
function checkScreenReaderIssues(text: string): string[] {
  const issues: string[] = [];

  // Check for ASCII art
  if (/[┌┐└┘─│├┤┬┴┼╔╗╚╝═║╠╣╦╩╬]+/.test(text)) {
    issues.push('Contains ASCII art that may not be accessible to screen readers');
  }

  // Check for emoji-only text
  const emojiOnly = /^[\p{Emoji}\s]+$/u;
  if (emojiOnly.test(text) && text.trim().length > 0) {
    issues.push('Contains emoji-only text without alt text');
  }

  // Check for excessive special characters
  const specialCharRatio = (text.match(/[^a-zA-Z0-9\s.,!?]/g) || []).length / text.length;
  if (specialCharRatio > 0.3 && text.length > 20) {
    issues.push('High ratio of special characters may confuse screen readers');
  }

  return issues;
}

// Check for flashing/animation keywords
function checkFlashingContent(text: string): boolean {
  const flashingKeywords = [
    /\bflash(ing|es)?\b/i,
    /\bblink(ing|s)?\b/i,
    /\bstrobe\b/i,
    /\brapid(ly)?\s+(chang|flick|flash)/i,
  ];

  return flashingKeywords.some(pattern => pattern.test(text));
}

// Check choice clarity
function checkChoiceClarity(choiceText: string): string[] {
  const issues: string[] = [];

  // Too short
  if (choiceText.length < 3) {
    issues.push('Choice text is very short and may not be clear');
  }

  // Single character choices
  if (/^[a-z]$/i.test(choiceText.trim())) {
    issues.push('Single letter choices may not be accessible');
  }

  // Numbers only
  if (/^\d+$/.test(choiceText.trim())) {
    issues.push('Number-only choices should have descriptive text');
  }

  // Vague choices
  const vagueChoices = ['yes', 'no', 'ok', 'continue', 'next', 'go'];
  if (vagueChoices.includes(choiceText.toLowerCase().trim())) {
    issues.push('Choice text is too vague - provide more context');
  }

  return issues;
}

// Analyze story for accessibility issues
function analyzeStory(story: Story): AccessibilityReport {
  const issues: AccessibilityIssue[] = [];
  let issueId = 0;

  // Combine all text for reading level
  let allText = '';
  const passages = Array.from(story.passages.values());

  for (const passage of passages) {
    allText += passage.content + ' ';

    // Check passage content
    const passageText = passage.content;

    // Screen reader issues
    const srIssues = checkScreenReaderIssues(passageText);
    for (const issue of srIssues) {
      issues.push({
        id: `issue-${issueId++}`,
        type: 'screen_reader',
        severity: 'warning',
        passageId: passage.id,
        passageTitle: passage.title,
        message: issue,
        suggestion: 'Add alternative text or simplify formatting',
        wcagLevel: '1.3',
      });
    }

    // Color-only information
    if (checkColorOnly(passageText)) {
      issues.push({
        id: `issue-${issueId++}`,
        type: 'color_only',
        severity: 'critical',
        passageId: passage.id,
        passageTitle: passage.title,
        message: 'Uses color alone to convey information',
        suggestion: 'Add additional indicators (shape, text, position, etc.)',
        wcagLevel: '1.4',
      });
    }

    // Flashing content warning
    if (checkFlashingContent(passageText)) {
      issues.push({
        id: `issue-${issueId++}`,
        type: 'flashing_content',
        severity: 'critical',
        passageId: passage.id,
        passageTitle: passage.title,
        message: 'May contain flashing or rapid visual changes',
        suggestion: 'Add seizure warning and allow users to disable animations',
        wcagLevel: '2.4',
      });
    }

    // Check choices
    for (const choice of passage.choices) {
      const choiceIssues = checkChoiceClarity(choice.text);
      for (const issue of choiceIssues) {
        issues.push({
          id: `issue-${issueId++}`,
          type: 'choice_clarity',
          severity: 'warning',
          passageId: passage.id,
          passageTitle: passage.title,
          choiceId: choice.id,
          message: `Choice "${choice.text}": ${issue}`,
          suggestion: 'Make choice text more descriptive and specific',
          wcagLevel: '2.4',
        });
      }

      // Color-only in choices
      if (checkColorOnly(choice.text)) {
        issues.push({
          id: `issue-${issueId++}`,
          type: 'color_only',
          severity: 'critical',
          passageId: passage.id,
          passageTitle: passage.title,
          choiceId: choice.id,
          message: `Choice "${choice.text}" uses color-only description`,
          suggestion: 'Add text description in addition to color',
          wcagLevel: '1.4',
        });
      }
    }

    // Check for missing passage titles (navigation issues)
    if (!passage.title || passage.title.trim() === '' || passage.title === 'Untitled Passage') {
      issues.push({
        id: `issue-${issueId++}`,
        type: 'complex_navigation',
        severity: 'info',
        passageId: passage.id,
        passageTitle: passage.title,
        message: 'Passage has generic or missing title',
        suggestion: 'Use descriptive titles for better navigation',
        wcagLevel: '2.4',
      });
    }
  }

  // Calculate reading level
  const readingLevel = calculateReadingLevel(allText);

  // Check overall reading level
  if (readingLevel.fleschKincaidGrade > 12) {
    issues.push({
      id: `issue-${issueId++}`,
      type: 'reading_level',
      severity: 'warning',
      message: `Reading level is college+ (Grade ${readingLevel.fleschKincaidGrade.toFixed(1)})`,
      suggestion: 'Consider simplifying language for broader accessibility',
      wcagLevel: '3.1',
    });
  } else if (readingLevel.fleschKincaidGrade > 10) {
    issues.push({
      id: `issue-${issueId++}`,
      type: 'reading_level',
      severity: 'info',
      message: `Reading level is high school (Grade ${readingLevel.fleschKincaidGrade.toFixed(1)})`,
      suggestion: 'Story is accessible to high school+ readers',
      wcagLevel: '3.1',
    });
  }

  // Calculate accessibility score
  const criticalIssues = issues.filter(i => i.severity === 'critical').length;
  const warningIssues = issues.filter(i => i.severity === 'warning').length;
  const infoIssues = issues.filter(i => i.severity === 'info').length;

  let score = 100;
  score -= criticalIssues * 15;  // -15 per critical
  score -= warningIssues * 5;    // -5 per warning
  score -= infoIssues * 2;       // -2 per info
  score = Math.max(0, Math.min(100, score));

  let level: AccessibilityReport['level'];
  if (score >= 90) level = 'excellent';
  else if (score >= 70) level = 'good';
  else if (score >= 50) level = 'fair';
  else level = 'poor';

  return {
    score,
    level,
    issues: issues.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    readingLevel,
    passageCount: passages.length,
    analyzedAt: new Date().toISOString(),
  };
}

// Create accessibility store
const createAccessibilityStore = () => {
  const { subscribe, set, update } = writable<AccessibilityStoreState>({
    report: null,
    analyzing: false,
  });

  return {
    subscribe,

    /**
     * Analyze story for accessibility issues
     */
    analyze: (story: Story) => {
      update(state => ({ ...state, analyzing: true }));

      try {
        const report = analyzeStory(story);
        set({ report, analyzing: false });
      } catch (error) {
        console.error('Accessibility analysis failed:', error);
        set({ report: null, analyzing: false });
      }
    },

    /**
     * Clear report
     */
    clear: () => {
      set({ report: null, analyzing: false });
    },
  };
};

export const accessibilityStore = createAccessibilityStore();

// Derived stores
export const accessibilityReport = derived(accessibilityStore, $store => $store.report);
export const accessibilityScore = derived(accessibilityReport, $report => $report?.score || 0);
export const accessibilityLevel = derived(accessibilityReport, $report => $report?.level || 'poor');
export const accessibilityIssues = derived(accessibilityReport, $report => $report?.issues || []);
export const criticalIssues = derived(
  accessibilityIssues,
  $issues => $issues.filter(i => i.severity === 'critical')
);
export const hasAccessibilityIssues = derived(accessibilityIssues, $issues => $issues.length > 0);
