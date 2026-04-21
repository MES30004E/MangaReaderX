// Library organization API: favorites, collections, reader preferences.
// Pure functions returning typed rows; UI calls these via React Query.
import { supabase } from "@/integrations/supabase/client";

export interface FavoriteRow {
  id: string;
  user_id: string;
  manga_id: string;
  position: number;
  created_at: string;
}

export interface CollectionRow {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionMangaRow {
  collection_id: string;
  manga_id: string;
  user_id: string;
  added_at: string;
}

export interface ReaderPrefsRow {
  user_id: string;
  left_handed: boolean;
  invert_taps: boolean;
  tap_zone_pct: number;
  dim_level: number;
  always_hide_chrome: boolean;
  auto_resume: boolean;
  fit_vertical: FitMode;
  fit_book: FitMode;
  default_mode: "vertical" | "book";
  updated_at: string;
}

export type FitMode = "width" | "height" | "original";

export const DEFAULT_PREFS: Omit<ReaderPrefsRow, "user_id" | "updated_at"> = {
  left_handed: false,
  invert_taps: false,
  tap_zone_pct: 20,
  dim_level: 0,
  always_hide_chrome: true,
  auto_resume: true,
  fit_vertical: "width",
  fit_book: "height",
  default_mode: "vertical",
};

// ---------- Favorites ----------
export async function listFavorites(): Promise<FavoriteRow[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FavoriteRow[];
}

export async function addFavorite(mangaId: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { data: existing } = await supabase
    .from("favorites")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = (existing?.[0]?.position ?? -1) + 1;
  await supabase
    .from("favorites")
    .insert({ user_id: u.user.id, manga_id: mangaId, position: nextPos });
}

export async function removeFavorite(mangaId: string): Promise<void> {
  await supabase.from("favorites").delete().eq("manga_id", mangaId);
}

export async function toggleFavorite(mangaId: string, isFav: boolean): Promise<void> {
  if (isFav) await removeFavorite(mangaId);
  else await addFavorite(mangaId);
}

// ---------- Collections ----------
export async function listCollections(): Promise<CollectionRow[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CollectionRow[];
}

export async function listCollectionMembership(): Promise<CollectionMangaRow[]> {
  const { data, error } = await supabase.from("collection_manga").select("*");
  if (error) throw error;
  return (data ?? []) as CollectionMangaRow[];
}

export async function createCollection(name: string, color?: string): Promise<CollectionRow> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { data: existing } = await supabase
    .from("collections")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = (existing?.[0]?.position ?? -1) + 1;
  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: u.user.id, name, color: color ?? null, position: nextPos })
    .select()
    .single();
  if (error) throw error;
  return data as CollectionRow;
}

export async function renameCollection(id: string, name: string): Promise<void> {
  await supabase.from("collections").update({ name }).eq("id", id);
}

export async function deleteCollection(id: string): Promise<void> {
  await supabase.from("collections").delete().eq("id", id);
}

export async function addMangaToCollection(
  collectionId: string,
  mangaIds: string[],
): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const rows = mangaIds.map((m) => ({
    collection_id: collectionId,
    manga_id: m,
    user_id: u.user!.id,
  }));
  // Use upsert-like behavior via ignoring duplicates client-side
  await supabase.from("collection_manga").upsert(rows, { onConflict: "collection_id,manga_id" });
}

export async function removeMangaFromCollection(
  collectionId: string,
  mangaIds: string[],
): Promise<void> {
  await supabase
    .from("collection_manga")
    .delete()
    .eq("collection_id", collectionId)
    .in("manga_id", mangaIds);
}

// ---------- Reader preferences ----------
export async function getReaderPrefs(): Promise<ReaderPrefsRow | null> {
  const { data, error } = await supabase.from("reader_preferences").select("*").maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // Drop fit_conveyor (legacy column) if present in row.
  const row = data as ReaderPrefsRow & { fit_conveyor?: string };
  delete row.fit_conveyor;
  return row as ReaderPrefsRow;
}

export async function upsertReaderPrefs(
  patch: Partial<Omit<ReaderPrefsRow, "user_id" | "updated_at">>,
): Promise<ReaderPrefsRow> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const current = (await getReaderPrefs()) ?? {
    user_id: u.user.id,
    ...DEFAULT_PREFS,
    updated_at: new Date().toISOString(),
  };
  const next = { ...current, ...patch, user_id: u.user.id };
  const { data, error } = await supabase
    .from("reader_preferences")
    .upsert(next, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data as ReaderPrefsRow;
}

// ---------- Bulk manga ops ----------
export async function bulkSoftDelete(ids: string[]): Promise<void> {
  const ts = new Date().toISOString();
  await supabase.from("manga").update({ deleted_at: ts }).in("id", ids);
}

export async function bulkRestore(ids: string[]): Promise<void> {
  await supabase.from("manga").update({ deleted_at: null }).in("id", ids);
}

export async function bulkFavorite(ids: string[], favorite: boolean): Promise<void> {
  if (favorite) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const rows = ids.map((manga_id, i) => ({
      user_id: u.user!.id,
      manga_id,
      position: Date.now() + i,
    }));
    await supabase.from("favorites").upsert(rows, { onConflict: "user_id,manga_id" });
  } else {
    await supabase.from("favorites").delete().in("manga_id", ids);
  }
}

// Mark chapter as read (sets read_at). Used when finishing a chapter.
export async function markChapterRead(chapterId: string): Promise<void> {
  await supabase.from("chapters").update({ read_at: new Date().toISOString() }).eq("id", chapterId);
}
