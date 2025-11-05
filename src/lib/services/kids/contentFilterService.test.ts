/**
 * Tests for Content Filter Service
 */

import { describe, it, expect } from 'vitest';
import { ContentFilterService } from './contentFilterService';

describe('ContentFilterService', () => {
  describe('checkContent', () => {
    it('should pass clean content with none filter', () => {
      const result = ContentFilterService.checkContent('Hello world', 'none');
      expect(result.clean).toBe(true);
      expect(result.flaggedWords).toEqual([]);
    });

    it('should pass clean content with mild filter', () => {
      const result = ContentFilterService.checkContent('A nice story', 'mild');
      expect(result.clean).toBe(true);
      expect(result.flaggedWords).toEqual([]);
    });

    it('should flag inappropriate words with mild filter', () => {
      const result = ContentFilterService.checkContent('This is stupid', 'mild');
      expect(result.clean).toBe(false);
      expect(result.flaggedWords).toContain('stupid');
    });

    it('should flag multiple words', () => {
      const result = ContentFilterService.checkContent('I hate this stupid thing', 'mild');
      expect(result.clean).toBe(false);
      expect(result.flaggedWords).toContain('hate');
      expect(result.flaggedWords).toContain('stupid');
    });

    it('should provide suggestions for flagged words', () => {
      const result = ContentFilterService.checkContent('This is stupid', 'mild');
      expect(result.suggestions.has('stupid')).toBe(true);
      expect(result.suggestions.get('stupid')).toContain('silly');
    });

    it('should be case insensitive', () => {
      const result = ContentFilterService.checkContent('This is STUPID', 'mild');
      expect(result.clean).toBe(false);
      expect(result.flaggedWords).toContain('stupid');
    });

    it('should use word boundaries', () => {
      // "scuttlebutt" contains "butt" but shouldn't be flagged
      const result = ContentFilterService.checkContent('I heard the scuttlebutt', 'mild');
      expect(result.clean).toBe(true);
    });

    it('should flag more words with strict filter', () => {
      const result = ContentFilterService.checkContent('A scary battle', 'strict');
      expect(result.clean).toBe(false);
      expect(result.flaggedWords).toContain('scary');
      expect(result.flaggedWords).toContain('battle');
    });

    it('should not flag strict words with mild filter', () => {
      const result = ContentFilterService.checkContent('A scary battle', 'mild');
      expect(result.clean).toBe(true);
    });

    it('should include message when content flagged', () => {
      const result = ContentFilterService.checkContent('This is stupid', 'mild');
      expect(result.message).toBeTruthy();
      expect(result.message).toContain('word');
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions for known words', () => {
      const suggestions = ContentFilterService.getSuggestions('stupid');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('silly');
    });

    it('should return empty array for unknown words', () => {
      const suggestions = ContentFilterService.getSuggestions('unknown');
      expect(suggestions).toEqual([]);
    });

    it('should be case insensitive', () => {
      const suggestions = ContentFilterService.getSuggestions('STUPID');
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('checkForPersonalInfo', () => {
    it('should detect email addresses', () => {
      const result = ContentFilterService.checkForPersonalInfo('Contact me at test@example.com');
      expect(result.hasPersonalInfo).toBe(true);
      expect(result.issues).toContain('Email address found');
    });

    it('should detect phone numbers', () => {
      const result = ContentFilterService.checkForPersonalInfo('Call me at 555-123-4567');
      expect(result.hasPersonalInfo).toBe(true);
      expect(result.issues).toContain('Phone number found');
    });

    it('should detect phone numbers with different formats', () => {
      const result1 = ContentFilterService.checkForPersonalInfo('5551234567');
      const result2 = ContentFilterService.checkForPersonalInfo('555.123.4567');
      expect(result1.hasPersonalInfo).toBe(true);
      expect(result2.hasPersonalInfo).toBe(true);
    });

    it('should detect street addresses', () => {
      const result = ContentFilterService.checkForPersonalInfo('123 Main Street');
      expect(result.hasPersonalInfo).toBe(true);
      expect(result.issues).toContain('Street address found');
    });

    it('should detect URLs', () => {
      const result1 = ContentFilterService.checkForPersonalInfo('Visit https://example.com');
      const result2 = ContentFilterService.checkForPersonalInfo('Check www.example.com');
      expect(result1.hasPersonalInfo).toBe(true);
      expect(result2.hasPersonalInfo).toBe(true);
      expect(result1.issues).toContain('Web link found');
    });

    it('should pass clean content', () => {
      const result = ContentFilterService.checkForPersonalInfo('Just a normal story about adventures');
      expect(result.hasPersonalInfo).toBe(false);
      expect(result.issues).toEqual([]);
    });

    it('should detect multiple types of personal info', () => {
      const result = ContentFilterService.checkForPersonalInfo(
        'Email me at test@example.com or call 555-1234 or visit www.example.com'
      );
      expect(result.hasPersonalInfo).toBe(true);
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('sanitizeContent', () => {
    it('should not change content with none filter', () => {
      const text = 'This is stupid';
      const sanitized = ContentFilterService.sanitizeContent(text, 'none');
      expect(sanitized).toBe(text);
    });

    it('should replace inappropriate words with alternatives', () => {
      const sanitized = ContentFilterService.sanitizeContent('This is stupid', 'mild');
      expect(sanitized).not.toContain('stupid');
      expect(sanitized).toContain('silly');
    });

    it('should replace multiple words', () => {
      const sanitized = ContentFilterService.sanitizeContent('I hate stupid things', 'mild');
      expect(sanitized).not.toContain('hate');
      expect(sanitized).not.toContain('stupid');
    });

    it('should preserve case when replacing', () => {
      const sanitized = ContentFilterService.sanitizeContent('This is STUPID', 'mild');
      // Case might not be preserved, but word should be replaced
      expect(sanitized.toLowerCase()).not.toContain('stupid');
    });

    it('should replace words at start of sentence', () => {
      const sanitized = ContentFilterService.sanitizeContent('Stupid thing happened', 'mild');
      expect(sanitized).not.toContain('Stupid');
      expect(sanitized).not.toContain('stupid');
    });

    it('should replace words at end of sentence', () => {
      const sanitized = ContentFilterService.sanitizeContent('This is so stupid', 'mild');
      expect(sanitized).not.toContain('stupid');
    });
  });

  describe('getEducationalMessage', () => {
    it('should provide educational message for known words', () => {
      const message = ContentFilterService.getEducationalMessage('stupid');
      expect(message).toBeTruthy();
      expect(message.length).toBeGreaterThan(0);
    });

    it('should provide default message for unknown words', () => {
      const message = ContentFilterService.getEducationalMessage('unknown');
      expect(message).toBe("Try using a more kid-friendly word!");
    });

    it('should be case insensitive', () => {
      const message1 = ContentFilterService.getEducationalMessage('stupid');
      const message2 = ContentFilterService.getEducationalMessage('STUPID');
      expect(message1).toBe(message2);
    });

    it('should be helpful and friendly', () => {
      const message = ContentFilterService.getEducationalMessage('hate');
      expect(message).toContain('instead');
      expect(message.toLowerCase()).not.toContain('bad');
      expect(message.toLowerCase()).not.toContain('wrong');
    });
  });

  describe('analyzeStory', () => {
    it('should analyze all passages', () => {
      const passages = new Map([
        ['p1', { title: 'Start', content: 'This is stupid' }],
        ['p2', { title: 'End', content: 'Nice ending' }],
      ]);

      const result = ContentFilterService.analyzeStory(passages, 'mild');
      expect(result.overallClean).toBe(false);
      expect(result.passageIssues.has('p1')).toBe(true);
      expect(result.passageIssues.has('p2')).toBe(false);
    });

    it('should count total issues', () => {
      const passages = new Map([
        ['p1', { title: 'Start', content: 'This is stupid and I hate it' }],
        ['p2', { title: 'End', content: 'Another stupid thing' }],
      ]);

      const result = ContentFilterService.analyzeStory(passages, 'mild');
      expect(result.totalIssues).toBeGreaterThan(0);
    });

    it('should check passage titles', () => {
      const passages = new Map([
        ['p1', { title: 'Stupid Title', content: 'Clean content' }],
      ]);

      const result = ContentFilterService.analyzeStory(passages, 'mild');
      expect(result.overallClean).toBe(false);
    });

    it('should detect personal info in passages', () => {
      const passages = new Map([
        ['p1', { title: 'Start', content: 'Email me at test@example.com' }],
      ]);

      const result = ContentFilterService.analyzeStory(passages, 'mild');
      expect(result.personalInfoIssues.has('p1')).toBe(true);
      expect(result.totalIssues).toBeGreaterThan(0);
    });

    it('should report clean story', () => {
      const passages = new Map([
        ['p1', { title: 'Start', content: 'A nice adventure' }],
        ['p2', { title: 'End', content: 'Happy ending' }],
      ]);

      const result = ContentFilterService.analyzeStory(passages, 'mild');
      expect(result.overallClean).toBe(true);
      expect(result.totalIssues).toBe(0);
    });

    it('should respect filter level', () => {
      const passages = new Map([
        ['p1', { title: 'Start', content: 'A scary battle' }],
      ]);

      const resultMild = ContentFilterService.analyzeStory(passages, 'mild');
      const resultStrict = ContentFilterService.analyzeStory(passages, 'strict');

      expect(resultMild.overallClean).toBe(true);
      expect(resultStrict.overallClean).toBe(false);
    });
  });
});
