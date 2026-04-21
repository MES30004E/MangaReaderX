// Storage adapter abstraction — keeps reader/import code decoupled
// from where bytes actually live (local IndexedDB / cloud / future Synology).
import { deleteBlob, deleteBlobsByPrefix, getBlobURL, putBlob } from "./idb";

export type StorageProvider = "local" | "cloud" | "synology";

export interface StorageAdapter {
  readonly provider: StorageProvider;
  write(key: string, blob: Blob): Promise<void>;
  readURL(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
}

class LocalAdapter implements StorageAdapter {
  readonly provider = "local" as const;
  write = (key: string, blob: Blob) => putBlob(key, blob);
  readURL = (key: string) => getBlobURL(key);
  delete = (key: string) => deleteBlob(key);
  deletePrefix = (prefix: string) => deleteBlobsByPrefix(prefix);
}

// Cloud / Synology adapters are stubbed — local is the source of truth in v1.
// Real cloud file backup would chunk-upload to Supabase Storage; Synology needs
// a server proxy for CORS reasons (browser can't reach a NAS directly).

export const localStorageAdapter: StorageAdapter = new LocalAdapter();

export function getAdapter(provider: StorageProvider): StorageAdapter {
  // For now everything routes through local. Hook for the future.
  return localStorageAdapter;
}

export function pageBlobKey(mangaId: string, chapterId: string, pageId: string): string {
  return `m/${mangaId}/c/${chapterId}/p/${pageId}`;
}

export function chapterPrefix(mangaId: string, chapterId: string): string {
  return `m/${mangaId}/c/${chapterId}/`;
}

export function mangaPrefix(mangaId: string): string {
  return `m/${mangaId}/`;
}
