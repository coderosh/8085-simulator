import { describe, expect, it } from "vitest";

import { assemble } from "@core/assembler";
import { Machine } from "./machine";

const loopProgram = `MVI C, 05H
LOOP: DCR C
JNZ LOOP
HLT`;
const baseAddress = 0x2000;

describe("Machine", () => {
  it("executes a DCR/JNZ loop and leaves all registers in the expected state", () => {
    const result = assemble(loopProgram);
    const machine = new Machine();
    const opcodes: number[] = [];

    machine.loadProgram(result.bytes);

    for (let steps = 0; steps < 20; steps++) {
      const step = machine.step();
      opcodes.push(step.opcode);

      if (step.opcode === 0x76) break;
    }

    expect(opcodes).toEqual([
      0x0e,
      0x0d,
      0xc2,
      0x0d,
      0xc2,
      0x0d,
      0xc2,
      0x0d,
      0xc2,
      0x0d,
      0xc2,
      0x76,
    ]);

    expect(machine.registers.snapshot()).toEqual({
      a: 0x00,
      b: 0x00,
      c: 0x00,
      d: 0x00,
      e: 0x00,
      h: 0x00,
      l: 0x00,
      pc: result.bytes.length,
      sp: 0xffff,
      flags: {
        sign: false,
        zero: true,
        auxiliaryCarry: false,
        parity: true,
        carry: false,
      },
    });
  });

  it("executes the same loop when loaded at a non-zero address", () => {
    const bytes = [
      0x0e,
      0x05,
      0x0d,
      0xc2,
      0x02,
      0x20,
      0x76,
    ];
    const machine = new Machine();
    const opcodes: number[] = [];

    machine.loadProgram(bytes, baseAddress);

    for (let steps = 0; steps < 20; steps++) {
      const step = machine.step();
      opcodes.push(step.opcode);

      if (step.opcode === 0x76) break;
    }

    expect(opcodes).toEqual([
      0x0e,
      0x0d,
      0xc2,
      0x0d,
      0xc2,
      0x0d,
      0xc2,
      0x0d,
      0xc2,
      0x0d,
      0xc2,
      0x76,
    ]);

    expect(machine.registers.snapshot()).toEqual({
      a: 0x00,
      b: 0x00,
      c: 0x00,
      d: 0x00,
      e: 0x00,
      h: 0x00,
      l: 0x00,
      pc: baseAddress + bytes.length,
      sp: 0xffff,
      flags: {
        sign: false,
        zero: true,
        auxiliaryCarry: false,
        parity: true,
        carry: false,
      },
    });
  });

  it("executes LXI with memory-indirect MVI", () => {
    const result = assemble(`LXI H, 2200H
MVI M, 42H
HLT`);
    const machine = new Machine();

    machine.loadProgram(result.bytes);

    machine.step();
    machine.step();
    machine.step();

    expect(machine.registers.h).toBe(0x22);
    expect(machine.registers.l).toBe(0x00);
    expect(machine.memory.readByte(0x2200)).toBe(0x42);
    expect(machine.registers.pc).toBe(result.bytes.length);
    expect(machine.controlUnit.isHalted()).toBe(true);
  });

  it("executes CALL and RET with an ORG-based absolute subroutine address", () => {
    const result = assemble(`ORG 2000H
LXI SP, 0FFF0H
MVI A, 01H
CALL INC_A
HLT
ORG 2010H
INC_A: INR A
RET`);
    const machine = new Machine();

    for (const segment of result.segments) {
      machine.memory.load(segment.bytes, segment.startAddress);
    }

    machine.registers.pc = result.entryPoint;

    for (let steps = 0; steps < 10; steps++) {
      const step = machine.step();

      if (step.opcode === 0x76) break;
    }

    expect(result.bytes.slice(5, 8)).toEqual([0xcd, 0x10, 0x20]);
    expect(machine.registers.a).toBe(0x02);
    expect(machine.registers.pc).toBe(0x2009);
    expect(machine.controlUnit.isHalted()).toBe(true);
  });
});
