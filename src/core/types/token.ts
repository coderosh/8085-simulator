import type { SourceSpan } from "./source";

export type TokenType =
  | "directive"
  | "mnemonic"
  | "register"
  | "number"
  | "identifier"
  | "comma"
  | "colon"
  | "eof";

export interface Token {
  type: TokenType;
  value: string;
  span: SourceSpan;
}
