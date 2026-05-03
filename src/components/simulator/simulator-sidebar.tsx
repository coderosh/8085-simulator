import { memo, useCallback } from "react";
import { Cable, Cpu, Database, FileCode2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSimulatorStore } from "@/stores";

import type { SimulatorPanel } from "./types";

const sidebarItems = [
  { id: "editor", icon: FileCode2, label: "Editor" },
  { id: "cpu", icon: Cpu, label: "CPU" },
  { id: "memory", icon: Database, label: "Memory" },
  { id: "io", icon: Cable, label: "I/O" },
] satisfies {
  id: SimulatorPanel;
  icon: typeof FileCode2;
  label: string;
}[];

export const SimulatorSidebar = memo(function SimulatorSidebar() {
  const activePanel = useSimulatorStore((state) => state.activePanel);
  const setActivePanel = useSimulatorStore((state) => state.setActivePanel);

  return (
    <aside className="order-2 flex items-center justify-around gap-2 border-t bg-sidebar px-3 py-2 text-sidebar-foreground md:order-none md:flex-col md:justify-start md:border-r md:border-t-0 md:px-0 md:py-5">
      {sidebarItems.map((item) => {
        const isActive = item.id === activePanel;

        return (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            id={item.id}
            isActive={isActive}
            label={item.label}
            onPanelChange={setActivePanel}
          />
        );
      })}
    </aside>
  );
});

const SidebarItem = memo(function SidebarItem({
  icon: Icon,
  id,
  isActive,
  label,
  onPanelChange,
}: {
  icon: typeof FileCode2;
  id: SimulatorPanel;
  isActive: boolean;
  label: string;
  onPanelChange: (panel: SimulatorPanel) => void;
}) {
  const changePanel = useCallback(
    () => onPanelChange(id),
    [id, onPanelChange],
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size="icon"
            variant={isActive ? "default" : "ghost"}
            className={cn(!isActive && "text-sidebar-foreground")}
            aria-pressed={isActive}
            onClick={changePanel}
          >
            <Icon />
            <span className="sr-only">{label}</span>
          </Button>
        }
      />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
});
