import type { SourceSpan } from "./source";

export interface CodeGenResult {
  bytes: number[];
  symbols: Record<string, number>;
  sourceMap: CodeGenSourceMapEntry[];
}

export interface CodeGenSourceMapEntry {
  address: number;
  byte: number;
  span: SourceSpan;
}
