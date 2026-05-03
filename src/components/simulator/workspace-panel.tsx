import { AssembledPanel } from "./assembled-panel";
import { CpuPanel } from "./cpu-panel";
import { EditorPanel } from "./editor-panel";
import { IOPanel } from "./io-panel";
import { MemoryPanel } from "./memory-panel";
import type { SimulatorPanel } from "./types";
import type { AssembledRow } from "@/lib/simulator/assembly";
import type { MachineSnapshot } from "@/core/machine";
import type { FlagName } from "@/core/machine/components/registers";

type WorkspacePanelProps = {
  activeAddress: number;
  activeLine?: number;
  activePanel: SimulatorPanel;
  consoleOpen: boolean;
  lastOpcode: number | null;
  memory: Uint8Array;
  message: string;
  resultByteCount: number;
  rows: AssembledRow[];
  snapshot: MachineSnapshot;
  source: string;
  onConsoleToggle: () => void;
  onFlagChange: (flag: FlagName, value: boolean) => void;
  onMemoryChange: (address: number, value: number) => void;
  onPortChange: (port: number, value: number) => void;
  onRegisterChange: (register: string, value: number) => void;
  onSourceChange: (source: string) => void;
};

export function WorkspacePanel({
  activeAddress,
  activeLine,
  activePanel,
  consoleOpen,
  lastOpcode,
  memory,
  message,
  resultByteCount,
  rows,
  snapshot,
  source,
  onConsoleToggle,
  onFlagChange,
  onMemoryChange,
  onPortChange,
  onRegisterChange,
  onSourceChange,
}: WorkspacePanelProps) {
  if (activePanel === "cpu") {
    return (
      <CpuPanel
        lastOpcode={lastOpcode}
        memory={memory}
        registers={snapshot.registers}
        onFlagChange={onFlagChange}
        onRegisterChange={onRegisterChange}
      />
    );
  }

  if (activePanel === "memory") {
    return <MemoryPanel memory={memory} onMemoryChange={onMemoryChange} />;
  }

  if (activePanel === "io") {
    return <IOPanel ports={snapshot.io.ports} onPortChange={onPortChange} />;
  }

  return (
    <section className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_12rem] lg:grid-rows-[minmax(0,1fr)]">
      <EditorPanel
        activeLine={activeLine}
        consoleOpen={consoleOpen}
        message={message}
        source={source}
        onConsoleToggle={onConsoleToggle}
        onSourceChange={onSourceChange}
      />
      <section className="min-h-0 border-t bg-background lg:hidden">
        <AssembledPanel
          rows={rows}
          activeAddress={activeAddress}
          byteCount={resultByteCount}
        />
      </section>
    </section>
  );
}
