import { describe, expect, it } from "vitest";

import { assemble } from "./assembler";
import { formatProgram } from "./formatter";
import { Parser } from "./parser";
import { Tokenizer } from "./tokenizer";

describe("Assembler", () => {
  it("uses ORG as the address for labels, source map entries, and entry point", () => {
    const result = assemble(`ORG 2000H
START: MVI C, 02H
LOOP: DCR C
JNZ LOOP
HLT`);

    expect(result.entryPoint).toBe(0x2000);
    expect(result.hasExplicitOrigin).toBe(true);
    expect(result.symbols).toMatchObject({
      START: 0x2000,
      LOOP: 0x2002,
    });
    expect(result.sourceMap.map((entry) => entry.address)).toEqual([
      0x2000,
      0x2001,
      0x2002,
      0x2003,
      0x2004,
      0x2005,
      0x2006,
    ]);
    expect(result.bytes).toEqual([
      0x0e,
      0x02,
      0x0d,
      0xc2,
      0x02,
      0x20,
      0x76,
    ]);
  });

  it("emits separate segments when ORG moves the assembly address", () => {
    const result = assemble(`ORG 2000H
MVI A, 11H
ORG 2010H
HLT`);

    expect(result.segments).toEqual([
      {
        startAddress: 0x2000,
        bytes: [0x3e, 0x11],
      },
      {
        startAddress: 0x2010,
        bytes: [0x76],
      },
    ]);
    expect(result.bytes).toEqual([0x3e, 0x11, 0x76]);
  });

  it("ignores comments by default", () => {
    const tokens = new Tokenizer(`; leading
MVI A, 01H ; inline
; standalone
HLT`).getAllTokens();

    expect(tokens.map((token) => token.type)).not.toContain("comment");
    expect(assemble(`; leading
MVI A, 01H ; inline
; standalone
HLT`).bytes).toEqual([0x3e, 0x01, 0x76]);
  });

  it("captures comment tokens with spans when requested", () => {
    const tokens = new Tokenizer(`MVI A, 01H ; inline
; standalone`, {
      captureComments: true,
    }).getAllTokens();
    const comments = tokens.filter((token) => token.type === "comment");

    expect(comments).toHaveLength(2);
    expect(comments[0]).toMatchObject({
      value: "; inline",
      span: { start: { line: 1, column: 12 } },
    });
    expect(comments[1]).toMatchObject({
      value: "; standalone",
      span: { start: { line: 2, column: 1 } },
    });
  });

  it("captures parser comments with inline and own-line placement", () => {
    const tokens = new Tokenizer(`; header
MVI A, 01H ; inline

; before halt
HLT ; done`, { captureComments: true }).getAllTokens();
    const ast = new Parser(tokens, { captureComments: true }).parse();

    expect(ast.body.map((node) => node.type)).toEqual([
      "instruction",
      "instruction",
    ]);
    expect(ast.comments).toEqual([
      expect.objectContaining({
        value: "; header",
        placement: "ownLine",
      }),
      expect.objectContaining({
        value: "; inline",
        placement: "inline",
        afterNodeIndex: 0,
      }),
      expect.objectContaining({
        value: "; before halt",
        placement: "ownLine",
      }),
      expect.objectContaining({
        value: "; done",
        placement: "inline",
        afterNodeIndex: 1,
      }),
    ]);
  });

  it("formats labels, instructions, directives, and comments from the AST", () => {
    const ast = parseWithComments(`;header
ORG 2000H; origin
START:MVI A,01H;load accumulator
LOOP: DCR A
JNZ LOOP ;repeat
; done next
HLT`);

    expect(formatProgram(ast)).toBe(`; header
          ORG 2000H            ; origin
START:    MVI A, 01H           ; load accumulator
LOOP:     DCR A
          JNZ LOOP             ; repeat
; done next
          HLT`);
  });

  it("formats with caller-provided settings", () => {
    const ast = parseWithComments(`Start: MVI A, 01H ; Load
JNZ Start`);

    expect(
      formatProgram(ast, {
        identifierCase: "lower",
        inlineCommentColumn: 24,
        instructionCase: "lower",
        labelMode: "ownLine",
        numberBase: "decimal",
        registerCase: "lower",
      }),
    ).toBe(`start:
          mvi a, 1     ; Load
          jnz start`);
  });

  it("keeps formatted source parseable when hexadecimal values contain leading zeroes", () => {
    const source = `; Add B into A inside a subroutine, save it, then send it to port 03H
LXI SP, 0FFF0H
MVI A, 09H
MVI B, 04H
CALL ADD_AND_SAVE
OUT 03H
HLT
ADD_AND_SAVE: PUSH B
ADD B
STA 2500H
POP B
RET`;
    const formatted = formatProgram(parseWithComments(source));

    expect(() => parseWithComments(formatted)).not.toThrow();
    expect(formatProgram(parseWithComments(formatted))).toBe(formatted);
  });
});

function parseWithComments(source: string) {
  return new Parser(
    new Tokenizer(source, { captureComments: true }).getAllTokens(),
    { captureComments: true },
  ).parse();
}
