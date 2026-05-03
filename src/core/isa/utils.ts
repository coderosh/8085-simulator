import {
  DESTINATION_REGISTER_OPCODE_MASK,
  REGISTER_CODE_MASK,
  REGISTER_CODE_WIDTH,
  REGISTER_PAIR_CODE_MASK,
  REGISTER_PAIR_CODE_WIDTH,
  REGISTER_PAIR_OPCODE_MASK,
  SOURCE_REGISTER_MASK,
  SOURCE_REGISTER_OPCODE_MASK,
} from "@core/constants";
import {
  REGISTER_CODES,
  REGISTER_PAIR_CODES,
  STACK_REGISTER_PAIR_CODES,
} from "@core/constants";
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
  return ([operand]) => [baseCode | encodeRegisterCode(operand.code)];
}

export function registerPairShiftOpcode(
  baseCode: number,
): InstructionDefinition["encode"] {
  return ([operand]) => [baseCode | encodeRegisterPairCode(operand.code)];
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

export function sourceRegisterCode(opcode: number): number {
  return opcode & SOURCE_REGISTER_MASK;
}

export function destinationRegisterCode(opcode: number): number {
  return (opcode >> REGISTER_CODE_WIDTH) & REGISTER_CODE_MASK;
}

export function opcodeWithoutDestinationRegister(opcode: number): number {
  return opcode & DESTINATION_REGISTER_OPCODE_MASK;
}

export function opcodeWithoutSourceRegister(opcode: number): number {
  return opcode & SOURCE_REGISTER_OPCODE_MASK;
}

export function registerPairCode(opcode: number): number {
  return (opcode >> REGISTER_PAIR_CODE_WIDTH) & REGISTER_PAIR_CODE_MASK;
}

export function opcodeWithoutRegisterPair(opcode: number): number {
  return opcode & REGISTER_PAIR_OPCODE_MASK;
}

export function encodeRegisterCode(code: number): number {
  return code << REGISTER_CODE_WIDTH;
}

export function encodeRegisterPairCode(code: number): number {
  return code << REGISTER_PAIR_CODE_WIDTH;
}

export function registerName(code: number): string {
  return nameByCode(REGISTER_CODES, code, "register");
}

export function registerPairName(code: number): string {
  return nameByCode(REGISTER_PAIR_CODES, code, "register pair");
}

export function stackRegisterPairName(code: number): string {
  return nameByCode(STACK_REGISTER_PAIR_CODES, code, "stack register pair");
}

export function immediateBytes(bytes: ArrayLike<number>, offset: number): number[] {
  return [bytes[offset + 1] ?? 0, bytes[offset + 2] ?? 0];
}

export function instructionBytes(
  bytes: ArrayLike<number>,
  offset: number,
  size: number,
): number[] {
  return Array.from(
    { length: size },
    (_, index) => lowerByte(bytes[offset + index] ?? 0),
  );
}

function nameByCode(
  codes: Record<string, number>,
  code: number,
  label: string,
): string {
  const name = Object.entries(codes).find(([, value]) => value === code)?.[0];

  if (!name) {
    throw new Error(`[ISA Error] Unknown ${label} code: ${code}`);
  }

  return name;
}
