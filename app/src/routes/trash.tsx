import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { hardDeleteManga, listTrashed, restoreManga } from "@/lib/manga-api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/trash")({
  component: TrashPage,
});

function TrashPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  const q = useQuery({ queryKey: ["trash", user?.id], queryFn: listTrashed, enabled: !!user });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl tracking-wide mb-4">Trash</h1>
      <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
        {(q.data ?? []).length === 0 && (
          <div className="p-6 text-center text-muted-foreground text-sm">Empty.</div>
        )}
        {(q.data ?? []).map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{m.title}</div>
              <div className="text-xs text-muted-foreground">
                Deleted {m.deleted_at ? new Date(m.deleted_at).toLocaleString() : ""}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await restoreManga(m.id);
                  qc.invalidateQueries({ queryKey: ["trash"] });
                  qc.invalidateQueries({ queryKey: ["manga"] });
                  toast.success("Restored");
                }}
              >
                Restore
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (!confirm("Permanently delete? This removes local files too.")) return;
                  await hardDeleteManga(m.id);
                  qc.invalidateQueries({ queryKey: ["trash"] });
                  toast.success("Deleted");
                }}
              >
                Delete forever
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
