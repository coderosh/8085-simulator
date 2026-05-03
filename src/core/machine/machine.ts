import {
  ALU,
  Bus,
  Clock,
  ControlUnit,
  IO,
  Memory,
  Registers,
} from "./components";
import type { MachineSnapshot, MachineStepResult } from "./types";

export class Machine {
  readonly registers = new Registers();
  readonly flags = this.registers.flags;
  readonly alu = new ALU(this.flags);
  readonly clock = new Clock();
  readonly memory = new Memory();
  readonly io = new IO();
  readonly bus = new Bus(this.memory, this.io);
  readonly controlUnit = new ControlUnit(
    this.registers,
    this.bus,
    this.clock,
  );

  reset(): void {
    this.registers.reset();
    this.clock.reset();
    this.memory.reset();
    this.io.reset();
    this.bus.reset();
    this.controlUnit.reset();
  }

  loadProgram(bytes: ArrayLike<number>, startAddress = 0): void {
    this.bus.load(bytes, startAddress);
    this.registers.pc = startAddress & 0xffff;
  }

  step(): MachineStepResult {
    const opcode = this.controlUnit.fetchByte();

    return {
      opcode,
    };
  }

  halt(): void {
    this.controlUnit.halt();
    this.clock.stop();
  }

  run(): void {
    this.clock.start();
  }

  snapshot(): MachineSnapshot {
    return {
      registers: this.registers.snapshot(),
      clock: this.clock.snapshot(),
      bus: this.bus.snapshot(),
      memory: this.memory.snapshot(),
      io: this.io.snapshot(),
      controlUnit: this.controlUnit.snapshot(),
    };
  }
}
