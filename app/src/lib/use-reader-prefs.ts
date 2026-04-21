import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  DEFAULT_PREFS,
  getReaderPrefs,
  upsertReaderPrefs,
  type ReaderPrefsRow,
} from "@/lib/library-api";

export type EffectivePrefs = Omit<ReaderPrefsRow, "user_id" | "updated_at">;

export function useReaderPrefs() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["reader-prefs", user?.id],
    queryFn: getReaderPrefs,
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  // Server-derived prefs (always_hide_chrome defaults to true if no row exists).
  const serverPrefs: EffectivePrefs = query.data
    ? {
        left_handed: query.data.left_handed,
        invert_taps: query.data.invert_taps,
        tap_zone_pct: query.data.tap_zone_pct,
        dim_level: query.data.dim_level,
        always_hide_chrome: query.data.always_hide_chrome,
        auto_resume: query.data.auto_resume,
        fit_vertical: query.data.fit_vertical,
        fit_book: query.data.fit_book,
        default_mode:
          query.data.default_mode === "book" ? "book" : "vertical",
      }
    : DEFAULT_PREFS;

  // Local optimistic state — controls feel instant; server save is debounced.
  const [local, setLocal] = useState<EffectivePrefs>(serverPrefs);
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!query.data && hydratedRef.current) return;
    setLocal(serverPrefs);
    hydratedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: (patch: Partial<EffectivePrefs>) => upsertReaderPrefs(patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reader-prefs"] });
    },
  });

  // Debounce persistence so dragging a slider does not spam the network.
  const pendingRef = useRef<Partial<EffectivePrefs>>({});
  const timerRef = useRef<number | null>(null);
  const flush = useCallback(() => {
    const patch = pendingRef.current;
    pendingRef.current = {};
    timerRef.current = null;
    if (Object.keys(patch).length > 0) mutation.mutate(patch);
  }, [mutation]);

  const update = useCallback(
    (patch: Partial<EffectivePrefs>) => {
      setLocal((prev) => ({ ...prev, ...patch }));
      pendingRef.current = { ...pendingRef.current, ...patch };
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(flush, 350);
    },
    [flush],
  );

  useEffect(() => () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      flush();
    }
  }, [flush]);

  return {
    prefs: local,
    isLoading: query.isLoading,
    update,
    isUpdating: mutation.isPending,
  };
}
