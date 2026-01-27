/**
 * Developer Experience Errors Tests (GAP-052)
 */

import { describe, it, expect } from 'vitest';
import {
  DEV_ERROR_CODES,
  DEV_ERROR_MESSAGES,
  DevErrors,
  createDevError,
  formatDevError,
  isRecoverable,
  isDevErrorCode,
  getAllDevErrorCodes,
  type DevError,
} from './DevErrors';

describe('DevErrors (GAP-052)', () => {
  describe('DEV_ERROR_CODES', () => {
    it('should define all LSP error codes', () => {
      expect(DEV_ERROR_CODES.LSP_CONNECTION_FAILED).toBe('DEV-001');
      expect(DEV_ERROR_CODES.LSP_CAPABILITY_UNSUPPORTED).toBe('DEV-002');
      expect(DEV_ERROR_CODES.LSP_DOCUMENT_NOT_FOUND).toBe('DEV-003');
      expect(DEV_ERROR_CODES.LSP_INVALID_POSITION).toBe('DEV-004');
      expect(DEV_ERROR_CODES.LSP_TIMEOUT).toBe('DEV-005');
    });

    it('should define all DAP error codes', () => {
      expect(DEV_ERROR_CODES.DAP_CONNECTION_FAILED).toBe('DEV-006');
      expect(DEV_ERROR_CODES.DAP_BREAKPOINT_INVALID).toBe('DEV-007');
      expect(DEV_ERROR_CODES.DAP_LAUNCH_FAILED).toBe('DEV-008');
      expect(DEV_ERROR_CODES.DAP_ATTACH_FAILED).toBe('DEV-009');
      expect(DEV_ERROR_CODES.DAP_VARIABLE_NOT_FOUND).toBe('DEV-010');
    });

    it('should define all configuration error codes', () => {
      expect(DEV_ERROR_CODES.CONFIG_INVALID).toBe('DEV-011');
      expect(DEV_ERROR_CODES.CONFIG_NOT_FOUND).toBe('DEV-012');
      expect(DEV_ERROR_CODES.CONFIG_PARSE_ERROR).toBe('DEV-013');
      expect(DEV_ERROR_CODES.WORKSPACE_INVALID).toBe('DEV-014');
      expect(DEV_ERROR_CODES.EXTENSION_LOAD_FAILED).toBe('DEV-015');
    });

    it('should define all IDE feature error codes', () => {
      expect(DEV_ERROR_CODES.SEMANTIC_TOKEN_ERROR).toBe('DEV-016');
      expect(DEV_ERROR_CODES.CODE_ACTION_FAILED).toBe('DEV-017');
      expect(DEV_ERROR_CODES.RENAME_CONFLICT).toBe('DEV-018');
      expect(DEV_ERROR_CODES.REFACTOR_UNSAFE).toBe('DEV-019');
      expect(DEV_ERROR_CODES.INDEX_CORRUPTION).toBe('DEV-020');
    });
  });

  describe('DEV_ERROR_MESSAGES', () => {
    it('should have messages for all error codes', () => {
      const codes = Object.values(DEV_ERROR_CODES);
      for (const code of codes) {
        expect(DEV_ERROR_MESSAGES[code]).toBeDefined();
        expect(typeof DEV_ERROR_MESSAGES[code]).toBe('string');
      }
    });

    it('should use placeholders in message templates', () => {
      expect(DEV_ERROR_MESSAGES['DEV-001']).toContain('{reason}');
      expect(DEV_ERROR_MESSAGES['DEV-002']).toContain('{capability}');
      expect(DEV_ERROR_MESSAGES['DEV-003']).toContain('{uri}');
    });
  });

  describe('createDevError', () => {
    it('should create error with formatted message', () => {
      const error = createDevError(DEV_ERROR_CODES.LSP_CONNECTION_FAILED, {
        reason: 'Connection refused',
      });

      expect(error.code).toBe('DEV-001');
      expect(error.message).toBe('Language server connection failed: Connection refused');
      expect(error.severity).toBe('error');
      expect(error.recoverable).toBe(false);
    });

    it('should replace multiple placeholders', () => {
      const error = createDevError(DEV_ERROR_CODES.LSP_INVALID_POSITION, {
        line: 10,
        character: 5,
      });

      expect(error.message).toContain('line 10');
      expect(error.message).toContain('character 5');
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const error = createDevError(DEV_ERROR_CODES.LSP_CONNECTION_FAILED, { reason: 'test' });
      const after = Date.now();

      expect(error.timestamp).toBeGreaterThanOrEqual(before);
      expect(error.timestamp).toBeLessThanOrEqual(after);
    });

    it('should respect severity option', () => {
      const error = createDevError(DEV_ERROR_CODES.LSP_CONNECTION_FAILED, { reason: 'test' }, {
        severity: 'warning',
      });

      expect(error.severity).toBe('warning');
    });

    it('should respect recoverable option', () => {
      const error = createDevError(DEV_ERROR_CODES.LSP_CONNECTION_FAILED, { reason: 'test' }, {
        recoverable: true,
      });

      expect(error.recoverable).toBe(true);
    });

    it('should include details when provided', () => {
      const error = createDevError(DEV_ERROR_CODES.LSP_CONNECTION_FAILED, { reason: 'test' }, {
        details: { port: 3000, host: 'localhost' },
      });

      expect(error.details).toEqual({ port: 3000, host: 'localhost' });
    });
  });

  describe('DevErrors factory', () => {
    describe('LSP errors', () => {
      it('lspConnectionFailed', () => {
        const error = DevErrors.lspConnectionFailed('Server crashed');
        expect(error.code).toBe('DEV-001');
        expect(error.message).toContain('Server crashed');
      });

      it('lspCapabilityUnsupported', () => {
        const error = DevErrors.lspCapabilityUnsupported('textDocument/formatting');
        expect(error.code).toBe('DEV-002');
        expect(error.message).toContain('textDocument/formatting');
        expect(error.recoverable).toBe(true);
      });

      it('lspDocumentNotFound', () => {
        const error = DevErrors.lspDocumentNotFound('file:///test.ws');
        expect(error.code).toBe('DEV-003');
        expect(error.message).toContain('file:///test.ws');
      });

      it('lspInvalidPosition', () => {
        const error = DevErrors.lspInvalidPosition(100, 50);
        expect(error.code).toBe('DEV-004');
        expect(error.message).toContain('100');
        expect(error.message).toContain('50');
      });

      it('lspTimeout', () => {
        const error = DevErrors.lspTimeout('textDocument/completion', 5000);
        expect(error.code).toBe('DEV-005');
        expect(error.message).toContain('textDocument/completion');
        expect(error.message).toContain('5000');
      });
    });

    describe('DAP errors', () => {
      it('dapConnectionFailed', () => {
        const error = DevErrors.dapConnectionFailed('No debugger found');
        expect(error.code).toBe('DEV-006');
      });

      it('dapBreakpointInvalid', () => {
        const error = DevErrors.dapBreakpointInvalid('main.ws:42', 'Line is empty');
        expect(error.code).toBe('DEV-007');
        expect(error.recoverable).toBe(true);
      });

      it('dapLaunchFailed', () => {
        const error = DevErrors.dapLaunchFailed('Missing start passage');
        expect(error.code).toBe('DEV-008');
      });

      it('dapAttachFailed', () => {
        const error = DevErrors.dapAttachFailed(12345, 'Process not found');
        expect(error.code).toBe('DEV-009');
        expect(error.message).toContain('12345');
      });

      it('dapVariableNotFound', () => {
        const error = DevErrors.dapVariableNotFound('gold');
        expect(error.code).toBe('DEV-010');
        expect(error.recoverable).toBe(true);
      });
    });

    describe('Configuration errors', () => {
      it('configInvalid', () => {
        const error = DevErrors.configInvalid('.whiskerrc', 'Invalid JSON');
        expect(error.code).toBe('DEV-011');
      });

      it('configNotFound', () => {
        const error = DevErrors.configNotFound('whisker.config.json');
        expect(error.code).toBe('DEV-012');
      });

      it('configParseError', () => {
        const error = DevErrors.configParseError('config.json', 'Unexpected token');
        expect(error.code).toBe('DEV-013');
      });

      it('workspaceInvalid', () => {
        const error = DevErrors.workspaceInvalid('Missing stories directory');
        expect(error.code).toBe('DEV-014');
      });

      it('extensionLoadFailed', () => {
        const error = DevErrors.extensionLoadFailed('custom-theme', 'Syntax error');
        expect(error.code).toBe('DEV-015');
      });
    });

    describe('IDE feature errors', () => {
      it('semanticTokenError', () => {
        const error = DevErrors.semanticTokenError('Token overflow');
        expect(error.code).toBe('DEV-016');
        expect(error.recoverable).toBe(true);
      });

      it('codeActionFailed', () => {
        const error = DevErrors.codeActionFailed('quickfix.addImport', 'Ambiguous import');
        expect(error.code).toBe('DEV-017');
      });

      it('renameConflict', () => {
        const error = DevErrors.renameConflict('newPassage', 'passage');
        expect(error.code).toBe('DEV-018');
      });

      it('refactorUnsafe', () => {
        const error = DevErrors.refactorUnsafe('Would break external references');
        expect(error.code).toBe('DEV-019');
        expect(error.severity).toBe('warning');
      });

      it('indexCorruption', () => {
        const error = DevErrors.indexCorruption();
        expect(error.code).toBe('DEV-020');
      });
    });
  });

  describe('formatDevError', () => {
    it('should format error message', () => {
      const error = DevErrors.lspConnectionFailed('Connection refused');
      const formatted = formatDevError(error);

      expect(formatted).toBe('[DEV-001] Error: Language server connection failed: Connection refused');
    });

    it('should use Warning prefix for warnings', () => {
      const error = DevErrors.lspCapabilityUnsupported('test');
      const formatted = formatDevError(error);

      expect(formatted).toContain('[DEV-002] Warning:');
    });

    it('should use Info prefix for info severity', () => {
      const error = createDevError(DEV_ERROR_CODES.LSP_CONNECTION_FAILED, { reason: 'test' }, {
        severity: 'info',
      });
      const formatted = formatDevError(error);

      expect(formatted).toContain('[DEV-001] Info:');
    });
  });

  describe('isRecoverable', () => {
    it('should return true for recoverable errors', () => {
      const error = DevErrors.lspCapabilityUnsupported('test');
      expect(isRecoverable(error)).toBe(true);
    });

    it('should return false for non-recoverable errors', () => {
      const error = DevErrors.lspConnectionFailed('test');
      expect(isRecoverable(error)).toBe(false);
    });
  });

  describe('isDevErrorCode', () => {
    it('should return true for valid codes', () => {
      expect(isDevErrorCode('DEV-001')).toBe(true);
      expect(isDevErrorCode('DEV-020')).toBe(true);
    });

    it('should return false for invalid codes', () => {
      expect(isDevErrorCode('DEV-999')).toBe(false);
      expect(isDevErrorCode('WLS-001')).toBe(false);
      expect(isDevErrorCode('')).toBe(false);
    });
  });

  describe('getAllDevErrorCodes', () => {
    it('should return all defined codes', () => {
      const codes = getAllDevErrorCodes();
      expect(codes).toContain('DEV-001');
      expect(codes).toContain('DEV-020');
      expect(codes.length).toBe(Object.keys(DEV_ERROR_CODES).length);
    });
  });
});
