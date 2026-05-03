import type { SourceSpan } from "./source";

export interface CodeGenResult {
  bytes: number[];
  entryPoint: number;
  hasExplicitOrigin: boolean;
  segments: CodeGenSegment[];
  symbols: Record<string, number>;
  sourceMap: CodeGenSourceMapEntry[];
}

export interface CodeGenSegment {
  startAddress: number;
  bytes: number[];
}

export interface CodeGenSourceMapEntry {
  address: number;
  byte: number;
  span: SourceSpan;
}
