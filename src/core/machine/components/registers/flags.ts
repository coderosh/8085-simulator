import type { FlagName, FlagState } from "./types";

const INITIAL_FLAGS: FlagState = {
  sign: false,
  zero: false,
  auxiliaryCarry: false,
  parity: false,
  carry: false,
};

// 0x80 // 1000 0000, sign flag, bit 7
// 0x40 // 0100 0000, zero flag, bit 6
// 0x10 // 0001 0000, auxiliary carry flag, bit 4
// 0x04 // 0000 0100, parity flag, bit 2
// 0x02 // 0000 0010, always set/reserved bit, bit 1
// 0x01 // 0000 0001, carry flag, bit 0
export class Flags {
  sign = INITIAL_FLAGS.sign;
  zero = INITIAL_FLAGS.zero;
  auxiliaryCarry = INITIAL_FLAGS.auxiliaryCarry;
  parity = INITIAL_FLAGS.parity;
  carry = INITIAL_FLAGS.carry;

  reset(): void {
    this.sign = INITIAL_FLAGS.sign;
    this.zero = INITIAL_FLAGS.zero;
    this.auxiliaryCarry = INITIAL_FLAGS.auxiliaryCarry;
    this.parity = INITIAL_FLAGS.parity;
    this.carry = INITIAL_FLAGS.carry;
  }

  get(flag: FlagName): boolean {
    return this[flag];
  }

  set(flag: FlagName, value: boolean): void {
    this[flag] = value;
  }

  setAll(flags: Partial<FlagState>): void {
    if (flags.sign !== undefined) this.sign = flags.sign;
    if (flags.zero !== undefined) this.zero = flags.zero;
    if (flags.auxiliaryCarry !== undefined) {
      this.auxiliaryCarry = flags.auxiliaryCarry;
    }
    if (flags.parity !== undefined) this.parity = flags.parity;
    if (flags.carry !== undefined) this.carry = flags.carry;
  }

  setZeroSignParity(value: number): void {
    const byte = value & 0xff;

    this.zero = byte === 0;
    this.sign = (byte & 0x80) !== 0;
    this.parity = this.hasEvenParity(byte);
  }

  toByte(): number {
    return (
      (this.sign ? 0x80 : 0) |
      (this.zero ? 0x40 : 0) |
      (this.auxiliaryCarry ? 0x10 : 0) |
      (this.parity ? 0x04 : 0) |
      0x02 |
      (this.carry ? 0x01 : 0)
    );
  }

  fromByte(value: number): void {
    const byte = value & 0xff;

    this.sign = (byte & 0x80) !== 0;
    this.zero = (byte & 0x40) !== 0;
    this.auxiliaryCarry = (byte & 0x10) !== 0;
    this.parity = (byte & 0x04) !== 0;
    this.carry = (byte & 0x01) !== 0;
  }

  snapshot(): FlagState {
    return {
      sign: this.sign,
      zero: this.zero,
      auxiliaryCarry: this.auxiliaryCarry,
      parity: this.parity,
      carry: this.carry,
    };
  }

  private hasEvenParity(value: number): boolean {
    let byte = value & 0xff;
    let hasOddParity = false;

    while (byte) {
      hasOddParity = !hasOddParity;
      byte &= byte - 1;
    }

    return !hasOddParity;
  }
}
