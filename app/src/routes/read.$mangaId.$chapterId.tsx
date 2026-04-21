import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getManga, getProgress, listChapters, listPages } from "@/lib/manga-api";
import { useAuth } from "@/lib/auth-context";
import { MangaReader } from "@/components/MangaReader";

export const Route = createFileRoute("/read/$mangaId/$chapterId")({
  component: ReadRoute,
});

function ReadRoute() {
  const { mangaId, chapterId } = Route.useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  const mangaQ = useQuery({ queryKey: ["manga", mangaId], queryFn: () => getManga(mangaId), enabled: !!user });
  const chaptersQ = useQuery({
    queryKey: ["chapters", mangaId],
    queryFn: () => listChapters(mangaId),
    enabled: !!user,
  });
  const pagesQ = useQuery({
    queryKey: ["pages", chapterId],
    queryFn: () => listPages(chapterId),
    enabled: !!user,
  });
  const progressQ = useQuery({
    queryKey: ["progress", mangaId],
    queryFn: () => getProgress(mangaId),
    enabled: !!user,
  });

  if (!user || mangaQ.isLoading || chaptersQ.isLoading || pagesQ.isLoading) {
    return (
      <div className="fixed inset-0 grid place-items-center bg-background text-muted-foreground">
        Loading reader…
      </div>
    );
  }

  const manga = mangaQ.data;
  const chapters = chaptersQ.data ?? [];
  const chapter = chapters.find((c) => c.id === chapterId);
  const pages = pagesQ.data ?? [];

  if (!manga || !chapter) {
    return <div className="p-10 text-center">Chapter not found.</div>;
  }
  if (pages.length === 0) {
    return (
      <div className="p-10 text-center">
        <h1 className="text-xl font-semibold">Empty chapter</h1>
        <p className="mt-2 text-muted-foreground">No pages were imported.</p>
      </div>
    );
  }

  const initial =
    progressQ.data?.chapter_id === chapterId ? (progressQ.data?.page_index ?? 0) : 0;

  return (
    <MangaReader
      manga={manga}
      chapter={chapter}
      pages={pages}
      chapters={chapters}
      initialPage={initial}
    />
  );
}
