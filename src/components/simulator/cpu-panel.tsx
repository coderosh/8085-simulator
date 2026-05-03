import { memo, useCallback, useMemo, type ReactNode } from "react";
import { Bell, BellOff, Cpu } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { RestartInterrupt } from "@/core/machine/components/interrupts";
import type { FlagName } from "@/core/machine/components/registers";
import { formatByte, formatWord } from "@/lib/simulator/format";
import { useSimulatorStore } from "@/stores";

import { HexInput } from "./hex-input";

export const CpuPanel = memo(function CpuPanel() {
  const interrupts = useSimulatorStore((state) => state.interrupts);
  const lastOpcode = useSimulatorStore((state) => state.lastOpcode);
  const memory = useSimulatorStore((state) => state.memory);
  const registers = useSimulatorStore((state) => state.registers);
  const updateFlag = useSimulatorStore((state) => state.updateFlag);
  const updateInterruptRequest = useSimulatorStore(
    (state) => state.updateInterruptRequest,
  );
  const updateRegister = useSimulatorStore((state) => state.updateRegister);
  const registerPairs = useMemo(
    () => [
      [
        { label: "B", value: registers.b },
        { label: "C", value: registers.c },
      ],
      [
        { label: "D", value: registers.d },
        { label: "E", value: registers.e },
      ],
      [
        { label: "H", value: registers.h },
        { label: "L", value: registers.l },
      ],
    ],
    [
      registers.b,
      registers.c,
      registers.d,
      registers.e,
      registers.h,
      registers.l,
    ],
  );
  const pointerRows = useMemo(
    () => [
      { label: "PC", value: registers.pc, editable: true },
      { label: "SP", value: registers.sp, editable: true },
      { label: "BC", value: toWord(registers.b, registers.c), editable: false },
      { label: "DE", value: toWord(registers.d, registers.e), editable: false },
      { label: "HL", value: toWord(registers.h, registers.l), editable: false },
    ],
    [
      registers.b,
      registers.c,
      registers.d,
      registers.e,
      registers.h,
      registers.l,
      registers.pc,
      registers.sp,
    ],
  );
  const flags = useMemo(
    () =>
      [
        { label: "S", name: "sign", value: registers.flags.sign },
        { label: "Z", name: "zero", value: registers.flags.zero },
        {
          label: "AC",
          name: "auxiliaryCarry",
          value: registers.flags.auxiliaryCarry,
        },
        { label: "P", name: "parity", value: registers.flags.parity },
        { label: "CY", name: "carry", value: registers.flags.carry },
      ] satisfies { label: string; name: FlagName; value: boolean }[],
    [
      registers.flags.auxiliaryCarry,
      registers.flags.carry,
      registers.flags.parity,
      registers.flags.sign,
      registers.flags.zero,
    ],
  );
  const interruptRows = useMemo(
    () =>
      [
        {
          label: "RST 5.5",
          name: "rst55",
          mask: interrupts.masks.rst55,
          pending: interrupts.pending.rst55,
        },
        {
          label: "RST 6.5",
          name: "rst65",
          mask: interrupts.masks.rst65,
          pending: interrupts.pending.rst65,
        },
        {
          label: "RST 7.5",
          name: "rst75",
          mask: interrupts.masks.rst75,
          pending: interrupts.pending.rst75,
        },
      ] satisfies {
        label: string;
        name: RestartInterrupt;
        mask: boolean;
        pending: boolean;
      }[],
    [
      interrupts.masks.rst55,
      interrupts.masks.rst65,
      interrupts.masks.rst75,
      interrupts.pending.rst55,
      interrupts.pending.rst65,
      interrupts.pending.rst75,
    ],
  );
  const commitAccumulator = useCallback(
    (value: number) => updateRegister("A", value),
    [updateRegister],
  );

  return (
    <section className="grid min-h-0 grid-rows-[3.25rem_minmax(0,1fr)] bg-card">
      <div className="flex items-center justify-between border-b px-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Cpu />
          CPU State
        </div>
        <Badge variant="outline">
          Op {lastOpcode === null ? "--" : formatByte(lastOpcode)}
        </Badge>
      </div>
      <div className="min-h-0 overflow-auto">
        <div className="flex flex-col gap-4 p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(8rem,0.7fr)_minmax(0,2fr)]">
            <div className="rounded-md border bg-background p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Accumulator
              </div>
              <HexInput
                ariaLabel="A register"
                digits={2}
                max={0xff}
                value={registers.a}
                onCommit={commitAccumulator}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {registerPairs.map((pair) => (
                <div
                  key={pair.map((register) => register.label).join("")}
                  className="grid grid-cols-2 rounded-md border bg-background"
                >
                  {pair.map((register, index) => (
                    <RegisterInput
                      key={register.label}
                      label={register.label}
                      value={register.value}
                      className={index === 0 ? "border-r" : undefined}
                      onRegisterChange={updateRegister}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
            <PanelBlock title="Flags">
              <div className="grid grid-cols-5 gap-2">
                {flags.map((flag) => (
                  <FlagToggle
                    key={flag.name}
                    label={flag.label}
                    name={flag.name}
                    value={flag.value}
                    onFlagChange={updateFlag}
                  />
                ))}
              </div>
            </PanelBlock>

            <PanelBlock title="Pointers">
              <div className="grid gap-2">
                {pointerRows.map((row) => (
                  <PointerRow
                    key={row.label}
                    label={row.label}
                    value={row.value}
                    memory={memory}
                    editable={row.editable}
                    onRegisterChange={updateRegister}
                  />
                ))}
              </div>
            </PanelBlock>
          </div>

          <PanelBlock
            title="Interrupts"
            action={
              <Badge variant={interrupts.enabled ? "default" : "outline"}>
                {interrupts.enabled ? "EI" : "DI"}
              </Badge>
            }
          >
            <div className="grid gap-2">
              {interruptRows.map((interrupt) => (
                <InterruptRow
                  key={interrupt.label}
                  label={interrupt.label}
                  mask={interrupt.mask}
                  name={interrupt.name}
                  pending={interrupt.pending}
                  onInterruptRequestChange={updateInterruptRequest}
                />
              ))}
              <div className="grid grid-cols-3 gap-2">
                <InterruptBit label="SID" value={interrupts.serialInput} />
                <InterruptBit label="SOD" value={interrupts.serialOutput} />
                <InterruptBit
                  label="SDE"
                  value={interrupts.serialOutputEnabled}
                />
              </div>
            </div>
          </PanelBlock>
        </div>
      </div>
    </section>
  );
});

const PanelBlock = memo(function PanelBlock({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
});

const RegisterInput = memo(function RegisterInput({
  label,
  value,
  className,
  onRegisterChange,
}: {
  label: string;
  value: number;
  className?: string;
  onRegisterChange: (register: string, value: number) => void;
}) {
  const commitRegister = useCallback(
    (nextValue: number) => onRegisterChange(label, nextValue),
    [label, onRegisterChange],
  );

  return (
    <div className={className}>
      <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <div className="p-3">
        <HexInput
          ariaLabel={`${label} register`}
          digits={2}
          max={0xff}
          value={value}
          onCommit={commitRegister}
        />
      </div>
    </div>
  );
});

const PointerRow = memo(function PointerRow({
  label,
  value,
  memory,
  editable = false,
  onRegisterChange,
}: {
  label: string;
  value: number;
  memory: Uint8Array;
  editable?: boolean;
  onRegisterChange: (register: string, value: number) => void;
}) {
  const commitPointer = useCallback(
    (nextValue: number) => onRegisterChange(label, nextValue),
    [label, onRegisterChange],
  );

  return (
    <div className="grid min-h-12 grid-cols-[3rem_minmax(0,1fr)_4.5rem] items-center gap-3 rounded-md border bg-card px-3 py-2">
      <div className="font-mono text-sm text-muted-foreground">{label}</div>
      {editable ? (
        <HexInput
          ariaLabel={`${label} address`}
          digits={4}
          max={0xffff}
          value={value}
          onCommit={commitPointer}
        />
      ) : (
        <div className="font-mono text-sm font-semibold">
          {formatWord(value)}H
        </div>
      )}
      <div className="text-right font-mono text-sm text-muted-foreground">
        {formatMemoryValue(memory, value)}
      </div>
    </div>
  );
});

const FlagToggle = memo(function FlagToggle({
  label,
  name,
  value,
  onFlagChange,
}: {
  label: string;
  name: FlagName;
  value: boolean;
  onFlagChange: (flag: FlagName, value: boolean) => void;
}) {
  const changeFlag = useCallback(
    (nextValue: boolean) => onFlagChange(name, nextValue),
    [name, onFlagChange],
  );

  return (
    <label className="flex min-h-16 flex-col items-center justify-center gap-2 rounded-md border bg-card px-2 py-2">
      <span className="font-mono text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={changeFlag} />
    </label>
  );
});

const InterruptRow = memo(function InterruptRow({
  label,
  mask,
  name,
  pending,
  onInterruptRequestChange,
}: {
  label: string;
  mask: boolean;
  name: RestartInterrupt;
  pending: boolean;
  onInterruptRequestChange: (
    interrupt: RestartInterrupt,
    pending: boolean,
  ) => void;
}) {
  const toggleInterrupt = useCallback(
    () => onInterruptRequestChange(name, !pending),
    [name, onInterruptRequestChange, pending],
  );

  return (
    <div className="grid min-h-12 grid-cols-[minmax(4.75rem,1fr)_auto] items-center gap-3 rounded-md border bg-card px-3 py-2 sm:grid-cols-[minmax(5rem,1fr)_auto_auto_auto]">
      <span className="font-mono text-sm">{label}</span>
      <div className="flex gap-2 sm:contents">
        <Badge variant={mask ? "outline" : "secondary"}>
          {mask ? "Masked" : "Open"}
        </Badge>
        <Badge variant={pending ? "default" : "outline"}>
          {pending ? "Pending" : "Idle"}
        </Badge>
      </div>
      <Button
        size="sm"
        variant={pending ? "ghost" : "outline"}
        onClick={toggleInterrupt}
      >
        {pending ? (
          <BellOff data-icon="inline-start" />
        ) : (
          <Bell data-icon="inline-start" />
        )}
        {pending ? "Clear" : "Request"}
      </Button>
    </div>
  );
});

const InterruptBit = memo(function InterruptBit({
  label,
  value,
}: {
  label: string;
  value: boolean;
}) {
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-center">
      <div className="font-mono text-sm">{label}</div>
      <div className="font-mono text-xs text-muted-foreground">
        {value ? "1" : "0"}
      </div>
    </div>
  );
});

function toWord(high: number, low: number): number {
  return ((high & 0xff) << 8) | (low & 0xff);
}

function formatMemoryValue(memory: Uint8Array, address: number): string {
  if (!Number.isInteger(address) || address < 0 || address >= memory.length) {
    return "-";
  }

  return `${formatByte(memory[address])}H`;
}
