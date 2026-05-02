import type { InstructionNode } from "@core/types";
import { getInstructionDefinition } from "@core/isa";

export function getInstructionSize(node: InstructionNode): number {
  const definition = getInstructionDefinition(node.mnemonic);

  if (!definition) {
    throw new Error(
      `[CodeGen Error] Unsupported instruction '${node.mnemonic}' at line ${node.span.start.line}, col ${node.span.start.column}`,
    );
  }

  return definition.size;
}
