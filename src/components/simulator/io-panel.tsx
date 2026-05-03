import { Cable } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatByte } from "@/lib/simulator/format";

import { MemoryCellInput } from "./memory-cell-input";

const columns = Array.from({ length: 16 }, (_, index) => index);
const rowCount = 16;
const portCount = columns.length * rowCount;

type IOPanelProps = {
  ports: Uint8Array;
  onPortChange: (port: number, value: number) => void;
};

export function IOPanel({ ports, onPortChange }: IOPanelProps) {
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => {
    const rowPort = rowIndex * 16;

    return {
      port: rowPort,
      ports: columns.map((column) => {
        const port = rowPort + column;

        return {
          port,
          value: ports[port],
        };
      }),
    };
  });

  return (
    <section className="grid min-h-0 grid-rows-[3.25rem_minmax(0,1fr)] bg-card">
      <div className="flex items-center justify-between border-b px-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Cable />
          I/O Ports
        </div>
        <div className="text-sm text-muted-foreground">
          {portCount} ports
        </div>
      </div>
      <ScrollArea className="min-h-0">
        <div className="p-5">
          <Table className="min-w-[56rem] table-fixed border font-mono">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24 border-r text-center text-muted-foreground">
                  Port
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
                <TableRow key={row.port} className="hover:bg-muted/20">
                  <TableCell className="border-r bg-muted/20 text-center font-semibold text-muted-foreground">
                    {formatByte(row.port)}
                  </TableCell>
                  {row.ports.map((port) => (
                    <TableCell
                      key={port.port}
                      className="border-r p-0 text-center last:border-r-0"
                    >
                      <MemoryCellInput
                        ariaLabel={`I/O port ${formatByte(port.port)}`}
                        value={port.value}
                        onCommit={(value) => onPortChange(port.port, value)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 text-xs text-muted-foreground">
            Ports are 8-bit values addressed from 00H to FFH.
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}
