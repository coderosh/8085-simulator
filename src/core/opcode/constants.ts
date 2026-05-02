export const MOV_BASE_CODE = 0x40;
export const IMMEDIATE_MOV_BASE_CODE = 0x06;
export const LXI_BASE_CODE = 0x01;
export const LDA_OP_CODE = 0x3a;
export const LDAX_BASE_CODE = 0x0a;
export const LHLD_OP_CODE = 0x2a;
export const STA_OP_CODE = 0x32;
export const STAX_BASE_CODE = 0x02;
export const SHLD_OP_CODE = 0x22;
export const XCHG_OP_CODE = 0xeb;
export const NOP_OP_CODE = 0x00;
export const ADD_BASE_CODE = 0x80;
export const ADC_BASE_CODE = 0x88;
export const SUB_BASE_CODE = 0x90;
export const SBB_BASE_CODE = 0x98;
export const ACI_OP_CODE = 0xce;
export const ADI_OP_CODE = 0xc6;
export const DAD_BASE_CODE = 0x09;
export const SUI_OP_CODE = 0xd6;
export const SBI_OP_CODE = 0xde;
export const INR_BASE_CODE = 0x04;
export const INX_BASE_CODE = 0x03;
export const DCR_BASE_CODE = 0x05;
export const DCX_BASE_CODE = 0x0b;
export const DAA_OP_CODE = 0x27;
export const ANA_BASE_CODE = 0xa0;
export const ANI_OP_CODE = 0xe6;

export const REGISTER_CODES: Record<string, number> = {
  B: 0,
  C: 1,
  D: 2,
  E: 3,
  H: 4,
  L: 5,
  M: 6,
  A: 7,
};

export const REGISTER_PAIR_CODES: Record<string, number> = {
  B: 0, // BC pair
  D: 1, // DE pair
  H: 2, // HL pair
  SP: 3, // Stack Pointer
};
