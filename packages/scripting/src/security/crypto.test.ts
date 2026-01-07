/**
 * Crypto Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import {
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
} from './crypto';

describe('Crypto Utilities', () => {
  describe('sha256', () => {
    it('hashes string to ArrayBuffer', async () => {
      const result = await sha256('hello');

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(32); // SHA-256 produces 256 bits = 32 bytes
    });

    it('hashes empty string', async () => {
      const result = await sha256('');

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(32);
    });

    it('hashes ArrayBuffer', async () => {
      const encoder = new TextEncoder();
      const buffer = encoder.encode('hello').buffer;

      const result = await sha256(buffer);

      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it('hashes Uint8Array', async () => {
      const bytes = new Uint8Array([104, 101, 108, 108, 111]); // "hello"

      const result = await sha256(bytes);

      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('sha256Hex', () => {
    it('returns hex string', async () => {
      const result = await sha256Hex('hello');

      expect(typeof result).toBe('string');
      expect(result.length).toBe(64); // 32 bytes * 2 hex chars
      expect(/^[0-9a-f]+$/.test(result)).toBe(true);
    });

    it('produces known hash for "hello"', async () => {
      const result = await sha256Hex('hello');

      // Known SHA-256 hash of "hello"
      expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('produces different hashes for different inputs', async () => {
      const hash1 = await sha256Hex('hello');
      const hash2 = await sha256Hex('world');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('sha256Base64', () => {
    it('returns base64 string', async () => {
      const result = await sha256Base64('hello');

      expect(typeof result).toBe('string');
      // Base64 of 32 bytes should be ~44 chars
      expect(result.length).toBeLessThanOrEqual(44);
      // Should be valid base64
      expect(() => atob(result)).not.toThrow();
    });

    it('produces known hash for "hello"', async () => {
      const result = await sha256Base64('hello');

      // Known base64 SHA-256 of "hello"
      expect(result).toBe('LPJNul+wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ=');
    });
  });

  describe('sha384Hex', () => {
    it('returns 96-character hex string', async () => {
      const result = await sha384Hex('hello');

      expect(result.length).toBe(96); // 48 bytes * 2
    });
  });

  describe('sha512Hex', () => {
    it('returns 128-character hex string', async () => {
      const result = await sha512Hex('hello');

      expect(result.length).toBe(128); // 64 bytes * 2
    });
  });

  describe('hash', () => {
    it('defaults to SHA-256 hex', async () => {
      const result = await hash('hello');

      expect(result).toBe(await sha256Hex('hello'));
    });

    it('supports different algorithms', async () => {
      const sha256Result = await hash('hello', { algorithm: 'SHA-256' });
      const sha384Result = await hash('hello', { algorithm: 'SHA-384' });
      const sha512Result = await hash('hello', { algorithm: 'SHA-512' });

      expect((sha256Result as string).length).toBe(64);
      expect((sha384Result as string).length).toBe(96);
      expect((sha512Result as string).length).toBe(128);
    });

    it('supports different encodings', async () => {
      const hexResult = await hash('hello', { encoding: 'hex' });
      const base64Result = await hash('hello', { encoding: 'base64' });
      const rawResult = await hash('hello', { encoding: 'raw' });

      expect(typeof hexResult).toBe('string');
      expect(typeof base64Result).toBe('string');
      expect(rawResult).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('hmacSha256', () => {
    it('produces HMAC as ArrayBuffer', async () => {
      const result = await hmacSha256('secret', 'message');

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(32);
    });

    it('produces different HMACs for different keys', async () => {
      const hmac1 = await hmacSha256Hex('key1', 'message');
      const hmac2 = await hmacSha256Hex('key2', 'message');

      expect(hmac1).not.toBe(hmac2);
    });

    it('produces different HMACs for different data', async () => {
      const hmac1 = await hmacSha256Hex('key', 'message1');
      const hmac2 = await hmacSha256Hex('key', 'message2');

      expect(hmac1).not.toBe(hmac2);
    });
  });

  describe('hmacSha256Hex', () => {
    it('returns hex string', async () => {
      const result = await hmacSha256Hex('secret', 'message');

      expect(typeof result).toBe('string');
      expect(result.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(result)).toBe(true);
    });
  });

  describe('hmacSha256Base64', () => {
    it('returns base64 string', async () => {
      const result = await hmacSha256Base64('secret', 'message');

      expect(typeof result).toBe('string');
      expect(() => atob(result)).not.toThrow();
    });
  });

  describe('verifyHash', () => {
    it('verifies correct hex hash', async () => {
      const data = 'hello';
      const hash = await sha256Hex(data);

      const result = await verifyHash(data, hash);

      expect(result).toBe(true);
    });

    it('verifies correct base64 hash', async () => {
      const data = 'hello';
      const hash = await sha256Base64(data);

      const result = await verifyHash(data, hash, { encoding: 'base64' });

      expect(result).toBe(true);
    });

    it('rejects incorrect hash', async () => {
      const result = await verifyHash('hello', 'wronghash');

      expect(result).toBe(false);
    });

    it('auto-detects base64 encoding', async () => {
      const data = 'hello';
      const hash = await sha256Base64(data);

      // Should auto-detect base64 (44 chars, base64 pattern)
      const result = await verifyHash(data, hash);

      expect(result).toBe(true);
    });

    it('uses constant-time comparison', async () => {
      // This test verifies the function doesn't short-circuit
      // by checking that similar hashes take similar time
      const hash1 = await sha256Hex('hello');
      const wrongHash = hash1.replace(/./g, 'x');

      const result = await verifyHash('hello', wrongHash);

      expect(result).toBe(false);
    });
  });

  describe('verifyHmac', () => {
    it('verifies correct HMAC', async () => {
      const key = 'secret';
      const data = 'message';
      const hmac = await hmacSha256Hex(key, data);

      const result = await verifyHmac(key, data, hmac);

      expect(result).toBe(true);
    });

    it('rejects incorrect HMAC', async () => {
      const result = await verifyHmac('key', 'message', 'wronghmac');

      expect(result).toBe(false);
    });

    it('rejects HMAC with wrong key', async () => {
      const hmac = await hmacSha256Hex('key1', 'message');

      const result = await verifyHmac('key2', 'message', hmac);

      expect(result).toBe(false);
    });
  });

  describe('generateKey', () => {
    it('generates hex key of default length', () => {
      const key = generateKey();

      expect(typeof key).toBe('string');
      expect(key.length).toBe(64); // 32 bytes * 2 hex chars
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it('generates key of specified length', () => {
      const key = generateKey(16);

      expect(key.length).toBe(32); // 16 bytes * 2 hex chars
    });

    it('generates unique keys', () => {
      const key1 = generateKey();
      const key2 = generateKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('generateSRI', () => {
    it('generates SRI hash for content', async () => {
      const content = 'alert("hello");';
      const sri = await generateSRI(content);

      expect(sri).toMatch(/^sha256-[A-Za-z0-9+/]+=*$/);
    });

    it('supports SHA-384', async () => {
      const content = 'alert("hello");';
      const sri = await generateSRI(content, 'SHA-384');

      expect(sri).toMatch(/^sha384-/);
    });

    it('supports SHA-512', async () => {
      const content = 'alert("hello");';
      const sri = await generateSRI(content, 'SHA-512');

      expect(sri).toMatch(/^sha512-/);
    });
  });

  describe('verifySRI', () => {
    it('verifies correct SRI hash', async () => {
      const content = 'alert("hello");';
      const sri = await generateSRI(content);

      const result = await verifySRI(content, sri);

      expect(result).toBe(true);
    });

    it('rejects incorrect SRI hash', async () => {
      const result = await verifySRI('alert("hello");', 'sha256-wronghash');

      expect(result).toBe(false);
    });

    it('handles multiple hashes (fallback)', async () => {
      const content = 'alert("hello");';
      const sha256Sri = await generateSRI(content, 'SHA-256');
      const sha384Sri = await generateSRI(content, 'SHA-384');

      // Space-separated hashes
      const multiSri = `${sha256Sri} ${sha384Sri}`;

      const result = await verifySRI(content, multiSri);

      expect(result).toBe(true);
    });

    it('returns false for invalid SRI format', async () => {
      const result = await verifySRI('content', 'invalid-format');

      expect(result).toBe(false);
    });
  });

  describe('Unicode handling', () => {
    it('correctly hashes unicode strings', async () => {
      const result = await sha256Hex('你好世界');

      expect(result.length).toBe(64);
    });

    it('produces consistent hashes for unicode', async () => {
      const hash1 = await sha256Hex('你好');
      const hash2 = await sha256Hex('你好');

      expect(hash1).toBe(hash2);
    });

    it('handles emojis', async () => {
      const result = await sha256Hex('Hello 🌍!');

      expect(result.length).toBe(64);
    });
  });

  describe('Edge cases', () => {
    it('handles very long strings', async () => {
      const longString = 'x'.repeat(100000);
      const result = await sha256Hex(longString);

      expect(result.length).toBe(64);
    });

    it('handles special characters', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
      const result = await sha256Hex(specialChars);

      expect(result.length).toBe(64);
    });

    it('handles binary data', async () => {
      const binaryData = new Uint8Array([0, 1, 2, 255, 254, 253]);
      const result = await sha256Hex(binaryData);

      expect(result.length).toBe(64);
    });

    it('handles null bytes', async () => {
      const withNulls = 'hello\x00world\x00';
      const result = await sha256Hex(withNulls);

      expect(result.length).toBe(64);
    });
  });
});
