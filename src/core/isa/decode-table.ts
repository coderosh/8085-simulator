import type {
  DecodedOperand,
  InstructionDefinition,
} from "@core/types";
import { INSTRUCTION_SET } from "./instructions";
import { type OperandCandidate, operandCombinations } from "./operands";

export interface DecodeTemplate {
  mnemonic: string;
  operands: readonly DecodedOperand[];
  size: number;
}

export const DECODE_TABLE = buildDecodeTable();

function buildDecodeTable(): Map<number, DecodeTemplate> {
  const table = new Map<number, DecodeTemplate>();

  for (const definition of Object.values(INSTRUCTION_SET)) {
    for (const operands of operandCombinations(definition.operands)) {
      const bytes = encodeTemplate(definition, operands);

      if (!bytes) continue;

      table.set(bytes[0], {
        mnemonic: definition.mnemonic,
        operands,
        size: definition.size,
      });
    }
  }

  return table;
}

function encodeTemplate(
  definition: InstructionDefinition,
  operands: readonly OperandCandidate[],
): number[] | null {
  try {
    return definition.encode(operands);
  } catch {
    return null;
  }
}
