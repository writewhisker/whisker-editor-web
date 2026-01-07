/**
 * Binary Reader Utility
 *
 * Provides utilities for reading binary data in the Whisker compact format.
 * Handles endianness, string decoding, and buffer navigation.
 */

/**
 * Binary reader for parsing compact format files
 */
export class BinaryReader {
  private buffer: Uint8Array;
  private view: DataView;
  private position: number = 0;
  private textDecoder: TextDecoder;

  constructor(buffer: Uint8Array | ArrayBuffer) {
    if (buffer instanceof ArrayBuffer) {
      this.buffer = new Uint8Array(buffer);
    } else {
      this.buffer = buffer;
    }
    this.view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
    this.textDecoder = new TextDecoder('utf-8');
  }

  /**
   * Check if there are more bytes to read
   */
  hasMore(): boolean {
    return this.position < this.buffer.length;
  }

  /**
   * Get remaining bytes count
   */
  remaining(): number {
    return this.buffer.length - this.position;
  }

  /**
   * Ensure enough bytes are available
   */
  private ensureAvailable(count: number): void {
    if (this.position + count > this.buffer.length) {
      throw new Error(
        `Unexpected end of data: need ${count} bytes at position ${this.position}, ` +
        `but only ${this.remaining()} bytes remaining`
      );
    }
  }

  /**
   * Read a single byte (uint8)
   */
  readUint8(): number {
    this.ensureAvailable(1);
    const value = this.view.getUint8(this.position);
    this.position += 1;
    return value;
  }

  /**
   * Read an unsigned 16-bit integer (little-endian)
   */
  readUint16(): number {
    this.ensureAvailable(2);
    const value = this.view.getUint16(this.position, true);
    this.position += 2;
    return value;
  }

  /**
   * Read an unsigned 32-bit integer (little-endian)
   */
  readUint32(): number {
    this.ensureAvailable(4);
    const value = this.view.getUint32(this.position, true);
    this.position += 4;
    return value;
  }

  /**
   * Read a signed 16-bit integer (little-endian)
   */
  readInt16(): number {
    this.ensureAvailable(2);
    const value = this.view.getInt16(this.position, true);
    this.position += 2;
    return value;
  }

  /**
   * Read a signed 32-bit integer (little-endian)
   */
  readInt32(): number {
    this.ensureAvailable(4);
    const value = this.view.getInt32(this.position, true);
    this.position += 4;
    return value;
  }

  /**
   * Read a 32-bit floating point number (little-endian)
   */
  readFloat32(): number {
    this.ensureAvailable(4);
    const value = this.view.getFloat32(this.position, true);
    this.position += 4;
    return value;
  }

  /**
   * Read a 64-bit floating point number (little-endian)
   */
  readFloat64(): number {
    this.ensureAvailable(8);
    const value = this.view.getFloat64(this.position, true);
    this.position += 8;
    return value;
  }

  /**
   * Read raw bytes
   */
  readBytes(count: number): Uint8Array {
    this.ensureAvailable(count);
    const bytes = this.buffer.slice(this.position, this.position + count);
    this.position += count;
    return bytes;
  }

  /**
   * Read a length-prefixed string (uint16 length + UTF-8 bytes)
   */
  readString(): string {
    const length = this.readUint16();
    const bytes = this.readBytes(length);
    return this.textDecoder.decode(bytes);
  }

  /**
   * Read a length-prefixed string with uint32 length (for long strings)
   */
  readLongString(): string {
    const length = this.readUint32();
    const bytes = this.readBytes(length);
    return this.textDecoder.decode(bytes);
  }

  /**
   * Read a null-terminated string
   */
  readCString(): string {
    const start = this.position;
    let end = this.position;

    while (end < this.buffer.length && this.buffer[end] !== 0) {
      end++;
    }

    if (end >= this.buffer.length) {
      throw new Error('Null terminator not found for C string');
    }

    const bytes = this.buffer.slice(start, end);
    this.position = end + 1; // Skip the null terminator

    return this.textDecoder.decode(bytes);
  }

  /**
   * Read a boolean as a single byte
   */
  readBoolean(): boolean {
    return this.readUint8() !== 0;
  }

  /**
   * Read a variable-length integer (varint)
   */
  readVarint(): number {
    let value = 0;
    let shift = 0;

    while (true) {
      const byte = this.readUint8();
      value |= (byte & 0x7f) << shift;

      if ((byte & 0x80) === 0) {
        break;
      }

      shift += 7;

      if (shift > 35) {
        throw new Error('Varint too long');
      }
    }

    return value >>> 0; // Convert to unsigned
  }

  /**
   * Get current read position
   */
  getPosition(): number {
    return this.position;
  }

  /**
   * Set read position
   */
  setPosition(position: number): void {
    if (position < 0 || position > this.buffer.length) {
      throw new Error(`Invalid position: ${position}`);
    }
    this.position = position;
  }

  /**
   * Skip bytes
   */
  skip(count: number): void {
    this.ensureAvailable(count);
    this.position += count;
  }

  /**
   * Peek at the next byte without advancing
   */
  peekUint8(): number {
    this.ensureAvailable(1);
    return this.view.getUint8(this.position);
  }

  /**
   * Peek at the next uint16 without advancing
   */
  peekUint16(): number {
    this.ensureAvailable(2);
    return this.view.getUint16(this.position, true);
  }

  /**
   * Peek at the next uint32 without advancing
   */
  peekUint32(): number {
    this.ensureAvailable(4);
    return this.view.getUint32(this.position, true);
  }

  /**
   * Get total buffer length
   */
  getLength(): number {
    return this.buffer.length;
  }

  /**
   * Reset to beginning
   */
  reset(): void {
    this.position = 0;
  }
}

/**
 * Factory function to create a BinaryReader
 */
export function createBinaryReader(buffer: Uint8Array | ArrayBuffer): BinaryReader {
  return new BinaryReader(buffer);
}
