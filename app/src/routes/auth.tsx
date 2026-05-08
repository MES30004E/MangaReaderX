import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) nav({ to: "/" });
  }, [loading, user, nav]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "sign-up") {
        await signUp(email.trim(), password);
        toast.success("Account created");
      } else {
        await signIn(email.trim(), password);
      }
      nav({ to: "/" });
    } catch (error) {
      toast.error(mode === "sign-up" ? "Sign-up failed" : "Sign-in failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
    }
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
          Sign in to sync your library, chapter progress and reading position
          across devices.
        </p>
        <form className="mt-6 space-y-3" onSubmit={submit}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            autoComplete={
              mode === "sign-up" ? "new-password" : "current-password"
            }
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button
            disabled={busy}
            size="lg"
            className="w-full"
            variant="default"
            type="submit"
          >
            {busy
              ? "Working..."
              : mode === "sign-up"
                ? "Create account"
                : "Sign in"}
          </Button>
        </form>
        <Button
          disabled={busy}
          variant="ghost"
          className="mt-3 w-full"
          onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}
        >
          {mode === "sign-up"
            ? "Already have an account? Sign in"
            : "Create an account"}
        </Button>
        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Manga files stay on your device. Only metadata and reading progress
          sync.
        </p>
      </div>
    </div>
  );
}
