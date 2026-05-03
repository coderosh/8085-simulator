import { Machine } from "@/core/machine";
import { InstructionDecoder } from "@/core/isa";
import type { CodeGenResult } from "@/core/types";

import { BASE_ADDRESS } from "./constants";

declare global {
  interface Window {
    machine: Machine;
  }
}

export type AssembledRow = {
  address: number;
  bytes: number[];
  source: string;
  line: number;
};

export function buildAssembledRows(
  result: CodeGenResult,
  source: string,
): AssembledRow[] {
  const sourceLines = source.split("\n");
  const rows = new Map<number, AssembledRow>();

  for (const entry of result.sourceMap) {
    const line = entry.span.start.line;
    const existing = rows.get(line);

    if (existing) {
      existing.bytes.push(entry.byte);
      continue;
    }

    rows.set(line, {
      address: BASE_ADDRESS + entry.address,
      bytes: [entry.byte],
      source: sourceLines[line - 1]?.trim() ?? "",
      line,
    });
  }

  return Array.from(rows.values()).sort((a, b) => a.address - b.address);
}

export function relocateAssembledResult(
  result: CodeGenResult,
  startAddress = BASE_ADDRESS,
): CodeGenResult {
  const bytes = relocateAddressOperands(result.bytes, startAddress);

  return {
    ...result,
    bytes,
    sourceMap: result.sourceMap.map((entry) => ({
      ...entry,
      byte: bytes[entry.address],
    })),
  };
}

export function createLoadedMachine(bytes: number[]) {
  const machine = new Machine();

  window.machine = machine;

  machine.loadProgram(bytes, BASE_ADDRESS);

  return machine;
}

function relocateAddressOperands(
  bytes: readonly number[],
  startAddress: number,
): number[] {
  const decoder = new InstructionDecoder();
  const relocated = [...bytes];
  let offset = 0;

  while (offset < relocated.length) {
    const opcode = relocated[offset];
    const instruction = decoder.decode(opcode, [
      relocated[offset + 1] ?? 0,
      relocated[offset + 2] ?? 0,
    ]);
    const addressOperand = instruction.operands.find(
      (operand) => operand.kind === "address",
    );

    if (addressOperand) {
      const relocatedAddress = (startAddress + addressOperand.value) & 0xffff;
      relocated[offset + 1] = relocatedAddress & 0xff;
      relocated[offset + 2] = (relocatedAddress >> 8) & 0xff;
    }

    offset += instruction.size;
  }

  return relocated;
}
