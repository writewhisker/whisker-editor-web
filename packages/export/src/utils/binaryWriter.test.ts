/**
 * BinaryWriter Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BinaryWriter, createBinaryWriter } from './binaryWriter';

describe('BinaryWriter', () => {
  let writer: BinaryWriter;

  beforeEach(() => {
    writer = createBinaryWriter();
  });

  describe('integer writing', () => {
    it('writes uint8', () => {
      writer.writeUint8(255);

      const buffer = writer.getBuffer();
      expect(buffer[0]).toBe(255);
      expect(buffer.length).toBe(1);
    });

    it('writes uint16 (little-endian)', () => {
      writer.writeUint16(0x1234);

      const buffer = writer.getBuffer();
      expect(buffer[0]).toBe(0x34); // Low byte first
      expect(buffer[1]).toBe(0x12);
    });

    it('writes uint32 (little-endian)', () => {
      writer.writeUint32(0x12345678);

      const buffer = writer.getBuffer();
      expect(buffer[0]).toBe(0x78);
      expect(buffer[1]).toBe(0x56);
      expect(buffer[2]).toBe(0x34);
      expect(buffer[3]).toBe(0x12);
    });

    it('writes int16', () => {
      writer.writeInt16(-1000);

      const view = new DataView(writer.getBuffer().buffer);
      expect(view.getInt16(0, true)).toBe(-1000);
    });

    it('writes int32', () => {
      writer.writeInt32(-100000);

      const view = new DataView(writer.getBuffer().buffer);
      expect(view.getInt32(0, true)).toBe(-100000);
    });
  });

  describe('float writing', () => {
    it('writes float32', () => {
      writer.writeFloat32(3.14);

      const view = new DataView(writer.getBuffer().buffer);
      expect(view.getFloat32(0, true)).toBeCloseTo(3.14, 5);
    });

    it('writes float64', () => {
      writer.writeFloat64(3.141592653589793);

      const view = new DataView(writer.getBuffer().buffer);
      expect(view.getFloat64(0, true)).toBeCloseTo(3.141592653589793, 14);
    });
  });

  describe('string writing', () => {
    it('writes length-prefixed string', () => {
      writer.writeString('Hello');

      const buffer = writer.getBuffer();
      // Length prefix (uint16)
      expect(buffer[0]).toBe(5);
      expect(buffer[1]).toBe(0);
      // UTF-8 bytes
      expect(String.fromCharCode(...buffer.slice(2))).toBe('Hello');
    });

    it('writes empty string', () => {
      writer.writeString('');

      const buffer = writer.getBuffer();
      expect(buffer[0]).toBe(0);
      expect(buffer[1]).toBe(0);
      expect(buffer.length).toBe(2);
    });

    it('writes unicode string', () => {
      writer.writeString('你好');

      const buffer = writer.getBuffer();
      const length = buffer[0] | (buffer[1] << 8);
      expect(length).toBe(6); // 3 bytes per Chinese character
    });

    it('writes long string with uint32 length', () => {
      const longStr = 'x'.repeat(100000);
      writer.writeLongString(longStr);

      const view = new DataView(writer.getBuffer().buffer);
      const length = view.getUint32(0, true);
      expect(length).toBe(100000);
    });

    it('writes C string', () => {
      writer.writeCString('test');

      const buffer = writer.getBuffer();
      expect(String.fromCharCode(...buffer.slice(0, 4))).toBe('test');
      expect(buffer[4]).toBe(0); // Null terminator
    });
  });

  describe('boolean writing', () => {
    it('writes true as 1', () => {
      writer.writeBoolean(true);

      expect(writer.getBuffer()[0]).toBe(1);
    });

    it('writes false as 0', () => {
      writer.writeBoolean(false);

      expect(writer.getBuffer()[0]).toBe(0);
    });
  });

  describe('varint writing', () => {
    it('writes small values in 1 byte', () => {
      writer.writeVarint(127);

      const buffer = writer.getBuffer();
      expect(buffer.length).toBe(1);
      expect(buffer[0]).toBe(127);
    });

    it('writes values 128-16383 in 2 bytes', () => {
      writer.writeVarint(300);

      const buffer = writer.getBuffer();
      expect(buffer.length).toBe(2);
      expect(buffer[0]).toBe(0xac); // 300 & 0x7f | 0x80
      expect(buffer[1]).toBe(0x02); // 300 >> 7
    });

    it('writes larger values correctly', () => {
      writer.writeVarint(100000);

      const buffer = writer.getBuffer();
      expect(buffer.length).toBe(3);
    });
  });

  describe('bytes writing', () => {
    it('writes raw bytes', () => {
      const bytes = new Uint8Array([1, 2, 3, 4, 5]);
      writer.writeBytes(bytes);

      const buffer = writer.getBuffer();
      expect(Array.from(buffer)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('buffer management', () => {
    it('auto-expands buffer', () => {
      const smallWriter = createBinaryWriter(16);

      // Write more than initial capacity
      for (let i = 0; i < 100; i++) {
        smallWriter.writeUint32(i);
      }

      expect(smallWriter.getBuffer().length).toBe(400);
    });

    it('getPosition returns current position', () => {
      expect(writer.getPosition()).toBe(0);

      writer.writeUint32(0);
      expect(writer.getPosition()).toBe(4);

      writer.writeString('test');
      expect(writer.getPosition()).toBe(10);
    });

    it('setPosition changes position', () => {
      writer.writeUint32(0);
      writer.writeUint32(0);

      writer.setPosition(0);
      writer.writeUint32(0x12345678);

      const view = new DataView(writer.getBuffer().buffer);
      expect(view.getUint32(0, true)).toBe(0x12345678);
    });

    it('writeUint32At patches without advancing', () => {
      writer.writeUint32(0); // Placeholder
      writer.writeUint32(0xAABBCCDD);

      writer.writeUint32At(0, 0x11223344);

      const view = new DataView(writer.getBuffer().buffer);
      expect(view.getUint32(0, true)).toBe(0x11223344);
      expect(view.getUint32(4, true)).toBe(0xAABBCCDD);
    });

    it('reset clears position', () => {
      writer.writeUint32(0x12345678);
      writer.reset();

      expect(writer.getPosition()).toBe(0);
    });

    it('getArrayBuffer returns ArrayBuffer', () => {
      writer.writeUint32(42);

      const arrayBuffer = writer.getArrayBuffer();
      expect(arrayBuffer).toBeInstanceOf(ArrayBuffer);
    });
  });

  describe('errors', () => {
    it('throws on string too long for uint16', () => {
      const longStr = 'x'.repeat(70000);

      expect(() => writer.writeString(longStr)).toThrow('too long');
    });

    it('throws on negative varint', () => {
      expect(() => writer.writeVarint(-1)).toThrow('negative');
    });

    it('throws on invalid position', () => {
      expect(() => writer.setPosition(-1)).toThrow('Invalid position');
    });
  });
});
