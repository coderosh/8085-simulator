export const REGISTER_CODES: Record<string, number> = {
  B: 0,
  C: 1,
  D: 2,
  E: 3,
  H: 4,
  L: 5,
  M: 6,
  A: 7,
};

export const REGISTER_PAIR_CODES: Record<string, number> = {
  B: 0,
  D: 1,
  H: 2,
  SP: 3,
};

export const REGISTER_PAIR_BD_CODES = [
  REGISTER_PAIR_CODES.B,
  REGISTER_PAIR_CODES.D,
] as const;

export const STACK_REGISTER_PAIR_CODES: Record<string, number> = {
  B: 0,
  D: 1,
  H: 2,
  PSW: 3,
};

export const REGISTERS = new Set([
  ...Object.keys(REGISTER_CODES),
  ...Object.keys(REGISTER_PAIR_CODES),
  ...Object.keys(STACK_REGISTER_PAIR_CODES),
]);
