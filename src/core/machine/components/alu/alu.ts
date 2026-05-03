import { SimulatorError } from "@core/errors";
import { lowerByte } from "@core/utils";
import { Flags } from "../registers";
import type { AluLogicOperation, AluResult } from "./types";

export class ALU {
  private flags: Flags;

  constructor(flags = new Flags()) {
    this.flags = flags;
  }

  add(left: number, right: number, carry = 0): AluResult {
    const result = left + right + carry;
    const value = lowerByte(result);

    this.flags.setZeroSignParity(value);
    this.flags.setAll({
      auxiliaryCarry: (left & 0x0f) + (right & 0x0f) + carry > 0x0f,
      carry: result > 0xff,
    });

    return {
      value,
    };
  }

  subtract(left: number, right: number, borrow = 0): AluResult {
    const result = left - right - borrow;
    const value = lowerByte(result);

    this.flags.setZeroSignParity(value);
    this.flags.setAll({
      auxiliaryCarry: (left & 0x0f) < (right & 0x0f) + borrow,
      carry: result < 0,
    });

    return {
      value,
    };
  }

  increment(value: number): AluResult {
    const result = lowerByte(value + 1);

    this.flags.setZeroSignParity(result);
    this.flags.setAll({
      auxiliaryCarry: (value & 0x0f) + 1 > 0x0f,
    });

    return {
      value: result,
    };
  }

  decrement(value: number): AluResult {
    const result = lowerByte(value - 1);

    this.flags.setZeroSignParity(result);
    this.flags.setAll({
      auxiliaryCarry: (value & 0x0f) === 0,
    });

    return {
      value: result,
    };
  }

  logic(operation: AluLogicOperation, left: number, right: number): AluResult {
    const value = this.logicValue(operation, left, right);

    this.flags.setZeroSignParity(value);
    this.flags.setAll({
      auxiliaryCarry: operation === "and",
      carry: false,
    });

    return {
      value,
    };
  }

  compare(left: number, right: number): AluResult {
    return this.subtract(left, right);
  }

  complement(value: number): AluResult {
    return {
      value: lowerByte(~value),
    };
  }

  private logicValue(
    operation: AluLogicOperation,
    left: number,
    right: number,
  ): number {
    if (operation === "and") return lowerByte(left & right);
    if (operation === "or") return lowerByte(left | right);
    if (operation === "xor") return lowerByte(left ^ right);

    throw this.error(`Unsupported logic operation: ${operation}`);
  }

  private error(message: string): Error {
    return new SimulatorError(message, { code: "ALU_ERROR", component: "ALU" });
  }
}
