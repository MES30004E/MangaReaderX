// Import pipeline: ZIP/CBZ + folders + raw images -> structured ImportPreview.
// Pure functions; no DB writes. The caller commits the preview separately
// so we get safe-cancel for free.
import JSZip from "jszip";
import { naturalCompare } from "./natural-sort";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|avif)$/i;
const JUNK = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)/i;

export interface ImportPagePreview {
  name: string;       // original filename, used for sort + display
  blob: Blob;
}

export interface ImportChapterPreview {
  title: string;
  pages: ImportPagePreview[];
}

export interface ImportPreview {
  title: string;            // proposed manga title
  chapters: ImportChapterPreview[];
  totalPages: number;
}

export interface ImportProgress {
  processed: number;
  total: number;
  label: string;
}

type ProgressCb = (p: ImportProgress) => void;

function isImage(name: string): boolean {
  return IMAGE_EXT.test(name) && !JUNK.test(name);
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

function baseOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

function stripExt(name: string): string {
  return name.replace(/\.[^./]+$/, "");
}

/** Build chapters from a flat list of {path, blob}. */
function buildChaptersFromPaths(
  items: { path: string; blob: Blob }[],
  fallbackTitle: string,
): ImportChapterPreview[] {
  // Strip a common top-level folder if there is exactly one (typical inside ZIPs)
  const tops = new Set(items.map((i) => i.path.split("/")[0]));
  let stripped = items;
  if (tops.size === 1 && [...tops][0] !== "") {
    const top = [...tops][0];
    stripped = items.map((i) => ({
      path: i.path.startsWith(top + "/") ? i.path.slice(top.length + 1) : i.path,
      blob: i.blob,
    }));
  }

  // Group by directory (relative). No subdir = single chapter.
  const byDir = new Map<string, { path: string; blob: Blob }[]>();
  for (const it of stripped) {
    const d = dirOf(it.path);
    const arr = byDir.get(d) ?? [];
    arr.push(it);
    byDir.set(d, arr);
  }

  const dirs = [...byDir.keys()].sort(naturalCompare);
  // If only one dir (or all root), single chapter.
  if (dirs.length === 1) {
    const list = byDir.get(dirs[0])!;
    list.sort((a, b) => naturalCompare(baseOf(a.path), baseOf(b.path)));
    return [
      {
        title: dirs[0] || fallbackTitle,
        pages: list.map((p) => ({ name: baseOf(p.path), blob: p.blob })),
      },
    ];
  }

  return dirs.map((d) => {
    const list = byDir.get(d)!;
    list.sort((a, b) => naturalCompare(baseOf(a.path), baseOf(b.path)));
    return {
      title: d.split("/").pop() || d,
      pages: list.map((p) => ({ name: baseOf(p.path), blob: p.blob })),
    };
  });
}

/** Parse one ZIP/CBZ file into chapters. Aborts via signal. */
async function parseZip(
  file: File,
  signal: AbortSignal,
  onProgress?: ProgressCb,
): Promise<ImportChapterPreview[]> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files).filter(
    (e) => !e.dir && isImage(e.name),
  );
  const items: { path: string; blob: Blob }[] = [];
  let i = 0;
  for (const entry of entries) {
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      const blob = await entry.async("blob");
      items.push({ path: entry.name, blob });
    } catch {
      // skip corrupted entry
    }
    i++;
    onProgress?.({ processed: i, total: entries.length, label: `Reading ${file.name}` });
  }
  return buildChaptersFromPaths(items, stripExt(file.name));
}

export interface ImportInput {
  /** Files dropped/selected. May include zips, cbz, or images. */
  files: File[];
  /** Set to true if originating from a directory pick (webkitdirectory). */
  fromDirectory?: boolean;
}

export async function buildPreview(
  input: ImportInput,
  signal: AbortSignal,
  onProgress?: ProgressCb,
): Promise<ImportPreview> {
  const zips = input.files.filter((f) => /\.(zip|cbz)$/i.test(f.name));
  const images = input.files.filter((f) => isImage(f.name));

  // CASE 1: A single ZIP/CBZ -> use as the manga.
  if (zips.length === 1 && images.length === 0) {
    const file = zips[0];
    const chapters = await parseZip(file, signal, onProgress);
    return {
      title: stripExt(file.name),
      chapters,
      totalPages: chapters.reduce((n, c) => n + c.pages.length, 0),
    };
  }

  // CASE 2: Multiple ZIPs -> each becomes a chapter.
  if (zips.length > 1 && images.length === 0) {
    const all: ImportChapterPreview[] = [];
    let processed = 0;
    for (const z of zips) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const inner = await parseZip(z, signal, (p) =>
        onProgress?.({ ...p, label: `${z.name}: ${p.label}` }),
      );
      // Flatten each ZIP into one chapter named after the zip
      const flat = inner.flatMap((c) => c.pages);
      all.push({ title: stripExt(z.name), pages: flat });
      processed++;
      onProgress?.({ processed, total: zips.length, label: "Combining archives" });
    }
    return {
      title: "New manga",
      chapters: all,
      totalPages: all.reduce((n, c) => n + c.pages.length, 0),
    };
  }

  // CASE 3: Folder pick or loose images.
  if (images.length > 0) {
    // For directory picks, File.webkitRelativePath has the path.
    const items = images.map((f) => {
      const path =
        ((f as File & { webkitRelativePath?: string }).webkitRelativePath as string | undefined) ||
        f.name;
      return { path, blob: f };
    });
    const chapters = buildChaptersFromPaths(items, "New manga");

    // Title heuristic: top folder name if directory pick, else first chapter name
    let title = "New manga";
    const tops = new Set(items.map((i) => i.path.split("/")[0]));
    if (tops.size === 1 && [...tops][0] && [...tops][0].includes(".") === false) {
      title = [...tops][0];
    } else if (chapters.length > 0) {
      title = chapters[0].title;
    }

    return {
      title,
      chapters,
      totalPages: chapters.reduce((n, c) => n + c.pages.length, 0),
    };
  }

  throw new Error("No supported files found. Drop a ZIP/CBZ, a folder, or images.");
}
