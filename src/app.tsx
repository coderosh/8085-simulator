import { useMemo, useRef, useState } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { AppHeader } from "@/components/simulator/app-header";
import { AssembledPanel } from "@/components/simulator/assembled-panel";
import { SimulatorSidebar } from "@/components/simulator/simulator-sidebar";
import type { SimulatorPanel } from "@/components/simulator/types";
import { WorkspacePanel } from "@/components/simulator/workspace-panel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { assemble } from "@/core/assembler";
import type { MachineSnapshot } from "@/core/machine";
import type { FlagName } from "@/core/machine/components/registers";
import type { CodeGenResult } from "@/core/types";
import {
  buildAssembledRows,
  createLoadedMachine,
  hasProgramByte,
  relocateAssembledResult,
} from "@/lib/simulator/assembly";
import { BASE_ADDRESS } from "@/lib/simulator/constants";
import { formatByte, formatWord, getErrorMessage } from "@/lib/simulator/format";
import { samples } from "@/lib/simulator/samples";

const hltOpcode = 0x76;
const maxRunSteps = 10000;

function App() {
  const initialResult = useMemo(
    () => relocateAssembledResult(assemble(samples[0].source)),
    [],
  );
  const initialMachine = useMemo(
    () => createLoadedMachine(initialResult),
    [initialResult],
  );
  const [activePanel, setActivePanel] = useState<SimulatorPanel>("editor");
  const [source, setSource] = useState(samples[0].source);
  const [assembledSource, setAssembledSource] = useState(samples[0].source);
  const [result, setResult] = useState<CodeGenResult>(initialResult);
  const machineRef = useRef(initialMachine);
  const [snapshot, setSnapshot] = useState<MachineSnapshot>(() =>
    initialMachine.snapshot(),
  );
  const [activeAddress, setActiveAddress] = useState(BASE_ADDRESS);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [lastOpcode, setLastOpcode] = useState<number | null>(null);
  const [message, setMessage] = useState("Program assembled and loaded.");
  const executionFinished = snapshot.controlUnit.halted;

  const rows = useMemo(
    () => buildAssembledRows(result, assembledSource),
    [assembledSource, result],
  );
  const activeLine = rows.find(
    (row) =>
      activeAddress >= row.address &&
      activeAddress < row.address + row.bytes.length,
  )?.line;
  const assembleProgram = (nextSource = source) => {
    try {
      const nextResult = assemble(nextSource);
      const relocatedResult = relocateAssembledResult(nextResult);
      const nextMachine = createLoadedMachine(relocatedResult);

      setResult(relocatedResult);
      setAssembledSource(nextSource);
      machineRef.current = nextMachine;
      setSnapshot(nextMachine.snapshot());
      setActiveAddress(relocatedResult.entryPoint);
      setLastOpcode(null);
      setMessage(`Assembled ${nextResult.bytes.length} bytes.`);
    } catch (error) {
      setMessage(getErrorMessage(error));
      setConsoleOpen(true);
      setActivePanel("editor");
    }
  };

  const loadSample = (nextSource: string) => {
    setSource(nextSource);
    setMessage("Sample loaded into editor.");
    setConsoleOpen(false);
    setActivePanel("editor");
  };

  const stepInstruction = () => {
    const currentAddress = machineRef.current.registers.pc;
    const { opcode } = machineRef.current.step();
    const nextAddress = machineRef.current.registers.pc;

    return {
      instructionAddress: currentAddress,
      nextAddress: nextAddress & 0xffff,
      opcode,
    };
  };

  const stepProgram = () => {
    try {
      if (machineRef.current.controlUnit.isHalted()) {
        setMessage("Execution has halted. Reset or assemble to start again.");
        return;
      }

      const { nextAddress, opcode } = stepInstruction();
      const nextSnapshot = machineRef.current.snapshot();

      setLastOpcode(opcode);
      setSnapshot(nextSnapshot);
      setActiveAddress(nextAddress);
      setMessage(`Stepped instruction ${formatByte(opcode)}.`);
    } catch (error) {
      setMessage(getErrorMessage(error));
      setConsoleOpen(true);
      setActivePanel("editor");
    }
  };

  const runProgram = () => {
    try {
      if (machineRef.current.controlUnit.isHalted()) {
        setMessage("Execution has halted. Reset or assemble to start again.");
        return;
      }

      let steps = 0;
      let opcode: number | null = null;
      let lastAddress = machineRef.current.registers.pc;

      while (steps < maxRunSteps) {
        const step = stepInstruction();

        lastAddress = step.instructionAddress;
        opcode = step.opcode;
        steps++;

        if (opcode === hltOpcode) break;
        if (!hasProgramByte(result, machineRef.current.registers.pc)) break;
      }

      const nextSnapshot = machineRef.current.snapshot();

      setLastOpcode(opcode);
      setSnapshot(nextSnapshot);
      setActiveAddress(lastAddress);
      setMessage(
        opcode === hltOpcode
          ? `Ran ${steps} steps and stopped at HLT.`
          : `Ran ${steps} steps.`,
      );
    } catch (error) {
      setMessage(getErrorMessage(error));
      setConsoleOpen(true);
      setActivePanel("editor");
    }
  };

  const resetProgram = () => {
    const nextMachine = createLoadedMachine(result);

    machineRef.current = nextMachine;
    setSnapshot(nextMachine.snapshot());
    setActiveAddress(result.entryPoint);
    setLastOpcode(null);
    setMessage("Machine reset with the current bytes.");
  };

  const updateRegister = (register: string, value: number) => {
    if (register === "PC") {
      machineRef.current.registers.pc = value & 0xffff;
      setActiveAddress(machineRef.current.registers.pc);
    } else if (register === "SP") {
      machineRef.current.registers.sp = value & 0xffff;
    } else {
      machineRef.current.registers.setRegister(register, value);
    }

    setSnapshot(machineRef.current.snapshot());
    setMessage(
      `${register} set to ${
        register === "PC" || register === "SP" ? formatWord(value) : formatByte(value)
      }.`,
    );
  };

  const updateFlag = (flag: FlagName, value: boolean) => {
    machineRef.current.registers.setFlag(flag, value);
    setSnapshot(machineRef.current.snapshot());
    setMessage(`${flag} flag set to ${value ? "1" : "0"}.`);
  };

  const updateMemory = (address: number, value: number) => {
    machineRef.current.memory.writeByte(address, value);
    setSnapshot(machineRef.current.snapshot());
    setMessage(`Memory ${address.toString(16).toUpperCase()}H set to ${formatByte(value)}.`);
  };

  const updatePort = (port: number, value: number) => {
    machineRef.current.io.write(port, value);
    setSnapshot(machineRef.current.snapshot());
    setMessage(`I/O port ${formatByte(port)}H set to ${formatByte(value)}.`);
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="theme">
      <TooltipProvider>
        <main className="flex h-dvh overflow-hidden flex-col bg-background text-foreground">
          <AppHeader
            executionFinished={executionFinished}
            samples={samples}
            onAssemble={() => assembleProgram()}
            onReset={resetProgram}
            onRun={runProgram}
            onSampleLoad={loadSample}
            onStep={stepProgram}
          />

          <div className="grid min-h-0 flex-1 grid-cols-[4.75rem_minmax(0,1fr)] lg:grid-cols-[4.75rem_minmax(0,1fr)_25rem]">
            <SimulatorSidebar
              activePanel={activePanel}
              onPanelChange={setActivePanel}
            />

            <WorkspacePanel
              activeAddress={activeAddress}
              activeLine={activeLine}
              activePanel={activePanel}
              consoleOpen={consoleOpen}
              lastOpcode={lastOpcode}
              memory={snapshot.memory.data}
              message={message}
              resultByteCount={result.bytes.length}
              rows={rows}
              snapshot={snapshot}
              source={source}
              onConsoleToggle={() => setConsoleOpen((open) => !open)}
              onFlagChange={updateFlag}
              onMemoryChange={updateMemory}
              onPortChange={updatePort}
              onRegisterChange={updateRegister}
              onSourceChange={setSource}
            />

            <aside className="hidden min-h-0 border-l bg-background lg:block">
              <AssembledPanel
                rows={rows}
                activeAddress={activeAddress}
                byteCount={result.bytes.length}
              />
            </aside>
          </div>
        </main>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
