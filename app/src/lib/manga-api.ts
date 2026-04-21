// Server (Cloud) data access for manga / chapters / pages / reading_progress.
// Pure functions returning typed rows; UI calls these via React Query.
import { supabase } from "@/integrations/supabase/client";
import type { ImportPreview } from "./importer";
import { getAdapter, pageBlobKey, mangaPrefix } from "./storage-adapter";

export interface MangaRow {
  id: string;
  user_id: string;
  title: string;
  alt_title: string | null;
  cover_image: string | null;
  storage_provider: string;
  deleted_at: string | null;
  last_read_at: string | null;
  progress_pct: number;
  auto_resume: boolean;
  created_at: string;
  updated_at: string;
  global_manga_id: string | null;
}

export interface ChapterRow {
  id: string;
  manga_id: string;
  user_id: string;
  title: string;
  index: number;
  page_count: number;
}

export interface PageRow {
  id: string;
  chapter_id: string;
  user_id: string;
  index: number;
  blob_key: string | null;
  remote_url: string | null;
  width: number | null;
  height: number | null;
  rotation: number;
  is_spread: boolean;
}

export interface ProgressRow {
  manga_id: string;
  chapter_id: string | null;
  page_index: number;
  updated_at: string;
}

async function blobToImageDims(blob: Blob): Promise<{ width: number; height: number } | null> {
  try {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = url;
    });
    URL.revokeObjectURL(url);
    return dims;
  } catch {
    return null;
  }
}

export async function listManga(): Promise<MangaRow[]> {
  const { data, error } = await supabase
    .from("manga")
    .select("*")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MangaRow[];
}

export async function listTrashed(): Promise<MangaRow[]> {
  const { data, error } = await supabase
    .from("manga")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MangaRow[];
}

export async function getManga(id: string): Promise<MangaRow | null> {
  const { data, error } = await supabase.from("manga").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as MangaRow) ?? null;
}

export async function listChapters(mangaId: string): Promise<ChapterRow[]> {
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("manga_id", mangaId)
    .order("index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ChapterRow[];
}

export async function listPages(chapterId: string): Promise<PageRow[]> {
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("index", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PageRow[];
}

export async function getProgress(mangaId: string): Promise<ProgressRow | null> {
  const { data, error } = await supabase
    .from("reading_progress")
    .select("manga_id, chapter_id, page_index, updated_at")
    .eq("manga_id", mangaId)
    .maybeSingle();
  if (error) throw error;
  return (data as ProgressRow) ?? null;
}

export async function upsertProgress(
  mangaId: string,
  chapterId: string,
  pageIndex: number,
): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) return;
  await supabase
    .from("reading_progress")
    .upsert(
      { user_id: userId, manga_id: mangaId, chapter_id: chapterId, page_index: pageIndex },
      { onConflict: "user_id,manga_id" },
    );
  await supabase.from("manga").update({ last_read_at: new Date().toISOString() }).eq("id", mangaId);
}

export async function softDeleteManga(id: string): Promise<void> {
  await supabase.from("manga").update({ deleted_at: new Date().toISOString() }).eq("id", id);
}

export async function restoreManga(id: string): Promise<void> {
  await supabase.from("manga").update({ deleted_at: null }).eq("id", id);
}

export async function hardDeleteManga(id: string): Promise<void> {
  await getAdapter("local").deletePrefix(mangaPrefix(id));
  await supabase.from("manga").delete().eq("id", id);
}

export async function renameManga(id: string, title: string): Promise<void> {
  await supabase.from("manga").update({ title }).eq("id", id);
}

export async function setCover(id: string, cover: string): Promise<void> {
  await supabase.from("manga").update({ cover_image: cover }).eq("id", id);
}

export interface CommitProgress {
  done: number;
  total: number;
  label: string;
}

export interface CommitOptions {
  publishAsGlobal?: boolean;
}

/** Commit a preview: write blobs locally + insert manga/chapters/pages rows. */
export async function commitImport(
  preview: ImportPreview,
  onProgress?: (p: CommitProgress) => void,
  options: CommitOptions = {},
): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) throw new Error("Must be signed in to import");

  // Use first page as cover (data URL of small thumbnail would be ideal,
  // but for v1 we store a blob:// later — UI falls back to first page render).
  const { data: mangaRow, error: mErr } = await supabase
    .from("manga")
    .insert({
      user_id: userId,
      title: preview.title,
      storage_provider: "local",
    })
    .select()
    .single();
  if (mErr || !mangaRow) throw mErr ?? new Error("Failed to create manga");
  const mangaId = mangaRow.id as string;

  let done = 0;
  const total = preview.totalPages;

  for (let ci = 0; ci < preview.chapters.length; ci++) {
    const ch = preview.chapters[ci];
    const { data: chapterRow, error: cErr } = await supabase
      .from("chapters")
      .insert({
        manga_id: mangaId,
        user_id: userId,
        title: ch.title,
        index: ci,
        page_count: ch.pages.length,
      })
      .select()
      .single();
    if (cErr || !chapterRow) throw cErr ?? new Error("Failed to create chapter");
    const chapterId = chapterRow.id as string;

    // Insert pages first (need ids), then write blobs under those ids.
    const pageRows = ch.pages.map((_p, i) => ({
      chapter_id: chapterId,
      user_id: userId,
      index: i,
    }));
    const { data: insertedPages, error: pErr } = await supabase
      .from("pages")
      .insert(pageRows)
      .select("id, index");
    if (pErr || !insertedPages) throw pErr ?? new Error("Failed to create pages");

    // Sort to match insert order
    const sorted = [...insertedPages].sort((a, b) => a.index - b.index);

    for (let i = 0; i < ch.pages.length; i++) {
      const page = ch.pages[i];
      const dbPage = sorted[i];
      const key = pageBlobKey(mangaId, chapterId, dbPage.id);
      await getAdapter("local").write(key, page.blob);

      // Set blob_key + dims for the first page so we have a cover quickly
      if (ci === 0 && i === 0) {
        const dims = await blobToImageDims(page.blob);
        await supabase
          .from("pages")
          .update({
            blob_key: key,
            width: dims?.width ?? null,
            height: dims?.height ?? null,
          })
          .eq("id", dbPage.id);
        await supabase.from("manga").update({ cover_image: key }).eq("id", mangaId);
      } else {
        await supabase.from("pages").update({ blob_key: key }).eq("id", dbPage.id);
      }
      done++;
      onProgress?.({ done, total, label: `${ch.title} — page ${i + 1}/${ch.pages.length}` });
    }
  }

  // Optional: publish a Global Manga catalogue entry mirroring this import.
  // Admin-only at the database level (RLS); silently skipped on permission error.
  if (options.publishAsGlobal) {
    try {
      const { data: gRow, error: gErr } = await supabase
        .from("global_manga")
        .insert({
          title: preview.title,
          created_by: userId,
        })
        .select("id")
        .single();
      if (!gErr && gRow) {
        const globalId = gRow.id as string;
        const chapterRows = preview.chapters.map((ch, i) => ({
          global_manga_id: globalId,
          title: ch.title,
          index: i,
          page_count: ch.pages.length,
        }));
        if (chapterRows.length) {
          await supabase.from("global_chapters").insert(chapterRows);
        }
        // Link the personal row to the new global entry.
        await supabase.from("manga").update({ global_manga_id: globalId }).eq("id", mangaId);
      }
    } catch {
      // Non-fatal: personal import already succeeded.
    }
  }

  return mangaId;
}
