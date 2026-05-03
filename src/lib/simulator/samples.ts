export type AssemblySample = {
  name: string;
  description: string;
  source: string;
};

export const samples: AssemblySample[] = [
  {
    name: "Add and Store",
    description: "Move values, add, increment, and store.",
    source: `MVI A, 32H
MVI B, 14H
ADD B
INR A
STA 2000H
HLT`,
  },
  {
    name: "Counter Loop",
    description: "A tiny decrement loop with a label.",
    source: `MVI C, 05H
LOOP: DCR C
JNZ LOOP
HLT`,
  },
  {
    name: "Register Pair",
    description: "Load a pair and move through memory.",
    source: `LXI H, 2400H
MVI M, 7FH
INX H
MVI M, 80H
HLT`,
  },
];
