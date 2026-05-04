import { create } from "zustand";

import { assemble, formatProgram, Parser, Tokenizer } from "@/core/assembler";
import { isSimulatorError } from "@/core/errors";
import type { Machine, MachineSnapshot } from "@/core/machine";
import type { RestartInterrupt } from "@/core/machine/components/interrupts";
import type { InterruptSnapshot } from "@/core/machine/components/interrupts";
import type { RegistersSnapshot } from "@/core/machine/components/registers";
import type { FlagName } from "@/core/machine/components/registers";
import type { CodeGenResult } from "@/core/types";
import type { ProgramNode } from "@/core/types";
import type { SourceSpan } from "@/core/types";
import {
  buildAssembledRows,
  createLoadedMachine,
  hasProgramByte,
  relocateAssembledResult,
  type AssembledRow,
} from "@/lib/simulator/assembly";
import { BASE_ADDRESS } from "@/lib/simulator/constants";
import { formatByte, formatWord, getErrorMessage } from "@/lib/simulator/format";
import { samples } from "@/lib/simulator/samples";

import type { SimulatorPanel } from "@/components/simulator/types";

const hltOpcode = 0x76;
const maxRunSteps = 10000;

const initialSource = samples[0].source;
const initialResult = relocateAssembledResult(assemble(initialSource));
const initialMachine = createLoadedMachine(initialResult);
const initialRows = buildAssembledRows(initialResult, initialSource);
const initialAstState = parseAst(initialSource);

export type OutputExplorerTab = "assembled" | "ast";

type SimulatorState = {
  activeAddress: number;
  activeLine?: number;
  assemblyError: AssemblyErrorDiagnostic | null;
  ast: ProgramNode | null;
  astError: string | null;
  astHoverSpan: SourceSpan | null;
  activePanel: SimulatorPanel;
  assembledSource: string;
  consoleOpen: boolean;
  executionFinished: boolean;
  interrupts: InterruptSnapshot;
  outputExplorerTab: OutputExplorerTab;
  lastOpcode: number | null;
  machine: Machine;
  memory: Uint8Array;
  message: string;
  ports: Uint8Array;
  registers: RegistersSnapshot;
  result: CodeGenResult;
  rows: AssembledRow[];
  snapshot: MachineSnapshot;
  source: string;
  assembleProgram: (source?: string) => void;
  formatSource: () => void;
  loadSample: (source: string) => void;
  resetProgram: () => void;
  runProgram: () => void;
  setAstHoverSpan: (span: SourceSpan | null) => void;
  setActivePanel: (panel: SimulatorPanel) => void;
  setOutputExplorerTab: (tab: OutputExplorerTab) => void;
  setSource: (source: string) => void;
  stepProgram: () => void;
  toggleConsole: () => void;
  updateFlag: (flag: FlagName, value: boolean) => void;
  updateInterruptRequest: (
    interrupt: RestartInterrupt,
    pending: boolean,
  ) => void;
  updateMemory: (address: number, value: number) => void;
  updatePort: (port: number, value: number) => void;
  updateRegister: (register: string, value: number) => void;
};

export type AssemblyErrorDiagnostic = {
  message: string;
  severity: "error" | "warning" | "info";
  span: SourceSpan;
};

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  activeAddress: BASE_ADDRESS,
  activeLine: getActiveLine(initialRows, BASE_ADDRESS),
  assemblyError: null,
  ast: initialAstState.ast,
  astError: initialAstState.error,
  astHoverSpan: null,
  activePanel: "editor",
  assembledSource: initialSource,
  consoleOpen: false,
  executionFinished: initialMachine.controlUnit.isHalted(),
  interrupts: initialMachine.interrupts.snapshot(),
  lastOpcode: null,
  machine: initialMachine,
  memory: initialMachine.memory.snapshot().data,
  message: "Program assembled and loaded.",
  outputExplorerTab: "assembled",
  ports: initialMachine.io.snapshot().ports,
  registers: initialMachine.registers.snapshot(),
  result: initialResult,
  rows: initialRows,
  snapshot: initialMachine.snapshot(),
  source: initialSource,
  assembleProgram: (nextSource) => {
    const source = nextSource ?? get().source;

    try {
      const nextResult = assemble(source);
      const nextAstState = parseAst(source);
      const relocatedResult = relocateAssembledResult(nextResult);
      const nextMachine = createLoadedMachine(relocatedResult);
      const rows = buildAssembledRows(relocatedResult, source);
      const activeAddress = relocatedResult.entryPoint;

      set({
        activeAddress,
        activeLine: getActiveLine(rows, activeAddress),
        assemblyError: null,
        ast: nextAstState.ast,
        astError: nextAstState.error,
        astHoverSpan: null,
        assembledSource: source,
        lastOpcode: null,
        machine: nextMachine,
        ...snapshotSlices(nextMachine),
        message: `Assembled ${nextResult.bytes.length} bytes.`,
        result: relocatedResult,
        rows,
      });
    } catch (error) {
      set({
        activePanel: "editor",
        assemblyError: getAssemblyErrorDiagnostic(error),
        consoleOpen: true,
        message: getErrorMessage(error),
      });
    }
  },
  formatSource: () => {
    const source = get().source;

    try {
      const ast = new Parser(
        new Tokenizer(source, { captureComments: true }).getAllTokens(),
        { captureComments: true },
      ).parse();
      const formattedSource = formatProgram(ast);
      const formattedAstState = parseAst(formattedSource);

      set({
        assemblyError: null,
        ast: formattedAstState.ast,
        astError: formattedAstState.error,
        astHoverSpan: null,
        message: "Source formatted.",
        source: formattedSource,
      });
    } catch (error) {
      set({
        activePanel: "editor",
        assemblyError: getAssemblyErrorDiagnostic(error),
        consoleOpen: true,
        message: getErrorMessage(error),
      });
    }
  },
  loadSample: (source) => {
    const nextAstState = parseAst(source);

    set({
      activePanel: "editor",
      assemblyError: null,
      ast: nextAstState.ast,
      astError: nextAstState.error,
      astHoverSpan: null,
      consoleOpen: false,
      message: "Sample loaded into editor.",
      source,
    });
  },
  resetProgram: () => {
    const { result } = get();
    const nextMachine = createLoadedMachine(result);
    const activeAddress = result.entryPoint;

    set({
      activeAddress,
      activeLine: getActiveLine(get().rows, activeAddress),
      lastOpcode: null,
      machine: nextMachine,
      ...snapshotSlices(nextMachine),
      message: "Machine reset with the current bytes.",
    });
  },
  runProgram: () => {
    const { machine, result } = get();

    try {
      if (machine.controlUnit.isHalted()) {
        set({ message: "Execution has halted. Reset or assemble to start again." });
        return;
      }

      let steps = 0;
      let opcode: number | null = null;
      let lastAddress = machine.registers.pc;

      while (steps < maxRunSteps) {
        const step = stepInstruction(machine);

        lastAddress = step.instructionAddress;
        opcode = step.opcode;
        steps++;

        if (opcode === hltOpcode) break;
        if (!hasProgramByte(result, machine.registers.pc)) break;
      }

      set({
        activeAddress: lastAddress,
        activeLine: getActiveLine(get().rows, lastAddress),
        lastOpcode: opcode,
        message:
          opcode === hltOpcode
            ? `Ran ${steps} steps and stopped at HLT.`
            : `Ran ${steps} steps.`,
        ...snapshotSlices(machine),
      });
    } catch (error) {
      set({
        activePanel: "editor",
        consoleOpen: true,
        message: getErrorMessage(error),
      });
    }
  },
  setAstHoverSpan: (astHoverSpan) =>
    set((state) => (state.astHoverSpan === astHoverSpan ? state : { astHoverSpan })),
  setActivePanel: (activePanel) =>
    set((state) => (state.activePanel === activePanel ? state : { activePanel })),
  setOutputExplorerTab: (outputExplorerTab) =>
    set((state) =>
      state.outputExplorerTab === outputExplorerTab
        ? state
        : { outputExplorerTab },
    ),
  setSource: (source) =>
    set((state) => {
      if (state.source === source) return state;

      const nextAstState = parseAst(source);

      return {
        assemblyError: null,
        ast: nextAstState.ast,
        astError: nextAstState.error,
        astHoverSpan: null,
        source,
      };
    }),
  stepProgram: () => {
    const { machine } = get();

    try {
      if (machine.controlUnit.isHalted()) {
        set({ message: "Execution has halted. Reset or assemble to start again." });
        return;
      }

      const { nextAddress, opcode } = stepInstruction(machine);

      set({
        activeAddress: nextAddress,
        activeLine: getActiveLine(get().rows, nextAddress),
        lastOpcode: opcode,
        message: `Stepped instruction ${formatByte(opcode)}.`,
        ...snapshotSlices(machine),
      });
    } catch (error) {
      set({
        activePanel: "editor",
        consoleOpen: true,
        message: getErrorMessage(error),
      });
    }
  },
  toggleConsole: () => set((state) => ({ consoleOpen: !state.consoleOpen })),
  updateFlag: (flag, value) => {
    const { machine } = get();

    if (machine.registers.flags[flag] === value) return;

    machine.registers.setFlag(flag, value);
    set({
      message: `${flag} flag set to ${value ? "1" : "0"}.`,
      registers: machine.registers.snapshot(),
      snapshot: machine.snapshot(),
    });
  },
  updateInterruptRequest: (interrupt, pending) => {
    const { machine } = get();

    if (get().interrupts.pending[interrupt] === pending) return;

    if (pending) {
      machine.interrupts.request(interrupt);
    } else {
      machine.interrupts.clear(interrupt);
    }

    set({
      interrupts: machine.interrupts.snapshot(),
      message: `${formatInterruptName(interrupt)} interrupt ${
        pending ? "requested" : "cleared"
      }.`,
      snapshot: machine.snapshot(),
    });
  },
  updateMemory: (address, value) => {
    const { machine } = get();

    if (machine.memory.readByte(address) === value) return;

    machine.memory.writeByte(address, value);
    set({
      memory: machine.memory.snapshot().data,
      message: `Memory ${address.toString(16).toUpperCase()}H set to ${formatByte(
        value,
      )}.`,
      snapshot: machine.snapshot(),
    });
  },
  updatePort: (port, value) => {
    const { machine } = get();

    if (machine.io.read(port) === value) return;

    machine.io.write(port, value);
    set({
      message: `I/O port ${formatByte(port)}H set to ${formatByte(value)}.`,
      ports: machine.io.snapshot().ports,
      snapshot: machine.snapshot(),
    });
  },
  updateRegister: (register, value) => {
    const { machine } = get();
    let activeAddress = get().activeAddress;

    if (register === "PC") {
      const nextValue = value & 0xffff;

      if (machine.registers.pc === nextValue) return;

      machine.registers.pc = nextValue;
      activeAddress = nextValue;
    } else if (register === "SP") {
      const nextValue = value & 0xffff;

      if (machine.registers.sp === nextValue) return;

      machine.registers.sp = nextValue;
    } else {
      const nextValue = value & 0xff;

      if (machine.registers.getRegister(register) === nextValue) return;

      machine.registers.setRegister(register, nextValue);
    }

    set({
      activeAddress,
      activeLine: getActiveLine(get().rows, activeAddress),
      message: `${register} set to ${
        register === "PC" || register === "SP"
          ? formatWord(value)
          : formatByte(value)
      }.`,
      registers: machine.registers.snapshot(),
      snapshot: machine.snapshot(),
    });
  },
}));

function snapshotSlices(machine: Machine) {
  const snapshot = machine.snapshot();

  return {
    executionFinished: snapshot.controlUnit.halted,
    interrupts: snapshot.interrupts,
    memory: snapshot.memory.data,
    ports: snapshot.io.ports,
    registers: snapshot.registers,
    snapshot,
  };
}

function stepInstruction(machine: Machine) {
  const currentAddress = machine.registers.pc;
  const { opcode } = machine.step();
  const nextAddress = machine.registers.pc;

  return {
    instructionAddress: currentAddress,
    nextAddress: nextAddress & 0xffff,
    opcode,
  };
}

function getActiveLine(rows: AssembledRow[], activeAddress: number) {
  return rows.find(
    (row) =>
      activeAddress >= row.address &&
      activeAddress < row.address + row.bytes.length,
  )?.line;
}

function getAssemblyErrorDiagnostic(error: unknown): AssemblyErrorDiagnostic | null {
  if (!isSimulatorError(error) || !error.span) {
    return null;
  }

  return {
    message: error.toString(),
    severity: error.severity,
    span: error.span,
  };
}

function parseAst(source: string) {
  try {
    return {
      ast: new Parser(
        new Tokenizer(source, { captureComments: true }).getAllTokens(),
        { captureComments: true },
      ).parse(),
      error: null,
    };
  } catch (error) {
    return {
      ast: null,
      error: getErrorMessage(error),
    };
  }
}

function formatInterruptName(interrupt: RestartInterrupt): string {
  const names = {
    rst55: "RST 5.5",
    rst65: "RST 6.5",
    rst75: "RST 7.5",
  } satisfies Record<RestartInterrupt, string>;

  return names[interrupt];
}
