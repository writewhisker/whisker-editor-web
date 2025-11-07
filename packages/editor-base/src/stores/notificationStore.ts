import { writable } from 'svelte/store';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // milliseconds, 0 = persistent
}

const notifications = writable<Notification[]>([]);

let nextId = 0;

export const notificationStore = {
  subscribe: notifications.subscribe,

  /**
   * Add a notification
   */
  add(type: NotificationType, message: string, duration: number = 5000): string {
    const id = `notification-${++nextId}`;
    const notification: Notification = { id, type, message, duration };

    notifications.update(n => [...n, notification]);

    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => {
        notificationStore.dismiss(id);
      }, duration);
    }

    return id;
  },

  /**
   * Dismiss a notification by ID
   */
  dismiss(id: string) {
    notifications.update(n => n.filter(notification => notification.id !== id));
  },

  /**
   * Clear all notifications
   */
  clear() {
    notifications.set([]);
  },

  /**
   * Convenience methods
   */
  info(message: string, duration?: number) {
    return this.add('info', message, duration);
  },

  success(message: string, duration?: number) {
    return this.add('success', message, duration);
  },

  warning(message: string, duration?: number) {
    return this.add('warning', message, duration);
  },

  error(message: string, duration?: number) {
    return this.add('error', message, duration);
  },
};
