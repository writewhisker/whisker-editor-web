/**
 * WLS 1.0 Language Configuration Tests
 *
 * These tests verify that the WLS language configuration for Monaco Editor
 * is properly structured and can be registered without errors.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock monaco-editor before importing the module
vi.mock('monaco-editor', () => ({
  languages: {
    register: vi.fn(),
    setLanguageConfiguration: vi.fn(),
    setMonarchTokensProvider: vi.fn(),
    registerCompletionItemProvider: vi.fn(),
    CompletionItemKind: {
      Function: 1,
      Property: 10,
      Keyword: 14,
      Snippet: 27,
    },
    CompletionItemInsertTextRule: {
      InsertAsSnippet: 4,
    },
  },
  editor: {
    defineTheme: vi.fn(),
  },
}));

import * as monaco from 'monaco-editor';
import {
  registerWlsLanguage,
  registerWlsTheme,
  initializeWlsSupport,
} from './wlsConfig';

describe('WLS 1.0 Language Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerWlsLanguage', () => {
    it('registers wls language with Monaco', () => {
      registerWlsLanguage();

      expect(monaco.languages.register).toHaveBeenCalledWith({ id: 'wls' });
    });

    it('sets language configuration', () => {
      registerWlsLanguage();

      expect(monaco.languages.setLanguageConfiguration).toHaveBeenCalledWith(
        'wls',
        expect.objectContaining({
          comments: expect.objectContaining({
            lineComment: '--',
            blockComment: ['--[[', ']]'],
          }),
          brackets: expect.arrayContaining([
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
          ]),
        })
      );
    });

    it('sets Monarch tokenizer', () => {
      registerWlsLanguage();

      expect(monaco.languages.setMonarchTokensProvider).toHaveBeenCalledWith(
        'wls',
        expect.objectContaining({
          tokenPostfix: '.wls',
          keywords: expect.arrayContaining([
            'and',
            'or',
            'not',
            'if',
            'then',
            'else',
            'elseif',
            'end',
            'true',
            'false',
            'nil',
          ]),
          whiskerApi: expect.arrayContaining(['whisker', 'visited', 'random', 'pick']),
          specialTargets: expect.arrayContaining(['END', 'BACK', 'RESTART']),
          directives: expect.arrayContaining([
            'title',
            'author',
            'version',
            'start',
            'fallback',
            'onEnter',
            'onExit',
          ]),
        })
      );
    });

    it('registers completion provider with trigger characters', () => {
      registerWlsLanguage();

      expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalledWith(
        'wls',
        expect.objectContaining({
          triggerCharacters: expect.arrayContaining(['.', '@', '$', '{']),
          provideCompletionItems: expect.any(Function),
        })
      );
    });
  });

  describe('registerWlsTheme', () => {
    it('registers wls-dark theme', () => {
      registerWlsTheme();

      expect(monaco.editor.defineTheme).toHaveBeenCalledWith(
        'wls-dark',
        expect.objectContaining({
          base: 'vs-dark',
          inherit: true,
          rules: expect.arrayContaining([
            expect.objectContaining({ token: 'keyword.passage' }),
            expect.objectContaining({ token: 'variable' }),
            expect.objectContaining({ token: 'keyword.choice.once' }),
            expect.objectContaining({ token: 'keyword.choice.sticky' }),
          ]),
        })
      );
    });

    it('registers wls-light theme', () => {
      registerWlsTheme();

      expect(monaco.editor.defineTheme).toHaveBeenCalledWith(
        'wls-light',
        expect.objectContaining({
          base: 'vs',
          inherit: true,
        })
      );
    });
  });

  describe('initializeWlsSupport', () => {
    it('registers both language and theme', () => {
      initializeWlsSupport();

      // Should register language
      expect(monaco.languages.register).toHaveBeenCalledWith({ id: 'wls' });

      // Should define themes
      expect(monaco.editor.defineTheme).toHaveBeenCalledWith('wls-dark', expect.any(Object));
      expect(monaco.editor.defineTheme).toHaveBeenCalledWith('wls-light', expect.any(Object));
    });
  });

  describe('Tokenizer Rules', () => {
    it('tokenizer includes passage marker rule', () => {
      registerWlsLanguage();

      const tokenizerCall = vi.mocked(monaco.languages.setMonarchTokensProvider).mock.calls[0];
      const tokenizer = tokenizerCall[1] as { tokenizer: Record<string, unknown[]> };

      expect(tokenizer.tokenizer).toBeDefined();
      expect(tokenizer.tokenizer.root).toBeDefined();
    });

    it('tokenizer includes variable interpolation patterns', () => {
      registerWlsLanguage();

      const tokenizerCall = vi.mocked(monaco.languages.setMonarchTokensProvider).mock.calls[0];
      const config = tokenizerCall[1] as {
        tokenizer: Record<string, unknown[]>;
        escapes: RegExp;
      };

      // Check that escapes pattern is defined for variable interpolation
      expect(config.escapes).toBeDefined();
    });
  });

  describe('Completion Items', () => {
    it('completion provider returns suggestions with range', () => {
      registerWlsLanguage();

      const providerCall = vi.mocked(
        monaco.languages.registerCompletionItemProvider
      ).mock.calls[0];
      const provider = providerCall[1] as {
        provideCompletionItems: (
          model: { getWordUntilPosition: () => unknown; getLineContent: () => string },
          position: { lineNumber: number; column: number }
        ) => { suggestions: unknown[] };
      };

      const mockModel = {
        getWordUntilPosition: () => ({ startColumn: 1, endColumn: 1 }),
        getLineContent: () => 'whisker.state.',
      };
      const mockPosition = { lineNumber: 1, column: 14 };

      const result = provider.provideCompletionItems(mockModel, mockPosition);

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions.length).toBeGreaterThan(0);

      // Each suggestion should have a range
      result.suggestions.forEach((suggestion: { range?: unknown }) => {
        expect(suggestion.range).toBeDefined();
      });
    });
  });
});
