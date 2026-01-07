/**
 * Cryptographic Utilities
 *
 * Provides SHA256 hashing and HMAC using the Web Crypto API.
 * Used for CSP script/style hashes and integrity verification.
 */

/**
 * Supported hash algorithms
 */
export type HashAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';

/**
 * Output encoding formats
 */
export type OutputEncoding = 'hex' | 'base64' | 'raw';

/**
 * Hash options
 */
export interface HashOptions {
  algorithm?: HashAlgorithm;
  encoding?: OutputEncoding;
}

/**
 * Convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert ArrayBuffer to base64 string
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert string or buffer to ArrayBuffer
 */
function toArrayBuffer(data: string | ArrayBuffer | Uint8Array): ArrayBuffer {
  if (data instanceof ArrayBuffer) {
    return data;
  }
  if (data instanceof Uint8Array) {
    // Copy to a new ArrayBuffer to ensure proper type
    const newBuffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(newBuffer).set(data);
    return newBuffer;
  }
  // String - encode as UTF-8
  const encoded = new TextEncoder().encode(data);
  const newBuffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(newBuffer).set(encoded);
  return newBuffer;
}

/**
 * Compute SHA-256 hash of data
 * @param data - String or buffer to hash
 * @returns Promise resolving to ArrayBuffer containing hash
 */
export async function sha256(data: string | ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
  const buffer = toArrayBuffer(data);
  return crypto.subtle.digest('SHA-256', buffer);
}

/**
 * Compute SHA-256 hash and return as hex string
 * @param data - String or buffer to hash
 * @returns Promise resolving to hex-encoded hash string
 */
export async function sha256Hex(data: string | ArrayBuffer | Uint8Array): Promise<string> {
  const hash = await sha256(data);
  return bufferToHex(hash);
}

/**
 * Compute SHA-256 hash and return as base64 string
 * @param data - String or buffer to hash
 * @returns Promise resolving to base64-encoded hash string
 */
export async function sha256Base64(data: string | ArrayBuffer | Uint8Array): Promise<string> {
  const hash = await sha256(data);
  return bufferToBase64(hash);
}

/**
 * Compute hash with configurable algorithm and encoding
 * @param data - String or buffer to hash
 * @param options - Hash options (algorithm and encoding)
 * @returns Promise resolving to hash in specified encoding
 */
export async function hash(
  data: string | ArrayBuffer | Uint8Array,
  options: HashOptions = {}
): Promise<string | ArrayBuffer> {
  const { algorithm = 'SHA-256', encoding = 'hex' } = options;

  const buffer = toArrayBuffer(data);
  const result = await crypto.subtle.digest(algorithm, buffer);

  switch (encoding) {
    case 'hex':
      return bufferToHex(result);
    case 'base64':
      return bufferToBase64(result);
    case 'raw':
      return result;
    default:
      return bufferToHex(result);
  }
}

/**
 * Compute HMAC-SHA256
 * @param key - Secret key as string or buffer
 * @param data - Data to authenticate
 * @returns Promise resolving to HMAC as ArrayBuffer
 */
export async function hmacSha256(
  key: string | ArrayBuffer | Uint8Array,
  data: string | ArrayBuffer | Uint8Array
): Promise<ArrayBuffer> {
  const keyBuffer = toArrayBuffer(key);
  const dataBuffer = toArrayBuffer(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  return crypto.subtle.sign('HMAC', cryptoKey, dataBuffer);
}

/**
 * Compute HMAC-SHA256 and return as hex string
 * @param key - Secret key
 * @param data - Data to authenticate
 * @returns Promise resolving to hex-encoded HMAC
 */
export async function hmacSha256Hex(
  key: string | ArrayBuffer | Uint8Array,
  data: string | ArrayBuffer | Uint8Array
): Promise<string> {
  const hmac = await hmacSha256(key, data);
  return bufferToHex(hmac);
}

/**
 * Compute HMAC-SHA256 and return as base64 string
 * @param key - Secret key
 * @param data - Data to authenticate
 * @returns Promise resolving to base64-encoded HMAC
 */
export async function hmacSha256Base64(
  key: string | ArrayBuffer | Uint8Array,
  data: string | ArrayBuffer | Uint8Array
): Promise<string> {
  const hmac = await hmacSha256(key, data);
  return bufferToBase64(hmac);
}

/**
 * Verify that data matches a given hash
 * @param data - Data to verify
 * @param expectedHash - Expected hash (hex or base64 encoded)
 * @param options - Hash options
 * @returns Promise resolving to true if hash matches
 */
export async function verifyHash(
  data: string | ArrayBuffer | Uint8Array,
  expectedHash: string,
  options: HashOptions = {}
): Promise<boolean> {
  // Detect encoding from expected hash format
  const isBase64 = /^[A-Za-z0-9+/]+=*$/.test(expectedHash) && expectedHash.length === 44;
  const encoding = options.encoding || (isBase64 ? 'base64' : 'hex');

  const computedHash = await hash(data, { ...options, encoding });

  // Constant-time comparison to prevent timing attacks
  if (typeof computedHash !== 'string') {
    return false;
  }

  if (computedHash.length !== expectedHash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Verify HMAC
 * @param key - Secret key
 * @param data - Data that was authenticated
 * @param expectedHmac - Expected HMAC (hex encoded)
 * @returns Promise resolving to true if HMAC matches
 */
export async function verifyHmac(
  key: string | ArrayBuffer | Uint8Array,
  data: string | ArrayBuffer | Uint8Array,
  expectedHmac: string
): Promise<boolean> {
  const computedHmac = await hmacSha256Hex(key, data);

  // Constant-time comparison
  if (computedHmac.length !== expectedHmac.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < computedHmac.length; i++) {
    result |= computedHmac.charCodeAt(i) ^ expectedHmac.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generate a random key for HMAC operations
 * @param length - Key length in bytes (default 32)
 * @returns Random key as hex string
 */
export function generateKey(length: number = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes.buffer);
}

/**
 * Generate a subresource integrity (SRI) hash
 * @param data - Script or stylesheet content
 * @param algorithm - Hash algorithm (default SHA-256)
 * @returns Promise resolving to SRI string (e.g., "sha256-...")
 */
export async function generateSRI(
  data: string | ArrayBuffer | Uint8Array,
  algorithm: HashAlgorithm = 'SHA-256'
): Promise<string> {
  const buffer = toArrayBuffer(data);
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  const base64Hash = bufferToBase64(hashBuffer);
  const prefix = algorithm.toLowerCase().replace('-', '');
  return `${prefix}-${base64Hash}`;
}

/**
 * Verify subresource integrity
 * @param data - Content to verify
 * @param integrity - SRI string (e.g., "sha256-...")
 * @returns Promise resolving to true if content matches integrity hash
 */
export async function verifySRI(
  data: string | ArrayBuffer | Uint8Array,
  integrity: string
): Promise<boolean> {
  // Parse SRI string - can have multiple hashes separated by spaces
  const hashes = integrity.split(/\s+/);

  for (const hash of hashes) {
    const match = hash.match(/^(sha256|sha384|sha512)-(.+)$/);
    if (!match) continue;

    const [, algorithmName, expectedBase64] = match;
    const algorithm = algorithmName.toUpperCase().replace('SHA', 'SHA-') as HashAlgorithm;

    const buffer = toArrayBuffer(data);
    const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
    const actualBase64 = bufferToBase64(hashBuffer);

    // Constant-time comparison
    if (actualBase64.length !== expectedBase64.length) {
      continue;
    }

    let result = 0;
    for (let i = 0; i < actualBase64.length; i++) {
      result |= actualBase64.charCodeAt(i) ^ expectedBase64.charCodeAt(i);
    }

    if (result === 0) {
      return true;
    }
  }

  return false;
}

/**
 * Compute SHA-384 hash and return as hex string
 */
export async function sha384Hex(data: string | ArrayBuffer | Uint8Array): Promise<string> {
  const buffer = toArrayBuffer(data);
  const hashBuffer = await crypto.subtle.digest('SHA-384', buffer);
  return bufferToHex(hashBuffer);
}

/**
 * Compute SHA-512 hash and return as hex string
 */
export async function sha512Hex(data: string | ArrayBuffer | Uint8Array): Promise<string> {
  const buffer = toArrayBuffer(data);
  const hashBuffer = await crypto.subtle.digest('SHA-512', buffer);
  return bufferToHex(hashBuffer);
}
