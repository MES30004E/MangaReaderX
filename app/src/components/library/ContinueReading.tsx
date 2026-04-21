import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageImage } from "@/components/PageImage";
import { BookOpen } from "lucide-react";
import type { MangaRow } from "@/lib/manga-api";

interface ContinueItem {
  manga: MangaRow;
  chapter_id: string | null;
  chapter_title: string | null;
  page_index: number;
  page_count: number;
  updated_at: string;
}

async function fetchContinueReading(): Promise<ContinueItem[]> {
  const { data: progress, error } = await supabase
    .from("reading_progress")
    .select("manga_id, chapter_id, page_index, updated_at")
    .order("updated_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  if (!progress || progress.length === 0) return [];

  const mangaIds = progress.map((p) => p.manga_id);
  const chapterIds = progress.map((p) => p.chapter_id).filter((x): x is string => !!x);

  const [{ data: mangas }, { data: chapters }] = await Promise.all([
    supabase.from("manga").select("*").in("id", mangaIds).is("deleted_at", null),
    chapterIds.length
      ? supabase.from("chapters").select("id, title, page_count").in("id", chapterIds)
      : Promise.resolve({ data: [] as { id: string; title: string; page_count: number }[] }),
  ]);

  const mangaMap = new Map((mangas ?? []).map((m) => [m.id, m as MangaRow]));
  const chapterMap = new Map(
    (chapters ?? []).map((c) => [c.id, { title: c.title, page_count: c.page_count }]),
  );

  return progress
    .map((p) => {
      const manga = mangaMap.get(p.manga_id);
      if (!manga) return null;
      const ch = p.chapter_id ? chapterMap.get(p.chapter_id) : undefined;
      return {
        manga,
        chapter_id: p.chapter_id,
        chapter_title: ch?.title ?? null,
        page_index: p.page_index,
        page_count: ch?.page_count ?? 0,
        updated_at: p.updated_at,
      } as ContinueItem;
    })
    .filter((x): x is ContinueItem => x !== null);
}

export function ContinueReading() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["continue-reading", user?.id],
    queryFn: fetchContinueReading,
    enabled: !!user,
    staleTime: 30_000,
  });

  if (isLoading || !data || data.length === 0) return null;

  return (
    <section aria-label="Continue reading" className="mb-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-xl tracking-wide">
          Continue <span className="text-primary">reading</span>
        </h2>
        <span className="text-xs text-muted-foreground">{data.length} in progress</span>
      </div>
      <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-3 pb-2">
          {data.map((item) => {
            const pct =
              item.page_count > 0
                ? Math.min(100, Math.round(((item.page_index + 1) / item.page_count) * 100))
                : 0;
            return (
              <Link
                key={item.manga.id}
                to={
                  item.chapter_id
                    ? "/read/$mangaId/$chapterId"
                    : "/manga/$mangaId"
                }
                params={
                  item.chapter_id
                    ? { mangaId: item.manga.id, chapterId: item.chapter_id }
                    : { mangaId: item.manga.id }
                }
                className="group flex-none w-[200px] rounded-xl gradient-card border border-border hover:border-primary/60 transition-colors overflow-hidden"
              >
                <div className="aspect-[2/3] relative bg-ink">
                  {item.manga.cover_image ? (
                    <PageImage
                      blobKey={item.manga.cover_image}
                      alt={item.manga.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <BookOpen className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-progress-track">
                    <div
                      className="h-full bg-progress-fill"
                      style={{ width: `${pct}%` }}
                      aria-label={`${pct}% read`}
                    />
                  </div>
                </div>
                <div className="p-3">
                  <div className="truncate text-sm font-semibold">{item.manga.title}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {item.chapter_title ?? "Chapter"}
                    {item.page_count > 0 && ` · p${item.page_index + 1}/${item.page_count}`}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
