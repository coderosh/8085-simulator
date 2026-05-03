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

type AppHeaderProps = {
  executionFinished: boolean;
  samples: AssemblySample[];
  onAssemble: () => void;
  onReset: () => void;
  onRun: () => void;
  onSampleLoad: (source: string) => void;
  onStep: () => void;
};

export function AppHeader({
  executionFinished,
  samples,
  onAssemble,
  onReset,
  onRun,
  onSampleLoad,
  onStep,
}: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center border-b bg-card px-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Cpu />
          </div>
          <h1 className="font-serif text-2xl font-semibold italic">8085 SIM</h1>
        </div>
        <Separator orientation="vertical" className="hidden sm:block" />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" className="min-w-44 justify-between">
                Load Samples
                <FolderOpen data-icon="inline-end" />
              </Button>
            }
          />
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Assembly samples</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {samples.map((sample) => (
                <DropdownMenuItem
                  key={sample.name}
                  onClick={() => onSampleLoad(sample.source)}
                >
                  <FileCode2 />
                  <div className="min-w-0">
                    <div>{sample.name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {sample.description}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button size="icon" variant="ghost" onClick={onAssemble}>
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
                onClick={onRun}
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
                onClick={onStep}
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
              <Button size="icon" variant="ghost" onClick={onReset}>
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
}
