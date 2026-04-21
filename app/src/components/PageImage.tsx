import { useEffect, useState } from "react";
import { getBlobURL } from "@/lib/idb";

interface Props {
  blobKey: string | null;
  alt: string;
  className?: string;
  rotation?: number;
  loading?: "eager" | "lazy";
}

/** Renders an image stored in IndexedDB by blob key. */
export function PageImage({ blobKey, alt, className, rotation = 0, loading = "lazy" }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!blobKey) {
      setUrl(null);
      return;
    }
    // Pass through remote URLs (e.g. global manga covers stored in cloud storage).
    if (/^https?:\/\//i.test(blobKey) || blobKey.startsWith("data:")) {
      setUrl(blobKey);
      return;
    }
    getBlobURL(blobKey).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [blobKey]);

  if (!url) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground text-xs ${className ?? ""}`}
        aria-label={alt}
      >
        Loading…
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading={loading}
      style={rotation ? { transform: `rotate(${rotation}deg)` } : undefined}
      draggable={false}
    />
  );
}
