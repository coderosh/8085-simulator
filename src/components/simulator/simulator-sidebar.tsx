import { Cpu, Database, FileCode2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import type { SimulatorPanel } from "./types";

const sidebarItems = [
  { id: "editor", icon: FileCode2, label: "Editor" },
  { id: "cpu", icon: Cpu, label: "CPU" },
  { id: "memory", icon: Database, label: "Memory" },
] satisfies {
  id: SimulatorPanel;
  icon: typeof FileCode2;
  label: string;
}[];

type SimulatorSidebarProps = {
  activePanel: SimulatorPanel;
  onPanelChange: (panel: SimulatorPanel) => void;
};

export function SimulatorSidebar({
  activePanel,
  onPanelChange,
}: SimulatorSidebarProps) {
  return (
    <aside className="flex flex-col items-center gap-4 border-r bg-sidebar py-5 text-sidebar-foreground">
      {sidebarItems.map((item) => {
        const isActive = item.id === activePanel;

        return (
          <Tooltip key={item.id}>
            <TooltipTrigger
              render={
                <Button
                  size="icon"
                  variant={isActive ? "default" : "ghost"}
                  className={cn(!isActive && "text-sidebar-foreground")}
                  aria-pressed={isActive}
                  onClick={() => onPanelChange(item.id)}
                >
                  <item.icon />
                  <span className="sr-only">{item.label}</span>
                </Button>
              }
            />
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </aside>
  );
}
