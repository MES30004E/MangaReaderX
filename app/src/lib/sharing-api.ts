// User-to-user manga sharing (read-only metadata + page access).
import { supabase } from "@/integrations/supabase/client";

export interface MangaShareRow {
  id: string;
  manga_id: string;
  owner_user_id: string;
  recipient_user_id: string;
  permission: string;
  created_at: string;
}

export interface SharedWithMe extends MangaShareRow {
  owner_display_name: string | null;
}

/** Shares the owner has created for a given manga. */
export async function listSharesForManga(mangaId: string): Promise<MangaShareRow[]> {
  const { data, error } = await supabase
    .from("manga_shares")
    .select("*")
    .eq("manga_id", mangaId);
  if (error) throw error;
  return (data ?? []) as MangaShareRow[];
}

/** All shares pointing TO me (manga shared with my account). */
export async function listSharesToMe(): Promise<MangaShareRow[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("manga_shares")
    .select("*")
    .eq("recipient_user_id", u.user.id);
  if (error) throw error;
  return (data ?? []) as MangaShareRow[];
}

/** Display names for a set of user ids (for "shared by …" labels). */
export async function getDisplayNames(userIds: string[]): Promise<Map<string, string>> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return new Map();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  if (error) throw error;
  const m = new Map<string, string>();
  for (const p of data ?? []) m.set(p.id as string, (p.display_name as string) ?? "");
  return m;
}

/** Resolve a recipient identifier (display_name or UUID) to a user id. */
export async function resolveRecipient(idOrName: string): Promise<string | null> {
  const v = idOrName.trim();
  if (!v) return null;
  // UUID-ish path: try direct lookup.
  if (/^[0-9a-f-]{36}$/i.test(v)) {
    const { data } = await supabase.from("profiles").select("id").eq("id", v).maybeSingle();
    if (data?.id) return data.id as string;
  }
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("display_name", v)
    .limit(1)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

export async function shareMangaWith(
  mangaId: string,
  recipientUserId: string,
): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  if (u.user.id === recipientUserId) throw new Error("Cannot share with yourself");
  const { error } = await supabase.from("manga_shares").insert({
    manga_id: mangaId,
    owner_user_id: u.user.id,
    recipient_user_id: recipientUserId,
    permission: "read",
  });
  if (error) throw error;
}

export async function unshareMangaWith(
  mangaId: string,
  recipientUserId: string,
): Promise<void> {
  await supabase
    .from("manga_shares")
    .delete()
    .eq("manga_id", mangaId)
    .eq("recipient_user_id", recipientUserId);
}

/** Recipient removes their own access (does not delete the owner's manga). */
export async function removeSharedAccess(mangaId: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase
    .from("manga_shares")
    .delete()
    .eq("manga_id", mangaId)
    .eq("recipient_user_id", u.user.id);
}
