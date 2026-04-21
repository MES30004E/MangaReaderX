import type { AvailabilityState } from "@/lib/storage-stats";
import { CheckCircle2, CloudOff, Download, AlertCircle } from "lucide-react";

const MAP: Record<
  AvailabilityState,
  { label: string; cls: string; Icon: typeof CheckCircle2 }
> = {
  ready: {
    label: "Ready",
    cls: "bg-primary/15 text-primary border-primary/30",
    Icon: CheckCircle2,
  },
  available: {
    label: "On device",
    cls: "bg-surface-elevated text-foreground border-border",
    Icon: CheckCircle2,
  },
  metadata_only: {
    label: "Metadata only",
    cls: "bg-muted text-muted-foreground border-border",
    Icon: CloudOff,
  },
  needs_import: {
    label: "Needs import",
    cls: "bg-destructive/15 text-destructive border-destructive/30",
    Icon: AlertCircle,
  },
};

export function AvailabilityBadge({
  state,
  compact = false,
}: {
  state: AvailabilityState;
  compact?: boolean;
}) {
  const { label, cls, Icon } = MAP[state];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}
      title={label}
    >
      <Icon className="h-3 w-3" />
      {!compact && label}
    </span>
  );
}

export { Download };
