export type PortReadHandler = (port: number) => number;
export type PortWriteHandler = (port: number, value: number) => void;

export interface PortDevice {
  read?: PortReadHandler;
  write?: PortWriteHandler;
}

export interface IOSnapshot {
  ports: Uint8Array;
}
