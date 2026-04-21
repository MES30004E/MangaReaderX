// IndexedDB blob store for manga page images.
// Never store images in localStorage — quota and perf disaster.
import { openDB, type IDBPDatabase } from "idb";

export const DB_NAME = "mangareaderx";
// v2: ensures the page-blobs store exists even if a previous code path
// (storage-stats) opened the DB at v1 without an upgrade handler, leaving
// it without any object stores. Bumping forces upgrade() to run.
export const DB_VERSION = 2;
export const STORE = "page-blobs";

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB not available (SSR or unsupported browser)"));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
      blocked() {
        // Another tab holds an older version open; nothing actionable here.
      },
    });
  }
  return dbPromise;
}

export async function putBlob(key: string, blob: Blob): Promise<void> {
  const db = await getDB();
  await db.put(STORE, blob, key);
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const db = await getDB();
  return (await db.get(STORE, key)) as Blob | undefined;
}

export async function deleteBlob(key: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, key);
}

export async function deleteBlobsByPrefix(prefix: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE, "readwrite");
  let cursor = await tx.store.openCursor();
  while (cursor) {
    if (typeof cursor.key === "string" && cursor.key.startsWith(prefix)) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

// URL cache so we don't recreate object URLs on every render.
const urlCache = new Map<string, string>();

export async function getBlobURL(key: string): Promise<string | null> {
  if (urlCache.has(key)) return urlCache.get(key)!;
  const blob = await getBlob(key);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(key, url);
  return url;
}

export function revokeBlobURL(key: string): void {
  const url = urlCache.get(key);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(key);
  }
}

export function revokeAllBlobURLs(): void {
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
}
