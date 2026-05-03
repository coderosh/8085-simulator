import { lowerByte } from "./byte";

export function formatByte(value: number): string {
  return lowerByte(value).toString(16).toUpperCase().padStart(2, "0");
}

export function formatWord(value: number): string {
  return (value & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}
