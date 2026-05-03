import { BASE_CODE, OP_CODE, REGISTER_CODES } from "@core/constants";
import type { InstructionDefinition } from "@core/types";
import { higherByte, lowerByte } from "@core/utils";
import {
  byteImmediate,
  encodeRegisterCode,
  encodeRegisterPairCode,
  oneByte,
  registerOpcode,
  registerPairShiftOpcode,
  registerShiftOpcode,
  wordImmediate,
} from "./utils";

export const INSTRUCTION_SET = {
  // DATA TRANSFER
  MOV: {
    mnemonic: "MOV",
    operands: ["register", "register"],
    size: 1,
    encode: ([dest, src]) => {
      if (dest.code === REGISTER_CODES.M && src.code === REGISTER_CODES.M) {
        throw new Error("MOV M, M is not a valid instruction");
      }

      /**
       * MOV:   01 000 000
       * DEST:     xxx 000 -- need to shift left by 3
       * SRC:      000 xxx
       */
      return [BASE_CODE.MOV | encodeRegisterCode(dest.code) | src.code];
    },
  },
  MVI: {
    mnemonic: "MVI",
    operands: ["register", "byte"],
    size: 2,
    encode: ([dest, value]) => [
      BASE_CODE.MVI | encodeRegisterCode(dest.code),
      lowerByte(value.code),
    ],
  },
  LXI: {
    mnemonic: "LXI",
    operands: ["registerPair", "word"],
    size: 3,
    encode: ([dest, value]) => {
      /**
       * LXI:   00 00 0001
       * DEST:     xx 0000 -- need to shift left by 4
       *
       * LOW:      xxxxxxxx  (low byte of immediate)
       * HIGH:     xxxxxxxx  (high byte of immediate)
       */
      return [
        BASE_CODE.LXI | encodeRegisterPairCode(dest.code),
        lowerByte(value.code),
        higherByte(value.code),
      ];
    },
  },
  LDA: {
    mnemonic: "LDA",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.LDA),
  },
  LDAX: {
    mnemonic: "LDAX",
    operands: ["registerPairBD"],
    size: 1,
    encode: registerPairShiftOpcode(BASE_CODE.LDAX),
  },
  LHLD: {
    mnemonic: "LHLD",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.LHLD),
  },
  STA: {
    mnemonic: "STA",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.STA),
  },
  STAX: {
    mnemonic: "STAX",
    operands: ["registerPairBD"],
    size: 1,
    encode: registerPairShiftOpcode(BASE_CODE.STAX),
  },
  SHLD: {
    mnemonic: "SHLD",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.SHLD),
  },
  XCHG: {
    mnemonic: "XCHG",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.XCHG),
  },

  // ARITHMETIC
  ADD: {
    mnemonic: "ADD",
    operands: ["register"],
    size: 1,
    encode: registerOpcode(BASE_CODE.ADD),
  },
  ADC: {
    mnemonic: "ADC",
    operands: ["register"],
    size: 1,
    encode: registerOpcode(BASE_CODE.ADC),
  },
  SUB: {
    mnemonic: "SUB",
    operands: ["register"],
    size: 1,
    encode: registerOpcode(BASE_CODE.SUB),
  },
  SBB: {
    mnemonic: "SBB",
    operands: ["register"],
    size: 1,
    encode: registerOpcode(BASE_CODE.SBB),
  },
  ACI: {
    mnemonic: "ACI",
    operands: ["byte"],
    size: 2,
    encode: byteImmediate(OP_CODE.ACI),
  },
  ADI: {
    mnemonic: "ADI",
    operands: ["byte"],
    size: 2,
    encode: byteImmediate(OP_CODE.ADI),
  },
  DAD: {
    mnemonic: "DAD",
    operands: ["registerPair"],
    size: 1,
    encode: registerPairShiftOpcode(BASE_CODE.DAD),
  },
  SUI: {
    mnemonic: "SUI",
    operands: ["byte"],
    size: 2,
    encode: byteImmediate(OP_CODE.SUI),
  },
  SBI: {
    mnemonic: "SBI",
    operands: ["byte"],
    size: 2,
    encode: byteImmediate(OP_CODE.SBI),
  },
  INR: {
    mnemonic: "INR",
    operands: ["register"],
    size: 1,
    encode: registerShiftOpcode(BASE_CODE.INR),
  },
  INX: {
    mnemonic: "INX",
    operands: ["registerPair"],
    size: 1,
    encode: registerPairShiftOpcode(BASE_CODE.INX),
  },
  DCR: {
    mnemonic: "DCR",
    operands: ["register"],
    size: 1,
    encode: registerShiftOpcode(BASE_CODE.DCR),
  },
  DCX: {
    mnemonic: "DCX",
    operands: ["registerPair"],
    size: 1,
    encode: registerPairShiftOpcode(BASE_CODE.DCX),
  },
  DAA: {
    mnemonic: "DAA",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.DAA),
  },

  // LOGICAL
  ANA: {
    mnemonic: "ANA",
    operands: ["register"],
    size: 1,
    encode: registerOpcode(BASE_CODE.ANA),
  },
  ANI: {
    mnemonic: "ANI",
    operands: ["byte"],
    size: 2,
    encode: byteImmediate(OP_CODE.ANI),
  },
  ORA: {
    mnemonic: "ORA",
    operands: ["register"],
    size: 1,
    encode: registerOpcode(BASE_CODE.ORA),
  },
  XRA: {
    mnemonic: "XRA",
    operands: ["register"],
    size: 1,
    encode: registerOpcode(BASE_CODE.XRA),
  },
  XRI: {
    mnemonic: "XRI",
    operands: ["byte"],
    size: 2,
    encode: byteImmediate(OP_CODE.XRI),
  },
  CMA: {
    mnemonic: "CMA",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.CMA),
  },
  CMC: {
    mnemonic: "CMC",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.CMC),
  },
  STC: {
    mnemonic: "STC",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.STC),
  },
  CMP: {
    mnemonic: "CMP",
    operands: ["register"],
    size: 1,
    encode: registerOpcode(BASE_CODE.CMP),
  },
  CPI: {
    mnemonic: "CPI",
    operands: ["byte"],
    size: 2,
    encode: byteImmediate(OP_CODE.CPI),
  },
  RLC: {
    mnemonic: "RLC",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.RLC),
  },
  RRC: {
    mnemonic: "RRC",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.RRC),
  },
  RAL: {
    mnemonic: "RAL",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.RAL),
  },
  RAR: {
    mnemonic: "RAR",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.RAR),
  },

  // BRANCH
  JMP: {
    mnemonic: "JMP",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.JMP),
  },
  JC: {
    mnemonic: "JC",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.JC),
  },
  JNC: {
    mnemonic: "JNC",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.JNC),
  },
  JZ: {
    mnemonic: "JZ",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.JZ),
  },
  JNZ: {
    mnemonic: "JNZ",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.JNZ),
  },
  JM: {
    mnemonic: "JM",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.JM),
  },
  JP: {
    mnemonic: "JP",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.JP),
  },
  JPE: {
    mnemonic: "JPE",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.JPE),
  },
  JPO: {
    mnemonic: "JPO",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.JPO),
  },
  CALL: {
    mnemonic: "CALL",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.CALL),
  },
  CC: {
    mnemonic: "CC",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.CC),
  },
  CNC: {
    mnemonic: "CNC",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.CNC),
  },
  CZ: {
    mnemonic: "CZ",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.CZ),
  },
  CNZ: {
    mnemonic: "CNZ",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.CNZ),
  },
  CM: {
    mnemonic: "CM",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.CM),
  },
  CP: {
    mnemonic: "CP",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.CP),
  },
  CPE: {
    mnemonic: "CPE",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.CPE),
  },
  CPO: {
    mnemonic: "CPO",
    operands: ["address"],
    size: 3,
    encode: wordImmediate(OP_CODE.CPO),
  },
  RET: {
    mnemonic: "RET",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.RET),
  },
  RC: {
    mnemonic: "RC",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.RC),
  },
  RNC: {
    mnemonic: "RNC",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.RNC),
  },
  RZ: {
    mnemonic: "RZ",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.RZ),
  },
  RNZ: {
    mnemonic: "RNZ",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.RNZ),
  },
  RM: {
    mnemonic: "RM",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.RM),
  },
  RP: {
    mnemonic: "RP",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.RP),
  },
  RPE: {
    mnemonic: "RPE",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.RPE),
  },
  RPO: {
    mnemonic: "RPO",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.RPO),
  },
  PCHL: {
    mnemonic: "PCHL",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.PCHL),
  },
  RST: {
    mnemonic: "RST",
    operands: ["restartVector"],
    size: 1,
    encode: ([vector]) => [BASE_CODE.RST | encodeRegisterCode(vector.code)],
  },

  // STACK
  PUSH: {
    mnemonic: "PUSH",
    operands: ["stackRegisterPair"],
    size: 1,
    encode: registerPairShiftOpcode(BASE_CODE.PUSH),
  },
  POP: {
    mnemonic: "POP",
    operands: ["stackRegisterPair"],
    size: 1,
    encode: registerPairShiftOpcode(BASE_CODE.POP),
  },
  XTHL: {
    mnemonic: "XTHL",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.XTHL),
  },
  SPHL: {
    mnemonic: "SPHL",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.SPHL),
  },

  // MACHINE CONTROL
  IN: {
    mnemonic: "IN",
    operands: ["port"],
    size: 2,
    encode: byteImmediate(OP_CODE.IN),
  },
  OUT: {
    mnemonic: "OUT",
    operands: ["port"],
    size: 2,
    encode: byteImmediate(OP_CODE.OUT),
  },
  EI: {
    mnemonic: "EI",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.EI),
  },
  DI: {
    mnemonic: "DI",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.DI),
  },
  HLT: {
    mnemonic: "HLT",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.HLT),
  },
  RIM: {
    mnemonic: "RIM",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.RIM),
  },
  SIM: {
    mnemonic: "SIM",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.SIM),
  },
  NOP: {
    mnemonic: "NOP",
    operands: [],
    size: 1,
    encode: oneByte(OP_CODE.NOP),
  },
} as const satisfies Record<string, InstructionDefinition>;

export function getInstructionDefinition(
  mnemonic: string,
): InstructionDefinition | undefined {
  return INSTRUCTION_SET[mnemonic as keyof typeof INSTRUCTION_SET];
}
