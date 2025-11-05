/**
 * Age Group Features
 *
 * Defines feature access and limitations for different age groups.
 * This implements progressive complexity based on child's age.
 */

import type { AgeGroup } from './kidsModeStore';

/**
 * Feature access configuration for an age group
 */
export interface AgeGroupFeatures {
  // Story complexity limits
  maxPassages: number | null; // null = unlimited
  maxChoicesPerPassage: number | null;
  recommendedPassageCount: number; // Suggested max for this age

  // Feature access
  allowVariables: boolean;
  allowConditionals: boolean;
  allowVisualScripting: boolean;
  allowCodeView: boolean;
  allowAdvancedExport: boolean;

  // Panel access
  allowedPanels: string[];

  // Template complexity
  templateComplexity: 'beginner' | 'intermediate' | 'advanced' | 'all';

  // Export options
  exportRequiresHelp: boolean; // Show extra guidance
  includeParentGuide: boolean;

  // UI complexity
  uiComplexity: 'simple' | 'moderate' | 'advanced';
  showAdvancedOptions: boolean;

  // Tutorial requirements
  requireTutorial: boolean;
  recommendedTutorials: string[];
}

/**
 * Feature configurations for each age group
 */
export const AGE_GROUP_FEATURES: Record<AgeGroup, AgeGroupFeatures> = {
  '8-10': {
    // Younger kids - keep it very simple
    maxPassages: 15,
    maxChoicesPerPassage: 3,
    recommendedPassageCount: 8,

    allowVariables: false,
    allowConditionals: false,
    allowVisualScripting: true, // Very basic blocks only
    allowCodeView: false,
    allowAdvancedExport: false,

    allowedPanels: ['passageList', 'properties'],

    templateComplexity: 'beginner',

    exportRequiresHelp: true,
    includeParentGuide: true,

    uiComplexity: 'simple',
    showAdvancedOptions: false,

    requireTutorial: true,
    recommendedTutorials: ['first-story', 'add-choices', 'play-story'],
  },

  '10-13': {
    // Middle kids - balanced complexity
    maxPassages: 30,
    maxChoicesPerPassage: 6,
    recommendedPassageCount: 15,

    allowVariables: true,
    allowConditionals: true,
    allowVisualScripting: true,
    allowCodeView: false,
    allowAdvancedExport: true,

    allowedPanels: ['passageList', 'properties', 'variables', 'validation'],

    templateComplexity: 'intermediate',

    exportRequiresHelp: false,
    includeParentGuide: false,

    uiComplexity: 'moderate',
    showAdvancedOptions: false,

    requireTutorial: false,
    recommendedTutorials: ['branching-stories', 'using-variables', 'minecraft-export'],
  },

  '13-15': {
    // Older kids/teens - more advanced features
    maxPassages: null, // Unlimited
    maxChoicesPerPassage: null,
    recommendedPassageCount: 25,

    allowVariables: true,
    allowConditionals: true,
    allowVisualScripting: true,
    allowCodeView: true,
    allowAdvancedExport: true,

    allowedPanels: [
      'passageList',
      'properties',
      'variables',
      'validation',
      'statistics',
      'tagManager',
      'snippets',
    ],

    templateComplexity: 'all',

    exportRequiresHelp: false,
    includeParentGuide: false,

    uiComplexity: 'advanced',
    showAdvancedOptions: true,

    requireTutorial: false,
    recommendedTutorials: ['advanced-scripting', 'code-view', 'publishing'],
  },
};

/**
 * Get features for an age group
 */
export function getFeaturesForAge(ageGroup: AgeGroup | null): AgeGroupFeatures {
  if (!ageGroup) {
    // Default to middle group if not set
    return AGE_GROUP_FEATURES['10-13'];
  }
  return AGE_GROUP_FEATURES[ageGroup];
}

/**
 * Check if a feature is allowed for an age group
 */
export function isFeatureAllowed(
  ageGroup: AgeGroup | null,
  feature: keyof AgeGroupFeatures
): boolean {
  const features = getFeaturesForAge(ageGroup);
  const value = features[feature];

  if (typeof value === 'boolean') {
    return value;
  }

  // For non-boolean features, return true (they're configured, not restricted)
  return true;
}

/**
 * Check if a panel is allowed for an age group
 */
export function isPanelAllowed(ageGroup: AgeGroup | null, panelId: string): boolean {
  const features = getFeaturesForAge(ageGroup);
  return features.allowedPanels.includes(panelId);
}

/**
 * Get passage limit for an age group
 */
export function getPassageLimit(ageGroup: AgeGroup | null): number | null {
  const features = getFeaturesForAge(ageGroup);
  return features.maxPassages;
}

/**
 * Get choice limit for an age group
 */
export function getChoiceLimit(ageGroup: AgeGroup | null): number | null {
  const features = getFeaturesForAge(ageGroup);
  return features.maxChoicesPerPassage;
}

/**
 * Check if story is within age-appropriate limits
 */
export function isStoryWithinLimits(
  ageGroup: AgeGroup | null,
  passageCount: number,
  maxChoices: number
): { withinLimits: boolean; warnings: string[] } {
  const features = getFeaturesForAge(ageGroup);
  const warnings: string[] = [];

  // Check passage count
  if (features.maxPassages && passageCount > features.maxPassages) {
    warnings.push(
      `Your story has ${passageCount} pages, but ${features.maxPassages} is recommended for your age group.`
    );
  } else if (passageCount > features.recommendedPassageCount) {
    warnings.push(
      `Your story is getting long! Consider keeping it under ${features.recommendedPassageCount} pages for now.`
    );
  }

  // Check choice count
  if (features.maxChoicesPerPassage && maxChoices > features.maxChoicesPerPassage) {
    warnings.push(
      `Some pages have many choices. Try keeping it to ${features.maxChoicesPerPassage} or fewer per page.`
    );
  }

  return {
    withinLimits: warnings.length === 0,
    warnings,
  };
}

/**
 * Get age-appropriate message for feature restriction
 */
export function getFeatureRestrictionMessage(
  feature: string,
  ageGroup: AgeGroup | null
): string {
  const messages: Record<string, string> = {
    variables: "Variables are unlocked for ages 10+. Keep creating awesome stories and you'll unlock this soon!",
    conditionals: "If/then logic is unlocked for ages 10+. Focus on great storytelling for now!",
    codeView: "Code view is unlocked for ages 13+. Keep building your skills!",
    advancedPanels: "Advanced panels are unlocked for older kids. Focus on story pages for now!",
  };

  return messages[feature] || "This feature will unlock as you get older!";
}
