import type { AluResult } from "./components/alu";
import type { BusSnapshot } from "./components/bus";
import type { ClockSnapshot } from "./components/clock";
import type { ControlUnitSnapshot } from "./components/control-unit";
import type { IOSnapshot } from "./components/io";
import type { MemorySnapshot } from "./components/memory";
import type { RegistersSnapshot } from "./components/registers";

export interface MachineSnapshot {
  registers: RegistersSnapshot;
  clock: ClockSnapshot;
  bus: BusSnapshot;
  memory: MemorySnapshot;
  io: IOSnapshot;
  controlUnit: ControlUnitSnapshot;
}

export interface MachineStepResult {
  opcode: number;
  alu?: AluResult;
}
