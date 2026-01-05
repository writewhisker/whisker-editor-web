/**
 * Tests for PrivacyFilter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PrivacyFilter } from './PrivacyFilter';
import { ConsentManager } from './ConsentManager';
import { ConsentLevel } from './types';
import type { AnalyticsEvent } from './types';

describe('PrivacyFilter', () => {
  let filter: PrivacyFilter;
  let consentManager: ConsentManager;

  beforeEach(() => {
    consentManager = ConsentManager.create();
    consentManager.initialize();
    filter = PrivacyFilter.create(consentManager);
  });

  function createTestEvent(overrides: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
    return {
      category: 'story',
      action: 'start',
      timestamp: Date.now(),
      sessionId: 'test-session',
      storyId: 'test-story',
      storyVersion: '1.0',
      storyTitle: 'Test Story',
      metadata: {},
      ...overrides,
    };
  }

  describe('factory method', () => {
    it('creates instance without consent manager', () => {
      const instance = PrivacyFilter.create();
      expect(instance).toBeInstanceOf(PrivacyFilter);
    });

    it('creates instance with consent manager', () => {
      const instance = PrivacyFilter.create(consentManager);
      expect(instance).toBeInstanceOf(PrivacyFilter);
    });
  });

  describe('NONE consent level', () => {
    beforeEach(() => {
      consentManager.setConsentLevel(ConsentLevel.NONE);
    });

    it('blocks all events', () => {
      const event = createTestEvent();
      const result = filter.apply(event);
      expect(result).toBeNull();
    });

    it('blocks even essential events', () => {
      const event = createTestEvent({
        category: 'error',
        action: 'script',
      });
      const result = filter.apply(event);
      expect(result).toBeNull();
    });
  });

  describe('ESSENTIAL consent level', () => {
    beforeEach(() => {
      consentManager.setConsentLevel(ConsentLevel.ESSENTIAL);
    });

    it('allows essential events', () => {
      const event = createTestEvent({
        category: 'error',
        action: 'script',
        metadata: {
          errorType: 'SyntaxError',
          errorMessage: 'Unexpected token',
        },
      });
      const result = filter.apply(event);
      expect(result).not.toBeNull();
      expect(result?.category).toBe('error');
    });

    it('blocks non-essential events', () => {
      const event = createTestEvent({
        category: 'story',
        action: 'start',
      });
      const result = filter.apply(event);
      expect(result).toBeNull();
    });

    it('strips non-essential metadata', () => {
      const event = createTestEvent({
        category: 'error',
        action: 'script',
        metadata: {
          errorType: 'TypeError',
          errorMessage: 'null is not an object',
          customField: 'should be removed',
        },
      });
      const result = filter.apply(event);
      expect(result?.metadata?.errorType).toBe('TypeError');
      expect(result?.metadata?.customField).toBeUndefined();
    });

    it('removes userId', () => {
      const event = createTestEvent({
        category: 'error',
        action: 'script',
        userId: 'user-123',
      });
      const result = filter.apply(event);
      expect(result?.userId).toBeUndefined();
    });
  });

  describe('ANALYTICS consent level', () => {
    beforeEach(() => {
      consentManager.setConsentLevel(ConsentLevel.ANALYTICS);
    });

    it('allows analytics category events', () => {
      const event = createTestEvent({
        category: 'story',
        action: 'start',
      });
      const result = filter.apply(event);
      expect(result).not.toBeNull();
    });

    it('blocks non-analytics categories', () => {
      const event = createTestEvent({
        category: 'user',
        action: 'profile_updated',
      });
      const result = filter.apply(event);
      expect(result).toBeNull();
    });

    it('removes PII fields from metadata', () => {
      const event = createTestEvent({
        category: 'story',
        action: 'start',
        metadata: {
          userName: 'John Doe',
          userEmail: 'john@example.com',
          passageId: 'p1',
        },
      });
      const result = filter.apply(event);
      expect(result?.metadata?.userName).toBeUndefined();
      expect(result?.metadata?.userEmail).toBeUndefined();
      expect(result?.metadata?.passageId).toBe('p1');
    });

    it('redacts feedback text', () => {
      const event = createTestEvent({
        category: 'story',
        action: 'end',
        metadata: {
          feedbackText: 'I love this story!',
        },
      });
      const result = filter.apply(event);
      expect(result?.metadata?.feedbackText).toBe('[redacted]');
    });

    it('anonymizes save names with SHA-256 hash', () => {
      const event = createTestEvent({
        category: 'save',
        action: 'create',
        metadata: {
          saveName: 'My Special Save',
        },
      });
      const result = filter.apply(event);
      // SHA-256 produces hex output, we use first 12 characters
      expect(result?.metadata?.saveName).toMatch(/^Save_[0-9a-f]{12}$/);
    });

    it('uses session-scoped ID', () => {
      const event = createTestEvent();
      const result = filter.apply(event);
      expect(result?.sessionId).toBeTruthy();
      expect(result?.sessionId).not.toBe('test-session');
    });

    it('removes persistent userId', () => {
      const event = createTestEvent({
        userId: 'user-123',
      });
      const result = filter.apply(event);
      expect(result?.userId).toBeUndefined();
    });
  });

  describe('FULL consent level', () => {
    beforeEach(() => {
      consentManager.setConsentLevel(ConsentLevel.FULL);
    });

    it('allows all events', () => {
      const event = createTestEvent({
        category: 'user',
        action: 'profile_updated',
      });
      const result = filter.apply(event);
      expect(result).not.toBeNull();
    });

    it('preserves all metadata', () => {
      const event = createTestEvent({
        metadata: {
          userName: 'John',
          customField: 'value',
          feedbackText: 'Great!',
        },
      });
      const result = filter.apply(event);
      expect(result?.metadata?.userName).toBe('John');
      expect(result?.metadata?.customField).toBe('value');
      expect(result?.metadata?.feedbackText).toBe('Great!');
    });

    it('adds persistent userId', () => {
      const event = createTestEvent();
      const result = filter.apply(event);
      expect(result?.userId).toBeTruthy();
    });
  });

  describe('session management', () => {
    it('generates new session ID', () => {
      const sessionId = filter.startNewSession();
      expect(sessionId).toBeTruthy();
      expect(sessionId).toMatch(/^[a-f0-9-]+$/);
    });

    it('uses same session ID within session', () => {
      consentManager.setConsentLevel(ConsentLevel.ANALYTICS);

      const event1 = createTestEvent();
      const event2 = createTestEvent();

      const result1 = filter.apply(event1);
      const result2 = filter.apply(event2);

      expect(result1?.sessionId).toBe(result2?.sessionId);
    });
  });

  describe('isEventAllowed', () => {
    it('returns false for NONE consent', () => {
      expect(filter.isEventAllowed('story', 'start', ConsentLevel.NONE)).toBe(false);
    });

    it('returns true for essential events at ESSENTIAL level', () => {
      expect(filter.isEventAllowed('error', 'script', ConsentLevel.ESSENTIAL)).toBe(true);
    });

    it('returns false for non-essential events at ESSENTIAL level', () => {
      expect(filter.isEventAllowed('story', 'start', ConsentLevel.ESSENTIAL)).toBe(false);
    });

    it('returns true for analytics categories at ANALYTICS level', () => {
      expect(filter.isEventAllowed('story', 'start', ConsentLevel.ANALYTICS)).toBe(true);
      expect(filter.isEventAllowed('passage', 'view', ConsentLevel.ANALYTICS)).toBe(true);
    });

    it('returns true for all events at FULL level', () => {
      expect(filter.isEventAllowed('user', 'profile', ConsentLevel.FULL)).toBe(true);
      expect(filter.isEventAllowed('custom', 'event', ConsentLevel.FULL)).toBe(true);
    });
  });

  describe('validateCompliance', () => {
    it('detects userId at non-FULL consent levels', () => {
      const event = createTestEvent({ userId: 'user-123' });
      const result = filter.validateCompliance(event, ConsentLevel.ANALYTICS);
      expect(result.compliant).toBe(false);
      expect(result.violations.some((v) => v.includes('userId'))).toBe(true);
    });

    it('detects PII fields at non-FULL consent levels', () => {
      const event = createTestEvent({
        metadata: { userName: 'John' },
      });
      const result = filter.validateCompliance(event, ConsentLevel.ANALYTICS);
      expect(result.compliant).toBe(false);
      expect(result.violations.some((v) => v.includes('userName'))).toBe(true);
    });

    it('detects non-essential events at ESSENTIAL level', () => {
      const event = createTestEvent({
        category: 'story',
        action: 'start',
      });
      const result = filter.validateCompliance(event, ConsentLevel.ESSENTIAL);
      expect(result.compliant).toBe(false);
      expect(result.violations.some((v) => v.includes('Non-essential event'))).toBe(true);
    });

    it('passes compliant events', () => {
      const event = createTestEvent({
        category: 'error',
        action: 'script',
      });
      delete event.userId;
      const result = filter.validateCompliance(event, ConsentLevel.ESSENTIAL);
      expect(result.compliant).toBe(true);
    });
  });

  describe('applyConsentChangeToQueue', () => {
    it('filters queue based on new consent level', () => {
      const queue: AnalyticsEvent[] = [
        createTestEvent({ category: 'story', action: 'start' }),
        createTestEvent({ category: 'error', action: 'script' }),
        createTestEvent({ category: 'user', action: 'profile' }),
      ];

      const filtered = filter.applyConsentChangeToQueue(queue, ConsentLevel.ESSENTIAL);

      // Only error.script should remain
      expect(filtered).toHaveLength(1);
      expect(filtered[0].category).toBe('error');
    });

    it('removes all events for NONE consent', () => {
      const queue: AnalyticsEvent[] = [
        createTestEvent({ category: 'story', action: 'start' }),
        createTestEvent({ category: 'error', action: 'script' }),
      ];

      const filtered = filter.applyConsentChangeToQueue(queue, ConsentLevel.NONE);
      expect(filtered).toHaveLength(0);
    });
  });

  describe('reset', () => {
    it('clears session ID', () => {
      consentManager.setConsentLevel(ConsentLevel.ANALYTICS);
      const event1 = createTestEvent();
      const result1 = filter.apply(event1);
      const sessionId1 = result1?.sessionId;

      filter.reset();

      const event2 = createTestEvent();
      const result2 = filter.apply(event2);

      expect(result2?.sessionId).not.toBe(sessionId1);
    });
  });
});
