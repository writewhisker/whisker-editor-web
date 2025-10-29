/**
 * Tests for NotificationToast component and notificationStore
 *
 * Note: Component rendering tests are limited due to Svelte 5 + jsdom reactivity issues.
 * Focus is on testing the store logic which drives the component.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { notificationStore, type Notification } from '../stores/notificationStore';

describe('NotificationStore', () => {
  beforeEach(() => {
    notificationStore.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    notificationStore.clear();
    vi.useRealTimers();
  });

  describe('Adding Notifications', () => {
    it('should add notification to store', () => {
      const id = notificationStore.add('info', 'Test message');

      const notifications = get(notificationStore);
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toEqual({
        id,
        type: 'info',
        message: 'Test message',
        duration: 5000,
      });
    });

    it('should add multiple notifications', () => {
      notificationStore.add('info', 'Message 1');
      notificationStore.add('success', 'Message 2');
      notificationStore.add('error', 'Message 3');

      const notifications = get(notificationStore);
      expect(notifications).toHaveLength(3);
      expect(notifications[0].message).toBe('Message 1');
      expect(notifications[1].message).toBe('Message 2');
      expect(notifications[2].message).toBe('Message 3');
    });

    it('should return unique IDs for each notification', () => {
      const id1 = notificationStore.add('info', 'Message 1');
      const id2 = notificationStore.add('info', 'Message 2');
      const id3 = notificationStore.add('info', 'Message 3');

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should use default duration of 5000ms', () => {
      notificationStore.add('info', 'Test message');

      const notifications = get(notificationStore);
      expect(notifications[0].duration).toBe(5000);
    });

    it('should accept custom duration', () => {
      notificationStore.add('info', 'Test message', 3000);

      const notifications = get(notificationStore);
      expect(notifications[0].duration).toBe(3000);
    });

    it('should support persistent notifications with duration 0', () => {
      notificationStore.add('info', 'Persistent message', 0);

      const notifications = get(notificationStore);
      expect(notifications[0].duration).toBe(0);
    });
  });

  describe('Notification Types', () => {
    it('should create info notification', () => {
      notificationStore.info('Info message');

      const notifications = get(notificationStore);
      expect(notifications[0].type).toBe('info');
    });

    it('should create success notification', () => {
      notificationStore.success('Success message');

      const notifications = get(notificationStore);
      expect(notifications[0].type).toBe('success');
    });

    it('should create warning notification', () => {
      notificationStore.warning('Warning message');

      const notifications = get(notificationStore);
      expect(notifications[0].type).toBe('warning');
    });

    it('should create error notification', () => {
      notificationStore.error('Error message');

      const notifications = get(notificationStore);
      expect(notifications[0].type).toBe('error');
    });
  });

  describe('Dismissing Notifications', () => {
    it('should dismiss notification by ID', () => {
      const id1 = notificationStore.add('info', 'Message 1');
      const id2 = notificationStore.add('info', 'Message 2');
      const id3 = notificationStore.add('info', 'Message 3');

      notificationStore.dismiss(id2);

      const notifications = get(notificationStore);
      expect(notifications).toHaveLength(2);
      expect(notifications[0].id).toBe(id1);
      expect(notifications[1].id).toBe(id3);
    });

    it('should handle dismissing non-existent notification', () => {
      notificationStore.add('info', 'Message 1');

      expect(() => notificationStore.dismiss('non-existent-id')).not.toThrow();

      const notifications = get(notificationStore);
      expect(notifications).toHaveLength(1);
    });

    it('should handle dismissing from empty store', () => {
      expect(() => notificationStore.dismiss('some-id')).not.toThrow();

      const notifications = get(notificationStore);
      expect(notifications).toHaveLength(0);
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-dismiss after duration', () => {
      notificationStore.add('info', 'Auto-dismiss message', 3000);

      let notifications = get(notificationStore);
      expect(notifications).toHaveLength(1);

      // Fast-forward time by 3 seconds
      vi.advanceTimersByTime(3000);

      notifications = get(notificationStore);
      expect(notifications).toHaveLength(0);
    });

    it('should not auto-dismiss when duration is 0', () => {
      notificationStore.add('info', 'Persistent message', 0);

      let notifications = get(notificationStore);
      expect(notifications).toHaveLength(1);

      // Fast-forward time by 10 seconds
      vi.advanceTimersByTime(10000);

      notifications = get(notificationStore);
      expect(notifications).toHaveLength(1);
    });

    it('should auto-dismiss each notification independently', () => {
      notificationStore.add('info', 'Message 1', 1000);
      notificationStore.add('info', 'Message 2', 2000);
      notificationStore.add('info', 'Message 3', 3000);

      let notifications = get(notificationStore);
      expect(notifications).toHaveLength(3);

      vi.advanceTimersByTime(1000);
      notifications = get(notificationStore);
      expect(notifications).toHaveLength(2);

      vi.advanceTimersByTime(1000);
      notifications = get(notificationStore);
      expect(notifications).toHaveLength(1);

      vi.advanceTimersByTime(1000);
      notifications = get(notificationStore);
      expect(notifications).toHaveLength(0);
    });

    it('should use default duration of 5000ms for auto-dismiss', () => {
      notificationStore.add('info', 'Default duration');

      let notifications = get(notificationStore);
      expect(notifications).toHaveLength(1);

      vi.advanceTimersByTime(4999);
      notifications = get(notificationStore);
      expect(notifications).toHaveLength(1);

      vi.advanceTimersByTime(1);
      notifications = get(notificationStore);
      expect(notifications).toHaveLength(0);
    });
  });

  describe('Clearing Notifications', () => {
    it('should clear all notifications', () => {
      notificationStore.add('info', 'Message 1');
      notificationStore.add('success', 'Message 2');
      notificationStore.add('error', 'Message 3');

      let notifications = get(notificationStore);
      expect(notifications).toHaveLength(3);

      notificationStore.clear();

      notifications = get(notificationStore);
      expect(notifications).toHaveLength(0);
    });

    it('should handle clearing empty store', () => {
      expect(() => notificationStore.clear()).not.toThrow();

      const notifications = get(notificationStore);
      expect(notifications).toHaveLength(0);
    });

    it('should not affect timers after clear', () => {
      notificationStore.add('info', 'Message 1', 3000);
      notificationStore.clear();

      // Add new notification after clear
      notificationStore.add('info', 'Message 2', 1000);

      vi.advanceTimersByTime(1000);

      const notifications = get(notificationStore);
      expect(notifications).toHaveLength(0); // New message should be dismissed
    });
  });

  describe('Convenience Methods', () => {
    it('should return ID from info()', () => {
      const id = notificationStore.info('Info message');

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toContain('notification-');
    });

    it('should return ID from success()', () => {
      const id = notificationStore.success('Success message');

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should return ID from warning()', () => {
      const id = notificationStore.warning('Warning message');

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should return ID from error()', () => {
      const id = notificationStore.error('Error message');

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should accept custom duration in convenience methods', () => {
      notificationStore.info('Info message', 2000);

      const notifications = get(notificationStore);
      expect(notifications[0].duration).toBe(2000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      notificationStore.add('info', '');

      const notifications = get(notificationStore);
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('');
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      notificationStore.add('info', longMessage);

      const notifications = get(notificationStore);
      expect(notifications[0].message).toBe(longMessage);
    });

    it('should handle special characters in message', () => {
      const specialMessage = '<script>alert("xss")</script>';
      notificationStore.add('info', specialMessage);

      const notifications = get(notificationStore);
      expect(notifications[0].message).toBe(specialMessage);
    });

    it('should handle rapid successive additions', () => {
      for (let i = 0; i < 100; i++) {
        notificationStore.add('info', `Message ${i}`, 0);
      }

      const notifications = get(notificationStore);
      expect(notifications).toHaveLength(100);
    });

    it('should handle rapid successive dismissals', () => {
      const ids: string[] = [];
      for (let i = 0; i < 10; i++) {
        ids.push(notificationStore.add('info', `Message ${i}`, 0));
      }

      ids.forEach(id => notificationStore.dismiss(id));

      const notifications = get(notificationStore);
      expect(notifications).toHaveLength(0);
    });

    it('should handle negative duration', () => {
      notificationStore.add('info', 'Test', -1000);

      // Should not auto-dismiss with negative duration
      vi.advanceTimersByTime(10000);

      const notifications = get(notificationStore);
      expect(notifications).toHaveLength(1);
    });
  });

  describe('Notification Order', () => {
    it('should maintain insertion order', () => {
      const id1 = notificationStore.add('info', 'First');
      const id2 = notificationStore.add('success', 'Second');
      const id3 = notificationStore.add('error', 'Third');

      const notifications = get(notificationStore);
      expect(notifications[0].id).toBe(id1);
      expect(notifications[1].id).toBe(id2);
      expect(notifications[2].id).toBe(id3);
    });

    it('should preserve order after dismissing middle item', () => {
      const id1 = notificationStore.add('info', 'First');
      const id2 = notificationStore.add('info', 'Second');
      const id3 = notificationStore.add('info', 'Third');

      notificationStore.dismiss(id2);

      const notifications = get(notificationStore);
      expect(notifications[0].id).toBe(id1);
      expect(notifications[1].id).toBe(id3);
    });
  });

  describe('Store Subscription', () => {
    it('should notify subscribers when notification added', () => {
      const updates: Notification[][] = [];

      const unsubscribe = notificationStore.subscribe(notifications => {
        updates.push([...notifications]);
      });

      notificationStore.add('info', 'Test message', 0);

      // First update is initial empty state, second is after add
      expect(updates.length).toBeGreaterThanOrEqual(2);
      expect(updates[updates.length - 1]).toHaveLength(1);

      unsubscribe();
    });

    it('should notify subscribers when notification dismissed', () => {
      const updates: Notification[][] = [];

      const unsubscribe = notificationStore.subscribe(notifications => {
        updates.push([...notifications]);
      });

      const id = notificationStore.add('info', 'Test message', 0);
      notificationStore.dismiss(id);

      // Should have updates for: initial, add, dismiss
      expect(updates.length).toBeGreaterThanOrEqual(3);
      expect(updates[updates.length - 1]).toHaveLength(0);

      unsubscribe();
    });

    it('should notify subscribers when store cleared', () => {
      const updates: Notification[][] = [];

      const unsubscribe = notificationStore.subscribe(notifications => {
        updates.push([...notifications]);
      });

      notificationStore.add('info', 'Message 1', 0);
      notificationStore.add('info', 'Message 2', 0);
      notificationStore.clear();

      // Should have final empty state
      expect(updates[updates.length - 1]).toHaveLength(0);

      unsubscribe();
    });
  });
});
