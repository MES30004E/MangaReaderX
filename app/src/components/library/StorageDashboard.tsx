import { useQuery } from "@tanstack/react-query";
import { computeStorageStats, formatBytes } from "@/lib/storage-stats";
import { listManga } from "@/lib/manga-api";
import { useAuth } from "@/lib/auth-context";
import { Progress } from "@/components/ui/progress";
import { HardDrive, AlertTriangle, CloudOff } from "lucide-react";

export function StorageDashboard() {
  const { user } = useAuth();
  const statsQ = useQuery({
    queryKey: ["storage-stats"],
    queryFn: computeStorageStats,
    staleTime: 60_000,
  });
  const mangaQ = useQuery({
    queryKey: ["manga", user?.id],
    queryFn: listManga,
    enabled: !!user,
  });

  const stats = statsQ.data;
  const allManga = mangaQ.data ?? [];
  const localCount = stats
    ? allManga.filter((m) => (stats.perManga[m.id]?.blobs ?? 0) > 0).length
    : 0;
  const metadataOnly = allManga.length - localCount;

  const usagePct =
    stats?.quota && stats.quota > 0 && stats.originUsage != null
      ? Math.min(100, Math.round((stats.originUsage / stats.quota) * 100))
      : null;

  const pressure = usagePct !== null && usagePct >= 80;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface-elevated">
          <HardDrive className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Local storage
          </h2>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-display text-2xl tracking-wide">
              {formatBytes(stats?.bytesUsed ?? 0)}
            </span>
            <span className="text-xs text-muted-foreground">
              {stats?.blobCount ?? 0} pages · {localCount} manga on device
              {metadataOnly > 0 && ` · ${metadataOnly} metadata-only`}
            </span>
          </div>

          {usagePct !== null && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  Browser quota for this site
                </span>
                <span className={pressure ? "text-destructive font-medium" : "text-muted-foreground"}>
                  {formatBytes(stats?.originUsage ?? 0)} / {formatBytes(stats?.quota ?? 0)}
                </span>
              </div>
              <Progress value={usagePct} />
            </div>
          )}

          {pressure && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 flex-none mt-0.5" />
              <p>
                You're nearing your browser's storage limit. Delete unused manga or
                clear chapters from device to make room.
              </p>
            </div>
          )}

          <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-surface-elevated p-3 text-xs text-muted-foreground">
            <CloudOff className="h-4 w-4 flex-none mt-0.5" />
            <p>
              Metadata and reading progress sync to your account. Page images stay on
              this device only — re-import on another device until cloud file backup
              ships.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
