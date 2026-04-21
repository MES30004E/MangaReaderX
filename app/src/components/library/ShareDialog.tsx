import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDisplayNames,
  listSharesForManga,
  resolveRecipient,
  shareMangaWith,
  unshareMangaWith,
} from "@/lib/sharing-api";
import { Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mangaId: string;
  mangaTitle: string;
}

export function ShareDialog({ open, onOpenChange, mangaId, mangaTitle }: Props) {
  const qc = useQueryClient();
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);

  const sharesQ = useQuery({
    queryKey: ["manga-shares", mangaId],
    queryFn: () => listSharesForManga(mangaId),
    enabled: open,
  });
  const namesQ = useQuery({
    queryKey: ["share-names", mangaId, sharesQ.data?.map((s) => s.recipient_user_id).join(",")],
    queryFn: () => getDisplayNames((sharesQ.data ?? []).map((s) => s.recipient_user_id)),
    enabled: !!sharesQ.data,
  });

  async function handleShare() {
    if (!recipient.trim()) return;
    setBusy(true);
    try {
      const id = await resolveRecipient(recipient);
      if (!id) {
        toast.error("No user found with that name or ID");
        return;
      }
      await shareMangaWith(mangaId, id);
      toast.success("Shared");
      setRecipient("");
      qc.invalidateQueries({ queryKey: ["manga-shares", mangaId] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to share";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleUnshare(uid: string) {
    await unshareMangaWith(mangaId, uid);
    qc.invalidateQueries({ queryKey: ["manga-shares", mangaId] });
    toast.success("Access removed");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share "{mangaTitle}"</DialogTitle>
          <DialogDescription>
            Recipients see this manga in their library as shared content. They get read-only
            access to metadata and pages stored on this device — raw files stay local.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Recipient (display name or user ID)</Label>
          <div className="flex gap-2">
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. alice"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleShare();
              }}
            />
            <Button onClick={handleShare} disabled={busy || !recipient.trim()}>
              Share
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Currently shared with
          </div>
          <div className="rounded-md border border-border divide-y divide-border">
            {(sharesQ.data ?? []).length === 0 && (
              <div className="p-3 text-sm text-muted-foreground text-center">
                Not shared yet.
              </div>
            )}
            {(sharesQ.data ?? []).map((s) => (
              <div key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="flex-1 truncate">
                  {namesQ.data?.get(s.recipient_user_id) || s.recipient_user_id}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {s.permission}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleUnshare(s.recipient_user_id)}
                  aria-label="Remove access"
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
