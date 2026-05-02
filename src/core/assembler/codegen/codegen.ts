import {
  type CodeGenResult,
  type CodeGenSourceMapEntry,
  type InstructionDefinition,
  type InstructionNode,
  type Operand,
  type OperandKind,
  type ProgramNode,
  type ResolvedOperand,
} from "@core/types";
import {
  REGISTER_CODES,
  REGISTER_PAIR_CODES,
  STACK_REGISTER_PAIR_CODES,
} from "@core/constants";
import { getInstructionDefinition } from "@core/isa";
import { getInstructionSize } from "@core/utils";

export class CodeGen {
  program: ProgramNode;
  bytes: number[] = [];
  symbols: Record<string, number> = {};
  sourceMap: CodeGenSourceMapEntry[] = [];
  address = 0;

  constructor(ast: ProgramNode) {
    this.program = ast;
  }

  generate(): CodeGenResult {
    this.collectSymbols(this.program);
    this.bytes = [];
    this.sourceMap = [];
    this.address = 0;

    for (const node of this.program.body) {
      if (node.type !== "instruction") continue;

      this.emitInstruction(node);
    }

    return {
      bytes: this.bytes,
      symbols: this.symbols,
      sourceMap: this.sourceMap,
    };
  }

  private collectSymbols(node: ProgramNode): void {
    this.symbols = {};
    this.address = 0;

    for (const statement of node.body) {
      if (statement.type === "label") {
        if (this.symbols[statement.name] !== undefined) {
          throw new Error(
            `[CodeGen Error] Duplicate label '${statement.name}' at line ${statement.span.start.line}, col ${statement.span.start.column}`,
          );
        }

        this.symbols[statement.name] = this.address;
      }

      if (statement.type === "instruction") {
        this.address += getInstructionSize(statement);
      }
    }
  }

  private emitInstruction(node: InstructionNode): void {
    const definition = getInstructionDefinition(node.mnemonic);

    if (!definition) {
      throw this.error(`Unsupported instruction '${node.mnemonic}'`, node);
    }

    const operands = this.resolveOperands(node, definition);
    this.emitBytes(this.encodeInstruction(node, definition, operands), node);
  }

  private encodeInstruction(
    node: InstructionNode,
    definition: InstructionDefinition,
    operands: ResolvedOperand[],
  ): number[] {
    try {
      return definition.encode(operands);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw this.error(message, node);
    }
  }

  private emitBytes(bytes: number[], node: InstructionNode): void {
    for (const byte of bytes) {
      this.bytes.push(byte);
      this.sourceMap.push({
        address: this.address,
        byte,
        span: node.span,
      });
      this.address++;
    }
  }

  private resolveOperands(
    node: InstructionNode,
    definition: InstructionDefinition,
  ): ResolvedOperand[] {
    if (node.operands.length !== definition.operands.length) {
      throw this.error(
        `Expected ${definition.operands.length} operands for '${node.mnemonic}', got ${node.operands.length}`,
        node,
      );
    }

    return node.operands.map((operand, index) =>
      this.resolveOperand(operand, definition.operands[index]),
    );
  }

  private resolveOperand(
    operand: Operand,
    expectedKind: OperandKind,
  ): ResolvedOperand {
    if (expectedKind === "register") {
      return this.resolveRegister(operand);
    }

    if (expectedKind === "registerPair") {
      return this.resolveRegisterPair(operand);
    }

    if (expectedKind === "registerPairBD") {
      return this.resolveRegisterPair(operand, ["B", "D"]);
    }

    if (expectedKind === "stackRegisterPair") {
      return this.resolveStackRegisterPair(operand);
    }

    if (
      expectedKind === "byte" ||
      expectedKind === "port" ||
      expectedKind === "restartVector"
    ) {
      return this.resolveNumberOperand(operand, expectedKind);
    }

    if (expectedKind === "word" || expectedKind === "address") {
      return this.resolveWordOperand(operand, expectedKind);
    }

    throw new Error(
      `[CodeGen Error] Unsupported operand kind '${expectedKind}' at line ${operand.span.start.line}, col ${operand.span.start.column}`,
    );
  }

  private resolveRegister(operand: Operand): ResolvedOperand {
    if (operand.type !== "register") {
      throw this.operandError("Expected register operand", operand);
    }

    const code = REGISTER_CODES[operand.value];

    if (code === undefined) {
      throw this.operandError(`Invalid register '${operand.value}'`, operand);
    }

    return {
      kind: "register",
      value: operand.value,
      code,
    };
  }

  private resolveRegisterPair(
    operand: Operand,
    valid?: string[],
  ): ResolvedOperand {
    if (operand.type !== "register") {
      throw this.operandError("Expected register pair operand", operand);
    }

    const code = REGISTER_PAIR_CODES[operand.value];

    if (code === undefined || (valid && !valid.includes(operand.value))) {
      throw this.operandError(
        `Invalid register pair '${operand.value}'`,
        operand,
      );
    }

    return {
      kind: "registerPair",
      value: operand.value,
      code,
    };
  }

  private resolveStackRegisterPair(operand: Operand): ResolvedOperand {
    if (operand.type !== "register") {
      throw this.operandError("Expected stack register pair operand", operand);
    }

    const code = STACK_REGISTER_PAIR_CODES[operand.value];

    if (code === undefined) {
      throw this.operandError(
        `Invalid stack register pair '${operand.value}'`,
        operand,
      );
    }

    return {
      kind: "stackRegisterPair",
      value: operand.value,
      code,
    };
  }

  private resolveNumberOperand(
    operand: Operand,
    kind: "byte" | "port" | "restartVector",
  ): ResolvedOperand {
    if (operand.type !== "number") {
      throw this.operandError(`Expected ${kind} operand`, operand);
    }

    const max = kind === "restartVector" ? 7 : 0xff;
    this.validateNumberRange(operand.value, 0, max, kind, operand);

    return {
      kind,
      value: operand.value,
      code: operand.value,
    };
  }

  private resolveWordOperand(
    operand: Operand,
    kind: "word" | "address",
  ): ResolvedOperand {
    const value = this.resolveWordValue(operand);
    this.validateNumberRange(value, 0, 0xffff, kind, operand);

    return {
      kind,
      value,
      code: value,
    };
  }

  private resolveWordValue(operand: Operand): number {
    if (operand.type === "number") {
      return operand.value;
    }

    if (operand.type === "identifier") {
      const value = this.symbols[operand.value];

      if (value === undefined) {
        throw this.operandError(`Undefined symbol '${operand.value}'`, operand);
      }

      return value;
    }

    throw this.operandError("Expected 16-bit value operand", operand);
  }

  private validateNumberRange(
    value: number,
    min: number,
    max: number,
    kind: OperandKind,
    operand: Operand,
  ): void {
    if (value < min || value > max) {
      throw this.operandError(
        `${kind} operand ${value} is out of range (${min} - ${max})`,
        operand,
      );
    }
  }

  private operandError(message: string, operand: Operand): Error {
    return new Error(
      `[CodeGen Error] ${message} at line ${operand.span.start.line}, col ${operand.span.start.column}`,
    );
  }

  private error(message: string, node: InstructionNode): Error {
    return new Error(
      `[CodeGen Error] ${message} at line ${node.span.start.line}, col ${node.span.start.column}`,
    );
  }
}
