import { describe, it, expect } from 'vitest';
import * as ValidationStateModule from './index';

describe('@writewhisker/validation-state', () => {
  it('should export module', () => {
    expect(ValidationStateModule).toBeDefined();
    expect(Object.keys(ValidationStateModule).length).toBeGreaterThan(0);
  });
});
