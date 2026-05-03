import { useState } from "react";

import { parseHexValue } from "@/lib/simulator/format";

type MemoryCellInputProps = {
  ariaLabel: string;
  value: number;
  onCommit: (value: number) => void;
};

export function MemoryCellInput({
  ariaLabel,
  value,
  onCommit,
}: MemoryCellInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const formattedValue = value.toString(16).toUpperCase().padStart(2, "0");
  const displayValue = draft ?? formattedValue;
  const isInvalid = draft !== null && draft !== "" && parseHexValue(draft, 0xff) === null;

  const commit = () => {
    if (draft === null) return;

    const parsed = parseHexValue(draft, 0xff);

    setDraft(null);

    if (parsed === null) return;

    onCommit(parsed);
  };

  return (
    <input
      aria-invalid={isInvalid}
      aria-label={ariaLabel}
      value={displayValue}
      maxLength={2}
      inputMode="text"
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
      className="h-11 w-full bg-transparent text-center font-mono text-sm uppercase outline-none transition-colors focus:bg-primary/10 focus:text-primary aria-invalid:text-destructive"
    />
  );
}
