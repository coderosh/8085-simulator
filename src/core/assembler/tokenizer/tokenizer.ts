import { MNEMONICS, REGISTERS } from "@core/constants";
import type { SourcePosition, Token, TokenType } from "@core/types";

const DIRECTIVES = new Set(["ORG"]);

export class Tokenizer {
  private cursor = 0;
  private line = 1;
  private column = 1;
  private input: string;

  constructor(input: string) {
    this.input = input;
  }

  getAllTokens(): Token[] {
    const tokens: Token[] = [];

    while (true) {
      const token = this.next();
      tokens.push(token);

      if (token.type === "eof") break;
    }

    return tokens;
  }

  next(): Token {
    this.skipTrivia();

    if (this.isEOF()) {
      return this.makeToken("eof", "", this.currentPosition());
    }

    if (this.peek() === ",") {
      const start = this.currentPosition();
      return this.makeToken("comma", this.advance(), start);
    }

    if (this.peek() === ":") {
      const start = this.currentPosition();
      return this.makeToken("colon", this.advance(), start);
    }

    if (this.isNumber(this.peek())) {
      return this.readNumber();
    }

    if (this.isAlpha(this.peek())) {
      return this.readWord();
    }

    throw this.error(`Unexpected character '${this.peek()}'`);
  }

  private isEOF(): boolean {
    return this.cursor >= this.input.length;
  }

  private peek(): string {
    return this.input[this.cursor];
  }

  private advance(): string {
    const char = this.peek();

    if (this.isCRLF()) {
      this.cursor += 2;
      this.line++;
      this.column = 1;
      return "\r\n";
    }

    this.cursor++;

    if (this.isLineBreak(char)) {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }

    return char;
  }

  private currentPosition(): SourcePosition {
    return {
      offset: this.cursor,
      line: this.line,
      column: this.column,
    };
  }

  private makeToken(
    type: TokenType,
    value: string,
    start: SourcePosition,
  ): Token {
    return {
      type,
      value,
      span: {
        start,
        end: this.currentPosition(),
      },
    };
  }

  private readNumber(): Token {
    const start = this.currentPosition();
    let number = "";

    while (!this.isEOF() && this.isNumberLiteralCharacter(this.peek())) {
      number += this.advance();
    }

    if (!this.isEOF() && (this.peek() === "h" || this.peek() === "H")) {
      number += this.advance().toUpperCase();
      return this.makeToken("number", number, start);
    }

    if (this.containsHexLetter(number)) {
      throw this.error(`Invalid hexadecimal literal '${number}'`, start);
    }

    return this.makeToken("number", number, start);
  }

  private readWord(): Token {
    const start = this.currentPosition();
    let word = "";

    while (!this.isEOF() && this.isAlpha(this.peek())) {
      word += this.advance();
    }

    const upper = word.toUpperCase();

    if (REGISTERS.has(upper)) {
      return this.makeToken("register", upper, start);
    }

    if (DIRECTIVES.has(upper)) {
      return this.makeToken("directive", upper, start);
    }

    if (MNEMONICS.has(upper)) {
      return this.makeToken("mnemonic", upper, start);
    }

    return this.makeToken("identifier", word, start);
  }

  private skipTrivia(): void {
    while (!this.isEOF()) {
      if (this.isWhitespace(this.peek())) {
        this.skipWhitespace();
        continue;
      }

      if (this.peek() === ";") {
        this.skipComment();
        continue;
      }

      break;
    }
  }

  private skipWhitespace(): void {
    while (!this.isEOF() && this.isWhitespace(this.peek())) {
      this.advance();
    }
  }

  private skipComment(): void {
    while (!this.isEOF() && !this.isLineBreak(this.peek())) {
      this.advance();
    }
  }

  private isWhitespace(char: string): boolean {
    return char === " " || char === "\t" || this.isLineBreak(char);
  }

  private isCRLF(): boolean {
    return (
      this.peek() === "\r" && this.input[this.cursor + 1] === "\n"
    );
  }

  private isLineBreak(char: string): boolean {
    return char === "\n" || char === "\r";
  }

  private isNumber(char: string): boolean {
    return char >= "0" && char <= "9";
  }

  private isNumberLiteralCharacter(char: string): boolean {
    return this.isNumber(char) || this.isHexLetter(char);
  }

  private containsHexLetter(value: string): boolean {
    for (const char of value) {
      if (this.isHexLetter(char)) {
        return true;
      }
    }

    return false;
  }

  private isHexLetter(char: string): boolean {
    return (char >= "a" && char <= "f") || (char >= "A" && char <= "F");
  }

  private isAlpha(char: string): boolean {
    return (
      (char >= "a" && char <= "z") ||
      (char >= "A" && char <= "Z") ||
      char === "_"
    );
  }

  private error(msg: string, position = this.currentPosition()): Error {
    return new Error(
      `[Tokenizer Error] ${msg} at line ${position.line}, col ${position.column}`,
    );
  }
}
