// ref: http://www.eazynotes.com/notes/microprocessor/notes/opcodes-table-of-intel-8085.pdf

import {
  ACI_OP_CODE,
  ADC_BASE_CODE,
  ADD_BASE_CODE,
  ADI_OP_CODE,
  ANA_BASE_CODE,
  ANI_OP_CODE,
  DAA_OP_CODE,
  DAD_BASE_CODE,
  DCR_BASE_CODE,
  DCX_BASE_CODE,
  IMMEDIATE_MOV_BASE_CODE,
  INR_BASE_CODE,
  INX_BASE_CODE,
  LDA_OP_CODE,
  LDAX_BASE_CODE,
  LHLD_OP_CODE,
  LXI_BASE_CODE,
  MOV_BASE_CODE,
  NOP_OP_CODE,
  REGISTER_CODES,
  REGISTER_PAIR_CODES,
  SBB_BASE_CODE,
  SBI_OP_CODE,
  SHLD_OP_CODE,
  STA_OP_CODE,
  STAX_BASE_CODE,
  SUB_BASE_CODE,
  SUI_OP_CODE,
  XCHG_OP_CODE,
} from "./constants";

export class OpCodeEncoder {
  // DATA TRANSFER
  mov(dest: string, src: string): number {
    this.validateRegister(dest);
    this.validateRegister(src);

    const destCode = REGISTER_CODES[dest];
    const srcCode = REGISTER_CODES[src];

    if (destCode === REGISTER_CODES.M && srcCode === REGISTER_CODES.M) {
      throw this.error("MOV M, M is not a valid instruction");
    }

    /**
     * MOV:   01 000 000
     * DEST:     xxx 000 -- need to shift left by 3
     * SRC:      000 xxx
     */
    return MOV_BASE_CODE | (destCode << 3) | srcCode;
  }

  mvi(dest: string, val: number): number[] {
    this.validateRegister(dest);

    const destCode = REGISTER_CODES[dest];

    return [IMMEDIATE_MOV_BASE_CODE | (destCode << 3), this.lowerByte(val)];
  }

  lxi(dest: string, val: number): number[] {
    this.validateRegisterPair(dest);

    const destCode = REGISTER_PAIR_CODES[dest];

    /**
     * LXI:   00 00 0001
     * DEST:     xx 0000 -- need to shift left by 4
     *
     * LOW:      xxxxxxxx  (low byte of immediate)
     * HIGH:     xxxxxxxx  (high byte of immediate)
     */
    return [
      LXI_BASE_CODE | (destCode << 4),
      this.lowerByte(val),
      this.higherByte(val),
    ];
  }

  lda(addr: number): number[] {
    this.validateAddress(addr);

    return [LDA_OP_CODE, this.lowerByte(addr), this.higherByte(addr)];
  }

  ldax(src: string): number {
    this.validateRegisterPair(src, ["B", "D"]);

    const srcCode = REGISTER_PAIR_CODES[src];

    return LDAX_BASE_CODE | (srcCode << 4);
  }

  lhld(addr: number): number[] {
    this.validateAddress(addr);

    return [LHLD_OP_CODE, this.lowerByte(addr), this.higherByte(addr)];
  }

  sta(addr: number): number[] {
    this.validateAddress(addr);

    return [STA_OP_CODE, this.lowerByte(addr), this.higherByte(addr)];
  }

  stax(src: string): number {
    this.validateRegisterPair(src, ["B", "D"]);

    const srcCode = REGISTER_PAIR_CODES[src];

    return STAX_BASE_CODE | (srcCode << 4);
  }

  shld(addr: number): number[] {
    this.validateAddress(addr);

    return [SHLD_OP_CODE, this.lowerByte(addr), this.higherByte(addr)];
  }

  xchg(): number {
    return XCHG_OP_CODE;
  }

  // ARITHMETIC

  add(src: string): number {
    this.validateRegister(src);

    const srcCode = REGISTER_CODES[src];

    return ADD_BASE_CODE | srcCode;
  }

  adc(src: string): number {
    this.validateRegister(src);

    const srcCode = REGISTER_CODES[src];

    return ADC_BASE_CODE | srcCode;
  }

  sub(src: string): number {
    this.validateRegister(src);

    const srcCode = REGISTER_CODES[src];

    return SUB_BASE_CODE | srcCode;
  }

  sbb(src: string): number {
    this.validateRegister(src);

    const srcCode = REGISTER_CODES[src];

    return SBB_BASE_CODE | srcCode;
  }

  aci(src: number): number[] {
    return [ACI_OP_CODE, this.lowerByte(src)];
  }

  adi(src: number): number[] {
    return [ADI_OP_CODE, this.lowerByte(src)];
  }

  dad(src: string): number {
    this.validateRegisterPair(src);

    const srcCode = REGISTER_PAIR_CODES[src];

    return DAD_BASE_CODE | (srcCode << 4);
  }

  sui(val: number): number[] {
    return [SUI_OP_CODE, this.lowerByte(val)];
  }

  sbi(val: number): number[] {
    return [SBI_OP_CODE, this.lowerByte(val)];
  }

  inr(dest: string): number {
    this.validateRegister(dest);

    const destCode = REGISTER_CODES[dest];

    return INR_BASE_CODE | (destCode << 3);
  }

  inx(dest: string): number {
    this.validateRegisterPair(dest);

    const destCode = REGISTER_PAIR_CODES[dest];

    return INX_BASE_CODE | (destCode << 4);
  }

  dcr(dest: string): number {
    this.validateRegister(dest);

    const destCode = REGISTER_CODES[dest];

    return DCR_BASE_CODE | (destCode << 3);
  }

  dcx(dest: string): number {
    this.validateRegisterPair(dest);

    const destCode = REGISTER_PAIR_CODES[dest];

    return DCX_BASE_CODE | (destCode << 4);
  }

  daa(): number {
    return DAA_OP_CODE;
  }

  // LOGICAL

  ana(src: string): number {
    this.validateRegister(src);

    const srcCode = REGISTER_CODES[src];

    return ANA_BASE_CODE | srcCode;
  }

  ani(src: number): number[] {
    return [ANI_OP_CODE, this.lowerByte(src)];
  }

  ora() {}

  xra() {}

  xri() {}

  cma() {}

  cmc() {}

  stc() {}

  cmp() {}

  cpi() {}

  rlc() {}

  rrc() {}

  ral() {}

  rar() {}

  // BRANCH

  jmp() {}

  jc() {}

  jnc() {}

  jz() {}

  jnz() {}

  jm() {}

  jp() {}

  jpe() {}

  jpo() {}

  call() {}

  cc() {}

  cnc() {}

  cz() {}

  cnz() {}

  cm() {}

  cp() {}

  cpe() {}

  cpo() {}

  ret() {}

  rc() {}

  rnc() {}

  rz() {}

  rnz() {}

  rm() {}

  rp() {}

  rpe() {}

  rpo() {}

  pchl() {}

  rst() {}

  // STACK

  push() {}

  pop() {}

  xthl() {}

  sphl() {}

  // MACHINE CONTROL

  in() {}

  out() {}

  ei() {}

  di() {}

  hlt() {}

  rim() {}

  sim() {}

  nop(): number {
    return NOP_OP_CODE;
  }

  // utils

  lowerByte(value: number): number {
    return value & 0xff;
  }

  higherByte(value: number): number {
    return (value >> 8) & 0xff;
  }

  validateAddress(addr: number): void {
    if (addr < 0 || addr > 0xffff) {
      throw this.error(`Address ${addr} is out of range (0x0000 - 0xffff)`);
    }
  }

  validateRegister(register: string, valid?: string[]): void {
    const registerCode = REGISTER_CODES[register];
    if (
      typeof registerCode !== "number" ||
      (valid && !valid.includes(register))
    ) {
      throw this.error(`Invalid register '${register}'`);
    }
  }

  validateRegisterPair(registerPair: string, valid?: string[]): void {
    const registerPairCode = REGISTER_PAIR_CODES[registerPair];
    if (
      typeof registerPairCode !== "number" ||
      (valid && !valid.includes(registerPair))
    ) {
      throw this.error(`Invalid register pair '${registerPair}'`);
    }
  }

  error(message: string): Error {
    return new Error(`[OpCodeEncoder error]: ${message}`);
  }
}
