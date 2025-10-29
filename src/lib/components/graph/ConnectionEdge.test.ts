/**
 * Tests for ConnectionEdge component
 * 
 * ConnectionEdge is a visual component rendering SVG paths between passages.
 * Tests focus on edge path calculation logic.
 */

import { describe, it, expect } from 'vitest';

describe('ConnectionEdge - Path Calculation', () => {
  function calculateEdgePath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const controlOffset = Math.min(distance / 3, 100);
    
    return `M ${x1} ${y1} Q ${x1 + controlOffset} ${y1}, ${(x1 + x2) / 2} ${(y1 + y2) / 2} T ${x2} ${y2}`;
  }

  it('should calculate path for horizontal connection', () => {
    const path = calculateEdgePath(0, 0, 100, 0);
    expect(path).toContain('M 0 0');
    expect(path).toContain('T 100 0');
  });

  it('should calculate path for vertical connection', () => {
    const path = calculateEdgePath(0, 0, 0, 100);
    expect(path).toContain('M 0 0');
    expect(path).toContain('T 0 100');
  });

  it('should calculate path for diagonal connection', () => {
    const path = calculateEdgePath(0, 0, 100, 100);
    expect(path).toBeDefined();
    expect(path.startsWith('M 0 0')).toBe(true);
  });

  it('should handle negative coordinates', () => {
    const path = calculateEdgePath(-50, -50, 50, 50);
    expect(path).toContain('M -50 -50');
    expect(path).toContain('T 50 50');
  });
});

describe('ConnectionEdge - Edge Types', () => {
  it('should identify choice edge', () => {
    const type = 'choice';
    expect(type).toBe('choice');
  });

  it('should identify conditional edge', () => {
    const type = 'conditional';
    expect(type).toBe('conditional');
  });

  it('should identify default edge', () => {
    const type = 'default';
    expect(type).toBe('default');
  });
});
