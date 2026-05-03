import { Cpu } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import type { MachineSnapshot } from "@/core/machine";
import type { FlagName } from "@/core/machine/components/registers";
import { BASE_ADDRESS } from "@/lib/simulator/constants";
import { formatByte, formatWord } from "@/lib/simulator/format";

import { HexInput } from "./hex-input";

type CpuPanelProps = {
  lastOpcode: number | null;
  memory: Uint8Array;
  registers: MachineSnapshot["registers"];
  onFlagChange: (flag: FlagName, value: boolean) => void;
  onRegisterChange: (register: string, value: number) => void;
};

export function CpuPanel({
  lastOpcode,
  memory,
  registers,
  onFlagChange,
  onRegisterChange,
}: CpuPanelProps) {
  const registerRows = [
    { label: "A", value: registers.a, digits: 2, max: 0xff },
    { label: "B", value: registers.b, digits: 2, max: 0xff },
    { label: "C", value: registers.c, digits: 2, max: 0xff },
    { label: "D", value: registers.d, digits: 2, max: 0xff },
    { label: "E", value: registers.e, digits: 2, max: 0xff },
    { label: "H", value: registers.h, digits: 2, max: 0xff },
    { label: "L", value: registers.l, digits: 2, max: 0xff },
  ];
  const addressRows = [
    { label: "PC", value: registers.pc, editable: true },
    { label: "SP", value: registers.sp, editable: true },
    { label: "BC", value: toWord(registers.b, registers.c), editable: false },
    { label: "DE", value: toWord(registers.d, registers.e), editable: false },
    { label: "HL", value: toWord(registers.h, registers.l), editable: false },
  ];
  const flags = [
    { label: "S", name: "sign", value: registers.flags.sign },
    { label: "Z", name: "zero", value: registers.flags.zero },
    { label: "AC", name: "auxiliaryCarry", value: registers.flags.auxiliaryCarry },
    { label: "P", name: "parity", value: registers.flags.parity },
    { label: "CY", name: "carry", value: registers.flags.carry },
  ] satisfies { label: string; name: FlagName; value: boolean }[];

  return (
    <section className="grid min-h-0 grid-rows-[3.25rem_minmax(0,1fr)] bg-card">
      <div className="flex items-center justify-between border-b px-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Cpu />
          CPU State
        </div>
        <Badge variant="secondary">
          Opcode {lastOpcode === null ? "--" : formatByte(lastOpcode)}
        </Badge>
      </div>
      <ScrollArea className="min-h-0">
        <div className="grid gap-5 p-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {registerRows.map((register) => (
              <div key={register.label} className="rounded-md border bg-background p-4">
                <div className="mb-2 text-xs text-muted-foreground">
                  {register.label}
                </div>
                <HexInput
                  ariaLabel={`${register.label} register`}
                  digits={register.digits}
                  max={register.max}
                  value={register.value}
                  onCommit={(value) => onRegisterChange(register.label, value)}
                />
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <div className="rounded-md border bg-background p-4">
              <div className="mb-3 text-sm font-medium">Flags</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {flags.map((flag) => (
                  <label
                    key={flag.name}
                    className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
                  >
                    <span className="font-mono text-sm">{flag.label}</span>
                    <Switch
                      checked={flag.value}
                      onCheckedChange={(value) => onFlagChange(flag.name, value)}
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-md border bg-background p-4">
              <div className="mb-3 text-sm font-medium">Execution</div>
              <div className="grid gap-2 font-mono text-sm text-muted-foreground">
                <div>Start {formatWord(BASE_ADDRESS)}H</div>
                <div>Current {formatWord(registers.pc)}H</div>
              </div>
            </div>
          </div>
          <div className="rounded-md border bg-background p-4">
            <div className="mb-3 text-sm font-medium">Address Pointers</div>
            <div className="grid gap-2">
              {addressRows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[3rem_minmax(0,1fr)_5rem] items-center gap-3 rounded-md border bg-card px-3 py-2"
                >
                  <div className="font-mono text-sm text-muted-foreground">
                    {row.label}
                  </div>
                  {row.editable ? (
                    <HexInput
                      ariaLabel={`${row.label} address`}
                      digits={4}
                      max={0xffff}
                      value={row.value}
                      onCommit={(value) => onRegisterChange(row.label, value)}
                    />
                  ) : (
                    <div className="font-mono text-sm">
                      {formatWord(row.value)}H
                    </div>
                  )}
                  <div className="text-right font-mono text-sm text-muted-foreground">
                    {formatMemoryValue(memory, row.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}

function toWord(high: number, low: number): number {
  return ((high & 0xff) << 8) | (low & 0xff);
}

function formatMemoryValue(memory: Uint8Array, address: number): string {
  if (!Number.isInteger(address) || address < 0 || address >= memory.length) {
    return "-";
  }

  return `${formatByte(memory[address])}H`;
}
