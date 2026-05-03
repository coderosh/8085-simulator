import { lowerByte } from "@core/utils";
import type { IOSnapshot, PortDevice } from "./types";

const PORT_COUNT = 0x100;

export class IO {
  private ports = new Uint8Array(PORT_COUNT);
  private devices = new Map<number, PortDevice>();

  reset(): void {
    this.ports.fill(0);
  }

  attach(port: number, device: PortDevice): void {
    this.devices.set(this.normalizePort(port), device);
  }

  detach(port: number): void {
    this.devices.delete(this.normalizePort(port));
  }

  read(port: number): number {
    const normalizedPort = this.normalizePort(port);
    const device = this.devices.get(normalizedPort);

    if (device?.read) {
      return lowerByte(device.read(normalizedPort));
    }

    return this.ports[normalizedPort];
  }

  write(port: number, value: number): void {
    const normalizedPort = this.normalizePort(port);
    const byte = lowerByte(value);
    const device = this.devices.get(normalizedPort);

    this.ports[normalizedPort] = byte;
    device?.write?.(normalizedPort, byte);
  }

  snapshot(): IOSnapshot {
    return {
      ports: new Uint8Array(this.ports),
    };
  }

  private normalizePort(port: number): number {
    return port & 0xff;
  }
}
