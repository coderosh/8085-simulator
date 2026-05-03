import { Binary, Gauge, HardDrive, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MachineSnapshot } from "@/core/machine";
import { BASE_ADDRESS } from "@/lib/simulator/constants";
import { formatByte, formatWord } from "@/lib/simulator/format";

import { Metric } from "./metric";

type DebugPanelProps = {
  lastOpcode: number | null;
  message: string;
  registers: MachineSnapshot["registers"];
  flags: readonly (readonly [string, boolean])[];
  memory: number[];
};

export function DebugPanel({
  lastOpcode,
  message,
  registers,
  flags,
  memory,
}: DebugPanelProps) {
  const registerRows = [
    ["A", registers.a],
    ["B", registers.b],
    ["C", registers.c],
    ["D", registers.d],
    ["E", registers.e],
    ["H", registers.h],
    ["L", registers.l],
    ["PC", registers.pc],
    ["SP", registers.sp],
  ] as const;

  return (
    <div className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] border-t">
      <div className="grid grid-cols-3 border-b">
        <Metric icon={Gauge} label="PC Delta" value={String(registers.pc - BASE_ADDRESS)} />
        <Metric
          icon={Zap}
          label="Opcode"
          value={lastOpcode === null ? "--" : formatByte(lastOpcode)}
        />
        <Metric icon={HardDrive} label="Memory" value={`${memory.length}B`} />
      </div>

      <div className="grid grid-cols-3 gap-3 border-b p-4">
        {flags.map(([label, enabled]) => (
          <Badge key={label} variant={enabled ? "default" : "outline"}>
            {label}: {enabled ? "1" : "0"}
          </Badge>
        ))}
      </div>

      <div className="grid min-h-0 grid-cols-[1fr_1fr]">
        <ScrollArea className="border-r">
          <div className="grid grid-cols-3 gap-2 p-4">
            {registerRows.map(([label, value]) => (
              <div key={label} className="rounded-md border bg-card p-2">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="font-mono text-sm font-semibold">
                  {label.length === 1 ? formatByte(value) : formatWord(value)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <ScrollArea>
          <div className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Binary />
              {message}
            </div>
            <div className="grid grid-cols-4 gap-2 font-mono text-sm">
              {memory.map((value, index) => (
                <div key={`${index}-${value}`} className="rounded-md border bg-card p-2">
                  <div className="text-xs text-muted-foreground">
                    {formatWord(BASE_ADDRESS + index)}
                  </div>
                  <div className="font-semibold">{formatByte(value)}</div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
