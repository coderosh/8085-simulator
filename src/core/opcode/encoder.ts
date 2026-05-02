// ref: http://www.eazynotes.com/notes/microprocessor/notes/opcodes-table-of-intel-8085.pdf

import {
  BASE_CODE,
  OP_CODE,
  REGISTER_CODES,
  REGISTER_PAIR_CODES,
  STACK_REGISTER_PAIR_CODES,
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
    return BASE_CODE.MOV | (destCode << 3) | srcCode;
  }

  mvi(dest: string, val: number): number[] {
    this.validateRegister(dest);

    const destCode = REGISTER_CODES[dest];

    return [BASE_CODE.MVI | (destCode << 3), this.lowerByte(val)];
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
      BASE_CODE.LXI | (destCode << 4),
      this.lowerByte(val),
      this.higherByte(val),
    ];
  }

  lda(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.LDA, this.lowerByte(addr), this.higherByte(addr)];
  }

  ldax(src: string): number {
    this.validateRegisterPair(src, ["B", "D"]);

    const srcCode = REGISTER_PAIR_CODES[src];

    return BASE_CODE.LDAX | (srcCode << 4);
  }

  lhld(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.LHLD, this.lowerByte(addr), this.higherByte(addr)];
  }

  sta(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.STA, this.lowerByte(addr), this.higherByte(addr)];
  }

  stax(src: string): number {
    this.validateRegisterPair(src, ["B", "D"]);

    const srcCode = REGISTER_PAIR_CODES[src];

    return BASE_CODE.STAX | (srcCode << 4);
  }

  shld(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.SHLD, this.lowerByte(addr), this.higherByte(addr)];
  }

  xchg(): number {
    return OP_CODE.XCHG;
  }

  // ARITHMETIC

  add(src: string): number {
    this.validateRegister(src);

    const srcCode = REGISTER_CODES[src];

    return BASE_CODE.ADD | srcCode;
  }

  adc(src: string): number {
    this.validateRegister(src);

    const srcCode = REGISTER_CODES[src];

    return BASE_CODE.ADC | srcCode;
  }

  sub(src: string): number {
    this.validateRegister(src);

    const srcCode = REGISTER_CODES[src];

    return BASE_CODE.SUB | srcCode;
  }

  sbb(src: string): number {
    this.validateRegister(src);

    const srcCode = REGISTER_CODES[src];

    return BASE_CODE.SBB | srcCode;
  }

  aci(src: number): number[] {
    return [OP_CODE.ACI, this.lowerByte(src)];
  }

  adi(src: number): number[] {
    return [OP_CODE.ADI, this.lowerByte(src)];
  }

  dad(src: string): number {
    this.validateRegisterPair(src);

    const srcCode = REGISTER_PAIR_CODES[src];

    return BASE_CODE.DAD | (srcCode << 4);
  }

  sui(val: number): number[] {
    return [OP_CODE.SUI, this.lowerByte(val)];
  }

  sbi(val: number): number[] {
    return [OP_CODE.SBI, this.lowerByte(val)];
  }

  inr(dest: string): number {
    this.validateRegister(dest);

    const destCode = REGISTER_CODES[dest];

    return BASE_CODE.INR | (destCode << 3);
  }

  inx(dest: string): number {
    this.validateRegisterPair(dest);

    const destCode = REGISTER_PAIR_CODES[dest];

    return BASE_CODE.INX | (destCode << 4);
  }

  dcr(dest: string): number {
    this.validateRegister(dest);

    const destCode = REGISTER_CODES[dest];

    return BASE_CODE.DCR | (destCode << 3);
  }

  dcx(dest: string): number {
    this.validateRegisterPair(dest);

    const destCode = REGISTER_PAIR_CODES[dest];

    return BASE_CODE.DCX | (destCode << 4);
  }

  daa(): number {
    return OP_CODE.DAA;
  }

  // LOGICAL

  ana(src: string): number {
    this.validateRegister(src);

    const srcCode = REGISTER_CODES[src];

    return BASE_CODE.ANA | srcCode;
  }

  ani(src: number): number[] {
    return [OP_CODE.ANI, this.lowerByte(src)];
  }

  ora(src: string): number {
    this.validateRegister(src);

    const srcCode = REGISTER_CODES[src];

    return BASE_CODE.ORA | srcCode;
  }

  xra(src: string): number {
    this.validateRegister(src);

    const srcCode = REGISTER_CODES[src];

    return BASE_CODE.XRA | srcCode;
  }

  xri(val: number): number[] {
    return [OP_CODE.XRI, this.lowerByte(val)];
  }

  cma(): number {
    return OP_CODE.CMA;
  }

  cmc(): number {
    return OP_CODE.CMC;
  }

  stc(): number {
    return OP_CODE.STC;
  }

  cmp(src: string): number {
    this.validateRegister(src);

    const srcCode = REGISTER_CODES[src];

    return BASE_CODE.CMP | srcCode;
  }

  cpi(val: number): number[] {
    return [OP_CODE.CPI, this.lowerByte(val)];
  }

  rlc(): number {
    return OP_CODE.RLC;
  }

  rrc(): number {
    return OP_CODE.RRC;
  }

  ral(): number {
    return OP_CODE.RAL;
  }

  rar(): number {
    return OP_CODE.RAR;
  }

  // BRANCH

  jmp(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.JMP, this.lowerByte(addr), this.higherByte(addr)];
  }

  jc(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.JC, this.lowerByte(addr), this.higherByte(addr)];
  }

  jnc(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.JNC, this.lowerByte(addr), this.higherByte(addr)];
  }

  jz(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.JZ, this.lowerByte(addr), this.higherByte(addr)];
  }

  jnz(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.JNZ, this.lowerByte(addr), this.higherByte(addr)];
  }

  jm(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.JM, this.lowerByte(addr), this.higherByte(addr)];
  }

  jp(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.JP, this.lowerByte(addr), this.higherByte(addr)];
  }

  jpe(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.JPE, this.lowerByte(addr), this.higherByte(addr)];
  }

  jpo(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.JPO, this.lowerByte(addr), this.higherByte(addr)];
  }

  call(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.CALL, this.lowerByte(addr), this.higherByte(addr)];
  }

  cc(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.CC, this.lowerByte(addr), this.higherByte(addr)];
  }

  cnc(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.CNC, this.lowerByte(addr), this.higherByte(addr)];
  }

  cz(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.CZ, this.lowerByte(addr), this.higherByte(addr)];
  }

  cnz(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.CNZ, this.lowerByte(addr), this.higherByte(addr)];
  }

  cm(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.CM, this.lowerByte(addr), this.higherByte(addr)];
  }

  cp(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.CP, this.lowerByte(addr), this.higherByte(addr)];
  }

  cpe(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.CPE, this.lowerByte(addr), this.higherByte(addr)];
  }

  cpo(addr: number): number[] {
    this.validateAddress(addr);

    return [OP_CODE.CPO, this.lowerByte(addr), this.higherByte(addr)];
  }

  ret(): number {
    return OP_CODE.RET;
  }

  rc(): number {
    return OP_CODE.RC;
  }

  rnc(): number {
    return OP_CODE.RNC;
  }

  rz(): number {
    return OP_CODE.RZ;
  }

  rnz(): number {
    return OP_CODE.RNZ;
  }

  rm(): number {
    return OP_CODE.RM;
  }

  rp(): number {
    return OP_CODE.RP;
  }

  rpe(): number {
    return OP_CODE.RPE;
  }

  rpo(): number {
    return OP_CODE.RPO;
  }

  pchl(): number {
    return OP_CODE.PCHL;
  }

  rst(vec: number): number {
    if (vec < 0 || vec > 7) {
      throw this.error(`Invalid restart vector '${vec}'`);
    }

    return BASE_CODE.RST | (vec << 3);
  }

  // STACK

  push(src: string): number {
    this.validateStackRegisterPair(src);

    const srcCode = STACK_REGISTER_PAIR_CODES[src];

    return BASE_CODE.PUSH | (srcCode << 4);
  }

  pop(dest: string): number {
    this.validateStackRegisterPair(dest);

    const destCode = STACK_REGISTER_PAIR_CODES[dest];

    return BASE_CODE.POP | (destCode << 4);
  }

  xthl(): number {
    return OP_CODE.XTHL;
  }

  sphl(): number {
    return OP_CODE.SPHL;
  }

  // MACHINE CONTROL

  in(port: number): number[] {
    return [OP_CODE.IN, this.lowerByte(port)];
  }

  out(port: number): number[] {
    return [OP_CODE.OUT, this.lowerByte(port)];
  }

  ei(): number {
    return OP_CODE.EI;
  }

  di(): number {
    return OP_CODE.DI;
  }

  hlt(): number {
    return OP_CODE.HLT;
  }

  rim(): number {
    return OP_CODE.RIM;
  }

  sim(): number {
    return OP_CODE.SIM;
  }

  nop(): number {
    return OP_CODE.NOP;
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

  validateStackRegisterPair(registerPair: string): void {
    const registerPairCode = STACK_REGISTER_PAIR_CODES[registerPair];
    if (typeof registerPairCode !== "number") {
      throw this.error(`Invalid stack register pair '${registerPair}'`);
    }
  }

  error(message: string): Error {
    return new Error(`[OpCodeEncoder error]: ${message}`);
  }
}
