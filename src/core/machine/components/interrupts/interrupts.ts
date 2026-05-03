import type { InterruptSnapshot, RestartInterrupt } from "./types";

export class InterruptController {
  enabled = false;
  serialInput = false;
  serialOutput = false;
  serialOutputEnabled = false;
  readonly masks: Record<RestartInterrupt, boolean> = {
    rst55: false,
    rst65: false,
    rst75: false,
  };
  readonly pending: Record<RestartInterrupt, boolean> = {
    rst55: false,
    rst65: false,
    rst75: false,
  };

  reset(): void {
    this.enabled = false;
    this.serialInput = false;
    this.serialOutput = false;
    this.serialOutputEnabled = false;
    this.masks.rst55 = false;
    this.masks.rst65 = false;
    this.masks.rst75 = false;
    this.pending.rst55 = false;
    this.pending.rst65 = false;
    this.pending.rst75 = false;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  request(interrupt: RestartInterrupt): void {
    this.pending[interrupt] = true;
  }

  clear(interrupt: RestartInterrupt): void {
    this.pending[interrupt] = false;
  }

  readMask(): number {
    return (
      (this.masks.rst55 ? 0x01 : 0) |
      (this.masks.rst65 ? 0x02 : 0) |
      (this.masks.rst75 ? 0x04 : 0) |
      (this.enabled ? 0x08 : 0) |
      (this.pending.rst55 ? 0x10 : 0) |
      (this.pending.rst65 ? 0x20 : 0) |
      (this.pending.rst75 ? 0x40 : 0) |
      (this.serialInput ? 0x80 : 0)
    );
  }

  setMask(value: number): void {
    if (value & 0x08) {
      this.masks.rst55 = Boolean(value & 0x01);
      this.masks.rst65 = Boolean(value & 0x02);
      this.masks.rst75 = Boolean(value & 0x04);
    }

    if (value & 0x10) {
      this.pending.rst75 = false;
    }

    this.serialOutputEnabled = Boolean(value & 0x40);

    if (this.serialOutputEnabled) {
      this.serialOutput = Boolean(value & 0x80);
    }
  }

  snapshot(): InterruptSnapshot {
    return {
      enabled: this.enabled,
      masks: { ...this.masks },
      pending: { ...this.pending },
      serialInput: this.serialInput,
      serialOutput: this.serialOutput,
      serialOutputEnabled: this.serialOutputEnabled,
    };
  }
}
