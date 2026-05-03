export type OperandKind =
  | "register"
  | "registerPair"
  | "registerPairBD"
  | "stackRegisterPair"
  | "byte"
  | "word"
  | "address"
  | "port"
  | "restartVector";

export interface ResolvedOperand {
  kind: OperandKind;
  value: string | number;
  code: number;
}

export interface InstructionDefinition {
  mnemonic: string;
  operands: readonly OperandKind[];
  size: number;
  encode: (operands: readonly ResolvedOperand[]) => number[];
}

export type DecodedOperand =
  | { kind: "register"; value: string; code: number }
  | { kind: "registerPair"; value: string; code: number }
  | { kind: "registerPairBD"; value: string; code: number }
  | { kind: "stackRegisterPair"; value: string; code: number }
  | { kind: "byte"; value: number; code: number }
  | { kind: "word"; value: number; code: number }
  | { kind: "address"; value: number; code: number }
  | { kind: "port"; value: number; code: number }
  | { kind: "restartVector"; value: number; code: number };

export interface DecodedInstruction {
  opcode: number;
  mnemonic: string;
  operands: readonly DecodedOperand[];
  size: number;
}

export interface DisassembledInstruction {
  address: number;
  bytes: number[];
  instruction: DecodedInstruction;
  source: string;
}
