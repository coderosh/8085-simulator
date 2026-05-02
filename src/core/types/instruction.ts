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
