import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortMode } from "@/components/LibraryGrid";

export type LibraryFilter =
  | "all"
  | "favorites"
  | "unread"
  | "in_progress"
  | "completed"
  | "recently_added"
  | "last_read";

export interface CollectionTab {
  id: string;
  name: string;
}

interface Props {
  query: string;
  onQuery: (v: string) => void;
  filter: LibraryFilter;
  onFilter: (f: LibraryFilter) => void;
  sort: SortMode;
  onSort: (s: SortMode) => void;
  collections: CollectionTab[];
  activeCollection: string | null;
  onCollection: (id: string | null) => void;
  totalCount: number;
}

const FILTERS: { value: LibraryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "favorites", label: "Favorites" },
  { value: "unread", label: "Unread" },
  { value: "in_progress", label: "Reading" },
  { value: "completed", label: "Completed" },
  { value: "recently_added", label: "New" },
  { value: "last_read", label: "Recent" },
];

export function LibraryToolbar({
  query,
  onQuery,
  filter,
  onFilter,
  sort,
  onSort,
  collections,
  activeCollection,
  onCollection,
  totalCount,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search title, alt title, chapter…"
            className="pl-9 pr-9 bg-surface border-border"
            aria-label="Search library"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={sort} onValueChange={(v) => onSort(v as SortMode)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently updated</SelectItem>
            <SelectItem value="last_read">Last read</SelectItem>
            <SelectItem value="added">Recently added</SelectItem>
            <SelectItem value="title">Title (A–Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilter(f.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
              filter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {totalCount} {totalCount === 1 ? "item" : "items"}
        </span>
      </div>

      {collections.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground mr-1">
            Collections
          </span>
          <button
            onClick={() => onCollection(null)}
            className={`rounded-md px-2.5 py-1 text-xs border ${
              activeCollection === null
                ? "bg-surface-elevated border-primary/60 text-foreground"
                : "bg-transparent border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => onCollection(c.id)}
              className={`rounded-md px-2.5 py-1 text-xs border ${
                activeCollection === c.id
                  ? "bg-surface-elevated border-primary/60 text-foreground"
                  : "bg-transparent border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.name}
            </button>
          ))}
          {activeCollection && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onCollection(null)}
            >
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
