import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { classNames, cn, portal } from './index';

describe('@writewhisker/shared-ui', () => {
  describe('classNames', () => {
    it('should combine multiple class names', () => {
      const result = classNames('class1', 'class2', 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should filter out falsy values', () => {
      const result = classNames('class1', null, 'class2', undefined, 'class3', false);
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle empty input', () => {
      const result = classNames();
      expect(result).toBe('');
    });

    it('should handle all falsy values', () => {
      const result = classNames(null, undefined, false, '');
      expect(result).toBe('');
    });

    it('should handle conditional class names', () => {
      const isActive = true;
      const isDisabled = false;
      const result = classNames(
        'base',
        isActive && 'active',
        isDisabled && 'disabled'
      );
      expect(result).toBe('base active');
    });

    it('should preserve spaces in class names', () => {
      const result = classNames('class1 class2', 'class3');
      expect(result).toBe('class1 class2 class3');
    });
  });

  describe('cn', () => {
    it('should be an alias for classNames', () => {
      const result1 = cn('class1', 'class2');
      const result2 = classNames('class1', 'class2');
      expect(result1).toBe(result2);
    });

    it('should filter falsy values', () => {
      const result = cn('class1', null, 'class2', undefined);
      expect(result).toBe('class1 class2');
    });
  });

  describe('portal', () => {
    let mockNode: HTMLElement;
    let mockTarget: HTMLElement;

    beforeEach(() => {
      // Create mock DOM elements
      mockNode = document.createElement('div');
      mockNode.id = 'portal-content';

      mockTarget = document.createElement('div');
      mockTarget.id = 'portal-target';
      document.body.appendChild(mockTarget);
    });

    afterEach(() => {
      // Cleanup
      if (mockTarget.parentNode) {
        mockTarget.parentNode.removeChild(mockTarget);
      }
      if (mockNode.parentNode) {
        mockNode.parentNode.removeChild(mockNode);
      }
    });

    it('should append node to body by default', () => {
      const instance = portal(mockNode);

      expect(mockNode.parentNode).toBe(document.body);

      instance.destroy();
    });

    it('should append node to target element by selector', () => {
      const instance = portal(mockNode, '#portal-target');

      expect(mockNode.parentNode).toBe(mockTarget);
      expect(mockTarget.contains(mockNode)).toBe(true);

      instance.destroy();
    });

    it('should append node to target element by reference', () => {
      const instance = portal(mockNode, mockTarget);

      expect(mockNode.parentNode).toBe(mockTarget);
      expect(mockTarget.contains(mockNode)).toBe(true);

      instance.destroy();
    });

    it('should remove node on destroy', () => {
      const instance = portal(mockNode, mockTarget);

      expect(mockTarget.contains(mockNode)).toBe(true);

      instance.destroy();

      expect(mockNode.parentNode).toBeNull();
      expect(mockTarget.contains(mockNode)).toBe(false);
    });

    it('should handle destroy when node is already removed', () => {
      const instance = portal(mockNode, mockTarget);

      // Manually remove node
      mockTarget.removeChild(mockNode);

      // Should not throw error
      expect(() => instance.destroy()).not.toThrow();
    });

    it('should throw error for invalid selector', () => {
      expect(() => {
        portal(mockNode, '#non-existent-element');
      }).toThrow('Target element "#non-existent-element" not found');
    });

    it('should handle multiple portal instances', () => {
      const node1 = document.createElement('div');
      const node2 = document.createElement('div');

      const instance1 = portal(node1, mockTarget);
      const instance2 = portal(node2, mockTarget);

      expect(mockTarget.children.length).toBe(2);

      instance1.destroy();
      expect(mockTarget.children.length).toBe(1);

      instance2.destroy();
      expect(mockTarget.children.length).toBe(0);
    });
  });

  describe('module exports', () => {
    it('should export all utility functions', () => {
      expect(classNames).toBeDefined();
      expect(typeof classNames).toBe('function');
      expect(cn).toBeDefined();
      expect(typeof cn).toBe('function');
      expect(portal).toBeDefined();
      expect(typeof portal).toBe('function');
    });
  });
});
