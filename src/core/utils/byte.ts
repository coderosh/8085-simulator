export function lowerByte(value: number): number {
  return value & 0xff;
}

export function higherByte(value: number): number {
  return (value >> 8) & 0xff;
}

export function toWord(high: number, low: number): number {
  return (lowerByte(high) << 8) | lowerByte(low);
}
