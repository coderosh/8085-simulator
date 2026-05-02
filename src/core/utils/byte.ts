export function lowerByte(value: number): number {
  return value & 0xff;
}

export function higherByte(value: number): number {
  return (value >> 8) & 0xff;
}
