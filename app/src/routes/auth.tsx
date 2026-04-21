import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/" });
  }, [loading, user, nav]);

  async function signIn(provider: "google" | "apple") {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Sign-in failed", { description: result.error.message });
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    nav({ to: "/" });
  }

  return (
    <div className="min-h-[calc(100vh-65px)] gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border gradient-card p-8 shadow-2xl">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground font-display text-2xl shadow-[0_0_40px_-10px_oklch(0.65_0.24_25)]">
          M
        </div>
        <h1 className="text-center font-display text-3xl tracking-wide">
          Welcome to <span className="text-primary">MangaReaderX</span>
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground text-balance">
          Sign in to sync your library, chapter progress and reading position across devices.
        </p>
        <Button
          onClick={() => signIn("google")}
          disabled={busy}
          size="lg"
          className="mt-6 w-full"
          variant="default"
        >
          {busy ? "Connecting…" : "Continue with Google"}
        </Button>
        <Button
          onClick={() => signIn("apple")}
          disabled={busy}
          size="lg"
          className="mt-3 w-full bg-foreground text-background hover:bg-foreground/90"
          variant="default"
        >
          {busy ? "Connecting…" : " Continue with Apple"}
        </Button>
        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Manga files stay on your device. Only metadata and reading progress sync.
        </p>
      </div>
    </div>
  );
}
