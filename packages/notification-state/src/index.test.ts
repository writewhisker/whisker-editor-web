import { describe, it, expect } from 'vitest';
import * as NotificationStateModule from './index';

describe('@writewhisker/notification-state', () => {
  it('should export module', () => {
    expect(NotificationStateModule).toBeDefined();
    expect(Object.keys(NotificationStateModule).length).toBeGreaterThan(0);
  });
});
