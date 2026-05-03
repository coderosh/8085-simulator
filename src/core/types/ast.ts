import type { SourceSpan } from "./source";

export type Node = ProgramNode | LabelNode | InstructionNode | OrgNode;

export type CommentPlacement = "inline" | "ownLine";

export interface ProgramNode {
  type: "program";
  span: SourceSpan;
  body: Node[];
  comments?: CommentNode[];
}

export interface CommentNode {
  type: "comment";
  span: SourceSpan;
  value: string;
  placement: CommentPlacement;
  afterNodeIndex?: number;
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

export interface OrgNode {
  type: "org";
  span: SourceSpan;
  address: number;
}

export type Operand =
  | { type: "register"; span: SourceSpan; value: string }
  | { type: "number"; span: SourceSpan; value: number }
  | { type: "identifier"; span: SourceSpan; value: string };
