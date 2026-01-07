/**
 * BinaryReader Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BinaryReader, createBinaryReader } from './binaryReader';

describe('BinaryReader', () => {
  describe('integer reading', () => {
    it('reads uint8', () => {
      const buffer = new Uint8Array([255]);
      const reader = createBinaryReader(buffer);

      expect(reader.readUint8()).toBe(255);
    });

    it('reads uint16 (little-endian)', () => {
      const buffer = new Uint8Array([0x34, 0x12]);
      const reader = createBinaryReader(buffer);

      expect(reader.readUint16()).toBe(0x1234);
    });

    it('reads uint32 (little-endian)', () => {
      const buffer = new Uint8Array([0x78, 0x56, 0x34, 0x12]);
      const reader = createBinaryReader(buffer);

      expect(reader.readUint32()).toBe(0x12345678);
    });

    it('reads int16', () => {
      const buffer = new ArrayBuffer(2);
      const view = new DataView(buffer);
      view.setInt16(0, -1000, true);

      const reader = createBinaryReader(buffer);
      expect(reader.readInt16()).toBe(-1000);
    });

    it('reads int32', () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setInt32(0, -100000, true);

      const reader = createBinaryReader(buffer);
      expect(reader.readInt32()).toBe(-100000);
    });
  });

  describe('float reading', () => {
    it('reads float32', () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setFloat32(0, 3.14, true);

      const reader = createBinaryReader(buffer);
      expect(reader.readFloat32()).toBeCloseTo(3.14, 5);
    });

    it('reads float64', () => {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setFloat64(0, 3.141592653589793, true);

      const reader = createBinaryReader(buffer);
      expect(reader.readFloat64()).toBeCloseTo(3.141592653589793, 14);
    });
  });

  describe('string reading', () => {
    it('reads length-prefixed string', () => {
      const encoder = new TextEncoder();
      const str = 'Hello';
      const encoded = encoder.encode(str);

      const buffer = new Uint8Array(2 + encoded.length);
      buffer[0] = encoded.length;
      buffer[1] = 0;
      buffer.set(encoded, 2);

      const reader = createBinaryReader(buffer);
      expect(reader.readString()).toBe('Hello');
    });

    it('reads empty string', () => {
      const buffer = new Uint8Array([0, 0]);
      const reader = createBinaryReader(buffer);

      expect(reader.readString()).toBe('');
    });

    it('reads unicode string', () => {
      const encoder = new TextEncoder();
      const str = '你好';
      const encoded = encoder.encode(str);

      const buffer = new Uint8Array(2 + encoded.length);
      buffer[0] = encoded.length;
      buffer[1] = 0;
      buffer.set(encoded, 2);

      const reader = createBinaryReader(buffer);
      expect(reader.readString()).toBe('你好');
    });

    it('reads long string with uint32 length', () => {
      const encoder = new TextEncoder();
      const str = 'x'.repeat(1000);
      const encoded = encoder.encode(str);

      const buffer = new Uint8Array(4 + encoded.length);
      const view = new DataView(buffer.buffer);
      view.setUint32(0, encoded.length, true);
      buffer.set(encoded, 4);

      const reader = createBinaryReader(buffer);
      expect(reader.readLongString()).toBe(str);
    });

    it('reads C string', () => {
      const encoder = new TextEncoder();
      const str = 'test';
      const encoded = encoder.encode(str);

      const buffer = new Uint8Array(encoded.length + 1);
      buffer.set(encoded);
      buffer[encoded.length] = 0; // Null terminator

      const reader = createBinaryReader(buffer);
      expect(reader.readCString()).toBe('test');
    });
  });

  describe('boolean reading', () => {
    it('reads 1 as true', () => {
      const buffer = new Uint8Array([1]);
      const reader = createBinaryReader(buffer);

      expect(reader.readBoolean()).toBe(true);
    });

    it('reads 0 as false', () => {
      const buffer = new Uint8Array([0]);
      const reader = createBinaryReader(buffer);

      expect(reader.readBoolean()).toBe(false);
    });

    it('reads non-zero as true', () => {
      const buffer = new Uint8Array([255]);
      const reader = createBinaryReader(buffer);

      expect(reader.readBoolean()).toBe(true);
    });
  });

  describe('varint reading', () => {
    it('reads 1-byte varint', () => {
      const buffer = new Uint8Array([127]);
      const reader = createBinaryReader(buffer);

      expect(reader.readVarint()).toBe(127);
    });

    it('reads 2-byte varint', () => {
      const buffer = new Uint8Array([0xac, 0x02]); // 300
      const reader = createBinaryReader(buffer);

      expect(reader.readVarint()).toBe(300);
    });

    it('reads 3-byte varint', () => {
      // 100000 = 0x186A0 = 10100000 11010100 00000110
      const buffer = new Uint8Array([0xa0, 0x8d, 0x06]);
      const reader = createBinaryReader(buffer);

      expect(reader.readVarint()).toBe(100000);
    });
  });

  describe('bytes reading', () => {
    it('reads raw bytes', () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]);
      const reader = createBinaryReader(buffer);

      const bytes = reader.readBytes(5);
      expect(Array.from(bytes)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('position and navigation', () => {
    it('hasMore returns true when bytes available', () => {
      const buffer = new Uint8Array([1, 2, 3]);
      const reader = createBinaryReader(buffer);

      expect(reader.hasMore()).toBe(true);
      reader.readBytes(3);
      expect(reader.hasMore()).toBe(false);
    });

    it('remaining returns bytes left', () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]);
      const reader = createBinaryReader(buffer);

      expect(reader.remaining()).toBe(5);
      reader.readUint16();
      expect(reader.remaining()).toBe(3);
    });

    it('getPosition returns current position', () => {
      const buffer = new Uint8Array([1, 2, 3, 4]);
      const reader = createBinaryReader(buffer);

      expect(reader.getPosition()).toBe(0);
      reader.readUint16();
      expect(reader.getPosition()).toBe(2);
    });

    it('setPosition changes position', () => {
      const buffer = new Uint8Array([1, 2, 3, 4]);
      const reader = createBinaryReader(buffer);

      reader.readUint16();
      reader.setPosition(0);
      expect(reader.readUint8()).toBe(1);
    });

    it('skip advances position', () => {
      const buffer = new Uint8Array([1, 2, 3, 4]);
      const reader = createBinaryReader(buffer);

      reader.skip(2);
      expect(reader.readUint8()).toBe(3);
    });

    it('reset returns to beginning', () => {
      const buffer = new Uint8Array([1, 2, 3, 4]);
      const reader = createBinaryReader(buffer);

      reader.readBytes(4);
      reader.reset();
      expect(reader.getPosition()).toBe(0);
    });

    it('getLength returns buffer length', () => {
      const buffer = new Uint8Array([1, 2, 3, 4, 5]);
      const reader = createBinaryReader(buffer);

      expect(reader.getLength()).toBe(5);
    });
  });

  describe('peek methods', () => {
    it('peekUint8 reads without advancing', () => {
      const buffer = new Uint8Array([42, 0]);
      const reader = createBinaryReader(buffer);

      expect(reader.peekUint8()).toBe(42);
      expect(reader.getPosition()).toBe(0);
    });

    it('peekUint16 reads without advancing', () => {
      const buffer = new Uint8Array([0x34, 0x12]);
      const reader = createBinaryReader(buffer);

      expect(reader.peekUint16()).toBe(0x1234);
      expect(reader.getPosition()).toBe(0);
    });

    it('peekUint32 reads without advancing', () => {
      const buffer = new Uint8Array([0x78, 0x56, 0x34, 0x12]);
      const reader = createBinaryReader(buffer);

      expect(reader.peekUint32()).toBe(0x12345678);
      expect(reader.getPosition()).toBe(0);
    });
  });

  describe('errors', () => {
    it('throws on reading past end', () => {
      const buffer = new Uint8Array([1]);
      const reader = createBinaryReader(buffer);

      expect(() => reader.readUint32()).toThrow('Unexpected end of data');
    });

    it('throws on skip past end', () => {
      const buffer = new Uint8Array([1, 2]);
      const reader = createBinaryReader(buffer);

      expect(() => reader.skip(10)).toThrow('Unexpected end of data');
    });

    it('throws on invalid position', () => {
      const buffer = new Uint8Array([1, 2, 3]);
      const reader = createBinaryReader(buffer);

      expect(() => reader.setPosition(-1)).toThrow('Invalid position');
      expect(() => reader.setPosition(10)).toThrow('Invalid position');
    });

    it('throws on missing null terminator', () => {
      const buffer = new Uint8Array([65, 66, 67]); // "ABC" without null
      const reader = createBinaryReader(buffer);

      expect(() => reader.readCString()).toThrow('Null terminator not found');
    });
  });

  describe('ArrayBuffer support', () => {
    it('accepts ArrayBuffer directly', () => {
      const arrayBuffer = new ArrayBuffer(4);
      const view = new DataView(arrayBuffer);
      view.setUint32(0, 12345, true);

      const reader = createBinaryReader(arrayBuffer);
      expect(reader.readUint32()).toBe(12345);
    });
  });
});
