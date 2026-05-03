import { useMemo, useState } from "react";
import { Database } from "lucide-react";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BASE_ADDRESS } from "@/lib/simulator/constants";
import { formatWord, parseHexValue } from "@/lib/simulator/format";
import { useSimulatorStore } from "@/stores";

import { MemoryCellInput } from "./memory-cell-input";

const columns = Array.from({ length: 16 }, (_, index) => index);
const rowCount = 8;
const byteCount = columns.length * rowCount;

export function MemoryPanel() {
  const memory = useSimulatorStore((state) => state.memory);
  const updateMemory = useSimulatorStore((state) => state.updateMemory);
  const [addressDraft, setAddressDraft] = useState(formatWord(BASE_ADDRESS));
  const parsedAddress = parseHexValue(addressDraft, 0xffff);
  const pageAddress = ((parsedAddress ?? BASE_ADDRESS) & 0xfff0) >>> 0;
  const rows = useMemo(
    () =>
      Array.from({ length: rowCount }, (_, rowIndex) => {
        const rowAddress = (pageAddress + rowIndex * 16) & 0xffff;

        return {
          address: rowAddress,
          bytes: columns.map((column) => ({
            address: (rowAddress + column) & 0xffff,
            value: memory[(rowAddress + column) & 0xffff],
          })),
        };
      }),
    [memory, pageAddress],
  );

  return (
    <section className="grid min-h-0 grid-rows-[3.25rem_minmax(0,1fr)] bg-card">
      <div className="flex items-center justify-between border-b px-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Database />
          Memory
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Addr:
          <Input
            aria-invalid={parsedAddress === null}
            aria-label="Memory base address"
            value={addressDraft}
            maxLength={4}
            onChange={(event) => setAddressDraft(event.target.value.toUpperCase())}
            className="h-8 w-24 rounded-md font-mono text-sm uppercase"
          />
          H
        </label>
      </div>
      <ScrollArea className="min-h-0">
        <div className="p-5">
          <Table className="min-w-[56rem] table-fixed border font-mono">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24 border-r text-center text-muted-foreground">
                  Addr
                </TableHead>
                {columns.map((column) => (
                  <TableHead
                    key={column}
                    className="border-r text-center text-muted-foreground last:border-r-0"
                  >
                    {column.toString(16).toUpperCase()}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.address} className="hover:bg-muted/20">
                  <TableCell className="border-r bg-muted/20 text-center font-semibold text-muted-foreground">
                    {formatWord(row.address)}
                  </TableCell>
                  {row.bytes.map((byte) => (
                    <TableCell
                      key={byte.address}
                      className="border-r p-0 text-center last:border-r-0"
                    >
                      <MemoryCellInput
                        ariaLabel={`Memory ${formatWord(byte.address)}`}
                        value={byte.value}
                        onCommit={(value) => updateMemory(byte.address, value)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 text-xs text-muted-foreground">
            Showing {byteCount} bytes from {formatWord(pageAddress)}H.
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}
