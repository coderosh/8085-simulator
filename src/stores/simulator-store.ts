import { create } from "zustand";
import { toast } from "sonner";

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
import {
  bootstrapWorkspace,
  createFileSystemNode,
  deleteFileSystemNode,
  moveFileSystemNodeToRoot,
  renameFileSystemNode,
  reorderFileSystemNode,
  setActiveFileSystemFile,
  updateFileSystemFileContent,
  type FileSystemNode,
  type WorkspaceSnapshot,
} from "@/lib/storage/indexeddb-file-system";

import type { SimulatorPanel } from "@/components/simulator/types";

const hltOpcode = 0x76;
const maxRunSteps = 10000;

const initialSource = samples[0].source;
const initialResult = relocateAssembledResult(assemble(initialSource));
const initialMachine = createLoadedMachine(initialResult);
const initialRows = buildAssembledRows(initialResult, initialSource);
const initialAstState = parseAst(initialSource);
const initialFileName = "main.asm";
const autosaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export type OutputExplorerTab = "assembled" | "ast";
export type WorkspaceSaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

type SimulatorState = {
  activeAddress: number;
  activeFileHasLoadedProgram: boolean;
  activeFileId: string | null;
  activeFileName: string;
  activeLine?: number;
  assemblyError: AssemblyErrorDiagnostic | null;
  ast: ProgramNode | null;
  astError: string | null;
  astHoverSpan: SourceSpan | null;
  activePanel: SimulatorPanel;
  assembledSource: string;
  consoleOpen: boolean;
  executionFinished: boolean;
  expandedFolderIds: string[];
  fileExplorerCollapsed: boolean;
  fileSystemNodes: FileSystemNode[];
  interrupts: InterruptSnapshot;
  loadedFileId: string | null;
  loadedFileName: string;
  loadedSource: string;
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
  workspaceInitialized: boolean;
  workspaceError: string | null;
  workspaceSaveStatus: WorkspaceSaveStatus;
  assembleProgram: (source?: string) => void;
  createFile: (parentId?: string | null) => Promise<string | null>;
  createFolder: (parentId?: string | null) => Promise<string | null>;
  deleteNode: (id: string) => Promise<void>;
  formatSource: () => void;
  initializeWorkspace: () => Promise<void>;
  loadSample: (source: string) => void;
  moveNodeToRoot: (draggedId: string) => Promise<void>;
  renameNode: (id: string, name: string) => Promise<void>;
  reorderNode: (draggedId: string, targetId: string) => Promise<void>;
  resetProgram: () => void;
  runProgram: () => void;
  selectFile: (id: string) => Promise<void>;
  setAstHoverSpan: (span: SourceSpan | null) => void;
  setActivePanel: (panel: SimulatorPanel) => void;
  setFileExplorerCollapsed: (collapsed: boolean) => void;
  setOutputExplorerTab: (tab: OutputExplorerTab) => void;
  setSource: (source: string) => void;
  stepProgram: () => void;
  toggleFolder: (id: string) => void;
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

type SimulatorSet = (
  partial:
    | Partial<SimulatorState>
    | ((state: SimulatorState) => Partial<SimulatorState>),
) => void;

type SimulatorGet = () => SimulatorState;

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  activeAddress: BASE_ADDRESS,
  activeFileHasLoadedProgram: false,
  activeFileId: null,
  activeFileName: initialFileName,
  activeLine: getActiveLine(initialRows, BASE_ADDRESS),
  assemblyError: null,
  ast: initialAstState.ast,
  astError: initialAstState.error,
  astHoverSpan: null,
  activePanel: "editor",
  assembledSource: initialSource,
  consoleOpen: false,
  executionFinished: initialMachine.controlUnit.isHalted(),
  expandedFolderIds: [],
  fileExplorerCollapsed: false,
  fileSystemNodes: [],
  interrupts: initialMachine.interrupts.snapshot(),
  loadedFileId: null,
  loadedFileName: initialFileName,
  loadedSource: initialSource,
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
  workspaceInitialized: false,
  workspaceError: null,
  workspaceSaveStatus: "idle",
  assembleProgram: (nextSource) => {
    const source = nextSource ?? get().source;
    const { activeFileId, activeFileName } = get();

    try {
      const nextResult = assemble(source);
      const nextAstState = parseAst(source);
      const relocatedResult = relocateAssembledResult(nextResult);
      const nextMachine = createLoadedMachine(relocatedResult);
      const rows = buildAssembledRows(relocatedResult, source);
      const activeAddress = relocatedResult.entryPoint;

      set({
        activeAddress,
        activeFileHasLoadedProgram: activeFileId !== null,
        activeLine: getActiveLine(rows, activeAddress),
        assemblyError: null,
        ast: nextAstState.ast,
        astError: nextAstState.error,
        astHoverSpan: null,
        assembledSource: source,
        lastOpcode: null,
        loadedFileId: activeFileId,
        loadedFileName: activeFileName,
        loadedSource: source,
        machine: nextMachine,
        ...snapshotSlices(nextMachine),
        message: `Assembled ${nextResult.bytes.length} bytes from ${activeFileName}.`,
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
  createFile: async (parentId = null) => {
    if (isExecutionInProgress(get())) {
      setFileSwitchBlockedAlert(set, get());
      return null;
    }

    try {
      set({
        workspaceError: null,
        workspaceSaveStatus: "saving",
      });
      const snapshot = await createFileSystemNode({
        kind: "file",
        name: "untitled.asm",
        parentId,
      });

      applyWorkspaceSnapshot(snapshot, set, get);
      return snapshot.createdNode.id;
    } catch (error) {
      set({
        workspaceError: getErrorMessage(error),
        workspaceSaveStatus: "error",
      });
      return null;
    }
  },
  createFolder: async (parentId = null) => {
    try {
      set({ workspaceError: null, workspaceSaveStatus: "saving" });
      const snapshot = await createFileSystemNode({
        kind: "folder",
        name: "New Folder",
        parentId,
      });

      applyWorkspaceSnapshot(snapshot, set, get, { selectActiveFile: false });
      return snapshot.createdNode.id;
    } catch (error) {
      set({
        workspaceError: getErrorMessage(error),
        workspaceSaveStatus: "error",
      });
      return null;
    }
  },
  deleteNode: async (id) => {
    if (nodeContainsActiveFile(get().fileSystemNodes, id, get().activeFileId)) {
      if (isExecutionInProgress(get())) {
        setFileSwitchBlockedAlert(set, get());
        return;
      }
    }

    try {
      set({
        workspaceError: null,
        workspaceSaveStatus: "saving",
      });
      const snapshot = await deleteFileSystemNode(id);

      applyWorkspaceSnapshot(snapshot, set, get);
    } catch (error) {
      set({
        workspaceError: getErrorMessage(error),
        workspaceSaveStatus: "error",
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
        workspaceSaveStatus: "saving",
      });
      scheduleAutosave(get, set, formattedSource);
    } catch (error) {
      set({
        activePanel: "editor",
        assemblyError: getAssemblyErrorDiagnostic(error),
        consoleOpen: true,
        message: getErrorMessage(error),
      });
    }
  },
  initializeWorkspace: async () => {
    if (get().workspaceInitialized || get().workspaceSaveStatus === "loading") {
      return;
    }

    try {
      set({ workspaceError: null, workspaceSaveStatus: "loading" });
      const snapshot = await bootstrapWorkspace(initialSource);

      applyWorkspaceSnapshot(snapshot, set, get, {
        bindInitialLoadedFile: true,
      });
      set({ workspaceInitialized: true });
    } catch (error) {
      set({
        message: "Could not load the local workspace.",
        workspaceError: getErrorMessage(error),
        workspaceSaveStatus: "error",
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
      message: `Sample loaded into ${get().activeFileName}.`,
      source,
      workspaceSaveStatus: "saving",
    });
    scheduleAutosave(get, set, source);
  },
  moveNodeToRoot: async (draggedId) => {
    try {
      set({ workspaceError: null, workspaceSaveStatus: "saving" });
      const snapshot = await moveFileSystemNodeToRoot(draggedId);

      applyWorkspaceSnapshot(snapshot, set, get, { selectActiveFile: false });
    } catch (error) {
      set({
        workspaceError: getErrorMessage(error),
        workspaceSaveStatus: "error",
      });
    }
  },
  renameNode: async (id, name) => {
    try {
      set({ workspaceError: null, workspaceSaveStatus: "saving" });
      const snapshot = await renameFileSystemNode(id, name);

      applyWorkspaceSnapshot(snapshot, set, get, { selectActiveFile: false });
    } catch (error) {
      set({
        workspaceError: getErrorMessage(error),
        workspaceSaveStatus: "error",
      });
    }
  },
  reorderNode: async (draggedId, targetId) => {
    try {
      set({ workspaceError: null, workspaceSaveStatus: "saving" });
      const snapshot = await reorderFileSystemNode(draggedId, targetId);

      applyWorkspaceSnapshot(snapshot, set, get, { selectActiveFile: false });
    } catch (error) {
      set({
        workspaceError: getErrorMessage(error),
        workspaceSaveStatus: "error",
      });
    }
  },
  resetProgram: () => {
    const { result } = get();
    const nextMachine = createLoadedMachine(result);
    const activeAddress = result.entryPoint;
    const activeFileHasLoadedProgram = get().activeFileId === get().loadedFileId;

    set({
      activeAddress,
      activeFileHasLoadedProgram,
      activeLine: activeFileHasLoadedProgram
        ? getActiveLine(get().rows, activeAddress)
        : undefined,
      lastOpcode: null,
      machine: nextMachine,
      ...snapshotSlices(nextMachine),
      message: `Machine reset with bytes from ${get().loadedFileName}.`,
    });
  },
  runProgram: () => {
    if (!loadActiveSourceIntoMachine(set, get)) return;

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
        activeFileHasLoadedProgram: get().activeFileId === get().loadedFileId,
        activeLine:
          get().activeFileId === get().loadedFileId
            ? getActiveLine(get().rows, lastAddress)
            : undefined,
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
  selectFile: async (id) => {
    if (id !== get().activeFileId && isExecutionInProgress(get())) {
      setFileSwitchBlockedAlert(set, get());
      return;
    }

    try {
      set({
        workspaceError: null,
        workspaceSaveStatus: "loading",
      });
      const snapshot = await setActiveFileSystemFile(id);

      applyWorkspaceSnapshot(snapshot, set, get);
    } catch (error) {
      set({
        workspaceError: getErrorMessage(error),
        workspaceSaveStatus: "error",
      });
    }
  },
  setAstHoverSpan: (astHoverSpan) =>
    set((state) => (state.astHoverSpan === astHoverSpan ? state : { astHoverSpan })),
  setActivePanel: (activePanel) =>
    set((state) => (state.activePanel === activePanel ? state : { activePanel })),
  setFileExplorerCollapsed: (fileExplorerCollapsed) =>
    set((state) =>
      state.fileExplorerCollapsed === fileExplorerCollapsed
        ? state
        : { fileExplorerCollapsed },
    ),
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
      scheduleAutosave(get, set, source);

      return {
        assemblyError: null,
        ast: nextAstState.ast,
        astError: nextAstState.error,
        astHoverSpan: null,
        activeFileHasLoadedProgram: false,
        activeLine: undefined,
        source,
        workspaceSaveStatus: state.activeFileId ? "saving" : state.workspaceSaveStatus,
      };
    }),
  stepProgram: () => {
    if (!loadActiveSourceIntoMachine(set, get)) return;

    const { machine } = get();

    try {
      if (machine.controlUnit.isHalted()) {
        set({ message: "Execution has halted. Reset or assemble to start again." });
        return;
      }

      const { nextAddress, opcode } = stepInstruction(machine);

      set({
        activeAddress: nextAddress,
        activeFileHasLoadedProgram: get().activeFileId === get().loadedFileId,
        activeLine:
          get().activeFileId === get().loadedFileId
            ? getActiveLine(get().rows, nextAddress)
            : undefined,
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
  toggleFolder: (id) =>
    set((state) => ({
      expandedFolderIds: state.expandedFolderIds.includes(id)
        ? state.expandedFolderIds.filter((folderId) => folderId !== id)
        : [...state.expandedFolderIds, id],
    })),
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
      activeFileHasLoadedProgram: get().activeFileId === get().loadedFileId,
      activeLine:
        get().activeFileId === get().loadedFileId
          ? getActiveLine(get().rows, activeAddress)
          : undefined,
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

function applyWorkspaceSnapshot(
  snapshot: WorkspaceSnapshot,
  set: SimulatorSet,
  get: SimulatorGet,
  options: {
    bindInitialLoadedFile?: boolean;
    selectActiveFile?: boolean;
  } = {},
) {
  const state = get();
  const shouldSelectActiveFile = options.selectActiveFile !== false;
  const nextActiveFileId = shouldSelectActiveFile
    ? snapshot.activeFileId
    : state.activeFileId;
  const activeFile = findFileNode(snapshot.nodes, nextActiveFileId);
  const expandedFolderIds = getExpandedFolderIdsForActiveFile(
    snapshot.nodes,
    activeFile,
    state.expandedFolderIds,
  );

  if (!shouldSelectActiveFile) {
    set({
      activeFileName: activeFile?.name ?? state.activeFileName,
      expandedFolderIds,
      fileSystemNodes: snapshot.nodes,
      workspaceError: null,
      workspaceSaveStatus: "saved",
    });
    return;
  }

  const nextSource = activeFile?.content ?? "";
  const nextAstState = parseAst(nextSource);
  const loadedState = activeFile
    ? getLoadedProgramState(nextSource, activeFile.id, activeFile.name)
    : null;

  set({
    ...(loadedState?.state ?? {}),
    activeFileId: activeFile?.id ?? null,
    activeFileName: activeFile?.name ?? "No file",
    assemblyError: loadedState?.error ?? null,
    ast: nextAstState.ast,
    astError: nextAstState.error,
    astHoverSpan: null,
    expandedFolderIds,
    fileSystemNodes: snapshot.nodes,
    message: activeFile
      ? loadedState?.error
        ? loadedState.error.message
        : `Loaded ${activeFile.name}.`
      : "Create a file to start editing.",
    source: nextSource,
    workspaceError: null,
    workspaceSaveStatus: "saved",
  });
}

function getLoadedProgramState(
  source: string,
  fileId: string | null,
  fileName: string,
) {
  try {
    const nextResult = assemble(source);
    const relocatedResult = relocateAssembledResult(nextResult);
    const nextMachine = createLoadedMachine(relocatedResult);
    const rows = buildAssembledRows(relocatedResult, source);
    const activeAddress = relocatedResult.entryPoint;

    return {
      error: null,
      state: {
        activeAddress,
        activeFileHasLoadedProgram: fileId !== null,
        activeLine: getActiveLine(rows, activeAddress),
        assembledSource: source,
        lastOpcode: null,
        loadedFileId: fileId,
        loadedFileName: fileName,
        loadedSource: source,
        machine: nextMachine,
        ...snapshotSlices(nextMachine),
        result: relocatedResult,
        rows,
      },
    };
  } catch (error) {
    return {
      error: getAssemblyErrorDiagnostic(error),
      state: {
        activeFileHasLoadedProgram: false,
        activeLine: undefined,
        lastOpcode: null,
      },
    };
  }
}

function loadActiveSourceIntoMachine(set: SimulatorSet, get: SimulatorGet) {
  const state = get();

  if (
    state.activeFileId === state.loadedFileId &&
    state.source === state.loadedSource &&
    state.activeFileHasLoadedProgram
  ) {
    return true;
  }

  const loadedState = getLoadedProgramState(
    state.source,
    state.activeFileId,
    state.activeFileName,
  );

  if (loadedState.error) {
    set({
      activePanel: "editor",
      assemblyError: loadedState.error,
      consoleOpen: true,
      message: loadedState.error.message,
      ...loadedState.state,
    });
    return false;
  }

  set({
    assemblyError: null,
    astHoverSpan: null,
    message: `Loaded ${state.activeFileName}.`,
    ...loadedState.state,
  });
  return true;
}

function isExecutionInProgress(state: SimulatorState) {
  return state.lastOpcode !== null && !state.executionFinished;
}

function setFileSwitchBlockedAlert(set: SimulatorSet, state: SimulatorState) {
  const description = "Finish the program or reset the CPU before switching files.";

  toast.warning(`${state.activeFileName} is mid-execution`, {
    description,
    id: "file-switch-blocked",
  });

  set({
    message: "File switch blocked while the CPU is mid-execution.",
  });
}

function nodeContainsActiveFile(
  nodes: FileSystemNode[],
  nodeId: string,
  activeFileId: string | null,
) {
  if (!activeFileId) return false;
  if (nodeId === activeFileId) return true;

  let parentId = nodes.find((node) => node.id === activeFileId)?.parentId ?? null;

  while (parentId) {
    if (parentId === nodeId) return true;
    parentId = nodes.find((node) => node.id === parentId)?.parentId ?? null;
  }

  return false;
}

function scheduleAutosave(
  get: SimulatorGet,
  set: SimulatorSet,
  source: string,
) {
  const activeFileId = get().activeFileId;

  if (!activeFileId) return;

  const existingTimer = autosaveTimers.get(activeFileId);

  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const autosaveTimer = setTimeout(() => {
    autosaveTimers.delete(activeFileId);

    void updateFileSystemFileContent(activeFileId, source)
      .then((updatedFile) => {
        if (!updatedFile) return;

        set((state) => ({
          fileSystemNodes: state.fileSystemNodes.map((node) =>
            node.id === updatedFile.id ? updatedFile : node,
          ),
          workspaceError: null,
          workspaceSaveStatus: "saved",
        }));
      })
      .catch((error: unknown) => {
        set({
          workspaceError: getErrorMessage(error),
          workspaceSaveStatus: "error",
        });
      });
  }, 450);

  autosaveTimers.set(activeFileId, autosaveTimer);
}

function findFileNode(nodes: FileSystemNode[], id: string | null) {
  return (
    nodes.find(
      (node): node is Extract<FileSystemNode, { kind: "file" }> =>
        node.id === id && node.kind === "file",
    ) ?? null
  );
}

function getExpandedFolderIdsForActiveFile(
  nodes: FileSystemNode[],
  activeFile: FileSystemNode | null,
  expandedFolderIds: string[],
) {
  if (!activeFile) return expandedFolderIds;

  const expandedIds = new Set(expandedFolderIds);
  let parentId = activeFile.parentId;

  while (parentId) {
    expandedIds.add(parentId);
    parentId = nodes.find((node) => node.id === parentId)?.parentId ?? null;
  }

  return [...expandedIds];
}

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
