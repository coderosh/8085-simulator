import type { DecodedInstruction, DecodedOperand } from "@core/types";
import { formatByte, formatWord } from "@core/utils";

export function formatInstruction(instruction: DecodedInstruction): string {
  if (instruction.operands.length === 0) {
    return instruction.mnemonic;
  }

  return `${instruction.mnemonic} ${instruction.operands
    .map(formatOperand)
    .join(", ")}`;
}

export function formatOperand(operand: DecodedOperand): string {
  if (
    operand.kind === "register" ||
    operand.kind === "registerPair" ||
    operand.kind === "registerPairBD" ||
    operand.kind === "stackRegisterPair"
  ) {
    return operand.value;
  }

  if (operand.kind === "byte" || operand.kind === "port") {
    return `${formatByte(operand.value)}H`;
  }

  if (operand.kind === "word" || operand.kind === "address") {
    return `${formatWord(operand.value)}H`;
  }

  return String(operand.value);
}
