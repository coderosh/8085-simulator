import { memo } from "react";

import { useSimulatorStore } from "@/stores";

import { AssembledPanel } from "./assembled-panel";
import { CpuPanel } from "./cpu-panel";
import { EditorPanel } from "./editor-panel";
import { IOPanel } from "./io-panel";
import { MemoryPanel } from "./memory-panel";

export const WorkspacePanel = memo(function WorkspacePanel() {
  const activePanel = useSimulatorStore((state) => state.activePanel);

  if (activePanel === "cpu") {
    return <CpuPanel />;
  }

  if (activePanel === "memory") {
    return <MemoryPanel />;
  }

  if (activePanel === "io") {
    return <IOPanel />;
  }

  return (
    <section className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_10rem] sm:grid-rows-[minmax(0,1fr)_12rem] lg:grid-rows-[minmax(0,1fr)]">
      <EditorPanel />
      <section className="min-h-0 border-t bg-background lg:hidden">
        <AssembledPanel />
      </section>
    </section>
  );
});
