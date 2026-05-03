import type { Registers } from "../registers";

export const JUMP_CONDITIONS: Record<string, (registers: Registers) => boolean> = {
  JMP: () => true,
  JNZ: (registers) => !registers.flags.zero,
  JZ: (registers) => registers.flags.zero,
  JNC: (registers) => !registers.flags.carry,
  JC: (registers) => registers.flags.carry,
  JPO: (registers) => !registers.flags.parity,
  JPE: (registers) => registers.flags.parity,
  JP: (registers) => !registers.flags.sign,
  JM: (registers) => registers.flags.sign,
};

export const ACCUMULATOR_OPERATIONS = new Set([
  "ADD",
  "ADC",
  "SUB",
  "SBB",
  "ANA",
  "XRA",
  "ORA",
  "CMP",
]);

export const IMMEDIATE_ACCUMULATOR_OPERATIONS = new Set([
  "ADI",
  "ACI",
  "SUI",
  "SBI",
  "ANI",
  "XRI",
  "CPI",
]);

export const CALL_CONDITIONS: Record<string, (registers: Registers) => boolean> = {
  CALL: () => true,
  CNZ: (registers) => !registers.flags.zero,
  CZ: (registers) => registers.flags.zero,
  CNC: (registers) => !registers.flags.carry,
  CC: (registers) => registers.flags.carry,
  CPO: (registers) => !registers.flags.parity,
  CPE: (registers) => registers.flags.parity,
  CP: (registers) => !registers.flags.sign,
  CM: (registers) => registers.flags.sign,
};

export const RETURN_CONDITIONS: Record<string, (registers: Registers) => boolean> = {
  RET: () => true,
  RNZ: (registers) => !registers.flags.zero,
  RZ: (registers) => registers.flags.zero,
  RNC: (registers) => !registers.flags.carry,
  RC: (registers) => registers.flags.carry,
  RPO: (registers) => !registers.flags.parity,
  RPE: (registers) => registers.flags.parity,
  RP: (registers) => !registers.flags.sign,
  RM: (registers) => registers.flags.sign,
};
