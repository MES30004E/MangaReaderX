import { Link } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PublishGlobalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublished?: () => void;
}

export function PublishGlobalDialog({
  open,
  onOpenChange,
}: PublishGlobalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish global manga</DialogTitle>
          <DialogDescription>
            Use the import workflow to publish manga into the global catalogue.
          </DialogDescription>
        </DialogHeader>
        <Button asChild onClick={() => onOpenChange(false)}>
          <Link to="/import">
            <Upload className="h-4 w-4" />
            Open import
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
