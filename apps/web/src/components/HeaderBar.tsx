"use client";

import { useEffect, useState } from "react";
import type { SourceHealth } from "@bo-dash/shared";
import { asNumber, formatNum, formatPct } from "@/lib/format";
import { useMounted } from "@/hooks/useClientTime";
import { useTheme } from "@/hooks/useTheme";
import { RefreshPill } from "@/components/LoadingScreen";

export function HeaderBar({
  connected,
  spreadPct,
  official,
  parallel,
  health,
  clock,
  generatedAt,
  refreshing = false,
}: {
  connected: boolean;
  spreadPct?: number;
  official?: unknown;
  parallel?: unknown;
  health: SourceHealth[];
  clock: string;
  generatedAt?: string;
  refreshing?: boolean;
}) {
  const mounted = useMounted();
  const { theme, toggle, ready } = useTheme();
  const [lag, setLag] = useState<number | null>(null);
  const ok = health.filter((h) => h.status === "ok").length;
  const err = health.filter((h) => h.status === "error").length;
  const off = asNumber(official);
  const par = asNumber(parallel);
  const spread =
    typeof spreadPct === "number" && Number.isFinite(spreadPct)
      ? spreadPct
      : off && par
        ? ((par - off) / off) * 100
        : undefined;

  useEffect(() => {
    if (!generatedAt) {
      setLag(null);
      return;
    }
    const t = new Date(generatedAt).getTime();
    if (!Number.isFinite(t) || t <= 0) {
      setLag(null);
      return;
    }
    const tick = () => setLag(Math.max(0, Math.round((Date.now() - t) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [generatedAt]);

  return (
    <header className="panel header-bar relative overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-16 h-56 w-56 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(circle, var(--bg-spot-2), transparent 68%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, var(--bg-spot-4), transparent 70%)",
        }}
      />

      <div className="relative flex flex-wrap items-end gap-4 sm:gap-5">
        <div className="min-w-[200px] flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="live-badge">Live</span>
            <RefreshPill show={refreshing} />
            {mounted && lag != null && !refreshing && (
              <span className="text-[0.7rem] font-medium text-[var(--muted)]" suppressHydrationWarning>
                datos · {lag < 60 ? `${lag}s` : `${Math.round(lag / 60)}m`}
              </span>
            )}
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] font-bold leading-none tracking-tight sm:text-[2.15rem]">
            Bolivia Pulse
          </h1>
          <p className="mt-1.5 text-[0.78rem] text-[var(--muted)]">
            Sala de monitoreo · {mounted ? clock : "—"}
          </p>
        </div>

        <div className="flex flex-wrap items-stretch gap-2 sm:gap-2.5">
          <div className="kpi-card">
            <div className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              Oficial
            </div>
            <div className="kpi text-[1.35rem] tabular-nums">{formatNum(off)}</div>
          </div>

          <div className="kpi-card kpi-card--accent">
            <div className="text-[0.6rem] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
              Paralelo
            </div>
            <div className="kpi text-[1.35rem] font-bold tabular-nums text-[var(--accent)]">
              {formatNum(par)}
              {spread !== undefined && (
                <span className="ml-1.5 text-[0.75rem] font-semibold opacity-90">
                  {spread >= 0 ? "+" : ""}
                  {formatPct(spread)}
                </span>
              )}
            </div>
          </div>

          <div className="status-pill">
            <span className={`health-dot ${connected ? "ok" : "error"}`} />
            <div className="text-xs leading-tight">
              <div className="font-semibold">{connected ? "SSE vivo" : "Reconectando"}</div>
              <div className="text-[var(--muted)]">
                {ok} ok{err ? ` · ${err} err` : ""}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="theme-toggle"
            onClick={toggle}
            aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          >
            {ready ? (theme === "dark" ? "Claro" : "Oscuro") : "…"}
          </button>
        </div>
      </div>
    </header>
  );
}
