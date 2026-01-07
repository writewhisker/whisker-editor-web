/**
 * Security Module
 *
 * Provides CSP generation and cryptographic utilities for safe story execution.
 */

export {
  CSPGenerator,
  createCSPGenerator,
  DEFAULT_CSP_CONFIG,
  PERMISSIVE_CSP_CONFIG,
  SANDBOX_OPTIONS,
  type CSPConfig,
} from './CSPGenerator';

export {
  sha256,
  sha256Hex,
  sha256Base64,
  sha384Hex,
  sha512Hex,
  hash,
  hmacSha256,
  hmacSha256Hex,
  hmacSha256Base64,
  verifyHash,
  verifyHmac,
  generateKey,
  generateSRI,
  verifySRI,
  type HashAlgorithm,
  type OutputEncoding,
  type HashOptions,
} from './crypto';
