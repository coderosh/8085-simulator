import type { InstructionDefinition } from "@core/types";
import { higherByte, lowerByte } from "@core/utils";

export function oneByte(opcode: number): InstructionDefinition["encode"] {
  return () => [opcode];
}

export function registerOpcode(
  baseCode: number,
): InstructionDefinition["encode"] {
  return ([operand]) => [baseCode | operand.code];
}

export function registerShiftOpcode(
  baseCode: number,
): InstructionDefinition["encode"] {
  return ([operand]) => [baseCode | (operand.code << 3)];
}

export function registerPairShiftOpcode(
  baseCode: number,
): InstructionDefinition["encode"] {
  return ([operand]) => [baseCode | (operand.code << 4)];
}

export function byteImmediate(
  opcode: number,
): InstructionDefinition["encode"] {
  return ([operand]) => [opcode, lowerByte(operand.code)];
}

export function wordImmediate(
  opcode: number,
): InstructionDefinition["encode"] {
  return ([operand]) => [
    opcode,
    lowerByte(operand.code),
    higherByte(operand.code),
  ];
}
