import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";

interface Props {
  onFiles: (files: File[]) => void;
  children: ReactNode;
  /** When true, the component listens to drops on the entire window, not only its own area. */
  global?: boolean;
}

function flattenDataTransfer(dt: DataTransfer): Promise<File[]> {
  // Use dataTransfer.items if available so we can walk directories.
  const items = dt.items ? Array.from(dt.items) : [];
  if (items.length === 0) return Promise.resolve(Array.from(dt.files));

  type FSEntry = {
    isFile: boolean;
    isDirectory: boolean;
    fullPath: string;
    file?: (cb: (file: File) => void) => void;
    createReader?: () => { readEntries: (cb: (entries: FSEntry[]) => void) => void };
  };

  const out: File[] = [];

  async function walk(entry: FSEntry): Promise<void> {
    if (entry.isFile && entry.file) {
      const file = await new Promise<File>((res) => entry.file!((f) => res(f)));
      // Preserve the directory path so the importer can detect chapters.
      const path = entry.fullPath.replace(/^\//, "");
      const wrapped = new File([file], file.name, { type: file.type, lastModified: file.lastModified });
      Object.defineProperty(wrapped, "webkitRelativePath", { value: path, configurable: true });
      out.push(wrapped);
      return;
    }
    if (entry.isDirectory && entry.createReader) {
      const reader = entry.createReader();
      const readBatch = () =>
        new Promise<FSEntry[]>((res) => reader.readEntries((entries) => res(entries)));
      let batch = await readBatch();
      while (batch.length > 0) {
        for (const e of batch) await walk(e);
        batch = await readBatch();
      }
    }
  }

  return (async () => {
    for (const item of items) {
      const entry = (item as DataTransferItem & {
        webkitGetAsEntry?: () => FSEntry | null;
      }).webkitGetAsEntry?.();
      if (entry) await walk(entry);
      else {
        const file = item.getAsFile();
        if (file) out.push(file);
      }
    }
    return out;
  })();
}

export function DropZone({ onFiles, children, global = false }: Props) {
  const [over, setOver] = useState(false);
  const counterRef = useRef(0);

  useEffect(() => {
    if (!global) return;
    const enter = (e: DragEvent | Event) => {
      const ev = e as unknown as DragEvent;
      if (!ev.dataTransfer || ![...ev.dataTransfer.types].includes("Files")) return;
      counterRef.current++;
      setOver(true);
      ev.preventDefault();
    };
    const leave = () => {
      counterRef.current = Math.max(0, counterRef.current - 1);
      if (counterRef.current === 0) setOver(false);
    };
    const over = (e: Event) => e.preventDefault();
    const drop = async (e: Event) => {
      const ev = e as unknown as DragEvent;
      ev.preventDefault();
      counterRef.current = 0;
      setOver(false);
      if (ev.dataTransfer) {
        const files = await flattenDataTransfer(ev.dataTransfer);
        if (files.length) onFiles(files);
      }
    };
    window.addEventListener("dragenter", enter as EventListener);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter as EventListener);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [global, onFiles]);

  if (global) {
    return (
      <>
        {children}
        {over && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
            <div className="rounded-2xl border-2 border-dashed border-primary px-12 py-10 text-center bg-surface-elevated/80">
              <div className="text-2xl font-bold text-foreground">Drop to import</div>
              <div className="mt-2 text-sm text-muted-foreground">
                ZIP/CBZ, folders, or images
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        setOver(false);
      }}
      onDrop={async (e) => {
        e.preventDefault();
        setOver(false);
        const files = await flattenDataTransfer(e.dataTransfer);
        if (files.length) onFiles(files);
      }}
      className={`rounded-2xl border-2 border-dashed transition-colors ${
        over ? "border-primary bg-primary/10" : "border-border bg-surface"
      }`}
    >
      {children}
    </div>
  );
}
