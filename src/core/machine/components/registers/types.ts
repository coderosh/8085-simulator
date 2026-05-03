export type FlagName =
  | "sign"
  | "zero"
  | "auxiliaryCarry"
  | "parity"
  | "carry";

export interface FlagState {
  sign: boolean;
  zero: boolean;
  auxiliaryCarry: boolean;
  parity: boolean;
  carry: boolean;
}

export interface RegistersSnapshot {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  h: number;
  l: number;
  sp: number;
  pc: number;
  flags: FlagState;
}
