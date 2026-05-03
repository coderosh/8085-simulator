import { Braces } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AssembledRow } from "@/lib/simulator/assembly";
import { formatByte, formatWord } from "@/lib/simulator/format";
import { cn } from "@/lib/utils";

export function AssembledPanel({
  rows,
  activeAddress,
  byteCount,
}: {
  rows: AssembledRow[];
  activeAddress: number;
  byteCount: number;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-[3.25rem] shrink-0 items-center justify-between gap-3 border-b px-5">
        <div className="flex min-w-0 items-center gap-2">
          <Braces />
          <h2 className="truncate font-serif text-lg font-semibold">
            Assembled Code
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="secondary">{byteCount} bytes</Badge>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5">
          {rows.map((row) => (
            <div
              key={`${row.address}-${row.line}`}
              className={cn(
                "grid grid-cols-[3.75rem_6rem_minmax(0,1fr)] items-center border-b px-1 py-3 font-mono text-sm",
                activeAddress >= row.address &&
                  activeAddress < row.address + row.bytes.length &&
                  "bg-primary/10 text-primary",
              )}
            >
              <span className="text-muted-foreground">{formatWord(row.address)}</span>
              <span className="font-semibold">
                {row.bytes.map(formatByte).join(" ")}
              </span>
              <span className="truncate text-muted-foreground">{row.source}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
