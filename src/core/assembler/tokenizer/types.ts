export type TokenType =
  | "mnemonic"
  | "register"
  | "number"
  | "identifier"
  | "comma"
  | "colon"
  | "eof";

export interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}

export interface SourceSpan {
  start: SourcePosition;
  end: SourcePosition;
}

export interface Token {
  type: TokenType;
  value: string;
  span: SourceSpan;
}
