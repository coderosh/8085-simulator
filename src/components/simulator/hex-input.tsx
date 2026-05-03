import { useState } from "react";

import { Input } from "@/components/ui/input";
import { parseHexValue } from "@/lib/simulator/format";

type HexInputProps = {
  ariaLabel: string;
  digits: number;
  max: number;
  value: number;
  onCommit: (value: number) => void;
};

export function HexInput({
  ariaLabel,
  digits,
  max,
  value,
  onCommit,
}: HexInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const formattedValue = value.toString(16).toUpperCase().padStart(digits, "0");
  const displayValue = draft ?? formattedValue;
  const isInvalid =
    draft !== null && draft !== "" && parseHexValue(draft, max) === null;

  const commit = () => {
    if (draft === null) return;

    const parsed = parseHexValue(draft, max);

    setDraft(null);

    if (parsed === null) return;

    onCommit(parsed);
  };

  return (
    <Input
      aria-invalid={isInvalid}
      aria-label={ariaLabel}
      value={displayValue}
      inputMode="text"
      maxLength={digits}
      onBlur={commit}
      onChange={(event) => {
        const nextValue = event.target.value.toUpperCase();

        if (/^[\dA-F]*$/.test(nextValue)) {
          setDraft(nextValue);
        }
      }}
      onFocus={() => setDraft(formattedValue)}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;

        event.currentTarget.blur();
      }}
      className="h-8 rounded-md px-2 font-mono text-sm uppercase"
    />
  );
}
