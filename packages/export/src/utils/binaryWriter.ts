/**
 * Binary Writer Utility
 *
 * Provides utilities for writing binary data in the Whisker compact format.
 * Handles endianness, string encoding, and buffer management.
 */

/**
 * Binary writer for creating compact format files
 */
export class BinaryWriter {
  private buffer: Uint8Array;
  private view: DataView;
  private position: number = 0;
  private textEncoder: TextEncoder;

  constructor(initialSize: number = 4096) {
    this.buffer = new Uint8Array(initialSize);
    this.view = new DataView(this.buffer.buffer);
    this.textEncoder = new TextEncoder();
  }

  /**
   * Ensure buffer has capacity for additional bytes
   */
  private ensureCapacity(additional: number): void {
    const required = this.position + additional;

    if (required <= this.buffer.length) {
      return;
    }

    // Double the buffer size until it fits
    let newSize = this.buffer.length * 2;
    while (newSize < required) {
      newSize *= 2;
    }

    const newBuffer = new Uint8Array(newSize);
    newBuffer.set(this.buffer);
    this.buffer = newBuffer;
    this.view = new DataView(this.buffer.buffer);
  }

  /**
   * Write a single byte (uint8)
   */
  writeUint8(value: number): void {
    this.ensureCapacity(1);
    this.view.setUint8(this.position, value);
    this.position += 1;
  }

  /**
   * Write an unsigned 16-bit integer (little-endian)
   */
  writeUint16(value: number): void {
    this.ensureCapacity(2);
    this.view.setUint16(this.position, value, true);
    this.position += 2;
  }

  /**
   * Write an unsigned 32-bit integer (little-endian)
   */
  writeUint32(value: number): void {
    this.ensureCapacity(4);
    this.view.setUint32(this.position, value, true);
    this.position += 4;
  }

  /**
   * Write a signed 16-bit integer (little-endian)
   */
  writeInt16(value: number): void {
    this.ensureCapacity(2);
    this.view.setInt16(this.position, value, true);
    this.position += 2;
  }

  /**
   * Write a signed 32-bit integer (little-endian)
   */
  writeInt32(value: number): void {
    this.ensureCapacity(4);
    this.view.setInt32(this.position, value, true);
    this.position += 4;
  }

  /**
   * Write a 32-bit floating point number (little-endian)
   */
  writeFloat32(value: number): void {
    this.ensureCapacity(4);
    this.view.setFloat32(this.position, value, true);
    this.position += 4;
  }

  /**
   * Write a 64-bit floating point number (little-endian)
   */
  writeFloat64(value: number): void {
    this.ensureCapacity(8);
    this.view.setFloat64(this.position, value, true);
    this.position += 8;
  }

  /**
   * Write raw bytes
   */
  writeBytes(bytes: Uint8Array): void {
    this.ensureCapacity(bytes.length);
    this.buffer.set(bytes, this.position);
    this.position += bytes.length;
  }

  /**
   * Write a length-prefixed string (uint16 length + UTF-8 bytes)
   */
  writeString(str: string): void {
    const encoded = this.textEncoder.encode(str);

    if (encoded.length > 65535) {
      throw new Error(`String too long for uint16 length prefix: ${encoded.length} bytes`);
    }

    this.writeUint16(encoded.length);
    this.writeBytes(encoded);
  }

  /**
   * Write a length-prefixed string with uint32 length (for long strings)
   */
  writeLongString(str: string): void {
    const encoded = this.textEncoder.encode(str);
    this.writeUint32(encoded.length);
    this.writeBytes(encoded);
  }

  /**
   * Write a null-terminated string
   */
  writeCString(str: string): void {
    const encoded = this.textEncoder.encode(str);
    this.writeBytes(encoded);
    this.writeUint8(0);
  }

  /**
   * Write a boolean as a single byte
   */
  writeBoolean(value: boolean): void {
    this.writeUint8(value ? 1 : 0);
  }

  /**
   * Write a variable-length integer (varint)
   * Uses 7 bits per byte, MSB indicates continuation
   */
  writeVarint(value: number): void {
    if (value < 0) {
      throw new Error('Varint does not support negative numbers');
    }

    while (value >= 0x80) {
      this.writeUint8((value & 0x7f) | 0x80);
      value >>>= 7;
    }
    this.writeUint8(value);
  }

  /**
   * Get current write position
   */
  getPosition(): number {
    return this.position;
  }

  /**
   * Set write position (for patching)
   */
  setPosition(position: number): void {
    if (position < 0 || position > this.buffer.length) {
      throw new Error(`Invalid position: ${position}`);
    }
    this.position = position;
  }

  /**
   * Write at a specific position without advancing
   */
  writeUint32At(position: number, value: number): void {
    this.view.setUint32(position, value, true);
  }

  /**
   * Get the final buffer (trimmed to actual size)
   */
  getBuffer(): Uint8Array {
    return this.buffer.slice(0, this.position);
  }

  /**
   * Get the buffer as an ArrayBuffer
   */
  getArrayBuffer(): ArrayBuffer {
    return this.getBuffer().buffer.slice(0, this.position);
  }

  /**
   * Reset the writer
   */
  reset(): void {
    this.position = 0;
  }
}

/**
 * Factory function to create a BinaryWriter
 */
export function createBinaryWriter(initialSize?: number): BinaryWriter {
  return new BinaryWriter(initialSize);
}
