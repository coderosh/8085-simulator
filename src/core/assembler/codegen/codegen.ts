import {
  type CodeGenResult,
  type CodeGenSegment,
  type CodeGenSourceMapEntry,
  type InstructionDefinition,
  type InstructionNode,
  type LabelNode,
  type OrgNode,
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
import { SimulatorError } from "@core/errors";
import { getInstructionDefinition } from "@core/isa";
import { getInstructionSize } from "@core/utils";

export class CodeGen {
  program: ProgramNode;
  bytes: number[] = [];
  entryPoint = 0;
  hasExplicitOrigin = false;
  segments: CodeGenSegment[] = [];
  symbols: Record<string, number> = {};
  sourceMap: CodeGenSourceMapEntry[] = [];
  address = 0;

  constructor(ast: ProgramNode) {
    this.program = ast;
  }

  generate(): CodeGenResult {
    this.collectSymbols(this.program);
    this.bytes = [];
    this.segments = [];
    this.sourceMap = [];
    this.address = 0;

    for (const node of this.program.body) {
      if (node.type === "org") {
        this.address = node.address;
        continue;
      }

      if (node.type !== "instruction") continue;

      this.emitInstruction(node);
    }

    return {
      bytes: this.bytes,
      entryPoint: this.entryPoint,
      hasExplicitOrigin: this.hasExplicitOrigin,
      segments: this.segments,
      symbols: this.symbols,
      sourceMap: this.sourceMap,
    };
  }

  private collectSymbols(node: ProgramNode): void {
    this.symbols = {};
    this.address = 0;
    this.entryPoint = 0;
    this.hasExplicitOrigin = false;
    let hasInstruction = false;

    for (const statement of node.body) {
      if (statement.type === "org") {
        this.validateAddress(statement.address, statement);
        this.address = statement.address;

        if (!this.hasExplicitOrigin) {
          this.entryPoint = statement.address;
          this.hasExplicitOrigin = true;
        }

        continue;
      }

      if (statement.type === "label") {
        if (this.symbols[statement.name] !== undefined) {
          throw this.error(`Duplicate label '${statement.name}'`, statement);
        }

        this.symbols[statement.name] = this.address;
      }

      if (statement.type === "instruction") {
        if (!hasInstruction) {
          this.entryPoint = this.address;
          hasInstruction = true;
        }

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
      this.currentSegment().bytes.push(byte);
      this.sourceMap.push({
        address: this.address,
        byte,
        span: node.span,
      });
      this.address++;
    }
  }

  private currentSegment(): CodeGenSegment {
    const lastSegment = this.segments.at(-1);
    const nextAddress = lastSegment
      ? lastSegment.startAddress + lastSegment.bytes.length
      : undefined;

    if (lastSegment && nextAddress === this.address) {
      return lastSegment;
    }

    const segment = {
      startAddress: this.address,
      bytes: [],
    };

    this.segments.push(segment);
    return segment;
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

      throw this.error(
        `Unsupported operand kind '${expectedKind}'`,
        operand,
      );
  }

  private resolveRegister(operand: Operand): ResolvedOperand {
    if (operand.type !== "register") {
      throw this.error("Expected register operand", operand);
    }

    const code = REGISTER_CODES[operand.value];

    if (code === undefined) {
      throw this.error(`Invalid register '${operand.value}'`, operand);
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
      throw this.error("Expected register pair operand", operand);
    }

    const code = REGISTER_PAIR_CODES[operand.value];

    if (code === undefined || (valid && !valid.includes(operand.value))) {
      throw this.error(
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
      throw this.error("Expected stack register pair operand", operand);
    }

    const code = STACK_REGISTER_PAIR_CODES[operand.value];

    if (code === undefined) {
      throw this.error(
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
      throw this.error(`Expected ${kind} operand`, operand);
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
        throw this.error(`Undefined symbol '${operand.value}'`, operand);
      }

      return value;
    }

    throw this.error("Expected 16-bit value operand", operand);
  }

  private validateNumberRange(
    value: number,
    min: number,
    max: number,
    kind: OperandKind,
    operand: Operand,
  ): void {
    if (value < min || value > max) {
      throw this.error(
        `${kind} operand ${value} is out of range (${min} - ${max})`,
        operand,
      );
    }
  }

  private validateAddress(value: number, node: OrgNode): void {
    if (value < 0 || value > 0xffff) {
      throw this.error(`ORG address ${value} is out of range (0 - 65535)`, node);
    }
  }

  private error(
    message: string,
    node: InstructionNode | LabelNode | OrgNode | Operand,
  ): Error {
    return new SimulatorError(message, {
      code: "CODEGEN_ERROR",
      component: "CodeGen",
      span: node.span,
    });
  }
}
