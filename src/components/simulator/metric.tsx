import type { LucideIcon } from "lucide-react";

export function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-r p-4 last:border-r-0">
      <div className="flex size-9 items-center justify-center rounded-md bg-muted">
        <Icon />
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs text-muted-foreground">{label}</div>
        <div className="font-mono text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}
