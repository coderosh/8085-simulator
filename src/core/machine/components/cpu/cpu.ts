import { REGISTER_CODES } from "@core/constants";
import { SimulatorError } from "@core/errors";
import { InstructionDecoder } from "@core/isa";
import { registerName } from "@core/isa/utils";
import type { DecodedInstruction, DecodedOperand } from "@core/types";
import { higherByte, lowerByte, toWord } from "@core/utils";
import { ALU, type AluResult } from "../alu";
import { Bus } from "../bus";
import { Clock } from "../clock";
import { ControlUnit } from "../control-unit";
import { InterruptController } from "../interrupts";
import { Registers } from "../registers";
import {
  ACCUMULATOR_OPERATIONS,
  CALL_CONDITIONS,
  IMMEDIATE_ACCUMULATOR_OPERATIONS,
  JUMP_CONDITIONS,
  RETURN_CONDITIONS,
} from "./execution-tables";

export interface CpuStepResult {
  opcode: number;
  alu?: AluResult;
}

export class CPU {
  private alu: ALU;
  private bus: Bus;
  private clock: Clock;
  private controlUnit: ControlUnit;
  private interrupts: InterruptController;
  private decoder: InstructionDecoder;
  private registers: Registers;

  constructor(
    registers: Registers,
    bus: Bus,
    controlUnit: ControlUnit,
    interrupts: InterruptController,
    alu: ALU,
    clock: Clock,
    decoder = new InstructionDecoder(),
  ) {
    this.registers = registers;
    this.bus = bus;
    this.controlUnit = controlUnit;
    this.interrupts = interrupts;
    this.alu = alu;
    this.clock = clock;
    this.decoder = decoder;
  }

  step(): CpuStepResult {
    const opcode = this.controlUnit.fetchByte();
    const instruction = this.decoder.decode(opcode, this.immediateBytes());
    const alu = this.execute(instruction);

    return {
      opcode,
      alu,
    };
  }

  private immediateBytes(): number[] {
    return [
      this.bus.readByte(this.registers.pc),
      this.bus.readByte(this.registers.pc + 1),
    ];
  }

  private execute(instruction: DecodedInstruction): CpuStepResult["alu"] {
    switch (instruction.mnemonic) {
      case "NOP":
        return;
      case "HLT":
        this.controlUnit.halt();
        this.clock.stop();
        return;
      case "MOV":
        this.writeRegisterCode(
          this.operandCode(instruction, 0),
          this.readRegisterCode(this.operandCode(instruction, 1)),
        );
        return;
      case "MVI":
        this.writeRegisterCode(
          this.operandCode(instruction, 0),
          this.controlUnit.fetchByte(),
        );
        return;
      case "LXI":
        this.registers.setPair(
          this.operandValue(instruction, 0),
          this.controlUnit.fetchWord(),
        );
        return;
      case "LDA":
        this.registers.a = this.bus.readByte(this.controlUnit.fetchWord());
        return;
      case "LDAX":
        this.registers.a = this.bus.readByte(
          this.registers.getPair(this.registerPairOperandValue(instruction, 0)),
        );
        return;
      case "LHLD":
        this.registers.setPair("HL", this.bus.readWord(this.controlUnit.fetchWord()));
        return;
      case "STA":
        this.bus.writeByte(this.controlUnit.fetchWord(), this.registers.a);
        return;
      case "STAX":
        this.bus.writeByte(
          this.registers.getPair(this.registerPairOperandValue(instruction, 0)),
          this.registers.a,
        );
        return;
      case "SHLD":
        this.bus.writeWord(this.controlUnit.fetchWord(), this.registers.getPair("HL"));
        return;
      case "XCHG":
        this.exchangeDeHl();
        return;
      case "INR":
        return this.executeIncrement(this.operandCode(instruction, 0));
      case "DCR":
        return this.executeDecrement(this.operandCode(instruction, 0));
      case "INX":
        this.incrementPair(this.operandValue(instruction, 0));
        return;
      case "DCX":
        this.decrementPair(this.operandValue(instruction, 0));
        return;
      case "DAD":
        this.doubleAddPair(this.operandValue(instruction, 0));
        return;
      case "DAA":
        this.decimalAdjustAccumulator();
        return;
      case "CMA":
        this.registers.a = lowerByte(~this.registers.a);
        return;
      case "CMC":
        this.registers.flags.carry = !this.registers.flags.carry;
        return;
      case "STC":
        this.registers.flags.carry = true;
        return;
      case "RLC":
        this.rotateLeft();
        return;
      case "RRC":
        this.rotateRight();
        return;
      case "RAL":
        this.rotateLeftThroughCarry();
        return;
      case "RAR":
        this.rotateRightThroughCarry();
        return;
      case "PCHL":
        this.registers.pc = this.registers.getPair("HL");
        return;
      case "RST":
        this.pushWord(this.registers.pc);
        this.registers.pc = this.restartVector(instruction) * 8;
        return;
      case "PUSH":
        this.pushWord(this.registers.getStackPair(this.operandValue(instruction, 0)));
        return;
      case "POP":
        this.registers.setStackPair(this.operandValue(instruction, 0), this.popWord());
        return;
      case "XTHL":
        this.exchangeStackTopWithHl();
        return;
      case "SPHL":
        this.registers.sp = this.registers.getPair("HL");
        return;
      case "IN":
        this.registers.a = this.bus.input(this.controlUnit.fetchByte());
        return;
      case "OUT":
        this.bus.output(this.controlUnit.fetchByte(), this.registers.a);
        return;
      case "EI":
        this.interrupts.enable();
        return;
      case "DI":
        this.interrupts.disable();
        return;
      case "RIM":
        this.registers.a = this.interrupts.readMask();
        return;
      case "SIM":
        this.interrupts.setMask(this.registers.a);
        return;
    }

    if (ACCUMULATOR_OPERATIONS.has(instruction.mnemonic)) {
      return this.executeAccumulatorOperation(
        instruction.mnemonic,
        this.operandCode(instruction, 0),
      );
    }

    if (instruction.mnemonic in JUMP_CONDITIONS) {
      this.executeJump(instruction.mnemonic);
      return;
    }

    if (instruction.mnemonic in CALL_CONDITIONS) {
      this.executeCall(instruction.mnemonic);
      return;
    }

    if (instruction.mnemonic in RETURN_CONDITIONS) {
      this.executeReturn(instruction.mnemonic);
      return;
    }

    if (IMMEDIATE_ACCUMULATOR_OPERATIONS.has(instruction.mnemonic)) {
      return this.executeImmediateAccumulatorOperation(instruction.mnemonic);
    }

    throw this.error(`Unsupported instruction: ${instruction.mnemonic}`);
  }

  private executeIncrement(destination: number): CpuStepResult["alu"] {
    const alu = this.alu.increment(this.readRegisterCode(destination));

    this.writeRegisterCode(destination, alu.value);
    return alu;
  }

  private executeDecrement(destination: number): CpuStepResult["alu"] {
    const alu = this.alu.decrement(this.readRegisterCode(destination));

    this.writeRegisterCode(destination, alu.value);
    return alu;
  }

  private executeAccumulatorOperation(
    operation: string,
    source: number,
  ): CpuStepResult["alu"] {
    const value = this.readRegisterCode(source);

    if (operation === "ADD") {
      return this.writeAccumulator(this.alu.add(this.registers.a, value));
    }

    if (operation === "ADC") {
      return this.writeAccumulator(
        this.alu.add(this.registers.a, value, this.registers.flags.carry ? 1 : 0),
      );
    }

    if (operation === "SUB") {
      return this.writeAccumulator(this.alu.subtract(this.registers.a, value));
    }

    if (operation === "SBB") {
      return this.writeAccumulator(
        this.alu.subtract(
          this.registers.a,
          value,
          this.registers.flags.carry ? 1 : 0,
        ),
      );
    }

    if (operation === "ANA") {
      return this.writeAccumulator(this.alu.logic("and", this.registers.a, value));
    }

    if (operation === "XRA") {
      return this.writeAccumulator(this.alu.logic("xor", this.registers.a, value));
    }

    if (operation === "ORA") {
      return this.writeAccumulator(this.alu.logic("or", this.registers.a, value));
    }

    return this.alu.compare(this.registers.a, value);
  }

  private executeImmediateAccumulatorOperation(
    operation: string,
  ): CpuStepResult["alu"] {
    const value = this.controlUnit.fetchByte();

    if (operation === "ADI") {
      return this.writeAccumulator(this.alu.add(this.registers.a, value));
    }

    if (operation === "ACI") {
      return this.writeAccumulator(
        this.alu.add(this.registers.a, value, this.registers.flags.carry ? 1 : 0),
      );
    }

    if (operation === "SUI") {
      return this.writeAccumulator(this.alu.subtract(this.registers.a, value));
    }

    if (operation === "SBI") {
      return this.writeAccumulator(
        this.alu.subtract(
          this.registers.a,
          value,
          this.registers.flags.carry ? 1 : 0,
        ),
      );
    }

    if (operation === "ANI") {
      return this.writeAccumulator(this.alu.logic("and", this.registers.a, value));
    }

    if (operation === "XRI") {
      return this.writeAccumulator(this.alu.logic("xor", this.registers.a, value));
    }

    return this.alu.compare(this.registers.a, value);
  }

  private writeAccumulator(alu: NonNullable<CpuStepResult["alu"]>) {
    this.registers.a = alu.value;
    return alu;
  }

  private executeJump(mnemonic: string): void {
    const address = this.controlUnit.fetchWord();

    if (JUMP_CONDITIONS[mnemonic]?.(this.registers)) {
      this.registers.pc = address;
    }
  }

  private executeCall(mnemonic: string): void {
    const address = this.controlUnit.fetchWord();

    if (CALL_CONDITIONS[mnemonic]?.(this.registers)) {
      this.pushWord(this.registers.pc);
      this.registers.pc = address;
    }
  }

  private executeReturn(mnemonic: string): void {
    if (RETURN_CONDITIONS[mnemonic]?.(this.registers)) {
      this.registers.pc = this.popWord();
    }
  }

  private incrementPair(pair: string): void {
    this.registers.setPair(pair, this.registers.getPair(pair) + 1);
  }

  private decrementPair(pair: string): void {
    this.registers.setPair(pair, this.registers.getPair(pair) - 1);
  }

  private doubleAddPair(pair: string): void {
    const result = this.registers.getPair("HL") + this.registers.getPair(pair);

    this.registers.setPair("HL", result);
    this.registers.flags.carry = result > 0xffff;
  }

  private decimalAdjustAccumulator(): void {
    const accumulator = this.registers.a;
    let correction = 0;
    let carry = this.registers.flags.carry;

    if ((accumulator & 0x0f) > 9 || this.registers.flags.auxiliaryCarry) {
      correction |= 0x06;
    }

    if (accumulator > 0x99 || this.registers.flags.carry) {
      correction |= 0x60;
      carry = true;
    }

    const alu = this.alu.add(accumulator, correction);

    this.registers.a = alu.value;
    this.registers.flags.carry = carry;
  }

  private rotateLeft(): void {
    const bit = (this.registers.a >> 7) & 1;

    this.registers.a = lowerByte((this.registers.a << 1) | bit);
    this.registers.flags.carry = bit === 1;
  }

  private rotateRight(): void {
    const bit = this.registers.a & 1;

    this.registers.a = lowerByte((this.registers.a >> 1) | (bit << 7));
    this.registers.flags.carry = bit === 1;
  }

  private rotateLeftThroughCarry(): void {
    const carry = this.registers.flags.carry ? 1 : 0;
    const bit = (this.registers.a >> 7) & 1;

    this.registers.a = lowerByte((this.registers.a << 1) | carry);
    this.registers.flags.carry = bit === 1;
  }

  private rotateRightThroughCarry(): void {
    const carry = this.registers.flags.carry ? 1 : 0;
    const bit = this.registers.a & 1;

    this.registers.a = lowerByte((this.registers.a >> 1) | (carry << 7));
    this.registers.flags.carry = bit === 1;
  }

  private exchangeDeHl(): void {
    const de = this.registers.getPair("DE");

    this.registers.setPair("DE", this.registers.getPair("HL"));
    this.registers.setPair("HL", de);
  }

  private exchangeStackTopWithHl(): void {
    const stackTop = this.bus.readWord(this.registers.sp);

    this.bus.writeWord(this.registers.sp, this.registers.getPair("HL"));
    this.registers.setPair("HL", stackTop);
  }

  private pushWord(value: number): void {
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.bus.writeByte(this.registers.sp, higherByte(value));
    this.registers.sp = (this.registers.sp - 1) & 0xffff;
    this.bus.writeByte(this.registers.sp, lowerByte(value));
  }

  private popWord(): number {
    const low = this.bus.readByte(this.registers.sp);
    const high = this.bus.readByte(this.registers.sp + 1);

    this.registers.sp = (this.registers.sp + 2) & 0xffff;

    return toWord(high, low);
  }

  private readRegisterCode(code: number): number {
    if (code === REGISTER_CODES.M) {
      return this.bus.readByte(this.registers.hlAddress);
    }

    return this.registers.getRegister(registerName(code));
  }

  private writeRegisterCode(code: number, value: number): void {
    if (code === REGISTER_CODES.M) {
      this.bus.writeByte(this.registers.hlAddress, value);
      return;
    }

    this.registers.setRegister(registerName(code), lowerByte(value));
  }

  private operandCode(instruction: DecodedInstruction, index: number): number {
    const operand = instruction.operands[index];

    if (!operand) {
      throw this.error(`Missing operand ${index} for ${instruction.mnemonic}`);
    }

    return this.expectRegisterOperand(instruction, operand).code;
  }

  private operandValue(instruction: DecodedInstruction, index: number): string {
    const operand = instruction.operands[index];

    if (!operand || typeof operand.value !== "string") {
      throw this.error(
        `Expected named operand ${index} for ${instruction.mnemonic}`,
      );
    }

    if (operand.kind === "registerPair" || operand.kind === "registerPairBD") {
      return this.registerPairName(operand.value);
    }

    if (operand.kind === "stackRegisterPair") {
      return operand.value === "PSW"
        ? operand.value
        : this.registerPairName(operand.value);
    }

    return operand.value;
  }

  private registerPairOperandValue(
    instruction: DecodedInstruction,
    index: number,
  ): string {
    return this.operandValue(instruction, index);
  }

  private restartVector(instruction: DecodedInstruction): number {
    const operand = instruction.operands[0];

    if (!operand || operand.kind !== "restartVector") {
      throw this.error("Expected restart vector for RST");
    }

    return operand.value;
  }

  private registerPairName(value: string): string {
    if (value === "B") return "BC";
    if (value === "D") return "DE";
    if (value === "H") return "HL";

    return value;
  }

  private expectRegisterOperand(
    instruction: DecodedInstruction,
    operand: DecodedOperand,
  ): Extract<DecodedOperand, { kind: "register" }> {
    if (operand.kind !== "register") {
      throw this.error(`Expected register operand for ${instruction.mnemonic}`);
    }

    return operand;
  }

  private error(message: string): Error {
    return new SimulatorError(message, { code: "CPU_ERROR", component: "CPU" });
  }
}
