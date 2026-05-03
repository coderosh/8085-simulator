import type { DecodedInstruction } from "@core/types";
import { DECODE_TABLE } from "./decode-table";
import { resolveImmediateOperand } from "./operands";

export class InstructionDecoder {
  decode(opcode: number, immediateBytes: ArrayLike<number> = []): DecodedInstruction {
    const template = DECODE_TABLE.get(opcode);

    if (!template) {
      throw this.error(`Unsupported opcode: ${opcode.toString(16).toUpperCase()}H`);
    }

    return {
      opcode,
      mnemonic: template.mnemonic,
      operands: template.operands.map((operand) =>
        resolveImmediateOperand(operand, immediateBytes),
      ),
      size: template.size,
    };
  }

  private error(message: string): Error {
    return new Error(`[InstructionDecoder Error] ${message}`);
  }
}
