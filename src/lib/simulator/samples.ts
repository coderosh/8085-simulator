export type AssemblySample = {
  name: string;
  description: string;
  source: string;
};

export const samples: AssemblySample[] = [
  {
    name: "Add and Store",
    description: "Move values, add, increment, and store.",
    source: `; A = 32H + 14H + 1, then store it at 2000H
MVI A, 32H
MVI B, 14H
ADD B
INR A
STA 2000H
HLT`,
  },
  {
    name: "Counter Loop",
    description: "A tiny decrement loop with a label.",
    source: `; Count C down to zero
MVI C, 05H
LOOP: DCR C
JNZ LOOP
HLT`,
  },
  {
    name: "Register Pair",
    description: "Load a pair and move through memory.",
    source: `; Store two bytes by walking HL through memory
LXI H, 2400H
MVI M, 7FH
INX H
MVI M, 80H
HLT`,
  },
  {
    name: "Fill Memory",
    description: "Fill a block using M, HL, and a counted loop.",
    source: `; Write eight copies of 55H starting at 2200H
LXI H, 2200H
MVI C, 08H
MVI A, 55H
FILL: MOV M, A
INX H
DCR C
JNZ FILL
HLT`,
  },
  {
    name: "Sum Memory",
    description: "Create a small table, sum it, and save the result.",
    source: `; Build 03H, 05H, 07H at 2300H and store their sum at 2310H
LXI H, 2300H
MVI M, 03H
INX H
MVI M, 05H
INX H
MVI M, 07H
LXI H, 2300H
MVI C, 03H
XRA A
SUM: ADD M
INX H
DCR C
JNZ SUM
STA 2310H
HLT`,
  },
  {
    name: "Stack Swap",
    description: "Use PUSH and POP to exchange register pairs.",
    source: `; Swap BC and DE through the stack
LXI SP, 0FFF0H
LXI B, 1234H
LXI D, 0ABCDH
PUSH B
PUSH D
POP B
POP D
HLT`,
  },
  {
    name: "Subroutine Stack",
    description: "Call a routine, preserve registers, and return.",
    source: `; Add B into A inside a subroutine, save it, then send it to port 03H
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
RET`,
  },
  {
    name: "I/O Echo",
    description: "Read a port, mirror it to another port, and keep a memory copy.",
    source: `; Read port 01H, write the same value to port 02H, and save it
IN 01H
OUT 02H
STA 2600H
HLT`,
  },
  {
    name: "I/O Bit Mask",
    description: "Mask input bits, rotate them, and output the transformed value.",
    source: `; Keep the low nibble from port 04H, rotate it left, and output to port 05H
IN 04H
ANI 0FH
RLC
OUT 05H
STA 2700H
HLT`,
  },
  {
    name: "16-bit Memory Copy",
    description: "Use LHLD, SHLD, and XCHG with word-sized data.",
    source: `; Store HL at 2800H, load it back, exchange with DE, and copy to 2810H
LXI H, 3456H
SHLD 2800H
LHLD 2800H
LXI D, 789AH
XCHG
SHLD 2810H
HLT`,
  },
  {
    name: "Interrupt Pending",
    description: "Read interrupt status with RIM and branch when a request is pending.",
    source: `; In the CPU panel, click Request on RST 5.5 or RST 7.5 before stepping RIM
EI
RIM
STA 2900H
ANI 70H
JZ IDLE
MVI B, 01H
JMP DONE
IDLE: MVI B, 00H
DONE: HLT`,
  },
];
