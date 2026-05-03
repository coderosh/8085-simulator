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
      address: entry.address,
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
  if (result.hasExplicitOrigin) {
    return result;
  }

  const segments = result.segments.map((segment) => ({
    startAddress: (segment.startAddress + startAddress) & 0xffff,
    bytes: relocateAddressOperands(segment.bytes, startAddress),
  }));
  const bytes = segments.flatMap((segment) => segment.bytes);

  return {
    ...result,
    bytes,
    entryPoint: (result.entryPoint + startAddress) & 0xffff,
    segments,
    symbols: Object.fromEntries(
      Object.entries(result.symbols).map(([name, address]) => [
        name,
        (address + startAddress) & 0xffff,
      ]),
    ),
    sourceMap: result.sourceMap.map((entry, index) => ({
      ...entry,
      address: (entry.address + startAddress) & 0xffff,
      byte: bytes[index],
    })),
  };
}

export function createLoadedMachine(result: CodeGenResult) {
  const machine = new Machine();

  window.machine = machine;

  for (const segment of result.segments) {
    machine.memory.load(segment.bytes, segment.startAddress);
  }

  machine.registers.pc = result.entryPoint & 0xffff;

  return machine;
}

export function hasProgramByte(result: CodeGenResult, address: number): boolean {
  return result.sourceMap.some((entry) => entry.address === (address & 0xffff));
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
