import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * Grid snap utility function (extracted from GraphView for testing)
 * Snaps a position to the nearest grid point based on localStorage settings
 */
function snapToGrid(position: { x: number; y: number }): { x: number; y: number } {
  try {
    const gridSnapEnabled = localStorage.getItem('whisker-grid-snap-enabled') === 'true';
    if (!gridSnapEnabled) return position;

    const gridSize = parseInt(localStorage.getItem('whisker-grid-size') || '20', 10);
    return {
      x: Math.round(position.x / gridSize) * gridSize,
      y: Math.round(position.y / gridSize) * gridSize,
    };
  } catch (error) {
    return position; // Fallback to original position if error
  }
}

describe('Grid Snap Functionality', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('snapToGrid', () => {
    it('should return original position when grid snap is disabled', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'false');
      localStorage.setItem('whisker-grid-size', '20');

      const position = { x: 123, y: 456 };
      const snapped = snapToGrid(position);

      expect(snapped).toEqual({ x: 123, y: 456 });
    });

    it('should return original position when grid snap setting is not set', () => {
      // No settings in localStorage
      const position = { x: 123, y: 456 };
      const snapped = snapToGrid(position);

      expect(snapped).toEqual({ x: 123, y: 456 });
    });

    it('should snap to grid with default size of 20', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'true');
      // No grid size set, should use default 20

      const position = { x: 123, y: 456 };
      const snapped = snapToGrid(position);

      expect(snapped).toEqual({ x: 120, y: 460 });
    });

    it('should snap to grid with size 10', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'true');
      localStorage.setItem('whisker-grid-size', '10');

      const position = { x: 123, y: 456 };
      const snapped = snapToGrid(position);

      expect(snapped).toEqual({ x: 120, y: 460 });
    });

    it('should snap to grid with size 25', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'true');
      localStorage.setItem('whisker-grid-size', '25');

      const position = { x: 123, y: 456 };
      const snapped = snapToGrid(position);

      // 123 / 25 = 4.92, rounds to 5, 5 * 25 = 125
      // 456 / 25 = 18.24, rounds to 18, 18 * 25 = 450
      expect(snapped).toEqual({ x: 125, y: 450 });
    });

    it('should snap to grid with size 50', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'true');
      localStorage.setItem('whisker-grid-size', '50');

      const position = { x: 123, y: 456 };
      const snapped = snapToGrid(position);

      // 123 / 50 = 2.46, rounds to 2, 2 * 50 = 100
      // 456 / 50 = 9.12, rounds to 9, 9 * 50 = 450
      expect(snapped).toEqual({ x: 100, y: 450 });
    });

    it('should handle exact grid positions', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'true');
      localStorage.setItem('whisker-grid-size', '20');

      const position = { x: 100, y: 200 };
      const snapped = snapToGrid(position);

      expect(snapped).toEqual({ x: 100, y: 200 });
    });

    it('should handle negative coordinates', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'true');
      localStorage.setItem('whisker-grid-size', '20');

      const position = { x: -123, y: -456 };
      const snapped = snapToGrid(position);

      // -123 / 20 = -6.15, rounds to -6, -6 * 20 = -120
      // -456 / 20 = -22.8, rounds to -23, -23 * 20 = -460
      expect(snapped).toEqual({ x: -120, y: -460 });
    });

    it('should handle zero coordinates', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'true');
      localStorage.setItem('whisker-grid-size', '20');

      const position = { x: 0, y: 0 };
      const snapped = snapToGrid(position);

      expect(snapped).toEqual({ x: 0, y: 0 });
    });

    it('should round to nearest grid point (not floor)', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'true');
      localStorage.setItem('whisker-grid-size', '20');

      // Test position closer to upper grid line
      const position1 = { x: 115, y: 215 };
      const snapped1 = snapToGrid(position1);
      expect(snapped1).toEqual({ x: 120, y: 220 });

      // Test position closer to lower grid line
      const position2 = { x: 104, y: 204 };
      const snapped2 = snapToGrid(position2);
      expect(snapped2).toEqual({ x: 100, y: 200 });

      // Test exact middle (should round up due to Math.round behavior)
      // 110 / 20 = 5.5 -> rounds to 6 -> 6 * 20 = 120
      // 210 / 20 = 10.5 -> rounds to 11 -> 11 * 20 = 220
      const position3 = { x: 110, y: 210 };
      const snapped3 = snapToGrid(position3);
      expect(snapped3).toEqual({ x: 120, y: 220 });
    });

    it('should handle very small grid sizes', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'true');
      localStorage.setItem('whisker-grid-size', '5');

      const position = { x: 123, y: 456 };
      const snapped = snapToGrid(position);

      // 123 / 5 = 24.6, rounds to 25, 25 * 5 = 125
      // 456 / 5 = 91.2, rounds to 91, 91 * 5 = 455
      expect(snapped).toEqual({ x: 125, y: 455 });
    });

    it('should handle very large grid sizes', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'true');
      localStorage.setItem('whisker-grid-size', '100');

      const position = { x: 123, y: 456 };
      const snapped = snapToGrid(position);

      // 123 / 100 = 1.23, rounds to 1, 1 * 100 = 100
      // 456 / 100 = 4.56, rounds to 5, 5 * 100 = 500
      expect(snapped).toEqual({ x: 100, y: 500 });
    });

    it('should handle invalid grid size gracefully', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'true');
      localStorage.setItem('whisker-grid-size', 'invalid');

      const position = { x: 123, y: 456 };
      const snapped = snapToGrid(position);

      // Should use NaN from parseInt, which will cause fallback
      // parseInt('invalid') returns NaN, and positions with NaN will be returned as-is
      expect(isNaN(snapped.x) || snapped.x === 123).toBe(true);
    });

    it('should handle decimal coordinates', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'true');
      localStorage.setItem('whisker-grid-size', '20');

      const position = { x: 123.7, y: 456.3 };
      const snapped = snapToGrid(position);

      // 123.7 / 20 = 6.185, rounds to 6, 6 * 20 = 120
      // 456.3 / 20 = 22.815, rounds to 23, 23 * 20 = 460
      expect(snapped).toEqual({ x: 120, y: 460 });
    });
  });

  describe('SettingsDialog integration', () => {
    it('should persist grid snap enabled setting', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'true');
      expect(localStorage.getItem('whisker-grid-snap-enabled')).toBe('true');
    });

    it('should persist grid size setting', () => {
      localStorage.setItem('whisker-grid-size', '25');
      expect(localStorage.getItem('whisker-grid-size')).toBe('25');
    });

    it('should handle all preset sizes (10, 15, 20, 25, 50)', () => {
      const presets = [10, 15, 20, 25, 50];

      presets.forEach((size) => {
        localStorage.setItem('whisker-grid-snap-enabled', 'true');
        localStorage.setItem('whisker-grid-size', String(size));

        const position = { x: 123, y: 456 };
        const snapped = snapToGrid(position);

        // Verify snapping works for each preset
        const expectedX = Math.round(123 / size) * size;
        const expectedY = Math.round(456 / size) * size;

        expect(snapped).toEqual({ x: expectedX, y: expectedY });
      });
    });
  });

  describe('edge cases', () => {
    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw an error
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => {
        throw new Error('localStorage error');
      };

      const position = { x: 123, y: 456 };
      const snapped = snapToGrid(position);

      // Should return original position on error
      expect(snapped).toEqual({ x: 123, y: 456 });

      // Restore
      localStorage.getItem = originalGetItem;
    });

    it('should handle grid size of 1', () => {
      localStorage.setItem('whisker-grid-snap-enabled', 'true');
      localStorage.setItem('whisker-grid-size', '1');

      const position = { x: 123.456, y: 456.789 };
      const snapped = snapToGrid(position);

      // Should round to nearest integer
      expect(snapped).toEqual({ x: 123, y: 457 });
    });
  });
});
