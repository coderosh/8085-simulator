import type {
  CommentNode,
  LabelNode,
  OrgNode,
  ProgramNode,
  Node,
  InstructionNode,
  Operand,
  SourceSpan,
  Token,
} from "@core/types";
import { SimulatorError } from "@core/errors";

export type ParserOptions = {
  captureComments?: boolean;
};

export class Parser {
  private tokens: Token[];
  private cursor: number;
  private comments: CommentNode[] = [];
  private options: ParserOptions;

  constructor(tokens: Token[], options: ParserOptions = {}) {
    this.tokens = tokens;
    this.cursor = 0;
    this.options = options;
  }

  parse(): ProgramNode {
    const body: Node[] = [];
    const start = this.peek().span.start;

    while (!this.isAtEnd()) {
      const node = this.parseStatement(body.at(-1), body.length - 1);
      if (node) body.push(node);
    }

    const lastBodyEnd = body.at(-1)?.span.end;
    const lastCommentEnd = this.comments.at(-1)?.span.end;
    const end =
      lastBodyEnd && lastCommentEnd
        ? lastBodyEnd.offset > lastCommentEnd.offset
          ? lastBodyEnd
          : lastCommentEnd
        : lastBodyEnd ?? lastCommentEnd ?? this.peek().span.end;

    const program: ProgramNode = {
      type: "program",
      span: {
        start,
        end,
      },
      body,
    };

    if (this.options.captureComments) {
      program.comments = this.comments;
    }

    return program;
  }

  private parseStatement(previousNode: Node | undefined, previousNodeIndex: number): Node | null {
    if (this.check("comment")) {
      this.parseComment(previousNode, previousNodeIndex);
      return null;
    }

    if (this.match("identifier") && this.check("colon")) {
      return this.parseLabel();
    }

    if (this.check("mnemonic")) {
      return this.parseInstruction();
    }

    if (this.check("directive")) {
      return this.parseDirective();
    }

    throw this.error("Unexpected token, expected label, instruction, or directive");
  }

  private parseDirective(): OrgNode {
    const directiveToken = this.eat("directive", "Expected assembler directive");

    if (directiveToken.value !== "ORG") {
      throw this.error(`Unsupported directive '${directiveToken.value}'`);
    }

    const address = this.parseOperand();

    if (address.type !== "number") {
      throw this.error("ORG expects a numeric address");
    }

    return {
      type: "org",
      span: this.spanFrom(directiveToken.span, address.span),
      address: address.value,
    };
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

  private parseComment(
    previousNode: Node | undefined,
    previousNodeIndex: number,
  ): void {
    const token = this.eat("comment", "Expected comment");

    if (!this.options.captureComments) {
      return;
    }

    const isInline =
      previousNode !== undefined &&
      previousNode.span.end.line === token.span.start.line &&
      previousNode.span.end.column <= token.span.start.column;

    this.comments.push({
      type: "comment",
      span: token.span,
      value: token.value,
      placement: isInline ? "inline" : "ownLine",
      ...(isInline ? { afterNodeIndex: previousNodeIndex } : {}),
    });
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

  private error(message: string): Error {
    const token = this.peek();
    return new SimulatorError(message, {
      code: "PARSER_ERROR",
      component: "Parser",
      details: {
        token: `${token.type}:${token.value}`,
      },
      span: token.span,
    });
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
