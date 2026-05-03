import { memo, useCallback } from "react";
import {
  Braces,
  Cpu,
  FileCode2,
  FolderOpen,
  Play,
  RotateCcw,
  StepForward,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AssemblySample } from "@/lib/simulator/samples";
import { samples } from "@/lib/simulator/samples";
import { useSimulatorStore } from "@/stores";

export const AppHeader = memo(function AppHeader() {
  const executionFinished = useSimulatorStore(
    (state) => state.executionFinished,
  );
  const assembleProgram = useSimulatorStore((state) => state.assembleProgram);
  const resetProgram = useSimulatorStore((state) => state.resetProgram);
  const runProgram = useSimulatorStore((state) => state.runProgram);
  const loadSample = useSimulatorStore((state) => state.loadSample);
  const stepProgram = useSimulatorStore((state) => state.stepProgram);
  const assembleCurrentSource = useCallback(
    () => assembleProgram(),
    [assembleProgram],
  );

  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-3 border-b bg-card px-3 py-3 sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Cpu />
          </div>
          <h1 className="font-serif text-2xl font-semibold italic">8085</h1>
        </div>
        <Separator orientation="vertical" className="hidden sm:block" />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="min-w-0 justify-between sm:min-w-44">
                <span className="sm:hidden">Samples</span>
                <span className="hidden sm:inline">Load Samples</span>
                <FolderOpen data-icon="inline-end" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Assembly samples</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {samples.map((sample) => (
                <SampleMenuItem
                  key={sample.name}
                  sample={sample}
                  onSampleLoad={loadSample}
                />
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                size="icon"
                variant="ghost"
                onClick={assembleCurrentSource}
              >
                <Braces />
                <span className="sr-only">Assemble</span>
              </Button>
            }
          />
          <TooltipContent>Assemble</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                disabled={executionFinished}
                size="icon"
                variant="ghost"
                onClick={runProgram}
              >
                <Play />
                <span className="sr-only">Run</span>
              </Button>
            }
          />
          <TooltipContent>
            {executionFinished ? "Reset or assemble to run again" : "Run"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                disabled={executionFinished}
                size="icon"
                variant="ghost"
                onClick={stepProgram}
              >
                <StepForward />
                <span className="sr-only">Step</span>
              </Button>
            }
          />
          <TooltipContent>
            {executionFinished ? "Reset or assemble to step again" : "Step"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button size="icon" variant="ghost" onClick={resetProgram}>
                <RotateCcw />
                <span className="sr-only">Reset</span>
              </Button>
            }
          />
          <TooltipContent>Reset</TooltipContent>
        </Tooltip>
        <Separator orientation="vertical" className="hidden sm:block" />
        <ThemeToggle />
      </div>
    </header>
  );
});

const SampleMenuItem = memo(function SampleMenuItem({
  sample,
  onSampleLoad,
}: {
  sample: AssemblySample;
  onSampleLoad: (source: string) => void;
}) {
  const loadSample = useCallback(
    () => onSampleLoad(sample.source),
    [onSampleLoad, sample.source],
  );

  return (
    <DropdownMenuItem onClick={loadSample}>
      <FileCode2 />
      <div className="min-w-0">
        <div>{sample.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {sample.description}
        </div>
      </div>
    </DropdownMenuItem>
  );
});
