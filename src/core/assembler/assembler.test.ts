import { describe, expect, it } from "vitest";

import { assemble } from "./assembler";

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
});
