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
    <header className="panel relative overflow-hidden px-4 py-3.5 sm:px-5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-50"
        style={{
          background:
            "radial-gradient(480px 160px at 90% 10%, var(--bg-spot-2), transparent 70%)",
        }}
      />
      <div className="relative flex flex-wrap items-center gap-4">
        <div className="min-w-[180px]">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="live-badge">Live</span>
            <RefreshPill show={refreshing} />
            {mounted && lag != null && !refreshing && (
              <span className="text-[0.65rem] text-[var(--faint)]" suppressHydrationWarning>
                datos · {lag < 60 ? `${lag}s` : `${Math.round(lag / 60)}m`}
              </span>
            )}
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight sm:text-2xl">
            Bolivia Pulse
          </h1>
          <p className="text-[0.72rem] text-[var(--muted)]">
            Sala de monitoreo · {mounted ? clock : "—"}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="kpi-card">
            <div className="text-[0.62rem] uppercase tracking-[0.12em] text-[var(--muted)]">
              Oficial
            </div>
            <div className="kpi text-[1.25rem] tabular-nums">{formatNum(off)}</div>
          </div>

          <div className="kpi-card kpi-card--accent">
            <div className="text-[0.62rem] uppercase tracking-[0.12em] text-[var(--accent)]">
              Paralelo
            </div>
            <div className="kpi text-[1.25rem] font-semibold tabular-nums text-[var(--accent)]">
              {formatNum(par)}
              {spread !== undefined && (
                <span className="ml-2 text-xs font-medium opacity-90">
                  {spread >= 0 ? "+" : ""}
                  {formatPct(spread)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--bg-elev)]/70 px-3 py-2">
            <span className={`health-dot ${connected ? "ok" : "error"}`} />
            <div className="text-xs leading-tight">
              <div className="font-medium">{connected ? "SSE vivo" : "Reconectando"}</div>
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
