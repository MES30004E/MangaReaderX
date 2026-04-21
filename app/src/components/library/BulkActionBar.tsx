import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, Trash2, FolderPlus, X } from "lucide-react";
import type { CollectionRow } from "@/lib/library-api";

interface Props {
  selectedCount: number;
  onClear: () => void;
  onFavorite: () => void;
  onUnfavorite: () => void;
  onDelete: () => void;
  onAddToCollection: (collectionId: string) => void;
  onCreateCollection: () => void;
  collections: CollectionRow[];
}

export function BulkActionBar({
  selectedCount,
  onClear,
  onFavorite,
  onUnfavorite,
  onDelete,
  onAddToCollection,
  onCreateCollection,
  collections,
}: Props) {
  if (selectedCount === 0) return null;
  return (
    <div className="sticky top-[64px] z-20 -mx-4 px-4 py-2 bg-surface-elevated/95 backdrop-blur border-b border-border">
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onClear} aria-label="Clear selection">
          <X className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">
          {selectedCount} selected
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={onFavorite}>
            <Heart className="h-4 w-4" /> Favorite
          </Button>
          <Button variant="ghost" size="sm" onClick={onUnfavorite}>
            Unfavorite
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <FolderPlus className="h-4 w-4" /> Collection
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Add to collection</DropdownMenuLabel>
              {collections.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  No collections yet.
                </div>
              )}
              {collections.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => onAddToCollection(c.id)}>
                  {c.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onCreateCollection}>
                + New collection…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4" /> Trash
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move {selectedCount} to trash?</AlertDialogTitle>
                <AlertDialogDescription>
                  You can restore from the Trash page. Files remain on this device until
                  permanent deletion.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Move to trash</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
