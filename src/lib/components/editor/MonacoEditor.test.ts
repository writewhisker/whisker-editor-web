/**
 * Tests for MonacoEditor Component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import MonacoEditor from './MonacoEditor.svelte';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
};

describe('MonacoEditor', () => {
  beforeEach(() => {
    // Reset mocks
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render without crashing', () => {
      const { container } = render(MonacoEditor);
      expect(container.querySelector('.monaco-editor-wrapper')).toBeTruthy();
    });

    it('should accept value prop', () => {
      const { container } = render(MonacoEditor, { value: 'print("hello")' });
      expect(container).toBeTruthy();
    });

    it('should accept language prop', () => {
      const { container } = render(MonacoEditor, { language: 'javascript' });
      expect(container).toBeTruthy();
    });

    it('should accept theme prop', () => {
      const { container } = render(MonacoEditor, { theme: 'vs' });
      expect(container).toBeTruthy();
    });

    it('should accept readonly prop', () => {
      const { container } = render(MonacoEditor, { readonly: true });
      expect(container).toBeTruthy();
    });

    it('should accept minimap prop', () => {
      const { container } = render(MonacoEditor, { minimap: true });
      expect(container).toBeTruthy();
    });
  });

  describe('Props', () => {
    it('should accept fontSize prop', () => {
      const { container } = render(MonacoEditor, { fontSize: 16 });
      expect(container).toBeTruthy();
    });

    it('should accept tabSize prop', () => {
      const { container } = render(MonacoEditor, { tabSize: 4 });
      expect(container).toBeTruthy();
    });

    it('should accept wordWrap prop', () => {
      const { container } = render(MonacoEditor, { wordWrap: 'off' });
      expect(container).toBeTruthy();
    });

    it('should accept lineNumbers prop', () => {
      const { container } = render(MonacoEditor, { lineNumbers: 'off' });
      expect(container).toBeTruthy();
    });
  });

  describe('Public API', () => {
    it('should expose getValue method', () => {
      const { component } = render(MonacoEditor);
      expect(typeof component.getValue).toBe('function');
      const value = component.getValue();
      expect(typeof value).toBe('string');
    });

    it('should expose setValue method', () => {
      const { component } = render(MonacoEditor);
      expect(typeof component.setValue).toBe('function');
      component.setValue('new value');
    });

    it('should expose focus method', () => {
      const { component } = render(MonacoEditor);
      expect(typeof component.focus).toBe('function');
      component.focus();
    });

    it('should expose getSelection method', () => {
      const { component } = render(MonacoEditor);
      expect(typeof component.getSelection).toBe('function');
      const selection = component.getSelection();
      expect(typeof selection).toBe('string');
    });

    it('should expose insertText method', () => {
      const { component } = render(MonacoEditor);
      expect(typeof component.insertText).toBe('function');
      component.insertText('text');
    });

    it('should expose formatDocument method', async () => {
      const { component } = render(MonacoEditor);
      expect(typeof component.formatDocument).toBe('function');
      await component.formatDocument();
    });
  });

  describe('Component Lifecycle', () => {
    it('should mount and unmount without errors', () => {
      const { unmount } = render(MonacoEditor);
      unmount();
    });

    it('should render with multiple props', () => {
      const { container } = render(MonacoEditor, {
        value: 'local x = 1',
        language: 'lua',
        theme: 'vs-dark',
        readonly: false,
        fontSize: 14,
        tabSize: 2,
      });
      expect(container.querySelector('.monaco-editor-wrapper')).toBeTruthy();
    });
  });
});
