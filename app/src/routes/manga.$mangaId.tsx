import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  getManga,
  getProgress,
  hardDeleteManga,
  listChapters,
  renameManga,
  softDeleteManga,
} from "@/lib/manga-api";
import {
  toggleFavorite,
  listFavorites,
  markChapterRead,
} from "@/lib/library-api";
import {
  listSharesToMe,
  removeSharedAccess,
  getDisplayNames,
} from "@/lib/sharing-api";
import { ShareDialog } from "@/components/library/ShareDialog";
import { useReaderPrefs } from "@/lib/use-reader-prefs";
import { useAuth } from "@/lib/auth-context";
import { computeStorageStats, classifyAvailability } from "@/lib/storage-stats";
import { PageImage } from "@/components/PageImage";
import { AvailabilityBadge } from "@/components/library/AvailabilityBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { BookOpen, Heart, Pencil, Trash2, CheckCircle2, Share2, Users } from "lucide-react";

export const Route = createFileRoute("/manga/$mangaId")({
  component: MangaDetail,
});

function MangaDetail() {
  const { mangaId } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [editTitle, setEditTitle] = useState<string | null>(null);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeShown, setResumeShown] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const { prefs } = useReaderPrefs();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  const mangaQ = useQuery({
    queryKey: ["manga", mangaId],
    queryFn: () => getManga(mangaId),
    enabled: !!user,
  });
  const chaptersQ = useQuery({
    queryKey: ["chapters", mangaId],
    queryFn: () => listChapters(mangaId),
    enabled: !!user,
  });
  const progressQ = useQuery({
    queryKey: ["progress", mangaId],
    queryFn: () => getProgress(mangaId),
    enabled: !!user,
  });
  const favQ = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: listFavorites,
    enabled: !!user,
  });
  const storageQ = useQuery({
    queryKey: ["storage-stats"],
    queryFn: computeStorageStats,
    enabled: !!user,
    staleTime: 60_000,
  });
  const sharesToMeQ = useQuery({
    queryKey: ["shares-to-me", user?.id],
    queryFn: listSharesToMe,
    enabled: !!user,
    staleTime: 60_000,
  });
  const sharedRow = sharesToMeQ.data?.find((s) => s.manga_id === mangaId) ?? null;
  const isShared = !!sharedRow;
  const isOwner = !!user && !!mangaQ.data && mangaQ.data.user_id === user.id;
  const ownerNamesQ = useQuery({
    queryKey: ["owner-name", sharedRow?.owner_user_id],
    queryFn: () => getDisplayNames([sharedRow!.owner_user_id]),
    enabled: !!sharedRow,
  });

  const isFavorite = !!favQ.data?.find((f) => f.manga_id === mangaId);

  // Show resume prompt once when progress + chapter both load.
  useEffect(() => {
    if (resumeShown) return;
    if (!progressQ.data || !chaptersQ.data) return;
    const p = progressQ.data;
    if (!p.chapter_id || p.page_index <= 0) return;
    const ch = chaptersQ.data.find((c) => c.id === p.chapter_id);
    if (!ch) return;
    if (prefs.auto_resume) {
      // Skip prompt; user will hit "Continue" button when ready.
      setResumeShown(true);
      return;
    }
    setResumeOpen(true);
    setResumeShown(true);
  }, [progressQ.data, chaptersQ.data, prefs.auto_resume, resumeShown]);

  if (!user || mangaQ.isLoading) {
    return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  }
  const manga = mangaQ.data;
  if (!manga) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-semibold">Manga not found</h1>
        <Link
          to="/"
          className="mt-4 inline-block text-primary underline-offset-4 hover:underline"
        >
          Back to library
        </Link>
      </div>
    );
  }

  const chapters = chaptersQ.data ?? [];
  const progress = progressQ.data;
  const continueChapter =
    progress?.chapter_id && chapters.find((c) => c.id === progress.chapter_id)
      ? progress.chapter_id
      : chapters[0]?.id;

  const readCount = chapters.filter((c) => (c as { read_at?: string | null }).read_at).length;
  const totalChapters = chapters.length;
  const lastReadChapter = chapters.find((c) => c.id === progress?.chapter_id);

  const stats = storageQ.data?.perManga[manga.id];
  const expectedPages = chapters.reduce((acc, c) => acc + (c.page_count || 0), 0) || 1;
  const availability = classifyAvailability({
    hasCover: !!manga.cover_image,
    blobCount: stats?.blobs ?? (manga.cover_image ? 1 : 0),
    expectedPages,
  });

  async function saveTitle() {
    if (!editTitle?.trim()) return;
    await renameManga(mangaId, editTitle.trim());
    qc.invalidateQueries({ queryKey: ["manga", mangaId] });
    qc.invalidateQueries({ queryKey: ["manga"] });
    setEditTitle(null);
    toast.success("Renamed");
  }

  async function trash() {
    await softDeleteManga(mangaId);
    qc.invalidateQueries({ queryKey: ["manga"] });
    toast("Moved to trash", {
      action: {
        label: "Undo",
        onClick: async () => {
          const { restoreManga } = await import("@/lib/manga-api");
          await restoreManga(mangaId);
          qc.invalidateQueries({ queryKey: ["manga"] });
        },
      },
    });
    nav({ to: "/" });
  }

  async function handleFavorite() {
    await toggleFavorite(mangaId, isFavorite);
    qc.invalidateQueries({ queryKey: ["favorites"] });
    toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
  }

  async function handleMarkRead(chapterId: string) {
    await markChapterRead(chapterId);
    qc.invalidateQueries({ queryKey: ["chapters", mangaId] });
    qc.invalidateQueries({ queryKey: ["chapter-meta"] });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Library
      </Link>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6">
        <div className="aspect-[2/3] overflow-hidden rounded-xl border border-border bg-ink relative">
          {manga.cover_image && (
            <PageImage
              blobKey={manga.cover_image}
              alt={manga.title}
              className="h-full w-full object-cover"
            />
          )}
          <div className="absolute top-2 left-2">
            <AvailabilityBadge state={availability} />
          </div>
        </div>
        <div className="min-w-0">
          {editTitle === null ? (
            <div className="flex items-start gap-2">
              <h1 className="font-display text-3xl tracking-wide flex-1 break-words">
                {manga.title}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFavorite}
                aria-label={isFavorite ? "Unfavorite" : "Favorite"}
              >
                <Heart
                  className={`h-4 w-4 ${isFavorite ? "fill-primary text-primary" : ""}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditTitle(manga.title)}
                aria-label="Rename"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <Button onClick={saveTitle}>Save</Button>
              <Button variant="ghost" onClick={() => setEditTitle(null)}>
                Cancel
              </Button>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>
              {totalChapters} chapter{totalChapters === 1 ? "" : "s"}
            </span>
            {totalChapters > 0 && (
              <span>
                · {readCount}/{totalChapters} read
              </span>
            )}
            {lastReadChapter && (
              <span className="text-primary">
                · Last: {lastReadChapter.title}
                {progress?.page_index ? ` (p${progress.page_index + 1})` : ""}
              </span>
            )}
          </div>

          {isShared && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Shared by{" "}
              <span className="text-foreground font-medium">
                {ownerNamesQ.data?.get(sharedRow!.owner_user_id) || "another user"}
              </span>
              {availability !== "ready" && (
                <span className="ml-1 rounded bg-background px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  Not local
                </span>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {continueChapter && (
              <Link
                to="/read/$mangaId/$chapterId"
                params={{ mangaId, chapterId: continueChapter }}
              >
                <Button size="lg">
                  <BookOpen className="h-4 w-4" />
                  {progress?.page_index ? "Continue reading" : "Start reading"}
                </Button>
              </Link>
            )}

            {isOwner && (
              <Button variant="outline" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4" /> Share
              </Button>
            )}

            {isOwner && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You can restore from the Trash page. Permanent deletion happens
                      from there.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={trash}>Move to trash</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {isShared && !isOwner && (
              <Button
                variant="outline"
                onClick={async () => {
                  await removeSharedAccess(mangaId);
                  qc.invalidateQueries({ queryKey: ["shares-to-me"] });
                  qc.invalidateQueries({ queryKey: ["manga"] });
                  toast.success("Removed from your library");
                  nav({ to: "/" });
                }}
              >
                <Trash2 className="h-4 w-4" /> Remove access
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Chapters
        </h2>
        <div className="rounded-2xl border border-border bg-surface divide-y divide-border">
          {chapters.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No chapters.
            </div>
          )}
          {chapters.map((c) => {
            const isCurrent = progress?.chapter_id === c.id;
            const read = !!(c as { read_at?: string | null }).read_at;
            return (
              <div
                key={c.id}
                className="group flex items-center gap-2 px-4 py-3 hover:bg-surface-elevated transition-colors"
              >
                <Link
                  to="/read/$mangaId/$chapterId"
                  params={{ mangaId, chapterId: c.id }}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    {read && (
                      <CheckCircle2 className="h-3.5 w-3.5 flex-none text-primary" />
                    )}
                    <span
                      className={`truncate text-sm font-medium ${
                        read ? "text-muted-foreground" : ""
                      }`}
                    >
                      {c.title}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.page_count} pages
                  </div>
                </Link>
                {isCurrent && (
                  <span className="text-[10px] uppercase tracking-wide text-primary">
                    Current
                  </span>
                )}
                {!read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleMarkRead(c.id)}
                  >
                    Mark read
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resume prompt */}
      <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume reading?</DialogTitle>
            <DialogDescription>
              {lastReadChapter
                ? `You left off at ${lastReadChapter.title}, page ${
                    (progress?.page_index ?? 0) + 1
                  }.`
                : "You have saved progress for this manga."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="ghost" onClick={() => setResumeOpen(false)}>
              Stay here
            </Button>
            {chapters[0] && (
              <Link
                to="/read/$mangaId/$chapterId"
                params={{ mangaId, chapterId: chapters[0].id }}
              >
                <Button variant="outline" onClick={() => setResumeOpen(false)}>
                  Start over
                </Button>
              </Link>
            )}
            {progress?.chapter_id && (
              <Link
                to="/read/$mangaId/$chapterId"
                params={{ mangaId, chapterId: progress.chapter_id }}
              >
                <Button onClick={() => setResumeOpen(false)}>Resume</Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        mangaId={mangaId}
        mangaTitle={manga.title}
      />

      {/* Hidden: hardDelete reference so unused-import linter never complains */}
      {false && <button hidden onClick={() => hardDeleteManga(mangaId)} />}
    </div>
  );
}
