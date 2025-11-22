import { describe, it, expect } from 'vitest';
import * as ThemeStateModule from './index';

describe('@writewhisker/theme-state', () => {
  it('should export module', () => {
    expect(ThemeStateModule).toBeDefined();
    expect(Object.keys(ThemeStateModule).length).toBeGreaterThan(0);
  });
});
