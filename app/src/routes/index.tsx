import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { LibraryGrid, type SortMode } from "@/components/LibraryGrid";
import { DropZone } from "@/components/DropZone";
import { Button } from "@/components/ui/button";
import { LibraryToolbar, type LibraryFilter } from "@/components/library/LibraryToolbar";
import { BulkActionBar } from "@/components/library/BulkActionBar";
import { CollectionDialog } from "@/components/library/CollectionDialog";
import { ContinueReading } from "@/components/library/ContinueReading";
import {
  bulkFavorite,
  bulkSoftDelete,
  addMangaToCollection,
  createCollection,
  type CollectionRow,
} from "@/lib/library-api";
import { Upload, CheckSquare, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [sort, setSort] = useState<SortMode>("recent");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [query, setQuery] = useState("");
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [count, setCount] = useState(0);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  const onToggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelected(new Set());
  }, []);

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["manga"] });
    qc.invalidateQueries({ queryKey: ["favorites"] });
    qc.invalidateQueries({ queryKey: ["collection-manga"] });
  }

  async function handleBulkFavorite(fav: boolean) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    await bulkFavorite(ids, fav);
    invalidateAll();
    toast.success(fav ? `Favorited ${ids.length}` : `Removed ${ids.length} from favorites`);
    exitSelection();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    await bulkSoftDelete(ids);
    invalidateAll();
    toast(`Moved ${ids.length} to trash`, {
      action: {
        label: "Undo",
        onClick: async () => {
          const { bulkRestore } = await import("@/lib/library-api");
          await bulkRestore(ids);
          invalidateAll();
        },
      },
    });
    exitSelection();
  }

  async function handleAddToCollection(collectionId: string) {
    const ids = Array.from(selected);
    if (!ids.length) return;
    await addMangaToCollection(collectionId, ids);
    invalidateAll();
    const c = collections.find((x) => x.id === collectionId);
    toast.success(`Added ${ids.length} to ${c?.name ?? "collection"}`);
    exitSelection();
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return null;

  return (
    <DropZone
      global
      onFiles={(files) => {
        window.dispatchEvent(new CustomEvent("mrx:files-dropped", { detail: files }));
        nav({ to: "/import" });
      }}
    >
      <div className="gradient-hero">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl tracking-wide">
                Your <span className="text-primary">library</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Drop a ZIP/CBZ, a folder or images anywhere to import.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/settings">
                <Button variant="ghost" size="sm">
                  <BarChart3 className="h-4 w-4" /> Storage
                </Button>
              </Link>
              <Button
                variant={selectionMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (selectionMode) exitSelection();
                  else setSelectionMode(true);
                }}
              >
                <CheckSquare className="h-4 w-4" />
                {selectionMode ? "Done" : "Select"}
              </Button>
              <Link to="/import">
                <Button>
                  <Upload className="h-4 w-4" /> Import
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16">
        <ContinueReading />

        <div className="mb-4">
          <LibraryToolbar
            query={query}
            onQuery={setQuery}
            filter={filter}
            onFilter={setFilter}
            sort={sort}
            onSort={setSort}
            collections={collections.map((c) => ({ id: c.id, name: c.name }))}
            activeCollection={activeCollection}
            onCollection={setActiveCollection}
            totalCount={count}
          />
        </div>

        <BulkActionBar
          selectedCount={selected.size}
          collections={collections}
          onClear={exitSelection}
          onFavorite={() => handleBulkFavorite(true)}
          onUnfavorite={() => handleBulkFavorite(false)}
          onDelete={handleBulkDelete}
          onAddToCollection={handleAddToCollection}
          onCreateCollection={() => setCollectionDialogOpen(true)}
        />

        <LibraryGrid
          sort={sort}
          filter={filter}
          query={query}
          activeCollection={activeCollection}
          selectionMode={selectionMode}
          selected={selected}
          onToggleSelect={onToggleSelect}
          onCount={setCount}
          onCollectionsLoaded={setCollections}
        />
      </div>

      <CollectionDialog
        open={collectionDialogOpen}
        onOpenChange={setCollectionDialogOpen}
        onCreate={async (name) => {
          await createCollection(name);
          qc.invalidateQueries({ queryKey: ["collections"] });
          toast.success(`Created "${name}"`);
        }}
      />
    </DropZone>
  );
}
