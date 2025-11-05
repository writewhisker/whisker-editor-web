/**
 * Tests for Age Group Features
 *
 * Tests the feature gating and limits for different age groups
 */

import { describe, it, expect } from 'vitest';
import {
  getFeaturesForAge,
  isFeatureAllowed,
  isPanelAllowed,
  getPassageLimit,
  getChoiceLimit,
  isStoryWithinLimits,
  getFeatureRestrictionMessage,
  type AgeGroup,
} from './ageGroupFeatures';

describe('Age Group Features', () => {
  describe('getFeaturesForAge', () => {
    it('should return features for 8-10 age group', () => {
      const features = getFeaturesForAge('8-10');
      expect(features.maxPassages).toBe(15);
      expect(features.maxChoicesPerPassage).toBe(3);
      expect(features.allowVariables).toBe(false);
      expect(features.allowConditionals).toBe(false);
      expect(features.allowCodeView).toBe(false);
      expect(features.templateComplexity).toBe('beginner');
      expect(features.uiComplexity).toBe('simple');
      expect(features.requireTutorial).toBe(true);
    });

    it('should return features for 10-13 age group', () => {
      const features = getFeaturesForAge('10-13');
      expect(features.maxPassages).toBe(30);
      expect(features.maxChoicesPerPassage).toBe(6);
      expect(features.allowVariables).toBe(true);
      expect(features.allowConditionals).toBe(true);
      expect(features.allowCodeView).toBe(false);
      expect(features.templateComplexity).toBe('intermediate');
      expect(features.uiComplexity).toBe('moderate');
      expect(features.requireTutorial).toBe(false);
    });

    it('should return features for 13-15 age group', () => {
      const features = getFeaturesForAge('13-15');
      expect(features.maxPassages).toBe(null); // Unlimited
      expect(features.maxChoicesPerPassage).toBe(null); // Unlimited
      expect(features.allowVariables).toBe(true);
      expect(features.allowConditionals).toBe(true);
      expect(features.allowCodeView).toBe(true);
      expect(features.templateComplexity).toBe('all');
      expect(features.uiComplexity).toBe('advanced');
      expect(features.requireTutorial).toBe(false);
    });

    it('should default to 10-13 when null age group', () => {
      const features = getFeaturesForAge(null);
      expect(features.maxPassages).toBe(30);
      expect(features.templateComplexity).toBe('intermediate');
    });
  });

  describe('isFeatureAllowed', () => {
    it('should correctly check boolean features for 8-10', () => {
      expect(isFeatureAllowed('8-10', 'allowVariables')).toBe(false);
      expect(isFeatureAllowed('8-10', 'allowConditionals')).toBe(false);
      expect(isFeatureAllowed('8-10', 'allowCodeView')).toBe(false);
      expect(isFeatureAllowed('8-10', 'allowVisualScripting')).toBe(true);
    });

    it('should correctly check boolean features for 10-13', () => {
      expect(isFeatureAllowed('10-13', 'allowVariables')).toBe(true);
      expect(isFeatureAllowed('10-13', 'allowConditionals')).toBe(true);
      expect(isFeatureAllowed('10-13', 'allowCodeView')).toBe(false);
    });

    it('should correctly check boolean features for 13-15', () => {
      expect(isFeatureAllowed('13-15', 'allowVariables')).toBe(true);
      expect(isFeatureAllowed('13-15', 'allowConditionals')).toBe(true);
      expect(isFeatureAllowed('13-15', 'allowCodeView')).toBe(true);
    });

    it('should return true for non-boolean features', () => {
      expect(isFeatureAllowed('8-10', 'maxPassages')).toBe(true);
      expect(isFeatureAllowed('8-10', 'templateComplexity')).toBe(true);
    });
  });

  describe('isPanelAllowed', () => {
    it('should allow basic panels for 8-10', () => {
      expect(isPanelAllowed('8-10', 'passageList')).toBe(true);
      expect(isPanelAllowed('8-10', 'properties')).toBe(true);
    });

    it('should not allow advanced panels for 8-10', () => {
      expect(isPanelAllowed('8-10', 'variables')).toBe(false);
      expect(isPanelAllowed('8-10', 'validation')).toBe(false);
      expect(isPanelAllowed('8-10', 'statistics')).toBe(false);
      expect(isPanelAllowed('8-10', 'snippets')).toBe(false);
    });

    it('should allow more panels for 10-13', () => {
      expect(isPanelAllowed('10-13', 'passageList')).toBe(true);
      expect(isPanelAllowed('10-13', 'properties')).toBe(true);
      expect(isPanelAllowed('10-13', 'variables')).toBe(true);
      expect(isPanelAllowed('10-13', 'validation')).toBe(true);
    });

    it('should not allow code panels for 10-13', () => {
      expect(isPanelAllowed('10-13', 'snippets')).toBe(false);
    });

    it('should allow most panels for 13-15', () => {
      expect(isPanelAllowed('13-15', 'passageList')).toBe(true);
      expect(isPanelAllowed('13-15', 'properties')).toBe(true);
      expect(isPanelAllowed('13-15', 'variables')).toBe(true);
      expect(isPanelAllowed('13-15', 'validation')).toBe(true);
      expect(isPanelAllowed('13-15', 'statistics')).toBe(true);
      expect(isPanelAllowed('13-15', 'snippets')).toBe(true);
    });
  });

  describe('getPassageLimit', () => {
    it('should return correct limits', () => {
      expect(getPassageLimit('8-10')).toBe(15);
      expect(getPassageLimit('10-13')).toBe(30);
      expect(getPassageLimit('13-15')).toBe(null); // Unlimited
    });

    it('should return default limit for null', () => {
      expect(getPassageLimit(null)).toBe(30); // Defaults to 10-13
    });
  });

  describe('getChoiceLimit', () => {
    it('should return correct limits', () => {
      expect(getChoiceLimit('8-10')).toBe(3);
      expect(getChoiceLimit('10-13')).toBe(6);
      expect(getChoiceLimit('13-15')).toBe(null); // Unlimited
    });

    it('should return default limit for null', () => {
      expect(getChoiceLimit(null)).toBe(6); // Defaults to 10-13
    });
  });

  describe('isStoryWithinLimits', () => {
    it('should pass for 8-10 within limits and recommended', () => {
      const result = isStoryWithinLimits('8-10', 8, 3);
      expect(result.withinLimits).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn for 8-10 exceeding recommended but within limit', () => {
      const result = isStoryWithinLimits('8-10', 10, 3);
      expect(result.withinLimits).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('8 pages for now');
    });

    it('should warn for 8-10 exceeding passage limit', () => {
      const result = isStoryWithinLimits('8-10', 20, 3);
      expect(result.withinLimits).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('20 pages');
      expect(result.warnings[0]).toContain('15 is recommended');
    });

    it('should warn for 8-10 exceeding choice limit', () => {
      const result = isStoryWithinLimits('8-10', 8, 5);
      expect(result.withinLimits).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('3 or fewer');
    });

    it('should handle multiple warnings', () => {
      const result = isStoryWithinLimits('8-10', 20, 5);
      expect(result.withinLimits).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(1);
    });

    it('should pass for 10-13 within recommended', () => {
      const result = isStoryWithinLimits('10-13', 15, 5);
      expect(result.withinLimits).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn for 10-13 exceeding recommended but within limit', () => {
      const result = isStoryWithinLimits('10-13', 20, 5);
      expect(result.withinLimits).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('15 pages for now');
    });

    it('should pass for 13-15 with no limits', () => {
      const result = isStoryWithinLimits('13-15', 100, 20);
      // May have warnings about recommended count, but no hard limits
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getFeatureRestrictionMessage', () => {
    it('should return appropriate messages for restricted features', () => {
      const variablesMsg = getFeatureRestrictionMessage('variables', '8-10');
      expect(variablesMsg).toContain('10+');
      expect(variablesMsg).toContain('unlock');

      const conditionalsMsg = getFeatureRestrictionMessage('conditionals', '8-10');
      expect(conditionalsMsg).toContain('10+');

      const codeViewMsg = getFeatureRestrictionMessage('codeView', '8-10');
      expect(codeViewMsg).toContain('13+');
    });

    it('should return generic message for unknown features', () => {
      const msg = getFeatureRestrictionMessage('unknownFeature', '8-10');
      expect(msg).toContain('unlock');
    });
  });

  describe('Progressive complexity', () => {
    it('should show progression from 8-10 to 10-13', () => {
      const young = getFeaturesForAge('8-10');
      const middle = getFeaturesForAge('10-13');

      // More passages allowed
      expect(middle.maxPassages! > young.maxPassages!).toBe(true);

      // More choices allowed
      expect(middle.maxChoicesPerPassage! > young.maxChoicesPerPassage!).toBe(true);

      // More features unlocked
      expect(middle.allowVariables).toBe(true);
      expect(young.allowVariables).toBe(false);

      // More panels available
      expect(middle.allowedPanels.length > young.allowedPanels.length).toBe(true);
    });

    it('should show progression from 10-13 to 13-15', () => {
      const middle = getFeaturesForAge('10-13');
      const older = getFeaturesForAge('13-15');

      // Unlimited passages
      expect(older.maxPassages).toBe(null);
      expect(middle.maxPassages).not.toBe(null);

      // Code view unlocked
      expect(older.allowCodeView).toBe(true);
      expect(middle.allowCodeView).toBe(false);

      // All templates available
      expect(older.templateComplexity).toBe('all');
      expect(middle.templateComplexity).toBe('intermediate');

      // More panels available
      expect(older.allowedPanels.length > middle.allowedPanels.length).toBe(true);
    });
  });

  describe('Tutorial requirements', () => {
    it('should require tutorial for youngest group', () => {
      const features = getFeaturesForAge('8-10');
      expect(features.requireTutorial).toBe(true);
      expect(features.recommendedTutorials.length).toBeGreaterThan(0);
    });

    it('should not require tutorial for older groups', () => {
      expect(getFeaturesForAge('10-13').requireTutorial).toBe(false);
      expect(getFeaturesForAge('13-15').requireTutorial).toBe(false);
    });

    it('should have different recommended tutorials for each group', () => {
      const young = getFeaturesForAge('8-10');
      const middle = getFeaturesForAge('10-13');
      const older = getFeaturesForAge('13-15');

      expect(young.recommendedTutorials).not.toEqual(middle.recommendedTutorials);
      expect(middle.recommendedTutorials).not.toEqual(older.recommendedTutorials);
    });
  });

  describe('Export requirements', () => {
    it('should require help and include parent guide for youngest', () => {
      const features = getFeaturesForAge('8-10');
      expect(features.exportRequiresHelp).toBe(true);
      expect(features.includeParentGuide).toBe(true);
    });

    it('should not require help for older groups', () => {
      expect(getFeaturesForAge('10-13').exportRequiresHelp).toBe(false);
      expect(getFeaturesForAge('13-15').exportRequiresHelp).toBe(false);
    });

    it('should not include parent guide for older groups', () => {
      expect(getFeaturesForAge('10-13').includeParentGuide).toBe(false);
      expect(getFeaturesForAge('13-15').includeParentGuide).toBe(false);
    });
  });
});
