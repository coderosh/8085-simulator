import type { DisassembledInstruction } from "@core/types";
import { formatWord } from "@core/utils";
import { InstructionDecoder } from "./decoder";
import { formatInstruction } from "./formatter";
import { immediateBytes, instructionBytes } from "./utils";

export function disassemble(
  bytes: ArrayLike<number>,
  startAddress = 0,
  decoder = new InstructionDecoder(),
): DisassembledInstruction[] {
  const instructions: DisassembledInstruction[] = [];
  let offset = 0;

  while (offset < bytes.length) {
    const address = (startAddress + offset) & 0xffff;
    const opcode = bytes[offset];
    const instruction = decoder.decode(opcode, immediateBytes(bytes, offset));

    if (offset + instruction.size > bytes.length) {
      throw new Error(
        `[Disassembler Error] Incomplete instruction '${instruction.mnemonic}' at ${formatWord(address)}H`,
      );
    }

    instructions.push({
      address,
      bytes: instructionBytes(bytes, offset, instruction.size),
      instruction,
      source: formatInstruction(instruction),
    });

    offset += instruction.size;
  }

  return instructions;
}

export function disassembleToSource(
  bytes: ArrayLike<number>,
  startAddress = 0,
  decoder = new InstructionDecoder(),
): string {
  return disassemble(bytes, startAddress, decoder)
    .map((instruction) => instruction.source)
    .join("\n");
}
