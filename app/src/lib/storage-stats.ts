// Storage statistics — counts blobs in IndexedDB and queries browser quota.
// IMPORTANT: must use the shared getDB() from "./idb" so the upgrade handler
// runs and the page-blobs object store always exists. Opening the DB here
// without an upgrade handler used to create an empty DB for fresh users,
// causing "object store not found" errors elsewhere.
import { STORE, getDB } from "./idb";

export interface StorageStats {
  /** Bytes used by all page blobs combined. */
  bytesUsed: number;
  /** Number of stored page blobs. */
  blobCount: number;
  /** Per-manga byte totals keyed by mangaId (extracted from `m/<id>/...` keys). */
  perManga: Record<string, { bytes: number; blobs: number }>;
  /** Browser-reported quota and usage if available. */
  quota: number | null;
  /** Browser-reported usage of the entire origin (covers all DBs / caches). */
  originUsage: number | null;
}

export async function computeStorageStats(): Promise<StorageStats> {
  const result: StorageStats = {
    bytesUsed: 0,
    blobCount: 0,
    perManga: {},
    quota: null,
    originUsage: null,
  };

  if (typeof indexedDB !== "undefined") {
    try {
      const db = await getDB();
      if (db.objectStoreNames.contains(STORE)) {
        const tx = db.transaction(STORE, "readonly");
        let cursor = await tx.store.openCursor();
        while (cursor) {
          const key = cursor.key;
          const value = cursor.value;
          if (value instanceof Blob) {
            result.bytesUsed += value.size;
            result.blobCount += 1;
            if (typeof key === "string") {
              // Keys look like "m/<mangaId>/c/<chapterId>/p/<pageId>"
              const m = key.match(/^m\/([^/]+)\//);
              if (m) {
                const id = m[1];
                if (!result.perManga[id]) result.perManga[id] = { bytes: 0, blobs: 0 };
                result.perManga[id].bytes += value.size;
                result.perManga[id].blobs += 1;
              }
            }
          }
          cursor = await cursor.continue();
        }
      }
    } catch {
      // ignore — return what we have
    }
  }

  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    try {
      const est = await navigator.storage.estimate();
      result.quota = est.quota ?? null;
      result.originUsage = est.usage ?? null;
    } catch {
      // ignore
    }
  }

  return result;
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

export type AvailabilityState = "ready" | "available" | "metadata_only" | "needs_import";

/**
 * Determine availability for a manga:
 * - "ready": cover present, blobs present.
 * - "available": all blobs present, no cover.
 * - "metadata_only": rows exist but no blobs in IndexedDB.
 * - "needs_import": no chapters/pages.
 */
export function classifyAvailability(opts: {
  hasCover: boolean;
  blobCount: number;
  expectedPages: number;
}): AvailabilityState {
  if (opts.expectedPages === 0) return "needs_import";
  if (opts.blobCount === 0) return "metadata_only";
  if (opts.hasCover && opts.blobCount >= opts.expectedPages) return "ready";
  return "available";
}
