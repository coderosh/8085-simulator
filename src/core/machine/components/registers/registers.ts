import { higherByte, lowerByte, toWord } from "@core/utils";
import type { FlagName, FlagState, RegistersSnapshot } from "./types";
import { Flags } from "./flags";

export class Registers {
  a = 0;
  b = 0;
  c = 0;
  d = 0;
  e = 0;
  h = 0;
  l = 0;
  sp = 0xffff;
  pc = 0;
  readonly flags = new Flags();

  reset(): void {
    this.a = 0;
    this.b = 0;
    this.c = 0;
    this.d = 0;
    this.e = 0;
    this.h = 0;
    this.l = 0;
    this.sp = 0xffff;
    this.pc = 0;
    this.flags.reset();
  }

  getRegister(name: string): number {
    switch (name) {
      case "A":
        return this.a;
      case "B":
        return this.b;
      case "C":
        return this.c;
      case "D":
        return this.d;
      case "E":
        return this.e;
      case "H":
        return this.h;
      case "L":
        return this.l;
    }

    throw this.error(`Unknown register: ${name}`);
  }

  setRegister(name: string, value: number): void {
    const byte = lowerByte(value);

    switch (name) {
      case "A":
        this.a = byte;
        return;
      case "B":
        this.b = byte;
        return;
      case "C":
        this.c = byte;
        return;
      case "D":
        this.d = byte;
        return;
      case "E":
        this.e = byte;
        return;
      case "H":
        this.h = byte;
        return;
      case "L":
        this.l = byte;
        return;
    }

    throw this.error(`Unknown register: ${name}`);
  }

  getPair(name: string): number {
    switch (name) {
      case "BC":
        return toWord(this.b, this.c);
      case "DE":
        return toWord(this.d, this.e);
      case "HL":
        return toWord(this.h, this.l);
      case "SP":
        return this.sp;
    }

    throw this.error(`Unknown register pair: ${name}`);
  }

  setPair(name: string, value: number): void {
    const word = value & 0xffff;

    switch (name) {
      case "BC":
        this.b = higherByte(word);
        this.c = lowerByte(word);
        return;
      case "DE":
        this.d = higherByte(word);
        this.e = lowerByte(word);
        return;
      case "HL":
        this.h = higherByte(word);
        this.l = lowerByte(word);
        return;
      case "SP":
        this.sp = word;
        return;
    }

    throw this.error(`Unknown register pair: ${name}`);
  }

  getStackPair(name: string): number {
    if (name === "PSW") {
      return toWord(this.a, this.flags.toByte());
    }

    return this.getPair(name);
  }

  setStackPair(name: string, value: number): void {
    const word = value & 0xffff;

    if (name === "PSW") {
      this.a = higherByte(word);
      this.flags.fromByte(lowerByte(word));
      return;
    }

    this.setPair(name, word);
  }

  get hlAddress(): number {
    return toWord(this.h, this.l);
  }

  snapshot(): RegistersSnapshot {
    return {
      a: this.a,
      b: this.b,
      c: this.c,
      d: this.d,
      e: this.e,
      h: this.h,
      l: this.l,
      sp: this.sp,
      pc: this.pc,
      flags: this.flags.snapshot(),
    };
  }

  getFlag(flag: FlagName): boolean {
    return this.flags.get(flag);
  }

  setFlag(flag: FlagName, value: boolean): void {
    this.flags.set(flag, value);
  }

  getFlags(): FlagState {
    return this.flags.snapshot();
  }

  setFlags(flags: Partial<FlagState>): void {
    this.flags.setAll(flags);
  }

  private error(message: string): Error {
    return new Error(`[Registers Error] ${message}`);
  }
}
