interface Props {
  /** 0-based current page index in the raw page array. */
  current: number;
  /** Total raw pages. */
  total: number;
  /** Optional spread mode — display still based on raw page indices for accuracy. */
  spreadIndex?: number | null;
  /** Spread total when spreadIndex is provided. */
  spreadTotal?: number | null;
}

/**
 * Libby-style segmented progress bar.
 * One tick per page. Stronger ticks every 5/10. Highlights current page.
 */
export function ProgressBar({ current, total, spreadIndex, spreadTotal }: Props) {
  const t = Math.max(1, total);
  const c = Math.max(0, Math.min(t - 1, current));
  const pct = ((c + 1) / t) * 100;

  // Hide individual ticks beyond a threshold to keep things readable.
  const showTicks = t <= 200;

  return (
    <div className="flex flex-col gap-1.5 select-none">
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-progress-track">
        <div
          className="absolute inset-y-0 left-0 bg-progress-fill transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
        {showTicks && (
          <div className="absolute inset-0 flex">
            {Array.from({ length: t }).map((_, i) => {
              const strong = (i + 1) % 10 === 0;
              const med = !strong && (i + 1) % 5 === 0;
              if (i === t - 1) return null;
              return (
                <div
                  key={i}
                  className="flex-1 flex justify-end items-center"
                  aria-hidden
                >
                  <div
                    className={
                      strong
                        ? "h-2.5 w-px bg-progress-tick-strong"
                        : med
                          ? "h-2 w-px bg-progress-tick-strong/80"
                          : "h-1.5 w-px bg-progress-tick"
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
        {spreadIndex != null && spreadTotal ? (
          <span>
            Spread {spreadIndex + 1} / {spreadTotal}
          </span>
        ) : (
          <span>
            Page {c + 1} of {t}
          </span>
        )}
        <span>{Math.round(pct)}%</span>
      </div>
    </div>
  );
}
