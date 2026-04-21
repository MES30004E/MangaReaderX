// Global manga detail — shows shared metadata + chapters, with an Add to Library
// action. Reading is delegated to the user's personal copy (created on Add).
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  getGlobalManga,
  listGlobalChapters,
  addGlobalToLibrary,
  removeGlobalFromLibrary,
  findUserCopyOfGlobal,
} from "@/lib/global-api";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Check, Globe, Trash2 } from "lucide-react";

export const Route = createFileRoute("/global/$globalId")({
  component: GlobalDetail,
});

function GlobalDetail() {
  const { globalId } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  const mangaQ = useQuery({
    queryKey: ["global-manga", globalId],
    queryFn: () => getGlobalManga(globalId),
    enabled: !!user,
  });
  const chaptersQ = useQuery({
    queryKey: ["global-chapters", globalId],
    queryFn: () => listGlobalChapters(globalId),
    enabled: !!user,
  });
  const userCopyQ = useQuery({
    queryKey: ["global-user-copy", user?.id, globalId],
    queryFn: () => findUserCopyOfGlobal(globalId),
    enabled: !!user,
  });

  if (!user || mangaQ.isLoading) {
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  }
  const g = mangaQ.data;
  if (!g) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-semibold">Not found</h1>
        <Link
          to="/discover"
          className="mt-4 inline-block text-primary underline-offset-4 hover:underline"
        >
          Back to Discover
        </Link>
      </div>
    );
  }

  const inLibrary = !!userCopyQ.data;
  const chapters = chaptersQ.data ?? [];

  async function handleAdd() {
    try {
      await addGlobalToLibrary(globalId);
      qc.invalidateQueries({ queryKey: ["manga"] });
      qc.invalidateQueries({ queryKey: ["global-user-copy"] });
      qc.invalidateQueries({ queryKey: ["global-added"] });
      toast.success("Added to your library");
    } catch (e) {
      toast.error("Could not add", { description: (e as Error).message });
    }
  }

  async function handleRemove() {
    await removeGlobalFromLibrary(globalId);
    qc.invalidateQueries({ queryKey: ["manga"] });
    qc.invalidateQueries({ queryKey: ["global-user-copy"] });
    qc.invalidateQueries({ queryKey: ["global-added"] });
    toast.success("Removed from your library");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/discover" className="text-sm text-muted-foreground hover:text-foreground">
        ← Discover
      </Link>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6">
        <div className="aspect-[2/3] overflow-hidden rounded-xl border border-border bg-ink relative">
          {g.cover_url ? (
            <img src={g.cover_url} alt={g.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <BookOpen className="h-10 w-10" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/15 text-primary px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide">
              <Globe className="h-3 w-3" /> Global
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <h1 className="font-display text-3xl tracking-wide break-words">{g.title}</h1>
          {g.alt_title && <div className="mt-1 text-sm text-muted-foreground">{g.alt_title}</div>}
          <div className="mt-2 flex flex-wrap gap-x-3 text-sm text-muted-foreground">
            {g.language && <span>{g.language}</span>}
            <span>{g.status}</span>
            <span>
              {chapters.length} chapter{chapters.length === 1 ? "" : "s"}
            </span>
          </div>

          {g.description && (
            <p className="mt-4 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {g.description}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {inLibrary ? (
              <>
                <Link to="/manga/$mangaId" params={{ mangaId: userCopyQ.data!.id }}>
                  <Button>
                    <BookOpen className="h-4 w-4" /> Open in My Library
                  </Button>
                </Link>
                <Button variant="outline" onClick={handleRemove}>
                  <Trash2 className="h-4 w-4" /> Remove from My Library
                </Button>
              </>
            ) : (
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4" /> Add to My Library
              </Button>
            )}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Pages for global manga are not stored on this device. To read, import the chapter files
            locally after adding to your library.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Chapters
        </h2>
        <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
          {chapters.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">No chapters listed.</div>
          ) : (
            chapters.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{c.page_count} pages</div>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  metadata only
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
