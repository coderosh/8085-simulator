import { memo } from "react";

import { useSimulatorStore } from "@/stores";

import { AssembledPanel } from "./assembled-panel";
import { CpuPanel } from "./cpu-panel";
import { EditorPanel } from "./editor-panel";
import { FileExplorerPanel } from "./file-explorer-panel";
import { IOPanel } from "./io-panel";
import { MemoryPanel } from "./memory-panel";

export const WorkspacePanel = memo(function WorkspacePanel() {
  const activePanel = useSimulatorStore((state) => state.activePanel);
  const fileExplorerCollapsed = useSimulatorStore(
    (state) => state.fileExplorerCollapsed,
  );

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
      <div
        className={fileExplorerCollapsed
          ? "grid min-h-0 grid-rows-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)] md:grid-rows-1"
          : "grid min-h-0 grid-rows-[12rem_minmax(0,1fr)] md:grid-cols-[17rem_minmax(0,1fr)] md:grid-rows-1"}
      >
        {fileExplorerCollapsed ? null : <FileExplorerPanel />}
        <EditorPanel />
      </div>
      <section className="min-h-0 border-t bg-background lg:hidden">
        <AssembledPanel />
      </section>
    </section>
  );
});
