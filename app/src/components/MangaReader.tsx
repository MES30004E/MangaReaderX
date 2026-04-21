import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageImage } from "@/components/PageImage";
import { ProgressBar } from "@/components/ProgressBar";
import { ReaderSettingsDialog } from "@/components/reader/ReaderSettingsDialog";
import { useReaderPrefs } from "@/lib/use-reader-prefs";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ScrollText,
  BookOpen,
  Settings as SettingsIcon,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { ChapterRow, MangaRow, PageRow } from "@/lib/manga-api";
import { upsertProgress } from "@/lib/manga-api";
import { markChapterRead } from "@/lib/library-api";

export type ReaderMode = "vertical" | "book";

interface Props {
  manga: MangaRow;
  chapter: ChapterRow;
  pages: PageRow[];
  initialPage: number;
  chapters: ChapterRow[];
}

interface Spread {
  pageIndices: number[];
}

// Group consecutive non-spread pages into pairs. The on-screen order is
// [right-page, left-page] so manga RTL reading is preserved.
function buildSpreads(pages: PageRow[]): Spread[] {
  const spreads: Spread[] = [];
  let i = 0;
  while (i < pages.length) {
    const p = pages[i];
    if (p.is_spread) {
      spreads.push({ pageIndices: [i] });
      i++;
    } else if (i + 1 < pages.length && !pages[i + 1].is_spread) {
      spreads.push({ pageIndices: [i + 1, i] });
      i += 2;
    } else {
      spreads.push({ pageIndices: [i] });
      i++;
    }
  }
  return spreads;
}

function spreadIndexForPage(spreads: Spread[], pageIdx: number): number {
  for (let s = 0; s < spreads.length; s++) {
    if (spreads[s].pageIndices.includes(pageIdx)) return s;
  }
  return 0;
}

function fitClass(fit: "width" | "height" | "original", mode: ReaderMode): string {
  if (mode === "vertical") {
    if (fit === "width") return "block w-full h-auto";
    if (fit === "height") return "block max-h-[100vh] w-auto mx-auto";
    return "block w-auto h-auto mx-auto";
  }
  if (fit === "width") return "max-w-full w-full h-auto object-contain";
  if (fit === "original") return "w-auto h-auto object-none";
  return "max-h-full max-w-full object-contain";
}

export function MangaReader({ manga, chapter, pages, initialPage, chapters }: Props) {
  const nav = useNavigate();
  const { prefs, update } = useReaderPrefs();
  const [mode, setMode] = useState<ReaderMode>(
    prefs.default_mode === "book" ? "book" : "vertical",
  );
  const [page, setPage] = useState(
    Math.min(Math.max(0, initialPage), Math.max(0, pages.length - 1)),
  );
  const [uiVisible, setUiVisible] = useState(!prefs.always_hide_chrome);
  const [isFs, setIsFs] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const spreads = useMemo(
    () => (mode === "book" ? buildSpreads(pages) : []),
    [pages, mode],
  );
  const spreadIdx = mode === "book" ? spreadIndexForPage(spreads, page) : null;

  const verticalRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  pageRefs.current = pageRefs.current.slice(0, pages.length);

  // Vertical mode: passive scroll listener for progress only — never preventDefault.
  useEffect(() => {
    if (mode !== "vertical") return;
    const container = verticalRef.current;
    if (!container) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const { top, height } = container.getBoundingClientRect();
        const centre = top + height / 2;
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i < pageRefs.current.length; i++) {
          const el = pageRefs.current[i];
          if (!el) continue;
          const r = el.getBoundingClientRect();
          const c = r.top + r.height / 2;
          const d = Math.abs(c - centre);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
        setPage(best);
      });
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [mode, pages.length]);

  // Persist progress (debounced).
  useEffect(() => {
    const t = window.setTimeout(() => {
      upsertProgress(manga.id, chapter.id, page);
      if (page >= pages.length - 1) {
        markChapterRead(chapter.id).catch(() => {});
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [manga.id, chapter.id, page, pages.length]);

  // When entering vertical mode (or book mode), align to the current page once.
  // We deliberately do NOT call scrollIntoView during normal scrolling.
  const lastModeRef = useRef<ReaderMode | null>(null);
  useEffect(() => {
    if (lastModeRef.current === mode) return;
    lastModeRef.current = mode;
    if (mode === "vertical") {
      const el = pageRefs.current[page];
      el?.scrollIntoView({ block: "start", behavior: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Manga reading: in book mode "next" advances forward. The visual layout
  // already places the right-side page first via buildSpreads().
  const goNext = useCallback(() => {
    if (mode === "book" && spreads.length) {
      const s = Math.min(spreads.length - 1, (spreadIdx ?? 0) + 1);
      setPage(spreads[s].pageIndices[0]);
      return;
    }
    setPage((p) => {
      const next = Math.min(pages.length - 1, p + 1);
      if (mode === "vertical") pageRefs.current[next]?.scrollIntoView({ block: "start" });
      return next;
    });
  }, [mode, spreads, spreadIdx, pages.length]);

  const goPrev = useCallback(() => {
    if (mode === "book" && spreads.length) {
      const s = Math.max(0, (spreadIdx ?? 0) - 1);
      setPage(spreads[s].pageIndices[0]);
      return;
    }
    setPage((p) => {
      const next = Math.max(0, p - 1);
      if (mode === "vertical") pageRefs.current[next]?.scrollIntoView({ block: "start" });
      return next;
    });
  }, [mode, spreads, spreadIdx]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (mode === "vertical") {
        if (e.key === "ArrowDown" || e.key === "PageDown") {
          e.preventDefault();
          goNext();
        } else if (e.key === "ArrowUp" || e.key === "PageUp") {
          e.preventDefault();
          goPrev();
        } else if (e.key === " ") {
          e.preventDefault();
          goNext();
        }
      } else {
        // Manga RTL: ArrowLeft = next, ArrowRight = previous.
        if (e.key === "ArrowLeft") goNext();
        else if (e.key === "ArrowRight") goPrev();
        else if (e.key === " ") {
          e.preventDefault();
          goNext();
        }
      }
      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
          return;
        }
        if (!uiVisible) {
          setUiVisible(true);
          return;
        }
        nav({ to: "/manga/$mangaId", params: { mangaId: manga.id } });
      } else if (e.key.toLowerCase() === "f") {
        toggleFs();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goPrev, goNext, uiVisible, manga.id, mode]);

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  // Book mode: LEFT side advances (manga RTL), RIGHT side goes back.
  const computeAction = useCallback(
    (area: "left" | "right"): "prev" | "next" => {
      let nextSide: "left" | "right" = "left";
      if (prefs.left_handed) nextSide = "right";
      if (prefs.invert_taps) nextSide = nextSide === "left" ? "right" : "left";
      return area === nextSide ? "next" : "prev";
    },
    [prefs.left_handed, prefs.invert_taps],
  );

  function handleZoneClick(e: React.MouseEvent, area: "left" | "centre" | "right") {
    e.stopPropagation();
    if (area === "centre") {
      setUiVisible((v) => !v);
      return;
    }
    const action = computeAction(area);
    if (action === "prev") goPrev();
    else goNext();
  }

  const chapIdxInList = chapters.findIndex((c) => c.id === chapter.id);
  const prevChapter = chapIdxInList > 0 ? chapters[chapIdxInList - 1] : null;
  const nextChapter =
    chapIdxInList < chapters.length - 1 ? chapters[chapIdxInList + 1] : null;

  const totalForBar = pages.length;
  const tapPct = Math.max(10, Math.min(45, prefs.tap_zone_pct));
  const centrePct = 100 - tapPct * 2;
  const fitV = fitClass(prefs.fit_vertical, "vertical");
  const fitB = fitClass(prefs.fit_book, "book");

  return (
    <div className="fixed inset-0 z-40 bg-background text-foreground">
      {mode === "vertical" && (
        <div
          ref={verticalRef}
          className="reader-vertical h-full w-full overflow-y-auto overflow-x-hidden no-scrollbar"
          style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
        >
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-2 py-4">
            {pages.map((p, i) => (
              <div
                key={p.id}
                ref={(el) => {
                  pageRefs.current[i] = el;
                }}
                className="w-full"
              >
                <PageImage
                  blobKey={p.blob_key}
                  alt={`Page ${i + 1}`}
                  className={fitV}
                  rotation={p.rotation}
                  loading={Math.abs(i - page) <= 3 ? "eager" : "lazy"}
                />
              </div>
            ))}
            <div className="py-12 text-center text-muted-foreground text-sm">
              {nextChapter ? (
                <Link
                  to="/read/$mangaId/$chapterId"
                  params={{ mangaId: manga.id, chapterId: nextChapter.id }}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Next: {nextChapter.title} →
                </Link>
              ) : (
                <span>End of manga</span>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === "book" && spreads.length > 0 && spreadIdx != null && (
        <div className="h-full w-full flex items-center justify-center bg-ink overflow-hidden">
          <div className="flex h-full w-full max-w-7xl items-center justify-center gap-1 p-4">
            {spreads[spreadIdx].pageIndices.map((idx) => {
              const p = pages[idx];
              return (
                <PageImage
                  key={p.id}
                  blobKey={p.blob_key}
                  alt={`Page ${idx + 1}`}
                  className={`${fitB} max-w-[50%]`}
                  rotation={p.rotation}
                  loading="eager"
                />
              );
            })}
            {spreads[spreadIdx].pageIndices.length === 1 && (
              <div className="max-w-[50%]" aria-hidden />
            )}
          </div>
        </div>
      )}

      {prefs.dim_level > 0 && (
        <div
          className="pointer-events-none absolute inset-0 bg-black"
          style={{ opacity: prefs.dim_level / 100 }}
          aria-hidden
        />
      )}

      {/* Tap zones — only in book mode. Vertical mode keeps native scroll unblocked. */}
      {mode === "book" && (
        <div className="pointer-events-none absolute inset-0">
          <div className="flex h-full">
            <div
              className="pointer-events-auto h-full"
              style={{ width: `${tapPct}%` }}
              onClick={(e) => handleZoneClick(e, "left")}
              aria-label="Left tap zone"
            />
            <div
              className="pointer-events-auto h-full"
              style={{ width: `${centrePct}%` }}
              onClick={(e) => handleZoneClick(e, "centre")}
              aria-label="Center tap zone"
            />
            <div
              className="pointer-events-auto h-full"
              style={{ width: `${tapPct}%` }}
              onClick={(e) => handleZoneClick(e, "right")}
              aria-label="Right tap zone"
            />
          </div>
        </div>
      )}

      {/* Vertical mode: a small invisible center-tap target to toggle UI. Doesn't block scroll. */}
      {mode === "vertical" && (
        <button
          type="button"
          onClick={() => setUiVisible((v) => !v)}
          className="absolute left-1/2 top-1/2 h-16 w-32 -translate-x-1/2 -translate-y-1/2 opacity-0"
          aria-label="Toggle reader UI"
        />
      )}

      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 transition-transform duration-200 ${
          uiVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 bg-background/80 backdrop-blur px-3 py-2 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              nav({ to: "/manga/$mangaId", params: { mangaId: manga.id } })
            }
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-sm font-medium">{manga.title}</div>
            <div className="truncate text-[11px] text-muted-foreground">
              {chapter.title}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={mode === "vertical" ? "default" : "ghost"}
              size="icon"
              onClick={() => setMode("vertical")}
              aria-label="Vertical"
            >
              <ScrollText className="h-4 w-4" />
            </Button>
            <Button
              variant={mode === "book" ? "default" : "ghost"}
              size="icon"
              onClick={() => setMode("book")}
              aria-label="Book"
            >
              <BookOpen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="Reader settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-transform duration-200 ${
          uiVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-background/85 backdrop-blur px-4 pt-3 pb-3 border-t border-border space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[11px] tabular-nums text-muted-foreground min-w-[3rem]">
              {mode === "book" && spreadIdx != null
                ? `${spreadIdx + 1}/${spreads.length}`
                : `${page + 1}/${totalForBar}`}
            </span>
            <div className="flex-1">
              <ProgressBar
                current={page}
                total={totalForBar}
                spreadIndex={mode === "book" ? spreadIdx : null}
                spreadTotal={mode === "book" ? spreads.length : null}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1">
              {prevChapter && (
                <Link
                  to="/read/$mangaId/$chapterId"
                  params={{ mangaId: manga.id, chapterId: prevChapter.id }}
                >
                  <Button variant="ghost" size="sm">
                    <ChevronLeft className="h-4 w-4" /> Prev ch.
                  </Button>
                </Link>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFs}
                aria-label="Fullscreen"
              >
                {isFs ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex gap-1">
              {nextChapter && (
                <Link
                  to="/read/$mangaId/$chapterId"
                  params={{ mangaId: manga.id, chapterId: nextChapter.id }}
                >
                  <Button variant="ghost" size="sm">
                    Next ch. <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReaderSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        prefs={prefs}
        mode={mode}
        onChange={(patch) => update(patch)}
      />
    </div>
  );
}
