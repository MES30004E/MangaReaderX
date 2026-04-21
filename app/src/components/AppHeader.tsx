import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Library, BookOpen, Upload, LogOut, Settings, Globe } from "lucide-react";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Don't render the chrome inside the reader.
  if (path.startsWith("/read/")) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground font-display text-lg shadow-[0_0_24px_-8px_oklch(0.65_0.24_25)]">
            M
          </div>
          <div className="font-display text-xl tracking-wide">
            Manga<span className="text-primary">ReaderX</span>
          </div>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link to="/" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              <Library className="h-4 w-4" /> Library
            </Button>
          </Link>
          <Link to="/discover">
            <Button variant="ghost" size="sm">
              <Globe className="h-4 w-4" /> Discover
            </Button>
          </Link>
          <Link to="/import">
            <Button variant="ghost" size="sm">
              <Upload className="h-4 w-4" /> Import
            </Button>
          </Link>
          <Link to="/trash" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              <BookOpen className="h-4 w-4" /> Trash
            </Button>
          </Link>
          <Link to="/settings" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" /> Settings
            </Button>
          </Link>
          {user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                nav({ to: "/auth" });
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          ) : (
            <Link to="/auth">
              <Button variant="default" size="sm">
                Sign in
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
