import { SimulatorError } from "@core/errors";

import { Bus } from "../bus";
import { Clock } from "../clock";
import { Registers } from "../registers";
import type { ControlUnitSnapshot } from "./types";

export class ControlUnit {
  private halted = false;
  private bus: Bus;
  private clock: Clock;
  private registers: Registers;

  constructor(registers: Registers, bus: Bus, clock: Clock) {
    this.registers = registers;
    this.bus = bus;
    this.clock = clock;
  }

  reset(): void {
    this.halted = false;
  }

  halt(): void {
    this.halted = true;
  }

  resume(): void {
    this.halted = false;
  }

  isHalted(): boolean {
    return this.halted;
  }

  fetchByte(): number {
    if (this.halted) {
      throw this.error("Cannot fetch while halted");
    }

    const value = this.bus.readByte(this.registers.pc);
    this.registers.pc = (this.registers.pc + 1) & 0xffff;
    this.clock.tick();

    return value;
  }

  fetchWord(): number {
    const low = this.fetchByte();
    const high = this.fetchByte();

    return (high << 8) | low;
  }

  snapshot(): ControlUnitSnapshot {
    return {
      halted: this.halted,
    };
  }

  private error(message: string): Error {
    return new SimulatorError(message, {
      code: "CONTROL_UNIT_ERROR",
      component: "ControlUnit",
    });
  }
}
