/**
 * Privacy constants and utilities
 */

import { ConsentLevel, ConsentLevelInfo } from './types';

/**
 * Consent level names
 */
export const CONSENT_LEVEL_NAMES: Record<ConsentLevel, string> = {
  [ConsentLevel.NONE]: 'None',
  [ConsentLevel.ESSENTIAL]: 'Essential',
  [ConsentLevel.ANALYTICS]: 'Analytics',
  [ConsentLevel.FULL]: 'Full',
};

/**
 * Consent level descriptions
 */
export const CONSENT_LEVEL_DESCRIPTIONS: Record<ConsentLevel, string> = {
  [ConsentLevel.NONE]:
    'No analytics tracking. The story will function normally but no data will be collected.',
  [ConsentLevel.ESSENTIAL]:
    'Only critical technical information needed for error recovery and save system reliability. ' +
    'No behavioral analytics or user identification.',
  [ConsentLevel.ANALYTICS]:
    'Anonymous behavioral analytics to help improve the story. ' +
    'Tracks passage views, choices, and completion rates without identifying you across sessions. ' +
    'No personally identifiable information is collected.',
  [ConsentLevel.FULL]:
    'Complete analytics including cross-session tracking to provide the best experience. ' +
    'Enables features like A/B testing and personalized recommendations. ' +
    'You can review and delete your data at any time.',
};

/**
 * Get consent level name
 */
export function getConsentLevelName(level: ConsentLevel): string {
  return CONSENT_LEVEL_NAMES[level] || 'Unknown';
}

/**
 * Get consent level description
 */
export function getConsentLevelDescription(level: ConsentLevel): string {
  return CONSENT_LEVEL_DESCRIPTIONS[level] || 'Unknown consent level';
}

/**
 * Check if consent level is valid
 */
export function isValidConsentLevel(level: number): level is ConsentLevel {
  return (
    typeof level === 'number' &&
    level >= ConsentLevel.NONE &&
    level <= ConsentLevel.FULL &&
    Number.isInteger(level)
  );
}

/**
 * Get all consent level options
 */
export function getAllConsentLevels(): ConsentLevelInfo[] {
  return [
    ConsentLevel.NONE,
    ConsentLevel.ESSENTIAL,
    ConsentLevel.ANALYTICS,
    ConsentLevel.FULL,
  ].map((level) => ({
    level,
    name: CONSENT_LEVEL_NAMES[level],
    description: CONSENT_LEVEL_DESCRIPTIONS[level],
  }));
}

/**
 * Compare consent levels
 */
export function compareConsentLevels(a: ConsentLevel, b: ConsentLevel): number {
  return a - b;
}

/**
 * Check if consent level meets minimum requirement
 */
export function meetsConsentLevel(current: ConsentLevel, required: ConsentLevel): boolean {
  return current >= required;
}
