// Global Library / Discover — browse the shared catalogue and add entries
// to your personal library.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useHasRole } from "@/lib/use-role";
import { listGlobalManga, addGlobalToLibrary, type GlobalMangaRow } from "@/lib/global-api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Plus, Check, Globe, Shield, Lock, Upload } from "lucide-react";
import { PublishGlobalDialog } from "@/components/discover/PublishGlobalDialog";

export const Route = createFileRoute("/discover")({
  component: Discover,
});

function Discover() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const { hasRole: isAdmin } = useHasRole("admin");

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  const globalsQ = useQuery({
    queryKey: ["global-manga"],
    queryFn: listGlobalManga,
    enabled: !!user,
  });

  // Which globals are already in this user's library?
  const addedQ = useQuery({
    queryKey: ["global-added", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("manga")
        .select("global_manga_id")
        .not("global_manga_id", "is", null)
        .is("deleted_at", null);
      const set = new Set<string>();
      for (const r of (data ?? []) as { global_manga_id: string | null }[]) {
        if (r.global_manga_id) set.add(r.global_manga_id);
      }
      return set;
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    const all = globalsQ.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (g) =>
        g.title.toLowerCase().includes(q) || (g.alt_title && g.alt_title.toLowerCase().includes(q)),
    );
  }, [globalsQ.data, query]);

  async function handleAdd(g: GlobalMangaRow) {
    try {
      await addGlobalToLibrary(g.id);
      qc.invalidateQueries({ queryKey: ["manga"] });
      qc.invalidateQueries({ queryKey: ["global-added"] });
      toast.success(`Added "${g.title}" to your library`);
    } catch (e) {
      toast.error("Could not add", { description: (e as Error).message });
    }
  }

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl tracking-wide flex items-center gap-2">
            <Globe className="h-7 w-7 text-primary" />
            Discover
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse the global catalogue and add entries to your library.
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 self-start">
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs text-primary">
              <Shield className="h-3 w-3" /> Admin
            </span>
            <Button size="sm" onClick={() => setPublishOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> Publish
            </Button>
          </div>
        )}
      </div>

      <div className="mb-5 max-w-md">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search global catalogue…"
        />
      </div>

      {globalsQ.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-surface animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center text-muted-foreground bg-surface">
          <Globe className="mx-auto h-10 w-10" />
          <div className="mt-3 text-lg font-medium text-foreground">
            {query ? "Nothing matches" : "Catalogue is empty"}
          </div>
          <p className="mt-1 text-sm">
            {query
              ? "Try a different search term."
              : isAdmin
                ? "Publish a manga as Global from the Import page to seed the catalogue."
                : "Check back later — admins will add manga here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((g) => {
            const added = addedQ.data?.has(g.id) ?? false;
            return (
              <div
                key={g.id}
                className="group relative overflow-hidden rounded-xl gradient-card border border-border hover:border-primary/60 transition-colors"
              >
                <Link to="/global/$globalId" params={{ globalId: g.id }} className="block">
                  <div className="aspect-[2/3] w-full overflow-hidden bg-ink relative">
                    {g.cover_url ? (
                      <img
                        src={g.cover_url}
                        alt={g.title}
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <BookOpen className="h-10 w-10" />
                      </div>
                    )}
                    <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                        <Globe className="h-3 w-3" /> Global
                      </span>
                      {g.visibility === "restricted" && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary text-secondary-foreground px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                          <Lock className="h-3 w-3" /> Restricted
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="truncate text-sm font-semibold">{g.title}</div>
                    {g.alt_title && (
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {g.alt_title}
                      </div>
                    )}
                  </div>
                </Link>
                <div className="px-3 pb-3">
                  {added ? (
                    <Button size="sm" variant="outline" className="w-full" disabled>
                      <Check className="h-3.5 w-3.5" /> In library
                    </Button>
                  ) : (
                    <Button size="sm" className="w-full" onClick={() => handleAdd(g)}>
                      <Plus className="h-3.5 w-3.5" /> Add to library
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PublishGlobalDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        onPublished={() => {
          qc.invalidateQueries({ queryKey: ["global-manga"] });
        }}
      />
    </div>
  );
}
