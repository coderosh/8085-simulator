import type { ClockSnapshot } from "./types";

export class Clock {
  private cycles = 0;
  private ticks = 0;
  private running = false;

  start(): void {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  reset(): void {
    this.cycles = 0;
    this.ticks = 0;
    this.running = false;
  }

  addCycles(cycles: number): void {
    if (cycles < 0) {
      throw this.error(`cycles must be positive, got ${cycles}`);
    }

    this.cycles += cycles;
  }

  tick(): void {
    this.ticks++;
  }

  getCycles(): number {
    return this.cycles;
  }

  getTicks(): number {
    return this.ticks;
  }

  isRunning(): boolean {
    return this.running;
  }

  snapshot(): ClockSnapshot {
    return {
      cycles: this.cycles,
      ticks: this.ticks,
      running: this.running,
    };
  }

  private error(message: string): Error {
    return new Error(`[Clock Error] ${message}`);
  }
}
