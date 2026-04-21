import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { StorageDashboard } from "@/components/library/StorageDashboard";
import { CollectionDialog } from "@/components/library/CollectionDialog";
import {
  createCollection,
  deleteCollection,
  listCollections,
  renameCollection,
} from "@/lib/library-api";
import { useReaderPrefs } from "@/lib/use-reader-prefs";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Plus, Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FitMode } from "@/lib/library-api";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { prefs, update } = useReaderPrefs();
  const collectionsQ = useQuery({
    queryKey: ["collections", user?.id],
    queryFn: listCollections,
    enabled: !!user,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div>
        <h1 className="font-display text-3xl tracking-wide">
          Settings & <span className="text-primary">storage</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reader preferences, collections, and on-device storage.
        </p>
      </div>

      <StorageDashboard />

      {/* Reader defaults */}
      <section className="rounded-2xl border border-border bg-surface p-5 space-y-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Reader defaults
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Saved per account. You can also change these from the reader's settings button.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["vertical", "book"] as const).map((m) => {
            const key = `fit_${m}` as const;
            return (
              <div key={m} className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Fit · {m}
                </Label>
                <Select
                  value={prefs[key]}
                  onValueChange={(v) => update({ [key]: v as FitMode })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="width">Fit width</SelectItem>
                    <SelectItem value="height">Fit height</SelectItem>
                    <SelectItem value="original">Original</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Row
            label="Left-handed mode"
            sub="Swaps prev/next zones"
            control={
              <Switch
                checked={prefs.left_handed}
                onCheckedChange={(v) => update({ left_handed: v })}
              />
            }
          />
          <Row
            label="Invert tap direction"
            sub="Right=prev, left=next"
            control={
              <Switch
                checked={prefs.invert_taps}
                onCheckedChange={(v) => update({ invert_taps: v })}
              />
            }
          />
          <Row
            label="Always hide chrome"
            sub="UI hidden until tap"
            control={
              <Switch
                checked={prefs.always_hide_chrome}
                onCheckedChange={(v) => update({ always_hide_chrome: v })}
              />
            }
          />
          <Row
            label="Auto-resume"
            sub="Skip resume prompt"
            control={
              <Switch
                checked={prefs.auto_resume}
                onCheckedChange={(v) => update({ auto_resume: v })}
              />
            }
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Tap zone width</Label>
            <span className="text-xs text-muted-foreground">{prefs.tap_zone_pct}%</span>
          </div>
          <Slider
            min={10}
            max={45}
            step={5}
            value={[prefs.tap_zone_pct]}
            onValueChange={([v]) => update({ tap_zone_pct: v })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Dim overlay</Label>
            <span className="text-xs text-muted-foreground">{prefs.dim_level}%</span>
          </div>
          <Slider
            min={0}
            max={70}
            step={5}
            value={[prefs.dim_level]}
            onValueChange={([v]) => update({ dim_level: v })}
          />
        </div>
      </section>

      {/* Collections */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Collections
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Group manga manually. A manga can belong to multiple collections.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
        <div className="divide-y divide-border rounded-md border border-border">
          {(collectionsQ.data ?? []).length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No collections yet.
            </div>
          )}
          {(collectionsQ.data ?? []).map((c) => (
            <div key={c.id} className="flex items-center gap-2 px-3 py-2">
              {editingId === c.id ? (
                <>
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (editName.trim()) {
                        await renameCollection(c.id, editName.trim());
                        qc.invalidateQueries({ queryKey: ["collections"] });
                        setEditingId(null);
                      }
                    }}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{c.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditingId(c.id);
                      setEditName(c.name);
                    }}
                    aria-label="Rename"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                      await deleteCollection(c.id);
                      qc.invalidateQueries({ queryKey: ["collections"] });
                      qc.invalidateQueries({ queryKey: ["collection-manga"] });
                      toast.success("Collection deleted");
                    }}
                    aria-label="Delete"
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      <CollectionDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={async (name) => {
          await createCollection(name);
          qc.invalidateQueries({ queryKey: ["collections"] });
          toast.success(`Created "${name}"`);
        }}
      />
    </div>
  );
}

function Row({
  label,
  sub,
  control,
}: {
  label: string;
  sub: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface-elevated px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
      {control}
    </div>
  );
}
