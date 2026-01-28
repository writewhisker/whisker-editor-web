/**
 * Developer Experience Errors (GAP-052)
 * DEV error codes for tooling and IDE integration issues
 * Per WLS specification (val-016)
 */

/**
 * Developer Experience Error Codes (DEV-001 to DEV-099)
 */
export const DEV_ERROR_CODES = {
  // LSP Errors (001-010)
  LSP_CONNECTION_FAILED: 'DEV-001',
  LSP_CAPABILITY_UNSUPPORTED: 'DEV-002',
  LSP_DOCUMENT_NOT_FOUND: 'DEV-003',
  LSP_INVALID_POSITION: 'DEV-004',
  LSP_TIMEOUT: 'DEV-005',

  // DAP Errors (006-015)
  DAP_CONNECTION_FAILED: 'DEV-006',
  DAP_BREAKPOINT_INVALID: 'DEV-007',
  DAP_LAUNCH_FAILED: 'DEV-008',
  DAP_ATTACH_FAILED: 'DEV-009',
  DAP_VARIABLE_NOT_FOUND: 'DEV-010',

  // Configuration Errors (011-020)
  CONFIG_INVALID: 'DEV-011',
  CONFIG_NOT_FOUND: 'DEV-012',
  CONFIG_PARSE_ERROR: 'DEV-013',
  WORKSPACE_INVALID: 'DEV-014',
  EXTENSION_LOAD_FAILED: 'DEV-015',

  // IDE Feature Errors (016-030)
  SEMANTIC_TOKEN_ERROR: 'DEV-016',
  CODE_ACTION_FAILED: 'DEV-017',
  RENAME_CONFLICT: 'DEV-018',
  REFACTOR_UNSAFE: 'DEV-019',
  INDEX_CORRUPTION: 'DEV-020',
} as const;

export type DevErrorCode = typeof DEV_ERROR_CODES[keyof typeof DEV_ERROR_CODES];

/**
 * DEV Error severity levels
 */
export type DevErrorSeverity = 'error' | 'warning' | 'info';

/**
 * DEV Error interface
 */
export interface DevError {
  code: DevErrorCode;
  message: string;
  severity: DevErrorSeverity;
  details?: Record<string, unknown>;
  timestamp: number;
  recoverable: boolean;
}

/**
 * DEV Error messages with placeholder support
 */
export const DEV_ERROR_MESSAGES: Record<DevErrorCode, string> = {
  'DEV-001': 'Language server connection failed: {reason}',
  'DEV-002': 'Requested LSP capability "{capability}" is not supported',
  'DEV-003': 'Document "{uri}" not found in workspace',
  'DEV-004': 'Invalid text position: line {line}, character {character}',
  'DEV-005': 'LSP request "{method}" timed out after {timeout}ms',
  'DEV-006': 'Debug adapter connection failed: {reason}',
  'DEV-007': 'Breakpoint at {location} is invalid: {reason}',
  'DEV-008': 'Debug launch failed: {reason}',
  'DEV-009': 'Debug attach to process {pid} failed: {reason}',
  'DEV-010': 'Variable "{name}" not found in current scope',
  'DEV-011': 'Invalid configuration: {path} - {reason}',
  'DEV-012': 'Configuration file not found: {path}',
  'DEV-013': 'Configuration parse error at {path}: {error}',
  'DEV-014': 'Invalid workspace structure: {reason}',
  'DEV-015': 'Extension "{name}" failed to load: {reason}',
  'DEV-016': 'Semantic token provider error: {reason}',
  'DEV-017': 'Code action "{action}" failed: {reason}',
  'DEV-018': 'Rename to "{newName}" would conflict with existing {type}',
  'DEV-019': 'Refactoring may be unsafe: {reason}',
  'DEV-020': 'Internal index corrupted, rebuilding required',
};

/**
 * Create a DEV error with formatted message
 */
export function createDevError(
  code: DevErrorCode,
  params: Record<string, string | number> = {},
  options: {
    severity?: DevErrorSeverity;
    recoverable?: boolean;
    details?: Record<string, unknown>;
  } = {}
): DevError {
  let message = DEV_ERROR_MESSAGES[code] || `Unknown DEV error: ${code}`;

  // Replace placeholders
  for (const [key, value] of Object.entries(params)) {
    message = message.replace(`{${key}}`, String(value));
  }

  return {
    code,
    message,
    severity: options.severity || 'error',
    timestamp: Date.now(),
    recoverable: options.recoverable ?? false,
    details: options.details,
  };
}

/**
 * DevError factory for common errors
 */
export const DevErrors = {
  // LSP Errors
  lspConnectionFailed(reason: string): DevError {
    return createDevError(DEV_ERROR_CODES.LSP_CONNECTION_FAILED, { reason });
  },

  lspCapabilityUnsupported(capability: string): DevError {
    return createDevError(DEV_ERROR_CODES.LSP_CAPABILITY_UNSUPPORTED, { capability }, {
      severity: 'warning',
      recoverable: true,
    });
  },

  lspDocumentNotFound(uri: string): DevError {
    return createDevError(DEV_ERROR_CODES.LSP_DOCUMENT_NOT_FOUND, { uri });
  },

  lspInvalidPosition(line: number, character: number): DevError {
    return createDevError(DEV_ERROR_CODES.LSP_INVALID_POSITION, { line, character });
  },

  lspTimeout(method: string, timeout: number): DevError {
    return createDevError(DEV_ERROR_CODES.LSP_TIMEOUT, { method, timeout });
  },

  // DAP Errors
  dapConnectionFailed(reason: string): DevError {
    return createDevError(DEV_ERROR_CODES.DAP_CONNECTION_FAILED, { reason });
  },

  dapBreakpointInvalid(location: string, reason: string): DevError {
    return createDevError(DEV_ERROR_CODES.DAP_BREAKPOINT_INVALID, { location, reason }, {
      severity: 'warning',
      recoverable: true,
    });
  },

  dapLaunchFailed(reason: string): DevError {
    return createDevError(DEV_ERROR_CODES.DAP_LAUNCH_FAILED, { reason });
  },

  dapAttachFailed(pid: number, reason: string): DevError {
    return createDevError(DEV_ERROR_CODES.DAP_ATTACH_FAILED, { pid, reason });
  },

  dapVariableNotFound(name: string): DevError {
    return createDevError(DEV_ERROR_CODES.DAP_VARIABLE_NOT_FOUND, { name }, {
      severity: 'warning',
      recoverable: true,
    });
  },

  // Configuration Errors
  configInvalid(path: string, reason: string): DevError {
    return createDevError(DEV_ERROR_CODES.CONFIG_INVALID, { path, reason });
  },

  configNotFound(path: string): DevError {
    return createDevError(DEV_ERROR_CODES.CONFIG_NOT_FOUND, { path });
  },

  configParseError(path: string, error: string): DevError {
    return createDevError(DEV_ERROR_CODES.CONFIG_PARSE_ERROR, { path, error });
  },

  workspaceInvalid(reason: string): DevError {
    return createDevError(DEV_ERROR_CODES.WORKSPACE_INVALID, { reason });
  },

  extensionLoadFailed(name: string, reason: string): DevError {
    return createDevError(DEV_ERROR_CODES.EXTENSION_LOAD_FAILED, { name, reason });
  },

  // IDE Feature Errors
  semanticTokenError(reason: string): DevError {
    return createDevError(DEV_ERROR_CODES.SEMANTIC_TOKEN_ERROR, { reason }, {
      severity: 'warning',
      recoverable: true,
    });
  },

  codeActionFailed(action: string, reason: string): DevError {
    return createDevError(DEV_ERROR_CODES.CODE_ACTION_FAILED, { action, reason });
  },

  renameConflict(newName: string, type: string): DevError {
    return createDevError(DEV_ERROR_CODES.RENAME_CONFLICT, { newName, type });
  },

  refactorUnsafe(reason: string): DevError {
    return createDevError(DEV_ERROR_CODES.REFACTOR_UNSAFE, { reason }, {
      severity: 'warning',
    });
  },

  indexCorruption(): DevError {
    return createDevError(DEV_ERROR_CODES.INDEX_CORRUPTION, {});
  },
};

/**
 * Check if error is recoverable
 */
export function isRecoverable(error: DevError): boolean {
  return error.recoverable;
}

/**
 * Format DEV error for display
 */
export function formatDevError(error: DevError): string {
  const prefix = error.severity === 'error' ? 'Error' :
                 error.severity === 'warning' ? 'Warning' : 'Info';
  return `[${error.code}] ${prefix}: ${error.message}`;
}

/**
 * Check if a code is a valid DEV error code
 */
export function isDevErrorCode(code: string): code is DevErrorCode {
  return Object.values(DEV_ERROR_CODES).includes(code as DevErrorCode);
}

/**
 * Get all DEV error codes
 */
export function getAllDevErrorCodes(): DevErrorCode[] {
  return Object.values(DEV_ERROR_CODES);
}
