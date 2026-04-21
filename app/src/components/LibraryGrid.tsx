import { memo, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { listManga, type MangaRow } from "@/lib/manga-api";
import {
  listFavorites,
  listCollections,
  listCollectionMembership,
  type CollectionRow,
} from "@/lib/library-api";
import { listSharesToMe, getDisplayNames } from "@/lib/sharing-api";
import { computeStorageStats } from "@/lib/storage-stats";
import { supabase } from "@/integrations/supabase/client";
import { PageImage } from "@/components/PageImage";
import { AvailabilityBadge } from "@/components/library/AvailabilityBadge";
import { Heart, BookOpen, Users, Globe } from "lucide-react";
import { classifyAvailability } from "@/lib/storage-stats";
import type { LibraryFilter } from "@/components/library/LibraryToolbar";
import { Checkbox } from "@/components/ui/checkbox";

export type SortMode = "recent" | "title" | "last_read" | "added";

interface ChapterMeta {
  manga_id: string;
  total: number;
  read: number;
  last_read_title: string | null;
}

async function fetchChapterMeta(): Promise<Map<string, ChapterMeta>> {
  const { data, error } = await supabase
    .from("chapters")
    .select("manga_id, title, read_at, index")
    .order("index", { ascending: false });
  if (error) throw error;
  const map = new Map<string, ChapterMeta>();
  for (const row of data ?? []) {
    let m = map.get(row.manga_id);
    if (!m) {
      m = { manga_id: row.manga_id, total: 0, read: 0, last_read_title: null };
      map.set(row.manga_id, m);
    }
    m.total += 1;
    if (row.read_at) {
      m.read += 1;
      if (!m.last_read_title) m.last_read_title = row.title;
    }
  }
  return map;
}

interface CardProps {
  manga: MangaRow;
  isFavorite: boolean;
  selected: boolean;
  selectionMode: boolean;
  onToggleSelect: (id: string) => void;
  meta: ChapterMeta | undefined;
  blobsOnDevice: number;
  expectedPages: number;
  sharedBy: string | null;
}

const MangaCard = memo(function MangaCard({
  manga,
  isFavorite,
  selected,
  selectionMode,
  onToggleSelect,
  meta,
  blobsOnDevice,
  expectedPages,
  sharedBy,
}: CardProps) {
  const availability = classifyAvailability({
    hasCover: !!manga.cover_image,
    blobCount: blobsOnDevice,
    expectedPages,
  });

  const cardInner = (
    <>
      <div className="aspect-[2/3] w-full overflow-hidden bg-ink relative">
        {manga.cover_image ? (
          <PageImage
            blobKey={manga.cover_image}
            alt={manga.title}
            className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <BookOpen className="h-10 w-10" />
          </div>
        )}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
          <AvailabilityBadge state={availability} compact />
          {manga.global_manga_id && (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/15 text-primary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
              <Globe className="h-3 w-3" /> Global
            </span>
          )}
          {sharedBy && (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/85 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-foreground border border-border">
              <Users className="h-3 w-3" /> Shared
            </span>
          )}
        </div>
        {isFavorite && (
          <div className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-background/80 backdrop-blur">
            <Heart className="h-3.5 w-3.5 fill-primary text-primary" />
          </div>
        )}
        {selectionMode && (
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px]" aria-hidden />
        )}
        {selectionMode && (
          <div className="absolute top-1.5 right-1.5">
            <Checkbox
              checked={selected}
              className="h-5 w-5 border-foreground bg-background/80 pointer-events-none"
              aria-label={`Select ${manga.title}`}
            />
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="truncate text-sm font-semibold">{manga.title}</div>
        {sharedBy ? (
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
            Shared by {sharedBy}
          </div>
        ) : meta && meta.total > 0 ? (
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {meta.read}/{meta.total} read
            {meta.last_read_title ? ` · ${meta.last_read_title}` : ""}
          </div>
        ) : (
          manga.last_read_at && (
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Last read {new Date(manga.last_read_at).toLocaleDateString()}
            </div>
          )
        )}
      </div>
    </>
  );

  if (selectionMode) {
    return (
      <button
        type="button"
        onClick={() => onToggleSelect(manga.id)}
        className={`group relative text-left overflow-hidden rounded-xl gradient-card border transition-colors ${
          selected ? "border-primary" : "border-border hover:border-primary/60"
        }`}
        aria-pressed={selected}
      >
        {cardInner}
      </button>
    );
  }

  return (
    <Link
      to="/manga/$mangaId"
      params={{ mangaId: manga.id }}
      className="group relative overflow-hidden rounded-xl gradient-card border border-border hover:border-primary/60 transition-colors"
    >
      {cardInner}
    </Link>
  );
});

interface Props {
  sort: SortMode;
  filter: LibraryFilter;
  query: string;
  activeCollection: string | null;
  selectionMode: boolean;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onCount?: (n: number) => void;
  onCollectionsLoaded?: (cs: CollectionRow[]) => void;
}

export function LibraryGrid({
  sort,
  filter,
  query,
  activeCollection,
  selectionMode,
  selected,
  onToggleSelect,
  onCount,
  onCollectionsLoaded,
}: Props) {
  const { user } = useAuth();
  const mangaQ = useQuery({
    queryKey: ["manga", user?.id],
    queryFn: listManga,
    enabled: !!user,
  });
  const favoritesQ = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: listFavorites,
    enabled: !!user,
  });
  const collectionsQ = useQuery({
    queryKey: ["collections", user?.id],
    queryFn: listCollections,
    enabled: !!user,
  });
  const membershipQ = useQuery({
    queryKey: ["collection-manga", user?.id],
    queryFn: listCollectionMembership,
    enabled: !!user,
  });
  const chapterMetaQ = useQuery({
    queryKey: ["chapter-meta", user?.id],
    queryFn: fetchChapterMeta,
    enabled: !!user,
    staleTime: 30_000,
  });
  const storageQ = useQuery({
    queryKey: ["storage-stats"],
    queryFn: computeStorageStats,
    enabled: !!user,
    staleTime: 60_000,
  });
  // Search across chapter titles too — keep it efficient via a single query.
  const chapterSearchQ = useQuery({
    queryKey: ["chapter-titles-search", user?.id, query],
    queryFn: async () => {
      if (!query.trim()) return new Set<string>();
      const { data } = await supabase
        .from("chapters")
        .select("manga_id, title")
        .ilike("title", `%${query.trim()}%`);
      return new Set((data ?? []).map((r) => r.manga_id as string));
    },
    enabled: !!user && query.trim().length > 0,
    staleTime: 5_000,
  });
  // Shares received by current user — used to label & tag manga as "shared".
  const sharesQ = useQuery({
    queryKey: ["shares-to-me", user?.id],
    queryFn: listSharesToMe,
    enabled: !!user,
    staleTime: 60_000,
  });
  const sharerNamesQ = useQuery({
    queryKey: ["share-owner-names", user?.id, sharesQ.data?.map((s) => s.owner_user_id).join(",")],
    queryFn: () => getDisplayNames((sharesQ.data ?? []).map((s) => s.owner_user_id)),
    enabled: !!sharesQ.data && (sharesQ.data ?? []).length > 0,
  });

  const sharedByMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sharesQ.data ?? []) {
      const name = sharerNamesQ.data?.get(s.owner_user_id) || "another user";
      m.set(s.manga_id, name);
    }
    return m;
  }, [sharesQ.data, sharerNamesQ.data]);

  useEffect(() => {
    if (collectionsQ.data && onCollectionsLoaded) onCollectionsLoaded(collectionsQ.data);
  }, [collectionsQ.data, onCollectionsLoaded]);

  const favSet = useMemo(
    () => new Set((favoritesQ.data ?? []).map((f) => f.manga_id)),
    [favoritesQ.data],
  );
  const collectionMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const row of membershipQ.data ?? []) {
      let s = m.get(row.collection_id);
      if (!s) {
        s = new Set();
        m.set(row.collection_id, s);
      }
      s.add(row.manga_id);
    }
    return m;
  }, [membershipQ.data]);

  const filtered = useMemo(() => {
    const all = mangaQ.data ?? [];
    const meta = chapterMetaQ.data ?? new Map<string, ChapterMeta>();
    const titleHits = chapterSearchQ.data;

    let out = all.slice();

    // Collection filter
    if (activeCollection) {
      const set = collectionMap.get(activeCollection) ?? new Set<string>();
      out = out.filter((m) => set.has(m.id));
    }

    // State filter
    const recentlyAddedCutoff = Date.now() - 7 * 24 * 3600 * 1000;
    out = out.filter((m) => {
      const cm = meta.get(m.id);
      const total = cm?.total ?? 0;
      const read = cm?.read ?? 0;
      switch (filter) {
        case "favorites":
          return favSet.has(m.id);
        case "unread":
          return read === 0;
        case "in_progress":
          return read > 0 && read < total;
        case "completed":
          return total > 0 && read >= total;
        case "recently_added":
          return new Date(m.created_at).getTime() >= recentlyAddedCutoff;
        case "last_read":
          return !!m.last_read_at;
        default:
          return true;
      }
    });

    // Search across title, alt_title, and chapter titles
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((m) => {
        if (m.title.toLowerCase().includes(q)) return true;
        if (m.alt_title && m.alt_title.toLowerCase().includes(q)) return true;
        if (titleHits && titleHits.has(m.id)) return true;
        return false;
      });
    }

    // Sort
    if (sort === "title") out.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "added")
      out.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    else if (sort === "last_read")
      out.sort((a, b) => +new Date(b.last_read_at ?? 0) - +new Date(a.last_read_at ?? 0));
    else out.sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at));

    // Favorites pinned to top
    out.sort((a, b) => Number(favSet.has(b.id)) - Number(favSet.has(a.id)));

    return out;
  }, [
    mangaQ.data,
    chapterMetaQ.data,
    chapterSearchQ.data,
    activeCollection,
    collectionMap,
    filter,
    favSet,
    query,
    sort,
  ]);

  useEffect(() => {
    onCount?.(filtered.length);
  }, [filtered.length, onCount]);

  if (mangaQ.isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] rounded-xl bg-surface animate-pulse" />
        ))}
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center text-muted-foreground bg-surface">
        <div className="text-lg font-medium text-foreground">
          {query || filter !== "all" || activeCollection ? "Nothing matches" : "No manga yet"}
        </div>
        <p className="mt-1 text-sm">
          {query || filter !== "all" || activeCollection
            ? "Try a different filter or search."
            : "Drop a ZIP/CBZ anywhere or use the Import page."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {filtered.map((m) => {
        const stats = storageQ.data?.perManga[m.id];
        const meta = chapterMetaQ.data?.get(m.id);
        // Expected pages = sum of page_count for all chapters; we don't have it
        // per-manga directly. Fall back to "1 page" so cover-only is "available".
        const expectedPages = meta && meta.total > 0 ? meta.total : 1;
        return (
          <MangaCard
            key={m.id}
            manga={m}
            isFavorite={favSet.has(m.id)}
            selected={selected.has(m.id)}
            selectionMode={selectionMode}
            onToggleSelect={onToggleSelect}
            meta={meta}
            blobsOnDevice={stats?.blobs ?? (m.cover_image ? 1 : 0)}
            expectedPages={expectedPages}
            sharedBy={sharedByMap.get(m.id) ?? null}
          />
        );
      })}
    </div>
  );
}
