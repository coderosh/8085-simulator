import type { SourceSpan } from "./source";

export type Node = ProgramNode | LabelNode | InstructionNode;

export interface ProgramNode {
  type: "program";
  span: SourceSpan;
  body: Node[];
}

export interface LabelNode {
  type: "label";
  span: SourceSpan;
  name: string;
}

export interface InstructionNode {
  type: "instruction";
  span: SourceSpan;
  mnemonic: string;
  operands: Operand[];
}

export type Operand =
  | { type: "register"; span: SourceSpan; value: string }
  | { type: "number"; span: SourceSpan; value: number }
  | { type: "identifier"; span: SourceSpan; value: string };
