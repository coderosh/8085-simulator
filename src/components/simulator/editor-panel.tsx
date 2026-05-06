import {
  AlignLeft,
  Braces,
  ChevronDown,
  ChevronUp,
  FileCode2,
  PanelLeft,
  Terminal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useSimulatorStore } from "@/stores";

import { CodeEditor } from "./code-editor";

export function EditorPanel() {
  const activeLine = useSimulatorStore((state) => state.activeLine);
  const activeFileHasLoadedProgram = useSimulatorStore(
    (state) => state.activeFileHasLoadedProgram,
  );
  const activeFileName = useSimulatorStore((state) => state.activeFileName);
  const assemblyError = useSimulatorStore((state) => state.assemblyError);
  const astHoverSpan = useSimulatorStore((state) => state.astHoverSpan);
  const consoleOpen = useSimulatorStore((state) => state.consoleOpen);
  const fileExplorerCollapsed = useSimulatorStore(
    (state) => state.fileExplorerCollapsed,
  );
  const assembleProgram = useSimulatorStore((state) => state.assembleProgram);
  const formatSource = useSimulatorStore((state) => state.formatSource);
  const setFileExplorerCollapsed = useSimulatorStore(
    (state) => state.setFileExplorerCollapsed,
  );
  const message = useSimulatorStore((state) => state.message);
  const source = useSimulatorStore((state) => state.source);
  const setSource = useSimulatorStore((state) => state.setSource);
  const toggleConsole = useSimulatorStore((state) => state.toggleConsole);

  return (
    <section className="grid h-full min-h-0 grid-rows-[3.25rem_minmax(0,1fr)_auto] bg-card">
      <div className="flex items-center justify-between border-b px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          {fileExplorerCollapsed ? (
            <Button
              size="icon-xs"
              variant="ghost"
              title="Expand file explorer"
              onClick={() => setFileExplorerCollapsed(false)}
            >
              <PanelLeft />
              <span className="sr-only">Expand file explorer</span>
            </Button>
          ) : null}
          <FileCode2 />
          <span className="truncate">{activeFileName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon-sm" variant="ghost" onClick={formatSource}>
            <AlignLeft />
            <span className="sr-only">Format source</span>
          </Button>
          <Button
            size="sm"
            variant={consoleOpen ? "secondary" : "ghost"}
            aria-pressed={consoleOpen}
            onClick={toggleConsole}
          >
            <Terminal data-icon="inline-start" />
            {consoleOpen ? (
              <ChevronDown data-icon="inline-end" />
            ) : (
              <ChevronUp data-icon="inline-end" />
            )}
            <span className="sr-only">Toggle console</span>
          </Button>
        </div>
      </div>

      <ContextMenu>
        <ContextMenuTrigger className="h-full min-h-0 overflow-hidden">
          <CodeEditor
            activeLine={activeFileHasLoadedProgram ? activeLine : undefined}
            diagnostic={assemblyError}
            hoveredSpan={activeFileHasLoadedProgram ? astHoverSpan : null}
            value={source}
            onChange={setSource}
          />
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuGroup>
            <ContextMenuItem onClick={() => assembleProgram()}>
              <Braces />
              Assemble
            </ContextMenuItem>
            <ContextMenuItem onClick={formatSource}>
              <AlignLeft />
              Format source
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={toggleConsole}>
              <Terminal />
              {consoleOpen ? "Hide console" : "Show console"}
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
      {consoleOpen ? (
        <div className="h-32 border-t bg-background">
          <div className="flex h-10 items-center justify-between border-b px-3 sm:px-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Terminal />
              Console
            </div>
          </div>
          <div className="h-[calc(8rem-2.5rem)] overflow-auto px-3 py-3 font-mono text-sm text-muted-foreground sm:px-5">
            {message}
          </div>
        </div>
      ) : null}
    </section>
  );
}
