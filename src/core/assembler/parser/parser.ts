import type {
  LabelNode,
  ProgramNode,
  Node,
  InstructionNode,
  Operand,
  SourceSpan,
  Token,
} from "@core/types";

export class Parser {
  private tokens: Token[];
  private cursor: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.cursor = 0;
  }

  parse(): ProgramNode {
    const body = [];
    const start = this.peek().span.start;

    while (!this.isAtEnd()) {
      const node = this.parseStatement();
      if (node) body.push(node);
    }

    return {
      type: "program",
      span: {
        start,
        end: body.at(-1)?.span.end ?? this.peek().span.end,
      },
      body,
    };
  }

  private parseStatement(): Node | null {
    if (this.match("identifier") && this.check("colon")) {
      return this.parseLabel();
    }

    if (this.check("mnemonic")) {
      return this.parseInstruction();
    }

    throw this.error("Unexpected token, expected label or instruction");
  }

  private parseInstruction(): InstructionNode {
    const mnemonicToken = this.eat(
      "mnemonic",
      "Expected instruction mnemonic",
    );
    const mnemonic = mnemonicToken.value;

    const operands = [];

    if (this.isOperandStart() && !this.isLabelStart()) {
      operands.push(this.parseOperand());

      while (this.match("comma")) {
        operands.push(this.parseOperand());
      }
    }

    return {
      type: "instruction",
      span: this.spanFrom(
        mnemonicToken.span,
        operands.at(-1)?.span ?? mnemonicToken.span,
      ),
      mnemonic,
      operands,
    };
  }

  private parseOperand(): Operand {
    if (this.match("register")) {
      const token = this.previous();
      return { type: "register", span: token.span, value: token.value };
    }

    if (this.match("number")) {
      const token = this.previous();
      return {
        type: "number",
        span: token.span,
        value: this.parseNumberLiteral(token.value),
      };
    }

    if (this.match("identifier")) {
      const token = this.previous();
      return { type: "identifier", span: token.span, value: token.value };
    }

    throw this.error(`Invalid operand`);
  }

  private parseLabel(): LabelNode {
    const nameToken = this.previous();
    const colonToken = this.eat("colon", "Expected ':' after label name");
    return {
      type: "label",
      span: this.spanFrom(nameToken.span, colonToken.span),
      name: nameToken.value,
    };
  }

  private peek(): Token {
    return this.tokens[this.cursor];
  }
  private match(type: Token["type"]): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private eat(type: Token["type"], message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(message);
  }

  private check(type: Token["type"]): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkNext(type: Token["type"]): boolean {
    if (this.cursor + 1 >= this.tokens.length) return false;
    return this.tokens[this.cursor + 1].type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.cursor++;
    return this.previous();
  }

  private previous(): Token {
    return this.tokens[this.cursor - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === "eof";
  }

  private isOperandStart(): boolean {
    return (
      this.check("register") || this.check("number") || this.check("identifier")
    );
  }

  private isLabelStart(): boolean {
    return this.check("identifier") && this.checkNext("colon");
  }

  private error(msg: string): Error {
    const token = this.peek();
    return new Error(
      `[Parser Error] ${msg} at line ${token.span.start.line}, col ${token.span.start.column}, token=${token.type}:${token.value}`,
    );
  }

  private spanFrom(start: SourceSpan, end: SourceSpan): SourceSpan {
    return {
      start: start.start,
      end: end.end,
    };
  }

  private parseNumberLiteral(value: string): number {
    if (value.endsWith("H")) {
      return Number.parseInt(value.slice(0, -1), 16);
    }

    return Number(value);
  }
}
