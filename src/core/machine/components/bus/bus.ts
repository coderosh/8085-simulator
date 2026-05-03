import { IO } from "../io";
import { Memory } from "../memory";
import type { BusSnapshot } from "./types";

export class Bus {
  private address = 0;
  private data = 0;
  private memory: Memory;
  private io: IO;

  constructor(memory = new Memory(), io = new IO()) {
    this.memory = memory;
    this.io = io;
  }

  reset(): void {
    this.address = 0;
    this.data = 0;
  }

  readByte(address: number): number {
    this.address = address & 0xffff;
    this.data = this.memory.readByte(this.address);

    return this.data;
  }

  writeByte(address: number, value: number): void {
    this.address = address & 0xffff;
    this.data = value & 0xff;
    this.memory.writeByte(this.address, this.data);
  }

  readWord(address: number): number {
    return this.memory.readWord(address);
  }

  writeWord(address: number, value: number): void {
    this.memory.writeWord(address, value);
  }

  input(port: number): number {
    this.address = port & 0xff;
    this.data = this.io.read(this.address);

    return this.data;
  }

  output(port: number, value: number): void {
    this.address = port & 0xff;
    this.data = value & 0xff;
    this.io.write(this.address, this.data);
  }

  load(bytes: ArrayLike<number>, startAddress = 0): void {
    this.memory.load(bytes, startAddress);
  }

  snapshot(): BusSnapshot {
    return {
      address: this.address,
      data: this.data,
    };
  }
}
