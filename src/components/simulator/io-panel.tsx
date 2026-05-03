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
import { useSimulatorStore } from "@/stores";

import { MemoryCellInput } from "./memory-cell-input";

const columns = Array.from({ length: 16 }, (_, index) => index);
const rowCount = 16;
const portCount = columns.length * rowCount;

export function IOPanel() {
  const ports = useSimulatorStore((state) => state.ports);
  const updatePort = useSimulatorStore((state) => state.updatePort);
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
    <section className="grid h-full min-h-0 grid-rows-[3.25rem_minmax(0,1fr)] bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-3 sm:px-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Cable />
          I/O Ports
        </div>
        <div className="text-sm text-muted-foreground">
          {portCount} ports
        </div>
      </div>
      <ScrollArea className="min-h-0">
        <div className="p-3 sm:p-5">
          <div className="grid gap-3 md:hidden">
            {rows.map((row) => (
              <section key={row.port} className="overflow-hidden rounded-md border">
                <div className="border-b bg-muted/20 px-3 py-2 font-mono text-sm font-semibold text-muted-foreground">
                  {formatByte(row.port)}H
                </div>
                <div className="grid grid-cols-4">
                  {row.ports.map((port) => (
                    <div key={port.port} className="border-r border-b last:border-r-0 [&:nth-child(4n)]:border-r-0 [&:nth-last-child(-n+4)]:border-b-0">
                      <div className="border-b bg-muted/20 py-1 text-center font-mono text-[0.625rem] text-muted-foreground">
                        +{(port.port & 0xf).toString(16).toUpperCase()}
                      </div>
                      <MemoryCellInput
                        ariaLabel={`I/O port ${formatByte(port.port)}`}
                        value={port.value}
                        onCommit={(value) => updatePort(port.port, value)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <Table className="hidden table-fixed border font-mono md:table">
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
                        onCommit={(value) => updatePort(port.port, value)}
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
