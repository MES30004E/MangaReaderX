// Global manga catalogue API. Read access for any signed-in user;
// writes restricted to admins via RLS (will simply fail for non-admins).
import { supabase } from "@/integrations/supabase/client";
import type { ImportPreview } from "./importer";

export type GlobalVisibility = "public" | "restricted";

export interface GlobalMangaRow {
  id: string;
  title: string;
  alt_title: string | null;
  description: string | null;
  language: string | null;
  status: string;
  cover_url: string | null;
  visibility: GlobalVisibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GlobalChapterRow {
  id: string;
  global_manga_id: string;
  title: string;
  index: number;
  page_count: number;
  created_at: string;
}

export async function listGlobalManga(): Promise<GlobalMangaRow[]> {
  const { data, error } = await supabase
    .from("global_manga")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GlobalMangaRow[];
}

export async function getGlobalManga(id: string): Promise<GlobalMangaRow | null> {
  const { data, error } = await supabase
    .from("global_manga")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as GlobalMangaRow) ?? null;
}

export async function listGlobalChapters(globalMangaId: string): Promise<GlobalChapterRow[]> {
  const { data, error } = await supabase
    .from("global_chapters")
    .select("*")
    .eq("global_manga_id", globalMangaId)
    .order("index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as GlobalChapterRow[];
}

/** Returns the current user's personal manga row that references this global entry, if any. */
export async function findUserCopyOfGlobal(globalMangaId: string): Promise<{ id: string } | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase
    .from("manga")
    .select("id")
    .eq("user_id", u.user.id)
    .eq("global_manga_id", globalMangaId)
    .is("deleted_at", null)
    .maybeSingle();
  return (data as { id: string }) ?? null;
}

/**
 * Add a global manga to the user's library by creating a personal manga row that
 * references the global entry. Mirrors title/alt_title/cover_url so existing UI
 * works unchanged. Chapter rows are NOT duplicated — chapter list comes from
 * global_chapters at view time. Pages remain device-local until imported.
 */
export async function addGlobalToLibrary(globalMangaId: string): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");

  // Already added?
  const existing = await findUserCopyOfGlobal(globalMangaId);
  if (existing) return existing.id;

  const g = await getGlobalManga(globalMangaId);
  if (!g) throw new Error("Global manga not found");

  const { data, error } = await supabase
    .from("manga")
    .insert({
      user_id: u.user.id,
      title: g.title,
      alt_title: g.alt_title,
      cover_image: g.cover_url, // PageImage handles http(s) URLs as-is
      storage_provider: "global",
      global_manga_id: g.id,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("Failed to add to library");
  return data.id as string;
}

export async function removeGlobalFromLibrary(globalMangaId: string): Promise<void> {
  const existing = await findUserCopyOfGlobal(globalMangaId);
  if (!existing) return;
  // Hard-delete the personal reference (does not affect global entry).
  await supabase.from("manga").delete().eq("id", existing.id);
}

// ---------------------------------------------------------------------------
// Admin: publish + manage access
// ---------------------------------------------------------------------------

export interface PublishGlobalOptions {
  visibility: GlobalVisibility;
  /** When visibility === "restricted", user IDs allowed to see the entry. */
  grantUserIds?: string[];
  /** Optional cover image (uploaded to public global-covers bucket). */
  coverFile?: Blob | null;
}

async function uploadCover(globalId: string, file: Blob): Promise<string | null> {
  const ext = (file as File).name?.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${globalId}/cover.${ext}`;
  const { error } = await supabase.storage
    .from("global-covers")
    .upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
  if (error) return null;
  const { data } = supabase.storage.from("global-covers").getPublicUrl(path);
  return data.publicUrl ?? null;
}

/**
 * Publish a global catalogue entry (metadata + chapter list) from an
 * ImportPreview. No personal manga row is created; admins can add it to
 * their own library separately if they want a local copy.
 */
export async function publishGlobalFromPreview(
  preview: ImportPreview,
  options: PublishGlobalOptions,
): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");

  const { data: gRow, error: gErr } = await supabase
    .from("global_manga")
    .insert({
      title: preview.title,
      created_by: u.user.id,
      visibility: options.visibility,
    })
    .select("id")
    .single();
  if (gErr || !gRow) throw gErr ?? new Error("Failed to create global manga");
  const globalId = gRow.id as string;

  // Cover (optional)
  if (options.coverFile) {
    const url = await uploadCover(globalId, options.coverFile);
    if (url) {
      await supabase.from("global_manga").update({ cover_url: url }).eq("id", globalId);
    }
  }

  // Chapter list
  const chapterRows = preview.chapters.map((ch, i) => ({
    global_manga_id: globalId,
    title: ch.title,
    index: i,
    page_count: ch.pages.length,
  }));
  if (chapterRows.length) {
    const { error: cErr } = await supabase.from("global_chapters").insert(chapterRows);
    if (cErr) throw cErr;
  }

  // Access grants for restricted entries
  if (options.visibility === "restricted" && options.grantUserIds?.length) {
    const rows = options.grantUserIds.map((uid) => ({
      global_manga_id: globalId,
      user_id: uid,
    }));
    await supabase.from("global_manga_access").insert(rows);
  }

  return globalId;
}

export interface AccessGrantRow {
  user_id: string;
  display_name: string | null;
}

export async function listAccessGrants(globalMangaId: string): Promise<AccessGrantRow[]> {
  const { data, error } = await supabase
    .from("global_manga_access")
    .select("user_id")
    .eq("global_manga_id", globalMangaId);
  if (error) throw error;
  const ids = (data ?? []).map((r) => r.user_id as string);
  if (!ids.length) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  const byId = new Map((profs ?? []).map((p) => [p.id as string, p.display_name as string | null]));
  return ids.map((id) => ({ user_id: id, display_name: byId.get(id) ?? null }));
}

export async function findUserByDisplayName(query: string): Promise<AccessGrantRow[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .ilike("display_name", `%${q}%`)
    .limit(10);
  if (error) throw error;
  return (data ?? []).map((p) => ({
    user_id: p.id as string,
    display_name: p.display_name as string | null,
  }));
}

export async function grantAccess(globalMangaId: string, userId: string): Promise<void> {
  await supabase
    .from("global_manga_access")
    .insert({ global_manga_id: globalMangaId, user_id: userId });
}

export async function revokeAccess(globalMangaId: string, userId: string): Promise<void> {
  await supabase
    .from("global_manga_access")
    .delete()
    .eq("global_manga_id", globalMangaId)
    .eq("user_id", userId);
}

export async function setGlobalVisibility(
  globalMangaId: string,
  visibility: GlobalVisibility,
): Promise<void> {
  const { error } = await supabase
    .from("global_manga")
    .update({ visibility })
    .eq("id", globalMangaId);
  if (error) throw error;
}
