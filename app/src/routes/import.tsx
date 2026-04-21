import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { DropZone } from "@/components/DropZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";
import { buildPreview, type ImportPreview, type ImportProgress } from "@/lib/importer";
import { commitImport, type CommitProgress } from "@/lib/manga-api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, X, Globe } from "lucide-react";
import { useHasRole } from "@/lib/use-role";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/import")({
  component: ImportPage,
});

function ImportPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState<ImportProgress | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitProg, setCommitProg] = useState<CommitProgress | null>(null);
  const [titleEdit, setTitleEdit] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const { hasRole: isAdmin } = useHasRole("admin");
  const [publishGlobal, setPublishGlobal] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  // Receive files dropped on /
  useEffect(() => {
    function onDrop(e: Event) {
      const detail = (e as CustomEvent).detail as File[];
      if (detail?.length) handleFiles(detail);
    }
    window.addEventListener("mrx:files-dropped", onDrop);
    return () => window.removeEventListener("mrx:files-dropped", onDrop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFiles(files: File[]) {
    if (parsing || committing) return;
    setPreview(null);
    setParsing(true);
    setParseProgress({ processed: 0, total: 1, label: "Reading…" });
    abortRef.current = new AbortController();
    try {
      const p = await buildPreview({ files }, abortRef.current.signal, setParseProgress);
      setPreview(p);
      setTitleEdit(p.title);
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        toast.message("Import cancelled");
      } else {
        toast.error("Import failed", { description: (e as Error).message });
      }
    } finally {
      setParsing(false);
      setParseProgress(null);
      abortRef.current = null;
    }
  }

  function cancelParse() {
    abortRef.current?.abort();
  }

  async function commit() {
    if (!preview) return;
    setCommitting(true);
    setCommitProg({ done: 0, total: preview.totalPages, label: "Saving…" });
    try {
      const id = await commitImport(
        { ...preview, title: titleEdit || preview.title },
        setCommitProg,
        { publishAsGlobal: isAdmin && publishGlobal },
      );
      toast.success("Imported", { description: `${preview.totalPages} pages saved.` });
      qc.invalidateQueries({ queryKey: ["manga"] });
      nav({ to: "/manga/$mangaId", params: { mangaId: id } });
    } catch (e) {
      toast.error("Save failed", { description: (e as Error).message });
    } finally {
      setCommitting(false);
      setCommitProg(null);
    }
  }

  function discardPreview() {
    setPreview(null);
    setTitleEdit("");
  }

  if (loading || !user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl tracking-wide mb-1">Import</h1>
      <p className="text-sm text-muted-foreground mb-6">
        ZIP/CBZ archives, folders, or individual images. Files are stored locally on this device.
      </p>

      {!preview && !parsing && (
        <DropZone onFiles={handleFiles}>
          <label className="block cursor-pointer p-10 text-center">
            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
            <div className="mt-3 font-medium">Drop files here, or click to browse</div>
            <div className="text-xs text-muted-foreground mt-1">ZIP / CBZ / folders / images</div>
            <input
              type="file"
              multiple
              accept=".zip,.cbz,image/*"
              className="hidden"
              onChange={(e) => {
                const fs = Array.from(e.target.files ?? []);
                if (fs.length) handleFiles(fs);
                e.currentTarget.value = "";
              }}
            />
            <div className="mt-4 flex justify-center gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  multiple
                  accept=".zip,.cbz,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const fs = Array.from(e.target.files ?? []);
                    if (fs.length) handleFiles(fs);
                    e.currentTarget.value = "";
                  }}
                />
                <Button variant="outline" type="button" asChild>
                  <span>Choose files</span>
                </Button>
              </label>
              <label className="inline-flex">
                <input
                  type="file"
                  // @ts-expect-error non-standard but supported
                  webkitdirectory=""
                  directory=""
                  className="hidden"
                  onChange={(e) => {
                    const fs = Array.from(e.target.files ?? []);
                    if (fs.length) handleFiles(fs);
                    e.currentTarget.value = "";
                  }}
                />
                <Button variant="outline" type="button" asChild>
                  <span>Choose folder</span>
                </Button>
              </label>
            </div>
          </label>
        </DropZone>
      )}

      {parsing && parseProgress && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-muted-foreground">{parseProgress.label}</div>
            <Button variant="ghost" size="sm" onClick={cancelParse}>
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>
          <Progress
            value={parseProgress.total ? (parseProgress.processed / parseProgress.total) * 100 : 0}
          />
          <div className="mt-2 text-xs text-muted-foreground tabular-nums">
            {parseProgress.processed} / {parseProgress.total}
          </div>
        </div>
      )}

      {preview && !committing && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-surface p-5">
            <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Manga title
            </label>
            <Input
              value={titleEdit}
              onChange={(e) => setTitleEdit(e.target.value)}
              placeholder="Untitled"
            />
            <div className="mt-3 text-sm text-muted-foreground">
              {preview.chapters.length} chapter{preview.chapters.length === 1 ? "" : "s"} ·{" "}
              {preview.totalPages} pages
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface divide-y divide-border max-h-[40vh] overflow-y-auto">
            {preview.chapters.map((c, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{c.pages.length} pages</div>
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">#{i + 1}</div>
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="rounded-2xl border border-border bg-surface p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="publish-global" className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Publish as Global Manga
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Adds an entry to the shared catalogue (metadata only). Other users will be able to
                  add it to their library from Discover.
                </p>
              </div>
              <Switch
                id="publish-global"
                checked={publishGlobal}
                onCheckedChange={setPublishGlobal}
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={commit} disabled={!titleEdit.trim()}>
              Save to library
            </Button>
            <Button variant="ghost" onClick={discardPreview}>
              Discard
            </Button>
          </div>
        </div>
      )}

      {committing && commitProg && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <div className="text-sm text-muted-foreground mb-3">{commitProg.label}</div>
          <Progress value={(commitProg.done / Math.max(1, commitProg.total)) * 100} />
          <div className="mt-2 text-xs text-muted-foreground tabular-nums">
            {commitProg.done} / {commitProg.total}
          </div>
        </div>
      )}
    </div>
  );
}
