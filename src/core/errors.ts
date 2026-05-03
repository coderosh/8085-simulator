import type { SourcePosition, SourceSpan } from "@core/types";

export type ErrorSeverity = "error" | "warning" | "info";

export type SimulatorErrorMetadata = {
  code?: string;
  component: string;
  details?: Record<string, unknown>;
  severity?: ErrorSeverity;
  span?: SourceSpan;
};

export class SimulatorError extends Error {
  readonly code?: string;
  readonly component: string;
  readonly details?: Record<string, unknown>;
  readonly severity: ErrorSeverity;
  readonly span?: SourceSpan;

  constructor(message: string, metadata: SimulatorErrorMetadata) {
    super(message);
    this.name = "SimulatorError";
    this.code = metadata.code;
    this.component = metadata.component;
    this.details = metadata.details;
    this.severity = metadata.severity ?? "error";
    this.span = metadata.span;
  }

  get location(): SourcePosition | undefined {
    return this.span?.start;
  }

  toString(): string {
    const location = this.location
      ? ` at line ${this.location.line}, col ${this.location.column}`
      : "";
    const code = this.code ? ` ${this.code}` : "";

    return `[${this.component} Error${code}] ${this.message}${location}`;
  }
}

export function isSimulatorError(error: unknown): error is SimulatorError {
  return error instanceof SimulatorError;
}

export function spanAt(position: SourcePosition, width = 1): SourceSpan {
  return {
    start: position,
    end: {
      offset: position.offset + width,
      line: position.line,
      column: position.column + width,
    },
  };
}
