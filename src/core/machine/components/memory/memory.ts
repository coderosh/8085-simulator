import { higherByte, lowerByte } from "@core/utils";
import type { MemorySnapshot } from "./types";

const DEFAULT_MEMORY_SIZE = 0x10000;

export class Memory {
  private data: Uint8Array;

  constructor(size = DEFAULT_MEMORY_SIZE) {
    this.data = new Uint8Array(size);
  }

  get size(): number {
    return this.data.length;
  }

  reset(): void {
    this.data.fill(0);
  }

  readByte(address: number): number {
    return this.data[this.normalizeAddress(address)];
  }

  writeByte(address: number, value: number): void {
    this.data[this.normalizeAddress(address)] = lowerByte(value);
  }

  readWord(address: number): number {
    const low = this.readByte(address);
    const high = this.readByte(address + 1);

    return (high << 8) | low;
  }

  writeWord(address: number, value: number): void {
    this.writeByte(address, lowerByte(value));
    this.writeByte(address + 1, higherByte(value));
  }

  load(bytes: ArrayLike<number>, startAddress = 0): void {
    for (let offset = 0; offset < bytes.length; offset++) {
      this.writeByte(startAddress + offset, bytes[offset]);
    }
  }

  snapshot(): MemorySnapshot {
    return {
      size: this.size,
      data: new Uint8Array(this.data),
    };
  }

  private normalizeAddress(address: number): number {
    return address & 0xffff;
  }
}
