export function formatByte(value: number) {
  return value.toString(16).toUpperCase().padStart(2, "0");
}

export function formatWord(value: number) {
  return value.toString(16).toUpperCase().padStart(4, "0");
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function parseHexValue(value: string, max: number) {
  const normalized = value.trim().replace(/^0x/i, "").replace(/h$/i, "");

  if (!/^[\da-f]+$/i.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 16);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > max) {
    return null;
  }

  return parsed;
}
